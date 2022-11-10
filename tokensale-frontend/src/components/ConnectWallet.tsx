import React from 'react';
import { VenomConnect } from 'venom-connect';

type Props = {
  venomConnect: VenomConnect | undefined;
};

function ConnectWallet({ venomConnect }: Props) {
  const login = async () => {
    if (!venomConnect) return;
    await venomConnect.connect();
  };
  return (
    <div>
      <>
        <h1>My Venom Crowdsale</h1>
        <p>Connect Wallet to continue</p>
        <a className="btn" onClick={login}>
          Connect wallet
        </a>
      </>
    </div>
  );
}
  
export default ConnectWallet;
  