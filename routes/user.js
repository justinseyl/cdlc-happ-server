const express = require('express');
const router = express.Router();
const { queryAsync } = require('../conn.js'); // Ensure this path is correct
const { isAuthenticated, isOnboarded } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roles');

router.get('/survey/new', [isAuthenticated, isOnboarded], async (req, res) => {
    try {
        const { login: userId } = req.session.user;
        res.render('user/survey', { user: req.session.user, surveys: [] });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;
