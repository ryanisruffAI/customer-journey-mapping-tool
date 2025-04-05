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
    function loadJourneys() {
        loadingIndicator.classList.remove('d-none');
        noJourneysMessage.classList.add('d-none');

        // Clear existing journey cards (except loading indicator and no journeys message)
        const existingCards = journeyList.querySelectorAll('.col-md-4');
        existingCards.forEach(card => card.remove());

        fetch('/api/journeys', {
            headers: {
                'x-api-key': 'MY_SECRET_TOKEN'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load journeys');
            }
            return response.json();
        })
        .then(journeys => {
            loadingIndicator.classList.add('d-none');

            if (journeys.length === 0) {
                noJourneysMessage.classList.remove('d-none');
                return;
            }

            // Create a card for each journey
            journeys.forEach(journey => {
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

        // Set journey details
        card.setAttribute('data-journey-id', journey.id);
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
            deleteJourney(journeyId);
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

        fetch(`/api/journeys/${journeyId}`, {
            method: 'DELETE',
            headers: {
                'x-api-key': 'MY_SECRET_TOKEN'
            }
        })
        .then(response => {
            if (!response.ok) {
                // Try to get more detailed error information from the response
                return response.json()
                    .then(errorData => {
                        throw new Error(errorData.error || `Server returned ${response.status}: ${response.statusText}`);
                    })
                    .catch(jsonError => {
                        // If parsing JSON fails, throw with status code
                        throw new Error(`Failed to delete journey (${response.status})`);
                    });
            }
            return response.json();
        })
        .then(data => {
            // Remove the journey card from the UI
            const card = journeyList.querySelector(`[data-journey-id="${journeyId}"]`);
            if (card) {
                card.remove();
            }

            // Show no journeys message if no journeys left
            if (journeyList.querySelectorAll('.col-md-4').length === 0) {
                noJourneysMessage.classList.remove('d-none');
            }
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