const express = require('express');
const router = express.Router();
const { queryAsync } = require('../conn.js');

const {
    getavghapp_admin,
    buildChart_admin,
    getallsurveys_admin,
    getCurrentSurvey_admin,
    sendNewSurvey,
} = require('../user');

const stats_admin = async (division = null) => {
    const divisionParam = division ? `'${division}'` : 'NULL';
    const q = `CALL stats_admin(${divisionParam})`; 

    try {
        const result = await queryAsync(q);
        return result[0][0];
    } catch (err) {
        console.error('SQL error:', err);
        throw err;
    }
};

const chart_admin = async (division = null, user = null) => {
    const divisionParam = division ? `'${division}'` : 'NULL';
    const userParam = user ? `'${user}'` : 'NULL';
    const q = `CALL Get_Happiness_Chart(${divisionParam}, ${userParam})`; 

    try {
        const result = await queryAsync(q);
        const rows = result[0];

        const data = {
            day: [0, 0, 0, 0, 0],
            week: [0, 0, 0, 0, 0],
            month: [0, 0, 0, 0, 0],
            year: [0, 0, 0, 0, 0]
        };

        rows.forEach(row => {
            const period = row.period;
            const answer = row.answer - 1;
            const tot = row.tot;

            if (data[period] && answer >= 0 && answer < 5) {
                data[period][answer] = tot;
            } else {
                console.error(`Unexpected period or answer value: period=${period}, answer=${answer}`);
            }
        });

        return data;
    } catch (err) {
        throw err;
    }
};

const total_happiness_admin = async (division = null, user = null) => {
    const divisionParam = division ? `'${division}'` : 'NULL';
    const userParam = user ? `'${user}'` : 'NULL';
    const q = `CALL Get_Happiness_Stat(${divisionParam}, ${userParam})`; 

    try {
        const result = await queryAsync(q);
        const rows = result[0];

        return {
            avgHappiness: rows[0].avg_happiness,
            totalEmployees: rows[0].total_employees,
            totalSurveys: rows[0].total_surveys_taken
        };
    } catch (err) {
        throw err;
    }
};

const next_survey_admin = async () => {
    const qUser = "SELECT GREATEST(0, DATEDIFF(nextrun, NOW())) as nextrun FROM scheduler WHERE id = 'user'";
    const qManager = "SELECT GREATEST(0, DATEDIFF(nextrun, NOW())) as nextrun FROM scheduler WHERE id = 'manager'";

    try {
        const userResult = await queryAsync(qUser);
        const managerResult = await queryAsync(qManager);

        return {
            user: userResult[0].nextrun,
            manager: managerResult[0].nextrun,
        };
    } catch (err) {
        throw err;
    }
};

const recent_surveys_admin = async (division = null) => {
    const divisionParam = division ? `'${division}'` : 'NULL';
    const q = `CALL recent_surveys_admin(${divisionParam}, 5)`; 

    try {
        const result = await queryAsync(q);
        const rows = result[0];
        return rows.map(row => ({
            name: row.name,
            department: row.department,
            date: row.thisdate,
            score: row.score,
            emoji: row.average_happ
        }));
    } catch (err) {
        throw err;
    }
};

const get_surveys = async (email, type = null) => {
    const q = `CALL Get_Survey_Master('${email}', '${type}')`; 
    try {
        const result = await queryAsync(q);
        return result[0][0];
    } catch (err) {
        console.error('SQL error:', err);
        throw err;
    }
};

const getUnreadBooks = async (req, res) => {
        let usr = 'n.howell@pinnacledesignlab.com'
        let q = "select b.id, b.name,b.author,b.description,b.image, coalesce( round((sum(w.rating)/count(w.rating)),1) ,0) as rating, count(w.rating) as reviews from books b left join userbooks u on u.bookid = b.id left join book_reviews w on w.bookid = b.id where b.status = 'active' and (u.userid is null or u.userid = ?) group by b.id";
        const result = await queryAsync(q);
        return result[0];
    }

router.post('/getavghapp', getavghapp_admin);
router.post('/buildChart', buildChart_admin);
router.post('/getallsurveys', getallsurveys_admin);
router.post('/getCurrentSurvey', getCurrentSurvey_admin);
router.post('/sendNewSurvey', sendNewSurvey);

module.exports = router;
module.exports.stats_admin = stats_admin;
module.exports.chart_admin = chart_admin;
module.exports.total_happiness_admin = total_happiness_admin;
module.exports.next_survey_admin = next_survey_admin;
module.exports.recent_surveys_admin = recent_surveys_admin;
module.exports.get_surveys = get_surveys;
module.exports.getUnreadBooks = getUnreadBooks;

