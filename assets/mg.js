// assets/mg.js -- WP3 (SPEC_LAUNCH.md §5). Plain ES5 IIFE: no arrow functions, no const/let, no async.
// Loads supabase-js from a CDN lazily (only when config.supabase.url is set) and exposes MG.api.*/MG.auth.*
// Falls back to MG.mode='mailto' (today's mailto/clipboard flow, untouched) when no supabase config is present.
window.MG = (function () {
  "use strict";
  var config = window.MG_CONFIG || {};
  var sbCfg = config.supabase || {};
  var hasApi = !!(sbCfg.url);
  var mode = hasApi ? 'api' : 'mailto';
  var lang = (document.documentElement.getAttribute('lang') || 'ko');

  var qs = null;
  try { qs = new URLSearchParams(window.location.search); } catch (e) { qs = null; }
  var preview = (config.demo !== false) && !!(qs && qs.has('state'));

  var FUNCTIONS_URL = sbCfg.functionsUrl || (sbCfg.url ? sbCfg.url.replace(/\/$/, '') + '/functions/v1' : '');
  var REST_URL = sbCfg.url ? sbCfg.url.replace(/\/$/, '') + '/rest/v1' : '';
  var ANON_KEY = sbCfg.anonKey || '';

  function noop() {}

  // ---------------- error catalog (mirrors supabase/functions/_shared/errors.ts -- SPEC_LAUNCH.md §3) ----------------
  var ERRORS = {
    BAD_REQUEST: { status: 400, ko: "요청 형식이 올바르지 않습니다. 새로고침 후 다시 시도해 주세요.", en: "Invalid request. Please reload and try again." },
    VALIDATION: { status: 422, ko: "입력 내용을 확인해 주세요.", en: "Please check the highlighted fields." },
    TOKEN_INVALID: { status: 404, ko: "링크를 열 수 없습니다. 메일의 링크를 다시 눌러 주세요.", en: "This link is not valid." },
    TOKEN_USED: { status: 409, ko: "이미 처리된 링크입니다.", en: "This link has already been used." },
    TOKEN_EXPIRED: { status: 410, ko: "링크가 만료됐습니다.", en: "This link has expired." },
    TOKEN_REVOKED: { status: 410, ko: "더 이상 쓰지 않는 링크입니다.", en: "This link is no longer active." },
    FORBIDDEN_SHARE: { status: 403, ko: "보기 전용 링크에서는 할 수 없습니다.", en: "Not available on a view-only link." },
    STATE_CONFLICT: { status: 409, ko: "요청 상태가 바뀌어 처리하지 못했습니다. 새로고침해 주세요.", en: "The request has changed. Please reload." },
    DEADLINE_PASSED: { status: 409, ko: "제안 마감이 지났습니다.", en: "The quote deadline has passed." },
    RATE_LIMITED: { status: 429, ko: "잠시 후 다시 시도해 주세요.", en: "Too many attempts. Try again later." },
    OTP_WRONG: { status: 400, ko: "인증번호가 맞지 않습니다.", en: "Incorrect code." },
    OTP_EXPIRED: { status: 410, ko: "인증번호가 만료되었습니다. 인증번호를 다시 받아 주세요.", en: "The code has expired. Please request a new one." },
    OTP_VOID: { status: 410, ko: "인증번호를 5회 잘못 입력해 무효가 되었습니다. 새 인증번호를 받아 주세요.", en: "The code was voided after 5 wrong tries. Please request a new one." },
    OTP_LOCKED: { status: 423, ko: "5회 틀려 10분 동안 입력할 수 없습니다.", en: "Locked for 10 minutes after 5 wrong tries." },
    OTP_COOLDOWN: { status: 429, ko: "잠시 후 다시 받을 수 있습니다.", en: "You can request a new code shortly." },
    OTP_CAP: { status: 429, ko: "오늘 보낼 수 있는 인증번호를 모두 썼습니다. 내일 다시 시도해 주세요.", en: "You've reached today's limit for codes. Please try again tomorrow." },
    AUTH_REQUIRED: { status: 401, ko: "로그인이 필요합니다.", en: "Please sign in." },
    REAUTH_REQUIRED: { status: 403, ko: "보안을 위해 비밀번호를 다시 입력해 주세요.", en: "For security, please re-enter your password." },
    LOGIN_FAILED: { status: 401, ko: "이메일 또는 비밀번호가 맞지 않습니다.", en: "Incorrect email or password." },
    LOGIN_COOLDOWN: { status: 429, ko: "로그인에 5회 실패해 15분 동안 시도할 수 없습니다.", en: "5 failed attempts. Please wait 15 minutes." },
    ACCOUNT_LOCKED: { status: 423, ko: "계정이 잠겼습니다. 비밀번호를 재설정해 주세요.", en: "This account is locked. Please reset your password." },
    ACCOUNT_SUSPENDED: { status: 403, ko: "이용이 제한된 계정입니다.", en: "This account is suspended." },
    NOT_ACTIVE: { status: 403, ko: "가입 인증이 남아 있습니다.", en: "Signup verification is not complete." },
    PHONE_TAKEN: { status: 409, ko: "다른 계정에서 쓰는 번호입니다. 문의해 주세요.", en: "This number is already used by another account." },
    WITHDRAW_BLOCKED: { status: 409, ko: "진행 중인 요청이 있어 지금은 탈퇴할 수 없습니다.", en: "You have requests in progress, so you can't withdraw right now." },
    FORBIDDEN: { status: 403, ko: "권한이 없습니다.", en: "You don't have permission." },
    NOT_FOUND: { status: 404, ko: "찾을 수 없습니다.", en: "Not found." },
    INTERNAL: { status: 500, ko: "일시적인 오류입니다. 잠시 후 다시 시도해 주세요.", en: "Temporary error. Please try again." }
  };

  // ---------------- session storage (localStorage when keep, sessionStorage otherwise) ----------------
  var STORE_KEY = 'mg_session_v1';
  var _session = null; // {access_token, refresh_token, expires_at}
  var _member = null;  // {name, company, orgType, state}
  var _listeners = [];

  function safeGet(store, key) { try { return store.getItem(key); } catch (e) { return null; } }
  function safeSet(store, key, v) { try { store.setItem(key, v); } catch (e) {} }
  function safeRemove(store, key) { try { store.removeItem(key); } catch (e) {} }

  (function loadStored() {
    var raw = null;
    try { raw = window.localStorage.getItem(STORE_KEY); } catch (e) {}
    if (!raw) { try { raw = window.sessionStorage.getItem(STORE_KEY); } catch (e) {} }
    if (raw) {
      try { var obj = JSON.parse(raw); _session = obj.session || null; _member = obj.member || null; } catch (e2) {}
    }
  })();

  function persistSession(keep) {
    var payload = JSON.stringify({ session: _session, member: _member });
    if (keep) {
      safeSet(window.localStorage, STORE_KEY, payload);
      safeRemove(window.sessionStorage, STORE_KEY);
    } else {
      safeSet(window.sessionStorage, STORE_KEY, payload);
      safeRemove(window.localStorage, STORE_KEY);
    }
  }
  function clearSession() {
    _session = null; _member = null;
    safeRemove(window.localStorage, STORE_KEY);
    safeRemove(window.sessionStorage, STORE_KEY);
  }
  function notifyChange() {
    for (var i = 0; i < _listeners.length; i++) { try { _listeners[i](_session, _member); } catch (e) {} }
  }

  // ---------------- lazy supabase-js client (auth only -- api.* always uses fetch directly) ----------------
  var SUPABASE_JS_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
  var _client = null;
  var _readyPromise = null;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('mg.js: failed to load ' + src)); };
      document.head.appendChild(s);
    });
  }

  function ready(cb) {
    if (!_readyPromise) {
      if (!hasApi) {
        _readyPromise = Promise.resolve(null);
      } else {
        _readyPromise = Promise.resolve().then(function () {
          if (window.supabase && window.supabase.createClient) return window.supabase;
          return loadScript(SUPABASE_JS_URL).then(function () { return window.supabase; });
        }).then(function (lib) {
          if (lib && lib.createClient) {
            _client = lib.createClient(sbCfg.url, ANON_KEY, {
              auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false }
            });
            if (_session && _session.access_token) {
              try {
                _client.auth.setSession({ access_token: _session.access_token, refresh_token: _session.refresh_token }).catch(noop);
              } catch (e) {}
            }
          }
          return _client;
        }).catch(function (e) { return null; });
      }
    }
    return _readyPromise.then(function (c) { if (typeof cb === 'function') cb(c); return c; });
  }

  // ---------------- error helpers ----------------
  function mgErrorFromEnvelope(status, body) {
    var e = (body && body.error) || {};
    var code = (e.code && ERRORS[e.code]) ? e.code : 'INTERNAL';
    var spec = ERRORS[code];
    return {
      code: code,
      status: status || spec.status,
      message_ko: e.message_ko || spec.ko,
      message_en: e.message_en || spec.en,
      fields: e.fields || null,
      retry_after: e.retry_after,
      remaining: e.remaining,
      locked_until: e.locked_until,
      blockers: e.blockers
    };
  }
  function mgErrorNetwork() {
    return { code: 'INTERNAL', status: 0, message_ko: ERRORS.INTERNAL.ko, message_en: ERRORS.INTERNAL.en };
  }
  // PostgREST wraps our `raise exception message='MG:<CODE>'` as {message:"MG:<CODE>", code:"P0001", ...}
  function mapPostgrestError(body) {
    var msg = (body && (body.message || body.hint || body.details)) || '';
    var m = /MG:([A-Z_]+)/.exec(String(msg));
    var code = (m && ERRORS[m[1]]) ? m[1] : 'INTERNAL';
    var spec = ERRORS[code];
    return { error: { code: code, message_ko: spec.ko, message_en: spec.en } };
  }

  function authHeaderValue() {
    if (_session && _session.access_token) return 'Bearer ' + _session.access_token;
    return 'Bearer ' + ANON_KEY;
  }

  function parseJsonSafe(text) {
    if (!text) return {};
    try { return JSON.parse(text); } catch (e) { return {}; }
  }

  function callEdge(name, payload) {
    if (!hasApi) return Promise.reject({ code: 'INTERNAL', status: 0, message_ko: '설정되지 않았습니다.', message_en: 'Not configured.' });
    var url = FUNCTIONS_URL + '/' + name;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY, 'Authorization': authHeaderValue() },
      body: JSON.stringify(payload || {})
    }).then(function (r) {
      return r.text().then(function (txt) {
        var body = parseJsonSafe(txt);
        if (!r.ok) { return Promise.reject(mgErrorFromEnvelope(r.status, body)); }
        return body;
      });
    }, function () { return Promise.reject(mgErrorNetwork()); });
  }

  function callRpc(name, params) {
    if (!hasApi) return Promise.reject({ code: 'INTERNAL', status: 0, message_ko: '설정되지 않았습니다.', message_en: 'Not configured.' });
    var url = REST_URL + '/rpc/' + name;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY, 'Authorization': authHeaderValue() },
      body: JSON.stringify(params || {})
    }).then(function (r) {
      return r.text().then(function (txt) {
        var body = parseJsonSafe(txt);
        if (!r.ok) {
          var envelope = (body && body.error) ? body : mapPostgrestError(body);
          return Promise.reject(mgErrorFromEnvelope(r.status, envelope));
        }
        return body;
      });
    }, function () { return Promise.reject(mgErrorNetwork()); });
  }

  // ---------------- api.* (SPEC_LAUNCH.md §3/§5) ----------------
  var EDGE_NAMES = [
    'submit_rfp', 'get_track', 'request_change', 'ask_question', 'create_share_link', 'revoke_share_link',
    'pick_send_otp', 'pick_verify', 'register_partner', 'get_bid', 'submit_quote', 'decline_bid', 'unsubscribe', 'quote_confirm',
    'contact', 'signup_start', 'resend_email_code', 'verify_email', 'send_phone_otp', 'verify_phone_otp',
    'password_reset_request', 'password_reset_complete', 'account_update', 'withdraw'
  ];
  var RPC_NAMES = ['my_profile', 'my_rfps', 'my_sessions', 'link_request'];
  var RPC_PARAM_MAP = { link_request: { ref: 'p_ref' } };

  function buildEdgeFn(name) {
    return function (payload) { return callEdge(name, payload); };
  }
  function buildRpcFn(name) {
    var map = RPC_PARAM_MAP[name];
    return function (payload) {
      var params = payload || {};
      if (map) {
        var out = {};
        for (var k in params) { if (params.hasOwnProperty(k)) out[map[k] || k] = params[k]; }
        params = out;
      }
      return callRpc(name, params);
    };
  }

  var api = {};
  var i;
  for (i = 0; i < EDGE_NAMES.length; i++) { api[EDGE_NAMES[i]] = buildEdgeFn(EDGE_NAMES[i]); }
  for (i = 0; i < RPC_NAMES.length; i++) { api[RPC_NAMES[i]] = buildRpcFn(RPC_NAMES[i]); }

  // ---------------- auth.* ----------------
  var auth = {
    signIn: function (email, password, keep) {
      return callEdge('login', { email: email, password: password, keep: !!keep }).then(function (resp) {
        _session = { access_token: resp.access_token, refresh_token: resp.refresh_token, expires_at: resp.expires_at };
        _member = resp.member || null;
        persistSession(!!keep);
        notifyChange();
        return ready().then(function (client) {
          if (client) {
            try { client.auth.setSession({ access_token: _session.access_token, refresh_token: _session.refresh_token }).catch(noop); } catch (e) {}
          }
          return resp;
        });
      });
    },
    signOut: function (scope) {
      return ready().then(function (client) {
        if (client) {
          try { return client.auth.signOut(scope ? { scope: scope } : undefined).catch(noop); } catch (e) { return null; }
        }
        return null;
      }).then(function () {
        // scope 'others' revokes every session but this one -- keep the local session intact.
        if (scope !== 'others') { clearSession(); notifyChange(); }
      });
    },
    session: function () { return _session; },
    member: function () { return _member; },
    onChange: function (cb) { if (typeof cb === 'function') _listeners.push(cb); },
    verifyRecovery: function (k) {
      return ready().then(function (client) {
        if (!client) return Promise.reject(mgErrorNetwork());
        return client.auth.verifyOtp({ token_hash: k, type: 'recovery' }).then(function (res) {
          if (res.error) return Promise.reject(mgErrorFromEnvelope(400, { error: { code: 'TOKEN_INVALID' } }));
          var s = res.data && res.data.session;
          if (s) {
            _session = { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at ? new Date(s.expires_at * 1000).toISOString() : null };
            persistSession(false);
            notifyChange();
          }
          return res.data;
        });
      });
    }
  };

  // ---------------- msg / show ----------------
  function msg(err) {
    if (!err) return '';
    var spec = ERRORS[err.code];
    if (spec) return lang === 'en' ? (err.message_en || spec.en) : (err.message_ko || spec.ko);
    return (lang === 'en' ? (err.message_en || err.message) : (err.message_ko || err.message)) || (lang === 'en' ? ERRORS.INTERNAL.en : ERRORS.INTERNAL.ko);
  }
  function show(err, opts) {
    opts = opts || {};
    if (err && err.fields && err.fields.length && typeof opts.setErr === 'function') {
      for (var i2 = 0; i2 < err.fields.length; i2++) {
        var f = err.fields[i2];
        var id = (opts.fieldMap && opts.fieldMap[f.name]) || f.name;
        opts.setErr(id, true);
      }
    }
    if (typeof opts.toast === 'function') opts.toast(msg(err));
  }

  return {
    config: config,
    mode: mode,
    preview: preview,
    lang: lang,
    ready: ready,
    api: api,
    auth: auth,
    msg: msg,
    show: show,
    url: {
      track: function (t) { return 'track.html?t=' + encodeURIComponent(t); },
      share: function (s) { return 'track.html?s=' + encodeURIComponent(s); },
      bid: function (t) { return 'bid.html?t=' + encodeURIComponent(t); }
    }
  };
})();
