import { Address, Contract, ProviderRpcClient, Subscriber } from "everscale-inpage-provider";
import { EverscaleStandaloneClient, SimpleKeystore } from "everscale-standalone-client/nodejs";
import { readFileSync } from 'fs';
import { resolve } from 'path';

// importing an ABI here
import { abi as ballotContractAbi } from '../abi/Ballot.abi';
import { abi as voteContractAbi } from '../abi/Vote.abi';

// Key pair for interact with Ballot contract. You can explore the logic of activation in first guide of this series.
const ballotActivationSignerKeys = {
  // suppose we have this variables in system environment...you can use dotenv for example
  public: process.env.ACTIVATE_SIGNER_PUBLIC_KEY as string,
  secret: process.env.ACTIVATE_SIGNER_SECRET_KEY as string,
};

// function for creating a standalone client
// (of course you have to create some singleton for that)
async function getClient(): Promise<ProviderRpcClient> {
  const client = new ProviderRpcClient({
    fallback: () =>
    EverscaleStandaloneClient.create({
      connection: {
        id: 1010,
        group: 'testnet',
        type: 'jrpc',
        data: {
          endpoint: 'https://jrpc-testnet.venom.foundation/rpc',
        },
      },
      // Manually creating a keystore for our client, because we haven't wallet extension here...we are not in browser
      keystore: new SimpleKeystore({
        [ballotActivationSignerKeys.public]: {
          publicKey: ballotActivationSignerKeys.public,
          secretKey: ballotActivationSignerKeys.secret,
        }
      }),
    }),
  });
  await client.ensureInitialized();
  await client.requestPermissions({ permissions: ['basic'] });
  return client;
}

// Just a little helper. Returns a Ballot contract instance.
function getBallotContract(
  client: ProviderRpcClient,
  address: string,
): Contract<typeof ballotContractAbi> {
  const contractAbi = JSON.parse(
    readFileSync(
      resolve(process.cwd(), 'src/abi/Ballot.abi.json'), // yes, just place it somewhere
      'utf-8'
    )
  );
  return new client.Contract(contractAbi, new Address(address));
}

// Sends an external message to Ballot, signed by Vote owner. (Ballot activation logic)
export async function activateBallot(ballotAddress: string): Promise<string | undefined> {
  try {
    const client = await getClient();
    const ballotContract = getBallotContract(client, ballotAddress);
    const response = await ballotContract.methods.activate({}).sendExternal({
      publicKey: ballotActivationSignerKeys.public, // It must be in our client's keystore!!! With private!!!
    });
    if (response.transaction.aborted) {
      throw new Error ('Transaction aborted');
    }
    return ballotAddress;
  } catch (error) {
    return undefined;
  }
}

// Just a little helper. Returns a Vote contract instance.
function getVoteContract(
  client: ProviderRpcClient
): Contract<typeof voteContractAbi> {
  const contractAbi = JSON.parse(
    readFileSync(
      resolve(process.cwd(), 'src/abi/Vote.abi.json'),
      'utf-8'
    )
  );
  return new client.Contract(contractAbi, new Address(process.env.VOTE_CONTRACT_ADDRESS!));
}

// NewBallot event listener (Vote contract)
export async function listenNewBallotEvent() {
  const client = await getClient();
  const voteContract = getVoteContract(client);
  
  const subscriber = new Subscriber(client);
  voteContract
    .events(subscriber)
    .filter((event) => event.event === 'NewBallot')
    .on(async (event) => {
      // here is our event
      const eventData = {
        ballotAddress: event.data.ballotAddress.toString(),
        owner: event.data.owner.toString(),
      };
      // here we will implement a saving to database
    })
  console.log(`Subscribed to NewBallot`);
}
