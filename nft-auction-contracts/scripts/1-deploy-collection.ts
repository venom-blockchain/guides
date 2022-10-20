async function main() {
    const signer = (await locklift.keystore.getSigner("0"))!;
    const nftArtifacts = await locklift.factory.getContractArtifacts("NFT");
    const { contract: sample, tx } = await locklift.factory.deployContract({
        contract: "Collection",
        publicKey: signer.publicKey,
        initParams: {},
        constructorParams: {
            codeNft: nftArtifacts.code,
            json: `{"collection":"tutorial"}`
        },
        value: locklift.utils.toNano(5),
    });
    
    console.log(`Collection deployed at: ${sample.address.toString()}`);
}

main()
    .then(() => process.exit(0))
    .catch(e => {
        console.log(e);
        process.exit(1);
    });