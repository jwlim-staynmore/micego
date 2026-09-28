/* MICEGO 운영 콘솔 · 피드백 (SPEC_FEEDBACK.md §5, SPEC_FEEDBACK_ADDENDUM.md §B WP-F3)
 * admin.js 다음, 각 페이지 자체 스크립트 이전에 로드한다. 공용 로직만 담고 있으며 렌더는
 * feedback.html/feedback-detail.html 이 각자 한다(partners.html/partner.html·rfp.html과 같은 분리).
 * mock 모드: window.MOCK_DATA.feedback/feedbackNotes/feedbackEvents/operators 를 A.data() 경유로 직접 읽고 쓴다.
 * api 모드: data-adapter.js 의 MGA.feedback* 헬퍼(PostgREST/RPC/Edge Function)를 호출한다. */
(function () {
  'use strict';
  var A = window.MICEGO, esc = A.esc;
  var FB = window.FB = {};

  /* ---------- 상수·라벨 ---------- */
  FB.ME = 'op-ops'; /* 로그인 세션(운영자 · ops@matchgo.ai)에 대응하는 담당자 id -- "나에게 배정" 대상 */
  FB.CAT = { SYS: '화면·기능 문제', OPS: '견적·운영 문의', ETC: '기타' };
  FB.SUBCODES = { SYS: { BUG: '오류', IDEA: '개선 아이디어', TEXT: '문구 오류' }, OPS: { RFP: '요청 연결', BID: '비딩', ACCT: '계정', PARTNER: '파트너', POLICY: '정책' }, ETC: {} };
  FB.STATUS = { new: '신규', triaged: '분류됨', in_progress: '처리 중', on_hold: '보류', done: '완료' };
  FB.STATUS_ORDER = ['new', 'triaged', 'in_progress', 'on_hold', 'done'];
  FB.RESOLUTION = { fixed: '수정함', answered: '답변함', wontfix: '수정 안 함', duplicate: '중복 접수', spam: '스팸', no_action: '조치 없음' };
  FB.RESOLUTION_KEYS = ['fixed', 'answered', 'wontfix', 'duplicate', 'spam', 'no_action'];
  FB.NEW_TO_DONE_KEYS = ['spam', 'duplicate', 'no_action'];
  FB.USER_TYPE = { travel_agency: '여행사 회원', organizer_guest: '비회원 요청자', hotel: '호텔', admin: '운영자', visitor: '방문자' };
  FB.MODE = { agency: '여행사', hotel: '호텔', admin: '운영자', root: '공용' };
  FB.LANG = { ko: '한국어', en: '영어' };
  FB.SOURCE = { widget: '위젯', contact: '문의 폼' };
  FB.MAIL = { pending: '대기', sent: '발송됨', failed: '실패', skipped: '건너뜀' };
  FB.TOKEN_KIND = { track: '추적 링크', share: '공유 링크', bid: '호텔 비딩 링크' };
  FB.DEFAULT_STATUS = ['new', 'triaged', 'in_progress', 'on_hold'];

  FB.GUARD_MSG = {
    GUARD_TRIAGE_FIELDS: '우선순위와 하위 분류를 먼저 정해 주세요.',
    GUARD_ASSIGNEE: '담당자를 먼저 지정해 주세요.',
    GUARD_HOLD_NOTE: '보류 사유를 메모로 남겨 주세요.',
    GUARD_RESOLUTION: '처리 결과를 선택해 주세요.',
    GUARD_NEW_TO_DONE: '스팸·중복·조치 없음 중 하나일 때만 접수에서 바로 종료할 수 있습니다.',
    GUARD_REOPEN_NOTE: '다시 여는 사유를 메모로 남겨 주세요.',
    forbidden: '권한이 없습니다. 다시 로그인해 주세요.'
  };

  /* ---------- 데이터 ---------- */
  FB.data = function () { return A.data().feedback || []; };
  FB.get = function (id) { return FB.data().filter(function (r) { return r.id === id; })[0] || null; };
  FB.notes = function (id) { return (A.data().feedbackNotes || []).filter(function (n) { return n.feedback_id === id; }).sort(function (a, b) { return a.created_at - b.created_at; }); };
  FB.events = function (id) { return (A.data().feedbackEvents || []).filter(function (e) { return e.feedback_id === id; }).sort(function (a, b) { return a.created_at - b.created_at; }); };
  FB.operators = function () { return A.data().operators || []; };
  FB.operator = function (id) { return FB.operators().filter(function (o) { return o.id === id; })[0] || null; };
  FB.operatorName = function (id) { var o = FB.operator(id); return o ? o.name : (id || '미지정'); };
  FB.subcodeLabel = function (cat, sub) { return sub ? ((FB.SUBCODES[cat] || {})[sub] || sub) : null; };
  FB.catSubText = function (r) { return FB.CAT[r.category] + (r.subcode ? ' · ' + FB.subcodeLabel(r.category, r.subcode) : ''); };

  function stamp() { var S = A.data(); S.tick = (S.tick || 0) + 1; return A.NOW + S.tick * 60000; }
  FB._stamp = stamp;

  /* ---------- 영업시간(09:00-18:00 KST, 영업일만) 계산 -- admin.js 의 A.isBiz/A.parts 를 재사용 ---------- */
  var HOUR = 3600e3, DAY = 864e5, KST = 9 * HOUR;
  function kstMidnight(ms) { var p = A.parts(ms); return Date.UTC(p.y, p.m - 1, p.d, 0, 0) - KST; }
  function atHour(dayMs, h) { var p = A.parts(dayMs + HOUR); return Date.UTC(p.y, p.m - 1, p.d, h, 0) - KST; }
  function addBizHours(fromMs, hours) {
    var remaining = hours * HOUR, d = kstMidnight(fromMs), cursor = fromMs, guard = 0;
    while (remaining > 0 && guard < 400) {
      guard++;
      if (A.isBiz(d + HOUR)) {
        var open = atHour(d, 9), close = atHour(d, 18);
        var s = Math.max(open, cursor);
        if (s < close) {
          var avail = close - s;
          if (avail >= remaining) return s + remaining;
          remaining -= avail;
        }
      }
      d += DAY; cursor = d;
    }
    return cursor;
  }
  FB.addBizHours = addBizHours;
  /* 1영업일 기한: 기산일이 영업일이고 18:00 이전이면 다음 영업일 18:00, 아니면 그다음 영업일 18:00 (admin.js 의 slaDeadline 패턴과 동일) */
  function oneBizDayDeadline(startMs) { var p = A.parts(startMs); return (A.isBiz(startMs) && p.h < 18) ? A.addBusinessDays(startMs, 1) : A.addBusinessDays(startMs, 2); }
  FB.oneBizDayDeadline = oneBizDayDeadline;

  /* SLA 배지: §5.1 -- P1 4영업시간 내 in_progress(빨강 "착수 지연"), P2 1영업일(앰버 "착수 지연"),
   * 신규 1영업일 내 triaged(빨강 "분류 지연"). in_progress 에 도달하면(또는 done 이면) 표시하지 않는다. */
  FB.sla = function (r) {
    if (r.status === 'done') return null;
    if (r.status === 'new') {
      var due0 = oneBizDayDeadline(r.created_at);
      if (A.NOW > due0) return { level: 'red', text: '분류 지연', due: due0 };
      return null;
    }
    if (r.status === 'triaged' && r.priority === 1) {
      var due1 = addBizHours(r.created_at, 4);
      if (A.NOW > due1) return { level: 'red', text: '착수 지연', due: due1 };
      return null;
    }
    if (r.status === 'triaged' && r.priority === 2) {
      var due2 = oneBizDayDeadline(r.created_at);
      if (A.NOW > due2) return { level: 'amber', text: '착수 지연', due: due2 };
    }
    return null;
  };

  /* ---------- 전이 규칙 (SPEC_FEEDBACK.md §2.6/§2.7 그대로) ---------- */
  FB.ALLOWED = { new: ['triaged', 'done'], triaged: ['in_progress', 'on_hold', 'done'], in_progress: ['on_hold', 'done'], on_hold: ['in_progress', 'done'], done: ['in_progress'] };
  FB.label = function (from, to) {
    if (to === 'triaged') return '분류 완료';
    if (to === 'done') return from === 'new' ? '바로 종료' : '완료';
    if (to === 'in_progress') return from === 'on_hold' ? '다시 진행' : (from === 'done' ? '다시 열기' : '처리 시작');
    if (to === 'on_hold') return '보류';
    return to;
  };
  /* extra: 모달에서 방금 받은 값({resolution, note}). 사전 조건(분류·담당자)은 r 자체 필드로 검사한다. */
  FB.guard = function (r, to, extra) {
    extra = extra || {};
    if (to === 'triaged') {
      if (r.priority == null || (r.category !== 'ETC' && !r.subcode)) return FB.GUARD_MSG.GUARD_TRIAGE_FIELDS;
      return null;
    }
    if (to === 'in_progress') {
      if (r.status === 'done') { if (!(extra.note && extra.note.trim())) return FB.GUARD_MSG.GUARD_REOPEN_NOTE; return null; }
      if (!r.assignee) return FB.GUARD_MSG.GUARD_ASSIGNEE;
      return null;
    }
    if (to === 'on_hold') {
      if (!(extra.note && extra.note.trim())) return FB.GUARD_MSG.GUARD_HOLD_NOTE;
      return null;
    }
    if (to === 'done') {
      if (!extra.resolution) return FB.GUARD_MSG.GUARD_RESOLUTION;
      if (r.status === 'new' && FB.NEW_TO_DONE_KEYS.indexOf(extra.resolution) < 0) return FB.GUARD_MSG.GUARD_NEW_TO_DONE;
      return null;
    }
    return null;
  };
  /* 버튼을 그리기 전에(모달을 열기 전에) 이미 확정할 수 있는 가드 -- 분류·담당자는 r 필드만으로 판정되므로
   * 버튼 자체를 disabled 로 둔다. 보류·완료·재오픈은 모달 입력이 있어야 판정되므로 버튼은 활성 상태로 두고
   * 모달 제출 시 FB.guard 로 다시 막는다. */
  FB.preGuard = function (r, to) {
    if (to === 'triaged') return FB.guard(r, 'triaged');
    if (to === 'in_progress' && r.status !== 'done') return FB.guard(r, 'in_progress');
    return null;
  };

  /* ---------- 로컬 반영(mock) / 서버 호출(api) 공용 persist ---------- */
  FB.persist = function (mockFn, apiFn) {
    if (window.MGA.mode !== 'api') {
      try { mockFn(); } catch (e) { }
      A.save();
      if (typeof A.onChange === 'function') A.onChange();
      return Promise.resolve(true);
    }
    return apiFn().then(function (resp) {
      try { mockFn(resp); } catch (e) { }
      A.save();
      if (typeof A.onChange === 'function') A.onChange();
      return true;
    }, function (err) {
      var msg = (err && (err.message || err.message_ko)) || '처리하지 못했습니다';
      A.toast(FB.GUARD_MSG[err && err.code] || msg, 'error');
      return false;
    });
  };

  function pushEvent(feedbackId, kind, field, from, to) {
    var S = A.data(); S.feedbackEvents = S.feedbackEvents || [];
    S.feedbackEvents.push({ id: S.feedbackEvents.length + 1, feedback_id: feedbackId, actor: FB.ME, kind: kind, field: field, from_value: from == null ? null : String(from), to_value: to == null ? null : String(to), created_at: stamp() });
  }
  function pushNote(feedbackId, body) {
    var S = A.data(); S.feedbackNotes = S.feedbackNotes || [];
    S.feedbackNotes.push({ id: S.feedbackNotes.length + 1, feedback_id: feedbackId, author: FB.ME, body: body, created_at: stamp() });
  }
  FB.addNote = function (r, body) {
    body = (body || '').trim(); if (!body) return Promise.resolve(false);
    return FB.persist(
      function () { pushNote(r.id, body); },
      function () { return window.MGA.feedbackAddNote(r.id, body); }
    );
  };

  /* ---------- 상태 전이 실행 ---------- */
  function applyTransitionLocal(r, to, resolution, note) {
    var from = r.status;
    pushEvent(r.id, 'status', 'status', from, to);
    if (to === 'triaged' && !r.triaged_at) r.triaged_at = stamp();
    if (to === 'in_progress') r.started_at = stamp();
    if (from === 'done' && to !== 'done') { r.done_at = null; r.resolution = null; }
    if (to === 'done') { r.done_at = stamp(); r.resolution = resolution; }
    r.status = to; r.updated_at = A.NOW;
    if (note && note.trim()) pushNote(r.id, note.trim());
  }
  FB.setStatus = function (r, to, extra) {
    extra = extra || {};
    var g = FB.guard(r, to, extra);
    if (g) { A.toast(g, 'error'); return Promise.resolve(false); }
    return FB.persist(
      function () { applyTransitionLocal(r, to, extra.resolution || null, extra.note || null); },
      function () { return window.MGA.feedbackSetStatus({ p_id: r.id, p_to: to, p_resolution: extra.resolution || null, p_note: extra.note || null }); }
    );
  };

  /* ---------- 분류 패널 저장(직접 UPDATE, 상태와 무관) ---------- */
  FB.saveTriage = function (r, patch) {
    return FB.persist(
      function () { for (var k in patch) r[k] = patch[k]; pushEvent(r.id, 'triage', Object.keys(patch).join(','), null, JSON.stringify(patch)); r.updated_at = A.NOW; },
      function () { return window.MGA.feedbackTriage(r.id, patch); }
    );
  };

  /* ---------- 메일 재시도 ---------- */
  FB.retryMail = function (r) {
    return FB.persist(
      function () {
        if (r.ops_mail_status === 'failed') { r.ops_mail_attempts = 0; r.ops_mail_status = 'sent'; r.ops_mail_error = null; r.ops_mail_sent_at = stamp(); pushEvent(r.id, 'mail', 'ops_mail_status', 'failed', 'sent'); }
        if (r.ack_mail_status === 'failed') { r.ack_mail_attempts = 0; r.ack_mail_status = 'sent'; r.ack_mail_error = null; r.ack_mail_sent_at = stamp(); pushEvent(r.id, 'mail', 'ack_mail_status', 'failed', 'sent'); }
      },
      function () { return window.MGA.feedbackMailRetry(r.id); }
    );
  };

  /* ---------- RFP 연결 조회 (mock: r._mockResolve, api: RPC feedback_resolve_rfp) ---------- */
  var resolveCache = {};
  FB.resolveRfp = function (r) {
    if (window.MGA.mode !== 'api') return Promise.resolve(r._mockResolve || { match: null, candidates: [] });
    if (resolveCache[r.id]) return Promise.resolve(resolveCache[r.id]);
    return window.MGA.feedbackResolveRfp(r.id).then(function (rows) {
      var out = { match: null, candidates: rows || [] };
      if (rows && rows.length) out.match = rows[0].match;
      resolveCache[r.id] = out; return out;
    }, function () { return { match: null, candidates: [] }; });
  };
  FB.RESOLVE_LABEL = { verified: '요청번호·링크 일치', ref_only: '요청번호만 확인됨', mismatch: '요청번호와 링크가 다릅니다', token_only: '링크로 후보를 찾음' };
  FB.RESOLVE_LEVEL = { verified: 'ok', ref_only: '', mismatch: 'red', token_only: 'amber' };

  /* ---------- 배지·칩 렌더 ---------- */
  FB.schip = function (status) { return '<span class="chip fb-st-' + status + '">' + esc(FB.STATUS[status]) + '</span>'; };
  FB.pchip = function (p) { return p ? '<span class="chip fb-p' + p + '">P' + p + '</span>' : '<span class="chip fb-p0">미지정</span>'; };
  FB.flags = function (r) {
    var out = [];
    if (r.is_demo) out.push('<span class="badge" title="DEMO 데이터 · 목록 기본 필터에서 제외">DEMO</span>');
    if (r.is_suspect) out.push('<span class="badge amber" title="' + esc((r.suspect_reasons || []).join(', ')) + '">의심</span>');
    if (r.ops_mail_status === 'failed' || r.ack_mail_status === 'failed') out.push('<span class="badge red">알림 실패</span>');
    if (r.anonymized_at) out.push('<span class="badge">익명화됨</span>');
    return out.join(' ');
  };
  FB.relTime = function (ms) {
    var d = A.NOW - ms;
    if (d < 60000) return '방금';
    if (d < HOUR) return Math.round(d / 60000) + '분 전';
    if (d < DAY) return Math.round(d / HOUR) + '시간 전';
    return Math.round(d / DAY) + '일 전';
  };
  FB.who = function (r) {
    var t = FB.USER_TYPE[r.user_type] || r.user_type;
    if (r.member_id) { var m = A.member(r.member_id); if (m) t = '회원 · ' + A.memberName(m); }
    return t;
  };

  /* ---------- 필터 상태 ↔ URL 쿼리 ---------- */
  FB.stateFromQuery = function (search) {
    var q = new URLSearchParams(search);
    var stR = q.get('status');
    return {
      status: stR ? stR.split(',').filter(Boolean) : FB.DEFAULT_STATUS.slice(),
      cat: q.get('cat') || '', sub: q.get('sub') || '', p: q.get('p') || '',
      ut: q.get('ut') || '', mode: q.get('mode') || '', lang: q.get('lang') || '',
      assignee: q.get('assignee') || '', period: q.get('period') || '30d',
      from: q.get('from') || '', to: q.get('to') || '',
      demo: q.get('demo') === '1', suspect: q.get('suspect') === '1', mailfail: q.get('mailfail') === '1', hasemail: q.get('hasemail') === '1',
      q: q.get('q') || '', preset: q.get('preset') || '', sort: q.get('sort') || 'default', warn: q.get('warn') || ''
    };
  };
  FB.queryFromState = function (st) {
    var q = new URLSearchParams();
    var isDefaultStatus = st.status.length === FB.DEFAULT_STATUS.length && st.status.every(function (s) { return FB.DEFAULT_STATUS.indexOf(s) >= 0; });
    if (!isDefaultStatus) q.set('status', st.status.join(','));
    if (st.cat) q.set('cat', st.cat); if (st.sub) q.set('sub', st.sub); if (st.p) q.set('p', st.p);
    if (st.ut) q.set('ut', st.ut); if (st.mode) q.set('mode', st.mode); if (st.lang) q.set('lang', st.lang);
    if (st.assignee) q.set('assignee', st.assignee);
    if (st.period !== '30d') q.set('period', st.period);
    if (st.period === 'custom') { if (st.from) q.set('from', st.from); if (st.to) q.set('to', st.to); }
    if (st.demo) q.set('demo', '1'); if (st.suspect) q.set('suspect', '1'); if (st.mailfail) q.set('mailfail', '1'); if (st.hasemail) q.set('hasemail', '1');
    if (st.q) q.set('q', st.q);
    if (st.preset) q.set('preset', st.preset);
    if (st.sort !== 'default') q.set('sort', st.sort);
    if (st.warn) q.set('warn', st.warn);
    return q.toString();
  };
  FB.syncUrl = function (st) {
    var qs = FB.queryFromState(st);
    var url = location.pathname + (qs ? '?' + qs : '');
    history.replaceState(null, '', url);
  };

  function weekStartMs() {
    var p = A.parts(A.NOW), diff = (p.dow === 0 ? 6 : p.dow - 1), mid = A.NOW - diff * DAY, mp = A.parts(mid);
    return Date.UTC(mp.y, mp.m - 1, mp.d, 0, 0) - KST;
  }
  FB.periodStart = function (st) {
    if (st.period === 'today') { var p = A.parts(A.NOW); return Date.UTC(p.y, p.m - 1, p.d, 0, 0) - KST; }
    if (st.period === '7d') return A.NOW - 7 * DAY;
    if (st.period === '30d') return A.NOW - 30 * DAY;
    if (st.period === 'custom') return st.from ? Date.parse(st.from + 'T00:00:00+09:00') : null;
    return null;
  };
  /* '주간 정리' 프리셋: 보류 전체 + 이번 주(월요일 00:00 KST~) 완료 + 7일 넘은 신규. 다른 필터는 무시한다(demo 는 항상 제외). */
  FB.weeklyList = function () {
    var ws = weekStartMs();
    return FB.data().filter(function (r) {
      if (r.is_demo) return false;
      if (r.status === 'on_hold') return true;
      if (r.status === 'done' && r.done_at && r.done_at >= ws) return true;
      if (r.status === 'new' && (A.NOW - r.created_at) > 7 * DAY) return true;
      return false;
    });
  };
  /* skipField 를 넘기면 그 필드는 검사하지 않는다(요약 칩 카운트가 자기 자신의 필터를 빼고 세도록) */
  FB.match = function (r, st, skipField) {
    function skip(f) { return skipField === f; }
    if (!st.demo && r.is_demo) return false;
    if (!skip('status') && st.status.length && st.status.indexOf(r.status) < 0) return false;
    if (!skip('cat') && st.cat && r.category !== st.cat) return false;
    if (!skip('sub') && st.sub && r.subcode !== st.sub) return false;
    if (!skip('p') && st.p) { if (st.p === 'none') { if (r.priority != null) return false; } else if (String(r.priority) !== st.p) return false; }
    if (!skip('ut') && st.ut && r.user_type !== st.ut) return false;
    if (!skip('mode') && st.mode && r.mode !== st.mode) return false;
    if (!skip('lang') && st.lang && r.lang !== st.lang) return false;
    if (!skip('assignee') && st.assignee) {
      if (st.assignee === 'me') { if (r.assignee !== FB.ME) return false; }
      else if (st.assignee === 'none') { if (r.assignee) return false; }
      else if (r.assignee !== st.assignee) return false;
    }
    if (!skip('suspect') && st.suspect && !r.is_suspect) return false;
    if (!skip('mailfail') && st.mailfail && !(r.ops_mail_status === 'failed' || r.ack_mail_status === 'failed')) return false;
    if (!skip('hasemail') && st.hasemail && !r.reply_email) return false;
    if (!skip('period')) {
      var lo = FB.periodStart(st);
      if (lo != null && r.created_at < lo) return false;
      if (st.period === 'custom' && st.to) { var hi = Date.parse(st.to + 'T23:59:59+09:00'); if (r.created_at > hi) return false; }
    }
    if (!skip('q') && st.q) {
      var ql = st.q.toLowerCase();
      var hay = (r.ref + ' ' + (r.content || '') + ' ' + (r.rfp_ref || '') + ' ' + (r.reply_email || '')).toLowerCase();
      if (hay.indexOf(ql) < 0) return false;
    }
    return true;
  };
  FB.filterList = function (st) {
    var list = st.preset === 'weekly' ? FB.weeklyList() : FB.data().filter(function (r) { return FB.match(r, st, null); });
    if (st.warn) {
      list = list.filter(function (r) {
        if (r.is_demo) return false;
        if (st.warn === 'mailfail') return r.ops_mail_status === 'failed' || r.ack_mail_status === 'failed';
        var s = FB.sla(r);
        if (st.warn === 'p1late') return s && s.level === 'red' && r.priority === 1;
        if (st.warn === 'triagelate') return s && s.text === '분류 지연';
        return true;
      });
    }
    return list;
  };
  FB.sortList = function (list, sort) {
    var arr = list.slice(), oi = function (r) { return FB.STATUS_ORDER.indexOf(r.status); }, pv = function (r) { return r.priority == null ? 99 : r.priority; };
    if (sort === 'created_asc') arr.sort(function (a, b) { return a.created_at - b.created_at; });
    else if (sort === 'created_desc') arr.sort(function (a, b) { return b.created_at - a.created_at; });
    else if (sort === 'priority') arr.sort(function (a, b) { return pv(a) - pv(b) || b.created_at - a.created_at; });
    else arr.sort(function (a, b) { return oi(a) - oi(b) || pv(a) - pv(b) || b.created_at - a.created_at; });
    return arr;
  };

  /* ---------- SLA·경고 요약 (목록 상단 칩) ---------- */
  FB.warnCounts = function () {
    var all = FB.data().filter(function (r) { return !r.is_demo; });
    return {
      p1Late: all.filter(function (r) { var s = FB.sla(r); return s && s.level === 'red' && r.priority === 1; }).length,
      mailFailed: all.filter(function (r) { return r.ops_mail_status === 'failed' || r.ack_mail_status === 'failed'; }).length,
      triageLate: all.filter(function (r) { var s = FB.sla(r); return s && s.text === '분류 지연'; }).length
    };
  };
})();
