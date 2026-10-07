/* admin/data-adapter.js -- WP3 (SPEC_LAUNCH.md §6). Plain ES5.
 * Script order in every admin/*.html: ../assets/config.js, ../assets/mg.js, data-adapter.js, admin.js.
 * In mock mode this file synchronously document.write()s a <script src="mock-data.js"> tag so
 * window.MOCK_DATA exists before admin.js (the very next script tag) runs.
 */
window.MGA = (function () {
  "use strict";
  var config = window.MG_CONFIG || {};
  var sbCfg = config.supabase || {};
  var hasApi = !!(sbCfg.url) && !!(window.MG && MG.mode === 'api');
  var mode = hasApi ? 'api' : 'mock';

  if (!hasApi) {
    // mock mode: keep today's demo data source available to admin.js, exactly as before.
    document.write('<script src="mock-data.js"><\/script>');
  }

  var REST_URL = sbCfg.url ? sbCfg.url.replace(/\/$/, '') + '/rest/v1' : '';
  var FUNCTIONS_URL = sbCfg.functionsUrl || (sbCfg.url ? sbCfg.url.replace(/\/$/, '') + '/functions/v1' : '');
  var ANON_KEY = sbCfg.anonKey || '';
  var ROLE_KEY = 'micego_admin_role';
  var DEMO_CLOCK = Date.parse('2026-10-08T19:30:00+09:00');
  var _accessToken = null;
  var _settings = null;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function parseJsonSafe(t) { if (!t) return {}; try { return JSON.parse(t); } catch (e) { return {}; } }
  function authHeader() { return 'Bearer ' + (_accessToken || ANON_KEY); }

  function rpcError(body) {
    var msg = (body && (body.message || body.hint || body.details)) || '오류가 발생했습니다';
    var m = /MG:([A-Z_]+)/.exec(String(msg));
    return { code: m ? m[1] : 'INTERNAL', message: (body && body.details) || msg };
  }

  function rpc(name, params) {
    return fetch(REST_URL + '/rpc/' + name, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: authHeader() },
      body: JSON.stringify(params || {})
    }).then(function (r) {
      return r.text().then(function (txt) {
        var body = parseJsonSafe(txt);
        if (!r.ok) return Promise.reject(rpcError(body));
        return body;
      });
    }, function () { return Promise.reject({ code: 'INTERNAL', message: '네트워크 오류가 발생했습니다' }); });
  }

  // Generic PostgREST request (GET/PATCH/POST) for the feedback console (SPEC_FEEDBACK.md §5).
  // Distinct from rpc()/edge() above because list/detail/notes/events are plain table reads,
  // not RPCs -- PostgREST filter syntax goes straight on the querystring.
  function restReq(method, path, body, extraHeaders) {
    var headers = { apikey: ANON_KEY, Authorization: authHeader() };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    for (var k in (extraHeaders || {})) headers[k] = extraHeaders[k];
    return fetch(REST_URL + path, { method: method, headers: headers, body: body !== undefined ? JSON.stringify(body) : undefined }).then(function (r) {
      return r.text().then(function (txt) {
        var data = txt ? parseJsonSafe(txt) : null;
        if (!r.ok) return Promise.reject(rpcError(data || {}));
        return data;
      });
    }, function () { return Promise.reject({ code: 'INTERNAL', message: '네트워크 오류가 발생했습니다' }); });
  }

  function edge(name, payload) {
    return fetch(FUNCTIONS_URL + '/' + name, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: authHeader() },
      body: JSON.stringify(payload || {})
    }).then(function (r) {
      return r.text().then(function (txt) {
        var body = parseJsonSafe(txt);
        if (!r.ok) {
          var e = (body && body.error) || {};
          return Promise.reject({ code: e.code || 'INTERNAL', message: e.message_ko || e.message || '오류가 발생했습니다' });
        }
        return body;
      });
    }, function () { return Promise.reject({ code: 'INTERNAL', message: '네트워크 오류가 발생했습니다' }); });
  }

  // op names that go through the admin_member_action Edge Function instead of a plain RPC
  // (SPEC_LAUNCH §0/§6: it needs the Auth admin API, so it can't be a security-definer SQL RPC).
  var EDGE_OPS = { admin_member_action: 1 };

  var MGA = {
    mode: mode,

    boot: function (cb) {
      if (!hasApi) {
        var snap = clone(window.MOCK_DATA);
        try {
          var asRole = new URLSearchParams(location.search).get('as') || sessionStorage.getItem('micego_demo_as');
          var demoMe = snap.demoPartnerMe || (window.MICEGO_PTR && MICEGO_PTR.DEMO_ME) || null;
          if (asRole === 'partner' && demoMe) { snap.me = demoMe; sessionStorage.setItem('micego_demo_as', 'partner'); }
          else if (asRole === 'operator') { sessionStorage.removeItem('micego_demo_as'); }
        } catch (e) {}
        cb(snap); return;
      }
      MG.ready().then(function (client) {
        if (!client) { location.replace('index.html?e=config'); return; }
        client.auth.getSession().then(function (res) {
          var session = res && res.data && res.data.session;
          if (!session) { location.replace('index.html'); return; }
          var role = session.user && session.user.app_metadata && session.user.app_metadata.role;
          if (['operator', 'partner_admin', 'partner_member'].indexOf(role) < 0) {
            client.auth.signOut().then(function () { location.replace('index.html?e=role'); });
            return;
          }
          _accessToken = session.access_token;
          rpc('admin_snapshot', {}).then(function (snap) { cb(snap); }, function () {
            location.replace('index.html?e=snapshot');
          });
        }, function () { location.replace('index.html'); });
      });
    },

    login: function (email, password) {
      if (!hasApi) {
        try { sessionStorage.setItem(ROLE_KEY, 'operator'); } catch (e) {}
        return Promise.resolve(true);
      }
      return MG.ready().then(function (client) {
        if (!client) return Promise.reject({ code: 'INTERNAL', message: '설정되지 않았습니다.' });
        return client.auth.signInWithPassword({ email: email, password: password }).then(function (res) {
          if (res.error) return Promise.reject({ code: 'LOGIN_FAILED', message: res.error.message || '로그인할 수 없습니다.' });
          var session = res.data && res.data.session;
          var role = session && session.user && session.user.app_metadata && session.user.app_metadata.role;
          if (['operator', 'partner_admin', 'partner_member'].indexOf(role) < 0) {
            return client.auth.signOut().then(function () {
              return Promise.reject({ code: 'FORBIDDEN', message: '운영자 또는 지역 파트너 권한이 있는 계정으로 로그인해 주세요.' });
            });
          }
          _accessToken = session.access_token;
          return true;
        }, function () { return Promise.reject({ code: 'INTERNAL', message: '로그인하지 못했습니다.' }); });
      });
    },

    logout: function () {
      if (!hasApi) {
        try { sessionStorage.removeItem(ROLE_KEY); } catch (e) {}
        location.href = 'index.html';
        return;
      }
      MG.ready().then(function (client) {
        if (client) { try { client.auth.signOut(); } catch (e) {} }
        location.href = 'index.html';
      });
    },

    call: function (name, args) {
      if (!hasApi) return Promise.reject({ code: 'INTERNAL', message: 'mock mode에서는 호출할 수 없습니다.' });
      if (EDGE_OPS[name]) return edge(name, args);
      if (name === 'partner_invite') return edge(name, args);
      return rpc(name, args);
    },

    now: function () { return hasApi ? Date.now() : DEMO_CLOCK; },

    /* 콘솔 설정(console_settings): 커미션 허용 범위 commission_rate_range 등. 한 번 불러와 캐시한다.
     * mock 모드는 데모 값. 실패하면 캐시하지 않아 다음 호출에서 다시 시도한다. */
    settings: function () {
      if (_settings) return Promise.resolve(_settings);
      if (!hasApi) { _settings = { commission_rate_range: [5, 20] }; return Promise.resolve(_settings); }
      return rpc('console_settings', {}).then(function (s) { _settings = s || {}; return _settings; });
    },

    /* ---------- 피드백 콘솔 (SPEC_FEEDBACK.md §5, WP-F3). mock 모드에서는 사용하지 않는다(admin.js 의
     * A.data().feedback 을 직접 읽고 A.persist 로 반영). api 모드에서만 호출된다. */
    // SUPABASE(list): GET feedback?select=*&status=in.(...)&is_demo=eq.false&order=created_at.desc&limit=50&offset=0
    feedbackList: function (queryString) {
      if (!hasApi) return Promise.reject({ code: 'INTERNAL', message: 'mock mode에서는 호출할 수 없습니다.' });
      return restReq('GET', '/feedback?' + queryString);
    },
    // SUPABASE(counts): 상태별 HEAD count=exact 또는 RPC feedback_counts()
    feedbackCounts: function () {
      if (!hasApi) return Promise.reject({ code: 'INTERNAL', message: 'mock mode에서는 호출할 수 없습니다.' });
      return rpc('feedback_counts', {});
    },
    // SUPABASE(detail): GET feedback?id=eq.<id>&select=*
    feedbackDetail: function (id) {
      if (!hasApi) return Promise.reject({ code: 'INTERNAL', message: 'mock mode에서는 호출할 수 없습니다.' });
      return restReq('GET', '/feedback?id=eq.' + encodeURIComponent(id) + '&select=*').then(function (rows) { return (rows || [])[0] || null; });
    },
    // SUPABASE(notes): GET/POST feedback_note
    feedbackNotes: function (id) {
      if (!hasApi) return Promise.reject({ code: 'INTERNAL', message: 'mock mode에서는 호출할 수 없습니다.' });
      return restReq('GET', '/feedback_note?feedback_id=eq.' + encodeURIComponent(id) + '&order=created_at.asc');
    },
    // SUPABASE(note): POST feedback_note {feedback_id, body}
    feedbackAddNote: function (feedbackId, body) {
      if (!hasApi) return Promise.reject({ code: 'INTERNAL', message: 'mock mode에서는 호출할 수 없습니다.' });
      return restReq('POST', '/feedback_note', { feedback_id: feedbackId, body: body }, { Prefer: 'return=representation' });
    },
    // SUPABASE(events): GET feedback_event
    feedbackEvents: function (id) {
      if (!hasApi) return Promise.reject({ code: 'INTERNAL', message: 'mock mode에서는 호출할 수 없습니다.' });
      return restReq('GET', '/feedback_event?feedback_id=eq.' + encodeURIComponent(id) + '&order=created_at.asc');
    },
    // SUPABASE(operators): RPC feedback_operators()
    feedbackOperators: function () {
      if (!hasApi) return Promise.reject({ code: 'INTERNAL', message: 'mock mode에서는 호출할 수 없습니다.' });
      return rpc('feedback_operators', {});
    },
    // SUPABASE(triage): PATCH feedback?id=eq.<id> {priority, subcode, category, assignee} Prefer: return=representation
    feedbackTriage: function (id, patch) {
      if (!hasApi) return Promise.reject({ code: 'INTERNAL', message: 'mock mode에서는 호출할 수 없습니다.' });
      return restReq('PATCH', '/feedback?id=eq.' + encodeURIComponent(id), patch, { Prefer: 'return=representation' }).then(function (rows) { return (rows || [])[0] || null; });
    },
    // SUPABASE(status): rpc/feedback_set_status(p_id, p_to, p_resolution, p_note)
    feedbackSetStatus: function (args) {
      if (!hasApi) return Promise.reject({ code: 'INTERNAL', message: 'mock mode에서는 호출할 수 없습니다.' });
      return rpc('feedback_set_status', args);
    },
    // SUPABASE(resolve_rfp): rpc/feedback_resolve_rfp(p_feedback_id)
    feedbackResolveRfp: function (id) {
      if (!hasApi) return Promise.reject({ code: 'INTERNAL', message: 'mock mode에서는 호출할 수 없습니다.' });
      return rpc('feedback_resolve_rfp', { p_feedback_id: id });
    },
    // SUPABASE(retry): POST functions/v1/feedback-mail-retry {id} Bearer operator JWT (단건 모드)
    feedbackMailRetry: function (id, kind) {
      if (!hasApi) return Promise.reject({ code: 'INTERNAL', message: 'mock mode에서는 호출할 수 없습니다.' });
      return edge('feedback-mail-retry', { id: id, kind: kind });
    }
  };
  return MGA;
})();
