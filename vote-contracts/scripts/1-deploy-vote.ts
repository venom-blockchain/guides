import { Address } from "locklift";

async function main() {
  const signer = (await locklift.keystore.getSigner("0"))!;
  const { contract: vote, tx } = await locklift.factory.deployContract({
    contract: "Vote",
    publicKey: signer.publicKey,
    initParams: {
      _nonce: locklift.utils.getRandomNonce(),
      _ballotCode: (await locklift.factory.getContractArtifacts("Ballot")).code
    },
    constructorParams: {
      managerPublicKey: `0x${signer.publicKey}`,
      sendRemainingGasTo: new Address("0:ece57bcc6c530283becbbd8a3b24d3c5987cdddc3c8b7b33be6e4a6312490415")
    },
    value: locklift.utils.toNano(3),
  });

  console.log(`Vote deployed at: ${vote.address.toString()}`);
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
