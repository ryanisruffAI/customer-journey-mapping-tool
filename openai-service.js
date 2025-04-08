// openai-service.js

console.log("DEBUG: Starting openai-service.js");

const { OpenAI } = require('openai');

console.log("DEBUG: OpenAI imported:", !!OpenAI);
console.log("DEBUG: OPENAI_API_KEY available in openai-service.js:", !!process.env.OPENAI_API_KEY);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateProblemSuggestions(domain) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a startup advisor specializing in identifying valuable business opportunities. Generate specific, actionable startup problems that are worthy of solving in the given domain."
        },
        {
          role: "user",
          content: `Generate 3 specific startup-worthy problems in the domain of ${domain}. 
          Format your response as a valid JSON array with objects containing 'title' and 'description' fields. 
          The problems should be specific, significant, frequent, urgent, and underserved.
          Example format: 
          [
            {
              "title": "Short problem title",
              "description": "Detailed explanation of the problem and why it matters"
            }
          ]`
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    // Parse the JSON from the response text
    const suggestionsText = response.choices[0].message.content.trim();
    const suggestions = JSON.parse(suggestionsText);
    return suggestions;
  } catch (error) {
    console.error('Error generating problem suggestions:', error);
    throw error;
  }
}

console.log("DEBUG: About to export generateProblemSuggestions");

// Export the function
module.exports.generateProblemSuggestions = generateProblemSuggestions;

console.log("DEBUG: module.exports is now:", module.exports);
