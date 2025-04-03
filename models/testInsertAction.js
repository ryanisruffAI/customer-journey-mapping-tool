const db = require('./JourneyDB');

// Insert an action connected to Step ID 1
const stmt = db.prepare(`
  INSERT INTO actions (step_id, action_text, target_step_id)
  VALUES (?, ?, ?)
`);
const info = stmt.run(
  1,  // step_id (the 'Landing Page' step you just created)
  'Click Sign Up Button',  // Action text
  null  // No target_step yet (we'll link later or leave as null to mean "end here")
);

console.log('✅ Action inserted with ID:', info.lastInsertRowid);
