/**
 * Module dependencies.
 */

var express = require('express')
    , routes = require('./routes')
    , user = require('./routes/user')
    , request = require('request')
    , http = require('http')
    , fs = require('fs')
    , course = require('../common/course')
    , path = require('path');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', routes.index);
app.get('/course', function (req, res) {
    var chapterFolder = req.query.chapter;
    var subject = req.query.subject;
    console.log('parse chapter,%s', chapterFolder);
    var chapter = course.parseChapter(chapterFolder);
    course.exportChapter(subject, chapter, "out");
    res.send(chapter.id);
});

http.createServer(app).listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});
