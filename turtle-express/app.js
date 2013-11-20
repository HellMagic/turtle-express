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
    , uuid = require('node-uuid')
    , temp = require('temp')
    , hb = require("../common/hb.js")
    , _ = require('underscore');
_.mixin(_str.exports());

temp.track();

var APP_BASE = 'app'
    , DOWNLOAD_BASE = 'dl'
    , USERDATA_BASE = 'userdata'
    , am = AM.init(APP_BASE, DOWNLOAD_BASE)
    , udm = UDM.init(USERDATA_BASE)
    , SERVICE_ID_FILE = 'service_info'
    , HEARTBEAT_INTERVAL = 10 * 1000
    , TURTLE_DIRECTORY_HOST = 'cloud.sunshine-library.org'
//    , TURTLE_DIRECTORY_HOST = '127.0.0.1'
    , TURTLE_DIRECTORY_PORT = 9460;

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

var upstreamServer = "http://cloud.sunshine-library.org:9460";
//var upstreamServer = "http://192.168.3.100:9460";
console.log("upstream server:" + upstreamServer);

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

var downloadFile = function (url, cb) {
    var dstFile = temp.path({prefix: 'turtledl_'});
    http.get(url,function (res) {
        console.log("begin downloading,%s,%s", url, dstFile);
        var writeStream = fs.createWriteStream(dstFile);
        writeStream.on('finish', function () {
            console.log('file write finish');
            if (cb) cb(undefined, dstFile);
        });
        writeStream.on('end', function () {
            console.log('file write end');
        });
        writeStream.on('close', function () {
            console.log('file write close');
        });
        res.on('data', function (data) {
            writeStream.write(data);
        })
            .on('end', function () {
                console.log('file download completed,%s,%s', dstFile, url);
                writeStream.end();
            })
            .on('error', function (e) {
                console.error('download error,%s', url);
                writeStream.end();
                if (cb) cb(e);
            });
    }).on('error', function (e) {
            if (cb) cb(e);
        });
}

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
            console.log('download new app,%s,%s', app.download_url);
            downloadFile(app.download_url, function (err, file) {
                if (err) {
                    console.error('download failed,%s', err);
                    return;
                }
                am.install(file, function (app) {
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
            console.log('download update app,%s,%s', app.download_url, info.path);

            downloadFile(app.download_url, function (err, file) {
                console.log('ready to install zip,%s,%s,', err, file);
                if (err) {
                    console.error('download failed,%s', err);
                    return;
                }
                am.install(file, function (app) {
                    console.log('new app installed,%s', ((app) ? app.id : 'null'));
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
        , folder = req.query.folder
        , url = req.query.url;
    console.log('install app,%s,%s,%s', file, folder, url);
    try {
        if (file) {
            am.install(file, function (app) {
                res.send(app);
            });
        } else if (folder) {
            am.installFolder(folder, function (app) {
                res.send(app);
            });
        } else if (url) {
            downloadFile(url, function (err, file) {
                if (err) {
                    console.error(err);
                    return;
                }
                am.install(file, function (app) {
                    res.send(app);
                });
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

/**
 * Heart beat
 */
var clients = {};

app.post('/client', function (req, res) {
    console.log(Object.keys(req.body.apps));
    var c = clients[req.body.id] = req.body;
    c.lastHeartBeatTime = new Date().getTime();
    res.send('ok');
});

app.get('/clients', function (req, res) {
    res.send(clients);
});

if (!fs.existsSync(SERVICE_ID_FILE)) {
    serverInfo = {id: uuid.v4()};
    fs.writeFileSync(SERVICE_ID_FILE, JSON.stringify(serverInfo), 'utf8');
}

var heartBeat = function () {
    try {
        var serviceInfo = JSON.parse(fs.readFileSync(SERVICE_ID_FILE, 'utf8'))
            , directoryTurtleUrl = "http://" + TURTLE_DIRECTORY_HOST + ":" + TURTLE_DIRECTORY_PORT + "/client";
        serviceInfo.apps = am.all();
        request.post(
            {
                "url": directoryTurtleUrl,
                "Content-type": "application/json",
                "method": "POST",
                json: serviceInfo
            }, function (e, r, body) {
                if (e || r.statusCode != 200) {
                    console.error('cannot connect to directory turtle,' + directoryTurtleUrl);
                } else {
                    console.log('heart beat');
                }
            }
        );
    } catch (err) {
        console.error("service info file broken. check " + SERVICE_ID_FILE);
    }
}

setInterval(function () {
    heartBeat();
}, HEARTBEAT_INTERVAL);


http.createServer(app).listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});
