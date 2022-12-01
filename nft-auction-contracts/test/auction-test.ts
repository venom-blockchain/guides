import { expect } from "chai";
import { Address, Contract, getRandomNonce, Signer, toNano, WalletTypes, zeroAddress } from "locklift";
import { FactorySource } from "../build/factorySource";

let signer: Signer;
let ownerAccout: any;
let participantAccount: any;
let collection: Contract<FactorySource["Collection"]>;
let nft: Contract<FactorySource["NFT"]>;
let auction: Contract<FactorySource["Auction"]>;
let tokenRoot: Contract<FactorySource["TokenRoot"]>;



describe("Test Sample contract", async function () {
  before(async () => {
    // We need some contracts, before all tests
    signer = (await locklift.keystore.getSigner("0"))!;
    // Accounts
    const { account: accountAddOperation } = await locklift.factory.accounts.addNewAccount({
      type: WalletTypes.WalletV3,
      value: toNano(10000),
      publicKey: signer.publicKey
    });
    ownerAccout = accountAddOperation;
    const { account: participantAccountAddOperation } = await locklift.factory.accounts.addNewAccount({
      type: WalletTypes.WalletV3,
      value: toNano(10000),
      publicKey: (await locklift.keystore.getSigner("1"))!.publicKey
    });
    participantAccount = participantAccountAddOperation;
    // TokenRoot
    const { contract: tokenRootAdded } = await locklift.factory.deployContract({
      contract: "TokenRoot",
      publicKey: signer.publicKey,
      initParams: {
          randomNonce_: 0,
          deployer_: zeroAddress,
          name_: "test",
          symbol_: "tst",
          decimals_: 3,
          rootOwner_: ownerAccout.address,
          walletCode_: (await locklift.factory.getContractArtifacts("TokenWallet")).code,
      },
      constructorParams: {
          initialSupplyTo: participantAccount.address, // giving tokens to our participant right here and right now
          initialSupply: 100000000000,
          deployWalletValue: 100000000,
          mintDisabled: true,
          burnByRootDisabled: true,
          burnPaused: false,
          remainingGasTo: ownerAccout.address,
      },
      value: toNano(2)
    });
    tokenRoot = tokenRootAdded;
    // Collection
    const { contract: collectionAdded } = await locklift.factory.deployContract({
      contract: "Collection",
      publicKey: signer.publicKey,
      initParams: {},
      constructorParams: {
          codeNft: (await locklift.factory.getContractArtifacts("NFT")).code,
          codeIndex: (await locklift.factory.getContractArtifacts("Index")).code,
          codeIndexBasis: (await locklift.factory.getContractArtifacts("IndexBasis")).code,
          json: `{"collection":"tutorial"}`
      },
      value: locklift.utils.toNano(5),
    });
    collection = collectionAdded;
    // Mint NFT
    await collection.methods.mintNft({ json: `{"name":"hello world"}` }).send({ from: ownerAccout.address, amount: toNano(1)});
    const {nft: nftAddress} = await collection.methods.nftAddress({ answerId: 0, id: 0 }).call();
    nft = await locklift.factory.getDeployedContract("NFT", nftAddress)
  });
  describe("Contracts", async function () {
    it("Load contract factory", async function () {
      const auctionData = await locklift.factory.getContractArtifacts("Auction");

      expect(auctionData.code).not.to.equal(undefined, "Code should be available");
      expect(auctionData.abi).not.to.equal(undefined, "ABI should be available");
      expect(auctionData.tvc).not.to.equal(undefined, "tvc should be available");
    });

    it("Deploy Auction", async function () {
      const startTime = Math.floor(Date.now() / 1000) + 3600; 
      const endTime = startTime + 3600;
      const { contract: auctionAdded, tx } = await locklift.factory.deployContract({
        contract: "Auction",
        publicKey: signer.publicKey,
        initParams: {
            _owner: ownerAccout.address,
            _nonce: getRandomNonce()
        },
        constructorParams: {
            startTime: startTime,
            endTime: endTime,
            tokenRoot: tokenRoot.address,
            sendRemainingGasTo: ownerAccout.address
        },
        value: locklift.utils.toNano(5),
      });
      auction = auctionAdded;
      expect(await locklift.provider.getBalance(auction.address).then(balance => Number(balance))).to.be.above(0);
    });

    it("Send NFT to Auction", async function () {
      // just like in scripts
      await nft.methods.transfer({
        to: auction.address,
        sendGasTo: ownerAccout.address,
        // take attention! Next field is important for calling our onNftTransfer callback!
        // you may lose your NFT if you don't set up callback for auction here!
        callbacks: [[auction.address, {value: toNano(0.1), payload: ""}]] 
      }).send({
          from: ownerAccout.address,
          amount: toNano(2)
      })
      const {_nftReceived: nftReceived} = await auction.methods._nftReceived({}).call();
      const {_nft: nftAddress} = await auction.methods._nft({}).call();
      // check that nft is received
      expect(nftReceived).to.be.eq(true);
      expect(nftAddress.toString()).to.be.eq(nft.address.toString());
    });

    it("Make a bid", async function () {
      // locklift helper to inrease local-node current block time (time machine in action :) )
      await locklift.testing.increaseTime(4000); // auctions start from now + 3600
      // get instance of our paticipant TokenWallet
      // firstly address
      const {value0: walletAddress} = await tokenRoot.methods.walletOf({answerId: 0, walletOwner: participantAccount.address}).call();
      const walletInstance = await locklift.factory.getDeployedContract("TokenWallet", walletAddress);
      await walletInstance.methods.transfer({
        amount: 1000000000, // any for tests
        recipient: auction.address,
        remainingGasTo: participantAccount.address,
        deployWalletValue: 0,
        notify: true, // IMPORTANT! EXACTLY TRUE (read guide)
        payload: ""
      }).send({
        from: participantAccount.address,
        amount: toNano(1)
      })
      const {_currentWinner: currentWinner} = await auction.methods._currentWinner({}).call();
      const {_currentBid: currentBid} = await auction.methods._currentBid({}).call();
      // check winenr and bid
      expect(currentWinner.toString()).to.be.eq(participantAccount.address.toString());
      expect(currentBid).to.be.eq("1000000000");
    })

    it("Finish auction", async function () {
      // another time machine :)
      await locklift.testing.increaseTime(4000); // auctions start from now + 3600 ends + 3600...another 4000 will be enough
      await auction.methods.finishAuction({sendRemainingGasTo: ownerAccout.address}).send({ from: ownerAccout.address, amount: toNano(5)});
      // check if transferring from auction was sucess
      const {owner: nftOwner} = await nft.methods.getInfo({answerId: 0}).call();
      expect(nftOwner.toString()).to.be.eq(participantAccount.address.toString());
    })
  });
});
