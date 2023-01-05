import React, { useEffect, useState } from 'react';
import { Address, ProviderRpcClient } from 'everscale-inpage-provider';
import { BaseNftJson, formatBalance, formatDate } from '../utils/helpers';

import AuctionSendForm from './AuctionSendForm';

import copyIcon from '../styles/img/copy.svg';

// Do not forget about ABI. We need it to call our smart contracts!
import auctionAbi from '../abi/Auction.abi.json';
import nftAbi from '../abi/NFT.abi.json';
// Store it somwhere....for example in separate files for constants
import { AUCTION_ADDRESS } from '../utils/constants';

type Props = {
  address: string | undefined;
  balance: string | undefined;
  standaloneProvider: ProviderRpcClient | undefined;
  venomProvider: ProviderRpcClient | undefined;
  tokenWalletAddress: string | undefined;
  checkBalance: () => void;
};
type NftAnswer = {
  _nft: Address;
};

// uncommented get methods of this component are obvious
function NftAuction({ address, balance, standaloneProvider, venomProvider, tokenWalletAddress, checkBalance }: Props) {
  const auctionContract = standaloneProvider
    ? new standaloneProvider.Contract(auctionAbi, new Address(AUCTION_ADDRESS))
    : undefined;
  // Some state variables from Auction smart contract. You can just check ABI.
  const [nftUrl, setNftUrl] = useState<string | undefined>();
  const [currenBid, setCurrentBid] = useState<string | undefined>();
  const [currentWinner, setCurrentWinner] = useState<string | undefined>();
  const [endTime, setEndTime] = useState<string | undefined>();
  // we will use this bool as a flag to update all data (after success tokens transaction for participation)
  const [needUpdate, setNeedUpdate] = useState(false);
  const [isCopied, setCopied] = useState(false);
  const getNftAddress = async (): Promise<Address | undefined> => {
    if (!auctionContract) return undefined;
    const answer = (await auctionContract.methods._nft({} as never).call()) as NftAnswer;
    if (!answer) return undefined;
    return answer._nft;
  };
  // we need to read the NFT contract here to get NFT itself (NFT data json)
  const getNftUrl = async (provider: ProviderRpcClient, nftAddress: Address): Promise<string> => {
    const nftContract = new provider.Contract(nftAbi, nftAddress);
    const result = (await nftContract.methods.getJson({ answerId: 0 } as never).call()) as { json: string };
    const json = JSON.parse(result.json ?? '{}') as BaseNftJson;
    return json.preview?.source || '';
  };
  // loadNFT - get NFT address from Auction contract and get data from NFT contract
  const loadNft = async (provider: ProviderRpcClient) => {
    const nftAddress = await getNftAddress();
    if (!nftAddress) return;
    const _nftUrl = await getNftUrl(provider, nftAddress);
    if (!_nftUrl) return;
    setNftUrl(_nftUrl);
  };
  const getCurrentBid = async (): Promise<string | undefined> => {
    if (!auctionContract) return undefined;
    const { _currentBid } = await auctionContract.methods._currentBid({} as never).call();
    return formatBalance(_currentBid) || '0';
  };
  const getCurrentWinner = async (): Promise<string | undefined> => {
    if (!auctionContract) return undefined;
    const result = (await auctionContract.methods._currentWinner({} as never).call()) as any;
    return result._currentWinner._address;
  };
  const getEndTime = async (): Promise<string | undefined> => {
    if (!auctionContract) return undefined;
    const { _endTime } = await auctionContract.methods._endTime({} as never).call();
    return formatDate(_endTime);
  };
  // Bring it all together :) We need it for hook
  const loadAuctionInfo = async (provider: ProviderRpcClient) => {
    try {
      await loadNft(provider);
      const _currentBid = await getCurrentBid();
      setCurrentBid(_currentBid);
      const _currentWinner = await getCurrentWinner();
      setCurrentWinner(_currentWinner);
      const _endTime = await getEndTime();
      setEndTime(_endTime);
    } catch (e) {
      console.error(e);
    }
  };
  const updateData = async () => {
    await checkBalance();
    const _currentBid = await getCurrentBid();
    setCurrentBid(_currentBid);
    const _currentWinner = await getCurrentWinner();
    setCurrentWinner(_currentWinner);
    setNeedUpdate(false);
  };
  const copyText = (text: string | undefined) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
    });
  };
  useEffect(() => {
    if (isCopied) {
      setTimeout(() => {
        setCopied(false);
      }, 700);
    }
  }, [isCopied]);
  // Main hooks for loading and updating our info
  useEffect(() => {
    if (standaloneProvider) loadAuctionInfo(standaloneProvider);
  }, [standaloneProvider]);
  useEffect(() => {
    if (needUpdate && standaloneProvider) updateData();
  }, [needUpdate]);
  return (
    <div className="card">
      <div className="card__wrap">
        <h1>My Venom NFT Auction</h1>
        <div className="item-info">
          <span>Ends:</span>
          {endTime && <b>{endTime} UTC</b>}
        </div>
        {nftUrl && <img src={nftUrl} alt="nft" />}
        <div className="info-group">
          <div className="item-info">
            <span>Last Bid</span>
            {currenBid && <b>{currenBid} TST</b>}
          </div>
          <div className="item-info item-info_copy">
            {currentWinner && <p id="copyText">{currentWinner}</p>}
            <img src={copyIcon} alt="copy" onClick={() => copyText(currentWinner)} />
            <span className={isCopied ? 'success-copy show' : 'success-copy'} id="success-copy">
              Text copied!
            </span>
          </div>
        </div>
        {address && tokenWalletAddress && (
          <AuctionSendForm
            address={address}
            balance={balance}
            venomProvider={venomProvider}
            tokenWalletAddress={tokenWalletAddress}
            setNeedUpdate={setNeedUpdate}
          />
        )}
      </div>
    </div>
  );
}

export default NftAuction;
