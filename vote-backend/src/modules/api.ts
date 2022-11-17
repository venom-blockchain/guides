import { Router } from "express";
import { getConnection } from "./database";
import { activateBallot } from "./blockchain";

// initialize express router, we will use it later
export const ballotsRouter = Router();

// returns a list with all stored ballots
ballotsRouter.get("/", async function (req, res) {
  const connection = await getConnection();
  const ballots = await connection.all<any[]>('SELECT * FROM ballots');
  res.json(ballots);
});

// ballot activation by owner's address
// body = {owner: <address>}
ballotsRouter.post("/ballot/activate", async function (req, res) {
  const connection = await getConnection();
  const ballot = await connection.get<any>(`SELECT * FROM ballots WHERE owner = '${req.body.owner}'`);
  if (!ballot) {
    return res.status(404).json({ success: false, message: 'Ballot not found' });
  }
  // this is a function we implemented in blockchain module
  const result = await activateBallot(ballot.address);
  if (!result) {
    return res.status(400).json({ success: false, message: 'Can not activate ballot' });
  }
  res.json(ballot);
});

// bonus method! Activation of random ten ballots!
ballotsRouter.post("/lottery", async function (req, res) {
  const connection = await getConnection();
  const ballots = await connection.all<any[]>('SELECT * FROM ballots ORDER BY RANDOM() LIMIT 10');
  const promises = [];
  for (const ballot of ballots) {
    promises.push(activateBallot(ballot.address));
  }
  const results = await Promise.allSettled(promises);
  const response = { 
    results: results
      .filter(res => res.status === 'fulfilled')
      .map(x => (x as PromiseFulfilledResult<any>).value)
    ,
    activatedSuccessfully: results.filter(
      res => res.status === 'fulfilled' && (res as PromiseFulfilledResult<any>)?.value
    ).length,
  };
  res.json(response);
});