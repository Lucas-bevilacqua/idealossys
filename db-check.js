import Database from 'better-sqlite3';
const db = new Database('./idealos.db');

// Check tables
const users = db.prepare('SELECT * FROM users').all();
console.log('Users in DB:', JSON.stringify(users, null, 2));

const tenants = db.prepare('SELECT * FROM tenants').all();
console.log('Tenants in DB:', JSON.stringify(tenants, null, 2));

const members = db.prepare('SELECT * FROM tenant_members').all();
console.log('Members in DB:', JSON.stringify(members, null, 2));

const tasks = db.prepare('SELECT * FROM tasks LIMIT 5').all();
console.log('Tasks sample:', JSON.stringify(tasks, null, 2));

const artifacts = db.prepare('SELECT * FROM artifacts LIMIT 5').all();
console.log('Artifacts sample:', JSON.stringify(artifacts, null, 2));

const agent_logs = db.prepare('SELECT * FROM agent_logs LIMIT 5').all();
console.log('Agent logs sample:', JSON.stringify(agent_logs, null, 2));

db.close();