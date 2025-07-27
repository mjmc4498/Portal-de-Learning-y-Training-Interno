// js/controller.js

const Controller = {
    currentUser: null,

    init: function() {
        this.currentUser = localStorage.getItem('currentUser');
        if (!this.currentUser) {
            window.location.href = 'index.html';
            return;
        }

        document.getElementById('user-name').textContent = this.currentUser;

        const importBtn = document.getElementById('import-btn');
        if (importBtn) {
            importBtn.addEventListener('click', this.importCourses.bind(this));
        }

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', this.logout);
        }

        const menuLinks = document.querySelectorAll('.menu a');
        menuLinks.forEach(link => {
            link.addEventListener('click', this.handleMenuClick.bind(this));
        });

        this.updateView();
    },

    importCourses: function() {
        const fileInput = document.getElementById('import-file');
        const file = fileInput.files[0];

        if (!file) {
            alert("Por favor, selecciona un archivo.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const courses = XLSX.utils.sheet_to_json(worksheet);

            Model.saveCourses(courses);
            alert("Cursos importados con éxito!");
            this.updateView();
        };
        reader.readAsArrayBuffer(file);
    },

    logout: function() {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    },

    handleMenuClick: function(e) {
        e.preventDefault();

        const menuLinks = document.querySelectorAll('.menu a');
        menuLinks.forEach(link => link.classList.remove('active'));
        e.target.classList.add('active');

        const sectionId = e.target.getAttribute('data-section');

        const contentSections = document.querySelectorAll('.content-section');
        contentSections.forEach(content => {
            content.style.display = content.id === sectionId ? 'block' : 'none';
        });

        const headerTitle = document.querySelector('.main-header h1');
        headerTitle.textContent = e.target.textContent;

        this.updateView(sectionId);
    },

    updateView: function(sectionId = 'dashboard') {
        const courses = Model.getCourses();
        switch(sectionId) {
            case 'dashboard':
                View.renderDashboard(this.currentUser, courses);
                break;
            case 'catalogo':
                View.renderCatalogo(courses);
                break;
            case 'certificaciones':
                View.renderCertificaciones(this.currentUser);
                break;
            case 'perfil':
                View.renderPerfil(this.currentUser);
                break;
            // Add other cases for different sections
        }
    },

    generateCertificate: function(user, courseName) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(22);
        doc.text("Certificado de Finalización", 105, 20, null, null, "center");

        doc.setFontSize(16);
        doc.text("Otorgado a:", 105, 40, null, null, "center");

        doc.setFontSize(20);
        doc.text(user, 105, 55, null, null, "center");

        doc.setFontSize(16);
        doc.text("Por completar el curso:", 105, 75, null, null, "center");

        doc.setFontSize(18);
        doc.text(courseName, 105, 90, null, null, "center");

        doc.setFontSize(12);
        doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 105, 110, null, null, "center");

        doc.save(`Certificado-${user}-${courseName}.pdf`);
    },

    generatePerformanceReport: function(user) {
        const userProgress = Model.getAllUserProgress()[user] || {};
        const courses = Model.getCourses();

        const reportData = courses.map(course => {
            const progress = userProgress[course['Nombre del Curso']] || { completed: 0, score: 0, time: "N/A" };
            return {
                "Curso": course['Nombre del Curso'],
                "Completado (%)": progress.completed,
                "Puntaje": progress.score,
                "Tiempo Invertido": progress.time
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(reportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Rendimiento");

        XLSX.writeFile(workbook, `Informe-Rendimiento-${user}.xlsx`);
    }
};
