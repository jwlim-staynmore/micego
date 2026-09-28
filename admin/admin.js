/* MICEGO 운영 콘솔 공용 스크립트: 세션 가드, 상태 머신, SLA 계산, 렌더 헬퍼, 토스트
 *
 * SLA 규칙 (SOP v2 + 데모 시계 기준)
 *  - 기산점: 검증중 전이 시각. 기산일이 영업일이고 18:00 이전이면 그날이 1일째, 아니면 다음 영업일이 1일째.
 *    기한 = 3번째 영업일 18:00 KST. 영업일 = 주말·한국 공휴일 제외.
 *  - 적색: 기한 경과(초과). 황색: 기한이 "다음 영업일 18:00 이내"(1영업일 이내) 또는 24시간 이내.
 *    (데모 시각 10/08(목) 19:30 은 다음 날이 공휴일+주말이라 24시간 기준만으로는 황색이 나올 수 없어서 영업일 기준을 함께 씁니다.)
 *  - 표시 대상: 검증중, 오픈. SLA는 오픈에 도달하면 충족입니다(지표는 그대로). 오픈에서는 같은 기한을 "초대 기한"으로 부르며 배지에 SLA라는 말을 쓰지 않습니다.
 */
(function () {
  'use strict';
  var A = window.MICEGO = {};

  /* ---------- 시계: mock 모드는 데모 시계, api 모드는 MGA.now()(실제 시각) ---------- */
  var MGA = window.MGA || { mode: 'mock', now: function () { return Date.parse('2026-10-08T19:30:00+09:00'); } };
  var NOW = A.NOW = MGA.now();
  var HOLIDAYS = A.HOLIDAYS = ['2026-10-03', '2026-10-05', '2026-10-09', '2026-12-25']; /* 실제 값은 상태(설정 > 공휴일)에서 불러옵니다 */
  var KST = 9 * 3600e3, DAY = 864e5, HOUR = 3600e3;
  var DOW = ['일', '월', '화', '수', '목', '금', '토'];

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function parts(ms) { var d = new Date(ms + KST); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes(), dow: d.getUTCDay() }; }
  function dayKey(ms) { var p = parts(ms); return p.y + '-' + pad(p.m) + '-' + pad(p.d); }
  function isBiz(ms) { var p = parts(ms); return p.dow !== 0 && p.dow !== 6 && HOLIDAYS.indexOf(dayKey(ms)) < 0; }
  function at18(ms) { var p = parts(ms); return Date.UTC(p.y, p.m - 1, p.d, 18, 0) - KST; }
  /* fromMs 의 다음 날부터 세어 n번째 영업일 18:00 KST */
  function addBusinessDays(fromMs, n) { var t = fromMs, c = 0; while (c < n) { t += DAY; if (isBiz(t)) c++; } return at18(t); }
  function slaDeadline(startMs) { var p = parts(startMs); return (isBiz(startMs) && p.h < 18) ? addBusinessDays(startMs, 2) : addBusinessDays(startMs, 3); }
  /* a 다음 날부터 b 날짜까지(포함) 영업일 수 */
  function bizDaysBetween(a, b) { var t = a, c = 0; while (dayKey(t + DAY) <= dayKey(b)) { t += DAY; if (isBiz(t)) c++; } return c; }
  A.addBusinessDays = addBusinessDays; A.slaDeadline = slaDeadline; A.bizDaysBetween = bizDaysBetween; A.isBiz = isBiz;

  function fmtDT(ms) { if (!ms) return '—'; var p = parts(ms); return pad(p.m) + '/' + pad(p.d) + '(' + DOW[p.dow] + ') ' + pad(p.h) + ':' + pad(p.mi); }
  function fmtD(ms) { var p = parts(ms); return pad(p.m) + '/' + pad(p.d) + '(' + DOW[p.dow] + ')'; }
  function fmtDay(s) { if (!s) return '—'; var a = s.split('-'); var ms = Date.UTC(+a[0], +a[1] - 1, +a[2]) - KST; return a[0] + '-' + a[1] + '-' + a[2] + '(' + DOW[parts(ms + 12 * HOUR).dow] + ')'; }
  function toInput(ms) { var p = parts(ms); return p.y + '-' + pad(p.m) + '-' + pad(p.d) + 'T' + pad(p.h) + ':' + pad(p.mi); }
  function fromInput(v) { return v ? Date.parse(v + ':00+09:00') : null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(n) { return (n == null || n === '') ? '—' : Number(n).toLocaleString('en-US'); }
  function hoursText(h) { h = Math.abs(h); return h >= 48 ? Math.floor(h / 24) + '일' : (Math.round(h * 10) / 10) + '시간'; }
  A.fmtDT = fmtDT; A.fmtD = fmtD; A.fmtDay = fmtDay; A.toInput = toInput; A.fromInput = fromInput; A.esc = esc; A.num = num; A.hoursText = hoursText; A.parts = parts;

  /* ---------- 상태 정의 ---------- */
  var STATES = A.STATES = {
    received: '접수됨', verifying: '검증중', rejected: '반려됨', open: '오픈', bidding: '비딩중', collecting: '취합중',
    delivered: '전달됨', won: '성사', lost: '미성사', cancelled: '취소'
  };
  A.PIPELINE = ['received', 'verifying', 'open', 'bidding', 'collecting', 'delivered'];
  A.TERMINAL = ['won', 'lost', 'rejected', 'cancelled'];
  A.INV = { invited: '초대', viewed: '열람', submitted: '제출', declined: '거절', expired: '마감', reinvited: '재초대됨', proxy_entered: '대리 입력·확인 대기', hotel_confirmed: '호텔 확인', proxy_disputed: '호텔 이의', proxy_expired: '확인 기한 경과' };
  /* 허용 전이 (action 이름 → 결과 상태). rebid 는 비딩중으로 가며 라운드+1 */
  var ALLOWED = A.ALLOWED = {
    received: ['verifying', 'cancelled'],
    verifying: ['rejected', 'open', 'cancelled'],
    open: ['bidding', 'cancelled'],
    bidding: ['collecting', 'cancelled'],
    collecting: ['delivered', 'lost', 'rebid', 'cancelled'],
    delivered: ['won', 'lost', 'rebid', 'cancelled'],
    won: [], lost: [], rejected: [], cancelled: []
  };
  var BTN = {
    verifying: '검증중(으)로', rejected: '반려됨(으)로', open: '오픈(으)로', bidding: '비딩중(으)로', collecting: '취합중(으)로',
    delivered: '전달됨(으)로', won: '성사(으)로', lost: '미성사(으)로', rebid: '조건 변경 → 새 라운드', cancelled: '취소'
  };
  var HINTS = {
    received: '받은 당일 검증중으로 넘깁니다. 이 버튼이 SLA 기산점이므로 내용을 보기 전에 먼저 누르세요.',
    verifying: '확인할 것: 해외 행사인지 · 시작일 확정 · 필수 정보(유형·목적지·인원·객실 수·볼룸) · 인원/객실 모순. 그다음 익명화를 검토하고 오픈합니다. 국내 행사는 반려(정책 2).',
    open: '마감일시를 정하고 승인 파트너 3–5곳을 초대한 뒤 비딩중으로 넘깁니다. 2곳 미만이면 오거나이저에게 먼저 알립니다.',
    bidding: '초대 메일과 마감 24시간 전 리마인더는 시스템이 보냅니다. 마감 24시간 이내인데 제출이 0건이면 미응답 호텔에 팔로업 메일을 보내세요.',
    collecting: '비교표에서 금액·통화·유효기한·취소규정을 확인합니다. 통화가 섞여 있으면 USD 참고(트윈)와 기준일을 먼저 입력하고 당일 전달합니다. 제출이 0건이고 두 번째 라운드까지 왔다면 미성사로 닫습니다.',
    delivered: '오거나이저가 이메일로 선택을 알려오면 호텔에 선정/미선정을 표시합니다. 선정 호텔을 정확히 1곳 표시하고 성사로 닫으면 연결 메일이 자동으로 나갑니다.',
    won: '종료된 요청입니다. 더 이상 바꿀 수 있는 상태가 없습니다.',
    lost: '종료된 요청입니다. 더 이상 바꿀 수 있는 상태가 없습니다.',
    rejected: '반려된 요청입니다. 일정이 확정되면 새 요청으로 다시 받습니다.',
    cancelled: '취소된 요청입니다.'
  };
  A.hint = function (s) { return HINTS[s]; };
  A.btnLabel = function (a) { return BTN[a]; };
  A.allowed = function (r) { return ALLOWED[r.state] || []; };

  /* ---------- 저장소 ---------- */
  var KEY = 'micego_admin_state_v1', ROLE = 'micego_admin_role';
  var S = null;
  /* mock 모드: MGA.boot()가 즉시 window.MOCK_DATA 사본을 넘겨준다(세션 저장값 우선, 없으면 예시 데이터).
   * api 모드: MGA.boot()가 세션/권한을 확인한 뒤 admin_snapshot() 결과를 그대로 넘겨준다. */
  function load(cb) {
    MGA.boot(function (snap) {
      if (MGA.mode === 'api') { S = snap; syncHolidays(); cb(); return; }
      try {
        var s = sessionStorage.getItem(KEY);
        if (s) {
          S = JSON.parse(s);
          /* 시연 시점 전환(?as=partner / ?as=operator): 저장된 상태의 역할과 다르면 예시 데이터를 새로 시작한다 */
          var wantRole = snap.me ? snap.me.role : 'operator', haveRole = S.me ? S.me.role : 'operator';
          if (wantRole === haveRole) { fill(); syncHolidays(); cb(); return; }
          S = null;
        }
      } catch (e) { }
      S = JSON.parse(JSON.stringify(snap)); syncHolidays(); cb();
    });
  }
  /* 이전 버전으로 저장된 세션 상태에 새 필드가 없으면 예시 데이터로 채운다 */
  function fill() {
    var M = JSON.parse(JSON.stringify(window.MOCK_DATA));
    M.rfps.forEach(function (mr) { if (!S.rfps.some(function (x) { return x.id === mr.id; })) S.rfps.push(mr); });
    S.rfps.forEach(function (r) { r.invitations.forEach(function (i) { if (i.deadline === undefined) i.deadline = r.deadline; }); });
    ['invArchive', 'inaccMarks', 'holidays', 'sendLog', 'members', 'shareLinks', 'linkRequests', 'memberAudit', 'memberLog', 'feedback', 'feedbackNotes', 'feedbackEvents', 'operators'].forEach(function (k) { if (!S[k]) S[k] = M[k]; });
    M.rfps.forEach(function (mr) { var cur = S.rfps.filter(function (x) { return x.id === mr.id; })[0]; if (cur && cur.ownerId === undefined) { cur.ownerId = mr.ownerId; if (mr.pickOtp && !cur.pickOtp) cur.pickOtp = mr.pickOtp; } });
    M.partners.forEach(function (mp) {
      var cur = S.partners.filter(function (x) { return x.id === mp.id; })[0];
      if (!cur) S.partners.push(mp);
      else for (var k in mp) if (cur[k] === undefined) cur[k] = mp[k];
    });
  }
  function syncHolidays() { HOLIDAYS.length = 0; S.holidays.forEach(function (h) { HOLIDAYS.push(h.date); }); }
  A.syncHolidays = function () { syncHolidays(); };
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }
  A.save = save;
  A.reset = function () { try { sessionStorage.removeItem(KEY); } catch (e) { } location.reload(); };
  A.data = function () { return S; };
  A.get = function (id) { return S.rfps.filter(function (r) { return r.id === id; })[0] || null; };
  A.partner = function (id) { return S.partners.filter(function (p) { return p.id === id; })[0]; };

  /* ---------- API 연동: 서버 호출 + 로컬 반영 (SPEC_LAUNCH.md §6) ----------
   * 전체 엔티티를 돌려주는 RPC 는 그 응답으로 S.rfps/S.partners 항목을 통째로 교체한다.
   * ack 만 돌려주는 RPC(admin_link_decide, admin_holiday_*, admin_delivery_resolve, admin_resend,
   * admin_member_action)는 localFn 을 그대로 재생해 로컬 상태를 맞춘다. */
  var RFP_REPLACE_OPS = { admin_transition: 1, admin_rfp_update: 1, admin_invite: 1, admin_reinvite: 1, admin_mark_selection: 1, admin_quote_update: 1, admin_invitation_flag: 1, admin_add_note: 1 };
  var PARTNER_REPLACE_OPS = { admin_partner_transition: 1, admin_partner_update: 1 };
  var PARTNER_HOTEL_OPS = { partner_hotel_register: 1 };
  var RFP_WRAPPED_OPS = { rfp_assign: 1, rfp_hold: 1, rfp_set_region: 1, rfp_takeover: 1, rfp_release: 1 };
  var RFP_PLAIN_OPS = { partner_quote_proxy_enter: 1, partner_quote_proxy_resend: 1 };
  function replaceEntity(op, resp) {
    if (RFP_WRAPPED_OPS[op] && resp && resp.rfp) { resp = resp.rfp; op = 'admin_transition'; }
    if (RFP_PLAIN_OPS[op]) op = 'admin_transition';
    if (PARTNER_HOTEL_OPS[op]) op = 'admin_partner_update';
    if (!resp || typeof resp !== 'object' || !resp.id) return false;
    var list = RFP_REPLACE_OPS[op] ? S.rfps : PARTNER_REPLACE_OPS[op] ? S.partners : null;
    if (!list) return false;
    for (var i = 0; i < list.length; i++) { if (list[i].id === resp.id) { list[i] = resp; return true; } }
    list.push(resp); return true;
  }
  /* op: RPC/Edge 함수 이름. args: 그 함수의 인자 객체. localFn: mock 모드에서(또는 api 모드에서 응답이
   * 전체 엔티티가 아니라 통째로 교체할 수 없을 때) 대신 재생할 로컬 반영 함수. */
  A.persist = function (op, args, localFn) {
    if (MGA.mode !== 'api') {
      try { localFn(); } catch (e) { }
      save();
      if (typeof A.onChange === 'function') A.onChange();
      return Promise.resolve(true);
    }
    return MGA.call(op, args).then(function (resp) {
      if (!replaceEntity(op, resp)) { try { localFn(); } catch (e) { } }
      save();
      if (typeof A.onChange === 'function') A.onChange();
      return true;
    }, function (err) {
      A.toast((err && (err.message || err.message_ko)) || '처리하지 못했습니다', 'error');
      return false;
    });
  };

  /* ---------- 파생값 ---------- */
  A.curInv = function (r) { return r.invitations.filter(function (i) { return i.round === r.round && i.status !== 'reinvited'; }); };
  /* 초대 현황 표용: 재초대돼 이력으로만 남은 행도 포함 */
  A.roundInv = function (r) { return r.invitations.filter(function (i) { return i.round === r.round; }); };
  /* 초대별 마감: 가장 늦은 마감, 그리고 아직 응답 없는 초대의 마감이 모두 지났는지 */
  A.latestDeadline = function (r) { var m = 0; A.curInv(r).forEach(function (i) { if (i.deadline && i.deadline > m) m = i.deadline; }); return m || null; };
  A.allPassed = function (r) { var l = A.curInv(r); return l.length > 0 && l.every(function (i) { return (i.deadline || r.deadline || 0) <= NOW; }); };
  A.allResponded = function (r) { var l = A.curInv(r); return l.length > 0 && l.every(function (i) { return i.status === 'submitted' || i.status === 'hotel_confirmed' || i.status === 'declined' || i.status === 'expired' || i.status === 'proxy_expired'; }); };
  A.curQuotes = function (r) {
    var ids = {}; A.curInv(r).forEach(function (i) { if (i.status === 'submitted') ids[i.id] = 1; });
    return r.quotes.filter(function (x) { return x.round === r.round && ids[x.invId]; });
  };
  A.submittedCount = function (r) { return A.curInv(r).filter(function (i) { return i.status === 'submitted' || i.status === 'hotel_confirmed'; }).length; };
  A.currencies = function (r) { var m = {}; A.curQuotes(r).forEach(function (x) { m[x.currency] = 1; }); return Object.keys(m); };
  A.usdMissing = function (r) {
    if (A.currencies(r).length < 2) return 0;
    return A.curQuotes(r).filter(function (x) { return !(Number(x.usdRef) > 0) || !x.usdDate; }).length;
  };
  A.sla = function (r) {
    if ((r.state !== 'verifying' && r.state !== 'open') || !r.verifyingAt) return null;
    var due = slaDeadline(r.verifyingAt), rem = due - NOW, inv = r.state === 'open';
    /* 오픈에 도달하면 SLA는 충족. 오픈에서는 같은 기한을 초대 기한으로 표시한다 */
    var nm = inv ? '초대 기한' : 'SLA';
    if (rem <= 0) return { level: 'red', due: due, text: nm + ' 초과 ' + hoursText(rem / HOUR), okText: nm + ' ' + fmtDT(due) };
    if (due <= addBusinessDays(NOW, 1) || rem <= 24 * HOUR) return { level: 'amber', due: due, text: (inv ? '초대 기한 임박' : 'SLA 마감 임박') + ' · ' + fmtDT(due), okText: nm + ' ' + fmtDT(due) };
    return { level: 'ok', due: due, text: '', okText: nm + ' ' + fmtDT(due) };
  };
  A.unchecked = function (r) { return r.state === 'received' && dayKey(r.createdAt) === dayKey(NOW); };
  A.deadlineSoon = function (r) { return r.state === 'bidding' && r.deadline && (r.deadline - NOW) <= 24 * HOUR; };
  A.followup = function (r) { return A.deadlineSoon(r) && A.submittedCount(r) === 0; };
  A.labelQuotes = function (r, round) {
    /* 도착순 A/B/C */
    var ids = r.invitations.filter(function (i) { return i.round === round && i.status === 'submitted'; })
      .sort(function (a, b) { return a.submittedAt - b.submittedAt; });
    var m = {}; ids.forEach(function (i, k) { m[i.id] = String.fromCharCode(65 + k); }); return m;
  };
  /* ---------- 파트너 심사 ---------- */
  var PSTATES = A.PSTATES = { pending: '신청', reviewing: '심사중', approved: '승인', rejected: '거절', suspended: '중지' };
  var PALLOWED = A.PALLOWED = { pending: ['reviewing', 'approved', 'rejected'], reviewing: ['approved', 'rejected'], approved: ['suspended'], suspended: ['approved'], rejected: [] };
  var PBTN = { reviewing: '심사중(으)로', approved: '승인', rejected: '거절', suspended: '중지' };
  A.pallowed = function (p) { return PALLOWED[p.status] || []; };
  A.pbtnLabel = function (a, p) { return (a === 'approved' && p.status === 'suspended') ? '재승인' : PBTN[a]; };
  A.pchip = function (st) { return '<span class="chip pst-' + st + '">' + esc(PSTATES[st]) + '</span>'; };
  A.PHINT = {
    pending: '신청 후 5영업일 안에 승인 또는 거절합니다. 바로 승인해도 되지만, 확인이 필요한 건은 심사중으로 두고 상황을 남기세요.',
    reviewing: '아래 체크리스트를 채운 뒤 승인 또는 거절합니다. 볼룸이 없어도 승인합니다.',
    approved: '초대에 3회 연속 무응답이거나 견적이 반복해서 부정확하면 중지하고 이메일로 알립니다.',
    suspended: '호텔에서 답신이 오면 내용을 적고 재승인합니다. 중지 안내 메일은 직접 보내야 합니다.',
    rejected: '거절된 신청입니다. 더 이상 바꿀 수 있는 상태가 없습니다.'
  };
  /* 심사 기한: 신청일이 영업일이고 18:00 이전이면 그날이 1일째, 5번째 영업일 18:00 KST (SLA 와 같은 규칙) */
  function partnerDue(ms) { var p = parts(ms); return (isBiz(ms) && p.h < 18) ? addBusinessDays(ms, 4) : addBusinessDays(ms, 5); }
  A.partnerDue = partnerDue;
  A.partnerReview = function (p) {
    if (p.status !== 'pending' && p.status !== 'reviewing') return null;
    var due = partnerDue(p.appliedAt);
    if (due <= NOW) return { level: 'red', due: due, text: '지연' };
    if (dayKey(due) === dayKey(NOW)) return { level: 'amber', due: due, text: '오늘 마감' };
    return { level: 'ok', due: due, text: '남은 ' + bizDaysBetween(NOW, due) + '영업일' };
  };
  A.partnerDelayed = function () {
    return S.partners.filter(function (p) { var r = A.partnerReview(p); return r && r.level === 'red'; });
  };
  A.refreshBadge = function () {
    var cnt = { 'partners.html': [A.partnerDelayed().length, '심사 지연 '], 'members.html': [A.linkPending().length, '연결 요청 대기 '], 'feedback.html': [A.feedbackNewCount(), '새 접수 '] };
    Object.keys(cnt).forEach(function (h) {
      var n = cnt[h][0];
      [].forEach.call(document.querySelectorAll('a.nav-a[href="' + h + '"]'), function (a) {
        var b = a.querySelector('.nav-badge'); if (b) b.remove();
        if (n) { var e = document.createElement('em'); e.className = 'nav-badge'; e.setAttribute('aria-label', cnt[h][1] + n + '건'); e.textContent = n; a.appendChild(e); }
      });
    });
  };
  /* 초대 이력: 콘솔의 모든 RFP 초대 + 종료된 과거 요청 기록 */
  A.partnerInvs = function (id) {
    var out = [];
    S.rfps.forEach(function (r) {
      var bids = r.history.filter(function (h) { return h.to === 'bidding'; });
      r.invitations.forEach(function (i) {
        if (i.hotelId !== id || i.status === 'reinvited') return;
        var b = bids[i.round - 1] || bids[bids.length - 1];
        out.push({ rfpId: r.id, round: i.round, invitedAt: b ? b.t : r.createdAt, status: i.status, submittedAt: i.submittedAt, seedInacc: false, live: true });
      });
    });
    S.invArchive.forEach(function (a) { if (a.hotelId === id) out.push({ rfpId: a.rfpId, round: a.round, invitedAt: a.invitedAt, status: a.status, submittedAt: a.submittedAt, seedInacc: !!a.inaccurate, live: false }); });
    out.forEach(function (o) {
      o.key = o.rfpId + '|' + o.round + '|' + id;
      o.inaccurate = o.status === 'submitted' && (S.inaccMarks[o.key] !== undefined ? !!S.inaccMarks[o.key] : o.seedInacc);
    });
    return out.sort(function (a, b) { return b.invitedAt - a.invitedAt; });
  };
  A.partnerStats = function (id) {
    var l = A.partnerInvs(id), n = l.length, c = function (s) { return l.filter(function (x) { return x.status === s; }).length; };
    var pc = function (k) { return n ? Math.round(k / n * 100) : 0; };
    return { n: n, sub: c('submitted'), dec: c('declined'), exp: c('expired'), pSub: pc(c('submitted')), pDec: pc(c('declined')), pExp: pc(c('expired')) };
  };
  /* 중지 검토 표시: 승인 파트너만. 최근 초대 3건 연속 마감(무응답) 또는 부정확 견적 2건 이상 */
  A.partnerFlag = function (p) {
    if (p.status !== 'approved') return [];
    var l = A.partnerInvs(p.id), out = [];
    if (l.length >= 3 && l.slice(0, 3).every(function (x) { return x.status === 'expired'; })) out.push('최근 초대 3건 연속 무응답(마감)');
    var bad = l.filter(function (x) { return x.inaccurate; }).length;
    if (bad >= 2) out.push('부정확 견적 표시 ' + bad + '건');
    return out;
  };
  A.PFILTERS = {
    delayed: { label: '심사 지연', fn: function (p) { var r = A.partnerReview(p); return !!(r && r.level === 'red'); } },
    flag: { label: '중지 검토', fn: function (p) { return A.partnerFlag(p).length > 0; } }
  };
  var PERSONAL = /^(gmail|googlemail|naver|daum|hanmail|kakao|yahoo|hotmail|outlook|live|icloud|msn|proton|protonmail)\./i;
  A.partnerChecks = function (p) {
    var c = p.check || {}, ed = (p.email.split('@')[1] || '').toLowerCase(), hd = (p.hotelDomain || '').toLowerCase();
    var personal = PERSONAL.test(ed), match = !personal && !!hd && (ed === hd || ed.slice(-(hd.length + 1)) === '.' + hd);
    var abroad = !/대한민국|한국|Korea/i.test(p.hotelLocation || '');
    var items = [
      { key: 'exists', short: '실재 확인(URL 입력과 확인 체크)', label: '실재 확인 (공식 사이트 또는 지도 URL 입력 후 확인 체크)', ok: !!(c.url && c.url.trim() && c.exists) },
      { key: 'domain', short: '소속 확인 방법 메모(이메일 도메인 불일치)', label: match ? '이메일 도메인이 호텔 도메인과 같음' : '이메일 도메인 불일치 · 소속 확인 방법 메모 필요', ok: match || !!(c.affil && c.affil.trim()) },
      { key: 'cap', short: '단체 수용 규모 일치 확인', label: '단체 수용 규모가 신청서와 일치', ok: !!c.capOk },
      { key: 'abroad', short: '해외 소재', label: '해외 소재', ok: abroad },
      { key: 'size', short: '단체 50명 이상 수용', label: '단체 50명 이상 수용', ok: p.capBand !== 'Under 50' },
      { key: 'contact', short: '담당자 연락처 확인', label: '담당자 연락처 확인됨', ok: !!c.contactOk }
    ];
    return { items: items, match: match, personal: personal, missing: items.filter(function (x) { return !x.ok; }).map(function (x) { return x.short; }) };
  };
  A.plog = function (p, actor, from, to, memo) {
    S.tick += 1; var t = NOW + S.tick * 60000;
    p.history.push({ t: t, actor: actor, from: from, to: to, memo: memo || '' });
  };
  var PREJECT = ['국내 소재', '단체 50명 미만', '연락처 확인 불가', '실재 확인 불가', '기타'];
  var PSUSPEND = ['3회 연속 무응답', '반복 부정확 견적', '기타'];
  A.partnerRequest = async function (id, action) {
    var p = A.partner(id); if (!p || A.pallowed(p).indexOf(action) < 0) return false;
    var from = p.status, memo = '', tail = '', reasonVal = null, noteVal = null;
    if (action === 'approved' && from === 'suspended') {
      var m = await A.memoDialog('재승인', '답신 내용', '호텔에서 받은 답신의 요지를 적어 주세요. 이력에 남습니다.', '재승인하기', true);
      if (m === null) return false;
      memo = '답신: ' + m; tail = ' · 시스템이 결과 메일을 보냅니다';
    } else if (action === 'approved') {
      var miss = A.partnerChecks(p).missing;
      if (miss.length) { A.toast('승인하려면 다음을 채워 주세요: ' + miss.join(', '), 'error'); return false; }
      memo = '체크리스트 완료'; tail = ' · 시스템이 결과 메일을 보냅니다';
    } else if (action === 'rejected') {
      var r = await A.reasonDialog('거절 사유', PREJECT); if (!r) return false;
      memo = r.reason + (r.note ? ' · ' + r.note : ''); tail = ' · 시스템이 결과 메일을 보냅니다';
      reasonVal = r.reason; noteVal = r.note;
    } else if (action === 'suspended') {
      var r2 = await A.reasonDialog('중지 사유', PSUSPEND, '<p class="note-box">중지 안내는 자동으로 나가지 않습니다. 저장한 뒤 호텔에 이메일로 직접 알려 주세요.</p>'); if (!r2) return false;
      memo = r2.reason + (r2.note ? ' · ' + r2.note : ''); tail = ' · 중지 안내 메일은 직접 발송 필요';
      reasonVal = r2.reason; noteVal = r2.note;
    }
    var localFn = function () {
      A.plog(p, '운영자', from, action, memo ? memo + tail : tail.replace(' · ', ''));
      p.status = action;
    };
    var okP = await A.persist('admin_partner_transition', { p_code: id, p_action: action, p_reason: reasonVal, p_note: noteVal, p_memo: memo }, localFn);
    if (!okP) return false;
    var msg = { reviewing: '심사중으로 바꿨습니다', approved: (from === 'suspended' ? '재승인했습니다' : '승인했습니다') + ' · 시스템이 결과 메일을 보냅니다', rejected: '거절했습니다 · 시스템이 결과 메일을 보냅니다', suspended: '중지했습니다 · 중지 안내 메일을 직접 보내세요' }[action];
    A.toast(msg, 'ok');
    A.refreshBadge();
    return true;
  };
  A.failedCount = function () { return S.failures.filter(function (f) { return !f.manual; }).length; };

  /* ---------- 회원 계정 ----------
   * 상태 머신: pending_email → pending_phone → active ⇄ locked / suspended, active → withdrawn.
   * 미완료 가입(pending_*)은 72시간 뒤 자동 파기(purged)되며 콘솔에서는 안내로만 보여 줍니다.
   * 운영자 조치는 모두 사유가 필요하고 감사 로그(memberAudit)와 발송 기록(memberLog)에 남습니다. */
  var MSTATES = A.MSTATES = { pending_email: '이메일 인증 대기', pending_phone: '휴대전화 인증 대기', active: '정상', locked: '잠김', suspended: '이용 정지', withdrawn: '탈퇴' };
  A.MFLOW = { pending_email: ['pending_phone'], pending_phone: ['active'], active: ['locked', 'suspended', 'withdrawn'], locked: ['active'], suspended: ['active'], withdrawn: [] };
  /* 탈퇴를 막는 요청 상태 (rebid 는 콘솔 상태 값이 아니라 비딩중 라운드 2 이상을 뜻하는 과거 요청 요약 값) */
  var MBLOCK = A.MBLOCK = ['bidding', 'rebid', 'collecting', 'delivered'];
  var MAUTOCANCEL = A.MAUTOCANCEL = ['received', 'verifying', 'open'];
  var PURGE_MS = 72 * HOUR;
  A.mchip = function (st) { return '<span class="chip mst-' + st + '">' + esc(MSTATES[st]) + '</span>'; };
  A.refChip = function (st) { return st === 'rebid' ? '<span class="chip st-bidding">재요청</span>' : A.chip(st); };
  A.member = function (id) { return S.members.filter(function (m) { return m.id === id; })[0] || null; };
  A.maskPhone = function (p) { if (!p) return '—'; var m = String(p).match(/^(\d{2,3})-?(\d{3,4})-?(\d{4})$/); return m ? m[1] + '-****-' + m[3] : '****'; };
  A.memberName = function (m) { return m.state === 'withdrawn' ? '탈퇴 회원' : m.name; };
  A.linkPending = function () { return S.linkRequests.filter(function (l) { return l.status === 'pending'; }); };
  A.lockedCount = function () { return S.members.filter(function (m) { return m.state === 'locked'; }).length; };
  A.purgeAt = function (m) { return (m.state === 'pending_email' || m.state === 'pending_phone') ? m.createdAt + PURGE_MS : null; };
  /* 요청 목록: 콘솔에 있는 요청(ownerId)과 콘솔 밖 과거 요청 요약을 합쳐 최신순 */
  A.memberRfps = function (m) {
    var out = S.rfps.filter(function (r) { return r.ownerId === m.id; }).map(function (r) { return { id: r.id, title: r.destination + ' · ' + r.eventType, state: r.state, round: r.round, createdAt: r.createdAt, live: true }; });
    (m.refs || []).forEach(function (x) { out.push({ id: x.id, title: x.title, state: x.state, round: 1, createdAt: x.createdAt, live: !!A.get(x.id) }); });
    return out.sort(function (a, b) { return b.createdAt - a.createdAt; });
  };
  A.memberBlockers = function (m) { return A.memberRfps(m).filter(function (x) { return MBLOCK.indexOf(x.state) >= 0; }); };
  A.memberAutoCancel = function (m) { return A.memberRfps(m).filter(function (x) { return MAUTOCANCEL.indexOf(x.state) >= 0 && x.live; }); };
  A.transferable = function (m) { return S.rfps.filter(function (r) { return r.ownerId === m.id && A.PIPELINE.indexOf(r.state) >= 0; }); };
  /* 공유 링크: 요청이 끝나면 30일 뒤 만료, 탈퇴하면 중지 */
  A.shareState = function (l) {
    if (l.status !== 'active') return l.status;
    var r = A.get(l.rfpId);
    if (r && A.TERMINAL.indexOf(r.state) >= 0) { var last = r.history.length ? r.history[r.history.length - 1].t : r.createdAt; if (last + 30 * DAY <= NOW) return 'expired'; }
    return 'active';
  };
  A.shareExpiry = function (l) {
    var r = A.get(l.rfpId); if (!r || A.TERMINAL.indexOf(r.state) < 0) return null;
    return (r.history.length ? r.history[r.history.length - 1].t : r.createdAt) + 30 * DAY;
  };
  A.SHARE = { active: '사용 중', revoked: '회원이 끔', expired: '만료', disabled: '탈퇴로 중지' };
  A.shareChip = function (st) { return '<span class="chip shr-' + st + '">' + esc(A.SHARE[st]) + '</span>'; };

  var MACT = A.MACT = {
    unlock: { label: '잠금 해제', from: ['locked'], reasons: ['본인 확인 완료(전화)', '오입력 반복 확인', '기타'] },
    suspend: { label: '이용 정지', from: ['active'], reasons: ['약관 위반 신고', '계정 공유 의심', '부정 이용 의심', '기타'], danger: true },
    unsuspend: { label: '정지 해제', from: ['suspended'], reasons: ['사유 해소', '오조치 정정', '기타'] },
    resend: { label: '인증 메일 재발송', from: ['pending_email'], reasons: ['수신 확인 요청(고객 문의)', '스팸함에서 못 찾음', '기타'] },
    revoke: { label: '모든 세션 종료', from: ['active', 'suspended'], reasons: ['기기 분실 신고', '계정 도용 의심', '기타'] },
    transfer: { label: '요청 이관', from: ['active', 'locked', 'suspended'], reasons: ['담당자 변경(퇴사·인사이동)', '계정 오등록 정정', '기타'] },
    withdraw: { label: '탈퇴 처리', from: ['active'], reasons: ['회원 본인 요청(고객센터)', '기타'], danger: true }
  };
  A.MHINT = {
    pending_email: '가입 후 72시간 안에 이메일 인증을 마치지 않으면 자동으로 파기됩니다. 고객이 메일을 못 받았다고 문의하면 인증 메일을 다시 보낼 수 있습니다(하루 10회 한도).',
    pending_phone: '이메일 인증은 끝났고 휴대전화 인증이 남았습니다. 인증번호는 회원이 직접 받아 입력해야 하므로 운영자가 대신할 수 있는 조치는 없습니다. 72시간이 지나면 자동으로 파기됩니다.',
    active: '정상 회원입니다. 계정 조치는 모두 사유를 남기며, 이관과 탈퇴는 진행 중 요청 상태에 따라 막힐 수 있습니다.',
    locked: '로그인 실패로 잠긴 계정입니다. 본인은 비밀번호 재설정 메일로도 풀 수 있습니다. 전화로 본인을 확인한 경우에만 여기서 풀어 주세요.',
    suspended: '이용이 제한된 계정입니다. 로그인할 수 없고 진행 중 요청은 그대로 진행됩니다. 해제하려면 사유를 남깁니다. 정지·해제 안내 메일은 자동으로 나가지 않으니 직접 알려 주세요.',
    withdrawn: '탈퇴한 계정입니다. 개인 정보는 파기됐고 더 바꿀 수 있는 항목이 없습니다.'
  };
  A.mactions = function (m) { return Object.keys(MACT).filter(function (k) { return MACT[k].from.indexOf(m.state) >= 0; }); };
  A.mguard = function (m, action) {
    if (action === 'withdraw') {
      var b = A.memberBlockers(m);
      if (b.length) return '진행 중인 요청이 ' + b.length + '건 있어 탈퇴 처리할 수 없습니다 (' + b.map(function (x) { return x.id; }).join(', ') + '). 요청이 종료되거나 취소된 뒤에 처리하세요.';
    }
    if (action === 'transfer' && !A.transferable(m).length) return '이관할 수 있는 진행 중 요청이 없습니다';
    if (action === 'revoke' && !(m.sessions || []).length) return '종료할 세션이 없습니다';
    if (action === 'resend' && (m.sends || 0) >= 10) return '이 이메일은 오늘 인증 메일 10회 한도를 모두 썼습니다. 내일 다시 보낼 수 있습니다';
    return null;
  };
  function maudit(m, actor, action, label, reason, notif) {
    S.tick += 1; var t = NOW + S.tick * 60000;
    S.memberAudit.push({ id: 'a' + (S.memberAudit.length + 1), memberId: m.id, t: t, actor: actor, action: action, label: label, reason: reason || '', notif: notif || '' });
    return t;
  }
  function mnotify(m, template, to, t, status) {
    S.memberLog.push({ id: 'ml' + (S.memberLog.length + 1), memberId: m.id, t: t, template: template, to: to, status: status || 'sent' });
  }
  A.memberAudit = function (m) { return S.memberAudit.filter(function (x) { return x.memberId === m.id; }).sort(function (a, b) { return a.t - b.t; }); };
  A.memberLog = function (m) { return S.memberLog.filter(function (x) { return x.memberId === m.id; }).sort(function (a, b) { return a.t - b.t; }); };
  function reasonText(res) { return res.reason + (res.note ? ' · ' + res.note : ''); }
  /* admin_member_action(Edge Function) 을 경유해 로컬을 반영한다. api 모드에서는 서버 응답이 부분
   * 정보(id,state,name,email)만 담고 있어 전체 교체가 불가능하므로 localFn 을 그대로 재생한다. */
  function memberPersist(args, localFn, msg) {
    return A.persist('admin_member_action', args, localFn).then(function (ok) {
      if (ok) { A.toast(typeof msg === 'function' ? msg() : msg, 'ok'); A.refreshBadge(); }
      return ok;
    });
  }

  A.memberRequest = async function (id, action) {
    var m = A.member(id), def = MACT[action]; if (!m || !def || def.from.indexOf(m.state) < 0) return false;
    var g = A.mguard(m, action);
    if (g) { A.toast(g, 'error'); return false; }
    var res;
    if (action === 'unlock') {
      res = await A.reasonDialog('잠금 해제', def.reasons, '<p class="note-box">비밀번호는 바뀌지 않고 로그인 실패 횟수만 0으로 돌아갑니다. 본인이 비밀번호를 기억하지 못하면 재설정 메일(ACC_PW_RESET)로 안내하세요.</p>'); if (!res) return false;
      return memberPersist({ member_id: id, action: action, reason: res.reason, note: res.note },
        function () { m.state = 'active'; m.fails = 0; maudit(m, '운영자', action, '잠금 해제', reasonText(res)); },
        '잠금을 풀었습니다 · 로그인 실패 횟수를 초기화했습니다');
    }
    if (action === 'suspend') {
      res = await A.reasonDialog('이용 정지', def.reasons, '<p class="note-box">로그인이 막히고 모든 세션이 종료됩니다. 진행 중인 요청은 그대로 진행됩니다. 정지 안내 메일은 자동으로 나가지 않으니 회원에게 직접 알려 주세요.</p>'); if (!res) return false;
      return memberPersist({ member_id: id, action: action, reason: res.reason, note: res.note },
        function () { m.state = 'suspended'; m.suspendedAt = NOW; m.sessions = []; maudit(m, '운영자', action, '이용 정지', reasonText(res)); },
        '이용을 정지했습니다 · 정지 안내는 직접 알려 주세요');
    }
    if (action === 'unsuspend') {
      res = await A.reasonDialog('정지 해제', def.reasons); if (!res) return false;
      return memberPersist({ member_id: id, action: action, reason: res.reason, note: res.note },
        function () { m.state = 'active'; maudit(m, '운영자', action, '정지 해제', reasonText(res)); },
        '정지를 풀었습니다 · 해제 안내는 직접 알려 주세요');
    }
    if (action === 'resend') {
      res = await A.reasonDialog('인증 메일 재발송', def.reasons, '<p class="note-box">새 인증번호(유효 10분)를 ' + esc(m.email) + '(으)로 보냅니다. 이전 번호는 무효가 됩니다.</p>'); if (!res) return false;
      return memberPersist({ member_id: id, action: action, reason: res.reason, note: res.note },
        function () { m.sends = (m.sends || 0) + 1; var t = maudit(m, '운영자', action, '인증 메일 재발송', reasonText(res), 'ACC_EMAIL_CODE'); mnotify(m, 'ACC_EMAIL_CODE 이메일 인증번호', m.email, t); },
        function () { return '인증 메일을 다시 보냈습니다 · ACC_EMAIL_CODE (오늘 ' + (m.sends || 0) + '/10회)'; });
    }
    if (action === 'revoke') {
      var n = m.sessions.length;
      res = await A.reasonDialog('모든 세션 종료', def.reasons, '<p class="note-box">로그인 중인 기기 ' + n + '곳이 즉시 로그아웃됩니다. 비밀번호는 바뀌지 않습니다.</p>'); if (!res) return false;
      return memberPersist({ member_id: id, action: action, reason: res.reason, note: res.note },
        function () { m.sessions = []; maudit(m, '운영자', action, '모든 세션 종료(' + n + '곳)', reasonText(res)); },
        '세션 ' + n + '곳을 종료했습니다');
    }
    if (action === 'withdraw') {
      var auto = A.memberAutoCancel(m);
      var body = '<p class="note-box">회원이 고객센터로 직접 요청한 경우에만 처리합니다. 처리하면 이메일·휴대전화는 즉시 파기되고 추적·공유 링크는 모두 중지됩니다. 이미 선정 호텔에 전달된 정보는 회수되지 않습니다.</p>' +
        (auto.length ? '<p class="small">접수·검증·오픈 상태의 요청 ' + auto.length + '건(' + esc(auto.map(function (x) { return x.id; }).join(', ')) + ')은 자동으로 취소됩니다.</p>' : '') +
        '<label class="lbl" for="dlgReason">사유</label><select id="dlgReason" class="inp"><option value="">사유를 선택하세요</option>' + def.reasons.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('') + '</select>' +
        '<label class="lbl" for="dlgNote">메모 (선택, 기타는 필수)</label><textarea id="dlgNote" class="inp" rows="2"></textarea>' +
        '<label class="chk-row"><input type="checkbox" id="dlgOwn"> 본인 요청 확인 (회원 본인임을 확인했습니다)</label>';
      res = await dialog({ title: '탈퇴 처리', ok: '탈퇴 처리하기', body: body, collect: function (d) {
        var reason = d.querySelector('#dlgReason').value, note = d.querySelector('#dlgNote').value.trim();
        if (!reason) return '사유를 선택해 주세요';
        if (reason === '기타' && !note) return '기타를 고른 경우 메모를 적어 주세요';
        if (!d.querySelector('#dlgOwn').checked) return '본인 요청 확인에 체크해 주세요';
        return { reason: reason, note: note };
      } });
      if (!res) return false;
      return memberPersist({ member_id: id, action: action, reason: res.reason, note: res.note, self_request_confirmed: true },
        function () {
          var t = maudit(m, '운영자', action, '탈퇴 처리', reasonText(res) + ' · 본인 요청 확인', 'ACC_WITHDRAWN');
          mnotify(m, 'ACC_WITHDRAWN 탈퇴 완료 안내', m.email, t);
          auto.forEach(function (x) { var r = A.get(x.id); if (r) { var from = r.state; A.log(r, '시스템', from, 'cancelled', '회원 탈퇴로 자동 취소 (' + m.company + ')'); r.state = 'cancelled'; } });
          S.shareLinks.forEach(function (l) { if (l.memberId === m.id && l.status === 'active') { l.status = 'disabled'; l.revokedAt = t; } });
          var won = A.memberRfps(m).filter(function (x) { return x.state === 'won'; }).length;
          m.name = ''; m.email = ''; m.phone = ''; m.sessions = []; m.state = 'withdrawn'; m.withdrawnAt = t;
          if (won) m.retained = '성사 연결 기록 ' + won + '건(회사명·담당자·연락처·선정 호텔·연결 일시)은 분쟁 대응을 위해 3년간 보관 후 파기합니다.';
        },
        '탈퇴 처리했습니다 · 개인 정보를 파기했고 ACC_WITHDRAWN 안내를 보냈습니다' + (auto.length ? ' · 요청 ' + auto.length + '건 자동 취소' : ''));
    }
    if (action === 'transfer') {
      var list = A.transferable(m);
      var opts = list.map(function (r) { return '<option value="' + r.id + '">' + r.id + ' · ' + esc(r.destination) + ' ' + esc(r.eventType) + ' (' + A.STATES[r.state] + ')</option>'; }).join('');
      var body2 = '<p class="note-box">요청의 소유자만 바뀝니다. 호텔에 이미 보낸 내용은 그대로이고, 이전 소유자가 만든 공유 링크는 꺼집니다. 양쪽 회원에게 알리는 메일은 자동으로 나가지 않으니 OPS_RFP_TRANSFER 문안으로 직접 보내세요.</p>' +
        '<label class="lbl" for="dlgRfp">이관할 요청</label><select id="dlgRfp" class="inp">' + opts + '</select>' +
        '<label class="lbl" for="dlgTo">받는 회원 이메일</label><input id="dlgTo" class="inp" type="email" autocomplete="off" placeholder="정상(active) 회원의 이메일">' +
        '<label class="lbl" for="dlgReason">사유</label><select id="dlgReason" class="inp"><option value="">사유를 선택하세요</option>' + def.reasons.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('') + '</select>' +
        '<label class="lbl" for="dlgNote">메모 (선택, 기타는 필수)</label><textarea id="dlgNote" class="inp" rows="2"></textarea>';
      res = await dialog({ title: '요청 이관', ok: '이관하기', body: body2, collect: function (d) {
        var to = d.querySelector('#dlgTo').value.trim().toLowerCase(), reason = d.querySelector('#dlgReason').value, note = d.querySelector('#dlgNote').value.trim();
        if (!to) return '받는 회원의 이메일을 입력해 주세요';
        var tm = S.members.filter(function (x) { return x.email && x.email.toLowerCase() === to; })[0];
        if (!tm) return '이 이메일로 가입한 회원이 없습니다';
        if (tm.id === m.id) return '같은 회원에게는 이관할 수 없습니다';
        if (tm.state !== 'active') return '받는 회원이 정상(active) 상태가 아닙니다 (현재 ' + MSTATES[tm.state] + ')';
        if (!reason) return '사유를 선택해 주세요';
        if (reason === '기타' && !note) return '기타를 고른 경우 메모를 적어 주세요';
        return { rfp: d.querySelector('#dlgRfp').value, to: tm.id, reason: reason, note: note };
      } });
      if (!res) return false;
      var rTarget = A.get(res.rfp), tm2 = A.member(res.to), why = reasonText(res);
      return memberPersist({ member_id: id, action: action, reason: res.reason, note: res.note, rfp_ref: res.rfp, to_email: tm2.email },
        function () {
          rTarget.ownerId = tm2.id;
          var cut = 0; S.shareLinks.forEach(function (l) { if (l.rfpId === rTarget.id && l.status === 'active') { l.status = 'revoked'; l.revokedAt = NOW; cut++; } });
          A.log(rTarget, '운영자', null, null, '요청 이관 · ' + m.name + '(' + m.company + ') → ' + tm2.name + '(' + tm2.company + ') · ' + why + (cut ? ' · 공유 링크 ' + cut + '건 끔' : ''));
          var t = maudit(m, '운영자', 'transfer', '요청 이관(보냄) ' + rTarget.id + ' → ' + tm2.name, why, 'OPS_RFP_TRANSFER');
          maudit(tm2, '운영자', 'transfer', '요청 이관(받음) ' + rTarget.id + ' ← ' + m.name, why, 'OPS_RFP_TRANSFER');
          mnotify(m, 'OPS_RFP_TRANSFER 이관 안내 (직접 발송 필요)', m.email, t, 'manual'); mnotify(tm2, 'OPS_RFP_TRANSFER 이관 안내 (직접 발송 필요)', tm2.email, t, 'manual');
        },
        rTarget.id + '을(를) ' + tm2.name + '님에게 이관했습니다 · 양쪽 안내 메일(OPS_RFP_TRANSFER)을 직접 보내세요');
    }
    return false;
  };
  /* 연결 요청: 휴대전화가 같은 비회원 요청을 회원 계정에 붙일지 운영자가 확인 */
  A.linkRequest = async function (id, action) {
    var l = S.linkRequests.filter(function (x) { return x.id === id; })[0]; if (!l || l.status !== 'pending') return false;
    var m = A.member(l.memberId);
    if (action === 'approve') {
      if (m.state !== 'active') { A.toast('회원이 정상(active) 상태일 때만 승인할 수 있습니다 (현재 ' + MSTATES[m.state] + ')', 'error'); return false; }
      var res = await A.reasonDialog('연결 승인', ['휴대전화 번호 일치 확인', '고객 문의로 소유 확인', '기타'], '<p class="note-box">' + esc(l.ref.id) + '을(를) ' + esc(m.name) + '님의 요청으로 옮깁니다. 승인하면 회원에게 ACC_LINKED 안내가 자동으로 나갑니다.</p>');
      if (!res) return false;
      var localFn = function () {
        l.status = 'approved'; l.decidedAt = NOW;
        m.refs.push({ id: l.ref.id, title: l.ref.title, state: l.ref.state, createdAt: l.ref.createdAt });
        var t = maudit(m, '운영자', 'link_approve', '연결 승인 ' + l.ref.id, reasonText(res), 'ACC_LINKED');
        mnotify(m, 'ACC_LINKED 요청 연결 안내', m.email, t);
      };
      var okA = await A.persist('admin_link_decide', { p_id: id, p_decision: 'approve', p_reason: reasonText(res) }, localFn);
      if (!okA) return false;
      A.toast(l.ref.id + '을(를) ' + m.name + '님에게 연결했습니다 · ACC_LINKED 안내를 보냈습니다', 'ok'); A.refreshBadge();
      return true;
    }
    var res2 = await A.reasonDialog('연결 거절', ['다른 사람의 요청으로 판단', '확인 불가', '기타'], '<p class="note-box">거절해도 요청은 비회원 요청으로 그대로 남습니다. 회원에게 자동 안내는 나가지 않습니다.</p>');
    if (!res2) return false;
    var localFn2 = function () {
      l.status = 'rejected'; l.decidedAt = NOW;
      maudit(m, '운영자', 'link_reject', '연결 거절 ' + l.ref.id, reasonText(res2));
    };
    var okR = await A.persist('admin_link_decide', { p_id: id, p_decision: 'reject', p_reason: reasonText(res2) }, localFn2);
    if (!okR) return false;
    A.toast(l.ref.id + ' 연결 요청을 거절했습니다', 'ok'); A.refreshBadge();
    return true;
  };

  /* ---------- 이력 ---------- */
  A.log = function (r, actor, from, to, memo) {
    S.tick += 1; var t = NOW + S.tick * 60000;
    r.history.push({ t: t, actor: actor, from: from, to: to, memo: memo || '' });
    return t;
  };

  /* ---------- 가드 ---------- */
  A.guard = function (r, action) {
    if (action === 'open' && !r.anonReviewed) return '익명화 검토 완료 표시가 필요합니다';
    if (action === 'bidding' && r.state === 'open') {
      var miss = [];
      if (!r.deadline) miss.push('마감일시를 설정');
      if (A.curInv(r).length < 1) miss.push('호텔을 1곳 이상 초대');
      if (miss.length) return '비딩중으로 넘기려면 ' + miss.join('하고 ') + '해야 합니다';
    }
    if (action === 'delivered') {
      if (A.submittedCount(r) < 1) return '제출된 견적이 없어 전달할 수 없습니다';
      if (A.usdMissing(r) > 0) return '통화가 둘 이상입니다. 모든 견적에 USD 참고(트윈)와 기준일을 입력해 주세요 (' + A.usdMissing(r) + '건 미입력)';
    }
    if (action === 'lost' && r.state === 'collecting') {
      if (A.submittedCount(r) > 0 || r.round < 2) return "견적 없이 두 번째 라운드까지 간 경우에만 미성사로 닫습니다. 먼저 '조건 변경 → 새 라운드'로 다른 호텔을 초대하세요.";
    }
    if (action === 'won') {
      var n = A.curInv(r).filter(function (i) { return i.sel === 'selected'; }).length;
      if (n !== 1) return '선정 호텔을 정확히 1곳 표시해 주세요';
    }
    return null;
  };

  var REJECT = ['국내 행사(정책 2)', '일정 미확정', '필수 정보 부족', '기타'];
  var LOST = ['선택하지 않음', '유효기한 경과(회신 없음)', '두 차례 요청에도 제안 없음'];
  var CANCEL = ['오거나이저 요청', '기타'];

  function target(action) { return action === 'rebid' ? 'bidding' : action; }
  function mail(r, template, to, at, cc) {
    S.sendLog.push({ id: 'l' + (S.sendLog.length + 1) + '-' + r.id + '-' + template.split(' ')[0], to: to, cc: cc || '', template: template, at: at, rfpId: r.id, status: 'sent' });
  }
  function apply(r, action, memo) {
    var from = r.state, to = target(action);
    var t0 = A.log(r, '운영자', from, to, memo);
    if (action === 'verifying') r.verifyingAt = t0;
    r.state = to;
    if (action === 'rebid') { r.round += 1; r.deadline = null; }
    if (action === 'won') {
      /* 선택 휴대전화 인증 기록이 없으면(운영자가 이메일 선택을 확인하고 대신 닫는 경우) 그 사실을 남긴다 */
      if (!r.pickOtp) r.pickOtp = { at: null, phone: '', operator: true };
      A.curInv(r).forEach(function (i) { if (i.sel !== 'selected') i.sel = 'notselected'; });
      /* 선정 연결 메일은 성사 전이 시각에 자동 발송된다 */
      var si = A.curInv(r).filter(function (i) { return i.sel === 'selected'; })[0];
      if (si) mail(r, 'HTL_SELECTED_CONNECT 선정 연결 메일', si.email, t0, r.organizer.email);
      /* 미선정 안내(제출한 나머지 호텔)와 성사 알림톡은 같은 시각에 나간다 */
      A.curInv(r).filter(function (i) { return i.status === 'submitted' && i.sel !== 'selected'; }).forEach(function (i) { mail(r, 'HTL_NOT_SELECTED 미선정 안내', i.email, t0); });
      mail(r, 'ORG_WON 성사 안내 (알림톡)', r.organizer.email, t0);
    }
    var OT = { rejected: 'ORG_REJECTED 반려 안내', delivered: 'ORG_DELIVERED 견적 도착', lost: 'ORG_LOST 미성사 안내', cancelled: 'ORG_CANCELLED 취소 확인' };
    if (OT[action]) mail(r, OT[action] + (action === 'delivered' ? '' : ' (알림톡)'), r.organizer.email, t0);
    if (to === 'bidding') mail(r, (action === 'rebid' || r.round >= 2) ? 'ORG_REBID 재요청 안내 (알림톡)' : 'ORG_BIDDING 호텔 요청 안내 (알림톡)', r.organizer.email, t0);
    save();
  }

  A.request = async function (id, action) {
    var r = A.get(id); if (!r) return false;
    if (A.allowed(r).indexOf(action) < 0) return false;
    var g = A.guard(r, action);
    if (g) { A.toast(g, 'error'); return false; }
    var memo = '', reasonVal = null, noteVal = null;
    if (action === 'rejected' || action === 'lost' || action === 'cancelled') {
      var opts = action === 'rejected' ? REJECT : action === 'lost' ? LOST : CANCEL;
      var title = action === 'rejected' ? '반려 사유' : action === 'lost' ? '미성사 사유' : '취소 사유';
      var extra = (action === 'cancelled' && r.state === 'bidding') ? '<p class="note-box">초대 호텔에는 자동 알림이 가지 않습니다. 이메일로 직접 알려 주세요(OPS_HTL_CANCELLED). 오거나이저에게는 ORG_CANCELLED 알림이 자동으로 나갑니다.</p>' : '';
      var pre = (action === 'lost' && r.state === 'collecting') ? '두 차례 요청에도 제안 없음' : '';
      var res = await A.reasonDialog(title, opts, extra, pre);
      if (!res) return false;
      memo = res.reason + (res.note ? ' · ' + res.note : '');
      reasonVal = res.reason; noteVal = res.note;
    } else if (action === 'bidding' && r.state === 'open') {
      if (A.curInv(r).length < 2) {
        var ok = await A.confirm('초대한 호텔이 2곳 미만입니다. 오거나이저에게 미리 알리셨나요?', '알렸습니다, 넘깁니다');
        if (!ok) return false;
      }
      memo = '초대 ' + A.curInv(r).length + '곳 · 마감 ' + fmtDT(r.deadline);
    } else if (action === 'rebid') {
      var note = await A.textDialog('조건 변경 → 새 라운드', '변경한 내용', '예: 인원 120명 → 160명. 요청 내용을 먼저 고친 뒤 눌러 주세요. 이전 라운드 견적은 이력으로 남습니다.');
      if (note === null) return false;
      memo = '새 라운드 ' + (r.round + 1) + (note ? ' · ' + note : '');
    } else if (action === 'won') {
      var sel = A.curInv(r).filter(function (i) { return i.sel === 'selected'; })[0];
      var ok2 = await A.confirm(sel.hotel + '을(를) 선정 호텔로 확정합니다. 나머지 호텔은 미선정 처리됩니다. 이 시점에 선정 호텔에 연결 메일(HTL_SELECTED_CONNECT, 오거나이저 참조), 제출한 나머지 호텔에 미선정 안내(HTL_NOT_SELECTED), 오거나이저에게 성사 알림톡(ORG_WON)이 자동으로 나갑니다.', '성사로 닫기');
      if (!ok2) return false;
      memo = sel.hotel + ' 선정 · 연결 메일 자동 발송(오거나이저 참조) · 미선정 안내·성사 알림 자동 발송';
    }
    var okP = await A.persist('admin_transition', { p_ref: id, p_action: action, p_reason: reasonVal, p_note: noteVal, p_memo: memo }, function () { apply(r, action, memo); });
    if (!okP) return false;
    var r2 = A.get(id) || r;
    A.toast(STATES[target(action)] + '(으)로 바꿨습니다' + (action === 'rebid' ? ' · 라운드 ' + r2.round : '') + (action === 'won' ? ' · 연결 메일·결과 안내를 자동으로 보냈습니다' : ''), 'ok');
    return true;
  };

  /* ---------- 초대 ---------- 이제 두 함수 모두 Promise<boolean> 을 돌려준다 (A.persist 경유). */
  A.invite = function (r, hotelIds) {
    var localFn = function () {
      var n = r.invitations.length;
      hotelIds.forEach(function (hid) {
        var p = A.partner(hid); n += 1;
        r.invitations.push({ id: 'i' + n, hotelId: hid, hotel: p.name, email: p.email, status: 'invited', round: r.round, viewedAt: null, submittedAt: null, sel: null, note: '', deadline: r.deadline });
      });
      A.log(r, '운영자', null, null, '호텔 ' + hotelIds.length + '곳 초대 (' + hotelIds.map(function (h) { return A.partner(h).name; }).join(', ') + ')');
    };
    return A.persist('admin_invite', { p_ref: r.id, p_partner_codes: hotelIds }, localFn);
  };

  /* 재초대: 새 마감으로 새 초대 행을 만들고 이전 행은 재초대됨으로 이력에 남긴다 */
  A.reinvite = function (r, invId) {
    var old = r.invitations.filter(function (i) { return i.id === invId; })[0];
    if (!old || !r.deadline) return Promise.resolve(false);
    var localFn = function () {
      var n = r.invitations.length + 1;
      old.status = 'reinvited';
      r.invitations.push({ id: 'i' + n, hotelId: old.hotelId, hotel: old.hotel, email: old.email, status: 'invited', round: r.round, viewedAt: null, submittedAt: null, sel: null, note: '', deadline: r.deadline });
      A.log(r, '운영자', null, null, '재초대 · ' + old.hotel + ' · 새 마감 ' + fmtDT(r.deadline) + ' (이전 초대 마감 ' + fmtDT(old.deadline) + ')');
    };
    return A.persist('admin_reinvite', { p_ref: r.id, p_invitation_id: invId }, localFn);
  };

  /* ---------- UI: 토스트 / 다이얼로그 ---------- */
  A.toast = function (msg, kind) {
    var box = document.getElementById('toasts'); if (!box) return;
    var t = document.createElement('div'); t.className = 'toast ' + (kind || 'info'); t.textContent = msg;
    box.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 6000);
  };
  function dialog(o) {
    return new Promise(function (resolve) {
      var dlg = document.createElement('dialog'); dlg.className = 'dlg'; dlg.setAttribute('aria-labelledby', 'dlgT');
      dlg.innerHTML = '<form class="dlg-in" novalidate><h2 id="dlgT">' + esc(o.title) + '</h2><div class="dlg-body">' + o.body + '</div><p class="dlg-err" role="alert"></p>' +
        '<div class="dlg-act"><button type="button" class="btn ghost" data-x="cancel">취소</button><button type="submit" class="btn primary" data-x="ok">' + esc(o.ok || '확인') + '</button></div></form>';
      document.body.appendChild(dlg);
      var done = false;
      function close(v) { if (done) return; done = true; try { dlg.close(); } catch (e) { } dlg.remove(); resolve(v); }
      dlg.querySelector('[data-x=cancel]').addEventListener('click', function () { close(null); });
      dlg.addEventListener('cancel', function () { close(null); });
      dlg.querySelector('form').addEventListener('submit', function (e) {
        e.preventDefault();
        var v = o.collect ? o.collect(dlg) : true;
        if (typeof v === 'string') { dlg.querySelector('.dlg-err').textContent = v; return; }
        close(v);
      });
      dlg.showModal();
      var f = dlg.querySelector('select,textarea,input'); if (f) f.focus(); else dlg.querySelector('[data-x=ok]').focus();
    });
  }
  A.dialog = dialog;
  A.confirm = function (msg, ok) {
    return dialog({ title: '확인', body: '<p>' + esc(msg) + '</p>', ok: ok || '확인', collect: function () { return true; } }).then(function (v) { return v === true; });
  };
  A.reasonDialog = function (title, reasons, extraHtml, preselect) {
    var opts = '<option value="">사유를 선택하세요</option>' + reasons.map(function (x) { return '<option' + (x === preselect ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('');
    return dialog({
      title: title, ok: '저장하고 진행',
      body: (extraHtml || '') + '<label class="lbl" for="dlgReason">사유</label><select id="dlgReason" class="inp">' + opts + '</select><label class="lbl" for="dlgNote">메모 (선택, 기타는 필수)</label><textarea id="dlgNote" class="inp" rows="3"></textarea>',
      collect: function (d) {
        var reason = d.querySelector('#dlgReason').value, note = d.querySelector('#dlgNote').value.trim();
        if (!reason) return '사유를 선택해 주세요';
        if (reason === '기타' && !note) return '기타를 고른 경우 메모를 적어 주세요';
        return { reason: reason, note: note };
      }
    });
  };
  A.textDialog = function (title, label, help) {
    return dialog({ title: title, ok: '새 라운드 열기', body: '<p class="muted">' + esc(help) + '</p><label class="lbl" for="dlgTxt">' + esc(label) + '</label><textarea id="dlgTxt" class="inp" rows="3"></textarea>',
      collect: function (d) { return { v: d.querySelector('#dlgTxt').value.trim() }; } }).then(function (v) { return v ? v.v : null; });
  };

  A.memoDialog = function (title, label, help, ok, required) {
    return dialog({ title: title, ok: ok, body: '<p class="muted">' + esc(help) + '</p><label class="lbl" for="dlgTxt">' + esc(label) + '</label><textarea id="dlgTxt" class="inp" rows="3"></textarea>',
      collect: function (d) { var v = d.querySelector('#dlgTxt').value.trim(); if (required && !v) return label + '을(를) 적어 주세요'; return { v: v }; } }).then(function (v) { return v ? v.v : null; });
  };

  /* ---------- 렌더 헬퍼 ---------- */
  A.chip = function (state) { return '<span class="chip st-' + state + '">' + esc(STATES[state]) + '</span>'; };
  A.invChip = function (s) { return '<span class="chip iv-' + s + '">' + esc(A.INV[s]) + '</span>'; };
  A.icon = {
    dash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6v-9h-6v9zm0-16v5h6V4h-6z" fill="currentColor"/></svg>',
    rfp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h14a1 1 0 011 1v16a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1zm2 4v2h10V7H7zm0 4v2h10v-2H7zm0 4v2h6v-2H7z" fill="currentColor"/></svg>',
    hotel: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21V5a1 1 0 011-1h9a1 1 0 011 1v6h4a1 1 0 011 1v9h-5v-4h-2v4H4zm3-14v2h2V7H7zm0 4v2h2v-2H7zm4-4v2h2V7h-2zm0 4v2h2v-2h-2z" fill="currentColor"/></svg>',
    user: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4.5 4.5 0 100-9 4.5 4.5 0 000 9zm0 2c-4.1 0-8 2-8 5v2h16v-2c0-3-3.9-5-8-5z" fill="currentColor"/></svg>',
    money: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18v12H3V6zm9 2.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM5 8h2v2H5V8zm12 6h2v2h-2v-2z" fill="currentColor"/></svg>',
    org: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l9 5-9 5-9-5 9-5zm-7 9.5l7 3.9 7-3.9V16l-7 4-7-4v-3.5z" fill="currentColor"/></svg>',
    set: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8a4 4 0 100 8 4 4 0 000-8zm8.5 5.5l1.6 1.2-2 3.4-1.9-.7a7 7 0 01-1.6.9L16.3 20h-4l-.3-1.7a7 7 0 01-1.6-.9l-1.9.7-2-3.4 1.6-1.2a7 7 0 010-1.8L6.5 10.5l2-3.4 1.9.7a7 7 0 011.6-.9L12.3 5h4l.3 1.9a7 7 0 011.6.9l1.9-.7 2 3.4-1.6 1.2a7 7 0 010 1.8z" fill="currentColor" transform="translate(-2 0)"/></svg>',
    msg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16a1 1 0 011 1v12a1 1 0 01-1 1H8l-4.6 3.45A.5.5 0 013 21.05V5a1 1 0 011-1zm2.2 4.2v2h11.6v-2H6.2zm0 4.3v2h7.6v-2H6.2z" fill="currentColor"/></svg>'
  };
  var LOGO = '<svg class="brand-mark" viewBox="0 0 32 32" role="img" aria-hidden="true"><rect width="32" height="32" rx="9" fill="#0F1E3D"/><rect x="6.5" y="9" width="14" height="2.6" rx="1.3" fill="#FFFFFF"/><rect x="6.5" y="14.7" width="11" height="2.6" rx="1.3" fill="#16B5A8"/><rect x="6.5" y="20.4" width="8" height="2.6" rx="1.3" fill="#FFC24B"/><circle cx="24.5" cy="16" r="2.6" fill="#FFFFFF"/></svg>';
  A.LOGO = LOGO;

  A.session = function () {
    if (MGA.mode === 'api') return true; /* MGA.boot() 안에서 세션·권한을 확인하고 필요하면 index.html 로 되돌린다 */
    try { return sessionStorage.getItem(ROLE) === 'operator'; } catch (e) { return true; }
  };
  A.login = function () { try { sessionStorage.setItem(ROLE, 'operator'); } catch (e) { } };
  A.logout = function () { MGA.logout(); };

  /* 역할별 메뉴 (지역파트너 콘솔 설계서 §9). roles 가 없으면 전 역할 */
  var NAV_ALL = [
    ['dashboard', '대시보드', 'dashboard.html', 'dash'], ['rfps', '견적 관리', 'rfps.html', 'rfp'], ['partners', '호텔 파트너', 'partners.html', 'hotel'],
    ['settlements', '정산', 'settlements.html', 'money'],
    ['members', '회원', 'members.html', 'user', ['operator']], ['partner-orgs', '지역 파트너', 'partner-orgs.html', 'org', ['operator']],
    ['my-org', '내 조직', 'my-org.html', 'org', ['partner_admin', 'partner_member']],
    ['feedback', '피드백', 'feedback.html', 'msg', ['operator']], ['settings', '설정', 'settings.html', 'set', ['operator']]
  ];
  A.NAV_ALL = NAV_ALL;
  A.me = null;
  A.isOperator = function () { return !A.me || A.me.role === 'operator'; };
  A.isPartner = function () { return !!A.me && (A.me.role === 'partner_admin' || A.me.role === 'partner_member'); };
  A.isPartnerAdmin = function () { return !!A.me && A.me.role === 'partner_admin'; };
  function navFor(role) { return NAV_ALL.filter(function (n) { return !n[4] || n[4].indexOf(role) >= 0; }); }
  var NAV = navFor('operator');
  /* 피드백 배지: 상태가 new 이고 DEMO 가 아닌 건수 (SPEC_FEEDBACK_ADDENDUM.md §B) */
  A.feedbackNewCount = function () { return (S.feedback || []).filter(function (f) { return f.status === 'new' && !f.is_demo; }).length; };

  /* 페이지 진입: 가드 → 셸 렌더 → cb(mainEl). api 모드에서는 MGA.boot() 가 세션·권한 가드와
   * index.html 리다이렉트를 직접 처리하므로 여기서는 A.session() 을 건너뛴다. */
  A.boot = function (active, title, cb) {
    if (MGA.mode !== 'api' && !A.session()) { location.replace('index.html'); return; }
    load(function () {
      NOW = A.NOW = MGA.now();
      A.me = S.me || (window.MOCK_DATA && window.MOCK_DATA.me) || null;
      if (window.MICEGO_PTR && MICEGO_PTR.enrich) MICEGO_PTR.enrich(S);
      var role = A.me ? A.me.role : 'operator';
      NAV = navFor(role);
      var delayed = A.isOperator() ? A.partnerDelayed().length : 0, linkN = A.isOperator() ? A.linkPending().length : 0, fbNew = A.isOperator() ? A.feedbackNewCount() : 0;
      var intN = (S.interventions || []).length, stN = (S.settlements || []).filter(function (x) { return A.isOperator() ? (x.status === 'commission_submitted' || x.status === 'remitted' || x.status === 'disputed') : (x.status === 'pending_commission' || x.status === 'commission_confirmed' || x.status === 'collected'); }).length;
      var nav = NAV.map(function (n) {
        return '<a href="' + n[2] + '" class="nav-a' + (n[0] === active ? ' on' : '') + '"' + (n[0] === active ? ' aria-current="page"' : '') + '>' + A.icon[n[3]] + '<span>' + n[1] + '</span>' +
          (n[0] === 'partners' && delayed ? '<em class="nav-badge" aria-label="심사 지연 ' + delayed + '건">' + delayed + '</em>' : '') +
          (n[0] === 'members' && linkN ? '<em class="nav-badge" aria-label="연결 요청 대기 ' + linkN + '건">' + linkN + '</em>' : '') +
          (n[0] === 'feedback' && fbNew ? '<em class="nav-badge" aria-label="새 접수 ' + fbNew + '건">' + fbNew + '</em>' : '') +
          (n[0] === 'dashboard' && intN && A.isOperator() ? '<em class="nav-badge" aria-label="개입 필요 ' + intN + '건">' + intN + '</em>' : '') +
          (n[0] === 'settlements' && stN ? '<em class="nav-badge" aria-label="정산 처리 필요 ' + stN + '건">' + stN + '</em>' : '') + '</a>';
      }).join('');
      var app = document.getElementById('app');
      app.innerHTML =
        (MGA.mode === 'api' ? '' : '<div class="ribbon" role="note"><span>DEMO · 예시 데이터 · 새로고침하면 처음 상태로 돌아갑니다</span> <a href="#" id="resetLink">예시 데이터 초기화</a></div>') +
        '<div class="shell"><aside class="side"><a class="brand" href="dashboard.html" aria-label="MICEGO 운영 콘솔">' + LOGO + '<span class="brand-word">MICE<span class="go">GO</span></span></a><div class="side-sub">' + (A.isPartner() ? esc(A.me.partnerName || '') + ' · 파트너 콘솔' : '운영 콘솔') + '</div><nav aria-label="주 메뉴">' + nav + '</nav></aside>' +
        '<div class="col"><header class="topbar"><details class="mnav"><summary aria-label="메뉴 열기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" fill="currentColor"/></svg><span>메뉴</span></summary><nav aria-label="모바일 메뉴">' + nav + '</nav></details>' +
        '<a class="brand brand-m" href="dashboard.html" aria-label="MICEGO 운영 콘솔">' + LOGO + '<span class="brand-word">MICE<span class="go">GO</span></span></a>' +
        '<div class="who"><span class="who-t">' + esc(A.me ? ((A.me.role === 'operator' ? '운영자' : (A.me.partnerName || '파트너') + ' · ' + (A.me.role === 'partner_admin' ? '관리자' : '담당자')) + ' · ' + (A.me.email || '')) : '운영자 · ops@matchgo.ai') + '</span><button type="button" class="btn ghost sm" id="logoutBtn">로그아웃</button></div></header>' +
        '<main id="main" class="main" tabindex="-1"></main></div></div><div id="toasts" class="toasts" role="status" aria-live="polite"></div>';
      document.title = title + ' | MICEGO 운영 콘솔';
      if (MGA.mode !== 'api') document.getElementById('resetLink').addEventListener('click', function (e) { e.preventDefault(); A.reset(); });
      document.getElementById('logoutBtn').addEventListener('click', A.logout);
      cb(document.getElementById('main'));
    });
  };

  /* 필터: 대시보드 링크와 목록 공용 */
  A.FILTERS = {
    'sla-red': { label: 'SLA·초대 기한 초과', fn: function (r) { var s = A.sla(r); return s && s.level === 'red'; } },
    'sla-amber': { label: 'SLA·초대 기한 임박(1영업일 이내)', fn: function (r) { var s = A.sla(r); return s && s.level === 'amber'; } },
    'new': { label: '새 접수 · 오늘 검증중으로', fn: function (r) { return A.unchecked(r); } },
    'zero24': { label: '마감 24시간 이내 · 제출 0건', fn: function (r) { return A.followup(r); } },
    'collecting': { label: '취합중 검토', fn: function (r) { return r.state === 'collecting'; } }
  };
  A.todo = function () {
    var rf = S.rfps, c = function (k) { return rf.filter(A.FILTERS[k].fn).length; };
    return [
      { key: 'sla-red', title: 'SLA·초대 기한 초과', n: c('sla-red'), act: '오늘 안에 오거나이저에게 진행 상황을 회신하세요.', href: 'rfps.html?filter=sla-red' },
      { key: 'sla-amber', title: 'SLA·초대 기한 임박 (1영업일 이내)', n: c('sla-amber'), act: '검증중(SLA)이면 오늘 오픈까지, 오픈(초대 기한)이면 오늘 초대까지 끝내세요.', href: 'rfps.html?filter=sla-amber' },
      { key: 'new', title: '새 접수', n: c('new'), act: '받은 당일 검증중으로 넘기세요. SLA 기산점입니다.', href: 'rfps.html?filter=new' },
      { key: 'zero24', title: '마감 24시간 이내 · 제출 0건', n: c('zero24'), act: '미응답 호텔에 전화나 개인 메일로 팔로업하세요.', href: 'rfps.html?filter=zero24' },
      { key: 'collecting', title: '취합중 검토', n: c('collecting'), act: '비교표를 확인하고 당일 전달하세요. 통화가 섞였으면 USD 참고환산부터.', href: 'rfps.html?filter=collecting' },
      { key: 'partner', title: '파트너 심사 지연', n: A.partnerDelayed().length, act: '5영업일이 지난 신청을 오늘 심사하세요.', href: 'partners.html?filter=delayed' },
      { key: 'failed', title: '발송 실패', n: A.failedCount(), act: '수신 주소를 확인하고 직접 메일로 대신 보내세요.', href: 'dashboard.html#failures' }
    ];
  };
})();
