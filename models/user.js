const db = require('./JourneyDB');// This is where you connect to your SQLite database
const bcrypt = require('bcrypt');  // For hashing passwords

// ✅ Function to register (create) a new user
exports.register = async (username, password) => {
  try {
    console.log('Registering user:', username);
    const hashedPassword = await bcrypt.hash(password, 10);  // Hash the password
    const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
    const result = stmt.run(username, hashedPassword);  // Save user to the database
    console.log('User registered with ID:', result.lastInsertRowid);

    // Retrieve the full user record to confirm registration
    const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    console.log('Retrieved new user record:', newUser);
    return newUser;
  } catch (error) {
    console.error('Error during user registration in model:', error);
    throw error;
  }
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
