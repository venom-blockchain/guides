import { Address, toNano, WalletTypes } from "locklift";

// you can pass this parameters by cli or get them by some file reading for example or calculate an address with locklift.provider.getExpectedAddress()
// we just hardcode it here
const NFT_ADDRESS = new Address("0:304150265fbbe8680759cb7ec98cfa598b8a109396338b2916de1684a36a7679")
const AUCTION_ADDRESS = new Address("0:94ebb201aa8e3d436fe1d1a9ecd80dbd46b44c11567cc69cbc11f8295f98dd32")

async function main() {
    const signer = (await locklift.keystore.getSigner("0"))!;
    // creating new account for Collection calling (or you can get already deployed by locklift.factory.accounts.addExistingAccount)
    const someAccount = await locklift.factory.accounts.addExistingAccount({
        type: WalletTypes.WalletV3,
        publicKey: signer.publicKey
    });
    // instantiate NFT contract
    const nftInstance = await locklift.factory.getDeployedContract(
        "NFT",
        NFT_ADDRESS
    )
    // and call a transfer method to auction from owner
    await nftInstance.methods.transfer({
        to: AUCTION_ADDRESS,
        sendGasTo: someAccount.address,
        // take attention! Next field is important for calling our onNftTransfer callback!
        // you may lose your NFT if you don't set up callback for auction here!
        callbacks: [[AUCTION_ADDRESS, {value: toNano(0.1), payload: ""}]] 
    }).send({
        from: someAccount.address,
        amount: toNano(2)
    })
  
    console.log(`NFT has been sent`);
}
  
main()
    .then(() => process.exit(0))
    .catch(e => {
        console.log(e);
        process.exit(1);
    });