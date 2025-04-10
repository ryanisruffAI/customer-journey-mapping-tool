// openai-service.js
const { OpenAI } = require('openai');
require('dotenv').config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generates AI problems based on survey responses
 * @param {Object} surveyData Survey responses from wizard
 * @returns {Promise<Array>} Array of generated problem suggestions
 */
async function generateAIProblems(surveyData) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a problem statement writer for entrepreneurs looking for startup ideas.
Your task is to create problem statements that highlight pain points WITHOUT suggesting solutions.
Each problem statement should be one sentence focused solely on the problem.

DO NOT include any solutions, products, features or "how to" statements.
DO NOT use phrases like "need for", "lack of", or "absence of" as these imply solutions.
DO NOT start with "How might we" or similar solution-oriented framings.

Examples of BAD problem statements (DO NOT DO THESE):
- "Implement a better user interface for banking apps"
- "Design a platform that connects freelancers with clients"
- "Create an app that tracks fitness progress"
- "Build a solution for managing remote teams better"

Examples of GOOD problem statements:
- "Small business owners struggle to manage cash flow during seasonal fluctuations"
- "Students find it difficult to maintain focus during long study sessions"
- "Remote workers experience social isolation affecting their mental health"
- "Parents lack reliable methods to monitor their children's online activities"

Focus on real user pain points, frustrations, and challenges.`
        },
        {
          role: "user",
          content: `Based on my survey responses, generate 5 one-sentence problem statements that represent potential startup opportunities:

My hobby/passion: ${surveyData.hobby}
A skill I could teach others: ${surveyData.teach}
A natural talent I have: ${surveyData.talent}
A skill I want to improve: ${surveyData.skill}
An insight I've had recently: ${surveyData.insight}

Remember: ONLY generate problem statements without any solutions or implementation ideas.`
        }
      ],
      temperature: 0.7,
      max_tokens: 700
    });

    // Extract problem statements and format as an array of objects
    const content = response.choices[0].message.content;

    // Parse numbered or bullet-pointed list
    const problemsList = content.split('\n')
      .filter(line => line.trim().length > 0) // Remove empty lines
      .map(line => line.replace(/^\d+[\.\)-]\s*|^-\s*/, '').trim()); // Remove numbering/bullets

    // Create problem objects
    const problems = problemsList.map((problem, index) => ({
      id: index,
      problem_description: problem,
      domain: detectDomain(problem),
      ai_generated: true,
      tag: detectTag(problem)
    }));

    return problems;
  } catch (error) {
    console.error('Error generating AI problems:', error);
    throw error;
  }
}

/**
 * Generates similar problems based on an original problem
 * @param {string} originalProblem The seed problem to generate from
 * @param {string} tag Problem category tag
 * @returns {Promise<Array>} Array of similar problems
 */
async function generateSimilarProblems(originalProblem, tag) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a problem statement writer for entrepreneurs.
Your task is to create alternative problem statements similar to a given one.
Each problem statement should be one sentence focused solely on the problem.

DO NOT include any solutions, products, features or "how to" statements.
DO NOT use phrases like "need for", "lack of", or "absence of" as these imply solutions.`
        },
        {
          role: "user",
          content: `Based on this original problem: "${originalProblem}" in the category "${tag}", 
generate EXACTLY 2 similar one-sentence problem statements without suggesting any solutions.
Each statement should represent a related but distinct problem in the same general domain.
Focus only on the problems, with no solutions mentioned or implied.`
        }
      ],
      temperature: 0.7,
      max_tokens: 400
    });

    // Extract the similar problems
    const content = response.choices[0].message.content;

    // Parse numbered or bullet-pointed list
    const problemsList = content.split('\n')
      .filter(line => line.trim().length > 0) // Remove empty lines
      .map(line => line.replace(/^\d+[\.\)-]\s*|^-\s*/, '').trim()); // Remove numbering/bullets

    // Create problem objects
    const problems = problemsList.map((problem, index) => ({
      id: index,
      problem_description: problem,
      domain: tag || detectDomain(problem),
      ai_generated: true,
      tag: tag || detectTag(problem)
    }));

    return problems;
  } catch (error) {
    console.error('Error generating similar problems:', error);
    throw error;
  }
}

/**
 * Generates validation details for a problem
 * @param {string} problemDescription The problem statement
 * @param {string} tag Problem category
 * @returns {Promise<Object>} Validation details
 */
async function generateValidationDetails(problemDescription, tag) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a startup validation expert. Your role is to help entrepreneurs validate problem statements and explore potential solutions."
        },
        {
          role: "user",
          content: `For the following problem in the "${tag}" category:
"${problemDescription}"

Provide a validation analysis with the following components:
1. Problem Summary: A rephrased, clear statement of the core problem
2. Proposed Solution: A potential solution approach (not a specific product)
3. Founder Fit: Why someone with my background might be well-positioned to solve this
4. Revenue Model: 1-2 potential business models that could address this problem

Keep each section concise - about 2-3 sentences each.`
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const content = response.choices[0].message.content;

    // Parse the validation sections
    const sections = {
      problem_summary: '',
      proposed_solution: '',
      founder_fit: '',
      revenue_model: ''
    };

    let currentSection = null;

    content.split('\n').forEach(line => {
      line = line.trim();
      if (line.startsWith('Problem Summary:')) {
        currentSection = 'problem_summary';
        sections[currentSection] = line.replace('Problem Summary:', '').trim();
      } else if (line.startsWith('Proposed Solution:')) {
        currentSection = 'proposed_solution';
        sections[currentSection] = line.replace('Proposed Solution:', '').trim();
      } else if (line.startsWith('Founder Fit:')) {
        currentSection = 'founder_fit';
        sections[currentSection] = line.replace('Founder Fit:', '').trim();
      } else if (line.startsWith('Revenue Model:')) {
        currentSection = 'revenue_model';
        sections[currentSection] = line.replace('Revenue Model:', '').trim();
      } else if (currentSection && line) {
        sections[currentSection] += ' ' + line;
      }
    });

    return sections;
  } catch (error) {
    console.error('Error generating validation details:', error);
    throw error;
  }
}

/**
 * Detects a domain/category for a problem based on keywords
 * @param {string} text Problem statement
 * @returns {string} Detected domain 
 */
function detectDomain(text) {
  const lowerText = text.toLowerCase();

  const domains = {
    'Health': ['health', 'fitness', 'exercise', 'diet', 'nutrition', 'wellness', 'medical', 'patient'],
    'Education': ['education', 'learning', 'student', 'teacher', 'school', 'college', 'university', 'academic'],
    'Finance': ['finance', 'money', 'budget', 'financial', 'investment', 'saving', 'expense', 'cost'],
    'Technology': ['technology', 'tech', 'software', 'hardware', 'app', 'digital', 'online', 'device'],
    'Productivity': ['productivity', 'time management', 'organization', 'efficiency', 'workflow', 'task', 'procrastination'],
    'Business': ['business', 'entrepreneur', 'startup', 'company', 'market', 'customer', 'client', 'professional'],
    'Social': ['social', 'communication', 'community', 'connection', 'relationship', 'network', 'interaction'],
    'Environment': ['environment', 'sustainability', 'eco', 'climate', 'green', 'recycle', 'waste', 'carbon']
  };

  for (const [domain, keywords] of Object.entries(domains)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return domain;
    }
  }

  return 'General';
}

/**
 * Detects a tag for a problem based on keywords
 * @param {string} text Problem statement
 * @returns {string} Detected tag
 */
function detectTag(text) {
  const lowerText = text.toLowerCase();

  const tags = {
    'Time Management': ['time', 'schedule', 'deadline', 'procrastination', 'productivity'],
    'Career Development': ['career', 'job', 'professional', 'work', 'workplace'],
    'Health & Wellness': ['health', 'wellness', 'exercise', 'fitness', 'diet', 'nutrition'],
    'Mental Health': ['mental health', 'stress', 'anxiety', 'depression', 'wellbeing'],
    'Education': ['education', 'learning', 'student', 'teaching', 'academic'],
    'Technology': ['technology', 'tech', 'digital', 'online', 'software', 'app'],
    'Financial': ['finance', 'money', 'financial', 'budget', 'expense'],
    'Social': ['social', 'communication', 'connection', 'relationship'],
    'Entertainment': ['entertainment', 'leisure', 'hobby', 'fun', 'game'],
    'Everyday Life': ['daily', 'routine', 'life', 'home', 'household']
  };

  for (const [tag, keywords] of Object.entries(tags)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return tag;
    }
  }

  return 'General';
}

module.exports = {
  generateAIProblems,
  generateSimilarProblems,
  generateValidationDetails
};