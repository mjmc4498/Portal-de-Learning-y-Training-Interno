// js/model.js

const Model = {
    saveCourses: function(courses) {
        // Simple validation to avoid duplicates
        const existingCourses = this.getCourses();
        const newCourses = courses.filter(course =>
            !existingCourses.some(existing => existing['Nombre del Curso'] === course['Nombre del Curso'])
        );

        const allCourses = existingCourses.concat(newCourses);
        localStorage.setItem('courses', JSON.stringify(allCourses));
    },

    getCourses: function() {
        const courses = localStorage.getItem('courses');
        return courses ? JSON.parse(courses) : [];
    },

    // User progress functions
    saveUserProgress: function(userId, courseId, progress) {
        const userProgress = this.getAllUserProgress();
        if (!userProgress[userId]) {
            userProgress[userId] = {};
        }
        userProgress[userId][courseId] = progress;
        localStorage.setItem('userProgress', JSON.stringify(userProgress));
    },

    getUserProgress: function(userId, courseId) {
        const userProgress = this.getAllUserProgress();
        return userProgress[userId] ? userProgress[userId][courseId] : null;
    },

    getAllUserProgress: function() {
        const progress = localStorage.getItem('userProgress');
        return progress ? JSON.parse(progress) : {};
    }

    // Add more functions for quizzes, certifications, etc.
};
