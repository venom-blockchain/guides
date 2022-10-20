import { toNano, WalletTypes } from "locklift";

async function main() {
    const signer = (await locklift.keystore.getSigner("0"))!;
    const collectionArtifacts = await locklift.factory.getContractArtifacts("Collection");

    // calculation of deployed Collection contract address
    const collectionAddress = await locklift.provider.getExpectedAddress(
        collectionArtifacts.abi,
        {
            tvc: collectionArtifacts.tvc,
            publicKey: signer.publicKey,
            initParams: {} // we don't have any initParams for collection
        }
    );
    // initialize contract object by locklift
    const collectionInsance = await locklift.factory.getDeployedContract(
        "Collection",
        collectionAddress
    );

    // creating new account for Collection calling (or you can get already deployed by locklift.factory.accounts.addExistingAccount)
    const { account: someAccount } = await locklift.factory.accounts.addNewAccount({
        type: WalletTypes.WalletV3,
        value: toNano(10),
        publicKey: signer.publicKey
    });
    // call mintNft function
    // firstly get current nft id (totalSupply) for future NFT address calculating
    const {count: id} = await collectionInsance.methods.totalSupply({ answerId: 0 }).call();
    await collectionInsance.methods.mintNft({ json: `{"name":"hello world"}` }).send({ from: someAccount.address, amount: toNano(1)});
    const {nft: nftAddress} = await collectionInsance.methods.nftAddress({ answerId: 0, id: id }).call();
  
    console.log(`NFT: ${nftAddress.toString()}`);
}
  
main()
    .then(() => process.exit(0))
    .catch(e => {
        console.log(e);
        process.exit(1);
    });
  