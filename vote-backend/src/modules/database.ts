import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

// helper for returning a connection to our sqlite
export async function getConnection() {
  return open({
    filename: `/tmp/${process.env.DB_DATABASE}.db`,
    driver: sqlite3.cached.Database
  })
};

// Here we will initialize or ballot table. Just store ballot address and it's owner there
// We will call this right after express initialization.
export async function initDB() {
  const db = await getConnection();
  db.on('trace', (data: any) => {
    console.log('SQL trace:', data);
  });
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ballots(
      id INTEGER PRIMARY KEY NOT NULL,
      address varchar(66) NOT NULL UNIQUE,
      owner varchar(66) NOT NULL UNIQUE
    )
  `);
  console.log('DB initialized!');
}

