const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const cors = require('cors');
const schedule = require('node-schedule');
var nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
  host: 'a2plcpnl0602.prod.iad2.secureserver.net',
        port: 465,
        secure: true, // true for 465, false for other ports
        auth: {
          user: 'automated@cdlchappiness.com',
          pass: '38{jr7E{4NJ{'
        }
});

var port = process.env.PORT || 8080;

const {addUser} = require('./user');
const {login} = require('./user');
const {getsurveys} = require('./user');
const {insertsurveys} = require('./user');
const {completesurvey} = require('./user');
const {getavghapp} = require('./user');
const {getallsurveys} = require('./user');
const {getuser} = require('./user');
const {updateuser} = require('./user');
const {updateuserques} = require('./user');
const {sendSuggestion} = require('./user');
const {sendIssue} = require('./user');
const {totalsugg} = require('./user');
const {totalissues} = require('./user');
const {allsugg} = require('./user');
const {allissues} = require('./user');
const {getUnreadBooks} = require('./user');
const {getusercompletedbooks} = require('./user');
const {getUnreadBooksById} = require('./user');
const {getIncompleteBooks} = require('./user');
const {unreadtoread} = require('./user');
const {readtounread} = require('./user');
const {submitreview} = require('./user');
const {buildChart} = require('./user');
const {getavghapp_admin} = require('./user');
const {buildChart_admin} = require('./user');
const {getallsurveys_admin} = require('./user');
const {gettotals_admin} = require('./user');
const {getCurrentSurvey_admin} = require('./user');
const {sendNewSurvey} = require('./user');
const {setNewFormFriday} = require('./user');
const {setNewFormFridayMan} = require('./user');
const {setNewFormFridayTest} = require('./user');
const {getAllUsers} = require('./user');
const {getAllUsersMan} = require('./user');
const {allsugg_admin} = require('./user');
const {allissues_admin} = require('./user');
const {reslveIssue_admin} = require('./user');
const {getEmployees_admin} = require('./user');
const {deleteUser} = require('./user');
const {getallsurveysgrouped_admin} = require('./user');
const {getallsurveysbyform} = require('./user');
const {getBooks_admin} = require('./user');
const {editBookSave} = require('./user');
const {deleteBook} = require('./user');
const {addNewBook} = require('./user');
const {getalerts} = require('./user');
const {getalerts_admin} = require('./user');
const {makeadmin} = require('./user');
const {getTempPass} = require('./user');
const {setNewPassWord} = require('./user');
const {get_schedule} = require('./user');
const {sendNewSchedule} = require('./user');
const {setManagerSchedule} = require('./user');
const {setTestSchedule} = require('./user');
const {getCurrentTest} = require('./user');
const {deletesurveygroup} = require('./user');
const {deletesurveygroupmulti} = require('./user');
const {setUserSchedule} = require('./user');
const {sendNewScheduleAlter} = require('./user');

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/login', login);
app.post('/signup', addUser);
app.post('/getsurveys', getsurveys);
app.post('/insertSurvey', insertsurveys);
app.post('/completed_survey', completesurvey);
app.post('/getavghapp', getavghapp);
app.post('/getallsurveys', getallsurveys);
app.post('/getuser', getuser);
app.post('/updateuser', updateuser);
app.post('/updateuserques', updateuserques);
app.post('/sendSuggestion', sendSuggestion);
app.post('/sendIssue', sendIssue);
app.post('/totalsugg', totalsugg);
app.post('/totalissues', totalissues);
app.post('/allsugg', allsugg);
app.post('/allissues', allissues);
app.post('/getUnreadBooks', getUnreadBooks);
app.post('/getusercompletedbooks', getusercompletedbooks);
app.post('/getUnreadBooksById', getUnreadBooksById);
app.post('/getIncompleteBooks', getIncompleteBooks);
app.post('/unreadtoread', unreadtoread);
app.post('/readtounread', readtounread);
app.post('/submitreview', submitreview);
app.post('/buildChart', buildChart);
app.post('/getavghapp_admin', getavghapp_admin);
app.post('/buildChart_admin', buildChart_admin);
app.post('/getallsurveys_admin', getallsurveys_admin);
app.post('/gettotals_admin', gettotals_admin);
app.post('/getCurrentSurvey_admin', getCurrentSurvey_admin);
app.post('/sendNewSurvey', sendNewSurvey);
app.get('/allsugg_admin', allsugg_admin);
app.get('/allissues_admin', allissues_admin);
app.post('/reslveIssue_admin', reslveIssue_admin);
app.post('/getEmployees_admin', getEmployees_admin);
app.post('/deleteUser', deleteUser);
app.post('/getallsurveysgrouped_admin', getallsurveysgrouped_admin);
app.post('/getallsurveysbyform', getallsurveysbyform);
app.get('/getBooks_admin', getBooks_admin);
app.post('/editBookSave', editBookSave);
app.post('/deleteBook', deleteBook);
app.post('/addNewBook', addNewBook);
app.get('/getalerts', getalerts);
app.get('/getalerts_admin', getalerts_admin);
app.post('/makeadmin', makeadmin);
app.post('/forgotPass', forgotPass);
app.post('/setNewPassWord', setNewPassWord);
app.get('/get_schedule', get_schedule);
app.post('/sendNewSchedule', sendNewSchedule);
app.get('/getCurrentTest', getCurrentTest);
app.post('/deletesurveygroup', deletesurveygroup);
app.post('/deletesurveygroupmulti', deletesurveygroupmulti);

//UPDATER
var jupdater = schedule.scheduleJob('updater', '*/30 * * * *', function(){

  setUserSchedule().then(function(datObj){
    var dateU = new Date(datObj.year,datObj.month,datObj.day,datObj.hour,0,0);

    schedule.scheduledJobs['userSchedule'].reschedule(dateU);
    schedule.scheduledJobs['userScheduleAdmin'].reschedule(dateU);

    console.log('Updating User Schedule: ' + dateU);

    setManagerSchedule().then(function(datObj){
      var dateM = new Date(datObj.year,datObj.month,datObj.day,datObj.hour,0,0);

      schedule.scheduledJobs['manSchedule'].reschedule(dateM);
      schedule.scheduledJobs['manScheduleAdmin'].reschedule(dateM);

      console.log('Updating Manager Schedule: ' + dateM);

      setTestSchedule().then(function(datObj){

        var date = new Date(datObj.year,datObj.month,datObj.day,datObj.hour,0,0);

        schedule.scheduledJobs['testSchedule'].reschedule(date);

        console.log('Updating Test Schedule: ' + date);
      });
    });
  });

});

//ADMIN MANAGER
var j6 = schedule.scheduleJob('manScheduleAdmin', '2019-01-01T00:00:00.001Z', function(){

  var mailOptionsMain = {
    from: 'automated@cdlchappiness.com',
    to: 'justin@cdlconsultants.com',
    subject: 'Weekly CDLC Manager Happiness Surveys',
    text: 'Weekly CDLC Manager Happiness Surveys Have Been Successfully Sent'
  };

  transporter.sendMail(mailOptionsMain, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
});

//MANAGER SCHEDULER
var j7 = schedule.scheduleJob('manSchedule', '2019-01-01T00:00:00.001Z', function(){

  setNewFormFridayMan();
  sendNewScheduleAlter('manager');

  getAllUsersMan().then(function(results){
    results.forEach(function(e) {
      var mailOptions = {
        from: 'automated@cdlchappiness.com',
        to: e.email,
        subject: 'Your Weekly CDLC Happiness Survey Is Now Available!',
        text: 'http://cdlchappiness.com/html/home.html'
      };

      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });
    });
  });
});

//ADMIN USER
var j3 = schedule.scheduleJob('userScheduleAdmin', '2019-01-01T00:00:00.001Z', function(){

  var mailOptionsMain = {
    from: 'automated@cdlchappiness.com',
    to: 'justin@cdlconsultants.com',
    subject: 'Weekly CDLC Employee Happiness Surveys',
    text: 'Weekly CDLC Employee Happiness Surveys Have Been Successfully Sent!'
  };

  transporter.sendMail(mailOptionsMain, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
});

//USER SCHEDULER
var j1 = schedule.scheduleJob('userSchedule', '2019-01-01T00:00:00.001Z', function(){

  setNewFormFriday();
  sendNewScheduleAlter('user');

  getAllUsers().then(function(results){
    results.forEach(function(e) {
      var mailOptions = {
        from: 'automated@cdlchappiness.com',
        to: e.email,
        subject: 'Your Weekly CDLC Happiness Survey Is Now Available!',
        text: 'http://cdlchappiness.com/html/home.html'
      };

      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });
    });
  });
});

//TEST SCHEDULER
var j7 = schedule.scheduleJob('testSchedule', '2019-01-01T00:00:00.001Z', function(){

  setNewFormFridayTest();
  sendNewScheduleAlter('test');

  console.log('New Test');
});

function forgotPass(req, res) {
  var usr_email = req.body.email;

  getTempPass(usr_email).then(function(results){
    var mailOptionsRecover = {
      from: 'automated@cdlchappiness.com',
      to: usr_email,
      subject: 'Your CDCL Happinness Password Recovery',
      text: 'Your Temporary Password is: ' + results +
      '\nhttp://cdlchappiness.com/html/recovery.html'
    };

    transporter.sendMail(mailOptionsRecover, function(error, info){
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });
  });
}

app.listen(port,'0.0.0.0', () => console.log(`CDLC app listening on port ${port}!`))
