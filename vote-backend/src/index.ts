import express, { Express } from 'express';
import * as bodyParser from 'body-parser';
import { initDB } from './modules/database';
import * as api from './modules/api';
import { listenNewBallotEvent } from './modules/blockchain';

console.log('Running app..');

// express initializing
const app: Express = express();
app.use(bodyParser.json())
// our api controller
app.use('/ballots', api.ballotsRouter);

app.listen(process.env.PORT, async () => {
  // db initialization by our script
  await initDB();
  // NewBallot event handler
  await listenNewBallotEvent();
  console.log(`Example app listening on port ${process.env.PORT}`)
})
