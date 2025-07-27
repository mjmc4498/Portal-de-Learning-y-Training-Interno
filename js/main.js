// js/main.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // Lógica de login simple
            const username = document.getElementById('username').value;
            if (username) {
                localStorage.setItem('currentUser', username);
                window.location.href = 'portal.html';
            }
        });
    }

    if (window.location.pathname.endsWith('portal.html')) {
        const currentUser = localStorage.getItem('currentUser');
        if (!currentUser) {
            window.location.href = 'index.html';
            return;
        }

        document.getElementById('user-name').textContent = currentUser;

        document.getElementById('user-name').textContent = currentUser;

        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        });

        const menuLinks = document.querySelectorAll('.menu a');
        const contentSections = document.querySelectorAll('.content-section');
        const headerTitle = document.querySelector('.main-header h1');

        menuLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();

                menuLinks.forEach(link => link.classList.remove('active'));
                e.target.classList.add('active');

                const section = e.target.getAttribute('data-section');

                contentSections.forEach(content => {
                    if (content.id === section) {
                        content.style.display = 'block';
                        content.classList.add('active');
                    } else {
                        content.style.display = 'none';
                        content.classList.remove('active');
                    }
                });

                headerTitle.textContent = e.target.textContent;
            });
        });

        // Inicialización del controlador
        Controller.init();
    }
});
