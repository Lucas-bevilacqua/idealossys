
import Database from 'better-sqlite3';
const db = new Database('idealos.db');
const users = db.prepare('SELECT * FROM users').all();
console.log('Users in DB:', JSON.stringify(users, null, 2));
const tenants = db.prepare('SELECT * FROM tenants').all();
console.log('Tenants in DB:', JSON.stringify(tenants, null, 2));
const members = db.prepare('SELECT * FROM tenant_members').all();
console.log('Members in DB:', JSON.stringify(members, null, 2));
