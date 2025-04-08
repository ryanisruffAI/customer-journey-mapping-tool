CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS journeys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  journey_id INTEGER,
  name TEXT DEFAULT 'Untitled Step',
  location TEXT,
  info TEXT,
  FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  step_id INTEGER,
  action_text TEXT,
  target_step_id INTEGER,
  broken INTEGER DEFAULT 0,
  FOREIGN KEY (step_id) REFERENCES steps(id),
  FOREIGN KEY (target_step_id) REFERENCES steps(id)
);

-- Problems table for Ideation
CREATE TABLE IF NOT EXISTS problems (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  domain TEXT,
  problem_description TEXT,
  interest_level TEXT CHECK(interest_level IN ('Not Interested', 'Somewhat Interested', 'Very Interested')),
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Validations table for Validation
CREATE TABLE IF NOT EXISTS validations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  problem_id INTEGER,
  description TEXT,
  size TEXT,
  solution TEXT,
  team_fit TEXT,
  revenue_strategy TEXT,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(problem_id) REFERENCES problems(id) ON DELETE SET NULL
);