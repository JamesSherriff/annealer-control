const dweetClient = require("node-dweetio");
const dweetio = new dweetClient();

const express = require('express')
const app = express()
const path = require('path')
const port = 3000

var fs = require('fs');
var hbs = require('express-handlebars');

var CronJob = require('cron').CronJob;
var annealerOpenJob;
var annealerCloseJob;

var Gpio = require('onoff').Gpio;
var forward = new Gpio(17, 'out');
var backward = new Gpio(27, 'out');
var status = "Idle";
var annealerScheduleOpen = {hours: "08", minutes: "00"}
var annealerScheduleClose = {hours: "11", minutes: "00"}

app.set('view engine', 'hbs');
app.set('views', __dirname + "/views");

if(fs.existsSync("config/schedule.json")) {
  annealerSchedule = require("./config/schedule.json");
  setAnnealerSchedule(annealerSchedule.openHours, annealerSchedule.openMinutes, annealerSchedule.closeHours, annealerSchedule.closeMinutes);
  console.log("Loaded annealer schedule from disk");
}

app.engine('hbs', hbs( {
  extname: 'hbs',
  defaultView: 'default',
  layoutsDir: __dirname + '/views/pages/',
  partialsDir: __dirname + '/views/partials/'
}));

app.get('/', function(req, res) {
  res.render('home', {layout: 'default', template: 'home', status: status, annealer_open_time: annealerScheduleOpen.hours + ':' + annealerScheduleOpen.minutes, annealer_close_time: annealerScheduleClose.hours + ":" + annealerScheduleClose.minutes});
});

app.get('/forward', function(req, res) {
  backward.writeSync(0);
  forward.writeSync(1);
  status = "Running Forwards";
  res.send('Motor running forwards');
});

app.get('/backward', function(req, res) {
  forward.writeSync(0);
  backward.writeSync(1);
  status = "Running Backwards";
  res.send('Motor running backwards');
});

app.get('/stop', function(req, res) {
  forward.writeSync(0);
  backward.writeSync(0);
  status = "Idle";
  res.send('Motor stopped');
});

app.get('/status', function(req, res) {
  res.send(status);
});

app.get('/annealer/schedule', function(req, res) {
  console.log("Schedule set to open at " + req.query.openTime + " and close at " + req.query.closeTime);
  openTime = req.query.openTime.split(":");
  closeTime = req.query.closeTime.split(":");  
  setAnnealerSchedule(openTime[0], openTime[1], closeTime[0], closeTime[1]);
  res.send('Schedule updated.');
});

app.listen(port, () => console.log(`Listening on port ${port}!`))

function openAnnealer(forward, backward) {
  console.log("Opening annealer");
  backward.writeSync(0);
  forward.writeSync(1);
  setTimeout(function() {
    forward.writeSync(0);
  }, 15000);
}

function closeAnnealer(forward, backward) {
  console.log("Closing annealer");
  forward.writeSync(0);
  backward.writeSync(1);
  setTimeout(function() {
    backward.writeSync(0);
  }, 15000);
}

function setAnnealerSchedule(openHours, openMinutes, closeHours, closeMinutes) {
  var annealerSchedule = {
    openHours: openHours,
    openMinutes: openMinutes,
    closeHours: closeHours,
    closeMinutes: closeMinutes
  }
  fs.writeFile("annealerSchedule.json", JSON.stringify(annealerSchedule), "utf8", function() {
    console.log("Saved annealer schedule to disk"); 
  });

  annealerScheduleOpen = {hours: openHours, minutes: openMinutes}
  annealerScheduleClose = {hours: closeHours, minutes: closeMinutes}

  if(annealerOpenJob !== null && annealerOpenJob !== undefined) {
    annealerOpenJob.stop();
  }
  annealerOpenJob = new CronJob(openMinutes + " " + openHours + " * * *", function() {
    openAnnealer(forward, backward);
  }, null, true, "Europe/London");
  console.log("Next open at " + annealerOpenJob.nextDates(1));

  if(annealerCloseJob !== null && annealerCloseJob !== undefined) {
    annealerCloseJob.stop();
  }
  annealerCloseJob = new CronJob(closeMinutes + " " + closeHours + " * * *", function() {
    closeAnnealer(forward, backward);
  }, null, true, "Europe/London");
  console.log("Next close at " + annealerCloseJob.nextDates(1));
}

dweetio.listen_for("station-glass-annealer", function(dweet) {
  console.log(dweet);
  if (dweet.content.action == "open") {
    backward.writeSync(0);
    forward.writeSync(1);
  }
  else {
    forward.writeSync(0);
    backward.writeSync(1);
  }
});
