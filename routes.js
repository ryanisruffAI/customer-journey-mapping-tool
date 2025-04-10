    const User = require('./models/user');
    const path = require('path');
    const openaiService = require('./openai-service');
    var passport = require('passport');
    const db = require('./models/JourneyDB');  // ✅ Moved to the top for clarity
// Middleware to ensure the user is authenticated
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
}

// Authentication check route
const checkAuth = function(req, res) {
  if (req.isAuthenticated()) {
    // Return authenticated status and basic user info
    return res.json({ 
      authenticated: true, 
      user: { 
        id: req.user.id, 
        username: req.user.username 
      } 
    });
  }
  // User is not authenticated
  return res.json({ authenticated: false });
};

      module.exports = function (app) {
        // Add this line as the first route inside the module.exports function
        app.get('/api/check-auth', checkAuth);

      // Home route
        // Home route - THIS IS CRITICAL
        app.get('/', function (req, res) {
            // If user is logged in, redirect to problems page
            if (req.isAuthenticated()) {
                return res.redirect('/problems.html');
            } else {
                // If not logged in, show the login page
                return res.sendFile(path.join(__dirname, 'public', 'index.html'));
            }
        });

        // Serve static dashboard page but enforce problems redirect if user is coming from login
        app.get('/dashboard.html', function(req, res, next) {
            if (req.headers.referer && req.headers.referer.includes('/login')) {
                return res.redirect('/problems.html');
            }
            next();
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
                  return res.redirect('/problems.html');
              });
          })(req, res, next);
      });

        // Logout route
        app.get('/logout', function(req, res, next) {
            req.logout(function(err) {
                if (err) { return next(err); }
                res.redirect('/');
            });
        });
      // Ping test route
      app.get('/ping', function(req, res) {
          res.send("pong!", 200);
      });
      // GET route to serve the problems page
      app.get('/problems', ensureAuthenticated, (req, res) => {
          res.redirect('/problems.html');
      });

      // GET route to serve the validation page
      app.get('/validation', ensureAuthenticated, (req, res) => {
          res.redirect('/validation.html');
      });

      // GET route to serve the journeys page (formerly dashboard)
      app.get('/dashboard', ensureAuthenticated, (req, res) => {
          res.redirect('/dashboard.html');
      });

      // Optional: Add an alias for clarity
      app.get('/journeys', ensureAuthenticated, (req, res) => {
          res.redirect('/dashboard.html');
      });

      // GET route to fetch all problems for the logged-in user
      app.get('/api/problems', ensureAuthenticated, async (req, res) => {
          try {
              const problems = await db.all(
                  'SELECT * FROM problems WHERE user_id = ? ORDER BY created_at DESC',
                  [req.user.id]
              );
              res.json(problems);
          } catch (err) {
              console.error('Error fetching problems:', err);
              res.status(500).json({ error: 'Failed to fetch problems' });
          }
      });

        // POST route to create a new problem
        app.post('/api/problems', ensureAuthenticated, async (req, res) => {
            console.log('POST /api/problems - Authenticated user:', req.user); // Debug log
            try {
                const { domain, problem_description, interest_level, reason } = req.body;
                // Validate required fields
                if (!domain || !problem_description || !interest_level || !reason) {
                    return res.status(400).json({ error: 'All fields are required' });
                }
                // Validate interest level
                const validInterestLevels = ['Not Interested', 'Somewhat Interested', 'Very Interested'];
                if (!validInterestLevels.includes(interest_level)) {
                    return res.status(400).json({ error: 'Invalid interest level' });
                }
                // Insert the new problem
                const result = await db.run(
                    'INSERT INTO problems (user_id, domain, problem_description, interest_level, reason) VALUES (?, ?, ?, ?, ?)',
                    [req.user.id, domain, problem_description, interest_level, reason]
                );
                // Return the newly created problem using the correct property name from the result
                const newProblem = await db.get('SELECT * FROM problems WHERE id = ?', [result.lastInsertRowid]);
                res.status(201).json(newProblem);
            } catch (err) {
                console.error('Error creating problem:', err);
                res.status(500).json({ error: 'Failed to create problem' });
            }
        });



      // GET route to fetch a specific problem
      app.get('/api/problems/:id', ensureAuthenticated, async (req, res) => {
          try {
              const problem = await db.get(
                  'SELECT * FROM problems WHERE id = ? AND user_id = ?',
                  [req.params.id, req.user.id]
              );

              if (!problem) {
                  return res.status(404).json({ error: 'Problem not found' });
              }

              res.json(problem);
          } catch (err) {
              console.error('Error fetching problem:', err);
              res.status(500).json({ error: 'Failed to fetch problem' });
          }
      });

      // DELETE route to delete a problem
      app.delete('/api/problems/:id', ensureAuthenticated, async (req, res) => {
          try {
              const problem = await db.get(
                  'SELECT * FROM problems WHERE id = ? AND user_id = ?',
                  [req.params.id, req.user.id]
              );

              if (!problem) {
                  return res.status(404).json({ error: 'Problem not found' });
              }

              await db.run('DELETE FROM problems WHERE id = ?', [req.params.id]);
              res.json({ message: 'Problem deleted successfully' });
          } catch (err) {
              console.error('Error deleting problem:', err);
              res.status(500).json({ error: 'Failed to delete problem' });
          }
      });
        // Problem suggestions route
        app.post('/api/problem-suggestions', ensureAuthenticated, async (req, res) => {
          try {
            // Get the survey responses from the request body
            const surveyData = req.body;

            if (!surveyData.hobby || !surveyData.teach || !surveyData.talent || 
                !surveyData.skill || !surveyData.insight) {
              return res.status(400).json({ error: 'All survey responses are required' });
            }

            // Generate AI problems based on the survey responses
            const suggestions = await openaiService.generateAIProblems(surveyData);
            res.json(suggestions);
          } catch (error) {
            console.error('Error in problem suggestions route:', error);
            res.status(500).json({ error: 'Failed to generate problem suggestions' });
          }
        });
        // Route to generate similar problems
        app.post('/api/similar-problems', ensureAuthenticated, async (req, res) => {
          try {
            const { originalProblem, tag } = req.body;

            if (!originalProblem) {
              return res.status(400).json({ error: 'Original problem is required' });
            }

            // Generate similar problems
            const similarProblems = await openaiService.generateSimilarProblems(
              originalProblem,
              tag || 'General'
            );
            res.json(similarProblems);
          } catch (error) {
            console.error('Error generating similar problems:', error);
            res.status(500).json({ error: 'Failed to generate similar problems' });
          }
        });
        // Route to track remaining AI-generated problems
        app.get('/api/ai-problems/remaining', ensureAuthenticated, async (req, res) => {
          try {
            // Count the number of AI-generated problems for this user
            const result = await db.get(
              'SELECT COUNT(*) as count FROM problems WHERE user_id = ? AND ai_generated = 1',
              [req.user.id]
            );

            // Calculate remaining problems (out of 20)
            const used = result?.count || 0;
            const remaining = Math.max(0, 20 - used);

            res.json({ used, remaining });
          } catch (error) {
            console.error('Error counting AI problems:', error);
            res.status(500).json({ error: 'Failed to count AI problems' });
          }
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
          try {
            console.log('========= DEBUG INFO =========');
            console.log('Request params:', req.params);
            console.log('User:', req.user ? { id: req.user.id, username: req.user.username } : 'Not authenticated');

            // Extract and parse the journey ID from the request parameters
            const journeyId = parseInt(req.params.journeyId);
            const userId = parseInt(req.user.id);

            console.log('Parsed IDs - journeyId:', journeyId, 'userId:', userId);

            // Retrieve the journey
            const journey = db.prepare('SELECT * FROM journeys WHERE id = ?').get(journeyId);
            console.log('Journey query result:', journey);

            if (!journey) {
              console.log('Journey not found');
              return res.status(404).json({ error: 'Journey not found' });
            }

            // For debugging - log the user ID and journey owner ID
            console.log('User ID:', userId, 'Journey owner ID:', journey.user_id);

            // Check ownership
            if (parseInt(journey.user_id) !== userId) {
              console.log('Forbidden: User does not own this journey');
              return res.status(403).json({ error: 'Forbidden: You do not own this journey' });
            }

            // Get steps for this journey
            const steps = db.prepare('SELECT * FROM steps WHERE journey_id = ? ORDER BY id').all(journeyId);
            console.log(`Found ${steps.length} steps for journey ${journeyId}`);

            // Get actions for each step
            const stepsWithActions = steps.map(step => {
              const actions = db.prepare('SELECT * FROM actions WHERE step_id = ?').all(step.id);
              console.log(`Found ${actions.length} actions for step ${step.id}`);
              return {
                ...step,
                actions
              };
            });

            // Return the journey with steps and actions
            const result = {
              ...journey,
              steps: stepsWithActions
            };

            console.log('Sending successful response with journey data');
            res.json(result);
          } catch (error) {
            console.error('========= ERROR =========');
            console.error('Error in /api/journeys/:journeyId endpoint:', error);
            console.error('Stack trace:', error.stack);
            res.status(500).json({ 
              error: 'Server error', 
              message: error.message 
            });
          }
        });
      // ✅ Secure DELETE a journey by ID
      app.delete('/api/journeys/:journeyId', ensureAuthenticated, (req, res) => {
        const { journeyId } = req.params;

        try {
          // Retrieve the journey to verify ownership
          const journey = db.prepare('SELECT * FROM journeys WHERE id = ?').get(journeyId);
          if (!journey) {
            return res.status(404).json({ error: 'Journey not found' });
          }
          if (parseInt(journey.user_id) !== parseInt(req.user.id)) {
            return res.status(403).json({ error: 'Forbidden: You do not own this journey' });
          }

          // Begin a transaction
          db.prepare('BEGIN TRANSACTION').run();

          // First, get all steps in the journey
          const steps = db.prepare('SELECT id FROM steps WHERE journey_id = ?').all(journeyId);
          const stepIds = steps.map(step => step.id);

          // For each step, delete its actions
          if (stepIds.length > 0) {
            // Delete actions that point to these steps as targets
            db.prepare(`UPDATE actions SET target_step_id = NULL, broken = 1 
                       WHERE target_step_id IN (${stepIds.map(() => '?').join(',')})`).run(...stepIds);

            // Delete actions that belong to these steps
            db.prepare(`DELETE FROM actions 
                       WHERE step_id IN (${stepIds.map(() => '?').join(',')})`).run(...stepIds);
          }

          // Now delete all steps
          db.prepare('DELETE FROM steps WHERE journey_id = ?').run(journeyId);

          // Finally delete the journey
          const stmt = db.prepare('DELETE FROM journeys WHERE id = ?');
          const info = stmt.run(journeyId);

          // Commit the transaction
          db.prepare('COMMIT').run();

          res.json({ message: '✅ Journey deleted', changes: info.changes });
        } catch (error) {
          // Rollback on error
          try {
            db.prepare('ROLLBACK').run();
          } catch (rollbackError) {
            console.error('Rollback failed:', rollbackError);
          }

          console.error('Error deleting journey:', error);
          res.status(500).json({ error: `Failed to delete journey: ${error.message}` });
        }
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
        app.put('/api/steps/:stepId', ensureAuthenticated, (req, res) => {
          try {
            const stepId = parseInt(req.params.stepId);
            console.log('Updating step:', stepId, 'with data:', req.body);

            // Extract data using the CORRECT field names from your schema
            const { name, location, info } = req.body;

            if (!name || !location || !info) {
              console.log('Missing required fields for step update');
              return res.status(400).json({ error: 'All fields (name, location, info) are required' });
            }

            // Retrieve the step record
            const step = db.prepare('SELECT * FROM steps WHERE id = ?').get(stepId);
            if (!step) {
              console.log('Step not found:', stepId);
              return res.status(404).json({ error: 'Step not found' });
            }

            // Retrieve the journey that the step belongs to
            const journey = db.prepare('SELECT * FROM journeys WHERE id = ?').get(step.journey_id);
            if (!journey) {
              console.log('Journey not found for step:', stepId);
              return res.status(404).json({ error: 'Journey not found' });
            }

            // Check if the authenticated user owns the journey
            console.log('Checking ownership - User:', req.user.id, 'Journey owner:', journey.user_id);
            if (parseInt(journey.user_id) !== parseInt(req.user.id)) {
              console.log('Ownership verification failed');
              return res.status(403).json({ error: 'Forbidden: You do not own this journey' });
            }

            console.log('Updating step in database...');
            const stmt = db.prepare('UPDATE steps SET name = ?, location = ?, info = ? WHERE id = ?');
            const result = stmt.run(name, location, info, stepId);

            console.log('Step update result:', result);

            // Get the updated step with its actions
            const updatedStep = db.prepare('SELECT * FROM steps WHERE id = ?').get(stepId);
            const actions = db.prepare('SELECT * FROM actions WHERE step_id = ?').all(stepId);

            // Combine the step with its actions
            const response = {
              ...updatedStep,
              actions
            };

            console.log('Step updated successfully');
            res.json(response);

          } catch (error) {
            console.error('Error updating step:', error);
            res.status(500).json({ error: 'Failed to update step', details: error.message });
          }
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
        // Add this catch-all route at the end to handle direct page access
        app.get('*.html', function(req, res, next) {
            if (!req.isAuthenticated()) {
                return res.redirect('/');
            }
            next();
        });
};