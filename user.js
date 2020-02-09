const moment = require('moment');
var db = require('./conn.js');
const uuid = require('uuidv4');
var generator = require('generate-password');
const Q = require('q');

const gl_manager = 'Department Manager/HR';

module.exports = {
    login: (req, res) => {

        let usr_email = req.body.email;
        let usr_pass = req.body.pass;

        let query_find = "select * from users WHERE status = 'active' and email = '" + usr_email + "' and password = '" + usr_pass + "'";

        db.query(query_find, (err, result) => {
            if (err) throw err;

            if (result.length > 0) {
                console.log('Logging In');
                res.send({login:usr_email,admin:result[0].admin});
            } else {
              console.log('Username does not exists');
              res.send({new:''});
            }
        });
    },
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
    completesurvey: (req, res) => {

      let usr = req.body.userid;
      let q = "select count(*) as num from survey s inner join survey_master m on m.formid = s.formid where s.userid = '" + usr + "'";

      db.query(q, (err, result) => {
        if (err) throw err;

          if (result[0].num > 0) {
            res.send({survey:'completed'});
          } else {
            res.send({survey:''});
          }
      });
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
    getuser: (req, res) => {
      let usr = req.body.userid;
      let q = "select email,division, created_at, firstname, lastname, name, phone, dob, work, home, spouse, anniv, firstchild, secondchild, drink, food, rest, store, team, candy, starbucks, college,admin from users where email = '" + usr + "'";

      db.query(q, (err, result) => {
        if (err) throw err;

          Object.keys(result[0]).forEach(function(key) {
              if(result[0][key] === null) {
                  result[0][key] = '';
              }
          });
          res.send(result[0]);
      });
    },
    updateuser: (req, res) => {
      let usr = req.body.userid;
      let q = "UPDATE users SET firstname = '" + req.body.first + "',lastname = '" + req.body.last + "',name = '" + req.body.name + "',division = '" + req.body.department + "',phone = '" + req.body.phone + "',work = '" + req.body.work + "',dob = '" + req.body.dob + "' where email = '" + usr + "'";

      db.query(q, (err, result) => {
        if (err) throw err;

          res.sendStatus(200);
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
    sendSuggestion: (req, res) => {
      let usr = req.body.userid;
      let q = "insert into suggestions (id, title, userid, content, created) values ('" + uuid() + "','" + req.body.subject + "','" + usr + "','" + req.body.content + "','" + moment().format("YYYY-MM-DD HH:mm:ss") + "')";

      db.query(q, (err, result) => {
        if (err) throw err;

        db.query("insert into alerts (id,title,content,updated_at,type,status) values ('" + uuid() + "','New Suggestion Added','A new suggestion has been added by " + usr + ".','" + moment().format("YYYY-MM-DD HH:mm:ss") + "','admin','unread')", (err, result) => {
          if (err) throw err;

          res.sendStatus(200);
        });
      });
    },
    sendIssue: (req, res) => {
      let usr = req.body.userid;
      let q = "insert into issues (id, title, userid, content, created, status) values ('" + uuid() + "','" + req.body.subject + "','" + usr + "','" + req.body.content + "','" + moment().format("YYYY-MM-DD HH:mm:ss") + "','Open')";

      db.query(q, (err, result) => {
        if (err) throw err;

        db.query("insert into alerts (id,title,content,updated_at,type,status) values ('" + uuid() + "','New Issue Added','A new issue has been added by " + usr + ".','" + moment().format("YYYY-MM-DD HH:mm:ss") + "','admin','unread')", (err, result) => {
          if (err) throw err;

          res.sendStatus(200);
        });
      });
    },
    totalsugg: (req, res) => {
      let usr = req.body.userid;
      let q = "select count(id) as tot from suggestions where userid = '" + usr + "'";

      db.query(q, (err, result) => {
        if (err) throw err;

        res.send({
          tot: result[0].tot
        })
      });
    },
    totalissues: (req, res) => {
      let usr = req.body.userid;
      let q = "select count(id) as tot from issues where userid = '" + usr + "'";

      db.query(q, (err, result) => {
        if (err) throw err;

        res.send({
          tot: result[0].tot
        })
      });
    },
    allsugg: (req, res) => {
      let usr = req.body.userid;
      let q = "select id, title, userid, content, date_format(created,'%M %d, %Y') as created from suggestions where userid = '" + usr + "' limit 3";

      db.query(q, (err, result) => {
        if (err) throw err;

        res.send(result);
      });
    },
    allissues: (req, res) => {
      let usr = req.body.userid;
      let q = "select id, title, userid, content, date_format(created,'%M %d, %Y') as created, status from issues where userid = '" + usr + "' limit 3";

      db.query(q, (err, result) => {
        if (err) throw err;

        res.send(result);
      });
    },
    getUnreadBooks: (req, res) => {
      let usr = req.body.userid;

      getallunreadbooks(usr).then(function(results){
        res.send(results);
      });

    },
    getusercompletedbooks: (req, res) => {
      let usr = req.body.userid;

      getallreadbooks(usr).then(function(results){
        res.send(results);
      });

    },
    getUnreadBooksById: (req, res) => {
      let usr = req.body.userid;
      let id = req.body.id;

      getBookById(usr, id).then(function(results){
        res.send(results);
      });

    },
    getIncompleteBooks: (req, res) => {
      let usr = req.body.userid;

      getallincompbooks(usr).then(function(results){
        res.send(results);
      });

    },
    unreadtoread: (req, res) => {
      let usr = req.body.userid;
      let id = req.body.bookid;

      let q = "insert into userbooks (userid,bookid,status,created) values ('" + usr + "','" + id + "','read','" + moment().format("YYYY-MM-DD HH:mm:ss") + "')";

      db.query(q, (err, result) => {
        if (err) throw err;

        db.query("insert into alerts (id,title,content,updated_at,type,status) values ('" + uuid() + "','Book Read','User " + usr + " has moved a book from unread to read.','" + moment().format("YYYY-MM-DD HH:mm:ss") + "','admin','unread')", (err, result) => {
          if (err) throw err;

          res.sendStatus(200);
        });
      });

    },
    readtounread: (req, res) => {
      let usr = req.body.userid;
      let id = req.body.bookid;

      let q = "delete from userbooks where userid = '" + usr + "' and bookid = '" + id + "'";

      db.query(q, (err, result) => {
        if (err) throw err;

        db.query("insert into alerts (id,title,content,updated_at,type,status) values ('" + uuid() + "','Book Un-Read','User " + usr + " has moved a book from read to unread.','" + moment().format("YYYY-MM-DD HH:mm:ss") + "','admin','unread')", (err, result) => {
          if (err) throw err;

          res.sendStatus(200);
        });
      });

    },
    submitreview: (req, res) => {
      let usr = req.body.userid;
      let bookid = req.body.bookid;
      let rating = req.body.reviews;
      let review = req.body.content;
      let subject = req.body.subject;

      let q = "insert into book_reviews (id, bookid, rating, review, userid, created, title) values ('" + uuid() + "','" + bookid + "','" + rating + "','" + review + "','" + usr + "','" + moment().format("YYYY-MM-DD HH:mm:ss") + "','" + subject + "')";

      db.query(q, (err, result) => {
        if (err) throw err;

        db.query("insert into alerts (id,title,content,updated_at,type,status) values ('" + uuid() + "','New Book Review','User " + usr + " has reviewed a book.','" + moment().format("YYYY-MM-DD HH:mm:ss") + "','admin','unread')", (err, result) => {
          if (err) throw err;

          db.query("insert into userbooks (userid,bookid,status,created) values ('" + usr + "','" + bookid + "','read','" + moment().format("YYYY-MM-DD HH:mm:ss") + "')", (err, result) => {
            if (err) throw err;

            res.sendStatus(200);
          });
        });
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
    gettotals_admin: (req, res) => {
      let roletype = req.body.roletype;

      let q = "select (select count(*) from suggestions inner join users u on u.email = suggestions.userid where '' = '' ) as sugg,(select count(*) from issues inner join users u on u.email = issues.userid where '' = '') as issues,(select count(distinct concat(formid,userid)) from survey inner join users u on u.email = survey.userid where '' = '') as totsurvey,(select coalesce(sum(tot),0) from (select case when (sum(answer)/(count(distinct question)*5)) <= 0.2 then 1 else 0 end as tot from survey s1 inner join users u on u.email = s1.userid where '' = '' group by formid,userid)a) as totneg";

      if (roletype == 'manager') {
        q = "select (select count(*) from suggestions inner join users u on u.email = suggestions.userid where u.division = '" + gl_manager + "') as sugg,(select count(*) from issues inner join users u on u.email = issues.userid where u.division = '" + gl_manager + "') as issues,(select count(distinct concat(formid,userid)) from survey inner join users u on u.email = survey.userid where u.division = '" + gl_manager + "') as totsurvey,(select coalesce(sum(tot),0) from (select case when (sum(answer)/(count(distinct question)*5)) <= 0.2 then 1 else 0 end as tot from survey s1 inner join users u on u.email = s1.userid where u.division = '" + gl_manager + "' group by formid,userid)a) as totneg";
      }

      if (roletype == 'user') {
        q = "select (select count(*) from suggestions inner join users u on u.email = suggestions.userid where u.division != '" + gl_manager + "') as sugg,(select count(*) from issues inner join users u on u.email = issues.userid where u.division != '" + gl_manager + "') as issues,(select count(distinct concat(formid,userid)) from survey inner join users u on u.email = survey.userid where u.division != '" + gl_manager + "') as totsurvey,(select coalesce(sum(tot),0) from (select case when (sum(answer)/(count(distinct question)*5)) <= 0.2 then 1 else 0 end as tot from survey s1 inner join users u on u.email = s1.userid where u.division != '" + gl_manager + "' group by formid,userid)a) as totneg";
      }

      db.query(q, (err, result) => {
        if (err) throw err;

        res.send(result[0]);
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
    allsugg_admin: (req, res) => {
      let q = "select s.id,s.title,u.name,s.userid,s.content,date_format(s.created,'%m/%d/%Y') as created from suggestions s inner join users u on u.email = s.userid";

      db.query(q, (err, result) => {
        if (err) throw err;

        res.send(result);
      });
    },
    allissues_admin: (req, res) => {
      let q = "select s.id,s.title,u.name,s.status,s.userid,s.content,date_format(s.created,'%m/%d/%Y') as created from issues s inner join users u on u.email = s.userid";

      db.query(q, (err, result) => {
        if (err) throw err;

        res.send(result);
      });
    },
    reslveIssue_admin: (req, res) => {
      let id = req.body.id;
      let q = "update issues set status = 'Closed' where id = '" + id + "'";

      db.query(q, (err, result) => {
        if (err) throw err;

        res.sendStatus(200);
      });
    },
    getEmployees_admin: (req, res) => {

      let roletype = req.body.roletype;

      let q = "select email,name,division,(select date_format(max(updated_at),'%m/%d/%Y') from survey where userid = email) as lastsurvey,(select sum(answer) from survey where userid = email) as comp,(select (count(*)*5) from survey where userid = email) as tot from users where status = 'active'";

      if (roletype == 'manager') {
        q = "select email,name,division,(select date_format(max(updated_at),'%m/%d/%Y') from survey where userid = email) as lastsurvey,(select sum(answer) from survey where userid = email) as comp,(select (count(*)*5) from survey where userid = email) as tot from users where status = 'active' and division = '" + gl_manager + "'";
      }

      if (roletype == 'user') {
        q = "select email,name,division,(select date_format(max(updated_at),'%m/%d/%Y') from survey where userid = email) as lastsurvey,(select sum(answer) from survey where userid = email) as comp,(select (count(*)*5) from survey where userid = email) as tot from users where status = 'active' and division != '" + gl_manager + "'";
      }

      db.query(q, (err, result) => {
        if (err) throw err;

        res.send(result);
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
    getallsurveysgrouped_admin: (req, res) => {
      let roletype = req.body.roletype;

      var final = {};

      let q = "select formid,sum(terr) as terr,count(distinct userid) as totusr,start,Round((sum(overall)/count(*)) ,0) as overall,tot from (select s1.formid, s1.userid, date_format(min(s1.updated_at),'%M %d, %Y') as start, sum(s1.answer) as overall, count(distinct s1.question)*5 as tot, case when (sum(s1.answer)/(count(distinct s1.question)*5)) <= 0.4 then 1 else 0 end as terr from survey s1 inner join users u on u.email = s1.userid group by s1.formid,s1.userid)a group by a.formid order by start asc";

      if (roletype == 'manager') {
        q = "select formid,sum(terr) as terr,count(distinct userid) as totusr,start,Round((sum(overall)/count(*)) ,0) as overall,tot from (select s1.formid, s1.userid, date_format(min(s1.updated_at),'%M %d, %Y') as start, sum(s1.answer) as overall, count(distinct s1.question)*5 as tot, case when (sum(s1.answer)/(count(distinct s1.question)*5)) <= 0.4 then 1 else 0 end as terr from survey s1 inner join users u on u.email = s1.userid where u.division = '" + gl_manager + "' group by s1.formid,s1.userid)a group by a.formid order by start asc";
      }

      if (roletype == 'user') {
        q = "select formid,sum(terr) as terr,count(distinct userid) as totusr,start,Round((sum(overall)/count(*)) ,0) as overall,tot from (select s1.formid, s1.userid, date_format(min(s1.updated_at),'%M %d, %Y') as start, sum(s1.answer) as overall, count(distinct s1.question)*5 as tot, case when (sum(s1.answer)/(count(distinct s1.question)*5)) <= 0.4 then 1 else 0 end as terr from survey s1 inner join users u on u.email = s1.userid where u.division != '" + gl_manager + "' group by s1.formid,s1.userid)a group by a.formid order by start asc";
      }

      db.query(q, (err, result) => {
        if (err) throw err;

        res.send(result);
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
    getBooks_admin: (req, res) => {
      let q = "select b.id, b.name,b.author,b.description,b.image, coalesce( round((sum(w.rating)/count(w.rating)),1) ,0) as rating, count(w.rating) as reviews from books b left join book_reviews w on w.bookid = b.id where b.status = 'active' group by b.id";

      db.query(q, (err, result) => {
        if (err) throw err;

        res.send(result);
      });
    },
    editBookSave: (req, res) => {

      var newdesc = req.body.desc.replace(/"/g, "'").replace(/(\r\n|\n|\r)/gm, "").replace(/'/g, '\\\'');
      let q = "update books set name = '" + req.body.title + "', author = '" + req.body.auth + "', description = '" + newdesc + "', image = '" + req.body.img + "' where id = '" + req.body.id + "'";

      db.query(q, (err, result) => {
        if (err) throw err;

        res.sendStatus(200);
      });
    },
    deleteBook: (req, res) => {

      let q = "update books set status = 'inactive' where id = '" + req.body.id + "'";

      db.query(q, (err, result) => {
        if (err) throw err;

        res.sendStatus(200);
      });
    },
    addNewBook: (req, res) => {
      let newdesc = req.body.desc.replace(/'/g, '');

      let q = "insert into books (id,name,author,description,image,status) values ('" + uuid() + "','" + req.body.title + "','" + req.body.auth + "','" + newdesc + "','" + req.body.img + "','active')";

      db.query(q, (err, result) => {
        if (err) throw err;

        db.query("insert into alerts (id,title,content,updated_at,type,status) values ('" + uuid() + "','New Book Added','A new book is now available for you.','" + moment().format("YYYY-MM-DD HH:mm:ss") + "','user','unread')", (err, result) => {
          if (err) throw err;

          res.sendStatus(200);
        });
      });
    },
    getalerts: (req, res) => {

      let q = "select title,content,datediff(Now(),updated_at) as diff from alerts where type = 'user' order by diff asc";

      db.query(q, (err, result) => {
        if (err) throw err;

        res.send(result);
      });
    },
    getalerts_admin: (req, res) => {

      let q = "select title,content,datediff(Now(),updated_at) as diff from alerts where type = 'admin' order by diff asc";

      db.query(q, (err, result) => {
        if (err) throw err;

        res.send(result);
      });
    },
    getTempPass: (email) => {
      return new Promise(function(resolve, reject) {
        var password = generator.generate({
            length: 10,
            numbers: true
        });

        db.query("update users set temp = '" + password + "' where email = '" + email + "' limit 1", (err, result) => {
          if (err) throw err;

          resolve(password);
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
console.log(s);
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

function getallunreadbooks(usr, id) {
  return new Promise(function(resolve, reject) {
    let q = "select b.id, b.name,b.author,b.description,b.image, coalesce( round((sum(w.rating)/count(w.rating)),1) ,0) as rating, count(w.rating) as reviews from books b left join userbooks u on u.bookid = b.id left join book_reviews w on w.bookid = b.id where b.status = 'active' and (u.userid is null or u.userid = '" + usr + "') group by b.id";

    db.query(q, (err, result) => {
      if (err) throw err;

      resolve(result);
    });
  });
}

function getallreadbooks(usr) {
  return new Promise(function(resolve, reject) {
    let q = "select b.id, b.name,b.author,b.description,b.image, coalesce( round((sum(w.rating)/count(w.rating)),1) ,0) as rating, count(w.rating) as reviews,date_format(u.created,'%m/%d/%Y') as created from books b left join userbooks u on u.bookid = b.id left join book_reviews w on w.bookid = b.id where b.status = 'active' and u.userid = '" + usr + "' and u.status = 'read' group by b.id";

    db.query(q, (err, result) => {
      if (err) throw err;

      resolve(result);
    });
  });
}

function getBookById(usr, id) {
  return new Promise(function(resolve, reject) {
    let q = "select b.name,b.author,b.description,b.image,r.title as review_title,r.review as review_content,date_format(r.created,'%m/%d/%Y') as review_date,r.rating as review_rating,u.name as user_name from books b left join book_reviews r on r.bookid = b.id left join users u on u.email = r.userid where b.status = 'active' and b.id = '" + id + "'";

    db.query(q, (err, result) => {
      if (err) throw err;

      resolve(result);
    });
  });
}

function getallincompbooks(usr) {
  return new Promise(function(resolve, reject) {
    let q = "select b.id, b.name,b.author,b.description,b.image, coalesce( round((sum(w.rating)/count(w.rating)),1) ,0) as rating, count(w.rating) as reviews,date_format(u.created,'%m/%d/%Y') as created from books b left join userbooks u on u.bookid = b.id left join book_reviews w on w.bookid = b.id where b.status = 'active' and (u.userid is null or u.userid != '" + usr + "') group by b.id";

    db.query(q, (err, result) => {
      if (err) throw err;

      resolve(result);
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
