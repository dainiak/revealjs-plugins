/*
    A mod of compiled https://github.com/Martinomagnifico/reveal.js-appearance
    Version 1.4.0.mod
 */

(function(global, factory) {
  typeof exports === "object" && typeof module !== "undefined" ? module.exports = factory() : typeof define === "function" && define.amd ? define(factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, global.Appearance = factory());
})(this, (function() {
  "use strict";var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

  var _a, _b;
  var _documentCurrentScript = typeof document !== "undefined" ? document.currentScript : null;
  function getDefaultExportFromCjs(x) {
    return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
  }
  __name(getDefaultExportFromCjs, "getDefaultExportFromCjs");
  var cjs;
  var hasRequiredCjs;
  function requireCjs() {
    if (hasRequiredCjs) return cjs;
    hasRequiredCjs = 1;
    var isMergeableObject = /* @__PURE__ */ __name(function isMergeableObject2(value) {
      return isNonNullObject(value) && !isSpecial(value);
    }, "isMergeableObject");
    function isNonNullObject(value) {
      return !!value && typeof value === "object";
    }
    __name(isNonNullObject, "isNonNullObject");
    function isSpecial(value) {
      var stringValue = Object.prototype.toString.call(value);
      return stringValue === "[object RegExp]" || stringValue === "[object Date]" || isReactElement(value);
    }
    __name(isSpecial, "isSpecial");
    var canUseSymbol = typeof Symbol === "function" && Symbol.for;
    var REACT_ELEMENT_TYPE = canUseSymbol ? /* @__PURE__ */ Symbol.for("react.element") : 60103;
    function isReactElement(value) {
      return value.$$typeof === REACT_ELEMENT_TYPE;
    }
    __name(isReactElement, "isReactElement");
    function emptyTarget(val) {
      return Array.isArray(val) ? [] : {};
    }
    __name(emptyTarget, "emptyTarget");
    function cloneUnlessOtherwiseSpecified(value, options) {
      return options.clone !== false && options.isMergeableObject(value) ? deepmerge2(emptyTarget(value), value, options) : value;
    }
    __name(cloneUnlessOtherwiseSpecified, "cloneUnlessOtherwiseSpecified");
    function defaultArrayMerge(target, source, options) {
      return target.concat(source).map(function(element) {
        return cloneUnlessOtherwiseSpecified(element, options);
      });
    }
    __name(defaultArrayMerge, "defaultArrayMerge");
    function getMergeFunction(key, options) {
      if (!options.customMerge) {
        return deepmerge2;
      }
      var customMerge = options.customMerge(key);
      return typeof customMerge === "function" ? customMerge : deepmerge2;
    }
    __name(getMergeFunction, "getMergeFunction");
    function getEnumerableOwnPropertySymbols(target) {
      return Object.getOwnPropertySymbols ? Object.getOwnPropertySymbols(target).filter(function(symbol) {
        return Object.propertyIsEnumerable.call(target, symbol);
      }) : [];
    }
    __name(getEnumerableOwnPropertySymbols, "getEnumerableOwnPropertySymbols");
    function getKeys(target) {
      return Object.keys(target).concat(getEnumerableOwnPropertySymbols(target));
    }
    __name(getKeys, "getKeys");
    function propertyIsOnObject(object, property) {
      try {
        return property in object;
      } catch (_) {
        return false;
      }
    }
    __name(propertyIsOnObject, "propertyIsOnObject");
    function propertyIsUnsafe(target, key) {
      return propertyIsOnObject(target, key) && !(Object.hasOwnProperty.call(target, key) && Object.propertyIsEnumerable.call(target, key));
    }
    __name(propertyIsUnsafe, "propertyIsUnsafe");
    function mergeObject(target, source, options) {
      var destination = {};
      if (options.isMergeableObject(target)) {
        getKeys(target).forEach(function(key) {
          destination[key] = cloneUnlessOtherwiseSpecified(target[key], options);
        });
      }
      getKeys(source).forEach(function(key) {
        if (propertyIsUnsafe(target, key)) {
          return;
        }
        if (propertyIsOnObject(target, key) && options.isMergeableObject(source[key])) {
          destination[key] = getMergeFunction(key, options)(target[key], source[key], options);
        } else {
          destination[key] = cloneUnlessOtherwiseSpecified(source[key], options);
        }
      });
      return destination;
    }
    __name(mergeObject, "mergeObject");
    function deepmerge2(target, source, options) {
      options = options || {};
      options.arrayMerge = options.arrayMerge || defaultArrayMerge;
      options.isMergeableObject = options.isMergeableObject || isMergeableObject;
      options.cloneUnlessOtherwiseSpecified = cloneUnlessOtherwiseSpecified;
      var sourceIsArray = Array.isArray(source);
      var targetIsArray = Array.isArray(target);
      var sourceAndTargetTypesMatch = sourceIsArray === targetIsArray;
      if (!sourceAndTargetTypesMatch) {
        return cloneUnlessOtherwiseSpecified(source, options);
      } else if (sourceIsArray) {
        return options.arrayMerge(target, source, options);
      } else {
        return mergeObject(target, source, options);
      }
    }
    __name(deepmerge2, "deepmerge");
    deepmerge2.all = /* @__PURE__ */ __name(function deepmergeAll(array, options) {
      if (!Array.isArray(array)) {
        throw new Error("first argument should be an array");
      }
      return array.reduce(function(prev, next) {
        return deepmerge2(prev, next, options);
      }, {});
    }, "deepmergeAll");
    var deepmerge_1 = deepmerge2;
    cjs = deepmerge_1;
    return cjs;
  }
  __name(requireCjs, "requireCjs");
  var cjsExports = requireCjs();
  const deepmerge = /* @__PURE__ */ getDefaultExportFromCjs(cjsExports);
  var __defProp2 = Object.defineProperty;
  var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
  let cachedEnv = null;
  const detectEnvironment = /* @__PURE__ */ __name2(() => {
    if (cachedEnv) return cachedEnv;
    const hasWindow = typeof window !== "undefined";
    const hasDocument = typeof document !== "undefined";
    let hasHMR = false;
    try {
      const webpackHMR = new Function('return typeof module !== "undefined" && !!module.hot')();
      const viteHMR = new Function('return typeof import.meta !== "undefined" && !!import.meta.hot')();
      hasHMR = webpackHMR || viteHMR;
    } catch (e) {
    }
    let isViteDev = false;
    try {
      isViteDev = new Function('return typeof import.meta !== "undefined" && import.meta.env?.DEV === true')();
    } catch (e) {
    }
    const isDevelopment = hasHMR || isViteDev;
    cachedEnv = {
      isDevelopment,
      hasHMR,
      isViteDev,
      hasWindow,
      hasDocument
    };
    return cachedEnv;
  }, "detectEnvironment");
  const _PluginBase = (_a = class {
    defaultConfig;
    pluginInit;
    pluginId;
    mergedConfig = null;
    userConfigData = null;
    /** Public data storage for plugin state */
    data = {};
    // Create a new plugin instance
    constructor(idOrOptions, init2, defaultConfig2) {
      if (typeof idOrOptions === "string") {
        this.pluginId = idOrOptions;
        this.pluginInit = init2;
        this.defaultConfig = defaultConfig2 || {};
      } else {
        this.pluginId = idOrOptions.id;
        this.pluginInit = idOrOptions.init;
        this.defaultConfig = idOrOptions.defaultConfig || {};
      }
    }
    // Initialize plugin configuration by merging default and user settings
    initializeConfig(deck) {
      const baseConfig = this.defaultConfig;
      const revealConfig = deck.getConfig();
      const userConfig = revealConfig[this.pluginId] || {};
      this.userConfigData = userConfig;
      this.mergedConfig = deepmerge(baseConfig, userConfig, {
        arrayMerge: /* @__PURE__ */ __name2((_, sourceArray) => sourceArray, "arrayMerge"),
        clone: true
      });
    }
    // Get the current plugin configuration
    getCurrentConfig() {
      if (!this.mergedConfig) {
        throw new Error("Plugin configuration has not been initialized");
      }
      return this.mergedConfig;
    }
    // Get plugin data if any exists
    getData() {
      return Object.keys(this.data).length > 0 ? this.data : void 0;
    }
    get userConfig() {
      return this.userConfigData || {};
    }
    // Gets information about the current JavaScript environment
    getEnvironmentInfo = /* @__PURE__ */ __name2(() => {
      return detectEnvironment();
    }, "getEnvironmentInfo");
    // Initialize the plugin
    init(deck) {
      this.initializeConfig(deck);
      if (this.pluginInit) {
        return this.pluginInit(this, deck, this.getCurrentConfig());
      }
    }
    // Create the plugin interface containing all exports
    createInterface(additionalExports = {}) {
      const exports$1 = {
        id: this.pluginId,
        init: /* @__PURE__ */ __name2((deck) => this.init(deck), "init"),
        getConfig: /* @__PURE__ */ __name2(() => this.getCurrentConfig(), "getConfig"),
        getData: /* @__PURE__ */ __name2(() => this.getData(), "getData"),
        ...additionalExports
      };
      return exports$1;
    }
  }, __name(_a, "_PluginBase2"), _a);
  __name2(_PluginBase, "PluginBase");
  let PluginBase = _PluginBase;
  const findPluginScriptPath = /* @__PURE__ */ __name2((pluginId) => {
    const scriptElement = document.querySelector(
      `script[src$="${pluginId}.js"], script[src$="${pluginId}.min.js"], script[src$="${pluginId}.mjs"]`
    );
    if (scriptElement?.src) {
      const scriptSrc = scriptElement.getAttribute("src") || "";
      const lastSlash = scriptSrc.lastIndexOf("/");
      if (lastSlash !== -1) {
        return scriptSrc.substring(0, lastSlash + 1);
      }
    }
    try {
      if (typeof { url: typeof document === "undefined" && typeof location === "undefined" ? require("url").pathToFileURL(__filename).href : typeof document === "undefined" ? location.href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("plugin/appearance/appearance.js", document.baseURI).href } !== "undefined" && (typeof document === "undefined" && typeof location === "undefined" ? require("url").pathToFileURL(__filename).href : typeof document === "undefined" ? location.href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("plugin/appearance/appearance.js", document.baseURI).href)) {
        return (typeof document === "undefined" && typeof location === "undefined" ? require("url").pathToFileURL(__filename).href : typeof document === "undefined" ? location.href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("plugin/appearance/appearance.js", document.baseURI).href).slice(0, (typeof document === "undefined" && typeof location === "undefined" ? require("url").pathToFileURL(__filename).href : typeof document === "undefined" ? location.href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("plugin/appearance/appearance.js", document.baseURI).href).lastIndexOf("/") + 1);
      }
    } catch (e) {
    }
    return `plugin/${pluginId}/`;
  }, "findPluginScriptPath");
  const CSS_ID_ATTR = "data-css-id";
  const linkAndLoad = /* @__PURE__ */ __name2((pluginId, path) => {
    return new Promise((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = path;
      link.setAttribute(CSS_ID_ATTR, pluginId);
      const timeout = setTimeout(() => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
        reject(new Error(`[${pluginId}] Timeout loading CSS from: ${path}`));
      }, 5e3);
      link.onload = () => {
        clearTimeout(timeout);
        resolve();
      };
      link.onerror = () => {
        clearTimeout(timeout);
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
        reject(new Error(`[${pluginId}] Failed to load CSS from: ${path}`));
      };
      document.head.appendChild(link);
    });
  }, "linkAndLoad");
  const isCssLoaded = /* @__PURE__ */ __name2((pluginId) => {
    const existingLinks = document.querySelectorAll(`[${CSS_ID_ATTR}="${pluginId}"]`);
    return existingLinks.length > 0;
  }, "isCssLoaded");
  const isCssImported = /* @__PURE__ */ __name2((pluginId) => {
    return new Promise((resolve) => {
      if (checkCssLoaded()) {
        return resolve(true);
      }
      setTimeout(() => {
        resolve(checkCssLoaded());
      }, 50);
      function checkCssLoaded() {
        const hasLinkTag = isCssLoaded(pluginId);
        if (hasLinkTag) return true;
        try {
          const rootStyle = window.getComputedStyle(document.documentElement);
          const customProp = rootStyle.getPropertyValue(`--cssimported-${pluginId}`);
          return customProp.trim() !== "";
        } catch (e) {
          return false;
        }
      }
      __name(checkCssLoaded, "checkCssLoaded");
      __name2(checkCssLoaded, "checkCssLoaded");
    });
  }, "isCssImported");
  const pluginCSS_original = /* @__PURE__ */ __name2(async (options) => {
    const { id, cssautoload = true, csspath = "", debug = false } = options;
    if (cssautoload === false || csspath === false) return;
    if (isCssLoaded(id) && !(typeof csspath === "string" && csspath.trim() !== "")) {
      debug && console.log(`[${id}] CSS is already loaded, skipping`);
      return;
    }
    if (isCssLoaded(id) && (typeof csspath === "string" && csspath.trim() !== "")) {
      debug && console.log(`[${id}] CSS is already loaded, also loading user-specified path: ${csspath}`);
    }
    const paths = [];
    if (typeof csspath === "string" && csspath.trim() !== "") {
      paths.push(csspath);
    }
    const scriptPath = findPluginScriptPath(id);
    if (scriptPath) {
      const autoPath = `${scriptPath}${id}.css`;
      paths.push(autoPath);
    }
    const standardPath = `plugin/${id}/${id}.css`;
    paths.push(standardPath);
    for (const path of paths) {
      try {
        await linkAndLoad(id, path);
        let pathType = "CSS";
        if (csspath && path === csspath) {
          pathType = "user-specified CSS";
        } else if (scriptPath && path === `${scriptPath}${id}.css`) {
          pathType = "CSS (auto-detected from script location)";
        } else {
          pathType = "CSS (standard fallback)";
        }
        debug && console.log(`[${id}] ${pathType} loaded successfully from: ${path}`);
        return;
      } catch (error) {
        debug && console.log(`[${id}] Failed to load CSS from: ${path}`);
      }
    }
    console.warn(`[${id}] Could not load CSS from any location`);
  }, "pluginCSS_original");
  async function pluginCSS(firstParam, config) {
    if ("getEnvironmentInfo" in firstParam && config) {
      const plugin = firstParam;
      const env = plugin.getEnvironmentInfo();
      const cssAlreadyImported = await isCssImported(plugin.pluginId);
      if (cssAlreadyImported && !(typeof config.csspath === "string" && config.csspath.trim() !== "")) {
        config.debug && console.log(`[${plugin.pluginId}] CSS is already imported, skipping`);
        return;
      }
      const cssAutoloadExplicitlySet = "cssautoload" in plugin.userConfig;
      const shouldAutoloadCSS = cssAutoloadExplicitlySet ? !!config.cssautoload : !env.isDevelopment;
      if (shouldAutoloadCSS) {
        return pluginCSS_original({
          id: plugin.pluginId,
          cssautoload: true,
          csspath: config.csspath,
          debug: config.debug
        });
      }
      if (env.isDevelopment) {
        console.warn(
          `[${plugin.pluginId}] CSS autoloading is disabled in bundler environments. Please import the CSS manually, using import.`
        );
      }
      return;
    }
    return pluginCSS_original(firstParam);
  }
  __name(pluginCSS, "pluginCSS");
  __name2(pluginCSS, "pluginCSS");
  const _PluginDebug = (_b = class {
    // Flag to enable/disable all debugging output
    debugMode = false;
    // Label to prefix all debug messages with
    label = "DEBUG";
    // Tracks the current depth of console groups for proper formatting
    groupDepth = 0;
    // Initializes the debug utility with custom settings.
    initialize(isDebug, label = "DEBUG") {
      this.debugMode = isDebug;
      this.label = label;
    }
    // Creates a new console group and tracks the group depth. 
    // Groups will always display the label prefix in their header.
    group = /* @__PURE__ */ __name2((...args) => {
      this.debugLog("group", ...args);
      this.groupDepth++;
    }, "group");
    // Creates a new collapsed console group and tracks the group depth.
    groupCollapsed = /* @__PURE__ */ __name2((...args) => {
      this.debugLog("groupCollapsed", ...args);
      this.groupDepth++;
    }, "groupCollapsed");
    // Ends the current console group and updates the group depth tracker.
    groupEnd = /* @__PURE__ */ __name2(() => {
      if (this.groupDepth > 0) {
        this.groupDepth--;
        this.debugLog("groupEnd");
      }
    }, "groupEnd");
    // Formats and logs an error message with the debug label. 
    // Error messages are always shown, even when debug mode is disabled.
    error = /* @__PURE__ */ __name2((...args) => {
      const currentDebugMode = this.debugMode;
      this.debugMode = true;
      this.formatAndLog(console.error, args);
      this.debugMode = currentDebugMode;
    }, "error");
    // Displays a table in the console with the pluginDebug label.
    // Special implementation for console.table to handle tabular data properly.
    // @param messageOrData - Either a message string or the tabular data
    // @param propertiesOrData - Either property names or tabular data (if first param was message)
    // @param optionalProperties - Optional property names (if first param was message)
    table = /* @__PURE__ */ __name2((messageOrData, propertiesOrData, optionalProperties) => {
      if (!this.debugMode) return;
      try {
        if (typeof messageOrData === "string" && propertiesOrData !== void 0 && typeof propertiesOrData !== "string") {
          if (this.groupDepth === 0) {
            console.log(`[${this.label}]: ${messageOrData}`);
          } else {
            console.log(messageOrData);
          }
          if (optionalProperties) {
            console.table(propertiesOrData, optionalProperties);
          } else {
            console.table(propertiesOrData);
          }
        } else {
          if (this.groupDepth === 0) {
            console.log(`[${this.label}]: Table data`);
          }
          if (typeof propertiesOrData === "object" && Array.isArray(propertiesOrData)) {
            console.table(messageOrData, propertiesOrData);
          } else {
            console.table(messageOrData);
          }
        }
      } catch (error) {
        console.error(`[${this.label}]: Error showing table:`, error);
        console.log(`[${this.label}]: Raw data:`, messageOrData);
      }
    }, "table");
    // Helper method that formats and logs messages with the pluginDebug label.
    // @param logMethod - The console method to use for logging
    // @param args - Arguments to pass to the console method
    formatAndLog = /* @__PURE__ */ __name2((logMethod, args) => {
      if (!this.debugMode) return;
      try {
        if (this.groupDepth > 0) {
          logMethod.call(console, ...args);
        } else {
          if (args.length > 0 && typeof args[0] === "string") {
            logMethod.call(console, `[${this.label}]: ${args[0]}`, ...args.slice(1));
          } else {
            logMethod.call(console, `[${this.label}]:`, ...args);
          }
        }
      } catch (error) {
        console.error(`[${this.label}]: Error in logging:`, error);
        console.log(`[${this.label}]: Original log data:`, ...args);
      }
    }, "formatAndLog");
    // Core method that handles calling console methods with proper formatting.
    // - Adds label prefix to messages outside of groups
    // - Skips label prefix for messages inside groups to avoid redundancy
    // - Always adds label prefix to group headers
    // - Error messages are always shown regardless of debug mode
    // @param methodName - Name of the console method to call
    // @param args - Arguments to pass to the console method
    debugLog(methodName, ...args) {
      const method = console[methodName];
      if (!this.debugMode && methodName !== "error" || typeof method !== "function") return;
      const typedMethod = method;
      if (methodName === "group" || methodName === "groupCollapsed") {
        if (args.length > 0 && typeof args[0] === "string") {
          typedMethod.call(console, `[${this.label}]: ${args[0]}`, ...args.slice(1));
        } else {
          typedMethod.call(console, `[${this.label}]:`, ...args);
        }
        return;
      }
      if (methodName === "groupEnd") {
        typedMethod.call(console);
        return;
      }
      if (methodName === "table") {
        if (args.length === 1) {
          this.table(args[0]);
        } else if (args.length === 2) {
          if (typeof args[0] === "string") {
            this.table(args[0], args[1]);
          } else {
            this.table(args[0], args[1]);
          }
        } else if (args.length >= 3) {
          this.table(
            args[0],
            args[1],
            args[2]
          );
        }
        return;
      }
      if (this.groupDepth > 0) {
        typedMethod.call(console, ...args);
      } else {
        if (args.length > 0 && typeof args[0] === "string") {
          typedMethod.call(console, `[${this.label}]: ${args[0]}`, ...args.slice(1));
        } else {
          typedMethod.call(console, `[${this.label}]:`, ...args);
        }
      }
    }
  }, __name(_b, "_PluginDebug2"), _b);
  __name2(_PluginDebug, "PluginDebug");
  let PluginDebug = _PluginDebug;
  const createDebugProxy = /* @__PURE__ */ __name2((debugInstance) => new Proxy(debugInstance, {
    get: /* @__PURE__ */ __name2((target, prop) => {
      if (prop in target) {
        return target[prop];
      }
      const propString = prop.toString();
      if (typeof console[propString] === "function") {
        return (...args) => {
          target.debugLog(propString, ...args);
        };
      }
      return void 0;
    }, "get")
  }), "createDebugProxy");
  const pluginDebug = createDebugProxy(new PluginDebug());
  var SectionType = /* @__PURE__ */ ((SectionType2) => {
    SectionType2["HORIZONTAL"] = "horizontal";
    SectionType2["STACK"] = "stack";
    SectionType2["VERTICAL"] = "vertical";
    SectionType2["INVALID"] = "invalid";
    return SectionType2;
  })(SectionType || {});
  const isSection = /* @__PURE__ */ __name2((element) => {
    return element instanceof HTMLElement && element.tagName === "SECTION";
  }, "isSection");
  const isStack = /* @__PURE__ */ __name2((element) => {
    if (!isSection(element)) return false;
    return Array.from(element.children).some(
      (child) => child instanceof HTMLElement && child.tagName === "SECTION"
    );
  }, "isStack");
  const isVertical = /* @__PURE__ */ __name2((element) => {
    if (!isSection(element)) return false;
    return element.parentElement instanceof HTMLElement && element.parentElement.tagName === "SECTION";
  }, "isVertical");
  const isHorizontal = /* @__PURE__ */ __name2((element) => {
    return isSection(element) && !isVertical(element) && !isStack(element);
  }, "isHorizontal");
  const getStack = /* @__PURE__ */ __name2((element) => {
    if (!isSection(element)) return null;
    if (isVertical(element)) {
      const parent = element.parentElement;
      if (parent instanceof HTMLElement && isStack(parent)) {
        return parent;
      }
    }
    return null;
  }, "getStack");
  const getSectionType = /* @__PURE__ */ __name2((element) => {
    if (!isSection(element)) return "invalid";
    if (isVertical(element)) return "vertical";
    if (isStack(element)) return "stack";
    return "horizontal";
  }, "getSectionType");
  const sectionTools = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    SectionType,
    getSectionType,
    getStack,
    isHorizontal,
    isSection,
    isStack,
    isVertical
  }, Symbol.toStringTag, { value: "Module" }));
  const defaultConfig = {
    baseclass: "animate__animated",
    hideagain: true,
    delay: 300,
    appearevent: "slidetransitionend",
    autoappear: false,
    autoelements: false,
    appearparents: false,
    initdelay: 0,
    cssautoload: true,
    csspath: "",
    compatibility: false,
    compatibilitybaseclass: "animated"
  };
  function initConsts(baseclass, compatibilitybaseclass, compatibility) {
    const consts = {
      baseclass,
      compatibilitybaseclass,
      fragmentSelector: ".fragment",
      fragmentClass: "fragment",
      speedClasses: ["slower", "slow", "fast", "faster"],
      animatecss: '[class^="animate__"],[class*=" animate__"]',
      eventnames: [
        "ready",
        "slidechanged",
        "slidetransitionend",
        "autoanimate",
        "overviewhidden"
      ]
    };
    consts.speedClasses = [
      ...consts.speedClasses,
      ...consts.speedClasses.map((speed) => `animate__${speed}`)
    ];
    if (compatibility) {
      consts.animatecss = ".backInDown, .backInLeft, .backInRight, .backInUp, .bounceIn, .bounceInDown, .bounceInLeft, .bounceInRight, .bounceInUp, .fadeIn, .fadeInDown, .fadeInDownBig, .fadeInLeft, .fadeInLeftBig, .fadeInRight, .fadeInRightBig, .fadeInUp, .fadeInUpBig, .fadeInTopLeft, .fadeInTopRight, .fadeInBottomLeft, .fadeInBottomRight, .flipInX, .flipInY, .lightSpeedInRight, .lightSpeedInLeft, .rotateIn, .rotateInDownLeft, .rotateInDownRight, .rotateInUpLeft, .rotateInUpRight, .jackInTheBox, .rollIn, .zoomIn, .zoomInDown, .zoomInLeft, .zoomInRight, .zoomInUp, .slideInDown, .slideInLeft, .slideInRight, .slideInUp, .skidLeft, .skidLeftBig, .skidRight, .skidRightBig, .shrinkIn, .shrinkInBlur";
      consts.baseclass = compatibilitybaseclass;
    }
    return consts;
  }
  __name(initConsts, "initConsts");
  const isJSON = /* @__PURE__ */ __name((str) => {
    try {
      return JSON.parse(str) && !!str;
    } catch (_e) {
      return false;
    }
  }, "isJSON");
  const toJSONString = /* @__PURE__ */ __name((str) => {
    if (str == null) {
      return "";
    }
    let JSONString = "";
    let modifiedStr = str;
    if (typeof modifiedStr === "string") {
      modifiedStr = modifiedStr.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
    }
    if (isJSON(str)) {
      JSONString = str;
    } else if (typeof str === "object") {
      JSONString = JSON.stringify(str, null, 2);
    } else if (typeof str === "string") {
      JSONString = str.trim().replace(/'/g, '"').charAt(0) === "{" ? str.trim().replace(/'/g, '"') : `{${str.trim().replace(/'/g, '"')}}`;
    }
    return JSONString;
  }, "toJSONString");
  const copyDataAttributes = /* @__PURE__ */ __name((source, target, not) => {
    for (const attr of Array.from(source.attributes)) {
      if (attr.nodeName.startsWith("data") && attr.nodeName !== not) {
        target.setAttribute(attr.nodeName, attr.nodeValue || "");
      }
    }
  }, "copyDataAttributes");
  const decodeHtmlEntities = /* @__PURE__ */ __name((str) => {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = str;
    return textarea.value;
  }, "decodeHtmlEntities");
  const normalizeQuotes = /* @__PURE__ */ __name((str) => {
    return str.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
  }, "normalizeQuotes");
  const parseAutoElements = /* @__PURE__ */ __name((input, isFromAttribute = false) => {
    if (!input) return null;
    if (typeof input === "object" && input !== null && !Array.isArray(input)) {
      return input;
    }
    if (typeof input === "boolean") {
      return null;
    }
    if (typeof input === "string") {
      try {
        let processedString = input;
        if (isFromAttribute) {
          processedString = normalizeQuotes(decodeHtmlEntities(input));
        }
        return JSON.parse(toJSONString(processedString));
      } catch (e) {
        pluginDebug.log(`Error parsing autoelements: ${e} (${input})`);
        return null;
      }
    }
    return null;
  }, "parseAutoElements");
  const isAnimationObject = /* @__PURE__ */ __name((obj) => typeof obj === "object" && obj !== null, "isAnimationObject");
  const addAutoAnimation = /* @__PURE__ */ __name((section, options, appearances) => {
    let sectionAutoSelectors = null;
    let globalAutoelements = null;
    if (options.autoappear && options.autoelements) {
      globalAutoelements = parseAutoElements(options.autoelements, false);
    }
    if (section instanceof HTMLElement && section.hasAttribute("data-autoappear")) {
      const sectDataAppear = section.dataset.autoappear;
      const isDefaultAutoAppear = sectDataAppear === "auto" || sectDataAppear === "" || sectDataAppear === "true";
      if (isDefaultAutoAppear) {
        sectionAutoSelectors = globalAutoelements;
      } else {
        const localAutoelements = parseAutoElements(sectDataAppear || "", true);
        if (globalAutoelements && localAutoelements) {
          sectionAutoSelectors = { ...globalAutoelements, ...localAutoelements };
        } else if (localAutoelements) {
          sectionAutoSelectors = localAutoelements;
        } else {
          sectionAutoSelectors = globalAutoelements;
        }
      }
    } else if (globalAutoelements) {
      sectionAutoSelectors = globalAutoelements;
    }
    if (!sectionAutoSelectors) return;
    try {
      const elementsToAnimate = JSON.parse(toJSONString(sectionAutoSelectors));
      for (const [selector, animConfig] of Object.entries(elementsToAnimate)) {
        const elements = Array.from(section.querySelectorAll(selector)).filter((element) => {
          if (appearances.includes(element)) return false;
          for (const appearance of appearances) {
            if (appearance.contains(element) && appearance !== element) {
              return false;
            }
          }
          return true;
        });
        if (elements.length === 0) continue;
        let lastContainer = null;
        let containerIndex = 0;
        for (let index2 = 0; index2 < elements.length; index2++) {
          const element = elements[index2];
          const currentContainer = element.parentElement;
          if (currentContainer !== lastContainer) {
            lastContainer = currentContainer;
            containerIndex = 0;
          }
          appearances.push(element);
          let newClasses = [];
          let newDelay = null;
          let speedClass = false;
          let elementSplit = null;
          let containerDelay = null;
          if (Array.isArray(animConfig)) {
            newClasses = String(animConfig[0]).split(/[ ,]+/);
            newDelay = animConfig[1] !== void 0 ? String(animConfig[1]) : null;
          } else if (typeof animConfig === "string") {
            newClasses = animConfig.split(/[ ,]+/);
          } else if (isAnimationObject(animConfig)) {
            if (animConfig.class || animConfig.animation) {
              const animationClass = animConfig.animation || animConfig.class;
              newClasses = String(animationClass).split(/[ ,]+/);
            }
            if (animConfig.speed) {
              speedClass = String(animConfig.speed);
              if (!speedClass.includes("animate__")) {
                speedClass = `animate__${speedClass}`;
              }
            }
            if (animConfig.delay !== void 0) {
              newDelay = String(animConfig.delay);
            }
            if (animConfig.split !== void 0) {
              elementSplit = String(animConfig.split);
            }
            if (animConfig["container-delay"] !== void 0) {
              containerDelay = String(animConfig["container-delay"]);
            }
          }
          if (newClasses.length > 0) {
            element.classList.add(...newClasses);
          }
          if (speedClass) {
            element.classList.add(speedClass);
          }
          if (element instanceof HTMLElement) {
            if (elementSplit) {
              if (newDelay) {
                element.dataset.delay = newDelay;
              }
              if (containerDelay) {
                element.dataset.containerDelay = containerDelay;
              }
              element.dataset.split = elementSplit;
            } else {
              if (containerDelay && containerIndex === 0) {
                element.dataset.delay = containerDelay;
              } else if (newDelay && containerIndex > 0 && !element.dataset.delay) {
                element.dataset.delay = newDelay;
              }
            }
          }
          containerIndex++;
        }
      }
    } catch (error) {
      pluginDebug.log(options, `Error processing auto animations: ${error}`);
    }
  }, "addAutoAnimation");
  function addBaseClass(appearance, consts) {
    if (!appearance.classList.contains(consts.baseclass)) {
      appearance.classList.add(consts.baseclass);
    }
    if (appearance.classList.contains(consts.fragmentClass)) {
      appearance.classList.add("custom");
    }
  }
  __name(addBaseClass, "addBaseClass");
  function addDelay(appearanceArray, options) {
    let delay = 0;
    appearanceArray.forEach((appearance, index2) => {
      if (appearance instanceof HTMLElement && appearance.style.animationDelay) {
        return;
      }
      if (index2 === 0 && appearance instanceof HTMLElement && appearance.dataset.delay || index2 !== 0) {
        let elementDelay = options.delay;
        if (appearance instanceof HTMLElement && appearance.dataset && appearance.dataset.delay) {
          const parsedDelay = Number.parseInt(appearance.dataset.delay, 10);
          if (!Number.isNaN(parsedDelay)) {
            elementDelay = parsedDelay;
          }
        }
        delay = delay + elementDelay;
        if (appearance instanceof HTMLElement) {
          appearance.style.setProperty("animation-delay", `${delay}ms`);
          appearance.removeAttribute("data-delay");
        }
      }
    });
  }
  __name(addDelay, "addDelay");
  function convertToSpans(parent, kind) {
    let splitElements = false;
    let joinChar = " ";
    if (!parent.textContent?.trim()) return;
    if (kind === "words") {
      splitElements = parent.textContent.trim().split(/\s+/) || [];
    } else if (kind === "letters") {
      splitElements = parent.textContent.trim().split("") || [];
      joinChar = "";
    }
    if (splitElements && splitElements.length > 0) {
      const parentAnimateClasses = Array.from(parent.classList).filter(
        (className) => className.startsWith("animate__")
      );
      const newHtml = splitElements.map((element, index2) => {
        const span = document.createElement("span");
        span.textContent = element === " " ? " " : element;
        if (parent.dataset.delay && index2 !== 0) {
          span.dataset.delay = parent.dataset.delay;
        }
        if (parent.dataset.containerDelay && index2 === 0) {
          span.dataset.delay = parent.dataset.containerDelay;
        }
        for (let i = 0; i < parentAnimateClasses.length; i++) {
          span.classList.add(parentAnimateClasses[i]);
        }
        return span.outerHTML;
      }).join(joinChar);
      parent.classList.add("wordchargroup");
      for (let i = 0; i < parentAnimateClasses.length; i++) {
        parent.classList.remove(parentAnimateClasses[i]);
      }
      parent.removeAttribute("data-delay");
      parent.removeAttribute("data-split");
      parent.removeAttribute("data-container-delay");
      parent.innerHTML = newHtml;
    }
  }
  __name(convertToSpans, "convertToSpans");
  function hoistAppearance(from, baseclass) {
    const to = from.parentNode;
    if (!to) return;
    for (const sibling of Array.from(to.children)) {
      if (sibling !== from && sibling.dataset.appearParent) return;
    }
    if (to instanceof Element) {
      to.classList.value = from.classList.value;
      copyDataAttributes(from, to, "data-appear-parent");
      to.innerHTML = from.innerHTML;
      if (baseclass) {
        to.classList.add(baseclass);
      }
    }
  }
  __name(hoistAppearance, "hoistAppearance");
  function fixListItem(appearance, options, consts) {
    const baseclass = consts.baseclass;
    if (appearance.hasAttribute("data-appear-parent")) {
      hoistAppearance(appearance, baseclass);
    }
    if (options.appearparents) {
      if (appearance.parentNode && appearance.parentNode instanceof Element) {
        if (appearance.tagName === "SPAN" && appearance.parentNode.tagName === "LI") {
          const spanLength = appearance.outerHTML.length;
          const liContentLength = appearance.parentNode.innerHTML.length;
          if (spanLength === liContentLength) {
            hoistAppearance(appearance);
          }
        }
      }
    }
  }
  __name(fixListItem, "fixListItem");
  const elemsNotInClass = /* @__PURE__ */ __name((targetClass, excludeClass, el) => {
    return Array.from(el.querySelectorAll(`.${targetClass}`)).filter(
      (s) => !s.closest(`.${excludeClass}`)
    );
  }, "elemsNotInClass");
  const elemsInClass = /* @__PURE__ */ __name((targetClass, parentClass, el) => {
    return Array.from(el.querySelectorAll(`.${targetClass}`)).filter(
      (s) => s.closest(`.${parentClass}`) === el
    );
  }, "elemsInClass");
  const getAppearanceArrays = /* @__PURE__ */ __name((section, targetClass, groupClass) => {
    if (!targetClass) return false;
    const result = [
      elemsNotInClass(targetClass, groupClass, section),
      ...Array.from(section.querySelectorAll(`.${groupClass}`)).map(
        (frag) => elemsInClass(targetClass, groupClass, frag)
      )
    ];
    return result.some((group) => group.length > 0) ? result : false;
  }, "getAppearanceArrays");
  function fromTo(event) {
    const slides = {
      from: event.fromSlide || event.previousSlide || null,
      to: event.toSlide || event.currentSlide || null
    };
    return slides;
  }
  __name(fromTo, "fromTo");
  function slideAppearevent(toSlide, options) {
    if (toSlide.dataset.appearevent && toSlide.dataset.appearevent === "auto") {
      toSlide.dataset.appearevent = "autoanimate";
    }
    let appearevent = options.appearevent;
    if (appearevent === "auto") {
      appearevent = "autoanimate";
    }
    return toSlide.dataset.appearevent || appearevent;
  }
  __name(slideAppearevent, "slideAppearevent");
  function removeStartAttribute(slides, options) {
    if (options.hideagain && slides.from && slides.from.dataset.appearanceCanStart) {
      slides.from.removeAttribute("data-appearance-can-start");
    }
  }
  __name(removeStartAttribute, "removeStartAttribute");
  function turnOffSlideAppearances(slides, options, consts) {
    if (options.hideagain && slides && slides.from) {
      const fromAppearances = slides.from.querySelectorAll(consts.animatecss);
      if (fromAppearances) {
        for (const appearance of fromAppearances) {
          appearance.classList.remove("animationended");
        }
      }
      const fromFragments = slides.from.querySelectorAll(".fragment.visible");
      if (fromFragments) {
        for (const fragment of fromFragments) {
          fragment.classList.remove("animationended");
        }
      }
    }
  }
  __name(turnOffSlideAppearances, "turnOffSlideAppearances");
  function showHideSlide(event, options, consts, deck, isInitialLoad) {
    const viewport = deck.getViewportElement();
    const isScroll = viewport.classList.contains("reveal-scroll");
    const etype = event.type;
    const slides = fromTo(event);
    if (slides.to) {
      if (etype === "ready") {
        const slideInitDelay = slides.to.dataset.initdelay ? parseInt(slides.to.dataset.initdelay, 10) : options.initdelay || 0;
        if (isInitialLoad.value && slideInitDelay > 0) {
          setTimeout(() => {
            if (slides.to) {
              slides.to.dataset.appearanceCanStart = "true";
            }
            isInitialLoad.value = false;
          }, slideInitDelay);
        } else {
          slides.to.dataset.appearanceCanStart = "true";
          isInitialLoad.value = false;
        }
      }
      const appearevent = slideAppearevent(slides.to, options);
      if (etype === appearevent || etype === "slidetransitionend" && appearevent === "autoanimate") {
        slides.to.dataset.appearanceCanStart = "true";
      }
      if (isScroll && etype === "slidechanged") {
        removeStartAttribute(slides, options);
        turnOffSlideAppearances(slides, options, consts);
        setTimeout(() => {
          if (slides.to) {
            slides.to.dataset.appearanceCanStart = "true";
          }
        }, options.delay);
      }
      if (etype === "slidetransitionend") {
        removeStartAttribute(slides, options);
        turnOffSlideAppearances(slides, options, consts);
      }
      if (etype === "slidechanged" && document.body.dataset.exitoverview) {
        removeStartAttribute(slides, options);
        slides.to.dataset.appearanceCanStart = "true";
      } else if (etype === "overviewhidden") {
        document.body.dataset.exitoverview = "true";
        setTimeout(() => {
          document.body.removeAttribute("data-exitoverview");
        }, 500);
        if (event.currentSlide) {
          removeStartAttribute(slides, options);
          slides.to.dataset.appearanceCanStart = "true";
        }
      }
    }
  }
  __name(showHideSlide, "showHideSlide");
  const _Appearance = class _Appearance {
    deck;
    viewport;
    slides;
    options;
    consts;
    sections;
    regularSections;
    appearances;
    isInitialLoad;
    constructor(deck, options) {
      this.deck = deck;
      this.options = options;
      this.isInitialLoad = true;
      this.viewport = deck.getViewportElement();
      this.slides = deck.getSlidesElement();
      this.consts = initConsts(
        options.baseclass,
        options.compatibilitybaseclass,
        options.compatibility
      );
      this.sections = this.slides.querySelectorAll("section");
      this.regularSections = Array.from(this.sections).filter(
        (section) => !sectionTools.isStack(section)
      );
      this.appearances = [];
      if (/receiver/i.test(window.location.search)) {
        this.viewport.classList.add("sv");
      }
    }
    /**
     * Prepare appearance elements
     */
    async prepareElements() {
      this.appearances = Array.from(this.slides.querySelectorAll(this.consts.animatecss));
      for (const section of this.regularSections) {
        addAutoAnimation(section, this.options, this.appearances);
      }
      for (const element of this.appearances) {
        fixListItem(element, this.options, this.consts);
        addBaseClass(element, this.consts);
        if (element instanceof HTMLElement && element.dataset.split) {
          convertToSpans(element, element.dataset.split);
        }
      }
      for (const section of this.regularSections) {
        const appearanceArrays = getAppearanceArrays(
          section,
          this.consts.baseclass,
          this.consts.fragmentClass
        );
        if (appearanceArrays) {
          for (const array of appearanceArrays) {
            addDelay(array, this.options);
          }
        }
      }
    }
    /**
     * Set up event listeners
     */
    setupEventListeners() {
      pluginDebug.log("Options:", this.options);
      pluginDebug.log("Setting up event listeners");
      const initialLoadRef = { value: this.isInitialLoad };
      for (const eventname of this.consts.eventnames) {
        pluginDebug.log(`Adding listener for ${eventname} event`);
        this.deck.on(eventname, (event) => {
          const e = event;
          showHideSlide(e, this.options, this.consts, this.deck, initialLoadRef);
          this.isInitialLoad = initialLoadRef.value;
        });
      }
      this.viewport.addEventListener("animationend", (event) => {
        const target = event.target;
        target.classList.add("animationended");
      });
      this.viewport.addEventListener("autoanimate", (event) => {
        pluginDebug.log("Autoanimate event triggered:", event);
      });
      this.viewport.addEventListener("fragmenthidden", (event) => {
        const e = event;
        if (e.fragment) {
          e.fragment.classList.remove("animationended");
          const endedEls = e.fragment.querySelectorAll(".animationended");
          for (const el of endedEls) {
            el.classList.remove("animationended");
          }
        }
      });
    }
    /**
     * Create a new Appearance instance
     */
    static async create(deck, options) {
      const instance = new _Appearance(deck, options);
      await instance.prepareElements();
      instance.setupEventListeners();
      return instance;
    }
  };
  __name(_Appearance, "Appearance");
  let Appearance = _Appearance;
  const PLUGIN_ID = "appearance";
  const init = /* @__PURE__ */ __name(async (plugin, deck, config) => {
    if (pluginDebug && config.debug) {
      pluginDebug.initialize(true, PLUGIN_ID);
    }
    await pluginCSS(plugin, config);
    await Appearance.create(deck, config);
  }, "init");
  const index = /* @__PURE__ */ __name(() => {
    const plugin = new PluginBase(PLUGIN_ID, init, defaultConfig);
    return plugin.createInterface();
  }, "index");
  return index;
}));
