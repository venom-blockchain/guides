import { expect } from "chai";
import { Address, Contract, Signer, WalletTypes, toNano } from "locklift";
import { FactorySource } from "../build/factorySource";

let signer: Signer;
let account: any;
let tokenRoot: Contract<FactorySource["TokenRoot"]>;
let tokensale: Contract<FactorySource["Tokensale"]>;

const ZERO_ADDRESS = "0:0000000000000000000000000000000000000000000000000000000000000000"

describe("Test Tokensale contract", async function () {
  before(async () => {
    // we will use "before" section for initialize some Wallet for tokensale owner and deploy tip3 TokenRoot
    signer = (await locklift.keystore.getSigner("0"))!
    const { account: accountAddOperation } = await locklift.factory.accounts.addNewAccount({
        type: WalletTypes.WalletV3,
        value: toNano(10000),
        publicKey: signer.publicKey
    });
    account = accountAddOperation;
    const { contract: tip3root } = await locklift.factory.deployContract({
      contract: "TokenRoot",
      publicKey: signer.publicKey,
      initParams: {
          randomNonce_: 0,
          deployer_: new Address(ZERO_ADDRESS),
          name_: "test",
          symbol_: "tst",
          decimals_: 3,
          rootOwner_: account.address,
          walletCode_: (await locklift.factory.getContractArtifacts("TokenWallet")).code,
      },
      constructorParams: {
          initialSupplyTo: account.address,
          initialSupply: 100000000000,
          deployWalletValue: 100000000,
          mintDisabled: true,
          burnByRootDisabled: true,
          burnPaused: false,
          remainingGasTo: account.address,
      },
      value: toNano(2)
    });
    tokenRoot = tip3root;
  });

  describe("Contracts", async function () {
    it("Load contract factory", async function () {
      const tokensaleData = await locklift.factory.getContractArtifacts("Tokensale");

      expect(tokensaleData.code).not.to.equal(undefined, "Code should be available");
      expect(tokensaleData.abi).not.to.equal(undefined, "ABI should be available");
      expect(tokensaleData.tvc).not.to.equal(undefined, "tvc should be available");
    });

    it("Deploy contract", async function () {
      const { contract } = await locklift.factory.deployContract({
        contract: "Tokensale",
        publicKey: signer.publicKey,
        initParams: {
          _nonce: locklift.utils.getRandomNonce(),
          _owner: account.address,
        },
        constructorParams: {
            distributedTokenRoot: tokenRoot.address,
            supply: 100000000000,
            rate: 10, // 1 venom 10 tokens, because of same decimals
            sendRemainingGasTo: account.address
        },
        value: locklift.utils.toNano(2),
      });
      tokensale = contract;

      expect(await locklift.provider.getBalance(tokensale.address).then(balance => Number(balance))).to.be.eq(Number(toNano(1))); // remember, that we are reserving 1 venom on Tokensale contract
    });

    it("Send supply to tokensale wallet", async function () {
      // get TokenWallet address of owner and instantiate it via factory
      const { value0: ownerWalletAddress } = await tokenRoot.methods.walletOf({
        answerId: 0,
        walletOwner: account.address
      }).call();
      const ownerWallet = await locklift.factory.getDeployedContract(
        "TokenWallet",
        ownerWalletAddress
      );

      // get TokenWallet address of tokensale and instantiate it via factory.  
      // so, we can call _distributedTokenWallet method of tokensale as a variant
      const { value0: tokensaleWalletAddress } = await tokenRoot.methods.walletOf({
        answerId: 0,
        walletOwner: tokensale.address
      }).call();
      const tokensaleWallet = await locklift.factory.getDeployedContract(
        "TokenWallet",
        tokensaleWalletAddress
      );

      // transfering token supply to tokensale wallet for future sales
      await ownerWallet.methods.transfer({
        amount: 100000000000,
        recipient: tokensale.address,
        deployWalletValue: 100000000,
        remainingGasTo: account.address,
        notify: false,
        payload: ""
      }).send({
        from: account.address,
        amount: toNano(1.11)
      });
      const tokensaleBalance = await tokensaleWallet.methods.balance({ answerId: 0}).call();
      expect(tokensaleBalance.value0).to.be.eq("100000000000");
    })

    it("Buy tokens from tokensale contract", async function () {
      const deposit = toNano(4);
      const expectedTokenBalanceAfterBuy = 40000000000;

      // add some buyer account (different pubkey from previous accounts)
      const { account: buyerAccount } = await locklift.factory.accounts.addNewAccount({
        type: WalletTypes.WalletV3,
        value: toNano(10000),
        publicKey: (await locklift.keystore.getSigner("1"))!.publicKey
      });

      // buy tokens from buyer account
      await tokensale.methods.buyTokens({
        deposit: deposit
      }).send({
        from: buyerAccount.address,
        amount: String(Number(deposit) + Number(toNano(1)))
      });

      // get TokenWallet address of tokensale and instantiate it via factory. (for balance checking after purchase)
      const { value0: buyerWalletAddress } = await tokenRoot.methods.walletOf({
        answerId: 0,
        walletOwner: buyerAccount.address
      }).call();
      const buyerWallet = await locklift.factory.getDeployedContract(
        "TokenWallet",
        buyerWalletAddress
      );

      const buyerNewBalance = await buyerWallet.methods.balance({ answerId: 0 }).call();
      expect(buyerNewBalance.value0).to.be.equal(String(expectedTokenBalanceAfterBuy));
    });

    it("Trying to buy more than supply", async function() {
      const deposit = toNano(1000);

      // add some another buyer account (different pubkey from previous accounts)
      const { account: buyerAccount } = await locklift.factory.accounts.addNewAccount({
        type: WalletTypes.WalletV3,
        value: toNano(10000),
        publicKey: (await locklift.keystore.getSigner("2"))!.publicKey
      });

      // get TokenWallet address of tokensale and instantiate it via factory. (for balance checking after purchase)
      const { value0: tokensaleWalletAddress } = await tokenRoot.methods.walletOf({
        answerId: 0,
        walletOwner: tokensale.address
      }).call();
      const tokensaleWallet = await locklift.factory.getDeployedContract(
        "TokenWallet",
        tokensaleWalletAddress
      );

      // this case should not to change tokensale TokenWallet balance. So, fix balance before bad purchase, than after purchase
      const tokensaleBalanceBefore = await tokensaleWallet.methods.balance({ answerId: 0 }).call();
      await tokensale.methods.buyTokens({
        deposit: deposit
      }).send({
        from: buyerAccount.address,
        amount: String(Number(deposit) + Number(toNano(1)))
      });
      const tokensaleBalanceAfter = await tokensaleWallet.methods.balance({ answerId: 0 }).call();

      // it should'n be deployed, so we checking it's NATIVE (venoms) balance
      const { value0: buyerWalletAddress } = await tokenRoot.methods.walletOf({
        answerId: 0,
        walletOwner: buyerAccount.address
      }).call();
      expect(await locklift.provider.getBalance(buyerWalletAddress).then(balance => Number(balance))).to.be.eq(Number(0));
      // tokens should not be sent
      expect(tokensaleBalanceBefore.value0).to.be.eq(tokensaleBalanceAfter.value0);
    })
  });
});
