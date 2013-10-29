/**
 * Module dependencies.
 */

var express = require('express')
	, API = require('./api.js')
	, routes = require('./routes')
	, user = require('./routes/user')
	, http = require('http')
	, request = require('request')
	, AM = require('../common/am')
	, UDM = require('../common/udm')
	, fs = require('fs')
	, path = require('path')
	, _str = require('underscore.string')
	, ip = require('ip')
	, _ = require('underscore');
_.mixin(_str.exports());

var APP_BASE = 'app'
	, DOWNLOAD_BASE = 'dl'
	, USERDATA_BASE = 'userdata'
	, am = AM.init(APP_BASE, DOWNLOAD_BASE)
	, udm = UDM.init(USERDATA_BASE);

var app = express()
	, PORT = process.env.PORT || 9460;
console.log("I'm " + ip.address() + ":" + PORT);

// all environments
app.set('port', PORT);
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

var upstreamServer = "http://127.0.0.1:3002";
var api = API.server(upstreamServer);

var fetchUpstreamDiff = function (cb) {
	if (!cb) {
		return;
	}
	request(api.all, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			var diff = {
				isModified: false,
				newApps: [],
				deleteApps: [],
				updateApps: []
			};
			var localApps = am.all();
			var newApps = _.indexBy(JSON.parse(body), 'id');
			_.each(localApps, function (localApp) {
				if (!newApps[localApp.id]) {
					diff.deleteApps.push(localApp);
					diff.isModified = true;
				} else if (newApps[localApp.id].version_code > localApp.version_code) {
					diff.updateApps.push(newApps[localApp.id]);
					diff.isModified = true;
				}
				delete newApps[localApp.id];
			})
			_.each(newApps, function (newApp) {
				diff.newApps.push(newApp);
				diff.isModified = true;
			});
			cb(undefined, diff);
		} else {
			cb(error, undefined);
		}
	});
};

app.get('/', routes.index);

app.get('/pull', function (req, res) {
	fetchUpstreamDiff(function (err, diff) {
		console.log('diff:' + JSON.stringify(diff));
		res.send(diff);
	});
});

app.get('/install', function (req, res) {
	var file = req.query.zip
		, folder = req.query.folder;
	console.log('install app,%s,%s', file, folder);
	try {
		if (file) {
			am.install(file, function (app) {
				res.send(app);
			});
		} else if (folder) {
			am.installFolder(folder, function (app) {
				res.send(app);
			});
		} else {
			res.send(400, {msg: 'invalid request'});
		}
	} catch (err) {
		console.log('error,%s', err);
		res.send(500, {msg: err});
	}
});


app.get('/apps', function (req, res) {
	var filters = req.query
		, fields = (filters.fields) ? _.words(filters.fields, ",") : undefined
		, result;
	if (req.query) {
		result = am.query(filters);
		delete filters.fields;
	} else {
		result = am.all();
	}
	if (fields) {
		result = _.map(result, function (app) {
			var filtered = {};
			_.each(fields, function (field) {
				filtered[field] = app[field];
			})
			return filtered;
		});
	}
	res.send(result);
});

app.use(api.downloadBase, express.static(__dirname + "/dl/"));
app.use(api.appBase, express.static(__dirname + "/app/"));

app.get('/uninstall', function (req, res) {
	var appId = req.query.id;
	if (!appId) {
		res.send(400, {msg: 'id cannot be empty'});
		return;
	}
	try {
		am.uninstall(appId, function (app) {
			res.send(app);
		});
	} catch (err) {
		res.send(500, {msg: err});
	}
});

var user_data = {};

app.post("/exercise/v1/user_data/*", function (req, res) {
	var accessToken = req.headers['access-token'] || 'test';
	console.log("save user data(" + accessToken + "," + req.path + ")");

	var result = udm.putData(accessToken, req.path, JSON.stringify(req.body));
	res.send(result);
});

app.get("/exercise/v1/user_data/*", function (req, res) {
	var accessToken = req.headers['access-token'] || 'test';
	console.log("fetch user data(" + accessToken + "," + req.path + "),");
	var result = udm.getData(accessToken, req.path);
	res.send(result || {});
});

app.post("/", function (req, res) {
	console.log("got a unrecognized user data," + JSON.stringify(req.body));
	user_data[req.url] = req.body;
	res.send(user_data[req.url]);
});

http.createServer(app).listen(app.get('port'), function () {
	console.log('Express server listening on port ' + app.get('port'));
});
