async function main() {
    const signer = (await locklift.keystore.getSigner("0"))!;
    const nftArtifacts = await locklift.factory.getContractArtifacts("NFT");
    const indexArtifacts = await locklift.factory.getContractArtifacts("Index");
    const indexBasisArtifacts = await locklift.factory.getContractArtifacts("IndexBasis");
    const { contract: sample, tx } = await locklift.factory.deployContract({
        contract: "Collection",
        publicKey: signer.publicKey,
        initParams: {},
        constructorParams: {
            codeNft: nftArtifacts.code,
            codeIndex: indexArtifacts.code,
            codeIndexBasis: indexBasisArtifacts.code,
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