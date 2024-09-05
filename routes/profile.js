const express = require('express');
const moment = require('moment');
const db = require('../conn.js');
const { isAuthenticated } = require('../middleware/auth');
const { isManager } = require('../middleware/roles');

const router = express.Router();

// Route to render the profile page
router.get('/', isAuthenticated, (req, res) => {
    const userId = req.session.user.login;

    const query_user = `SELECT * FROM users WHERE email = ?`;
    const query_details = `SELECT * FROM user_details WHERE email = ?`;

    db.query(query_user, [userId], (err, userResult) => {
        if (err) {
            console.error("Error fetching user:", err);
            res.status(500).send('Server error');
            return;
        }

        if (userResult.length === 0) {
            res.redirect('/login');
            return;
        }

        db.query(query_details, [userId], (err, detailsResult) => {
            if (err) {
                console.error("Error fetching user details:", err);
                res.status(500).send('Server error');
                return;
            }

            if (detailsResult.length === 0) {
                const query_reset_onboarding = `UPDATE users SET onboarding_completed = 0 WHERE email = ?`;
                db.query(query_reset_onboarding, [userId], (err, result) => {
                    if (err) {
                        console.error("Error resetting onboarding:", err);
                        res.status(500).send('Server error');
                        return;
                    }

                    req.session.user.onboarding_completed = false;
                    res.redirect('/auth/onboarding');
                });
                return;
            }

            res.render('user/profile', {
                moment: moment,
                currentUser: req.session.user,
                user: userResult[0],
                userDetails: detailsResult[0]
            });
        });
    });
});

// POST route to edit "Basics" information
router.post('/edit/basics', [isAuthenticated, isManager], (req, res) => {
    const { first_name, last_name, date_of_birth } = req.body;
    const userId = req.session.user.login;

    const query = `UPDATE users SET firstname = ?, lastname = ?, dob = ? WHERE email = ?`;

    db.query(query, [first_name, last_name, date_of_birth, userId], (err, result) => {
        if (err) {
            console.error("Error updating basics:", err);
            res.status(500).send('Server error');
            return;
        }

        res.redirect('/profile');
    });
});

// POST route to edit "Contact" information
router.post('/edit/contact', [isAuthenticated, isManager], (req, res) => {
    const { personal_email, phone_number } = req.body;
    const userId = req.session.user.login;

    const query = `UPDATE user_details SET personal_email = ?, phone_number = ? WHERE email = ?`;

    db.query(query, [personal_email, phone_number, userId], (err, result) => {
        if (err) {
            console.error("Error updating contact information:", err);
            res.status(500).send('Server error');
            return;
        }

        res.redirect('/profile');
    });
});

// POST route to edit "Meta" information
router.post('/edit/meta', [isAuthenticated, isManager], (req, res) => {
    const {
        spouse, anniv, firstchild, secondchild, drink, food, rest, store, team, candy, starbucks, college
    } = req.body;
    const userId = req.session.user.login;

    const query = `
        UPDATE users SET spouse = ?, anniv = ?, firstchild = ?, secondchild = ?, drink = ?, food = ?, rest = ?, 
        store = ?, team = ?, candy = ?, starbucks = ?, college = ? WHERE email = ?
    `;

    db.query(query, [
        spouse, anniv, firstchild, secondchild, drink, food, rest, store, team, candy, starbucks, college, userId
    ], (err, result) => {
        if (err) {
            console.error("Error updating meta information:", err);
            res.status(500).send('Server error');
            return;
        }

        res.redirect('/profile');
    });
});

// POST route to edit "Emergency Contact" information
router.post('/edit/emergency-contact', [isAuthenticated, isManager], (req, res) => {
    const {
        emergency_first_name, emergency_last_name, emergency_relationship, emergency_email, emergency_phone_number
    } = req.body;
    const userId = req.session.user.login;

    const query = `
        UPDATE user_details SET emergency_first_name = ?, emergency_last_name = ?, emergency_relationship = ?, 
        emergency_email = ?, emergency_phone_number = ? WHERE email = ?
    `;

    db.query(query, [
        emergency_first_name, emergency_last_name, emergency_relationship, emergency_email, emergency_phone_number, userId
    ], (err, result) => {
        if (err) {
            console.error("Error updating emergency contact:", err);
            res.status(500).send('Server error');
            return;
        }

        res.redirect('/profile');
    });
});

// POST route to edit "Personal Questions" information
router.post('/edit/personal-questions', [isAuthenticated, isManager], (req, res) => {
    const { home_address, city, state, zip, marital_status } = req.body;
    const userId = req.session.user.login;

    const query = `
        UPDATE user_details SET home_address = ?, city = ?, state = ?, zip = ?, marital_status = ? WHERE email = ?
    `;

    db.query(query, [
        home_address, city, state, zip, marital_status, userId
    ], (err, result) => {
        if (err) {
            console.error("Error updating personal questions:", err);
            res.status(500).send('Server error');
            return;
        }

        res.redirect('/profile');
    });
});

module.exports = router;
