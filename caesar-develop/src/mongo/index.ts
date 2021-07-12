import { MongoClient, Collection, DbCollectionOptions } from 'mongodb';
import config from './../config';
import { AsyncHook } from 'async_hooks';

let conn;
async function getConn() : Promise<MongoClient> {
  if (!conn) {
    conn = await MongoClient.connect(config.mongo);
  }

  return conn;
}

export async function serverlist_store() : Promise<Collection<any>> {
  const conn = await getConn();
  const db = conn.db();
  return db.collection('serverlist_store');
}

export async function serverlist_live_regular () : Promise<Collection<any>> {
  const conn = await getConn();
  const db = conn.db();
  return db.collection('serverlist_live_regular');
}

export async function serverlist_live_featured () : Promise<Collection<any>> {
  const conn = await getConn();
  const db = conn.db();
  return db.collection('serverlist_live_featured');
}

export async function serverlist_live_premium () : Promise<Collection<any>> {
  const conn = await getConn();
  const db = conn.db();
  return db.collection('serverlist_live_premium');
}

export async function servers () : Promise<Collection<any>> {
  const conn = await getConn();
  const db = conn.db();
  return db.collection('servers');
}

export async function serverlist_invitestats () : Promise<Collection<any>> {
  const conn = await getConn();
  const db = conn.db();
  return db.collection('serverlist_invitestats');
}

export default {
  serverlist_store,
  serverlist_live_regular,
  serverlist_live_featured,
  serverlist_live_premium,
  serverlist_invitestats
}
