const db = require('./models/JourneyDB');

// Create Journey API (POST /api/journeys)
app.post('/api/journeys', (req, res) => {
  const { user_id, name } = req.body;
  if (!name) return res.status(400).json({ error: 'Journey name is required' });

  const stmt = db.prepare('INSERT INTO journeys (user_id, name) VALUES (?, ?)');
  const info = stmt.run(user_id || 1, name); // default user_id = 1 for now

  res.json({ message: '✅ Journey created', journey_id: info.lastInsertRowid });
});
