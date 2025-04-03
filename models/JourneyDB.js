const Database = require('better-sqlite3');
const fs = require('fs');

// Open (or create) the database file
const db = new Database('journeys.db');

// Load and run the schema SQL
const schema = fs.readFileSync('./schema.sql', 'utf8');
db.exec(schema);

// Export the database instance so we can use it elsewhere
module.exports = db;
