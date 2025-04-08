const Database = require('better-sqlite3');
const path = require('path');

// Adjust the database file name/path if necessary. For example, if your database is "journeys.db"
const dbPath = path.join(__dirname, 'journeys.db');
const db = new Database(dbPath);

// Query all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log("Tables in database:");
console.log(tables);

// Query all users from the 'users' table
try {
  const users = db.prepare("SELECT * FROM users").all();
  console.log("Users in database:");
  console.log(users);
} catch (error) {
  console.error("Error querying users table:", error);
}

db.close();
