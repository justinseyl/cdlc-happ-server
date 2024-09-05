const express = require('express');
const { v4: uuid } = require('uuid');
const moment = require('moment');
const { queryAsync } = require('../conn.js');
const { isAuthenticated } = require('../middleware/auth');
const { isAdmin, isManager } = require('../middleware/roles');

const router = express.Router();

const getAllIssuesAdmin = async () => {
  const query = `
    SELECT s.id, s.title, u.name, s.status, s.userid, s.content, DATE_FORMAT(s.created, '%m/%d/%Y') as created 
    FROM issues s 
    INNER JOIN users u ON u.email = s.userid
  `;
  return await queryAsync(query);
};

const getUserIssues = async (userId) => {
  const query = `
    SELECT id, title, userid, content, DATE_FORMAT(created, '%M %d, %Y') as created, status 
    FROM issues 
    WHERE userid = '${userId}'
  `;
  return await queryAsync(query);
};

const resolveIssueAdmin = async (req, res) => {
  try {
    const id = req.body.id;
    if (!id) {
      return res.status(400).send('Invalid parameters');
    }
    const query = `UPDATE issues SET status = 'Closed' WHERE id = '${id}'`;
    await queryAsync(query);
    res.sendStatus(200);
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).send('Internal Server Error');
  }
};

const createIssue = async (req, res) => {
  try {
    const usr = req.session.user.login;
    const subject = req.body.subject;
    const content = req.body.content;

    if (!usr || !subject || !content) {
      return res.status(400).send('Invalid parameters');
    }

    const issueQuery = `
      INSERT INTO issues (id, title, userid, content, created, status) 
      VALUES ('${uuid()}', '${subject}', '${usr}', '${content}', '${moment().format("YYYY-MM-DD HH:mm:ss")}', 'Open')
    `;

    await queryAsync(issueQuery);

    const alertQuery = `
      INSERT INTO alerts (id, title, content, updated_at, type, status) 
      VALUES ('${uuid()}', 'New Issue Added', 'A new issue has been added by ${usr}.', '${moment().format("YYYY-MM-DD HH:mm:ss")}', 'admin', 'unread')
    `;

    await queryAsync(alertQuery);

    res.redirect('back');
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).send('Internal Server Error');
  }
};

const getTotalIssues = async (req, res) => {
  try {
    const usr = req.session.user.login;
    if (!usr) {
      return res.status(400).send('Invalid parameters');
    }
    const query = `SELECT COUNT(id) as total FROM issues WHERE userid = '${usr}'`;
    const result = await queryAsync(query);
    res.send({ total: result[0].total });
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).send('Internal Server Error');
  }
};

const renderIssuesPage = async (req, res) => {
  try {
    let issues;
    if (req.session.user.role === 'admin' || req.session.user.role === 'superadmin') {
      issues = await getAllIssuesAdmin();
    } else {
      issues = await getUserIssues(req.session.user.login);
    }
    const data = { issues: issues };
    res.render('issues', { data: data, departments: res.locals.departments, user: req.session.user });
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).send('Internal Server Error');
  }
};

router.get('/admin/all', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const issues = await getAllIssuesAdmin();
    res.send(issues);
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).send('Internal Server Error');
  }
});

router.post('/create', isAuthenticated, createIssue);
router.post('/admin/resolve', isAuthenticated, isAdmin, resolveIssueAdmin);
router.get('/total', isAuthenticated, getTotalIssues);
router.get('/user', isAuthenticated, async (req, res) => {
  try {
    const issues = await getUserIssues(req.session.user.login);
    res.send(issues);
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).send('Internal Server Error');
  }
});
router.get('/', isAuthenticated, renderIssuesPage);

module.exports = router;
