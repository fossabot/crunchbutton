NGApp.controller('DriversOrderCtrl', function ( $scope, DriverOrdersService ) {

	$scope.ready = false;

	// private method
	var load = function(){
		DriverOrdersService.get( function( json ){
			$scope.order = json;
			$scope.ready = true;
			$scope.unBusy();
		} );
	}

	$scope.accept = function() {
		$scope.makeBusy();
		DriverOrdersService.accept( $scope.order.id_order, 
			function( json ){
				if( json.status ) {
					load();
				} else {
					load();
					var name = json[ 'delivery-status' ].accepted.name ? ' by ' + json[ 'delivery-status' ].accepted.name : '';
					App.alert( 'Ops, error!\n It seems this order was already accepted ' + name + '!'  );
				}
			}
		);
	};

	$scope.pickedup = function() {
		$scope.makeBusy();
		DriverOrdersService.pickedup( $scope.order.id_order, function(){ load(); } );
	};

	$scope.delivered = function() {
		$scope.makeBusy();
		DriverOrdersService.delivered( $scope.order.id_order, function(){ load();	} );
	};

	$scope.reject = function() {
		$scope.makeBusy();
		DriverOrdersService.reject( $scope.order.id_order, function(){ load();	} );
	};

	// Just run if the user is loggedin 
	if( $scope.account.isLoggedIn() ){
		load();
	}

});

NGApp.controller('DriversOrdersCtrl', function ( $scope, DriverOrdersService, MainNavigationService ) {

	$scope.show = { all : true };
	$scope.ready = false;

	$scope.filterOrders = function( order ){
		if( $scope.show.all ){
			return true;	
		} else {
			if( order.lastStatus.id_admin == $scope.account.user.id_admin ){
				return true;
			}
		}
		return false;
	}

	$scope.list = function(){
		$scope.unBusy();
		DriverOrdersService.list( function( data ){
			$scope.driverorders = data;
			$scope.ready = true;
		} );
	}

	$scope.accept = function( id_order ) {
		$scope.makeBusy();
		DriverOrdersService.accept( id_order, 
			function( json ){
				if( json.status ) {
					$scope.list();
				} else {
					$scope.unBusy();
					var name = json[ 'delivery-status' ].accepted.name ? ' by ' + json[ 'delivery-status' ].accepted.name : '';
					App.alert( 'Ops, error!\n It seems this order was already accepted ' + name + '!'  );
					$scope.list();
				}
			}
		);
	};

	$scope.pickedup = function( id_order ) {
		$scope.makeBusy();
		DriverOrdersService.pickedup( id_order, function(){ $scope.list(); } );
	};
	
	$scope.delivered = function( id_order ) {
		$scope.makeBusy();
		DriverOrdersService.delivered( id_order, function(){ $scope.list();	} );
	};

	$scope.showOrder = function( id_order ){
		MainNavigationService.link( '/drivers/order/' + id_order );
	}

	// Just run if the user is loggedin 
	if( $scope.account.isLoggedIn() ){
		$scope.list();	
	}
} );

NGApp.controller( 'DriversShiftsCtrl', function ( $scope, DriverShiftsService ) {

	$scope.show = { all : true };
	$scope.ready = false;

	$scope.filterShifts = function( shift ){
		if( $scope.show.all ){
			return true;	
		} else {
			if( shift.mine ){
				return true;
			}
		}
		return false;
	}

	$scope.list = function(){
		DriverShiftsService.list( function( data ){
			$scope.drivershifts = data;
			$scope.ready = true;
		} );
	}

	// Just run if the user is loggedin 
	if( $scope.account.isLoggedIn() ){
		$scope.list();	
	}

} );

NGApp.controller( 'DriversOnboardingCtrl', function ( $scope, $timeout, DriverOnboardingService ) {

	$scope.ready = false;
	$scope.search = '';

	var list = function(){
		DriverOnboardingService.list( $scope.page, $scope.search, function( data ){
			$scope.pages = data.pages;
			$scope.next = data.next;
			$scope.prev = data.prev;
			$scope.drivers = data.results;
			$scope.count = data.count;
			$scope.ready = true;
			$scope.focus( '#search' );
		} );	
	}

	var waiting = false;

	$scope.$watch( 'search', function( newValue, oldValue, scope ) {
		if( newValue == oldValue || waiting ){
			return;
		}
		waiting = true;
		$timeout( function() { 
			list();
			$scope.ready = false;
			waiting = false;
		}, 1 * 1000 );
	} );

	$scope.page = 1;

	$scope.nextPage = function(){
		$scope.page = $scope.next;
		list();
	}

	$scope.prevPage = function(){
		$scope.page = $scope.prev;
		list();
	}

	$scope.add = function( id_admin ){
		$scope.navigation.link( '/drivers/onboarding/new' );
	}

	$scope.edit = function( id_admin ){
		$scope.navigation.link( '/drivers/onboarding/' + id_admin );
	}

	list();

} );

NGApp.controller( 'DriversOnboardingFormCtrl', function ( $scope, $fileUploader, DriverOnboardingService, CommunityService ) {

	$scope.ready = false;
	$scope.submitted = false;

	var docs = function(){
		// Load the docs
		DriverOnboardingService.docs.list( function( data ){
			$scope.documents = data;
		} );
	}

	var logs = function(){
		DriverOnboardingService.logs( function( data ){
			$scope.logs = data;
		} );
	}

	DriverOnboardingService.get( function( driver ){
		$scope.driver = driver;
		if( !$scope.driver.id_admin ){
			$scope.driver.notify = true;
		}
		logs();
		docs();
		CommunityService.listSimple( function( data ){
			$scope.communities = data;
			$scope.ready = true;
		} );
	} );

	$scope.notify = function(){
		DriverOnboardingService.notifySetup( $scope.driver.id_admin, function( json ){
			if( json.success ){
				$scope.flash.setMessage( 'Notification sent!' );
			} else {
				$scope.flash.setMessage( 'Notification not sent: ' + json.error , 'error' );	
			}
		} );
	}

	$scope.setDocument = function( id_driver_document ){
		$scope.doc_uploaded = id_driver_document
	}

	// method save that saves the driver
	$scope.save = function(){
		
		if( $scope.form.$invalid ){
			$scope.submitted = true;
			return;
		}

		DriverOnboardingService.save( $scope.driver, function( json ){
			if( json.success ){
				$scope.navigation.link( '/drivers/onboarding/' + json.success.id_admin );
				$scope.flash.setMessage( 'Driver saved!' );	
			} else {
				$scope.flash.setMessage( 'Driver not saved: ' + json.error , 'error' );	
			}
		} );
	}

	$scope.cancel = function(){
		$scope.navigation.link( '/drivers/onboarding/' );
	}

	// Upload control stuff
	$scope.doc_uploaded = 0;

	var uploader = $scope.uploader = $fileUploader.create({
									scope: $scope,
									url: '/api/driver/documents/upload/',
									filters: [ function( item ) { return true; } ]
								} );

	uploader.bind( 'success', function( event, xhr, item, response ) {
		$scope.$apply();
		if( response.success ){
			var doc = { id_admin : $scope.driver.id_admin, id_driver_document : $scope.doc_uploaded, file : response.success };
			DriverOnboardingService.docs.save( doc, function( json ){
				if( json.success ){
					docs();
					$scope.flash.setMessage( 'File saved!' );
				} else {
					$scope.flash.setMessage( 'File not saved: ' + json.error );
				}
			} );
			uploader.clearQueue();
		} else {
			$scope.flash.setMessage( 'File not saved: ' + json.error );
		}
	});

	uploader.bind('error', function (event, xhr, item, response) {
		App.alert( 'Upload error, please try again or send us a message.' );
	});

} );

NGApp.controller( 'DriversOnboardingSetupCtrl', function( $scope, DriverOnboardingService ) {
	
	$scope.ready = false;
	$scope.finished = false;

	$scope.driver = { password: '', email : '', confirm: '' };

	$scope.access = function(){
		$scope.navigation.link( '/login' );
	}

	$scope.send = function(){
		if( $scope.form.$invalid ){
			$scope.submitted = true;
			return;
		}
		DriverOnboardingService.setupSave( $scope.driver, function( json ){
			if( json.success ){
				$scope.driver	= json.success;
				DriverOnboardingService.notifyWelcome( $scope.driver.id_admin );
				$scope.finished = true;
			} else {
				$scope.error = json.error;
			}
		} );
	}

	DriverOnboardingService.setupValidate( function( json ){
		if( json.success ){
			$scope.driver.id_admin = json.success.id_admin;
			$scope.driver.hasEmail = json.success.hasEmail;
			$scope.ready = true;	
		} else {
			$scope.error = json.error;
		}
	} );

} );


NGApp.controller( 'PreOnboardingCtrl', function( $scope, PreOnboardingService, CommunityService ) {
	
	$scope.ready = false;
	$scope.submitted = false;

	CommunityService.listSimple( function( data ){
		$scope.communities = data;
		$scope.ready = true;
	} );

	$scope.save = function(){		
		if( $scope.form.$invalid ){
			$scope.submitted = true;
			return;
		}
		PreOnboardingService.save( $scope.driver, function( json ){
			if( json.success ){
				$scope.finished = true;
			} else {
				$scope.error = json.error;
			}
		} );	
	}
} );
