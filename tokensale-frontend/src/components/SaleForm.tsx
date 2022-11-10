import React, { useState } from 'react';
import { VenomConnect } from 'venom-connect';
import { Address, ProviderRpcClient } from 'everscale-inpage-provider';

// we will user bignumber library to operate with deposit values (remember about decimals multiply)
import BigNumber from 'bignumber.js';

// Importing of our contract ABI from smart-contract build action. Of cource we need ABI for contracts calls.
import tokenSaleAbi from '../abi/Tokensale.abi.json';

type Props = {
  balance: string | undefined;
  getBalance: (wallet: string) => void;
  venomConnect: VenomConnect | undefined;
  address: string | undefined;
  provider: ProviderRpcClient | undefined;
};

function SaleForm({ balance, venomConnect, address, provider, getBalance }: Props) {
  const [tokenAmount, setTokenAmount] = useState<number | undefined>(0);

  const onChangeAmount = (e: string) => {
    if (e === '') setTokenAmount(undefined);
    setTokenAmount(Number(e));
  };

  const buyTokens = async () => {
    if (!venomConnect || !address || !tokenAmount || !provider) return;
    const userAddress = new Address(address);
    const contractAddress = new Address("0:fac0dea61ab959bf5fc5d325b6ef97ef45ef371c8649042e92b64e46c3c854d5"); // Our Tokensale contract address
    const deposit = new BigNumber(tokenAmount).multipliedBy(10 ** 8).toString(); // Contract's rate parameter is 1 venom = 10 tokens
    // Creating an instance for Tokensale contract
    const contract = new provider.Contract(tokenSaleAbi, contractAddress);
    // another 1 venom for connection. You will receive a change, as you remember
    const amount = new BigNumber(deposit).plus(new BigNumber(1).multipliedBy(10 ** 9)).toString();;
    try {
      // and just call buyTokens method according to smart contract
      const result = await contract.methods
        .buyTokens({
          deposit,
        } as never)
        .send({
          from: userAddress,
          amount,
          bounce: true,
        });
      if (result?.id?.lt && result?.endStatus === 'active') {
        setTokenAmount(undefined);
        getBalance(address);
      }
    } catch (e) {
      console.error(e);
    }
  };
  return (
    <>
      <h1>My Venom Crowdsale</h1>
      <div className="item-info">
        <span>My Token Balance</span>
        <b>{new BigNumber(String(balance)).dividedBy(10**9).toString()}</b>
      </div>
      <div className="card__amount">
        <div className="number">
          <span>Amount</span>
          <input
            type="number"
            min={0}
            value={tokenAmount !== undefined ? tokenAmount : ''}
            onChange={(e) => {
              onChangeAmount(e.target.value);
            }}
          />
        </div>
        <a className={!tokenAmount ? 'btn disabled' : 'btn'} onClick={buyTokens}>
          Buy
        </a>
      </div>
    </>
  );
}

export default SaleForm;
