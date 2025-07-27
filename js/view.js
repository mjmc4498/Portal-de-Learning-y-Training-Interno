// js/view.js

const View = {
    renderCatalogo: function(courses) {
        const catalogoSection = document.getElementById('catalogo');
        if (!catalogoSection) return;

        let content = '<h2>Catálogo de Cursos</h2><div class="course-grid">';
        courses.forEach(course => {
            content += `
                <div class="card">
                    <h3>${course['Nombre del Curso']}</h3>
                    <p><strong>Instructor:</strong> ${course.Instructor}</p>
                    <p><strong>Duración:</strong> ${course.Duracion}</p>
                    <a href="${course.Recursos}" target="_blank" class="btn">Ver Recursos</a>
                </div>
            `;
        });
        content += '</div>';
        catalogoSection.innerHTML = content;
    },

    renderDashboard: function(user, courses) {
        const dashboardSection = document.getElementById('dashboard');
        if (!dashboardSection) return;

        let content = '<h2>Mi Progreso</h2><div class="course-grid">';
        courses.forEach(course => {
            const progress = Model.getUserProgress(user, course['Nombre del Curso']) || { completed: 0 };
            content += `
                <div class="card">
                    <h3>${course['Nombre del Curso']}</h3>
                    <p>Progreso: ${progress.completed}%</p>
                    <div class="progress-bar">
                        <div class="progress" style="width: ${progress.completed}%;"></div>
                    </div>
                </div>
            `;
        });
        content += '</div>';
        dashboardSection.innerHTML = content;
    }

    renderCertificaciones: function(user) {
        const certificacionesSection = document.getElementById('certificaciones');
        if (!certificacionesSection) return;

        // For this example, we assume a course is "certified" if progress is 100%
        const courses = Model.getCourses();
        const userProgress = Model.getAllUserProgress()[user] || {};

        let content = '<h2>Mis Certificaciones</h2>';
        const certifiedCourses = courses.filter(course => (userProgress[course['Nombre del Curso']]?.completed || 0) === 100);

        if (certifiedCourses.length > 0) {
            content += '<div class="course-grid">';
            certifiedCourses.forEach(course => {
                content += `
                    <div class="card">
                        <h3>${course['Nombre del Curso']}</h3>
                        <p>¡Completado!</p>
                        <button class="btn download-cert-btn" data-course="${course['Nombre del Curso']}">Descargar Certificado</button>
                    </div>
                `;
            });
            content += '</div>';
        } else {
            content += '<p>Aún no has completado ningún curso.</p>';
        }

        certificacionesSection.innerHTML = content;

        document.querySelectorAll('.download-cert-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const courseName = e.target.getAttribute('data-course');
                Controller.generateCertificate(user, courseName);
            });
        });
    },

    renderPerfil: function(user) {
        const perfilSection = document.getElementById('perfil');
        if (!perfilSection) return;

        let content = `
            <h2>Perfil de ${user}</h2>
            <p>Aquí puedes ver y descargar tu informe de rendimiento.</p>
            <button id="download-report-btn" class="btn">Descargar Informe de Rendimiento</button>
        `;
        perfilSection.innerHTML = content;

        document.getElementById('download-report-btn').addEventListener('click', () => {
            Controller.generatePerformanceReport(user);
        });
    }
};
