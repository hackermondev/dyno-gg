import { Collection, DbCollectionOptions, MongoClient } from 'mongodb';
import config from './../config';

let _conn;
async function getConn(): Promise<MongoClient> {
	if (!_conn) {
		_conn = await MongoClient.connect(config.mongo);
	}

	return _conn;
}

export async function patreon(): Promise<Collection<any>> {
	const conn = await getConn();
	const db = conn.db();
	return db.collection('patreon');
}

export async function servers(): Promise<Collection<any>> {
	const conn = await getConn();
	const db = conn.db();
	return db.collection('servers');
}

export async function premiumUsers(): Promise<Collection<any>> {
	const conn = await getConn();
	const db = conn.db();
	return db.collection('premiumusers');
}

export async function patreonDeleteQueue(): Promise<Collection<any>> {
	const conn = await getConn();
	const db = conn.db();
	return db.collection('patreondeletequeue');
}
