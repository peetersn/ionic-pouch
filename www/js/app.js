// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
var airFiPopApp = angular.module('starter', ['ionic', 'ngCordova']);

var localDB = new PouchDB("todos");
var remoteDB = new PouchDB("http://admin:password@peetersn.iriscouch.com/todos");

airFiPopApp.run(function($ionicPlatform, $rootScope, $timeout, $cordovaSplashscreen) {
	$ionicPlatform.ready(function() {
		// Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
		// for form inputs)
		if (window.cordova && window.cordova.plugins.Keyboard) {
			cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
		}
		if (window.StatusBar) {
			StatusBar.styleDefault();
		}

        //pasted code to work around some issue...
        window.plugin.notification.local.onadd = function(id, state, json) {
            var notification = {
                id: id,
                state: state,
                json: json
            };
            $timeout(function() {
                $rootScope.$broadcast("$cordovaLocalNotification:added", notification);
            });
        };

		//we need to start synchronizing
        console.log('Starting continuous replication with upstream', remoteDB);
		localDB.sync(remoteDB, {
			live: true, retry: true
		});
	});

    setTimeout(function() {
        $cordovaSplashscreen.hide()
    }, 5000);
});

airFiPopApp.controller("ExampleController", function($scope, $ionicPlatform, $ionicPopup, PouchDBListener, $cordovaSplashscreen, $cordovaMedia, $cordovaLocalNotification) {

    // For iOS 8 only, it is a requirement to request for notification permissions first.
    // This can be accomplished by adding the following in our controller:
    $ionicPlatform.ready(function() {
        if(device.platform === "iOS") {
            window.plugin.notification.local.promptForPermission();
        }
    });

    $scope.$on("$cordovaLocalNotification:added", function(id, state, json) {
        alert("Added a notification");
        console.log("Local notification added");
    });

	$scope.orders = [];

	$scope.create = function() {
		$ionicPopup.prompt({
			title: 'Enter a new TODO item',
			inputType: 'text'
		}).then(function(result) {
			if (result !== "") {

				//making sure that scope really has a "todo" element, if not we create one.
				if ($scope.hasOwnProperty("todos") !== true) {
					$scope.todos = [];
				}
				localDB.post({
					title: result
				});
			} else {
				console.log("Action not completed");
			}
		});
	};

    $scope.processOrder = function(id) {
        //delete in localDB
        localDB.get(id).then(function(doc) {
            console.log('Proceed with removing doc: '+ doc._id);
            return localDB.remove(doc._id, doc._rev);
        }).then(function (result) {
            //cleanup local model
            for (var i = 0; i < $scope.orders.length; i++) {
                if ($scope.orders[i]._id === id) {
                    $scope.orders.splice(i, 1);
                }
            }

        }).catch(function (err) {
            console.log(err);
        });
    };

	$scope.$on('add', function(event, order) {
		$scope.orders.push(order);
	});

	$scope.$on('delete', function(event, id) {
		for (var i = 0; i < $scope.orders.length; i++) {
			if ($scope.orders[i]._id === id) {
				$scope.orders.splice(i, 1);
			}
		}
	});

    $scope.$on('notify', function(event, order) {
        var id = getRandomArbitrary();
        $cordovaLocalNotification.add({
            id: id,
            message: 'New order by a passenger: ' + order.user + ' ' +order.seat
        }).then(function () {
            console.log("Passenger-triggered notification has been set for pax: "+ order.user + ' ' +order.seat + ' at '+ order.createdAt);
        });
    });

    //$scope.notify = function(title) {
    //
    //
    //    var alarmTime = new Date();
    //    alarmTime.setMinutes(alarmTime.getSeconds() + 10);
    //    $cordovaLocalNotification.add({
    //        id: '1234',
    //        date: alarmTime,
    //        message: 'A new order has been triggered manually',
    //        title: 'AirFi POP',
    //        autoCancel: true,
    //        sound: null
    //    }).then(function () {
    //        console.log("A manual notification has been set");
    //    });
    //};

    $scope.isScheduled = function() {
        $cordovaLocalNotification.isScheduled("1234").then(function(isScheduled) {
            alert("Notification 1234 Scheduled: " + isScheduled);
        });
    };

    $scope.isTriggered = function() {
        $cordovaLocalNotification.isTriggered("1234").then(function(isTriggered) {
            alert("Notification 1234 Triggered: " + isTriggered);
        });
    };

});

function getRandomArbitrary() {
    return Math.floor(Math.random()*1122)
}

airFiPopApp.factory('PouchDBListener', ['$rootScope', function($rootScope) {

	localDB.changes({
		continuous: true,
		onChange: function(change) {

            if (!change.deleted) {
				$rootScope.$apply(function() {
					localDB.get(change.id, function(err, doc) {
						$rootScope.$apply(function() {
							if (err) {
								console.log(err);
							}
                            if(doc.type === 'purchase') {
							    $rootScope.$broadcast('add', doc);
                                $rootScope.$broadcast('notify', doc);
                            }
                            //var mp3URL = getMediaURL("audio/ping.mp3");
                            //var media = new Media(mp3URL, null, null);
                            //media.play();
                            //media.setVolume(1);
						});
					});

				});
			} else {
				$rootScope.$apply(function() {
					$rootScope.$broadcast('delete', change.id);
				});
			}
		}
	});

	return true; //you need to return a value no matter what.

}]);


function getMediaURL(s) {
    if(device.platform.toLowerCase() === "android") {
        return "/android_asset/www/" + s;
    }
    return s;
}


