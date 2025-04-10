// js/auth.js
document.addEventListener('DOMContentLoaded', function() {
    // Get form elements
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginError = document.getElementById('loginError');
    const registerError = document.getElementById('registerError');

    // Check if we're already authenticated
    fetch('/api/check-auth')
        .then(response => response.json())
        .then(data => {
            if (data.authenticated) {
                // If already authenticated, redirect to problems page
                window.location.href = '/problems.html';
            }
        })
        .catch(error => {
            console.error('Error checking authentication:', error);
        });

    // Handle login form submission
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        loginError.classList.add('d-none');

        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        // Call API to login
        fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': 'MY_SECRET_TOKEN'
            },
            body: JSON.stringify({ username, password })
        })
        .then(response => {
            if (response.redirected) {
                window.location.href = '/problems.html';
            } else {
                return response.json().then(data => {
                    throw new Error(data.info || 'Login failed');
                });
            }
        })
        .catch(error => {
            loginError.textContent = error.message;
            loginError.classList.remove('d-none');
        });
    });

    // Handle registration form submission
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        registerError.classList.add('d-none');

        const username = document.getElementById('registerUsername').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Validate passwords match
        if (password !== confirmPassword) {
            registerError.textContent = 'Passwords do not match';
            registerError.classList.remove('d-none');
            return;
        }

        // Call API to register
        fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': 'MY_SECRET_TOKEN'
            },
            body: JSON.stringify({ username, password })
        })
        .then(response => {
            if (response.redirected) {
                window.location.href = '/problems.html';
            } else {
                return response.json().then(data => {
                    throw new Error(data.info || 'Registration failed');
                });
            }
        })
        .catch(error => {
            registerError.textContent = error.message;
            registerError.classList.remove('d-none');
        });
    });
});