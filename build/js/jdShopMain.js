// JavaScript Document

;(function () {
	'use strict';

	/**
	 * @preserve FastClick: polyfill to remove click delays on browsers with touch UIs.
	 *
	 * @codingstandard ftlabs-jsv2
	 * @copyright The Financial Times Limited [All Rights Reserved]
	 * @license MIT License (see LICENSE.txt)
	 */

	/*jslint browser:true, node:true*/
	/*global define, Event, Node*/


	/**
	 * Instantiate fast-clicking listeners on the specified layer.
	 *
	 * @constructor
	 * @param {Element} layer The layer to listen on
	 * @param {Object} [options={}] The options to override the defaults
	 */
	function FastClick(layer, options) {
		var oldOnClick;

		options = options || {};

		/**
		 * Whether a click is currently being tracked.
		 *
		 * @type boolean
		 */
		this.trackingClick = false;


		/**
		 * Timestamp for when click tracking started.
		 *
		 * @type number
		 */
		this.trackingClickStart = 0;


		/**
		 * The element being tracked for a click.
		 *
		 * @type EventTarget
		 */
		this.targetElement = null;


		/**
		 * X-coordinate of touch start event.
		 *
		 * @type number
		 */
		this.touchStartX = 0;


		/**
		 * Y-coordinate of touch start event.
		 *
		 * @type number
		 */
		this.touchStartY = 0;


		/**
		 * ID of the last touch, retrieved from Touch.identifier.
		 *
		 * @type number
		 */
		this.lastTouchIdentifier = 0;


		/**
		 * Touchmove boundary, beyond which a click will be cancelled.
		 *
		 * @type number
		 */
		this.touchBoundary = options.touchBoundary || 10;


		/**
		 * The FastClick layer.
		 *
		 * @type Element
		 */
		this.layer = layer;

		/**
		 * The minimum time between tap(touchstart and touchend) events
		 *
		 * @type number
		 */
		this.tapDelay = options.tapDelay || 200;

		/**
		 * The maximum time for a tap
		 *
		 * @type number
		 */
		this.tapTimeout = options.tapTimeout || 700;

		if (FastClick.notNeeded(layer)) {
			return;
		}

		// Some old versions of Android don't have Function.prototype.bind
		function bind(method, context) {
			return function() { return method.apply(context, arguments); };
		}


		var methods = ['onMouse', 'onClick', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'onTouchCancel'];
		var context = this;
		for (var i = 0, l = methods.length; i < l; i++) {
			context[methods[i]] = bind(context[methods[i]], context);
		}

		// Set up event handlers as required
		if (deviceIsAndroid) {
			layer.addEventListener('mouseover', this.onMouse, true);
			layer.addEventListener('mousedown', this.onMouse, true);
			layer.addEventListener('mouseup', this.onMouse, true);
		}

		layer.addEventListener('click', this.onClick, true);
		layer.addEventListener('touchstart', this.onTouchStart, false);
		layer.addEventListener('touchmove', this.onTouchMove, false);
		layer.addEventListener('touchend', this.onTouchEnd, false);
		layer.addEventListener('touchcancel', this.onTouchCancel, false);

		// Hack is required for browsers that don't support Event#stopImmediatePropagation (e.g. Android 2)
		// which is how FastClick normally stops click events bubbling to callbacks registered on the FastClick
		// layer when they are cancelled.
		if (!Event.prototype.stopImmediatePropagation) {
			layer.removeEventListener = function(type, callback, capture) {
				var rmv = Node.prototype.removeEventListener;
				if (type === 'click') {
					rmv.call(layer, type, callback.hijacked || callback, capture);
				} else {
					rmv.call(layer, type, callback, capture);
				}
			};

			layer.addEventListener = function(type, callback, capture) {
				var adv = Node.prototype.addEventListener;
				if (type === 'click') {
					adv.call(layer, type, callback.hijacked || (callback.hijacked = function(event) {
						if (!event.propagationStopped) {
							callback(event);
						}
					}), capture);
				} else {
					adv.call(layer, type, callback, capture);
				}
			};
		}

		// If a handler is already declared in the element's onclick attribute, it will be fired before
		// FastClick's onClick handler. Fix this by pulling out the user-defined handler function and
		// adding it as listener.
		if (typeof layer.onclick === 'function') {

			// Android browser on at least 3.2 requires a new reference to the function in layer.onclick
			// - the old one won't work if passed to addEventListener directly.
			oldOnClick = layer.onclick;
			layer.addEventListener('click', function(event) {
				oldOnClick(event);
			}, false);
			layer.onclick = null;
		}
	}

	/**
	* Windows Phone 8.1 fakes user agent string to look like Android and iPhone.
	*
	* @type boolean
	*/
	var deviceIsWindowsPhone = navigator.userAgent.indexOf("Windows Phone") >= 0;

	/**
	 * Android requires exceptions.
	 *
	 * @type boolean
	 */
	var deviceIsAndroid = navigator.userAgent.indexOf('Android') > 0 && !deviceIsWindowsPhone;


	/**
	 * iOS requires exceptions.
	 *
	 * @type boolean
	 */
	var deviceIsIOS = /iP(ad|hone|od)/.test(navigator.userAgent) && !deviceIsWindowsPhone;


	/**
	 * iOS 4 requires an exception for select elements.
	 *
	 * @type boolean
	 */
	var deviceIsIOS4 = deviceIsIOS && (/OS 4_\d(_\d)?/).test(navigator.userAgent);


	/**
	 * iOS 6.0-7.* requires the target element to be manually derived
	 *
	 * @type boolean
	 */
	var deviceIsIOSWithBadTarget = deviceIsIOS && (/OS [6-7]_\d/).test(navigator.userAgent);

	/**
	 * BlackBerry requires exceptions.
	 *
	 * @type boolean
	 */
	var deviceIsBlackBerry10 = navigator.userAgent.indexOf('BB10') > 0;

	/**
	 * Determine whether a given element requires a native click.
	 *
	 * @param {EventTarget|Element} target Target DOM element
	 * @returns {boolean} Returns true if the element needs a native click
	 */
	FastClick.prototype.needsClick = function(target) {
		switch (target.nodeName.toLowerCase()) {

		// Don't send a synthetic click to disabled inputs (issue #62)
		case 'button':
		case 'select':
		case 'textarea':
			if (target.disabled) {
				return true;
			}

			break;
		case 'input':

			// File inputs need real clicks on iOS 6 due to a browser bug (issue #68)
			if ((deviceIsIOS && target.type === 'file') || target.disabled) {
				return true;
			}

			break;
		case 'label':
		case 'iframe': // iOS8 homescreen apps can prevent events bubbling into frames
		case 'video':
			return true;
		}

		return (/\bneedsclick\b/).test(target.className);
	};


	/**
	 * Determine whether a given element requires a call to focus to simulate click into element.
	 *
	 * @param {EventTarget|Element} target Target DOM element
	 * @returns {boolean} Returns true if the element requires a call to focus to simulate native click.
	 */
	FastClick.prototype.needsFocus = function(target) {
		switch (target.nodeName.toLowerCase()) {
		case 'textarea':
			return true;
		case 'select':
			return !deviceIsAndroid;
		case 'input':
			switch (target.type) {
			case 'button':
			case 'checkbox':
			case 'file':
			case 'image':
			case 'radio':
			case 'submit':
				return false;
			}

			// No point in attempting to focus disabled inputs
			return !target.disabled && !target.readOnly;
		default:
			return (/\bneedsfocus\b/).test(target.className);
		}
	};


	/**
	 * Send a click event to the specified element.
	 *
	 * @param {EventTarget|Element} targetElement
	 * @param {Event} event
	 */
	FastClick.prototype.sendClick = function(targetElement, event) {
		var clickEvent, touch;

		// On some Android devices activeElement needs to be blurred otherwise the synthetic click will have no effect (#24)
		if (document.activeElement && document.activeElement !== targetElement) {
			document.activeElement.blur();
		}

		touch = event.changedTouches[0];

		// Synthesise a click event, with an extra attribute so it can be tracked
		clickEvent = document.createEvent('MouseEvents');
		clickEvent.initMouseEvent(this.determineEventType(targetElement), true, true, window, 1, touch.screenX, touch.screenY, touch.clientX, touch.clientY, false, false, false, false, 0, null);

		clickEvent.forwardedTouchEvent = true;
		targetElement.dispatchEvent(clickEvent);
	};

	FastClick.prototype.determineEventType = function(targetElement) {

		//Issue #159: Android Chrome Select Box does not open with a synthetic click event
		if (deviceIsAndroid && targetElement.tagName.toLowerCase() === 'select') {
			return 'mousedown';
		}

		return 'click';
	};


	/**
	 * @param {EventTarget|Element} targetElement
	 */
	FastClick.prototype.focus = function(targetElement) {
		var length;

		// Issue #160: on iOS 7, some input elements (e.g. date datetime month) throw a vague TypeError on setSelectionRange. These elements don't have an integer value for the selectionStart and selectionEnd properties, but unfortunately that can't be used for detection because accessing the properties also throws a TypeError. Just check the type instead. Filed as Apple bug #15122724.
		if (deviceIsIOS && targetElement.setSelectionRange && targetElement.type.indexOf('date') !== 0 && targetElement.type !== 'time' && targetElement.type !== 'month') {
			length = targetElement.value.length;
			targetElement.setSelectionRange(length, length);
		} else {
			targetElement.focus();
		}
	};


	/**
	 * Check whether the given target element is a child of a scrollable layer and if so, set a flag on it.
	 *
	 * @param {EventTarget|Element} targetElement
	 */
	FastClick.prototype.updateScrollParent = function(targetElement) {
		var scrollParent, parentElement;

		scrollParent = targetElement.fastClickScrollParent;

		// Attempt to discover whether the target element is contained within a scrollable layer. Re-check if the
		// target element was moved to another parent.
		if (!scrollParent || !scrollParent.contains(targetElement)) {
			parentElement = targetElement;
			do {
				if (parentElement.scrollHeight > parentElement.offsetHeight) {
					scrollParent = parentElement;
					targetElement.fastClickScrollParent = parentElement;
					break;
				}

				parentElement = parentElement.parentElement;
			} while (parentElement);
		}

		// Always update the scroll top tracker if possible.
		if (scrollParent) {
			scrollParent.fastClickLastScrollTop = scrollParent.scrollTop;
		}
	};


	/**
	 * @param {EventTarget} targetElement
	 * @returns {Element|EventTarget}
	 */
	FastClick.prototype.getTargetElementFromEventTarget = function(eventTarget) {

		// On some older browsers (notably Safari on iOS 4.1 - see issue #56) the event target may be a text node.
		if (eventTarget.nodeType === Node.TEXT_NODE) {
			return eventTarget.parentNode;
		}

		return eventTarget;
	};


	/**
	 * On touch start, record the position and scroll offset.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.onTouchStart = function(event) {
		var targetElement, touch, selection;

		// Ignore multiple touches, otherwise pinch-to-zoom is prevented if both fingers are on the FastClick element (issue #111).
		if (event.targetTouches.length > 1) {
			return true;
		}

		targetElement = this.getTargetElementFromEventTarget(event.target);
		touch = event.targetTouches[0];

		if (deviceIsIOS) {

			// Only trusted events will deselect text on iOS (issue #49)
			selection = window.getSelection();
			if (selection.rangeCount && !selection.isCollapsed) {
				return true;
			}

			if (!deviceIsIOS4) {

				// Weird things happen on iOS when an alert or confirm dialog is opened from a click event callback (issue #23):
				// when the user next taps anywhere else on the page, new touchstart and touchend events are dispatched
				// with the same identifier as the touch event that previously triggered the click that triggered the alert.
				// Sadly, there is an issue on iOS 4 that causes some normal touch events to have the same identifier as an
				// immediately preceeding touch event (issue #52), so this fix is unavailable on that platform.
				// Issue 120: touch.identifier is 0 when Chrome dev tools 'Emulate touch events' is set with an iOS device UA string,
				// which causes all touch events to be ignored. As this block only applies to iOS, and iOS identifiers are always long,
				// random integers, it's safe to to continue if the identifier is 0 here.
				if (touch.identifier && touch.identifier === this.lastTouchIdentifier) {
					event.preventDefault();
					return false;
				}

				this.lastTouchIdentifier = touch.identifier;

				// If the target element is a child of a scrollable layer (using -webkit-overflow-scrolling: touch) and:
				// 1) the user does a fling scroll on the scrollable layer
				// 2) the user stops the fling scroll with another tap
				// then the event.target of the last 'touchend' event will be the element that was under the user's finger
				// when the fling scroll was started, causing FastClick to send a click event to that layer - unless a check
				// is made to ensure that a parent layer was not scrolled before sending a synthetic click (issue #42).
				this.updateScrollParent(targetElement);
			}
		}

		this.trackingClick = true;
		this.trackingClickStart = event.timeStamp;
		this.targetElement = targetElement;

		this.touchStartX = touch.pageX;
		this.touchStartY = touch.pageY;

		// Prevent phantom clicks on fast double-tap (issue #36)
		if ((event.timeStamp - this.lastClickTime) < this.tapDelay) {
			event.preventDefault();
		}

		return true;
	};


	/**
	 * Based on a touchmove event object, check whether the touch has moved past a boundary since it started.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.touchHasMoved = function(event) {
		var touch = event.changedTouches[0], boundary = this.touchBoundary;

		if (Math.abs(touch.pageX - this.touchStartX) > boundary || Math.abs(touch.pageY - this.touchStartY) > boundary) {
			return true;
		}

		return false;
	};


	/**
	 * Update the last position.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.onTouchMove = function(event) {
		if (!this.trackingClick) {
			return true;
		}

		// If the touch has moved, cancel the click tracking
		if (this.targetElement !== this.getTargetElementFromEventTarget(event.target) || this.touchHasMoved(event)) {
			this.trackingClick = false;
			this.targetElement = null;
		}

		return true;
	};


	/**
	 * Attempt to find the labelled control for the given label element.
	 *
	 * @param {EventTarget|HTMLLabelElement} labelElement
	 * @returns {Element|null}
	 */
	FastClick.prototype.findControl = function(labelElement) {

		// Fast path for newer browsers supporting the HTML5 control attribute
		if (labelElement.control !== undefined) {
			return labelElement.control;
		}

		// All browsers under test that support touch events also support the HTML5 htmlFor attribute
		if (labelElement.htmlFor) {
			return document.getElementById(labelElement.htmlFor);
		}

		// If no for attribute exists, attempt to retrieve the first labellable descendant element
		// the list of which is defined here: http://www.w3.org/TR/html5/forms.html#category-label
		return labelElement.querySelector('button, input:not([type=hidden]), keygen, meter, output, progress, select, textarea');
	};


	/**
	 * On touch end, determine whether to send a click event at once.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.onTouchEnd = function(event) {
		var forElement, trackingClickStart, targetTagName, scrollParent, touch, targetElement = this.targetElement;

		if (!this.trackingClick) {
			return true;
		}

		// Prevent phantom clicks on fast double-tap (issue #36)
		if ((event.timeStamp - this.lastClickTime) < this.tapDelay) {
			this.cancelNextClick = true;
			return true;
		}

		if ((event.timeStamp - this.trackingClickStart) > this.tapTimeout) {
			return true;
		}

		// Reset to prevent wrong click cancel on input (issue #156).
		this.cancelNextClick = false;

		this.lastClickTime = event.timeStamp;

		trackingClickStart = this.trackingClickStart;
		this.trackingClick = false;
		this.trackingClickStart = 0;

		// On some iOS devices, the targetElement supplied with the event is invalid if the layer
		// is performing a transition or scroll, and has to be re-detected manually. Note that
		// for this to function correctly, it must be called *after* the event target is checked!
		// See issue #57; also filed as rdar://13048589 .
		if (deviceIsIOSWithBadTarget) {
			touch = event.changedTouches[0];

			// In certain cases arguments of elementFromPoint can be negative, so prevent setting targetElement to null
			targetElement = document.elementFromPoint(touch.pageX - window.pageXOffset, touch.pageY - window.pageYOffset) || targetElement;
			targetElement.fastClickScrollParent = this.targetElement.fastClickScrollParent;
		}

		targetTagName = targetElement.tagName.toLowerCase();
		if (targetTagName === 'label') {
			forElement = this.findControl(targetElement);
			if (forElement) {
				this.focus(targetElement);
				if (deviceIsAndroid) {
					return false;
				}

				targetElement = forElement;
			}
		} else if (this.needsFocus(targetElement)) {

			// Case 1: If the touch started a while ago (best guess is 100ms based on tests for issue #36) then focus will be triggered anyway. Return early and unset the target element reference so that the subsequent click will be allowed through.
			// Case 2: Without this exception for input elements tapped when the document is contained in an iframe, then any inputted text won't be visible even though the value attribute is updated as the user types (issue #37).
			if ((event.timeStamp - trackingClickStart) > 100 || (deviceIsIOS && window.top !== window && targetTagName === 'input')) {
				this.targetElement = null;
				return false;
			}

			this.focus(targetElement);
			this.sendClick(targetElement, event);

			// Select elements need the event to go through on iOS 4, otherwise the selector menu won't open.
			// Also this breaks opening selects when VoiceOver is active on iOS6, iOS7 (and possibly others)
			if (!deviceIsIOS || targetTagName !== 'select') {
				this.targetElement = null;
				event.preventDefault();
			}

			return false;
		}

		if (deviceIsIOS && !deviceIsIOS4) {

			// Don't send a synthetic click event if the target element is contained within a parent layer that was scrolled
			// and this tap is being used to stop the scrolling (usually initiated by a fling - issue #42).
			scrollParent = targetElement.fastClickScrollParent;
			if (scrollParent && scrollParent.fastClickLastScrollTop !== scrollParent.scrollTop) {
				return true;
			}
		}

		// Prevent the actual click from going though - unless the target node is marked as requiring
		// real clicks or if it is in the whitelist in which case only non-programmatic clicks are permitted.
		if (!this.needsClick(targetElement)) {
			event.preventDefault();
			this.sendClick(targetElement, event);
		}

		return false;
	};


	/**
	 * On touch cancel, stop tracking the click.
	 *
	 * @returns {void}
	 */
	FastClick.prototype.onTouchCancel = function() {
		this.trackingClick = false;
		this.targetElement = null;
	};


	/**
	 * Determine mouse events which should be permitted.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.onMouse = function(event) {

		// If a target element was never set (because a touch event was never fired) allow the event
		if (!this.targetElement) {
			return true;
		}

		if (event.forwardedTouchEvent) {
			return true;
		}

		// Programmatically generated events targeting a specific element should be permitted
		if (!event.cancelable) {
			return true;
		}

		// Derive and check the target element to see whether the mouse event needs to be permitted;
		// unless explicitly enabled, prevent non-touch click events from triggering actions,
		// to prevent ghost/doubleclicks.
		if (!this.needsClick(this.targetElement) || this.cancelNextClick) {

			// Prevent any user-added listeners declared on FastClick element from being fired.
			if (event.stopImmediatePropagation) {
				event.stopImmediatePropagation();
			} else {

				// Part of the hack for browsers that don't support Event#stopImmediatePropagation (e.g. Android 2)
				event.propagationStopped = true;
			}

			// Cancel the event
			event.stopPropagation();
			event.preventDefault();

			return false;
		}

		// If the mouse event is permitted, return true for the action to go through.
		return true;
	};


	/**
	 * On actual clicks, determine whether this is a touch-generated click, a click action occurring
	 * naturally after a delay after a touch (which needs to be cancelled to avoid duplication), or
	 * an actual click which should be permitted.
	 *
	 * @param {Event} event
	 * @returns {boolean}
	 */
	FastClick.prototype.onClick = function(event) {
		var permitted;

		// It's possible for another FastClick-like library delivered with third-party code to fire a click event before FastClick does (issue #44). In that case, set the click-tracking flag back to false and return early. This will cause onTouchEnd to return early.
		if (this.trackingClick) {
			this.targetElement = null;
			this.trackingClick = false;
			return true;
		}

		// Very odd behaviour on iOS (issue #18): if a submit element is present inside a form and the user hits enter in the iOS simulator or clicks the Go button on the pop-up OS keyboard the a kind of 'fake' click event will be triggered with the submit-type input element as the target.
		if (event.target.type === 'submit' && event.detail === 0) {
			return true;
		}

		permitted = this.onMouse(event);

		// Only unset targetElement if the click is not permitted. This will ensure that the check for !targetElement in onMouse fails and the browser's click doesn't go through.
		if (!permitted) {
			this.targetElement = null;
		}

		// If clicks are permitted, return true for the action to go through.
		return permitted;
	};


	/**
	 * Remove all FastClick's event listeners.
	 *
	 * @returns {void}
	 */
	FastClick.prototype.destroy = function() {
		var layer = this.layer;

		if (deviceIsAndroid) {
			layer.removeEventListener('mouseover', this.onMouse, true);
			layer.removeEventListener('mousedown', this.onMouse, true);
			layer.removeEventListener('mouseup', this.onMouse, true);
		}

		layer.removeEventListener('click', this.onClick, true);
		layer.removeEventListener('touchstart', this.onTouchStart, false);
		layer.removeEventListener('touchmove', this.onTouchMove, false);
		layer.removeEventListener('touchend', this.onTouchEnd, false);
		layer.removeEventListener('touchcancel', this.onTouchCancel, false);
	};


	/**
	 * Check whether FastClick is needed.
	 *
	 * @param {Element} layer The layer to listen on
	 */
	FastClick.notNeeded = function(layer) {
		var metaViewport;
		var chromeVersion;
		var blackberryVersion;
		var firefoxVersion;

		// Devices that don't support touch don't need FastClick
		if (typeof window.ontouchstart === 'undefined') {
			return true;
		}

		// Chrome version - zero for other browsers
		chromeVersion = +(/Chrome\/([0-9]+)/.exec(navigator.userAgent) || [,0])[1];

		if (chromeVersion) {

			if (deviceIsAndroid) {
				metaViewport = document.querySelector('meta[name=viewport]');

				if (metaViewport) {
					// Chrome on Android with user-scalable="no" doesn't need FastClick (issue #89)
					if (metaViewport.content.indexOf('user-scalable=no') !== -1) {
						return true;
					}
					// Chrome 32 and above with width=device-width or less don't need FastClick
					if (chromeVersion > 31 && document.documentElement.scrollWidth <= window.outerWidth) {
						return true;
					}
				}

			// Chrome desktop doesn't need FastClick (issue #15)
			} else {
				return true;
			}
		}

		if (deviceIsBlackBerry10) {
			blackberryVersion = navigator.userAgent.match(/Version\/([0-9]*)\.([0-9]*)/);

			// BlackBerry 10.3+ does not require Fastclick library.
			// https://github.com/ftlabs/fastclick/issues/251
			if (blackberryVersion[1] >= 10 && blackberryVersion[2] >= 3) {
				metaViewport = document.querySelector('meta[name=viewport]');

				if (metaViewport) {
					// user-scalable=no eliminates click delay.
					if (metaViewport.content.indexOf('user-scalable=no') !== -1) {
						return true;
					}
					// width=device-width (or less than device-width) eliminates click delay.
					if (document.documentElement.scrollWidth <= window.outerWidth) {
						return true;
					}
				}
			}
		}

		// IE10 with -ms-touch-action: none or manipulation, which disables double-tap-to-zoom (issue #97)
		if (layer.style.msTouchAction === 'none' || layer.style.touchAction === 'manipulation') {
			return true;
		}

		// Firefox version - zero for other browsers
		firefoxVersion = +(/Firefox\/([0-9]+)/.exec(navigator.userAgent) || [,0])[1];

		if (firefoxVersion >= 27) {
			// Firefox 27+ does not have tap delay if the content is not zoomable - https://bugzilla.mozilla.org/show_bug.cgi?id=922896

			metaViewport = document.querySelector('meta[name=viewport]');
			if (metaViewport && (metaViewport.content.indexOf('user-scalable=no') !== -1 || document.documentElement.scrollWidth <= window.outerWidth)) {
				return true;
			}
		}

		// IE11: prefixed -ms-touch-action is no longer supported and it's recomended to use non-prefixed version
		// http://msdn.microsoft.com/en-us/library/windows/apps/Hh767313.aspx
		if (layer.style.touchAction === 'none' || layer.style.touchAction === 'manipulation') {
			return true;
		}

		return false;
	};


	/**
	 * Factory method for creating a FastClick object
	 *
	 * @param {Element} layer The layer to listen on
	 * @param {Object} [options={}] The options to override the defaults
	 */
	FastClick.attach = function(layer, options) {
		return new FastClick(layer, options);
	};


	if (typeof define === 'function' && typeof define.amd === 'object' && define.amd) {

		// AMD. Register as an anonymous module.
		define(function() {
			return FastClick;
		});
	} else if (typeof module !== 'undefined' && module.exports) {
		module.exports = FastClick.attach;
		module.exports.FastClick = FastClick;
	} else {
		window.FastClick = FastClick;
	}
}());


	//优化iphone点击速度
window.addEventListener('load', function() {
  FastClick.attach(document.body);
}, false);



//增加active事件
document.addEventListener('touchstart',function(){},false);

var browser = {
    os: function () {
        var u = navigator.userAgent;
        return {// 操作系统
            linux: !!u.match(/\(X11;( U;)? Linux/i), // Linux
            windows: !!u.match(/Windows/i), // Windows
            android: !!u.match(/Android/i), // Android
            iOS: !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/), // iOS
        };
    }(),
    device: function () {
        var u = navigator.userAgent;
        return {// 设备
            mobile: !!u.match(/AppleWebKit/i), // mobile
            iPhone: !!u.match(/iPhone/i), // iPhone
            iPad: !!u.match(/iPad/i), // iPad
        };
    }(),
    supplier: function () {
        var u = navigator.userAgent;
        return {// 浏览器类型
            qq: !!u.match(/QQ\/\d+/i), // QQ
            wechat: !!u.match(/MicroMessenger/i), // WeChat
            weixin: u.match(/MicroMessenger/i) == 'MicroMessenger',
            ios: u.indexOf('_JFiOS') > -1,
            android: u.indexOf('_jfAndroid') > -1,
            mobile: !!u.match(/AppleWebKit.*Mobile.*/), //是否为移动终端
        };

    }(),
    language: (navigator.browserLanguage || navigator.language).toLowerCase(),

    androidVersion: function () {//判断安卓版本
        var userAgent = navigator.userAgent;
        var index = userAgent.indexOf("Android")
        if (index >= 0) {
            return parseFloat(userAgent.slice(index + 8));

        }
    }(),

    IosVersion: function () {//ios版本
        var str = navigator.userAgent.toLowerCase();
        var ver = str.match(/cpu iphone os (.*?) like mac os/);
        if (!ver) {

            return -1;

        } else {

            return ver[1].replace(/_/g, ".");
        }
    }()
    //browser.supplier.wechat
};

var windowBanEvent = {

    bundling: function () {

        var _self = this;
        //$(window).bind('click touchstart touchmove touchend ', _self.Canceling);//绑定禁止事件

        var allEvent = ['click', 'touchstart', 'touchmove', 'touchend'];

        for (var i = 0; i < allEvent.length; i++) {

            document.body.addEventListener(allEvent[i], _self.Canceling, false);

            addEventListener(allEvent[i], _self.Canceling, false)

        }

    },

    unbundling: function () {

        var _self = this;

        var allEvent = ['click', 'touchstart', 'touchmove', 'touchend'];

        for (var i = 0; i < allEvent.length; i++) {

            document.body.removeEventListener(allEvent[i], _self.Canceling, false);

            removeEventListener(allEvent[i], _self.Canceling, false)

        }

        //$(window).unbind('click touchstart touchmove touchend ', _self.Canceling);//解除绑定事件


    },

    Canceling: function (evt) {

        var evt = evt || window.event; //阻止事件

        if (evt.preventDefault) {

            evt.preventDefault();

            evt.stopPropagation();

        }
        else {

            evt.returnValue = false;

            evt.cancelBubble = true;

        }

    }

};


//增加active事件
document.addEventListener('touchstart', function () {
}, false);


//ios输入框等页面不滑动

if (browser.os.iOS) {//如果当前是IOS系统

    document.addEventListener('touchmove', function () {


        var thisActiveEle = document.activeElement;//当前获取焦点的元素a

        if (thisActiveEle.tagName == 'INPUT') {//如果当前元素是input

            var thisActiveEleType = thisActiveEle.getAttribute('type');//获取当前元素的type属性

            var inputType = ['checkbox', 'radio', 'button', 'image', 'range', 'reset', 'submit', 'week'];//定义type类型不会发生变化的数组

            if (inputType.indexOf(thisActiveEleType) == -1) {//如果当前type类型不存在，则添加Class

                thisActiveEle.blur();
            }

        }


    }, false)


}










/*! jQuery v1.8.3 jquery.com | jquery.org/license */
(function(e,t){function _(e){var t=M[e]={};return v.each(e.split(y),function(e,n){t[n]=!0}),t}function H(e,n,r){if(r===t&&e.nodeType===1){var i="data-"+n.replace(P,"-$1").toLowerCase();r=e.getAttribute(i);if(typeof r=="string"){try{r=r==="true"?!0:r==="false"?!1:r==="null"?null:+r+""===r?+r:D.test(r)?v.parseJSON(r):r}catch(s){}v.data(e,n,r)}else r=t}return r}function B(e){var t;for(t in e){if(t==="data"&&v.isEmptyObject(e[t]))continue;if(t!=="toJSON")return!1}return!0}function et(){return!1}function tt(){return!0}function ut(e){return!e||!e.parentNode||e.parentNode.nodeType===11}function at(e,t){do e=e[t];while(e&&e.nodeType!==1);return e}function ft(e,t,n){t=t||0;if(v.isFunction(t))return v.grep(e,function(e,r){var i=!!t.call(e,r,e);return i===n});if(t.nodeType)return v.grep(e,function(e,r){return e===t===n});if(typeof t=="string"){var r=v.grep(e,function(e){return e.nodeType===1});if(it.test(t))return v.filter(t,r,!n);t=v.filter(t,r)}return v.grep(e,function(e,r){return v.inArray(e,t)>=0===n})}function lt(e){var t=ct.split("|"),n=e.createDocumentFragment();if(n.createElement)while(t.length)n.createElement(t.pop());return n}function Lt(e,t){return e.getElementsByTagName(t)[0]||e.appendChild(e.ownerDocument.createElement(t))}function At(e,t){if(t.nodeType!==1||!v.hasData(e))return;var n,r,i,s=v._data(e),o=v._data(t,s),u=s.events;if(u){delete o.handle,o.events={};for(n in u)for(r=0,i=u[n].length;r<i;r++)v.event.add(t,n,u[n][r])}o.data&&(o.data=v.extend({},o.data))}function Ot(e,t){var n;if(t.nodeType!==1)return;t.clearAttributes&&t.clearAttributes(),t.mergeAttributes&&t.mergeAttributes(e),n=t.nodeName.toLowerCase(),n==="object"?(t.parentNode&&(t.outerHTML=e.outerHTML),v.support.html5Clone&&e.innerHTML&&!v.trim(t.innerHTML)&&(t.innerHTML=e.innerHTML)):n==="input"&&Et.test(e.type)?(t.defaultChecked=t.checked=e.checked,t.value!==e.value&&(t.value=e.value)):n==="option"?t.selected=e.defaultSelected:n==="input"||n==="textarea"?t.defaultValue=e.defaultValue:n==="script"&&t.text!==e.text&&(t.text=e.text),t.removeAttribute(v.expando)}function Mt(e){return typeof e.getElementsByTagName!="undefined"?e.getElementsByTagName("*"):typeof e.querySelectorAll!="undefined"?e.querySelectorAll("*"):[]}function _t(e){Et.test(e.type)&&(e.defaultChecked=e.checked)}function Qt(e,t){if(t in e)return t;var n=t.charAt(0).toUpperCase()+t.slice(1),r=t,i=Jt.length;while(i--){t=Jt[i]+n;if(t in e)return t}return r}function Gt(e,t){return e=t||e,v.css(e,"display")==="none"||!v.contains(e.ownerDocument,e)}function Yt(e,t){var n,r,i=[],s=0,o=e.length;for(;s<o;s++){n=e[s];if(!n.style)continue;i[s]=v._data(n,"olddisplay"),t?(!i[s]&&n.style.display==="none"&&(n.style.display=""),n.style.display===""&&Gt(n)&&(i[s]=v._data(n,"olddisplay",nn(n.nodeName)))):(r=Dt(n,"display"),!i[s]&&r!=="none"&&v._data(n,"olddisplay",r))}for(s=0;s<o;s++){n=e[s];if(!n.style)continue;if(!t||n.style.display==="none"||n.style.display==="")n.style.display=t?i[s]||"":"none"}return e}function Zt(e,t,n){var r=Rt.exec(t);return r?Math.max(0,r[1]-(n||0))+(r[2]||"px"):t}function en(e,t,n,r){var i=n===(r?"border":"content")?4:t==="width"?1:0,s=0;for(;i<4;i+=2)n==="margin"&&(s+=v.css(e,n+$t[i],!0)),r?(n==="content"&&(s-=parseFloat(Dt(e,"padding"+$t[i]))||0),n!=="margin"&&(s-=parseFloat(Dt(e,"border"+$t[i]+"Width"))||0)):(s+=parseFloat(Dt(e,"padding"+$t[i]))||0,n!=="padding"&&(s+=parseFloat(Dt(e,"border"+$t[i]+"Width"))||0));return s}function tn(e,t,n){var r=t==="width"?e.offsetWidth:e.offsetHeight,i=!0,s=v.support.boxSizing&&v.css(e,"boxSizing")==="border-box";if(r<=0||r==null){r=Dt(e,t);if(r<0||r==null)r=e.style[t];if(Ut.test(r))return r;i=s&&(v.support.boxSizingReliable||r===e.style[t]),r=parseFloat(r)||0}return r+en(e,t,n||(s?"border":"content"),i)+"px"}function nn(e){if(Wt[e])return Wt[e];var t=v("<"+e+">").appendTo(i.body),n=t.css("display");t.remove();if(n==="none"||n===""){Pt=i.body.appendChild(Pt||v.extend(i.createElement("iframe"),{frameBorder:0,width:0,height:0}));if(!Ht||!Pt.createElement)Ht=(Pt.contentWindow||Pt.contentDocument).document,Ht.write("<!doctype html><html><body>"),Ht.close();t=Ht.body.appendChild(Ht.createElement(e)),n=Dt(t,"display"),i.body.removeChild(Pt)}return Wt[e]=n,n}function fn(e,t,n,r){var i;if(v.isArray(t))v.each(t,function(t,i){n||sn.test(e)?r(e,i):fn(e+"["+(typeof i=="object"?t:"")+"]",i,n,r)});else if(!n&&v.type(t)==="object")for(i in t)fn(e+"["+i+"]",t[i],n,r);else r(e,t)}function Cn(e){return function(t,n){typeof t!="string"&&(n=t,t="*");var r,i,s,o=t.toLowerCase().split(y),u=0,a=o.length;if(v.isFunction(n))for(;u<a;u++)r=o[u],s=/^\+/.test(r),s&&(r=r.substr(1)||"*"),i=e[r]=e[r]||[],i[s?"unshift":"push"](n)}}function kn(e,n,r,i,s,o){s=s||n.dataTypes[0],o=o||{},o[s]=!0;var u,a=e[s],f=0,l=a?a.length:0,c=e===Sn;for(;f<l&&(c||!u);f++)u=a[f](n,r,i),typeof u=="string"&&(!c||o[u]?u=t:(n.dataTypes.unshift(u),u=kn(e,n,r,i,u,o)));return(c||!u)&&!o["*"]&&(u=kn(e,n,r,i,"*",o)),u}function Ln(e,n){var r,i,s=v.ajaxSettings.flatOptions||{};for(r in n)n[r]!==t&&((s[r]?e:i||(i={}))[r]=n[r]);i&&v.extend(!0,e,i)}function An(e,n,r){var i,s,o,u,a=e.contents,f=e.dataTypes,l=e.responseFields;for(s in l)s in r&&(n[l[s]]=r[s]);while(f[0]==="*")f.shift(),i===t&&(i=e.mimeType||n.getResponseHeader("content-type"));if(i)for(s in a)if(a[s]&&a[s].test(i)){f.unshift(s);break}if(f[0]in r)o=f[0];else{for(s in r){if(!f[0]||e.converters[s+" "+f[0]]){o=s;break}u||(u=s)}o=o||u}if(o)return o!==f[0]&&f.unshift(o),r[o]}function On(e,t){var n,r,i,s,o=e.dataTypes.slice(),u=o[0],a={},f=0;e.dataFilter&&(t=e.dataFilter(t,e.dataType));if(o[1])for(n in e.converters)a[n.toLowerCase()]=e.converters[n];for(;i=o[++f];)if(i!=="*"){if(u!=="*"&&u!==i){n=a[u+" "+i]||a["* "+i];if(!n)for(r in a){s=r.split(" ");if(s[1]===i){n=a[u+" "+s[0]]||a["* "+s[0]];if(n){n===!0?n=a[r]:a[r]!==!0&&(i=s[0],o.splice(f--,0,i));break}}}if(n!==!0)if(n&&e["throws"])t=n(t);else try{t=n(t)}catch(l){return{state:"parsererror",error:n?l:"No conversion from "+u+" to "+i}}}u=i}return{state:"success",data:t}}function Fn(){try{return new e.XMLHttpRequest}catch(t){}}function In(){try{return new e.ActiveXObject("Microsoft.XMLHTTP")}catch(t){}}function $n(){return setTimeout(function(){qn=t},0),qn=v.now()}function Jn(e,t){v.each(t,function(t,n){var r=(Vn[t]||[]).concat(Vn["*"]),i=0,s=r.length;for(;i<s;i++)if(r[i].call(e,t,n))return})}function Kn(e,t,n){var r,i=0,s=0,o=Xn.length,u=v.Deferred().always(function(){delete a.elem}),a=function(){var t=qn||$n(),n=Math.max(0,f.startTime+f.duration-t),r=n/f.duration||0,i=1-r,s=0,o=f.tweens.length;for(;s<o;s++)f.tweens[s].run(i);return u.notifyWith(e,[f,i,n]),i<1&&o?n:(u.resolveWith(e,[f]),!1)},f=u.promise({elem:e,props:v.extend({},t),opts:v.extend(!0,{specialEasing:{}},n),originalProperties:t,originalOptions:n,startTime:qn||$n(),duration:n.duration,tweens:[],createTween:function(t,n,r){var i=v.Tween(e,f.opts,t,n,f.opts.specialEasing[t]||f.opts.easing);return f.tweens.push(i),i},stop:function(t){var n=0,r=t?f.tweens.length:0;for(;n<r;n++)f.tweens[n].run(1);return t?u.resolveWith(e,[f,t]):u.rejectWith(e,[f,t]),this}}),l=f.props;Qn(l,f.opts.specialEasing);for(;i<o;i++){r=Xn[i].call(f,e,l,f.opts);if(r)return r}return Jn(f,l),v.isFunction(f.opts.start)&&f.opts.start.call(e,f),v.fx.timer(v.extend(a,{anim:f,queue:f.opts.queue,elem:e})),f.progress(f.opts.progress).done(f.opts.done,f.opts.complete).fail(f.opts.fail).always(f.opts.always)}function Qn(e,t){var n,r,i,s,o;for(n in e){r=v.camelCase(n),i=t[r],s=e[n],v.isArray(s)&&(i=s[1],s=e[n]=s[0]),n!==r&&(e[r]=s,delete e[n]),o=v.cssHooks[r];if(o&&"expand"in o){s=o.expand(s),delete e[r];for(n in s)n in e||(e[n]=s[n],t[n]=i)}else t[r]=i}}function Gn(e,t,n){var r,i,s,o,u,a,f,l,c,h=this,p=e.style,d={},m=[],g=e.nodeType&&Gt(e);n.queue||(l=v._queueHooks(e,"fx"),l.unqueued==null&&(l.unqueued=0,c=l.empty.fire,l.empty.fire=function(){l.unqueued||c()}),l.unqueued++,h.always(function(){h.always(function(){l.unqueued--,v.queue(e,"fx").length||l.empty.fire()})})),e.nodeType===1&&("height"in t||"width"in t)&&(n.overflow=[p.overflow,p.overflowX,p.overflowY],v.css(e,"display")==="inline"&&v.css(e,"float")==="none"&&(!v.support.inlineBlockNeedsLayout||nn(e.nodeName)==="inline"?p.display="inline-block":p.zoom=1)),n.overflow&&(p.overflow="hidden",v.support.shrinkWrapBlocks||h.done(function(){p.overflow=n.overflow[0],p.overflowX=n.overflow[1],p.overflowY=n.overflow[2]}));for(r in t){s=t[r];if(Un.exec(s)){delete t[r],a=a||s==="toggle";if(s===(g?"hide":"show"))continue;m.push(r)}}o=m.length;if(o){u=v._data(e,"fxshow")||v._data(e,"fxshow",{}),"hidden"in u&&(g=u.hidden),a&&(u.hidden=!g),g?v(e).show():h.done(function(){v(e).hide()}),h.done(function(){var t;v.removeData(e,"fxshow",!0);for(t in d)v.style(e,t,d[t])});for(r=0;r<o;r++)i=m[r],f=h.createTween(i,g?u[i]:0),d[i]=u[i]||v.style(e,i),i in u||(u[i]=f.start,g&&(f.end=f.start,f.start=i==="width"||i==="height"?1:0))}}function Yn(e,t,n,r,i){return new Yn.prototype.init(e,t,n,r,i)}function Zn(e,t){var n,r={height:e},i=0;t=t?1:0;for(;i<4;i+=2-t)n=$t[i],r["margin"+n]=r["padding"+n]=e;return t&&(r.opacity=r.width=e),r}function tr(e){return v.isWindow(e)?e:e.nodeType===9?e.defaultView||e.parentWindow:!1}var n,r,i=e.document,s=e.location,o=e.navigator,u=e.jQuery,a=e.$,f=Array.prototype.push,l=Array.prototype.slice,c=Array.prototype.indexOf,h=Object.prototype.toString,p=Object.prototype.hasOwnProperty,d=String.prototype.trim,v=function(e,t){return new v.fn.init(e,t,n)},m=/[\-+]?(?:\d*\.|)\d+(?:[eE][\-+]?\d+|)/.source,g=/\S/,y=/\s+/,b=/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,w=/^(?:[^#<]*(<[\w\W]+>)[^>]*$|#([\w\-]*)$)/,E=/^<(\w+)\s*\/?>(?:<\/\1>|)$/,S=/^[\],:{}\s]*$/,x=/(?:^|:|,)(?:\s*\[)+/g,T=/\\(?:["\\\/bfnrt]|u[\da-fA-F]{4})/g,N=/"[^"\\\r\n]*"|true|false|null|-?(?:\d\d*\.|)\d+(?:[eE][\-+]?\d+|)/g,C=/^-ms-/,k=/-([\da-z])/gi,L=function(e,t){return(t+"").toUpperCase()},A=function(){i.addEventListener?(i.removeEventListener("DOMContentLoaded",A,!1),v.ready()):i.readyState==="complete"&&(i.detachEvent("onreadystatechange",A),v.ready())},O={};v.fn=v.prototype={constructor:v,init:function(e,n,r){var s,o,u,a;if(!e)return this;if(e.nodeType)return this.context=this[0]=e,this.length=1,this;if(typeof e=="string"){e.charAt(0)==="<"&&e.charAt(e.length-1)===">"&&e.length>=3?s=[null,e,null]:s=w.exec(e);if(s&&(s[1]||!n)){if(s[1])return n=n instanceof v?n[0]:n,a=n&&n.nodeType?n.ownerDocument||n:i,e=v.parseHTML(s[1],a,!0),E.test(s[1])&&v.isPlainObject(n)&&this.attr.call(e,n,!0),v.merge(this,e);o=i.getElementById(s[2]);if(o&&o.parentNode){if(o.id!==s[2])return r.find(e);this.length=1,this[0]=o}return this.context=i,this.selector=e,this}return!n||n.jquery?(n||r).find(e):this.constructor(n).find(e)}return v.isFunction(e)?r.ready(e):(e.selector!==t&&(this.selector=e.selector,this.context=e.context),v.makeArray(e,this))},selector:"",jquery:"1.8.3",length:0,size:function(){return this.length},toArray:function(){return l.call(this)},get:function(e){return e==null?this.toArray():e<0?this[this.length+e]:this[e]},pushStack:function(e,t,n){var r=v.merge(this.constructor(),e);return r.prevObject=this,r.context=this.context,t==="find"?r.selector=this.selector+(this.selector?" ":"")+n:t&&(r.selector=this.selector+"."+t+"("+n+")"),r},each:function(e,t){return v.each(this,e,t)},ready:function(e){return v.ready.promise().done(e),this},eq:function(e){return e=+e,e===-1?this.slice(e):this.slice(e,e+1)},first:function(){return this.eq(0)},last:function(){return this.eq(-1)},slice:function(){return this.pushStack(l.apply(this,arguments),"slice",l.call(arguments).join(","))},map:function(e){return this.pushStack(v.map(this,function(t,n){return e.call(t,n,t)}))},end:function(){return this.prevObject||this.constructor(null)},push:f,sort:[].sort,splice:[].splice},v.fn.init.prototype=v.fn,v.extend=v.fn.extend=function(){var e,n,r,i,s,o,u=arguments[0]||{},a=1,f=arguments.length,l=!1;typeof u=="boolean"&&(l=u,u=arguments[1]||{},a=2),typeof u!="object"&&!v.isFunction(u)&&(u={}),f===a&&(u=this,--a);for(;a<f;a++)if((e=arguments[a])!=null)for(n in e){r=u[n],i=e[n];if(u===i)continue;l&&i&&(v.isPlainObject(i)||(s=v.isArray(i)))?(s?(s=!1,o=r&&v.isArray(r)?r:[]):o=r&&v.isPlainObject(r)?r:{},u[n]=v.extend(l,o,i)):i!==t&&(u[n]=i)}return u},v.extend({noConflict:function(t){return e.$===v&&(e.$=a),t&&e.jQuery===v&&(e.jQuery=u),v},isReady:!1,readyWait:1,holdReady:function(e){e?v.readyWait++:v.ready(!0)},ready:function(e){if(e===!0?--v.readyWait:v.isReady)return;if(!i.body)return setTimeout(v.ready,1);v.isReady=!0;if(e!==!0&&--v.readyWait>0)return;r.resolveWith(i,[v]),v.fn.trigger&&v(i).trigger("ready").off("ready")},isFunction:function(e){return v.type(e)==="function"},isArray:Array.isArray||function(e){return v.type(e)==="array"},isWindow:function(e){return e!=null&&e==e.window},isNumeric:function(e){return!isNaN(parseFloat(e))&&isFinite(e)},type:function(e){return e==null?String(e):O[h.call(e)]||"object"},isPlainObject:function(e){if(!e||v.type(e)!=="object"||e.nodeType||v.isWindow(e))return!1;try{if(e.constructor&&!p.call(e,"constructor")&&!p.call(e.constructor.prototype,"isPrototypeOf"))return!1}catch(n){return!1}var r;for(r in e);return r===t||p.call(e,r)},isEmptyObject:function(e){var t;for(t in e)return!1;return!0},error:function(e){throw new Error(e)},parseHTML:function(e,t,n){var r;return!e||typeof e!="string"?null:(typeof t=="boolean"&&(n=t,t=0),t=t||i,(r=E.exec(e))?[t.createElement(r[1])]:(r=v.buildFragment([e],t,n?null:[]),v.merge([],(r.cacheable?v.clone(r.fragment):r.fragment).childNodes)))},parseJSON:function(t){if(!t||typeof t!="string")return null;t=v.trim(t);if(e.JSON&&e.JSON.parse)return e.JSON.parse(t);if(S.test(t.replace(T,"@").replace(N,"]").replace(x,"")))return(new Function("return "+t))();v.error("Invalid JSON: "+t)},parseXML:function(n){var r,i;if(!n||typeof n!="string")return null;try{e.DOMParser?(i=new DOMParser,r=i.parseFromString(n,"text/xml")):(r=new ActiveXObject("Microsoft.XMLDOM"),r.async="false",r.loadXML(n))}catch(s){r=t}return(!r||!r.documentElement||r.getElementsByTagName("parsererror").length)&&v.error("Invalid XML: "+n),r},noop:function(){},globalEval:function(t){t&&g.test(t)&&(e.execScript||function(t){e.eval.call(e,t)})(t)},camelCase:function(e){return e.replace(C,"ms-").replace(k,L)},nodeName:function(e,t){return e.nodeName&&e.nodeName.toLowerCase()===t.toLowerCase()},each:function(e,n,r){var i,s=0,o=e.length,u=o===t||v.isFunction(e);if(r){if(u){for(i in e)if(n.apply(e[i],r)===!1)break}else for(;s<o;)if(n.apply(e[s++],r)===!1)break}else if(u){for(i in e)if(n.call(e[i],i,e[i])===!1)break}else for(;s<o;)if(n.call(e[s],s,e[s++])===!1)break;return e},trim:d&&!d.call("\ufeff\u00a0")?function(e){return e==null?"":d.call(e)}:function(e){return e==null?"":(e+"").replace(b,"")},makeArray:function(e,t){var n,r=t||[];return e!=null&&(n=v.type(e),e.length==null||n==="string"||n==="function"||n==="regexp"||v.isWindow(e)?f.call(r,e):v.merge(r,e)),r},inArray:function(e,t,n){var r;if(t){if(c)return c.call(t,e,n);r=t.length,n=n?n<0?Math.max(0,r+n):n:0;for(;n<r;n++)if(n in t&&t[n]===e)return n}return-1},merge:function(e,n){var r=n.length,i=e.length,s=0;if(typeof r=="number")for(;s<r;s++)e[i++]=n[s];else while(n[s]!==t)e[i++]=n[s++];return e.length=i,e},grep:function(e,t,n){var r,i=[],s=0,o=e.length;n=!!n;for(;s<o;s++)r=!!t(e[s],s),n!==r&&i.push(e[s]);return i},map:function(e,n,r){var i,s,o=[],u=0,a=e.length,f=e instanceof v||a!==t&&typeof a=="number"&&(a>0&&e[0]&&e[a-1]||a===0||v.isArray(e));if(f)for(;u<a;u++)i=n(e[u],u,r),i!=null&&(o[o.length]=i);else for(s in e)i=n(e[s],s,r),i!=null&&(o[o.length]=i);return o.concat.apply([],o)},guid:1,proxy:function(e,n){var r,i,s;return typeof n=="string"&&(r=e[n],n=e,e=r),v.isFunction(e)?(i=l.call(arguments,2),s=function(){return e.apply(n,i.concat(l.call(arguments)))},s.guid=e.guid=e.guid||v.guid++,s):t},access:function(e,n,r,i,s,o,u){var a,f=r==null,l=0,c=e.length;if(r&&typeof r=="object"){for(l in r)v.access(e,n,l,r[l],1,o,i);s=1}else if(i!==t){a=u===t&&v.isFunction(i),f&&(a?(a=n,n=function(e,t,n){return a.call(v(e),n)}):(n.call(e,i),n=null));if(n)for(;l<c;l++)n(e[l],r,a?i.call(e[l],l,n(e[l],r)):i,u);s=1}return s?e:f?n.call(e):c?n(e[0],r):o},now:function(){return(new Date).getTime()}}),v.ready.promise=function(t){if(!r){r=v.Deferred();if(i.readyState==="complete")setTimeout(v.ready,1);else if(i.addEventListener)i.addEventListener("DOMContentLoaded",A,!1),e.addEventListener("load",v.ready,!1);else{i.attachEvent("onreadystatechange",A),e.attachEvent("onload",v.ready);var n=!1;try{n=e.frameElement==null&&i.documentElement}catch(s){}n&&n.doScroll&&function o(){if(!v.isReady){try{n.doScroll("left")}catch(e){return setTimeout(o,50)}v.ready()}}()}}return r.promise(t)},v.each("Boolean Number String Function Array Date RegExp Object".split(" "),function(e,t){O["[object "+t+"]"]=t.toLowerCase()}),n=v(i);var M={};v.Callbacks=function(e){e=typeof e=="string"?M[e]||_(e):v.extend({},e);var n,r,i,s,o,u,a=[],f=!e.once&&[],l=function(t){n=e.memory&&t,r=!0,u=s||0,s=0,o=a.length,i=!0;for(;a&&u<o;u++)if(a[u].apply(t[0],t[1])===!1&&e.stopOnFalse){n=!1;break}i=!1,a&&(f?f.length&&l(f.shift()):n?a=[]:c.disable())},c={add:function(){if(a){var t=a.length;(function r(t){v.each(t,function(t,n){var i=v.type(n);i==="function"?(!e.unique||!c.has(n))&&a.push(n):n&&n.length&&i!=="string"&&r(n)})})(arguments),i?o=a.length:n&&(s=t,l(n))}return this},remove:function(){return a&&v.each(arguments,function(e,t){var n;while((n=v.inArray(t,a,n))>-1)a.splice(n,1),i&&(n<=o&&o--,n<=u&&u--)}),this},has:function(e){return v.inArray(e,a)>-1},empty:function(){return a=[],this},disable:function(){return a=f=n=t,this},disabled:function(){return!a},lock:function(){return f=t,n||c.disable(),this},locked:function(){return!f},fireWith:function(e,t){return t=t||[],t=[e,t.slice?t.slice():t],a&&(!r||f)&&(i?f.push(t):l(t)),this},fire:function(){return c.fireWith(this,arguments),this},fired:function(){return!!r}};return c},v.extend({Deferred:function(e){var t=[["resolve","done",v.Callbacks("once memory"),"resolved"],["reject","fail",v.Callbacks("once memory"),"rejected"],["notify","progress",v.Callbacks("memory")]],n="pending",r={state:function(){return n},always:function(){return i.done(arguments).fail(arguments),this},then:function(){var e=arguments;return v.Deferred(function(n){v.each(t,function(t,r){var s=r[0],o=e[t];i[r[1]](v.isFunction(o)?function(){var e=o.apply(this,arguments);e&&v.isFunction(e.promise)?e.promise().done(n.resolve).fail(n.reject).progress(n.notify):n[s+"With"](this===i?n:this,[e])}:n[s])}),e=null}).promise()},promise:function(e){return e!=null?v.extend(e,r):r}},i={};return r.pipe=r.then,v.each(t,function(e,s){var o=s[2],u=s[3];r[s[1]]=o.add,u&&o.add(function(){n=u},t[e^1][2].disable,t[2][2].lock),i[s[0]]=o.fire,i[s[0]+"With"]=o.fireWith}),r.promise(i),e&&e.call(i,i),i},when:function(e){var t=0,n=l.call(arguments),r=n.length,i=r!==1||e&&v.isFunction(e.promise)?r:0,s=i===1?e:v.Deferred(),o=function(e,t,n){return function(r){t[e]=this,n[e]=arguments.length>1?l.call(arguments):r,n===u?s.notifyWith(t,n):--i||s.resolveWith(t,n)}},u,a,f;if(r>1){u=new Array(r),a=new Array(r),f=new Array(r);for(;t<r;t++)n[t]&&v.isFunction(n[t].promise)?n[t].promise().done(o(t,f,n)).fail(s.reject).progress(o(t,a,u)):--i}return i||s.resolveWith(f,n),s.promise()}}),v.support=function(){var t,n,r,s,o,u,a,f,l,c,h,p=i.createElement("div");p.setAttribute("className","t"),p.innerHTML="  <link/><table></table><a href='/a'>a</a><input type='checkbox'/>",n=p.getElementsByTagName("*"),r=p.getElementsByTagName("a")[0];if(!n||!r||!n.length)return{};s=i.createElement("select"),o=s.appendChild(i.createElement("option")),u=p.getElementsByTagName("input")[0],r.style.cssText="top:1px;float:left;opacity:.5",t={leadingWhitespace:p.firstChild.nodeType===3,tbody:!p.getElementsByTagName("tbody").length,htmlSerialize:!!p.getElementsByTagName("link").length,style:/top/.test(r.getAttribute("style")),hrefNormalized:r.getAttribute("href")==="/a",opacity:/^0.5/.test(r.style.opacity),cssFloat:!!r.style.cssFloat,checkOn:u.value==="on",optSelected:o.selected,getSetAttribute:p.className!=="t",enctype:!!i.createElement("form").enctype,html5Clone:i.createElement("nav").cloneNode(!0).outerHTML!=="<:nav></:nav>",boxModel:i.compatMode==="CSS1Compat",submitBubbles:!0,changeBubbles:!0,focusinBubbles:!1,deleteExpando:!0,noCloneEvent:!0,inlineBlockNeedsLayout:!1,shrinkWrapBlocks:!1,reliableMarginRight:!0,boxSizingReliable:!0,pixelPosition:!1},u.checked=!0,t.noCloneChecked=u.cloneNode(!0).checked,s.disabled=!0,t.optDisabled=!o.disabled;try{delete p.test}catch(d){t.deleteExpando=!1}!p.addEventListener&&p.attachEvent&&p.fireEvent&&(p.attachEvent("onclick",h=function(){t.noCloneEvent=!1}),p.cloneNode(!0).fireEvent("onclick"),p.detachEvent("onclick",h)),u=i.createElement("input"),u.value="t",u.setAttribute("type","radio"),t.radioValue=u.value==="t",u.setAttribute("checked","checked"),u.setAttribute("name","t"),p.appendChild(u),a=i.createDocumentFragment(),a.appendChild(p.lastChild),t.checkClone=a.cloneNode(!0).cloneNode(!0).lastChild.checked,t.appendChecked=u.checked,a.removeChild(u),a.appendChild(p);if(p.attachEvent)for(l in{submit:!0,change:!0,focusin:!0})f="on"+l,c=f in p,c||(p.setAttribute(f,"return;"),c=typeof p[f]=="function"),t[l+"Bubbles"]=c;return v(function(){var n,r,s,o,u="padding:0;margin:0;border:0;display:block;overflow:hidden;",a=i.getElementsByTagName("body")[0];if(!a)return;n=i.createElement("div"),n.style.cssText="visibility:hidden;border:0;width:0;height:0;position:static;top:0;margin-top:1px",a.insertBefore(n,a.firstChild),r=i.createElement("div"),n.appendChild(r),r.innerHTML="<table><tr><td></td><td>t</td></tr></table>",s=r.getElementsByTagName("td"),s[0].style.cssText="padding:0;margin:0;border:0;display:none",c=s[0].offsetHeight===0,s[0].style.display="",s[1].style.display="none",t.reliableHiddenOffsets=c&&s[0].offsetHeight===0,r.innerHTML="",r.style.cssText="box-sizing:border-box;-moz-box-sizing:border-box;-webkit-box-sizing:border-box;padding:1px;border:1px;display:block;width:4px;margin-top:1%;position:absolute;top:1%;",t.boxSizing=r.offsetWidth===4,t.doesNotIncludeMarginInBodyOffset=a.offsetTop!==1,e.getComputedStyle&&(t.pixelPosition=(e.getComputedStyle(r,null)||{}).top!=="1%",t.boxSizingReliable=(e.getComputedStyle(r,null)||{width:"4px"}).width==="4px",o=i.createElement("div"),o.style.cssText=r.style.cssText=u,o.style.marginRight=o.style.width="0",r.style.width="1px",r.appendChild(o),t.reliableMarginRight=!parseFloat((e.getComputedStyle(o,null)||{}).marginRight)),typeof r.style.zoom!="undefined"&&(r.innerHTML="",r.style.cssText=u+"width:1px;padding:1px;display:inline;zoom:1",t.inlineBlockNeedsLayout=r.offsetWidth===3,r.style.display="block",r.style.overflow="visible",r.innerHTML="<div></div>",r.firstChild.style.width="5px",t.shrinkWrapBlocks=r.offsetWidth!==3,n.style.zoom=1),a.removeChild(n),n=r=s=o=null}),a.removeChild(p),n=r=s=o=u=a=p=null,t}();var D=/(?:\{[\s\S]*\}|\[[\s\S]*\])$/,P=/([A-Z])/g;v.extend({cache:{},deletedIds:[],uuid:0,expando:"jQuery"+(v.fn.jquery+Math.random()).replace(/\D/g,""),noData:{embed:!0,object:"clsid:D27CDB6E-AE6D-11cf-96B8-444553540000",applet:!0},hasData:function(e){return e=e.nodeType?v.cache[e[v.expando]]:e[v.expando],!!e&&!B(e)},data:function(e,n,r,i){if(!v.acceptData(e))return;var s,o,u=v.expando,a=typeof n=="string",f=e.nodeType,l=f?v.cache:e,c=f?e[u]:e[u]&&u;if((!c||!l[c]||!i&&!l[c].data)&&a&&r===t)return;c||(f?e[u]=c=v.deletedIds.pop()||v.guid++:c=u),l[c]||(l[c]={},f||(l[c].toJSON=v.noop));if(typeof n=="object"||typeof n=="function")i?l[c]=v.extend(l[c],n):l[c].data=v.extend(l[c].data,n);return s=l[c],i||(s.data||(s.data={}),s=s.data),r!==t&&(s[v.camelCase(n)]=r),a?(o=s[n],o==null&&(o=s[v.camelCase(n)])):o=s,o},removeData:function(e,t,n){if(!v.acceptData(e))return;var r,i,s,o=e.nodeType,u=o?v.cache:e,a=o?e[v.expando]:v.expando;if(!u[a])return;if(t){r=n?u[a]:u[a].data;if(r){v.isArray(t)||(t in r?t=[t]:(t=v.camelCase(t),t in r?t=[t]:t=t.split(" ")));for(i=0,s=t.length;i<s;i++)delete r[t[i]];if(!(n?B:v.isEmptyObject)(r))return}}if(!n){delete u[a].data;if(!B(u[a]))return}o?v.cleanData([e],!0):v.support.deleteExpando||u!=u.window?delete u[a]:u[a]=null},_data:function(e,t,n){return v.data(e,t,n,!0)},acceptData:function(e){var t=e.nodeName&&v.noData[e.nodeName.toLowerCase()];return!t||t!==!0&&e.getAttribute("classid")===t}}),v.fn.extend({data:function(e,n){var r,i,s,o,u,a=this[0],f=0,l=null;if(e===t){if(this.length){l=v.data(a);if(a.nodeType===1&&!v._data(a,"parsedAttrs")){s=a.attributes;for(u=s.length;f<u;f++)o=s[f].name,o.indexOf("data-")||(o=v.camelCase(o.substring(5)),H(a,o,l[o]));v._data(a,"parsedAttrs",!0)}}return l}return typeof e=="object"?this.each(function(){v.data(this,e)}):(r=e.split(".",2),r[1]=r[1]?"."+r[1]:"",i=r[1]+"!",v.access(this,function(n){if(n===t)return l=this.triggerHandler("getData"+i,[r[0]]),l===t&&a&&(l=v.data(a,e),l=H(a,e,l)),l===t&&r[1]?this.data(r[0]):l;r[1]=n,this.each(function(){var t=v(this);t.triggerHandler("setData"+i,r),v.data(this,e,n),t.triggerHandler("changeData"+i,r)})},null,n,arguments.length>1,null,!1))},removeData:function(e){return this.each(function(){v.removeData(this,e)})}}),v.extend({queue:function(e,t,n){var r;if(e)return t=(t||"fx")+"queue",r=v._data(e,t),n&&(!r||v.isArray(n)?r=v._data(e,t,v.makeArray(n)):r.push(n)),r||[]},dequeue:function(e,t){t=t||"fx";var n=v.queue(e,t),r=n.length,i=n.shift(),s=v._queueHooks(e,t),o=function(){v.dequeue(e,t)};i==="inprogress"&&(i=n.shift(),r--),i&&(t==="fx"&&n.unshift("inprogress"),delete s.stop,i.call(e,o,s)),!r&&s&&s.empty.fire()},_queueHooks:function(e,t){var n=t+"queueHooks";return v._data(e,n)||v._data(e,n,{empty:v.Callbacks("once memory").add(function(){v.removeData(e,t+"queue",!0),v.removeData(e,n,!0)})})}}),v.fn.extend({queue:function(e,n){var r=2;return typeof e!="string"&&(n=e,e="fx",r--),arguments.length<r?v.queue(this[0],e):n===t?this:this.each(function(){var t=v.queue(this,e,n);v._queueHooks(this,e),e==="fx"&&t[0]!=="inprogress"&&v.dequeue(this,e)})},dequeue:function(e){return this.each(function(){v.dequeue(this,e)})},delay:function(e,t){return e=v.fx?v.fx.speeds[e]||e:e,t=t||"fx",this.queue(t,function(t,n){var r=setTimeout(t,e);n.stop=function(){clearTimeout(r)}})},clearQueue:function(e){return this.queue(e||"fx",[])},promise:function(e,n){var r,i=1,s=v.Deferred(),o=this,u=this.length,a=function(){--i||s.resolveWith(o,[o])};typeof e!="string"&&(n=e,e=t),e=e||"fx";while(u--)r=v._data(o[u],e+"queueHooks"),r&&r.empty&&(i++,r.empty.add(a));return a(),s.promise(n)}});var j,F,I,q=/[\t\r\n]/g,R=/\r/g,U=/^(?:button|input)$/i,z=/^(?:button|input|object|select|textarea)$/i,W=/^a(?:rea|)$/i,X=/^(?:autofocus|autoplay|async|checked|controls|defer|disabled|hidden|loop|multiple|open|readonly|required|scoped|selected)$/i,V=v.support.getSetAttribute;v.fn.extend({attr:function(e,t){return v.access(this,v.attr,e,t,arguments.length>1)},removeAttr:function(e){return this.each(function(){v.removeAttr(this,e)})},prop:function(e,t){return v.access(this,v.prop,e,t,arguments.length>1)},removeProp:function(e){return e=v.propFix[e]||e,this.each(function(){try{this[e]=t,delete this[e]}catch(n){}})},addClass:function(e){var t,n,r,i,s,o,u;if(v.isFunction(e))return this.each(function(t){v(this).addClass(e.call(this,t,this.className))});if(e&&typeof e=="string"){t=e.split(y);for(n=0,r=this.length;n<r;n++){i=this[n];if(i.nodeType===1)if(!i.className&&t.length===1)i.className=e;else{s=" "+i.className+" ";for(o=0,u=t.length;o<u;o++)s.indexOf(" "+t[o]+" ")<0&&(s+=t[o]+" ");i.className=v.trim(s)}}}return this},removeClass:function(e){var n,r,i,s,o,u,a;if(v.isFunction(e))return this.each(function(t){v(this).removeClass(e.call(this,t,this.className))});if(e&&typeof e=="string"||e===t){n=(e||"").split(y);for(u=0,a=this.length;u<a;u++){i=this[u];if(i.nodeType===1&&i.className){r=(" "+i.className+" ").replace(q," ");for(s=0,o=n.length;s<o;s++)while(r.indexOf(" "+n[s]+" ")>=0)r=r.replace(" "+n[s]+" "," ");i.className=e?v.trim(r):""}}}return this},toggleClass:function(e,t){var n=typeof e,r=typeof t=="boolean";return v.isFunction(e)?this.each(function(n){v(this).toggleClass(e.call(this,n,this.className,t),t)}):this.each(function(){if(n==="string"){var i,s=0,o=v(this),u=t,a=e.split(y);while(i=a[s++])u=r?u:!o.hasClass(i),o[u?"addClass":"removeClass"](i)}else if(n==="undefined"||n==="boolean")this.className&&v._data(this,"__className__",this.className),this.className=this.className||e===!1?"":v._data(this,"__className__")||""})},hasClass:function(e){var t=" "+e+" ",n=0,r=this.length;for(;n<r;n++)if(this[n].nodeType===1&&(" "+this[n].className+" ").replace(q," ").indexOf(t)>=0)return!0;return!1},val:function(e){var n,r,i,s=this[0];if(!arguments.length){if(s)return n=v.valHooks[s.type]||v.valHooks[s.nodeName.toLowerCase()],n&&"get"in n&&(r=n.get(s,"value"))!==t?r:(r=s.value,typeof r=="string"?r.replace(R,""):r==null?"":r);return}return i=v.isFunction(e),this.each(function(r){var s,o=v(this);if(this.nodeType!==1)return;i?s=e.call(this,r,o.val()):s=e,s==null?s="":typeof s=="number"?s+="":v.isArray(s)&&(s=v.map(s,function(e){return e==null?"":e+""})),n=v.valHooks[this.type]||v.valHooks[this.nodeName.toLowerCase()];if(!n||!("set"in n)||n.set(this,s,"value")===t)this.value=s})}}),v.extend({valHooks:{option:{get:function(e){var t=e.attributes.value;return!t||t.specified?e.value:e.text}},select:{get:function(e){var t,n,r=e.options,i=e.selectedIndex,s=e.type==="select-one"||i<0,o=s?null:[],u=s?i+1:r.length,a=i<0?u:s?i:0;for(;a<u;a++){n=r[a];if((n.selected||a===i)&&(v.support.optDisabled?!n.disabled:n.getAttribute("disabled")===null)&&(!n.parentNode.disabled||!v.nodeName(n.parentNode,"optgroup"))){t=v(n).val();if(s)return t;o.push(t)}}return o},set:function(e,t){var n=v.makeArray(t);return v(e).find("option").each(function(){this.selected=v.inArray(v(this).val(),n)>=0}),n.length||(e.selectedIndex=-1),n}}},attrFn:{},attr:function(e,n,r,i){var s,o,u,a=e.nodeType;if(!e||a===3||a===8||a===2)return;if(i&&v.isFunction(v.fn[n]))return v(e)[n](r);if(typeof e.getAttribute=="undefined")return v.prop(e,n,r);u=a!==1||!v.isXMLDoc(e),u&&(n=n.toLowerCase(),o=v.attrHooks[n]||(X.test(n)?F:j));if(r!==t){if(r===null){v.removeAttr(e,n);return}return o&&"set"in o&&u&&(s=o.set(e,r,n))!==t?s:(e.setAttribute(n,r+""),r)}return o&&"get"in o&&u&&(s=o.get(e,n))!==null?s:(s=e.getAttribute(n),s===null?t:s)},removeAttr:function(e,t){var n,r,i,s,o=0;if(t&&e.nodeType===1){r=t.split(y);for(;o<r.length;o++)i=r[o],i&&(n=v.propFix[i]||i,s=X.test(i),s||v.attr(e,i,""),e.removeAttribute(V?i:n),s&&n in e&&(e[n]=!1))}},attrHooks:{type:{set:function(e,t){if(U.test(e.nodeName)&&e.parentNode)v.error("type property can't be changed");else if(!v.support.radioValue&&t==="radio"&&v.nodeName(e,"input")){var n=e.value;return e.setAttribute("type",t),n&&(e.value=n),t}}},value:{get:function(e,t){return j&&v.nodeName(e,"button")?j.get(e,t):t in e?e.value:null},set:function(e,t,n){if(j&&v.nodeName(e,"button"))return j.set(e,t,n);e.value=t}}},propFix:{tabindex:"tabIndex",readonly:"readOnly","for":"htmlFor","class":"className",maxlength:"maxLength",cellspacing:"cellSpacing",cellpadding:"cellPadding",rowspan:"rowSpan",colspan:"colSpan",usemap:"useMap",frameborder:"frameBorder",contenteditable:"contentEditable"},prop:function(e,n,r){var i,s,o,u=e.nodeType;if(!e||u===3||u===8||u===2)return;return o=u!==1||!v.isXMLDoc(e),o&&(n=v.propFix[n]||n,s=v.propHooks[n]),r!==t?s&&"set"in s&&(i=s.set(e,r,n))!==t?i:e[n]=r:s&&"get"in s&&(i=s.get(e,n))!==null?i:e[n]},propHooks:{tabIndex:{get:function(e){var n=e.getAttributeNode("tabindex");return n&&n.specified?parseInt(n.value,10):z.test(e.nodeName)||W.test(e.nodeName)&&e.href?0:t}}}}),F={get:function(e,n){var r,i=v.prop(e,n);return i===!0||typeof i!="boolean"&&(r=e.getAttributeNode(n))&&r.nodeValue!==!1?n.toLowerCase():t},set:function(e,t,n){var r;return t===!1?v.removeAttr(e,n):(r=v.propFix[n]||n,r in e&&(e[r]=!0),e.setAttribute(n,n.toLowerCase())),n}},V||(I={name:!0,id:!0,coords:!0},j=v.valHooks.button={get:function(e,n){var r;return r=e.getAttributeNode(n),r&&(I[n]?r.value!=="":r.specified)?r.value:t},set:function(e,t,n){var r=e.getAttributeNode(n);return r||(r=i.createAttribute(n),e.setAttributeNode(r)),r.value=t+""}},v.each(["width","height"],function(e,t){v.attrHooks[t]=v.extend(v.attrHooks[t],{set:function(e,n){if(n==="")return e.setAttribute(t,"auto"),n}})}),v.attrHooks.contenteditable={get:j.get,set:function(e,t,n){t===""&&(t="false"),j.set(e,t,n)}}),v.support.hrefNormalized||v.each(["href","src","width","height"],function(e,n){v.attrHooks[n]=v.extend(v.attrHooks[n],{get:function(e){var r=e.getAttribute(n,2);return r===null?t:r}})}),v.support.style||(v.attrHooks.style={get:function(e){return e.style.cssText.toLowerCase()||t},set:function(e,t){return e.style.cssText=t+""}}),v.support.optSelected||(v.propHooks.selected=v.extend(v.propHooks.selected,{get:function(e){var t=e.parentNode;return t&&(t.selectedIndex,t.parentNode&&t.parentNode.selectedIndex),null}})),v.support.enctype||(v.propFix.enctype="encoding"),v.support.checkOn||v.each(["radio","checkbox"],function(){v.valHooks[this]={get:function(e){return e.getAttribute("value")===null?"on":e.value}}}),v.each(["radio","checkbox"],function(){v.valHooks[this]=v.extend(v.valHooks[this],{set:function(e,t){if(v.isArray(t))return e.checked=v.inArray(v(e).val(),t)>=0}})});var $=/^(?:textarea|input|select)$/i,J=/^([^\.]*|)(?:\.(.+)|)$/,K=/(?:^|\s)hover(\.\S+|)\b/,Q=/^key/,G=/^(?:mouse|contextmenu)|click/,Y=/^(?:focusinfocus|focusoutblur)$/,Z=function(e){return v.event.special.hover?e:e.replace(K,"mouseenter$1 mouseleave$1")};v.event={add:function(e,n,r,i,s){var o,u,a,f,l,c,h,p,d,m,g;if(e.nodeType===3||e.nodeType===8||!n||!r||!(o=v._data(e)))return;r.handler&&(d=r,r=d.handler,s=d.selector),r.guid||(r.guid=v.guid++),a=o.events,a||(o.events=a={}),u=o.handle,u||(o.handle=u=function(e){return typeof v=="undefined"||!!e&&v.event.triggered===e.type?t:v.event.dispatch.apply(u.elem,arguments)},u.elem=e),n=v.trim(Z(n)).split(" ");for(f=0;f<n.length;f++){l=J.exec(n[f])||[],c=l[1],h=(l[2]||"").split(".").sort(),g=v.event.special[c]||{},c=(s?g.delegateType:g.bindType)||c,g=v.event.special[c]||{},p=v.extend({type:c,origType:l[1],data:i,handler:r,guid:r.guid,selector:s,needsContext:s&&v.expr.match.needsContext.test(s),namespace:h.join(".")},d),m=a[c];if(!m){m=a[c]=[],m.delegateCount=0;if(!g.setup||g.setup.call(e,i,h,u)===!1)e.addEventListener?e.addEventListener(c,u,!1):e.attachEvent&&e.attachEvent("on"+c,u)}g.add&&(g.add.call(e,p),p.handler.guid||(p.handler.guid=r.guid)),s?m.splice(m.delegateCount++,0,p):m.push(p),v.event.global[c]=!0}e=null},global:{},remove:function(e,t,n,r,i){var s,o,u,a,f,l,c,h,p,d,m,g=v.hasData(e)&&v._data(e);if(!g||!(h=g.events))return;t=v.trim(Z(t||"")).split(" ");for(s=0;s<t.length;s++){o=J.exec(t[s])||[],u=a=o[1],f=o[2];if(!u){for(u in h)v.event.remove(e,u+t[s],n,r,!0);continue}p=v.event.special[u]||{},u=(r?p.delegateType:p.bindType)||u,d=h[u]||[],l=d.length,f=f?new RegExp("(^|\\.)"+f.split(".").sort().join("\\.(?:.*\\.|)")+"(\\.|$)"):null;for(c=0;c<d.length;c++)m=d[c],(i||a===m.origType)&&(!n||n.guid===m.guid)&&(!f||f.test(m.namespace))&&(!r||r===m.selector||r==="**"&&m.selector)&&(d.splice(c--,1),m.selector&&d.delegateCount--,p.remove&&p.remove.call(e,m));d.length===0&&l!==d.length&&((!p.teardown||p.teardown.call(e,f,g.handle)===!1)&&v.removeEvent(e,u,g.handle),delete h[u])}v.isEmptyObject(h)&&(delete g.handle,v.removeData(e,"events",!0))},customEvent:{getData:!0,setData:!0,changeData:!0},trigger:function(n,r,s,o){if(!s||s.nodeType!==3&&s.nodeType!==8){var u,a,f,l,c,h,p,d,m,g,y=n.type||n,b=[];if(Y.test(y+v.event.triggered))return;y.indexOf("!")>=0&&(y=y.slice(0,-1),a=!0),y.indexOf(".")>=0&&(b=y.split("."),y=b.shift(),b.sort());if((!s||v.event.customEvent[y])&&!v.event.global[y])return;n=typeof n=="object"?n[v.expando]?n:new v.Event(y,n):new v.Event(y),n.type=y,n.isTrigger=!0,n.exclusive=a,n.namespace=b.join("."),n.namespace_re=n.namespace?new RegExp("(^|\\.)"+b.join("\\.(?:.*\\.|)")+"(\\.|$)"):null,h=y.indexOf(":")<0?"on"+y:"";if(!s){u=v.cache;for(f in u)u[f].events&&u[f].events[y]&&v.event.trigger(n,r,u[f].handle.elem,!0);return}n.result=t,n.target||(n.target=s),r=r!=null?v.makeArray(r):[],r.unshift(n),p=v.event.special[y]||{};if(p.trigger&&p.trigger.apply(s,r)===!1)return;m=[[s,p.bindType||y]];if(!o&&!p.noBubble&&!v.isWindow(s)){g=p.delegateType||y,l=Y.test(g+y)?s:s.parentNode;for(c=s;l;l=l.parentNode)m.push([l,g]),c=l;c===(s.ownerDocument||i)&&m.push([c.defaultView||c.parentWindow||e,g])}for(f=0;f<m.length&&!n.isPropagationStopped();f++)l=m[f][0],n.type=m[f][1],d=(v._data(l,"events")||{})[n.type]&&v._data(l,"handle"),d&&d.apply(l,r),d=h&&l[h],d&&v.acceptData(l)&&d.apply&&d.apply(l,r)===!1&&n.preventDefault();return n.type=y,!o&&!n.isDefaultPrevented()&&(!p._default||p._default.apply(s.ownerDocument,r)===!1)&&(y!=="click"||!v.nodeName(s,"a"))&&v.acceptData(s)&&h&&s[y]&&(y!=="focus"&&y!=="blur"||n.target.offsetWidth!==0)&&!v.isWindow(s)&&(c=s[h],c&&(s[h]=null),v.event.triggered=y,s[y](),v.event.triggered=t,c&&(s[h]=c)),n.result}return},dispatch:function(n){n=v.event.fix(n||e.event);var r,i,s,o,u,a,f,c,h,p,d=(v._data(this,"events")||{})[n.type]||[],m=d.delegateCount,g=l.call(arguments),y=!n.exclusive&&!n.namespace,b=v.event.special[n.type]||{},w=[];g[0]=n,n.delegateTarget=this;if(b.preDispatch&&b.preDispatch.call(this,n)===!1)return;if(m&&(!n.button||n.type!=="click"))for(s=n.target;s!=this;s=s.parentNode||this)if(s.disabled!==!0||n.type!=="click"){u={},f=[];for(r=0;r<m;r++)c=d[r],h=c.selector,u[h]===t&&(u[h]=c.needsContext?v(h,this).index(s)>=0:v.find(h,this,null,[s]).length),u[h]&&f.push(c);f.length&&w.push({elem:s,matches:f})}d.length>m&&w.push({elem:this,matches:d.slice(m)});for(r=0;r<w.length&&!n.isPropagationStopped();r++){a=w[r],n.currentTarget=a.elem;for(i=0;i<a.matches.length&&!n.isImmediatePropagationStopped();i++){c=a.matches[i];if(y||!n.namespace&&!c.namespace||n.namespace_re&&n.namespace_re.test(c.namespace))n.data=c.data,n.handleObj=c,o=((v.event.special[c.origType]||{}).handle||c.handler).apply(a.elem,g),o!==t&&(n.result=o,o===!1&&(n.preventDefault(),n.stopPropagation()))}}return b.postDispatch&&b.postDispatch.call(this,n),n.result},props:"attrChange attrName relatedNode srcElement altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),fixHooks:{},keyHooks:{props:"char charCode key keyCode".split(" "),filter:function(e,t){return e.which==null&&(e.which=t.charCode!=null?t.charCode:t.keyCode),e}},mouseHooks:{props:"button buttons clientX clientY fromElement offsetX offsetY pageX pageY screenX screenY toElement".split(" "),filter:function(e,n){var r,s,o,u=n.button,a=n.fromElement;return e.pageX==null&&n.clientX!=null&&(r=e.target.ownerDocument||i,s=r.documentElement,o=r.body,e.pageX=n.clientX+(s&&s.scrollLeft||o&&o.scrollLeft||0)-(s&&s.clientLeft||o&&o.clientLeft||0),e.pageY=n.clientY+(s&&s.scrollTop||o&&o.scrollTop||0)-(s&&s.clientTop||o&&o.clientTop||0)),!e.relatedTarget&&a&&(e.relatedTarget=a===e.target?n.toElement:a),!e.which&&u!==t&&(e.which=u&1?1:u&2?3:u&4?2:0),e}},fix:function(e){if(e[v.expando])return e;var t,n,r=e,s=v.event.fixHooks[e.type]||{},o=s.props?this.props.concat(s.props):this.props;e=v.Event(r);for(t=o.length;t;)n=o[--t],e[n]=r[n];return e.target||(e.target=r.srcElement||i),e.target.nodeType===3&&(e.target=e.target.parentNode),e.metaKey=!!e.metaKey,s.filter?s.filter(e,r):e},special:{load:{noBubble:!0},focus:{delegateType:"focusin"},blur:{delegateType:"focusout"},beforeunload:{setup:function(e,t,n){v.isWindow(this)&&(this.onbeforeunload=n)},teardown:function(e,t){this.onbeforeunload===t&&(this.onbeforeunload=null)}}},simulate:function(e,t,n,r){var i=v.extend(new v.Event,n,{type:e,isSimulated:!0,originalEvent:{}});r?v.event.trigger(i,null,t):v.event.dispatch.call(t,i),i.isDefaultPrevented()&&n.preventDefault()}},v.event.handle=v.event.dispatch,v.removeEvent=i.removeEventListener?function(e,t,n){e.removeEventListener&&e.removeEventListener(t,n,!1)}:function(e,t,n){var r="on"+t;e.detachEvent&&(typeof e[r]=="undefined"&&(e[r]=null),e.detachEvent(r,n))},v.Event=function(e,t){if(!(this instanceof v.Event))return new v.Event(e,t);e&&e.type?(this.originalEvent=e,this.type=e.type,this.isDefaultPrevented=e.defaultPrevented||e.returnValue===!1||e.getPreventDefault&&e.getPreventDefault()?tt:et):this.type=e,t&&v.extend(this,t),this.timeStamp=e&&e.timeStamp||v.now(),this[v.expando]=!0},v.Event.prototype={preventDefault:function(){this.isDefaultPrevented=tt;var e=this.originalEvent;if(!e)return;e.preventDefault?e.preventDefault():e.returnValue=!1},stopPropagation:function(){this.isPropagationStopped=tt;var e=this.originalEvent;if(!e)return;e.stopPropagation&&e.stopPropagation(),e.cancelBubble=!0},stopImmediatePropagation:function(){this.isImmediatePropagationStopped=tt,this.stopPropagation()},isDefaultPrevented:et,isPropagationStopped:et,isImmediatePropagationStopped:et},v.each({mouseenter:"mouseover",mouseleave:"mouseout"},function(e,t){v.event.special[e]={delegateType:t,bindType:t,handle:function(e){var n,r=this,i=e.relatedTarget,s=e.handleObj,o=s.selector;if(!i||i!==r&&!v.contains(r,i))e.type=s.origType,n=s.handler.apply(this,arguments),e.type=t;return n}}}),v.support.submitBubbles||(v.event.special.submit={setup:function(){if(v.nodeName(this,"form"))return!1;v.event.add(this,"click._submit keypress._submit",function(e){var n=e.target,r=v.nodeName(n,"input")||v.nodeName(n,"button")?n.form:t;r&&!v._data(r,"_submit_attached")&&(v.event.add(r,"submit._submit",function(e){e._submit_bubble=!0}),v._data(r,"_submit_attached",!0))})},postDispatch:function(e){e._submit_bubble&&(delete e._submit_bubble,this.parentNode&&!e.isTrigger&&v.event.simulate("submit",this.parentNode,e,!0))},teardown:function(){if(v.nodeName(this,"form"))return!1;v.event.remove(this,"._submit")}}),v.support.changeBubbles||(v.event.special.change={setup:function(){if($.test(this.nodeName)){if(this.type==="checkbox"||this.type==="radio")v.event.add(this,"propertychange._change",function(e){e.originalEvent.propertyName==="checked"&&(this._just_changed=!0)}),v.event.add(this,"click._change",function(e){this._just_changed&&!e.isTrigger&&(this._just_changed=!1),v.event.simulate("change",this,e,!0)});return!1}v.event.add(this,"beforeactivate._change",function(e){var t=e.target;$.test(t.nodeName)&&!v._data(t,"_change_attached")&&(v.event.add(t,"change._change",function(e){this.parentNode&&!e.isSimulated&&!e.isTrigger&&v.event.simulate("change",this.parentNode,e,!0)}),v._data(t,"_change_attached",!0))})},handle:function(e){var t=e.target;if(this!==t||e.isSimulated||e.isTrigger||t.type!=="radio"&&t.type!=="checkbox")return e.handleObj.handler.apply(this,arguments)},teardown:function(){return v.event.remove(this,"._change"),!$.test(this.nodeName)}}),v.support.focusinBubbles||v.each({focus:"focusin",blur:"focusout"},function(e,t){var n=0,r=function(e){v.event.simulate(t,e.target,v.event.fix(e),!0)};v.event.special[t]={setup:function(){n++===0&&i.addEventListener(e,r,!0)},teardown:function(){--n===0&&i.removeEventListener(e,r,!0)}}}),v.fn.extend({on:function(e,n,r,i,s){var o,u;if(typeof e=="object"){typeof n!="string"&&(r=r||n,n=t);for(u in e)this.on(u,n,r,e[u],s);return this}r==null&&i==null?(i=n,r=n=t):i==null&&(typeof n=="string"?(i=r,r=t):(i=r,r=n,n=t));if(i===!1)i=et;else if(!i)return this;return s===1&&(o=i,i=function(e){return v().off(e),o.apply(this,arguments)},i.guid=o.guid||(o.guid=v.guid++)),this.each(function(){v.event.add(this,e,i,r,n)})},one:function(e,t,n,r){return this.on(e,t,n,r,1)},off:function(e,n,r){var i,s;if(e&&e.preventDefault&&e.handleObj)return i=e.handleObj,v(e.delegateTarget).off(i.namespace?i.origType+"."+i.namespace:i.origType,i.selector,i.handler),this;if(typeof e=="object"){for(s in e)this.off(s,n,e[s]);return this}if(n===!1||typeof n=="function")r=n,n=t;return r===!1&&(r=et),this.each(function(){v.event.remove(this,e,r,n)})},bind:function(e,t,n){return this.on(e,null,t,n)},unbind:function(e,t){return this.off(e,null,t)},live:function(e,t,n){return v(this.context).on(e,this.selector,t,n),this},die:function(e,t){return v(this.context).off(e,this.selector||"**",t),this},delegate:function(e,t,n,r){return this.on(t,e,n,r)},undelegate:function(e,t,n){return arguments.length===1?this.off(e,"**"):this.off(t,e||"**",n)},trigger:function(e,t){return this.each(function(){v.event.trigger(e,t,this)})},triggerHandler:function(e,t){if(this[0])return v.event.trigger(e,t,this[0],!0)},toggle:function(e){var t=arguments,n=e.guid||v.guid++,r=0,i=function(n){var i=(v._data(this,"lastToggle"+e.guid)||0)%r;return v._data(this,"lastToggle"+e.guid,i+1),n.preventDefault(),t[i].apply(this,arguments)||!1};i.guid=n;while(r<t.length)t[r++].guid=n;return this.click(i)},hover:function(e,t){return this.mouseenter(e).mouseleave(t||e)}}),v.each("blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error contextmenu".split(" "),function(e,t){v.fn[t]=function(e,n){return n==null&&(n=e,e=null),arguments.length>0?this.on(t,null,e,n):this.trigger(t)},Q.test(t)&&(v.event.fixHooks[t]=v.event.keyHooks),G.test(t)&&(v.event.fixHooks[t]=v.event.mouseHooks)}),function(e,t){function nt(e,t,n,r){n=n||[],t=t||g;var i,s,a,f,l=t.nodeType;if(!e||typeof e!="string")return n;if(l!==1&&l!==9)return[];a=o(t);if(!a&&!r)if(i=R.exec(e))if(f=i[1]){if(l===9){s=t.getElementById(f);if(!s||!s.parentNode)return n;if(s.id===f)return n.push(s),n}else if(t.ownerDocument&&(s=t.ownerDocument.getElementById(f))&&u(t,s)&&s.id===f)return n.push(s),n}else{if(i[2])return S.apply(n,x.call(t.getElementsByTagName(e),0)),n;if((f=i[3])&&Z&&t.getElementsByClassName)return S.apply(n,x.call(t.getElementsByClassName(f),0)),n}return vt(e.replace(j,"$1"),t,n,r,a)}function rt(e){return function(t){var n=t.nodeName.toLowerCase();return n==="input"&&t.type===e}}function it(e){return function(t){var n=t.nodeName.toLowerCase();return(n==="input"||n==="button")&&t.type===e}}function st(e){return N(function(t){return t=+t,N(function(n,r){var i,s=e([],n.length,t),o=s.length;while(o--)n[i=s[o]]&&(n[i]=!(r[i]=n[i]))})})}function ot(e,t,n){if(e===t)return n;var r=e.nextSibling;while(r){if(r===t)return-1;r=r.nextSibling}return 1}function ut(e,t){var n,r,s,o,u,a,f,l=L[d][e+" "];if(l)return t?0:l.slice(0);u=e,a=[],f=i.preFilter;while(u){if(!n||(r=F.exec(u)))r&&(u=u.slice(r[0].length)||u),a.push(s=[]);n=!1;if(r=I.exec(u))s.push(n=new m(r.shift())),u=u.slice(n.length),n.type=r[0].replace(j," ");for(o in i.filter)(r=J[o].exec(u))&&(!f[o]||(r=f[o](r)))&&(s.push(n=new m(r.shift())),u=u.slice(n.length),n.type=o,n.matches=r);if(!n)break}return t?u.length:u?nt.error(e):L(e,a).slice(0)}function at(e,t,r){var i=t.dir,s=r&&t.dir==="parentNode",o=w++;return t.first?function(t,n,r){while(t=t[i])if(s||t.nodeType===1)return e(t,n,r)}:function(t,r,u){if(!u){var a,f=b+" "+o+" ",l=f+n;while(t=t[i])if(s||t.nodeType===1){if((a=t[d])===l)return t.sizset;if(typeof a=="string"&&a.indexOf(f)===0){if(t.sizset)return t}else{t[d]=l;if(e(t,r,u))return t.sizset=!0,t;t.sizset=!1}}}else while(t=t[i])if(s||t.nodeType===1)if(e(t,r,u))return t}}function ft(e){return e.length>1?function(t,n,r){var i=e.length;while(i--)if(!e[i](t,n,r))return!1;return!0}:e[0]}function lt(e,t,n,r,i){var s,o=[],u=0,a=e.length,f=t!=null;for(;u<a;u++)if(s=e[u])if(!n||n(s,r,i))o.push(s),f&&t.push(u);return o}function ct(e,t,n,r,i,s){return r&&!r[d]&&(r=ct(r)),i&&!i[d]&&(i=ct(i,s)),N(function(s,o,u,a){var f,l,c,h=[],p=[],d=o.length,v=s||dt(t||"*",u.nodeType?[u]:u,[]),m=e&&(s||!t)?lt(v,h,e,u,a):v,g=n?i||(s?e:d||r)?[]:o:m;n&&n(m,g,u,a);if(r){f=lt(g,p),r(f,[],u,a),l=f.length;while(l--)if(c=f[l])g[p[l]]=!(m[p[l]]=c)}if(s){if(i||e){if(i){f=[],l=g.length;while(l--)(c=g[l])&&f.push(m[l]=c);i(null,g=[],f,a)}l=g.length;while(l--)(c=g[l])&&(f=i?T.call(s,c):h[l])>-1&&(s[f]=!(o[f]=c))}}else g=lt(g===o?g.splice(d,g.length):g),i?i(null,o,g,a):S.apply(o,g)})}function ht(e){var t,n,r,s=e.length,o=i.relative[e[0].type],u=o||i.relative[" "],a=o?1:0,f=at(function(e){return e===t},u,!0),l=at(function(e){return T.call(t,e)>-1},u,!0),h=[function(e,n,r){return!o&&(r||n!==c)||((t=n).nodeType?f(e,n,r):l(e,n,r))}];for(;a<s;a++)if(n=i.relative[e[a].type])h=[at(ft(h),n)];else{n=i.filter[e[a].type].apply(null,e[a].matches);if(n[d]){r=++a;for(;r<s;r++)if(i.relative[e[r].type])break;return ct(a>1&&ft(h),a>1&&e.slice(0,a-1).join("").replace(j,"$1"),n,a<r&&ht(e.slice(a,r)),r<s&&ht(e=e.slice(r)),r<s&&e.join(""))}h.push(n)}return ft(h)}function pt(e,t){var r=t.length>0,s=e.length>0,o=function(u,a,f,l,h){var p,d,v,m=[],y=0,w="0",x=u&&[],T=h!=null,N=c,C=u||s&&i.find.TAG("*",h&&a.parentNode||a),k=b+=N==null?1:Math.E;T&&(c=a!==g&&a,n=o.el);for(;(p=C[w])!=null;w++){if(s&&p){for(d=0;v=e[d];d++)if(v(p,a,f)){l.push(p);break}T&&(b=k,n=++o.el)}r&&((p=!v&&p)&&y--,u&&x.push(p))}y+=w;if(r&&w!==y){for(d=0;v=t[d];d++)v(x,m,a,f);if(u){if(y>0)while(w--)!x[w]&&!m[w]&&(m[w]=E.call(l));m=lt(m)}S.apply(l,m),T&&!u&&m.length>0&&y+t.length>1&&nt.uniqueSort(l)}return T&&(b=k,c=N),x};return o.el=0,r?N(o):o}function dt(e,t,n){var r=0,i=t.length;for(;r<i;r++)nt(e,t[r],n);return n}function vt(e,t,n,r,s){var o,u,f,l,c,h=ut(e),p=h.length;if(!r&&h.length===1){u=h[0]=h[0].slice(0);if(u.length>2&&(f=u[0]).type==="ID"&&t.nodeType===9&&!s&&i.relative[u[1].type]){t=i.find.ID(f.matches[0].replace($,""),t,s)[0];if(!t)return n;e=e.slice(u.shift().length)}for(o=J.POS.test(e)?-1:u.length-1;o>=0;o--){f=u[o];if(i.relative[l=f.type])break;if(c=i.find[l])if(r=c(f.matches[0].replace($,""),z.test(u[0].type)&&t.parentNode||t,s)){u.splice(o,1),e=r.length&&u.join("");if(!e)return S.apply(n,x.call(r,0)),n;break}}}return a(e,h)(r,t,s,n,z.test(e)),n}function mt(){}var n,r,i,s,o,u,a,f,l,c,h=!0,p="undefined",d=("sizcache"+Math.random()).replace(".",""),m=String,g=e.document,y=g.documentElement,b=0,w=0,E=[].pop,S=[].push,x=[].slice,T=[].indexOf||function(e){var t=0,n=this.length;for(;t<n;t++)if(this[t]===e)return t;return-1},N=function(e,t){return e[d]=t==null||t,e},C=function(){var e={},t=[];return N(function(n,r){return t.push(n)>i.cacheLength&&delete e[t.shift()],e[n+" "]=r},e)},k=C(),L=C(),A=C(),O="[\\x20\\t\\r\\n\\f]",M="(?:\\\\.|[-\\w]|[^\\x00-\\xa0])+",_=M.replace("w","w#"),D="([*^$|!~]?=)",P="\\["+O+"*("+M+")"+O+"*(?:"+D+O+"*(?:(['\"])((?:\\\\.|[^\\\\])*?)\\3|("+_+")|)|)"+O+"*\\]",H=":("+M+")(?:\\((?:(['\"])((?:\\\\.|[^\\\\])*?)\\2|([^()[\\]]*|(?:(?:"+P+")|[^:]|\\\\.)*|.*))\\)|)",B=":(even|odd|eq|gt|lt|nth|first|last)(?:\\("+O+"*((?:-\\d)?\\d*)"+O+"*\\)|)(?=[^-]|$)",j=new RegExp("^"+O+"+|((?:^|[^\\\\])(?:\\\\.)*)"+O+"+$","g"),F=new RegExp("^"+O+"*,"+O+"*"),I=new RegExp("^"+O+"*([\\x20\\t\\r\\n\\f>+~])"+O+"*"),q=new RegExp(H),R=/^(?:#([\w\-]+)|(\w+)|\.([\w\-]+))$/,U=/^:not/,z=/[\x20\t\r\n\f]*[+~]/,W=/:not\($/,X=/h\d/i,V=/input|select|textarea|button/i,$=/\\(?!\\)/g,J={ID:new RegExp("^#("+M+")"),CLASS:new RegExp("^\\.("+M+")"),NAME:new RegExp("^\\[name=['\"]?("+M+")['\"]?\\]"),TAG:new RegExp("^("+M.replace("w","w*")+")"),ATTR:new RegExp("^"+P),PSEUDO:new RegExp("^"+H),POS:new RegExp(B,"i"),CHILD:new RegExp("^:(only|nth|first|last)-child(?:\\("+O+"*(even|odd|(([+-]|)(\\d*)n|)"+O+"*(?:([+-]|)"+O+"*(\\d+)|))"+O+"*\\)|)","i"),needsContext:new RegExp("^"+O+"*[>+~]|"+B,"i")},K=function(e){var t=g.createElement("div");try{return e(t)}catch(n){return!1}finally{t=null}},Q=K(function(e){return e.appendChild(g.createComment("")),!e.getElementsByTagName("*").length}),G=K(function(e){return e.innerHTML="<a href='#'></a>",e.firstChild&&typeof e.firstChild.getAttribute!==p&&e.firstChild.getAttribute("href")==="#"}),Y=K(function(e){e.innerHTML="<select></select>";var t=typeof e.lastChild.getAttribute("multiple");return t!=="boolean"&&t!=="string"}),Z=K(function(e){return e.innerHTML="<div class='hidden e'></div><div class='hidden'></div>",!e.getElementsByClassName||!e.getElementsByClassName("e").length?!1:(e.lastChild.className="e",e.getElementsByClassName("e").length===2)}),et=K(function(e){e.id=d+0,e.innerHTML="<a name='"+d+"'></a><div name='"+d+"'></div>",y.insertBefore(e,y.firstChild);var t=g.getElementsByName&&g.getElementsByName(d).length===2+g.getElementsByName(d+0).length;return r=!g.getElementById(d),y.removeChild(e),t});try{x.call(y.childNodes,0)[0].nodeType}catch(tt){x=function(e){var t,n=[];for(;t=this[e];e++)n.push(t);return n}}nt.matches=function(e,t){return nt(e,null,null,t)},nt.matchesSelector=function(e,t){return nt(t,null,null,[e]).length>0},s=nt.getText=function(e){var t,n="",r=0,i=e.nodeType;if(i){if(i===1||i===9||i===11){if(typeof e.textContent=="string")return e.textContent;for(e=e.firstChild;e;e=e.nextSibling)n+=s(e)}else if(i===3||i===4)return e.nodeValue}else for(;t=e[r];r++)n+=s(t);return n},o=nt.isXML=function(e){var t=e&&(e.ownerDocument||e).documentElement;return t?t.nodeName!=="HTML":!1},u=nt.contains=y.contains?function(e,t){var n=e.nodeType===9?e.documentElement:e,r=t&&t.parentNode;return e===r||!!(r&&r.nodeType===1&&n.contains&&n.contains(r))}:y.compareDocumentPosition?function(e,t){return t&&!!(e.compareDocumentPosition(t)&16)}:function(e,t){while(t=t.parentNode)if(t===e)return!0;return!1},nt.attr=function(e,t){var n,r=o(e);return r||(t=t.toLowerCase()),(n=i.attrHandle[t])?n(e):r||Y?e.getAttribute(t):(n=e.getAttributeNode(t),n?typeof e[t]=="boolean"?e[t]?t:null:n.specified?n.value:null:null)},i=nt.selectors={cacheLength:50,createPseudo:N,match:J,attrHandle:G?{}:{href:function(e){return e.getAttribute("href",2)},type:function(e){return e.getAttribute("type")}},find:{ID:r?function(e,t,n){if(typeof t.getElementById!==p&&!n){var r=t.getElementById(e);return r&&r.parentNode?[r]:[]}}:function(e,n,r){if(typeof n.getElementById!==p&&!r){var i=n.getElementById(e);return i?i.id===e||typeof i.getAttributeNode!==p&&i.getAttributeNode("id").value===e?[i]:t:[]}},TAG:Q?function(e,t){if(typeof t.getElementsByTagName!==p)return t.getElementsByTagName(e)}:function(e,t){var n=t.getElementsByTagName(e);if(e==="*"){var r,i=[],s=0;for(;r=n[s];s++)r.nodeType===1&&i.push(r);return i}return n},NAME:et&&function(e,t){if(typeof t.getElementsByName!==p)return t.getElementsByName(name)},CLASS:Z&&function(e,t,n){if(typeof t.getElementsByClassName!==p&&!n)return t.getElementsByClassName(e)}},relative:{">":{dir:"parentNode",first:!0}," ":{dir:"parentNode"},"+":{dir:"previousSibling",first:!0},"~":{dir:"previousSibling"}},preFilter:{ATTR:function(e){return e[1]=e[1].replace($,""),e[3]=(e[4]||e[5]||"").replace($,""),e[2]==="~="&&(e[3]=" "+e[3]+" "),e.slice(0,4)},CHILD:function(e){return e[1]=e[1].toLowerCase(),e[1]==="nth"?(e[2]||nt.error(e[0]),e[3]=+(e[3]?e[4]+(e[5]||1):2*(e[2]==="even"||e[2]==="odd")),e[4]=+(e[6]+e[7]||e[2]==="odd")):e[2]&&nt.error(e[0]),e},PSEUDO:function(e){var t,n;if(J.CHILD.test(e[0]))return null;if(e[3])e[2]=e[3];else if(t=e[4])q.test(t)&&(n=ut(t,!0))&&(n=t.indexOf(")",t.length-n)-t.length)&&(t=t.slice(0,n),e[0]=e[0].slice(0,n)),e[2]=t;return e.slice(0,3)}},filter:{ID:r?function(e){return e=e.replace($,""),function(t){return t.getAttribute("id")===e}}:function(e){return e=e.replace($,""),function(t){var n=typeof t.getAttributeNode!==p&&t.getAttributeNode("id");return n&&n.value===e}},TAG:function(e){return e==="*"?function(){return!0}:(e=e.replace($,"").toLowerCase(),function(t){return t.nodeName&&t.nodeName.toLowerCase()===e})},CLASS:function(e){var t=k[d][e+" "];return t||(t=new RegExp("(^|"+O+")"+e+"("+O+"|$)"))&&k(e,function(e){return t.test(e.className||typeof e.getAttribute!==p&&e.getAttribute("class")||"")})},ATTR:function(e,t,n){return function(r,i){var s=nt.attr(r,e);return s==null?t==="!=":t?(s+="",t==="="?s===n:t==="!="?s!==n:t==="^="?n&&s.indexOf(n)===0:t==="*="?n&&s.indexOf(n)>-1:t==="$="?n&&s.substr(s.length-n.length)===n:t==="~="?(" "+s+" ").indexOf(n)>-1:t==="|="?s===n||s.substr(0,n.length+1)===n+"-":!1):!0}},CHILD:function(e,t,n,r){return e==="nth"?function(e){var t,i,s=e.parentNode;if(n===1&&r===0)return!0;if(s){i=0;for(t=s.firstChild;t;t=t.nextSibling)if(t.nodeType===1){i++;if(e===t)break}}return i-=r,i===n||i%n===0&&i/n>=0}:function(t){var n=t;switch(e){case"only":case"first":while(n=n.previousSibling)if(n.nodeType===1)return!1;if(e==="first")return!0;n=t;case"last":while(n=n.nextSibling)if(n.nodeType===1)return!1;return!0}}},PSEUDO:function(e,t){var n,r=i.pseudos[e]||i.setFilters[e.toLowerCase()]||nt.error("unsupported pseudo: "+e);return r[d]?r(t):r.length>1?(n=[e,e,"",t],i.setFilters.hasOwnProperty(e.toLowerCase())?N(function(e,n){var i,s=r(e,t),o=s.length;while(o--)i=T.call(e,s[o]),e[i]=!(n[i]=s[o])}):function(e){return r(e,0,n)}):r}},pseudos:{not:N(function(e){var t=[],n=[],r=a(e.replace(j,"$1"));return r[d]?N(function(e,t,n,i){var s,o=r(e,null,i,[]),u=e.length;while(u--)if(s=o[u])e[u]=!(t[u]=s)}):function(e,i,s){return t[0]=e,r(t,null,s,n),!n.pop()}}),has:N(function(e){return function(t){return nt(e,t).length>0}}),contains:N(function(e){return function(t){return(t.textContent||t.innerText||s(t)).indexOf(e)>-1}}),enabled:function(e){return e.disabled===!1},disabled:function(e){return e.disabled===!0},checked:function(e){var t=e.nodeName.toLowerCase();return t==="input"&&!!e.checked||t==="option"&&!!e.selected},selected:function(e){return e.parentNode&&e.parentNode.selectedIndex,e.selected===!0},parent:function(e){return!i.pseudos.empty(e)},empty:function(e){var t;e=e.firstChild;while(e){if(e.nodeName>"@"||(t=e.nodeType)===3||t===4)return!1;e=e.nextSibling}return!0},header:function(e){return X.test(e.nodeName)},text:function(e){var t,n;return e.nodeName.toLowerCase()==="input"&&(t=e.type)==="text"&&((n=e.getAttribute("type"))==null||n.toLowerCase()===t)},radio:rt("radio"),checkbox:rt("checkbox"),file:rt("file"),password:rt("password"),image:rt("image"),submit:it("submit"),reset:it("reset"),button:function(e){var t=e.nodeName.toLowerCase();return t==="input"&&e.type==="button"||t==="button"},input:function(e){return V.test(e.nodeName)},focus:function(e){var t=e.ownerDocument;return e===t.activeElement&&(!t.hasFocus||t.hasFocus())&&!!(e.type||e.href||~e.tabIndex)},active:function(e){return e===e.ownerDocument.activeElement},first:st(function(){return[0]}),last:st(function(e,t){return[t-1]}),eq:st(function(e,t,n){return[n<0?n+t:n]}),even:st(function(e,t){for(var n=0;n<t;n+=2)e.push(n);return e}),odd:st(function(e,t){for(var n=1;n<t;n+=2)e.push(n);return e}),lt:st(function(e,t,n){for(var r=n<0?n+t:n;--r>=0;)e.push(r);return e}),gt:st(function(e,t,n){for(var r=n<0?n+t:n;++r<t;)e.push(r);return e})}},f=y.compareDocumentPosition?function(e,t){return e===t?(l=!0,0):(!e.compareDocumentPosition||!t.compareDocumentPosition?e.compareDocumentPosition:e.compareDocumentPosition(t)&4)?-1:1}:function(e,t){if(e===t)return l=!0,0;if(e.sourceIndex&&t.sourceIndex)return e.sourceIndex-t.sourceIndex;var n,r,i=[],s=[],o=e.parentNode,u=t.parentNode,a=o;if(o===u)return ot(e,t);if(!o)return-1;if(!u)return 1;while(a)i.unshift(a),a=a.parentNode;a=u;while(a)s.unshift(a),a=a.parentNode;n=i.length,r=s.length;for(var f=0;f<n&&f<r;f++)if(i[f]!==s[f])return ot(i[f],s[f]);return f===n?ot(e,s[f],-1):ot(i[f],t,1)},[0,0].sort(f),h=!l,nt.uniqueSort=function(e){var t,n=[],r=1,i=0;l=h,e.sort(f);if(l){for(;t=e[r];r++)t===e[r-1]&&(i=n.push(r));while(i--)e.splice(n[i],1)}return e},nt.error=function(e){throw new Error("Syntax error, unrecognized expression: "+e)},a=nt.compile=function(e,t){var n,r=[],i=[],s=A[d][e+" "];if(!s){t||(t=ut(e)),n=t.length;while(n--)s=ht(t[n]),s[d]?r.push(s):i.push(s);s=A(e,pt(i,r))}return s},g.querySelectorAll&&function(){var e,t=vt,n=/'|\\/g,r=/\=[\x20\t\r\n\f]*([^'"\]]*)[\x20\t\r\n\f]*\]/g,i=[":focus"],s=[":active"],u=y.matchesSelector||y.mozMatchesSelector||y.webkitMatchesSelector||y.oMatchesSelector||y.msMatchesSelector;K(function(e){e.innerHTML="<select><option selected=''></option></select>",e.querySelectorAll("[selected]").length||i.push("\\["+O+"*(?:checked|disabled|ismap|multiple|readonly|selected|value)"),e.querySelectorAll(":checked").length||i.push(":checked")}),K(function(e){e.innerHTML="<p test=''></p>",e.querySelectorAll("[test^='']").length&&i.push("[*^$]="+O+"*(?:\"\"|'')"),e.innerHTML="<input type='hidden'/>",e.querySelectorAll(":enabled").length||i.push(":enabled",":disabled")}),i=new RegExp(i.join("|")),vt=function(e,r,s,o,u){if(!o&&!u&&!i.test(e)){var a,f,l=!0,c=d,h=r,p=r.nodeType===9&&e;if(r.nodeType===1&&r.nodeName.toLowerCase()!=="object"){a=ut(e),(l=r.getAttribute("id"))?c=l.replace(n,"\\$&"):r.setAttribute("id",c),c="[id='"+c+"'] ",f=a.length;while(f--)a[f]=c+a[f].join("");h=z.test(e)&&r.parentNode||r,p=a.join(",")}if(p)try{return S.apply(s,x.call(h.querySelectorAll(p),0)),s}catch(v){}finally{l||r.removeAttribute("id")}}return t(e,r,s,o,u)},u&&(K(function(t){e=u.call(t,"div");try{u.call(t,"[test!='']:sizzle"),s.push("!=",H)}catch(n){}}),s=new RegExp(s.join("|")),nt.matchesSelector=function(t,n){n=n.replace(r,"='$1']");if(!o(t)&&!s.test(n)&&!i.test(n))try{var a=u.call(t,n);if(a||e||t.document&&t.document.nodeType!==11)return a}catch(f){}return nt(n,null,null,[t]).length>0})}(),i.pseudos.nth=i.pseudos.eq,i.filters=mt.prototype=i.pseudos,i.setFilters=new mt,nt.attr=v.attr,v.find=nt,v.expr=nt.selectors,v.expr[":"]=v.expr.pseudos,v.unique=nt.uniqueSort,v.text=nt.getText,v.isXMLDoc=nt.isXML,v.contains=nt.contains}(e);var nt=/Until$/,rt=/^(?:parents|prev(?:Until|All))/,it=/^.[^:#\[\.,]*$/,st=v.expr.match.needsContext,ot={children:!0,contents:!0,next:!0,prev:!0};v.fn.extend({find:function(e){var t,n,r,i,s,o,u=this;if(typeof e!="string")return v(e).filter(function(){for(t=0,n=u.length;t<n;t++)if(v.contains(u[t],this))return!0});o=this.pushStack("","find",e);for(t=0,n=this.length;t<n;t++){r=o.length,v.find(e,this[t],o);if(t>0)for(i=r;i<o.length;i++)for(s=0;s<r;s++)if(o[s]===o[i]){o.splice(i--,1);break}}return o},has:function(e){var t,n=v(e,this),r=n.length;return this.filter(function(){for(t=0;t<r;t++)if(v.contains(this,n[t]))return!0})},not:function(e){return this.pushStack(ft(this,e,!1),"not",e)},filter:function(e){return this.pushStack(ft(this,e,!0),"filter",e)},is:function(e){return!!e&&(typeof e=="string"?st.test(e)?v(e,this.context).index(this[0])>=0:v.filter(e,this).length>0:this.filter(e).length>0)},closest:function(e,t){var n,r=0,i=this.length,s=[],o=st.test(e)||typeof e!="string"?v(e,t||this.context):0;for(;r<i;r++){n=this[r];while(n&&n.ownerDocument&&n!==t&&n.nodeType!==11){if(o?o.index(n)>-1:v.find.matchesSelector(n,e)){s.push(n);break}n=n.parentNode}}return s=s.length>1?v.unique(s):s,this.pushStack(s,"closest",e)},index:function(e){return e?typeof e=="string"?v.inArray(this[0],v(e)):v.inArray(e.jquery?e[0]:e,this):this[0]&&this[0].parentNode?this.prevAll().length:-1},add:function(e,t){var n=typeof e=="string"?v(e,t):v.makeArray(e&&e.nodeType?[e]:e),r=v.merge(this.get(),n);return this.pushStack(ut(n[0])||ut(r[0])?r:v.unique(r))},addBack:function(e){return this.add(e==null?this.prevObject:this.prevObject.filter(e))}}),v.fn.andSelf=v.fn.addBack,v.each({parent:function(e){var t=e.parentNode;return t&&t.nodeType!==11?t:null},parents:function(e){return v.dir(e,"parentNode")},parentsUntil:function(e,t,n){return v.dir(e,"parentNode",n)},next:function(e){return at(e,"nextSibling")},prev:function(e){return at(e,"previousSibling")},nextAll:function(e){return v.dir(e,"nextSibling")},prevAll:function(e){return v.dir(e,"previousSibling")},nextUntil:function(e,t,n){return v.dir(e,"nextSibling",n)},prevUntil:function(e,t,n){return v.dir(e,"previousSibling",n)},siblings:function(e){return v.sibling((e.parentNode||{}).firstChild,e)},children:function(e){return v.sibling(e.firstChild)},contents:function(e){return v.nodeName(e,"iframe")?e.contentDocument||e.contentWindow.document:v.merge([],e.childNodes)}},function(e,t){v.fn[e]=function(n,r){var i=v.map(this,t,n);return nt.test(e)||(r=n),r&&typeof r=="string"&&(i=v.filter(r,i)),i=this.length>1&&!ot[e]?v.unique(i):i,this.length>1&&rt.test(e)&&(i=i.reverse()),this.pushStack(i,e,l.call(arguments).join(","))}}),v.extend({filter:function(e,t,n){return n&&(e=":not("+e+")"),t.length===1?v.find.matchesSelector(t[0],e)?[t[0]]:[]:v.find.matches(e,t)},dir:function(e,n,r){var i=[],s=e[n];while(s&&s.nodeType!==9&&(r===t||s.nodeType!==1||!v(s).is(r)))s.nodeType===1&&i.push(s),s=s[n];return i},sibling:function(e,t){var n=[];for(;e;e=e.nextSibling)e.nodeType===1&&e!==t&&n.push(e);return n}});var ct="abbr|article|aside|audio|bdi|canvas|data|datalist|details|figcaption|figure|footer|header|hgroup|mark|meter|nav|output|progress|section|summary|time|video",ht=/ jQuery\d+="(?:null|\d+)"/g,pt=/^\s+/,dt=/<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,vt=/<([\w:]+)/,mt=/<tbody/i,gt=/<|&#?\w+;/,yt=/<(?:script|style|link)/i,bt=/<(?:script|object|embed|option|style)/i,wt=new RegExp("<(?:"+ct+")[\\s/>]","i"),Et=/^(?:checkbox|radio)$/,St=/checked\s*(?:[^=]|=\s*.checked.)/i,xt=/\/(java|ecma)script/i,Tt=/^\s*<!(?:\[CDATA\[|\-\-)|[\]\-]{2}>\s*$/g,Nt={option:[1,"<select multiple='multiple'>","</select>"],legend:[1,"<fieldset>","</fieldset>"],thead:[1,"<table>","</table>"],tr:[2,"<table><tbody>","</tbody></table>"],td:[3,"<table><tbody><tr>","</tr></tbody></table>"],col:[2,"<table><tbody></tbody><colgroup>","</colgroup></table>"],area:[1,"<map>","</map>"],_default:[0,"",""]},Ct=lt(i),kt=Ct.appendChild(i.createElement("div"));Nt.optgroup=Nt.option,Nt.tbody=Nt.tfoot=Nt.colgroup=Nt.caption=Nt.thead,Nt.th=Nt.td,v.support.htmlSerialize||(Nt._default=[1,"X<div>","</div>"]),v.fn.extend({text:function(e){return v.access(this,function(e){return e===t?v.text(this):this.empty().append((this[0]&&this[0].ownerDocument||i).createTextNode(e))},null,e,arguments.length)},wrapAll:function(e){if(v.isFunction(e))return this.each(function(t){v(this).wrapAll(e.call(this,t))});if(this[0]){var t=v(e,this[0].ownerDocument).eq(0).clone(!0);this[0].parentNode&&t.insertBefore(this[0]),t.map(function(){var e=this;while(e.firstChild&&e.firstChild.nodeType===1)e=e.firstChild;return e}).append(this)}return this},wrapInner:function(e){return v.isFunction(e)?this.each(function(t){v(this).wrapInner(e.call(this,t))}):this.each(function(){var t=v(this),n=t.contents();n.length?n.wrapAll(e):t.append(e)})},wrap:function(e){var t=v.isFunction(e);return this.each(function(n){v(this).wrapAll(t?e.call(this,n):e)})},unwrap:function(){return this.parent().each(function(){v.nodeName(this,"body")||v(this).replaceWith(this.childNodes)}).end()},append:function(){return this.domManip(arguments,!0,function(e){(this.nodeType===1||this.nodeType===11)&&this.appendChild(e)})},prepend:function(){return this.domManip(arguments,!0,function(e){(this.nodeType===1||this.nodeType===11)&&this.insertBefore(e,this.firstChild)})},before:function(){if(!ut(this[0]))return this.domManip(arguments,!1,function(e){this.parentNode.insertBefore(e,this)});if(arguments.length){var e=v.clean(arguments);return this.pushStack(v.merge(e,this),"before",this.selector)}},after:function(){if(!ut(this[0]))return this.domManip(arguments,!1,function(e){this.parentNode.insertBefore(e,this.nextSibling)});if(arguments.length){var e=v.clean(arguments);return this.pushStack(v.merge(this,e),"after",this.selector)}},remove:function(e,t){var n,r=0;for(;(n=this[r])!=null;r++)if(!e||v.filter(e,[n]).length)!t&&n.nodeType===1&&(v.cleanData(n.getElementsByTagName("*")),v.cleanData([n])),n.parentNode&&n.parentNode.removeChild(n);return this},empty:function(){var e,t=0;for(;(e=this[t])!=null;t++){e.nodeType===1&&v.cleanData(e.getElementsByTagName("*"));while(e.firstChild)e.removeChild(e.firstChild)}return this},clone:function(e,t){return e=e==null?!1:e,t=t==null?e:t,this.map(function(){return v.clone(this,e,t)})},html:function(e){return v.access(this,function(e){var n=this[0]||{},r=0,i=this.length;if(e===t)return n.nodeType===1?n.innerHTML.replace(ht,""):t;if(typeof e=="string"&&!yt.test(e)&&(v.support.htmlSerialize||!wt.test(e))&&(v.support.leadingWhitespace||!pt.test(e))&&!Nt[(vt.exec(e)||["",""])[1].toLowerCase()]){e=e.replace(dt,"<$1></$2>");try{for(;r<i;r++)n=this[r]||{},n.nodeType===1&&(v.cleanData(n.getElementsByTagName("*")),n.innerHTML=e);n=0}catch(s){}}n&&this.empty().append(e)},null,e,arguments.length)},replaceWith:function(e){return ut(this[0])?this.length?this.pushStack(v(v.isFunction(e)?e():e),"replaceWith",e):this:v.isFunction(e)?this.each(function(t){var n=v(this),r=n.html();n.replaceWith(e.call(this,t,r))}):(typeof e!="string"&&(e=v(e).detach()),this.each(function(){var t=this.nextSibling,n=this.parentNode;v(this).remove(),t?v(t).before(e):v(n).append(e)}))},detach:function(e){return this.remove(e,!0)},domManip:function(e,n,r){e=[].concat.apply([],e);var i,s,o,u,a=0,f=e[0],l=[],c=this.length;if(!v.support.checkClone&&c>1&&typeof f=="string"&&St.test(f))return this.each(function(){v(this).domManip(e,n,r)});if(v.isFunction(f))return this.each(function(i){var s=v(this);e[0]=f.call(this,i,n?s.html():t),s.domManip(e,n,r)});if(this[0]){i=v.buildFragment(e,this,l),o=i.fragment,s=o.firstChild,o.childNodes.length===1&&(o=s);if(s){n=n&&v.nodeName(s,"tr");for(u=i.cacheable||c-1;a<c;a++)r.call(n&&v.nodeName(this[a],"table")?Lt(this[a],"tbody"):this[a],a===u?o:v.clone(o,!0,!0))}o=s=null,l.length&&v.each(l,function(e,t){t.src?v.ajax?v.ajax({url:t.src,type:"GET",dataType:"script",async:!1,global:!1,"throws":!0}):v.error("no ajax"):v.globalEval((t.text||t.textContent||t.innerHTML||"").replace(Tt,"")),t.parentNode&&t.parentNode.removeChild(t)})}return this}}),v.buildFragment=function(e,n,r){var s,o,u,a=e[0];return n=n||i,n=!n.nodeType&&n[0]||n,n=n.ownerDocument||n,e.length===1&&typeof a=="string"&&a.length<512&&n===i&&a.charAt(0)==="<"&&!bt.test(a)&&(v.support.checkClone||!St.test(a))&&(v.support.html5Clone||!wt.test(a))&&(o=!0,s=v.fragments[a],u=s!==t),s||(s=n.createDocumentFragment(),v.clean(e,n,s,r),o&&(v.fragments[a]=u&&s)),{fragment:s,cacheable:o}},v.fragments={},v.each({appendTo:"append",prependTo:"prepend",insertBefore:"before",insertAfter:"after",replaceAll:"replaceWith"},function(e,t){v.fn[e]=function(n){var r,i=0,s=[],o=v(n),u=o.length,a=this.length===1&&this[0].parentNode;if((a==null||a&&a.nodeType===11&&a.childNodes.length===1)&&u===1)return o[t](this[0]),this;for(;i<u;i++)r=(i>0?this.clone(!0):this).get(),v(o[i])[t](r),s=s.concat(r);return this.pushStack(s,e,o.selector)}}),v.extend({clone:function(e,t,n){var r,i,s,o;v.support.html5Clone||v.isXMLDoc(e)||!wt.test("<"+e.nodeName+">")?o=e.cloneNode(!0):(kt.innerHTML=e.outerHTML,kt.removeChild(o=kt.firstChild));if((!v.support.noCloneEvent||!v.support.noCloneChecked)&&(e.nodeType===1||e.nodeType===11)&&!v.isXMLDoc(e)){Ot(e,o),r=Mt(e),i=Mt(o);for(s=0;r[s];++s)i[s]&&Ot(r[s],i[s])}if(t){At(e,o);if(n){r=Mt(e),i=Mt(o);for(s=0;r[s];++s)At(r[s],i[s])}}return r=i=null,o},clean:function(e,t,n,r){var s,o,u,a,f,l,c,h,p,d,m,g,y=t===i&&Ct,b=[];if(!t||typeof t.createDocumentFragment=="undefined")t=i;for(s=0;(u=e[s])!=null;s++){typeof u=="number"&&(u+="");if(!u)continue;if(typeof u=="string")if(!gt.test(u))u=t.createTextNode(u);else{y=y||lt(t),c=t.createElement("div"),y.appendChild(c),u=u.replace(dt,"<$1></$2>"),a=(vt.exec(u)||["",""])[1].toLowerCase(),f=Nt[a]||Nt._default,l=f[0],c.innerHTML=f[1]+u+f[2];while(l--)c=c.lastChild;if(!v.support.tbody){h=mt.test(u),p=a==="table"&&!h?c.firstChild&&c.firstChild.childNodes:f[1]==="<table>"&&!h?c.childNodes:[];for(o=p.length-1;o>=0;--o)v.nodeName(p[o],"tbody")&&!p[o].childNodes.length&&p[o].parentNode.removeChild(p[o])}!v.support.leadingWhitespace&&pt.test(u)&&c.insertBefore(t.createTextNode(pt.exec(u)[0]),c.firstChild),u=c.childNodes,c.parentNode.removeChild(c)}u.nodeType?b.push(u):v.merge(b,u)}c&&(u=c=y=null);if(!v.support.appendChecked)for(s=0;(u=b[s])!=null;s++)v.nodeName(u,"input")?_t(u):typeof u.getElementsByTagName!="undefined"&&v.grep(u.getElementsByTagName("input"),_t);if(n){m=function(e){if(!e.type||xt.test(e.type))return r?r.push(e.parentNode?e.parentNode.removeChild(e):e):n.appendChild(e)};for(s=0;(u=b[s])!=null;s++)if(!v.nodeName(u,"script")||!m(u))n.appendChild(u),typeof u.getElementsByTagName!="undefined"&&(g=v.grep(v.merge([],u.getElementsByTagName("script")),m),b.splice.apply(b,[s+1,0].concat(g)),s+=g.length)}return b},cleanData:function(e,t){var n,r,i,s,o=0,u=v.expando,a=v.cache,f=v.support.deleteExpando,l=v.event.special;for(;(i=e[o])!=null;o++)if(t||v.acceptData(i)){r=i[u],n=r&&a[r];if(n){if(n.events)for(s in n.events)l[s]?v.event.remove(i,s):v.removeEvent(i,s,n.handle);a[r]&&(delete a[r],f?delete i[u]:i.removeAttribute?i.removeAttribute(u):i[u]=null,v.deletedIds.push(r))}}}}),function(){var e,t;v.uaMatch=function(e){e=e.toLowerCase();var t=/(chrome)[ \/]([\w.]+)/.exec(e)||/(webkit)[ \/]([\w.]+)/.exec(e)||/(opera)(?:.*version|)[ \/]([\w.]+)/.exec(e)||/(msie) ([\w.]+)/.exec(e)||e.indexOf("compatible")<0&&/(mozilla)(?:.*? rv:([\w.]+)|)/.exec(e)||[];return{browser:t[1]||"",version:t[2]||"0"}},e=v.uaMatch(o.userAgent),t={},e.browser&&(t[e.browser]=!0,t.version=e.version),t.chrome?t.webkit=!0:t.webkit&&(t.safari=!0),v.browser=t,v.sub=function(){function e(t,n){return new e.fn.init(t,n)}v.extend(!0,e,this),e.superclass=this,e.fn=e.prototype=this(),e.fn.constructor=e,e.sub=this.sub,e.fn.init=function(r,i){return i&&i instanceof v&&!(i instanceof e)&&(i=e(i)),v.fn.init.call(this,r,i,t)},e.fn.init.prototype=e.fn;var t=e(i);return e}}();var Dt,Pt,Ht,Bt=/alpha\([^)]*\)/i,jt=/opacity=([^)]*)/,Ft=/^(top|right|bottom|left)$/,It=/^(none|table(?!-c[ea]).+)/,qt=/^margin/,Rt=new RegExp("^("+m+")(.*)$","i"),Ut=new RegExp("^("+m+")(?!px)[a-z%]+$","i"),zt=new RegExp("^([-+])=("+m+")","i"),Wt={BODY:"block"},Xt={position:"absolute",visibility:"hidden",display:"block"},Vt={letterSpacing:0,fontWeight:400},$t=["Top","Right","Bottom","Left"],Jt=["Webkit","O","Moz","ms"],Kt=v.fn.toggle;v.fn.extend({css:function(e,n){return v.access(this,function(e,n,r){return r!==t?v.style(e,n,r):v.css(e,n)},e,n,arguments.length>1)},show:function(){return Yt(this,!0)},hide:function(){return Yt(this)},toggle:function(e,t){var n=typeof e=="boolean";return v.isFunction(e)&&v.isFunction(t)?Kt.apply(this,arguments):this.each(function(){(n?e:Gt(this))?v(this).show():v(this).hide()})}}),v.extend({cssHooks:{opacity:{get:function(e,t){if(t){var n=Dt(e,"opacity");return n===""?"1":n}}}},cssNumber:{fillOpacity:!0,fontWeight:!0,lineHeight:!0,opacity:!0,orphans:!0,widows:!0,zIndex:!0,zoom:!0},cssProps:{"float":v.support.cssFloat?"cssFloat":"styleFloat"},style:function(e,n,r,i){if(!e||e.nodeType===3||e.nodeType===8||!e.style)return;var s,o,u,a=v.camelCase(n),f=e.style;n=v.cssProps[a]||(v.cssProps[a]=Qt(f,a)),u=v.cssHooks[n]||v.cssHooks[a];if(r===t)return u&&"get"in u&&(s=u.get(e,!1,i))!==t?s:f[n];o=typeof r,o==="string"&&(s=zt.exec(r))&&(r=(s[1]+1)*s[2]+parseFloat(v.css(e,n)),o="number");if(r==null||o==="number"&&isNaN(r))return;o==="number"&&!v.cssNumber[a]&&(r+="px");if(!u||!("set"in u)||(r=u.set(e,r,i))!==t)try{f[n]=r}catch(l){}},css:function(e,n,r,i){var s,o,u,a=v.camelCase(n);return n=v.cssProps[a]||(v.cssProps[a]=Qt(e.style,a)),u=v.cssHooks[n]||v.cssHooks[a],u&&"get"in u&&(s=u.get(e,!0,i)),s===t&&(s=Dt(e,n)),s==="normal"&&n in Vt&&(s=Vt[n]),r||i!==t?(o=parseFloat(s),r||v.isNumeric(o)?o||0:s):s},swap:function(e,t,n){var r,i,s={};for(i in t)s[i]=e.style[i],e.style[i]=t[i];r=n.call(e);for(i in t)e.style[i]=s[i];return r}}),e.getComputedStyle?Dt=function(t,n){var r,i,s,o,u=e.getComputedStyle(t,null),a=t.style;return u&&(r=u.getPropertyValue(n)||u[n],r===""&&!v.contains(t.ownerDocument,t)&&(r=v.style(t,n)),Ut.test(r)&&qt.test(n)&&(i=a.width,s=a.minWidth,o=a.maxWidth,a.minWidth=a.maxWidth=a.width=r,r=u.width,a.width=i,a.minWidth=s,a.maxWidth=o)),r}:i.documentElement.currentStyle&&(Dt=function(e,t){var n,r,i=e.currentStyle&&e.currentStyle[t],s=e.style;return i==null&&s&&s[t]&&(i=s[t]),Ut.test(i)&&!Ft.test(t)&&(n=s.left,r=e.runtimeStyle&&e.runtimeStyle.left,r&&(e.runtimeStyle.left=e.currentStyle.left),s.left=t==="fontSize"?"1em":i,i=s.pixelLeft+"px",s.left=n,r&&(e.runtimeStyle.left=r)),i===""?"auto":i}),v.each(["height","width"],function(e,t){v.cssHooks[t]={get:function(e,n,r){if(n)return e.offsetWidth===0&&It.test(Dt(e,"display"))?v.swap(e,Xt,function(){return tn(e,t,r)}):tn(e,t,r)},set:function(e,n,r){return Zt(e,n,r?en(e,t,r,v.support.boxSizing&&v.css(e,"boxSizing")==="border-box"):0)}}}),v.support.opacity||(v.cssHooks.opacity={get:function(e,t){return jt.test((t&&e.currentStyle?e.currentStyle.filter:e.style.filter)||"")?.01*parseFloat(RegExp.$1)+"":t?"1":""},set:function(e,t){var n=e.style,r=e.currentStyle,i=v.isNumeric(t)?"alpha(opacity="+t*100+")":"",s=r&&r.filter||n.filter||"";n.zoom=1;if(t>=1&&v.trim(s.replace(Bt,""))===""&&n.removeAttribute){n.removeAttribute("filter");if(r&&!r.filter)return}n.filter=Bt.test(s)?s.replace(Bt,i):s+" "+i}}),v(function(){v.support.reliableMarginRight||(v.cssHooks.marginRight={get:function(e,t){return v.swap(e,{display:"inline-block"},function(){if(t)return Dt(e,"marginRight")})}}),!v.support.pixelPosition&&v.fn.position&&v.each(["top","left"],function(e,t){v.cssHooks[t]={get:function(e,n){if(n){var r=Dt(e,t);return Ut.test(r)?v(e).position()[t]+"px":r}}}})}),v.expr&&v.expr.filters&&(v.expr.filters.hidden=function(e){return e.offsetWidth===0&&e.offsetHeight===0||!v.support.reliableHiddenOffsets&&(e.style&&e.style.display||Dt(e,"display"))==="none"},v.expr.filters.visible=function(e){return!v.expr.filters.hidden(e)}),v.each({margin:"",padding:"",border:"Width"},function(e,t){v.cssHooks[e+t]={expand:function(n){var r,i=typeof n=="string"?n.split(" "):[n],s={};for(r=0;r<4;r++)s[e+$t[r]+t]=i[r]||i[r-2]||i[0];return s}},qt.test(e)||(v.cssHooks[e+t].set=Zt)});var rn=/%20/g,sn=/\[\]$/,on=/\r?\n/g,un=/^(?:color|date|datetime|datetime-local|email|hidden|month|number|password|range|search|tel|text|time|url|week)$/i,an=/^(?:select|textarea)/i;v.fn.extend({serialize:function(){return v.param(this.serializeArray())},serializeArray:function(){return this.map(function(){return this.elements?v.makeArray(this.elements):this}).filter(function(){return this.name&&!this.disabled&&(this.checked||an.test(this.nodeName)||un.test(this.type))}).map(function(e,t){var n=v(this).val();return n==null?null:v.isArray(n)?v.map(n,function(e,n){return{name:t.name,value:e.replace(on,"\r\n")}}):{name:t.name,value:n.replace(on,"\r\n")}}).get()}}),v.param=function(e,n){var r,i=[],s=function(e,t){t=v.isFunction(t)?t():t==null?"":t,i[i.length]=encodeURIComponent(e)+"="+encodeURIComponent(t)};n===t&&(n=v.ajaxSettings&&v.ajaxSettings.traditional);if(v.isArray(e)||e.jquery&&!v.isPlainObject(e))v.each(e,function(){s(this.name,this.value)});else for(r in e)fn(r,e[r],n,s);return i.join("&").replace(rn,"+")};var ln,cn,hn=/#.*$/,pn=/^(.*?):[ \t]*([^\r\n]*)\r?$/mg,dn=/^(?:about|app|app\-storage|.+\-extension|file|res|widget):$/,vn=/^(?:GET|HEAD)$/,mn=/^\/\//,gn=/\?/,yn=/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,bn=/([?&])_=[^&]*/,wn=/^([\w\+\.\-]+:)(?:\/\/([^\/?#:]*)(?::(\d+)|)|)/,En=v.fn.load,Sn={},xn={},Tn=["*/"]+["*"];try{cn=s.href}catch(Nn){cn=i.createElement("a"),cn.href="",cn=cn.href}ln=wn.exec(cn.toLowerCase())||[],v.fn.load=function(e,n,r){if(typeof e!="string"&&En)return En.apply(this,arguments);if(!this.length)return this;var i,s,o,u=this,a=e.indexOf(" ");return a>=0&&(i=e.slice(a,e.length),e=e.slice(0,a)),v.isFunction(n)?(r=n,n=t):n&&typeof n=="object"&&(s="POST"),v.ajax({url:e,type:s,dataType:"html",data:n,complete:function(e,t){r&&u.each(r,o||[e.responseText,t,e])}}).done(function(e){o=arguments,u.html(i?v("<div>").append(e.replace(yn,"")).find(i):e)}),this},v.each("ajaxStart ajaxStop ajaxComplete ajaxError ajaxSuccess ajaxSend".split(" "),function(e,t){v.fn[t]=function(e){return this.on(t,e)}}),v.each(["get","post"],function(e,n){v[n]=function(e,r,i,s){return v.isFunction(r)&&(s=s||i,i=r,r=t),v.ajax({type:n,url:e,data:r,success:i,dataType:s})}}),v.extend({getScript:function(e,n){return v.get(e,t,n,"script")},getJSON:function(e,t,n){return v.get(e,t,n,"json")},ajaxSetup:function(e,t){return t?Ln(e,v.ajaxSettings):(t=e,e=v.ajaxSettings),Ln(e,t),e},ajaxSettings:{url:cn,isLocal:dn.test(ln[1]),global:!0,type:"GET",contentType:"application/x-www-form-urlencoded; charset=UTF-8",processData:!0,async:!0,accepts:{xml:"application/xml, text/xml",html:"text/html",text:"text/plain",json:"application/json, text/javascript","*":Tn},contents:{xml:/xml/,html:/html/,json:/json/},responseFields:{xml:"responseXML",text:"responseText"},converters:{"* text":e.String,"text html":!0,"text json":v.parseJSON,"text xml":v.parseXML},flatOptions:{context:!0,url:!0}},ajaxPrefilter:Cn(Sn),ajaxTransport:Cn(xn),ajax:function(e,n){function T(e,n,s,a){var l,y,b,w,S,T=n;if(E===2)return;E=2,u&&clearTimeout(u),o=t,i=a||"",x.readyState=e>0?4:0,s&&(w=An(c,x,s));if(e>=200&&e<300||e===304)c.ifModified&&(S=x.getResponseHeader("Last-Modified"),S&&(v.lastModified[r]=S),S=x.getResponseHeader("Etag"),S&&(v.etag[r]=S)),e===304?(T="notmodified",l=!0):(l=On(c,w),T=l.state,y=l.data,b=l.error,l=!b);else{b=T;if(!T||e)T="error",e<0&&(e=0)}x.status=e,x.statusText=(n||T)+"",l?d.resolveWith(h,[y,T,x]):d.rejectWith(h,[x,T,b]),x.statusCode(g),g=t,f&&p.trigger("ajax"+(l?"Success":"Error"),[x,c,l?y:b]),m.fireWith(h,[x,T]),f&&(p.trigger("ajaxComplete",[x,c]),--v.active||v.event.trigger("ajaxStop"))}typeof e=="object"&&(n=e,e=t),n=n||{};var r,i,s,o,u,a,f,l,c=v.ajaxSetup({},n),h=c.context||c,p=h!==c&&(h.nodeType||h instanceof v)?v(h):v.event,d=v.Deferred(),m=v.Callbacks("once memory"),g=c.statusCode||{},b={},w={},E=0,S="canceled",x={readyState:0,setRequestHeader:function(e,t){if(!E){var n=e.toLowerCase();e=w[n]=w[n]||e,b[e]=t}return this},getAllResponseHeaders:function(){return E===2?i:null},getResponseHeader:function(e){var n;if(E===2){if(!s){s={};while(n=pn.exec(i))s[n[1].toLowerCase()]=n[2]}n=s[e.toLowerCase()]}return n===t?null:n},overrideMimeType:function(e){return E||(c.mimeType=e),this},abort:function(e){return e=e||S,o&&o.abort(e),T(0,e),this}};d.promise(x),x.success=x.done,x.error=x.fail,x.complete=m.add,x.statusCode=function(e){if(e){var t;if(E<2)for(t in e)g[t]=[g[t],e[t]];else t=e[x.status],x.always(t)}return this},c.url=((e||c.url)+"").replace(hn,"").replace(mn,ln[1]+"//"),c.dataTypes=v.trim(c.dataType||"*").toLowerCase().split(y),c.crossDomain==null&&(a=wn.exec(c.url.toLowerCase()),c.crossDomain=!(!a||a[1]===ln[1]&&a[2]===ln[2]&&(a[3]||(a[1]==="http:"?80:443))==(ln[3]||(ln[1]==="http:"?80:443)))),c.data&&c.processData&&typeof c.data!="string"&&(c.data=v.param(c.data,c.traditional)),kn(Sn,c,n,x);if(E===2)return x;f=c.global,c.type=c.type.toUpperCase(),c.hasContent=!vn.test(c.type),f&&v.active++===0&&v.event.trigger("ajaxStart");if(!c.hasContent){c.data&&(c.url+=(gn.test(c.url)?"&":"?")+c.data,delete c.data),r=c.url;if(c.cache===!1){var N=v.now(),C=c.url.replace(bn,"$1_="+N);c.url=C+(C===c.url?(gn.test(c.url)?"&":"?")+"_="+N:"")}}(c.data&&c.hasContent&&c.contentType!==!1||n.contentType)&&x.setRequestHeader("Content-Type",c.contentType),c.ifModified&&(r=r||c.url,v.lastModified[r]&&x.setRequestHeader("If-Modified-Since",v.lastModified[r]),v.etag[r]&&x.setRequestHeader("If-None-Match",v.etag[r])),x.setRequestHeader("Accept",c.dataTypes[0]&&c.accepts[c.dataTypes[0]]?c.accepts[c.dataTypes[0]]+(c.dataTypes[0]!=="*"?", "+Tn+"; q=0.01":""):c.accepts["*"]);for(l in c.headers)x.setRequestHeader(l,c.headers[l]);if(!c.beforeSend||c.beforeSend.call(h,x,c)!==!1&&E!==2){S="abort";for(l in{success:1,error:1,complete:1})x[l](c[l]);o=kn(xn,c,n,x);if(!o)T(-1,"No Transport");else{x.readyState=1,f&&p.trigger("ajaxSend",[x,c]),c.async&&c.timeout>0&&(u=setTimeout(function(){x.abort("timeout")},c.timeout));try{E=1,o.send(b,T)}catch(k){if(!(E<2))throw k;T(-1,k)}}return x}return x.abort()},active:0,lastModified:{},etag:{}});var Mn=[],_n=/\?/,Dn=/(=)\?(?=&|$)|\?\?/,Pn=v.now();v.ajaxSetup({jsonp:"callback",jsonpCallback:function(){var e=Mn.pop()||v.expando+"_"+Pn++;return this[e]=!0,e}}),v.ajaxPrefilter("json jsonp",function(n,r,i){var s,o,u,a=n.data,f=n.url,l=n.jsonp!==!1,c=l&&Dn.test(f),h=l&&!c&&typeof a=="string"&&!(n.contentType||"").indexOf("application/x-www-form-urlencoded")&&Dn.test(a);if(n.dataTypes[0]==="jsonp"||c||h)return s=n.jsonpCallback=v.isFunction(n.jsonpCallback)?n.jsonpCallback():n.jsonpCallback,o=e[s],c?n.url=f.replace(Dn,"$1"+s):h?n.data=a.replace(Dn,"$1"+s):l&&(n.url+=(_n.test(f)?"&":"?")+n.jsonp+"="+s),n.converters["script json"]=function(){return u||v.error(s+" was not called"),u[0]},n.dataTypes[0]="json",e[s]=function(){u=arguments},i.always(function(){e[s]=o,n[s]&&(n.jsonpCallback=r.jsonpCallback,Mn.push(s)),u&&v.isFunction(o)&&o(u[0]),u=o=t}),"script"}),v.ajaxSetup({accepts:{script:"text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"},contents:{script:/javascript|ecmascript/},converters:{"text script":function(e){return v.globalEval(e),e}}}),v.ajaxPrefilter("script",function(e){e.cache===t&&(e.cache=!1),e.crossDomain&&(e.type="GET",e.global=!1)}),v.ajaxTransport("script",function(e){if(e.crossDomain){var n,r=i.head||i.getElementsByTagName("head")[0]||i.documentElement;return{send:function(s,o){n=i.createElement("script"),n.async="async",e.scriptCharset&&(n.charset=e.scriptCharset),n.src=e.url,n.onload=n.onreadystatechange=function(e,i){if(i||!n.readyState||/loaded|complete/.test(n.readyState))n.onload=n.onreadystatechange=null,r&&n.parentNode&&r.removeChild(n),n=t,i||o(200,"success")},r.insertBefore(n,r.firstChild)},abort:function(){n&&n.onload(0,1)}}}});var Hn,Bn=e.ActiveXObject?function(){for(var e in Hn)Hn[e](0,1)}:!1,jn=0;v.ajaxSettings.xhr=e.ActiveXObject?function(){return!this.isLocal&&Fn()||In()}:Fn,function(e){v.extend(v.support,{ajax:!!e,cors:!!e&&"withCredentials"in e})}(v.ajaxSettings.xhr()),v.support.ajax&&v.ajaxTransport(function(n){if(!n.crossDomain||v.support.cors){var r;return{send:function(i,s){var o,u,a=n.xhr();n.username?a.open(n.type,n.url,n.async,n.username,n.password):a.open(n.type,n.url,n.async);if(n.xhrFields)for(u in n.xhrFields)a[u]=n.xhrFields[u];n.mimeType&&a.overrideMimeType&&a.overrideMimeType(n.mimeType),!n.crossDomain&&!i["X-Requested-With"]&&(i["X-Requested-With"]="XMLHttpRequest");try{for(u in i)a.setRequestHeader(u,i[u])}catch(f){}a.send(n.hasContent&&n.data||null),r=function(e,i){var u,f,l,c,h;try{if(r&&(i||a.readyState===4)){r=t,o&&(a.onreadystatechange=v.noop,Bn&&delete Hn[o]);if(i)a.readyState!==4&&a.abort();else{u=a.status,l=a.getAllResponseHeaders(),c={},h=a.responseXML,h&&h.documentElement&&(c.xml=h);try{c.text=a.responseText}catch(p){}try{f=a.statusText}catch(p){f=""}!u&&n.isLocal&&!n.crossDomain?u=c.text?200:404:u===1223&&(u=204)}}}catch(d){i||s(-1,d)}c&&s(u,f,c,l)},n.async?a.readyState===4?setTimeout(r,0):(o=++jn,Bn&&(Hn||(Hn={},v(e).unload(Bn)),Hn[o]=r),a.onreadystatechange=r):r()},abort:function(){r&&r(0,1)}}}});var qn,Rn,Un=/^(?:toggle|show|hide)$/,zn=new RegExp("^(?:([-+])=|)("+m+")([a-z%]*)$","i"),Wn=/queueHooks$/,Xn=[Gn],Vn={"*":[function(e,t){var n,r,i=this.createTween(e,t),s=zn.exec(t),o=i.cur(),u=+o||0,a=1,f=20;if(s){n=+s[2],r=s[3]||(v.cssNumber[e]?"":"px");if(r!=="px"&&u){u=v.css(i.elem,e,!0)||n||1;do a=a||".5",u/=a,v.style(i.elem,e,u+r);while(a!==(a=i.cur()/o)&&a!==1&&--f)}i.unit=r,i.start=u,i.end=s[1]?u+(s[1]+1)*n:n}return i}]};v.Animation=v.extend(Kn,{tweener:function(e,t){v.isFunction(e)?(t=e,e=["*"]):e=e.split(" ");var n,r=0,i=e.length;for(;r<i;r++)n=e[r],Vn[n]=Vn[n]||[],Vn[n].unshift(t)},prefilter:function(e,t){t?Xn.unshift(e):Xn.push(e)}}),v.Tween=Yn,Yn.prototype={constructor:Yn,init:function(e,t,n,r,i,s){this.elem=e,this.prop=n,this.easing=i||"swing",this.options=t,this.start=this.now=this.cur(),this.end=r,this.unit=s||(v.cssNumber[n]?"":"px")},cur:function(){var e=Yn.propHooks[this.prop];return e&&e.get?e.get(this):Yn.propHooks._default.get(this)},run:function(e){var t,n=Yn.propHooks[this.prop];return this.options.duration?this.pos=t=v.easing[this.easing](e,this.options.duration*e,0,1,this.options.duration):this.pos=t=e,this.now=(this.end-this.start)*t+this.start,this.options.step&&this.options.step.call(this.elem,this.now,this),n&&n.set?n.set(this):Yn.propHooks._default.set(this),this}},Yn.prototype.init.prototype=Yn.prototype,Yn.propHooks={_default:{get:function(e){var t;return e.elem[e.prop]==null||!!e.elem.style&&e.elem.style[e.prop]!=null?(t=v.css(e.elem,e.prop,!1,""),!t||t==="auto"?0:t):e.elem[e.prop]},set:function(e){v.fx.step[e.prop]?v.fx.step[e.prop](e):e.elem.style&&(e.elem.style[v.cssProps[e.prop]]!=null||v.cssHooks[e.prop])?v.style(e.elem,e.prop,e.now+e.unit):e.elem[e.prop]=e.now}}},Yn.propHooks.scrollTop=Yn.propHooks.scrollLeft={set:function(e){e.elem.nodeType&&e.elem.parentNode&&(e.elem[e.prop]=e.now)}},v.each(["toggle","show","hide"],function(e,t){var n=v.fn[t];v.fn[t]=function(r,i,s){return r==null||typeof r=="boolean"||!e&&v.isFunction(r)&&v.isFunction(i)?n.apply(this,arguments):this.animate(Zn(t,!0),r,i,s)}}),v.fn.extend({fadeTo:function(e,t,n,r){return this.filter(Gt).css("opacity",0).show().end().animate({opacity:t},e,n,r)},animate:function(e,t,n,r){var i=v.isEmptyObject(e),s=v.speed(t,n,r),o=function(){var t=Kn(this,v.extend({},e),s);i&&t.stop(!0)};return i||s.queue===!1?this.each(o):this.queue(s.queue,o)},stop:function(e,n,r){var i=function(e){var t=e.stop;delete e.stop,t(r)};return typeof e!="string"&&(r=n,n=e,e=t),n&&e!==!1&&this.queue(e||"fx",[]),this.each(function(){var t=!0,n=e!=null&&e+"queueHooks",s=v.timers,o=v._data(this);if(n)o[n]&&o[n].stop&&i(o[n]);else for(n in o)o[n]&&o[n].stop&&Wn.test(n)&&i(o[n]);for(n=s.length;n--;)s[n].elem===this&&(e==null||s[n].queue===e)&&(s[n].anim.stop(r),t=!1,s.splice(n,1));(t||!r)&&v.dequeue(this,e)})}}),v.each({slideDown:Zn("show"),slideUp:Zn("hide"),slideToggle:Zn("toggle"),fadeIn:{opacity:"show"},fadeOut:{opacity:"hide"},fadeToggle:{opacity:"toggle"}},function(e,t){v.fn[e]=function(e,n,r){return this.animate(t,e,n,r)}}),v.speed=function(e,t,n){var r=e&&typeof e=="object"?v.extend({},e):{complete:n||!n&&t||v.isFunction(e)&&e,duration:e,easing:n&&t||t&&!v.isFunction(t)&&t};r.duration=v.fx.off?0:typeof r.duration=="number"?r.duration:r.duration in v.fx.speeds?v.fx.speeds[r.duration]:v.fx.speeds._default;if(r.queue==null||r.queue===!0)r.queue="fx";return r.old=r.complete,r.complete=function(){v.isFunction(r.old)&&r.old.call(this),r.queue&&v.dequeue(this,r.queue)},r},v.easing={linear:function(e){return e},swing:function(e){return.5-Math.cos(e*Math.PI)/2}},v.timers=[],v.fx=Yn.prototype.init,v.fx.tick=function(){var e,n=v.timers,r=0;qn=v.now();for(;r<n.length;r++)e=n[r],!e()&&n[r]===e&&n.splice(r--,1);n.length||v.fx.stop(),qn=t},v.fx.timer=function(e){e()&&v.timers.push(e)&&!Rn&&(Rn=setInterval(v.fx.tick,v.fx.interval))},v.fx.interval=13,v.fx.stop=function(){clearInterval(Rn),Rn=null},v.fx.speeds={slow:600,fast:200,_default:400},v.fx.step={},v.expr&&v.expr.filters&&(v.expr.filters.animated=function(e){return v.grep(v.timers,function(t){return e===t.elem}).length});var er=/^(?:body|html)$/i;v.fn.offset=function(e){if(arguments.length)return e===t?this:this.each(function(t){v.offset.setOffset(this,e,t)});var n,r,i,s,o,u,a,f={top:0,left:0},l=this[0],c=l&&l.ownerDocument;if(!c)return;return(r=c.body)===l?v.offset.bodyOffset(l):(n=c.documentElement,v.contains(n,l)?(typeof l.getBoundingClientRect!="undefined"&&(f=l.getBoundingClientRect()),i=tr(c),s=n.clientTop||r.clientTop||0,o=n.clientLeft||r.clientLeft||0,u=i.pageYOffset||n.scrollTop,a=i.pageXOffset||n.scrollLeft,{top:f.top+u-s,left:f.left+a-o}):f)},v.offset={bodyOffset:function(e){var t=e.offsetTop,n=e.offsetLeft;return v.support.doesNotIncludeMarginInBodyOffset&&(t+=parseFloat(v.css(e,"marginTop"))||0,n+=parseFloat(v.css(e,"marginLeft"))||0),{top:t,left:n}},setOffset:function(e,t,n){var r=v.css(e,"position");r==="static"&&(e.style.position="relative");var i=v(e),s=i.offset(),o=v.css(e,"top"),u=v.css(e,"left"),a=(r==="absolute"||r==="fixed")&&v.inArray("auto",[o,u])>-1,f={},l={},c,h;a?(l=i.position(),c=l.top,h=l.left):(c=parseFloat(o)||0,h=parseFloat(u)||0),v.isFunction(t)&&(t=t.call(e,n,s)),t.top!=null&&(f.top=t.top-s.top+c),t.left!=null&&(f.left=t.left-s.left+h),"using"in t?t.using.call(e,f):i.css(f)}},v.fn.extend({position:function(){if(!this[0])return;var e=this[0],t=this.offsetParent(),n=this.offset(),r=er.test(t[0].nodeName)?{top:0,left:0}:t.offset();return n.top-=parseFloat(v.css(e,"marginTop"))||0,n.left-=parseFloat(v.css(e,"marginLeft"))||0,r.top+=parseFloat(v.css(t[0],"borderTopWidth"))||0,r.left+=parseFloat(v.css(t[0],"borderLeftWidth"))||0,{top:n.top-r.top,left:n.left-r.left}},offsetParent:function(){return this.map(function(){var e=this.offsetParent||i.body;while(e&&!er.test(e.nodeName)&&v.css(e,"position")==="static")e=e.offsetParent;return e||i.body})}}),v.each({scrollLeft:"pageXOffset",scrollTop:"pageYOffset"},function(e,n){var r=/Y/.test(n);v.fn[e]=function(i){return v.access(this,function(e,i,s){var o=tr(e);if(s===t)return o?n in o?o[n]:o.document.documentElement[i]:e[i];o?o.scrollTo(r?v(o).scrollLeft():s,r?s:v(o).scrollTop()):e[i]=s},e,i,arguments.length,null)}}),v.each({Height:"height",Width:"width"},function(e,n){v.each({padding:"inner"+e,content:n,"":"outer"+e},function(r,i){v.fn[i]=function(i,s){var o=arguments.length&&(r||typeof i!="boolean"),u=r||(i===!0||s===!0?"margin":"border");return v.access(this,function(n,r,i){var s;return v.isWindow(n)?n.document.documentElement["client"+e]:n.nodeType===9?(s=n.documentElement,Math.max(n.body["scroll"+e],s["scroll"+e],n.body["offset"+e],s["offset"+e],s["client"+e])):i===t?v.css(n,r,i,u):v.style(n,r,i,u)},n,o?i:t,o,null)}})}),e.jQuery=e.$=v,typeof define=="function"&&define.amd&&define.amd.jQuery&&define("jquery",[],function(){return v})})(window);
/**
 * Created by ZHUANGYI on 2017/5/18.
 */

    /*loading的三种动画*/
var loadInnerHtml={

   'node':{

       'loadingSuccess':'<div class="loading_box"><div class="success_animation"><div class="success_animation_circle"></div><div class="success_animation_cloud"></div><div class="success_animation_line2"></div><div class="success_animation_line3"></div><div class="success_animation_right"></div><div class="m-box"><div class="m-duigou"></div></div><div class="success_animation_text showtext"></div></div></div>',

       'loading':'<div class="loading_box"><div class="jd_loading"><div class="loading_box jdshop_alignment_center"><div class="ball1"></div><div class="ball2"></div><div class="ball3"></div></div><div class="loading_animation_text showtext"></div></div></div>',

       'loadingFail':'<div class="loading_box"><div class="fail_animation"><div class="fail_animation_circle"></div><div class="fail_animation_cloud"></div><div class="fail_animation_line2"></div><div class="fail_animation_line3"></div><div class="fail_animation_wrong"></div><div class="fail_animation_text showtext"></div></div></div>'

   }
};

var jfShowTips = {

    //弱提示toast出现的方法
    //谯丹
    //2017.1.17
    toastShow: function (details) {

        var _this = this;

        if(!details){//如果details未输入，则防止报错
            
            details={};

        }

        var thisText = details.text || 'null';

        var thisInnerHtml = '<span>' + thisText.toString().replace(/&/g,'&amp;').replace(/>/g,'&gt;').replace(/</g,'&lt;').replace(/"/g,'&quot;') + '</span>';//插入元素的主题内容

        _this.toastRemove();//插入元素前，先删除一次，防止多次添加

        var className='';


        if(browser.os.iOS){//如果当前是IOS系统

            var thisActiveEle=document.activeElement;//当前获取焦点的元素

            if(thisActiveEle.tagName=='INPUT') {//如果当前元素是input

                var thisActiveEleType=thisActiveEle.getAttribute('type');//获取当前元素的type属性

                var inputType=['checkbox','radio','button','image','range','reset','submit','week'];//定义type类型不会发生变化的数组

                if(inputType.indexOf(thisActiveEleType)==-1){//如果当前type类型不存在，则添加Class

                    className='tip_input';
                }

            }

        }

        var thisAddToast = this.addNode('div', thisInnerHtml, 'tip_toast',className);//添加元素

        setTimeout(function () {//延迟2s后，自动删除

            _this.remove(thisAddToast)

        }, 2000);

    },

    //弱提示toast删除的方法
    //谯丹
    //2017.1.17
    toastRemove: function () {

        if (document.getElementById('tip_toast')) {//删除之前，先判断当前元素是否存在

            this.remove(document.getElementById('tip_toast'))

        }

    },

    //loading方法
    //陈羽翔
    //2017.2.3
    loadingShow:function (details) {

        var _this=this;

        if(!details){//为空时初始化数据
            details={};
        }

        windowBanEvent.bundling();//页面禁止事件

        _this.loadingRemove();//先删除页面上loading元素

        var thisText = details.text || 'LOADING..';//显示文字

        var thisNode=details.thisNode||0;//传入动画html

        var otherClass=details.thisClass|| false;//loading添加特殊class,成功失败不需要添加为false

        var thisInnerHtml=thisNode;

        var thisBg = _this.addLoadingBg('tip_loading_bg');

        /*在背景上加禁止浏览器默认事件*/
        document.getElementById('tip_loading_bg').addEventListener('touchmove',windowBanEvent.Canceling);

        var thisAddELe=_this.addNode('div',thisInnerHtml,'tip_loading',otherClass);//增加节点

        document.getElementsByClassName('showtext')[0].innerHTML=_this.changeString(thisText);

        document.activeElement.blur();//页面控件失焦

        thisAddELe.focus();//loading元素获得焦点

    },

    addLoadingBg:function (thisId) {

        var _this=this;

        _this.removeBg();

        return _this.addNode('div','',thisId,'tip_loading_bg');//增加节点

    },

    //loading删除方法
    //陈羽翔
    //2017.2.3
    loadingRemove:function () {//卸载loading

        var _this=this;

        if (document.getElementById('tip_loading')) {//删除之前，先判断当前元素是否存在

            windowBanEvent.unbundling();//解绑页面禁止事件

            _this.remove(document.getElementById('tip_loading'));//删除该元素


        }
            _this.removeBg('tip_loading_bg');


    },
    //新建元素的方法
    addNode: function (tag, innerHtml, id, className) {

        var obj = document.createElement(tag);

        if (id) {

            obj.id = id;

        }

        if(className){

            obj.className=className

        }

        obj.innerHTML = innerHtml;

        document.body.appendChild(obj);

        return obj;


    },

    dialogShow:function (details) {

        if(!details){//如果details未输入，则防止报错
            details={};
        }

        var mainText = details.mainText || 'null';

        var minText = details.minText || null;

        var hasCheck = details.noCheck|| false;

        var hasCancel = details.noCancel || false;

        var checkFn = details.checkFn || null;

        var checkBtnText=details.checkBtnText ||'确认';

        var cancleBtnText=details.cancleBtnText ||'取消';

        var thisUrl=details.thisUrl||'javascript:';

        var _this=this;

        var thisBg=_this.addBg('dialog_bg');

        var thisInnerHtml='<div class="text_dialog_container"><div class="text_big">'+mainText+'</div>';

        if(minText){

            thisInnerHtml+='<div class="text_small">'+minText+'</div>'

        }

        thisInnerHtml+='<div class="dialog_button">';

        if(!hasCheck){

            thisInnerHtml+='<a class="dialog_check red" href='+thisUrl+'>'+checkBtnText+'</a>'

        }

        if(!hasCancel){

            thisInnerHtml+='<a class="dialog_cancel gray" href="javascript:">'+cancleBtnText+'</a>'

        }

        thisInnerHtml+='</div></div>';

        var thisAddDialog = _this.addNode('div', thisInnerHtml, 'tip_dialog');//添加元素

        if(thisAddDialog.getElementsByClassName('dialog_cancel')[0]) {

            thisAddDialog.getElementsByClassName('dialog_cancel')[0].addEventListener('click', _this.dialogRemove.bind(_this), false);

        }

        thisBg.addEventListener('click',_this.dialogRemove.bind(_this),false);

        thisBg.addEventListener('touchmove',windowBanEvent.Canceling,false);

        if(checkFn) {

            thisAddDialog.getElementsByClassName('dialog_check')[0].addEventListener('click',checkFn,false);

        }


    },

    dialogRemove:function () {

        var _this=this;

        var thisDialogEle= document.getElementById('tip_dialog');

            _this.remove(thisDialogEle);//删除该元素


        var thisBgEle=document.getElementById('dialog_bg');

            _this.removeBg('dialog_bg');//删除背景

    },

    //增加背景
    //陈羽翔
    //2017.2.4
    addBg:function (thisId) {

        var _this=this;

        _this.removeBg();

        return _this.addNode('div','',thisId,'tip_bg');//增加节点

    },

    removeBg:function (thisId) {

        if(document.getElementById(thisId)){

            document.getElementById(thisId).click();

            this.remove(document.getElementById(thisId));

        }

    },

    //自动删除的方法
    remove: function (_element) {

        var _parentElement = _element.parentNode;//找到父元素，然后删除

        if (_parentElement) {

            _parentElement.removeChild(_element);

        }

    },

    //批量增加平滑过渡后监听方法
    transitionEndFn:function (thisEle,myFn) {

        thisEle.addEventListener("webkitTransitionEnd", myFn);

        thisEle.addEventListener("transitionend", myFn);

    },

    settimeoutFn:function(myFn){

        setTimeout(myFn,500);

    },

    //转义字符串
    changeString:function(node){

        var _this=this;

        var thisInsertHtml=node.toString().replace(/&/g,'&amp;').replace(/>/g,'&gt;').replace(/</g,'&lt;').replace(/"/g,'&quot;');

        return thisInsertHtml
    }

};



/**
 * Created by ZHUANGYI on 2017/9/22.
 */

var jfDialog = function (details) {

    if(!details){

        details ={}

    }

    this.details = details;

    var thisEle = document.getElementById(this.details.ele);

    var thishasScrollEle = this.details.scrollClassname || 0;

    thisEle.getElementsByClassName('dialog_bg')[0].addEventListener('click', clickEven.bind(this), false);


    if(thishasScrollEle){

        clickThought(thishasScrollEle);

    }


    function clickThought(thishasScrollEle) {


        var thisScrollEle = thisEle.getElementsByClassName(thishasScrollEle)[0];


        var popTop = thisEle.getElementsByClassName('text_big')[0];



        var startY, endY, distance;//开始距离、移动距离

        thisScrollEle.addEventListener('touchstart', touchStartEle, false);

        thisScrollEle.addEventListener('touchmove', reachEdge, false);


        popTop.addEventListener('touchmove',windowBanEvent.Canceling,false);

        //thisScrollEle.addEventListener('touchmove', reachEdge, false);


        function touchStartEle(e) {

            //touchstart 获取位置startY

            startY = e.touches[0].pageY;

        }


        function reachEdge(event) {

            var _this = this;

            var eleScrollHeight = _this.scrollTop;//获取滚动条的位置 206

            var eleHeight = _this.scrollHeight;//元素实际高度 506

            var containerHeight = _this.offsetHeight;//容器高度 300

            var eleClientHeight = _this.clientHeight ;//可视区域的高度 243

            //console.log(eleClientHeight);

            //touchmove 获取位置 endY

            endY = event.touches[0].pageY;

            //两者之减的距离用来判断是向上活动还是向下滑动
            distance = startY - endY;

            //此时touchmove的值等于touchstart的值 循环
            endY = startY;

            //如果滚动条不存在  禁止事件

            if(Math.abs(parseFloat(eleHeight)- parseFloat(eleClientHeight) )<3){

                event.preventDefault()

            }

            //滚动条到达底部

            if (Math.abs(parseFloat(eleHeight) - parseFloat(eleScrollHeight + containerHeight)) <= 2) {


                //如果距离为正数 则向上滑动是 禁止浏览器事件

                if (distance > 0) {

                    event.preventDefault();


                }

            }

            else if (Math.abs(parseFloat(eleScrollHeight)) == 0) {

                //如果距离为负数 则向下滑动

                if (distance < 0) {

                    event.preventDefault();

                }


            }



        }


    }

    function clickEven() {

        this.hide();

    }


    if(thisEle.getElementsByClassName('dialog_bg')[0]) {


        if(browser.os.android){

            thisEle.getElementsByClassName('dialog_bg')[0].addEventListener('touchmove',windowBanEvent.Canceling,false);


        }
        else {

            addEvent(thisEle.getElementsByClassName('dialog_bg')[0]);
        }



    }


    function addEvent(ele) {

        var allEvent=['touchstart','touchmove','touchend'];

        for(var i=0;i<allEvent.length;i++) {

            ele.addEventListener(allEvent[i],eventBan,false)

        }

    }

    function eventBan(e) {


        window.event ? window.event.returnValue = false : e.preventDefault();


    }

};

jfDialog.prototype.show = function (details) {


    if(details){

        details.fn();

    }



    var thisEle = document.getElementById(this.details.ele);


        thisEle.style.display = 'block';

         document.getElementsByClassName('dialog_bg')[0].addEventListener('touchmove',windowBanEvent.Canceling,false);//给阴影绑定冒泡事件


};

jfDialog.prototype.hide = function (details) {

    if(details){

        details.fn();

    }

    var thisEle = document.getElementById(this.details.ele);

    thisEle.style.display = 'none';

    //transitionMove(thisEle);

    windowBanEvent.unbundling();//解绑页面禁止事件



};
/**
 * Created by ZHUANGYI on 2017/9/1.
 */


/**
 * Created by Administrator on 2017/6/1.
 */

var jfShowPop = function (details) {

    if(!details){

        details ={}

    }

    this.details = details;

    var thisEle = document.getElementById(this.details.ele);

    //var thisfatherEle = this.details.fatherId || 0;

    var thishasScrollEle = this.details.scrollClassname || 0;


    thisEle.getElementsByClassName('pop_cancel')[0].addEventListener('click', clickEven.bind(this), false);

    thisEle.getElementsByClassName('jf_pop_up_bg')[0].addEventListener('click', clickEven.bind(this), false);


    if(thishasScrollEle){

        clickThought(thishasScrollEle);

    }


    function clickThought(thishasScrollEle) {


        var thisScrollEle = thisEle.getElementsByClassName(thishasScrollEle)[0];

        var thisVolum = thisEle.getElementsByClassName('sku_volume_purchased')[0];

        var popTop = thisEle.getElementsByClassName('pop_top')[0];

        var thisAddress = thisEle.getElementsByClassName('top_address')[0];

        var startY, endY, distance;//开始距离、移动距离

        thisScrollEle.addEventListener('touchstart', touchStartEle, false);

        thisScrollEle.addEventListener('touchmove', reachEdge, false);


        //如果有这个元素 就绑定禁止事件
         if(thisVolum){

             thisVolum.addEventListener('touchmove',windowBanEvent.Canceling,false);
         }

        if(thisAddress){

            thisAddress.addEventListener('touchmove',windowBanEvent.Canceling,false);

        }

        popTop.addEventListener('touchmove',windowBanEvent.Canceling,false);

        //thisScrollEle.addEventListener('touchmove', reachEdge, false);


        function touchStartEle(e) {

            //touchstart 获取位置startY

            startY = e.touches[0].pageY;

        }


        function reachEdge(event) {

            var _this = this;

            var eleScrollHeight = _this.scrollTop;//获取滚动条的位置 206

            var eleHeight = _this.scrollHeight;//元素实际高度 506

            var containerHeight = _this.offsetHeight;//容器高度 300

            var eleClientHeight = _this.clientHeight ;//可视区域的高度 243

            //console.log(eleClientHeight);

            //touchmove 获取位置 endY

            endY = event.touches[0].pageY;

            //两者之减的距离用来判断是向上活动还是向下滑动
            distance = startY - endY;

            //此时touchmove的值等于touchstart的值 循环
            endY = startY;

            //如果滚动条不存在  禁止事件

            if(Math.abs(parseFloat(eleHeight)- parseFloat(eleClientHeight) )<3){

                event.preventDefault()

            }

            //滚动条到达底部

            if (Math.abs(parseFloat(eleHeight) - parseFloat(eleScrollHeight + containerHeight)) <= 2) {


                //如果距离为正数 则向上滑动是 禁止浏览器事件

                if (distance > 0) {

                    event.preventDefault();


                }

            }

            else if (Math.abs(parseFloat(eleScrollHeight)) == 0) {

                //如果距离为负数 则向下滑动

                if (distance < 0) {

                    event.preventDefault();

                }


            }



        }


}

    function clickEven() {

        this.hide();

    }

    /*this.ban=function (e) {

        window.event? window.event.cancelBubble = true : e.stopPropagation();//阻止冒泡

    };*/

    if(thisEle.getElementsByClassName('jf_pop_up_bg')[0]) {

       if(browser.os.android){

           thisEle.getElementsByClassName('jf_pop_up_bg')[0].addEventListener('touchmove',windowBanEvent.Canceling,false);



       }
      else {

            addEvent(thisEle.getElementsByClassName('jf_pop_up_bg')[0]);
       }



    }

     // if(thisEle.getElementsByClassName('pop_top')[0]) {
     //
     //     addEvent(thisEle.getElementsByClassName('pop_top')[0]);
     //
     // }


    function addEvent(ele) {

        var allEvent=['touchstart','touchmove','touchend'];

         for(var i=0;i<allEvent.length;i++) {

           ele.addEventListener(allEvent[i],eventBan,false)

         }

     }

     function eventBan(e) {

            // window.event? window.event.cancelBubble = true : e.stopPropagation();

             window.event ? window.event.returnValue = false : e.preventDefault();


     }

};

jfShowPop.prototype.show = function (details) {


    if(details){

        details.fn();

    }


   /* this.ban();*/

    /*document.body.addEventListener('touchmove', this.ban, true);*/

    var thisEle = document.getElementById(this.details.ele);


    thisEle.style.display = 'block';

    /*document.getElementsByTagName("body")[0].className = "ovfHiden";//页面禁止滚动

    document.getElementsByTagName("html")[0].className = "ovfHiden";//页面禁止滚动*/

    setTimeout(function () {

        if (thisEle.className.indexOf('show') == -1) {

            thisEle.className += ' show'

        }

    }, 1);

    document.getElementsByClassName('jf_pop_up_bg')[0].addEventListener('touchmove',windowBanEvent.Canceling,false);//给阴影绑定冒泡事件


};

jfShowPop.prototype.hide = function () {

    var thisEle = document.getElementById(this.details.ele);

     /*document.body.removeEventListener('touchmove', this.ban, true);*/


    if (thisEle.className.indexOf('show') > -1) {


        transitionMove(thisEle);

        thisEle.className = thisEle.className.replace(' show', '')

    }

    windowBanEvent.unbundling();//解绑页面禁止事件

    /*document.getElementsByTagName("body")[0].className = "";//页面禁止滚动

    document.getElementsByTagName("html")[0].className = "";//页面禁止滚动*/



    function transitionMove(ele) {

        // Safari 3.1 到 6.0 代码
        ele.addEventListener("webkitTransitionEnd", MFunction);
        // 标准语法
        ele.addEventListener("transitionend", MFunction);

        function MFunction() {

            ele.style.display = 'none';
            // Safari 3.1 到 6.0 代码
            ele.removeEventListener("webkitTransitionEnd", MFunction);
            // 标准语法
            ele.removeEventListener("transitionend", MFunction);


        }


    }


};
var jfAutoPlay = {

    jfAutoPlayInit: function () {

        var XPosition = 0;                                                                                             //存储第一个手指x轴位置，需刷新

        var isChange = 0;                                                                                              //判断是否往哪里移动，1后退，2前进，其他值不动，需刷新

        var setInterMove1000 = 0;                                                                                      //存储循环

        var timer = 5000;                                                                                              //平滑过渡间隔时间

        var ifPosition = 0;                                                                                            //储存两张图片的左右状态

        var lastStance = 0;                                                                                            //上次触摸的位置

        var isThreeEle = true;                                                                                           //是否是三个或者以上元素

        var isTwoEle = false;                                                                                           //是否两个元素

        var isAndroidVersion4 = false                                                                                    //是不是安卓四及其以下系统

        /*增加点点*/
        var thisFatherEle = document.getElementsByClassName('jf_homepage_autoplay')[0].getElementsByClassName('jf_autoplay_images')[0];//父元素，主要移动该元素

        var thisAllTagA = thisFatherEle.getElementsByTagName('a');                                                  //包含img的a

        var thisPaginationEle = document.getElementsByClassName('jf_homepage_autoplay')[0].getElementsByClassName('jf_pagination')[0];//光标

        thisFatherEle.className = 'jf_autoplay_images';//预设 防止闪屏

        isAndroidVersion4 = !browser.supplier.wechat && browser.androidVersion && browser.androidVersion < 5;                  //安卓系统

        if (isAndroidVersion4) {                                                                  //安卓4.4以下 ，

            var allImages = thisFatherEle.getElementsByTagName('img');

            for (var i = 0; i < allImages.length; i++) {//固定图片高度

                var screenWidth = document.body.clientWidth;                                                               //屏幕宽度

                allImages[i].style.width = screenWidth + 'px';

                allImages[i].style.height = (screenWidth / 750 * 348) + 'px'
            }

            if (thisAllTagA.length == 2) {//两张图片时显示错位

                thisFatherEle.style.whiteSpace = 'nowrap';

                thisAllTagA[1].style.marginLeft = '-3px'

            }

        }

        if (thisAllTagA.length == 2) {//预设是几个元素，默认为三个以上

            isThreeEle = false;
            isTwoEle = true;

        }
        else if (thisAllTagA.length == 1) {

            isThreeEle = false;
            isTwoEle = false;

        }

        if (isTwoEle || isThreeEle) {//两个以上的图片再加点

            thisPaginationEle.innerHTML = '';

            for (var i = 0; i < thisAllTagA.length; i++) {

                var newSpan = document.createElement('span');                                                           //新建一个span元素

                thisPaginationEle.appendChild(newSpan);                                                                 //多少个图片 添加多少个span

            }

            paginationChange(0);                                                                             //默认选中第一个点点

        }

        /*预设图片的显示模式*/

        thisAllTagA[0].className = 'show delay';                                                                          //第一张为显示

        /*增加监听*/

        if (isThreeEle) {                                                                              //三张以及以上，此方法通过移动三个子元素

            thisAllTagA[1].className = 'after delay';                                                                         //第二张为后面一张

            thisAllTagA[thisAllTagA.length - 1].className = 'before delay';                                                   //最后一张为前一张

            setInterMove1000 = setInterval(jfAutoPlayRight, timer);//页面读取后开始轮播

            document.getElementsByClassName('jf_homepage_autoplay')[0].addEventListener('touchstart', jfAutoStart, false);//添加touchstrat事件

            jfAddEvent();                                                                                    //添加move 和 end 事件

        }

        else if (isTwoEle) {                                                                          //两张，此方法通过移动父元素

            var screenWidth = document.body.clientWidth;                                                               //屏幕宽度

            for (var i = 0; i < thisAllTagA.length; i++) {

                thisFatherEle.getElementsByTagName('a')[i].getElementsByTagName('img')[0].style.width = screenWidth + 'px';  //每个img的宽度 = 屏幕宽度

                thisAllTagA[i].style.width = screenWidth + 'px';                                                             //每个img的宽度 = 屏幕宽度

            }

            thisFatherEle.style.width = (screenWidth * (thisAllTagA.length)) + 'px';                                    //该元素的总宽度 = 图片数量 * 屏幕宽度

            thisAllTagA[1].className = 'show';                                                                          //第二张为显示

            document.getElementsByClassName('jf_homepage_autoplay')[0].addEventListener('touchstart', jfAutoStart, false);//添加touchstrat事件

            jfAddEvent();                                                                                    //添加move 和 end 事件

            setInterMove1000 = setInterval(jfAutoPlayTwoAll, timer);//页面读取后开始轮播

        }
        else {//默认一张不动

        }


        /*添加move和end事件*/
        function jfAddEvent() {                                                                                       //添加move 和 end 事件

            var thisEle = document.getElementsByClassName('jf_homepage_autoplay')[0];

            thisEle.addEventListener('touchmove', jfAutoMove, false);

            thisEle.addEventListener('touchend', jfAutoEnd, false);

        }


        //卸载move 和 end 事件
        function jfRemoveEvent() {

            var thisEle = document.getElementsByClassName('jf_homepage_autoplay')[0];

            thisEle.removeEventListener('touchmove', jfAutoMove, false);

            thisEle.removeEventListener('touchend', jfAutoEnd, false);

        }


        /*触摸开始事件*/
        //当图片上触摸事件开始时，停止轮播
        function jfAutoStart(event) {

            var thisFatherEle = document.getElementsByClassName('jf_homepage_autoplay')[0].getElementsByClassName('jf_autoplay_images')[0];//父元素，主要移动该元素

            //event.preventDefault();                                                                                     //禁止页面滚动

            clearInterval(setInterMove1000);                                                      //触摸开始时，停下循环轮播

            XPosition = lastStance = event.touches[0].clientX;              //预设第一次触摸点和最后一次触摸点

            var thisShowEle = thisFatherEle.getElementsByClassName('show')[0];

            if (thisShowEle.className.indexOf('delay') < 0 && isThreeEle) {  //触摸时没有delay样式的话&&三个元素以上的情况，添加该样式

                thisShowEle.className += ' delay';                                                                        //消除平滑过渡的效果

                thisFatherEle.getElementsByClassName('after')[0].className += ' delay';

                thisFatherEle.getElementsByClassName('before')[0].className += ' delay';


                //ios bug 关于多个应用开启后异步操作停止的问题
                iosStopInterVal();

            }
            else {//两个元素

                thisFatherEle.style.transition = 'transform 0s';

                thisFatherEle.style.webkitTransition = '-webkit-transform 0s';

            }


            //ios bug 关于多个应用开启后异步操作停止的问题
            function iosStopInterVal() {

                var thisFatherEle = document.getElementsByClassName('jf_homepage_autoplay')[0].getElementsByClassName('jf_autoplay_images')[0];//父元素，主要移动该元素

                var thisShowEle = thisFatherEle.getElementsByClassName('show')[0];


                if (browser.os.iOS && thisShowEle.className.indexOf('delay') > -1 && thisShowEle.className.indexOf('move') > -1 && thisShowEle.getAttribute('style').indexOf('translate3d') > -1) {

                    var thisShowIndex = 0;

                    var thisAllEle = thisFatherEle.getElementsByTagName('a');

                    for (var i = 0; i < thisAllEle.length; i++) {

                        if (thisAllEle[i].className && thisAllEle[i].getBoundingClientRect().left == 0) {

                            thisShowIndex = i;

                        }

                    }

                    thisAllEle[thisShowIndex].className = 'show delay';

                    if (thisShowIndex == 0) {

                        thisAllEle[thisAllEle.length - 1].className = 'before delay';

                        thisAllEle[thisShowIndex + 1].className = 'after delay';

                    }

                    else if (thisShowIndex == thisAllEle.length - 1) {

                        thisAllEle[0].className = 'after delay';

                        thisAllEle[thisShowIndex - 1].className = 'before delay';

                    }

                    else {

                        thisAllEle[thisShowIndex + 1].className = 'after delay';

                        thisAllEle[thisShowIndex - 1].className = 'before delay';

                    }


                    for (var i = 0; i < thisAllEle.length; i++) {

                        thisAllEle[i].removeAttribute('style');

                    }


                    thisShowEle.style.opacity = 0.1;

                    thisShowEle.className = thisShowEle.className.replace('delay', '')

                    setTimeout(function () {

                        thisShowEle.style.opacity = '';

                    }, 1);

                }

            }

        }


        /*触摸中事件*/
        function jfAutoMove(event) {      //当图片上触摸事件开始时，停止轮播

            var screenWidth = document.body.clientWidth;                                                               //屏幕宽度

            // event.preventDefault();                                                                                     //禁止页面滚动

            windowBanEvent.bundling();                                                                                  //触摸时禁止其他页面事件

            var XThisPosition = event.touches[0].clientX;                                                               //此时触摸的x值

            if (XThisPosition - XPosition > screenWidth / 3 || XThisPosition - lastStance > 6) {//移动距离大于三分之一或者移动速度大于6

                isChange = 1;                                                                     //后退

            }

            else if (XThisPosition - XPosition < -screenWidth / 3 || XThisPosition - lastStance < -6) {//移动距离大于三分之一或者移动速度大于6

                isChange = 2;                                                                     //前进

            }

            else {

                isChange = 0;                                                                     //恢复原位，停止不动

            }

            var thisFatherEle = document.getElementsByClassName('jf_homepage_autoplay')[0].getElementsByClassName('jf_autoplay_images')[0];//父元素，主要移动该元素

            if (isThreeEle) {//三个元素以上的情况,移动

                /*thisFatherEle.getElementsByClassName('show')[0].style.transform = 'translate3d(' + (XThisPosition - XPosition) + 'px,0,0)'; //此时的元素

                 thisFatherEle.getElementsByClassName('show')[0].style.webkitTransform = 'translate3d(' + (XThisPosition - XPosition) + 'px,0,0)';

                 thisFatherEle.getElementsByClassName('after')[0].style.transform = 'translate3d(' + (XThisPosition - XPosition) + 'px,0,0)';//下一个元素

                 thisFatherEle.getElementsByClassName('after')[0].style.webkitTransform = 'translate3d(' + (XThisPosition - XPosition) + 'px,0,0)';

                 thisFatherEle.getElementsByClassName('before')[0].style.transform = 'translate3d(' + (XThisPosition - XPosition) + 'px,0,0)';//上一个元素

                 thisFatherEle.getElementsByClassName('before')[0].style.webkitTransform = 'translate3d(' + (XThisPosition - XPosition) + 'px,0,0)';*/

                setTransform(thisFatherEle.getElementsByClassName('show')[0],(XThisPosition - XPosition) + 'px');

                setTransform(thisFatherEle.getElementsByClassName('after')[0],(XThisPosition - XPosition) + 'px');

                setTransform(thisFatherEle.getElementsByClassName('before')[0],(XThisPosition - XPosition) + 'px');

            }
            else {//两种情况，移动，需要当心边缘抵抗

                var thisPosition = XThisPosition - XPosition;

                if (!ifPosition) {

                    if (thisPosition <= 0) {

                        setTransform(thisFatherEle,thisPosition + 'px');

                        /*thisFatherEle.style.transform = 'translate3d(' + thisPosition + 'px,0,0)';
                         thisFatherEle.style.webkitTransform = 'translate3d(' + thisPosition + 'px,0,0)'*/

                    }
                    else {

                        setTransform(thisFatherEle,thisPosition / 4 + 'px');

                        /* thisFatherEle.style.transform = 'translate3d(' + thisPosition / 4 + 'px,0,0)';//边缘抵抗为移动的四分之一

                         thisFatherEle.style.webkitTransform = 'translate3d(' + thisPosition / 4 + 'px,0,0)'*/
                    }
                }
                else {

                    if (thisPosition >= 0) {

                        setTransform(thisFatherEle,(thisPosition - screenWidth) + 'px');

                        /*thisFatherEle.style.transform = 'translate3d(' + (thisPosition - screenWidth) + 'px,0,0)';

                         thisFatherEle.style.webkitTransform = 'translate3d(' + (thisPosition - screenWidth) + 'px,0,0)'*/

                    }

                    else {

                        setTransform(thisFatherEle,(thisPosition / 4 - screenWidth) + 'px');

                        /*thisFatherEle.style.transform = 'translate3d(' + (thisPosition / 4 - screenWidth) + 'px,0,0)';

                         thisFatherEle.style.webkitTransform = 'translate3d(' + (thisPosition / 4 - screenWidth) + 'px,0,0)'*/

                    }
                }
            }

            lastStance = XThisPosition;                                                           //存储这次触摸位置，供下次使用

        }


        /*触摸结束事件*/
        function jfAutoEnd(event) {        //当图片上触摸事件结束时，继续轮播

            // event.preventDefault();                                                                                     //禁止浏览器事件

            var thisFatherEle = document.getElementsByClassName('jf_homepage_autoplay')[0].getElementsByClassName('jf_autoplay_images')[0];//父元素，主要移动该元素

            var thisShowEle = thisFatherEle.getElementsByClassName('show')[0];

            var thisAfterEle = thisFatherEle.getElementsByClassName('after')[0];


            if (isThreeEle) {//三个元素以上的情况

                var thisBeforeEle = thisFatherEle.getElementsByClassName('before')[0];

                thisShowEle.className = thisShowEle.className.replace(' delay', '');                                         //消除平滑过渡的效果

                thisAfterEle.className = thisAfterEle.className.replace(' delay', '');

                thisBeforeEle.className = thisBeforeEle.className.replace(' delay', '');

            }

            if (isChange == 2 && isThreeEle) {//三个元素以上的情况 向右

                jfAutoPlayRight();

            }

            else if (isChange == 2) {//两个元素的情况 向右

                jfAutoPlayTwoRight();

            }
            else if (isChange == 1 && isThreeEle) {//三个元素以上的情况 向左

                jfAutoPlayLeft();

            }
            else if (isChange == 1) {//两个元素的情况 向左

                jfAutoPlayTwoLeft();

            }

            else {

                if (isThreeEle) {

                    setTransform(thisShowEle,0);
                    setTransform(thisAfterEle,0);
                    setTransform(thisBeforeEle,0);

                    /* thisShowEle.style.transform = '';
                     thisShowEle.style.webkitTransform = ''; //此时的元素

                     thisAfterEle.style.transform = '';
                     thisAfterEle.style.webkitTransform = '';  //下一个元素

                     thisBeforeEle.style.transform = '';

                     thisBeforeEle.style.webkitTransform = '';      //上一个元素*/

                }
                else {

                    thisFatherEle.style.transition = '';
                    thisFatherEle.style.webkitTransition = '';

                    if (!ifPosition) {

                        setTransform(thisFatherEle,0);
                        /*thisFatherEle.style.transform = '';
                         thisFatherEle.style.webkitTransform = ''*/

                    }
                    else {

                        var screenWidth = document.body.clientWidth;

                        setTransform(thisFatherEle,'-' + screenWidth + 'px');
                        /*
                         thisFatherEle.style.transform = 'translate3d(-' + screenWidth + 'px,0,0)';

                         thisFatherEle.style.webkitTransform = 'translate3d(-' + screenWidth + 'px,0,0)';
                         */

                    }


                }

                /*thisShowEle.addEventListener('transitionend', transitionMoveEndFn, false);                              //绑定平滑过渡后的方法

                 thisShowEle.addEventListener('webkitTransitionEnd', transitionMoveEndFn, false);

                 thisFatherEle.addEventListener('transitionend', transitionMoveEndFn, false);                              //绑定平滑过渡后的方法

                 thisFatherEle.addEventListener('webkitTransitionEnd', transitionMoveEndFn, false);*/

                addTransition(thisShowEle,transitionMoveEndFn);

                addTransition(thisFatherEle,transitionMoveEndFn);

                function transitionMoveEndFn() {

                    windowBanEvent.unbundling();                                                                        //解绑

                    /*thisShowEle.removeEventListener('transitionend', transitionMoveEndFn, false);                       //绑定平滑过渡后的方法

                     thisShowEle.removeEventListener('webkitTransitionEnd', transitionMoveEndFn, false);

                     thisFatherEle.removeEventListener('transitionend', transitionMoveEndFn, false);                       //绑定平滑过渡后的方法

                     thisFatherEle.removeEventListener('webkitTransitionEnd', transitionMoveEndFn, false);*/

                    removeTransition(thisShowEle,transitionMoveEndFn);

                    removeTransition(thisFatherEle,transitionMoveEndFn);

                }

            }

            if (isThreeEle) {//三个元素以上的情况

                setInterMove1000 = setInterval(jfAutoPlayRight, timer);//加轮播循环

            }
            else {//三个元素以下的情况
                setInterMove1000 = setInterval(jfAutoPlayTwoAll, timer);//开始轮播
            }

            isChange = XPosition = lastStance = 0;    //初始化动态值

            windowBanEvent.unbundling();                                                                                 //解绑

        }


        function jfAutoPlayTwoAll() {

            if (!ifPosition) {

                jfAutoPlayTwoRight();

            }
            else {

                jfAutoPlayTwoLeft();

            }

        }


        function jfAutoPlayTwoRight() {

            var thisFatherEle = document.getElementsByClassName('jf_homepage_autoplay')[0].getElementsByClassName('jf_autoplay_images')[0];//父元素，主要移动该元素

            var screenWidth = document.body.clientWidth;                                                               //屏幕宽度

            thisFatherEle.style.transition = '';

            thisFatherEle.style.webkitTransition = '';


            setTransform(thisFatherEle,'-' + screenWidth + 'px');
            /*thisFatherEle.style.transform = 'translate3d(-' + screenWidth + 'px,0,0)';

             thisFatherEle.style.webkitTransform = 'translate3d(-' + screenWidth + 'px,0,0)';*/

            ifPosition = 1;

            paginationChange(1);

        }

        function jfAutoPlayTwoLeft() {

            var thisFatherEle = document.getElementsByClassName('jf_homepage_autoplay')[0].getElementsByClassName('jf_autoplay_images')[0];//父元素，主要移动该元素

            thisFatherEle.style.transition = '';
            thisFatherEle.style.webkitTransition = '';

            setTransform(thisFatherEle,0);
            /*thisFatherEle.style.transform = '';
             thisFatherEle.style.webkitTransform = '';*/

            ifPosition = 0;

            paginationChange(0);

        }

        function jfAutoPlayRight() {//向右移动

            jfRemoveEvent();

            var thisFatherEle = document.getElementsByClassName('jf_homepage_autoplay')[0].getElementsByClassName('jf_autoplay_images')[0];//父元素，主要移动该元素

            var thisAllTagA = thisFatherEle.getElementsByTagName('a');                                                      //包含img的a

            var thisBeforeEle = thisFatherEle.getElementsByClassName('before')[0];                                         //前一个元素

            var thisShowEle = thisFatherEle.getElementsByClassName('show')[0];                                              //此时的元素

            var thisAfterEle = thisFatherEle.getElementsByClassName('after')[0];                                            //下一个元素

            if (!isAndroidVersion4) {//非安卓4.4以下系统

                thisShowEle.className = thisShowEle.className.replace(' delay', ' move');                                       //此时的元素向后平滑过渡

                setTransform(thisShowEle,'-100%');
                /*thisShowEle.style.transform = 'translate3d(-100%, 0, 0)';
                 thisShowEle.style.webkitTransform = 'translate3d(-100%, 0, 0)';*/

                thisAfterEle.className = thisAfterEle.className.replace(' delay', ' move');                                     //下个元素向后平滑过渡

                setTransform(thisAfterEle,'-100%');
                /*thisAfterEle.style.transform = 'translate3d(-100%, 0, 0)';
                 thisAfterEle.style.webkitTransform = 'translate3d(-100%, 0, 0)';*/

                /*thisShowEle.addEventListener('transitionend', transitionEndFn, false);                                          //绑定平滑过渡后的方法

                 thisShowEle.addEventListener('webkitTransitionEnd', transitionEndFn, false);*/

                addTransition(thisShowEle, transitionEndFn);

                function transitionEndFn() {

                    thisShowEle.className += ' delay';                                                                          //消除平滑过渡的效果

                    thisAfterEle.className += ' delay';

                    setTimeout(function () {

                        thisBeforeEle.className = '';                                                                             //前一个元素隐藏

                        thisShowEle.className = 'before delay';                                                                  //将此时这个元素变成上一个元素

                        setTransform(thisShowEle,0);
                        /*thisShowEle.style.transform = '';
                         thisShowEle.style.webkitTransform = '';*/

                        thisAfterEle.className = 'show delay ';                                                                  //此时下一个元素变成这个元素

                        setTransform(thisAfterEle,0);
                        /*thisAfterEle.style.transform = '';
                         thisAfterEle.style.webkitTransform = '';*/

                        for (var i = 0, switchI = 0; i < thisAllTagA.length; i++) {                                         //遍历寻找下一个元素

                            if (thisAllTagA[i] == thisAfterEle) {                                                           //找到那个元素

                                switchI = 1;

                                paginationChange(i);                                                             //小圆点跳到那个点

                            }
                            else if (switchI && thisAllTagA[i].tagName == 'A') {

                                break;                                                                                       //获取i的值

                            }

                        }

                        if (i != thisAllTagA.length) {                                                                         //如果没有找到，说明下一个元素在第一个

                            thisAllTagA[i].className = 'after delay';

                        }
                        else {

                            thisAllTagA[0].className = 'after delay';                                                      //如果找到，说明下一个元素就是i的位置

                        }

                        /* thisShowEle.removeEventListener('transitionend', transitionEndFn);                                  //移除平滑过渡

                         thisShowEle.removeEventListener('webkitTransitionEnd', transitionEndFn);*/

                        removeTransition(thisShowEle,transitionEndFn)

                        for (var i = 0; i < thisAllTagA.length; i++) {

                            /*thisAllTagA[i].style.transform = '';

                             thisAllTagA[i].style.webkitTransform = '';//清空style值*/

                            setTransform(thisAllTagA[i],0);

                        }

                        jfAddEvent();                                                                            //再加监听

                    }, 1)

                }

            }

            else {//安卓4.4以下系统，取消平滑过渡效果
                thisBeforeEle.className = '';                                                                             //前一个元素隐藏

                thisShowEle.className = 'before delay';                                                                  //将此时这个元素变成上一个元素

                /*thisShowEle.style.transform = '';
                 thisShowEle.style.webkitTransform = '';*/
                setTransform(thisShowEle,0);

                thisAfterEle.className = 'show delay ';                                                                  //此时下一个元素变成这个元素

                setTransform(thisAfterEle,0);
                /*thisAfterEle.style.transform = '';
                 thisAfterEle.style.webkitTransform = '';*/

                for (var i = 0, switchI = 0; i < thisAllTagA.length; i++) {                                         //遍历寻找下一个元素

                    if (thisAllTagA[i].style) {
                        thisAllTagA[i].removeAttribute('style');
                    }
                    if (thisAllTagA[i] == thisAfterEle) {                                                           //找到那个元素

                        switchI = 1;

                        paginationChange(i);                                                             //小圆点跳到那个点
                    }
                    else if (switchI && thisAllTagA[i].tagName == 'A') {

                        break;                                                                                       //获取i的值

                    }
                }

                if (i != thisAllTagA.length) {                                                                         //如果没有找到，说明下一个元素在第一个

                    thisAllTagA[i].className = 'after delay';

                }

                else {

                    thisAllTagA[0].className = 'after delay ';                                                      //如果找到，说明下一个元素就是i的位置

                }

                jfAddEvent();                                                                            //再加监听

            }

        }

        function jfAutoPlayLeft() {//向左移动

            jfRemoveEvent();

            var thisFatherEle = document.getElementsByClassName('jf_homepage_autoplay')[0].getElementsByClassName('jf_autoplay_images')[0];//父元素，主要移动该元素

            var thisAllTagA = thisFatherEle.getElementsByTagName('a');                                                      //包含img的a

            var thisBeforeEle = thisFatherEle.getElementsByClassName('before')[0];                                         //前一个元素

            var thisShowEle = thisFatherEle.getElementsByClassName('show')[0];                                              //此时的元素

            var thisAfterEle = thisFatherEle.getElementsByClassName('after')[0];                                            //下一个元素

            if (!isAndroidVersion4) {//非安卓4.4以下系统

                thisShowEle.className = thisShowEle.className.replace(' delay', ' move_left');                                        //此时的元素向后平滑过渡

                setTransform(thisShowEle,'100%');
                /*thisShowEle.style.transform = 'translate3d(100%, 0, 0)';

                 thisShowEle.style.webkitTransform = 'translate3d(100%, 0, 0)';*/

                thisBeforeEle.className = thisBeforeEle.className.replace(' delay', ' move_left');                                   //下个元素向后平滑过渡

                setTransform(thisBeforeEle,'100%');
                /*thisBeforeEle.style.transform = 'translate3d(100%, 0, 0)';
                 thisBeforeEle.style.webkitTransform = 'translate3d(100%, 0, 0)';*/

                /*thisShowEle.addEventListener('transitionend', transitionEndFn, false);                                          //绑定平滑过渡后的方法

                 thisShowEle.addEventListener('webkitTransitionEnd', transitionEndFn, false);
                 */

                addTransition(thisShowEle,transitionEndFn);

                function transitionEndFn() {

                    thisShowEle.className += ' delay';                                                                          //消除平滑过渡的效果

                    thisBeforeEle.className += ' delay';

                    setTimeout(function () {

                        thisAfterEle.className = '';                                                                             //前一个元素隐藏

                        thisShowEle.className = 'after delay';                                                                  //将此时这个元素变成上一个元素

                        setTransform(thisShowEle,0);
                        /*thisShowEle.style.transform = '';
                         thisShowEle.style.webkitTransform = '';*/

                        thisBeforeEle.className = 'show delay';                                                                  //此时下一个元素变成这个元素

                        setTransform(thisBeforeEle,0);
                        /*thisBeforeEle.style.transform = '';
                         thisBeforeEle.style.webkitTransform = '';*/


                        for (var i = thisAllTagA.length - 1, switchI = 0; i >= 0; i--) {                                         //遍历寻找下一个元素

                            if (thisAllTagA[i] == thisBeforeEle) {

                                switchI = 1;

                                paginationChange(i);

                            }
                            else if (switchI && thisAllTagA[i].tagName == 'A') {

                                break;                                                                                       //获取i的值

                            }

                        }

                        if (i != -1) {                                                                                        //如果没有找到，说明下一个元素在第一个

                            thisAllTagA[i].className = 'before delay';

                        }
                        else {

                            thisAllTagA[thisAllTagA.length - 1].className = 'before delay';                                   //如果找到，说明下一个元素就是i的位置

                        }

                        /*thisShowEle.removeEventListener('transitionend', transitionEndFn);                                  //移除平滑过渡

                         thisShowEle.removeEventListener('webkitTransitionEnd', transitionEndFn);*/

                        removeTransition(thisShowEle,transitionEndFn);

                        for (var i = 0; i < thisAllTagA.length; i++) {

                            /* thisAllTagA[i].style.transform = '';
                             thisAllTagA[i].style.webkitTransform = '';*/
                            setTransform(thisAllTagA[i],0);

                        }

                        jfAddEvent();                                                                            //加监听


                    }, 1)


                }
            }

            else {//安卓4.4以下系统，取消平滑过渡效果
                thisAfterEle.className = '';                                                                             //前一个元素隐藏

                thisShowEle.className = 'after delay';                                                                  //将此时这个元素变成上一个元素

                setTransform(thisShowEle,0);
                // thisShowEle.style.transform = '';
                // thisShowEle.style.webkitTransform = '';

                thisBeforeEle.className = 'show delay';                                                                  //此时下一个元素变成这个元素

                setTransform(thisBeforeEle,0);

                /*thisBeforeEle.style.transform = '';
                 thisBeforeEle.style.webkitTransform = '';*/

                for (var i = thisAllTagA.length - 1, switchI = 0; i >= 0; i--) {                                         //遍历寻找下一个元素

                    if (thisAllTagA[i].style) {
                        thisAllTagA[i].removeAttribute('style');
                    }
                    if (thisAllTagA[i] == thisBeforeEle) {                                                           //找到那个元素

                        switchI = 1;

                        paginationChange(i);                                                             //小圆点跳到那个点
                    }
                    else if (switchI && thisAllTagA[i].tagName == 'A') {

                        break;                                                                                       //获取i的值

                    }
                }

                if (i != -1) {                                                                                        //如果没有找到，说明下一个元素在第一个

                    thisAllTagA[i].className = 'before delay';

                }
                else {

                    thisAllTagA[thisAllTagA.length - 1].className = 'before delay';                                   //如果找到，说明下一个元素就是i的位置

                }

                jfAddEvent();                                                                            //再加监听

            }

        }

        function paginationChange(thisChangeI) {

            var thisPaginationEle = document.getElementsByClassName('jf_homepage_autoplay')[0].getElementsByClassName('jf_pagination')[0];//光标

            var thisPaginationSpan = thisPaginationEle.getElementsByTagName('span');                                        //所有的小点点

            for (var i = 0; i < thisPaginationSpan.length; i++) {

                thisPaginationSpan[i].removeAttribute('class');                                                         //清除所有点点的样式，以便重新写

            }

            var activePag;                                                                                             //增加点点选中时的样式

            if (thisChangeI >= thisPaginationSpan.length) {                                                             //翻动时（最后一张到最后一张）的debug

                activePag = 0;

            }

            else {

                activePag = thisChangeI;                                                                                //到哪张，就移动哪张

            }

            thisPaginationSpan[activePag].className = 'active';                                                         //此时这点点被选中
        }



        /*清空transform属性*/


        function setTransform(ele,num) {

            if(num) {

                ele.style.transform = 'translate3d(' + num + ',0,0)'; //此时的元素

                ele.style.webkitTransform = 'translate3d(' + num + ',0,0)';

            }

            else {

                ele.style.transform = ''; //此时的元素

                ele.style.webkitTransform = '';

            }

        }

        function removeTransition(ele,fn) {

            ele.removeEventListener('transitionend', fn);                                  //移除平滑过渡

            ele.removeEventListener('webkitTransitionEnd', fn);

        }


        function addTransition(ele,fn) {

            ele.addEventListener('transitionend', fn);                                  //移除平滑过渡

            ele.addEventListener('webkitTransitionEnd', fn);

        }

    },


    jfCarouselInit: function () {                                                                                   //初始化

        //window.addEventListener('load', function () {

        jfAutoPlay.jfAutoPlayInit();

        //});

    }

};
var jdShopSecKill = {


    viewMore: function () {

        var isFirstMove = 0;//记录第一次位置

        var thisELe = document.getElementById('viewMore');

        var PositionX, PositionXNew;

        //var jumpFn = 0;

        //if (details.jumpFn) {    //防止事件报错

        //jumpFn = details.jumpFn
        //}

        //在touchstart的时候初始化值
        thisELe.addEventListener('touchstart', touchStartEvent, false);


        thisELe.addEventListener('touchmove', function (e) {

            var _this = this;

            var eleScrollWidth = _this.scrollLeft;//此div横向滚动条的所在位置 603

            var thisEleWidth = _this.scrollWidth;//此div的实际宽度 1007

            var windowsWidth = _this.offsetWidth;//可视窗口的宽度 404

            var touch = e.touches[0];//获得手指的位置

            //判断滚动条的位置当他在0界点的时候

            //如果是安卓始终记录第一次的位置

            if (!isFirstMove && Math.abs(parseFloat(thisEleWidth) - parseFloat(eleScrollWidth + windowsWidth)) <= 2) {

                //获取滚动条到底是现在手机滑动的距离

                PositionX = touch.pageX;

                //console.log('PositionX'+PositionX)

                isFirstMove = 1;

            }

            //获取现在手机滑动的距离

            PositionXNew = touch.pageX;

            //console.log('PositionXNew'+PositionXNew)


        }, false);


        thisELe.addEventListener('touchend', touchEndEvent, false);


        function touchStartEvent() {

            //初始值为0
            PositionX = 0;

            isFirstMove = 0;

            //判断是否为ios
            if(browser.os.iOS){

                thisELe.style.overflow='';
            }



        }


        function touchEndEvent() {

            //如果有移动的值
            if (PositionX) {

                if (PositionXNew - PositionX < 15) {

                    //滚动条拉回顶部 ios

                    if(browser.os.iOS){

                        //滚动条返回顶部

                        thisELe.scrollLeft= 0;


                        thisELe.style.overflow='hidden';

                        setTimeout(function () {

                            thisELe.style.overflow='';

                        },10);

                    }


                    //跳转链接
                    var hrefEle = document.getElementById('jumpHrefView');

                    window.location.href = hrefEle.href


                }


            }

        }


    }


};
/**
 * Created by Qiaodan on 2017/5/25.
 */


//懒加载以及异步加载
var jfLazyLoading = {

    //图片懒加载
    lazyLoadInit: function (details) {

        var _this = this;

        if (!details) {//如果details未输入，则防止报错
            details = {};
        }

        _this.thisImgEle = details.thisImgEle || 'loading_img';//显示的图片,class选择器

        _this.bottomDistance = details.bottomDistance || '50';//图片未显示时距离底部的距离。触发加载的距离


        _this.getLazyDistance(); //页面初始化先执行一次；


        //鼠标滚动事件，触发事件
        addEventListener("scroll", function () {

            _this.getLazyDistance()

        }, false)

    },

    //获取图片距离底部的距离
    getLazyDistance: function () {

        var _this = this;

        var thisScrollTop = document.body.scrollTop;//获取滚动条的距离

        var thisWindowHeight = window.innerHeight;//屏幕可视窗口高度

        var thisMaxHeight = parseFloat(thisScrollTop) + parseFloat(thisWindowHeight);//变化的距离(窗口高度+滚动条距离)

        var allLazyEle = document.getElementsByClassName(_this.thisImgEle);

        for (var i = 0; i < allLazyEle.length; i++) {

            var thisTopDistance = allLazyEle[i].offsetTop;//元素距离文档顶部的距离

            var thisImgSrc = allLazyEle[i].getAttribute('data-src');//获取当前元素的地址

            if (parseFloat(thisTopDistance) - thisMaxHeight <= _this.bottomDistance) {

                allLazyEle[i].setAttribute('src', thisImgSrc)//替换图片地址

            }

        }

    },


    /*异步加载*/
    ajaxLoadInit: function (details) {

        var _this = this;

        if (!details) {//如果details未输入，则防止报错
            details = {};
        }
        _this.ajaxLoadDistance = details.ajaxLoadDistance || '50';//元素未显示时距离底部的距离。触发加载的距离

        _this.fn = details.fn || 0;//默认执行的脚本

        //鼠标滚动事件
        addEventListener("scroll", function () {

            _this.getAjaxLoadDistance();

        }, false)

    },

    //获取异步加载的触发距离
    getAjaxLoadDistance: function () {
        var _this = this;

        var thisScrollTop = document.body.scrollTop;//获取滚动条的距离

        var thisDocumentHeight = document.body.scrollHeight;//获取当前文档的高度

        var thisWindowHeight = window.innerHeight;//屏幕可视窗口高度

        if (parseFloat(thisDocumentHeight) - parseFloat(thisScrollTop + thisWindowHeight) <= _this.ajaxLoadDistance) {//如果当前文档底部距离窗口底部的距离小于50，执行相应的脚本

            if (_this.fn) {

                _this.fn();
            }

        }

    },

    //异步加载的内容
    ajaxContentInit: function (details) {

        var _this = this;

        if (!details) {//如果details未输入，则防止报错

            details = {};
        }


        _this.productdata = details.productdata || [


            {
                "data_href": "javascript:",
                "loading_src": "../../images/img_loading.gif",
                "data_src": "../../images/img_loading.gif",
                "acc_text": false,
                "gift_text": false,
                "product": "***",
                "price_text": "0.00",
                "praise": "100%",

            }
        ];

        var thisInner = '';

        for (var i = 0; i < _this.productdata.length; i++) {


            thisInner =
                '<div class="product_main_img"><img class="loading_img" data-src='
                + _this.productdata[i].data_src +
                ' src='
                + _this.productdata[i].loading_src +
                '></div><div class="product_main_title">';

            if (_this.productdata[i].acc_text) {

                thisInner +=
                    '<span class="acc">'
                    + '附' +
                    '</span>'
            }

            if (_this.productdata[i].gift_text) {
                thisInner +=
                    '<span class="gift">'
                    + '赠' +
                    '</span>'

            }

            /*+'<span class="acc">'
             + _this.productdata[i].acc_text+
             '</span>'

             +'<span class="gift">'
             + _this.productdata[i].gift_text+
             '</span>'*/

            thisInner += _this.productdata[i].product +

                '</div><div class="product_main_price jdshop_alignment_center"><span class="price">￥'

                + _this.productdata[i].price_text +

                '</span><span class="praise"><span>'

                + _this.productdata[i].praise +

                '</span>好评</span></div>';

            var thisAddEle = _this.ajaxAddnode('a', thisInner, 'product');//增加a标签

            thisAddEle.setAttribute('href', _this.productdata[i].data_href)

        }

        var allAccEle = document.getElementsByClassName('hot_goods_list')[0].getElementsByClassName('acc');//所有‘附’字的span元素；

        var allGiftEle = document.getElementsByClassName('hot_goods_list')[0].getElementsByClassName('gift');//所有‘赠’字的span元素


        //判断当前有没有‘附’字
        /*for(var i=0;i<allAccEle.length;i++){

         if(allAccEle[i].innerHTML==""){

         allAccEle[i].style.display="none"
         }

         }
         //判断当前有没有‘赠’字
         for(var i=0;i<allGiftEle.length;i++){

         if(allGiftEle[i].innerHTML==""){
         allGiftEle[i].style.display="none"
         }

         }*/


    },

    //添加元素
    ajaxAddnode: function (tag, innerHtml, className) {

        var _this = this;

        var obj = document.createElement(tag);

        if (className) {

            obj.className = className
        }

        obj.innerHTML = innerHtml;

        //obj.setAttribute('href',_this.productdata[i].data_href);

        document.getElementsByClassName('hot_goods_list')[0].appendChild(obj);

        return obj
    }
}

//懒加载以及异步加载结束



/**
 * Created by ZHUANGYI on 2017/8/28.
 */

var jdShopSecKill = {


    viewMore: function () {

        var isFirstMove = 0;//记录第一次位置

        var thisELe = document.getElementById('viewMore');

        var PositionX, PositionXNew;

        //var jumpFn = 0;

        //if (details.jumpFn) {    //防止事件报错

        //jumpFn = details.jumpFn
        //}

        //在touchstart的时候初始化值
        thisELe.addEventListener('touchstart', touchStartEvent, false);


        thisELe.addEventListener('touchmove', function (e) {

            var _this = this;

            var eleScrollWidth = _this.scrollLeft;//此div横向滚动条的所在位置 603

            var thisEleWidth = _this.scrollWidth;//此div的实际宽度 1007

            var windowsWidth = _this.offsetWidth;//可视窗口的宽度 404

            var touch = e.touches[0];//获得手指的位置

            //判断滚动条的位置当他在0界点的时候

            //如果是安卓始终记录第一次的位置

            if (!isFirstMove && Math.abs(parseFloat(thisEleWidth) - parseFloat(eleScrollWidth + windowsWidth)) <= 2) {

                //获取滚动条到底是现在手机滑动的距离

                PositionX = touch.pageX;

                //console.log('PositionX'+PositionX)

                isFirstMove = 1;

            }

            //获取现在手机滑动的距离

            PositionXNew = touch.pageX;

            //console.log('PositionXNew'+PositionXNew)


        }, false);


        thisELe.addEventListener('touchend', touchEndEvent, false);


        function touchStartEvent() {

            //初始值为0
            PositionX = 0;

            isFirstMove = 0;

            //判断是否为ios
            if(browser.os.iOS){

                thisELe.style.overflow='';
            }



        }


        function touchEndEvent() {

            //如果有移动的值
            if (PositionX) {

                if (PositionXNew - PositionX < 15) {

                    //滚动条拉回顶部 ios

                    if(browser.os.iOS){

                        //滚动条返回顶部

                        thisELe.scrollLeft= 0;


                        thisELe.style.overflow='hidden';

                        setTimeout(function () {

                            thisELe.style.overflow='';

                        },10);

                    }


                    //跳转链接
                    var hrefEle = document.getElementById('jumpHrefView');

                    window.location.href = hrefEle.href


                }


            }

        }


    }


};


/**
 * Created by Qiaodan on 2017/5/25.
 */


//懒加载以及异步加载
var jfLazyLoading = {

    //图片懒加载
    lazyLoadInit: function (details) {

        var _this = this;

        if (!details) {//如果details未输入，则防止报错
            details = {};
        }

        _this.thisImgEle = details.thisImgEle || 'loading_img';//显示的图片,class选择器

        _this.bottomDistance = details.bottomDistance || '50';//图片未显示时距离底部的距离。触发加载的距离


        _this.getLazyDistance(); //页面初始化先执行一次；


        //鼠标滚动事件，触发事件
        addEventListener("scroll", function () {

            _this.getLazyDistance()

        }, false)

    },

    //获取图片距离底部的距离
    getLazyDistance: function () {

        var _this = this;

        var thisScrollTop = document.body.scrollTop;//获取滚动条的距离

        var thisWindowHeight = window.innerHeight;//屏幕可视窗口高度

        var thisMaxHeight = parseFloat(thisScrollTop) + parseFloat(thisWindowHeight);//变化的距离(窗口高度+滚动条距离)

        var allLazyEle = document.getElementsByClassName(_this.thisImgEle);

        for (var i = 0; i < allLazyEle.length; i++) {

            var thisTopDistance = allLazyEle[i].offsetTop;//元素距离文档顶部的距离

            var thisImgSrc = allLazyEle[i].getAttribute('data-src');//获取当前元素的地址

            if (parseFloat(thisTopDistance) - thisMaxHeight <= _this.bottomDistance) {

                allLazyEle[i].setAttribute('src', thisImgSrc)//替换图片地址

            }

        }

    },


    /*异步加载*/
    ajaxLoadInit: function (details) {

        var _this = this;

        if (!details) {//如果details未输入，则防止报错
            details = {};
        }
        _this.ajaxLoadDistance = details.ajaxLoadDistance || '50';//元素未显示时距离底部的距离。触发加载的距离

        _this.fn = details.fn || 0;//默认执行的脚本

        //鼠标滚动事件
        addEventListener("scroll", function () {

            _this.getAjaxLoadDistance();

        }, false)

    },

    //获取异步加载的触发距离
    getAjaxLoadDistance: function () {
        var _this = this;

        var thisScrollTop = document.body.scrollTop;//获取滚动条的距离

        var thisDocumentHeight = document.body.scrollHeight;//获取当前文档的高度

        var thisWindowHeight = window.innerHeight;//屏幕可视窗口高度

        if (parseFloat(thisDocumentHeight) - parseFloat(thisScrollTop + thisWindowHeight) <= _this.ajaxLoadDistance) {//如果当前文档底部距离窗口底部的距离小于50，执行相应的脚本

            if (_this.fn) {

                _this.fn();
            }

        }

    },

    //异步加载的内容
    ajaxContentInit: function (details) {

        var _this = this;

        if (!details) {//如果details未输入，则防止报错
            details = {};
        }


        _this.productdata = details.productdata || [


            {
                "data_href": "javascript:",
                "loading_src": "../../images/img_loading.gif",
                "data_src": "../../images/img_loading.gif",
                "acc_text": false,
                "gift_text": false,
                "product": "***",
                "price_text": "0.00",
                "praise": "100%",

            }
        ];

        var thisInner = '';

        for (var i = 0; i < _this.productdata.length; i++) {


            thisInner =
                '<div class="product_main_img"><img class="loading_img" data-src='
                + _this.productdata[i].data_src +
                ' src='
                + _this.productdata[i].loading_src +
                '></div><div class="product_main_title">';

            if (_this.productdata[i].acc_text) {

                thisInner +=
                    '<span class="acc">'
                    + '附' +
                    '</span>'
            }

            if (_this.productdata[i].gift_text) {
                thisInner +=
                    '<span class="gift">'
                    + '赠' +
                    '</span>'

            }

            /*+'<span class="acc">'
             + _this.productdata[i].acc_text+
             '</span>'

             +'<span class="gift">'
             + _this.productdata[i].gift_text+
             '</span>'*/

            thisInner += _this.productdata[i].product +

                '</div><div class="product_main_price"><span class="price">￥'

                + _this.productdata[i].price_text +

                '</span><span class="praise"><span>'

                + _this.productdata[i].praise +

                '</span>好评</span></div>';

            var thisAddEle = _this.ajaxAddnode('a', thisInner, 'product');//增加a标签

            thisAddEle.setAttribute('href', _this.productdata[i].data_href)

        }

        var allAccEle = document.getElementsByClassName('hot_goods_list')[0].getElementsByClassName('acc');//所有‘附’字的span元素；

        var allGiftEle = document.getElementsByClassName('hot_goods_list')[0].getElementsByClassName('gift');//所有‘赠’字的span元素


        //判断当前有没有‘附’字
        /*for(var i=0;i<allAccEle.length;i++){

         if(allAccEle[i].innerHTML==""){

         allAccEle[i].style.display="none"
         }

         }
         //判断当前有没有‘赠’字
         for(var i=0;i<allGiftEle.length;i++){

         if(allGiftEle[i].innerHTML==""){
         allGiftEle[i].style.display="none"
         }

         }*/


    },

    //添加元素
    ajaxAddnode: function (tag, innerHtml, className) {

        var _this = this;

        var obj = document.createElement(tag);

        if (className) {

            obj.className = className
        }

        obj.innerHTML = innerHtml;

        //obj.setAttribute('href',_this.productdata[i].data_href);

        document.getElementsByClassName('hot_goods_list')[0].appendChild(obj);

        return obj
    }
}

//懒加载以及异步加载结束



/**
 * Created by ZHUANGYI on 2017/6/5.
 */


var
    jfProductDetails = {


    //------ 安卓系统滑动到一定位置固定tab

    slidePositionTab: function () {


        if (!browser.os.iOS) {  //判断机型

            var thisNavTab = document.getElementById('NavTab');

            var thisNavTabEmpty = document.getElementById('NavTabEmpty');


            function scrcoll() {

                if (thisNavTabEmpty.getBoundingClientRect().top <= 0) { //元素到页面顶端的位置

                    thisNavTab.style.position = 'fixed';

                    thisNavTab.style.top = '45px';

                    thisNavTab.style.zIndex = '100'

                }

                else {

                    thisNavTab.style.cssText = "";

                }
            }

            scrcoll();
        }

    },

    //------点击切换class

    clickTabChange: function (fatherEle, changeClass, className) {


        var allEle = fatherEle.getElementsByClassName(className);


        for (var i = 0; i < allEle.length; i++) {

            allEle[i].addEventListener('click', function () {

                fatherEle.getElementsByClassName(changeClass)[0].className = fatherEle.getElementsByClassName(changeClass)[0].className.replace(changeClass, '');

                this.className += ' ' + changeClass;

            }, false);

        }


    },


    //------ 多个sku点击
    skuBoxChange: function () {

        var skuBox = document.getElementById('main_sku').getElementsByClassName('sku_contain');

        for (var i = 0; i < skuBox.length; i++) {

            jfProductDetails.clickTabChange(skuBox[i], 'choose_tab', 'sku_box');
        }

    },


    //------tab点击切换页面

    tabScrollChange: function () {

        window.addEventListener('scroll', function () {


            var thisNavTab = document.getElementById('NavTab');

            var topTabHeigt = document.getElementsByClassName('product_nav_contain')[0];

            var a = thisNavTab.offsetHeight + topTabHeigt.offsetHeight;

            var parameterBlockDis = document.getElementsByClassName('product_images_parameter')[0];                         //参数规格到页面顶部的距离

            var serviceBlockDis = document.getElementsByClassName('product_images_service')[0];                             //售后到页面顶部的距离


            var imgBlockDis = document.getElementsByClassName('product_images')[0];


            if (imgBlockDis.getBoundingClientRect().top > thisNavTab.offsetHeight) {                                       //超出部分大于45 = 商品


                slideTabChoose(document.getElementsByClassName('content')[0], 'nav_tab', 0);

            }

            else if (imgBlockDis.getBoundingClientRect().top <= thisNavTab.offsetHeight) {                                //img模块小于等于45 = 图文


                slideTabChoose(document.getElementsByClassName('content')[0], 'nav_tab', 1);


                function titleTabChange() {                                                                                //图文&参数&售后切换


                    if (serviceBlockDis.getBoundingClientRect().top - a <= 0) {                                             //参数模块到页面顶部的距离 a为两个导航的和


                        slideTabChoose(document.getElementById('NavTab'), 'tab', 2);

                    }
                    else if (parameterBlockDis.getBoundingClientRect().top - a <= 0) {


                        slideTabChoose(document.getElementById('NavTab'), 'tab', 1);

                    }
                    else {

                        slideTabChoose(document.getElementById('NavTab'), 'tab', 0);
                    }
                }

                titleTabChange();

            }
            function slideTabChoose(element, childClassName, num) {                                                    //选择切换tab

                if (element.getElementsByClassName('choose_tab')[0]) {


                    element.getElementsByClassName('choose_tab')[0].className = element.getElementsByClassName('choose_tab')[0].className.replace('choose_tab', '');

                }

                element.getElementsByClassName(childClassName)[num].className += ' choose_tab';

            }


        });


    },

    //------点击滚动条到固定位置

    scrollEle: function (ele, distance) {


        var eleScrollTop = ele.getBoundingClientRect().top + getScrollTop() - distance;

        var scrollTopMove = setInterval(interValScroll, 5);                                                             //循环

        var iChage = 0;                                                                                                 //循环计数

        var elasticity = 1;                                                                                             //变化的计量

        var thisScrollTop;

        var changeDistanceScrollTop = eleScrollTop - getScrollTop();                                           //真实的相差距离

        function interValScroll() {

            elasticity = (25 - iChage) / 25 * .9 + 1;                                                                   //变化的计量=(25-此时的计数)/25*.9+1; 用于乘法的计量，大概变化过程：1.5 -> 1 -> 0.5 ，模拟平滑过渡

            thisScrollTop = getScrollTop() + changeDistanceScrollTop / 50 * elasticity;                        //计算此时的距离

            //console.log('页面滚动距离'+getScrollTop());

            window.scrollTo(0, thisScrollTop);

            iChage++;                                                                                                   //计数

            if (iChage == 50) {

                window.scrollTo(0, eleScrollTop);


                clearInterval(scrollTopMove);                                                                           //如果到50，则结束循环

                //console.log('最后滚动为止：'+eleScrollTop)


            }




        }

        //兼容性修正
        function getScrollTop(){

            var scrollTop=0;

            if(document.documentElement&&document.documentElement.scrollTop){

                scrollTop=document.documentElement.scrollTop;

            }else if(document.body){

                scrollTop=document.body.scrollTop;
            }
            return scrollTop;
        }

    },

    //------切换立即购买&加入购物车

    changeHideBtn: function (classBtn) {

        var FatherBtn = document.getElementsByClassName('prompt_btn')[0];

        FatherBtn.getElementsByClassName('hidebtn')[0].className = FatherBtn.getElementsByClassName('hidebtn')[0].className.replace('hidebtn', '');

        FatherBtn.getElementsByClassName(classBtn)[0].className += ' hidebtn';

    },

    //------购物车加减按钮

    volumeChange: function (isProduct) {  //如果是详情页的话为true，不是的话为false

        var volumeBox = document.getElementsByClassName('volume_btn');

        var lastScrollTop;

        for (var i = 0; i < volumeBox.length; i++) {   //找到当前的父元素

            volumeBox[i].getElementsByClassName('reduce')[0].addEventListener('touchstart', reduceEle, false);          //对 加&减

            volumeBox[i].getElementsByClassName('add')[0].addEventListener('touchstart', reduceEle, false);

            volumeBox[i].getElementsByClassName('volume_input')[0].addEventListener('blur', valueOne, false);          //对 加&减

            if (browser.os.iOS && isProduct) {

                var inputEle = volumeBox[i].getElementsByClassName('volume_input')[0];

                inputEle.addEventListener('focus', focusScrollPosition, false);

                inputEle.addEventListener('blur', blurScrollPosition, false);
            }
/*            else {

                var inputEle = volumeBox[i].getElementsByClassName('volume_input')[0];

                inputEle.addEventListener('focus', focusAndroidTab, false);

                inputEle.addEventListener('blur', blurAndroidTab, false);
                
                

            }*/

        }

        function focusAndroidTab() {

            document.getElementById('settlementTab').style.display = 'none';

            document.getElementById('deleteTab').style.display = 'none';

            document.getElementsByClassName('bottom_tabbar')[0].style.display = 'none'



        }

        function blurAndroidTab() {

            document.getElementById('settlementTab').style.display = '';

            document.getElementById('deleteTab').style.display = '';

            document.getElementsByClassName('bottom_tabbar')[0].style.display = ''

        }

        function reduceEle() {


            var eleInput = this.parentNode.getElementsByClassName('volume_input')[0];

            var thisValue = parseInt(eleInput.value);

            if (this.className.indexOf('reduce') > -1) {


                eleInput.value = changeValue(thisValue - 1);


            }
            else {

                eleInput.value = changeValue(thisValue + 1);

            }


        }

        function changeValue(num) { //循环 小于等于1的时候永远为1，反之为他本身的值


            if (num <= 1 || !num) {

                return 1;
            }
            else {

                return num;
            }

        }

        function blurScrollPosition() {

            window.scrollTo(0, lastScrollTop);

            valueOne();


        }

        function valueOne() {

            this.value = changeValue(this.value); //如果输入的内容为0或者空时,value为1

        }

        function focusScrollPosition() {

            lastScrollTop = document.body.scrollTop;

            setTimeout(function () {

                window.scrollTo(0, document.body.scrollHeight);

            }, 300)

        }


    },


    //------弹出框点穿问题 0904更新
    clickThrough:function (fatherEle,hasScrollEle) {

    var thisScrollEle = document.getElementById(fatherEle).getElementsByClassName(hasScrollEle);

    //var thisVolum = document.getElementById('product_prompt_buy').getElementsByClassName('sku_volume_purchased')[0];

    var popTop = document.getElementsByClassName('pop_top')[0];

    var thisAddress = document.getElementById('jd_address_select').getElementsByClassName('top_address')[0];

    var startY, endY, distance;//开始距离、移动距离

/*        for (var i=0;i<thisScrollEle.length;i++){

            if(thisScrollEle[i].clientHeight < thisScrollEle[i].offsetHeight-4){

                thisScrollEle[i].addEventListener('touchstart', touchStartEle, false);

                thisScrollEle[i].addEventListener('touchmove', reachEdge, false);

            }

            else {

                thisScrollEle[i].addEventListener('touchmove,touchstart',windowBanEvent.Canceling,false);
            }

        }*/
        for(var i=0;i<thisScrollEle.length;i++){



            thisScrollEle[i].addEventListener('touchstart', touchStartEle, false);

            thisScrollEle[i].addEventListener('touchmove', reachEdge, false);

        }




    if(thisAddress){

        thisAddress.addEventListener('touchmove,touchstart',windowBanEvent.Canceling,false);

    }

    popTop.addEventListener('touchmove',windowBanEvent.Canceling,false);

    //thisScrollEle.addEventListener('touchmove', reachEdge, false);


    function touchStartEle(e) {

        //touchstart 获取位置startY

        startY = e.touches[0].pageY;

    }


    function reachEdge(event) {

        var _this = this;

        var eleScrollHeight = _this.scrollTop;//获取滚动条的位置 206

        var eleHeight = _this.scrollHeight;//元素实际高度 506

        var containerHeight = _this.offsetHeight;//容器高度 300


        //touchmove 获取位置 endY

        endY = event.touches[0].pageY;

        //两者之减的距离用来判断是向上活动还是向下滑动
        distance = startY - endY;

        //此时touchmove的值等于touchstart的值 循环
        endY = startY;


        //滚动条到达底部

        if (Math.abs(parseFloat(eleHeight) - parseFloat(eleScrollHeight + containerHeight)) <= 2) {


            //如果距离为正数 则向上滑动是 禁止浏览器事件

            if (distance > 0) {

                event.preventDefault();


            }


        }

        else if (Math.abs(parseFloat(eleScrollHeight)) == 0) {

            //如果距离为负数 则向下滑动

            if (distance < 0) {

                event.preventDefault();

            }


        }

    }


},


    //------弹出框滚动条 0125更新
    accSrcollToTop:function () {

        document.getElementById('product_prompt_acc').getElementsByClassName('pop_cancel')[0].addEventListener('click',toTop,false);

        document.getElementById('product_prompt_acc').getElementsByClassName('jf_pop_up_bg')[0].addEventListener('click',toTop,false);

        function toTop() {

            document.getElementById('product_prompt_acc').getElementsByClassName('pop_content')[0].scrollTop = 0
            
        }
    },


    //------关注

    likeGoods:function(ele) {

    var thisEle = ele;

    if(thisEle.className.indexOf('like_red') > -1){

        thisEle.className = 'btn';

        thisEle.getElementsByTagName('p')[0].innerHTML = '关注'

    }
    else {

        thisEle.className = 'btn like_red';

        thisEle.getElementsByTagName('p')[0].innerHTML = '已关注'
    }

},


    //------关注
    slidePositionSimilarTab: function () {


        if (!browser.os.iOS) {  //判断机型

            var thisNavTab = document.getElementsByClassName('similar_details_nav')[0];

            var thisNavTabEmpty = document.getElementsByClassName('similar_tab_box')[0];


            function scrcoll() {

                if (thisNavTabEmpty.getBoundingClientRect().top <= 0) { //元素到页面顶端的位置

                    thisNavTab.style.position = 'fixed';

                    thisNavTab.style.top = '45px';

                    thisNavTab.style.zIndex = '100'

                }

                else {

                    thisNavTab.style.cssText = "";

                }
            }

            scrcoll();
        }

    },


};




















/*图片缩放*/
function initBannerTouch(details) {


    var leftFn=details.leftFn;

    var rightFn=details.rightFn;


    //需要加监听的元素
    var moveEle = document.getElementsByClassName("jd_banner_touch");

    for(var i=0;i<moveEle.length;i++){

        moveEle[i].addEventListener('touchstart', imgTouchStart, false);

        moveEle[i].addEventListener('touchmove', imgTouchMove,false);

        moveEle[i].addEventListener('touchend', imgTouchEnd, false);


    }


    /*储存是否需要更新第一次的位置*/
    var isSaveDistance = true;

    //存储上一次距离
    var firstDistance = 0;

    /*缓存最新的距离*/
    var lastDistance = 0;

    /*上一次的放大缩小比例*/
    var pastProportion = 1;

    /*保存最新的移动参考位置*/
    var lastPalace = [0, 0];

    /*缓存第一次移动参考位置*/
    var firstPalace = [0, 0];

    /*保存每次元素真正偏移位置*/
    var lastPositionTransform = [0, 0];

    /*上一次的偏移位置*/
    var pastPositionTransform = [0, 0];

    /*保存移动方式*/
    var howMove = 0;


    /*缓存本次比例*/
    var proportion = 1;


    function imgTouchStart(evt) {

        /*删除所有变换*/
        while (this.className.indexOf('move') != -1) {

            this.className = this.className.replace('move', '')

        }

        /*去除ios抖动*/
        /* if(browser.os.iOS && this.className.indexOf('ios')==-1){

         this.className+=' ios'

         }*/

        /*初始化放大缩小倍数
         * */
        pastProportion = 1;

        proportion = 1;

        /*自锁打开*/
        isSaveDistance = true;

        /*初始化移动方式*/
        howMove = 0;

        pastPositionTransform = [0, 0];

    }


    //放大缩小事件
    function imgTouchMove(evt) {

        if (evt.touches.length == 1 && (howMove == 1 || howMove == 0) && this.getAttribute('data-proportio') && this.getAttribute('data-proportio') != 1) {

            howMove = 1;
            /*单个就保存一个的位置*/
            lastPalace = [evt.touches[0].pageX, evt.touches[0].pageY];

            /*判断是否是第一次一个手指，是的话就缓存该位置*/
            if (isSaveDistance) {

                /*自锁*/
                isSaveDistance = false;

                /*保存第一次居中位置*/
                firstPalace = lastPalace;

                /*如果有上次改变值，则作为乘积，缓存*/
                if (this.getAttribute('data-proportio')) {

                    proportion=pastProportion = this.getAttribute('data-proportio');

                    /*上一次x轴偏移*/
                    pastPositionTransform[0] = parseInt(this.getAttribute('data-left'));

                    /*上一次y轴偏移*/
                    pastPositionTransform[1] = parseInt(this.getAttribute('data-top'))

                }

            }

            lastPositionTransform = [

                (lastPalace[0] - firstPalace[0]) / proportion + pastPositionTransform[0],

                (lastPalace[1] - firstPalace[1]) / proportion + pastPositionTransform[1]

            ];

            /*变化*/


            changeTransform(this,proportion, lastPositionTransform[0], lastPositionTransform[1]);



            //test1(lastPositionTransform[0]);

            //test2(proportion)

            /*禁止浏览器默认事件*/
            evt.preventDefault();

            evt.stopPropagation()



        }

        /*多于两个手指打开*/
        else if (evt.touches.length == 2 && (howMove == 2 || howMove == 0)) {

            howMove = 2;

            var touchsX = [evt.touches[0].pageX, evt.touches[1].pageX];

            var touchsY = [evt.touches[0].pageY, evt.touches[1].pageY];

            /*保存最新的触摸中间点位置*/
            lastPalace = [(touchsX[0] + touchsX[1]) / 2, (touchsY[0] + touchsY[1]) / 2];

            /*控制放大缩小*/
            /*两手指间的距离*/
            lastDistance = Math.sqrt(
                Math.pow(touchsX[0] - touchsX[1], 2),

                Math.pow(touchsY[0] - touchsY[1], 2)
            );

            /*判断是否是第一次出现两个手指，是的话就缓存该位置*/
            if (isSaveDistance && lastDistance > 0) {

                /*自锁*/
                isSaveDistance = false;

                /*保存第一次位置*/
                firstDistance = lastDistance;

                /*保存第一次居中位置*/
                firstPalace = lastPalace;

                /*如果有上次改变值，则作为乘积，缓存*/
                if (this.getAttribute('data-proportio')) {

                    /*查找上一次的缩放比例*/
                    pastProportion = this.getAttribute('data-proportio');

                    /*上一次x轴偏移*/
                    pastPositionTransform[0] = parseInt(this.getAttribute('data-left'));

                    /*上一次y轴偏移*/
                    pastPositionTransform[1] = parseInt(this.getAttribute('data-top'))

                }

            }

            /*比例=(第一次次距离+增量*比例)/第一次次距离*乘积*/
            proportion = (firstDistance + (lastDistance - firstDistance) / 3 * 2) / firstDistance * pastProportion;

            /*比例控制*/
            proportion = (function (num) {

                /*安卓没有弹性收回*/
                if (browser.os.iOS) {
                    /*大于1 减弱*/
                    if (num < 1) {

                        num = 1 - (1 - num ) / 2;

                    }

                    else if (num > 3.5) {

                        num = 2.833;

                    }

                    /*大于2.5 减弱*/
                    else if (num > 2.5) {

                        num = 2.5 + (num - 2.5 ) / 3;

                    }


                    return num
                }

                else {

                    return controlNum(num)

                }

            })(proportion);

            /*储存上一次比例*/
            this.setAttribute('data-proportio', proportion);

            //test1(proportion);

            /*保存上一次位置=（本次位置-第一次位置）/放大缩小系数*/
            lastPositionTransform = [

                (lastPalace[0] - firstPalace[0]) / proportion + pastPositionTransform[0],

                (lastPalace[1] - firstPalace[1]) / proportion + pastPositionTransform[1]

            ];


            /*变化*/
            changeTransform(this,proportion, lastPositionTransform[0], lastPositionTransform[1]);

            //test1(lastPositionTransform[0]);

            //test2(proportion)

            /*禁止浏览器默认事件*/
            evt.preventDefault();

            evt.stopPropagation()


        }

    }


    /*触摸结束方法*/
    function imgTouchEnd(evt) {

        var _this = this;

        /*最后的数据进行调整*/
        proportion = controlNum(proportion);

        lastPositionTransform[0] = controlTransformX(lastPositionTransform[0], _this);

        lastPositionTransform[1] = controlTransformY(lastPositionTransform[1], _this);

        /*变化函数*/
        change(_this,proportion, lastPositionTransform[0], lastPositionTransform[1]);

        function change(ele,num, positionLeft, positionTop) {

            changeTransform(ele,num, positionLeft, positionTop);

            _this.setAttribute('data-proportio', num);

            _this.setAttribute('data-left', positionLeft);

            _this.setAttribute('data-top', positionTop);

            _this.className += ' move'

        }

    }

    /*处理数字方法*/
    function controlNum(num) {

        if (num < 1) {

            return 1

        }

        /*小于2.5收回*/
        else if (num > 2.5) {

            return 2.5

        }

        return num

    }

    /*x轴*/
    function controlTransformX(num, ele) {

        var offsetWidth = document.documentElement.clientWidth;

        /*实际元素高度*/
        var thisWidth = ele.clientWidth * controlNum(proportion);


        /*整体居中*/
        if (offsetWidth >= thisWidth) {

            return 0

        }

        else {

            var distance = ele.getBoundingClientRect().left;

            /*左边没有贴合*/
            if (distance > 0) {


                if(distance > offsetWidth /3 ){


                    leftFn();




                }

                return (thisWidth - offsetWidth) / 2 / proportion

            }

            /*右边没有贴合*/
            else if (offsetWidth - (thisWidth + distance) > 0) {


                if(offsetWidth - (thisWidth + distance) > offsetWidth /3 ){

                    rightFn();




                }

                return -(thisWidth - offsetWidth) / 2 / proportion

            }


            else {

                return num

            }

        }


    }


    //y轴回正
    function controlTransformY(num, ele) {

        /*页高*/
        var offsetHeight = document.documentElement.clientHeight;

        /*实际元素高度*/
        var thisHeight = ele.clientHeight * controlNum(proportion);


        /*整体居中*/
        if (offsetHeight >= thisHeight) {

            return 0

        }

        else {

            var distance = ele.getBoundingClientRect().top;

            /*上部没有贴合*/
            if (distance > 0) {

                return (thisHeight - offsetHeight) / 2 / proportion

            }

            /*下部没有贴合*/
            else if (offsetHeight - (thisHeight + distance) > 0) {

                return -(thisHeight - offsetHeight) / 2 / proportion

            }

            else {

                return num

            }

        }

    }

    /*通用放大缩小方法*/
    function changeTransform(ele,proportionNum, transformLeft, transformTop) {


        var thisTransformDetail = "scale3d(" + proportionNum + "," + proportionNum + ",1) translate3d(" + transformLeft + "px, " + transformTop + "px , 0)";

        ele.style.transform = thisTransformDetail;

        ele.style.webkitTransform = thisTransformDetail;


    }

}

/*图片手动轮播*/
var productInfoPlay={

    "figer":{

        "ischange":true,

        "ismove":true //true表示左右移动，执行轮播的JS，false表示上下移动，不执行轮播的JS

    },
    /*初始化,没有动画弹出*/
    init:function(details){

        var _this=this;

        if(!details){//如果details未输入，则防止报错
            details={};
        }

        _this.moveEle = details.moveEle || 'allimg';//当前显示的banner图片的整个div,class选择器

        _this.moveEleParent=details.moveEleParent||'demo1';//当前显示的整个框架

        _this.scaleEleParent=details.scaleEleParent||'jdshow_center_center';

        _this.allShowEle=details.allShowEle||false;//整个弹出的元素框架,class选择器，默认没有

        _this.fn=details.fn||0;

        _this.thisPosition = 0;//初始化现在在第几个页面

        _this.moveDistanceX = 0;//x方向移动的距离(一根手指)

        _this.moveDistanceY=0;//y方向移動的距離

        setTimeout(function () {

            //当前页面Banner部分绑定事件
            _this.initPointEle(_this.moveEleParent);//初始化点点（参数一当前移动元素的父元素）

        },100);


        _this.moveEvent();//元素绑定事件（参数一当前移动元素）


        if( _this.allShowEle){//如果存在弹出的页面

          //  _this.initPointEle( _this.allShowEle);//初始化点点（参数一当前移动元素的父元素）

            document.getElementsByClassName( _this.allShowEle)[0].getElementsByClassName( _this.moveEle)[0].innerHTML=document.getElementsByClassName( _this.moveEle)[0].innerHTML;//获取所有的图片=主体内容图片部分

            document.getElementsByClassName('img_content')[0].addEventListener('touchmove',function(e){e.preventDefault()},false);//禁止阴影部分滑动

            var BannerEle=document.getElementsByClassName( _this.moveEle)[0].getElementsByClassName(_this.scaleEleParent);

            for(var i=0;i<BannerEle.length;i++){

                BannerEle[i].getElementsByTagName('div')[0].className=""
            }

            var hideBannerEle=document.getElementsByClassName('delete_banner')[0];//关闭弹出层元素；

            hideBannerEle.addEventListener('click',function(){

                var thisScaleEle=document.getElementsByClassName('jd_banner_touch');

                for(var i=0;i<thisScaleEle.length;i++){

                    thisScaleEle[i].style.transform="scale3d(1,1,1) translate3d(0,0,0)";
                }

                document.getElementsByClassName( _this.allShowEle)[0].style.display='none';

                document.getElementsByTagName("body")[0].style.overflow="";//页面可以滚动

                document.getElementsByTagName("html")[0].style.overflow="";//页面可以滚动

                document.getElementsByTagName("body")[0].style.height="100%";

                document.getElementsByTagName("html")[0].style.height="100%";



            },false);


            initBannerTouch({

                leftFn:function () {

                   // _this.movePosition(1);//(向右滑动)

                },

                rightFn:function (e) {

                 //   _this.movePosition(-1);//(向左滑动)

                }

            })
        }


    },


    /*元素绑定事件*/
    moveEvent:function(){//参数一为移动元素的class值，参数二是点点的父元素

        var _this=this;

        var moveEle=document.getElementsByClassName(_this.moveEle);//banner轮播图

        var thisNum = moveEle[0].getElementsByClassName(_this.scaleEleParent).length - 1;

        var thisWindowWidth = window.innerWidth;//屏幕可视窗口宽度

        var firstTouchesClientX; //初次点击的位置X坐标

        var firstTouchesClientY;//初次点击的位置Y坐标

        var moveTouchesClientX;//移动一段距离后，停止点的位置(X)

        var moveTouchesClientY;//移动一段距离后，停止点的位置(Y)

        var lastDis=0;//前一次距离

        var newDis=0;//最新的距离

        var lastDistanceSpeed=0;//最后一次速度


            moveEle[0].addEventListener('touchstart',function(event){

                var evt = event ? event : window.event;

                if(evt.touches.length==1){

                    _this.moveDistanceX=0;

                    _this.moveDistanceY=0;

                    _this.figer.ischange=true;//初始化可移动

                    getFirstPosition(event);

                    if(this.className=""+_this.moveEle+" contentchange"){

                        this.className=""+_this.moveEle+""
                    }
                }




            },false);//获取初始位置

            moveEle[0].addEventListener('touchmove',function(event){

                var evt = event ? event : window.event;

                if(evt.touches.length==1){

                    lastDistanceSpeed=getLastPosition(event);

                    if(_this.figer.ischange){

                        if(Math.abs(_this.moveDistanceY)>Math.abs(_this.moveDistanceX)){//如果在Y軸方向移動的距離大於X軸方向，則不轮播

                            _this.figer.ismove=false
                        }else {

                            _this.figer.ismove=true
                        }

                        _this.figer.ischange=false;//进行锁定一次，
                    }

                    if( _this.figer.ismove){//判断为左右移动时，即可运行相应的JS

                        evt.preventDefault();//阻止浏览器的默认行为

                        evt.stopPropagation();

                        if(((_this.thisPosition==0)&&_this.moveDistanceX>0)||((_this.thisPosition==-thisNum) &&_this.moveDistanceX<0)){//第一页，滑动会产生一个阻力
                            _this.moveDistanceX=_this.moveDistanceX/3;
                        }

                        _this.changeTranslate(parseFloat(_this.thisPosition*thisWindowWidth)+parseFloat(_this.moveDistanceX) + 'px');//移动中
                    }

                }



            },false);

            moveEle[0].addEventListener('touchend',function(event){

                var evt = event ? event : window.event;

                if(evt.changedTouches.length==1){

                    if(_this.figer.ismove){

                        this.className= ""+_this.moveEle+" contentchange";//添加class,带有Transition的属性

                        if(this.parentElement==document.getElementsByClassName(_this.moveEleParent)[0]){//如果在banner轮播，

                            if(((_this.thisPosition==-thisNum) &&_this.moveDistanceX<0)&&(Math.abs(_this.moveDistanceX)>55)){

                                if(_this.fn){//当前处于第4页，并且继续滑动，执行相应的脚本

                                    _this.fn()
                                }
                            }
                        }


                        if(Math.abs(_this.moveDistanceX)>(thisWindowWidth/3)||lastDistanceSpeed>6){//当手指的移动距离大于屏幕的1/3时，变化

                            _this.movePosition(_this.moveDistanceX);

                        }else {

                            _this.changeTranslate(parseFloat(_this.thisPosition*thisWindowWidth) + 'px');//变化到指定位置

                        }

                        _this.transitionFn(transitionMoveEndFn);//平滑过渡事件

                    }





                }



            },false);

            //弹出层
            moveEle[0].addEventListener('click',function(){_this.showNewBanner();},false);



        //初始移送的位置
        function getFirstPosition(event) {

            var evt = event ? event : window.event;

            firstTouchesClientX = parseFloat(evt.touches[0].clientX);//当前点击事件距离屏幕左边的距离(初始位置-X);

            firstTouchesClientY=parseFloat(evt.touches[0].clientY);//当前点击事件距离屏幕左边的距离(初始位置-X);

            lastDis=newDis=firstTouchesClientX;

        }

        //手指即将离开的位置
        function getLastPosition(event) {

            var evt = event ? event : window.event;

            moveTouchesClientX = parseFloat(evt.changedTouches[0].clientX);//末尾位置(X);

            moveTouchesClientY = parseFloat(evt.changedTouches[0].clientY);//末尾位置(Y);

            lastDis=newDis;

            newDis=moveTouchesClientX;

            _this.moveDistanceX = moveTouchesClientX - firstTouchesClientX;//x軸方向最终移动的距离（第一根手指）

            _this.moveDistanceY = moveTouchesClientY - firstTouchesClientY;//Y軸方向最终移动的距离（第一根手指）

            return Math.abs(newDis-lastDis);

        }

        //绑定平滑过渡后的方法
        function transitionMoveEndFn(){

            for( var i=0;i<moveEle.length;i++){

                moveEle[i].className=""+_this.moveEle+"";//移除class,带有Transition的属性

                moveEle[i].removeEventListener('transitionend', transitionMoveEndFn, false);

                moveEle[i].removeEventListener('transitionend', transitionMoveEndFn, false);
            }

        }

    },

    /*元素移动*/
    movePosition:function(position){//参数一当前移动的位置方向
        var _this=this;

        var thisWindowWidth = window.innerWidth;//屏幕可视窗口宽度

        var moveEle=document.getElementsByClassName(_this.moveEle);//包裹所有主体中的banner图片的父级元素

        var thisNum = moveEle[0].getElementsByClassName(_this.scaleEleParent).length - 1;

        var PointParent=document.getElementsByClassName('allpoint');//点点的父元素

        var BannerPoint= PointParent[0].getElementsByTagName('span');//banner中的点点

        var newBannerPonit=PointParent[PointParent.length-1].getElementsByTagName('span');//弹出来的点点


        //如果向右滚动，则不能超过最大图片个数
        if (parseFloat(position) < 0) {

            _this.thisPosition > -thisNum ? _this.thisPosition-- : _this.thisPosition = -thisNum;

        }

        //如果向左边滚动，不能超过最左边
        else if (parseFloat(position) > 0) {

            _this.thisPosition < 0 ? _this.thisPosition++ : _this.thisPosition = 0;
        }

        _this.changeTranslate(thisWindowWidth * this.thisPosition + 'px');//变化到指定位置




        if(BannerPoint){
            //变化点点的位置

            for(var i=0;i<PointParent.length;i++){

                PointParent[i].getElementsByClassName('showpoint')[0].className="";
            }

            BannerPoint[-this.thisPosition].className="showpoint";

            newBannerPonit[-this.thisPosition].className="showpoint"

        }


    },

    /*添加元素*/
    initPointEle:function(pointParentEle){//参数是点点以及banner的父元素,以及点点父元素的class值

        var _this = this;

        var AllBannerImg=document.getElementsByClassName( _this.moveEle)[0].getElementsByClassName(_this.scaleEleParent);//显示的banner图片

        var pointEle="";//点点元素

        for(var i=0;i<AllBannerImg.length;i++){


            if (i == 0) {

                pointEle += '<span class="showpoint"></span>';
            }

            else {

                pointEle += '<span></span>';

            }

        }

        addnode("div",pointEle,'allpoint');

        function addnode(tag, innerHtml, className){

            var obj = document.createElement(tag);

            if (className) {

                obj.className = className
            }

            obj.innerHTML = innerHtml;

            document.getElementsByClassName(pointParentEle)[0].appendChild(obj);
        }

    },

    //元素位置变化的方法
    changeTranslate:function(num1){

        var _this=this;

        var moveEle=document.getElementsByClassName(_this.moveEle);

        for( var i=0;i<moveEle.length;i++){

            moveEle[i].style.transform = 'translateX(' + num1 + ')';

            moveEle[i].style.webkitTransform = 'translateX(' + num1 + ')';

        }

    },

    //元素平滑过渡的方法
    transitionFn:function(myFn){

        var _this=this;

        var moveEle=document.getElementsByClassName(_this.moveEle);

        for( var i=0;i<moveEle.length;i++){

            moveEle[i].addEventListener("TransitionEnd",myFn,false);

            moveEle[i].addEventListener("webkitTransitionEnd",myFn,false);

        }

    },

    //判断有没有弹出层
    showNewBanner:function(){

        var _this=this;

        var thisWindowHeight=window.innerHeight;

        if(_this.moveDistanceX==0&&_this.moveDistanceY==0&&_this.allShowEle){//当没有任何移动，即点击，出现弹出图片

                document.getElementsByClassName( _this.allShowEle)[0].style.display='block';//弹出元素显示

                document.getElementsByTagName("body")[0].style.height=""+thisWindowHeight+"px";
                document.getElementsByTagName("html")[0].style.height=""+thisWindowHeight+"px";

                document.getElementsByTagName("body")[0].style.overflow="hidden";//页面禁止滚动
                document.getElementsByTagName("html")[0].style.overflow="hidden";//页面禁止滚动

        };


    }

};


/**
 * Created by Administrator on 2017/6/7.
 */
var shoppingCart = {

    changeX:1,

    changeY:1,
    /*加载方法*/
    xhr: function (details) {

        var _this = this;

        var api = details.api || 0;

        var type = details.type || 'get';

        var xhr = function () {
            if (window.XMLHttpRequest) {
                return new XMLHttpRequest();
            } else {
                return new ActiveObject('Micrsorf.XMLHttp');
            }
        }();

        xhr.onreadystatechange = function () {
            switch (xhr.readyState) {
                case 0 :
                    // console.log(0, '未初始化....');
                    break;
                case 1 :
                    /*console.log(1, '请求参数已准备，尚未发送请求...');*/
                    break;
                case 2 :
                    /*console.log(2, '已经发送请求,尚未接收响应');*/
                    break;
                case 3 :
                    /*console.log(3, '正在接受部分响应.....');*/
                    break;
                case 4 :
                    /*console.log(4, '响应全部接受完毕');*/
                    if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304) {

                        _this.fn(xhr.responseText,details)

                    }

                    else {

                        console.log('读取失败');

                    }
                    break;
            }
        };

        xhr.open(type, api);

        xhr.send(null);

    },

    run: function (details) {



        this.xhr(details);

        this.changeClass(details)

    },

    //切换样式名称
    changeClass: function () {

        var allEle = document.getElementById('jd_address_select');

        var firstEle = allEle.getElementsByClassName('top_address')[0].getElementsByTagName('div');

        if(allEle.getElementsByClassName('show')[0]){

            clearClass(1)
        }

        firstEle[0].innerHTML='请选择';

        if(firstEle[0].className.indexOf('show')==-1) {

            firstEle[0].className = 'show';

        }

        if(allEle.getElementsByClassName('address')[0].className.indexOf('show')==-1) {

            allEle.getElementsByClassName('address')[0].className += ' show';

        }

        if(this.changeX) {

            for (var i = 0; i < firstEle.length; i++) {

                firstEle[i].addEventListener('click', clickEle, false)

            }

            this.changeX=0;

        }

        function clickEle() {

            clearClass(2);

            for (var j = 0; j < firstEle.length; j++) {

                if (this == firstEle[j]) {

                    break

                }

            }

            this.className = 'show';

            allEle.getElementsByClassName('address')[j].className += ' show';


        }

        function clearClass(num) {

            for (var i = 0; i < num; i++) {

                allEle.getElementsByClassName('show')[0].className = allEle.getElementsByClassName('show')[0].className.replace('show', '');

            }

        }

    },

    /*渲染地址列表*/
    fn: function (thisJson,details) {

        var thisWrightHtml = details.targetDom;

        var thisFn = details.fn;

        var ele = document.getElementById('jd_address_select');

        var data = JSON.parse(thisJson).data;

        var tabCity = ele.getElementsByClassName('top_address')[0].getElementsByTagName('div');

        for(var i=1;i<tabCity.length;i++){

            tabCity[i].innerHTML=""

        }

        addLi(ele.getElementsByClassName('address')[0], data);

        function addLi(faEle, allData) {

            var thisDomH = '<p data-li="';

            var thisDomM = '">';

            var thisDomB = '</p>';

            var writeDom = '';


            for (var i = 0; i < allData.length; i++) {

                writeDom += thisDomH + i + thisDomM + allData[i].name + thisDomB

            }

            faEle.innerHTML = writeDom;

            var allP = faEle.getElementsByTagName('p');

            for (var j = 0; j < allP.length; j++) {

                allP[j].addEventListener('click', clickFn, false)

            }

        }

        /*每个元素点击事件*/
        function clickFn() {

            if (this.parentNode.getElementsByClassName('p_show')[0]) {

                this.parentNode.getElementsByClassName('p_show')[0].removeAttribute('class');

            }

            this.className = 'p_show'

        }


        var allTab = ele.getElementsByClassName('address');

        if(this.changeY) {

        for (var i = 0; i < allTab.length; i++) {

            allTab[i].addEventListener('click', fatherEleClick)

        }

            this.changeY=0;

        }

        var allCityPoint = [];

        var thisCityAll = [];

        //chooseAdressId=[];

        /*每个父切换元素*/
        function fatherEleClick(evt) {

            if (this.className.indexOf('show') > -1) {

                for (var j = 0; j < allTab.length; j++) {

                    if (this == allTab[j]) {

                        break

                    }

                }

                /*渲染下一个列表*/

                var thisNum = evt.target.getAttribute('data-li');

                allCityPoint[j] = thisNum;

                allCityPoint=allCityPoint.slice(0,j+1);

                var thisData = data;

                var thisCity;

                for (var z = 0; z <= j; z++) {

                    thisCity = thisData[allCityPoint[z]];

                    thisData = thisCity.child;

                    if(!thisData)break

                }



                /*修改tab*/

                var tabCity = ele.getElementsByClassName('top_address')[0].getElementsByTagName('div');

                thisCityAll[j] = thisCity.name;

                thisCityAll=thisCityAll.slice(0,j+1);

                tabCity[j].innerHTML = thisCity.name;

                tabCity[j].removeAttribute('class');


                if (thisData) {

                    tabCity[j + 1].innerHTML = '请选择';

                    tabCity[j + 1].className = 'show';

                    allTab[j + 1].className += ' show';

                    this.className = this.className.replace(' show', '');

                    addLi(allTab[j + 1], thisData);

                }

                else {

                    var thisInnerHtml='';

                    for (var x = 0; x < thisCityAll.length; x++) {

                        thisInnerHtml += thisCityAll[x];

                        if(x!=thisCityAll.length-1) {

                            thisInnerHtml += '，'

                        }



                    }

                    thisWrightHtml.innerHTML=thisInnerHtml;


                    chooseAdressId=(function(){


                        var allNum=[];

                        var thisData=data;


                        for(var i=0;i<allCityPoint.length;i++) {

                            allNum[i]=thisData[allCityPoint[i]].id;

                            thisData=thisData[allCityPoint[i]].child;

                        }

                        return allNum;

                        //地址数据data;


                    })();


                    setTimeout(function () {

                        thisFn();




                    },300)



                }
                //切换tab


            }

        }

    },





};



/**
 * Created by ZHUANGYI on 2017/11/29.
 */
var addressChoose = {

    //页面进入后tab切换自锁
    o:1,

    //父页面监听事件
    i:1,

    //初始化渲染
    z:1,

    run: function (details) {

        var _this=this;

        //初始化数据
        var thisPointCity,thisId,thisWrightHtml,thisFn,thisCityAll=[],thisCityId=[];

        //初始化id
        var thisStartId = details.startId;

        //初始化Name
        var thisStartName = details.startName;

        //是否需要初始化选择
        var isChoosen=thisStartId && thisStartName && thisStartName.length == thisStartName.length;

        //是否有值
        if(isChoosen){

            //数据代入前面的address
            thisCityAll=thisStartName;

            thisCityId=thisStartId;
        }

        //tab切换自锁
            if(_this.o){

                //异步加载
                xhr(details,0,1,0);
                //tab切换
                changeClass();

                _this.o = 0;

            }

        //切换样式名称
        function changeClass() {

            var allEle = document.getElementById('jd_address_select');

            var firstEle = allEle.getElementsByClassName('top_address')[0].getElementsByTagName('div');

            if(allEle.getElementsByClassName('show')[0]){

                clearClass(1)
            }

            firstEle[0].innerHTML='请选择';

            if(firstEle[0].className.indexOf('show')==-1) {

                firstEle[0].className = 'show';

            }

            if(allEle.getElementsByClassName('address')[0].className.indexOf('show')==-1) {

                allEle.getElementsByClassName('address')[0].className += ' show';

            }



                for (var i = 0; i < firstEle.length; i++) {

                    firstEle[i].addEventListener('click', clickEle, false)

                }





            function clickEle() {

                clearClass(2);

                for (var j = 0; j < firstEle.length; j++) {

                    if (this == firstEle[j]) {

                        break

                    }

                }


                this.className = 'show';

                allEle.getElementsByClassName('address')[j].className += ' show';


            }

            function clearClass(num) {

                for (var i = 0; i < num; i++) {

                    allEle.getElementsByClassName('show')[0].className = allEle.getElementsByClassName('show')[0].className.replace('show', '');

                }

            }

        }

        //异步加载数据 thisNum 为areaid变化数值 returnNum为1初始化 addressNum是每个address是第几个
        function xhr (xDetails,thisNum,returnNum,addressNum) {

            var api = xDetails.api || 0;

            var type = xDetails.type || 'get';

            //传入前半部分url
            var thisUrl = xDetails.yourUrl || 'http://118.242.19.26:188';

            //接口地址 thisNum为id
            var addressUrl = thisUrl+'/jf_market_jd_server/api/address/getArea?areaId='+ thisNum;




            //请求数据
            var xhr = function () {

                if (window.XMLHttpRequest) {

                    return new XMLHttpRequest();

                }
                else {

                    return new ActiveObject('Micrsorf.XMLHttp');

                }
            }();

            xhr.onreadystatechange = function () {
                switch (xhr.readyState) {
                    case 0 :
                        // console.log(0, '未初始化....');
                        break;
                    case 1 :
                        /*console.log(1, '请求参数已准备，尚未发送请求...');*/
                        break;
                    case 2 :
                        /*console.log(2, '已经发送请求,尚未接收响应');*/
                        break;
                    case 3 :
                        /*console.log(3, '正在接受部分响应.....');*/
                        break;
                    case 4 :
                        /*console.log(4, '响应全部接受完毕');*/
                        if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304) {


                            var addressEles = document.getElementById('jd_address_select').getElementsByClassName('address');

                            //如果为1的时候用这个方法
                            if(returnNum==1){

                                //第一次 渲染【0】dom对象
                                fn(xhr.responseText,xDetails);

                                //如果有初始化在执行
                                if(isChoosen){

                                    addAddressShow(addressNum)

                                }




                            }
                            //如果为2的时候用这个方法
                            else if(returnNum==2){

                                var data=JSON.parse(xhr.responseText).data;

                                if(data){

                                    addLi(addressEles[addressNum+1],data);

                                    addAddressShow(addressNum+1)

                                }

                            }
                            //每一次点击渲染对象
                            else {

                                var data=JSON.parse(xhr.responseText).data;

                                if(data){

                                    addLi(addressEles[addressNum+1],data);

                                }

                                changeNewTab(addressNum,data);


                            }

                            //为address添加show
                            function addAddressShow(addressNum) {

                                //每一个address下的p元素
                                var pEles = addressEles[addressNum].getElementsByTagName('p');

                                //遍历一下p元素
                                for(var i=0;i<pEles.length;i++){

                                    //是否对应areaId
                                    if(thisStartId[addressNum]==pEles[i].getAttribute('areaId')){

                                        //找到就不用再找了
                                        break

                                    }

                                }

                                //得到需要的那个p给他加上p_show
                                pEles[i].className = 'p_show';

                            }

                        }

                        else {

                            console.log('读取失败');

                        }
                        break;
                }
            };

            xhr.open(type, addressUrl);

            xhr.send(null);

        }

        //在address中生成列表 faEle-哪个address allData-加载的数据
        function addLi(faEle, allData) {

            var thisDomH = '<p areaId="';

            var thisDomM = '">';

            var thisDomB = '</p>';

            var writeDom = '';

            for (var i = 0; i < allData.length; i++) {

                //代入areaId
                writeDom += thisDomH +  allData[i].areaId + thisDomM + allData[i].name + thisDomB

            }

            faEle.innerHTML = writeDom;

            var allP = faEle.getElementsByTagName('p');

            for (var j = 0; j < allP.length; j++) {

                allP[j].addEventListener('click', clickFn, false)

            }

            /*每个元素点击事件*/
            function clickFn() {


                thisPointCity=this.innerHTML;//保存现在点击的城市

                thisId =this.getAttribute('areaid');//保存现在点击的城市的id

                //console.log('p '+thisPointCity);

                //console.log(this);


                if (this.parentNode.getElementsByClassName('p_show')[0]) {

                    this.parentNode.getElementsByClassName('p_show')[0].removeAttribute('class');

                }

                this.className = 'p_show'

            }

        }

        //顶部tab页切换 在数据加载之后执行
        function changeNewTab(j,data) {

            var tabCity = document.getElementById('jd_address_select').getElementsByClassName('top_address')[0].getElementsByTagName('div');

            var allTab = document.getElementById('jd_address_select').getElementsByClassName('address');

            thisCityAll[j] = thisPointCity;

            thisCityId[j] = thisId;

            //console.log('tab '+thisPointCity);

            thisCityAll=thisCityAll.slice(0,j+1);

            thisCityId=thisCityId.slice(0,j+1);

            tabCity[j].innerHTML = thisPointCity;

            tabCity[j].setAttribute('areaId',thisId);

            tabCity[j].removeAttribute('class');


            if (data) {

                document.getElementById('jd_address_select').getElementsByClassName('show')[0].className='address';

                tabCity[j + 1].innerHTML = '请选择';

                tabCity[j + 1].className = 'show';

                allTab[j + 1].className += ' show';


            }

            else {


                var thisInnerHtml='';

                //最后一个tab模块添加show
                tabCity[j].className = 'show';

                for (var x = 0; x < thisCityAll.length; x++) {

                    thisInnerHtml += thisCityAll[x];

                    if(x!=thisCityAll.length-1) {

                        thisInnerHtml += '，'

                    }

                }

                thisWrightHtml.innerHTML=thisInnerHtml;

                _this.addressCity = thisCityAll;

                _this.addressCityId = thisCityId;


                //console.log(thisCityId);

                setTimeout(function () {

                    thisFn();

                },300)



            }
            //切换tab

        }

        //渲染数据
        function fn(thisJson,details) {

            thisWrightHtml = details.targetDom;

            thisFn = details.fn;

            var ele = document.getElementById('jd_address_select');

            var data = JSON.parse(thisJson).data;

            addLi(ele.getElementsByClassName('address')[0], data);

            var allTab = ele.getElementsByClassName('address');


            if(_this.i) {

                for (var i = 0; i < allTab.length; i++) {

                    allTab[i].addEventListener('click', fatherEleClick)

                }

                _this.i=0

            }

            /*每个父切换元素*/
            function fatherEleClick(evt) {

                if (this.className.indexOf('show') > -1) {

                    for (var j = 0; j < allTab.length; j++) {

                        if (this == allTab[j]) {

                            break

                        }

                    }


                        /*渲染下一个列表*/

                        var thisNum = evt.target.getAttribute('areaId');


                        //如果areaId有数值
                        if (thisNum) {

                            xhr(details, thisNum, 0, j);

                        }

                }

            }

        }



        //导入tab的数据
        (function(){


            //判断id和name有没有值鹅且两个长度相等

            //z==1的时候执行 方法最后赋值为0 只执行一次

            if(_this.z && isChoosen){

                var fatEle = document.getElementById('jd_address_select');

                var tabEles = fatEle.getElementsByClassName('top_address')[0].getElementsByTagName('div');

                var addressEles = fatEle.getElementsByClassName('address');

                //tab部分去掉第一个show 给最后一个加上show
                tabEles[0].className = '';

                tabEles[thisStartName.length-1].className = 'show';

                //address部分去掉第一个show 给最后一个加上show
                addressEles[0].className = 'address';

                addressEles[thisStartName.length-1].className += ' show';

                //遍历传入id的长度
                for(var i=0;i<thisStartName.length;i++){

                    //将name赋值到tab中
                    tabEles[i].innerHTML = thisStartName[i];
                    //给每个tab加上areaid
                    tabEles[i].setAttribute('areaId',thisStartId[i]);
                    //异步加载每个数据
                    xhr(details, thisStartId[i], 2, i);
                }

                _this.z = 0;

            }

        })();

    }

};
/**
 * Created by ZHUANGYI on 2017/9/1.
 */


//iframe弹出框

/*var productIframe = {

    iframePopUp: function () {


        var thisEle = document.getElementById('iframDemo');

        var thisEleCancel = thisEle.getElementsByClassName('iframe_cancel')[0];

        //点击【看京东价】 出现模态框

            if (thisEle.className.indexOf('show') == -1) {

                iframeShow();
            }
            else {
                iframeHide()
            }

        clickThrough();

        //点穿问题
        function clickThrough() {

            var _thisScrollEle = document.getElementById('iframDemo').getElementsByClassName('iframebox')[0];

            var startY, endY, distance;//开始距离、移动距离

            _thisScrollEle.addEventListener('touchstart', touchStartEle, false);

            _thisScrollEle.addEventListener('touchmove', reachEdge, false);


            function touchStartEle(e) {

                //touchstart 获取位置startY

                startY = e.touches[0].pageY;

            }


            function reachEdge(event) {

                var _this = this;

                var eleScrollHeight = _this.scrollTop;//获取滚动条的位置 206

                var eleHeight = _this.scrollHeight;//元素实际高度 506

                var containerHeight = _this.offsetHeight;//容器高度 300

                //touchmove 获取位置 endY

                endY = event.touches[0].pageY;

                //两者之减的距离用来判断是向上活动还是向下滑动
                distance = startY - endY;

                //此时touchmove的值等于touchstart的值 循环
                endY = startY;


                //滚动条到达底部

                if (Math.abs(parseFloat(eleHeight) - parseFloat(eleScrollHeight + containerHeight)) <= 2) {


                    //如果距离为正数 则向上滑动时候 禁止浏览器事件

                    if (distance > 0) {

                        event.preventDefault();

                    }

                }

                else if (Math.abs(parseFloat(eleScrollHeight)) == 0) {

                    //如果距离为负数 则向下滑动 禁止浏览器事件

                    if (distance < 0) {

                        event.preventDefault();

                    }


                }

            }


        }



        //模态框消失
        thisEleCancel.addEventListener('click', iframeHide, false);

        function iframeShow() {

            thisEle.style.display = 'block';

            setTimeout(function () {

                if (thisEle.className.indexOf('show') == -1) {

                    thisEle.className += ' show'
                }

            }, 10);



            iFrameHeight();

            //固定iframe宽高 专递url值
            function iFrameHeight() {

                var ifm = document.getElementById("iframe");

                var viewJd = document.getElementById('view_jd');

                var btnEle = document.getElementById('jumpBtn');

                if (ifm) {


                    ifm.height = 1500;

                    ifm.width = document.body.scrollWidth;

                    ifm.src = viewJd.getAttribute('data-src');

                    btnEle.href = viewJd.getAttribute('data-src');

                    //ifm.src="https://item.m.jd.com/product/10211831816.html";


                }

            }


        }

        function iframeHide() {


            if (thisEle.className.indexOf('show') > -1) {

                //transitionMove(thisEle);

                thisEle.style.display = 'none';

                thisEle.className = thisEle.className.replace(' show', '')

            }


            function transitionMove(ele) {

                // Safari 3.1 到 6.0 代码
                ele.addEventListener("webkitTransitionEnd", MFunction);
                // 标准语法
                ele.addEventListener("transitionend", MFunction);

                function MFunction() {

                    ele.style.display = 'none';
                    // Safari 3.1 到 6.0 代码
                    ele.removeEventListener("webkitTransitionEnd", MFunction);
                    // 标准语法
                    ele.removeEventListener("transitionend", MFunction);


                }


            }

        }


    }
};*/

var jfIframe = function (details) {

    if(!details){

        details = {}
    }

    this.details = details;

    var thisEle = document.getElementById(this.details.ele);

    clickThrough();

    //点穿问题
    function clickThrough() {

        var _thisScrollEle = document.getElementById('iframDemo').getElementsByClassName('iframebox')[0];

        var thisTop = thisEle.getElementsByClassName('iframe_title')[0];

        var startY, endY, distance;//开始距离、移动距离

        _thisScrollEle.addEventListener('touchstart', touchStartEle, false);

        _thisScrollEle.addEventListener('touchmove', reachEdge, false);

        thisTop.addEventListener('touchmove',windowBanEvent.Canceling,false);


        function touchStartEle(e) {

            //touchstart 获取位置startY

            startY = e.touches[0].pageY;

        }


        function reachEdge(event) {

            var _this = this;

            var eleScrollHeight = _this.scrollTop;//获取滚动条的位置 206

            var eleHeight = _this.scrollHeight;//元素实际高度 506

            var containerHeight = _this.offsetHeight;//容器高度 300

            //touchmove 获取位置 endY

            endY = event.touches[0].pageY;

            //两者之减的距离用来判断是向上活动还是向下滑动
            distance = startY - endY;

            //此时touchmove的值等于touchstart的值 循环
            endY = startY;


            //滚动条到达底部

            if (Math.abs(parseFloat(eleHeight) - parseFloat(eleScrollHeight + containerHeight)) <= 2) {


                //如果距离为正数 则向上滑动时候 禁止浏览器事件

                if (distance > 0) {

                    event.preventDefault();

                }

            }

            else if (Math.abs(parseFloat(eleScrollHeight)) == 0) {

                //如果距离为负数 则向下滑动 禁止浏览器事件

                if (distance < 0) {

                    event.preventDefault();

                }


            }

        }


    }


    thisEle.getElementsByClassName('iframe_cancel')[0].addEventListener('click', clickEven.bind(this), false);



    function clickEven() {

        this.hide();

    }

    function addEvent(ele) {

        var allEvent=['touchstart','touchmove','touchend'];

        for(var i=0;i<allEvent.length;i++) {

            ele.addEventListener(allEvent[i],eventBan,false)

        }

    }

    function eventBan(e) {


        window.event ? window.event.returnValue = false : e.preventDefault();


    }
};

jfIframe.prototype.show = function (details) {


    if(details){

        details.fn();

    }


    var thisEle = document.getElementById(this.details.ele);

    thisEle.style.display = 'block';

    setTimeout(function () {

        if (thisEle.className.indexOf('show') == -1) {

            thisEle.className += ' show'

        }

    }, 1);
    iFrameHeight();

    //固定iframe宽高 专递url值
    function iFrameHeight() {

        var ifm = document.getElementById("iframe");

        var viewJd = document.getElementById('view_jd');

        //var btnEle = document.getElementById('jumpBtn');

        if (ifm) {


            ifm.height = 2000;

            ifm.width = document.body.scrollWidth;

            ifm.src = viewJd.getAttribute('data-src');

            //btnEle.href = viewJd.getAttribute('data-src');

            //ifm.src="https://item.m.jd.com/product/10211831816.html";


        }

    }



};

jfIframe.prototype.hide = function () {

    var thisEle = document.getElementById(this.details.ele);

    /*document.body.removeEventListener('touchmove', this.ban, true);*/

    thisEle.style.display = 'none';

    if (thisEle.className.indexOf('show') > -1) {

        //transitionMove(thisEle);

        thisEle.className = thisEle.className.replace(' show', '')

    }

    windowBanEvent.unbundling();//解绑页面禁止事件

    function transitionMove(ele) {

        // Safari 3.1 到 6.0 代码
        ele.addEventListener("webkitTransitionEnd", MFunction);
        // 标准语法
        ele.addEventListener("transitionend", MFunction);

        function MFunction() {

            ele.style.display = 'none';
            // Safari 3.1 到 6.0 代码
            ele.removeEventListener("webkitTransitionEnd", MFunction);
            // 标准语法
            ele.removeEventListener("transitionend", MFunction);


        }


    }


};




/**
 * Created by ZHUANGYI on 2017/6/26.
 */

var jdCategoryPage = {

    clickTSortChange: function () {

        var fatherEle = document.getElementsByClassName('product_category_slide')[0];

        var allEle = fatherEle.getElementsByTagName('div');


        for (var i = 0; i < allEle.length; i++) {

            allEle[i].addEventListener('click', function () {

                var _this = this;

                /*选中高亮*/
                fatherEle.getElementsByClassName('select_sort')[0].className = fatherEle.getElementsByClassName('select_sort')[0].className.replace('select_sort', '');


                _this.className += ' select_sort';


                /*滚动条移动*/
                var eleHeight = _this.offsetTop;
                //元素到父元素的高度

                var screenHeight = window.innerHeight;
                //浏览器的高度

                var thisEleHeight = _this.offsetHeight;
                //点击元素的高度

                /*目标位置*/
                var distance = eleHeight - screenHeight / 2 + thisEleHeight / 2;

                /*现在滚动位置*/
                var thisScrollTop = _this.parentNode.scrollTop;

                /*平滑过渡*/

                var index = 0;

                /*每10毫秒执行一次*/
                var time = setInterval(timeSet, 10);

                /*执行方法*/
                function timeSet() {


                    //计数
                    index++;

                    /*每次增加1/30的差值*/
                    _this.parentNode.scrollTop += (distance - thisScrollTop) / 30;

                    /*三十次*/
                    if (index >= 30) {
                        clearInterval(time);

                    }

                }

                //this.parentNode.scrollTop = distance;


            }, false);


        }


    }
};


/**
 * Created by Administrator on 2017/6/7.
 */
var shoppingCart = {

    changeX:1,

    changeY:1,
    /*加载方法*/
    xhr: function (details) {

        var _this = this;

        var api = details.api || 0;

        var type = details.type || 'get';

        var xhr = function () {
            if (window.XMLHttpRequest) {
                return new XMLHttpRequest();
            } else {
                return new ActiveObject('Micrsorf.XMLHttp');
            }
        }();

        xhr.onreadystatechange = function () {
            switch (xhr.readyState) {
                case 0 :
                    // console.log(0, '未初始化....');
                    break;
                case 1 :
                    /*console.log(1, '请求参数已准备，尚未发送请求...');*/
                    break;
                case 2 :
                    /*console.log(2, '已经发送请求,尚未接收响应');*/
                    break;
                case 3 :
                    /*console.log(3, '正在接受部分响应.....');*/
                    break;
                case 4 :
                    /*console.log(4, '响应全部接受完毕');*/
                    if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304) {

                        _this.fn(xhr.responseText,details)

                    }

                    else {

                        console.log('读取失败');

                    }
                    break;
            }
        };

        xhr.open(type, api);

        xhr.send(null);

    },

    run: function (details) {



        this.xhr(details);

        this.changeClass(details)

    },

    //切换样式名称
    changeClass: function () {

        var allEle = document.getElementById('jd_address_select');

        var firstEle = allEle.getElementsByClassName('top_address')[0].getElementsByTagName('div');

        if(allEle.getElementsByClassName('show')[0]){

            clearClass(1)
        }

        firstEle[0].innerHTML='请选择';

        if(firstEle[0].className.indexOf('show')==-1) {

            firstEle[0].className = 'show';

        }

        if(allEle.getElementsByClassName('address')[0].className.indexOf('show')==-1) {

            allEle.getElementsByClassName('address')[0].className += ' show';

        }

        if(this.changeX) {

            for (var i = 0; i < firstEle.length; i++) {

                firstEle[i].addEventListener('click', clickEle, false)

            }

            this.changeX=0;

        }

        function clickEle() {

            clearClass(2);

            for (var j = 0; j < firstEle.length; j++) {

                if (this == firstEle[j]) {

                    break

                }

            }

            this.className = 'show';

            allEle.getElementsByClassName('address')[j].className += ' show';


        }

        function clearClass(num) {

            for (var i = 0; i < num; i++) {

                allEle.getElementsByClassName('show')[0].className = allEle.getElementsByClassName('show')[0].className.replace('show', '');

            }

        }

    },

    /*渲染地址列表*/
    fn: function (thisJson,details) {

        var thisWrightHtml = details.targetDom;

        var thisFn = details.fn;

        var ele = document.getElementById('jd_address_select');

        var data = JSON.parse(thisJson).data;

        var tabCity = ele.getElementsByClassName('top_address')[0].getElementsByTagName('div');

        for(var i=1;i<tabCity.length;i++){

            tabCity[i].innerHTML=""

        }

        addLi(ele.getElementsByClassName('address')[0], data);

        function addLi(faEle, allData) {

            var thisDomH = '<p data-li="';

            var thisDomM = '">';

            var thisDomB = '</p>';

            var writeDom = '';


            for (var i = 0; i < allData.length; i++) {

                writeDom += thisDomH + i + thisDomM + allData[i].name + thisDomB

            }

            faEle.innerHTML = writeDom;

            var allP = faEle.getElementsByTagName('p');

            for (var j = 0; j < allP.length; j++) {

                allP[j].addEventListener('click', clickFn, false)

            }

        }

        /*每个元素点击事件*/
        function clickFn() {

            if (this.parentNode.getElementsByClassName('p_show')[0]) {

                this.parentNode.getElementsByClassName('p_show')[0].removeAttribute('class');

            }

            this.className = 'p_show'

        }


        var allTab = ele.getElementsByClassName('address');

        if(this.changeY) {

        for (var i = 0; i < allTab.length; i++) {

            allTab[i].addEventListener('click', fatherEleClick)

        }

            this.changeY=0;

        }

        var allCityPoint = [];

        var thisCityAll = [];

        //chooseAdressId=[];

        /*每个父切换元素*/
        function fatherEleClick(evt) {

            if (this.className.indexOf('show') > -1) {

                for (var j = 0; j < allTab.length; j++) {

                    if (this == allTab[j]) {

                        break

                    }

                }

                /*渲染下一个列表*/

                var thisNum = evt.target.getAttribute('data-li');

                allCityPoint[j] = thisNum;

                allCityPoint=allCityPoint.slice(0,j+1);

                var thisData = data;

                var thisCity;

                for (var z = 0; z <= j; z++) {

                    thisCity = thisData[allCityPoint[z]];

                    thisData = thisCity.child;

                    if(!thisData)break

                }



                /*修改tab*/

                var tabCity = ele.getElementsByClassName('top_address')[0].getElementsByTagName('div');

                thisCityAll[j] = thisCity.name;

                thisCityAll=thisCityAll.slice(0,j+1);

                tabCity[j].innerHTML = thisCity.name;

                tabCity[j].removeAttribute('class');


                if (thisData) {

                    tabCity[j + 1].innerHTML = '请选择';

                    tabCity[j + 1].className = 'show';

                    allTab[j + 1].className += ' show';

                    this.className = this.className.replace(' show', '');

                    addLi(allTab[j + 1], thisData);

                }

                else {

                    var thisInnerHtml='';

                    for (var x = 0; x < thisCityAll.length; x++) {

                        thisInnerHtml += thisCityAll[x];

                        if(x!=thisCityAll.length-1) {

                            thisInnerHtml += '，'

                        }



                    }

                    thisWrightHtml.innerHTML=thisInnerHtml;


                    chooseAdressId=(function(){


                        var allNum=[];

                        var thisData=data;


                        for(var i=0;i<allCityPoint.length;i++) {

                            allNum[i]=thisData[allCityPoint[i]].id;

                            thisData=thisData[allCityPoint[i]].child;

                        }

                        return allNum;

                        //地址数据data;


                    })();


                    setTimeout(function () {

                        thisFn();




                    },300)



                }
                //切换tab


            }

        }

    },





};



/**
 * Created by ZHUANGYI on 2017/11/29.
 */
var addressChoose = {

    //页面进入后tab切换自锁
    o:1,

    //父页面监听事件
    i:1,

    //初始化渲染
    z:1,

    run: function (details) {

        var _this=this;

        //初始化数据
        var thisPointCity,thisId,thisWrightHtml,thisFn,thisCityAll=[],thisCityId=[];

        //初始化id
        var thisStartId = details.startId;

        //初始化Name
        var thisStartName = details.startName;

        //是否需要初始化选择
        var isChoosen=thisStartId && thisStartName && thisStartName.length == thisStartName.length;

        //是否有值
        if(isChoosen){

            //数据代入前面的address
            thisCityAll=thisStartName;

            thisCityId=thisStartId;
        }

        //tab切换自锁
            if(_this.o){

                //异步加载
                xhr(details,0,1,0);
                //tab切换
                changeClass();

                _this.o = 0;

            }

        //切换样式名称
        function changeClass() {

            var allEle = document.getElementById('jd_address_select');

            var firstEle = allEle.getElementsByClassName('top_address')[0].getElementsByTagName('div');

            if(allEle.getElementsByClassName('show')[0]){

                clearClass(1)
            }

            firstEle[0].innerHTML='请选择';

            if(firstEle[0].className.indexOf('show')==-1) {

                firstEle[0].className = 'show';

            }

            if(allEle.getElementsByClassName('address')[0].className.indexOf('show')==-1) {

                allEle.getElementsByClassName('address')[0].className += ' show';

            }



                for (var i = 0; i < firstEle.length; i++) {

                    firstEle[i].addEventListener('click', clickEle, false)

                }





            function clickEle() {

                clearClass(2);

                for (var j = 0; j < firstEle.length; j++) {

                    if (this == firstEle[j]) {

                        break

                    }

                }


                this.className = 'show';

                allEle.getElementsByClassName('address')[j].className += ' show';


            }

            function clearClass(num) {

                for (var i = 0; i < num; i++) {

                    allEle.getElementsByClassName('show')[0].className = allEle.getElementsByClassName('show')[0].className.replace('show', '');

                }

            }

        }

        //异步加载数据 thisNum 为areaid变化数值 returnNum为1初始化 addressNum是每个address是第几个
        function xhr (xDetails,thisNum,returnNum,addressNum) {

            var api = xDetails.api || 0;

            var type = xDetails.type || 'get';

            //传入前半部分url
            var thisUrl = xDetails.yourUrl || 'http://118.242.19.26:188';

            //接口地址 thisNum为id
            var addressUrl = thisUrl+'/jf_market_jd_server/api/address/getArea?areaId='+ thisNum;




            //请求数据
            var xhr = function () {

                if (window.XMLHttpRequest) {

                    return new XMLHttpRequest();

                }
                else {

                    return new ActiveObject('Micrsorf.XMLHttp');

                }
            }();

            xhr.onreadystatechange = function () {
                switch (xhr.readyState) {
                    case 0 :
                        // console.log(0, '未初始化....');
                        break;
                    case 1 :
                        /*console.log(1, '请求参数已准备，尚未发送请求...');*/
                        break;
                    case 2 :
                        /*console.log(2, '已经发送请求,尚未接收响应');*/
                        break;
                    case 3 :
                        /*console.log(3, '正在接受部分响应.....');*/
                        break;
                    case 4 :
                        /*console.log(4, '响应全部接受完毕');*/
                        if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304) {


                            var addressEles = document.getElementById('jd_address_select').getElementsByClassName('address');

                            //如果为1的时候用这个方法
                            if(returnNum==1){

                                //第一次 渲染【0】dom对象
                                fn(xhr.responseText,xDetails);

                                //如果有初始化在执行
                                if(isChoosen){

                                    addAddressShow(addressNum)

                                }




                            }
                            //如果为2的时候用这个方法
                            else if(returnNum==2){

                                var data=JSON.parse(xhr.responseText).data;

                                if(data){

                                    addLi(addressEles[addressNum+1],data);

                                    addAddressShow(addressNum+1)

                                }

                            }
                            //每一次点击渲染对象
                            else {

                                var data=JSON.parse(xhr.responseText).data;

                                if(data){

                                    addLi(addressEles[addressNum+1],data);

                                }

                                changeNewTab(addressNum,data);


                            }

                            //为address添加show
                            function addAddressShow(addressNum) {

                                //每一个address下的p元素
                                var pEles = addressEles[addressNum].getElementsByTagName('p');

                                //遍历一下p元素
                                for(var i=0;i<pEles.length;i++){

                                    //是否对应areaId
                                    if(thisStartId[addressNum]==pEles[i].getAttribute('areaId')){

                                        //找到就不用再找了
                                        break

                                    }

                                }

                                //得到需要的那个p给他加上p_show
                                pEles[i].className = 'p_show';

                            }

                        }

                        else {

                            console.log('读取失败');

                        }
                        break;
                }
            };

            xhr.open(type, addressUrl);

            xhr.send(null);

        }

        //在address中生成列表 faEle-哪个address allData-加载的数据
        function addLi(faEle, allData) {

            var thisDomH = '<p areaId="';

            var thisDomM = '">';

            var thisDomB = '</p>';

            var writeDom = '';

            for (var i = 0; i < allData.length; i++) {

                //代入areaId
                writeDom += thisDomH +  allData[i].areaId + thisDomM + allData[i].name + thisDomB

            }

            faEle.innerHTML = writeDom;

            var allP = faEle.getElementsByTagName('p');

            for (var j = 0; j < allP.length; j++) {

                allP[j].addEventListener('click', clickFn, false)

            }

            /*每个元素点击事件*/
            function clickFn() {


                thisPointCity=this.innerHTML;//保存现在点击的城市

                thisId =this.getAttribute('areaid');//保存现在点击的城市的id

                //console.log('p '+thisPointCity);

                //console.log(this);


                if (this.parentNode.getElementsByClassName('p_show')[0]) {

                    this.parentNode.getElementsByClassName('p_show')[0].removeAttribute('class');

                }

                this.className = 'p_show'

            }

        }

        //顶部tab页切换 在数据加载之后执行
        function changeNewTab(j,data) {

            var tabCity = document.getElementById('jd_address_select').getElementsByClassName('top_address')[0].getElementsByTagName('div');

            var allTab = document.getElementById('jd_address_select').getElementsByClassName('address');

            thisCityAll[j] = thisPointCity;

            thisCityId[j] = thisId;

            //console.log('tab '+thisPointCity);

            thisCityAll=thisCityAll.slice(0,j+1);

            thisCityId=thisCityId.slice(0,j+1);

            tabCity[j].innerHTML = thisPointCity;

            tabCity[j].setAttribute('areaId',thisId);

            tabCity[j].removeAttribute('class');


            if (data) {

                document.getElementById('jd_address_select').getElementsByClassName('show')[0].className='address';

                tabCity[j + 1].innerHTML = '请选择';

                tabCity[j + 1].className = 'show';

                allTab[j + 1].className += ' show';


            }

            else {


                var thisInnerHtml='';

                //最后一个tab模块添加show
                tabCity[j].className = 'show';

                for (var x = 0; x < thisCityAll.length; x++) {

                    thisInnerHtml += thisCityAll[x];

                    if(x!=thisCityAll.length-1) {

                        thisInnerHtml += '，'

                    }

                }

                thisWrightHtml.innerHTML=thisInnerHtml;

                _this.addressCity = thisCityAll;

                _this.addressCityId = thisCityId;


                //console.log(thisCityId);

                setTimeout(function () {

                    thisFn();

                },300)



            }
            //切换tab

        }

        //渲染数据
        function fn(thisJson,details) {

            thisWrightHtml = details.targetDom;

            thisFn = details.fn;

            var ele = document.getElementById('jd_address_select');

            var data = JSON.parse(thisJson).data;

            addLi(ele.getElementsByClassName('address')[0], data);

            var allTab = ele.getElementsByClassName('address');


            if(_this.i) {

                for (var i = 0; i < allTab.length; i++) {

                    allTab[i].addEventListener('click', fatherEleClick)

                }

                _this.i=0

            }

            /*每个父切换元素*/
            function fatherEleClick(evt) {

                if (this.className.indexOf('show') > -1) {

                    for (var j = 0; j < allTab.length; j++) {

                        if (this == allTab[j]) {

                            break

                        }

                    }


                        /*渲染下一个列表*/

                        var thisNum = evt.target.getAttribute('areaId');


                        //如果areaId有数值
                        if (thisNum) {

                            xhr(details, thisNum, 0, j);

                        }

                }

            }

        }



        //导入tab的数据
        (function(){


            //判断id和name有没有值鹅且两个长度相等

            //z==1的时候执行 方法最后赋值为0 只执行一次

            if(_this.z && isChoosen){

                var fatEle = document.getElementById('jd_address_select');

                var tabEles = fatEle.getElementsByClassName('top_address')[0].getElementsByTagName('div');

                var addressEles = fatEle.getElementsByClassName('address');

                //tab部分去掉第一个show 给最后一个加上show
                tabEles[0].className = '';

                tabEles[thisStartName.length-1].className = 'show';

                //address部分去掉第一个show 给最后一个加上show
                addressEles[0].className = 'address';

                addressEles[thisStartName.length-1].className += ' show';

                //遍历传入id的长度
                for(var i=0;i<thisStartName.length;i++){

                    //将name赋值到tab中
                    tabEles[i].innerHTML = thisStartName[i];
                    //给每个tab加上areaid
                    tabEles[i].setAttribute('areaId',thisStartId[i]);
                    //异步加载每个数据
                    xhr(details, thisStartId[i], 2, i);
                }

                _this.z = 0;

            }

        })();

    }

};
/**
 * Created by ZHUANGYI on 2017/9/1.
 */


//iframe弹出框

/*var productIframe = {

    iframePopUp: function () {


        var thisEle = document.getElementById('iframDemo');

        var thisEleCancel = thisEle.getElementsByClassName('iframe_cancel')[0];

        //点击【看京东价】 出现模态框

            if (thisEle.className.indexOf('show') == -1) {

                iframeShow();
            }
            else {
                iframeHide()
            }

        clickThrough();

        //点穿问题
        function clickThrough() {

            var _thisScrollEle = document.getElementById('iframDemo').getElementsByClassName('iframebox')[0];

            var startY, endY, distance;//开始距离、移动距离

            _thisScrollEle.addEventListener('touchstart', touchStartEle, false);

            _thisScrollEle.addEventListener('touchmove', reachEdge, false);


            function touchStartEle(e) {

                //touchstart 获取位置startY

                startY = e.touches[0].pageY;

            }


            function reachEdge(event) {

                var _this = this;

                var eleScrollHeight = _this.scrollTop;//获取滚动条的位置 206

                var eleHeight = _this.scrollHeight;//元素实际高度 506

                var containerHeight = _this.offsetHeight;//容器高度 300

                //touchmove 获取位置 endY

                endY = event.touches[0].pageY;

                //两者之减的距离用来判断是向上活动还是向下滑动
                distance = startY - endY;

                //此时touchmove的值等于touchstart的值 循环
                endY = startY;


                //滚动条到达底部

                if (Math.abs(parseFloat(eleHeight) - parseFloat(eleScrollHeight + containerHeight)) <= 2) {


                    //如果距离为正数 则向上滑动时候 禁止浏览器事件

                    if (distance > 0) {

                        event.preventDefault();

                    }

                }

                else if (Math.abs(parseFloat(eleScrollHeight)) == 0) {

                    //如果距离为负数 则向下滑动 禁止浏览器事件

                    if (distance < 0) {

                        event.preventDefault();

                    }


                }

            }


        }



        //模态框消失
        thisEleCancel.addEventListener('click', iframeHide, false);

        function iframeShow() {

            thisEle.style.display = 'block';

            setTimeout(function () {

                if (thisEle.className.indexOf('show') == -1) {

                    thisEle.className += ' show'
                }

            }, 10);



            iFrameHeight();

            //固定iframe宽高 专递url值
            function iFrameHeight() {

                var ifm = document.getElementById("iframe");

                var viewJd = document.getElementById('view_jd');

                var btnEle = document.getElementById('jumpBtn');

                if (ifm) {


                    ifm.height = 1500;

                    ifm.width = document.body.scrollWidth;

                    ifm.src = viewJd.getAttribute('data-src');

                    btnEle.href = viewJd.getAttribute('data-src');

                    //ifm.src="https://item.m.jd.com/product/10211831816.html";


                }

            }


        }

        function iframeHide() {


            if (thisEle.className.indexOf('show') > -1) {

                //transitionMove(thisEle);

                thisEle.style.display = 'none';

                thisEle.className = thisEle.className.replace(' show', '')

            }


            function transitionMove(ele) {

                // Safari 3.1 到 6.0 代码
                ele.addEventListener("webkitTransitionEnd", MFunction);
                // 标准语法
                ele.addEventListener("transitionend", MFunction);

                function MFunction() {

                    ele.style.display = 'none';
                    // Safari 3.1 到 6.0 代码
                    ele.removeEventListener("webkitTransitionEnd", MFunction);
                    // 标准语法
                    ele.removeEventListener("transitionend", MFunction);


                }


            }

        }


    }
};*/

var jfIframe = function (details) {

    if(!details){

        details = {}
    }

    this.details = details;

    var thisEle = document.getElementById(this.details.ele);

    clickThrough();

    //点穿问题
    function clickThrough() {

        var _thisScrollEle = document.getElementById('iframDemo').getElementsByClassName('iframebox')[0];

        var thisTop = thisEle.getElementsByClassName('iframe_title')[0];

        var startY, endY, distance;//开始距离、移动距离

        _thisScrollEle.addEventListener('touchstart', touchStartEle, false);

        _thisScrollEle.addEventListener('touchmove', reachEdge, false);

        thisTop.addEventListener('touchmove',windowBanEvent.Canceling,false);


        function touchStartEle(e) {

            //touchstart 获取位置startY

            startY = e.touches[0].pageY;

        }


        function reachEdge(event) {

            var _this = this;

            var eleScrollHeight = _this.scrollTop;//获取滚动条的位置 206

            var eleHeight = _this.scrollHeight;//元素实际高度 506

            var containerHeight = _this.offsetHeight;//容器高度 300

            //touchmove 获取位置 endY

            endY = event.touches[0].pageY;

            //两者之减的距离用来判断是向上活动还是向下滑动
            distance = startY - endY;

            //此时touchmove的值等于touchstart的值 循环
            endY = startY;


            //滚动条到达底部

            if (Math.abs(parseFloat(eleHeight) - parseFloat(eleScrollHeight + containerHeight)) <= 2) {


                //如果距离为正数 则向上滑动时候 禁止浏览器事件

                if (distance > 0) {

                    event.preventDefault();

                }

            }

            else if (Math.abs(parseFloat(eleScrollHeight)) == 0) {

                //如果距离为负数 则向下滑动 禁止浏览器事件

                if (distance < 0) {

                    event.preventDefault();

                }


            }

        }


    }


    thisEle.getElementsByClassName('iframe_cancel')[0].addEventListener('click', clickEven.bind(this), false);



    function clickEven() {

        this.hide();

    }

    function addEvent(ele) {

        var allEvent=['touchstart','touchmove','touchend'];

        for(var i=0;i<allEvent.length;i++) {

            ele.addEventListener(allEvent[i],eventBan,false)

        }

    }

    function eventBan(e) {


        window.event ? window.event.returnValue = false : e.preventDefault();


    }
};

jfIframe.prototype.show = function (details) {


    if(details){

        details.fn();

    }


    var thisEle = document.getElementById(this.details.ele);

    thisEle.style.display = 'block';

    setTimeout(function () {

        if (thisEle.className.indexOf('show') == -1) {

            thisEle.className += ' show'

        }

    }, 1);
    iFrameHeight();

    //固定iframe宽高 专递url值
    function iFrameHeight() {

        var ifm = document.getElementById("iframe");

        var viewJd = document.getElementById('view_jd');

        //var btnEle = document.getElementById('jumpBtn');

        if (ifm) {


            ifm.height = 2000;

            ifm.width = document.body.scrollWidth;

            ifm.src = viewJd.getAttribute('data-src');

            //btnEle.href = viewJd.getAttribute('data-src');

            //ifm.src="https://item.m.jd.com/product/10211831816.html";


        }

    }



};

jfIframe.prototype.hide = function () {

    var thisEle = document.getElementById(this.details.ele);

    /*document.body.removeEventListener('touchmove', this.ban, true);*/

    thisEle.style.display = 'none';

    if (thisEle.className.indexOf('show') > -1) {

        //transitionMove(thisEle);

        thisEle.className = thisEle.className.replace(' show', '')

    }

    windowBanEvent.unbundling();//解绑页面禁止事件

    function transitionMove(ele) {

        // Safari 3.1 到 6.0 代码
        ele.addEventListener("webkitTransitionEnd", MFunction);
        // 标准语法
        ele.addEventListener("transitionend", MFunction);

        function MFunction() {

            ele.style.display = 'none';
            // Safari 3.1 到 6.0 代码
            ele.removeEventListener("webkitTransitionEnd", MFunction);
            // 标准语法
            ele.removeEventListener("transitionend", MFunction);


        }


    }


};



