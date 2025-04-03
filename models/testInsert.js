const db = require('./JourneyDB');

// Insert a new journey
const stmt = db.prepare('INSERT INTO journeys (user_id, name) VALUES (?, ?)');
const info = stmt.run(1, 'My First Customer Journey');

console.log('✅ Journey inserted with ID:', info.lastInsertRowid);
