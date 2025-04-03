const db = require('./JourneyDB');

// Insert a new step connected to journey ID 1
const stmt = db.prepare(`
  INSERT INTO steps (journey_id, name, location, info)
  VALUES (?, ?, ?, ?)
`);
const info = stmt.run(
  1,  // journey_id
  'Landing Page',  // Step name
  'Web',           // Location
  'User visits the landing page to learn about the product.'  // Info
);

console.log('✅ Step inserted with ID:', info.lastInsertRowid);
