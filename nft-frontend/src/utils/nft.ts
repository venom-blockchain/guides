import { Address, ProviderRpcClient } from 'everscale-inpage-provider';
// Of course you need to place a contract ABI somewhere
import nftAbi from '../abi/NFT.abi.json';
import indexAbi from '../abi/Index.abi.json';

// TIP-4.2. standard (https://docs.venom.foundation/standards/TIP-4/2)
interface BaseNftJson {
  name?: string;
  description?: string;
  preview?: {
    source: string;
    mimetype: string;
  };
  files?: Array<{
    source: string;
    mimetype: string;
  }>;
  external_url?: string;
}

type IndexInfo = {
  collection: Address;
  owner: Address;
  nft: Address;
};

// Extract an preview field of NFT's json
export const getNftImage = async (provider: ProviderRpcClient, nftAddress: Address): Promise<string> => {
  const nftContract = new provider.Contract(nftAbi, nftAddress);
  // calling getJson function of NFT contract
  const getJsonAnswer = (await nftContract.methods.getJson({ answerId: 0 } as never).call()) as { json: string };
  const json = JSON.parse(getJsonAnswer.json ?? '{}') as BaseNftJson;

  return json.preview?.source || '';
};

// Returns array with NFT's images urls
export const getCollectionItems = async (provider: ProviderRpcClient, nftAddresses: Address[]): Promise<string[]> => {
  return Promise.all(
    nftAddresses.map(async (nftAddress) => {
      const imgInfo = (await getNftImage(provider, nftAddress)) as string;
      return imgInfo;
    })
  );
};

export const getNftsByIndexes = async (provider: ProviderRpcClient, indexAddresses: Address[]): Promise<string[]> => {
  const nftAddresses = await Promise.all(
    indexAddresses.map(async (indexAddress) => {
      console.log(indexAddress)
      const indexContract = new provider.Contract(indexAbi, indexAddress);
      const indexInfo = (await indexContract.methods.getInfo({ answerId: 0 } as never).call()) as IndexInfo;
      return indexInfo.nft;
    })
  );
  return getCollectionItems(provider, nftAddresses)
}
