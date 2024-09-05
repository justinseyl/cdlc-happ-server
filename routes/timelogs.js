const express = require('express');
const moment = require('moment');
const { queryAsync } = require('../conn.js');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

// Utility function to format date
const getDateNow = () => moment().utc().format('YYYY-MM-DD HH:mm:ss');

// Start Time (Clock In)
router.get('/start-time', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.login;
    const clockInTime = getDateNow();

    const query = `
      INSERT INTO TimeLogs (user_id, clock_in) 
      VALUES ('${userId}', '${clockInTime}')
    `;
    await queryAsync(query);
    res.status(200).send('Clocked in successfully');
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// End Time (Clock Out)
router.get('/end-time', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.login;
    const clockOutTime = getDateNow();

    const query = `
      UPDATE TimeLogs 
      SET clock_out = '${clockOutTime}' 
      WHERE user_id = '${userId}' AND clock_out IS NULL
    `;
    await queryAsync(query);
    res.status(200).send('Clocked out successfully');
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Start Break
router.get('/start-break', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.login;
    const breakStartTime = getDateNow();

    const timeLogIdQuery = `
      SELECT id FROM TimeLogs WHERE user_id = '${userId}' AND clock_out IS NULL
    `;
    const timeLogIdResult = await queryAsync(timeLogIdQuery);
    const timeLogId = timeLogIdResult[0]?.id;

    if (!timeLogId) {
      res.status(400).send('No active time log found');
      return;
    }

    const query = `
      INSERT INTO Breaks (time_log_id, break_start) 
      VALUES ('${timeLogId}', '${breakStartTime}')
    `;
    await queryAsync(query);
    res.status(200).send('Break started successfully');
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// End Break
router.get('/end-break', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.login;
    const breakEndTime = getDateNow();

    const timeLogIdQuery = `
      SELECT id FROM TimeLogs WHERE user_id = '${userId}' AND clock_out IS NULL
    `;
    const timeLogIdResult = await queryAsync(timeLogIdQuery);
    const timeLogId = timeLogIdResult[0]?.id;

    if (!timeLogId) {
      res.status(400).send('No active time log found');
      return;
    }

    const query = `
      UPDATE Breaks 
      SET break_end = '${breakEndTime}' 
      WHERE time_log_id = '${timeLogId}' AND break_end IS NULL
    `;
    await queryAsync(query);
    res.status(200).send('Break ended successfully');
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.login;
    const division = req.session.user.division;

    // Calculate the start and end dates in UTC
    const startDate = moment.utc().startOf('isoWeek').format('YYYY-MM-DD');
    const endDate = moment.utc().endOf('isoWeek').format('YYYY-MM-DD');

    const timeLogsQuery = `CALL GetWeeklyTimeLogs('${userId}', '${division}')`; 
    const statsQuery = `CALL GetWeeklyTimeLogsStats('${userId}', '${division}')`; 

    const [timeLogsResult, statsResult] = await Promise.all([
      queryAsync(timeLogsQuery, [userId, division]),
      queryAsync(statsQuery, [userId, division])
    ]);

    const timeLogs = timeLogsResult[0];
    const stats = statsResult[0][0];

    res.render('user/time', {
      moment: moment,
      user: req.session.user,
      timeLogs: timeLogs,
      totalHours: stats.total_hours || 0,
      totalShifts: stats.total_shifts || 0,
      startDate: startDate,
      endDate: endDate
    });
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).send('Internal Server Error');
  }
});


module.exports = router;