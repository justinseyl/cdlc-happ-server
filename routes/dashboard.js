const express = require('express');
const { isAuthenticated, isOnboarded } = require('../middleware/auth');
const { isAdmin, isManager } = require('../middleware/roles');
const { stats_admin, chart_admin, total_happiness_admin, next_survey_admin, recent_surveys_admin, get_surveys, getUnreadBooks } = require('./admin');

const router = express.Router();

router.get('/', [isAuthenticated, isOnboarded], (req, res) => {
  if (['admin', 'superadmin'].includes(req.session.user.role)) {
    res.redirect('/admin');
  } else if (req.session.user.role === 'manager') {
    res.redirect('/manager');
  } else {
    res.redirect('/user');
  }
});

router.get('/user', [isAuthenticated, isOnboarded], async (req, res) => {
    try {
        const user_email = req.session.user.login;
        const chartData = await chart_admin(null, user_email);
        const { avgHappiness, totalSurveys } = await total_happiness_admin(null, user_email);
        const survey = await get_surveys(user_email, 'user');

        const data = {
            chartData: chartData,
            avgHappiness: avgHappiness || 3,
            totalSurveys: totalSurveys || 0,
            survey: survey,
        };

        res.render('user/user', { user: req.session.user, data: data });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/manager', [isAuthenticated, isOnboarded, isManager], async (req, res) => {
    try {
        const division = req.session.user.division;
        const totals = await stats_admin(division);
        const chartData = await chart_admin(division);
        const { avgHappiness, totalEmployees } = await total_happiness_admin(division);
        const newSurveys = await recent_surveys_admin(division);
        const survey = await get_surveys(req.session.user.login, 'manager');

        const books = [
            // Your book data
        ];

        const new_totals = {
            suggestions: totals.sugg || 0,
            issues: totals.issues || 0,
            survey: totals.totsurvey || 0,
            alert: totals.totneg || 0,
        };

        const data = {
            metrics: [
                { name: 'Suggestions', count: new_totals.suggestions, icon: 'suggestions-dark' },
                { name: 'Issues', count: new_totals.issues, icon: 'issues-dark' },
                { name: 'Surveys', count: new_totals.survey, icon: 'survey-dark' },
                { name: 'Attention', count: new_totals.alert, icon: 'alert-dark' }
            ],
            chartData: chartData,
            avgHappiness: avgHappiness,
            totalEmployees: totalEmployees,
            newSurveys: newSurveys,
            survey: survey,
            books: books
        };

        res.render('manager/manager', { user: req.session.user, data: data });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/admin', [isAuthenticated, isOnboarded, isAdmin], async (req, res) => {
    try {
        const division = req.query.division || null;        
        const totals = await stats_admin(division);
        const chartData = await chart_admin(division);
        const { avgHappiness, totalEmployees } = await total_happiness_admin(division);
        const nextSurvey = await next_survey_admin();
        const newSurveys = await recent_surveys_admin(division);

        const new_totals = {
            suggestions: totals.sugg || 0,
            issues: totals.issues || 0,
            survey: totals.totsurvey || 0,
            alert: totals.totneg || 0,
        };

        const data = {
            metrics: [
                { name: 'Suggestions', count: new_totals.suggestions, icon: 'suggestions-dark' },
                { name: 'Issues', count: new_totals.issues, icon: 'issues-dark' },
                { name: 'Surveys', count: new_totals.survey, icon: 'survey-dark' },
                { name: 'Needs Attention', count: new_totals.alert, icon: 'alert-dark' }
            ],
            chartData: chartData,
            avgHappiness: avgHappiness,
            totalEmployees: totalEmployees,
            nextSurvey: nextSurvey,
            newSurveys: newSurveys,
        };

        res.render('admin/admin', { user: req.session.user, data: data, division: division });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});


module.exports = router;
