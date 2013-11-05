/**
 * Module dependencies.
 */

var express = require('express')
    , routes = require('./routes')
    , user = require('./routes/user')
    , http = require('http')
    , path = require('path')
    , hb = require("../common/hb.js");

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

// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/users', user.list);

var TURTLE_DIRECTORY_HOST = 'cloud.sunshine-library.org'
    , TURTLE_DIRECTORY_PORT = 9461;

// start server with default values
var server = hb.server(TURTLE_DIRECTORY_HOST, TURTLE_DIRECTORY_PORT);

setInterval(function () {
        server.broadcast();
        server.find_zombies(15000, function (zombie) {
            console.log("Found a zombie: " + zombie.hbtime);
            delete zombie;
        });
    },
    30 * 1000);

app.get('/clients', function (req, res) {
    var clients = server.clients;
    res.send(Object.keys(clients));
});

app.get('/broadcast', function (req, res) {
    res.send(server.broadcast());
});

http.createServer(app).listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});
