// dependencies
const path = require('path');
const express = require('express');
const http = require('http');
const passport = require('passport');
const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

// Initialize app
const app = express();

// ✅ Add this line to parse JSON bodies from API calls
app.use(express.json());

// Set up view engine
app.set('port', process.env.PORT || 1337);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.set('view options', { layout: false });

// Middleware (updated for Express 4)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser('your secret here'));
app.use(session({ secret: 'your secret here', resave: true, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));
// Security Middleware for API routes
const API_TOKEN = process.env.API_TOKEN || 'MY_SECRET_TOKEN';

app.use('/api', (req, res, next) => {
  const token = req.headers['x-api-key'];
  if (!token || token !== API_TOKEN) {
    return res.status(403).json({ error: 'Forbidden. Invalid API token.' });
  }
  next();
});

// Passport config (✅ THIS is your updated path)
require('./config-passport/passport')(passport);

// Routes
require('./routes')(app);

// Error handling (Optional)
if (app.get('env') === 'development') {
  app.use(require('errorhandler')({ dumpExceptions: true, showStack: true }));
} else {
  app.use(require('errorhandler')());
}

// Start server
app.listen(app.get('port'), function () {
  console.log("✅ Express server listening on port " + app.get('port'));
});
