// js/dashboard.js
document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const journeyList = document.getElementById('journeyList');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const noJourneysMessage = document.getElementById('noJourneysMessage');
    const journeyCardTemplate = document.getElementById('journeyCardTemplate');
    const newJourneyForm = document.getElementById('newJourneyForm');
    const createJourneyBtn = document.getElementById('createJourneyBtn');
    const journeyNameInput = document.getElementById('journeyName');
    const journeyDescriptionInput = document.getElementById('journeyDescription');
    const journeyError = document.getElementById('journeyError');
    const newJourneyModal = new bootstrap.Modal(document.getElementById('newJourneyModal'));

    // Load user's journeys
    // Load user's journeys
    function loadJourneys() {
        console.log('Loading journeys...');
        loadingIndicator.classList.remove('d-none');
        noJourneysMessage.classList.add('d-none');

        // Clear existing journey cards (except loading indicator and no journeys message)
        const existingCards = journeyList.querySelectorAll('.col-md-4');
        existingCards.forEach(card => card.remove());

        // Add a cache-busting parameter to prevent browser caching
        const cacheBuster = `?_=${new Date().getTime()}`;

        fetch(`/api/journeys${cacheBuster}`, {
            headers: {
                'x-api-key': 'MY_SECRET_TOKEN',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load journeys');
            }
            return response.json();
        })
        .then(journeys => {
            console.log(`Loaded ${journeys.length} journeys`);
            loadingIndicator.classList.add('d-none');

            if (journeys.length === 0) {
                noJourneysMessage.classList.remove('d-none');
                return;
            }

            // Create a card for each journey
            journeys.forEach(journey => {
                console.log(`Creating card for journey: ${journey.id} - ${journey.name}`);
                const card = createJourneyCard(journey);
                journeyList.appendChild(card);
            });
        })
        .catch(error => {
            console.error('Error loading journeys:', error);
            loadingIndicator.classList.add('d-none');

            // Show error message
            const errorDiv = document.createElement('div');
            errorDiv.className = 'col-12 alert alert-danger';
            errorDiv.textContent = 'Failed to load journeys. Please try again.';
            journeyList.appendChild(errorDiv);
        });
    }

    // Create a journey card from template
    function createJourneyCard(journey) {
        const template = journeyCardTemplate.content.cloneNode(true);
        const card = template.querySelector('.col-md-4');

        // Set journey details with a unique ID attribute
        card.setAttribute('data-journey-id', journey.id);
        card.setAttribute('id', `journey-card-${journey.id}`); // Add a unique ID attribute
        console.log(`Creating card with ID: journey-card-${journey.id}`);

        card.querySelector('.journey-name').textContent = journey.name;

        // Format date
        const createdDate = new Date(journey.created_at).toLocaleDateString();
        card.querySelector('.journey-date').textContent = `Created on: ${createdDate}`;

        // Set up event listeners for buttons
        const editBtn = card.querySelector('.edit-journey-btn');
        editBtn.href = `/editor.html?journey=${journey.id}`;

        const deleteBtn = card.querySelector('.delete-journey-btn');
        deleteBtn.addEventListener('click', () => confirmDeleteJourney(journey.id, journey.name));

        return card;
    }

    // Show confirmation before deleting a journey
    function confirmDeleteJourney(journeyId, journeyName) {
        if (confirm(`Are you sure you want to delete the journey "${journeyName}"?`)) {
            console.log(`User confirmed deletion of journey ${journeyId}: "${journeyName}"`);
            deleteJourney(journeyId);
        } else {
            console.log(`User cancelled deletion of journey ${journeyId}: "${journeyName}"`);
        }
    }

    // Delete a journey
    function deleteJourney(journeyId) {
        // Find the delete button and disable it during the request
        const deleteBtn = journeyList.querySelector(`[data-journey-id="${journeyId}"] .delete-journey-btn`);
        if (deleteBtn) {
            deleteBtn.disabled = true;
            deleteBtn.textContent = 'Deleting...';
        }

        console.log(`Attempting to delete journey ${journeyId}`);

        fetch(`/api/journeys/${journeyId}`, {
            method: 'DELETE',
            headers: {
                'x-api-key': 'MY_SECRET_TOKEN'
            }
        })
        .then(response => {
            console.log(`Delete response status: ${response.status}`);

            if (!response.ok) {
                // Try to get more detailed error information from the response
                return response.text().then(text => {
                    console.log(`Error response body: ${text}`);

                    try {
                        const errorData = JSON.parse(text);
                        throw new Error(errorData.error || `Server returned ${response.status}: ${response.statusText}`);
                    } catch (jsonError) {
                        // If parsing JSON fails, throw with status code and text
                        throw new Error(`Failed to delete journey (${response.status}): ${text || response.statusText}`);
                    }
                });
            }

            return response.json();
        })
        .then(data => {
            console.log(`Delete success:`, data);

            // Remove the journey card from the UI using the unique ID
            const card = document.getElementById(`journey-card-${journeyId}`);
            if (card) {
                console.log(`Removing journey card from UI with ID: journey-card-${journeyId}`);
                card.remove();
            } else {
                // Try alternative selector as fallback
                const altCard = journeyList.querySelector(`[data-journey-id="${journeyId}"]`);
                if (altCard) {
                    console.log(`Removing journey card using data attribute selector`);
                    altCard.remove();
                } else {
                    console.warn(`Could not find journey card in the UI for journey ${journeyId}`);
                }
            }

            // Show no journeys message if no journeys left
            if (journeyList.querySelectorAll('.col-md-4').length === 0) {
                console.log(`No journeys left, showing message`);
                noJourneysMessage.classList.remove('d-none');
            }

            // Force reload of journeys to ensure sync with server
            // This is important - it will re-fetch the current state from the server
            setTimeout(() => {
                console.log('Reloading journeys to verify deletion');
                loadJourneys();
            }, 500);
        })
        .catch(error => {
            console.error('Error deleting journey:', error);
            alert(`Failed to delete journey: ${error.message}`);
        })
        .finally(() => {
            // Re-enable the button if it exists
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteBtn.textContent = 'Delete';
            }
        });
    }
    // Create a new journey
    function createJourney() {
        const name = journeyNameInput.value.trim();
        if (!name) {
            journeyError.textContent = 'Journey name is required';
            journeyError.classList.remove('d-none');
            return;
        }

        journeyError.classList.add('d-none');
        createJourneyBtn.disabled = true;
        createJourneyBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Creating...';

        fetch('/api/journeys', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': 'MY_SECRET_TOKEN'
            },
            body: JSON.stringify({ 
                name: name, 
                description: journeyDescriptionInput.value.trim() 
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to create journey');
            }
            return response.json();
        })
        .then(data => {
            // Close modal and reset form
            newJourneyModal.hide();
            newJourneyForm.reset();

            // Redirect to the editor for the new journey
            window.location.href = `/editor.html?journey=${data.journey_id}`;
        })
        .catch(error => {
            console.error('Error creating journey:', error);
            journeyError.textContent = 'Failed to create journey. Please try again.';
            journeyError.classList.remove('d-none');
        })
        .finally(() => {
            createJourneyBtn.disabled = false;
            createJourneyBtn.textContent = 'Create Journey';
        });
    }

    // Event listeners
    createJourneyBtn.addEventListener('click', createJourney);

    // Handle form submission (when user presses Enter)
    newJourneyForm.addEventListener('submit', function(e) {
        e.preventDefault();
        createJourney();
    });

    // Load journeys when the page loads
    loadJourneys();
});