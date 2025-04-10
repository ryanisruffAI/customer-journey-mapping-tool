Sure, I'll show you exactly what to do. Here's a clear step-by-step approach:

## Step 1: Back up your current file

Before making any changes, create a backup of your current problems.js file. You can do this by making a copy and renaming it to `problems.js.backup`.

## Step 2: Replace the file content

Open your `problems.js` file and:

1. **DELETE EVERYTHING** in the current file
2. **PASTE** this new code:

```javascript
document.addEventListener('DOMContentLoaded', function() {
    // Add defensive coding to check if elements exist before using them

    // Helper function to safely get elements
    function safeGetElement(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with ID '${id}' not found in the DOM`);
        }
        return element;
    }

    // Authentication status check
    fetch('/api/check-auth', {
        method: 'GET',
        credentials: 'include',
        headers: {
            'x-api-key': 'MY_SECRET_TOKEN'
        }
    })
    .then(res => res.json())
    .then(data => {
        const authStatus = safeGetElement('auth-status');
        if (!authStatus) return; // Skip if element doesn't exist

        if (data.authenticated) {
            // Track user's remaining AI problems if authenticated
            fetchRemainingAIProblems();
        } else {
            authStatus.textContent = 'Not logged in. Please log in to save problems.';
            authStatus.className = 'alert alert-warning my-3';
            authStatus.style.display = 'block';
            // Disable save buttons if not logged in
            document.querySelectorAll('#saveBtn, .save-suggestion-btn').forEach(btn => {
                btn.disabled = true;
            });
        }
    })
    .catch(err => {
        console.error('Auth check error:', err);
        const authStatus = safeGetElement('auth-status');
        if (!authStatus) return; // Skip if element doesn't exist

        authStatus.textContent = 'Error checking authentication status.';
        authStatus.className = 'alert alert-danger my-3';
        authStatus.style.display = 'block';
    });

    // Element references - with null checks
    const generateProblemsBtn = safeGetElement('generateProblemsBtn');
    const manualProblemBtn = safeGetElement('manualProblemBtn');
    const aiSurveySection = safeGetElement('aiSurveySection');
    const manualSurveySection = safeGetElement('manualSurveySection');
    const problemListSection = safeGetElement('problemListSection');
    const problemList = safeGetElement('problemList');
    const loadingIndicator = safeGetElement('loadingIndicator');
    const noProblemsMessage = safeGetElement('noProblemsMessage');
    const aiProblemCounter = safeGetElement('aiProblemCounter');

    // Manual Survey navigation elements
    const nextBtn = safeGetElement('nextBtn');
    const prevBtn = safeGetElement('prevBtn');
    const saveBtn = safeGetElement('saveBtn');

    // Manual Survey question sections
    const domainQuestion = safeGetElement('domainQuestion');
    const problemQuestion = safeGetElement('problemQuestion');
    const interestQuestion = safeGetElement('interestQuestion');
    const reasonQuestion = safeGetElement('reasonQuestion');

    // Manual Survey inputs
    const domainInput = safeGetElement('domainInput');
    const problemDescription = safeGetElement('problemDescription');
    const interestLevels = document.getElementsByName('interestLevel');
    const reasonInput = safeGetElement('reasonInput');
    const problemError = safeGetElement('problemError');

    // AI Survey navigation elements
    const aiNextBtn = safeGetElement('aiNextBtn');
    const aiPrevBtn = safeGetElement('aiPrevBtn');
    const generateBtn = safeGetElement('generateBtn');

    // AI Survey question sections
    const hobbyQuestion = safeGetElement('hobbyQuestion');
    const teachQuestion = safeGetElement('teachQuestion');
    const talentQuestion = safeGetElement('talentQuestion');
    const skillQuestion = safeGetElement('skillQuestion');
    const insightQuestion = safeGetElement('insightQuestion');

    // AI Survey inputs
    const hobbyInput = safeGetElement('hobbyInput');
    const teachInput = safeGetElement('teachInput');
    const talentInput = safeGetElement('talentInput');
    const skillInput = safeGetElement('skillInput');
    const insightInput = safeGetElement('insightInput');
    const aiSurveyError = safeGetElement('aiSurveyError');

    // Suggestions elements
    const suggestionsSection = safeGetElement('suggestionsSection');
    const suggestionsList = safeGetElement('suggestionsList');
    const suggestionsLoading = safeGetElement('suggestionsLoading');
    const refreshSuggestionsBtn = safeGetElement('refreshSuggestionsBtn');

    // Current question index for the manual and AI surveys (0-based)
    let currentQuestionIndex = 0;
    let aiCurrentQuestionIndex = 0;

    // Only define these if all required elements exist
    const manualQuestions = [domainQuestion, problemQuestion, interestQuestion, reasonQuestion].filter(Boolean);
    const aiQuestions = [hobbyQuestion, teachQuestion, talentQuestion, skillQuestion, insightQuestion].filter(Boolean);

    // Store AI-generated problem count
    let remainingAIProblems = 20;

    // Event Listeners for main buttons - add null checks
    if (generateProblemsBtn) {
        generateProblemsBtn.addEventListener('click', startAISurvey);
    }

    if (manualProblemBtn) {
        manualProblemBtn.addEventListener('click', startManualProblem);
    }

    // Event Listeners for manual problem survey
    if (nextBtn) {
        nextBtn.addEventListener('click', goToNextQuestion);
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', goToPreviousQuestion);
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', saveProblem);
    }

    // Event Listeners for AI problem survey
    if (aiNextBtn) {
        aiNextBtn.addEventListener('click', goToNextAIQuestion);
    }

    if (aiPrevBtn) {
        aiPrevBtn.addEventListener('click', goToPreviousAIQuestion);
    }

    if (generateBtn) {
        generateBtn.addEventListener('click', generateAIProblems);
    }

    // Event listener for refresh suggestions button
    if (refreshSuggestionsBtn) {
        refreshSuggestionsBtn.addEventListener('click', function() {
            generateAIProblems();
        });
    }

    // Load problems on page load if the required elements exist
    if (problemList && loadingIndicator) {
        loadProblems();
    } else {
        console.warn('Cannot load problems - required DOM elements missing');
    }

    // Functions for fetching AI problem count
    function fetchRemainingAIProblems() {
        fetch('/api/ai-problems/remaining', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': 'MY_SECRET_TOKEN'
            },
            credentials: 'same-origin'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            remainingAIProblems = data.remaining;
            updateAIProblemCounter();
        })
        .catch(error => {
            console.error('Error fetching AI problem count:', error);
            // Default to 20 if there's an error
            remainingAIProblems = 20;
            updateAIProblemCounter();
        });
    }

    function updateAIProblemCounter() {
        const counterElement = safeGetElement('remainingProblems');
        if (counterElement) {
            counterElement.textContent = remainingAIProblems;
        }

        // Show counter only if there are less than 20 problems left
        if (aiProblemCounter) {
            if (remainingAIProblems < 20) {
                aiProblemCounter.classList.remove('d-none');
            } else {
                aiProblemCounter.classList.add('d-none');
            }
        }
    }

    function updateRemainingAIProblems() {
        // Decrement the counter
        remainingAIProblems = Math.max(0, remainingAIProblems - 1);
        updateAIProblemCounter();
    }

    // Functions for showing/hiding survey sections
    function startManualProblem() {
        if (!manualSurveySection || !aiSurveySection || !problemListSection || !suggestionsSection) {
            console.error('Cannot start manual problem - required DOM elements missing');
            return;
        }

        // Reset form
        const form = document.getElementById('problemSurveyForm');
        if (form) form.reset();

        if (problemError) problemError.classList.add('d-none');

        // Show manual survey, hide other sections
        manualSurveySection.classList.remove('d-none');
        aiSurveySection.classList.add('d-none');
        problemListSection.classList.add('d-none');
        suggestionsSection.classList.add('d-none');

        // Reset to first question
        currentQuestionIndex = 0;
        updateQuestionVisibility();
    }

    function startAISurvey() {
        if (!aiSurveySection || !manualSurveySection || !problemListSection || !suggestionsSection) {
            console.error('Cannot start AI survey - required DOM elements missing');
            return;
        }

        // Reset form
        const form = document.getElementById('aiSurveyForm');
        if (form) form.reset();

        if (aiSurveyError) aiSurveyError.classList.add('d-none');

        // Show AI survey, hide other sections
        aiSurveySection.classList.remove('d-none');
        manualSurveySection.classList.add('d-none');
        problemListSection.classList.add('d-none');
        suggestionsSection.classList.add('d-none');

        // Reset to first question
        aiCurrentQuestionIndex = 0;
        updateAIQuestionVisibility();
    }

    // Functions for manual survey navigation
    function goToNextQuestion() {
        // Validate current question
        if (!validateCurrentQuestion()) {
            return;
        }

        // Go to next question if not at the end
        if (currentQuestionIndex < manualQuestions.length - 1) {
            currentQuestionIndex++;
            updateQuestionVisibility();
        }
    }

    function goToPreviousQuestion() {
        // Go to previous question if not at the beginning
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            updateQuestionVisibility();
        }
    }

    function updateQuestionVisibility() {
        if (manualQuestions.length === 0) {
            console.warn('No manual questions found in DOM');
            return;
        }

        // Hide all questions
        manualQuestions.forEach(q => {
            if (q) q.classList.add('d-none');
        });

        // Show current question if it exists
        if (manualQuestions[currentQuestionIndex]) {
            manualQuestions[currentQuestionIndex].classList.remove('d-none');
        }

        // Update buttons if they exist
        if (prevBtn) {
            prevBtn.classList.toggle('d-none', currentQuestionIndex === 0);
        }

        if (nextBtn) {
            nextBtn.classList.toggle('d-none', currentQuestionIndex === manualQuestions.length - 1);
        }

        if (saveBtn) {
            saveBtn.classList.toggle('d-none', currentQuestionIndex !== manualQuestions.length - 1);
        }
    }

    // Functions for AI survey navigation
    function goToNextAIQuestion() {
        // Validate current AI question
        if (!validateCurrentAIQuestion()) {
            return;
        }

        // Go to next question if not at the end
        if (aiCurrentQuestionIndex < aiQuestions.length - 1) {
            aiCurrentQuestionIndex++;
            updateAIQuestionVisibility();
        }
    }

    function goToPreviousAIQuestion() {
        // Go to previous question if not at the beginning
        if (aiCurrentQuestionIndex > 0) {
            aiCurrentQuestionIndex--;
            updateAIQuestionVisibility();
        }
    }

    function updateAIQuestionVisibility() {
        if (aiQuestions.length === 0) {
            console.warn('No AI questions found in DOM');
            return;
        }

        // Hide all questions
        aiQuestions.forEach(q => {
            if (q) q.classList.add('d-none');
        });

        // Show current question if it exists
        if (aiQuestions[aiCurrentQuestionIndex]) {
            aiQuestions[aiCurrentQuestionIndex].classList.remove('d-none');
        }

        // Update buttons if they exist
        if (aiPrevBtn) {
            aiPrevBtn.classList.toggle('d-none', aiCurrentQuestionIndex === 0);
        }

        if (aiNextBtn) {
            aiNextBtn.classList.toggle('d-none', aiCurrentQuestionIndex === aiQuestions.length - 1);
        }

        if (generateBtn) {
            generateBtn.classList.toggle('d-none', aiCurrentQuestionIndex !== aiQuestions.length - 1);
        }
    }

    // Validation functions
    function validateCurrentQuestion() {
        // Clear previous errors
        if (problemError) {
            problemError.classList.add('d-none');
            problemError.textContent = '';
        } else {
            return false; // Can't validate without error display
        }

        // Validate based on the current question
        switch (currentQuestionIndex) {
            case 0: // Domain
                if (!domainInput || !domainInput.value.trim()) {
                    showError('Please enter your domain of expertise', problemError);
                    return false;
                }
                break;
            case 1: // Problem
                if (!problemDescription || !problemDescription.value.trim()) {
                    showError('Please describe the problem', problemError);
                    return false;
                }
                break;
            case 2: // Interest
                let interestSelected = false;
                for (let i = 0; i < interestLevels.length; i++) {
                    if (interestLevels[i].checked) {
                        interestSelected = true;
                        break;
                    }
                }
                if (!interestSelected) {
                    showError('Please select your interest level', problemError);
                    return false;
                }
                break;
            case 3: // Reason
                if (!reasonInput || !reasonInput.value.trim()) {
                    showError('Please explain your interest in this problem', problemError);
                    return false;
                }
                break;
        }

        return true;
    }

    function validateCurrentAIQuestion() {
        // Clear previous errors
        if (!aiSurveyError) return false; // Can't validate without error display

        aiSurveyError.classList.add('d-none');
        aiSurveyError.textContent = '';

        // Validate based on the current question
        switch (aiCurrentQuestionIndex) {
            case 0: // Hobbies
                if (!hobbyInput || !hobbyInput.value.trim()) {
                    showError('Please share some of your hobbies or interests', aiSurveyError);
                    return false;
                }
                break;
            case 1: // Teaching
                if (!teachInput || !teachInput.value.trim()) {
                    showError('Please share what you could confidently teach', aiSurveyError);
                    return false;
                }
                break;
            case 2: // Talents
                if (!talentInput || !talentInput.value.trim()) {
                    showError('Please share what others say you\'re great at', aiSurveyError);
                    return false;
                }
                break;
            case 3: // Skills
                if (!skillInput || !skillInput.value.trim()) {
                    showError('Please share skills you\'ve developed', aiSurveyError);
                    return false;
                }
                break;
            case 4: // Insights
                if (!insightInput || !insightInput.value.trim()) {
                    showError('Please share a challenge that gave you insights', aiSurveyError);
                    return false;
                }
                break;
        }

        return true;
    }

    function showError(message, errorElement) {
        if (!errorElement) {
            console.error('Error element not found for message:', message);
            return;
        }
        errorElement.textContent = message;
        errorElement.classList.remove('d-none');
    }

    // Helper functions
    function getSelectedInterestLevel() {
        for (let i = 0; i < interestLevels.length; i++) {
            if (interestLevels[i].checked) {
                return interestLevels[i].value;
            }
        }
        return null;
    }

    // Functions for saving problems
    function saveProblem() {
        // Validate the current question (reason)
        if (!validateCurrentQuestion()) {
            return;
        }

        if (!domainInput || !problemDescription || !reasonInput) {
            console.error('Required form elements missing');
            return;
        }

        // Prepare problem data
        const problemData = {
            domain: domainInput.value.trim(),
            problem_description: problemDescription.value.trim(),
            interest_level: getSelectedInterestLevel(),
            reason: reasonInput.value.trim(),
            tag: "Industry", // Default tag for manually added problems
            ai_generated: false
        };

        saveProblemToServer(problemData);
    }

    function saveProblemToServer(problemData) {
        // Save to server
        fetch('/api/problems', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': 'MY_SECRET_TOKEN'
            },
            credentials: 'same-origin',
            body: JSON.stringify(problemData)
        })
        .then(response => {
            if (!response.ok) {
                // If response is not OK, try to get its text and throw as an error
                return response.text().then(text => {
                    throw new Error(text || 'Network response was not ok');
                });
            }
            // Get the raw response text for debugging
            return response.text().then(text => {
                console.log('Raw response text:', text);
                // Attempt to parse the response text as JSON
                try {
                    return JSON.parse(text);
                } catch (e) {
                    throw new Error('Could not parse JSON: ' + text);
                }
            });
        })
        .then(data => {
            // If this was called from the suggestions section, DON'T hide it
            const fromSuggestions = suggestionsSection && !suggestionsSection.classList.contains('d-none');

            // Reset form if we're not in suggestions mode
            if (!fromSuggestions) {
                if (manualSurveySection && aiSurveySection) {
                    if (manualSurveySection.classList.contains('d-none')) {
                        const form = document.getElementById('aiSurveyForm');
                        if (form) form.reset();
                    } else {
                        const form = document.getElementById('problemSurveyForm');
                        if (form) form.reset();
                    }

                    manualSurveySection.classList.add('d-none');
                    aiSurveySection.classList.add('d-none');
                    if (suggestionsSection) suggestionsSection.classList.add('d-none');
                }
            }

            // Always show the problem list
            if (problemListSection) {
                problemListSection.classList.remove('d-none');
            }

            // If it was an AI-generated problem, update the counter
            if (problemData.ai_generated) {
                updateRemainingAIProblems();
            }

            // Reload problems to include the new one
            loadProblems();
        })
        .catch(error => {
            console.error('Error saving problem:', error);

            const errorElement = manualSurveySection && !manualSurveySection.classList.contains('d-none') 
                ? problemError 
                : aiSurveyError;

            if (errorElement) {
                showError('Error saving problem: ' + error.message, errorElement);
            } else {
                alert('Error saving problem: ' + error.message);
            }
        });
    }

    // AI Problem Generation
    function generateAIProblems() {
        // Validate the current question (insights)
        if (!validateCurrentAIQuestion()) {
            return;
        }

        // Check if we have any AI problems left
        if (remainingAIProblems <= 0) {
            if (aiSurveyError) {
                showError('You have reached the limit of AI-generated problems. Please rate or delete some existing problems to generate more.', aiSurveyError);
            }
            return;
        }

        if (!suggestionsSection || !suggestionsLoading || !suggestionsList || !aiSurveySection) {
            console.error('Required DOM elements for AI problem generation missing');
            return;
        }

        // Show suggestions section and loading state
        suggestionsSection.classList.remove('d-none');
        suggestionsLoading.classList.remove('d-none');
        suggestionsList.innerHTML = '';

        // Hide AI survey section
        aiSurveySection.classList.add('d-none');

        if (!hobbyInput || !teachInput || !talentInput || !skillInput || !insightInput) {
            console.error('Required survey input elements missing');
            suggestionsLoading.classList.add('d-none');
            suggestionsList.innerHTML = '<div class="alert alert-danger">Error: Required form elements are missing</div>';
            return;
        }

        // Collect all answers from the AI survey
        const surveyData = {
            hobby: hobbyInput.value.trim(),
            teach: teachInput.value.trim(),
            talent: talentInput.value.trim(),
            skill: skillInput.value.trim(),
            insight: insightInput.value.trim()
        };

        console.log("Sending survey data:", surveyData);

        // Call the API to get problem suggestions
        fetch('/api/problem-suggestions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': 'MY_SECRET_TOKEN'
            },
            credentials: 'same-origin',
            body: JSON.stringify(surveyData)
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    console.error("Server error response:", text);
                    throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
                });
            }
            return response.json();
        })
        .then(data => {
            // Hide loading
            if (suggestionsLoading) suggestionsLoading.classList.add('d-none');

            console.log("Received data:", data);

            // Display suggestions - check for data format
            if (data && Array.isArray(data)) {
                // If data is directly an array
                displaySuggestions(data);
            } else if (data && Array.isArray(data.problems)) {
                // If data has a problems property that is an array
                displaySuggestions(data.problems);
            } else if (suggestionsList) {
                suggestionsList.innerHTML = '<div class="alert alert-warning">No suggestions could be generated. Please try providing more detailed answers.</div>';
            }
        })
        .catch(error => {
            console.error('Error fetching suggestions:', error);
            if (suggestionsLoading) suggestionsLoading.classList.add('d-none');
            if (suggestionsList) {
                suggestionsList.innerHTML = `<div class="alert alert-danger">Error generating suggestions: ${error.message}. Please try again later.</div>`;
            }
        });
    }

    function displaySuggestions(suggestions) {
        if (!suggestionsList) {
            console.error('Suggestions list element missing');
            return;
        }

        suggestionsList.innerHTML = '';

        const template = document.getElementById('suggestionItemTemplate');
        if (!template) {
            console.error('Suggestion item template not found');
            suggestionsList.innerHTML = '<div class="alert alert-danger">Error: Template not found</div>';
            return;
        }

        suggestions.forEach(suggestion => {
            const clone = document.importNode(template.content, true);

            // Set suggestion data - check elements exist first
            const titleEl = clone.querySelector('.suggestion-title');
            if (titleEl) {
                titleEl.textContent = suggestion.problem_description || suggestion.title || '';
            }

            // Optionally show domain in the description section
            const descEl = clone.querySelector('.suggestion-description');
            if (descEl) {
                descEl.textContent = suggestion.domain || '';
            }

            // Set tag
            const tagElement = clone.querySelector('.suggestion-tag');
            if (tagElement) {
                tagElement.textContent = suggestion.tag || 'AI-Generated';
            }

            // Function to save an AI-generated problem
            function saveAIProblem(suggestion, interest) {
                // Build the problem object using fields from the suggestion
                const problemData = {
                    // Use the suggestion domain if available; otherwise, default to "AI Generated"
                    domain: suggestion.domain || 'AI Generated',
                    // Choose the description from suggestion.problem_description or fall back to others
                    problem_description: suggestion.problem_description || suggestion.description || suggestion.title || '',
                    // Set the interest level from the argument (e.g., "Somewhat Interested" or "Very Interested")
                    interest_level: interest,
                    // For AI problems, since there's no manual input for a reason, set a default reason
                    reason: 'Auto-generated by AI',
                    // Set the tag from the suggestion or default to "AI-Generated"
                    tag: suggestion.tag || 'AI-Generated',
                    // Mark this problem as AI-generated (1 means true)
                    ai_generated: 1
                };

                // Call the common function to save the problem to the server
                saveProblemToServer(problemData);
            }

            // Add event listeners for rating buttons
            const notInterestedBtn = clone.querySelector('.not-interested-btn');
            const somewhatInterestedBtn = clone.querySelector('.somewhat-interested-btn');
            const veryInterestedBtn = clone.querySelector('.very-interested-btn');

            if (notInterestedBtn) {
                notInterestedBtn.addEventListener('click', function() {
                    if (confirm('Are you sure you\'re not interested in this problem? It will be removed.')) {
                        const item = this.closest('.suggestion-item');
                        if (item) item.remove();
                    }
                });
            }

            if (somewhatInterestedBtn) {
                somewhatInterestedBtn.addEventListener('click', function() {
                    saveAIProblem(suggestion, 'Somewhat Interested');
                    const item = this.closest('.suggestion-item');
                    if (item) item.remove();
                });
            }

            if (veryInterestedBtn) {
                veryInterestedBtn.addEventListener('click', function() {
                    saveAIProblem(suggestion, 'Very Interested');
                    const item = this.closest('.suggestion-item');
                    if (item) item.remove();
                });
            }

            // Add event listeners for other buttons
            const similarBtn = clone.querySelector('.similar-suggestion-btn');
            const validateBtn = clone.querySelector('.validate-suggestion-btn');

            // CHANGE: Hide the "Generate Similar" button from AI-generated suggestions
            if (similarBtn) {
                similarBtn.style.display = 'none';
            }

            if (validateBtn) {
                validateBtn.addEventListener('click', function() {
                    validateProblem(suggestion);
                });
            }

            suggestionsList.appendChild(clone);
        });
    }

    function validateProblem(problem) {
        // If it's a suggestion, save it first with 'Very Interested' status
        if (!problem.id) {
            saveAIProblem(problem, 'Very Interested');
            // After saving, we'll need to navigate to the validation page
            // This will be handled in the next steps
            return;
        }

        // For existing problems, just navigate to the validation page
        goToValidation(problem.id);
    }

    function saveAIProblem(suggestion, interest) {
        const problemData = {
            domain: suggestion.domain || 'AI Generated',
            problem_description: suggestion.problem_description || suggestion.description || suggestion.title || '',
            interest_level: interest,
            reason: 'Auto-generated by AI',
            tag: suggestion.tag || 'AI-Generated',
            ai_generated: 1
        };
        saveProblemToServer(problemData);
    }

    function goToValidation(problemId) {
        window.location.href = `/validation.html?problem=${problemId}`;
    }

    // Problem List Management
    function loadProblems() {
        if (!loadingIndicator || !noProblemsMessage || !problemList) {
            console.error('Required DOM elements for problem list missing');
            return;
        }

        // Show loading indicator
        loadingIndicator.classList.remove('d-none');
        noProblemsMessage.classList.add('d-none');

        // Clear existing problems
        const items = problemList.querySelectorAll('.list-group-item:not(#loadingIndicator):not(#noProblemsMessage)');
        items.forEach(item => item.remove());

        // Fetch problems from server
        fetch('/api/problems', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': 'MY_SECRET_TOKEN'
            },
            credentials: 'same-origin'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Hide loading indicator
            loadingIndicator.classList.add('d-none');

            // Check if data is an array directly or has a problems property
            const problems = Array.isArray(data) ? data : (data.problems || []);

            if (problems.length === 0) {
                // Show no problems message
                noProblemsMessage.classList.remove('d-none');
            } else {
                // Sort problems by interest level
                problems.sort((a, b) => {
                    const interestOrder = {
                        'Very Interested': 0,
                        'Somewhat Interested': 1,
                        'Not Interested': 2
                    };
                    return interestOrder[a.interest_level] - interestOrder[b.interest_level];
                });

                // Create problem items
                problems.forEach(problem => {
                    addProblemToList(problem);
                });
            }
        })
        .catch(error => {
            // Hide loading indicator
            loadingIndicator.classList.add('d-none');

            // Show error
            const errorElement = document.createElement('div');
            errorElement.className = 'alert alert-danger';
            errorElement.textContent = 'Error loading problems: ' + error.message;
            problemList.appendChild(errorElement);

            console.error('Error details:', error);
        });
    }

function addProblemToList(problem) {
    if (!problemList) {
        console.error('Problem list element missing');
        return;
    }

    // Clone template
    const template = document.getElementById('problemItemTemplate');
    if (!template) {
        console.error('Problem item template not found');
        return;
    }

    const clone = document.importNode(template.content, true);

    // Set problem data - with checks
    const descEl = clone.querySelector('.problem-description');
    if (descEl) descEl.textContent = problem.problem_description;

    const domainEl = clone.querySelector('.problem-domain');
    if (domainEl) domainEl.textContent = problem.domain;

    const interestBadge = clone.querySelector('.problem-interest');
    if (interestBadge) {
        interestBadge.textContent = problem.interest_level;

        // Set appropriate badge color based on interest level
        if (problem.interest_level === 'Not Interested') {
            interestBadge.classList.remove('bg-success');
            interestBadge.classList.add('bg-secondary');
        } else if (problem.interest_level === 'Somewhat Interested') {
            interestBadge.classList.remove('bg-success');
            interestBadge.classList.add('bg-info');
        }
    }

    // Set tag if available
    const tagBadge = clone.querySelector('.problem-tag');
    if (tagBadge) {
        if (problem.tag) {
            tagBadge.textContent = problem.tag;
        } else {
            tagBadge.classList.add('d-none');
        }
    }

    // Add event listeners for buttons
    const viewBtn = clone.querySelector('.view-problem-btn');
    const deleteBtn = clone.querySelector('.delete-problem-btn');
    const validateBtn = clone.querySelector('.validate-problem-btn');
    const similarBtn = clone.querySelector('.similar-problems-btn');

    if (viewBtn) viewBtn.addEventListener('click', () => viewProblem(problem, clone));
    if (deleteBtn) deleteBtn.addEventListener('click', () => deleteProblem(problem.id));

    // Show "Solve This" button only for "Very Interested" problems
    if (validateBtn) {
        if (problem.interest_level === 'Very Interested') {
            validateBtn.classList.remove('d-none');
            validateBtn.addEventListener('click', () => goToValidation(problem.id));
        } else {
            validateBtn.classList.add('d-none');
        }
    }

    // CHANGE: Show "Generate Similar" button for both "Somewhat Interested" and "Very Interested" problems
    if (similarBtn) {
        if (problem.interest_level === 'Very Interested' || problem.interest_level === 'Somewhat Interested') {
            similarBtn.classList.remove('d-none');
            similarBtn.addEventListener('click', function(event) {
                generateSimilarProblems(problem, event);
            });
        } else {
            // Hide the Generate Similar button for "Not Interested" problems
            similarBtn.classList.add('d-none');
        }
    }

    // Add to the list
    problemList.appendChild(clone);
}

function viewProblem(problem, element) {
    if (!element) {
        console.error('Element is missing for problem view');
        return;
    }

    // Toggle edit section
    const editSection = element.querySelector('.problem-edit-section');
    const editDescriptionInput = element.querySelector('.problem-edit-description');

    if (!editSection || !editDescriptionInput) {
        console.error('Edit section elements missing');
        return;
    }

    if (editSection.classList.contains('d-none')) {
        // Show edit section and fill with current description
        editSection.classList.remove('d-none');
        editDescriptionInput.value = problem.problem_description;

        // Add event listeners for edit buttons
        const cancelBtn = element.querySelector('.cancel-edit-btn');
        const saveBtn = element.querySelector('.save-edit-btn');

        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                editSection.classList.add('d-none');
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', function() {
                updateProblemDescription(problem.id, editDescriptionInput.value);
            });
        }
    } else {
        // Hide edit section
        editSection.classList.add('d-none');
    }
}

function updateProblemDescription(id, newDescription) {
    if (!newDescription || !newDescription.trim()) {
        alert('Problem description cannot be empty');
        return;
    }

    fetch(`/api/problems/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'MY_SECRET_TOKEN'
        },
        credentials: 'same-origin',
        body: JSON.stringify({ problem_description: newDescription })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        // Reload problems to reflect changes
        loadProblems();
    })
    .catch(error => {
        console.error('Error updating problem:', error);
        alert('Error updating problem: ' + error.message);
    });
}

function deleteProblem(id) {
    if (!id) {
        console.error('Problem ID is missing for delete operation');
        return;
    }

    if (confirm('Are you sure you want to delete this problem?')) {
        fetch(`/api/problems/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': 'MY_SECRET_TOKEN'
            },
            credentials: 'same-origin'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // If it was an AI-generated problem, update the counter
            fetchRemainingAIProblems();

            // Reload problems
            loadProblems();
        })
        .catch(error => {
            console.error('Error deleting problem:', error);
            alert('Error deleting problem: ' + error.message);
        });
    }
}

function generateSimilarProblems(originalProblem, event) {
    if (!originalProblem) {
        console.error('Original problem is missing for generating similar problems');
        return;
    }

    // Check if we have any AI problems left
    if (remainingAIProblems < 2) {
        alert('You need at least 2 remaining AI problem slots to generate similar problems.');
        return;
    }

    // Get the event target (the button that was clicked)
    const clickedButton = event ? event.target : this;
    if (!clickedButton) {
        console.error('Button element missing for similar problems');
        return;
    }

    // Show loading state
    const parentElement = clickedButton.closest('.suggestion-item, .list-group-item');

    // If it's already in the list of saved problems
    const isSavedProblem = parentElement && parentElement.classList.contains('list-group-item');

    // Create a loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'spinner-border spinner-border-sm text-primary ms-2';
    loadingIndicator.setAttribute('role', 'status');
    clickedButton.appendChild(loadingIndicator);
    clickedButton.disabled = true;

    // Prepare request data
    let problemDescription;
    let tag;

    if (isSavedProblem && parentElement) {
        const descriptionElement = parentElement.querySelector('.problem-description');
        const tagElement = parentElement.querySelector('.problem-tag');

        problemDescription = descriptionElement ? descriptionElement.textContent : '';
        tag = tagElement ? tagElement.textContent : 'General';
    } else {
        // For suggestion items - add more detailed debugging and better fallbacks
        console.log('Original problem object:', originalProblem);
        problemDescription = originalProblem.problem_description || originalProblem.description || originalProblem.title || '';
        tag = originalProblem.tag || 'General';

        // Make sure we have valid data before continuing
        if (!problemDescription) {
            console.error('No problem description found in:', originalProblem);
            alert('Could not find problem description. Please try another problem.');
            loadingIndicator.remove();
            clickedButton.disabled = false;
            return;
        }
    }

    const requestData = {
        originalProblem: problemDescription,
        tag: tag
    };

    console.log('Sending similar problem request:', requestData);

    // Call the API to get similar problems
    fetch('/api/similar-problems', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'MY_SECRET_TOKEN'
        },
        credentials: 'same-origin',
        body: JSON.stringify(requestData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        // Remove loading indicator
        loadingIndicator.remove();
        clickedButton.disabled = false;

        console.log('Received similar problems response:', data);

        // Check the data format
        const problems = Array.isArray(data) ? data : 
                        (data.problems && Array.isArray(data.problems) ? data.problems : []);

        // If we're in the suggestions section, just append the new suggestions
        if (!isSavedProblem) {
            displaySuggestions(problems);
        } else {
            // For saved problems, show a new suggestions section
            showSimilarProblemsSection(problems);
        }
    })
    .catch(error => {
        // Remove loading indicator
        loadingIndicator.remove();
        clickedButton.disabled = false;

        console.error('Error generating similar problems:', error);
        alert('Error generating similar problems: ' + error.message);
    });
}

function showSimilarProblemsSection(similarProblems) {
    if (!problemListSection) {
        console.error('Problem list section missing for similar problems display');
        return;
    }

    // Check if there's already a similar problems section
    let similarSection = document.getElementById('similarProblemsSection');

    if (!similarSection) {
        // Create a new section for similar problems
        similarSection = document.createElement('div');
        similarSection.id = 'similarProblemsSection';
        similarSection.className = 'card mt-4';

        // Insert after the problem list
        problemListSection.parentNode.insertBefore(similarSection, problemListSection.nextSibling);
    }

    // Update the content
    similarSection.innerHTML = `
        <div class="card-header bg-info text-white">
            <h5 class="mb-0">Similar Problem Suggestions</h5>
        </div>
        <div class="card-body">
            <p class="mb-3">Here are similar problems you might be interested in:</p>
            <div id="similarProblemsList" class="list-group mb-3"></div>
            <button id="closeSimilarBtn" class="btn btn-outline-secondary">Close</button>
        </div>
    `;

    // Add the similar problems
    const similarProblemsList = document.getElementById('similarProblemsList');
    if (!similarProblemsList) {
        console.error('Similar problems list element not found');
        return;
    }

    // Check if we got any problems
    if (similarProblems && similarProblems.length > 0) {
        // Display suggestions in the similar problems section
        similarProblems.forEach(suggestion => {
            const template = document.getElementById('suggestionItemTemplate');
            if (!template) {
                console.error('Suggestion item template not found');
                return;
            }

            const clone = document.importNode(template.content, true);

            // Set suggestion data with null checks
            const titleEl = clone.querySelector('.suggestion-title');
            if (titleEl) {
                titleEl.textContent = suggestion.problem_description || suggestion.title || '';
            }

            const descEl = clone.querySelector('.suggestion-description');
            if (descEl) {
                descEl.textContent = suggestion.domain || '';
            }

            // Set tag
            const tagElement = clone.querySelector('.suggestion-tag');
            if (tagElement) {
                tagElement.textContent = suggestion.tag || 'AI-Generated';
            }

            // Add event listeners for rating buttons with null checks
            const notInterestedBtn = clone.querySelector('.not-interested-btn');
            const somewhatInterestedBtn = clone.querySelector('.somewhat-interested-btn');
            const veryInterestedBtn = clone.querySelector('.very-interested-btn');

            if (notInterestedBtn) {
                notInterestedBtn.addEventListener('click', function() {
                    if (confirm('Are you sure you\'re not interested in this problem? It will be removed.')) {
                        const item = this.closest('.suggestion-item');
                        if (item) item.remove();
                    }
                });
            }

            if (somewhatInterestedBtn) {
                somewhatInterestedBtn.addEventListener('click', function() {
                    saveAIProblem(suggestion, 'Somewhat Interested');
                    const item = this.closest('.suggestion-item');
                    if (item) item.remove();
                });
            }

            if (veryInterestedBtn) {
                veryInterestedBtn.addEventListener('click', function() {
                    saveAIProblem(suggestion, 'Very Interested');
                    const item = this.closest('.suggestion-item');
                    if (item) item.remove();
                });
            }

            similarProblemsList.appendChild(clone);
        });
    } else {
        // Display a message if no problems were found
        similarProblemsList.innerHTML = '<div class="alert alert-warning">No similar problems found. Try with a different problem.</div>';
    }

    // Add event listener to close button
    const closeBtn = document.getElementById('closeSimilarBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            similarSection.remove();
        });
    }
}
});