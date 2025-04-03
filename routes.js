    const User = require('./models/user');
    var passport = require('passport');
    const db = require('./models/JourneyDB');  // ✅ Moved to the top for clarity
// Middleware to ensure the user is authenticated
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
}

    module.exports = function (app) {

      // Home route
      app.get('/', function (req, res) {
          res.render('index', { user : req.user });
      });

      // Registration routes
      app.get('/register', function(req, res) {
          res.render('register', {});
      });

      app.post('/register', async function(req, res) {
          try {
              const existingUser = User.findByUsername(req.body.username);
              if (existingUser) {
                  return res.render("register", { info: "Sorry. That username already exists. Try again." });
              }
              await User.register(req.body.username, req.body.password);
              req.login({ username: req.body.username }, function(err) {
                  if (err) { return next(err); }
                  return res.redirect('/');
              });
          } catch (err) {
              console.error(err);
              res.render("register", { info: "Registration failed." });
          }
      });

      // Login routes
      app.get('/login', function(req, res) {
          res.render('login', { user: req.user });
      });

      app.post('/login', function(req, res, next) {
          passport.authenticate('local', function(err, user, info) {
              if (err) { return next(err); }
              if (!user) { 
                  return res.render('login', { info: 'Invalid username or password' });
              }
              req.logIn(user, function(err) {
                  if (err) { return next(err); }
                  return res.redirect('/');
              });
          })(req, res, next);
      });

      // Logout route
      app.get('/logout', function(req, res) {
          req.logout();
          res.redirect('/');
      });

      // Ping test route
      app.get('/ping', function(req, res) {
          res.send("pong!", 200);
      });

        // ✅ API Route to create a journey
        app.post('/api/journeys', ensureAuthenticated, (req, res) => {
            const { name } = req.body;
            if (!name) return res.status(400).json({ error: 'Journey name is required' });

            // Always use the logged-in user's ID
            const userId = parseInt(req.user.id);

            const stmt = db.prepare('INSERT INTO journeys (user_id, name) VALUES (?, ?)');
            const info = stmt.run(userId, name);

            res.json({ message: '✅ Journey created', journey_id: info.lastInsertRowid });
        });

 // ✅ API Route to fetch all journeys (only those owned by the current user)
 app.get('/api/journeys', ensureAuthenticated, (req, res) => {
            const userId = parseInt(req.user.id);
            const journeys = db.prepare('SELECT * FROM journeys WHERE user_id = ?').all(userId);
            res.json(journeys);
        });
        // ✅ Update a journey by ID
 app.put('/api/journeys/:journeyId', ensureAuthenticated, (req, res) => {
          const { journeyId } = req.params;
          const { name } = req.body;

          if (!name) return res.status(400).json({ error: 'Journey name is required' });

          const stmt = db.prepare('UPDATE journeys SET name = ? WHERE id = ?');
          const info = stmt.run(name, journeyId);

          res.json({ message: '✅ Journey updated', changes: info.changes });
        });

        
        // API Route to get a specific journey by ID
        app.get('/api/journeys/:journeyId', ensureAuthenticated, (req, res) => {
            
          // Retrieve the journey
          const journey = db.prepare('SELECT * FROM journeys WHERE id = ?').get(journeyId);

          if (!journey) {
            return res.status(404).json({ error: 'Journey not found' });
          }

          // For debugging - log the user ID and journey owner ID
          console.log('User ID:', req.user.id, 'Journey owner ID:', journey.user_id);

 if (parseInt(journey.user_id) !== parseInt(req.user.id)) {
  return res.status(403).json({ error: 'Forbidden: You do not own this journey' });
            }

          res.json(journey);
        });
        // ✅ Secure DELETE a journey by ID
        app.delete('/api/journeys/:journeyId', ensureAuthenticated, (req, res) => {
          const { journeyId } = req.params;

          // Retrieve the journey to verify ownership
          const journey = db.prepare('SELECT * FROM journeys WHERE id = ?').get(journeyId);
          if (!journey) {
            return res.status(404).json({ error: 'Journey not found' });
          }
          if (parseInt(journey.user_id) !== parseInt(req.user.id)) {
            return res.status(403).json({ error: 'Forbidden: You do not own this journey' });
          }

          // If ownership is confirmed, delete the journey
          const stmt = db.prepare('DELETE FROM journeys WHERE id = ?');
          const info = stmt.run(journeyId);

          res.json({ message: '✅ Journey deleted', changes: info.changes });
        });
        // ✅ Secure API Route to add a step to a journey
        app.post('/api/journeys/:journeyId/steps', ensureAuthenticated, (req, res) => {
            const { journeyId } = req.params;
            const { name, location, info } = req.body;

            if (!name || !location || !info) {
                return res.status(400).json({ error: 'Name, location, and info are required' });
            }

            // Retrieve the journey to check ownership
            const journey = db.prepare('SELECT * FROM journeys WHERE id = ?').get(journeyId);
            if (!journey) {
                return res.status(404).json({ error: 'Journey not found' });
            }

            // For debugging - log the user ID and journey owner ID
            console.log('Create Step - User ID:', req.user.id, 'Journey owner ID:', journey.user_id);

            if (parseInt(journey.user_id) !== parseInt(req.user.id)) {
                return res.status(403).json({ error: 'Forbidden: You do not own this journey' });
            }
            // If ownership is confirmed, add the step
            const stmt = db.prepare('INSERT INTO steps (journey_id, name, location, info) VALUES (?, ?, ?, ?)');
            const result = stmt.run(journeyId, name, location, info);

            res.json({ message: '✅ Step added', step_id: result.lastInsertRowid });
        });
        // ✅ Secure API Route to fetch steps for a specific journey
        app.get('/api/journeys/:journeyId/steps', ensureAuthenticated, (req, res) => {
            const journeyId = req.params.journeyId;

            // Retrieve the journey to verify ownership
            const journey = db.prepare('SELECT * FROM journeys WHERE id = ?').get(journeyId);
            if (!journey) {
                return res.status(404).json({ error: 'Journey not found' });
            }

            // For debugging - log the user ID and journey owner ID
            console.log('Steps - User ID:', req.user.id, 'Journey owner ID:', journey.user_id);

            if (parseInt(journey.user_id) !== parseInt(req.user.id)) {
              return res.status(403).json({ error: 'Forbidden: You do not own this journey' });
            }

            // If ownership is verified, fetch the steps
            const steps = db.prepare('SELECT * FROM steps WHERE journey_id = ?').all(journeyId);
            res.json(steps);
        });
        // GET a single step with its actions
        app.get('/api/steps/:stepId', ensureAuthenticated, (req, res) => {
          const { stepId } = req.params;

          // Retrieve the step
          const step = db.prepare('SELECT * FROM steps WHERE id = ?').get(stepId);

          if (!step) {
            return res.status(404).json({ error: 'Step not found' });
          }

          // Retrieve the journey that the step belongs to
          const journey = db.prepare('SELECT * FROM journeys WHERE id = ?').get(step.journey_id);

          if (!journey) {
            return res.status(404).json({ error: 'Journey not found' });
          }

          // For debugging - log the user ID and journey owner ID
          console.log('Get Step - User ID:', req.user.id, 'Journey owner ID:', journey.user_id);

          // Check ownership
          if (parseInt(journey.user_id) !== parseInt(req.user.id)) {
            return res.status(403).json({ error: 'Forbidden: You do not own this journey' });
          }

          // Get all actions for this step
          const actions = db.prepare('SELECT * FROM actions WHERE step_id = ?').all(stepId);

          // Return step with its actions
          res.json({
            ...step,
            actions
          });
        });
// ✅ Update a specific step in a journey
app.put('/api/steps/:stepId', ensureAuthenticated, (req, res) => {
    const { stepId } = req.params;
    const { name, location, info } = req.body;

    if (!name || !location || !info) {
      return res.status(400).json({ error: 'All fields are required' });
          }
    // Retrieve the step record using the stepId from the URL
    const step = db.prepare('SELECT * FROM steps WHERE id = ?').get(stepId);
    if (!step) {
      return res.status(404).json({ error: 'Step not found' });
    }
    
    // Retrieve the journey that the step belongs to
    const journey = db.prepare('SELECT * FROM journeys WHERE id = ?').get(step.journey_id);
    if (!journey) {
      return res.status(404).json({ error: 'Journey not found' });
    }
    // Check if the authenticated user owns the journey
    if (parseInt(journey.user_id) !== parseInt(req.user.id)) {
      return res.status(403).json({ error: 'Forbidden: You do not own this journey' });
    }

          const stmt = db.prepare('UPDATE steps SET name = ?, location = ?, info = ? WHERE id = ?');
          const result = stmt.run(name, location, info, stepId);

          res.json({ message: '✅ Step updated', changes: result.changes });
        });
        // ✅ Delete a step by ID
        // ✅ Secure Delete a step by ID
            app.delete('/api/steps/:stepId', ensureAuthenticated, (req, res) => {
              const { stepId } = req.params;

              // Retrieve the step from the database
              const step = db.prepare('SELECT * FROM steps WHERE id = ?').get(stepId);
              if (!step) {
                return res.status(404).json({ error: 'Step not found' });
              }

              // Retrieve the journey that the step belongs to
              const journey = db.prepare('SELECT * FROM journeys WHERE id = ?').get(step.journey_id);
              if (!journey) {
                return res.status(404).json({ error: 'Journey not found' });
              }

                // Check if the authenticated user owns the journey
 if (parseInt(journey.user_id) !== parseInt(req.user.id)) {
    return res.status(403).json({ error: 'Forbidden: You do not own this journey' });
                }

              // Find all actions that reference this step as their target
              const actionsQuery = db.prepare('SELECT * FROM actions WHERE target_step_id = ?');
              const actionsPointingToStep = actionsQuery.all(stepId);

              // Update all those actions to set target_step_id to null and mark as broken
              if (actionsPointingToStep.length > 0) {
                const updateActionsQuery = db.prepare('UPDATE actions SET target_step_id = NULL, broken = 1 WHERE target_step_id = ?');
                updateActionsQuery.run(stepId);
              }

              // Now delete the actions that belong to this step
              const deleteStepActionsQuery = db.prepare('DELETE FROM actions WHERE step_id = ?');
              deleteStepActionsQuery.run(stepId);

              // Finally, delete the step
              const stmt = db.prepare('DELETE FROM steps WHERE id = ?');
              const result = stmt.run(stepId);

              // Return success with info about broken links
              res.json({
                message: '✅ Step deleted',
                changes: result.changes,
                brokenLinks: actionsPointingToStep.length,
                brokenActionIds: actionsPointingToStep.map(action => action.id)
              });
            });


        // ✅ Secure API Route to add an action to a specific step
        app.post('/api/steps/:stepId/actions', ensureAuthenticated, (req, res) => {
          const { stepId } = req.params;
          const { action_text, target_step_id } = req.body;

          if (!action_text) {
            return res.status(400).json({ error: 'Action text is required' });
          }

          // Retrieve the step to verify that it exists
          const step = db.prepare('SELECT * FROM steps WHERE id = ?').get(stepId);
          if (!step) {
            return res.status(404).json({ error: 'Step not found' });
          }

          // Retrieve the journey associated with this step to check ownership
          const journey = db.prepare('SELECT * FROM journeys WHERE id = ?').get(step.journey_id);
          if (!journey) {
            return res.status(404).json({ error: 'Journey not found' });
          }
          if (parseInt(journey.user_id) !== parseInt(req.user.id)) {
            return res.status(403).json({ error: 'Forbidden: You do not own this journey' });
          }

          const stmt = db.prepare('INSERT INTO actions (step_id, action_text, target_step_id) VALUES (?, ?, ?)');
          const result = stmt.run(stepId, action_text, target_step_id || null);

          res.json({ message: '✅ Action added', action_id: result.lastInsertRowid });
        });

        // ✅ Secure API Route to fetch actions for a specific step
        app.get('/api/steps/:stepId/actions', ensureAuthenticated, (req, res) => {
          const { stepId } = req.params;

          // Retrieve the step to verify it exists
          const step = db.prepare('SELECT * FROM steps WHERE id = ?').get(stepId);
          if (!step) {
            return res.status(404).json({ error: 'Step not found' });
          }

          // Retrieve the journey associated with the step to check ownership
          const journey = db.prepare('SELECT * FROM journeys WHERE id = ?').get(step.journey_id);
          if (!journey) {
            return res.status(404).json({ error: 'Journey not found' });
          }
     if (parseInt(journey.user_id) !== parseInt(req.user.id)) {
              return res.status(403).json({ error: 'Forbidden: You do not own this journey' });
            }

          const actions = db.prepare('SELECT * FROM actions WHERE step_id = ?').all(stepId);
          res.json(actions);
        });

        // ✅ API Route to update an action by ID
        // ✅ Secure API Route to update an action by ID
        app.put('/api/actions/:actionId', ensureAuthenticated, (req, res) => {
          const { actionId } = req.params;
          const { action_text, target_step_id } = req.body;

          if (!action_text) {
            return res.status(400).json({ error: 'Action text is required' });
          }

          // Retrieve the action record
          const action = db.prepare('SELECT * FROM actions WHERE id = ?').get(actionId);
          if (!action) return res.status(404).json({ error: 'Action not found' });

          // Retrieve the step record associated with this action
          const step = db.prepare('SELECT * FROM steps WHERE id = ?').get(action.step_id);
          if (!step) return res.status(404).json({ error: 'Step not found for this action' });

          // Retrieve the journey associated with this step
          const journey = db.prepare('SELECT * FROM journeys WHERE id = ?').get(step.journey_id);
          if (!journey) return res.status(404).json({ error: 'Journey not found' });

          // Check that the authenticated user owns the journey
            if (parseInt(journey.user_id) !== parseInt(req.user.id)) {
              return res.status(403).json({ error: 'Forbidden: You do not own this journey' });
            }
          // All checks passed—update the action
          const stmt = db.prepare('UPDATE actions SET action_text = ?, target_step_id = ? WHERE id = ?');
          const result = stmt.run(action_text, target_step_id || null, actionId);

          res.json({ message: '✅ Action updated', changes: result.changes });
        });

        // ✅ Secure API Route to delete an action by ID
        app.delete('/api/actions/:actionId', ensureAuthenticated, (req, res) => {
          const { actionId } = req.params;

          // Retrieve the action record
          const action = db.prepare('SELECT * FROM actions WHERE id = ?').get(actionId);
          if (!action) return res.status(404).json({ error: 'Action not found' });

          // Retrieve the step associated with this action
          const step = db.prepare('SELECT * FROM steps WHERE id = ?').get(action.step_id);
          if (!step) return res.status(404).json({ error: 'Step not found for this action' });

          // Retrieve the journey associated with this step
          const journey = db.prepare('SELECT * FROM journeys WHERE id = ?').get(step.journey_id);
          if (!journey) return res.status(404).json({ error: 'Journey not found' });

            // Check that the authenticated user owns the journey
            if (parseInt(journey.user_id) !== parseInt(req.user.id)) {
              return res.status(403).json({ error: 'Forbidden: You do not own this journey' });
            }

          // All checks passed—delete the action
          const stmt = db.prepare('DELETE FROM actions WHERE id = ?');
          const result = stmt.run(actionId);

          res.json({ message: '✅ Action deleted', changes: result.changes });
        });

// ✅ API Route to find all broken links in a journey
app.get('/api/journeys/:journeyId/broken-links', ensureAuthenticated, (req, res) => {
  const { journeyId } = req.params;

  // Verify the journey exists and belongs to the user
  const journey = db.prepare('SELECT * FROM journeys WHERE id = ? AND user_id = ?').get(journeyId, req.user.id);
  if (!journey) {
    return res.status(404).json({ error: 'Journey not found or unauthorized' });
  }

  // Find all actions with broken links in this journey
  const brokenLinksQuery = `
    SELECT a.id, a.action_text, a.step_id as source_step_id, s.name as source_step_name 
    FROM actions a
    JOIN steps s ON a.step_id = s.id
    WHERE s.journey_id = ? AND (a.target_step_id IS NULL OR a.broken = 1)
  `;

  const brokenLinks = db.prepare(brokenLinksQuery).all(journeyId);

  // Get all available steps in this journey for fixing the links
  const availableStepsQuery = 'SELECT id, name FROM steps WHERE journey_id = ? ORDER BY name';
  const availableSteps = db.prepare(availableStepsQuery).all(journeyId);

  res.json({
    broken_links: brokenLinks,
    available_steps: availableSteps
  });
});

// ✅ API Route to fix a broken link
app.put('/api/actions/:actionId/fix', ensureAuthenticated, (req, res) => {
  const { actionId } = req.params;
  const { target_step_id } = req.body;

  if (!target_step_id) {
    return res.status(400).json({ error: 'target_step_id is required' });
  }

  // Get the action
  const action = db.prepare('SELECT * FROM actions WHERE id = ?').get(actionId);
  if (!action) {
    return res.status(404).json({ error: 'Action not found' });
  }

  // Get the step this action belongs to
  const step = db.prepare('SELECT * FROM steps WHERE id = ?').get(action.step_id);
  if (!step) {
    return res.status(404).json({ error: 'Source step not found' });
  }

    // Get the journey to verify ownership
    const journey = db.prepare('SELECT * FROM journeys WHERE id = ?').get(step.journey_id);
    if (!journey || parseInt(journey.user_id) !== parseInt(req.user.id)) {
      return res.status(403).json({ error: 'Unauthorized: You do not own this journey' });
    }

  // Verify the target step exists and belongs to the same journey
  const targetStep = db.prepare('SELECT * FROM steps WHERE id = ? AND journey_id = ?').get(target_step_id, step.journey_id);
  if (!targetStep) {
    return res.status(400).json({ error: 'Target step not found or not in this journey' });
  }

  // Update the action to point to the new step and clear the broken flag
  const updateQuery = db.prepare('UPDATE actions SET target_step_id = ?, broken = 0 WHERE id = ?');
  const result = updateQuery.run(target_step_id, actionId);

  res.json({
    message: '✅ Link fixed',
    changes: result.changes
  });
});
        // ✅ End of module.exports
        };
