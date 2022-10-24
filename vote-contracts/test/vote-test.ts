import { expect } from "chai";
import { Contract, Signer, toNano, WalletTypes } from "locklift";
import { FactorySource } from "../build/factorySource";

let ballotAccount: any;
let ownerAccount: any;
let vote: Contract<FactorySource["Vote"]>;
let ballot: Contract<FactorySource["Ballot"]>;
let signer: Signer;

describe("Test Vote contract", async function () {

  before(async () => {
    signer = (await locklift.keystore.getSigner("0"))!;
    // Accounts
    const { account: accountAddOperation } = await locklift.factory.accounts.addNewAccount({
      type: WalletTypes.WalletV3,
      value: toNano(10000),
      publicKey: signer.publicKey
    });
    ownerAccount = accountAddOperation;
    const { account: ballotAccountAddOperation } = await locklift.factory.accounts.addNewAccount({
      type: WalletTypes.WalletV3,
      value: toNano(10000),
      publicKey: (await locklift.keystore.getSigner("1"))!.publicKey
    });
    ballotAccount = ballotAccountAddOperation;
  });

  describe("Contracts", async function () {

    it("Load contract factory", async function () {
      const voteData = await locklift.factory.getContractArtifacts("Vote");

      expect(voteData.code).not.to.equal(undefined, "Code should be available");
      expect(voteData.abi).not.to.equal(undefined, "ABI should be available");
      expect(voteData.tvc).not.to.equal(undefined, "tvc should be available");
    });

    it("Deploy contract", async function () {
      const { contract } = await locklift.factory.deployContract({
        contract: "Vote",
        publicKey: signer.publicKey,
        initParams: {
          _nonce: locklift.utils.getRandomNonce(),
          _ballotCode: (await locklift.factory.getContractArtifacts("Ballot")).code
        },
        constructorParams: {
          managerPublicKey: `0x${signer.publicKey}`,
          sendRemainingGasTo: ownerAccount.address
        },
        value: locklift.utils.toNano(3),
      });
      vote = contract;
      expect(await locklift.provider.getBalance(vote.address).then(balance => Number(balance))).to.be.above(0);
    });

    it("Deploying ballot", async function () {
      await vote.methods.deployBallot({ owner: ballotAccount.address, sendRemainingGasTo: ballotAccount.address }).send({ from: ballotAccount.address, amount: toNano(1) });
      const ballotAddress = await locklift.provider.getExpectedAddress(
        (await locklift.factory.getContractArtifacts("Ballot")).abi,
        {
          tvc: (await locklift.factory.getContractArtifacts("Ballot")).tvc,
          initParams: {
            _managerPublicKey: `0x${signer.publicKey}`,
            _owner: ballotAccount.address,
            _vote: vote.address
          }
        }
      );
      ballot = await locklift.factory.getDeployedContract("Ballot", ballotAddress);
      expect(await locklift.provider.getBalance(ballot.address).then(balance => Number(balance))).to.be.eq(200000000);
    });

    it("Use ballot without activation", async function () {
      await ballot.methods.vote({
        sendRemainingGasTo: ballotAccount.address,
        accept: true
      }).send({ from: ballotAccount.address, amount: toNano(1) });
      const results = await vote.methods.getDetails({}).call();
      expect(results.accepted).to.be.eq('0');
    })

    it("Activate ballot and vote", async function () {
      await ballot.methods.activate({}).sendExternal({
        publicKey: signer.publicKey
      });
      await ballot.methods.vote({
        sendRemainingGasTo: ballotAccount.address,
        accept: true
      }).send({ from: ballotAccount.address, amount: toNano(1) });
      const results = await vote.methods.getDetails({}).call();
      expect(results.accepted).to.be.eq('1');
    })

  });
});
