document.addEventListener('DOMContentLoaded', function() {
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
        const authStatus = document.getElementById('auth-status');
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
        const authStatus = document.getElementById('auth-status');
        authStatus.textContent = 'Error checking authentication status.';
        authStatus.className = 'alert alert-danger my-3';
        authStatus.style.display = 'block';
    });

    // Element references
    const generateProblemsBtn = document.getElementById('generateProblemsBtn');
    const manualProblemBtn = document.getElementById('manualProblemBtn');
    const aiSurveySection = document.getElementById('aiSurveySection');
    const manualSurveySection = document.getElementById('manualSurveySection');
    const problemListSection = document.getElementById('problemListSection');
    const problemList = document.getElementById('problemList');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const noProblemsMessage = document.getElementById('noProblemsMessage');
    const aiProblemCounter = document.getElementById('aiProblemCounter');

    // Manual Survey navigation elements
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const saveBtn = document.getElementById('saveBtn');

    // Manual Survey question sections
    const domainQuestion = document.getElementById('domainQuestion');
    const problemQuestion = document.getElementById('problemQuestion');
    const interestQuestion = document.getElementById('interestQuestion');
    const reasonQuestion = document.getElementById('reasonQuestion');

    // Manual Survey inputs
    const domainInput = document.getElementById('domainInput');
    const problemDescription = document.getElementById('problemDescription');
    const interestLevels = document.getElementsByName('interestLevel');
    const reasonInput = document.getElementById('reasonInput');
    const problemError = document.getElementById('problemError');

    // AI Survey navigation elements
    const aiNextBtn = document.getElementById('aiNextBtn');
    const aiPrevBtn = document.getElementById('aiPrevBtn');
    const generateBtn = document.getElementById('generateBtn');

    // AI Survey question sections
    const hobbyQuestion = document.getElementById('hobbyQuestion');
    const teachQuestion = document.getElementById('teachQuestion');
    const talentQuestion = document.getElementById('talentQuestion');
    const skillQuestion = document.getElementById('skillQuestion');
    const insightQuestion = document.getElementById('insightQuestion');

    // AI Survey inputs
    const hobbyInput = document.getElementById('hobbyInput');
    const teachInput = document.getElementById('teachInput');
    const talentInput = document.getElementById('talentInput');
    const skillInput = document.getElementById('skillInput');
    const insightInput = document.getElementById('insightInput');
    const aiSurveyError = document.getElementById('aiSurveyError');

    // Suggestions elements
    const suggestionsSection = document.getElementById('suggestionsSection');
    const suggestionsList = document.getElementById('suggestionsList');
    const suggestionsLoading = document.getElementById('suggestionsLoading');
    const refreshSuggestionsBtn = document.getElementById('refreshSuggestionsBtn');

    // Current question index for the manual and AI surveys (0-based)
    let currentQuestionIndex = 0;
    let aiCurrentQuestionIndex = 0;
    const manualQuestions = [domainQuestion, problemQuestion, interestQuestion, reasonQuestion];
    const aiQuestions = [hobbyQuestion, teachQuestion, talentQuestion, skillQuestion, insightQuestion];

    // Store AI-generated problem count
    let remainingAIProblems = 20;

    // Event Listeners for main buttons
    generateProblemsBtn.addEventListener('click', startAISurvey);
    manualProblemBtn.addEventListener('click', startManualProblem);

    // Event Listeners for manual problem survey
    nextBtn.addEventListener('click', goToNextQuestion);
    prevBtn.addEventListener('click', goToPreviousQuestion);
    saveBtn.addEventListener('click', saveProblem);

    // Event Listeners for AI problem survey
    aiNextBtn.addEventListener('click', goToNextAIQuestion);
    aiPrevBtn.addEventListener('click', goToPreviousAIQuestion);
    generateBtn.addEventListener('click', generateAIProblems);

    // Event listener for refresh suggestions button
    if (refreshSuggestionsBtn) {
        refreshSuggestionsBtn.addEventListener('click', function() {
            generateAIProblems();
        });
    }

    // Load problems on page load
    loadProblems();

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
        const counterElement = document.getElementById('remainingProblems');
        if (counterElement) {
            counterElement.textContent = remainingAIProblems;
        }

        // Show counter only if there are less than 20 problems left
        if (remainingAIProblems < 20) {
            aiProblemCounter.classList.remove('d-none');
        } else {
            aiProblemCounter.classList.add('d-none');
        }
    }

    function updateRemainingAIProblems() {
        // Decrement the counter
        remainingAIProblems = Math.max(0, remainingAIProblems - 1);
        updateAIProblemCounter();
    }

    // Functions for showing/hiding survey sections
    function startManualProblem() {
        // Reset form
        document.getElementById('problemSurveyForm').reset();
        problemError.classList.add('d-none');

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
        // Reset form
        document.getElementById('aiSurveyForm').reset();
        aiSurveyError.classList.add('d-none');

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
        // Hide all questions
        manualQuestions.forEach(q => q.classList.add('d-none'));

        // Show current question
        manualQuestions[currentQuestionIndex].classList.remove('d-none');

        // Update buttons
        prevBtn.classList.toggle('d-none', currentQuestionIndex === 0);
        nextBtn.classList.toggle('d-none', currentQuestionIndex === manualQuestions.length - 1);
        saveBtn.classList.toggle('d-none', currentQuestionIndex !== manualQuestions.length - 1);
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
        // Hide all questions
        aiQuestions.forEach(q => q.classList.add('d-none'));

        // Show current question
        aiQuestions[aiCurrentQuestionIndex].classList.remove('d-none');

        // Update buttons
        aiPrevBtn.classList.toggle('d-none', aiCurrentQuestionIndex === 0);
        aiNextBtn.classList.toggle('d-none', aiCurrentQuestionIndex === aiQuestions.length - 1);
        generateBtn.classList.toggle('d-none', aiCurrentQuestionIndex !== aiQuestions.length - 1);
    }

    // Validation functions
    function validateCurrentQuestion() {
        // Clear previous errors
        problemError.classList.add('d-none');
        problemError.textContent = '';

        // Validate based on the current question
        switch (currentQuestionIndex) {
            case 0: // Domain
                if (!domainInput.value.trim()) {
                    showError('Please enter your domain of expertise', problemError);
                    return false;
                }
                break;
            case 1: // Problem
                if (!problemDescription.value.trim()) {
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
                if (!reasonInput.value.trim()) {
                    showError('Please explain your interest in this problem', problemError);
                    return false;
                }
                break;
        }

        return true;
    }

    function validateCurrentAIQuestion() {
        // Clear previous errors
        aiSurveyError.classList.add('d-none');
        aiSurveyError.textContent = '';

        // Validate based on the current question
        switch (aiCurrentQuestionIndex) {
            case 0: // Hobbies
                if (!hobbyInput.value.trim()) {
                    showError('Please share some of your hobbies or interests', aiSurveyError);
                    return false;
                }
                break;
            case 1: // Teaching
                if (!teachInput.value.trim()) {
                    showError('Please share what you could confidently teach', aiSurveyError);
                    return false;
                }
                break;
            case 2: // Talents
                if (!talentInput.value.trim()) {
                    showError('Please share what others say you\'re great at', aiSurveyError);
                    return false;
                }
                break;
            case 3: // Skills
                if (!skillInput.value.trim()) {
                    showError('Please share skills you\'ve developed', aiSurveyError);
                    return false;
                }
                break;
            case 4: // Insights
                if (!insightInput.value.trim()) {
                    showError('Please share a challenge that gave you insights', aiSurveyError);
                    return false;
                }
                break;
        }

        return true;
    }

    function showError(message, errorElement) {
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
                if (manualSurveySection.classList.contains('d-none')) {
                    document.getElementById('aiSurveyForm').reset();
                } else {
                    document.getElementById('problemSurveyForm').reset();
                }

                manualSurveySection.classList.add('d-none');
                aiSurveySection.classList.add('d-none');
                suggestionsSection.classList.add('d-none');
            }

            // Always show the problem list
            problemListSection.classList.remove('d-none');

            // If it was an AI-generated problem, update the counter
            if (problemData.ai_generated) {
                updateRemainingAIProblems();
            }

            // Reload problems to include the new one
            loadProblems();
        })
        .catch(error => {
            const errorElement = manualSurveySection.classList.contains('d-none') ? 
                aiSurveyError : problemError;
            showError('Error saving problem: ' + error.message, errorElement);
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
            showError('You have reached the limit of AI-generated problems. Please rate or delete some existing problems to generate more.', aiSurveyError);
            return;
        }

        // Show suggestions section and loading state
        suggestionsSection.classList.remove('d-none');
        suggestionsLoading.classList.remove('d-none');
        suggestionsList.innerHTML = '';

        // Hide AI survey section
        aiSurveySection.classList.add('d-none');

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
            suggestionsLoading.classList.add('d-none');

            console.log("Received data:", data);

            // Display suggestions - check for data format
            if (data && Array.isArray(data)) {
                // If data is directly an array
                displaySuggestions(data);
            } else if (data && Array.isArray(data.problems)) {
                // If data has a problems property that is an array
                displaySuggestions(data.problems);
            } else {
                suggestionsList.innerHTML = '<div class="alert alert-warning">No suggestions could be generated. Please try providing more detailed answers.</div>';
            }
        })
        .catch(error => {
            console.error('Error fetching suggestions:', error);
            suggestionsLoading.classList.add('d-none');
            suggestionsList.innerHTML = `<div class="alert alert-danger">Error generating suggestions: ${error.message}. Please try again later.</div>`;
        });
    }

    function displaySuggestions(suggestions) {
        suggestionsList.innerHTML = '';

        suggestions.forEach(suggestion => {
            const template = document.getElementById('suggestionItemTemplate');
            const clone = document.importNode(template.content, true);

            // Set suggestion data - updated to use problem_description field
            clone.querySelector('.suggestion-title').textContent = suggestion.problem_description || suggestion.title || '';

            // Optionally show domain in the description section
            clone.querySelector('.suggestion-description').textContent = suggestion.domain || '';

            // Set tag
            const tagElement = clone.querySelector('.suggestion-tag');
            tagElement.textContent = suggestion.tag || 'AI-Generated';

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

            notInterestedBtn.addEventListener('click', function() {
                if (confirm('Are you sure you\'re not interested in this problem? It will be removed.')) {
                    this.closest('.suggestion-item').remove();
                }
            });

            somewhatInterestedBtn.addEventListener('click', function() {
                saveAIProblem(suggestion, 'Somewhat Interested');
                this.closest('.suggestion-item').remove();
            });

            veryInterestedBtn.addEventListener('click', function() {
                saveAIProblem(suggestion, 'Very Interested');
                this.closest('.suggestion-item').remove();
            });

            // Add event listeners for other buttons
            const similarBtn = clone.querySelector('.similar-suggestion-btn');
            const validateBtn = clone.querySelector('.validate-suggestion-btn');

            // CHANGE: Hide the "Generate Similar" button from AI-generated suggestions
            if (similarBtn) {
                similarBtn.style.display = 'none';
            }

            validateBtn.addEventListener('click', function() {
                validateProblem(suggestion);
            });

            suggestionsList.appendChild(clone);
        });
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
            const fromSuggestions = suggestionsSection &&
              !suggestionsSection.classList.contains('d-none');

            // Reset form if we're not in suggestions mode
            if (!fromSuggestions) {
                if (manualSurveySection.classList.contains('d-none')) {
                    document.getElementById('aiSurveyForm').reset();
                } else {
                    document.getElementById('problemSurveyForm').reset();
                }

                manualSurveySection.classList.add('d-none');
                aiSurveySection.classList.add('d-none');
                suggestionsSection.classList.add('d-none');
            }

            // Always show the problem list
            problemListSection.classList.remove('d-none');

            // If it was an AI-generated problem, update the counter
            if (problemData.ai_generated) {
                updateRemainingAIProblems();
            }

            // Reload problems to include the new one
            loadProblems();
        })
        .catch(error => {
            const errorElement = manualSurveySection.classList.contains('d-none')
                ? aiSurveyError
                : problemError;
            showError('Error saving problem: ' + error.message, errorElement);
        });
    }


    function generateSimilarProblems(originalProblem, event) {
        // Check if we have any AI problems left
        if (remainingAIProblems < 2) {
            alert('You need at least 2 remaining AI problem slots to generate similar problems.');
            return;
        }

        // Get the event target (the button that was clicked)
        const clickedButton = event ? event.target : this;

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

        // Check if we got any problems
        if (similarProblems && similarProblems.length > 0) {
            // Display suggestions in the similar problems section
            similarProblems.forEach(suggestion => {
                const template = document.getElementById('suggestionItemTemplate');
                const clone = document.importNode(template.content, true);

                // Set suggestion data
                clone.querySelector('.suggestion-title').textContent = suggestion.problem_description || suggestion.title || '';
                clone.querySelector('.suggestion-description').textContent = suggestion.domain || '';

                // Set tag
                const tagElement = clone.querySelector('.suggestion-tag');
                tagElement.textContent = suggestion.tag || 'AI-Generated';

                // Add event listeners for rating buttons
                const notInterestedBtn = clone.querySelector('.not-interested-btn');
                const somewhatInterestedBtn = clone.querySelector('.somewhat-interested-btn');
                const veryInterestedBtn = clone.querySelector('.very-interested-btn');

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

                notInterestedBtn.addEventListener('click', function() {
                    if (confirm('Are you sure you\'re not interested in this problem? It will be removed.')) {
                        this.closest('.suggestion-item').remove();
                    }
                });

                somewhatInterestedBtn.addEventListener('click', function() {
                    saveAIProblem(suggestion, 'Somewhat Interested');
                    this.closest('.suggestion-item').remove();
                });

                veryInterestedBtn.addEventListener('click', function() {
                    saveAIProblem(suggestion, 'Very Interested');
                    this.closest('.suggestion-item').remove();
                });

                similarProblemsList.appendChild(clone);
            });
        } else {
            // Display a message if no problems were found
            similarProblemsList.innerHTML = '<div class="alert alert-warning">No similar problems found. Try with a different problem.</div>';
        }

        // Add event listener to close button
        document.getElementById('closeSimilarBtn').addEventListener('click', function() {
            similarSection.remove();
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

        function goToValidation(problemId) {
            window.location.href = `/validation.html?problem=${problemId}`;
        }

        // Problem List Management
        function loadProblems() {
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
            // Clone template
            const template = document.getElementById('problemItemTemplate');
            const clone = document.importNode(template.content, true);

            // Set problem data
            clone.querySelector('.problem-description').textContent = problem.problem_description;
            clone.querySelector('.problem-domain').textContent = problem.domain;

            const interestBadge = clone.querySelector('.problem-interest');
            interestBadge.textContent = problem.interest_level;

            // Set appropriate badge color based on interest level
            if (problem.interest_level === 'Not Interested') {
                interestBadge.classList.remove('bg-success');
                interestBadge.classList.add('bg-secondary');
            } else if (problem.interest_level === 'Somewhat Interested') {
                interestBadge.classList.remove('bg-success');
                interestBadge.classList.add('bg-info');
            }

            // Set tag if available
            const tagBadge = clone.querySelector('.problem-tag');
            if (problem.tag) {
                tagBadge.textContent = problem.tag;
            } else {
                tagBadge.classList.add('d-none');
            }

            // Add event listeners for buttons
            const viewBtn = clone.querySelector('.view-problem-btn');
            const deleteBtn = clone.querySelector('.delete-problem-btn');
            const validateBtn = clone.querySelector('.validate-problem-btn');
            const similarBtn = clone.querySelector('.similar-problems-btn');

            viewBtn.addEventListener('click', () => viewProblem(problem, clone));
            deleteBtn.addEventListener('click', () => deleteProblem(problem.id));

            // Show "Solve This" button only for "Very Interested" problems
            if (problem.interest_level === 'Very Interested') {
                validateBtn.classList.remove('d-none');
                validateBtn.addEventListener('click', () => goToValidation(problem.id));
            }

            // CHANGE: Show "Generate Similar" button for both "Somewhat Interested" and "Very Interested" problems
            if (problem.interest_level === 'Very Interested' || problem.interest_level === 'Somewhat Interested') {
                similarBtn.classList.remove('d-none');
                similarBtn.addEventListener('click', function(event) {
                    generateSimilarProblems(problem, event);
                });
            } else {
                // Hide the Generate Similar button for "Not Interested" problems
                similarBtn.classList.add('d-none');
            }

            // Add to the list
            problemList.appendChild(clone);
        }

        function viewProblem(problem, element) {
            // Toggle edit section
            const editSection = element.querySelector('.problem-edit-section');
            const editDescriptionInput = element.querySelector('.problem-edit-description');

            if (editSection.classList.contains('d-none')) {
                // Show edit section and fill with current description
                editSection.classList.remove('d-none');
                editDescriptionInput.value = problem.problem_description;

                // Add event listeners for edit buttons
                const cancelBtn = element.querySelector('.cancel-edit-btn');
                const saveBtn = element.querySelector('.save-edit-btn');

                cancelBtn.addEventListener('click', function() {
                    editSection.classList.add('d-none');
                });

                saveBtn.addEventListener('click', function() {
                    updateProblemDescription(problem.id, editDescriptionInput.value);
                });
            } else {
                // Hide edit section
                editSection.classList.add('d-none');
            }
        }

        function updateProblemDescription(id, newDescription) {
            if (!newDescription.trim()) {
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
    });