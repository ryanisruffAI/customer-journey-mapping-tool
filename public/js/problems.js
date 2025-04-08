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

        // Element references - consolidated from duplicated blocks
        const newProblemBtn = document.getElementById('newProblemBtn');
        const surveySection = document.getElementById('surveySection');
        const problemListSection = document.getElementById('problemListSection');
        const problemList = document.getElementById('problemList');
        const loadingIndicator = document.getElementById('loadingIndicator');
        const noProblemsMessage = document.getElementById('noProblemsMessage');

        // Survey navigation elements
        const nextBtn = document.getElementById('nextBtn');
        const prevBtn = document.getElementById('prevBtn');
        const saveBtn = document.getElementById('saveBtn');

        // Survey question sections
        const domainQuestion = document.getElementById('domainQuestion');
        const problemQuestion = document.getElementById('problemQuestion');
        const interestQuestion = document.getElementById('interestQuestion');
        const reasonQuestion = document.getElementById('reasonQuestion');

        // Survey inputs
        const domainInput = document.getElementById('domainInput');
        const problemDescription = document.getElementById('problemDescription');
        const interestLevels = document.getElementsByName('interestLevel');
        const reasonInput = document.getElementById('reasonInput');
        const problemError = document.getElementById('problemError');

    // NEW: AI Suggestions elements
    const suggestionsBtn = document.getElementById('suggestionsBtn');
    const suggestionsList = document.getElementById('suggestionsList');
    const suggestionsLoading = document.getElementById('suggestionsLoading');
    const suggestionsSection = document.getElementById('suggestionsSection');

    // Current question index for the survey (0-based)
    let currentQuestionIndex = 0;
    const questions = [domainQuestion, problemQuestion, interestQuestion, reasonQuestion];

    // Event Listeners
    newProblemBtn.addEventListener('click', startNewProblem);
    nextBtn.addEventListener('click', goToNextQuestion);
    prevBtn.addEventListener('click', goToPreviousQuestion);
    saveBtn.addEventListener('click', saveProblem);

    // NEW: Event listener for suggestions button
    if (suggestionsBtn) {
        suggestionsBtn.addEventListener('click', function() {
            fetchProblemSuggestions();
        });
    }

    // Load problems on page load
    loadProblems();

    // Functions
    function startNewProblem() {
        // Reset form
        document.getElementById('problemSurveyForm').reset();
        problemError.classList.add('d-none');

        // Show survey, hide problem list
        surveySection.classList.remove('d-none');
        problemListSection.classList.add('d-none');

        // Reset to first question
        currentQuestionIndex = 0;
        updateQuestionVisibility();

        // NEW: Hide suggestions if visible
        if (suggestionsSection) {
            suggestionsSection.classList.add('d-none');
        }
    }

    function goToNextQuestion() {
        // Validate current question
        if (!validateCurrentQuestion()) {
            return;
        }

        // Go to next question if not at the end
        if (currentQuestionIndex < questions.length - 1) {
            currentQuestionIndex++;
            updateQuestionVisibility();

            // NEW: Show suggestions button when on the problem description question
            if (currentQuestionIndex === 1 && suggestionsBtn) {
                suggestionsBtn.classList.remove('d-none');
            } else if (suggestionsBtn) {
                suggestionsBtn.classList.add('d-none');
            }
        }
    }

    function goToPreviousQuestion() {
        // Go to previous question if not at the beginning
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            updateQuestionVisibility();

            // NEW: Show suggestions button when on the problem description question
            if (currentQuestionIndex === 1 && suggestionsBtn) {
                suggestionsBtn.classList.remove('d-none');
            } else if (suggestionsBtn) {
                suggestionsBtn.classList.add('d-none');
            }
        }
    }

    function updateQuestionVisibility() {
        // Hide all questions
        questions.forEach(q => q.classList.add('d-none'));

        // Show current question
        questions[currentQuestionIndex].classList.remove('d-none');

        // Update buttons
        prevBtn.classList.toggle('d-none', currentQuestionIndex === 0);
        nextBtn.classList.toggle('d-none', currentQuestionIndex === questions.length - 1);
        saveBtn.classList.toggle('d-none', currentQuestionIndex !== questions.length - 1);

        // NEW: Show suggestions button only on problem description question
        if (suggestionsBtn) {
            suggestionsBtn.classList.toggle('d-none', currentQuestionIndex !== 1);
        }
    }

    function validateCurrentQuestion() {
        // Clear previous errors
        problemError.classList.add('d-none');
        problemError.textContent = '';

        // Validate based on the current question
        switch (currentQuestionIndex) {
            case 0: // Domain
                if (!domainInput.value.trim()) {
                    showError('Please enter your domain of expertise');
                    return false;
                }
                break;
            case 1: // Problem
                if (!problemDescription.value.trim()) {
                    showError('Please describe the problem');
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
                    showError('Please select your interest level');
                    return false;
                }
                break;
            case 3: // Reason
                if (!reasonInput.value.trim()) {
                    showError('Please explain your interest in this problem');
                    return false;
                }
                break;
        }

        return true;
    }

    function showError(message) {
        problemError.textContent = message;
        problemError.classList.remove('d-none');
    }

    function getSelectedInterestLevel() {
        for (let i = 0; i < interestLevels.length; i++) {
            if (interestLevels[i].checked) {
                return interestLevels[i].value;
            }
        }
        return null;
    }

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
            reason: reasonInput.value.trim()
        };

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
            // Reset form and show problem list
            document.getElementById('problemSurveyForm').reset();
            surveySection.classList.add('d-none');
            problemListSection.classList.remove('d-none');

            // Reload problems to include the new one
            loadProblems();
        })
        .catch(error => {
            showError('Error saving problem: ' + error.message);
        });

    }

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
                    'x-api-key': 'MY_SECRET_TOKEN' // Add the API token header
                },
                credentials: 'same-origin' // Add this line
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
            showError('Error loading problems: ' + error.message);
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

        // Set appropriate badge color
        if (problem.interest_level === 'Not Interested') {
            interestBadge.classList.remove('bg-success');
            interestBadge.classList.add('bg-secondary');
        } else if (problem.interest_level === 'Somewhat Interested') {
            interestBadge.classList.remove('bg-success');
            interestBadge.classList.add('bg-info');
        }

        // Add event listeners for buttons
        const viewBtn = clone.querySelector('.view-problem-btn');
        const deleteBtn = clone.querySelector('.delete-problem-btn');

        // NEW: Add validation button for "Very Interested" problems
        const validationBtn = clone.querySelector('.validation-problem-btn');
        if (validationBtn) {
            if (problem.interest_level === 'Very Interested') {
                validationBtn.classList.remove('d-none');
                validationBtn.addEventListener('click', () => goToValidation(problem.id));
            } else {
                validationBtn.classList.add('d-none');
            }
        }

        viewBtn.addEventListener('click', () => viewProblem(problem.id));
        deleteBtn.addEventListener('click', () => deleteProblem(problem.id));

        // Add to the list
        problemList.appendChild(clone);
    }

    function viewProblem(id) {
        // Fetch problem details and show in a modal (implementation not shown)
        console.log('View problem', id);
        // In a more complete implementation, you would fetch the problem details
        // and display them in a modal
    }

    function deleteProblem(id) {
        if (confirm('Are you sure you want to delete this problem?')) {
                fetch(`/api/problems/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': 'MY_SECRET_TOKEN' // Add the API token header
                    },
                    credentials: 'same-origin' // Add this line
                })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Reload problems
                loadProblems();
            })
            .catch(error => {
                showError('Error deleting problem: ' + error.message);
            });
        }
    }

    // NEW: Function to navigate to validation page
    function goToValidation(problemId) {
        window.location.href = `/validation.html?problem=${problemId}`;
    }

    // NEW: Function to fetch problem suggestions from the API
    function fetchProblemSuggestions() {
        const domain = domainInput.value.trim();

        if (!domain) {
            showError('Please enter your domain expertise first');
            return;
        }

        // Show loading state
        if (suggestionsLoading) {
            suggestionsLoading.classList.remove('d-none');
        }

        if (suggestionsSection) {
            suggestionsSection.classList.remove('d-none');
        }

        if (suggestionsList) {
            suggestionsList.innerHTML = '';
        }

        // Call the API - Using GET request with query parameter as per routes.js
            fetch(`/api/problem-suggestions?domain=${encodeURIComponent(domain)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': 'MY_SECRET_TOKEN' // Added the API token header
                },
                credentials: 'same-origin' // Add this line
            })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Hide loading
            if (suggestionsLoading) {
                suggestionsLoading.classList.add('d-none');
            }

            // Display suggestions based on the response format
            if (data) {
                // Handle different possible response formats
                let suggestions = [];

                if (Array.isArray(data)) {
                    // If data is already an array
                    suggestions = data;
                } else if (data.suggestions && Array.isArray(data.suggestions)) {
                    // If data has a suggestions property
                    suggestions = data.suggestions;
                } else if (Array.isArray(data) && data.length > 0 && data[0].title && data[0].description) {
                    // If data is an array of objects with title and description
                    suggestions = data.map(item => item.description || item.title);
                }

                if (suggestions.length > 0) {
                    displaySuggestions(suggestions);
                } else {
                    if (suggestionsList) {
                        suggestionsList.innerHTML = '<p class="text-muted">No suggestions found. Try providing more specific domain information.</p>';
                    }
                }
            } else {
                if (suggestionsList) {
                    suggestionsList.innerHTML = '<p class="text-muted">No suggestions found. Try providing more specific domain information.</p>';
                }
            }
        })
        .catch(error => {
            console.error('Error fetching suggestions:', error);

            if (suggestionsLoading) {
                suggestionsLoading.classList.add('d-none');
            }

            if (suggestionsList) {
                suggestionsList.innerHTML = '<p class="text-danger">Error loading suggestions. Please try again later.</p>';
            }
        });
    }

    // NEW: Function to display suggestions
    function displaySuggestions(suggestions) {
        if (!suggestionsList) return;

        suggestionsList.innerHTML = '';

        suggestions.forEach((suggestion, index) => {
            // Handle suggestions that might be objects with title/description
            let suggestionText = suggestion;
            if (typeof suggestion === 'object') {
                suggestionText = suggestion.description || suggestion.title || JSON.stringify(suggestion);
            }

            const card = document.createElement('div');
            card.classList.add('card', 'mb-2', 'suggestion-card');

            const cardBody = document.createElement('div');
            cardBody.classList.add('card-body', 'p-3');
            cardBody.textContent = suggestionText;
            cardBody.style.cursor = 'pointer';

            // Add click event to use this suggestion
            cardBody.addEventListener('click', function() {
                problemDescription.value = suggestionText;
                // Optionally, collapse the suggestions
                suggestionsSection.classList.add('d-none');
            });

            card.appendChild(cardBody);
            suggestionsList.appendChild(card);
        });
    }
});