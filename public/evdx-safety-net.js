/* ============================================================================
 * EVDx — Pre-hydration Safety Net + Polyfills
 * ============================================================================
 * This file is loaded synchronously inside <head> BEFORE any other JS.
 * It MUST be plain ES5 so it parses on every Chromium back to v40.
 * No arrow functions, no const/let, no template literals, no destructuring.
 *
 * It does three things that are critical for BYD DiLink 3.0 (Chromium 83,
 * June 2020):
 *
 *   1. Polyfill missing runtime APIs that Chromium 83 lacks but modern
 *      React and dependencies (radix-ui, framer-motion, recharts, cmdk)
 *      use:
 *        - Array.prototype.at          (Chrome 92+)
 *        - String.prototype.at         (Chrome 92+)
 *        - Object.hasOwn               (Chrome 93+)
 *        - structuredClone             (Chrome 98+)
 *        - Promise.any                 (Chrome 85+)
 *        - AggregateError              (Chrome 85+)
 *        - String.prototype.replaceAll (Chrome 85+)
 *        - Array.prototype.flat        (Chrome 69+ — usually fine)
 *        - Array.prototype.flatMap     (Chrome 69+ — usually fine)
 *        - Object.fromEntries          (Chrome 73+ — usually fine)
 *
 *      Without these, a single arr.at(-1) or Object.hasOwn(o, k) call
 *      throws TypeError and tears down the entire React tree before the
 *      first paint — leaving the pre-hydration splash visible forever.
 *
 *   2. Mark window.__evdx_js_alive = true after this script runs. The
 *      safety-net watcher uses this flag to distinguish "polyfills
 *      loaded but React failed" from "JS didn't even parse".
 *
 *   3. Try to dismiss the Capacitor native SplashScreen ASAP via the
 *      Capacitor bridge. If the bridge isn't ready yet, retry every
 *      200ms for up to 8 seconds. This decouples native-splash
 *      dismissal from React mounting — even if React never mounts,
 *      the native splash still hides after the bridge becomes
 *      available, so the user sees the pre-hydration splash (with the
 *      error fallback) instead of a frozen native splash.
 *
 *   4. Pre-hydration splash safety net: if React doesn't mount within
 *      8 seconds, swap "Loading EVDx…" for a retry prompt. After 15s,
 *      remove the splash entirely so the user sees a blank dark screen
 *      rather than a frozen loading state.
 * ========================================================================== */
(function () {
  try {
    // ─── Polyfill: Array.prototype.at ──────────────────────────────────
    if (!Array.prototype.at) {
      Array.prototype.at = function (n) {
        n = Math.trunc(n) || 0;
        if (n < 0) n += this.length;
        if (n < 0 || n >= this.length) return undefined;
        return this[n];
      };
    }
    // ─── Polyfill: String.prototype.at ─────────────────────────────────
    if (!String.prototype.at) {
      String.prototype.at = function (n) {
        n = Math.trunc(n) || 0;
        if (n < 0) n += this.length;
        if (n < 0 || n >= this.length) return undefined;
        return this.charAt(n);
      };
    }
    // ─── Polyfill: Object.hasOwn ───────────────────────────────────────
    if (!Object.hasOwn) {
      Object.hasOwn = function (obj, prop) {
        return Object.prototype.hasOwnProperty.call(obj, prop);
      };
    }
    // ─── Polyfill: String.prototype.replaceAll ─────────────────────────
    if (!String.prototype.replaceAll) {
      String.prototype.replaceAll = function (search, replacement) {
        if (search instanceof RegExp) {
          if (!search.global) {
            throw new TypeError("String.prototype.replaceAll called with a non-global RegExp argument");
          }
          return this.replace(search, replacement);
        }
        // Escape regex metacharacters in the search string.
        var escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return this.replace(new RegExp(escaped, "g"), replacement);
      };
    }
    // ─── Polyfill: AggregateError ──────────────────────────────────────
    if (typeof AggregateError === "undefined") {
      function AggregateError(errors, message) {
        var instance = Error.call(this, message);
        instance.name = "AggregateError";
        instance.errors = Array.prototype.slice.call(errors);
        return instance;
      }
      AggregateError.prototype = Object.create(Error.prototype);
      if (typeof window !== "undefined") window.AggregateError = AggregateError;
      if (typeof globalThis !== "undefined") globalThis.AggregateError = AggregateError;
    }
    // ─── Polyfill: Promise.any ─────────────────────────────────────────
    if (typeof Promise !== "undefined" && !Promise.any) {
      Promise.any = function (iterable) {
        var arr = Array.prototype.slice.call(iterable);
        return new Promise(function (resolve, reject) {
          if (arr.length === 0) {
            reject(new AggregateError([], "All promises were rejected"));
            return;
          }
          var remaining = arr.length;
          var errors = new Array(arr.length);
          arr.forEach(function (p, i) {
            Promise.resolve(p).then(
              function (v) { resolve(v); },
              function (e) {
                errors[i] = e;
                remaining -= 1;
                if (remaining === 0) {
                  reject(new AggregateError(errors, "All promises were rejected"));
                }
              }
            );
          });
        });
      };
    }
    // ─── Polyfill: structuredClone ─────────────────────────────────────
    if (typeof structuredClone === "undefined") {
      function structuredClone(value) {
        if (value === undefined || value === null || typeof value !== "object") {
          return value;
        }
        try { return JSON.parse(JSON.stringify(value)); }
        catch (e) { return value; }
      }
      if (typeof window !== "undefined") window.structuredClone = structuredClone;
      if (typeof globalThis !== "undefined") globalThis.structuredClone = structuredClone;
    }
    // ─── Polyfill: Array.prototype.flat / flatMap ──────────────────────
    if (!Array.prototype.flat) {
      Array.prototype.flat = function (depth) {
        depth = depth === undefined ? 1 : Math.trunc(depth) || 0;
        var stack = [];
        (function walk(arr, d) {
          for (var i = 0; i < arr.length; i++) {
            if (Array.isArray(arr[i]) && d < depth) walk(arr[i], d + 1);
            else stack.push(arr[i]);
          }
        })(this, 0);
        return stack;
      };
    }
    if (!Array.prototype.flatMap) {
      Array.prototype.flatMap = function (cb) {
        return Array.prototype.concat.apply([], this.map(cb));
      };
    }
    // ─── Polyfill: Object.fromEntries ──────────────────────────────────
    if (!Object.fromEntries) {
      Object.fromEntries = function (iter) {
        var obj = {};
        if (iter && typeof iter[Symbol.iterator] === "function") {
          var step;
          var it = iter[Symbol.iterator]();
          while (!(step = it.next()).done) {
            if (step.value && step.value.length === 2) obj[step.value[0]] = step.value[1];
          }
        }
        return obj;
      };
    }
    // ─── Polyfill: Array.prototype.includes (Chrome 47+ — usually fine) ─
    if (!Array.prototype.includes) {
      Array.prototype.includes = function (search) {
        return this.indexOf(search) !== -1;
      };
    }
    // ─── Polyfill: String.prototype.includes ───────────────────────────
    if (!String.prototype.includes) {
      String.prototype.includes = function (search, start) {
        if (typeof start !== "number") start = 0;
        if (start + search.length > this.length) return false;
        return this.indexOf(search, start) !== -1;
      };
    }
    // ─── Polyfill: Number.parseInt / parseFloat ────────────────────────
    if (typeof Number !== "undefined" && !Number.parseInt) {
      Number.parseInt = parseInt;
    }
    if (typeof Number !== "undefined" && !Number.parseFloat) {
      Number.parseFloat = parseFloat;
    }
    // ─── Polyfill: String.prototype.padStart / padEnd (Chrome 57+) ─────
    if (!String.prototype.padStart) {
      String.prototype.padStart = function (targetLength, padString) {
        targetLength = targetLength >> 0;
        padString = String(padString || " ");
        if (this.length >= targetLength || padString === "") return String(this);
        var pad = "";
        while (pad.length + this.length < targetLength) pad += padString;
        return pad.slice(0, targetLength - this.length) + String(this);
      };
    }
    if (!String.prototype.padEnd) {
      String.prototype.padEnd = function (targetLength, padString) {
        targetLength = targetLength >> 0;
        padString = String(padString || " ");
        if (this.length >= targetLength || padString === "") return String(this);
        var pad = "";
        while (pad.length + this.length < targetLength) pad += padString;
        return String(this) + pad.slice(0, targetLength - this.length);
      };
    }
    // ─── Polyfill: String.prototype.trimStart / trimEnd ────────────────
    if (!String.prototype.trimStart) {
      String.prototype.trimStart = String.prototype.trimLeft || function () {
        return String(this).replace(/^\s+/, "");
      };
    }
    if (!String.prototype.trimEnd) {
      String.prototype.trimEnd = String.prototype.trimRight || function () {
        return String(this).replace(/\s+$/, "");
      };
    }
    // ─── Polyfill: Array.prototype.find (Chrome 45+ — usually fine) ────
    if (!Array.prototype.find) {
      Array.prototype.find = function (predicate) {
        if (typeof predicate !== "function") {
          throw new TypeError("predicate is not a function");
        }
        var list = Object(this);
        var len = list.length >>> 0;
        var thisArg = arguments[1];
        for (var i = 0; i < len; i++) {
          var value = list[i];
          if (predicate.call(thisArg, value, i, list)) return value;
        }
        return undefined;
      };
    }
    // ─── Polyfill: Array.prototype.findIndex (Chrome 45+ — usually fine) ─
    if (!Array.prototype.findIndex) {
      Array.prototype.findIndex = function (predicate) {
        if (typeof predicate !== "function") {
          throw new TypeError("predicate is not a function");
        }
        var list = Object(this);
        var len = list.length >>> 0;
        var thisArg = arguments[1];
        for (var i = 0; i < len; i++) {
          if (predicate.call(thisArg, list[i], i, list)) return i;
        }
        return -1;
      };
    }
    // ─── Polyfill: globalThis (Chrome 71+ — usually fine, but be safe) ──
    if (typeof globalThis === "undefined") {
      try {
        Object.defineProperty(Object.prototype, "__globalThis__", {
          get: function () { return this; },
          configurable: true
        });
        // eslint-disable-next-line no-undef
        var gt = __globalThis__;
        delete Object.prototype.__globalThis__;
        if (typeof window !== "undefined") window.globalThis = window;
        else if (typeof self !== "undefined") self.globalThis = self;
      } catch (e) {
        if (typeof window !== "undefined") window.globalThis = window;
      }
    }
  } catch (polyfillErr) {
    try { console.error("[EVDx] polyfill error:", polyfillErr); } catch (e) {}
  }

  // Mark that the safety-net script has executed successfully.
  try { window.__evdx_js_alive = true; } catch (e) {}

  // ─── Hide the native Capacitor splash screen ASAP ──────────────────────
  // The Capacitor @capacitor/splash-screen plugin attaches itself to
  // window.Capacitor.Plugins once the bridge is ready. We poll for it
  // every 200ms for up to 8 seconds, then give up. Once found, call
  // SplashScreen.hide() so the native splash dismisses independently
  // of React mounting.
  try {
    var attempts = 0;
    var maxAttempts = 40; // 40 * 200ms = 8s
    var hideNative = function () {
      try {
        var cap = window.Capacitor;
        if (cap && cap.Plugins && cap.Plugins.SplashScreen && cap.Plugins.SplashScreen.hide) {
          var p = cap.Plugins.SplashScreen.hide();
          if (p && typeof p.then === "function") p.catch(function () {});
          return true;
        }
      } catch (e) {}
      return false;
    };
    if (!hideNative()) {
      var timer = setInterval(function () {
        attempts++;
        if (hideNative() || attempts >= maxAttempts) clearInterval(timer);
      }, 200);
    }
  } catch (e) {}

  // ─── Pre-hydration splash safety net ───────────────────────────────────
  // If React doesn't mount within 8 seconds (meaning JS failed to parse
  // or threw during initialization), swap the "Loading EVDx…" text for
  // a friendly error message and a retry prompt. After 15 seconds,
  // remove the splash entirely so the user at least sees a blank
  // dark screen rather than a frozen "Loading…" state.
  try {
    var showRetry = function () {
      var splash = document.getElementById("pre-hydration-splash");
      if (!splash) return;
      var loader = splash.querySelector(".evdx-loader-text");
      if (loader) {
        loader.textContent = "App failed to load. Tap to retry.";
        loader.style.color = "#FF3D00";
        loader.style.cursor = "pointer";
      }
      splash.style.cursor = "pointer";
      var retry = function () {
        try { window.location.href = window.location.pathname; }
        catch (e) { try { window.location.reload(); } catch (e2) {} }
      };
      splash.onclick = retry;
    };
    var removeSplash = function () {
      var splash = document.getElementById("pre-hydration-splash");
      if (splash && splash.parentNode) {
        splash.parentNode.removeChild(splash);
      }
    };
    setTimeout(showRetry, 8000);
    setTimeout(removeSplash, 15000);
  } catch (e) {}

  // ─── Capture global JS errors so they appear in the splash ─────────────
  // If React fails to mount due to a runtime error, at least surface the
  // error message so the user (or support) can diagnose it without ADB.
  try {
    var errCount = 0;
    window.addEventListener("error", function (event) {
      errCount++;
      if (errCount > 5) return; // avoid spam
      try {
        var splash = document.getElementById("pre-hydration-splash");
        if (!splash) return;
        var msg = (event && event.message) ? event.message : "Unknown error";
        var errDiv = splash.querySelector(".evdx-error-log");
        if (!errDiv) {
          errDiv = document.createElement("div");
          errDiv.className = "evdx-error-log";
          errDiv.style.cssText =
            "color:#FF3D00;font-family:monospace;font-size:11px;" +
            "margin-top:12px;padding:0 16px;text-align:center;max-width:80vw;" +
            "word-break:break-word;opacity:0.85;";
          splash.appendChild(errDiv);
        }
        errDiv.textContent = msg;
      } catch (e) {}
    });
  } catch (e) {}
})();
