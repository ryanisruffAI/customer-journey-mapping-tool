// update-schema.js
const Database = require('better-sqlite3');
const db = new Database('journeys.db');

try {
  console.log('Starting schema update...');

  // Begin transaction
  db.prepare('BEGIN TRANSACTION').run();

  // 1. Check if the broken column already exists in the actions table
  const actionsColumns = db.prepare(`PRAGMA table_info(actions)`).all();
  const brokenColumnExists = actionsColumns.some(col => col.name === 'broken');

  if (!brokenColumnExists) {
    console.log('Adding broken column to actions table...');
    // Add the broken column
    db.prepare(`ALTER TABLE actions ADD COLUMN broken INTEGER DEFAULT 0`).run();
    // Update existing records: mark actions with null target_step_id as broken
    db.prepare(`UPDATE actions SET broken = 1 WHERE target_step_id IS NULL`).run();
  } else {
    console.log('The broken column already exists in the actions table.');
  }

  // 2. Check if the tag column exists in the problems table
  const problemsColumns = db.prepare(`PRAGMA table_info(problems)`).all();
  const tagColumnExists = problemsColumns.some(col => col.name === 'tag');

  if (!tagColumnExists) {
    console.log('Adding tag column to problems table...');
    db.prepare('ALTER TABLE problems ADD COLUMN tag TEXT').run();
  } else {
    console.log('The tag column already exists in the problems table.');
  }

  // 3. Check if the ai_generated column exists in the problems table
  const aiGeneratedColumnExists = problemsColumns.some(col => col.name === 'ai_generated');

  if (!aiGeneratedColumnExists) {
    console.log('Adding ai_generated column to problems table...');
    db.prepare('ALTER TABLE problems ADD COLUMN ai_generated INTEGER DEFAULT 0').run();
  } else {
    console.log('The ai_generated column already exists in the problems table.');
  }

  // 4. Check if the validations table exists
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  const validationsTableExists = tables.some(table => table.name === 'validations');

  if (!validationsTableExists) {
    console.log('Creating validations table...');
    db.prepare(`
      CREATE TABLE validations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        problem_id INTEGER NOT NULL,
        problem_summary TEXT,
        proposed_solution TEXT,
        founder_fit TEXT,
        revenue_model TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
      )
    `).run();

    // Create index on problem_id
    db.prepare('CREATE INDEX idx_validations_problem_id ON validations(problem_id)').run();
    console.log('Validations table created successfully.');
  } else {
    console.log('The validations table already exists.');
  }

  // Commit transaction
  db.prepare('COMMIT').run();

  console.log('Schema update completed successfully.');
} catch (error) {
  // Rollback changes if there was an error
  db.prepare('ROLLBACK').run();
  console.error('Error updating schema:', error);
}