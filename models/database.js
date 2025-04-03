// Import the better-sqlite3 library
const Database = require('better-sqlite3');

// Create (or open) the database file named 'user_auth.db'
const db = new Database('user_auth.db');

// Create a users table if it doesn't already exist
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )
`).run();

// Export the db so other files can use it
module.exports = db;
