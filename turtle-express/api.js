/**
 * Created with JetBrains WebStorm.
 * User: fxp
 * Date: 10/29/13
 * Time: 12:15 AM
 * To change this template use File | Settings | File Templates.
 */

exports.APP_EXTENSION = "wpk";
exports.server = function (server) {
	var downloadBase = "/dl";
	var appBase = "/app";
	return {
		all: server + "/apps",
		query: server + "/apps",
		downloadBase: downloadBase,
		appBase: appBase,
		download: function (appId, versionCode) {
			return server + downloadBase + "/" + appId + "." + versionCode + "." + exports.APP_EXTENSION;
		}
	};
}

