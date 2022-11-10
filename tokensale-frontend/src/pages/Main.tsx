import { Address, ProviderRpcClient } from 'everscale-inpage-provider';
import React, { useEffect, useState } from 'react';
import { VenomConnect } from 'venom-connect';

import BackImg from '../styles/img/decor.svg';
import LogOutImg from '../styles/img/log_out.svg';


// Importing of our contract ABI from smart-contract build action. Of cource we need ABI for contracts calls.
import tokenRootAbi from '../abi/TokenRoot.abi.json';
import tokenWalletAbi from '../abi/TokenWallet.abi.json';

import ConnectWallet from '../components/ConnectWallet'
import SaleForm from '../components/SaleForm';

type Props = {
  venomConnect: VenomConnect | undefined;
};

function Main({ venomConnect }: Props) {

  const [venomProvider, setVenomProvider] = useState<any>();
  const [address, setAddress] = useState();

  // We will store token balance from contract
  const [balance, setBalance] = useState<string | undefined>();
  let tokenWalletAddress: string | undefined; // User's TIP-3 TokenWallet address

  // This method allows us to gen a wallet address from inpage provider
  const getAddress = async (provider: any) => {
    const providerState = await provider?.getProviderState?.();
    return providerState?.permissions.accountInteraction?.address.toString();
  };

  // This function will call walletOf function of TokenRoot contract, to obtain TokenWallet of connecte4d user.
  const setupTokenWalletAddress = async (standalone: ProviderRpcClient, wallet: string): Promise<string | undefined> => {
    try {
      const contractAddress = new Address('0:91470b9a77ada682c9f9aee5ae0a4e2ea549ee51f7b0f2cba5182ffec2eb233f'); // Our TokenRoot address in venom testnet
      // We will use standalone-client form our venomConnect instance to call a view method of contract
      const contract = new standalone.Contract(tokenRootAbi, contractAddress); // creating a contract instance with contract address and interface (ABI)
      // Smart-contract calling. Function walletOf of TokenRoot will calculate user's tokenWallet address by it's VenomWallet address (wich was connected)
      const tokenWallet = (await contract.methods
        .walletOf({
          answerId: 0,
          walletOwner: wallet,
        } as never)
        .call()) as any;
      if (!tokenWallet) return undefined;
      tokenWalletAddress = tokenWallet.value0._address;
      return tokenWalletAddress;
    } catch (e: any) {
      console.error(e);
    }
    return undefined;
  };

  // Same idea for token balance fetching. Usage of standalone client and balance method of TIP-3 TokenWallet
  // We already knows user's TokenWallet address
  const getBalance = async (wallet: string) => {
    if (!venomConnect) return;
    const standalone: ProviderRpcClient | undefined = await venomConnect?.getStandalone('venomwallet');
    if (standalone) {
      if (!tokenWalletAddress) {
        await setupTokenWalletAddress(standalone, wallet);
      }
      if (!venomProvider || !tokenWalletAddress) return;
      try {
        const contractAddress = new Address(tokenWalletAddress);
        const contract = new standalone.Contract(tokenWalletAbi, contractAddress);
        // We check a contract state here to acknowledge if TokenWallet already deployed
        // As you remember, wallet can be deployed with first transfer on it.
        // If our wallet isn't deployed, so it's balance is 0 :)
        const contractState = await venomProvider.rawApi.getFullContractState({ address: tokenWalletAddress });
        if (contractState.state) {
          // But if this deployed, just call a balance function
          const result = (await contract.methods.balance({ answerId: 0 } as never).call()) as any;
          const tokenBalance = result.value0; // It will be with decimals. Format if you want by dividing with 10**decimals
          setBalance(tokenBalance);
        } else {
          setBalance('0');
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      alert('Standalone is not available now');
    }
  };

  // Any interaction with venom-wallet (address fetching is included) needs to be authentificated
  const checkAuth = async (_venomConnect: any) => {
    const auth = await _venomConnect?.checkAuth();
    if (auth) await getAddress(_venomConnect);
  };

  // This handler will be called after venomConnect.login() action
  // connect method returns provider to interact with wallet, so we just store it in state
  const onConnect = async (provider: any) => {
    setVenomProvider(provider);
    await onProviderReady(provider);
  };

  // This handler will be called after venomConnect.disconnect() action
  // By click logout. We need to reset address and balance.
  const onDisconnect = async () => {
    venomProvider?.disconnect();
    setAddress(undefined);
    setBalance(undefined);
    tokenWalletAddress = undefined;

  };

  // When our provider is ready, we need to get address and balance from.
  const onProviderReady = async (provider: any) => {
    const venomWalletAddress = provider ? await getAddress(provider) : undefined;
    setAddress(venomWalletAddress);
  };

  useEffect(() => {
    // connect event handler
    const off = venomConnect?.on('connect', onConnect);
    if (venomConnect) {
      checkAuth(venomConnect);
    }
    // just an empty callback, cuz we don't need it
    return () => {
      off?.();
    };
  }, [venomConnect]);

  // Hook for balance setup
  useEffect(() => {
    if (address) getBalance(address);
  }, [address]);


  return (
    <div className="box">
      {address && (
        <header>
          <p>{address}</p>
          <a className="logout" onClick={onDisconnect}>
            <img src={LogOutImg} alt="Logout" />
          </a>
        </header>
      )}

      <img className="decor" src={BackImg} alt="back" />
      <div className="card">
        <div className="card__wrap">
          {address ? (
            <SaleForm
              address={address}
              balance={balance}
              venomConnect={venomConnect}
              provider={venomProvider}
              getBalance={getBalance}
            />
          ) : (
            <ConnectWallet venomConnect={venomConnect} />
          )}
        </div>
      </div>
    </div>
  );
}
  
export default Main;