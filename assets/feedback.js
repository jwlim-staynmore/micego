// assets/feedback.js -- WP-F2 (SPEC_FEEDBACK.md §4 "위젯 feedback.js", overridden where
// SPEC_FEEDBACK_ADDENDUM.md §A says so). Plain ES5 IIFE: no arrow functions, no let/const, no
// template literals -- must run unmodified in old in-app WebViews (Kakao/Naver/Instagram/...).
// Renders into a Shadow DOM host so existing Playwright checks ("one <h1>", "no console errors")
// never see the widget's own markup, and the site's CSS never leaks in or out (D10).
//
// Depends on nothing but window.MICEGO_FEEDBACK (assets/config.js, built by build_launch.py) and,
// optionally, window.MICEGO_PAGE_STATE (set by build2.py's track/bid page JS). It never depends on
// assets/mg.js -- it must keep working on a page where mg.js failed to load. It performs zero
// network requests until the user actually submits (D-spec "여기까지 네트워크 0건").
(function () {
  "use strict";
  if (window.__MGFB) { return; }
  window.__MGFB = true;

  // ================================================================ 0. early error capture
  // Absorbs whatever the head snippet (build_launch.py) collected before this file loaded, then
  // keeps listening itself. Ring buffer of 3, per SPEC_FEEDBACK.md §4.2/4.4.
  var errRing = [];
  (function absorbEarly() {
    try {
      var early = window.__mgfbEarly;
      if (early && early.length) {
        for (var i = 0; i < early.length && errRing.length < 3; i++) { errRing.push(early[i]); }
      }
    } catch (e) {}
  })();
  function maskMsg(s) {
    s = String(s == null ? '' : s);
    try {
      s = s.replace(/([?&](?:t|s|token|access_token)=)[A-Za-z0-9._~-]{8,}/g, '$1[token]');
      s = s.replace(/[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[jwt]');
      s = s.replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '[email]');
      s = s.replace(/\d{9,}/g, '[num]');
    } catch (e) {}
    return s.slice(0, 500);
  }
  function pushErr(t, m, s, l) {
    try {
      if (errRing.length >= 3) { return; }
      var last = errRing[errRing.length - 1];
      var mm = maskMsg(m);
      if (last && last.m === mm) { return; } // drop consecutive duplicates
      errRing.push({ t: t || new Date().toISOString(), m: mm, s: s || '', l: l || '' });
    } catch (e) {}
  }
  try {
    window.addEventListener('error', function (e) {
      pushErr(new Date().toISOString(), e && e.message, e && e.filename, (e ? (e.lineno + ':' + e.colno) : ''));
    });
    window.addEventListener('unhandledrejection', function (e) {
      var reason = e && e.reason;
      var msg = (reason && (reason.message || reason.code)) || String(reason || 'unhandledrejection');
      pushErr(new Date().toISOString(), msg, '', '');
    });
  } catch (e) {}

  // ================================================================ 1. config gate
  var cfg = window.MICEGO_FEEDBACK || {};
  var HAS_BACKEND = !!(cfg.supabaseUrl);

  function uuidv4() {
    try { if (window.crypto && crypto.randomUUID) { return crypto.randomUUID(); } } catch (e) {}
    var seed = (typeof Date !== 'undefined' && Date.now) ? Date.now() : Math.floor(Math.random() * 1e12);
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (seed + Math.random() * 16) % 16 | 0; seed = Math.floor(seed / 16);
      var v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function sha256hex8(str, cb) {
    try {
      if (!(window.crypto && crypto.subtle && crypto.subtle.digest && window.TextEncoder)) { cb(null); return; }
      var bytes = new TextEncoder().encode(str);
      crypto.subtle.digest('SHA-256', bytes).then(function (buf) {
        var arr = new Uint8Array(buf), hex = '';
        for (var i = 0; i < arr.length; i++) { var h = arr[i].toString(16); if (h.length < 2) { h = '0' + h; } hex += h; }
        cb(hex.slice(0, 8));
      }, function () { cb(null); });
    } catch (e) { cb(null); }
  }

  // ================================================================ 2. i18n
  var I18N = {
    ko: {
      launcher: '의견 보내기', title: '의견 보내기',
      intro: '불편한 점이나 바라는 점을 알려 주세요. 담당자가 직접 확인합니다.',
      close: '닫기',
      demoNotice: '테스트 화면이라 운영팀 알림은 보내지 않습니다. 접수는 기록됩니다.',
      catLegend: '어떤 내용인가요?',
      catSYS: '화면·기능 문제', catSYSDesc: '오류, 잘못된 문구, 개선 아이디어',
      catOPS: '견적·운영 문의', catOPSDesc: '견적 요청, 제안, 계정, 파트너 관련',
      catETC: '기타', catETCDesc: '위에 해당하지 않는 내용',
      contentLabel: '내용', contentPh: '어떤 화면에서 무엇을 하다가 어떤 일이 있었는지 적어 주세요.',
      counter: '{n} / 2000', counterMin: '20자 이상 적어 주세요',
      emailLabel: '회신 받을 이메일 (선택)', emailHelp: '남겨 주시면 답변을 이 주소로 보내 드립니다.',
      emailPrefilled: '등록된 이메일을 넣어 두었습니다. 다른 주소로 바꿔도 됩니다.',
      consentLabel: '회신을 위해 이메일을 수집·이용하는 데 동의합니다. (12개월 보관 후 파기)',
      consentLink: '개인정보처리방침',
      ctxSummary: '함께 보내는 정보',
      ctxBody: '문제를 빨리 찾기 위해 지금 보고 있는 페이지 주소(접속 링크의 비밀 코드 제외), 화면 상태, 요청번호, 브라우저 종류, 화면 크기, 최근 오류 기록이 함께 전송됩니다. IP 주소는 저장하지 않습니다.',
      submit: '보내기', submitting: '보내는 중…', submittingLocked: '보내는 중입니다. 잠시만 기다려 주세요.',
      doneTitle: '접수되었습니다', doneRefLabel: '접수번호',
      doneAck: '확인 메일을 곧 보내 드립니다. 답변도 같은 주소로 드립니다.',
      doneNoEmail: '회신 이메일을 남기지 않으셔서 따로 답변드리기는 어렵습니다. 보내 주신 내용은 꼭 확인하겠습니다.',
      copyRef: '접수번호 복사', copied: '복사했습니다', doneClose: '닫기',
      errCategory: '어떤 내용인지 골라 주세요.',
      errShort: '20자 이상 적어 주세요. 지금 {n}자입니다.',
      errLong: '2,000자까지 쓸 수 있습니다. {n}자를 줄여 주세요.',
      errEmail: '이메일 형식을 확인해 주세요.',
      errConsent: '이메일을 남기시려면 동의에 체크해 주세요.',
      errNetwork: '인터넷 연결이 불안정해 보내지 못했습니다. 연결을 확인하고 다시 보내 주세요.',
      errTimeout: '응답이 늦어 전송 결과를 확인하지 못했습니다. 다시 보내도 중복으로 접수되지 않습니다.',
      errRate: '짧은 시간에 여러 번 보내셨습니다. {m}분 뒤에 다시 보내 주세요.',
      errDuplicate: '같은 내용이 이미 접수되어 있습니다. 덧붙일 내용이 있으면 새로 적어 보내 주세요.',
      errBusy: '지금은 접수가 몰려 받지 못했습니다. 잠시 뒤 다시 보내거나 아래 방법으로 보내 주세요.',
      errServer: '일시적인 문제로 보내지 못했습니다. 다시 보내 주세요.',
      retry: '다시 보내기', edit: '내용 고치기',
      fbTitle: '다른 방법으로 보내기',
      fbCopy: '내용 복사', fbMail: '메일로 보내기', fbContact: '문의 페이지로 이동',
      fbCopyHint: '복사한 내용을 메일이나 문의 페이지에 붙여 넣어 주세요.',
      pendingBanner: '이전에 보낸 내용의 전송 결과를 확인하지 못했습니다. 다시 보내도 중복으로 접수되지 않습니다.',
      pendingResend: '다시 보내기', pendingDiscard: '지우기',
      noscript: '의견이나 문제 신고는 {문의 페이지} 또는 {메일}로 보내 주세요.',
      userType: { travel_agency: '여행사 회원', organizer_guest: '비회원 요청자', hotel: '호텔', admin: '운영자', visitor: '방문자' }
    },
    en: {
      launcher: 'Feedback', title: 'Send feedback',
      intro: "Tell us what's not working or what you'd like to see. A person on our team reads every message.",
      close: 'Close',
      demoNotice: "This is a test page. Your message is saved, but our team won't be notified.",
      catLegend: 'What is this about?',
      catSYS: 'Site problem', catSYSDesc: 'Errors, wrong text, or ideas to improve',
      catOPS: 'Quotes & operations', catOPSDesc: 'Requests, bids, accounts, or partnership',
      catETC: 'Something else', catETCDesc: 'Anything not listed above',
      contentLabel: 'Message', contentPh: 'Tell us which page you were on, what you were doing, and what happened.',
      counter: '{n} / 2000', counterMin: 'At least 20 characters',
      emailLabel: 'Email for a reply (optional)', emailHelp: "Leave your email if you'd like a reply.",
      emailPrefilled: "We've filled in your email on file. You can change it.",
      consentLabel: 'I agree that MICEGO may use this email to reply. (Deleted after 12 months)',
      consentLink: 'Privacy notice',
      ctxSummary: 'Also sent with your message',
      ctxBody: "To help us find the problem, we include the page address (without your private link code), page status, request number, browser type, screen size, and recent error logs. We don't store your IP address.",
      submit: 'Send', submitting: 'Sending…', submittingLocked: 'Sending now. Please wait a moment.',
      doneTitle: 'Message received', doneRefLabel: 'Reference',
      doneAck: "We'll send a confirmation email shortly, and reply to the same address.",
      doneNoEmail: "You didn't leave an email, so we can't reply directly. We'll still review your message.",
      copyRef: 'Copy reference', copied: 'Copied', doneClose: 'Done',
      errCategory: 'Please choose a topic.',
      errShort: 'Please write at least 20 characters ({n} so far).',
      errLong: 'Please keep it under 2,000 characters ({n} over).',
      errEmail: 'Please check the email address.',
      errConsent: 'Please tick the box to let us reply by email.',
      errNetwork: "We couldn't send your message due to a connection problem. Please check your connection and try again.",
      errTimeout: "The server took too long to respond. You can send again — it won't be duplicated.",
      errRate: "You've sent several messages in a short time. Please try again in {m} min.",
      errDuplicate: 'This message has already been received. To add details, please write a new message.',
      errBusy: "We're receiving too many messages right now. Please try again later or use an option below.",
      errServer: 'Something went wrong on our side. Please try again.',
      retry: 'Try again', edit: 'Edit message',
      fbTitle: 'Other ways to reach us',
      fbCopy: 'Copy message', fbMail: 'Send by email', fbContact: 'Go to contact page',
      fbCopyHint: 'Paste the copied text into an email or the contact form.',
      pendingBanner: "We couldn't confirm your last message was sent. Sending again won't create a duplicate.",
      pendingResend: 'Send again', pendingDiscard: 'Discard',
      noscript: 'To send feedback or report a problem, use the {contact page} or {email}.',
      userType: { travel_agency: 'Agency member', organizer_guest: 'Guest requester', hotel: 'Hotel', admin: 'Operator', visitor: 'Visitor' }
    }
  };

  // ================================================================ 3. lang / mode / page detection
  var PATH = location.pathname;
  function detectLang() {
    if (cfg.mode === 'en') { return 'en'; }
    if (/\/en\//.test(PATH)) { return 'en'; }
    if (/\/(ko|admin)\//.test(PATH) || PATH === '/' || /\/index\.html$/.test(PATH)) { return 'ko'; }
    try { return (navigator.language || '').slice(0, 2) === 'en' ? 'en' : 'ko'; } catch (e) { return 'ko'; }
  }
  var LANG = detectLang();
  var T = I18N[LANG];
  function tr(key, vars) {
    var s = T[key] != null ? T[key] : key;
    if (vars) {
      for (var k in vars) { if (vars.hasOwnProperty(k)) { s = s.replace('{' + k + '}', vars[k]); } }
    }
    return s;
  }
  function detectMode() {
    if (/^\/admin\//.test(PATH)) { return 'admin'; }
    if (/^\/en\//.test(PATH)) { return 'hotel'; }
    if (/^\/ko\//.test(PATH) || PATH === '/') { return 'agency'; }
    return 'root';
  }
  var MODE = detectMode();

  var LAUNCHER_OFF = (document.documentElement.getAttribute('data-mgfb-launcher') === 'off') || (cfg.launcher === false) || !!cfg.disabled;

  // ================================================================ 4. session (mg_session_v1 --
  // assets/mg.js's own storage key/shape; the widget reads it directly so it keeps working even if
  // mg.js itself failed to load or initialize. Shape: {session:{access_token,...}, member:{...}}).
  function readMgSession() {
    var raw = null;
    try { raw = window.localStorage.getItem('mg_session_v1'); } catch (e) {}
    if (!raw) { try { raw = window.sessionStorage.getItem('mg_session_v1'); } catch (e) {} }
    if (!raw) { return null; }
    try {
      var obj = JSON.parse(raw);
      return obj && obj.session && obj.session.access_token ? obj.session : null;
    } catch (e) { return null; }
  }

  // ================================================================ 5. token / rfp / context
  function detectToken() {
    var qs = null;
    try { qs = new URLSearchParams(location.search); } catch (e) {}
    var t = (qs && qs.get('t')) || '';
    var s = (qs && qs.get('s')) || '';
    var pageState = window.MICEGO_PAGE_STATE || {};
    var kind = pageState.tokenKind || null;
    var raw = null;
    if (kind === 'share') { raw = s || t || null; }
    else if (kind) { raw = t || s || null; }
    else if (/\/track\.html$/.test(PATH) && s) { kind = 'share'; raw = s; }
    else if (/\/track\.html$/.test(PATH) && t) { kind = 'track'; raw = t; }
    else if (/\/bid\.html$/.test(PATH) && t) { kind = 'bid'; raw = t; }
    return { kind: kind, raw: raw };
  }

  function shortUA() {
    var ua = ''; try { ua = navigator.userAgent || ''; } catch (e) {}
    var os = 'Other';
    var m;
    if (/iPhone|iPad|iPod/.test(ua)) { m = /OS (\d+)[_.]?(\d+)?/.exec(ua); os = 'iOS ' + (m ? (m[1] + (m[2] ? '.' + m[2] : '')) : ''); }
    else if (/Android/.test(ua)) { m = /Android (\d+)/.exec(ua); os = 'Android ' + (m ? m[1] : ''); }
    else if (/Windows/.test(ua)) { os = 'Windows'; }
    else if (/Macintosh|Mac OS X/.test(ua)) { os = 'Mac'; }
    var browser = 'Other';
    if (/EdgiOS|Edg\//.test(ua)) { browser = 'Edge'; }
    else if (/SamsungBrowser/.test(ua)) { browser = 'Samsung'; }
    else if (/Whale/.test(ua)) { browser = 'Whale'; }
    else if (/CriOS|Chrome\//.test(ua)) { m = /(?:CriOS|Chrome)\/(\d+)/.exec(ua); browser = 'Chrome ' + (m ? m[1] : ''); }
    else if (/Firefox|FxiOS/.test(ua)) { browser = 'Firefox'; }
    else if (/Safari/.test(ua)) { browser = 'Safari'; }
    var inapp = '';
    if (/KAKAOTALK/i.test(ua)) { inapp = 'KakaoTalk'; }
    else if (/NAVER\(/i.test(ua)) { inapp = 'NaverApp'; }
    else if (/Instagram/i.test(ua)) { inapp = 'Instagram'; }
    else if (/FBAN|FBAV/i.test(ua)) { inapp = 'Facebook'; }
    else if (/Line\//i.test(ua)) { inapp = 'LINE'; }
    else if (/DaumApps/i.test(ua)) { inapp = 'Daum'; }
    else if (/; wv\)/i.test(ua)) { inapp = 'WebView'; }
    var out = os + ' · ' + browser;
    if (inapp) { out += ' · ' + inapp; }
    return out.slice(0, 120);
  }

  function isInAppUA() {
    var ua = ''; try { ua = navigator.userAgent || ''; } catch (e) {}
    return /KAKAOTALK|NAVER\(|Instagram|FBAN|FBAV|Line\/|DaumApps|; wv\)/i.test(ua);
  }

  function refFromReferrer() {
    var r = ''; try { r = document.referrer || ''; } catch (e) {}
    if (!r) { return null; }
    try {
      var u = new URL(r);
      if (u.origin === location.origin) { return u.pathname.slice(0, 200); }
      return u.hostname.replace(/^www\./, '').slice(0, 200);
    } catch (e) { return null; }
  }

  function pageLangFromPath() { return LANG; }

  var OPEN_AT = null; // dwell timer start (set on open(), preserved across a restored draft)

  // Builds the ctx object synchronously except token_hash8 (async, via cb).
  function buildCtx(cb) {
    var pageState = window.MICEGO_PAGE_STATE || {};
    var qs = null;
    try { qs = new URLSearchParams(location.search); } catch (e) {}
    var qState = qs && qs.get('state');
    var uiState = qState ? ('preview:' + qState) : (pageState.state || null);
    if (uiState && uiState.length > 32) { uiState = uiState.slice(0, 32); }
    var rfpRef = pageState.rfpRef || null;
    if (rfpRef && !/^MG-\d{4}-\d{3,4}$/.test(rfpRef)) { rfpRef = null; }
    var tok = detectToken();
    var buildVersion = cfg.buildVersion || null;
    if (!buildVersion) {
      try {
        var m = document.querySelector('meta[name="micego-build"]');
        buildVersion = m ? m.getAttribute('content') : null;
      } catch (e) {}
    }
    var tz = null;
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch (e) {}
    var vp = null;
    try { vp = window.innerWidth + 'x' + window.innerHeight + '@' + (window.devicePixelRatio || 1); } catch (e) {}
    var errs = [];
    for (var i = 0; i < errRing.length; i++) { errs.push(errRing[i]); }

    var base = {
      page_path: PATH.slice(0, 200), mode: MODE, lang: LANG, ui_state: uiState, rfp_ref: rfpRef,
      token_kind: tok.kind, token_hash8: null, viewport: vp, ua: shortUA(), referrer: refFromReferrer(),
      last_js_errors: errs.length ? errs : null, tz: tz, build_version: buildVersion,
      submitted_at: new Date().toISOString(), is_demo_hint: (document.documentElement.getAttribute('data-mode') === 'demo') || !!qState,
      user_type_hint: clientUserTypeHint()
    };
    if (tok.kind && tok.raw) {
      sha256hex8(tok.raw, function (hash) {
        base.token_hash8 = hash;
        if (!hash) { base.token_kind = null; }
        cb(base);
      });
    } else {
      cb(base);
    }
  }

  function clientUserTypeHint() {
    if (MODE === 'admin') { return 'admin'; }
    var tok = detectToken();
    if (tok.kind === 'bid') { return 'hotel'; }
    var sess = readMgSession();
    if (sess && MODE === 'agency') { return 'travel_agency'; }
    if (tok.kind === 'track' || tok.kind === 'share') { return 'organizer_guest'; }
    return 'visitor';
  }

  // ================================================================ 6. storage helpers (try/catch everywhere)
  function ss() { try { return window.sessionStorage; } catch (e) { return null; } }
  function draftKey() { return 'mgfb:draft:' + PATH; }
  function saveDraft(obj) { try { var s = ss(); if (s) { s.setItem(draftKey(), JSON.stringify(obj)); } } catch (e) {} }
  function loadDraft() { try { var s = ss(); var v = s && s.getItem(draftKey()); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function clearDraft() { try { var s = ss(); if (s) { s.removeItem(draftKey()); } } catch (e) {} }
  function savePending(obj) { try { var s = ss(); if (s) { s.setItem('mgfb:pending', JSON.stringify(obj)); } } catch (e) {} }
  function loadPending() { try { var s = ss(); var v = s && s.getItem('mgfb:pending'); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function clearPending() { try { var s = ss(); if (s) { s.removeItem('mgfb:pending'); } } catch (e) {} }

  // ================================================================ 7. network
  function endpoint() {
    var fu = cfg.functionsUrl || (cfg.supabaseUrl ? cfg.supabaseUrl.replace(/\/$/, '') + '/functions/v1' : '');
    return fu ? fu.replace(/\/$/, '') + '/feedback-submit' : '';
  }

  // opts.timeoutMs lets tests override the 15s default so a "timeout" scenario doesn't need a real 15s wait.
  function postSubmit(payload, opts) {
    opts = opts || {};
    var url = endpoint();
    if (!url) { return Promise.reject({ code: 'INTERNAL', message: 'not configured' }); }
    var controller = null, signal;
    try { controller = new AbortController(); signal = controller.signal; } catch (e) { signal = undefined; }
    var timeoutMs = opts.timeoutMs || 15000;
    var timer = setTimeout(function () { try { if (controller) { controller.abort(); } } catch (e) {} }, timeoutMs);
    return fetch(url, {
      method: 'POST', mode: 'cors', credentials: 'omit', keepalive: true,
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(payload), signal: signal
    }).then(function (r) {
      clearTimeout(timer);
      return r.text().then(function (txt) {
        var body = {}; try { body = txt ? JSON.parse(txt) : {}; } catch (e) {}
        if (!r.ok) {
          var err = (body && body.error) || { code: 'INTERNAL' };
          err.httpStatus = r.status;
          return Promise.reject(err);
        }
        return body;
      });
    }, function (e) {
      clearTimeout(timer);
      if (e && e.name === 'AbortError') { return Promise.reject({ code: 'TIMEOUT' }); }
      return Promise.reject({ code: 'NETWORK' });
    });
  }

  // ================================================================ 8. shadow DOM + markup (only when
  // there is somewhere for it to submit to, or when we at least need MICEGO_FB.submit for contact.html)
  var STATE = 'closed'; // closed|open|submitting|done|error
  var CSID = null;
  var LAST_PAYLOAD = null;
  var OPENER_EL = null;
  var scrollY0 = 0, prevOverflow = '';
  var fixedBottomEls = [];
  var host, root, dialogEl, launcherEl, backdropEl;

  function ensureDom() {
    if (host) { return; }
    host = document.createElement('div');
    host.id = 'mgfb-host';
    document.body.appendChild(host);
    try { root = host.attachShadow({ mode: 'open' }); } catch (e) { root = host; }
    root.innerHTML = STYLE + markup();
    launcherEl = root.getElementById ? root.getElementById('mgfbLauncher') : root.querySelector('#mgfbLauncher');
    dialogEl = root.querySelector('#mgfbDialog');
    backdropEl = root.querySelector('#mgfbBackdrop');
    wireStatic();
    watchFixedBottom();
    watchViewport();
  }

  var STYLE = '<style>' +
    ':host{--mgfb-accent:#0B8F86;--mgfb-accent-strong:#087A72;--mgfb-amber:#FFC24B;--mgfb-ink:#0F1E3D;--mgfb-ink-2:#4A5670;' +
    '--mgfb-line:#E3E7EE;--mgfb-bg:#FFF;--mgfb-danger:#C62828;--mgfb-radius:12px;--mgfb-sheet-radius:16px;' +
    '--mgfb-z-launcher:980;--mgfb-z-dialog:10000;--mgfb-offset:0px;--mgfb-safe:env(safe-area-inset-bottom,0px);' +
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Pretendard,sans-serif;color:var(--mgfb-ink);box-sizing:border-box}' +
    '*,*::before,*::after{box-sizing:border-box}' +
    '.mgfb-launcher{position:fixed;right:16px;bottom:calc(16px + var(--mgfb-offset) + var(--mgfb-safe));z-index:var(--mgfb-z-launcher);' +
    'display:inline-flex;align-items:center;gap:6px;height:44px;padding:0 14px;border-radius:22px;border:none;cursor:pointer;' +
    'background:var(--mgfb-accent);color:#fff;font:600 13.5px/1 inherit;box-shadow:0 4px 14px rgba(15,30,61,.22)}' +
    '.mgfb-launcher svg{width:20px;height:20px;flex:none}' +
    '@media (max-width:767px){.mgfb-launcher{width:44px;height:44px;padding:0;border-radius:50%}.mgfb-launcher .mgfb-l-txt{display:none}}' +
    '.mgfb-launcher.is-hidden{display:none}' +
    '.mgfb-dot{position:absolute;top:6px;right:6px;width:9px;height:9px;border-radius:50%;background:var(--mgfb-amber);border:1.5px solid #fff}' +
    '.mgfb-backdrop{position:fixed;inset:0;background:rgba(15,30,61,.2);z-index:calc(var(--mgfb-z-dialog) - 1);display:none}' +
    '.mgfb-backdrop.is-open{display:block}' +
    '@media (max-width:767px){.mgfb-backdrop.is-open{background:rgba(15,30,61,.45)}}' +
    '.mgfb-dialog{position:fixed;z-index:var(--mgfb-z-dialog);background:var(--mgfb-bg);display:none;flex-direction:column;' +
    'overflow:hidden auto;overscroll-behavior:contain}' +
    '.mgfb-dialog.is-open{display:flex}' +
    '@media (max-width:767px){.mgfb-dialog{left:0;right:0;bottom:0;max-height:min(90dvh,680px);border-radius:16px 16px 0 0;' +
    'padding-bottom:calc(16px + env(safe-area-inset-bottom))}}' +
    '@media (min-width:768px){.mgfb-dialog{right:24px;bottom:calc(24px + var(--mgfb-offset));width:380px;' +
    'max-height:min(640px,calc(100dvh - 48px));border-radius:16px;box-shadow:0 12px 40px rgba(15,30,61,.28)}}' +
    '.mgfb-inner{padding:18px 18px 20px;display:flex;flex-direction:column;gap:12px}' +
    '.mgfb-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}' +
    '.mgfb-head h2{font-size:17px;margin:0;line-height:1.4}' +
    '.mgfb-close{border:none;background:transparent;cursor:pointer;width:32px;height:32px;border-radius:8px;color:var(--mgfb-ink-2);flex:none}' +
    '.mgfb-close:hover{background:var(--mgfb-line)}' +
    '.mgfb-intro{font-size:13.5px;line-height:1.6;color:var(--mgfb-ink-2);margin:0}' +
    '.mgfb-demo{font-size:12.5px;background:#FFF6E0;color:#8A5A00;border-radius:8px;padding:8px 10px;line-height:1.5}' +
    'fieldset{border:none;padding:0;margin:0}' +
    'legend{font-size:13px;font-weight:700;margin-bottom:8px;padding:0}' +
    '.mgfb-cats{display:flex;flex-direction:column;gap:8px}' +
    '.mgfb-cat{display:flex;gap:8px;align-items:flex-start;border:1.5px solid var(--mgfb-line);border-radius:10px;padding:10px 12px;cursor:pointer}' +
    '.mgfb-cat:has(input:checked){border-color:var(--mgfb-accent);background:rgba(11,143,134,.06)}' +
    '.mgfb-cat input{margin-top:3px}' +
    '.mgfb-cat .t{font-size:13.5px;font-weight:700}' +
    '.mgfb-cat .d{font-size:12px;color:var(--mgfb-ink-2)}' +
    'label{font-size:13px;font-weight:700;display:block;margin-bottom:4px}' +
    'textarea,input[type=text],input[type=email]{width:100%;border:1.5px solid var(--mgfb-line);border-radius:8px;' +
    'padding:10px 12px;font:400 16px/1.5 inherit;color:var(--mgfb-ink);background:#fff}' +
    'textarea{min-height:96px;resize:vertical}' +
    '.mgfb-counter{font-size:11.5px;color:var(--mgfb-ink-2);text-align:right;margin-top:2px}' +
    '.mgfb-err{color:var(--mgfb-danger);font-size:12px;margin-top:4px;min-height:1.4em}' +
    '.mgfb-field[data-invalid="true"] textarea,.mgfb-field[data-invalid="true"] input{border-color:var(--mgfb-danger)}' +
    '.mgfb-consent{display:flex;gap:8px;align-items:flex-start;font-size:12.5px;color:var(--mgfb-ink-2);line-height:1.5}' +
    '.mgfb-consent a{color:var(--mgfb-accent-strong)}' +
    'details.mgfb-details{font-size:12.5px;color:var(--mgfb-ink-2)}' +
    'details.mgfb-details summary{cursor:pointer;font-weight:600;color:var(--mgfb-ink)}' +
    '.mgfb-submit{min-height:48px;border:none;border-radius:10px;background:var(--mgfb-accent-strong);color:#fff;' +
    'font:700 15px/1 inherit;cursor:pointer;width:100%}' +
    '.mgfb-submit[aria-disabled="true"]{opacity:.6;cursor:default}' +
    '.mgfb-status{font-size:12.5px;min-height:1.2em}' +
    '.mgfb-status.is-err{color:var(--mgfb-danger)}' +
    '.mgfb-done-ref{font:700 20px/1.2 ui-monospace,monospace;letter-spacing:.02em}' +
    '.mgfb-actions{display:flex;gap:8px;flex-wrap:wrap}' +
    '.mgfb-btn{min-height:44px;padding:0 14px;border-radius:8px;border:1.5px solid var(--mgfb-line);background:#fff;' +
    'cursor:pointer;font:600 13.5px/1 inherit;color:var(--mgfb-ink)}' +
    '.mgfb-btn.is-accent{background:var(--mgfb-accent-strong);border-color:var(--mgfb-accent-strong);color:#fff}' +
    '[hidden]{display:none!important}' +
    'input:focus-visible,textarea:focus-visible,button:focus-visible,a:focus-visible{outline:2px solid var(--mgfb-accent-strong);outline-offset:2px}' +
    '@media (prefers-reduced-motion:no-preference){.mgfb-dialog{transition:transform .15s ease}}' +
    '@media print{:host{display:none}}' +
    '</style>';

  function markup() {
    return (
      '<button type="button" class="mgfb-launcher" id="mgfbLauncher" aria-haspopup="dialog" aria-expanded="false" aria-controls="mgfbDialog" aria-label="' + tr('launcher') + '">' +
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5h16v11H8l-4 4V5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>' +
      '<span class="mgfb-l-txt">' + tr('launcher') + '</span><span class="mgfb-dot" id="mgfbDot" hidden></span></button>' +
      '<div class="mgfb-backdrop" id="mgfbBackdrop"></div>' +
      '<div class="mgfb-dialog" id="mgfbDialog" role="dialog" aria-modal="true" aria-labelledby="mgfbTitle" aria-describedby="mgfbIntro">' +
      '<div class="mgfb-inner" id="mgfbInner">' +
      '<div class="mgfb-head"><h2 id="mgfbTitle">' + tr('title') + '</h2>' +
      '<button type="button" class="mgfb-close" id="mgfbClose" aria-label="' + tr('close') + '">&times;</button></div>' +
      '<p class="mgfb-intro" id="mgfbIntro">' + tr('intro') + '</p>' +
      '<div class="mgfb-demo" id="mgfbDemoNotice" hidden>' + tr('demoNotice') + '</div>' +
      '<div class="mgfb-pending" id="mgfbPendingBanner" hidden>' +
      '<p class="mgfb-intro">' + tr('pendingBanner') + '</p>' +
      '<div class="mgfb-actions"><button type="button" class="mgfb-btn is-accent" id="mgfbPendingResend">' + tr('pendingResend') + '</button>' +
      '<button type="button" class="mgfb-btn" id="mgfbPendingDiscard">' + tr('pendingDiscard') + '</button></div></div>' +
      '<form id="mgfbForm" novalidate>' +
      '<fieldset class="mgfb-field" id="mgfbCatField"><legend>' + tr('catLegend') + '</legend>' +
      '<div class="mgfb-cats">' +
      catRadio('SYS', tr('catSYS'), tr('catSYSDesc')) +
      catRadio('OPS', tr('catOPS'), tr('catOPSDesc')) +
      catRadio('ETC', tr('catETC'), tr('catETCDesc')) +
      '</div><div class="mgfb-err" id="mgfbErrCat" role="alert"></div></fieldset>' +
      '<div class="mgfb-field" id="mgfbContentField">' +
      '<label for="mgfbContent">' + tr('contentLabel') + '</label>' +
      '<textarea id="mgfbContent" maxlength="2000" placeholder="' + tr('contentPh') + '" aria-describedby="mgfbCounter mgfbErrContent"></textarea>' +
      '<div class="mgfb-counter" id="mgfbCounter">0 / 2000</div>' +
      '<div class="mgfb-err" id="mgfbErrContent" role="alert"></div></div>' +
      '<div class="mgfb-field" id="mgfbEmailField">' +
      '<label for="mgfbEmail">' + tr('emailLabel') + '</label>' +
      '<input type="email" id="mgfbEmail" autocomplete="email" aria-describedby="mgfbEmailHelp mgfbErrEmail">' +
      '<p class="mgfb-intro" id="mgfbEmailHelp" style="font-size:12px">' + tr('emailHelp') + '</p>' +
      '<div class="mgfb-err" id="mgfbErrEmail" role="alert"></div></div>' +
      '<div class="mgfb-field" id="mgfbConsentField" hidden>' +
      '<label class="mgfb-consent"><input type="checkbox" id="mgfbConsent">' +
      '<span>' + tr('consentLabel') + '</span></label>' +
      '<div class="mgfb-err" id="mgfbErrConsent" role="alert"></div></div>' +
      '<input type="text" name="mgfb_website" id="mgfbHp" tabindex="-1" autocomplete="off" aria-hidden="true" ' +
      'style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden">' +
      '<details class="mgfb-details"><summary>' + tr('ctxSummary') + '</summary><p>' + tr('ctxBody') + '</p></details>' +
      '<button type="submit" class="mgfb-submit" id="mgfbSubmit" aria-disabled="true">' + tr('submit') + '</button>' +
      '<div class="mgfb-status" id="mgfbStatus" role="status" aria-live="polite"></div>' +
      '</form>' +
      '<div id="mgfbDone" hidden>' +
      '<h2>' + tr('doneTitle') + '</h2>' +
      '<p>' + tr('doneRefLabel') + ': <span class="mgfb-done-ref" id="mgfbDoneRef"></span></p>' +
      '<p class="mgfb-intro" id="mgfbDoneAck"></p>' +
      '<div class="mgfb-actions"><button type="button" class="mgfb-btn" id="mgfbCopyRef">' + tr('copyRef') + '</button>' +
      '<button type="button" class="mgfb-btn is-accent" id="mgfbDoneClose">' + tr('doneClose') + '</button></div></div>' +
      '<div id="mgfbErrorPanel" hidden>' +
      '<p class="mgfb-status is-err" id="mgfbErrorMsg" role="alert"></p>' +
      '<div class="mgfb-actions"><button type="button" class="mgfb-btn is-accent" id="mgfbRetryBtn">' + tr('retry') + '</button>' +
      '<button type="button" class="mgfb-btn" id="mgfbEditBtn">' + tr('edit') + '</button></div>' +
      '<div id="mgfbFallback" hidden><h3 style="font-size:13px">' + tr('fbTitle') + '</h3>' +
      '<div class="mgfb-actions" id="mgfbFallbackActions"></div>' +
      '<p class="mgfb-intro" style="font-size:11.5px">' + tr('fbCopyHint') + '</p></div>' +
      '</div>' +
      '</div></div>'
    );
  }
  function catRadio(val, t, d) {
    return '<label class="mgfb-cat"><input type="radio" name="mgfbCat" value="' + val + '"><span><span class="t">' + t + '</span><br><span class="d">' + d + '</span></span></label>';
  }

  // ================================================================ 9. fixed-bottom offset (SPEC §4.9)
  function computeOffset() {
    var max = 0;
    for (var i = 0; i < fixedBottomEls.length; i++) {
      var el = fixedBottomEls[i];
      if (!el || !el.isConnected) { continue; }
      var cs; try { cs = getComputedStyle(el); } catch (e) { cs = null; }
      if (cs && (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0')) { continue; }
      var r; try { r = el.getBoundingClientRect(); } catch (e) { continue; }
      if (r.height === 0 || r.top >= window.innerHeight) { continue; }
      var v = window.innerHeight - r.top;
      if (v > max) { max = v; }
    }
    if (host) {
      host.style.setProperty('--mgfb-offset', (max ? (max + 8) : 0) + 'px');
      host.style.setProperty('--mgfb-safe', max ? '0px' : 'env(safe-area-inset-bottom, 0px)');
    }
  }
  var offsetRaf = null, offsetSettleTimer = null;
  function scheduleOffset() {
    if (!offsetRaf) {
      offsetRaf = requestAnimationFrame(function () { offsetRaf = null; computeOffset(); });
    }
    // The site's own .mobile-cta show/hide is class-toggled with a CSS transition (transform .2s
    // ease), so a getBoundingClientRect() read right after the mutation (or even one rAF later)
    // still reflects the pre-transition box. Re-measure once more after the transition settles.
    try { clearTimeout(offsetSettleTimer); } catch (e) {}
    offsetSettleTimer = setTimeout(computeOffset, 260);
  }
  function watchFixedBottom() {
    fixedBottomEls = Array.prototype.slice.call(document.querySelectorAll('[data-mg-fixed-bottom]'));
    computeOffset();
    try {
      window.addEventListener('scroll', scheduleOffset, { passive: true });
      window.addEventListener('resize', scheduleOffset);
      if (window.ResizeObserver) {
        var ro = new ResizeObserver(scheduleOffset);
        for (var i = 0; i < fixedBottomEls.length; i++) { ro.observe(fixedBottomEls[i]); }
      }
      if (window.MutationObserver) {
        var mo = new MutationObserver(scheduleOffset);
        for (var j = 0; j < fixedBottomEls.length; j++) { mo.observe(fixedBottomEls[j], { attributes: true, attributeFilter: ['class', 'style', 'hidden'] }); }
      }
    } catch (e) {}
    try {
      if (window.matchMedia && window.matchMedia('(pointer:coarse)').matches) {
        document.addEventListener('focusin', function (e) {
          if (host && e.target && !host.contains(e.target) && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) {
            if (launcherEl) { launcherEl.classList.add('is-hidden'); }
          }
        });
        document.addEventListener('focusout', function (e) {
          if (host && e.target && !host.contains(e.target) && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) {
            if (launcherEl && STATE === 'closed') { launcherEl.classList.remove('is-hidden'); }
          }
        });
      }
    } catch (e) {}
  }
  function watchViewport() {
    try {
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', scheduleOffset);
      }
    } catch (e) {}
  }

  // ================================================================ 10. focus trap / scroll lock / inert
  var focusables = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';
  function trapKeydown(e) {
    if (e.key === 'Escape') {
      if (STATE === 'submitting') { return; }
      e.preventDefault(); close();
      return;
    }
    if (e.key !== 'Tab') { return; }
    var nodes = Array.prototype.slice.call(dialogEl.querySelectorAll(focusables)).filter(function (n) { return n.offsetParent !== null || n === document.activeElement; });
    if (!nodes.length) { return; }
    var first = nodes[0], last = nodes[nodes.length - 1];
    var active = root.activeElement || (root.host === host ? host : null);
    if (e.shiftKey) {
      if (active === first || !dialogEl.contains(active)) { e.preventDefault(); last.focus(); }
    } else {
      if (active === last) { e.preventDefault(); first.focus(); }
    }
  }
  function lockScroll() {
    scrollY0 = window.scrollY || 0;
    prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
  }
  function unlockScroll() {
    document.documentElement.style.overflow = prevOverflow;
  }
  var inertTargets = [];
  function setInert(on) {
    try {
      inertTargets = Array.prototype.slice.call(document.body.children).filter(function (c) { return c !== host; });
      for (var i = 0; i < inertTargets.length; i++) {
        if (on) { inertTargets[i].setAttribute('inert', ''); inertTargets[i].setAttribute('aria-hidden', 'true'); }
        else { inertTargets[i].removeAttribute('inert'); inertTargets[i].removeAttribute('aria-hidden'); }
      }
    } catch (e) {}
  }

  // ================================================================ 11. open/close/state machine
  function setPanel(which) {
    var form = root.getElementById ? root.getElementById('mgfbForm') : root.querySelector('#mgfbForm');
    var done = root.querySelector('#mgfbDone');
    var errp = root.querySelector('#mgfbErrorPanel');
    form.hidden = which !== 'form';
    done.hidden = which !== 'done';
    errp.hidden = which !== 'error';
  }

  function updateConsentVisibility() {
    var email = root.querySelector('#mgfbEmail').value.trim();
    var field = root.querySelector('#mgfbConsentField');
    field.hidden = !email;
    if (!email) { root.querySelector('#mgfbConsent').checked = false; }
  }

  function wireStatic() {
    launcherEl.addEventListener('click', function () { open(); });
    root.querySelector('#mgfbClose').addEventListener('click', function () { close(); });
    backdropEl.addEventListener('click', function () { if (STATE !== 'submitting') { close(); } });
    dialogEl.addEventListener('keydown', trapKeydown);
    root.querySelector('#mgfbEmail').addEventListener('input', updateConsentVisibility);
    var content = root.querySelector('#mgfbContent');
    content.addEventListener('input', function () {
      root.querySelector('#mgfbCounter').textContent = tr('counter', { n: content.value.length });
      saveDraftNow();
      updateSubmitEnabled();
    });
    root.querySelectorAll('input[name=mgfbCat]').forEach(function (r) { r.addEventListener('change', function () { saveDraftNow(); }); });
    root.querySelector('#mgfbForm').addEventListener('submit', function (e) { e.preventDefault(); onSubmit(); });
    root.querySelector('#mgfbPendingResend').addEventListener('click', resendPending);
    root.querySelector('#mgfbPendingDiscard').addEventListener('click', function () { clearPending(); root.querySelector('#mgfbPendingBanner').hidden = true; });
    root.querySelector('#mgfbCopyRef').addEventListener('click', function () {
      var refEl = root.querySelector('#mgfbDoneRef');
      copyToClipboard(refEl.textContent, function (ok) {
        var btn = root.querySelector('#mgfbCopyRef');
        if (ok) { btn.textContent = tr('copied'); setTimeout(function () { btn.textContent = tr('copyRef'); }, 1600); }
      });
    });
    root.querySelector('#mgfbDoneClose').addEventListener('click', close);
    root.querySelector('#mgfbRetryBtn').addEventListener('click', function () { doSubmitRequest(LAST_PAYLOAD); });
    root.querySelector('#mgfbEditBtn').addEventListener('click', function () { setPanel('form'); STATE = 'open'; updateSubmitEnabled(); });
  }

  function updateSubmitEnabled() {
    var btn = root.querySelector('#mgfbSubmit');
    var okLen = root.querySelector('#mgfbContent').value.trim().length >= 20;
    if (STATE === 'submitting') { return; }
    if (btn.getAttribute('data-locked') === 'true') { return; } // still in the initial 3s window
    btn.setAttribute('aria-disabled', okLen ? 'false' : 'false'); // never actually disabled -- client validation surfaces on submit click
  }

  function saveDraftNow() {
    try {
      var cat = root.querySelector('input[name=mgfbCat]:checked');
      saveDraft({
        content: root.querySelector('#mgfbContent').value, category: cat ? cat.value : null,
        email: root.querySelector('#mgfbEmail').value, consent: root.querySelector('#mgfbConsent').checked,
        at: Date.now()
      });
    } catch (e) {}
  }

  function restoreDraft() {
    var d = loadDraft();
    if (!d) { return; }
    try {
      root.querySelector('#mgfbContent').value = d.content || '';
      root.querySelector('#mgfbCounter').textContent = tr('counter', { n: (d.content || '').length });
      if (d.category) {
        var r = root.querySelector('input[name=mgfbCat][value="' + d.category + '"]');
        if (r) { r.checked = true; }
      }
      root.querySelector('#mgfbEmail').value = d.email || '';
      updateConsentVisibility();
      root.querySelector('#mgfbConsent').checked = !!d.consent;
    } catch (e) {}
  }

  function prefillFromPageState() {
    try {
      var ps = window.MICEGO_PAGE_STATE || {};
      var emailEl = root.querySelector('#mgfbEmail');
      if (ps.prefillEmail && !emailEl.value) {
        emailEl.value = ps.prefillEmail;
        root.querySelector('#mgfbEmailHelp').textContent = tr('emailPrefilled');
        updateConsentVisibility();
      }
    } catch (e) {}
  }

  function open(opts) {
    ensureDom();
    if (STATE !== 'closed') { return; }
    OPENER_EL = document.activeElement;
    STATE = 'open';
    OPEN_AT = Date.now();
    CSID = uuidv4();
    setPanel('form');
    root.querySelector('#mgfbErrCat').textContent = '';
    root.querySelector('#mgfbErrContent').textContent = '';
    root.querySelector('#mgfbErrEmail').textContent = '';
    root.querySelector('#mgfbErrConsent').textContent = '';
    root.querySelector('#mgfbDemoNotice').hidden = !((document.documentElement.getAttribute('data-mode') === 'demo'));
    var pending = loadPending();
    root.querySelector('#mgfbPendingBanner').hidden = !pending;
    restoreDraft();
    prefillFromPageState();
    if (opts && opts.category) {
      var r = root.querySelector('input[name=mgfbCat][value="' + opts.category + '"]');
      if (r) { r.checked = true; }
    }
    backdropEl.classList.add('is-open');
    dialogEl.classList.add('is-open');
    launcherEl.setAttribute('aria-expanded', 'true');
    launcherEl.classList.add('is-hidden');
    lockScroll();
    setInert(true);
    var submitBtn = root.querySelector('#mgfbSubmit');
    submitBtn.setAttribute('aria-disabled', 'true');
    submitBtn.setAttribute('data-locked', 'true');
    setTimeout(function () {
      submitBtn.removeAttribute('data-locked');
      submitBtn.setAttribute('aria-disabled', 'false');
    }, 3000);
    setTimeout(function () {
      try { root.querySelector('#mgfbTitle').setAttribute('tabindex', '-1'); root.querySelector('#mgfbTitle').focus(); } catch (e) {}
    }, 0);
  }

  function close() {
    if (STATE === 'submitting') { return; }
    STATE = 'closed';
    if (host) {
      backdropEl.classList.remove('is-open');
      dialogEl.classList.remove('is-open');
      launcherEl.setAttribute('aria-expanded', 'false');
      if (!LAUNCHER_OFF) { launcherEl.classList.remove('is-hidden'); }
    }
    unlockScroll();
    setInert(false);
    try { if (OPENER_EL && OPENER_EL.focus) { OPENER_EL.focus(); } } catch (e) {}
  }

  function fieldErr(id, msg) {
    var el = root.getElementById ? root.getElementById(id) : root.querySelector('#' + id);
    if (el) { el.textContent = msg || ''; }
  }

  function validateForm() {
    var errs = [];
    var cat = root.querySelector('input[name=mgfbCat]:checked');
    if (!cat) { fieldErr('mgfbErrCat', tr('errCategory')); errs.push('mgfbCatField'); } else { fieldErr('mgfbErrCat', ''); }
    var content = root.querySelector('#mgfbContent').value.trim();
    var len = Array.from(content).length;
    if (len < 20) { fieldErr('mgfbErrContent', tr('errShort', { n: len })); errs.push('mgfbContentField'); }
    else if (len > 2000) { fieldErr('mgfbErrContent', tr('errLong', { n: len - 2000 })); errs.push('mgfbContentField'); }
    else { fieldErr('mgfbErrContent', ''); }
    var email = root.querySelector('#mgfbEmail').value.trim();
    var emailRe = /^[^\s@,;<>"]{1,64}@[^\s@,;<>"]+\.[^\s@,;<>"]{2,}$/;
    if (email && !emailRe.test(email)) { fieldErr('mgfbErrEmail', tr('errEmail')); errs.push('mgfbEmailField'); }
    else { fieldErr('mgfbErrEmail', ''); }
    if (email) {
      var consent = root.querySelector('#mgfbConsent').checked;
      if (!consent) { fieldErr('mgfbErrConsent', tr('errConsent')); errs.push('mgfbConsentField'); }
      else { fieldErr('mgfbErrConsent', ''); }
    } else { fieldErr('mgfbErrConsent', ''); }
    return { errs: errs, cat: cat ? cat.value : null, content: content, email: email || null, consent: !!(email && root.querySelector('#mgfbConsent').checked) };
  }

  var submitAttempts = 0;

  function onSubmit() {
    if (STATE === 'submitting') { return; }
    var v = validateForm();
    if (v.errs.length) {
      var first = root.getElementById ? root.getElementById(v.errs[0]) : root.querySelector('#' + v.errs[0]);
      if (first) { var f = first.querySelector('input,textarea'); if (f) { f.focus(); } }
      return;
    }
    var honeypot = root.querySelector('#mgfbHp').value;
    var dwell = OPEN_AT ? (Date.now() - OPEN_AT) : 0;
    buildCtx(function (ctx) {
      var payload = {
        v: 1, client_submission_id: CSID, source: 'widget', category: v.cat, content: v.content,
        reply_email: v.email, reply_consent: v.consent, contact_name: null, hp: honeypot, dwell_ms: dwell,
        auth: (function () { var s = readMgSession(); return s ? { access_token: s.access_token } : null; })(),
        ctx: ctx
      };
      LAST_PAYLOAD = payload;
      doSubmitRequest(payload);
    });
  }

  function doSubmitRequest(payload) {
    if (!payload) { return; }
    STATE = 'submitting';
    submitAttempts++;
    var btn = root.querySelector('#mgfbSubmit');
    btn.setAttribute('aria-disabled', 'true');
    btn.textContent = tr('submitting');
    root.querySelectorAll('#mgfbForm input,#mgfbForm textarea').forEach(function (el) { el.readOnly = true; });
    root.querySelector('#mgfbStatus').textContent = tr('submittingLocked');
    savePending({ csid: payload.client_submission_id, payload: payload, at: Date.now() });
    var beforeUnload = function (e) { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', beforeUnload);
    postSubmit(payload).then(function (resp) {
      window.removeEventListener('beforeunload', beforeUnload);
      STATE = 'done';
      clearDraft(); clearPending();
      root.querySelectorAll('#mgfbForm input,#mgfbForm textarea').forEach(function (el) { el.readOnly = false; });
      btn.textContent = tr('submit');
      root.querySelector('#mgfbDoneRef').textContent = resp.ref || '';
      root.querySelector('#mgfbDoneAck').textContent = payload.reply_email ? tr('doneAck') : tr('doneNoEmail');
      setPanel('done');
      try { root.querySelector('#mgfbDone h2').setAttribute('tabindex', '-1'); root.querySelector('#mgfbDone h2').focus(); } catch (e) {}
    }, function (err) {
      window.removeEventListener('beforeunload', beforeUnload);
      STATE = 'error';
      root.querySelectorAll('#mgfbForm input,#mgfbForm textarea').forEach(function (el) { el.readOnly = false; });
      btn.textContent = tr('submit'); btn.setAttribute('aria-disabled', 'false');
      handleError(err, payload);
    });
  }

  function handleError(err, payload) {
    var code = (err && err.code) || 'INTERNAL';
    var msg;
    var nonRetryable = false;
    var keepPending = false;
    if (code === 'NETWORK') { msg = tr('errNetwork'); keepPending = true; }
    else if (code === 'TIMEOUT') { msg = tr('errTimeout'); keepPending = true; }
    else if (code === 'RATE_LIMITED') { msg = tr('errRate', { m: Math.max(1, Math.ceil((err.retry_after_sec || 60) / 60)) }); nonRetryable = false; clearPending(); }
    else if (code === 'DUPLICATE_CONTENT') { msg = tr('errDuplicate'); nonRetryable = true; clearPending(); }
    else if (code === 'BUSY') { msg = tr('errBusy'); keepPending = true; }
    else if (code === 'VALIDATION') {
      // surfaced server-side validation: reopen the form with field errors rather than the error panel.
      clearPending();
      setPanel('form'); STATE = 'open';
      if (err.fields && err.fields.length) {
        for (var i = 0; i < err.fields.length; i++) {
          var f = err.fields[i].name;
          if (f === 'content') { fieldErr('mgfbErrContent', tr('errShort', { n: payload.content.length })); }
          if (f === 'reply_email') { fieldErr('mgfbErrEmail', tr('errEmail')); }
          if (f === 'reply_consent') { fieldErr('mgfbErrConsent', tr('errConsent')); }
          if (f === 'category') { fieldErr('mgfbErrCat', tr('errCategory')); }
        }
      }
      return;
    }
    else if (code === 'BAD_JSON' || code === 'BAD_VERSION' || code === 'METHOD_NOT_ALLOWED' || code === 'TOO_LARGE') { msg = tr('errServer'); nonRetryable = true; clearPending(); }
    else if (code === 'ORIGIN_DENIED') { msg = tr('errServer'); nonRetryable = true; clearPending(); }
    else { msg = tr('errServer'); keepPending = true; }
    if (!keepPending && !nonRetryable) { /* rate limited: leave pending cleared already */ }
    root.querySelector('#mgfbErrorMsg').textContent = msg;
    var retryBtn = root.querySelector('#mgfbRetryBtn');
    retryBtn.hidden = nonRetryable;
    var showFallback = submitAttempts >= 2 || code === 'NETWORK' || code === 'BUSY';
    var fb = root.querySelector('#mgfbFallback');
    fb.hidden = !showFallback;
    if (showFallback) { renderFallback(payload); }
    setPanel('error');
    try { root.querySelector('#mgfbErrorMsg').focus(); } catch (e) {}
  }

  function renderFallback(payload) {
    var actions = root.querySelector('#mgfbFallbackActions');
    actions.innerHTML = '';
    var order = isInAppUA() ? ['copy', 'contact', 'mail'] : ['copy', 'mail', 'contact'];
    for (var i = 0; i < order.length; i++) {
      actions.appendChild(fallbackBtn(order[i], payload));
    }
  }
  function fallbackBtn(kind, payload) {
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'mgfb-btn';
    if (kind === 'copy') {
      btn.textContent = tr('fbCopy');
      btn.addEventListener('click', function () { copyToClipboard(fallbackText(payload), function () {}); });
    } else if (kind === 'mail') {
      btn.textContent = tr('fbMail');
      btn.addEventListener('click', function () { location.href = mailtoHref(payload); });
    } else {
      btn.textContent = tr('fbContact');
      btn.addEventListener('click', function () { location.href = (cfg.contactPath && cfg.contactPath[LANG]) || (LANG === 'en' ? '/en/contact.html' : '/ko/contact.html'); });
    }
    return btn;
  }
  function fallbackText(payload) {
    var lines = [
      LANG === 'en' ? 'Type: ' + payload.category : '유형: ' + payload.category,
      LANG === 'en' ? 'Page: ' + payload.ctx.page_path : '페이지: ' + payload.ctx.page_path,
      LANG === 'en' ? 'Reference: ' + (payload.ctx.rfp_ref || '-') : '요청번호: ' + (payload.ctx.rfp_ref || '-'),
      LANG === 'en' ? 'Confirmation code: ' + payload.client_submission_id.slice(0, 8) : '확인코드: ' + payload.client_submission_id.slice(0, 8),
      '', payload.content
    ];
    return lines.join('\n');
  }
  function mailtoHref(payload) {
    var subject = '[MICEGO 의견] ' + payload.category + ' · ' + payload.ctx.page_path;
    var body = fallbackText(payload);
    var url = 'mailto:' + (cfg.fallbackEmail || '') + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    if (url.length > 1800) {
      var truncated = payload.content.slice(0, 400) + '\n' + tr('mailTrunc');
      body = fallbackText({ category: payload.category, ctx: payload.ctx, client_submission_id: payload.client_submission_id, content: truncated });
      url = 'mailto:' + (cfg.fallbackEmail || '') + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    }
    return url;
  }

  function copyToClipboard(text, cb) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { cb(true); }, function () { execCopyFallback(text, cb); });
        return;
      }
    } catch (e) {}
    execCopyFallback(text, cb);
  }
  function execCopyFallback(text, cb) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
      (root || document.body).appendChild ? (root.appendChild ? root.appendChild(ta) : document.body.appendChild(ta)) : document.body.appendChild(ta);
      ta.focus(); ta.select();
      var ok = document.execCommand('copy');
      ta.parentNode.removeChild(ta);
      cb(!!ok);
    } catch (e) { cb(false); }
  }

  function resendPending() {
    var p = loadPending();
    if (!p) { return; }
    root.querySelector('#mgfbPendingBanner').hidden = true;
    CSID = p.payload.client_submission_id;
    LAST_PAYLOAD = p.payload;
    setPanel('form'); STATE = 'open';
    doSubmitRequest(p.payload);
  }

  // ================================================================ 12. footer link delegation
  function wireFooterLinks() {
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('[data-mg-feedback-open]') : null;
      if (!a) { return; }
      if (!HAS_BACKEND || cfg.disabled) { return; } // no widget configured -- let the link navigate normally
      e.preventDefault();
      open();
    });
  }

  // ================================================================ 13. public API
  if (!HAS_BACKEND || cfg.disabled) {
    // No backend configured: leave every [data-mg-feedback-open] link with its plain contact.html
    // href, expose no launcher and no window.MICEGO_FB, and stop -- zero DOM, zero listeners
    // beyond error capture (D-spec).
    return;
  }

  window.MICEGO_FB = {
    version: '1.0.0',
    open: function (opts) { if (HAS_BACKEND) { open(opts); } },
    close: function () { close(); },
    submit: function (p) {
      if (!HAS_BACKEND) { return Promise.reject({ code: 'INTERNAL', message: 'not configured' }); }
      var csid = p.client_submission_id || uuidv4();
      return new Promise(function (resolve, reject) {
        buildCtx(function (ctx) {
          var payload = {
            v: 1, client_submission_id: csid, source: p.source || 'contact', category: p.category || 'OPS',
            content: p.content, reply_email: p.reply_email || null, reply_consent: !!p.consent,
            contact_name: p.contact_name || null, hp: p.hp || '', dwell_ms: p.dwell_ms || 0,
            auth: (function () { var s = readMgSession(); return s ? { access_token: s.access_token } : null; })(),
            ctx: ctx
          };
          postSubmit(payload, { timeoutMs: p.timeoutMs }).then(resolve, reject);
        });
      });
    }
  };

  wireFooterLinks();
  if (!LAUNCHER_OFF) {
    ensureDom();
    try {
      var pend = loadPending();
      if (pend) {
        var dot = root.querySelector('#mgfbDot');
        if (dot) { dot.hidden = false; }
      }
    } catch (e) {}
  }
})();
