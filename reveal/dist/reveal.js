/*!
 * reveal.js 6.0.1
 * https://revealjs.com
 * MIT licensed
 *
 * Copyright (C) 2011-2026 Hakim El Hattab, https://hakim.se
 */
(function(global, factory) {
	typeof exports === "object" && typeof module !== "undefined" ? module.exports = factory() : typeof define === "function" && define.amd ? define([], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, global.Reveal = factory());
})(this, function() {
	//#region js/utils/util.ts
	/**
	* Extend object a with the properties of object b.
	* If there's a conflict, object b takes precedence.
	*
	* @param {object} a
	* @param {object} b
	*/
	var extend = (a, b) => {
		for (let i in b) a[i] = b[i];
		return a;
	};
	/**
	* querySelectorAll but returns an Array.
	*/
	var queryAll = (el, selector) => {
		return Array.from(el.querySelectorAll(selector));
	};
	/**
	* classList.toggle() with cross browser support
	*/
	var toggleClass = (el, className, value) => {
		if (value) el.classList.add(className);
		else el.classList.remove(className);
	};
	/**
	* Utility for deserializing a value.
	*
	* @param {*} value
	* @return {*}
	*/
	var deserialize = (value) => {
		if (typeof value === "string") {
			if (value === "null") return null;
			else if (value === "true") return true;
			else if (value === "false") return false;
			else if (value.match(/^-?[\d\.]+$/)) return parseFloat(value);
		}
		return value;
	};
	/**
	* Applies a CSS transform to the target element.
	*
	* @param {HTMLElement} element
	* @param {string} transform
	*/
	var transformElement = (element, transform) => {
		element.style.transform = transform;
	};
	/**
	* Element.matches with IE support.
	*
	* @param {HTMLElement} target The element to match
	* @param {String} selector The CSS selector to match
	* the element against
	*
	* @return {Boolean}
	*/
	var matches = (target, selector) => {
		let matchesMethod = target.matches || target.matchesSelector || target.msMatchesSelector;
		return !!(matchesMethod && matchesMethod.call(target, selector));
	};
	/**
	* Find the closest parent that matches the given
	* selector.
	*
	* @param {HTMLElement} target The child element
	* @param {String} selector The CSS selector to match
	* the parents against
	*
	* @return {HTMLElement} The matched parent or null
	* if no matching parent was found
	*/
	var closest = (target, selector) => {
		if (target && typeof target.closest === "function") return target.closest(selector);
		while (target) {
			if (matches(target, selector)) return target;
			target = target.parentElement;
		}
		return null;
	};
	/**
	* Handling the fullscreen functionality via the fullscreen API
	*
	* @see http://fullscreen.spec.whatwg.org/
	* @see https://developer.mozilla.org/en-US/docs/DOM/Using_fullscreen_mode
	*/
	var enterFullscreen = (element) => {
		element = element || document.documentElement;
		let requestMethod = element.requestFullscreen || element.webkitRequestFullscreen || element.webkitRequestFullScreen || element.mozRequestFullScreen || element.msRequestFullscreen;
		if (requestMethod) requestMethod.apply(element);
	};
	/**
	* Creates an HTML element and returns a reference to it.
	* If the element already exists the existing instance will
	* be returned.
	*
	* @param {HTMLElement} container
	* @param {string} tagname
	* @param {string} classname
	* @param {string} innerHTML
	*
	* @return {HTMLElement}
	*/
	var createSingletonNode = (container, tagname, classname, innerHTML = "") => {
		let nodes = container.querySelectorAll("." + classname);
		for (let i = 0; i < nodes.length; i++) {
			let testNode = nodes[i];
			if (testNode.parentNode === container) return testNode;
		}
		let node = document.createElement(tagname);
		node.className = classname;
		node.innerHTML = innerHTML;
		container.appendChild(node);
		return node;
	};
	/**
	* Injects the given CSS styles into the DOM.
	*
	* @param {string} value
	*/
	var createStyleSheet = (value) => {
		let tag = document.createElement("style");
		if (value && value.length > 0) tag.appendChild(document.createTextNode(value));
		document.head.appendChild(tag);
		return tag;
	};
	/**
	* Returns a key:value hash of all query params.
	*/
	var getQueryHash = () => {
		let query = {};
		location.search.replace(/[A-Z0-9]+?=([\w\.%-]*)/gi, (a) => {
			const key = a.split("=").shift();
			const value = a.split("=").pop();
			if (key && value !== void 0) query[key] = value;
			return a;
		});
		for (let i in query) {
			let value = query[i];
			query[i] = deserialize(unescape(value));
		}
		if (typeof query["dependencies"] !== "undefined") delete query["dependencies"];
		return query;
	};
	/**
	* Returns the remaining height within the parent of the
	* target element.
	*
	* remaining height = [ configured parent height ] - [ current parent height ]
	*
	* @param {HTMLElement} element
	* @param {number} [height]
	*/
	var getRemainingHeight = (element, height = 0) => {
		if (element) {
			var _element$parentElemen;
			let newHeight, oldHeight = element.style.height;
			element.style.height = "0px";
			if (element.parentElement) element.parentElement.style.height = "auto";
			newHeight = height - (((_element$parentElemen = element.parentElement) === null || _element$parentElemen === void 0 ? void 0 : _element$parentElemen.offsetHeight) || 0);
			element.style.height = oldHeight + "px";
			if (element.parentElement) element.parentElement.style.removeProperty("height");
			return newHeight;
		}
		return height;
	};
	var fileExtensionToMimeMap = {
		mp4: "video/mp4",
		m4a: "video/mp4",
		ogv: "video/ogg",
		mpeg: "video/mpeg",
		webm: "video/webm"
	};
	/**
	* Guess the MIME type for common file formats.
	*/
	var getMimeTypeFromFile = (filename = "") => {
		const extension = filename.split(".").pop();
		return extension ? fileExtensionToMimeMap[extension] : void 0;
	};
	/**
	* Encodes a string for RFC3986-compliant URL format.
	* https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURI#encoding_for_rfc3986
	*
	* @param {string} url
	*/
	var encodeRFC3986URI = (url = "") => {
		return encodeURI(url).replace(/%5B/g, "[").replace(/%5D/g, "]").replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
	};
	//#endregion
	//#region js/utils/device.ts
	var UA = navigator.userAgent;
	var isMobile = /(iphone|ipod|ipad|android)/gi.test(UA) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
	/chrome/i.test(UA) && /edge/i.test(UA);
	var isAndroid = /android/gi.test(UA);
	//#endregion
	//#region node_modules/fitty/dist/fitty.module.js
	/**
	* fitty v2.4.2 - Snugly resizes text to fit its parent container
	* Copyright (c) 2023 Rik Schennink <rik@pqina.nl> (https://pqina.nl/)
	*/
	var e = function(e) {
		if (e) {
			var t = function(e) {
				return [].slice.call(e);
			}, n = 0, i = 1, r = 2, o = 3, a = [], l = null, u = "requestAnimationFrame" in e ? function() {
				var t = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : { sync: !1 };
				e.cancelAnimationFrame(l);
				var n = function() {
					return s(a.filter((function(e) {
						return e.dirty && e.active;
					})));
				};
				if (t.sync) return n();
				l = e.requestAnimationFrame(n);
			} : function() {}, c = function(e) {
				return function(t) {
					a.forEach((function(t) {
						return t.dirty = e;
					})), u(t);
				};
			}, s = function(e) {
				e.filter((function(e) {
					return !e.styleComputed;
				})).forEach((function(e) {
					e.styleComputed = m(e);
				})), e.filter(y).forEach(v);
				var t = e.filter(p);
				t.forEach(d), t.forEach((function(e) {
					v(e), f(e);
				})), t.forEach(S);
			}, f = function(e) {
				return e.dirty = n;
			}, d = function(e) {
				e.availableWidth = e.element.parentNode.clientWidth, e.currentWidth = e.element.scrollWidth, e.previousFontSize = e.currentFontSize, e.currentFontSize = Math.min(Math.max(e.minSize, e.availableWidth / e.currentWidth * e.previousFontSize), e.maxSize), e.whiteSpace = e.multiLine && e.currentFontSize === e.minSize ? "normal" : "nowrap";
			}, p = function(e) {
				return e.dirty !== r || e.dirty === r && e.element.parentNode.clientWidth !== e.availableWidth;
			}, m = function(t) {
				var n = e.getComputedStyle(t.element, null);
				return t.currentFontSize = parseFloat(n.getPropertyValue("font-size")), t.display = n.getPropertyValue("display"), t.whiteSpace = n.getPropertyValue("white-space"), !0;
			}, y = function(e) {
				var t = !1;
				return !e.preStyleTestCompleted && (/inline-/.test(e.display) || (t = !0, e.display = "inline-block"), "nowrap" !== e.whiteSpace && (t = !0, e.whiteSpace = "nowrap"), e.preStyleTestCompleted = !0, t);
			}, v = function(e) {
				e.element.style.whiteSpace = e.whiteSpace, e.element.style.display = e.display, e.element.style.fontSize = e.currentFontSize + "px";
			}, S = function(e) {
				e.element.dispatchEvent(new CustomEvent("fit", { detail: {
					oldValue: e.previousFontSize,
					newValue: e.currentFontSize,
					scaleFactor: e.currentFontSize / e.previousFontSize
				} }));
			}, h = function(e, t) {
				return function(n) {
					e.dirty = t, e.active && u(n);
				};
			}, w = function(e) {
				return function() {
					a = a.filter((function(t) {
						return t.element !== e.element;
					})), e.observeMutations && e.observer.disconnect(), e.element.style.whiteSpace = e.originalStyle.whiteSpace, e.element.style.display = e.originalStyle.display, e.element.style.fontSize = e.originalStyle.fontSize;
				};
			}, b = function(e) {
				return function() {
					e.active || (e.active = !0, u());
				};
			}, z = function(e) {
				return function() {
					return e.active = !1;
				};
			}, F = function(e) {
				e.observeMutations && (e.observer = new MutationObserver(h(e, i)), e.observer.observe(e.element, e.observeMutations));
			}, g = {
				minSize: 16,
				maxSize: 512,
				multiLine: !0,
				observeMutations: "MutationObserver" in e && {
					subtree: !0,
					childList: !0,
					characterData: !0
				}
			}, W = null, E = function() {
				e.clearTimeout(W), W = e.setTimeout(c(r), x.observeWindowDelay);
			}, M = ["resize", "orientationchange"];
			return Object.defineProperty(x, "observeWindow", { set: function(t) {
				var n = "".concat(t ? "add" : "remove", "EventListener");
				M.forEach((function(t) {
					e[n](t, E);
				}));
			} }), x.observeWindow = !0, x.observeWindowDelay = 100, x.fitAll = c(o), x;
		}
		function C(e, t) {
			var n = Object.assign({}, g, t), i = e.map((function(e) {
				var t = Object.assign({}, n, {
					element: e,
					active: !0
				});
				return function(e) {
					e.originalStyle = {
						whiteSpace: e.element.style.whiteSpace,
						display: e.element.style.display,
						fontSize: e.element.style.fontSize
					}, F(e), e.newbie = !0, e.dirty = !0, a.push(e);
				}(t), {
					element: e,
					fit: h(t, o),
					unfreeze: b(t),
					freeze: z(t),
					unsubscribe: w(t)
				};
			}));
			return u(), i;
		}
		function x(e) {
			var n = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
			return "string" == typeof e ? C(t(document.querySelectorAll(e)), n) : C([e], n)[0];
		}
	}("undefined" == typeof window ? null : window);
	//#endregion
	//#region \0@oxc-project+runtime@0.124.0/helpers/typeof.js
	function _typeof(o) {
		"@babel/helpers - typeof";
		return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o) {
			return typeof o;
		} : function(o) {
			return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o;
		}, _typeof(o);
	}
	//#endregion
	//#region \0@oxc-project+runtime@0.124.0/helpers/toPrimitive.js
	function toPrimitive(t, r) {
		if ("object" != _typeof(t) || !t) return t;
		var e = t[Symbol.toPrimitive];
		if (void 0 !== e) {
			var i = e.call(t, r || "default");
			if ("object" != _typeof(i)) return i;
			throw new TypeError("@@toPrimitive must return a primitive value.");
		}
		return ("string" === r ? String : Number)(t);
	}
	//#endregion
	//#region \0@oxc-project+runtime@0.124.0/helpers/toPropertyKey.js
	function toPropertyKey(t) {
		var i = toPrimitive(t, "string");
		return "symbol" == _typeof(i) ? i : i + "";
	}
	//#endregion
	//#region \0@oxc-project+runtime@0.124.0/helpers/defineProperty.js
	function _defineProperty(e, r, t) {
		return (r = toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
			value: t,
			enumerable: !0,
			configurable: !0,
			writable: !0
		}) : e[r] = t, e;
	}
	//#endregion
	//#region js/controllers/slidecontent.js
	/**
	* Handles loading, unloading and playback of slide
	* content such as images, videos and iframes.
	*/
	var SlideContent = class {
		constructor(Reveal) {
			_defineProperty(this, "allowedToPlayAudio", null);
			this.Reveal = Reveal;
			this.startEmbeddedMedia = this.startEmbeddedMedia.bind(this);
			this.startEmbeddedIframe = this.startEmbeddedIframe.bind(this);
			this.preventIframeAutoFocus = this.preventIframeAutoFocus.bind(this);
			this.ensureMobileMediaPlaying = this.ensureMobileMediaPlaying.bind(this);
			this.failedAudioPlaybackTargets = /* @__PURE__ */ new Set();
			this.failedVideoPlaybackTargets = /* @__PURE__ */ new Set();
			this.failedMutedVideoPlaybackTargets = /* @__PURE__ */ new Set();
			this.renderMediaPlayButton();
		}
		renderMediaPlayButton() {
			this.mediaPlayButton = document.createElement("button");
			this.mediaPlayButton.className = "r-overlay-button r-media-play-button";
			this.mediaPlayButton.addEventListener("click", () => {
				this.resetTemporarilyMutedMedia();
				new Set([
					...this.failedAudioPlaybackTargets,
					...this.failedVideoPlaybackTargets,
					...this.failedMutedVideoPlaybackTargets
				]).forEach((target) => {
					this.startEmbeddedMedia({ target });
				});
				this.clearMediaPlaybackErrors();
			});
		}
		/**
		* Should the given element be preloaded?
		* Decides based on local element attributes and global config.
		*
		* @param {HTMLElement} element
		*/
		shouldPreload(element) {
			if (this.Reveal.isScrollView()) return true;
			let preload = this.Reveal.getConfig().preloadIframes;
			if (typeof preload !== "boolean") preload = element.hasAttribute("data-preload");
			return preload;
		}
		/**
		* Called when the given slide is within the configured view
		* distance. Shows the slide element and loads any content
		* that is set to load lazily (data-src).
		*
		* @param {HTMLElement} slide Slide to show
		*/
		load(slide, options = {}) {
			const displayValue = this.Reveal.getConfig().display;
			if (displayValue.includes("!important")) {
				const value = displayValue.replace(/\s*!important\s*$/, "").trim();
				slide.style.setProperty("display", value, "important");
			} else slide.style.display = displayValue;
			queryAll(slide, "img[data-src], video[data-src], audio[data-src], iframe[data-src]").forEach((element) => {
				const isIframe = element.tagName === "IFRAME";
				if (!isIframe || this.shouldPreload(element)) {
					element.setAttribute("src", element.getAttribute("data-src"));
					element.setAttribute("data-lazy-loaded", "");
					element.removeAttribute("data-src");
					if (isIframe) element.addEventListener("load", this.preventIframeAutoFocus);
				}
			});
			queryAll(slide, "video, audio").forEach((media) => {
				let sources = 0;
				queryAll(media, "source[data-src]").forEach((source) => {
					source.setAttribute("src", source.getAttribute("data-src"));
					source.removeAttribute("data-src");
					source.setAttribute("data-lazy-loaded", "");
					sources += 1;
				});
				if (isMobile && media.tagName === "VIDEO") media.setAttribute("playsinline", "");
				if (sources > 0) media.load();
			});
			let background = slide.slideBackgroundElement;
			if (background) {
				background.style.display = "block";
				let backgroundContent = slide.slideBackgroundContentElement;
				let backgroundIframe = slide.getAttribute("data-background-iframe");
				if (background.hasAttribute("data-loaded") === false) {
					background.setAttribute("data-loaded", "true");
					let backgroundImage = slide.getAttribute("data-background-image"), backgroundVideo = slide.getAttribute("data-background-video"), backgroundVideoLoop = slide.hasAttribute("data-background-video-loop"), backgroundVideoMuted = slide.hasAttribute("data-background-video-muted");
					if (backgroundImage) if (/^data:/.test(backgroundImage.trim())) backgroundContent.style.backgroundImage = `url(${backgroundImage.trim()})`;
					else backgroundContent.style.backgroundImage = backgroundImage.split(",").map((background) => {
						return `url(${encodeRFC3986URI(decodeURI(background.trim()))})`;
					}).join(",");
					else if (backgroundVideo) {
						let video = document.createElement("video");
						if (backgroundVideoLoop) video.setAttribute("loop", "");
						if (backgroundVideoMuted || this.Reveal.isSpeakerNotes()) video.muted = true;
						if (isMobile) video.setAttribute("playsinline", "");
						backgroundVideo.split(",").forEach((source) => {
							const sourceElement = document.createElement("source");
							sourceElement.setAttribute("src", source);
							let type = getMimeTypeFromFile(source);
							if (type) sourceElement.setAttribute("type", type);
							video.appendChild(sourceElement);
						});
						backgroundContent.appendChild(video);
					} else if (backgroundIframe && options.excludeIframes !== true) {
						let iframe = document.createElement("iframe");
						iframe.setAttribute("allowfullscreen", "");
						iframe.setAttribute("mozallowfullscreen", "");
						iframe.setAttribute("webkitallowfullscreen", "");
						iframe.setAttribute("allow", "autoplay");
						iframe.setAttribute("data-src", backgroundIframe);
						iframe.style.width = "100%";
						iframe.style.height = "100%";
						iframe.style.maxHeight = "100%";
						iframe.style.maxWidth = "100%";
						backgroundContent.appendChild(iframe);
					}
				}
				let backgroundIframeElement = backgroundContent.querySelector("iframe[data-src]");
				if (backgroundIframeElement) {
					if (this.shouldPreload(background) && !/autoplay=(1|true|yes)/gi.test(backgroundIframe)) {
						if (backgroundIframeElement.getAttribute("src") !== backgroundIframe) backgroundIframeElement.setAttribute("src", backgroundIframe);
					}
				}
			}
			this.layout(slide);
		}
		/**
		* Applies JS-dependent layout helpers for the scope.
		*/
		layout(scopeElement) {
			Array.from(scopeElement.querySelectorAll(".r-fit-text")).forEach((element) => {
				e(element, {
					minSize: 24,
					maxSize: this.Reveal.getConfig().height * .8,
					observeMutations: false,
					observeWindow: false
				});
			});
		}
		/**
		* Unloads and hides the given slide. This is called when the
		* slide is moved outside of the configured view distance.
		*
		* @param {HTMLElement} slide
		*/
		unload(slide) {
			slide.style.display = "none";
			let background = this.Reveal.getSlideBackground(slide);
			if (background) {
				background.style.display = "none";
				queryAll(background, "iframe[src]").forEach((element) => {
					element.removeAttribute("src");
				});
			}
			queryAll(slide, "video[data-lazy-loaded][src], audio[data-lazy-loaded][src], iframe[data-lazy-loaded][src]").forEach((element) => {
				element.setAttribute("data-src", element.getAttribute("src"));
				element.removeAttribute("src");
			});
			queryAll(slide, "video[data-lazy-loaded] source[src], audio source[src]").forEach((source) => {
				source.setAttribute("data-src", source.getAttribute("src"));
				source.removeAttribute("src");
			});
		}
		/**
		* Enforces origin-specific format rules for embedded media.
		*/
		formatEmbeddedContent() {
			let _appendParamToIframeSource = (sourceAttribute, sourceURL, param) => {
				queryAll(this.Reveal.getSlidesElement(), "iframe[" + sourceAttribute + "*=\"" + sourceURL + "\"]").forEach((el) => {
					let src = el.getAttribute(sourceAttribute);
					if (src && src.indexOf(param) === -1) el.setAttribute(sourceAttribute, src + (!/\?/.test(src) ? "?" : "&") + param);
				});
			};
			_appendParamToIframeSource("src", "youtube.com/embed/", "enablejsapi=1");
			_appendParamToIframeSource("data-src", "youtube.com/embed/", "enablejsapi=1");
			_appendParamToIframeSource("src", "player.vimeo.com/", "api=1");
			_appendParamToIframeSource("data-src", "player.vimeo.com/", "api=1");
		}
		/**
		* Start playback of any embedded content inside of
		* the given element.
		*
		* @param {HTMLElement} element
		*/
		startEmbeddedContent(element) {
			if (element) {
				const isSpeakerNotesWindow = this.Reveal.isSpeakerNotes();
				queryAll(element, "img[src$=\".gif\"]").forEach((el) => {
					el.setAttribute("src", el.getAttribute("src"));
				});
				queryAll(element, "video, audio").forEach((el) => {
					if (closest(el, ".fragment") && !closest(el, ".fragment.visible")) return;
					let autoplay = this.Reveal.getConfig().autoPlayMedia;
					if (typeof autoplay !== "boolean") autoplay = el.hasAttribute("data-autoplay") || !!closest(el, ".slide-background");
					if (autoplay && typeof el.play === "function") {
						if (isSpeakerNotesWindow && !el.muted) return;
						if (el.readyState > 1) this.startEmbeddedMedia({ target: el });
						else if (isMobile) {
							el.addEventListener("canplay", this.ensureMobileMediaPlaying);
							this.playMediaElement(el);
						} else {
							el.removeEventListener("loadeddata", this.startEmbeddedMedia);
							el.addEventListener("loadeddata", this.startEmbeddedMedia);
						}
					}
				});
				if (!isSpeakerNotesWindow) {
					queryAll(element, "iframe[src]").forEach((el) => {
						if (closest(el, ".fragment") && !closest(el, ".fragment.visible")) return;
						this.startEmbeddedIframe({ target: el });
					});
					queryAll(element, "iframe[data-src]").forEach((el) => {
						if (closest(el, ".fragment") && !closest(el, ".fragment.visible")) return;
						if (el.getAttribute("src") !== el.getAttribute("data-src")) {
							el.removeEventListener("load", this.startEmbeddedIframe);
							el.addEventListener("load", this.startEmbeddedIframe);
							el.setAttribute("src", el.getAttribute("data-src"));
						}
					});
				}
			}
		}
		/**
		* Ensure that an HTMLMediaElement is playing on mobile devices.
		*
		* This is a workaround for a bug in mobile Safari where
		* the media fails to display if many videos are started
		* at the same moment. When this happens, Mobile Safari
		* reports the video is playing, and the current time
		* advances, but nothing is visible.
		*
		* @param {Event} event
		*/
		ensureMobileMediaPlaying(event) {
			const el = event.target;
			if (typeof el.getVideoPlaybackQuality !== "function") return;
			setTimeout(() => {
				const playing = el.paused === false;
				const totalFrames = el.getVideoPlaybackQuality().totalVideoFrames;
				if (playing && totalFrames === 0) {
					el.load();
					el.play();
				}
			}, 1e3);
		}
		/**
		* Starts playing an embedded video/audio element after
		* it has finished loading.
		*
		* @param {object} event
		*/
		startEmbeddedMedia(event) {
			let isAttachedToDOM = !!closest(event.target, "html"), isVisible = !!closest(event.target, ".present");
			if (isAttachedToDOM && isVisible) {
				if (event.target.paused || event.target.ended) {
					event.target.currentTime = 0;
					this.playMediaElement(event.target);
				}
			}
			event.target.removeEventListener("loadeddata", this.startEmbeddedMedia);
		}
		/**
		* Plays the given HTMLMediaElement and handles any playback
		* errors, such as the browser not allowing audio to play without
		* user action.
		*
		* @param {HTMLElement} mediaElement
		*/
		playMediaElement(mediaElement) {
			const promise = mediaElement.play();
			if (promise && typeof promise.catch === "function") promise.then(() => {
				if (!mediaElement.muted) this.allowedToPlayAudio = true;
			}).catch((error) => {
				if (error.name === "NotAllowedError") {
					this.allowedToPlayAudio = false;
					if (mediaElement.tagName === "VIDEO") {
						this.onVideoPlaybackNotAllowed(mediaElement);
						let isAttachedToDOM = !!closest(mediaElement, "html"), isVisible = !!closest(mediaElement, ".present"), isMuted = mediaElement.muted;
						if (isAttachedToDOM && isVisible && !isMuted) {
							mediaElement.setAttribute("data-muted-by-reveal", "true");
							mediaElement.muted = true;
							mediaElement.play().catch(() => {
								this.onMutedVideoPlaybackNotAllowed(mediaElement);
							});
						}
					} else if (mediaElement.tagName === "AUDIO") this.onAudioPlaybackNotAllowed(mediaElement);
				}
			});
		}
		/**
		* "Starts" the content of an embedded iframe using the
		* postMessage API.
		*
		* @param {object} event
		*/
		startEmbeddedIframe(event) {
			let iframe = event.target;
			this.preventIframeAutoFocus(event);
			if (iframe && iframe.contentWindow) {
				let isAttachedToDOM = !!closest(event.target, "html"), isVisible = !!closest(event.target, ".present");
				if (isAttachedToDOM && isVisible) {
					let autoplay = this.Reveal.getConfig().autoPlayMedia;
					if (typeof autoplay !== "boolean") autoplay = iframe.hasAttribute("data-autoplay") || !!closest(iframe, ".slide-background");
					if (/youtube\.com\/embed\//.test(iframe.getAttribute("src")) && autoplay) iframe.contentWindow.postMessage("{\"event\":\"command\",\"func\":\"playVideo\",\"args\":\"\"}", "*");
					else if (/player\.vimeo\.com\//.test(iframe.getAttribute("src")) && autoplay) iframe.contentWindow.postMessage("{\"method\":\"play\"}", "*");
					else iframe.contentWindow.postMessage("slide:start", "*");
				}
			}
		}
		/**
		* Stop playback of any embedded content inside of
		* the targeted slide.
		*
		* @param {HTMLElement} element
		*/
		stopEmbeddedContent(element, options = {}) {
			options = extend({ unloadIframes: true }, options);
			if (element && element.parentNode) {
				queryAll(element, "video, audio").forEach((el) => {
					if (!el.hasAttribute("data-ignore") && typeof el.pause === "function") {
						el.setAttribute("data-paused-by-reveal", "");
						el.pause();
						if (isMobile) el.removeEventListener("canplay", this.ensureMobileMediaPlaying);
					}
				});
				queryAll(element, "iframe").forEach((el) => {
					if (el.contentWindow) el.contentWindow.postMessage("slide:stop", "*");
					el.removeEventListener("load", this.preventIframeAutoFocus);
					el.removeEventListener("load", this.startEmbeddedIframe);
				});
				queryAll(element, "iframe[src*=\"youtube.com/embed/\"]").forEach((el) => {
					if (!el.hasAttribute("data-ignore") && el.contentWindow && typeof el.contentWindow.postMessage === "function") el.contentWindow.postMessage("{\"event\":\"command\",\"func\":\"pauseVideo\",\"args\":\"\"}", "*");
				});
				queryAll(element, "iframe[src*=\"player.vimeo.com/\"]").forEach((el) => {
					if (!el.hasAttribute("data-ignore") && el.contentWindow && typeof el.contentWindow.postMessage === "function") el.contentWindow.postMessage("{\"method\":\"pause\"}", "*");
				});
				if (options.unloadIframes === true) queryAll(element, "iframe[data-src]").forEach((el) => {
					el.setAttribute("src", "about:blank");
					el.removeAttribute("src");
				});
			}
		}
		/**
		* Checks whether media playback is blocked by the browser. This
		* typically happens when media playback is initiated without a
		* direct user interaction.
		*/
		isAllowedToPlayAudio() {
			return this.allowedToPlayAudio;
		}
		/**
		* Shows a manual button in situations where autoamtic media playback
		* is not allowed by the browser.
		*/
		showPlayOrUnmuteButton() {
			const audioTargets = this.failedAudioPlaybackTargets.size;
			const videoTargets = this.failedVideoPlaybackTargets.size;
			const mutedVideoTargets = this.failedMutedVideoPlaybackTargets.size;
			let label = "Play media";
			if (mutedVideoTargets > 0) label = "Play video";
			else if (videoTargets > 0) label = "Unmute video";
			else if (audioTargets > 0) label = "Play audio";
			this.mediaPlayButton.textContent = label;
			this.Reveal.getRevealElement().appendChild(this.mediaPlayButton);
		}
		onAudioPlaybackNotAllowed(target) {
			this.failedAudioPlaybackTargets.add(target);
			this.showPlayOrUnmuteButton(target);
		}
		onVideoPlaybackNotAllowed(target) {
			this.failedVideoPlaybackTargets.add(target);
			this.showPlayOrUnmuteButton();
		}
		onMutedVideoPlaybackNotAllowed(target) {
			this.failedMutedVideoPlaybackTargets.add(target);
			this.showPlayOrUnmuteButton();
		}
		/**
		* Videos may be temporarily muted by us to get around browser
		* restrictions on automatic playback. This method rolls back
		* all such temporary audio changes.
		*/
		resetTemporarilyMutedMedia() {
			new Set([
				...this.failedAudioPlaybackTargets,
				...this.failedVideoPlaybackTargets,
				...this.failedMutedVideoPlaybackTargets
			]).forEach((target) => {
				if (target.hasAttribute("data-muted-by-reveal")) {
					target.muted = false;
					target.removeAttribute("data-muted-by-reveal");
				}
			});
		}
		clearMediaPlaybackErrors() {
			this.resetTemporarilyMutedMedia();
			this.failedAudioPlaybackTargets.clear();
			this.failedVideoPlaybackTargets.clear();
			this.failedMutedVideoPlaybackTargets.clear();
			if (this.mediaPlayButton && this.mediaPlayButton.parentNode) this.mediaPlayButton.remove();
		}
		/**
		* Prevents iframes from automatically focusing themselves.
		*
		* @param {Event} event
		*/
		preventIframeAutoFocus(event) {
			const iframe = event.target;
			if (iframe && this.Reveal.getConfig().preventIframeAutoFocus) {
				let elapsed = 0;
				const interval = 100;
				const maxTime = 1e3;
				const checkFocus = () => {
					if (document.activeElement === iframe) document.activeElement.blur();
					else if (elapsed < maxTime) {
						elapsed += interval;
						setTimeout(checkFocus, interval);
					}
				};
				setTimeout(checkFocus, interval);
			}
		}
		afterSlideChanged() {
			this.clearMediaPlaybackErrors();
		}
	};
	//#endregion
	//#region js/utils/constants.ts
	var SLIDES_SELECTOR = ".slides section";
	var HORIZONTAL_SLIDES_SELECTOR = ".slides>section";
	var VERTICAL_SLIDES_SELECTOR = ".slides>section.present>section";
	var HORIZONTAL_BACKGROUNDS_SELECTOR = ".backgrounds>.slide-background";
	var POST_MESSAGE_METHOD_BLACKLIST = /registerPlugin|registerKeyboardShortcut|addKeyBinding|addEventListener|showPreview|previewIframe/;
	//#endregion
	//#region js/controllers/slidenumber.js
	/**
	* Handles the display of reveal.js' optional slide number.
	*/
	var SlideNumber = class {
		constructor(Reveal) {
			this.Reveal = Reveal;
		}
		render() {
			this.element = document.createElement("div");
			this.element.className = "slide-number";
			this.Reveal.getRevealElement().appendChild(this.element);
		}
		/**
		* Called when the reveal.js config is updated.
		*/
		configure(config, oldConfig) {
			let slideNumberDisplay = "none";
			if (config.slideNumber && !this.Reveal.isPrintView()) {
				if (config.showSlideNumber === "all") slideNumberDisplay = "block";
				else if (config.showSlideNumber === "speaker" && this.Reveal.isSpeakerNotes()) slideNumberDisplay = "block";
			}
			this.element.style.display = slideNumberDisplay;
		}
		/**
		* Updates the slide number to match the current slide.
		*/
		update() {
			if (this.Reveal.getConfig().slideNumber && this.element) this.element.innerHTML = this.getSlideNumber();
		}
		/**
		* Returns the HTML string corresponding to the current slide
		* number, including formatting.
		*/
		getSlideNumber(slide = this.Reveal.getCurrentSlide()) {
			let config = this.Reveal.getConfig();
			let value;
			let format = "h.v";
			if (typeof config.slideNumber === "function") value = config.slideNumber(slide);
			else {
				if (typeof config.slideNumber === "string") format = config.slideNumber;
				if (!/c/.test(format) && this.Reveal.getHorizontalSlides().length === 1) format = "c";
				let horizontalOffset = slide && slide.dataset.visibility === "uncounted" ? 0 : 1;
				value = [];
				switch (format) {
					case "c":
						value.push(this.Reveal.getSlidePastCount(slide) + horizontalOffset);
						break;
					case "c/t":
						value.push(this.Reveal.getSlidePastCount(slide) + horizontalOffset, "/", this.Reveal.getTotalSlides());
						break;
					default:
						let indices = this.Reveal.getIndices(slide);
						value.push(indices.h + horizontalOffset);
						let sep = format === "h/v" ? "/" : ".";
						if (this.Reveal.isVerticalSlide(slide)) value.push(sep, indices.v + 1);
				}
			}
			let url = "#" + this.Reveal.location.getHash(slide);
			return this.formatNumber(value[0], value[1], value[2], url);
		}
		/**
		* Applies HTML formatting to a slide number before it's
		* written to the DOM.
		*
		* @param {number} a Current slide
		* @param {string} delimiter Character to separate slide numbers
		* @param {(number|*)} b Total slides
		* @param {HTMLElement} [url='#'+locationHash()] The url to link to
		* @return {string} HTML string fragment
		*/
		formatNumber(a, delimiter, b, url = "#" + this.Reveal.location.getHash()) {
			if (typeof b === "number" && !isNaN(b)) return `<a href="${url}">
					<span class="slide-number-a">${a}</span>
					<span class="slide-number-delimiter">${delimiter}</span>
					<span class="slide-number-b">${b}</span>
					</a>`;
			else return `<a href="${url}">
					<span class="slide-number-a">${a}</span>
					</a>`;
		}
		destroy() {
			this.element.remove();
		}
	};
	//#endregion
	//#region js/controllers/jumptoslide.js
	/**
	* Makes it possible to jump to a slide by entering its
	* slide number or id.
	*/
	var JumpToSlide = class {
		constructor(Reveal) {
			this.Reveal = Reveal;
			this.onInput = this.onInput.bind(this);
			this.onBlur = this.onBlur.bind(this);
			this.onKeyDown = this.onKeyDown.bind(this);
		}
		render() {
			this.element = document.createElement("div");
			this.element.className = "jump-to-slide";
			this.jumpInput = document.createElement("input");
			this.jumpInput.type = "text";
			this.jumpInput.className = "jump-to-slide-input";
			this.jumpInput.placeholder = "Jump to slide";
			this.jumpInput.addEventListener("input", this.onInput);
			this.jumpInput.addEventListener("keydown", this.onKeyDown);
			this.jumpInput.addEventListener("blur", this.onBlur);
			this.element.appendChild(this.jumpInput);
		}
		show() {
			this.indicesOnShow = this.Reveal.getIndices();
			this.Reveal.getRevealElement().appendChild(this.element);
			this.jumpInput.focus();
		}
		hide() {
			if (this.isVisible()) {
				this.element.remove();
				this.jumpInput.value = "";
				clearTimeout(this.jumpTimeout);
				delete this.jumpTimeout;
			}
		}
		isVisible() {
			return !!this.element.parentNode;
		}
		/**
		* Parses the current input and jumps to the given slide.
		*/
		jump() {
			clearTimeout(this.jumpTimeout);
			delete this.jumpTimeout;
			let query = this.jumpInput.value.trim("");
			let indices;
			if (/^\d+$/.test(query)) {
				const slideNumberFormat = this.Reveal.getConfig().slideNumber;
				if (slideNumberFormat === "c" || slideNumberFormat === "c/t") {
					const slide = this.Reveal.getSlides()[parseInt(query, 10) - 1];
					if (slide) indices = this.Reveal.getIndices(slide);
				}
			}
			if (!indices) {
				if (/^\d+\.\d+$/.test(query)) query = query.replace(".", "/");
				indices = this.Reveal.location.getIndicesFromHash(query, { oneBasedIndex: true });
			}
			if (!indices && /\S+/i.test(query) && query.length > 1) indices = this.search(query);
			if (indices && query !== "") {
				this.Reveal.slide(indices.h, indices.v, indices.f);
				return true;
			} else {
				this.Reveal.slide(this.indicesOnShow.h, this.indicesOnShow.v, this.indicesOnShow.f);
				return false;
			}
		}
		jumpAfter(delay) {
			clearTimeout(this.jumpTimeout);
			this.jumpTimeout = setTimeout(() => this.jump(), delay);
		}
		/**
		* A lofi search that looks for the given query in all
		* of our slides and returns the first match.
		*/
		search(query) {
			const regex = new RegExp("\\b" + query.trim() + "\\b", "i");
			const slide = this.Reveal.getSlides().find((slide) => {
				return regex.test(slide.innerText);
			});
			if (slide) return this.Reveal.getIndices(slide);
			else return null;
		}
		/**
		* Reverts back to the slide we were on when jump to slide was
		* invoked.
		*/
		cancel() {
			this.Reveal.slide(this.indicesOnShow.h, this.indicesOnShow.v, this.indicesOnShow.f);
			this.hide();
		}
		confirm() {
			this.jump();
			this.hide();
		}
		destroy() {
			this.jumpInput.removeEventListener("input", this.onInput);
			this.jumpInput.removeEventListener("keydown", this.onKeyDown);
			this.jumpInput.removeEventListener("blur", this.onBlur);
			this.element.remove();
		}
		onKeyDown(event) {
			if (event.keyCode === 13) this.confirm();
			else if (event.keyCode === 27) {
				this.cancel();
				event.stopImmediatePropagation();
			}
		}
		onInput(event) {
			this.jumpAfter(200);
		}
		onBlur() {
			setTimeout(() => this.hide(), 1);
		}
	};
	//#endregion
	//#region js/utils/color.ts
	/**
	* Converts various color input formats to an {r:0,g:0,b:0} object.
	*
	* @param {string} color The string representation of a color
	* @example
	* colorToRgb('#000');
	* @example
	* colorToRgb('#000000');
	* @example
	* colorToRgb('rgb(0,0,0)');
	* @example
	* colorToRgb('rgba(0,0,0)');
	*
	* @return {{r: number, g: number, b: number, [a]: number}|null}
	*/
	var colorToRgb = (color) => {
		let hex3 = color.match(/^#([0-9a-f]{3})$/i);
		if (hex3 && hex3[1]) {
			const hex3Value = hex3[1];
			return {
				r: parseInt(hex3Value.charAt(0), 16) * 17,
				g: parseInt(hex3Value.charAt(1), 16) * 17,
				b: parseInt(hex3Value.charAt(2), 16) * 17
			};
		}
		let hex6 = color.match(/^#([0-9a-f]{6})$/i);
		if (hex6 && hex6[1]) {
			const hex6Value = hex6[1];
			return {
				r: parseInt(hex6Value.slice(0, 2), 16),
				g: parseInt(hex6Value.slice(2, 4), 16),
				b: parseInt(hex6Value.slice(4, 6), 16)
			};
		}
		let rgb = color.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
		if (rgb) return {
			r: parseInt(rgb[1], 10),
			g: parseInt(rgb[2], 10),
			b: parseInt(rgb[3], 10)
		};
		let rgba = color.match(/^rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d]+|[\d]*.[\d]+)\s*\)$/i);
		if (rgba) return {
			r: parseInt(rgba[1], 10),
			g: parseInt(rgba[2], 10),
			b: parseInt(rgba[3], 10),
			a: parseFloat(rgba[4])
		};
		return null;
	};
	/**
	* Calculates brightness on a scale of 0-255.
	*
	* @param {string} color See colorToRgb for supported formats.
	* @see {@link colorToRgb}
	*/
	var colorBrightness = (color) => {
		if (typeof color === "string") color = colorToRgb(color);
		if (color) return (color.r * 299 + color.g * 587 + color.b * 114) / 1e3;
		return null;
	};
	//#endregion
	//#region js/controllers/backgrounds.js
	/**
	* Creates and updates slide backgrounds.
	*/
	var Backgrounds = class {
		constructor(Reveal) {
			this.Reveal = Reveal;
		}
		render() {
			this.element = document.createElement("div");
			this.element.className = "backgrounds";
			this.Reveal.getRevealElement().appendChild(this.element);
		}
		/**
		* Creates the slide background elements and appends them
		* to the background container. One element is created per
		* slide no matter if the given slide has visible background.
		*/
		create() {
			this.element.innerHTML = "";
			this.element.classList.add("no-transition");
			this.Reveal.getHorizontalSlides().forEach((slideh) => {
				let backgroundStack = this.createBackground(slideh, this.element);
				queryAll(slideh, "section").forEach((slidev) => {
					this.createBackground(slidev, backgroundStack);
					backgroundStack.classList.add("stack");
				});
			});
			if (this.Reveal.getConfig().parallaxBackgroundImage) {
				this.element.style.backgroundImage = "url(\"" + this.Reveal.getConfig().parallaxBackgroundImage + "\")";
				this.element.style.backgroundSize = this.Reveal.getConfig().parallaxBackgroundSize;
				this.element.style.backgroundRepeat = this.Reveal.getConfig().parallaxBackgroundRepeat;
				this.element.style.backgroundPosition = this.Reveal.getConfig().parallaxBackgroundPosition;
				setTimeout(() => {
					this.Reveal.getRevealElement().classList.add("has-parallax-background");
				}, 1);
			} else {
				this.element.style.backgroundImage = "";
				this.Reveal.getRevealElement().classList.remove("has-parallax-background");
			}
		}
		/**
		* Creates a background for the given slide.
		*
		* @param {HTMLElement} slide
		* @param {HTMLElement} container The element that the background
		* should be appended to
		* @return {HTMLElement} New background div
		*/
		createBackground(slide, container) {
			let element = document.createElement("div");
			element.className = "slide-background " + slide.className.replace(/present|past|future/, "");
			let contentElement = document.createElement("div");
			contentElement.className = "slide-background-content";
			element.appendChild(contentElement);
			container.appendChild(element);
			slide.slideBackgroundElement = element;
			slide.slideBackgroundContentElement = contentElement;
			this.sync(slide);
			return element;
		}
		/**
		* Renders all of the visual properties of a slide background
		* based on the various background attributes.
		*
		* @param {HTMLElement} slide
		*/
		sync(slide) {
			const element = slide.slideBackgroundElement, contentElement = slide.slideBackgroundContentElement;
			const data = {
				background: slide.getAttribute("data-background"),
				backgroundSize: slide.getAttribute("data-background-size"),
				backgroundImage: slide.getAttribute("data-background-image"),
				backgroundVideo: slide.getAttribute("data-background-video"),
				backgroundIframe: slide.getAttribute("data-background-iframe"),
				backgroundColor: slide.getAttribute("data-background-color"),
				backgroundGradient: slide.getAttribute("data-background-gradient"),
				backgroundRepeat: slide.getAttribute("data-background-repeat"),
				backgroundPosition: slide.getAttribute("data-background-position"),
				backgroundTransition: slide.getAttribute("data-background-transition"),
				backgroundOpacity: slide.getAttribute("data-background-opacity")
			};
			const dataPreload = slide.hasAttribute("data-preload");
			slide.classList.remove("has-dark-background");
			slide.classList.remove("has-light-background");
			element.removeAttribute("data-loaded");
			element.removeAttribute("data-background-hash");
			element.removeAttribute("data-background-size");
			element.removeAttribute("data-background-transition");
			element.style.backgroundColor = "";
			contentElement.style.backgroundSize = "";
			contentElement.style.backgroundRepeat = "";
			contentElement.style.backgroundPosition = "";
			contentElement.style.backgroundImage = "";
			contentElement.style.opacity = "";
			contentElement.innerHTML = "";
			if (data.background) if (/^(http|file|\/\/)/gi.test(data.background) || /\.(svg|png|jpg|jpeg|gif|bmp|webp)([?#\s]|$)/gi.test(data.background)) slide.setAttribute("data-background-image", data.background);
			else element.style.background = data.background;
			if (data.background || data.backgroundColor || data.backgroundGradient || data.backgroundImage || data.backgroundVideo || data.backgroundIframe) element.setAttribute("data-background-hash", data.background + data.backgroundSize + data.backgroundImage + data.backgroundVideo + data.backgroundIframe + data.backgroundColor + data.backgroundGradient + data.backgroundRepeat + data.backgroundPosition + data.backgroundTransition + data.backgroundOpacity);
			if (data.backgroundSize) element.setAttribute("data-background-size", data.backgroundSize);
			if (data.backgroundColor) element.style.backgroundColor = data.backgroundColor;
			if (data.backgroundGradient) element.style.backgroundImage = data.backgroundGradient;
			if (data.backgroundTransition) element.setAttribute("data-background-transition", data.backgroundTransition);
			if (dataPreload) element.setAttribute("data-preload", "");
			if (data.backgroundSize) contentElement.style.backgroundSize = data.backgroundSize;
			if (data.backgroundRepeat) contentElement.style.backgroundRepeat = data.backgroundRepeat;
			if (data.backgroundPosition) contentElement.style.backgroundPosition = data.backgroundPosition;
			if (data.backgroundOpacity) contentElement.style.opacity = data.backgroundOpacity;
			const contrastClass = this.getContrastClass(slide);
			if (typeof contrastClass === "string") slide.classList.add(contrastClass);
		}
		/**
		* Returns a class name that can be applied to a slide to indicate
		* if it has a light or dark background.
		*
		* @param {*} slide
		*
		* @returns {string|null}
		*/
		getContrastClass(slide) {
			const element = slide.slideBackgroundElement;
			let contrastColor = slide.getAttribute("data-background-color");
			if (!contrastColor || !colorToRgb(contrastColor)) {
				let computedBackgroundStyle = window.getComputedStyle(element);
				if (computedBackgroundStyle && computedBackgroundStyle.backgroundColor) contrastColor = computedBackgroundStyle.backgroundColor;
			}
			if (contrastColor) {
				const rgb = colorToRgb(contrastColor);
				if (rgb && rgb.a !== 0) if (colorBrightness(contrastColor) < 128) return "has-dark-background";
				else return "has-light-background";
			}
			return null;
		}
		/**
		* Bubble the 'has-light-background'/'has-dark-background' classes.
		*/
		bubbleSlideContrastClassToElement(slide, target) {
			["has-light-background", "has-dark-background"].forEach((classToBubble) => {
				if (slide.classList.contains(classToBubble)) target.classList.add(classToBubble);
				else target.classList.remove(classToBubble);
			}, this);
		}
		/**
		* Updates the background elements to reflect the current
		* slide.
		*
		* @param {boolean} includeAll If true, the backgrounds of
		* all vertical slides (not just the present) will be updated.
		*/
		update(includeAll = false) {
			let config = this.Reveal.getConfig();
			let currentSlide = this.Reveal.getCurrentSlide();
			let indices = this.Reveal.getIndices();
			let currentBackground = null;
			let horizontalPast = config.rtl ? "future" : "past", horizontalFuture = config.rtl ? "past" : "future";
			Array.from(this.element.childNodes).forEach((backgroundh, h) => {
				backgroundh.classList.remove("past", "present", "future");
				if (h < indices.h) backgroundh.classList.add(horizontalPast);
				else if (h > indices.h) backgroundh.classList.add(horizontalFuture);
				else {
					backgroundh.classList.add("present");
					currentBackground = backgroundh;
				}
				if (includeAll || h === indices.h) queryAll(backgroundh, ".slide-background").forEach((backgroundv, v) => {
					backgroundv.classList.remove("past", "present", "future");
					const indexv = typeof indices.v === "number" ? indices.v : 0;
					if (v < indexv) backgroundv.classList.add("past");
					else if (v > indexv) backgroundv.classList.add("future");
					else {
						backgroundv.classList.add("present");
						if (h === indices.h) currentBackground = backgroundv;
					}
				});
			});
			if (this.previousBackground && !this.previousBackground.closest("body")) this.previousBackground = null;
			if (currentBackground && this.previousBackground) {
				let previousBackgroundHash = this.previousBackground.getAttribute("data-background-hash");
				let currentBackgroundHash = currentBackground.getAttribute("data-background-hash");
				if (currentBackgroundHash && currentBackgroundHash === previousBackgroundHash && currentBackground !== this.previousBackground) {
					this.element.classList.add("no-transition");
					const currentVideo = currentBackground.querySelector("video");
					const previousVideo = this.previousBackground.querySelector("video");
					if (currentVideo && previousVideo) {
						const currentVideoParent = currentVideo.parentNode;
						previousVideo.parentNode.appendChild(currentVideo);
						currentVideoParent.appendChild(previousVideo);
					}
				}
			}
			const backgroundChanged = currentBackground !== this.previousBackground;
			if (backgroundChanged && this.previousBackground) this.Reveal.slideContent.stopEmbeddedContent(this.previousBackground, { unloadIframes: !this.Reveal.slideContent.shouldPreload(this.previousBackground) });
			if (backgroundChanged && currentBackground) {
				this.Reveal.slideContent.startEmbeddedContent(currentBackground);
				let currentBackgroundContent = currentBackground.querySelector(".slide-background-content");
				if (currentBackgroundContent) {
					let backgroundImageURL = currentBackgroundContent.style.backgroundImage || "";
					if (/\.gif/i.test(backgroundImageURL)) {
						currentBackgroundContent.style.backgroundImage = "";
						window.getComputedStyle(currentBackgroundContent).opacity;
						currentBackgroundContent.style.backgroundImage = backgroundImageURL;
					}
				}
				this.previousBackground = currentBackground;
			}
			if (currentSlide) this.bubbleSlideContrastClassToElement(currentSlide, this.Reveal.getRevealElement());
			setTimeout(() => {
				this.element.classList.remove("no-transition");
			}, 10);
		}
		/**
		* Updates the position of the parallax background based
		* on the current slide index.
		*/
		updateParallax() {
			let indices = this.Reveal.getIndices();
			if (this.Reveal.getConfig().parallaxBackgroundImage) {
				let horizontalSlides = this.Reveal.getHorizontalSlides(), verticalSlides = this.Reveal.getVerticalSlides();
				let backgroundSize = this.element.style.backgroundSize.split(" "), backgroundWidth, backgroundHeight;
				if (backgroundSize.length === 1) backgroundWidth = backgroundHeight = parseInt(backgroundSize[0], 10);
				else {
					backgroundWidth = parseInt(backgroundSize[0], 10);
					backgroundHeight = parseInt(backgroundSize[1], 10);
				}
				let slideWidth = this.element.offsetWidth, horizontalSlideCount = horizontalSlides.length, horizontalOffsetMultiplier, horizontalOffset;
				if (typeof this.Reveal.getConfig().parallaxBackgroundHorizontal === "number") horizontalOffsetMultiplier = this.Reveal.getConfig().parallaxBackgroundHorizontal;
				else horizontalOffsetMultiplier = horizontalSlideCount > 1 ? (backgroundWidth - slideWidth) / (horizontalSlideCount - 1) : 0;
				horizontalOffset = horizontalOffsetMultiplier * indices.h * -1;
				let slideHeight = this.element.offsetHeight, verticalSlideCount = verticalSlides.length, verticalOffsetMultiplier, verticalOffset;
				if (typeof this.Reveal.getConfig().parallaxBackgroundVertical === "number") verticalOffsetMultiplier = this.Reveal.getConfig().parallaxBackgroundVertical;
				else verticalOffsetMultiplier = (backgroundHeight - slideHeight) / (verticalSlideCount - 1);
				verticalOffset = verticalSlideCount > 0 ? verticalOffsetMultiplier * indices.v : 0;
				this.element.style.backgroundPosition = horizontalOffset + "px " + -verticalOffset + "px";
			}
		}
		destroy() {
			this.element.remove();
		}
	};
	//#endregion
	//#region js/controllers/autoanimate.js
	var autoAnimateCounter = 0;
	/**
	* Automatically animates matching elements across
	* slides with the [data-auto-animate] attribute.
	*/
	var AutoAnimate = class {
		constructor(Reveal) {
			this.Reveal = Reveal;
		}
		/**
		* Runs an auto-animation between the given slides.
		*
		* @param  {HTMLElement} fromSlide
		* @param  {HTMLElement} toSlide
		*/
		run(fromSlide, toSlide) {
			this.reset();
			let allSlides = this.Reveal.getSlides();
			let toSlideIndex = allSlides.indexOf(toSlide);
			let fromSlideIndex = allSlides.indexOf(fromSlide);
			if (fromSlide && toSlide && fromSlide.hasAttribute("data-auto-animate") && toSlide.hasAttribute("data-auto-animate") && fromSlide.getAttribute("data-auto-animate-id") === toSlide.getAttribute("data-auto-animate-id") && !(toSlideIndex > fromSlideIndex ? toSlide : fromSlide).hasAttribute("data-auto-animate-restart")) {
				this.autoAnimateStyleSheet = this.autoAnimateStyleSheet || createStyleSheet();
				let animationOptions = this.getAutoAnimateOptions(toSlide);
				fromSlide.dataset.autoAnimate = "pending";
				toSlide.dataset.autoAnimate = "pending";
				animationOptions.slideDirection = toSlideIndex > fromSlideIndex ? "forward" : "backward";
				let fromSlideIsHidden = fromSlide.style.display === "none";
				if (fromSlideIsHidden) fromSlide.style.display = this.Reveal.getConfig().display;
				let css = this.getAutoAnimatableElements(fromSlide, toSlide).map((elements) => {
					return this.autoAnimateElements(elements.from, elements.to, elements.options || {}, animationOptions, autoAnimateCounter++);
				});
				if (fromSlideIsHidden) fromSlide.style.display = "none";
				if (toSlide.dataset.autoAnimateUnmatched !== "false" && this.Reveal.getConfig().autoAnimateUnmatched === true) {
					let defaultUnmatchedDuration = animationOptions.duration * .8, defaultUnmatchedDelay = animationOptions.duration * .2;
					this.getUnmatchedAutoAnimateElements(toSlide).forEach((unmatchedElement) => {
						let unmatchedOptions = this.getAutoAnimateOptions(unmatchedElement, animationOptions);
						let id = "unmatched";
						if (unmatchedOptions.duration !== animationOptions.duration || unmatchedOptions.delay !== animationOptions.delay) {
							id = "unmatched-" + autoAnimateCounter++;
							css.push(`[data-auto-animate="running"] [data-auto-animate-target="${id}"] { transition: opacity ${unmatchedOptions.duration}s ease ${unmatchedOptions.delay}s; }`);
						}
						unmatchedElement.dataset.autoAnimateTarget = id;
					}, this);
					css.push(`[data-auto-animate="running"] [data-auto-animate-target="unmatched"] { transition: opacity ${defaultUnmatchedDuration}s ease ${defaultUnmatchedDelay}s; }`);
				}
				this.autoAnimateStyleSheet.innerHTML = css.join("");
				requestAnimationFrame(() => {
					if (this.autoAnimateStyleSheet) {
						getComputedStyle(this.autoAnimateStyleSheet).fontWeight;
						toSlide.dataset.autoAnimate = "running";
					}
				});
				this.Reveal.dispatchEvent({
					type: "autoanimate",
					data: {
						fromSlide,
						toSlide,
						sheet: this.autoAnimateStyleSheet
					}
				});
			}
		}
		/**
		* Rolls back all changes that we've made to the DOM so
		* that as part of animating.
		*/
		reset() {
			queryAll(this.Reveal.getRevealElement(), "[data-auto-animate]:not([data-auto-animate=\"\"])").forEach((element) => {
				element.dataset.autoAnimate = "";
			});
			queryAll(this.Reveal.getRevealElement(), "[data-auto-animate-target]").forEach((element) => {
				delete element.dataset.autoAnimateTarget;
			});
			if (this.autoAnimateStyleSheet && this.autoAnimateStyleSheet.parentNode) {
				this.autoAnimateStyleSheet.parentNode.removeChild(this.autoAnimateStyleSheet);
				this.autoAnimateStyleSheet = null;
			}
		}
		/**
		* Creates a FLIP animation where the `to` element starts out
		* in the `from` element position and animates to its original
		* state.
		*
		* @param {HTMLElement} from
		* @param {HTMLElement} to
		* @param {Object} elementOptions Options for this element pair
		* @param {Object} animationOptions Options set at the slide level
		* @param {String} id Unique ID that we can use to identify this
		* auto-animate element in the DOM
		*/
		autoAnimateElements(from, to, elementOptions, animationOptions, id) {
			from.dataset.autoAnimateTarget = "";
			to.dataset.autoAnimateTarget = id;
			let options = this.getAutoAnimateOptions(to, animationOptions);
			if (typeof elementOptions.delay !== "undefined") options.delay = elementOptions.delay;
			if (typeof elementOptions.duration !== "undefined") options.duration = elementOptions.duration;
			if (typeof elementOptions.easing !== "undefined") options.easing = elementOptions.easing;
			let fromProps = this.getAutoAnimatableProperties("from", from, elementOptions), toProps = this.getAutoAnimatableProperties("to", to, elementOptions);
			if (to.classList.contains("fragment")) delete toProps.styles["opacity"];
			if (elementOptions.translate !== false || elementOptions.scale !== false) {
				let presentationScale = this.Reveal.getScale();
				let delta = {
					x: (fromProps.x - toProps.x) / presentationScale,
					y: (fromProps.y - toProps.y) / presentationScale,
					scaleX: fromProps.width / toProps.width,
					scaleY: fromProps.height / toProps.height
				};
				delta.x = Math.round(delta.x * 1e3) / 1e3;
				delta.y = Math.round(delta.y * 1e3) / 1e3;
				delta.scaleX = Math.round(delta.scaleX * 1e3) / 1e3;
				delta.scaleX = Math.round(delta.scaleX * 1e3) / 1e3;
				let translate = elementOptions.translate !== false && (delta.x !== 0 || delta.y !== 0), scale = elementOptions.scale !== false && (delta.scaleX !== 0 || delta.scaleY !== 0);
				if (translate || scale) {
					let transform = [];
					if (translate) transform.push(`translate(${delta.x}px, ${delta.y}px)`);
					if (scale) transform.push(`scale(${delta.scaleX}, ${delta.scaleY})`);
					fromProps.styles["transform"] = transform.join(" ");
					fromProps.styles["transform-origin"] = "top left";
					toProps.styles["transform"] = "none";
				}
			}
			for (let propertyName in toProps.styles) {
				const toValue = toProps.styles[propertyName];
				const fromValue = fromProps.styles[propertyName];
				if (toValue === fromValue) delete toProps.styles[propertyName];
				else {
					if (toValue.explicitValue === true) toProps.styles[propertyName] = toValue.value;
					if (fromValue.explicitValue === true) fromProps.styles[propertyName] = fromValue.value;
				}
			}
			let css = "";
			let toStyleProperties = Object.keys(toProps.styles);
			if (toStyleProperties.length > 0) {
				fromProps.styles["transition"] = "none";
				toProps.styles["transition"] = `all ${options.duration}s ${options.easing} ${options.delay}s`;
				toProps.styles["transition-property"] = toStyleProperties.join(", ");
				toProps.styles["will-change"] = toStyleProperties.join(", ");
				let fromCSS = Object.keys(fromProps.styles).map((propertyName) => {
					return propertyName + ": " + fromProps.styles[propertyName] + " !important;";
				}).join("");
				let toCSS = Object.keys(toProps.styles).map((propertyName) => {
					return propertyName + ": " + toProps.styles[propertyName] + " !important;";
				}).join("");
				css = "[data-auto-animate-target=\"" + id + "\"] {" + fromCSS + "}[data-auto-animate=\"running\"] [data-auto-animate-target=\"" + id + "\"] {" + toCSS + "}";
			}
			return css;
		}
		/**
		* Returns the auto-animate options for the given element.
		*
		* @param {HTMLElement} element Element to pick up options
		* from, either a slide or an animation target
		* @param {Object} [inheritedOptions] Optional set of existing
		* options
		*/
		getAutoAnimateOptions(element, inheritedOptions) {
			let options = {
				easing: this.Reveal.getConfig().autoAnimateEasing,
				duration: this.Reveal.getConfig().autoAnimateDuration,
				delay: 0
			};
			options = extend(options, inheritedOptions);
			if (element.parentNode) {
				let autoAnimatedParent = closest(element.parentNode, "[data-auto-animate-target]");
				if (autoAnimatedParent) options = this.getAutoAnimateOptions(autoAnimatedParent, options);
			}
			if (element.dataset.autoAnimateEasing) options.easing = element.dataset.autoAnimateEasing;
			if (element.dataset.autoAnimateDuration) options.duration = parseFloat(element.dataset.autoAnimateDuration);
			if (element.dataset.autoAnimateDelay) options.delay = parseFloat(element.dataset.autoAnimateDelay);
			return options;
		}
		/**
		* Returns an object containing all of the properties
		* that can be auto-animated for the given element and
		* their current computed values.
		*
		* @param {String} direction 'from' or 'to'
		*/
		getAutoAnimatableProperties(direction, element, elementOptions) {
			let config = this.Reveal.getConfig();
			let properties = { styles: [] };
			if (elementOptions.translate !== false || elementOptions.scale !== false) {
				let bounds;
				if (typeof elementOptions.measure === "function") bounds = elementOptions.measure(element);
				else if (config.center) bounds = element.getBoundingClientRect();
				else {
					let scale = this.Reveal.getScale();
					bounds = {
						x: element.offsetLeft * scale,
						y: element.offsetTop * scale,
						width: element.offsetWidth * scale,
						height: element.offsetHeight * scale
					};
				}
				properties.x = bounds.x;
				properties.y = bounds.y;
				properties.width = bounds.width;
				properties.height = bounds.height;
			}
			const computedStyles = getComputedStyle(element);
			(elementOptions.styles || config.autoAnimateStyles).forEach((style) => {
				let value;
				if (typeof style === "string") style = { property: style };
				if (typeof style.from !== "undefined" && direction === "from") value = {
					value: style.from,
					explicitValue: true
				};
				else if (typeof style.to !== "undefined" && direction === "to") value = {
					value: style.to,
					explicitValue: true
				};
				else {
					if (style.property === "line-height") value = parseFloat(computedStyles["line-height"]) / parseFloat(computedStyles["font-size"]);
					if (isNaN(value)) value = computedStyles[style.property];
				}
				if (value !== "") properties.styles[style.property] = value;
			});
			return properties;
		}
		/**
		* Get a list of all element pairs that we can animate
		* between the given slides.
		*
		* @param {HTMLElement} fromSlide
		* @param {HTMLElement} toSlide
		*
		* @return {Array} Each value is an array where [0] is
		* the element we're animating from and [1] is the
		* element we're animating to
		*/
		getAutoAnimatableElements(fromSlide, toSlide) {
			let pairs = (typeof this.Reveal.getConfig().autoAnimateMatcher === "function" ? this.Reveal.getConfig().autoAnimateMatcher : this.getAutoAnimatePairs).call(this, fromSlide, toSlide);
			let reserved = [];
			return pairs.filter((pair, index) => {
				if (reserved.indexOf(pair.to) === -1) {
					reserved.push(pair.to);
					return true;
				}
			});
		}
		/**
		* Identifies matching elements between slides.
		*
		* You can specify a custom matcher function by using
		* the `autoAnimateMatcher` config option.
		*/
		getAutoAnimatePairs(fromSlide, toSlide) {
			let pairs = [];
			const codeNodes = "pre";
			const textNodes = "h1, h2, h3, h4, h5, h6, p, li";
			const mediaNodes = "img, video, iframe";
			this.findAutoAnimateMatches(pairs, fromSlide, toSlide, "[data-id]", (node) => {
				return node.nodeName + ":::" + node.getAttribute("data-id");
			});
			this.findAutoAnimateMatches(pairs, fromSlide, toSlide, textNodes, (node) => {
				return node.nodeName + ":::" + node.textContent.trim();
			});
			this.findAutoAnimateMatches(pairs, fromSlide, toSlide, mediaNodes, (node) => {
				return node.nodeName + ":::" + (node.getAttribute("src") || node.getAttribute("data-src"));
			});
			this.findAutoAnimateMatches(pairs, fromSlide, toSlide, codeNodes, (node) => {
				return node.nodeName + ":::" + node.textContent.trim();
			});
			pairs.forEach((pair) => {
				if (matches(pair.from, textNodes)) pair.options = { scale: false };
				else if (matches(pair.from, codeNodes)) {
					pair.options = {
						scale: false,
						styles: ["width", "height"]
					};
					this.findAutoAnimateMatches(pairs, pair.from, pair.to, ".hljs .hljs-ln-code", (node) => {
						return node.textContent;
					}, {
						scale: false,
						styles: [],
						measure: this.getLocalBoundingBox.bind(this)
					});
					this.findAutoAnimateMatches(pairs, pair.from, pair.to, ".hljs .hljs-ln-numbers[data-line-number]", (node) => {
						return node.getAttribute("data-line-number");
					}, {
						scale: false,
						styles: ["width"],
						measure: this.getLocalBoundingBox.bind(this)
					});
				}
			}, this);
			return pairs;
		}
		/**
		* Helper method which returns a bounding box based on
		* the given elements offset coordinates.
		*
		* @param {HTMLElement} element
		* @return {Object} x, y, width, height
		*/
		getLocalBoundingBox(element) {
			const presentationScale = this.Reveal.getScale();
			return {
				x: Math.round(element.offsetLeft * presentationScale * 100) / 100,
				y: Math.round(element.offsetTop * presentationScale * 100) / 100,
				width: Math.round(element.offsetWidth * presentationScale * 100) / 100,
				height: Math.round(element.offsetHeight * presentationScale * 100) / 100
			};
		}
		/**
		* Finds matching elements between two slides.
		*
		* @param {Array} pairs            	List of pairs to push matches to
		* @param {HTMLElement} fromScope   Scope within the from element exists
		* @param {HTMLElement} toScope     Scope within the to element exists
		* @param {String} selector         CSS selector of the element to match
		* @param {Function} serializer     A function that accepts an element and returns
		*                                  a stringified ID based on its contents
		* @param {Object} animationOptions Optional config options for this pair
		*/
		findAutoAnimateMatches(pairs, fromScope, toScope, selector, serializer, animationOptions) {
			let fromMatches = {};
			let toMatches = {};
			[].slice.call(fromScope.querySelectorAll(selector)).forEach((element, i) => {
				const key = serializer(element);
				if (typeof key === "string" && key.length) {
					fromMatches[key] = fromMatches[key] || [];
					fromMatches[key].push(element);
				}
			});
			[].slice.call(toScope.querySelectorAll(selector)).forEach((element, i) => {
				const key = serializer(element);
				toMatches[key] = toMatches[key] || [];
				toMatches[key].push(element);
				let fromElement;
				if (fromMatches[key]) {
					const primaryIndex = toMatches[key].length - 1;
					const secondaryIndex = fromMatches[key].length - 1;
					if (fromMatches[key][primaryIndex]) {
						fromElement = fromMatches[key][primaryIndex];
						fromMatches[key][primaryIndex] = null;
					} else if (fromMatches[key][secondaryIndex]) {
						fromElement = fromMatches[key][secondaryIndex];
						fromMatches[key][secondaryIndex] = null;
					}
				}
				if (fromElement) pairs.push({
					from: fromElement,
					to: element,
					options: animationOptions
				});
			});
		}
		/**
		* Returns a all elements within the given scope that should
		* be considered unmatched in an auto-animate transition. If
		* fading of unmatched elements is turned on, these elements
		* will fade when going between auto-animate slides.
		*
		* Note that parents of auto-animate targets are NOT considered
		* unmatched since fading them would break the auto-animation.
		*
		* @param {HTMLElement} rootElement
		* @return {Array}
		*/
		getUnmatchedAutoAnimateElements(rootElement) {
			return [].slice.call(rootElement.children).reduce((result, element) => {
				const containsAnimatedElements = element.querySelector("[data-auto-animate-target]");
				if (!element.hasAttribute("data-auto-animate-target") && !containsAnimatedElements) result.push(element);
				if (element.querySelector("[data-auto-animate-target]")) result = result.concat(this.getUnmatchedAutoAnimateElements(element));
				return result;
			}, []);
		}
	};
	//#endregion
	//#region js/controllers/scrollview.js
	var HIDE_SCROLLBAR_TIMEOUT = 500;
	var MAX_PROGRESS_SPACING = 4;
	var MIN_PROGRESS_SEGMENT_HEIGHT = 6;
	var MIN_PLAYHEAD_HEIGHT = 8;
	/**
	* The scroll view lets you read a reveal.js presentation
	* as a linear scrollable page.
	*/
	var ScrollView = class {
		constructor(Reveal) {
			this.Reveal = Reveal;
			this.active = false;
			this.activatedCallbacks = [];
			this.onScroll = this.onScroll.bind(this);
		}
		/**
		* Activates the scroll view. This rearranges the presentation DOM
		* by—among other things—wrapping each slide in a page element.
		*/
		activate() {
			if (this.active) return;
			const stateBeforeActivation = this.Reveal.getState();
			this.active = true;
			this.slideHTMLBeforeActivation = this.Reveal.getSlidesElement().innerHTML;
			const horizontalSlides = queryAll(this.Reveal.getRevealElement(), HORIZONTAL_SLIDES_SELECTOR);
			const horizontalBackgrounds = queryAll(this.Reveal.getRevealElement(), HORIZONTAL_BACKGROUNDS_SELECTOR);
			this.viewportElement.classList.add("loading-scroll-mode", "reveal-scroll");
			let presentationBackground;
			const viewportStyles = window.getComputedStyle(this.viewportElement);
			if (viewportStyles && viewportStyles.background) presentationBackground = viewportStyles.background;
			const pageElements = [];
			const pageContainer = horizontalSlides[0].parentNode;
			let previousSlide;
			const createPageElement = (slide, h, v, isVertical) => {
				let contentContainer;
				if (previousSlide && this.Reveal.shouldAutoAnimateBetween(previousSlide, slide)) {
					contentContainer = document.createElement("div");
					contentContainer.className = "scroll-page-content scroll-auto-animate-page";
					contentContainer.style.display = "none";
					previousSlide.closest(".scroll-page-content").parentNode.appendChild(contentContainer);
				} else {
					const page = document.createElement("div");
					page.className = "scroll-page";
					pageElements.push(page);
					if (isVertical && horizontalBackgrounds.length > h) {
						const slideBackground = horizontalBackgrounds[h];
						const pageBackground = window.getComputedStyle(slideBackground);
						if (pageBackground && pageBackground.background) page.style.background = pageBackground.background;
						else if (presentationBackground) page.style.background = presentationBackground;
					} else if (presentationBackground) page.style.background = presentationBackground;
					const stickyContainer = document.createElement("div");
					stickyContainer.className = "scroll-page-sticky";
					page.appendChild(stickyContainer);
					contentContainer = document.createElement("div");
					contentContainer.className = "scroll-page-content";
					stickyContainer.appendChild(contentContainer);
				}
				contentContainer.appendChild(slide);
				slide.classList.remove("past", "future");
				slide.setAttribute("data-index-h", h);
				slide.setAttribute("data-index-v", v);
				if (slide.slideBackgroundElement) {
					slide.slideBackgroundElement.remove("past", "future");
					contentContainer.insertBefore(slide.slideBackgroundElement, slide);
				}
				previousSlide = slide;
			};
			horizontalSlides.forEach((horizontalSlide, h) => {
				if (this.Reveal.isVerticalStack(horizontalSlide)) horizontalSlide.querySelectorAll("section").forEach((verticalSlide, v) => {
					createPageElement(verticalSlide, h, v, true);
				});
				else createPageElement(horizontalSlide, h, 0);
			}, this);
			this.createProgressBar();
			queryAll(this.Reveal.getRevealElement(), ".stack").forEach((stack) => stack.remove());
			pageElements.forEach((page) => pageContainer.appendChild(page));
			this.Reveal.slideContent.layout(this.Reveal.getSlidesElement());
			this.Reveal.layout();
			this.Reveal.setState(stateBeforeActivation);
			this.activatedCallbacks.forEach((callback) => callback());
			this.activatedCallbacks = [];
			this.restoreScrollPosition();
			this.viewportElement.classList.remove("loading-scroll-mode");
			this.viewportElement.addEventListener("scroll", this.onScroll, { passive: true });
		}
		/**
		* Deactivates the scroll view and restores the standard slide-based
		* presentation.
		*/
		deactivate() {
			if (!this.active) return;
			const stateBeforeDeactivation = this.Reveal.getState();
			this.active = false;
			this.viewportElement.removeEventListener("scroll", this.onScroll);
			this.viewportElement.classList.remove("reveal-scroll");
			this.removeProgressBar();
			this.Reveal.getSlidesElement().innerHTML = this.slideHTMLBeforeActivation;
			this.Reveal.sync();
			this.Reveal.setState(stateBeforeDeactivation);
			this.slideHTMLBeforeActivation = null;
		}
		toggle(override) {
			if (typeof override === "boolean") override ? this.activate() : this.deactivate();
			else this.isActive() ? this.deactivate() : this.activate();
		}
		/**
		* Checks if the scroll view is currently active.
		*/
		isActive() {
			return this.active;
		}
		/**
		* Renders the progress bar component.
		*/
		createProgressBar() {
			this.progressBar = document.createElement("div");
			this.progressBar.className = "scrollbar";
			this.progressBarInner = document.createElement("div");
			this.progressBarInner.className = "scrollbar-inner";
			this.progressBar.appendChild(this.progressBarInner);
			this.progressBarPlayhead = document.createElement("div");
			this.progressBarPlayhead.className = "scrollbar-playhead";
			this.progressBarInner.appendChild(this.progressBarPlayhead);
			this.viewportElement.insertBefore(this.progressBar, this.viewportElement.firstChild);
			const handleDocumentMouseMove = (event) => {
				let progress = (event.clientY - this.progressBarInner.getBoundingClientRect().top) / this.progressBarHeight;
				progress = Math.max(Math.min(progress, 1), 0);
				this.viewportElement.scrollTop = progress * (this.viewportElement.scrollHeight - this.viewportElement.offsetHeight);
			};
			const handleDocumentMouseUp = (event) => {
				this.draggingProgressBar = false;
				this.showProgressBar();
				document.removeEventListener("mousemove", handleDocumentMouseMove);
				document.removeEventListener("mouseup", handleDocumentMouseUp);
			};
			const handleMouseDown = (event) => {
				event.preventDefault();
				this.draggingProgressBar = true;
				document.addEventListener("mousemove", handleDocumentMouseMove);
				document.addEventListener("mouseup", handleDocumentMouseUp);
				handleDocumentMouseMove(event);
			};
			this.progressBarInner.addEventListener("mousedown", handleMouseDown);
		}
		removeProgressBar() {
			if (this.progressBar) {
				this.progressBar.remove();
				this.progressBar = null;
			}
		}
		layout() {
			if (this.isActive()) {
				this.syncPages();
				this.syncScrollPosition();
			}
		}
		/**
		* Updates our pages to match the latest configuration and
		* presentation size.
		*/
		syncPages() {
			const config = this.Reveal.getConfig();
			const slideSize = this.Reveal.getComputedSlideSize(window.innerWidth, window.innerHeight);
			const scale = this.Reveal.getScale();
			const useCompactLayout = config.scrollLayout === "compact";
			const viewportHeight = this.viewportElement.offsetHeight;
			const compactHeight = slideSize.height * scale;
			const pageHeight = useCompactLayout ? compactHeight : viewportHeight;
			this.scrollTriggerHeight = useCompactLayout ? compactHeight : viewportHeight;
			this.viewportElement.style.setProperty("--page-height", pageHeight + "px");
			this.viewportElement.style.scrollSnapType = typeof config.scrollSnap === "string" ? `y ${config.scrollSnap}` : "";
			this.slideTriggers = [];
			this.pages = Array.from(this.Reveal.getRevealElement().querySelectorAll(".scroll-page")).map((pageElement) => {
				const page = this.createPage({
					pageElement,
					slideElement: pageElement.querySelector("section"),
					stickyElement: pageElement.querySelector(".scroll-page-sticky"),
					contentElement: pageElement.querySelector(".scroll-page-content"),
					backgroundElement: pageElement.querySelector(".slide-background"),
					autoAnimateElements: pageElement.querySelectorAll(".scroll-auto-animate-page"),
					autoAnimatePages: []
				});
				page.pageElement.style.setProperty("--slide-height", config.center === true ? "auto" : slideSize.height + "px");
				this.slideTriggers.push({
					page,
					activate: () => this.activatePage(page),
					deactivate: () => this.deactivatePage(page)
				});
				this.createFragmentTriggersForPage(page);
				if (page.autoAnimateElements.length > 0) this.createAutoAnimateTriggersForPage(page);
				let totalScrollTriggerCount = Math.max(page.scrollTriggers.length - 1, 0);
				totalScrollTriggerCount += page.autoAnimatePages.reduce((total, page) => {
					return total + Math.max(page.scrollTriggers.length - 1, 0);
				}, page.autoAnimatePages.length);
				page.pageElement.querySelectorAll(".scroll-snap-point").forEach((el) => el.remove());
				for (let i = 0; i < totalScrollTriggerCount + 1; i++) {
					const triggerStick = document.createElement("div");
					triggerStick.className = "scroll-snap-point";
					triggerStick.style.height = this.scrollTriggerHeight + "px";
					triggerStick.style.scrollSnapAlign = useCompactLayout ? "center" : "start";
					page.pageElement.appendChild(triggerStick);
					if (i === 0) triggerStick.style.marginTop = -this.scrollTriggerHeight + "px";
				}
				if (useCompactLayout && page.scrollTriggers.length > 0) {
					page.pageHeight = viewportHeight;
					page.pageElement.style.setProperty("--page-height", viewportHeight + "px");
				} else {
					page.pageHeight = pageHeight;
					page.pageElement.style.removeProperty("--page-height");
				}
				page.scrollPadding = this.scrollTriggerHeight * totalScrollTriggerCount;
				page.totalHeight = page.pageHeight + page.scrollPadding;
				page.pageElement.style.setProperty("--page-scroll-padding", page.scrollPadding + "px");
				if (totalScrollTriggerCount > 0) {
					page.stickyElement.style.position = "sticky";
					page.stickyElement.style.top = Math.max((viewportHeight - page.pageHeight) / 2, 0) + "px";
				} else {
					page.stickyElement.style.position = "relative";
					page.pageElement.style.scrollSnapAlign = page.pageHeight < viewportHeight ? "center" : "start";
				}
				return page;
			});
			this.setTriggerRanges();
			this.viewportElement.setAttribute("data-scrollbar", config.scrollProgress);
			if (config.scrollProgress && this.totalScrollTriggerCount > 1) {
				if (!this.progressBar) this.createProgressBar();
				this.syncProgressBar();
			} else this.removeProgressBar();
		}
		/**
		* Calculates and sets the scroll range for all of our scroll
		* triggers.
		*/
		setTriggerRanges() {
			this.totalScrollTriggerCount = this.slideTriggers.reduce((total, trigger) => {
				return total + Math.max(trigger.page.scrollTriggers.length, 1);
			}, 0);
			let rangeStart = 0;
			this.slideTriggers.forEach((trigger, i) => {
				trigger.range = [rangeStart, rangeStart + Math.max(trigger.page.scrollTriggers.length, 1) / this.totalScrollTriggerCount];
				const scrollTriggerSegmentSize = (trigger.range[1] - trigger.range[0]) / trigger.page.scrollTriggers.length;
				trigger.page.scrollTriggers.forEach((scrollTrigger, i) => {
					scrollTrigger.range = [rangeStart + i * scrollTriggerSegmentSize, rangeStart + (i + 1) * scrollTriggerSegmentSize];
				});
				rangeStart = trigger.range[1];
			});
			this.slideTriggers[this.slideTriggers.length - 1].range[1] = 1;
		}
		/**
		* Creates one scroll trigger for each fragments in the given page.
		*
		* @param {*} page
		*/
		createFragmentTriggersForPage(page, slideElement) {
			slideElement = slideElement || page.slideElement;
			const fragmentGroups = this.Reveal.fragments.sort(slideElement.querySelectorAll(".fragment"), true);
			if (fragmentGroups.length) {
				page.fragments = this.Reveal.fragments.sort(slideElement.querySelectorAll(".fragment:not(.disabled)"));
				page.scrollTriggers.push({ activate: () => {
					this.Reveal.fragments.update(-1, page.fragments, slideElement);
				} });
				fragmentGroups.forEach((fragments, i) => {
					page.scrollTriggers.push({ activate: () => {
						this.Reveal.fragments.update(i, page.fragments, slideElement);
					} });
				});
			}
			return page.scrollTriggers.length;
		}
		/**
		* Creates scroll triggers for the auto-animate steps in the
		* given page.
		*
		* @param {*} page
		*/
		createAutoAnimateTriggersForPage(page) {
			if (page.autoAnimateElements.length > 0) this.slideTriggers.push(...Array.from(page.autoAnimateElements).map((autoAnimateElement, i) => {
				let autoAnimatePage = this.createPage({
					slideElement: autoAnimateElement.querySelector("section"),
					contentElement: autoAnimateElement,
					backgroundElement: autoAnimateElement.querySelector(".slide-background")
				});
				this.createFragmentTriggersForPage(autoAnimatePage, autoAnimatePage.slideElement);
				page.autoAnimatePages.push(autoAnimatePage);
				return {
					page: autoAnimatePage,
					activate: () => this.activatePage(autoAnimatePage),
					deactivate: () => this.deactivatePage(autoAnimatePage)
				};
			}));
		}
		/**
		* Helper method for creating a page definition and adding
		* required fields. A "page" is a slide or auto-animate step.
		*/
		createPage(page) {
			page.scrollTriggers = [];
			page.indexh = parseInt(page.slideElement.getAttribute("data-index-h"), 10);
			page.indexv = parseInt(page.slideElement.getAttribute("data-index-v"), 10);
			return page;
		}
		/**
		* Rerenders progress bar segments so that they match the current
		* reveal.js config and size.
		*/
		syncProgressBar() {
			this.progressBarInner.querySelectorAll(".scrollbar-slide").forEach((slide) => slide.remove());
			const scrollHeight = this.viewportElement.scrollHeight;
			const viewportHeight = this.viewportElement.offsetHeight;
			const viewportHeightFactor = viewportHeight / scrollHeight;
			this.progressBarHeight = this.progressBarInner.offsetHeight;
			this.playheadHeight = Math.max(viewportHeightFactor * this.progressBarHeight, MIN_PLAYHEAD_HEIGHT);
			this.progressBarScrollableHeight = this.progressBarHeight - this.playheadHeight;
			const progressSegmentHeight = viewportHeight / scrollHeight * this.progressBarHeight;
			const spacing = Math.min(progressSegmentHeight / 8, MAX_PROGRESS_SPACING);
			this.progressBarPlayhead.style.height = this.playheadHeight - spacing + "px";
			if (progressSegmentHeight > MIN_PROGRESS_SEGMENT_HEIGHT) this.slideTriggers.forEach((slideTrigger) => {
				const { page } = slideTrigger;
				page.progressBarSlide = document.createElement("div");
				page.progressBarSlide.className = "scrollbar-slide";
				page.progressBarSlide.style.top = slideTrigger.range[0] * this.progressBarHeight + "px";
				page.progressBarSlide.style.height = (slideTrigger.range[1] - slideTrigger.range[0]) * this.progressBarHeight - spacing + "px";
				page.progressBarSlide.classList.toggle("has-triggers", page.scrollTriggers.length > 0);
				this.progressBarInner.appendChild(page.progressBarSlide);
				page.scrollTriggerElements = page.scrollTriggers.map((trigger, i) => {
					const triggerElement = document.createElement("div");
					triggerElement.className = "scrollbar-trigger";
					triggerElement.style.top = (trigger.range[0] - slideTrigger.range[0]) * this.progressBarHeight + "px";
					triggerElement.style.height = (trigger.range[1] - trigger.range[0]) * this.progressBarHeight - spacing + "px";
					page.progressBarSlide.appendChild(triggerElement);
					if (i === 0) triggerElement.style.display = "none";
					return triggerElement;
				});
			});
			else this.pages.forEach((page) => page.progressBarSlide = null);
		}
		/**
		* Reads the current scroll position and updates our active
		* trigger states accordingly.
		*/
		syncScrollPosition() {
			const viewportHeight = this.viewportElement.offsetHeight;
			const viewportHeightFactor = viewportHeight / this.viewportElement.scrollHeight;
			const scrollTop = this.viewportElement.scrollTop;
			const scrollHeight = this.viewportElement.scrollHeight - viewportHeight;
			const scrollProgress = Math.max(Math.min(scrollTop / scrollHeight, 1), 0);
			const scrollProgressMid = Math.max(Math.min((scrollTop + viewportHeight / 2) / this.viewportElement.scrollHeight, 1), 0);
			let activePage;
			this.slideTriggers.forEach((trigger) => {
				const { page } = trigger;
				if (scrollProgress >= trigger.range[0] - viewportHeightFactor * 2 && scrollProgress <= trigger.range[1] + viewportHeightFactor * 2 && !page.loaded) {
					page.loaded = true;
					this.Reveal.slideContent.load(page.slideElement);
				} else if (page.loaded) {
					page.loaded = false;
					this.Reveal.slideContent.unload(page.slideElement);
				}
				if (scrollProgress >= trigger.range[0] && scrollProgress <= trigger.range[1]) {
					this.activateTrigger(trigger);
					activePage = trigger.page;
				} else if (trigger.active) this.deactivateTrigger(trigger);
			});
			if (activePage) activePage.scrollTriggers.forEach((trigger) => {
				if (scrollProgressMid >= trigger.range[0] && scrollProgressMid <= trigger.range[1]) this.activateTrigger(trigger);
				else if (trigger.active) this.deactivateTrigger(trigger);
			});
			this.setProgressBarValue(scrollTop / (this.viewportElement.scrollHeight - viewportHeight));
		}
		/**
		* Moves the progress bar playhead to the specified position.
		*
		* @param {number} progress 0-1
		*/
		setProgressBarValue(progress) {
			if (this.progressBar) {
				this.progressBarPlayhead.style.transform = `translateY(${progress * this.progressBarScrollableHeight}px)`;
				this.getAllPages().filter((page) => page.progressBarSlide).forEach((page) => {
					page.progressBarSlide.classList.toggle("active", page.active === true);
					page.scrollTriggers.forEach((trigger, i) => {
						page.scrollTriggerElements[i].classList.toggle("active", page.active === true && trigger.active === true);
					});
				});
				this.showProgressBar();
			}
		}
		/**
		* Show the progress bar and, if configured, automatically hide
		* it after a delay.
		*/
		showProgressBar() {
			this.progressBar.classList.add("visible");
			clearTimeout(this.hideProgressBarTimeout);
			if (this.Reveal.getConfig().scrollProgress === "auto" && !this.draggingProgressBar) this.hideProgressBarTimeout = setTimeout(() => {
				if (this.progressBar) this.progressBar.classList.remove("visible");
			}, HIDE_SCROLLBAR_TIMEOUT);
		}
		/**
		* Scroll to the previous page.
		*/
		prev() {
			this.viewportElement.scrollTop -= this.scrollTriggerHeight;
		}
		/**
		* Scroll to the next page.
		*/
		next() {
			this.viewportElement.scrollTop += this.scrollTriggerHeight;
		}
		/**
		* Scrolls the given slide element into view.
		*
		* @param {HTMLElement} slideElement
		*/
		scrollToSlide(slideElement) {
			if (!this.active) this.activatedCallbacks.push(() => this.scrollToSlide(slideElement));
			else {
				const trigger = this.getScrollTriggerBySlide(slideElement);
				if (trigger) this.viewportElement.scrollTop = trigger.range[0] * (this.viewportElement.scrollHeight - this.viewportElement.offsetHeight);
			}
		}
		/**
		* Persists the current scroll position to session storage
		* so that it can be restored.
		*/
		storeScrollPosition() {
			clearTimeout(this.storeScrollPositionTimeout);
			this.storeScrollPositionTimeout = setTimeout(() => {
				sessionStorage.setItem("reveal-scroll-top", this.viewportElement.scrollTop);
				sessionStorage.setItem("reveal-scroll-origin", location.origin + location.pathname);
				this.storeScrollPositionTimeout = null;
			}, 50);
		}
		/**
		* Restores the scroll position when a deck is reloader.
		*/
		restoreScrollPosition() {
			const scrollPosition = sessionStorage.getItem("reveal-scroll-top");
			const scrollOrigin = sessionStorage.getItem("reveal-scroll-origin");
			if (scrollPosition && scrollOrigin === location.origin + location.pathname) this.viewportElement.scrollTop = parseInt(scrollPosition, 10);
		}
		/**
		* Activates the given page and starts its embedded content
		* if there is any.
		*
		* @param {object} page
		*/
		activatePage(page) {
			if (!page.active) {
				page.active = true;
				const { slideElement, backgroundElement, contentElement, indexh, indexv } = page;
				contentElement.style.display = "block";
				slideElement.classList.add("present");
				if (backgroundElement) backgroundElement.classList.add("present");
				this.Reveal.setCurrentScrollPage(slideElement, indexh, indexv);
				this.Reveal.backgrounds.bubbleSlideContrastClassToElement(slideElement, this.viewportElement);
				Array.from(contentElement.parentNode.querySelectorAll(".scroll-page-content")).forEach((sibling) => {
					if (sibling !== contentElement) sibling.style.display = "none";
				});
			}
		}
		/**
		* Deactivates the page after it has been visible.
		*
		* @param {object} page
		*/
		deactivatePage(page) {
			if (page.active) {
				page.active = false;
				if (page.slideElement) page.slideElement.classList.remove("present");
				if (page.backgroundElement) page.backgroundElement.classList.remove("present");
			}
		}
		activateTrigger(trigger) {
			if (!trigger.active) {
				trigger.active = true;
				trigger.activate();
			}
		}
		deactivateTrigger(trigger) {
			if (trigger.active) {
				trigger.active = false;
				if (trigger.deactivate) trigger.deactivate();
			}
		}
		/**
		* Retrieve a slide by its original h/v index (i.e. the indices the
		* slide had before being linearized).
		*
		* @param {number} h
		* @param {number} v
		* @returns {HTMLElement}
		*/
		getSlideByIndices(h, v) {
			const page = this.getAllPages().find((page) => {
				return page.indexh === h && page.indexv === v;
			});
			return page ? page.slideElement : null;
		}
		/**
		* Retrieve a list of all scroll triggers for the given slide
		* DOM element.
		*
		* @param {HTMLElement} slide
		* @returns {Array}
		*/
		getScrollTriggerBySlide(slide) {
			return this.slideTriggers.find((trigger) => trigger.page.slideElement === slide);
		}
		/**
		* Get a list of all pages in the scroll view. This includes
		* both top-level slides and auto-animate steps.
		*
		* @returns {Array}
		*/
		getAllPages() {
			return this.pages.flatMap((page) => [page, ...page.autoAnimatePages || []]);
		}
		onScroll() {
			this.syncScrollPosition();
			this.storeScrollPosition();
		}
		get viewportElement() {
			return this.Reveal.getViewportElement();
		}
	};
	//#endregion
	//#region \0@oxc-project+runtime@0.124.0/helpers/asyncToGenerator.js
	function asyncGeneratorStep(n, t, e, r, o, a, c) {
		try {
			var i = n[a](c), u = i.value;
		} catch (n) {
			e(n);
			return;
		}
		i.done ? t(u) : Promise.resolve(u).then(r, o);
	}
	function _asyncToGenerator(n) {
		return function() {
			var t = this, e = arguments;
			return new Promise(function(r, o) {
				var a = n.apply(t, e);
				function _next(n) {
					asyncGeneratorStep(a, r, o, _next, _throw, "next", n);
				}
				function _throw(n) {
					asyncGeneratorStep(a, r, o, _next, _throw, "throw", n);
				}
				_next(void 0);
			});
		};
	}
	//#endregion
	//#region js/controllers/printview.js
	/**
	* Setups up our presentation for printing/exporting to PDF.
	*/
	var PrintView = class {
		constructor(Reveal) {
			this.Reveal = Reveal;
		}
		/**
		* Configures the presentation for printing to a static
		* PDF.
		*/
		activate() {
			var _this = this;
			return _asyncToGenerator(function* () {
				const config = _this.Reveal.getConfig();
				const slides = queryAll(_this.Reveal.getRevealElement(), SLIDES_SELECTOR);
				const injectPageNumbers = config.slideNumber && /all|print/i.test(config.showSlideNumber);
				const slideSize = _this.Reveal.getComputedSlideSize(window.innerWidth, window.innerHeight);
				const pageWidth = Math.floor(slideSize.width * (1 + config.margin)), pageHeight = Math.floor(slideSize.height * (1 + config.margin));
				const slideWidth = slideSize.width, slideHeight = slideSize.height;
				yield new Promise(requestAnimationFrame);
				createStyleSheet("@page{size:" + pageWidth + "px " + pageHeight + "px; margin: 0px;}");
				createStyleSheet(".reveal section>img, .reveal section>video, .reveal section>iframe{max-width: " + slideWidth + "px; max-height:" + slideHeight + "px}");
				document.documentElement.classList.add("reveal-print", "print-pdf");
				document.body.style.width = pageWidth + "px";
				document.body.style.height = pageHeight + "px";
				const viewportElement = _this.Reveal.getViewportElement();
				let presentationBackground;
				if (viewportElement) {
					const viewportStyles = window.getComputedStyle(viewportElement);
					if (viewportStyles && viewportStyles.background) presentationBackground = viewportStyles.background;
				}
				yield new Promise(requestAnimationFrame);
				_this.Reveal.layoutSlideContents(slideWidth, slideHeight);
				yield new Promise(requestAnimationFrame);
				const slideScrollHeights = slides.map((slide) => slide.scrollHeight);
				const pages = [];
				const pageContainer = slides[0].parentNode;
				let slideNumber = 1;
				slides.forEach(function(slide, index) {
					if (slide.classList.contains("stack") === false) {
						let left = (pageWidth - slideWidth) / 2;
						let top = (pageHeight - slideHeight) / 2;
						const contentHeight = slideScrollHeights[index];
						let numberOfPages = Math.max(Math.ceil(contentHeight / pageHeight), 1);
						numberOfPages = Math.min(numberOfPages, config.pdfMaxPagesPerSlide);
						if (numberOfPages === 1 && config.center || slide.classList.contains("center")) top = Math.max((pageHeight - contentHeight) / 2, 0);
						const page = document.createElement("div");
						pages.push(page);
						page.className = "pdf-page";
						page.style.height = (pageHeight + config.pdfPageHeightOffset) * numberOfPages + "px";
						if (presentationBackground) page.style.background = presentationBackground;
						page.appendChild(slide);
						slide.style.left = left + "px";
						slide.style.top = top + "px";
						slide.style.width = slideWidth + "px";
						this.Reveal.slideContent.layout(slide);
						if (slide.slideBackgroundElement) page.insertBefore(slide.slideBackgroundElement, slide);
						if (config.showNotes) {
							const notes = this.Reveal.getSlideNotes(slide);
							if (notes) {
								const notesSpacing = 8;
								const notesLayout = typeof config.showNotes === "string" ? config.showNotes : "inline";
								const notesElement = document.createElement("div");
								notesElement.classList.add("speaker-notes");
								notesElement.classList.add("speaker-notes-pdf");
								notesElement.setAttribute("data-layout", notesLayout);
								notesElement.innerHTML = notes;
								if (notesLayout === "separate-page") pages.push(notesElement);
								else {
									notesElement.style.left = notesSpacing + "px";
									notesElement.style.bottom = notesSpacing + "px";
									notesElement.style.width = pageWidth - notesSpacing * 2 + "px";
									page.appendChild(notesElement);
								}
							}
						}
						if (injectPageNumbers) {
							const numberElement = document.createElement("div");
							numberElement.classList.add("slide-number");
							numberElement.classList.add("slide-number-pdf");
							numberElement.innerHTML = slideNumber++;
							page.appendChild(numberElement);
						}
						if (config.pdfSeparateFragments) {
							const fragmentGroups = this.Reveal.fragments.sort(page.querySelectorAll(".fragment"), true);
							let previousFragmentStep;
							fragmentGroups.forEach(function(fragments, index) {
								if (previousFragmentStep) previousFragmentStep.forEach(function(fragment) {
									fragment.classList.remove("current-fragment");
								});
								fragments.forEach(function(fragment) {
									fragment.classList.add("visible", "current-fragment");
								}, this);
								const clonedPage = page.cloneNode(true);
								if (injectPageNumbers) {
									const numberElement = clonedPage.querySelector(".slide-number-pdf");
									const fragmentNumber = index + 1;
									numberElement.innerHTML += "." + fragmentNumber;
								}
								pages.push(clonedPage);
								previousFragmentStep = fragments;
							}, this);
							fragmentGroups.forEach(function(fragments) {
								fragments.forEach(function(fragment) {
									fragment.classList.remove("visible", "current-fragment");
								});
							});
						} else queryAll(page, ".fragment:not(.fade-out)").forEach(function(fragment) {
							fragment.classList.add("visible");
						});
					}
				}, _this);
				yield new Promise(requestAnimationFrame);
				pages.forEach((page) => pageContainer.appendChild(page));
				_this.Reveal.slideContent.layout(_this.Reveal.getSlidesElement());
				_this.Reveal.dispatchEvent({ type: "pdf-ready" });
				viewportElement.classList.remove("loading-scroll-mode");
			})();
		}
		/**
		* Checks if the print mode is/should be activated.
		*/
		isActive() {
			return this.Reveal.getConfig().view === "print";
		}
	};
	//#endregion
	//#region js/controllers/fragments.js
	/**
	* Handles sorting and navigation of slide fragments.
	* Fragments are elements within a slide that are
	* revealed/animated incrementally.
	*/
	var Fragments = class {
		constructor(Reveal) {
			this.Reveal = Reveal;
		}
		/**
		* Called when the reveal.js config is updated.
		*/
		configure(config, oldConfig) {
			if (config.fragments === false) this.disable();
			else if (oldConfig.fragments === false) this.enable();
		}
		/**
		* If fragments are disabled in the deck, they should all be
		* visible rather than stepped through.
		*/
		disable() {
			queryAll(this.Reveal.getSlidesElement(), ".fragment").forEach((element) => {
				element.classList.add("visible");
				element.classList.remove("current-fragment");
			});
		}
		/**
		* Reverse of #disable(). Only called if fragments have
		* previously been disabled.
		*/
		enable() {
			queryAll(this.Reveal.getSlidesElement(), ".fragment").forEach((element) => {
				element.classList.remove("visible");
				element.classList.remove("current-fragment");
			});
		}
		/**
		* Returns an object describing the available fragment
		* directions.
		*
		* @return {{prev: boolean, next: boolean}}
		*/
		availableRoutes() {
			let currentSlide = this.Reveal.getCurrentSlide();
			if (currentSlide && this.Reveal.getConfig().fragments) {
				let fragments = currentSlide.querySelectorAll(".fragment:not(.disabled)");
				let hiddenFragments = currentSlide.querySelectorAll(".fragment:not(.disabled):not(.visible)");
				return {
					prev: fragments.length - hiddenFragments.length > 0,
					next: !!hiddenFragments.length
				};
			} else return {
				prev: false,
				next: false
			};
		}
		/**
		* Return a sorted fragments list, ordered by an increasing
		* "data-fragment-index" attribute.
		*
		* Fragments will be revealed in the order that they are returned by
		* this function, so you can use the index attributes to control the
		* order of fragment appearance.
		*
		* To maintain a sensible default fragment order, fragments are presumed
		* to be passed in document order. This function adds a "fragment-index"
		* attribute to each node if such an attribute is not already present,
		* and sets that attribute to an integer value which is the position of
		* the fragment within the fragments list.
		*
		* @param {object[]|*} fragments
		* @param {boolean} grouped If true the returned array will contain
		* nested arrays for all fragments with the same index
		* @return {object[]} sorted Sorted array of fragments
		*/
		sort(fragments, grouped = false) {
			fragments = Array.from(fragments);
			let ordered = [], unordered = [], sorted = [];
			fragments.forEach((fragment) => {
				if (fragment.hasAttribute("data-fragment-index")) {
					let index = parseInt(fragment.getAttribute("data-fragment-index"), 10);
					if (!ordered[index]) ordered[index] = [];
					ordered[index].push(fragment);
				} else unordered.push([fragment]);
			});
			ordered = ordered.concat(unordered);
			let index = 0;
			ordered.forEach((group) => {
				group.forEach((fragment) => {
					sorted.push(fragment);
					fragment.setAttribute("data-fragment-index", index);
				});
				index++;
			});
			return grouped === true ? ordered : sorted;
		}
		/**
		* Sorts and formats all of fragments in the
		* presentation.
		*/
		sortAll() {
			this.Reveal.getHorizontalSlides().forEach((horizontalSlide) => {
				let verticalSlides = queryAll(horizontalSlide, "section");
				verticalSlides.forEach((verticalSlide, y) => {
					this.sort(verticalSlide.querySelectorAll(".fragment"));
				}, this);
				if (verticalSlides.length === 0) this.sort(horizontalSlide.querySelectorAll(".fragment"));
			});
		}
		/**
		* Refreshes the fragments on the current slide so that they
		* have the appropriate classes (.visible + .current-fragment).
		*
		* @param {number} [index] The index of the current fragment
		* @param {array} [fragments] Array containing all fragments
		* in the current slide
		*
		* @return {{shown: array, hidden: array}}
		*/
		update(index, fragments, slide = this.Reveal.getCurrentSlide()) {
			let changedFragments = {
				shown: [],
				hidden: []
			};
			if (slide && this.Reveal.getConfig().fragments) {
				fragments = fragments || this.sort(slide.querySelectorAll(".fragment"));
				if (fragments.length) {
					let maxIndex = 0;
					if (typeof index !== "number") {
						let currentFragment = this.sort(slide.querySelectorAll(".fragment.visible")).pop();
						if (currentFragment) index = parseInt(currentFragment.getAttribute("data-fragment-index") || 0, 10);
					}
					Array.from(fragments).forEach((el, i) => {
						if (el.hasAttribute("data-fragment-index")) i = parseInt(el.getAttribute("data-fragment-index"), 10);
						maxIndex = Math.max(maxIndex, i);
						if (i <= index) {
							let wasVisible = el.classList.contains("visible");
							el.classList.add("visible");
							el.classList.remove("current-fragment");
							if (i === index) {
								this.Reveal.announceStatus(this.Reveal.getStatusText(el));
								el.classList.add("current-fragment");
								this.Reveal.slideContent.startEmbeddedContent(el);
							}
							if (!wasVisible) {
								changedFragments.shown.push(el);
								this.Reveal.dispatchEvent({
									target: el,
									type: "visible",
									bubbles: false
								});
							}
						} else {
							let wasVisible = el.classList.contains("visible");
							el.classList.remove("visible");
							el.classList.remove("current-fragment");
							if (wasVisible) {
								this.Reveal.slideContent.stopEmbeddedContent(el);
								changedFragments.hidden.push(el);
								this.Reveal.dispatchEvent({
									target: el,
									type: "hidden",
									bubbles: false
								});
							}
						}
					});
					index = typeof index === "number" ? index : -1;
					index = Math.max(Math.min(index, maxIndex), -1);
					slide.setAttribute("data-fragment", index);
				}
			}
			if (changedFragments.hidden.length) this.Reveal.dispatchEvent({
				type: "fragmenthidden",
				data: {
					fragment: changedFragments.hidden[0],
					fragments: changedFragments.hidden
				}
			});
			if (changedFragments.shown.length) this.Reveal.dispatchEvent({
				type: "fragmentshown",
				data: {
					fragment: changedFragments.shown[0],
					fragments: changedFragments.shown
				}
			});
			return changedFragments;
		}
		/**
		* Formats the fragments on the given slide so that they have
		* valid indices. Call this if fragments are changed in the DOM
		* after reveal.js has already initialized.
		*
		* @param {HTMLElement} slide
		* @return {Array} a list of the HTML fragments that were synced
		*/
		sync(slide = this.Reveal.getCurrentSlide()) {
			return this.sort(slide.querySelectorAll(".fragment"));
		}
		/**
		* Navigate to the specified slide fragment.
		*
		* @param {?number} index The index of the fragment that
		* should be shown, -1 means all are invisible
		* @param {number} offset Integer offset to apply to the
		* fragment index
		*
		* @return {boolean} true if a change was made in any
		* fragments visibility as part of this call
		*/
		goto(index, offset = 0) {
			let currentSlide = this.Reveal.getCurrentSlide();
			if (currentSlide && this.Reveal.getConfig().fragments) {
				let fragments = this.sort(currentSlide.querySelectorAll(".fragment:not(.disabled)"));
				if (fragments.length) {
					if (typeof index !== "number") {
						let lastVisibleFragment = this.sort(currentSlide.querySelectorAll(".fragment:not(.disabled).visible")).pop();
						if (lastVisibleFragment) index = parseInt(lastVisibleFragment.getAttribute("data-fragment-index") || 0, 10);
						else index = -1;
					}
					index += offset;
					let changedFragments = this.update(index, fragments);
					this.Reveal.controls.update();
					this.Reveal.progress.update();
					if (this.Reveal.getConfig().fragmentInURL) this.Reveal.location.writeURL();
					return !!(changedFragments.shown.length || changedFragments.hidden.length);
				}
			}
			return false;
		}
		/**
		* Navigate to the next slide fragment.
		*
		* @return {boolean} true if there was a next fragment,
		* false otherwise
		*/
		next() {
			return this.goto(null, 1);
		}
		/**
		* Navigate to the previous slide fragment.
		*
		* @return {boolean} true if there was a previous fragment,
		* false otherwise
		*/
		prev() {
			return this.goto(null, -1);
		}
	};
	//#endregion
	//#region js/controllers/overview.js
	/**
	* Handles all logic related to the overview mode
	* (birds-eye view of all slides).
	*/
	var Overview = class {
		constructor(Reveal) {
			this.Reveal = Reveal;
			this.active = false;
			this.onSlideClicked = this.onSlideClicked.bind(this);
		}
		/**
		* Displays the overview of slides (quick nav) by scaling
		* down and arranging all slide elements.
		*/
		activate() {
			if (this.Reveal.getConfig().overview && !this.Reveal.isScrollView() && !this.isActive()) {
				this.active = true;
				this.Reveal.getRevealElement().classList.add("overview");
				this.Reveal.cancelAutoSlide();
				this.Reveal.getSlidesElement().appendChild(this.Reveal.getBackgroundsElement());
				queryAll(this.Reveal.getRevealElement(), SLIDES_SELECTOR).forEach((slide) => {
					if (!slide.classList.contains("stack")) slide.addEventListener("click", this.onSlideClicked, true);
				});
				const margin = 70;
				const slideSize = this.Reveal.getComputedSlideSize();
				this.overviewSlideWidth = slideSize.width + margin;
				this.overviewSlideHeight = slideSize.height + margin;
				if (this.Reveal.getConfig().rtl) this.overviewSlideWidth = -this.overviewSlideWidth;
				this.Reveal.updateSlidesVisibility();
				this.layout();
				this.update();
				this.Reveal.layout();
				const indices = this.Reveal.getIndices();
				this.Reveal.dispatchEvent({
					type: "overviewshown",
					data: {
						"indexh": indices.h,
						"indexv": indices.v,
						"currentSlide": this.Reveal.getCurrentSlide()
					}
				});
			}
		}
		/**
		* Uses CSS transforms to position all slides in a grid for
		* display inside of the overview mode.
		*/
		layout() {
			this.Reveal.getHorizontalSlides().forEach((hslide, h) => {
				hslide.setAttribute("data-index-h", h);
				transformElement(hslide, "translate3d(" + h * this.overviewSlideWidth + "px, 0, 0)");
				if (hslide.classList.contains("stack")) queryAll(hslide, "section").forEach((vslide, v) => {
					vslide.setAttribute("data-index-h", h);
					vslide.setAttribute("data-index-v", v);
					transformElement(vslide, "translate3d(0, " + v * this.overviewSlideHeight + "px, 0)");
				});
			});
			Array.from(this.Reveal.getBackgroundsElement().childNodes).forEach((hbackground, h) => {
				transformElement(hbackground, "translate3d(" + h * this.overviewSlideWidth + "px, 0, 0)");
				queryAll(hbackground, ".slide-background").forEach((vbackground, v) => {
					transformElement(vbackground, "translate3d(0, " + v * this.overviewSlideHeight + "px, 0)");
				});
			});
		}
		/**
		* Moves the overview viewport to the current slides.
		* Called each time the current slide changes.
		*/
		update() {
			const vmin = Math.min(window.innerWidth, window.innerHeight);
			const scale = Math.max(vmin / 5, 150) / vmin;
			const indices = this.Reveal.getIndices();
			this.Reveal.transformSlides({ overview: [
				"scale(" + scale + ")",
				"translateX(" + -indices.h * this.overviewSlideWidth + "px)",
				"translateY(" + -indices.v * this.overviewSlideHeight + "px)"
			].join(" ") });
		}
		/**
		* Exits the slide overview and enters the currently
		* active slide.
		*/
		deactivate() {
			if (this.Reveal.getConfig().overview) {
				this.active = false;
				this.Reveal.getRevealElement().classList.remove("overview");
				this.Reveal.getRevealElement().classList.add("overview-deactivating");
				setTimeout(() => {
					this.Reveal.getRevealElement().classList.remove("overview-deactivating");
				}, 1);
				this.Reveal.getRevealElement().appendChild(this.Reveal.getBackgroundsElement());
				queryAll(this.Reveal.getRevealElement(), SLIDES_SELECTOR).forEach((slide) => {
					transformElement(slide, "");
					slide.removeEventListener("click", this.onSlideClicked, true);
				});
				queryAll(this.Reveal.getBackgroundsElement(), ".slide-background").forEach((background) => {
					transformElement(background, "");
				});
				this.Reveal.transformSlides({ overview: "" });
				const indices = this.Reveal.getIndices();
				this.Reveal.slide(indices.h, indices.v);
				this.Reveal.layout();
				this.Reveal.cueAutoSlide();
				this.Reveal.dispatchEvent({
					type: "overviewhidden",
					data: {
						"indexh": indices.h,
						"indexv": indices.v,
						"currentSlide": this.Reveal.getCurrentSlide()
					}
				});
			}
		}
		/**
		* Toggles the slide overview mode on and off.
		*
		* @param {Boolean} [override] Flag which overrides the
		* toggle logic and forcibly sets the desired state. True means
		* overview is open, false means it's closed.
		*/
		toggle(override) {
			if (typeof override === "boolean") override ? this.activate() : this.deactivate();
			else this.isActive() ? this.deactivate() : this.activate();
		}
		/**
		* Checks if the overview is currently active.
		*
		* @return {Boolean} true if the overview is active,
		* false otherwise
		*/
		isActive() {
			return this.active;
		}
		/**
		* Invoked when a slide is and we're in the overview.
		*
		* @param {object} event
		*/
		onSlideClicked(event) {
			if (this.isActive()) {
				event.preventDefault();
				let element = event.target;
				while (element && !element.nodeName.match(/section/gi)) element = element.parentNode;
				if (element && !element.classList.contains("disabled")) {
					this.deactivate();
					if (element.nodeName.match(/section/gi)) {
						let h = parseInt(element.getAttribute("data-index-h"), 10), v = parseInt(element.getAttribute("data-index-v"), 10);
						this.Reveal.slide(h, v);
					}
				}
			}
		}
	};
	//#endregion
	//#region js/controllers/keyboard.js
	/**
	* Handles all reveal.js keyboard interactions.
	*/
	var Keyboard = class {
		constructor(Reveal) {
			this.Reveal = Reveal;
			this.shortcuts = {};
			this.bindings = {};
			this.onDocumentKeyDown = this.onDocumentKeyDown.bind(this);
		}
		/**
		* Called when the reveal.js config is updated.
		*/
		configure(config, oldConfig) {
			if (config.navigationMode === "linear") {
				this.shortcuts["&#8594;  ,  &#8595;  ,  SPACE  ,  N  ,  L  ,  J"] = "Next slide";
				this.shortcuts["&#8592;  ,  &#8593;  ,  P  ,  H  ,  K"] = "Previous slide";
			} else {
				this.shortcuts["N  ,  SPACE"] = "Next slide";
				this.shortcuts["P  ,  Shift SPACE"] = "Previous slide";
				this.shortcuts["&#8592;  ,  H"] = "Navigate left";
				this.shortcuts["&#8594;  ,  L"] = "Navigate right";
				this.shortcuts["&#8593;  ,  K"] = "Navigate up";
				this.shortcuts["&#8595;  ,  J"] = "Navigate down";
			}
			this.shortcuts["Alt + &#8592;/&#8593/&#8594;/&#8595;"] = "Navigate without fragments";
			this.shortcuts["Shift + &#8592;/&#8593/&#8594;/&#8595;"] = "Jump to first/last slide";
			this.shortcuts["B  ,  ."] = "Pause";
			this.shortcuts["F"] = "Fullscreen";
			this.shortcuts["G"] = "Jump to slide";
			this.shortcuts["ESC, O"] = "Slide overview";
		}
		/**
		* Starts listening for keyboard events.
		*/
		bind() {
			document.addEventListener("keydown", this.onDocumentKeyDown, false);
		}
		/**
		* Stops listening for keyboard events.
		*/
		unbind() {
			document.removeEventListener("keydown", this.onDocumentKeyDown, false);
		}
		/**
		* Add a custom key binding with optional description to
		* be added to the help screen.
		*/
		addKeyBinding(binding, callback) {
			if (typeof binding === "object" && binding.keyCode) this.bindings[binding.keyCode] = {
				callback,
				key: binding.key,
				description: binding.description
			};
			else this.bindings[binding] = {
				callback,
				key: null,
				description: null
			};
		}
		/**
		* Removes the specified custom key binding.
		*/
		removeKeyBinding(keyCode) {
			delete this.bindings[keyCode];
		}
		/**
		* Programmatically triggers a keyboard event
		*
		* @param {int} keyCode
		*/
		triggerKey(keyCode) {
			this.onDocumentKeyDown({ keyCode });
		}
		/**
		* Registers a new shortcut to include in the help overlay
		*
		* @param {String} key
		* @param {String} value
		*/
		registerKeyboardShortcut(key, value) {
			this.shortcuts[key] = value;
		}
		getShortcuts() {
			return this.shortcuts;
		}
		getBindings() {
			return this.bindings;
		}
		/**
		* Handler for the document level 'keydown' event.
		*
		* @param {object} event
		*/
		onDocumentKeyDown(event) {
			let config = this.Reveal.getConfig();
			if (typeof config.keyboardCondition === "function" && config.keyboardCondition(event) === false) return true;
			if (config.keyboardCondition === "focused" && !this.Reveal.isFocused()) return true;
			let keyCode = event.keyCode;
			let autoSlideWasPaused = !this.Reveal.isAutoSliding();
			this.Reveal.onUserInput(event);
			let activeElementIsCE = document.activeElement && document.activeElement.isContentEditable === true;
			let activeElementIsInput = document.activeElement && document.activeElement.tagName && /input|textarea/i.test(document.activeElement.tagName);
			let activeElementIsNotes = document.activeElement && document.activeElement.className && /speaker-notes/i.test(document.activeElement.className);
			let unusedModifier = !([
				32,
				37,
				38,
				39,
				40,
				63,
				78,
				80,
				191
			].indexOf(event.keyCode) !== -1 && event.shiftKey || event.altKey) && (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey);
			if (activeElementIsCE || activeElementIsInput || activeElementIsNotes || unusedModifier) return;
			let resumeKeyCodes = [
				66,
				86,
				190,
				191,
				112
			];
			let key;
			if (typeof config.keyboard === "object") {
				for (key in config.keyboard) if (config.keyboard[key] === "togglePause") resumeKeyCodes.push(parseInt(key, 10));
			}
			if (this.Reveal.isOverlayOpen() && ![
				"Escape",
				"f",
				"c",
				"b",
				"."
			].includes(event.key)) return false;
			if (this.Reveal.isPaused() && resumeKeyCodes.indexOf(keyCode) === -1) return false;
			let useLinearMode = config.navigationMode === "linear" || !this.Reveal.hasHorizontalSlides() || !this.Reveal.hasVerticalSlides();
			let triggered = false;
			if (typeof config.keyboard === "object") {
				for (key in config.keyboard) if (parseInt(key, 10) === keyCode) {
					let value = config.keyboard[key];
					if (typeof value === "function") value.apply(null, [event]);
					else if (typeof value === "string" && typeof this.Reveal[value] === "function") this.Reveal[value].call();
					triggered = true;
				}
			}
			if (triggered === false) {
				for (key in this.bindings) if (parseInt(key, 10) === keyCode) {
					let action = this.bindings[key].callback;
					if (typeof action === "function") action.apply(null, [event]);
					else if (typeof action === "string" && typeof this.Reveal[action] === "function") this.Reveal[action].call();
					triggered = true;
				}
			}
			if (triggered === false) {
				triggered = true;
				if (keyCode === 80 || keyCode === 33) this.Reveal.prev({ skipFragments: event.altKey });
				else if (keyCode === 78 || keyCode === 34) this.Reveal.next({ skipFragments: event.altKey });
				else if (keyCode === 72 || keyCode === 37) if (event.shiftKey) this.Reveal.slide(0);
				else if (!this.Reveal.overview.isActive() && useLinearMode) if (config.rtl) this.Reveal.next({ skipFragments: event.altKey });
				else this.Reveal.prev({ skipFragments: event.altKey });
				else this.Reveal.left({ skipFragments: event.altKey });
				else if (keyCode === 76 || keyCode === 39) if (event.shiftKey) this.Reveal.slide(this.Reveal.getHorizontalSlides().length - 1);
				else if (!this.Reveal.overview.isActive() && useLinearMode) if (config.rtl) this.Reveal.prev({ skipFragments: event.altKey });
				else this.Reveal.next({ skipFragments: event.altKey });
				else this.Reveal.right({ skipFragments: event.altKey });
				else if (keyCode === 75 || keyCode === 38) if (event.shiftKey) this.Reveal.slide(void 0, 0);
				else if (!this.Reveal.overview.isActive() && useLinearMode) this.Reveal.prev({ skipFragments: event.altKey });
				else this.Reveal.up({ skipFragments: event.altKey });
				else if (keyCode === 74 || keyCode === 40) if (event.shiftKey) this.Reveal.slide(void 0, Number.MAX_VALUE);
				else if (!this.Reveal.overview.isActive() && useLinearMode) this.Reveal.next({ skipFragments: event.altKey });
				else this.Reveal.down({ skipFragments: event.altKey });
				else if (keyCode === 36) this.Reveal.slide(0);
				else if (keyCode === 35) this.Reveal.slide(this.Reveal.getHorizontalSlides().length - 1);
				else if (keyCode === 32) {
					if (this.Reveal.overview.isActive()) this.Reveal.overview.deactivate();
					if (event.shiftKey) this.Reveal.prev({ skipFragments: event.altKey });
					else this.Reveal.next({ skipFragments: event.altKey });
				} else if ([
					58,
					59,
					66,
					86,
					190
				].includes(keyCode) || keyCode === 191 && !event.shiftKey) this.Reveal.togglePause();
				else if (keyCode === 70) enterFullscreen(config.embedded ? this.Reveal.getViewportElement() : document.documentElement);
				else if (keyCode === 65) {
					if (config.autoSlideStoppable) this.Reveal.toggleAutoSlide(autoSlideWasPaused);
				} else if (keyCode === 71) {
					if (config.jumpToSlide) this.Reveal.toggleJumpToSlide();
				} else if (keyCode === 67 && this.Reveal.isOverlayOpen()) this.Reveal.closeOverlay();
				else if ((keyCode === 63 || keyCode === 191) && event.shiftKey) this.Reveal.toggleHelp();
				else if (keyCode === 112) this.Reveal.toggleHelp();
				else triggered = false;
			}
			if (triggered) event.preventDefault && event.preventDefault();
			else if (keyCode === 27 || keyCode === 79) {
				if (this.Reveal.closeOverlay() === false) this.Reveal.overview.toggle();
				event.preventDefault && event.preventDefault();
			} else if (keyCode === 13 && this.Reveal.overview.isActive()) {
				this.Reveal.overview.deactivate();
				event.preventDefault && event.preventDefault();
			}
			this.Reveal.cueAutoSlide();
		}
	};
	//#endregion
	//#region \0@oxc-project+runtime@0.124.0/helpers/objectSpread2.js
	function ownKeys(e, r) {
		var t = Object.keys(e);
		if (Object.getOwnPropertySymbols) {
			var o = Object.getOwnPropertySymbols(e);
			r && (o = o.filter(function(r) {
				return Object.getOwnPropertyDescriptor(e, r).enumerable;
			})), t.push.apply(t, o);
		}
		return t;
	}
	function _objectSpread2(e) {
		for (var r = 1; r < arguments.length; r++) {
			var t = null != arguments[r] ? arguments[r] : {};
			r % 2 ? ownKeys(Object(t), !0).forEach(function(r) {
				_defineProperty(e, r, t[r]);
			}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r) {
				Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r));
			});
		}
		return e;
	}
	//#endregion
	//#region js/controllers/location.js
	/**
	* Reads and writes the URL based on reveal.js' current state.
	*/
	var Location = class {
		constructor(Reveal) {
			_defineProperty(this, "MAX_REPLACE_STATE_FREQUENCY", 1e3);
			this.Reveal = Reveal;
			this.writeURLTimeout = 0;
			this.replaceStateTimestamp = 0;
			this.onWindowHashChange = this.onWindowHashChange.bind(this);
		}
		bind() {
			window.addEventListener("hashchange", this.onWindowHashChange, false);
		}
		unbind() {
			window.removeEventListener("hashchange", this.onWindowHashChange, false);
		}
		/**
		* Returns the slide indices for the given hash link.
		*
		* @param {string} [hash] the hash string that we want to
		* find the indices for
		*
		* @returns slide indices or null
		*/
		getIndicesFromHash(hash = window.location.hash, options = {}) {
			let name = hash.replace(/^#\/?/, "");
			let bits = name.split("/");
			if (!/^[0-9]*$/.test(bits[0]) && name.length) {
				let slide;
				let f;
				if (/\/[-\d]+$/g.test(name)) {
					f = parseInt(name.split("/").pop(), 10);
					f = isNaN(f) ? void 0 : f;
					name = name.split("/").shift();
				}
				try {
					const decodedName = decodeURIComponent(name);
					slide = (document.getElementById(decodedName) || document.querySelector(`[data-id="${decodedName}"]`)).closest(".slides section");
				} catch (error) {}
				if (slide) return _objectSpread2(_objectSpread2({}, this.Reveal.getIndices(slide)), {}, { f });
			} else {
				const config = this.Reveal.getConfig();
				let hashIndexBase = config.hashOneBasedIndex || options.oneBasedIndex ? 1 : 0;
				let h = parseInt(bits[0], 10) - hashIndexBase || 0, v = parseInt(bits[1], 10) - hashIndexBase || 0, f;
				if (config.fragmentInURL) {
					f = parseInt(bits[2], 10);
					if (isNaN(f)) f = void 0;
				}
				return {
					h,
					v,
					f
				};
			}
			return null;
		}
		/**
		* Reads the current URL (hash) and navigates accordingly.
		*/
		readURL() {
			const currentIndices = this.Reveal.getIndices();
			const newIndices = this.getIndicesFromHash();
			if (newIndices) {
				if (newIndices.h !== currentIndices.h || newIndices.v !== currentIndices.v || newIndices.f !== void 0) this.Reveal.slide(newIndices.h, newIndices.v, newIndices.f);
			} else this.Reveal.slide(currentIndices.h || 0, currentIndices.v || 0);
		}
		/**
		* Updates the page URL (hash) to reflect the current
		* state.
		*
		* @param {number} delay The time in ms to wait before
		* writing the hash
		*/
		writeURL(delay) {
			let config = this.Reveal.getConfig();
			let currentSlide = this.Reveal.getCurrentSlide();
			clearTimeout(this.writeURLTimeout);
			if (typeof delay === "number") this.writeURLTimeout = setTimeout(this.writeURL, delay);
			else if (currentSlide) {
				let hash = this.getHash();
				if (config.history) window.location.hash = hash;
				else if (config.hash) if (hash === "/") this.debouncedReplaceState(window.location.pathname + window.location.search);
				else this.debouncedReplaceState("#" + hash);
			}
		}
		replaceState(url) {
			window.history.replaceState(null, null, url);
			this.replaceStateTimestamp = Date.now();
		}
		debouncedReplaceState(url) {
			clearTimeout(this.replaceStateTimeout);
			if (Date.now() - this.replaceStateTimestamp > this.MAX_REPLACE_STATE_FREQUENCY) this.replaceState(url);
			else this.replaceStateTimeout = setTimeout(() => this.replaceState(url), this.MAX_REPLACE_STATE_FREQUENCY);
		}
		/**
		* Return a hash URL that will resolve to the given slide location.
		*
		* @param {HTMLElement} [slide=currentSlide] The slide to link to
		*/
		getHash(slide) {
			let url = "/";
			let s = slide || this.Reveal.getCurrentSlide();
			let id = s ? s.getAttribute("id") : null;
			if (id) id = encodeURIComponent(id);
			let index = this.Reveal.getIndices(slide);
			if (!this.Reveal.getConfig().fragmentInURL) index.f = void 0;
			if (typeof id === "string" && id.length) {
				url = "/" + id;
				if (index.f >= 0) url += "/" + index.f;
			} else {
				let hashIndexBase = this.Reveal.getConfig().hashOneBasedIndex ? 1 : 0;
				if (index.h > 0 || index.v > 0 || index.f >= 0) url += index.h + hashIndexBase;
				if (index.v > 0 || index.f >= 0) url += "/" + (index.v + hashIndexBase);
				if (index.f >= 0) url += "/" + index.f;
			}
			return url;
		}
		/**
		* Handler for the window level 'hashchange' event.
		*
		* @param {object} [event]
		*/
		onWindowHashChange(event) {
			this.readURL();
		}
	};
	//#endregion
	//#region js/controllers/controls.js
	/**
	* Manages our presentation controls. This includes both
	* the built-in control arrows as well as event monitoring
	* of any elements within the presentation with either of the
	* following helper classes:
	* - .navigate-up
	* - .navigate-right
	* - .navigate-down
	* - .navigate-left
	* - .navigate-next
	* - .navigate-prev
	* - .enter-fullscreen
	*/
	var Controls = class {
		constructor(Reveal) {
			this.Reveal = Reveal;
			this.onNavigateLeftClicked = this.onNavigateLeftClicked.bind(this);
			this.onNavigateRightClicked = this.onNavigateRightClicked.bind(this);
			this.onNavigateUpClicked = this.onNavigateUpClicked.bind(this);
			this.onNavigateDownClicked = this.onNavigateDownClicked.bind(this);
			this.onNavigatePrevClicked = this.onNavigatePrevClicked.bind(this);
			this.onNavigateNextClicked = this.onNavigateNextClicked.bind(this);
			this.onEnterFullscreen = this.onEnterFullscreen.bind(this);
		}
		render() {
			const rtl = this.Reveal.getConfig().rtl;
			const revealElement = this.Reveal.getRevealElement();
			this.element = document.createElement("aside");
			this.element.className = "controls";
			this.element.innerHTML = `<button class="navigate-left" aria-label="${rtl ? "next slide" : "previous slide"}"><div class="controls-arrow"></div></button>
			<button class="navigate-right" aria-label="${rtl ? "previous slide" : "next slide"}"><div class="controls-arrow"></div></button>
			<button class="navigate-up" aria-label="above slide"><div class="controls-arrow"></div></button>
			<button class="navigate-down" aria-label="below slide"><div class="controls-arrow"></div></button>`;
			this.Reveal.getRevealElement().appendChild(this.element);
			this.controlsLeft = queryAll(revealElement, ".navigate-left");
			this.controlsRight = queryAll(revealElement, ".navigate-right");
			this.controlsUp = queryAll(revealElement, ".navigate-up");
			this.controlsDown = queryAll(revealElement, ".navigate-down");
			this.controlsPrev = queryAll(revealElement, ".navigate-prev");
			this.controlsNext = queryAll(revealElement, ".navigate-next");
			this.controlsFullscreen = queryAll(revealElement, ".enter-fullscreen");
			this.controlsRightArrow = this.element.querySelector(".navigate-right");
			this.controlsLeftArrow = this.element.querySelector(".navigate-left");
			this.controlsDownArrow = this.element.querySelector(".navigate-down");
		}
		/**
		* Called when the reveal.js config is updated.
		*/
		configure(config, oldConfig) {
			const speakerOnly = config.controls === "speaker" || config.controls === "speaker-only";
			this.element.style.display = config.controls && (!speakerOnly || this.Reveal.isSpeakerNotes()) ? "block" : "none";
			this.element.setAttribute("data-controls-layout", config.controlsLayout);
			this.element.setAttribute("data-controls-back-arrows", config.controlsBackArrows);
		}
		bind() {
			let pointerEvents = ["touchstart", "click"];
			if (isAndroid) pointerEvents = ["touchend"];
			pointerEvents.forEach((eventName) => {
				this.controlsLeft.forEach((el) => el.addEventListener(eventName, this.onNavigateLeftClicked, false));
				this.controlsRight.forEach((el) => el.addEventListener(eventName, this.onNavigateRightClicked, false));
				this.controlsUp.forEach((el) => el.addEventListener(eventName, this.onNavigateUpClicked, false));
				this.controlsDown.forEach((el) => el.addEventListener(eventName, this.onNavigateDownClicked, false));
				this.controlsPrev.forEach((el) => el.addEventListener(eventName, this.onNavigatePrevClicked, false));
				this.controlsNext.forEach((el) => el.addEventListener(eventName, this.onNavigateNextClicked, false));
				this.controlsFullscreen.forEach((el) => el.addEventListener(eventName, this.onEnterFullscreen, false));
			});
		}
		unbind() {
			[
				"touchstart",
				"touchend",
				"click"
			].forEach((eventName) => {
				this.controlsLeft.forEach((el) => el.removeEventListener(eventName, this.onNavigateLeftClicked, false));
				this.controlsRight.forEach((el) => el.removeEventListener(eventName, this.onNavigateRightClicked, false));
				this.controlsUp.forEach((el) => el.removeEventListener(eventName, this.onNavigateUpClicked, false));
				this.controlsDown.forEach((el) => el.removeEventListener(eventName, this.onNavigateDownClicked, false));
				this.controlsPrev.forEach((el) => el.removeEventListener(eventName, this.onNavigatePrevClicked, false));
				this.controlsNext.forEach((el) => el.removeEventListener(eventName, this.onNavigateNextClicked, false));
				this.controlsFullscreen.forEach((el) => el.removeEventListener(eventName, this.onEnterFullscreen, false));
			});
		}
		/**
		* Updates the state of all control/navigation arrows.
		*/
		update() {
			let routes = this.Reveal.availableRoutes();
			[
				...this.controlsLeft,
				...this.controlsRight,
				...this.controlsUp,
				...this.controlsDown,
				...this.controlsPrev,
				...this.controlsNext
			].forEach((node) => {
				node.classList.remove("enabled", "fragmented");
				node.setAttribute("disabled", "disabled");
			});
			if (routes.left) this.controlsLeft.forEach((el) => {
				el.classList.add("enabled");
				el.removeAttribute("disabled");
			});
			if (routes.right) this.controlsRight.forEach((el) => {
				el.classList.add("enabled");
				el.removeAttribute("disabled");
			});
			if (routes.up) this.controlsUp.forEach((el) => {
				el.classList.add("enabled");
				el.removeAttribute("disabled");
			});
			if (routes.down) this.controlsDown.forEach((el) => {
				el.classList.add("enabled");
				el.removeAttribute("disabled");
			});
			if (routes.left || routes.up) this.controlsPrev.forEach((el) => {
				el.classList.add("enabled");
				el.removeAttribute("disabled");
			});
			if (routes.right || routes.down) this.controlsNext.forEach((el) => {
				el.classList.add("enabled");
				el.removeAttribute("disabled");
			});
			let currentSlide = this.Reveal.getCurrentSlide();
			if (currentSlide) {
				let fragmentsRoutes = this.Reveal.fragments.availableRoutes();
				if (fragmentsRoutes.prev) this.controlsPrev.forEach((el) => {
					el.classList.add("fragmented", "enabled");
					el.removeAttribute("disabled");
				});
				if (fragmentsRoutes.next) this.controlsNext.forEach((el) => {
					el.classList.add("fragmented", "enabled");
					el.removeAttribute("disabled");
				});
				const isVerticalStack = this.Reveal.isVerticalSlide(currentSlide);
				const hasVerticalSiblings = isVerticalStack && currentSlide.parentElement && currentSlide.parentElement.querySelectorAll(":scope > section").length > 1;
				if (isVerticalStack && hasVerticalSiblings) {
					if (fragmentsRoutes.prev) this.controlsUp.forEach((el) => {
						el.classList.add("fragmented", "enabled");
						el.removeAttribute("disabled");
					});
					if (fragmentsRoutes.next) this.controlsDown.forEach((el) => {
						el.classList.add("fragmented", "enabled");
						el.removeAttribute("disabled");
					});
				} else {
					if (fragmentsRoutes.prev) this.controlsLeft.forEach((el) => {
						el.classList.add("fragmented", "enabled");
						el.removeAttribute("disabled");
					});
					if (fragmentsRoutes.next) this.controlsRight.forEach((el) => {
						el.classList.add("fragmented", "enabled");
						el.removeAttribute("disabled");
					});
				}
			}
			if (this.Reveal.getConfig().controlsTutorial) {
				let indices = this.Reveal.getIndices();
				if (!this.Reveal.hasNavigatedVertically() && routes.down) this.controlsDownArrow.classList.add("highlight");
				else {
					this.controlsDownArrow.classList.remove("highlight");
					if (this.Reveal.getConfig().rtl) if (!this.Reveal.hasNavigatedHorizontally() && routes.left && indices.v === 0) this.controlsLeftArrow.classList.add("highlight");
					else this.controlsLeftArrow.classList.remove("highlight");
					else if (!this.Reveal.hasNavigatedHorizontally() && routes.right && indices.v === 0) this.controlsRightArrow.classList.add("highlight");
					else this.controlsRightArrow.classList.remove("highlight");
				}
			}
		}
		destroy() {
			this.unbind();
			this.element.remove();
		}
		/**
		* Event handlers for navigation control buttons.
		*/
		onNavigateLeftClicked(event) {
			event.preventDefault();
			this.Reveal.onUserInput();
			if (this.Reveal.getConfig().navigationMode === "linear") this.Reveal.prev();
			else this.Reveal.left();
		}
		onNavigateRightClicked(event) {
			event.preventDefault();
			this.Reveal.onUserInput();
			if (this.Reveal.getConfig().navigationMode === "linear") this.Reveal.next();
			else this.Reveal.right();
		}
		onNavigateUpClicked(event) {
			event.preventDefault();
			this.Reveal.onUserInput();
			this.Reveal.up();
		}
		onNavigateDownClicked(event) {
			event.preventDefault();
			this.Reveal.onUserInput();
			this.Reveal.down();
		}
		onNavigatePrevClicked(event) {
			event.preventDefault();
			this.Reveal.onUserInput();
			this.Reveal.prev();
		}
		onNavigateNextClicked(event) {
			event.preventDefault();
			this.Reveal.onUserInput();
			this.Reveal.next();
		}
		onEnterFullscreen(event) {
			const config = this.Reveal.getConfig();
			const viewport = this.Reveal.getViewportElement();
			enterFullscreen(config.embedded ? viewport : viewport.parentElement);
		}
	};
	//#endregion
	//#region js/controllers/progress.js
	/**
	* Creates a visual progress bar for the presentation.
	*/
	var Progress = class {
		constructor(Reveal) {
			this.Reveal = Reveal;
			this.onProgressClicked = this.onProgressClicked.bind(this);
		}
		render() {
			this.element = document.createElement("div");
			this.element.className = "progress";
			this.Reveal.getRevealElement().appendChild(this.element);
			this.bar = document.createElement("span");
			this.element.appendChild(this.bar);
		}
		/**
		* Called when the reveal.js config is updated.
		*/
		configure(config, oldConfig) {
			this.element.style.display = config.progress ? "block" : "none";
		}
		bind() {
			if (this.Reveal.getConfig().progress && this.element) this.element.addEventListener("click", this.onProgressClicked, false);
		}
		unbind() {
			if (this.Reveal.getConfig().progress && this.element) this.element.removeEventListener("click", this.onProgressClicked, false);
		}
		/**
		* Updates the progress bar to reflect the current slide.
		*/
		update() {
			if (this.Reveal.getConfig().progress && this.bar) {
				let scale = this.Reveal.getProgress();
				if (this.Reveal.getTotalSlides() < 2) scale = 0;
				this.bar.style.transform = "scaleX(" + scale + ")";
			}
		}
		getMaxWidth() {
			return this.Reveal.getRevealElement().offsetWidth;
		}
		/**
		* Clicking on the progress bar results in a navigation to the
		* closest approximate horizontal slide using this equation:
		*
		* ( clickX / presentationWidth ) * numberOfSlides
		*
		* @param {object} event
		*/
		onProgressClicked(event) {
			this.Reveal.onUserInput(event);
			event.preventDefault();
			let slides = this.Reveal.getSlides();
			let slidesTotal = slides.length;
			let slideIndex = Math.floor(event.clientX / this.getMaxWidth() * slidesTotal);
			if (this.Reveal.getConfig().rtl) slideIndex = slidesTotal - slideIndex;
			let targetIndices = this.Reveal.getIndices(slides[slideIndex]);
			this.Reveal.slide(targetIndices.h, targetIndices.v);
		}
		destroy() {
			this.element.remove();
		}
	};
	//#endregion
	//#region js/controllers/pointer.js
	/**
	* Handles hiding of the pointer/cursor when inactive.
	*/
	var Pointer = class {
		constructor(Reveal) {
			this.Reveal = Reveal;
			this.lastMouseWheelStep = 0;
			this.cursorHidden = false;
			this.cursorInactiveTimeout = 0;
			this.onDocumentCursorActive = this.onDocumentCursorActive.bind(this);
			this.onDocumentMouseScroll = this.onDocumentMouseScroll.bind(this);
		}
		/**
		* Called when the reveal.js config is updated.
		*/
		configure(config, oldConfig) {
			if (config.mouseWheel) document.addEventListener("wheel", this.onDocumentMouseScroll, false);
			else document.removeEventListener("wheel", this.onDocumentMouseScroll, false);
			if (config.hideInactiveCursor) {
				document.addEventListener("mousemove", this.onDocumentCursorActive, false);
				document.addEventListener("mousedown", this.onDocumentCursorActive, false);
			} else {
				this.showCursor();
				document.removeEventListener("mousemove", this.onDocumentCursorActive, false);
				document.removeEventListener("mousedown", this.onDocumentCursorActive, false);
			}
		}
		/**
		* Shows the mouse pointer after it has been hidden with
		* #hideCursor.
		*/
		showCursor() {
			if (this.cursorHidden) {
				this.cursorHidden = false;
				this.Reveal.getRevealElement().style.cursor = "";
			}
		}
		/**
		* Hides the mouse pointer when it's on top of the .reveal
		* container.
		*/
		hideCursor() {
			if (this.cursorHidden === false) {
				this.cursorHidden = true;
				this.Reveal.getRevealElement().style.cursor = "none";
			}
		}
		destroy() {
			this.showCursor();
			document.removeEventListener("wheel", this.onDocumentMouseScroll, false);
			document.removeEventListener("mousemove", this.onDocumentCursorActive, false);
			document.removeEventListener("mousedown", this.onDocumentCursorActive, false);
		}
		/**
		* Called whenever there is mouse input at the document level
		* to determine if the cursor is active or not.
		*
		* @param {object} event
		*/
		onDocumentCursorActive(event) {
			this.showCursor();
			clearTimeout(this.cursorInactiveTimeout);
			this.cursorInactiveTimeout = setTimeout(this.hideCursor.bind(this), this.Reveal.getConfig().hideCursorTime);
		}
		/**
		* Handles mouse wheel scrolling, throttled to avoid skipping
		* multiple slides.
		*
		* @param {object} event
		*/
		onDocumentMouseScroll(event) {
			if (Date.now() - this.lastMouseWheelStep > 1e3) {
				this.lastMouseWheelStep = Date.now();
				let delta = event.detail || -event.wheelDelta;
				if (delta > 0) this.Reveal.next();
				else if (delta < 0) this.Reveal.prev();
			}
		}
	};
	//#endregion
	//#region js/utils/loader.ts
	/**
	* Loads a JavaScript file from the given URL and executes it.
	*
	* @param {string} url Address of the .js file to load
	* @param {function} callback Method to invoke when the script
	* has loaded and executed
	*/
	var loadScript = (url, callback) => {
		const script = document.createElement("script");
		script.type = "text/javascript";
		script.async = false;
		script.defer = false;
		script.src = url;
		if (typeof callback === "function") {
			script.onload = (event) => {
				if (event.type === "load") {
					script.onload = script.onerror = null;
					callback();
				}
			};
			script.onerror = (err) => {
				script.onload = script.onerror = null;
				callback(/* @__PURE__ */ new Error("Failed loading script: " + script.src + "\n" + err));
			};
		}
		const head = document.querySelector("head");
		if (head) head.insertBefore(script, head.lastChild);
	};
	//#endregion
	//#region js/controllers/plugins.js
	/**
	* Manages loading and registering of reveal.js plugins.
	*/
	var Plugins = class {
		constructor(reveal) {
			this.Reveal = reveal;
			this.state = "idle";
			this.registeredPlugins = {};
			this.asyncDependencies = [];
		}
		/**
		* Loads reveal.js dependencies, registers and
		* initializes plugins.
		*
		* Plugins are direct references to a reveal.js plugin
		* object that we register and initialize after any
		* synchronous dependencies have loaded.
		*
		* Dependencies are defined via the 'dependencies' config
		* option and will be loaded prior to starting reveal.js.
		* Some dependencies may have an 'async' flag, if so they
		* will load after reveal.js has been started up.
		*/
		load(plugins, dependencies) {
			this.state = "loading";
			plugins.forEach(this.registerPlugin.bind(this));
			return new Promise((resolve) => {
				let scripts = [], scriptsToLoad = 0;
				dependencies.forEach((s) => {
					if (!s.condition || s.condition()) if (s.async) this.asyncDependencies.push(s);
					else scripts.push(s);
				});
				if (scripts.length) {
					scriptsToLoad = scripts.length;
					const scriptLoadedCallback = (s) => {
						if (s && typeof s.callback === "function") s.callback();
						if (--scriptsToLoad === 0) this.initPlugins().then(resolve);
					};
					scripts.forEach((s) => {
						if (typeof s.id === "string") {
							this.registerPlugin(s);
							scriptLoadedCallback(s);
						} else if (typeof s.src === "string") loadScript(s.src, () => scriptLoadedCallback(s));
						else {
							console.warn("Unrecognized plugin format", s);
							scriptLoadedCallback();
						}
					});
				} else this.initPlugins().then(resolve);
			});
		}
		/**
		* Initializes our plugins and waits for them to be ready
		* before proceeding.
		*/
		initPlugins() {
			return new Promise((resolve) => {
				let pluginValues = Object.values(this.registeredPlugins);
				let pluginsToInitialize = pluginValues.length;
				if (pluginsToInitialize === 0) this.loadAsync().then(resolve);
				else {
					let initNextPlugin;
					let afterPlugInitialized = () => {
						if (--pluginsToInitialize === 0) this.loadAsync().then(resolve);
						else initNextPlugin();
					};
					let i = 0;
					initNextPlugin = () => {
						let plugin = pluginValues[i++];
						if (typeof plugin.init === "function") {
							let promise = plugin.init(this.Reveal);
							if (promise && typeof promise.then === "function") promise.then(afterPlugInitialized);
							else afterPlugInitialized();
						} else afterPlugInitialized();
					};
					initNextPlugin();
				}
			});
		}
		/**
		* Loads all async reveal.js dependencies.
		*/
		loadAsync() {
			this.state = "loaded";
			if (this.asyncDependencies.length) this.asyncDependencies.forEach((s) => {
				loadScript(s.src, s.callback);
			});
			return Promise.resolve();
		}
		/**
		* Registers a new plugin with this reveal.js instance.
		*
		* reveal.js waits for all registered plugins to initialize
		* before considering itself ready, as long as the plugin
		* is registered before calling `Reveal.initialize()`.
		*/
		registerPlugin(plugin) {
			if (arguments.length === 2 && typeof arguments[0] === "string") {
				plugin = arguments[1];
				plugin.id = arguments[0];
			} else if (typeof plugin === "function") plugin = plugin();
			let id = plugin.id;
			if (typeof id !== "string") console.warn("Unrecognized plugin format; can't find plugin.id", plugin);
			else if (this.registeredPlugins[id] === void 0) {
				this.registeredPlugins[id] = plugin;
				if (this.state === "loaded" && typeof plugin.init === "function") plugin.init(this.Reveal);
			} else console.warn("reveal.js: \"" + id + "\" plugin has already been registered");
		}
		/**
		* Checks if a specific plugin has been registered.
		*
		* @param {String} id Unique plugin identifier
		*/
		hasPlugin(id) {
			return !!this.registeredPlugins[id];
		}
		/**
		* Returns the specific plugin instance, if a plugin
		* with the given ID has been registered.
		*
		* @param {String} id Unique plugin identifier
		*/
		getPlugin(id) {
			return this.registeredPlugins[id];
		}
		getRegisteredPlugins() {
			return this.registeredPlugins;
		}
		destroy() {
			Object.values(this.registeredPlugins).forEach((plugin) => {
				if (typeof plugin.destroy === "function") plugin.destroy();
			});
			this.registeredPlugins = {};
			this.asyncDependencies = [];
		}
	};
	//#endregion
	//#region js/controllers/overlay.js
	/**
	* Handles the display of reveal.js' overlay elements used
	* to preview iframes, images & videos.
	*/
	var Overlay = class {
		constructor(Reveal) {
			this.Reveal = Reveal;
			this.onSlidesClicked = this.onSlidesClicked.bind(this);
			this.iframeTriggerSelector = null;
			this.mediaTriggerSelector = "[data-preview-image], [data-preview-video]";
			this.stateProps = [
				"previewIframe",
				"previewImage",
				"previewVideo",
				"previewFit"
			];
			this.state = {};
		}
		update() {
			if (this.Reveal.getConfig().previewLinks) this.iframeTriggerSelector = "a[href]:not([data-preview-link=false]), [data-preview-link]:not(a):not([data-preview-link=false])";
			else this.iframeTriggerSelector = "[data-preview-link]:not([data-preview-link=false])";
			const hasLinkPreviews = this.Reveal.getSlidesElement().querySelectorAll(this.iframeTriggerSelector).length > 0;
			const hasMediaPreviews = this.Reveal.getSlidesElement().querySelectorAll(this.mediaTriggerSelector).length > 0;
			if (hasLinkPreviews || hasMediaPreviews) this.Reveal.getSlidesElement().addEventListener("click", this.onSlidesClicked, false);
			else this.Reveal.getSlidesElement().removeEventListener("click", this.onSlidesClicked, false);
		}
		createOverlay(className) {
			this.dom = document.createElement("div");
			this.dom.classList.add("r-overlay");
			this.dom.classList.add(className);
			this.viewport = document.createElement("div");
			this.viewport.classList.add("r-overlay-viewport");
			this.dom.appendChild(this.viewport);
			this.Reveal.getRevealElement().appendChild(this.dom);
		}
		/**
		* Opens a lightbox that previews the target URL.
		*
		* @param {string} url - url for lightbox iframe src
		*/
		previewIframe(url) {
			this.close();
			this.state = { previewIframe: url };
			this.createOverlay("r-overlay-preview");
			this.dom.dataset.state = "loading";
			this.viewport.innerHTML = `<header class="r-overlay-header">
				<a class="r-overlay-header-button r-overlay-external" href="${url}" target="_blank"><span class="icon"></span></a>
				<button class="r-overlay-header-button r-overlay-close"><span class="icon"></span></button>
			</header>
			<div class="r-overlay-spinner"></div>
			<div class="r-overlay-content">
				<iframe src="${url}"></iframe>
				<small class="r-overlay-content-inner">
					<span class="r-overlay-error x-frame-error">Unable to load iframe. This is likely due to the site's policy (x-frame-options).</span>
				</small>
			</div>`;
			this.dom.querySelector("iframe").addEventListener("load", (event) => {
				this.dom.dataset.state = "loaded";
			}, false);
			this.dom.querySelector(".r-overlay-close").addEventListener("click", (event) => {
				this.close();
				event.preventDefault();
			}, false);
			this.dom.querySelector(".r-overlay-external").addEventListener("click", (event) => {
				this.close();
			}, false);
			this.Reveal.dispatchEvent({
				type: "previewiframe",
				data: { url }
			});
		}
		/**
		* Opens a lightbox window that provides a larger view of the
		* given image/video.
		*
		* @param {string} url - url to the image/video to preview
		* @param {image|video} mediaType
		* @param {string} [fitMode] - the fit mode to use for the preview
		*/
		previewMedia(url, mediaType, fitMode) {
			if (mediaType !== "image" && mediaType !== "video") {
				console.warn("Please specify a valid media type to preview (image|video)");
				return;
			}
			this.close();
			fitMode = fitMode || "scale-down";
			this.createOverlay("r-overlay-preview");
			this.dom.dataset.state = "loading";
			this.dom.dataset.previewFit = fitMode;
			this.viewport.innerHTML = `<header class="r-overlay-header">
				<button class="r-overlay-header-button r-overlay-close">Esc <span class="icon"></span></button>
			</header>
			<div class="r-overlay-spinner"></div>
			<div class="r-overlay-content"></div>`;
			const contentElement = this.dom.querySelector(".r-overlay-content");
			if (mediaType === "image") {
				this.state = {
					previewImage: url,
					previewFit: fitMode
				};
				const img = document.createElement("img", {});
				img.src = url;
				contentElement.appendChild(img);
				img.addEventListener("load", () => {
					this.dom.dataset.state = "loaded";
				}, false);
				img.addEventListener("error", () => {
					this.dom.dataset.state = "error";
					contentElement.innerHTML = `<span class="r-overlay-error">Unable to load image.</span>`;
				}, false);
				this.dom.style.cursor = "zoom-out";
				this.dom.addEventListener("click", (event) => {
					this.close();
				}, false);
				this.Reveal.dispatchEvent({
					type: "previewimage",
					data: { url }
				});
			} else if (mediaType === "video") {
				this.state = {
					previewVideo: url,
					previewFit: fitMode
				};
				const video = document.createElement("video");
				video.autoplay = this.dom.dataset.previewAutoplay === "false" ? false : true;
				video.controls = this.dom.dataset.previewControls === "false" ? false : true;
				video.loop = this.dom.dataset.previewLoop === "true" ? true : false;
				video.muted = this.dom.dataset.previewMuted === "true" ? true : false;
				video.playsInline = true;
				video.src = url;
				contentElement.appendChild(video);
				video.addEventListener("loadeddata", () => {
					this.dom.dataset.state = "loaded";
				}, false);
				video.addEventListener("error", () => {
					this.dom.dataset.state = "error";
					contentElement.innerHTML = `<span class="r-overlay-error">Unable to load video.</span>`;
				}, false);
				this.Reveal.dispatchEvent({
					type: "previewvideo",
					data: { url }
				});
			} else throw new Error("Please specify a valid media type to preview");
			this.dom.querySelector(".r-overlay-close").addEventListener("click", (event) => {
				this.close();
				event.preventDefault();
			}, false);
		}
		previewImage(url, fitMode) {
			this.previewMedia(url, "image", fitMode);
		}
		previewVideo(url, fitMode) {
			this.previewMedia(url, "video", fitMode);
		}
		/**
		* Open or close help overlay window.
		*
		* @param {Boolean} [override] Flag which overrides the
		* toggle logic and forcibly sets the desired state. True means
		* help is open, false means it's closed.
		*/
		toggleHelp(override) {
			if (typeof override === "boolean") override ? this.showHelp() : this.close();
			else if (this.dom) this.close();
			else this.showHelp();
		}
		/**
		* Opens an overlay window with help material.
		*/
		showHelp() {
			if (this.Reveal.getConfig().help) {
				this.close();
				this.createOverlay("r-overlay-help");
				let html = "<p class=\"title\">Keyboard Shortcuts</p>";
				let shortcuts = this.Reveal.keyboard.getShortcuts(), bindings = this.Reveal.keyboard.getBindings();
				html += "<table><th>KEY</th><th>ACTION</th>";
				for (let key in shortcuts) html += `<tr><td>${key}</td><td>${shortcuts[key]}</td></tr>`;
				for (let binding in bindings) if (bindings[binding].key && bindings[binding].description) html += `<tr><td>${bindings[binding].key}</td><td>${bindings[binding].description}</td></tr>`;
				html += "</table>";
				this.viewport.innerHTML = `
				<header class="r-overlay-header">
					<button class="r-overlay-header-button r-overlay-close">Esc <span class="icon"></span></button>
				</header>
				<div class="r-overlay-content">
					<div class="r-overlay-help-content">${html}</div>
				</div>
			`;
				this.dom.querySelector(".r-overlay-close").addEventListener("click", (event) => {
					this.close();
					event.preventDefault();
				}, false);
				this.Reveal.dispatchEvent({ type: "showhelp" });
			}
		}
		isOpen() {
			return !!this.dom;
		}
		/**
		* Closes any currently open overlay.
		*/
		close() {
			if (this.dom) {
				this.dom.remove();
				this.dom = null;
				this.state = {};
				this.Reveal.dispatchEvent({ type: "closeoverlay" });
				return true;
			}
			return false;
		}
		getState() {
			return this.state;
		}
		setState(state) {
			if (this.stateProps.every((key) => this.state[key] === state[key])) return;
			if (state.previewIframe) this.previewIframe(state.previewIframe);
			else if (state.previewImage) this.previewImage(state.previewImage, state.previewFit);
			else if (state.previewVideo) this.previewVideo(state.previewVideo, state.previewFit);
			else this.close();
		}
		onSlidesClicked(event) {
			const target = event.target;
			const linkTarget = target.closest(this.iframeTriggerSelector);
			const mediaTarget = target.closest(this.mediaTriggerSelector);
			if (linkTarget) {
				if (event.metaKey || event.shiftKey || event.altKey) return;
				const dataPreviewLink = linkTarget.getAttribute("data-preview-link");
				let url = typeof dataPreviewLink === "string" && dataPreviewLink.startsWith("http") ? dataPreviewLink : linkTarget.getAttribute("href");
				if (url) {
					this.previewIframe(url);
					event.preventDefault();
				}
			} else if (mediaTarget) {
				if (mediaTarget.hasAttribute("data-preview-image")) {
					let url = mediaTarget.dataset.previewImage || mediaTarget.getAttribute("src");
					if (url) {
						this.previewImage(url, mediaTarget.dataset.previewFit);
						event.preventDefault();
					}
				} else if (mediaTarget.hasAttribute("data-preview-video")) {
					let url = mediaTarget.dataset.previewVideo || mediaTarget.getAttribute("src");
					if (!url) {
						let source = mediaTarget.querySelector("source");
						if (source) url = source.getAttribute("src");
					}
					if (url) {
						this.previewVideo(url, mediaTarget.dataset.previewFit);
						event.preventDefault();
					}
				}
			}
		}
		destroy() {
			this.close();
		}
	};
	//#endregion
	//#region js/controllers/touch.js
	var SWIPE_THRESHOLD = 40;
	/**
	* Controls all touch interactions and navigations for
	* a presentation.
	*/
	var Touch = class {
		constructor(Reveal) {
			this.Reveal = Reveal;
			this.touchStartX = 0;
			this.touchStartY = 0;
			this.touchStartCount = 0;
			this.touchCaptured = false;
			this.onPointerDown = this.onPointerDown.bind(this);
			this.onPointerMove = this.onPointerMove.bind(this);
			this.onPointerUp = this.onPointerUp.bind(this);
			this.onTouchStart = this.onTouchStart.bind(this);
			this.onTouchMove = this.onTouchMove.bind(this);
			this.onTouchEnd = this.onTouchEnd.bind(this);
		}
		/**
		*
		*/
		bind() {
			let revealElement = this.Reveal.getRevealElement();
			if ("onpointerdown" in window) {
				revealElement.addEventListener("pointerdown", this.onPointerDown, false);
				revealElement.addEventListener("pointermove", this.onPointerMove, false);
				revealElement.addEventListener("pointerup", this.onPointerUp, false);
			} else if (window.navigator.msPointerEnabled) {
				revealElement.addEventListener("MSPointerDown", this.onPointerDown, false);
				revealElement.addEventListener("MSPointerMove", this.onPointerMove, false);
				revealElement.addEventListener("MSPointerUp", this.onPointerUp, false);
			} else {
				revealElement.addEventListener("touchstart", this.onTouchStart, false);
				revealElement.addEventListener("touchmove", this.onTouchMove, false);
				revealElement.addEventListener("touchend", this.onTouchEnd, false);
			}
		}
		/**
		*
		*/
		unbind() {
			let revealElement = this.Reveal.getRevealElement();
			revealElement.removeEventListener("pointerdown", this.onPointerDown, false);
			revealElement.removeEventListener("pointermove", this.onPointerMove, false);
			revealElement.removeEventListener("pointerup", this.onPointerUp, false);
			revealElement.removeEventListener("MSPointerDown", this.onPointerDown, false);
			revealElement.removeEventListener("MSPointerMove", this.onPointerMove, false);
			revealElement.removeEventListener("MSPointerUp", this.onPointerUp, false);
			revealElement.removeEventListener("touchstart", this.onTouchStart, false);
			revealElement.removeEventListener("touchmove", this.onTouchMove, false);
			revealElement.removeEventListener("touchend", this.onTouchEnd, false);
		}
		/**
		* Checks if the target element prevents the triggering of
		* swipe navigation.
		*/
		isSwipePrevented(target) {
			if (matches(target, "video[controls], audio[controls]")) return true;
			while (target && typeof target.hasAttribute === "function") {
				if (target.hasAttribute("data-prevent-swipe")) return true;
				target = target.parentNode;
			}
			return false;
		}
		/**
		* Handler for the 'touchstart' event, enables support for
		* swipe and pinch gestures.
		*
		* @param {object} event
		*/
		onTouchStart(event) {
			this.touchCaptured = false;
			if (this.isSwipePrevented(event.target)) return true;
			this.touchStartX = event.touches[0].clientX;
			this.touchStartY = event.touches[0].clientY;
			this.touchStartCount = event.touches.length;
		}
		/**
		* Handler for the 'touchmove' event.
		*
		* @param {object} event
		*/
		onTouchMove(event) {
			if (this.isSwipePrevented(event.target)) return true;
			let config = this.Reveal.getConfig();
			if (!this.touchCaptured) {
				this.Reveal.onUserInput(event);
				let currentX = event.touches[0].clientX;
				let currentY = event.touches[0].clientY;
				if (event.touches.length === 1 && this.touchStartCount !== 2) {
					let availableRoutes = this.Reveal.availableRoutes({ includeFragments: true });
					let deltaX = currentX - this.touchStartX, deltaY = currentY - this.touchStartY;
					if (deltaX > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY)) {
						this.touchCaptured = true;
						if (config.navigationMode === "linear") if (config.rtl) this.Reveal.next();
						else this.Reveal.prev();
						else this.Reveal.left();
					} else if (deltaX < -SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY)) {
						this.touchCaptured = true;
						if (config.navigationMode === "linear") if (config.rtl) this.Reveal.prev();
						else this.Reveal.next();
						else this.Reveal.right();
					} else if (deltaY > SWIPE_THRESHOLD && availableRoutes.up) {
						this.touchCaptured = true;
						if (config.navigationMode === "linear") this.Reveal.prev();
						else this.Reveal.up();
					} else if (deltaY < -SWIPE_THRESHOLD && availableRoutes.down) {
						this.touchCaptured = true;
						if (config.navigationMode === "linear") this.Reveal.next();
						else this.Reveal.down();
					}
					if (config.embedded) {
						if (this.touchCaptured || this.Reveal.isVerticalSlide()) event.preventDefault();
					} else event.preventDefault();
				}
			} else if (isAndroid) event.preventDefault();
		}
		/**
		* Handler for the 'touchend' event.
		*
		* @param {object} event
		*/
		onTouchEnd(event) {
			if (this.touchCaptured && !this.Reveal.slideContent.isAllowedToPlayAudio()) this.Reveal.startEmbeddedContent(this.Reveal.getCurrentSlide());
			this.touchCaptured = false;
		}
		/**
		* Convert pointer down to touch start.
		*
		* @param {object} event
		*/
		onPointerDown(event) {
			if (event.pointerType === event.MSPOINTER_TYPE_TOUCH || event.pointerType === "touch") {
				event.touches = [{
					clientX: event.clientX,
					clientY: event.clientY
				}];
				this.onTouchStart(event);
			}
		}
		/**
		* Convert pointer move to touch move.
		*
		* @param {object} event
		*/
		onPointerMove(event) {
			if (event.pointerType === event.MSPOINTER_TYPE_TOUCH || event.pointerType === "touch") {
				event.touches = [{
					clientX: event.clientX,
					clientY: event.clientY
				}];
				this.onTouchMove(event);
			}
		}
		/**
		* Convert pointer up to touch end.
		*
		* @param {object} event
		*/
		onPointerUp(event) {
			if (event.pointerType === event.MSPOINTER_TYPE_TOUCH || event.pointerType === "touch") {
				event.touches = [{
					clientX: event.clientX,
					clientY: event.clientY
				}];
				this.onTouchEnd(event);
			}
		}
	};
	//#endregion
	//#region js/controllers/focus.js
	/**
	* Manages focus when a presentation is embedded. This
	* helps us only capture keyboard from the presentation
	* a user is currently interacting with in a page where
	* multiple presentations are embedded.
	*/
	var STATE_FOCUS = "focus";
	var STATE_BLUR = "blur";
	var Focus = class {
		constructor(Reveal) {
			this.Reveal = Reveal;
			this.onRevealPointerDown = this.onRevealPointerDown.bind(this);
			this.onDocumentPointerDown = this.onDocumentPointerDown.bind(this);
		}
		/**
		* Called when the reveal.js config is updated.
		*/
		configure(config, oldConfig) {
			if (config.embedded) this.blur();
			else {
				this.focus();
				this.unbind();
			}
		}
		bind() {
			if (this.Reveal.getConfig().embedded) this.Reveal.getRevealElement().addEventListener("pointerdown", this.onRevealPointerDown, false);
		}
		unbind() {
			this.Reveal.getRevealElement().removeEventListener("pointerdown", this.onRevealPointerDown, false);
			document.removeEventListener("pointerdown", this.onDocumentPointerDown, false);
		}
		focus() {
			if (this.state !== STATE_FOCUS) {
				this.Reveal.getRevealElement().classList.add("focused");
				document.addEventListener("pointerdown", this.onDocumentPointerDown, false);
			}
			this.state = STATE_FOCUS;
		}
		blur() {
			if (this.state !== STATE_BLUR) {
				this.Reveal.getRevealElement().classList.remove("focused");
				document.removeEventListener("pointerdown", this.onDocumentPointerDown, false);
			}
			this.state = STATE_BLUR;
		}
		isFocused() {
			return this.state === STATE_FOCUS;
		}
		destroy() {
			this.Reveal.getRevealElement().classList.remove("focused");
		}
		onRevealPointerDown(event) {
			this.focus();
		}
		onDocumentPointerDown(event) {
			let revealElement = closest(event.target, ".reveal");
			if (!revealElement || revealElement !== this.Reveal.getRevealElement()) this.blur();
		}
	};
	//#endregion
	//#region js/controllers/notes.js
	/**
	* Handles the showing of speaker notes
	*/
	var Notes = class {
		constructor(Reveal) {
			this.Reveal = Reveal;
		}
		render() {
			this.element = document.createElement("div");
			this.element.className = "speaker-notes";
			this.element.setAttribute("data-prevent-swipe", "");
			this.element.setAttribute("tabindex", "0");
			this.Reveal.getRevealElement().appendChild(this.element);
		}
		/**
		* Called when the reveal.js config is updated.
		*/
		configure(config, oldConfig) {
			if (config.showNotes) this.element.setAttribute("data-layout", typeof config.showNotes === "string" ? config.showNotes : "inline");
		}
		/**
		* Pick up notes from the current slide and display them
		* to the viewer.
		*
		* @see {@link config.showNotes}
		*/
		update() {
			if (this.Reveal.getConfig().showNotes && this.element && this.Reveal.getCurrentSlide() && !this.Reveal.isScrollView() && !this.Reveal.isPrintView()) this.element.innerHTML = this.getSlideNotes() || "<span class=\"notes-placeholder\">No notes on this slide.</span>";
		}
		/**
		* Updates the visibility of the speaker notes sidebar that
		* is used to share annotated slides. The notes sidebar is
		* only visible if showNotes is true and there are notes on
		* one or more slides in the deck.
		*/
		updateVisibility() {
			if (this.Reveal.getConfig().showNotes && this.hasNotes() && !this.Reveal.isScrollView() && !this.Reveal.isPrintView()) this.Reveal.getRevealElement().classList.add("show-notes");
			else this.Reveal.getRevealElement().classList.remove("show-notes");
		}
		/**
		* Checks if there are speaker notes for ANY slide in the
		* presentation.
		*/
		hasNotes() {
			return this.Reveal.getSlidesElement().querySelectorAll("[data-notes], aside.notes").length > 0;
		}
		/**
		* Checks if this presentation is running inside of the
		* speaker notes window.
		*
		* @return {boolean}
		*/
		isSpeakerNotesWindow() {
			return !!window.location.search.match(/receiver/gi);
		}
		/**
		* Retrieves the speaker notes from a slide. Notes can be
		* defined in two ways:
		* 1. As a data-notes attribute on the slide <section>
		* 2. With <aside class="notes"> elements inside the slide
		*
		* @param {HTMLElement} [slide=currentSlide]
		* @return {(string|null)}
		*/
		getSlideNotes(slide = this.Reveal.getCurrentSlide()) {
			if (slide.hasAttribute("data-notes")) return slide.getAttribute("data-notes");
			let notesElements = slide.querySelectorAll("aside.notes");
			if (notesElements) return Array.from(notesElements).map((notesElement) => notesElement.innerHTML).join("\n");
			return null;
		}
		destroy() {
			this.element.remove();
		}
	};
	//#endregion
	//#region js/components/playback.js
	/**
	* UI component that lets the use control auto-slide
	* playback via play/pause.
	*/
	var Playback = class {
		/**
		* @param {HTMLElement} container The component will append
		* itself to this
		* @param {function} progressCheck A method which will be
		* called frequently to get the current playback progress on
		* a range of 0-1
		*/
		constructor(container, progressCheck) {
			this.diameter = 100;
			this.diameter2 = this.diameter / 2;
			this.thickness = 6;
			this.playing = false;
			this.progress = 0;
			this.progressOffset = 1;
			this.container = container;
			this.progressCheck = progressCheck;
			this.canvas = document.createElement("canvas");
			this.canvas.className = "playback";
			this.canvas.width = this.diameter;
			this.canvas.height = this.diameter;
			this.canvas.style.width = this.diameter2 + "px";
			this.canvas.style.height = this.diameter2 + "px";
			this.context = this.canvas.getContext("2d");
			this.container.appendChild(this.canvas);
			this.render();
		}
		setPlaying(value) {
			const wasPlaying = this.playing;
			this.playing = value;
			if (!wasPlaying && this.playing) this.animate();
			else this.render();
		}
		animate() {
			const progressBefore = this.progress;
			this.progress = this.progressCheck();
			if (progressBefore > .8 && this.progress < .2) this.progressOffset = this.progress;
			this.render();
			if (this.playing) requestAnimationFrame(this.animate.bind(this));
		}
		/**
		* Renders the current progress and playback state.
		*/
		render() {
			let progress = this.playing ? this.progress : 0, radius = this.diameter2 - this.thickness, x = this.diameter2, y = this.diameter2, iconSize = 28;
			this.progressOffset += (1 - this.progressOffset) * .1;
			const endAngle = -Math.PI / 2 + progress * (Math.PI * 2);
			const startAngle = -Math.PI / 2 + this.progressOffset * (Math.PI * 2);
			this.context.save();
			this.context.clearRect(0, 0, this.diameter, this.diameter);
			this.context.beginPath();
			this.context.arc(x, y, radius + 4, 0, Math.PI * 2, false);
			this.context.fillStyle = "rgba( 0, 0, 0, 0.4 )";
			this.context.fill();
			this.context.beginPath();
			this.context.arc(x, y, radius, 0, Math.PI * 2, false);
			this.context.lineWidth = this.thickness;
			this.context.strokeStyle = "rgba( 255, 255, 255, 0.2 )";
			this.context.stroke();
			if (this.playing) {
				this.context.beginPath();
				this.context.arc(x, y, radius, startAngle, endAngle, false);
				this.context.lineWidth = this.thickness;
				this.context.strokeStyle = "#fff";
				this.context.stroke();
			}
			this.context.translate(x - iconSize / 2, y - iconSize / 2);
			if (this.playing) {
				this.context.fillStyle = "#fff";
				this.context.fillRect(0, 0, iconSize / 2 - 4, iconSize);
				this.context.fillRect(iconSize / 2 + 4, 0, iconSize / 2 - 4, iconSize);
			} else {
				this.context.beginPath();
				this.context.translate(4, 0);
				this.context.moveTo(0, 0);
				this.context.lineTo(iconSize - 4, iconSize / 2);
				this.context.lineTo(0, iconSize);
				this.context.fillStyle = "#fff";
				this.context.fill();
			}
			this.context.restore();
		}
		on(type, listener) {
			this.canvas.addEventListener(type, listener, false);
		}
		off(type, listener) {
			this.canvas.removeEventListener(type, listener, false);
		}
		destroy() {
			this.playing = false;
			if (this.canvas.parentNode) this.container.removeChild(this.canvas);
		}
	};
	//#endregion
	//#region js/config.ts
	/**
	* The default reveal.js config object.
	*/
	var defaultConfig = {
		width: 960,
		height: 700,
		margin: .04,
		minScale: .2,
		maxScale: 2,
		controls: true,
		controlsTutorial: true,
		controlsLayout: "bottom-right",
		controlsBackArrows: "faded",
		progress: true,
		slideNumber: false,
		showSlideNumber: "all",
		hashOneBasedIndex: false,
		hash: false,
		respondToHashChanges: true,
		jumpToSlide: true,
		history: false,
		keyboard: true,
		keyboardCondition: null,
		disableLayout: false,
		overview: true,
		center: true,
		touch: true,
		loop: false,
		rtl: false,
		navigationMode: "default",
		shuffle: false,
		fragments: true,
		fragmentInURL: true,
		embedded: false,
		help: true,
		pause: true,
		showNotes: false,
		showHiddenSlides: false,
		autoPlayMedia: null,
		preloadIframes: null,
		mouseWheel: false,
		previewLinks: false,
		viewDistance: 3,
		mobileViewDistance: 2,
		display: "block",
		hideInactiveCursor: true,
		hideCursorTime: 5e3,
		sortFragmentsOnSync: true,
		autoAnimate: true,
		autoAnimateMatcher: null,
		autoAnimateEasing: "ease",
		autoAnimateDuration: 1,
		autoAnimateUnmatched: true,
		autoAnimateStyles: [
			"opacity",
			"color",
			"background-color",
			"padding",
			"font-size",
			"line-height",
			"letter-spacing",
			"border-width",
			"border-color",
			"border-radius",
			"outline",
			"outline-offset"
		],
		autoSlide: 0,
		autoSlideStoppable: true,
		autoSlideMethod: null,
		defaultTiming: null,
		postMessage: true,
		postMessageEvents: false,
		focusBodyOnPageVisibilityChange: true,
		transition: "slide",
		transitionSpeed: "default",
		backgroundTransition: "fade",
		parallaxBackgroundImage: "",
		parallaxBackgroundSize: "",
		parallaxBackgroundRepeat: "",
		parallaxBackgroundPosition: "",
		parallaxBackgroundHorizontal: null,
		parallaxBackgroundVertical: null,
		view: null,
		scrollLayout: "full",
		scrollSnap: "mandatory",
		scrollProgress: "auto",
		scrollActivationWidth: 435,
		pdfMaxPagesPerSlide: Number.POSITIVE_INFINITY,
		pdfSeparateFragments: true,
		pdfPageHeightOffset: -1,
		dependencies: [],
		plugins: []
	};
	//#endregion
	//#region package.json
	var version = "6.0.1";
	//#endregion
	//#region js/reveal.js
	/**
	* reveal.js
	* https://revealjs.com
	* MIT licensed
	*
	* Copyright (C) 2011-2026 Hakim El Hattab, https://hakim.se
	*/
	function reveal_default(revealElement, options) {
		if (arguments.length < 2) {
			options = arguments[0];
			revealElement = document.querySelector(".reveal");
		}
		const Reveal = {};
		let config = {}, initialized = false, ready = false, indexh, indexv, previousSlide, currentSlide, navigationHistory = {
			hasNavigatedHorizontally: false,
			hasNavigatedVertically: false
		}, state = [], scale = 1, slidesTransform = {
			layout: "",
			overview: ""
		}, dom = {}, transition = "idle", autoSlide = 0, autoSlidePlayer, autoSlideTimeout = 0, autoSlideStartTime = -1, autoSlidePaused = false, slideContent = new SlideContent(Reveal), slideNumber = new SlideNumber(Reveal), jumpToSlide = new JumpToSlide(Reveal), autoAnimate = new AutoAnimate(Reveal), backgrounds = new Backgrounds(Reveal), scrollView = new ScrollView(Reveal), printView = new PrintView(Reveal), fragments = new Fragments(Reveal), overview = new Overview(Reveal), keyboard = new Keyboard(Reveal), location = new Location(Reveal), controls = new Controls(Reveal), progress = new Progress(Reveal), pointer = new Pointer(Reveal), plugins = new Plugins(Reveal), overlay = new Overlay(Reveal), focus = new Focus(Reveal), touch = new Touch(Reveal), notes = new Notes(Reveal);
		/**
		* Starts up the presentation.
		*/
		function initialize(initOptions) {
			if (!revealElement) throw "Unable to find presentation root (<div class=\"reveal\">).";
			if (initialized) throw "Reveal.js has already been initialized.";
			initialized = true;
			dom.wrapper = revealElement;
			dom.slides = revealElement.querySelector(".slides");
			if (!dom.slides) throw "Unable to find slides container (<div class=\"slides\">).";
			config = _objectSpread2(_objectSpread2(_objectSpread2(_objectSpread2(_objectSpread2({}, defaultConfig), config), options), initOptions), getQueryHash());
			if (/print-pdf/gi.test(window.location.search)) config.view = "print";
			setViewport();
			window.addEventListener("load", layout, false);
			plugins.load(config.plugins, config.dependencies).then(start);
			return new Promise((resolve) => Reveal.on("ready", resolve));
		}
		/**
		* Encase the presentation in a reveal.js viewport. The
		* extent of the viewport differs based on configuration.
		*/
		function setViewport() {
			if (config.embedded === true) dom.viewport = closest(revealElement, ".reveal-viewport") || revealElement;
			else {
				dom.viewport = document.body;
				document.documentElement.classList.add("reveal-full-page");
			}
			dom.viewport.classList.add("reveal-viewport");
		}
		/**
		* Starts up reveal.js by binding input events and navigating
		* to the current URL deeplink if there is one.
		*/
		function start() {
			if (initialized === false) return;
			ready = true;
			removeHiddenSlides();
			setupDOM();
			setupPostMessage();
			setupScrollPrevention();
			setupFullscreen();
			resetVerticalSlides();
			configure();
			backgrounds.update(true);
			activateInitialView();
			location.readURL();
			setTimeout(() => {
				dom.slides.classList.remove("no-transition");
				dom.wrapper.classList.add("ready");
				dispatchEvent({
					type: "ready",
					data: {
						indexh,
						indexv,
						currentSlide
					}
				});
			}, 1);
		}
		/**
		* Activates the correct reveal.js view based on our config.
		* This is only invoked once during initialization.
		*/
		function activateInitialView() {
			const activatePrintView = config.view === "print";
			const activateScrollView = config.view === "scroll" || config.view === "reader";
			if (activatePrintView || activateScrollView) {
				if (activatePrintView) removeEventListeners();
				else touch.unbind();
				dom.viewport.classList.add("loading-scroll-mode");
				if (activatePrintView) if (document.readyState === "complete") printView.activate();
				else window.addEventListener("load", () => printView.activate());
				else scrollView.activate();
			}
		}
		/**
		* Removes all slides with data-visibility="hidden". This
		* is done right before the rest of the presentation is
		* initialized.
		*
		* If you want to show all hidden slides, initialize
		* reveal.js with showHiddenSlides set to true.
		*/
		function removeHiddenSlides() {
			if (!config.showHiddenSlides) queryAll(dom.wrapper, "section[data-visibility=\"hidden\"]").forEach((slide) => {
				const parent = slide.parentNode;
				if (parent.childElementCount === 1 && /section/i.test(parent.nodeName)) parent.remove();
				else slide.remove();
			});
		}
		/**
		* Finds and stores references to DOM elements which are
		* required by the presentation. If a required element is
		* not found, it is created.
		*/
		function setupDOM() {
			dom.slides.classList.add("no-transition");
			if (isMobile) dom.wrapper.classList.add("no-hover");
			else dom.wrapper.classList.remove("no-hover");
			backgrounds.render();
			slideNumber.render();
			jumpToSlide.render();
			controls.render();
			progress.render();
			notes.render();
			dom.pauseOverlay = createSingletonNode(dom.wrapper, "div", "pause-overlay", config.controls ? "<button class=\"resume-button\">Resume presentation</button>" : null);
			dom.statusElement = createStatusElement();
			dom.wrapper.setAttribute("role", "application");
		}
		/**
		* Creates a hidden div with role aria-live to announce the
		* current slide content. Hide the div off-screen to make it
		* available only to Assistive Technologies.
		*
		* @return {HTMLElement}
		*/
		function createStatusElement() {
			let statusElement = dom.wrapper.querySelector(".aria-status");
			if (!statusElement) {
				statusElement = document.createElement("div");
				statusElement.style.position = "absolute";
				statusElement.style.height = "1px";
				statusElement.style.width = "1px";
				statusElement.style.overflow = "hidden";
				statusElement.style.clip = "rect( 1px, 1px, 1px, 1px )";
				statusElement.classList.add("aria-status");
				statusElement.setAttribute("aria-live", "polite");
				statusElement.setAttribute("aria-atomic", "true");
				dom.wrapper.appendChild(statusElement);
			}
			return statusElement;
		}
		/**
		* Announces the given text to screen readers.
		*/
		function announceStatus(value) {
			dom.statusElement.textContent = value;
		}
		/**
		* Converts the given HTML element into a string of text
		* that can be announced to a screen reader. Hidden
		* elements are excluded.
		*/
		function getStatusText(node) {
			let text = "";
			if (node.nodeType === 3) text += node.textContent.trim();
			else if (node.nodeType === 1) {
				let isAriaHidden = node.getAttribute("aria-hidden");
				let isDisplayHidden = window.getComputedStyle(node)["display"] === "none";
				if (isAriaHidden !== "true" && !isDisplayHidden) {
					if (node.tagName === "IMG" || node.tagName === "VIDEO") {
						let altText = node.getAttribute("alt");
						if (altText) text += ensurePunctuation(altText);
					}
					Array.from(node.childNodes).forEach((child) => {
						text += getStatusText(child);
					});
					if ([
						"P",
						"DIV",
						"UL",
						"OL",
						"LI",
						"H1",
						"H2",
						"H3",
						"H4",
						"H5",
						"H6",
						"BLOCKQUOTE"
					].includes(node.tagName) && text.trim() !== "") text = ensurePunctuation(text);
				}
			}
			text = text.trim();
			return text === "" ? "" : text + " ";
		}
		/**
		* Ensures text ends with proper punctuation by adding a period
		* if it doesn't already end with punctuation.
		*/
		function ensurePunctuation(text) {
			const trimmedText = text.trim();
			if (trimmedText === "") return text;
			return !/[.!?]$/.test(trimmedText) ? trimmedText + "." : trimmedText;
		}
		/**
		* This is an unfortunate necessity. Some actions – such as
		* an input field being focused in an iframe or using the
		* keyboard to expand text selection beyond the bounds of
		* a slide – can trigger our content to be pushed out of view.
		* This scrolling can not be prevented by hiding overflow in
		* CSS (we already do) so we have to resort to repeatedly
		* checking if the slides have been offset :(
		*/
		function setupScrollPrevention() {
			setInterval(() => {
				if (!scrollView.isActive() && dom.wrapper.scrollTop !== 0 || dom.wrapper.scrollLeft !== 0) {
					dom.wrapper.scrollTop = 0;
					dom.wrapper.scrollLeft = 0;
				}
			}, 1e3);
		}
		/**
		* After entering fullscreen we need to force a layout to
		* get our presentations to scale correctly. This behavior
		* is inconsistent across browsers but a force layout seems
		* to normalize it.
		*/
		function setupFullscreen() {
			document.addEventListener("fullscreenchange", onFullscreenChange);
			document.addEventListener("webkitfullscreenchange", onFullscreenChange);
		}
		/**
		* Registers a listener to postMessage events, this makes it
		* possible to call all reveal.js API methods from another
		* window. For example:
		*
		* revealWindow.postMessage( JSON.stringify({
		*   method: 'slide',
		*   args: [ 2 ]
		* }), '*' );
		*/
		function setupPostMessage() {
			if (config.postMessage) window.addEventListener("message", onPostMessage, false);
		}
		/**
		* Applies the configuration settings from the config
		* object. May be called multiple times.
		*
		* @param {object} options
		*/
		function configure(options) {
			const oldConfig = _objectSpread2({}, config);
			if (typeof options === "object") extend(config, options);
			if (Reveal.isReady() === false) return;
			const numberOfSlides = dom.wrapper.querySelectorAll(SLIDES_SELECTOR).length;
			dom.wrapper.classList.remove(oldConfig.transition);
			dom.wrapper.classList.add(config.transition);
			dom.wrapper.setAttribute("data-transition-speed", config.transitionSpeed);
			dom.wrapper.setAttribute("data-background-transition", config.backgroundTransition);
			dom.viewport.style.setProperty("--slide-width", typeof config.width === "string" ? config.width : config.width + "px");
			dom.viewport.style.setProperty("--slide-height", typeof config.height === "string" ? config.height : config.height + "px");
			if (config.shuffle) shuffle();
			toggleClass(dom.wrapper, "embedded", config.embedded);
			toggleClass(dom.wrapper, "rtl", config.rtl);
			toggleClass(dom.wrapper, "center", config.center);
			if (config.pause === false) resume();
			autoAnimate.reset();
			if (autoSlidePlayer) {
				autoSlidePlayer.destroy();
				autoSlidePlayer = null;
			}
			if (numberOfSlides > 1 && config.autoSlide && config.autoSlideStoppable) {
				autoSlidePlayer = new Playback(dom.wrapper, () => {
					return Math.min(Math.max((Date.now() - autoSlideStartTime) / autoSlide, 0), 1);
				});
				autoSlidePlayer.on("click", onAutoSlidePlayerClick);
				autoSlidePaused = false;
			}
			if (config.navigationMode !== "default") dom.wrapper.setAttribute("data-navigation-mode", config.navigationMode);
			else dom.wrapper.removeAttribute("data-navigation-mode");
			notes.configure(config, oldConfig);
			focus.configure(config, oldConfig);
			pointer.configure(config, oldConfig);
			controls.configure(config, oldConfig);
			progress.configure(config, oldConfig);
			keyboard.configure(config, oldConfig);
			fragments.configure(config, oldConfig);
			slideNumber.configure(config, oldConfig);
			sync();
		}
		/**
		* Binds all event listeners.
		*/
		function addEventListeners() {
			window.addEventListener("resize", onWindowResize, false);
			if (config.touch) touch.bind();
			if (config.keyboard) keyboard.bind();
			if (config.progress) progress.bind();
			if (config.respondToHashChanges) location.bind();
			controls.bind();
			focus.bind();
			dom.slides.addEventListener("click", onSlidesClicked, false);
			dom.slides.addEventListener("transitionend", onTransitionEnd, false);
			dom.pauseOverlay.addEventListener("click", resume, false);
			if (config.focusBodyOnPageVisibilityChange) document.addEventListener("visibilitychange", onPageVisibilityChange, false);
		}
		/**
		* Unbinds all event listeners.
		*/
		function removeEventListeners() {
			touch.unbind();
			focus.unbind();
			keyboard.unbind();
			controls.unbind();
			progress.unbind();
			location.unbind();
			window.removeEventListener("resize", onWindowResize, false);
			dom.slides.removeEventListener("click", onSlidesClicked, false);
			dom.slides.removeEventListener("transitionend", onTransitionEnd, false);
			dom.pauseOverlay.removeEventListener("click", resume, false);
		}
		/**
		* Uninitializes reveal.js by undoing changes made to the
		* DOM and removing all event listeners.
		*/
		function destroy() {
			initialized = false;
			if (ready === false) return;
			removeEventListeners();
			cancelAutoSlide();
			notes.destroy();
			focus.destroy();
			overlay.destroy();
			plugins.destroy();
			pointer.destroy();
			controls.destroy();
			progress.destroy();
			backgrounds.destroy();
			slideNumber.destroy();
			jumpToSlide.destroy();
			document.removeEventListener("fullscreenchange", onFullscreenChange);
			document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
			document.removeEventListener("visibilitychange", onPageVisibilityChange, false);
			window.removeEventListener("message", onPostMessage, false);
			window.removeEventListener("load", layout, false);
			if (dom.pauseOverlay) dom.pauseOverlay.remove();
			if (dom.statusElement) dom.statusElement.remove();
			document.documentElement.classList.remove("reveal-full-page");
			dom.wrapper.classList.remove("ready", "center", "has-horizontal-slides", "has-vertical-slides");
			dom.wrapper.removeAttribute("data-transition-speed");
			dom.wrapper.removeAttribute("data-background-transition");
			dom.viewport.classList.remove("reveal-viewport");
			dom.viewport.style.removeProperty("--slide-width");
			dom.viewport.style.removeProperty("--slide-height");
			dom.slides.style.removeProperty("width");
			dom.slides.style.removeProperty("height");
			dom.slides.style.removeProperty("zoom");
			dom.slides.style.removeProperty("left");
			dom.slides.style.removeProperty("top");
			dom.slides.style.removeProperty("bottom");
			dom.slides.style.removeProperty("right");
			dom.slides.style.removeProperty("transform");
			Array.from(dom.wrapper.querySelectorAll(SLIDES_SELECTOR)).forEach((slide) => {
				slide.style.removeProperty("display");
				slide.style.removeProperty("top");
				slide.removeAttribute("hidden");
				slide.removeAttribute("aria-hidden");
			});
		}
		/**
		* Adds a listener to one of our custom reveal.js events,
		* like slidechanged.
		*/
		function on(type, listener, useCapture) {
			revealElement.addEventListener(type, listener, useCapture);
		}
		/**
		* Unsubscribes from a reveal.js event.
		*/
		function off(type, listener, useCapture) {
			revealElement.removeEventListener(type, listener, useCapture);
		}
		/**
		* Applies CSS transforms to the slides container. The container
		* is transformed from two separate sources: layout and the overview
		* mode.
		*
		* @param {object} transforms
		*/
		function transformSlides(transforms) {
			if (typeof transforms.layout === "string") slidesTransform.layout = transforms.layout;
			if (typeof transforms.overview === "string") slidesTransform.overview = transforms.overview;
			if (slidesTransform.layout) transformElement(dom.slides, slidesTransform.layout + " " + slidesTransform.overview);
			else transformElement(dom.slides, slidesTransform.overview);
		}
		/**
		* Dispatches an event of the specified type from the
		* reveal DOM element.
		*/
		function dispatchEvent({ target = dom.wrapper, type, data, bubbles = true }) {
			let event = document.createEvent("HTMLEvents", 1, 2);
			event.initEvent(type, bubbles, true);
			extend(event, data);
			target.dispatchEvent(event);
			if (target === dom.wrapper) dispatchPostMessage(type);
			return event;
		}
		/**
		* Dispatches a slidechanged event.
		*
		* @param {string} origin Used to identify multiplex clients
		*/
		function dispatchSlideChanged(origin) {
			dispatchEvent({
				type: "slidechanged",
				data: {
					indexh,
					indexv,
					previousSlide,
					currentSlide,
					origin
				}
			});
		}
		/**
		* Dispatched a postMessage of the given type from our window.
		*/
		function dispatchPostMessage(type, data) {
			if (config.postMessageEvents && window.parent !== window.self) {
				let message = {
					namespace: "reveal",
					eventName: type,
					state: getState()
				};
				extend(message, data);
				window.parent.postMessage(JSON.stringify(message), "*");
			}
		}
		/**
		* Applies JavaScript-controlled layout rules to the
		* presentation.
		*/
		function layout() {
			if (dom.wrapper && !printView.isActive()) {
				const viewportWidth = dom.viewport.offsetWidth;
				const viewportHeight = dom.viewport.offsetHeight;
				if (!config.disableLayout) {
					if (isMobile && !config.embedded) document.documentElement.style.setProperty("--vh", window.innerHeight * .01 + "px");
					const size = scrollView.isActive() ? getComputedSlideSize(viewportWidth, viewportHeight) : getComputedSlideSize();
					const oldScale = scale;
					layoutSlideContents(config.width, config.height);
					dom.slides.style.width = size.width + "px";
					dom.slides.style.height = size.height + "px";
					scale = Math.min(size.presentationWidth / size.width, size.presentationHeight / size.height);
					scale = Math.max(scale, config.minScale);
					scale = Math.min(scale, config.maxScale);
					if (scale === 1 || scrollView.isActive()) {
						dom.slides.style.zoom = "";
						dom.slides.style.left = "";
						dom.slides.style.top = "";
						dom.slides.style.bottom = "";
						dom.slides.style.right = "";
						transformSlides({ layout: "" });
					} else {
						dom.slides.style.zoom = "";
						dom.slides.style.left = "50%";
						dom.slides.style.top = "50%";
						dom.slides.style.bottom = "auto";
						dom.slides.style.right = "auto";
						transformSlides({ layout: "translate(-50%, -50%) scale(" + scale + ")" });
					}
					const slides = Array.from(dom.wrapper.querySelectorAll(SLIDES_SELECTOR));
					for (let i = 0, len = slides.length; i < len; i++) {
						const slide = slides[i];
						if (slide.style.display === "none") continue;
						if (config.center || slide.classList.contains("center")) if (slide.classList.contains("stack")) slide.style.top = 0;
						else slide.style.top = Math.max((size.height - slide.scrollHeight) / 2, 0) + "px";
						else slide.style.top = "";
					}
					if (oldScale !== scale) dispatchEvent({
						type: "resize",
						data: {
							oldScale,
							scale,
							size
						}
					});
				}
				checkResponsiveScrollView();
				dom.viewport.style.setProperty("--slide-scale", scale);
				dom.viewport.style.setProperty("--viewport-width", viewportWidth + "px");
				dom.viewport.style.setProperty("--viewport-height", viewportHeight + "px");
				scrollView.layout();
				progress.update();
				backgrounds.updateParallax();
				if (overview.isActive()) overview.update();
			}
		}
		/**
		* Applies layout logic to the contents of all slides in
		* the presentation.
		*
		* @param {string|number} width
		* @param {string|number} height
		*/
		function layoutSlideContents(width, height) {
			queryAll(dom.slides, "section > .stretch, section > .r-stretch").forEach((element) => {
				let remainingHeight = getRemainingHeight(element, height);
				if (/(img|video)/gi.test(element.nodeName)) {
					const nw = element.naturalWidth || element.videoWidth, nh = element.naturalHeight || element.videoHeight;
					const es = Math.min(width / nw, remainingHeight / nh);
					element.style.width = nw * es + "px";
					element.style.height = nh * es + "px";
				} else {
					element.style.width = width + "px";
					element.style.height = remainingHeight + "px";
				}
			});
		}
		/**
		* Responsively activates the scroll mode when we reach the configured
		* activation width.
		*/
		function checkResponsiveScrollView() {
			if (dom.wrapper && !config.disableLayout && !printView.isActive() && typeof config.scrollActivationWidth === "number" && config.view !== "scroll") {
				const size = getComputedSlideSize();
				if (size.presentationWidth > 0 && size.presentationWidth <= config.scrollActivationWidth) {
					if (!scrollView.isActive()) {
						backgrounds.create();
						scrollView.activate();
					}
				} else if (scrollView.isActive()) scrollView.deactivate();
			}
		}
		/**
		* Calculates the computed pixel size of our slides. These
		* values are based on the width and height configuration
		* options.
		*
		* @param {number} [presentationWidth=dom.wrapper.offsetWidth]
		* @param {number} [presentationHeight=dom.wrapper.offsetHeight]
		*/
		function getComputedSlideSize(presentationWidth, presentationHeight) {
			let width = config.width;
			let height = config.height;
			if (config.disableLayout) {
				width = dom.slides.offsetWidth;
				height = dom.slides.offsetHeight;
			}
			const size = {
				width,
				height,
				presentationWidth: presentationWidth || dom.wrapper.offsetWidth,
				presentationHeight: presentationHeight || dom.wrapper.offsetHeight
			};
			size.presentationWidth -= size.presentationWidth * config.margin;
			size.presentationHeight -= size.presentationHeight * config.margin;
			if (typeof size.width === "string" && /%$/.test(size.width)) size.width = parseInt(size.width, 10) / 100 * size.presentationWidth;
			if (typeof size.height === "string" && /%$/.test(size.height)) size.height = parseInt(size.height, 10) / 100 * size.presentationHeight;
			return size;
		}
		/**
		* Stores the vertical index of a stack so that the same
		* vertical slide can be selected when navigating to and
		* from the stack.
		*
		* @param {HTMLElement} stack The vertical stack element
		* @param {string|number} [v=0] Index to memorize
		*/
		function setPreviousVerticalIndex(stack, v) {
			if (typeof stack === "object" && typeof stack.setAttribute === "function") stack.setAttribute("data-previous-indexv", v || 0);
		}
		/**
		* Retrieves the vertical index which was stored using
		* #setPreviousVerticalIndex() or 0 if no previous index
		* exists.
		*
		* @param {HTMLElement} stack The vertical stack element
		*/
		function getPreviousVerticalIndex(stack) {
			if (typeof stack === "object" && typeof stack.setAttribute === "function" && stack.classList.contains("stack")) {
				const attributeName = stack.hasAttribute("data-start-indexv") ? "data-start-indexv" : "data-previous-indexv";
				return parseInt(stack.getAttribute(attributeName) || 0, 10);
			}
			return 0;
		}
		/**
		* Checks if the current or specified slide is vertical
		* (nested within another slide).
		*
		* @param {HTMLElement} [slide=currentSlide] The slide to check
		* orientation of
		* @return {Boolean}
		*/
		function isVerticalSlide(slide = currentSlide) {
			return slide && slide.parentNode && !!slide.parentNode.nodeName.match(/section/i);
		}
		/**
		* Checks if the current or specified slide is a stack containing
		* vertical slides.
		*
		* @param {HTMLElement} [slide=currentSlide]
		* @return {Boolean}
		*/
		function isVerticalStack(slide = currentSlide) {
			return slide.classList.contains(".stack") || slide.querySelector("section") !== null;
		}
		/**
		* Returns true if we're on the last slide in the current
		* vertical stack.
		*/
		function isLastVerticalSlide() {
			if (currentSlide && isVerticalSlide(currentSlide)) {
				if (currentSlide.nextElementSibling) return false;
				return true;
			}
			return false;
		}
		/**
		* Returns true if we're currently on the first slide in
		* the presentation.
		*/
		function isFirstSlide() {
			return indexh === 0 && indexv === 0;
		}
		/**
		* Returns true if we're currently on the last slide in
		* the presentation. If the last slide is a stack, we only
		* consider this the last slide if it's at the end of the
		* stack.
		*/
		function isLastSlide() {
			if (currentSlide) {
				if (currentSlide.nextElementSibling) return false;
				if (isVerticalSlide(currentSlide) && currentSlide.parentNode.nextElementSibling) return false;
				return true;
			}
			return false;
		}
		/**
		* Enters the paused mode which fades everything on screen to
		* black.
		*/
		function pause() {
			if (config.pause) {
				const wasPaused = dom.wrapper.classList.contains("paused");
				cancelAutoSlide();
				dom.wrapper.classList.add("paused");
				if (wasPaused === false) dispatchEvent({ type: "paused" });
			}
		}
		/**
		* Exits from the paused mode.
		*/
		function resume() {
			const wasPaused = dom.wrapper.classList.contains("paused");
			dom.wrapper.classList.remove("paused");
			cueAutoSlide();
			if (wasPaused) dispatchEvent({ type: "resumed" });
		}
		/**
		* Toggles the paused mode on and off.
		*/
		function togglePause(override) {
			if (typeof override === "boolean") override ? pause() : resume();
			else isPaused() ? resume() : pause();
		}
		/**
		* Checks if we are currently in the paused mode.
		*
		* @return {Boolean}
		*/
		function isPaused() {
			return dom.wrapper.classList.contains("paused");
		}
		/**
		* Toggles visibility of the jump-to-slide UI.
		*/
		function toggleJumpToSlide(override) {
			if (typeof override === "boolean") override ? jumpToSlide.show() : jumpToSlide.hide();
			else jumpToSlide.isVisible() ? jumpToSlide.hide() : jumpToSlide.show();
		}
		/**
		* Toggles the auto slide mode on and off.
		*
		* @param {Boolean} [override] Flag which sets the desired state.
		* True means autoplay starts, false means it stops.
		*/
		function toggleAutoSlide(override) {
			if (typeof override === "boolean") override ? resumeAutoSlide() : pauseAutoSlide();
			else autoSlidePaused ? resumeAutoSlide() : pauseAutoSlide();
		}
		/**
		* Checks if the auto slide mode is currently on.
		*
		* @return {Boolean}
		*/
		function isAutoSliding() {
			return !!(autoSlide && !autoSlidePaused);
		}
		/**
		* Steps from the current point in the presentation to the
		* slide which matches the specified horizontal and vertical
		* indices.
		*
		* @param {number} [h=indexh] Horizontal index of the target slide
		* @param {number} [v=indexv] Vertical index of the target slide
		* @param {number} [f] Index of a fragment within the
		* target slide to activate
		* @param {number} [origin] Origin for use in multimaster environments
		*/
		function slide(h, v, f, origin) {
			if (dispatchEvent({
				type: "beforeslidechange",
				data: {
					indexh: h === void 0 ? indexh : h,
					indexv: v === void 0 ? indexv : v,
					origin
				}
			}).defaultPrevented) return;
			previousSlide = currentSlide;
			const horizontalSlides = dom.wrapper.querySelectorAll(HORIZONTAL_SLIDES_SELECTOR);
			if (scrollView.isActive()) {
				const scrollToSlide = scrollView.getSlideByIndices(h, v);
				if (scrollToSlide) scrollView.scrollToSlide(scrollToSlide);
				return;
			}
			if (horizontalSlides.length === 0) return;
			if (v === void 0 && !overview.isActive()) v = getPreviousVerticalIndex(horizontalSlides[h]);
			if (previousSlide && previousSlide.parentNode && previousSlide.parentNode.classList.contains("stack")) setPreviousVerticalIndex(previousSlide.parentNode, indexv);
			const stateBefore = state.concat();
			state.length = 0;
			let indexhBefore = indexh || 0, indexvBefore = indexv || 0;
			indexh = updateSlides(HORIZONTAL_SLIDES_SELECTOR, h === void 0 ? indexh : h);
			indexv = updateSlides(VERTICAL_SLIDES_SELECTOR, v === void 0 ? indexv : v);
			let slideChanged = indexh !== indexhBefore || indexv !== indexvBefore;
			if (!slideChanged) previousSlide = null;
			let currentHorizontalSlide = horizontalSlides[indexh], currentVerticalSlides = currentHorizontalSlide.querySelectorAll("section");
			revealElement.classList.toggle("is-vertical-slide", currentVerticalSlides.length > 1);
			currentSlide = currentVerticalSlides[indexv] || currentHorizontalSlide;
			let autoAnimateTransition = false;
			if (slideChanged && previousSlide && currentSlide && !overview.isActive()) {
				transition = "running";
				autoAnimateTransition = shouldAutoAnimateBetween(previousSlide, currentSlide, indexhBefore, indexvBefore);
				if (autoAnimateTransition) dom.slides.classList.add("disable-slide-transitions");
			}
			updateSlidesVisibility();
			layout();
			if (overview.isActive()) overview.update();
			if (typeof f !== "undefined") fragments.goto(f);
			if (previousSlide && previousSlide !== currentSlide) {
				previousSlide.classList.remove("present");
				previousSlide.setAttribute("aria-hidden", "true");
				if (isFirstSlide()) setTimeout(() => {
					getVerticalStacks().forEach((slide) => {
						setPreviousVerticalIndex(slide, 0);
					});
				}, 0);
			}
			stateLoop: for (let i = 0, len = state.length; i < len; i++) {
				for (let j = 0; j < stateBefore.length; j++) if (stateBefore[j] === state[i]) {
					stateBefore.splice(j, 1);
					continue stateLoop;
				}
				dom.viewport.classList.add(state[i]);
				dispatchEvent({ type: state[i] });
			}
			while (stateBefore.length) dom.viewport.classList.remove(stateBefore.pop());
			if (slideChanged) {
				slideContent.afterSlideChanged();
				dispatchSlideChanged(origin);
			}
			if (slideChanged || !previousSlide) {
				slideContent.stopEmbeddedContent(previousSlide);
				slideContent.startEmbeddedContent(currentSlide);
			}
			requestAnimationFrame(() => {
				announceStatus(getStatusText(currentSlide));
			});
			progress.update();
			controls.update();
			notes.update();
			backgrounds.update();
			backgrounds.updateParallax();
			slideNumber.update();
			fragments.update();
			location.writeURL();
			cueAutoSlide();
			if (autoAnimateTransition) {
				setTimeout(() => {
					dom.slides.classList.remove("disable-slide-transitions");
				}, 0);
				if (config.autoAnimate) autoAnimate.run(previousSlide, currentSlide);
			}
		}
		/**
		* Checks whether or not an auto-animation should take place between
		* the two given slides.
		*
		* @param {HTMLElement} fromSlide
		* @param {HTMLElement} toSlide
		* @param {number} indexhBefore
		* @param {number} indexvBefore
		*
		* @returns {boolean}
		*/
		function shouldAutoAnimateBetween(fromSlide, toSlide, indexhBefore, indexvBefore) {
			return fromSlide.hasAttribute("data-auto-animate") && toSlide.hasAttribute("data-auto-animate") && fromSlide.getAttribute("data-auto-animate-id") === toSlide.getAttribute("data-auto-animate-id") && !(indexh > indexhBefore || indexv > indexvBefore ? toSlide : fromSlide).hasAttribute("data-auto-animate-restart");
		}
		/**
		* Called anytime a new slide should be activated while in the scroll
		* view. The active slide is the page that occupies the most space in
		* the scrollable viewport.
		*
		* @param {number} pageIndex
		* @param {HTMLElement} slideElement
		*/
		function setCurrentScrollPage(slideElement, h, v) {
			let indexhBefore = indexh || 0;
			indexh = h;
			indexv = v;
			const slideChanged = currentSlide !== slideElement;
			previousSlide = currentSlide;
			currentSlide = slideElement;
			if (currentSlide && previousSlide) {
				if (config.autoAnimate && shouldAutoAnimateBetween(previousSlide, currentSlide, indexhBefore, indexv)) autoAnimate.run(previousSlide, currentSlide);
			}
			if (slideChanged) {
				slideContent.afterSlideChanged();
				if (previousSlide) {
					slideContent.stopEmbeddedContent(previousSlide);
					slideContent.stopEmbeddedContent(previousSlide.slideBackgroundElement);
				}
				slideContent.startEmbeddedContent(currentSlide);
				slideContent.startEmbeddedContent(currentSlide.slideBackgroundElement);
			}
			requestAnimationFrame(() => {
				announceStatus(getStatusText(currentSlide));
			});
			dispatchSlideChanged();
		}
		/**
		* Syncs the presentation with the current DOM. Useful
		* when new slides or control elements are added or when
		* the configuration has changed.
		*/
		function sync() {
			removeEventListeners();
			addEventListeners();
			layout();
			autoSlide = config.autoSlide;
			cueAutoSlide();
			backgrounds.create();
			location.writeURL();
			if (config.sortFragmentsOnSync === true) fragments.sortAll();
			if (typeof indexh !== "undefined") {
				indexh = updateSlides(HORIZONTAL_SLIDES_SELECTOR, indexh);
				indexv = updateSlides(VERTICAL_SLIDES_SELECTOR, indexv);
			}
			controls.update();
			progress.update();
			updateSlidesVisibility();
			notes.update();
			notes.updateVisibility();
			overlay.update();
			backgrounds.update(true);
			slideNumber.update();
			slideContent.formatEmbeddedContent();
			if (config.autoPlayMedia === false) slideContent.stopEmbeddedContent(currentSlide, { unloadIframes: false });
			else slideContent.startEmbeddedContent(currentSlide);
			if (overview.isActive()) overview.layout();
			dispatchEvent({ type: "sync" });
		}
		/**
		* Updates reveal.js to keep in sync with new slide attributes. For
		* example, if you add a new `data-background-image` you can call
		* this to have reveal.js render the new background image.
		*
		* Similar to #sync() but more efficient when you only need to
		* refresh a specific slide.
		*
		* @param {HTMLElement} slide
		*/
		function syncSlide(slide = currentSlide) {
			backgrounds.sync(slide);
			fragments.sync(slide);
			slideContent.load(slide);
			backgrounds.update();
			notes.update();
			dispatchEvent({
				type: "slidesync",
				data: { slide }
			});
		}
		/**
		* Resets all vertical slides so that only the first
		* is visible.
		*/
		function resetVerticalSlides() {
			getHorizontalSlides().forEach((horizontalSlide) => {
				queryAll(horizontalSlide, "section").forEach((verticalSlide, y) => {
					if (y > 0) {
						verticalSlide.classList.remove("present");
						verticalSlide.classList.remove("past");
						verticalSlide.classList.add("future");
						verticalSlide.setAttribute("aria-hidden", "true");
					}
				});
			});
		}
		/**
		* Randomly shuffles all slides in the deck.
		*/
		function shuffle(slides = getHorizontalSlides()) {
			slides.forEach((slide, i) => {
				let beforeSlide = slides[Math.floor(Math.random() * slides.length)];
				if (beforeSlide.parentNode === slide.parentNode) slide.parentNode.insertBefore(slide, beforeSlide);
				let verticalSlides = slide.querySelectorAll("section");
				if (verticalSlides.length) shuffle(verticalSlides);
			});
		}
		/**
		* Updates one dimension of slides by showing the slide
		* with the specified index.
		*
		* @param {string} selector A CSS selector that will fetch
		* the group of slides we are working with
		* @param {number} index The index of the slide that should be
		* shown
		*
		* @return {number} The index of the slide that is now shown,
		* might differ from the passed in index if it was out of
		* bounds.
		*/
		function updateSlides(selector, index) {
			let slides = queryAll(dom.wrapper, selector), slidesLength = slides.length;
			let printMode = scrollView.isActive() || printView.isActive();
			let loopedForwards = false;
			let loopedBackwards = false;
			if (slidesLength) {
				if (config.loop) {
					if (index >= slidesLength) loopedForwards = true;
					index %= slidesLength;
					if (index < 0) {
						index = slidesLength + index;
						loopedBackwards = true;
					}
				}
				index = Math.max(Math.min(index, slidesLength - 1), 0);
				for (let i = 0; i < slidesLength; i++) {
					let element = slides[i];
					let reverse = config.rtl && !isVerticalSlide(element);
					element.classList.remove("past");
					element.classList.remove("present");
					element.classList.remove("future");
					element.setAttribute("hidden", "");
					element.setAttribute("aria-hidden", "true");
					if (element.querySelector("section")) element.classList.add("stack");
					if (printMode) {
						element.classList.add("present");
						continue;
					}
					if (i < index) {
						element.classList.add(reverse ? "future" : "past");
						if (config.fragments) showFragmentsIn(element);
					} else if (i > index) {
						element.classList.add(reverse ? "past" : "future");
						if (config.fragments) hideFragmentsIn(element);
					} else if (i === index && config.fragments) {
						if (loopedForwards) hideFragmentsIn(element);
						else if (loopedBackwards) showFragmentsIn(element);
					}
				}
				let slide = slides[index];
				let wasPresent = slide.classList.contains("present");
				slide.classList.add("present");
				slide.removeAttribute("hidden");
				slide.removeAttribute("aria-hidden");
				if (!wasPresent) dispatchEvent({
					target: slide,
					type: "visible",
					bubbles: false
				});
				let slideState = slide.getAttribute("data-state");
				if (slideState) state = state.concat(slideState.split(" "));
			} else index = 0;
			return index;
		}
		/**
		* Shows all fragment elements within the given container.
		*/
		function showFragmentsIn(container) {
			queryAll(container, ".fragment").forEach((fragment) => {
				fragment.classList.add("visible");
				fragment.classList.remove("current-fragment");
			});
		}
		/**
		* Hides all fragment elements within the given container.
		*/
		function hideFragmentsIn(container) {
			queryAll(container, ".fragment.visible").forEach((fragment) => {
				fragment.classList.remove("visible", "current-fragment");
			});
		}
		/**
		* Optimization method; hide all slides that are far away
		* from the present slide.
		*/
		function updateSlidesVisibility() {
			let horizontalSlides = getHorizontalSlides(), horizontalSlidesLength = horizontalSlides.length, distanceX, distanceY;
			if (horizontalSlidesLength && typeof indexh !== "undefined") {
				const isOverview = overview.isActive();
				let viewDistance = isOverview ? 10 : config.viewDistance;
				if (isMobile) viewDistance = isOverview ? 6 : config.mobileViewDistance;
				if (printView.isActive()) viewDistance = Number.MAX_VALUE;
				for (let x = 0; x < horizontalSlidesLength; x++) {
					let horizontalSlide = horizontalSlides[x];
					let verticalSlides = queryAll(horizontalSlide, "section"), verticalSlidesLength = verticalSlides.length;
					distanceX = Math.abs((indexh || 0) - x) || 0;
					if (config.loop) distanceX = Math.abs(((indexh || 0) - x) % (horizontalSlidesLength - viewDistance)) || 0;
					if (distanceX < viewDistance) slideContent.load(horizontalSlide);
					else slideContent.unload(horizontalSlide);
					if (verticalSlidesLength) {
						let oy = isOverview ? 0 : getPreviousVerticalIndex(horizontalSlide);
						for (let y = 0; y < verticalSlidesLength; y++) {
							let verticalSlide = verticalSlides[y];
							distanceY = x === (indexh || 0) ? Math.abs((indexv || 0) - y) : Math.abs(y - oy);
							if (distanceX + distanceY < viewDistance) slideContent.load(verticalSlide);
							else slideContent.unload(verticalSlide);
						}
					}
				}
				if (hasVerticalSlides()) dom.wrapper.classList.add("has-vertical-slides");
				else dom.wrapper.classList.remove("has-vertical-slides");
				if (hasHorizontalSlides()) dom.wrapper.classList.add("has-horizontal-slides");
				else dom.wrapper.classList.remove("has-horizontal-slides");
			}
		}
		/**
		* Determine what available routes there are for navigation.
		*
		* @return {{left: boolean, right: boolean, up: boolean, down: boolean}}
		*/
		function availableRoutes({ includeFragments = false } = {}) {
			let horizontalSlides = dom.wrapper.querySelectorAll(HORIZONTAL_SLIDES_SELECTOR), verticalSlides = dom.wrapper.querySelectorAll(VERTICAL_SLIDES_SELECTOR);
			let routes = {
				left: indexh > 0,
				right: indexh < horizontalSlides.length - 1,
				up: indexv > 0,
				down: indexv < verticalSlides.length - 1
			};
			if (config.loop) {
				if (horizontalSlides.length > 1) {
					routes.left = true;
					routes.right = true;
				}
				if (verticalSlides.length > 1) {
					routes.up = true;
					routes.down = true;
				}
			}
			if (horizontalSlides.length > 1 && config.navigationMode === "linear") {
				routes.right = routes.right || routes.down;
				routes.left = routes.left || routes.up;
			}
			if (includeFragments === true) {
				let fragmentRoutes = fragments.availableRoutes();
				routes.left = routes.left || fragmentRoutes.prev;
				routes.up = routes.up || fragmentRoutes.prev;
				routes.down = routes.down || fragmentRoutes.next;
				routes.right = routes.right || fragmentRoutes.next;
			}
			if (config.rtl) {
				let left = routes.left;
				routes.left = routes.right;
				routes.right = left;
			}
			return routes;
		}
		/**
		* Returns the number of past slides. This can be used as a global
		* flattened index for slides.
		*
		* @param {HTMLElement} [slide=currentSlide] The slide we're counting before
		*
		* @return {number} Past slide count
		*/
		function getSlidePastCount(slide = currentSlide) {
			let horizontalSlides = getHorizontalSlides();
			let pastCount = 0;
			mainLoop: for (let i = 0; i < horizontalSlides.length; i++) {
				let horizontalSlide = horizontalSlides[i];
				let verticalSlides = horizontalSlide.querySelectorAll("section");
				for (let j = 0; j < verticalSlides.length; j++) {
					if (verticalSlides[j] === slide) break mainLoop;
					if (verticalSlides[j].dataset.visibility !== "uncounted") pastCount++;
				}
				if (horizontalSlide === slide) break;
				if (horizontalSlide.classList.contains("stack") === false && horizontalSlide.dataset.visibility !== "uncounted") pastCount++;
			}
			return pastCount;
		}
		/**
		* Returns a value ranging from 0-1 that represents
		* how far into the presentation we have navigated.
		*
		* @return {number}
		*/
		function getProgress() {
			let totalCount = getTotalSlides();
			let pastCount = getSlidePastCount();
			if (currentSlide) {
				let allFragments = currentSlide.querySelectorAll(".fragment");
				if (allFragments.length > 0) {
					let visibleFragments = currentSlide.querySelectorAll(".fragment.visible");
					pastCount += visibleFragments.length / allFragments.length * .9;
				}
			}
			return Math.min(pastCount / (totalCount - 1), 1);
		}
		/**
		* Retrieves the h/v location and fragment of the current,
		* or specified, slide.
		*
		* @param {HTMLElement} [slide] If specified, the returned
		* index will be for this slide rather than the currently
		* active one
		*
		* @return {{h: number, v: number, f: number}}
		*/
		function getIndices(slide) {
			let h = indexh, v = indexv, f;
			if (slide) if (scrollView.isActive()) {
				h = parseInt(slide.getAttribute("data-index-h"), 10);
				if (slide.getAttribute("data-index-v")) v = parseInt(slide.getAttribute("data-index-v"), 10);
			} else {
				let isVertical = isVerticalSlide(slide);
				let slideh = isVertical ? slide.parentNode : slide;
				let horizontalSlides = getHorizontalSlides();
				h = Math.max(horizontalSlides.indexOf(slideh), 0);
				v = void 0;
				if (isVertical) v = Math.max(queryAll(slide.parentNode, "section").indexOf(slide), 0);
			}
			if (!slide && currentSlide) {
				if (currentSlide.querySelectorAll(".fragment").length > 0) {
					let currentFragment = currentSlide.querySelector(".current-fragment");
					if (currentFragment && currentFragment.hasAttribute("data-fragment-index")) f = parseInt(currentFragment.getAttribute("data-fragment-index"), 10);
					else f = currentSlide.querySelectorAll(".fragment.visible").length - 1;
				}
			}
			return {
				h,
				v,
				f
			};
		}
		/**
		* Retrieves all slides in this presentation.
		*/
		function getSlides() {
			return queryAll(dom.wrapper, SLIDES_SELECTOR + ":not(.stack):not([data-visibility=\"uncounted\"])");
		}
		/**
		* Returns a list of all horizontal slides in the deck. Each
		* vertical stack is included as one horizontal slide in the
		* resulting array.
		*/
		function getHorizontalSlides() {
			return queryAll(dom.wrapper, HORIZONTAL_SLIDES_SELECTOR);
		}
		/**
		* Returns all vertical slides that exist within this deck.
		*/
		function getVerticalSlides() {
			return queryAll(dom.wrapper, ".slides>section>section");
		}
		/**
		* Returns all vertical stacks (each stack can contain multiple slides).
		*/
		function getVerticalStacks() {
			return queryAll(dom.wrapper, HORIZONTAL_SLIDES_SELECTOR + ".stack");
		}
		/**
		* Returns true if there are at least two horizontal slides.
		*/
		function hasHorizontalSlides() {
			return getHorizontalSlides().length > 1;
		}
		/**
		* Returns true if there are at least two vertical slides.
		*/
		function hasVerticalSlides() {
			return getVerticalSlides().length > 1;
		}
		/**
		* Returns an array of objects where each object represents the
		* attributes on its respective slide.
		*/
		function getSlidesAttributes() {
			return getSlides().map((slide) => {
				let attributes = {};
				for (let i = 0; i < slide.attributes.length; i++) {
					let attribute = slide.attributes[i];
					attributes[attribute.name] = attribute.value;
				}
				return attributes;
			});
		}
		/**
		* Retrieves the total number of slides in this presentation.
		*
		* @return {number}
		*/
		function getTotalSlides() {
			return getSlides().length;
		}
		/**
		* Returns the slide element matching the specified index.
		*
		* @return {HTMLElement}
		*/
		function getSlide(x, y) {
			let horizontalSlide = getHorizontalSlides()[x];
			let verticalSlides = horizontalSlide && horizontalSlide.querySelectorAll("section");
			if (verticalSlides && verticalSlides.length && typeof y === "number") return verticalSlides ? verticalSlides[y] : void 0;
			return horizontalSlide;
		}
		/**
		* Returns the background element for the given slide.
		* All slides, even the ones with no background properties
		* defined, have a background element so as long as the
		* index is valid an element will be returned.
		*
		* @param {mixed} x Horizontal background index OR a slide
		* HTML element
		* @param {number} y Vertical background index
		* @return {(HTMLElement[]|*)}
		*/
		function getSlideBackground(x, y) {
			let slide = typeof x === "number" ? getSlide(x, y) : x;
			if (slide) return slide.slideBackgroundElement;
		}
		/**
		* Retrieves the current state of the presentation as
		* an object. This state can then be restored at any
		* time.
		*
		* @return {{indexh: number, indexv: number, indexf: number, paused: boolean, overview: boolean}}
		*/
		function getState() {
			let indices = getIndices();
			return _objectSpread2({
				indexh: indices.h,
				indexv: indices.v,
				indexf: indices.f,
				paused: isPaused(),
				overview: overview.isActive()
			}, overlay.getState());
		}
		/**
		* Restores the presentation to the given state.
		*
		* @param {object} state As generated by getState()
		* @see {@link getState} generates the parameter `state`
		*/
		function setState(state) {
			if (typeof state === "object") {
				slide(deserialize(state.indexh), deserialize(state.indexv), deserialize(state.indexf));
				let pausedFlag = deserialize(state.paused), overviewFlag = deserialize(state.overview);
				if (typeof pausedFlag === "boolean" && pausedFlag !== isPaused()) togglePause(pausedFlag);
				if (typeof overviewFlag === "boolean" && overviewFlag !== overview.isActive()) overview.toggle(overviewFlag);
				overlay.setState(state);
			}
		}
		/**
		* Cues a new automated slide if enabled in the config.
		*/
		function cueAutoSlide() {
			cancelAutoSlide();
			if (currentSlide && config.autoSlide !== false) {
				let fragment = currentSlide.querySelector(".current-fragment[data-autoslide]");
				let fragmentAutoSlide = fragment ? fragment.getAttribute("data-autoslide") : null;
				let parentAutoSlide = currentSlide.parentNode ? currentSlide.parentNode.getAttribute("data-autoslide") : null;
				let slideAutoSlide = currentSlide.getAttribute("data-autoslide");
				if (fragmentAutoSlide) autoSlide = parseInt(fragmentAutoSlide, 10);
				else if (slideAutoSlide) autoSlide = parseInt(slideAutoSlide, 10);
				else if (parentAutoSlide) autoSlide = parseInt(parentAutoSlide, 10);
				else {
					autoSlide = config.autoSlide;
					if (currentSlide.querySelectorAll(".fragment").length === 0) queryAll(currentSlide, "video, audio").forEach((el) => {
						if (el.hasAttribute("data-autoplay")) {
							if (autoSlide && el.duration * 1e3 / el.playbackRate > autoSlide) autoSlide = el.duration * 1e3 / el.playbackRate + 1e3;
						}
					});
				}
				if (autoSlide && !autoSlidePaused && !isPaused() && !overview.isActive() && (!isLastSlide() || fragments.availableRoutes().next || config.loop === true)) {
					autoSlideTimeout = setTimeout(() => {
						if (typeof config.autoSlideMethod === "function") config.autoSlideMethod();
						else navigateNext();
						cueAutoSlide();
					}, autoSlide);
					autoSlideStartTime = Date.now();
				}
				if (autoSlidePlayer) autoSlidePlayer.setPlaying(autoSlideTimeout !== -1);
			}
		}
		/**
		* Cancels any ongoing request to auto-slide.
		*/
		function cancelAutoSlide() {
			clearTimeout(autoSlideTimeout);
			autoSlideTimeout = -1;
		}
		function pauseAutoSlide() {
			if (autoSlide && !autoSlidePaused) {
				autoSlidePaused = true;
				dispatchEvent({ type: "autoslidepaused" });
				clearTimeout(autoSlideTimeout);
				if (autoSlidePlayer) autoSlidePlayer.setPlaying(false);
			}
		}
		function resumeAutoSlide() {
			if (autoSlide && autoSlidePaused) {
				autoSlidePaused = false;
				dispatchEvent({ type: "autoslideresumed" });
				cueAutoSlide();
			}
		}
		function navigateLeft({ skipFragments = false } = {}) {
			navigationHistory.hasNavigatedHorizontally = true;
			if (scrollView.isActive()) return scrollView.prev();
			if (config.rtl) {
				if ((overview.isActive() || skipFragments || fragments.next() === false) && availableRoutes().left) slide(indexh + 1, config.navigationMode === "grid" ? indexv : void 0);
			} else if ((overview.isActive() || skipFragments || fragments.prev() === false) && availableRoutes().left) slide(indexh - 1, config.navigationMode === "grid" ? indexv : void 0);
		}
		function navigateRight({ skipFragments = false } = {}) {
			navigationHistory.hasNavigatedHorizontally = true;
			if (scrollView.isActive()) return scrollView.next();
			if (config.rtl) {
				if ((overview.isActive() || skipFragments || fragments.prev() === false) && availableRoutes().right) slide(indexh - 1, config.navigationMode === "grid" ? indexv : void 0);
			} else if ((overview.isActive() || skipFragments || fragments.next() === false) && availableRoutes().right) slide(indexh + 1, config.navigationMode === "grid" ? indexv : void 0);
		}
		function navigateUp({ skipFragments = false } = {}) {
			if (scrollView.isActive()) return scrollView.prev();
			if ((overview.isActive() || skipFragments || fragments.prev() === false) && availableRoutes().up) slide(indexh, indexv - 1);
		}
		function navigateDown({ skipFragments = false } = {}) {
			navigationHistory.hasNavigatedVertically = true;
			if (scrollView.isActive()) return scrollView.next();
			if ((overview.isActive() || skipFragments || fragments.next() === false) && availableRoutes().down) slide(indexh, indexv + 1);
		}
		/**
		* Navigates backwards, prioritized in the following order:
		* 1) Previous fragment
		* 2) Previous vertical slide
		* 3) Previous horizontal slide
		*/
		function navigatePrev({ skipFragments = false } = {}) {
			if (scrollView.isActive()) return scrollView.prev();
			if (skipFragments || fragments.prev() === false) if (availableRoutes().up) navigateUp({ skipFragments });
			else {
				let previousSlide;
				if (config.rtl) previousSlide = queryAll(dom.wrapper, HORIZONTAL_SLIDES_SELECTOR + ".future").pop();
				else previousSlide = queryAll(dom.wrapper, HORIZONTAL_SLIDES_SELECTOR + ".past").pop();
				if (previousSlide && previousSlide.classList.contains("stack")) {
					let v = previousSlide.querySelectorAll("section").length - 1 || void 0;
					slide(indexh - 1, v);
				} else if (config.rtl) navigateRight({ skipFragments });
				else navigateLeft({ skipFragments });
			}
		}
		/**
		* The reverse of #navigatePrev().
		*/
		function navigateNext({ skipFragments = false } = {}) {
			navigationHistory.hasNavigatedHorizontally = true;
			navigationHistory.hasNavigatedVertically = true;
			if (scrollView.isActive()) return scrollView.next();
			if (skipFragments || fragments.next() === false) {
				let routes = availableRoutes();
				if (routes.down && routes.right && config.loop && isLastVerticalSlide()) routes.down = false;
				if (routes.down) navigateDown({ skipFragments });
				else if (config.rtl) navigateLeft({ skipFragments });
				else navigateRight({ skipFragments });
			}
		}
		/**
		* Called by all event handlers that are based on user
		* input.
		*
		* @param {object} [event]
		*/
		function onUserInput(event) {
			if (config.autoSlideStoppable) pauseAutoSlide();
		}
		/**
		* Listener for post message events posted to this window.
		*/
		function onPostMessage(event) {
			let data = event.data;
			if (typeof data === "string" && data.charAt(0) === "{" && data.charAt(data.length - 1) === "}") {
				data = JSON.parse(data);
				if (data.method && typeof Reveal[data.method] === "function") if (POST_MESSAGE_METHOD_BLACKLIST.test(data.method) === false) {
					const result = Reveal[data.method].apply(Reveal, data.args);
					dispatchPostMessage("callback", {
						method: data.method,
						result
					});
				} else console.warn("reveal.js: \"" + data.method + "\" is is blacklisted from the postMessage API");
			}
		}
		/**
		* Event listener for transition end on the current slide.
		*
		* @param {object} [event]
		*/
		function onTransitionEnd(event) {
			if (transition === "running" && /section/gi.test(event.target.nodeName)) {
				transition = "idle";
				dispatchEvent({
					type: "slidetransitionend",
					data: {
						indexh,
						indexv,
						previousSlide,
						currentSlide
					}
				});
			}
		}
		/**
		* A global listener for all click events inside of the
		* .slides container.
		*
		* @param {object} [event]
		*/
		function onSlidesClicked(event) {
			const anchor = closest(event.target, "a[href^=\"#\"]");
			if (anchor) {
				const hash = anchor.getAttribute("href");
				const indices = location.getIndicesFromHash(hash);
				if (indices) {
					Reveal.slide(indices.h, indices.v, indices.f);
					event.preventDefault();
				}
			}
		}
		/**
		* Handler for the window level 'resize' event.
		*
		* @param {object} [event]
		*/
		function onWindowResize(event) {
			layout();
		}
		/**
		* Handle for the window level 'visibilitychange' event.
		*
		* @param {object} [event]
		*/
		function onPageVisibilityChange(event) {
			if (document.hidden === false && document.activeElement !== document.body) {
				if (typeof document.activeElement.blur === "function") document.activeElement.blur();
				document.body.focus();
			}
		}
		/**
		* Handler for the document level 'fullscreenchange' event.
		*
		* @param {object} [event]
		*/
		function onFullscreenChange(event) {
			if ((document.fullscreenElement || document.webkitFullscreenElement) === dom.wrapper) {
				event.stopImmediatePropagation();
				setTimeout(() => {
					Reveal.layout();
					Reveal.focus.focus();
				}, 1);
			}
		}
		/**
		* Handles click on the auto-sliding controls element.
		*
		* @param {object} [event]
		*/
		function onAutoSlidePlayerClick(event) {
			if (isLastSlide() && config.loop === false) {
				slide(0, 0);
				resumeAutoSlide();
			} else if (autoSlidePaused) resumeAutoSlide();
			else pauseAutoSlide();
		}
		const API = {
			VERSION: version,
			initialize,
			configure,
			destroy,
			sync,
			syncSlide,
			syncFragments: fragments.sync.bind(fragments),
			slide,
			left: navigateLeft,
			right: navigateRight,
			up: navigateUp,
			down: navigateDown,
			prev: navigatePrev,
			next: navigateNext,
			navigateLeft,
			navigateRight,
			navigateUp,
			navigateDown,
			navigatePrev,
			navigateNext,
			navigateFragment: fragments.goto.bind(fragments),
			prevFragment: fragments.prev.bind(fragments),
			nextFragment: fragments.next.bind(fragments),
			on,
			off,
			addEventListener: on,
			removeEventListener: off,
			layout,
			shuffle,
			availableRoutes,
			availableFragments: fragments.availableRoutes.bind(fragments),
			toggleHelp: overlay.toggleHelp.bind(overlay),
			toggleOverview: overview.toggle.bind(overview),
			toggleScrollView: scrollView.toggle.bind(scrollView),
			togglePause,
			toggleAutoSlide,
			toggleJumpToSlide,
			isFirstSlide,
			isLastSlide,
			isLastVerticalSlide,
			isVerticalSlide,
			isVerticalStack,
			isPaused,
			isAutoSliding,
			isSpeakerNotes: notes.isSpeakerNotesWindow.bind(notes),
			isOverview: overview.isActive.bind(overview),
			isFocused: focus.isFocused.bind(focus),
			isOverlayOpen: overlay.isOpen.bind(overlay),
			isScrollView: scrollView.isActive.bind(scrollView),
			isPrintView: printView.isActive.bind(printView),
			isReady: () => ready,
			loadSlide: slideContent.load.bind(slideContent),
			unloadSlide: slideContent.unload.bind(slideContent),
			startEmbeddedContent: () => slideContent.startEmbeddedContent(currentSlide),
			stopEmbeddedContent: () => slideContent.stopEmbeddedContent(currentSlide, { unloadIframes: false }),
			previewIframe: overlay.previewIframe.bind(overlay),
			previewImage: overlay.previewImage.bind(overlay),
			previewVideo: overlay.previewVideo.bind(overlay),
			showPreview: overlay.previewIframe.bind(overlay),
			hidePreview: overlay.close.bind(overlay),
			addEventListeners,
			removeEventListeners,
			dispatchEvent,
			getState,
			setState,
			getProgress,
			getIndices,
			getSlidesAttributes,
			getSlidePastCount,
			getTotalSlides,
			getSlide,
			getPreviousSlide: () => previousSlide,
			getCurrentSlide: () => currentSlide,
			getSlideBackground,
			getSlideNotes: notes.getSlideNotes.bind(notes),
			getSlides,
			getHorizontalSlides,
			getVerticalSlides,
			hasHorizontalSlides,
			hasVerticalSlides,
			hasNavigatedHorizontally: () => navigationHistory.hasNavigatedHorizontally,
			hasNavigatedVertically: () => navigationHistory.hasNavigatedVertically,
			shouldAutoAnimateBetween,
			addKeyBinding: keyboard.addKeyBinding.bind(keyboard),
			removeKeyBinding: keyboard.removeKeyBinding.bind(keyboard),
			triggerKey: keyboard.triggerKey.bind(keyboard),
			registerKeyboardShortcut: keyboard.registerKeyboardShortcut.bind(keyboard),
			getComputedSlideSize,
			setCurrentScrollPage,
			removeHiddenSlides,
			getScale: () => scale,
			getConfig: () => config,
			getQueryHash,
			getSlidePath: location.getHash.bind(location),
			getRevealElement: () => revealElement,
			getSlidesElement: () => dom.slides,
			getViewportElement: () => dom.viewport,
			getBackgroundsElement: () => backgrounds.element,
			registerPlugin: plugins.registerPlugin.bind(plugins),
			hasPlugin: plugins.hasPlugin.bind(plugins),
			getPlugin: plugins.getPlugin.bind(plugins),
			getPlugins: plugins.getRegisteredPlugins.bind(plugins)
		};
		extend(Reveal, _objectSpread2(_objectSpread2({}, API), {}, {
			announceStatus,
			getStatusText,
			focus,
			scroll: scrollView,
			progress,
			controls,
			location,
			overview,
			keyboard,
			fragments,
			backgrounds,
			slideContent,
			slideNumber,
			onUserInput,
			closeOverlay: overlay.close.bind(overlay),
			updateSlidesVisibility,
			layoutSlideContents,
			transformSlides,
			cueAutoSlide,
			cancelAutoSlide
		}));
		return API;
	}
	//#endregion
	//#region js/index.ts
	/**
	* Expose the Reveal class to the window. To create a
	* new instance:
	* let deck = new Reveal( document.querySelector( '.reveal' ), {
	*   controls: false
	* } );
	* deck.initialize().then(() => {
	*   // reveal.js is ready
	* });
	*/
	var Reveal = reveal_default;
	var enqueuedAPICalls = [];
	Reveal.initialize = (options) => {
		const revealElement = document.querySelector(".reveal");
		if (!(revealElement instanceof HTMLElement)) throw new Error("Unable to find presentation root (<div class=\"reveal\">).");
		Object.assign(Reveal, new reveal_default(revealElement, options));
		enqueuedAPICalls.map((method) => method(Reveal));
		return Reveal.initialize();
	};
	/**
	* The pre 4.0 API let you add event listener before
	* initializing. We maintain the same behavior by
	* queuing up premature API calls and invoking all
	* of them when Reveal.initialize is called.
	*/
	[
		"configure",
		"on",
		"off",
		"addEventListener",
		"removeEventListener",
		"registerPlugin"
	].forEach((method) => {
		Reveal[method] = (...args) => {
			enqueuedAPICalls.push((deck) => deck[method].call(null, ...args));
		};
	});
	Reveal.isReady = () => false;
	Reveal.VERSION = version;
	//#endregion
	return Reveal;
});
