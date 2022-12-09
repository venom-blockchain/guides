import React, { useEffect, useState } from 'react';
import { Address, ProviderRpcClient } from 'everscale-inpage-provider';
import Gallery from './Gallery';
// Store it somwhere....for example in separate files for constants
import { COLLECTION_ADDRESS } from '../utils/constants';
// Our implemented util
import { getNftsByIndexes } from '../utils/nft';

type Props = {
  address?: string;
  standaloneProvider: ProviderRpcClient | undefined;
  myCollectionItems: string[] | undefined;
  setMyCollectionItems: (value: string[] | undefined) => void;
};

function MyItems({ address, standaloneProvider, myCollectionItems, setMyCollectionItems }: Props) {
  const [listIsEmpty, setListIsEmpty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Method to returning a salted index code (base64)
  const saltCode = async (provider: ProviderRpcClient, ownerAddress: string) => {
    // Index StateInit you should take from github. It ALWAYS constant!
    const INDEX_BASE_64 = 'te6ccgECIAEAA4IAAgE0AwEBAcACAEPQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAgaK2zUfBAQkiu1TIOMDIMD/4wIgwP7jAvILHAYFHgOK7UTQ10nDAfhmifhpIds80wABn4ECANcYIPkBWPhC+RDyqN7TPwH4QyG58rQg+COBA+iogggbd0CgufK0+GPTHwHbPPI8EQ4HA3rtRNDXScMB+GYi0NMD+kAw+GmpOAD4RH9vcYIImJaAb3Jtb3Nwb3T4ZNwhxwDjAiHXDR/yvCHjAwHbPPI8GxsHAzogggujrde64wIgghAWX5bBuuMCIIIQR1ZU3LrjAhYSCARCMPhCbuMA+EbycyGT1NHQ3vpA0fhBiMjPjits1szOyds8Dh8LCQJqiCFus/LoZiBu8n/Q1PpA+kAwbBL4SfhKxwXy4GT4ACH4a/hs+kJvE9cL/5Mg+GvfMNs88gAKFwA8U2FsdCBkb2Vzbid0IGNvbnRhaW4gYW55IHZhbHVlAhjQIIs4rbNYxwWKiuIMDQEK103Q2zwNAELXTNCLL0pA1yb0BDHTCTGLL0oY1yYg10rCAZLXTZIwbeICFu1E0NdJwgGOgOMNDxoCSnDtRND0BXEhgED0Do6A34kg+Gz4a/hqgED0DvK91wv/+GJw+GMQEQECiREAQ4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAD/jD4RvLgTPhCbuMA0x/4RFhvdfhk0ds8I44mJdDTAfpAMDHIz4cgznHPC2FeIMjPkll+WwbOWcjOAcjOzc3NyXCOOvhEIG8TIW8S+ElVAm8RyM+EgMoAz4RAzgH6AvQAcc8LaV4gyPhEbxXPCx/OWcjOAcjOzc3NyfhEbxTi+wAaFRMBCOMA8gAUACjtRNDT/9M/MfhDWMjL/8s/zsntVAAi+ERwb3KAQG90+GT4S/hM+EoDNjD4RvLgTPhCbuMAIZPU0dDe+kDR2zww2zzyABoYFwA6+Ez4S/hK+EP4QsjL/8s/z4POWcjOAcjOzc3J7VQBMoj4SfhKxwXy6GXIz4UIzoBvz0DJgQCg+wAZACZNZXRob2QgZm9yIE5GVCBvbmx5AELtRNDT/9M/0wAx+kDU0dD6QNTR0PpA0fhs+Gv4avhj+GIACvhG8uBMAgr0pCD0oR4dABRzb2wgMC41OC4yAAAADCD4Ye0e2Q==';
    // Gettind a code from Index StateInit
    const tvc = await provider.splitTvc(INDEX_BASE_64);
    if (!tvc.code) throw new Error('tvc code is empty');
    // Salt structure that we already know
    const saltStruct = [
      { name: 'collection', type: 'address' },
      { name: 'owner', type: 'address' },
      { name: 'type', type: 'fixedbytes3' }, // according on standards, each index salted with string 'nft'
    ] as const;
    const { code: saltedCode } = await provider.setCodeSalt({
      code: tvc.code,
      salt: {
        structure: saltStruct,
        abiVersion: '2.1',
        data: {
          collection: new Address(COLLECTION_ADDRESS),
          owner: new Address(ownerAddress),
          type: btoa('nft'),
        },
      },
    });
    return saltedCode;
  };

  // Method, that return Index'es addresses by single query with fetched code hash
  const getAddressesFromIndex = async (codeHash: string): Promise<Address[] | undefined> => {
    const addresses = await standaloneProvider?.getAccountsByCodeHash({ codeHash });
    return addresses?.accounts;
  };

  // Main method of this component
  const loadNFTs = async (provider: ProviderRpcClient, ownerAddress: string) => {
    setIsLoading(true);
    setListIsEmpty(false);
    try {
      // Take a salted code
      const saltedCode = await saltCode(provider, ownerAddress);
      // Hash it
      const codeHash = await provider.getBocHash(saltedCode);
      if (!codeHash) {
        setIsLoading(false);
        return;
      }
      // Fetch all Indexes by hash
      const indexesAddresses = await getAddressesFromIndex(codeHash);
      if (!indexesAddresses || !indexesAddresses.length) {
        if (indexesAddresses && !indexesAddresses.length) setListIsEmpty(true);
        setIsLoading(false);
        return;
      }
      // Fetch all image URLs
      const nftURLs = await getNftsByIndexes(provider, indexesAddresses);
      setMyCollectionItems(nftURLs);
      setIsLoading(false);
    } catch (e) {
      console.error(e);
      setIsLoading(false);
    }
  };
  useEffect(() => {
    if (address && standaloneProvider) loadNFTs(standaloneProvider, address);
    if (!address) setListIsEmpty(false);
  }, [address]);
  return (
    <Gallery
      isLoading={isLoading}
      collectionsItems={myCollectionItems}
      title={address ? undefined : 'Please connect your wallet'}
      listIsEmpty={listIsEmpty}
    />
  );
}

export default MyItems;
