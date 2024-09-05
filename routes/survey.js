const express = require('express');
const router = express.Router();
const { queryAsync } = require('../conn.js');
const { isAuthenticated, isOnboarded } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roles');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

const getSurveys = async (userId, division) => {
    try {
        let surveyQuery = 'SELECT * FROM survey_master ORDER BY id ASC';
        if (division === 'manager') {
            surveyQuery = 'SELECT * FROM survey_master_manager ORDER BY id ASC';
        }

        const surveysResult = await queryAsync(surveyQuery);
        return surveysResult;
    } catch (err) {
        console.error('SQL error:', err);
        throw err;
    }
};

const getAllSurveysGroupedAdmin = async (role, userId, division) => {
    const baseQuery = `
        SELECT 
            formid,
            SUM(terr) AS terr,
            COUNT(DISTINCT userid) AS totusr,
            DATE_FORMAT(MIN(updated_at), '%M %d, %Y') AS start,
            ROUND(SUM(overall) / COUNT(*), 0) AS overall,
            tot
        FROM (
            SELECT 
                s1.formid, 
                s1.userid, 
                s1.updated_at, 
                SUM(s1.answer) AS overall, 
                COUNT(DISTINCT s1.question) * 5 AS tot, 
                CASE 
                    WHEN (SUM(s1.answer) / (COUNT(DISTINCT s1.question) * 5)) <= 0.4 THEN 1 
                    ELSE 0 
                END AS terr 
            FROM 
                survey s1 
            INNER JOIN 
                users u 
            ON 
                u.email = s1.userid
    `;

    const endQuery = `
            GROUP BY 
                s1.formid, s1.userid
        ) a 
        GROUP BY 
            a.formid 
        ORDER BY 
            start ASC
    `;

    let query;

    switch (role) {
        case 'manager':
            query = `${baseQuery} WHERE u.division = '${division}' ${endQuery}`;
            break;
        case 'user':
            query = `${baseQuery} WHERE u.email = '${userId}' ${endQuery}`;
            break;
        default:
            query = `${baseQuery} ${endQuery}`;
            break;
    }

    try {
        const result = await queryAsync(query);
        return result;
    } catch (err) {
        console.error('SQL error:', err);
        throw err;
    }
};

const getFormDataForSurvey = async (surveyid, role, userId, division) => {
    const query = `CALL GetSurveyByFormAndRole('${surveyid}', '${role}', ${division}, '${userId}')`;
    try {
        const result = await queryAsync(query);
        return result[0];
    } catch (err) {
        console.error('SQL error:', err);
        throw err;
    }
};

const getFormDataForSurveyByUser = async (userId, surveyid, role, division) => {
    const query = `CALL GetSurveyDetailByUserAndForm('${userId}', '${surveyid}', '${role}', ${division})`;

    try {
        const result = await queryAsync(query);
        return result[0];
    } catch (err) {
        console.error('SQL error:', err);
        throw err;
    }
};

const insertSurveyResponses = async (arr) => {
    const curdate = moment().format("YYYY-MM-DD HH:mm:ss");
    let usr = '';

    for (const s of arr) {
        usr = s.user;

        const queryInsertSurvey = `
            INSERT INTO survey (formid, number, question, answer, comment, userid, updated_at)
            VALUES ('${s.formid}', '${s.questionnum}', '${s.question}', '${s.answer}', '${s.comments}', '${s.user}', '${curdate}')
        `;

        try {
            await queryAsync(queryInsertSurvey);
        } catch (err) {
            console.error('SQL error in insertSurveyResponses:', err);
            throw err;
        }
    }

    const alertQuery = `
        INSERT INTO alerts (id, title, content, updated_at, type, status)
        VALUES ('${uuidv4()}', 'New Survey Completed', 'A survey has been completed by ${usr}.', '${curdate}', 'admin', 'unread')
    `;

    try {
        await queryAsync(alertQuery);
    } catch (err) {
        console.error('SQL error in alertQuery:', err);
        throw err;
    }
};

const getSmileClass = (calc) => {
    if (calc >= 0.80) return "emoji-5";
    if (calc >= 0.60) return "emoji-4";
    if (calc >= 0.40) return "emoji-3";
    if (calc >= 0.20) return "emoji-2";
    return "emoji-1";
};

router.get('/', [isAuthenticated, isOnboarded], async (req, res) => {
    try {
        const { role, login: userId, division } = req.session.user;
        const surveys = await getAllSurveysGroupedAdmin(role, userId, division);
        surveys.forEach(survey => {
            const calc = (survey.overall / survey.tot).toFixed(2);
            survey.smileClass = getSmileClass(calc);
        });
        res.render('admin/survey', { user: req.session.user, surveys: surveys });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/:surveyid', [isAuthenticated, isOnboarded], async (req, res) => {
    try {
        const { surveyid } = req.params;
        const { role, login: userId, division } = req.session.user;
        const divisionParam = division ? `'${division}'` : 'NULL';
        const formData = await getFormDataForSurvey(surveyid, role, userId, divisionParam);
        console.log(formData)
        if (formData.length) {
            formData.forEach(survey => {
                const calc = (survey.overall / survey.total).toFixed(2);
                survey.smileClass = getSmileClass(calc);
            });
            res.render('admin/survey/id', { user: req.session.user, data: formData });
        } else {
            res.render('admin/survey/id', { user: req.session.user, data: [] });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

router.get('/:surveyid/:userid', [isAuthenticated, isOnboarded], async (req, res) => {
    try {
        const { surveyid, userid } = req.params;
        const { role, division } = req.session.user;
        const divisionParam = division ? `'${division}'` : 'NULL';
        const formData = await getFormDataForSurveyByUser(userid, surveyid, role, divisionParam);
        if (formData.length) {
            res.render('admin/survey/user', { user: req.session.user, data: formData, data_user: userid });
        } else {
            res.status(404).json({ success: false, message: 'No data found for the specified survey.' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

router.post('/new/questions', [isAuthenticated, isOnboarded], async (req, res) => {
    try {
        const { role, login: userId, division } = req.session.user;
        const surveys = await getSurveys(userId, division);
        console.log(surveys)

        if (surveys.length > 0) {
            console.log('Getting Survey Questions');
            res.json(surveys);
        } else {
            console.log('No Survey Questions Found');
            res.json([]);
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

router.post('/new/insert', [isAuthenticated, isOnboarded], async (req, res) => {
    try {
        await insertSurveyResponses(req.body);
        res.sendStatus(200);
    } catch (err) {
        console.error('Error in insertsurveys route:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

module.exports = router;
