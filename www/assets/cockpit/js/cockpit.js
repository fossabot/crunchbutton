/**
 *
 * Crunchbutton
 *
 * @author: 	Devin Smith (http://devin.la)
 * @date: 		2012-06-20
 *
 */
 
var App = {
	service: '/api/',
	logService: 'http://log.crunchbutton.com/api/',
	server: '/',
	imgServer: '/',
	cached: {},
	config: null,
	_init: false,
	localStorage: false,
	isPhoneGap: document.location.protocol == 'file:',
	useNativeAlert: false,
	useNativeConfirm: true,
	ajaxTimeout: 5000,
};

// enable localstorage on phonegap
App.localStorage = App.isPhoneGap;

App.NGinit = function() {
	$('body').attr('ng-controller', 'AppController');
	angular.bootstrap(document,['NGApp']);
	if (App.config.env == 'live') {
		$('.footer').addClass('footer-hide');
	}
};

var NGApp = angular.module('NGApp', [ 'ngRoute'] );

NGApp.config(function($compileProvider){
	$compileProvider.aHrefSanitizationWhitelist(/.*/);
});

NGApp.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider, RestaurantsService) {
	$routeProvider
		.otherwise({
			action: 'home',
			controller: 'DefaultCtrl',
			templateUrl: 'assets/view/home.html'
		})
	;
	// only use html5 enabled location stuff if its not in a phonegap container
	$locationProvider.html5Mode(!App.isPhoneGap);
}]);

// global route change items
NGApp.controller('AppController', function ($scope, $route, $http, $routeParams, $rootScope, $location, $window, MainNavigationService, AccountService) {

	// define external pointers
	App.rootScope = $rootScope;
	App.location = $location;
	App.http = $http;


	// define global services
	$rootScope.navigation = MainNavigationService;
	$rootScope.isPhoneGap = App.isPhoneGap;
	$rootScope.server = App.server;

	$rootScope.debug = function() {
		return ( App.config && App.config.user && App.config.user.debug );
	};
	
	$rootScope.test = App.test;
	
	$rootScope.cartScroll = function(permalink) {
		//$('.snap-content-inner').scrollTop() + $('.cart-items').offset().top
		var top = 130 - $('.navs').height() - 10;
		

		var scroll = function() {
			$('html, body, .snap-content-inner').animate({scrollTop: top}, 100, $.easing.easeInOutQuart ? 'easeInOutQuart' : null);
		};
		if ($rootScope.navigation.page != 'restaurant') {
			$rootScope.scrollTop = top;
			App.go('/food-delivery/' + permalink);
		} else {
			scroll();
		}
	};
	
	$rootScope.$on('userAuth', function(e, data) {
		$rootScope.$safeApply(function($scope) {
			// @todo: remove double data
			if (data) {
				$rootScope.account.user = data;
				App.config.user = data;
			}

			App.snap.close();
			$rootScope.reload();	
		});
	});

	$rootScope.focus = function( selector ){
		setTimeout(function(){
			angular.element( selector ).focus();
		}, 100);
	}

	$rootScope.blur = function( selector ){
		setTimeout(function(){
			angular.element( selector ).blur();
		}, 100);
	}

	$rootScope.reload = function() {
		$route.reload();
	};
	
	$rootScope.link = function(link) {
		App.go.apply(arguments);
	};

	$rootScope.back = function() {
		history.back();
	};

	$rootScope.closePopup = function() {
		try {
			$.magnificPopup.close();
		} catch (e) {}
	};

	$rootScope.$safeApply = function(fn) {
		var phase = this.$root.$$phase;
		if (phase == '$apply' || phase == '$digest') {
			if (fn && (typeof(fn) === 'function')) {
				this.$eval(fn);
			}
		} else {
			this.$apply(fn);
		}
	};

	$scope.$on('$routeChangeSuccess', function ($currentRoute, $previousRoute) {
		// Store the actual page
		MainNavigationService.page = $route.current.action;
		App.rootScope.current = MainNavigationService.page;
		App.track('page', $route.current.action);

		$('body').removeClass(function (index, css) {
			return (css.match (/\bpage-\S+/g) || []).join(' ');
		}).addClass('page-' + MainNavigationService.page);
		
		$('.nav-top').addClass('at-top');

		App.scrollTop($rootScope.scrollTop);
		$rootScope.scrollTop = 0;
		
	});

	// Make the window's size available to all scope
	$rootScope.windowWidth = $window.outerWidth;
	$rootScope.windowHeight = $window.outerHeight;

	// Window resize event
	angular.element( $window ).bind( 'resize',function(){
		$rootScope.windowWidth = $window.outerWidth;
		$rootScope.windowHeight = $window.outerHeight;
		$rootScope.$apply( 'windowWidth' );
		$rootScope.$apply( 'windowHeight' );
	});

	AccountService.checkUser();
});

App.alert = function( txt, title, useNativeAlert ) {
	setTimeout(function() {
		if (useNativeAlert && App.isPhoneGap) {
			navigator.notification.alert(txt, null, title || 'Crunchbutton');
		} else if ( useNativeAlert ) {
			alert( txt );
		} else {
			App.rootScope.$broadcast('notificationAlert', title || 'Woops!', txt);
		}
	});
};

App.confirm = function(txt, title, fn, buttons) {
	if (App.useNativeConfirm && App.isPhoneGap) {
		return navigator.notification.confirm(txt, fn, title || 'Crunchbutton', buttons || 'Ok,Cancel' );
	} else {
		return confirm(txt);
	}
};


App.connectionError = function() {
	App.rootScope.$broadcast( 'connectionError' );
	App.rootScope.$broadcast('notificationAlert', 'Connection Error', 'Sorry! We could not reach the server right now. Try again when your internet is back!');
};

App.go = function( url, transition ){
	// Remove the animation from rootScope #2827 before start the new one
	App.rootScope.animationClass = '';
	if( App.isNarrowScreen() || App.transitionForDesktop ){
		setTimeout( function(){
			App.rootScope.animationClass = transition ? 'animation-' + transition : '';
			App.rootScope.$safeApply();
			// @todo: do some tests to figure out if we need this or not
			// App.location.path(!App.isPhoneGap ? url : 'index.html#' + url);
			App.location.path( url || '/' );
			App.rootScope.$safeApply();		
		}, 10 );		
	} else {
		App.location.path( url || '/' );
		App.rootScope.$safeApply();		
	}
};

App.toggleMenu = function() {
	if (App.snap.state().state == 'left') {
		App.snap.close();
	} else {
		App.snap.open('left');
	}
};


/*
App.setTop = function() {
	$('html, body, .snap-content-inner').scrollTop(0);
	setTimeout(function() {
		$('html, body, .snap-content-inner').scrollTop(0);
	},13);


	$('#ng-view').css('-webkit-transform','translate3d(0,0,0)');
	setTimeout(function() {
		$('#ng-view').css('-webkit-transform','');
	},1000);


};
*/


/**
 * scroll to the top of the page
 */
App.scrollTop = function(top) {
	setTimeout(function() {
		if (!top) {
			setTimeout(function() {
				$('html, body, .snap-content-inner').scrollTop(0);
			},10);
		}
		$('html, body, .snap-content-inner').animate({scrollTop: top || 0}, 10, $.easing.easeInOutQuart ? 'easeInOutQuart' : null);
	},3);
};


/**
 * Sends a tracking item to google, or to google ads if its an order
 */
App.track = function() {
	if (App.config.env != 'live') {
		return;
	}

	if (arguments[0] == 'Ordered') {
		$('img.conversion').remove();
		var i = $('<img class="conversion" src="https://www.googleadservices.com/pagead/conversion/996753959/?value=' + Math.floor(arguments[1].total) + '&amp;label=-oawCPHy2gMQp4Sl2wM&amp;guid=ON&amp;script=0&url=' + location.href + '">').appendTo($('body'));
	}

	if ( typeof( ga ) == 'function' ) {
		ga('send', 'event', 'app', arguments[0], arguments[1]);
	}
};


/**
 * controls the busy state of the app
 * @sky-loader
 */
App.busy = {
	_busy: false,
	_timer: null,
	_maxExec: 25000,
	stage: function() {
		$('#Stage').height('100%').width('100%');
		return AdobeEdge.getComposition('EDGE-977700350').getStage();
	},
	isBusy: function() {
		return $('.app-busy').length ? true : false;
		return App.busy._busy;
	},
	makeBusy: function() {
		if (App.busy._timer) {
			clearTimeout(App.busy._timer);
		}
		App.busy._timer = setTimeout(function() {
			App.alert('The app timed out processing your order. We can not determine if the order was placed or not. Please check your previous orders. Sorry!');
			App.busy.unBusy();
		}, App.busy._maxExec);
		return $('body').append($('<div class="app-busy"></div>').append($('<div class="app-busy-loader"><div class="app-busy-loader-icon"></div></div>')));
		App.busy._busy = true;
		$('.order-sky-loader').addClass('play');
		App.busy.stage().play(0);
	},
	unBusy: function() {
		clearTimeout(App.busy._timer);
		return $('.app-busy').remove();
		App.busy._busy = false;
		$('.order-sky-loader').removeClass('play');
		App.busy.stage().stop();
	}
};

/**
 * stuff for testing
 */
App.test = {
	card: function() {
		angular.element( 'html' ).injector().get( 'OrderService' )._test();
	},
	logout: function() {
		$.getJSON(App.service + 'logout',function(){ location.reload()});
	},
	cart: function() {
		App.alert(JSON.stringify(App.cart.items));
	},
	clearloc: function() {
		$.totalStorage('community',null);
		$.totalStorage('location_lat',null);
		$.totalStorage('location_lon',null);
		location.href = '/';
	},
	reload: function() {
		location.reload();
	},
	location: function(){
		var position = angular.element( 'html' ).injector().get( 'PositionsService' );
		var locs = position.locs;
		for( x in locs ){
			var values = [];
			$.each( locs[ x ]._properties, function( key, value ) {
				values.push( key );
				values.push( ': ' );
				values.push( ( value || '-' ) );
				values.push( ' | ' );
				if( key == 'results' ){
					$.each( value, function( position, result ) {
						console.log('result: ' + position,result);
					});
				}
			});
			console.log('Position: ' + x, values.join( '' ) );
		}
	}
};

App.processConfig = function(json, user) {
	if (user && !json) {
		App.config.user = user;
	} else {
		App.config = json;
	}
};

/**
 * global event binding and init
 */
App.init = function(config) {

	// ensure this function cant be called twice. can crash the browser if it does.
	if (App._init) {
		return;
	}
	
	App._init = true;

	$(document).on('touchmove', ($('.is-ui2').get(0) ? '.mfp-wrap' : '.snap-drawers, .mfp-wrap, .support-container'), function(e) {
		e.preventDefault();
		e.stopPropagation();
	});

	// replace normal click events for mobile browsers
	FastClick.attach(document.body);
	
	// add ios7 styles for nav bar and page height
	if (App.isPhoneGap && !App.iOS7()) {
		$('body').removeClass('ios7');
	}
	
	$('body').removeClass('no-init');
	
	// add the side swipe menu for mobile view
	if (typeof Snap !== 'undefined') {

		App.snap = new Snap({
			element: document.getElementById('snap-content'),
			menu: document.getElementById('side-menu'),
			menuDragDistance: 95,
			disable: 'right'
		});

		var snapperCheck = function() {
			if ($(window).width() <= 768) {
				App.snap.enable();
			} else {
				App.snap.close();
				App.snap.disable();
			}
		};
		snapperCheck();
	
		$(window).resize(function() {
			snapperCheck();
		});

	}

	// init the storage type. cookie, or localstorage if phonegap
	$.totalStorage.ls(App.localStorage);
	
	// phonegap
	if (typeof CB !== 'undefined' && CB.config) {
		App.config = CB.config;
		CB.config = null;
	}


	// process the config, and startup angular
	App.processConfig(config || App.config);
	App.NGinit();

	// Init the processor
	var processor = ( App.config.processor && App.config.processor.type ) ? App.config.processor.type : false;
	switch( processor ){
		case 'stripe':
			Stripe.setPublishableKey( App.config.processor.stripe );
			break;
		case 'balanced':
			balanced.init( App.config.processor.balanced );
		break;
		default:
			console.log( 'Processor error::', App.config.processor );
		break;
	}

	window.addEventListener( 'pageshow', function(){ 
		// the first pageshow should be ignored
		if( App._firstPageShowHasHappened ){
			dateTime.reload(); 
		}
		App._firstPageShowHasHappened = true;
	}, false );

	// window.addEventListener( 'pagehide', function(){}, false );

	$(window).trigger('nginit');
	
	/*
	if (!App.isPhoneGap) {
		$(document).mousemove(function(e) {
			if ($('.parallax-bg').length) {
				console.log(e.pageX, e.pageY);
			}
		});
	}
	*/
};

/**
 * dialog functions
 */
App.dialog = {
	show: function() {
		if (arguments[1]) {
			// its a title and message
			var src = '<div class="zoom-anim-dialog small-container">' +
				'<h1>' + arguments[0] + '</h1>' +
				'<div class="small-container-content">' + arguments[1] + '</div>' +
				'</div>';
		} else if ($(arguments[0]).length) {
			// its a dom selector
			var src = $(arguments[0]);
			
			// fix to prevent 2 dialogs from ever appearing. only show the second. #2919
			if (src.length > 1) {
				for (var x = 0; x < src.length - 1; x++) {
					src.get(x).remove();
				}
				var src = $(arguments[0]);
			}

		} else {
			console.log('ERROR WITH DIALOG',arguments);
			return;
		}

		$.magnificPopup.open({
			items: {
				src: src,
				type: 'inline'
			},
			fixedContentPos: true,
			fixedBgPos: true,
			closeBtnInside: true,
			preloader: false,
			midClick: true,
			removalDelay: 300,
			overflowY: 'auto',
			mainClass: 'my-mfp-zoom-in',
			callbacks: {
				open: function() {
					setTimeout(function() {
						if( App.iOS() ){
							// #1774
							var width = angular.element('.mfp-bg').width();
							angular.element('.mfp-bg').width( width + 10 );
						}
					},1);
				},
				close: function() {
					$('.wrapper').removeClass('dialog-open-effect-a dialog-open-effect-b dialog-open-effect-c dialog-open-effect-d');
					App.applyIOSPositionFix();
					App.rootScope.$broadcast( 'modalClosed' );
				}
			}
			//my-mfp-zoom-in
		});
	},
	isOpen : function(){
		return $.magnificPopup && $.magnificPopup.instance && $.magnificPopup.instance.isOpen;
	}
};