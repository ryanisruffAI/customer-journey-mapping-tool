const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/user');  // Import your user model

module.exports = function(passport) {

  // Store user info in session
  passport.serializeUser((user, done) => {
    done(null, user.username);
  });

  // Retrieve user info from session
  passport.deserializeUser((username, done) => {
    const user = User.findByUsername(username);
    if (user) {
      done(null, user);
    } else {
      done(null, false);
    }
  });

  // Define the login strategy using SQLite user model
  passport.use(new LocalStrategy(async (username, password, done) => {
    const user = User.findByUsername(username);
    if (!user) {
      return done(null, false, { message: 'Incorrect username.' });
    }

    const isValid = await User.verifyPassword(user, password);
    if (isValid) {
      return done(null, user);
    } else {
      return done(null, false, { message: 'Incorrect password.' });
    }
  }));
};
