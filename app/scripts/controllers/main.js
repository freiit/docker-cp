'use strict';

angular.module('dockerUiApp').config([
    '$httpProvider',
    function ($httpProvider) {
        $httpProvider.interceptors.push(['$rootScope', 'Config', function ($rootScope, Config) {
            return {
                request: function (config) {
                    config.headers = config.headers || {};

                    if (config.headers['X-Registry-Auth']) {
                        if ($rootScope.auth && Config.features.registryAuth) {
                            config.headers['X-Registry-Auth'] = $rootScope.auth.data;
                        } else {
                            delete config.headers['X-Registry-Auth'];
                        }
                    }

                    return config;
                },
                requestError : function (rejection) {
                    if (!rejection.data) {
                        return rejection;
                    }
                    $rootScope.alert.value = {type: 'warning', msg: rejection.data};
                    return rejection;
                },
                responseError: function (rejection) {
                    if (!rejection.data) {
                        return rejection;
                    }
                    $rootScope.alert.value = {type: 'warning', msg: rejection.data};
                    return rejection;
                }
            };
        }]);
    }])
    .controller('MainCtrl', [
        '$scope', '$log', '$rootScope', '$location', '$cookies', '$base64', 'cfpLoadingBar', 'Docker', 'Config',
        function ($scope, $log, $rootScope, $location, $cookies, $base64, cfpLoadingBar, Docker, Config) {
            $rootScope.search = $scope.search = {value: ''};
            $rootScope.alert = $scope.alert = {value: null};
            $scope.currentLocation = $location.$$path.split('/').slice(0, 2).join('/');
            $scope.docker_host = $rootScope.docker_host || Config.host;

            $rootScope.$watch('docker_host', function (docker_host) {
                if (docker_host !== $scope.docker_host) {
                    $scope.docker_host = $rootScope.docker_host || Config.host;
                }
            });

            $rootScope.$on('$routeChangeSuccess', function (event, next) {
                $scope.currentLocation = (next.$$route && next.$$route.originalPath) ||
                                         $location.$$path.split('/').slice(0, 2).join('/');
                if (cfpLoadingBar.status()) {
                    cfpLoadingBar.complete();
                }
            });

            if ($cookies.auth) {
                try {
                    $scope.auth = $rootScope.auth = JSON.parse($cookies.auth);
                    $scope.auth.password = JSON.parse($base64.decode($scope.auth.data)).password;
                    Docker.auth($scope.auth, function (response) {
                        if (response.Status !== 'Login Succeeded') {
                            $scope.auth = $rootScope.auth = $cookies.auth = '';
                            $log.error('Auth error', response);
                        }
                        delete $scope.auth.password;
                    });
                } catch (e) {
                    $log.error('Failed to parse cookies');
                    $scope.auth = $rootScope.auth = $cookies.auth = '';
                }
            }

            $scope.authenticate = function () {
                Docker.authenticate(null, function (error, auth) {
                    if (!error && auth) {
                        auth.data = $base64.encode(JSON.stringify(auth));
                        delete auth.password;
                        $scope.auth = $rootScope.auth = auth;
                        $cookies.auth = JSON.stringify(auth);
                    }
                });
            };
        }]);
