// update-schema.js
const Database = require('better-sqlite3');
const db = new Database('journeys.db');

// Check if the broken column already exists in the actions table
const columns = db.prepare(`PRAGMA table_info(actions)`).all();
const brokenColumnExists = columns.some(col => col.name === 'broken');

if (!brokenColumnExists) {
  console.log('Adding broken column to actions table...');

  // Add the broken column
  db.prepare(`ALTER TABLE actions ADD COLUMN broken INTEGER DEFAULT 0`).run();

  // Update existing records: mark actions with null target_step_id as broken
  db.prepare(`UPDATE actions SET broken = 1 WHERE target_step_id IS NULL`).run();

  console.log('Schema update complete!');
} else {
  console.log('The broken column already exists in the actions table.');
}