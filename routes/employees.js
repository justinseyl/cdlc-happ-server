const express = require('express');
const router = express.Router();
const { queryAsync } = require('../conn.js');
const { isAuthenticated, isOnboarded } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roles');

const get_all_users = async (division = null) => {
    const divisionParam = division ? `'${division}'` : 'NULL';
    const q = `CALL GetAllUsers(${divisionParam})`; 

    try {
        const result = await queryAsync(q, [division]);
        return result[0];
    } catch (err) {
        console.error('SQL error:', err);
        throw err;
    }
};

router.get('/', [isAuthenticated, isOnboarded, isAdmin], async (req, res) => {
    try {
        const division = req.query.division || null;  // Get division from query string, default to null
        const users = await get_all_users(division);
        res.render('admin/employees', { user: req.session.user, data: users, division: division });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;
