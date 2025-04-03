const db = require('./database');  // This is where you connect to your SQLite database
const bcrypt = require('bcrypt');  // For hashing passwords

// ✅ Function to register (create) a new user
exports.register = async (username, password) => {
  const hashedPassword = await bcrypt.hash(password, 10);  // Hash the password
  const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
  stmt.run(username, hashedPassword);  // Save user to the database
};

// ✅ Function to find a user by username (used in login)
exports.findByUsername = (username) => {
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  return stmt.get(username);  // Returns the user row or undefined
};

// ✅ Function to verify password during login
exports.verifyPassword = async (user, password) => {
  return await bcrypt.compare(password, user.password);  // Compares input password to hashed password
};
