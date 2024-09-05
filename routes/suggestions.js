const express = require('express');
const { v4: uuid } = require('uuid');
const moment = require('moment');
const { queryAsync } = require('../conn.js');
const { isAuthenticated } = require('../middleware/auth');
const { isAdmin, isManager } = require('../middleware/roles');

const router = express.Router();

const getAllSuggestionsAdmin = async () => {
  const query = `
    SELECT s.id, s.title, u.name, s.userid, s.content, DATE_FORMAT(s.created, '%m/%d/%Y') as created 
    FROM suggestions s 
    INNER JOIN users u ON u.email = s.userid
  `;
  return await queryAsync(query);
};

const getUserSuggestions = async (userId) => {
  const query = `
    SELECT id, title, userid, content, DATE_FORMAT(created, '%M %d, %Y') as created 
    FROM suggestions 
    WHERE userid = '${userId}'
  `;
  return await queryAsync(query);
};

const createSuggestion = async (req, res) => {
  try {
    const usr = req.session.user.login;
    const subject = req.body.subject;
    const content = req.body.content;

    if (!usr || !subject || !content) {
      return res.status(400).send('Invalid parameters');
    }

    const suggestionQuery = `
      INSERT INTO suggestions (id, title, userid, content, created) 
      VALUES ('${uuid()}', '${subject}', '${usr}', '${content}', '${moment().format("YYYY-MM-DD HH:mm:ss")}')
    `;

    await queryAsync(suggestionQuery);

    const alertQuery = `
      INSERT INTO alerts (id, title, content, updated_at, type, status) 
      VALUES ('${uuid()}', 'New Suggestion Added', 'A new suggestion has been added by ${usr}.', '${moment().format("YYYY-MM-DD HH:mm:ss")}', 'admin', 'unread')
    `;

    await queryAsync(alertQuery);

    res.redirect('back');
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).send('Internal Server Error');
  }
};

const getTotalSuggestions = async (req, res) => {
  try {
    const usr = req.session.user.login;

    if (!usr) {
      return res.status(400).send('Invalid parameters');
    }

    const query = `SELECT COUNT(id) as total FROM suggestions WHERE userid = '${usr}'`;

    const result = await queryAsync(query);
    res.send({ total: result[0].total });
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).send('Internal Server Error');
  }
};

const renderSuggestionsPage = async (req, res) => {
  try {
    let suggestions;
    if (req.session.user.role === 'admin' || req.session.user.role === 'superadmin') {
      suggestions = await getAllSuggestionsAdmin();
    } else {
      suggestions = await getUserSuggestions(req.session.user.login);
    }
    const data = { suggestions: suggestions, userRole: req.session.user.role };
    res.render('suggestions', { data: data, departments: res.locals.departments, user: req.session.user });
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).send('Internal Server Error');
  }
};

router.get('/admin/all', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const suggestions = await getAllSuggestionsAdmin();
    res.send(suggestions);
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).send('Internal Server Error');
  }
});

router.post('/create', isAuthenticated, createSuggestion);
router.get('/total', isAuthenticated, getTotalSuggestions);
router.get('/user', isAuthenticated, async (req, res) => {
  try {
    const suggestions = await getUserSuggestions(req.session.user.login);
    res.send(suggestions);
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).send('Internal Server Error');
  }
});
router.get('/', isAuthenticated, renderSuggestionsPage);

module.exports = router;
