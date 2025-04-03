// js/editor.js
document.addEventListener('DOMContentLoaded', function() {
    // Get journey ID from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const journeyId = urlParams.get('journey');

    if (!journeyId) {
        alert('No journey specified');
        window.location.href = '/dashboard.html';
        return;
    }

    // Elements
    const journeyTitle = document.getElementById('journeyTitle');
    const stepEditor = document.getElementById('stepEditor');
    const stepTitle = document.getElementById('stepTitle');
    const stepLocation = document.getElementById('stepLocation');
    const stepInfo = document.getElementById('stepInfo');
    const actionsList = document.getElementById('actionsList');
    const noActionsMessage = document.getElementById('noActionsMessage');
    const saveStepBtn = document.getElementById('saveStepBtn');
    const deleteStepBtn = document.getElementById('deleteStepBtn');
    const addActionBtn = document.getElementById('addActionBtn');
    const backButton = document.getElementById('backButton');
    const navigationHistory = document.getElementById('navigationHistory');
    const showBrokenLinksBtn = document.getElementById('showBrokenLinksBtn');
    const brokenLinksCount = document.getElementById('brokenLinksCount');
    const brokenLinksList = document.getElementById('brokenLinksList');
    const showOverviewBtn = document.getElementById('showOverviewBtn');
    const journeyOverviewContainer = document.getElementById('journeyOverviewContainer');

    // Modals
    const addActionModal = new bootstrap.Modal(document.getElementById('addActionModal'));
    const brokenLinksModal = new bootstrap.Modal(document.getElementById('brokenLinksModal'));
    const overviewModal = new bootstrap.Modal(document.getElementById('overviewModal'));

    // Form elements in modals
    const actionText = document.getElementById('actionText');
    const targetType = document.getElementById('targetType');
    const existingStepContainer = document.getElementById('existingStepContainer');
    const existingStepSelect = document.getElementById('existingStepSelect');
    const saveActionBtn = document.getElementById('saveActionBtn');

    // Templates
    const actionTemplate = document.getElementById('actionTemplate');
    const brokenLinkTemplate = document.getElementById('brokenLinkTemplate');

    // State variables
    let currentJourney = null;
    let currentStep = null;
    let allSteps = [];
    let navigationSteps = [];
    let brokenLinks = [];

    // Initialize the editor
    function init() {
        // Load the journey
        loadJourney(journeyId);

        // Set up event listeners
        setupEventListeners();
    }

    // Set up all event listeners
    function setupEventListeners() {
        // Save step button
        saveStepBtn.addEventListener('click', saveCurrentStep);

        // Delete step button
        deleteStepBtn.addEventListener('click', confirmDeleteStep);

        // Add action button
        addActionBtn.addEventListener('click', showAddActionModal);

        // Save action button
        saveActionBtn.addEventListener('click', saveAction);

        // Back button
        backButton.addEventListener('click', navigateBack);

        // Target type change in add action modal
        targetType.addEventListener('change', function() {
            existingStepContainer.style.display = 
                this.value === 'existing' ? 'block' : 'none';
        });

        // Show broken links button
        showBrokenLinksBtn.addEventListener('click', function() {
            loadBrokenLinks().then(() => {
                brokenLinksModal.show();
            });
        });

        // Show overview button
        showOverviewBtn.addEventListener('click', function() {
            renderJourneyOverview();
            overviewModal.show();
        });
    }

    // Load journey data
    function loadJourney(journeyId) {
        fetch(`/api/journeys/${journeyId}`, {
            headers: {
                'x-api-key': 'MY_SECRET_TOKEN'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load journey');
            }
            return response.json();
        })
        .then(journey => {
            currentJourney = journey;
            journeyTitle.textContent = journey.name;

            // Load steps for this journey
            return loadSteps(journeyId);
        })
        .then(steps => {
            allSteps = steps;

            if (steps.length === 0) {
                // Create initial step if journey is empty
                createInitialStep(journeyId);
            } else {
                // Load the first step
                loadStep(steps[0].id);
            }

            // Also load broken links count
            loadBrokenLinksCount();
        })
        .catch(error => {
            console.error('Error loading journey:', error);
            alert('Failed to load journey. Redirecting to dashboard.');
            window.location.href = '/dashboard.html';
        });
    }

    // Load all steps for a journey
    function loadSteps(journeyId) {
        return fetch(`/api/journeys/${journeyId}/steps`, {
            headers: {
                'x-api-key': 'MY_SECRET_TOKEN'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load steps');
            }
            return response.json();
        });
    }

    // Create initial step for a new journey
    function createInitialStep(journeyId) {
        console.log('Creating initial step for journey:', journeyId);
        fetch(`/api/journeys/${journeyId}/steps`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': 'MY_SECRET_TOKEN'
            },
            body: JSON.stringify({
                name: 'Start',
                location: 'Beginning of journey',
                info: 'This is the first step of your customer journey.'
            })
        })
        .then(response => {
            if (!response.ok) {
                console.error('Server returned error:', response.status);
                throw new Error('Failed to create initial step');
            }
            return response.json();
        })
        .then(data => {
            console.log('Initial step created:', data);
            // Reload steps
            return loadSteps(journeyId);
        })
        .then(steps => {
            console.log('Steps after creating initial:', steps);
            allSteps = steps;
            if (steps.length > 0) {
                loadStep(steps[0].id);
            } else {
                // If still no steps, show error and redirect
                throw new Error('No steps found after creating initial step');
            }
        })
        .catch(error => {
            console.error('Error creating initial step:', error);
            alert('Failed to create initial step. Redirecting to dashboard.');
            window.location.href = '/dashboard.html';
        });
    }
    // Load a specific step
    function loadStep(stepId) {
        fetch(`/api/steps/${stepId}`, {
            headers: {
                'x-api-key': 'MY_SECRET_TOKEN'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load step');
            }
            return response.json();
        })
        .then(step => {
            // Set current step
            currentStep = step;

            // Update navigation history
            updateNavigationHistory(step);

            // Display step data in the editor
            stepTitle.value = step.name;
            stepLocation.value = step.location;
            stepInfo.value = step.info;

            // Load actions for this step
            return loadActions(stepId);
        })
        .then(actions => {
            // Display actions
            renderActions(actions);
        })
        .catch(error => {
            console.error('Error loading step:', error);
            alert('Failed to load step.');
        });
    }

    // Load actions for a step
    function loadActions(stepId) {
        return fetch(`/api/steps/${stepId}/actions`, {
            headers: {
                'x-api-key': 'MY_SECRET_TOKEN'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load actions');
            }
            return response.json();
        });
    }

    // Load broken links count
    function loadBrokenLinksCount() {
        fetch(`/api/journeys/${journeyId}/broken-links`, {
            headers: {
                'x-api-key': 'MY_SECRET_TOKEN'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load broken links');
            }
            return response.json();
        })
        .then(data => {
            brokenLinks = data.broken_links || [];
            brokenLinksCount.textContent = brokenLinks.length;

            // Update button appearance based on broken link count
            if (brokenLinks.length > 0) {
                showBrokenLinksBtn.classList.remove('btn-outline-warning');
                showBrokenLinksBtn.classList.add('btn-warning');
            } else {
                showBrokenLinksBtn.classList.add('btn-outline-warning');
                showBrokenLinksBtn.classList.remove('btn-warning');
            }
        })
        .catch(error => {
            console.error('Error loading broken links count:', error);
        });
    }

    // Load broken links for fixing
    function loadBrokenLinks() {
        return fetch(`/api/journeys/${journeyId}/broken-links`, {
            headers: {
                'x-api-key': 'MY_SECRET_TOKEN'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load broken links');
            }
            return response.json();
        })
        .then(data => {
            brokenLinks = data.broken_links || [];
            const availableSteps = data.available_steps || [];

            // Render broken links
            renderBrokenLinks(brokenLinks, availableSteps);

            return data;
        })
        .catch(error => {
            console.error('Error loading broken links:', error);
            alert('Failed to load broken links.');
        });
    }

    // Fix a broken link
    function fixBrokenLink(actionId, targetStepId) {
        fetch(`/api/actions/${actionId}/fix`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': 'MY_SECRET_TOKEN'
            },
            body: JSON.stringify({
                target_step_id: targetStepId
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fix broken link');
            }
            return response.json();
        })
        .then(data => {
            // Reload broken links
            return loadBrokenLinks();
        })
        .then(() => {
            // Update broken links count
            loadBrokenLinksCount();

            // If the current step has the action that was fixed, reload it
            if (currentStep) {
                loadActions(currentStep.id).then(actions => {
                    renderActions(actions);
                });
            }
        })
        .catch(error => {
            console.error('Error fixing broken link:', error);
            alert('Failed to fix broken link.');
        });
    }

    // Save changes to the current step
    function saveCurrentStep() {
        if (!currentStep) return;

        const updatedTitle = stepTitle.value.trim();
        const updatedLocation = stepLocation.value.trim();
        const updatedInfo = stepInfo.value.trim();

        // Validate
        if (!updatedTitle || !updatedLocation || !updatedInfo) {
            alert('All fields are required');
            return;
        }

        // Save changes
        fetch(`/api/steps/${currentStep.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': 'MY_SECRET_TOKEN'
            },
            body: JSON.stringify({
                name: updatedTitle,
                location: updatedLocation,
                info: updatedInfo
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to save step');
            }
            return response.json();
        })
        .then(data => {
            // Update current step
            currentStep.name = updatedTitle;
            currentStep.location = updatedLocation;
            currentStep.info = updatedInfo;

            // Update in allSteps
            const stepIndex = allSteps.findIndex(s => s.id === currentStep.id);
            if (stepIndex !== -1) {
                allSteps[stepIndex] = currentStep;
            }

            // Update navigation history display
            updateNavigationHistory(currentStep, true);

            alert('Step saved successfully');
        })
        .catch(error => {
            console.error('Error saving step:', error);
            alert('Failed to save step.');
        });
    }

    // Delete the current step
    function confirmDeleteStep() {
        if (!currentStep) return;

        if (confirm(`Are you sure you want to delete this step?\n\nWarning: Any links to this step will be broken.`)) {
            deleteStep(currentStep.id);
        }
    }

    // Delete a step
    function deleteStep(stepId) {
        fetch(`/api/steps/${stepId}`, {
            method: 'DELETE',
            headers: {
                'x-api-key': 'MY_SECRET_TOKEN'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to delete step');
            }
            return response.json();
        })
        .then(data => {
            // If there were broken links created, show notification
            if (data.brokenLinks > 0) {
                alert(`Step deleted. ${data.brokenLinks} links are now broken. Please fix them.`);
                loadBrokenLinksCount();
            } else {
                alert('Step deleted successfully');
            }

            // Reload steps
            return loadSteps(journeyId);
        })
        .then(steps => {
            allSteps = steps;

            // If we deleted the current step
            if (steps.length === 0) {
                // Create a new initial step
                createInitialStep(journeyId);
            } else {
                // Go to the previous step in history or the first step
                if (navigationSteps.length > 1) {
                    // Remove the current step from history
                    navigationSteps.pop();
                    // Go to the previous step
                    const prevStepId = navigationSteps[navigationSteps.length - 1].id;
                    loadStep(prevStepId);
                } else {
                    loadStep(steps[0].id);
                }
            }
        })
        .catch(error => {
            console.error('Error deleting step:', error);
            alert('Failed to delete step.');
        });
    }

    // Show the add action modal
    function showAddActionModal() {
        // Clear the form
        document.getElementById('actionForm').reset();
        targetType.value = 'new';
        existingStepContainer.style.display = 'none';

        // Fill the existing steps dropdown
        existingStepSelect.innerHTML = '';
        allSteps.forEach(step => {
            // Don't include the current step as an option
            if (step.id !== currentStep.id) {
                const option = document.createElement('option');
                option.value = step.id;
                option.textContent = step.name;
                existingStepSelect.appendChild(option);
            }
        });

        // Show the modal
        addActionModal.show();
    }

    // Save a new action
    function saveAction() {
        const text = actionText.value.trim();

        if (!text) {
            alert('Action text is required');
            return;
        }

        const isNewStep = targetType.value === 'new';
        let targetStepId = null;

        if (!isNewStep) {
            targetStepId = existingStepSelect.value;
            if (!targetStepId) {
                alert('Please select a target step');
                return;
            }
        }

        // First, create the action
        fetch(`/api/steps/${currentStep.id}/actions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': 'MY_SECRET_TOKEN'
            },
            body: JSON.stringify({
                action_text: text,
                target_step_id: targetStepId
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to create action');
            }
            return response.json();
        })
        .then(data => {
            const actionId = data.action_id;

            // If we're creating a new step, create it and then link the action to it
            if (isNewStep) {
                return fetch(`/api/journeys/${journeyId}/steps`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': 'MY_SECRET_TOKEN'
                    },
                    body: JSON.stringify({
                        name: 'New Step',
                        location: 'Enter location here',
                        info: 'Enter information here'
                    })
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to create new step');
                    }
                    return response.json();
                })
                .then(stepData => {
                    const newStepId = stepData.step_id;

                    // Now link the action to the new step
                    return fetch(`/api/actions/${actionId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-api-key': 'MY_SECRET_TOKEN'
                        },
                        body: JSON.stringify({
                            action_text: text,
                            target_step_id: newStepId
                        })
                    });
                });
            }

            return Promise.resolve();
        })
        .then(() => {
            // Close the modal
            addActionModal.hide();

            // Reload actions
            return loadActions(currentStep.id);
        })
        .then(actions => {
            renderActions(actions);
        })
        .catch(error => {
            console.error('Error saving action:', error);
            alert('Failed to save action.');
        });
    }

    // Handle navigation between steps
    function navigateToStep(stepId) {
        // Save current step first if it has been modified
        if (isStepModified()) {
            if (confirm('You have unsaved changes. Save before navigating?')) {
                saveCurrentStep();
            }
        }

        loadStep(stepId);
    }

    // Go back to the previous step
    function navigateBack() {
        if (navigationSteps.length < 2) return;

        // Save current step first if it has been modified
        if (isStepModified()) {
            if (confirm('You have unsaved changes. Save before navigating?')) {
                saveCurrentStep();
            }
        }

        // Remove current step from history
        navigationSteps.pop();

        // Get the previous step
        const prevStep = navigationSteps[navigationSteps.length - 1];

        // Load it
        loadStep(prevStep.id);
    }

    // Check if the current step has been modified
    function isStepModified() {
        if (!currentStep) return false;

        return stepTitle.value !== currentStep.name ||
               stepLocation.value !== currentStep.location ||
               stepInfo.value !== currentStep.info;
    }

    // Update the navigation history
    function updateNavigationHistory(step, updateOnly = false) {
        if (!updateOnly) {
            // Check if this step is already the last one in the history
            if (navigationSteps.length > 0 && 
                navigationSteps[navigationSteps.length - 1].id === step.id) {
                // It's already the current step, no need to add it again
                return;
            }

            // Add to navigation steps
            navigationSteps.push(step);
        }

        // Update the back button state
        backButton.disabled = navigationSteps.length < 2;

        // Update the history display
        renderNavigationHistory();
    }

    // Render the navigation history
    function renderNavigationHistory() {
        navigationHistory.innerHTML = '';

        // Show up to the last 5 steps
        const recentSteps = navigationSteps.slice(-5);

        // Create elements for each step
        recentSteps.forEach((step, index) => {
            const isActive = index === recentSteps.length - 1;

            const stepItem = document.createElement('button');
            stepItem.className = `list-group-item list-group-item-action ${isActive ? 'active' : ''}`;
            stepItem.textContent = step.name;

            if (!isActive) {
                stepItem.addEventListener('click', () => {
                    // Get the index in the full navigation history
                    const fullIndex = navigationSteps.findIndex(s => s.id === step.id);

                    // Truncate the history to this point
                    navigationSteps = navigationSteps.slice(0, fullIndex + 1);

                    // Load the step
                    loadStep(step.id);
                });
            }

            navigationHistory.appendChild(stepItem);
        });
    }

    // Render actions for the current step
    function renderActions(actions) {
        actionsList.innerHTML = '';

        if (!actions || actions.length === 0) {
            noActionsMessage.style.display = 'block';
            return;
        }

        noActionsMessage.style.display = 'none';

        // Create elements for each action
        actions.forEach(action => {
            const actionElement = actionTemplate.content.cloneNode(true);

            const actionBtn = actionElement.querySelector('.action-btn');
            actionBtn.setAttribute('data-action-id', action.id);
            actionBtn.querySelector('.action-text').textContent = action.action_text;

            const deleteActionBtn = actionElement.querySelector('.delete-action-btn');
            deleteActionBtn.addEventListener('click', () => confirmDeleteAction(action.id));

            // Add click handler to navigate to the target step
            if (action.target_step_id) {
                actionBtn.addEventListener('click', () => navigateToStep(action.target_step_id));
            }

            // Show broken link warning if needed
            if (!action.target_step_id || action.broken) {
                actionElement.querySelector('.broken-link-warning').classList.remove('d-none');

                // Add fix link button if broken
                if (actionBtn.classList.contains('btn-outline-primary')) {
                    actionBtn.classList.remove('btn-outline-primary');
                    actionBtn.classList.add('btn-outline-danger');
                }

                // Change click behavior to fix link
                actionBtn.addEventListener('click', () => {
                    loadBrokenLinks().then(() => {
                        brokenLinksModal.show();
                    });
                });
            }

            actionsList.appendChild(actionElement);
        });
    }

    // Confirm deleting an action
    function confirmDeleteAction(actionId) {
        if (confirm('Are you sure you want to delete this action?')) {
            deleteAction(actionId);
        }
    }

    // Delete an action
    function deleteAction(actionId) {
        fetch(`/api/actions/${actionId}`, {
            method: 'DELETE',
            headers: {
                'x-api-key': 'MY_SECRET_TOKEN'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to delete action');
            }
            return response.json();
        })
        .then(data => {
            // Reload actions
            return loadActions(currentStep.id);
        })
        .then(actions => {
            renderActions(actions);
        })
        .catch(error => {
            console.error('Error deleting action:', error);
            alert('Failed to delete action.');
        });
    }

    // Render broken links
    function renderBrokenLinks(brokenLinks, availableSteps) {
        brokenLinksList.innerHTML = '';

        if (brokenLinks.length === 0) {
            brokenLinksList.innerHTML = '<div class="alert alert-success">No broken links found!</div>';
            return;
        }

        // Create elements for each broken link
        brokenLinks.forEach(link => {
            const linkElement = brokenLinkTemplate.content.cloneNode(true);

            linkElement.querySelector('.broken-action-text').textContent = link.action_text;
            linkElement.querySelector('.source-step-name').textContent = link.source_step_name;

            const selectElement = linkElement.querySelector('.target-step-select');

            // Fill available steps
            availableSteps.forEach(step => {
                const option = document.createElement('option');
                option.value = step.id;
                option.textContent = step.name;
                selectElement.appendChild(option);
            });

            const fixButton = linkElement.querySelector('.fix-link-btn');
            fixButton.addEventListener('click', () => {
                const targetStepId = selectElement.value;
                if (!targetStepId) {
                    alert('Please select a target step');
                    return;
                }

                fixBrokenLink(link.id, targetStepId);
            });

            brokenLinksList.appendChild(linkElement);
        });
    }

    // Render journey overview
    function renderJourneyOverview() {
        journeyOverviewContainer.innerHTML = '';

        if (allSteps.length === 0) {
            journeyOverviewContainer.innerHTML = '<div class="alert alert-info">This journey has no steps yet.</div>';
            return;
        }

        // Create a simple overview for now
        // This could be enhanced to show a visual flow diagram
        const overviewDiv = document.createElement('div');

        // Create a list of all steps
        const stepsList = document.createElement('ul');
        stepsList.className = 'list-group mb-4';

        allSteps.forEach(step => {
            const stepItem = document.createElement('li');
            stepItem.className = 'list-group-item d-flex justify-content-between align-items-center';

            const stepName = document.createElement('span');
            stepName.textContent = step.name;
            stepItem.appendChild(stepName);

            const viewBtn = document.createElement('button');
            viewBtn.className = 'btn btn-sm btn-primary';
            viewBtn.textContent = 'View';
            viewBtn.addEventListener('click', () => {
                overviewModal.hide();
                navigateToStep(step.id);
            });
            stepItem.appendChild(viewBtn);

            stepsList.appendChild(stepItem);
        });

        overviewDiv.appendChild(stepsList);

        // Add a note about broken links if any
        if (brokenLinks.length > 0) {
            const brokenLinksWarning = document.createElement('div');
            brokenLinksWarning.className = 'alert alert-warning';
            brokenLinksWarning.innerHTML = `<i class="bi bi-exclamation-triangle"></i> There are ${brokenLinks.length} broken links in this journey. <button id="fixBrokenLinksBtn" class="btn btn-sm btn-warning">Fix Broken Links</button>`;

            overviewDiv.appendChild(brokenLinksWarning);

            // Add click handler after appending
            overviewDiv.querySelector('#fixBrokenLinksBtn').addEventListener('click', () => {
                overviewModal.hide();
                loadBrokenLinks().then(() => {
                    brokenLinksModal.show();
                });
            });
        }

        journeyOverviewContainer.appendChild(overviewDiv);
    }

    // Initialize the editor
    init();
});