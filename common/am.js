/**
 * Created with JetBrains WebStorm.
 * User: fxp
 * Date: 10/27/13
 * Time: 7:54 PM
 * To change this template use File | Settings | File Templates.
 */

var _ = require("underscore")
    , _str = require("underscore.string")
    , fs = require("fs")
    , path = require('path')
    , dive = require('dive')
    , fsext = require('fs-extra')
    , fstream = require('fstream')
    , archiver = require('archiver')
    , archive = archiver('zip')
    , admzip = require('adm-zip')

    , temp = require('temp');

_.mixin(_str.exports());

exports.init = function (appBase, downloadBase) {
    console.log("init app manager,%s,%s", appBase, downloadBase);
    var apps = {};
    if (!fs.existsSync(appBase)) {
        fs.mkdirSync(appBase);
        console.log("app base not exists,make one," + appBase);
    }
    if (!fs.existsSync(appBase)) {
        throw "cannot create app base," + appBase;
    }

    var getAppFolder = function (id) {
        return path.join(appBase, id);
    }
    var getAppUniqId = function (app) {
        return app.id + '.' + app.version_code;
    }
    var getAppFile = function (app) {
        return downloadBase + '/' + getAppUniqId(app) + '.wpk';
    }

    var packApp = function (folder, output, cb) {
        var archive = archiver('zip');
        archive.pipe(output);
        var appFolder = fs.realpathSync(folder);
        dive(appFolder,
            { directories: false, files: true}, function (err, f) {
                if (err) throw err;
                var s = f.slice(appFolder.length, f.length);
                archive.append(fs.createReadStream(f), { name: s });
            },
            function () {
                archive.finalize(function (err, bytes) {
                    if (cb) cb(bytes);
                });
            });
    }

    var parseAppFolder = function (folder) {
        var manifest_file = path.join(folder, "manifest.json");
        var data = fs.readFileSync(manifest_file);
        var app = JSON.parse(data);
        if (typeof app === "undefined"
            || typeof app.id === "undefined"
            || typeof app.version_code === "undefined") {
            throw "invalid app folder," + folder;
        }
        return app;
    }

    // init all exists apps
    var files = fs.readdirSync(appBase);
    _.each(files, function (file) {
        if (_(file).startsWith(".")) {
            return;
        }
        file = path.join(appBase, file);
        var app = parseAppFolder(file)
            , appFile = getAppFile(app);
        app.download_url = '/' + downloadBase + '/' + getAppUniqId(app) + '.wpk';
        apps[app.id] = app;
        if (!fs.existsSync(appFile)) {
            packApp(file, fstream.Writer(appFile), function (bytes) {
                console.log('app file generated,%s,%s bytes', appFile, bytes);
            });
        }
        console.log('app loaded,%s', JSON.stringify(app));
    });

    var installFolder = function (dirPath, cb) {
        console.log('install folder,%s', dirPath);
        if (!fs.existsSync(dirPath)) {
            throw "folder not exists," + dirPath;
        }

        var newApp = parseAppFolder(dirPath);
        if (typeof newApp === "undefined" ||
            typeof newApp.id === "undefined" ||
            typeof newApp.version_code === "undefined") {
            throw "parse folder failed," + dirPath;
        }
        var exists = apps[newApp.id];
        if (typeof exists != "undefined" &&
            exists.version_code >= newApp.version_code) {
            throw "app exists and local version is higher," +
                apps[newApp.id].version_code +
                newApp.version_code;
        }
        var appFolder = getAppFolder(newApp.id)
            , appFile = getAppFile(newApp);
        newApp.download_url = '/' + downloadBase + '/' + getAppUniqId(newApp) + '.wpk';
        if (typeof exists === "undefined") {
            fsext.copy(dirPath, appFolder, function () {
                console.log("complete install," + dirPath);
                packApp(appFolder, fstream.Writer(appFile), function (bytes) {
                    console.log('app file generated,%s,%s bytes', appFile, bytes);
                    apps[newApp.id] = newApp;
                    if (cb) cb(newApp);
                });
            });
        } else {
            fsext.remove(appFolder, function () {
                fsext.copy(dirPath, appFolder, function () {
                    console.log("complete upgrade," + dirPath);
                    if (fs.existsSync(appFile)) {
                        console.log('app file already exists,%s', appFile);
                        return;
                    }
                    packApp(appFolder, fstream.Writer(appFile), function (bytes) {
                        console.log('app file generated,%s,%s bytes', appFile, bytes);
                        apps[newApp.id] = newApp;
                        if (cb) cb(newApp);
                    });
                });
            });
        }
    };

    var install = function (zipfile, cb) {
        console.log('install zip,%s', zipfile);
        if (!fs.existsSync(zipfile)) {
            throw "no such zip file," + zipfile;
        }

        var dirPath = temp.mkdirSync('appparser');
        var zip = new admzip(zipfile);
        console.log('start extraction,%s,%s', zipfile, dirPath);
        zip.extractAllTo(dirPath, true);
        console.log("extract completed,%s", dirPath);
        installFolder(dirPath, cb);
    };

    var uninstall = function (appId, cb) {
        console.log('uninstall,%s', appId);
        var exists = apps[appId];
        if (typeof exists != 'undefined') {
            delete apps[appId];
            fsext.remove(getAppFolder(appId), function () {
                if (cb) cb(exists);
            });
        } else {
            throw 'app with id ' + appId + ', not exists'
        }
    };
    var all = function () {
        return apps;
    };
    var query = function (filters) {
        console.log('query,%s', JSON.stringify(filters));
        return _.filter(apps, function (app) {
            var pass = true;
            _.each(filters, function (value, key) {
//				console.log('filter,%s=%s,%s(%s),%s(%s),result:%s', key, value,
//					app[key], (typeof app[key]), value, (typeof value), (app[key] != value));
                if ((typeof app[key] != 'undefined') && (app[key] != value)) {
                    pass = false;
                }
            });
            return pass;
        })
    };
    var getAppById = function (id) {
        return apps[id];
    }

    return {
        install: install,
        installFolder: installFolder,
        uninstall: uninstall,
        all: all,
        getAppById: getAppById,
        query: query,
        packApp: packApp
    }
};
