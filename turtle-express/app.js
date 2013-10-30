/**
 * Module dependencies.
 */

var express = require('express')
	, API = require('./api.js')
	, routes = require('./routes')
	, user = require('./routes/user')
	, http = require('http')
	, url = require('url')
	, request = require('request')
	, AM = require('../common/am')
	, UDM = require('../common/udm')
	, fs = require('fs')
	, path = require('path')
	, _str = require('underscore.string')
	, ip = require('ip')
	, temp = require('temp')
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

var upstreamServer = "http://127.0.0.1:9461";
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

app.post('/upstream', function (req, res) {
	var upstream = req.query.server;
	if (typeof upstream === "undefined") {
		res.send(400, {msg: "invalid request"});
	} else {
		try {
			url.parse(upstream);
			upstreamServer = upstream;
			api = API.server(upstreamServer);
			res.send({msg: 'upstream changed to,' + upstream});
		} catch (error) {
			res.send(400, {msg: "invalid server," + error});
		}
	}
});

app.get('/', function (req, res) {
	if (am.getAppById("0")) {
		res.redirect("/app/0/index.html");
	} else {
		res.send(500, 'no bootstrap app exists');
	}
});

app.get('/pull', function (req, res) {
	fetchUpstreamDiff(function (err, diff) {
		console.log('diff,%s', JSON.stringify(diff));
		res.send(diff);
	});
});

app.get('/sync', function (req, res) {
	fetchUpstreamDiff(function (err, diff) {
		if (err) {
			res.send(500, {msg: err});
			return;
		}
		_.each(diff.newApps, function (app) {
			if (!_(app.download_url).startsWith('http://')) {
				app.download_url = upstreamServer + app.download_url;
			}
			var info = temp.openSync('turtledl_');
			console.log('download new app,%s,%s', app.download_url, info.path);
			var download = request(app.download_url).pipe(fs.createWriteStream(info.path));
			download.on('error', function () {
				console.error('download error');
			});
			download.on('finish', function () {
				console.log('download completed,%s,%s' + JSON.stringify(info), app.download_url);
				am.install(info.path, function (app) {
					console.log('new app installed,%s', ((app) ? app.id : 'null'));
				});
			});
		});
		_.each(diff.updateApps, function (app) {
			console.log('update app,%s', JSON.stringify(app));
			if (!_(app.download_url).startsWith('http://')) {
				app.download_url = upstreamServer + app.download_url;
			}
			var info = temp.openSync('turtledl_');
			console.log('download new app,%s,%s', app.download_url, info.path);
			var download = request(app.download_url).pipe(fs.createWriteStream(info.path));
			download.on('error', function () {
				console.error('download error');
			});
			download.on('finish', function () {
				console.log('download completed,%s,%s' + JSON.stringify(info), app.download_url);
				am.install(info.path, function (app) {
					console.log('update app installed,%s', ((app) ? app.id : 'null'));
				});
			});
		});
		_.each(diff.deleteApps, function (app) {
			console.log('delete app,%s', JSON.stringify(app));
			am.uninstall(app.id, function (app) {
				console.log('app deleted,%s', app.id);
			})
		});
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

app.post("/user_data/*", function (req, res) {
	var accessToken = req.headers['access-token'] || 'test';
	console.log("save user data(" + accessToken + "," + req.path + ")");
	var result = udm.putData(accessToken, req.path, JSON.stringify(req.body));
	res.send(result);
});

app.get("/user_data/*", function (req, res) {
	var accessToken = req.headers['access-token'] || 'test';
	console.log("fetch user data(" + accessToken + "," + req.path + "),");
	var result = udm.getData(accessToken, req.path);
	res.send(result || {});
});

http.createServer(app).listen(app.get('port'), function () {
	console.log('Express server listening on port ' + app.get('port'));
});
