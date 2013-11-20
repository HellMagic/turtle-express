function AppListCtrl($scope, $timeout, $http) {

    setInterval(function () {
        $http.get('/clients').success(function (data, status, headers, config) {
            $scope.clients = data;
        });
    }, 5000);

    $scope.appClass = function (app) {
        if (app.launchable == '1') {
            return 'icon-circle icon-large grey'
        } else {
            return 'icon-circle-blank icon-large grey'
        }
    }

}