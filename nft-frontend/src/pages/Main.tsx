import React, { useEffect, useState } from 'react';
import { VenomConnect } from 'venom-connect';
import { ProviderRpcClient } from 'everscale-inpage-provider';
import fonImg from '../styles/img/decor.svg';
import CollectionItems from '../components/CollectionItems';
import LogOutImg from '../styles/img/log_out.svg';
import MyItems from '../components/MyItems';

type Props = {
  venomConnect: VenomConnect | undefined;
};

enum Tab {
  COLLECTION_ITEMS,
  MY_ITEMS,
}

function Main({ venomConnect }: Props) {
  const [venomProvider, setVenomProvider] = useState<any>();
  const [standaloneProvider, setStandAloneProvider] = useState<ProviderRpcClient | undefined>();
  const [myCollectionItems, setMyCollectionItems] = useState<string[] | undefined>();
  const [address, setAddress] = useState();
  const [activeTab, setActiveTab] = useState<Tab>(Tab.COLLECTION_ITEMS);

  // This method allows us to gen a wallet address from inpage provider
  const getAddress = async (provider: any) => {
    const providerState = await provider?.getProviderState?.();
    return providerState?.permissions.accountInteraction?.address.toString();
  };

  // Any interaction with venom-wallet (address fetching is included) needs to be authentificated
  const checkAuth = async (_venomConnect: any) => {
    const auth = await _venomConnect?.checkAuth();
    if (auth) await getAddress(_venomConnect);
  };

  // Method for getting a standalone provider from venomConnect instance
  const initStandalone = async () => {
    const standalone = await venomConnect?.getStandalone();
    setStandAloneProvider(standalone);
  };

  // Handling click of login button. We need to call connect method of out VenomConnect instance, this action will call other connect handlers
  const onLogin = async () => {
    if (!venomConnect) return;
    await venomConnect.connect();
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
  };

  // When our provider is ready, we need to get address and balance from.
  const onProviderReady = async (provider: any) => {
    const venomWalletAddress = provider ? await getAddress(provider) : undefined;
    setAddress(venomWalletAddress);
  };

  useEffect(() => {
    const off = venomConnect?.on('connect', onConnect);
    if (venomConnect) {
      initStandalone();
      checkAuth(venomConnect);
    }
    return () => {
      off?.();
    };
  }, [venomConnect]);
  return (
    <div className="box">
      <header>
        <div className="menu">
          <a
            className={activeTab === Tab.COLLECTION_ITEMS ? 'menu_item active' : 'menu_item'}
            onClick={() => setActiveTab(Tab.COLLECTION_ITEMS)}
          >
            Collection items
          </a>
          <a
            className={activeTab === Tab.MY_ITEMS ? 'menu_item active' : 'menu_item'}
            onClick={() => setActiveTab(Tab.MY_ITEMS)}
          >
            My items
          </a>
        </div>
        {address ? (
          <>
            {' '}
            <p>{`${(address as string)?.slice(0, 6)} ••• ${(address as string)?.slice(-4)}`}</p>
            <a className="logout" onClick={onDisconnect}>
              <img src={LogOutImg} alt="Log out" />
            </a>
          </>
        ) : (
          <a className="btn" onClick={onLogin}>
            Connect wallet
          </a>
        )}
      </header>
      <img className="decor" alt="fon" src={fonImg} />
      {activeTab === Tab.COLLECTION_ITEMS ? (
        <CollectionItems standaloneProvider={standaloneProvider} />
      ) : (
        <MyItems
          address={address}
          standaloneProvider={standaloneProvider}
          myCollectionItems={myCollectionItems}
          setMyCollectionItems={setMyCollectionItems}
        />
      )}
    </div>
  );
}

export default Main;
