import React, { useState } from 'react';
import { Address, ProviderRpcClient } from 'everscale-inpage-provider';
// this helper is doing just multiplying by 10 ** 9 (decimals)
import { getValueForSend } from '../utils/helpers';

// Do not forget about ABI. We need it to call our smart contracts!
import tokenWalletAbi from '../abi/TokenWallet.abi.json';
// Store it somwhere....for example in separate files for constants
import { AUCTION_ADDRESS } from '../utils/constants';

type Props = {
  address: string;
  balance: string | undefined;
  venomProvider: ProviderRpcClient | undefined;
  tokenWalletAddress: string;
  setNeedUpdate: (value: boolean) => void;
};
function AuctionSendForm({ address, balance, venomProvider, tokenWalletAddress, setNeedUpdate }: Props) {
  // amount of tokens to bet with helpers to increase/decrease it and change
  // we need it just for our layout (input firld with increase/decrease buttons)
  const [tokenAmount, setTokenAmount] = useState<number | undefined>(0);
  const increaseAmount = () => {
    if (!tokenAmount && Number(balance) >= 1) {
      setTokenAmount(1);
    } else if (tokenAmount && tokenAmount + 1 <= Number(balance)) setTokenAmount(tokenAmount + 1);
  };
  const decreaseAmount = () => {
    if (!tokenAmount || tokenAmount <= 0) return;
    setTokenAmount(tokenAmount - 1);
  };
  const onChangeAmount = (e: string) => {
    if (e === '') setTokenAmount(undefined);
    if (Number(e) <= Number(balance)) setTokenAmount(Number(e));
  };
  // main function of all dAPP! :)
  const bet = async () => {
    try {
      if (!venomProvider || !tokenAmount) return;
      // TokenWallet address was passed here from somewhere (from NftAuction component)
      const tokenWalletContract = new venomProvider.Contract(tokenWalletAbi, new Address(tokenWalletAddress));
      // Just a common call of smart contract, nothing special and pretty easy
      // The only one difference - usage of .send() function
      // When we use send(), firstly we call our venom wallet (logged user's wallet) and then venom wallet will call our target contract internally (by sendTransaction method)
      // So you need to call send() when you own callee internally (by wallet address)
      const result = await tokenWalletContract.methods
        .transfer({
          amount: getValueForSend(tokenAmount),
          recipient: new Address(AUCTION_ADDRESS),
          deployWalletValue: 0,
          remainingGasTo: new Address(address),
          notify: true,
          payload: '',
        } as never)
        .send({ from: new Address(address), amount: getValueForSend(1), bounce: true });
      if (result?.id?.lt && result?.endStatus === 'active') {
        // when our tx is success we need to refresh parent component with new data
        setNeedUpdate(true);
      }
    } catch (e) {
      console.error(e);
    }
  };
  return (
    <>
      <div className="item-info item-info_mt">
        <span>My Token Balance</span>
        <b>{balance}</b>
      </div>
      <div className="card__amount">
        <div className="number">
          <span>Amount</span>
          <button className="number__minus" type="button" onClick={decreaseAmount} />
          <input
            type="number"
            min={0}
            value={tokenAmount !== undefined ? tokenAmount : ''}
            onChange={(e) => {
              onChangeAmount(e.target.value);
            }}
          />
          <button className="number__plus" type="button" onClick={increaseAmount} />
        </div>
        <a className={!tokenAmount ? 'btn disabled' : 'btn'} onClick={bet}>
          Bid
        </a>
      </div>
    </>
  );
}

export default AuctionSendForm;
