const moment = require('moment');
var db = require('./conn.js');
const uuid = require('uuidv4');
var generator = require('generate-password');

const gl_manager = 'Department Manager/HR';

module.exports = {
    addUser: (req, res) => {

        let usr_email = req.body.email;
        let usr_pass = req.body.pass;
        let usr_div = req.body.div;
        let usr_created = moment().format();

        let query_find = "select * from users WHERE email = '" + usr_email + "'";

        db.query(query_find, (err, result) => {
            if (err) throw err;

            if (result.length > 0) {
                console.log('Username already exists');
                res.send('exists');
            } else {
                let query_insert = "INSERT INTO `users` (email, password, division, created_at, status) VALUES ('" +
                usr_email + "', '" + usr_pass + "', '" + usr_div + "', '" + usr_created + "','active')";
                db.query(query_insert, (err, result) => {
                  if (err) throw err;

                  db.query("insert into alerts (id,title,content,updated_at,type,status) values ('" + uuid() + "','New User Sign Up','User with email " + usr_email + " has signed up','" + moment().format("YYYY-MM-DD HH:mm:ss") + "','admin','unread')", (err, result) => {
                    if (err) throw err;

                    res.send('added');
                  });
                });
            }
        });
    },
    getsurveys: (req, res) => {
      let usr = req.body.userid;
      let q = "select division from users where email = '" + usr + "'";

      db.query(q, (err, result) => {
        if (err) throw err;

        if (result[0].division == gl_manager) {
          var q2 = 'SELECT * FROM survey_master_manager order by id asc';
        } else {
          var q2 = 'SELECT * FROM survey_master order by id asc';
        }

        db.query(q2, (err, result) => {
          if (err) throw err;

            if (result.length > 0) {
                console.log('Getting Survey Questions');
                res.send(result);
            } else {
              console.log('No Survey Questions Found');
              res.send('none');
            }
        });
      });
    },
    insertsurveys: (req, res) => {

      surveys(req.body).then(function(){
        res.sendStatus(200);
      })
      .catch((err) => { throw err; });

    },
    getavghapp: (req, res) => {

      let usr = req.body.userid;
      var final = {};

      let q = "select round(avg(answer),0) as avghapp from survey where userid = '" + usr + "'";
      let qTot = "select count(distinct formid) as tot from survey where userid = '" + usr + "'";

      getavg(q).then(function(avg){
        gettot(qTot).then(function(tot){
          res.send({
            avghapp: avg,
            tot: tot
          })
        });
      });
    },
    getallsurveys: (req, res) => {

      let final = [];
      let itemsProcessed = 0;
      let usr = req.body.userid;
      let q = "call getallsurvey('" + usr + "')";

      getallsurvey(q).then(function(results){
        results.forEach(function(element) {
          itemsProcessed++;
          getsurveydetails(element, usr).then(function(r){
            final.push(r);

            if(itemsProcessed === final.length) {
              res.send(final);
            }
          });
        });
      });
    },
    updateuserques: (req, res) => {
      let usr = req.body.userid;
      let q = "UPDATE users SET home = '" + req.body.home + "',spouse = '" + req.body.spouse + "',anniv = '" + req.body.anniv + "',firstchild = '" + req.body.firstchild + "',secondchild = '" + req.body.secondchild + "',drink = '" + req.body.drink +  "',food = '" + req.body.food +  "',rest = '" + req.body.rest +  "',store = '" + req.body.store +  "',team = '" + req.body.team +  "',candy = '" + req.body.candy  + "',starbucks = '" + req.body.starbucks + "',college = '" + req.body.college + "' where email = '" + usr + "'";

      db.query(q, (err, result) => {
        if (err) throw err;

          res.sendStatus(200);
      });
    },
    buildChart: (req, res) => {
      let usr = req.body.userid;
      var arr = [0,0,0,0,0];

      let q = "select answer, ROUND((tot/total*100),0) as tot from (select answer, count(answer) as tot, (select count(*) from survey where userid = '" + usr + "') as total from survey where userid = '" + usr + "' group by answer) a";

      db.query(q, (err, result) => {
        if (err) throw err;


        result.map(function(s) {
          arr[s.answer-1] = s.tot;
        });

        res.send(arr);
      });

    },
    getavghapp_admin: (req, res) => {

      let roletype = req.body.roletype;

      var final = {};

      let q = "select round(avg(answer),0) as avghapp from survey inner join users u on u.email = survey.userid where '' = ''";
      let qTot = "select count(distinct userid) as tot from survey inner join users u on u.email = survey.userid where '' = ''";

      if (roletype == 'manager') {
        q = "select round(avg(answer),0) as avghapp from survey inner join users u on u.email = survey.userid where u.division = '" + gl_manager + "'";
        qTot = "select count(distinct userid) as tot from survey inner join users u on u.email = survey.userid where u.division = '" + gl_manager + "'";
      }

      if (roletype == 'user') {
        q = "select round(avg(answer),0) as avghapp from survey inner join users u on u.email = survey.userid where u.division != '" + gl_manager + "'";
        qTot = "select count(distinct userid) as tot from survey inner join users u on u.email = survey.userid where u.division != '" + gl_manager + "'";
      }

      getavg(q).then(function(avg){
        gettot(qTot).then(function(tot){
          res.send({
            avghapp: avg,
            tot: tot
          })
        });
      });
    },
    buildChart_admin: (req, res) => {

      let roletype = req.body.roletype;

      var arr = [0,0,0,0,0];

      let q = "call totGraph()";

      if (roletype == 'manager') {
        q = "call totGraphMan('" + gl_manager + "')";
      }

      if (roletype == 'user') {
        q = "call totGraphUsr('" + gl_manager + "')";
      }

      db.query(q, (err, result) => {
        if (err) throw err;


        result[0].map(function(s) {
          arr[s.answer-1] = s.tot;
        });

        res.send(arr);
      });

    },
    getallsurveys_admin: (req, res) => {
      let roletype = req.body.roletype;

      let final = [];
      let itemsProcessed = 0;

      let q = "call getallsurveyadmin()";

      if (roletype == 'manager') {
        q = "call getallsurveymanager('" + gl_manager + "')";
      }

      if (roletype == 'user') {
        q = "call getallsurveyuser('" + gl_manager + "')";
      }

      getallsurvey(q).then(function(results){
        results.forEach(function(element) {
          itemsProcessed++;
          getsurveydetails(element, 'all').then(function(r){
            final.push(r);

            if(itemsProcessed === final.length) {
              res.send(final);
            }
          });
        });
      });
    },
    sendNewSchedule: (req, res) => {
      let roletype = req.body.roletype;
      let day = parseInt(req.body.day);
      let time = req.body.time;

      if (time == 'week') {
        const today = moment().isoWeekday().startOf('day');

        if (today <= day) {
          var setdate = moment().isoWeekday(day).startOf('day');
        } else {
          var setdate = moment().add(1, 'weeks').isoWeekday(day).startOf('day');
        }

        var dbtime = setdate.toISOString().slice(0, 19).replace('T', ' ');
      }

      if (time == 'month') {
        var setdate = moment().add(1, 'months').isoWeekday(day).startOf('day');

        var dbtime = setdate.toISOString().slice(0, 19).replace('T', ' ');
      }

      if (time == 'bi-week') {
        var setdate = moment().add(2, 'weeks').isoWeekday(day).startOf('day');

        var dbtime = setdate.toISOString().slice(0, 19).replace('T', ' ');
      }

      if (time == 'ninty') {
        var setdate = moment().add(3, 'months').isoWeekday(day).startOf('day');

        var dbtime = setdate.toISOString().slice(0, 19).replace('T', ' ');
      }

      if (time == 'bi-yearly') {
        var setdate = moment().add(6, 'months').isoWeekday(day).startOf('day');

        var dbtime = setdate.toISOString().slice(0, 19).replace('T', ' ');
      }

      var q = "update scheduler set day = " + day + ", timeframe = '" + time + "', nextrun = '" + dbtime + "' where id = '" + roletype + "'";

      db.query(q, (err, result) => {
        if (err) throw err;

        res.sendStatus(200);
      });

    },
    getCurrentSurvey_admin: (req, res) => {

      let roletype = req.body.roletype;
      var obj = {};

      if (roletype == 'manager') {
        var q = "select * from survey_master_manager order by id asc";
        var q2 = "SELECT day,timeframe FROM scheduler where id = 'manager'";
      }

      if (roletype == 'user') {
        var q = "select * from survey_master order by id asc";
        var q2 = "SELECT day,timeframe FROM scheduler where id = 'user'";
      }

      db.query(q, (err, result) => {
        if (err) throw err;

        obj["items"] = result;

          db.query(q2, (err, data) => {
            if (err) throw err;

            obj["day"] = data[0].day;
            obj["timeframe"] = data[0].timeframe;

            res.send(obj);
          });
      });

    },
    getCurrentTest: (req, res) => {

      var obj = {};

      var q = "select * from test order by id asc";
      var q2 = "SELECT day,timeframe FROM scheduler where id = 'test'";

      db.query(q, (err, result) => {
        if (err) throw err;

        obj["items"] = result;

          db.query(q2, (err, data) => {
            if (err) throw err;

            obj["day"] = data[0].day;
            obj["timeframe"] = data[0].timeframe;

            res.send(obj);
          });
      });

    },
    sendNewSurvey: (req, res) => {
      var arr = req.body.arr;
      let roletype = req.body.roletype;

      var newformid = uuid();

      if (roletype == 'manager') {
        db.query("delete from survey_master_manager", (err, result) => {
          if (err) throw err;

          arr.map(function(a) {
            db.query("insert into survey_master_manager (id,question,formid) values (" + a.newid + ",'" + a.newquestion + "','" + newformid + "')", (err, result) => {
              if (err) throw err;
            });
          });

          res.sendStatus(200);

        });
      }

      if (roletype == 'user') {
        db.query("delete from survey_master", (err, result) => {
          if (err) throw err;

          arr.map(function(a) {
            db.query("insert into survey_master (id,question,formid) values (" + a.newid + ",'" + a.newquestion + "','" + newformid + "')", (err, result) => {
              if (err) throw err;
            });
          });

          res.sendStatus(200);

        });
      }

      if (roletype == 'test') {
        db.query("delete from test", (err, result) => {
          if (err) throw err;

          arr.map(function(a) {
            console.log(a);
            db.query("insert into test (id,question,formid) values (" + a.newid + ",'" + a.newquestion + "','" + newformid + "')", (err, result) => {
              if (err) throw err;
            });
          });

          res.sendStatus(200);

        });
      }
    },
    setNewFormFriday: (req, res) => {
      let q = "update survey_master set formid = '" + uuid() + "'";

      db.query(q, (err, result) => {
        if (err) throw err;

        db.query("insert into alerts (id,title,content,updated_at,type,status) values ('" + uuid() + "','New Survey','A new survey is now available for you.','" + moment().format("YYYY-MM-DD HH:mm:ss") + "','user','unread')", (err, result) => {
          if (err) throw err;

          return;
        });
      });

    },
    setNewFormFridayMan: (req, res) => {
      let q = "update survey_master_manager set formid = '" + uuid() + "'";

      db.query(q, (err, result) => {
        if (err) throw err;

        db.query("insert into alerts (id,title,content,updated_at,type,status) values ('" + uuid() + "','New Survey','A new survey is now available for you.','" + moment().format("YYYY-MM-DD HH:mm:ss") + "','user','unread')", (err, result) => {
          if (err) throw err;

          return;
        });
      });

    },
    setNewFormFridayTest: (req, res) => {
      let q = "update test set formid = '" + uuid() + "'";

      db.query(q, (err, result) => {
        if (err) throw err;

        return;
      });

    },
    get_schedule: (req, res) => {
      let roletype = req.body.roletype;

      let q = "SELECT date_format(nextrun,'%m/%d/%y') as nextrun, id FROM scheduler where id = 'manager' or id = 'user'";

      db.query(q, (err, result) => {
        if (err) throw err;

        res.send(result);
      });
    },
    deletesurveygroup: (req, res) => {
      let formid = req.body.formid;

      let q = "insert into archived select * from survey where formid = '" + formid + "'";
      let q2 = "delete from survey where formid = '" + formid + "'";

      db.query(q, (err, result) => {
        if (err) throw err;

        db.query(q2, (err, result) => {
          if (err) throw err;

          res.sendStatus(200);
        });
      });
    },
    deletesurveygroupmulti: (req, res) => {
      let formid = req.body.formid;

      formid.map(function(item) {
        let q = "insert into archived select * from survey where formid = '" + item + "'";
        let q2 = "delete from survey where formid = '" + item + "'";

        db.query(q, (err, result) => {
          if (err) throw err;
          console.log('archived');
          db.query(q2, (err, result) => {
            if (err) throw err;
            console.log('deleted');
          });
        });

        res.sendStatus(200);
      });
    },
    getAllUsers: (req, res) => {
      return new Promise(function(resolve, reject) {
        let q = "select email from users where status = 'active' and (admin != 1 or admin is null) and email != 'justin@cdlconsultants.com' and division != '" + gl_manager + "'";

        db.query(q, (err, result) => {
          if (err) throw err;

          resolve(result);
        });
      });
    },
    getAllUsersMan: (req, res) => {
      return new Promise(function(resolve, reject) {
        let q = "select email from users where status = 'active' and (admin != 1 or admin is null) and email != 'justin@cdlconsultants.com' and division = '" + gl_manager + "'";

        db.query(q, (err, result) => {
          if (err) throw err;

          resolve(result);
        });
      });
    },
    deleteUser: (req, res) => {
      let usr = req.body.userid;
      let q = "update users set status = 'inactive' where email = '" + usr + "'";

      db.query(q, (err, result) => {
        if (err) throw err;

        res.sendStatus(200);
      });
    },
    makeadmin: (req, res) => {
      let usr = req.body.userid;
      let q = "update users set admin = 1 where email = '" + usr + "'";

      db.query(q, (err, result) => {
        if (err) throw err;

        res.sendStatus(200);
      });
    },
    getallsurveysbyform: (req, res) => {

      let roletype = req.body.roletype;
      let form = req.body.form;

      let final = [];
      let itemsProcessed = 0;

      let q = "call getsurveyByForm('" + form + "')";

      if (roletype == 'manager') {
        q = "call getsurveyByFormMan('" + form + "','" + gl_manager + "')";
      }

      if (roletype == 'user') {
        q = "call getsurveyByFormUsr('" + form + "','" + gl_manager + "')";
      }

      getallsurvey(q).then(function(results){
        results.forEach(function(element) {
          itemsProcessed++;
          var usr = element.user;
          getsurveydetails(element, usr).then(function(r){
            final.push(r);

            if(itemsProcessed === final.length) {
              res.send(final);
            }
          });
        });
      });
    },
    setNewPassWord: (req, res) => {
      db.query("select * from users where email = '" + req.body.email + "' and temp = '" + req.body.temp + "'", (err, result) => {
        if (err) throw err;

        if (result.length > 0) {
          db.query("update users set password = '" + req.body.pass + "' where email = '" + req.body.email + "' and temp = '" + req.body.temp + "'", (err, result) => {
            if (err) throw err;

            res.send('changed');
          });
        } else {
          res.send('no');
        }
      });
    },
    setUserSchedule: function() {
      var defer = Q.defer();

      db.query("select YEAR(nextrun) as yr,MONTH(nextrun) as mn,DAY(nextrun) as dy,HOUR(nextrun) as hr, day as senddaay, timeframe as sendtime from scheduler where id = 'user'", (err, result) => {
        if (err) throw err;
        var dateObj = {
          year: result[0].yr,
          month: result[0].mn-1,
          day: result[0].dy,
          hour: result[0].hr,
          senddaay: result[0].senddaay,
          sendtime: result[0].sendtime
        };

        defer.resolve(dateObj);
      });

      return defer.promise;
    },
    setManagerSchedule: function() {
      var defer = Q.defer();

      db.query("select YEAR(nextrun) as yr,MONTH(nextrun) as mn,DAY(nextrun) as dy,HOUR(nextrun) as hr, day as senddaay, timeframe as sendtime from scheduler where id = 'manager'", (err, result) => {
        if (err) throw err;
        var dateObj = {
          year: result[0].yr,
          month: result[0].mn-1,
          day: result[0].dy,
          hour: result[0].hr,
          senddaay: result[0].senddaay,
          sendtime: result[0].sendtime
        };

        defer.resolve(dateObj);
      });

      return defer.promise;
    },
    setTestSchedule: function() {
      var defer = Q.defer();

      db.query("select YEAR(nextrun) as yr,MONTH(nextrun) as mn,DAY(nextrun) as dy,HOUR(nextrun) as hr, day as senddaay, timeframe as sendtime from scheduler where id = 'test'", (err, result) => {
        if (err) throw err;
        var dateObj = {
          year: result[0].yr,
          month: result[0].mn-1,
          day: result[0].dy,
          hour: result[0].hr,
          senddaay: result[0].senddaay,
          sendtime: result[0].sendtime
        };

        defer.resolve(dateObj);
      });

      return defer.promise;
    },
    sendNewScheduleAlter: function(roletype,day,time) {

      if (!day || !time) {
        var getDayTime = "select day, timeframe from scheduler where id = '" + roletype + "'";

        db.query(getDayTime, (err, result) => {
          if (err) throw err;

          if (result.length > 0) {
            var getday = parseInt(result[0].day);
            var gettime = result[0].timeframe;

            if (gettime == 'week') {
              var setdate = moment().add(1, 'weeks').isoWeekday(getday).startOf('day');

              var dbtime = setdate.toISOString().slice(0, 19).replace('T', ' ');
            }

            if (gettime == 'month') {
              var setdate = moment().add(1, 'months').isoWeekday(getday).startOf('day');

              var dbtime = setdate.toISOString().slice(0, 19).replace('T', ' ');
            }

            if (gettime == 'bi-week') {
              var setdate = moment().add(2, 'weeks').isoWeekday(getday).startOf('day');

              var dbtime = setdate.toISOString().slice(0, 19).replace('T', ' ');
            }

            if (gettime == 'ninty') {
              var setdate = moment().add(3, 'months').isoWeekday(getday).startOf('day');

              var dbtime = setdate.toISOString().slice(0, 19).replace('T', ' ');
            }

            if (gettime == 'bi-yearly') {
              var setdate = moment().add(6, 'months').isoWeekday(getday).startOf('day');

              var dbtime = setdate.toISOString().slice(0, 19).replace('T', ' ');
            }

            var q = "update scheduler set nextrun = '" + dbtime + "', lastran = Now() where id = '" + roletype + "'";

            db.query(q, (err, result) => {
              if (err) throw err;

              return;
            });
          }
        });
      } else {
        day = parseInt(day);

        if (time == 'week') {
          var setdate = moment().add(1, 'weeks').isoWeekday(day).startOf('day');

          var dbtime = setdate.toISOString().slice(0, 19).replace('T', ' ');
        }

        if (time == 'month') {
          var setdate = moment().add(1, 'months').isoWeekday(day).startOf('day');

          var dbtime = setdate.toISOString().slice(0, 19).replace('T', ' ');
        }

        if (time == 'bi-week') {
          var setdate = moment().add(2, 'weeks').isoWeekday(day).startOf('day');

          var dbtime = setdate.toISOString().slice(0, 19).replace('T', ' ');
        }

        if (time == 'ninty') {
          var setdate = moment().add(3, 'months').isoWeekday(day).startOf('day');

          var dbtime = setdate.toISOString().slice(0, 19).replace('T', ' ');
        }

        if (time == 'bi-yearly') {
          var setdate = moment().add(6, 'months').isoWeekday(day).startOf('day');

          var dbtime = setdate.toISOString().slice(0, 19).replace('T', ' ');
        }

        console.log(dbtime);

        var q = "update scheduler set day = " + day + ", timeframe = '" + time + "', nextrun = '" + dbtime + "', lastran = Now() where id = '" + roletype + "'";

        db.query(q, (err, result) => {
          if (err) throw err;

          return;
        });
      }

    },
};

function surveys(arr) {

  var curdate =  moment().format("YYYY-MM-DD HH:mm:ss");
  var usr = '';

  return new Promise(function(resolve, reject) {
    arr.map(function(s) {

      usr = s.user;

      let query_insert_survey = "INSERT INTO survey (formid, number, question, answer, comment, userid, updated_at) VALUES ('" +
      s.formid + "', '" + s.questionnum + "', '" + s.question + "', '" + s.answer + "', '" + s.comments + "', '" + s.user + "', '" + curdate + "')";

      db.query(query_insert_survey, (err, result) => {
        if (err) throw err;

      });
    });

    db.query("insert into alerts (id,title,content,updated_at,type,status) values ('" + uuid() + "','New Survey Completed','A survey has been completed by " + usr + ".','" + moment().format("YYYY-MM-DD HH:mm:ss") + "','admin','unread')", (err, result) => {
      if (err) throw err;

    });

    resolve('res');
  });
}

function getavg(q) {
  return new Promise(function(resolve, reject) {
    db.query(q, (err, result) => {
      if (err) throw err;

        resolve(result[0].avghapp);
    });
  });
}

function gettot(q) {
  return new Promise(function(resolve, reject) {
    db.query(q, (err, result) => {
      if (err) throw err;

        resolve(result[0].tot);
    });
  });
}

function getallsurvey(q) {
  return new Promise(function(resolve, reject) {
    db.query(q, (err, result) => {
      if (err) throw err;

        resolve(result[0]);
    });
  });
}

function getsurveydetails(item, usr) {
  return new Promise(function(resolve, reject) {
      let q = "call getsurveydetail('" + usr + "','" + item.id + "')";

      db.query(q, (err, result) => {
        if (err) throw err;

          var questions = [];
          result[0].map(function(i) {
            questions.push({
               id: i.id,
               question: i.question,
               answer: i.answer,
               score: i.overall + '/5'
            })
          });
          resolve({
            id: uuid(),
            name: item.name,
            department: item.department,
            date: item.thisdate,
            overall: item.overall + '/' + item.total,
            questions: questions
          });
      });
    });
}

function getMondays(senddate, sendmon) {
    var d = new Date(),
        month = d.getMonth(),
        mondays = [];

    d.setDate(1);
    d.setHours(12);
    d.setMonth(d.getMonth() + sendmon);
    month = month + sendmon;

    // Get the first Monday in the month
    while (d.getDay() !== senddate) {
        d.setDate(d.getDate() + 1);
    }

    // Get all the other Mondays in the month
    while (d.getMonth() === month) {
        mondays.push(new Date(d.getTime()));
        d.setDate(d.getDate() + 7);
    }

    return mondays;
}
