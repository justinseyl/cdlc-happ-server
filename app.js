require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const moment = require('moment');

const departments = require('./constants/departments');
const { isAuthenticated } = require('./middleware/auth');
const fetchCurrentTimeLog = require('./middleware/fetchCurrentTimeLog');

const app = express();
const port = process.env.PORT || 3000;

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
}));

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  res.locals.departments = departments;
  res.locals.moment = moment;
  next();
});

// Apply fetchCurrentTimeLog globally
app.use(fetchCurrentTimeLog);

app.set('view engine', 'ejs');
app.set('views', [
  path.join(__dirname, 'views'),
  path.join(__dirname, 'views/partials')
]);

const pagesRoutes = require('./routes/pages');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const managerRoutes = require('./routes/manager');
const issueRoutes = require('./routes/issues');
const suggRoutes = require('./routes/suggestions');
const profileRoutes = require('./routes/profile');
const timelogRoutes = require('./routes/timelogs');
const employeeRoutes = require('./routes/employees');
const surveyRoutes = require('./routes/survey');
const bookRoutes = require('./routes/books');

app.use('/', pagesRoutes);
app.use('/auth', authRoutes);
app.use('/', dashboardRoutes);
app.use('/user', userRoutes);
app.use('/admin', adminRoutes);
app.use('/manager', managerRoutes);
app.use('/issues', issueRoutes);
app.use('/suggestions', suggRoutes);
app.use('/profile', profileRoutes);
app.use('/time', timelogRoutes);
app.use('/employees', employeeRoutes);
app.use('/surveys', surveyRoutes);
app.use('/books', bookRoutes);

app.listen(port, '0.0.0.0', () => console.log(`CDLC app listening on port ${port}!`));
