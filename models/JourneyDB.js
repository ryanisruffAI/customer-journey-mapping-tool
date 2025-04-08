const Database = require('better-sqlite3');
const fs = require('fs');

// Open (or create) the database file
const db = new Database('journeys.db');

// Load and run the schema SQL
const schema = fs.readFileSync('./schema.sql', 'utf8');
db.exec(schema);

// Add Promise-based methods to the db object
db.all = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      const stmt = this.prepare(sql);
      const rows = stmt.all(...(Array.isArray(params) ? params : [params]));
      resolve(rows);
    } catch (error) {
      reject(error);
    }
  });
};

db.get = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      const stmt = this.prepare(sql);
      const row = stmt.get(...(Array.isArray(params) ? params : [params]));
      resolve(row);
    } catch (error) {
      reject(error);
    }
  });
};

db.run = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      const stmt = this.prepare(sql);
      const info = stmt.run(...(Array.isArray(params) ? params : [params]));
      resolve(info);
    } catch (error) {
      reject(error);
    }
  });
};

// Export the database instance so we can use it elsewhere
module.exports = db;