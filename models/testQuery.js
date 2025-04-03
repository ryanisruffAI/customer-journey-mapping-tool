const db = require('./JourneyDB');

// Fetch all journeys
const journeys = db.prepare('SELECT * FROM journeys').all();
console.log('📌 All Journeys:', journeys);

// Fetch all steps for journey ID 1
const steps = db.prepare('SELECT * FROM steps WHERE journey_id = ?').all(1);
console.log('📌 Steps for Journey 1:', steps);

// Fetch all actions for step ID 1
const actions = db.prepare('SELECT * FROM actions WHERE step_id = ?').all(1);
console.log('📌 Actions for Step 1:', actions);
