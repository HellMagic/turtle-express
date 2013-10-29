/**
 * Created with JetBrains WebStorm.
 * User: fxp
 * Date: 10/29/13
 * Time: 1:21 PM
 * To change this template use File | Settings | File Templates.
 */

var fs = require("fs")
	, path = require("path")
	, base32 = require("base32");

exports.init = function (userdataFolder) {
	if (!fs.existsSync(userdataFolder)) {
		fs.mkdirSync(userdataFolder);
		console.log("user data folder not exists,make one," + userdataFolder);
	}
	if (!fs.existsSync(userdataFolder)) {
		throw "cannot create app base," + userdataFolder;
	}

	var putData = function (user, target, data) {
		console.log('putdata,%s,%s', JSON.stringify(userdataFolder), JSON.stringify(user));
		var fileName = base32.encode(target)
			, userFolder = path.join(userdataFolder, user)
			, dataFile = path.join(userFolder, fileName);
		if (!fs.existsSync(userFolder)) {
			fs.mkdirSync(userFolder);
		}
		fs.writeFileSync(dataFile, data);
		return data;
	}
	var getData = function (user, target) {
		var fileName = base32.encode(target)
			, userFolder = path.join(userdataFolder, user)
			, dataFile = path.join(userFolder, fileName)
			, result;
		if (fs.existsSync(dataFile)) {
			result = fs.readFileSync(dataFile);
		}
		return result;
	};
	return {
		putData: putData,
		getData: getData
	}

};