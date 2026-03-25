const Database = require('better-sqlite3');
const db = new Database('./idealos.db');

// Update user name
db.prepare("UPDATE users SET name = 'Lucas' WHERE username = 'admin'").run();
console.log('✅ User name updated to "Lucas"');

// Check result
const user = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
console.log('User in DB:', user);

db.close();
