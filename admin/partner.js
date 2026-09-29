/* admin/partner.js — 지역 운영 파트너 콘솔 공통 모듈 (지역파트너 콘솔 기술설계서 v1 §9). Plain ES5.  - 클로드
 * 모든 admin/*.html 에서 admin.js 다음에 로드한다. mock 모드에서는 MOCK_DATA 를 파트너 필드로 보강(enrich)하고
 * 새 RPC(rfp_assign, partner_quote_proxy_enter, settlement_action …)를 로컬로 재생한다. api 모드에서는 A.persist 가 RPC 를 부른다. */
window.MICEGO_PTR = (function () {
  'use strict';
  var A = window.MICEGO, esc = A.esc;
  var P = {};

  /* ---------- 지역 표 (서버 region 테이블의 축약본 — 표시·mock 매핑용) ---------- */
  P.REGIONS = [
    ['TH', '태국'], ['TH-BKK', '방콕'], ['TH-UTP', '파타야'], ['TH-HKT', '푸껫'], ['TH-KBV', '끄라비'], ['TH-USM', '코사무이'], ['TH-CNX', '치앙마이'],
    ['VN', '베트남'], ['VN-DAD', '다낭'], ['VN-CXR', '나트랑·깜라인'], ['VN-PQC', '푸꾸옥'], ['VN-SGN', '호찌민'], ['VN-HAN', '하노이'],
    ['ID', '인도네시아'], ['ID-DPS', '발리'], ['MY', '말레이시아'], ['MY-BKI', '코타키나발루'], ['MY-KUL', '쿠알라룸푸르'], ['PH', '필리핀'], ['PH-CEB', '세부'],
    ['SG', '싱가포르'], ['JP', '일본'], ['TW', '대만'], ['HK', '홍콩'], ['MO', '마카오'], ['GU', '괌'], ['MP', '사이판'], ['US', '미국'], ['US-HI', '하와이']
  ];
  var ALIAS = { '태국': 'TH', '방콕': 'TH-BKK', '파타야': 'TH-UTP', '푸켓': 'TH-HKT', '푸껫': 'TH-HKT', '끄라비': 'TH-KBV', '사무이': 'TH-USM', '코사무이': 'TH-USM', '치앙마이': 'TH-CNX',
    '베트남': 'VN', '다낭': 'VN-DAD', '나트랑': 'VN-CXR', '깜라인': 'VN-CXR', '푸꾸옥': 'VN-PQC', '호치민': 'VN-SGN', '호찌민': 'VN-SGN', '하노이': 'VN-HAN',
    '인도네시아': 'ID', '발리': 'ID-DPS', '누사두아': 'ID-DPS', '말레이시아': 'MY', '코타키나발루': 'MY-BKI', '쿠알라룸푸르': 'MY-KUL', '필리핀': 'PH', '세부': 'PH-CEB',
    '싱가포르': 'SG', '일본': 'JP', '대만': 'TW', '홍콩': 'HK', '마카오': 'MO', '괌': 'GU', '사이판': 'MP', '하와이': 'US-HI' };
  P.regionName = function (code) { for (var i = 0; i < P.REGIONS.length; i++) if (P.REGIONS[i][0] === code) return P.REGIONS[i][1]; return code || '—'; };
  P.regionLabel = function (code) { return code ? '<span class="chip">' + esc(code) + ' ' + esc(P.regionName(code)) + '</span>' : '<span class="chip">지역 미정</span>'; };
  P.resolveRegion = function (text) {
    var t = String(text || ''), best = null;
    Object.keys(ALIAS).forEach(function (k) { if (t.indexOf(k) >= 0) { var c = ALIAS[k]; if (!best || c.length > best.length) best = c; } });
    return best;
  };
  P.covers = function (pc, rc) { return !!pc && !!rc && (pc === rc || (pc.length === 2 && rc.slice(0, 2) === pc)); };
  P.DELEG = { delegated: '파트너 위임', hq_held: '본사 보유', taken_over: '본사 인계' };
  P.delegChip = function (r) {
    var d = r.delegation || 'hq_held';
    var cls = d === 'delegated' ? 'teal' : d === 'taken_over' ? 'red' : '';
    return '<span class="badge ' + cls + '">' + P.DELEG[d] + (r.partner ? ' · ' + esc(r.partner.name) : '') + '</span>';
  };
  P.HOLD = { pending: '배정 대기', region_unmapped: '지역 미매핑', multi_region: '복수 국가', no_partner: '파트너 없음', partner_ineligible: '파트너 배정 불가', partner_declined: '파트너 반려', auto_assign_off: '자동 배정 꺼짐', manual: '수동 보류', legacy: '기존 건' };
  P.ST = { pending_commission: '커미션 입력 대기', commission_submitted: '커미션 승인 대기', commission_confirmed: '커미션 확정', collected: '수금 완료', remitted: '송금 완료', completed: '완료', disputed: '분쟁', voided: '무효' };
  P.stChip = function (s) { var cls = s === 'completed' ? 'teal' : s === 'disputed' ? 'red' : s === 'voided' ? '' : 'amber'; return '<span class="badge ' + cls + '">' + (P.ST[s] || s) + '</span>'; };
  P.INT = { unassigned_stale: '미배정 방치', partner_idle: '파트너 미착수', sla_breach: 'SLA 초과', partner_inactive: '파트너 조직 정지', proxy_disputed: '호텔 이의(대리 입력)', organizer_voc: '오거나이저 VOC', settlement_overdue: '정산 기한 초과', hotel_unreviewed_won: '미검토 호텔 선정' };
  P.fmtMoney = function (n, ccy) { if (n == null || n === '') return '—'; var d = (ccy === 'KRW' || ccy === 'VND' || ccy === 'JPY' || ccy === 'IDR') ? 0 : 2; return (ccy ? ccy + ' ' : '') + Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); };
  P.org = function (code) { return (A.data().partnerOrgs || []).filter(function (o) { return o.code === code; })[0] || null; };

  /* ---------- mock 보강: 기존 목업 데이터에 지역·위임·파트너 조직·정산을 붙인다 (api 모드에서는 서버가 준다) ---------- */
  P.DEMO_ME = { userId: 'u-pa1', role: 'partner_admin', status: 'active', displayName: '김태국', email: 'pa1@tmthai.example', cv: 1, partnerId: 'po-th', partnerCode: 'TMTHAI', partnerName: '티엠타이(Tmthai)', partnerStatus: 'active', partnerCountry: 'TH', partnerTz: 'Asia/Bangkok', regions: ['TH'], sharePct: 70 };
  P.enrich = function (S) {
    if (window.MGA && MGA.mode === 'api') return;
    if (S._ptrEnriched) return; S._ptrEnriched = true;
    S.partnerOrgs = S.partnerOrgs || [
      { id: 'po-th', code: 'TMTHAI', legalName: 'Tmthai Co., Ltd.', displayName: '티엠타이(Tmthai)', publicName: 'MICEGO Thailand · Tmthai', countryCode: 'TH', status: 'active', sharePct: 70, settlementCurrency: 'USD', acceptingNew: true, maxActiveRfps: null, maxAccounts: 10,
        contactName: '김태국', contactEmail: 'ops@tmthai.example', contactPhone: '+66 2 000 0000', timezone: 'Asia/Bangkok', contractRef: 'RP-2026-001', contractStart: '2026-10-01', contractEnd: '2027-09-30', dpaSignedAt: '2026-09-28T02:00:00Z', createdAt: '2026-09-25T01:00:00Z',
        regions: [{ code: 'TH', primary: true, priority: 100, active: true }],
        users: [{ userId: 'u-pa1', role: 'partner_admin', status: 'active', email: 'pa1@tmthai.example', displayName: '김태국', invitedAt: '2026-09-28T02:00:00Z', acceptedAt: '2026-09-28T03:00:00Z', lastSeenAt: '2026-10-08T09:00:00Z' },
                { userId: 'u-pm1', role: 'partner_member', status: 'active', email: 'pm1@tmthai.example', displayName: '박담당', invitedAt: '2026-09-29T02:00:00Z', acceptedAt: '2026-09-29T05:00:00Z', lastSeenAt: '2026-10-07T12:00:00Z' },
                { userId: 'u-pm2', role: 'partner_member', status: 'invited', email: 'new@tmthai.example', displayName: '신규 담당', invitedAt: '2026-10-07T01:00:00Z', acceptedAt: null, lastSeenAt: null }], activeRfps: 0 },
      { id: 'po-vn', code: 'VNDMC', legalName: 'Viet Nam DMC JSC', displayName: '베트남DMC', publicName: 'MICEGO Vietnam', countryCode: 'VN', status: 'onboarding', sharePct: 70, settlementCurrency: 'USD', acceptingNew: true, maxActiveRfps: 20, maxAccounts: 10,
        contactName: 'Nguyen', contactEmail: 'ops@vndmc.example', contactPhone: '', timezone: 'Asia/Ho_Chi_Minh', contractRef: '', contractStart: null, contractEnd: null, dpaSignedAt: null, createdAt: '2026-10-01T01:00:00Z', regions: [{ code: 'VN-DAD', primary: true, priority: 100, active: true }], users: [], activeRfps: 0 }
    ];
    S.rfps.forEach(function (r, idx) {
      if (r.regionCode !== undefined) return;
      r.regionCode = P.resolveRegion(r.destination); r.regionSource = 'auto'; r.rowVersion = 1; r.assignments = r.assignments || []; r.identityViews = r.identityViews || 0;
      var th = r.regionCode && r.regionCode.slice(0, 2) === 'TH';
      if (th && A.TERMINAL.indexOf(r.state) < 0) { r.delegation = 'delegated'; r.partner = { code: 'TMTHAI', name: '티엠타이(Tmthai)', status: 'active' }; r.delegatedAt = r.createdAt; r.holdReason = null; r.assignments.push({ t: r.createdAt, action: 'auto_assign', to: 'TMTHAI', reason: null, payload: { confidence: 'high' } }); }
      else { r.delegation = 'hq_held'; r.partner = null; r.holdReason = r.regionCode ? 'no_partner' : 'region_unmapped'; }
      r.invitations.forEach(function (i) { if (i.proxyQuoteId === undefined) { i.proxyQuoteId = null; i.confirmSentAt = null; i.disputedAt = null; } });
      r.quotes.forEach(function (q) { if (q.enteredBy === undefined) { q.enteredBy = 'hotel'; q.confirmedAt = null; q.comparable = true; } });
    });
    // 첫 태국 위임 건 하나에 대리 입력 예시
    var demo = null, i0 = null;
    S.rfps.forEach(function (r) { if (demo || r.delegation !== 'delegated' || r.state !== 'bidding') return; var c = A.curInv(r).filter(function (i) { return i.status === 'invited' || i.status === 'viewed'; })[0]; if (c) { demo = r; i0 = c; } });
    if (demo) { if (true) { i0.status = 'proxy_entered'; i0.confirmSentAt = A.NOW - 3 * 3600e3; i0.confirmExpiresAt = A.NOW + 69 * 3600e3; var q = { id: 'q-proxy-' + i0.id, invId: i0.id, round: demo.round, label: null, currency: 'THB', twin: 4500, king: 5200, tax: '포함', breakfast: '포함', validUntil: '2027-01-31', cancel: '30일 전 무료 취소', usdRef: null, usdDate: null, enteredBy: 'partner', proxyEnteredAt: A.NOW - 3 * 3600e3, confirmedAt: null, comparable: false, evidenceNote: 'LINE으로 세일즈 매니저 확인 10/08' }; i0.proxyQuoteId = q.id; demo.quotes.push(q); } }
    S.partners.forEach(function (p) { if (p.regionCode !== undefined) return; p.regionCode = P.resolveRegion(p.dest); p.sourcedBy = null; p.approvedVia = p.status === 'approved' ? 'hq' : null; p.hqReviewedAt = p.status === 'approved' ? p.appliedAt : null; p.riskFlags = []; });
    S.interventions = S.interventions || [];
    if (!S.interventions.length) {
      var idle = S.rfps.filter(function (r) { return r.delegation === 'delegated' && r.state === 'received'; })[0];
      if (idle) S.interventions.push({ id: 1, rfpId: idle.id, partner: 'TMTHAI', kind: 'partner_idle', severity: 2, detail: {}, openedAt: A.NOW - 5 * 3600e3 });
      var held = S.rfps.filter(function (r) { return r.delegation === 'hq_held' && r.holdReason === 'no_partner' && A.TERMINAL.indexOf(r.state) < 0; })[0];
      if (held) S.interventions.push({ id: 2, rfpId: held.id, partner: null, kind: 'unassigned_stale', severity: 2, detail: { hold_reason: held.holdReason }, openedAt: A.NOW - 8 * 3600e3 });
    }
    S.settlements = S.settlements || [];
    if (!S.settlements.length) {
      S.rfps.filter(function (r) { return r.state === 'won'; }).forEach(function (r, k) {
        var sel = A.curInv(r).filter(function (i) { return i.sel === 'selected'; })[0] || A.curInv(r)[0]; var q = sel ? r.quotes.filter(function (x) { return x.invId === sel.id; })[0] : null;
        var hpt = sel ? S.partners.filter(function (x) { return x.id === sel.hotelId; })[0] : null, agr = hpt && hpt.commission && hpt.commission.ratePct != null ? hpt.commission.ratePct : null; /* 성사 시점의 합의 요율 스냅샷 */
        var th = (r.regionCode && r.regionCode.slice(0, 2) === 'TH') || k === 0; /* 시연: 첫 성사 건은 태국 파트너 건으로 */
        S.settlements.push({ id: 'st-' + k, ref: 'ST-2610-' + ['K7QD', 'M3PX', 'R9AB'][k % 3], rfpId: r.id, destination: r.destination, eventType: r.eventType, partner: th ? { code: 'TMTHAI', name: '티엠타이(Tmthai)' } : null,
          hotel: sel ? sel.hotel : '—', hotelCode: sel ? sel.hotelId : null, status: k === 0 ? 'commission_submitted' : 'pending_commission', wonAt: r.closedAt || A.NOW - 5 * 86400e3, eventEnd: r.end, collectDue: r.end, remitDue: null,
          agreedRatePct: agr, commissionBasisScope: 'rooms_fnb_net', commissionTermsVersion: agr != null ? 'DEMO' : null,
          hotelCurrency: q ? q.currency : 'USD', contractAmount: k === 0 ? 39500 : null, commissionBasis: k === 0 ? 'rate' : null, commissionRatePct: k === 0 ? 10 : null, commissionAmount: k === 0 ? 3950 : null,
          partnerSharePct: th ? 70 : 0, partnerShareAmount: k === 0 ? 2765 : null, micegoShareAmount: k === 0 ? 1185 : null, remitCurrency: 'USD', fxRate: null, remitExpected: null, flags: agr == null ? ['no_agreed_rate'] : [], attachments: [], rowVersion: 1, createdAt: r.closedAt || A.NOW - 5 * 86400e3,
          events: [{ t: r.closedAt || A.NOW - 5 * 86400e3, action: 'created', from: null, to: 'pending_commission', actor: '시스템', note: null }].concat(k === 0 ? [{ t: A.NOW - 2 * 86400e3, action: 'submit_commission', from: 'pending_commission', to: 'commission_submitted', actor: '김태국', actorRole: 'partner_admin', note: null }] : []) });
      });
    }
    // 파트너 시연 계정 정보 (?as=partner)
    S.demoPartnerMe = S.demoPartnerMe || P.DEMO_ME;
    // 파트너 시연이면 데이터 스코프 축소
    if (S.me && S.me.role !== 'operator') {
      S.rfps = S.rfps.filter(function (r) { return r.partner && r.partner.code === S.me.partnerCode && (r.delegation === 'delegated' || r.delegation === 'taken_over'); });
      S.partners = S.partners.filter(function (p) { return S.me.regions.some(function (rc) { return P.covers(rc, p.regionCode); }) || p.sourcedBy === S.me.partnerCode; });
      S.members = []; S.shareLinks = []; S.linkRequests = []; S.memberAudit = []; S.memberLog = []; S.failures = []; S.feedback = [];
      S.partnerOrgs = S.partnerOrgs.filter(function (o) { return o.code === S.me.partnerCode; });
      S.settlements = S.settlements.filter(function (s) { return s.partner && s.partner.code === S.me.partnerCode; });
      S.interventions = S.interventions.filter(function (a) { return a.partner === S.me.partnerCode && ['partner_idle', 'sla_breach', 'proxy_disputed', 'settlement_overdue'].indexOf(a.kind) >= 0; });
      S.rfps.forEach(function (r) { r.organizer = { company: (r.organizer.company || '').slice(0, 1) + '**', contact: null, email: null, phone: null, budget: r.organizer.budget, masked: true, _full: r.organizer }; r.token = null; r.ownerId = null; });
    }
  };

  /* ---------- 공통 op: mock 이면 로컬 재생, api 면 A.persist ---------- */
  P.op = function (name, args, localFn) { return A.persist(name, args, localFn); };
  P.err = function (e) { A.toast((e && (e.message || e.message_ko)) || '처리하지 못했습니다', 'error'); };

  /* ---------- RFP 상세: 배정·위임 카드 ---------- */
  P.assignCard = function (r) {
    var me = A.me, hq = A.isOperator();
    var lines = '<dl class="kv"><dt>지역</dt><dd>' + P.regionLabel(r.regionCode) + (r.regionSource === 'operator' ? ' <span class="small muted">운영자 지정</span>' : '') + '</dd>' +
      '<dt>위임</dt><dd>' + P.delegChip(r) + (r.delegation === 'hq_held' ? ' <span class="small muted">' + esc(P.HOLD[r.holdReason] || r.holdReason || '') + '</span>' : '') +
      (r.delegation === 'taken_over' ? '<div class="small muted">' + esc(r.takeoverReason || '') + (r.shareOverridePct != null ? ' · 파트너 몫 ' + r.shareOverridePct + '%' : '') + '</div>' : '') + '</dd>' +
      (r.identityViews ? '<dt>신원 열람</dt><dd>' + r.identityViews + '회</dd>' : '') + '</dl>';
    var btns = '';
    if (hq) {
      var orgs = (A.data().partnerOrgs || []).filter(function (o) { return o.status === 'active' && o.regions.some(function (x) { return x.active && P.covers(x.code, r.regionCode); }); });
      if (A.TERMINAL.indexOf(r.state) < 0) {
        btns += '<button type="button" class="btn sm" data-ptr="set-region">지역 변경</button>';
        if (r.delegation !== 'taken_over') btns += '<button type="button" class="btn sm primary" data-ptr="assign"' + (orgs.length ? '' : ' disabled title="이 지역을 맡는 활성 파트너가 없습니다"') + '>' + (r.delegation === 'delegated' ? '재배정' : '파트너 배정') + '</button>';
        if (r.delegation === 'delegated') btns += '<button type="button" class="btn sm" data-ptr="hold">본사 보유로</button><button type="button" class="btn sm danger" data-ptr="takeover">본사 인계</button>';
        if (r.delegation === 'taken_over') btns += '<button type="button" class="btn sm" data-ptr="release">파트너에게 되돌리기</button>';
      }
    } else if (A.isPartnerAdmin() && r.delegation === 'delegated' && (r.state === 'received' || r.state === 'verifying')) {
      btns += '<button type="button" class="btn sm" data-ptr="decline">배정 반려(본사 처리 요청)</button>';
    }
    var hist = (r.assignments || []).slice(-3).map(function (e) { return '<li class="small muted">' + A.fmtDT(typeof e.t === 'number' ? e.t : Date.parse(e.t)) + ' · ' + esc(e.action) + (e.to ? ' → ' + esc(e.to) : '') + (e.reason ? ' · ' + esc(e.reason) : '') + '</li>'; }).join('');
    return '<section class="card" aria-labelledby="h-asg"><h2 id="h-asg">지역 파트너 · 위임</h2>' + lines + (btns ? '<div class="memo-add" style="gap:6px;flex-wrap:wrap">' + btns + '</div>' : '') + (hist ? '<ul style="margin:8px 0 0;padding-left:16px">' + hist + '</ul>' : '') + '</section>';
  };

  /* 파트너용 오거나이저 카드: 마스킹 + 열람 버튼(로그) */
  P.identityCard = function (r) {
    var o = r.organizer, shown = r._identity;
    if (!o || !o.masked) return null;
    if (shown) return '<section class="card" aria-labelledby="h-org"><h2 id="h-org">오거나이저 정보 <span class="badge red">호텔에 보이지 않음</span> <span class="badge amber">열람 기록됨</span></h2><dl class="kv"><dt>회사명</dt><dd>' + esc(shown.company) + '</dd><dt>담당자</dt><dd>' + esc(shown.contact) + '</dd><dt>이메일</dt><dd>' + esc(shown.email) + '</dd><dt>전화</dt><dd>' + esc(shown.phone) + (shown.phoneFull ? '' : ' <button type="button" class="btn sm" data-ptr="reveal-phone">번호 전체 보기</button>') + '</dd><dt>예산</dt><dd>' + esc(shown.budget) + '</dd><dt>원문 메모</dt><dd>' + esc(r.rawMemo) + '</dd></dl></section>';
    return '<section class="card" aria-labelledby="h-org"><h2 id="h-org">오거나이저 정보 <span class="badge red">호텔에 보이지 않음</span></h2><p class="sub">배정된 파트너는 요건 확인·연결을 위해 오거나이저 정보를 볼 수 있습니다. 열람은 기록되며 견적 성사 목적 외 사용은 계약으로 금지됩니다.</p><dl class="kv"><dt>회사명</dt><dd>' + esc(o.company || '—') + '</dd><dt>예산</dt><dd>' + esc(o.budget) + '</dd></dl><div class="memo-add"><button type="button" class="btn primary" data-ptr="reveal">오거나이저 정보 보기</button></div></section>';
  };

  /* 초대 행에 붙는 대리 입력 버튼/상태 */
  P.proxyCell = function (r, i) {
    var out = '';
    var live = ['open', 'bidding', 'collecting'].indexOf(r.state) >= 0;
    if (live && (i.status === 'invited' || i.status === 'viewed' || i.status === 'proxy_expired' || i.status === 'proxy_disputed')) out += '<button type="button" class="btn sm" data-ptr="proxy" data-inv="' + i.id + '">대리 입력</button>';
    if (live && i.status === 'proxy_entered') out += '<span class="small muted">호텔 확인 대기' + (i.confirmSentAt ? ' · 발송 ' + A.fmtDT(typeof i.confirmSentAt === 'number' ? i.confirmSentAt : Date.parse(i.confirmSentAt)) : '') + '</span> <button type="button" class="btn sm" data-ptr="proxy-resend" data-inv="' + i.id + '">재발송</button> <button type="button" class="btn sm" data-ptr="proxy" data-inv="' + i.id + '">수정</button>';
    if (i.status === 'proxy_disputed') out += '<div class="small warn-cell">호텔 이의: ' + esc(i.disputeReason || '') + '</div>';
    if (i.status === 'submitted') { var pq = (r.quotes || []).filter(function (q) { return q.invId === i.id && q.round === r.round && q.enteredBy === 'partner'; })[0]; if (pq) out += '<span class="badge teal" title="파트너가 대리 입력하고 호텔이 확인한 견적">대리 입력 · 호텔 확인' + (pq.confirmedAt ? ' ' + A.fmtDT(typeof pq.confirmedAt === 'number' ? pq.confirmedAt : Date.parse(pq.confirmedAt)) : '') + '</span>'; }
    return out;
  };

  /* ---------- 다이얼로그 ---------- */
  function regionOptions(sel) { return P.REGIONS.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === sel ? ' selected' : '') + '>' + x[0] + ' · ' + esc(x[1]) + '</option>'; }).join(''); }
  P.dlgAssign = function (r) {
    var orgs = (A.data().partnerOrgs || []).filter(function (o) { return o.status === 'active' && o.regions.some(function (x) { return x.active && P.covers(x.code, r.regionCode); }); });
    return A.dialog({ title: r.delegation === 'delegated' ? '파트너 재배정' : '파트너 배정', ok: '배정',
      body: '<label class="lbl" for="dlgOrg">지역 파트너 (' + esc(r.regionCode || '지역 미정') + ')</label><select id="dlgOrg" class="inp">' + orgs.map(function (o) { return '<option value="' + o.code + '">' + esc(o.displayName) + ' · ' + o.regions.map(function (x) { return x.code; }).join(',') + (o.acceptingNew ? '' : ' (신규 중지)') + '</option>'; }).join('') + '</select><label class="lbl" for="dlgWhy">사유 (선택)</label><input id="dlgWhy" class="inp">',
      collect: function (d) { var c = d.querySelector('#dlgOrg').value; if (!c) return '파트너를 선택해 주세요'; return { code: c, reason: d.querySelector('#dlgWhy').value.trim() }; } });
  };
  P.dlgRegion = function (r) {
    return A.dialog({ title: '지역 변경', ok: '저장', body: '<label class="lbl" for="dlgRg">지역 코드</label><select id="dlgRg" class="inp">' + regionOptions(r.regionCode) + '</select><label class="lbl"><input type="checkbox" id="dlgRe" checked> 새 지역 기준으로 파트너 재배정</label><label class="lbl" for="dlgWhy">사유</label><input id="dlgWhy" class="inp">',
      collect: function (d) { return { code: d.querySelector('#dlgRg').value, reassign: d.querySelector('#dlgRe').checked, reason: d.querySelector('#dlgWhy').value.trim() }; } });
  };
  P.dlgTakeover = function (r) {
    return A.dialog({ title: '본사 인계', ok: '인계', body: '<p class="muted">인계하면 파트너는 이 요청을 읽기만 할 수 있습니다. 파트너 몫은 기본 유지(계약 배분율)이며 필요하면 조정합니다.</p><label class="lbl" for="dlgWhy">사유 (필수)</label><textarea id="dlgWhy" class="inp" rows="2"></textarea><label class="lbl" for="dlgPct">파트너 몫 조정 % (비우면 유지)</label><input id="dlgPct" class="inp" type="number" min="0" max="100" step="1" placeholder="예: 50">',
      collect: function (d) { var w = d.querySelector('#dlgWhy').value.trim(); if (!w) return '사유를 적어 주세요'; var p = d.querySelector('#dlgPct').value; return { reason: w, pct: p === '' ? null : Number(p) }; } });
  };
  P.dlgProxy = function (r, inv, existing) {
    var q = existing || {};
    return A.dialog({ title: (existing ? '대리 입력 수정 · ' : '견적 대리 입력 · ') + inv.hotel, ok: '저장하고 호텔 확인 요청',
      body: '<p class="muted">호텔에게 전화·LINE 등으로 받은 견적을 대신 입력합니다. 저장하면 호텔의 MICEGO 등록 이메일로 1회용 확인 링크(72시간)가 가고, 호텔이 확인해야 비교표에 실립니다.</p>' +
        '<div class="panel-cols"><div><label class="lbl" for="pq-ccy">통화</label><input id="pq-ccy" class="inp" value="' + esc(q.currency || 'THB') + '" maxlength="3"><label class="lbl" for="pq-twin">트윈 1박</label><input id="pq-twin" class="inp" type="number" min="0" value="' + esc(q.twin != null ? q.twin : '') + '"><label class="lbl" for="pq-king">킹 1박</label><input id="pq-king" class="inp" type="number" min="0" value="' + esc(q.king != null ? q.king : '') + '"><label class="lbl" for="pq-bf">조식</label><select id="pq-bf" class="inp"><option value="included">포함</option><option value="not_included">별도</option></select><label class="lbl" for="pq-tax">세금·봉사료</label><select id="pq-tax" class="inp"><option value="included">포함</option><option value="not_included">별도</option></select></div>' +
        '<div><label class="lbl" for="pq-ball">볼룸명</label><input id="pq-ball" class="inp" value="' + esc(q.ballroomName || '') + '"><label class="lbl" for="pq-fee">볼룸 대관료</label><input id="pq-fee" class="inp" type="number" min="0" value="' + esc(q.ballroomFee != null ? q.ballroomFee : 0) + '"><label class="lbl" for="pq-valid">견적 유효기한</label><input id="pq-valid" class="inp" type="date" value="' + esc(q.validUntil || '') + '"><label class="lbl" for="pq-cxl">취소 규정</label><input id="pq-cxl" class="inp" value="' + esc(q.cancel || '') + '"></div></div>' +
        '<label class="lbl" for="pq-ev">증빙 메모 (필수 · 누구에게 어떤 채널로 언제 받았는지)</label><textarea id="pq-ev" class="inp" rows="2">' + esc(q.evidenceNote || '') + '</textarea>',
      collect: function (d) {
        var g = function (id) { return d.querySelector('#' + id).value.trim(); };
        var o = { currency: g('pq-ccy').toUpperCase(), twinRate: Number(g('pq-twin')), kingRate: Number(g('pq-king')), breakfast: g('pq-bf'), tax: g('pq-tax'), availability: 'all', ballroomName: g('pq-ball'), ballroomFee: Number(g('pq-fee') || 0), validUntil: g('pq-valid'), cancellation: g('pq-cxl') };
        var ev = g('pq-ev');
        if (!/^[A-Z]{3}$/.test(o.currency)) return '통화는 3자리 코드로 적어 주세요';
        if (!(o.twinRate >= 0) || !(o.kingRate >= 0) || g('pq-twin') === '' || g('pq-king') === '') return '트윈·킹 요금을 입력해 주세요';
        if (!o.ballroomName) return '볼룸명을 입력해 주세요';
        if (!o.validUntil) return '유효기한을 입력해 주세요';
        if (o.cancellation.length < 5) return '취소 규정을 5자 이상 적어 주세요';
        if (ev.length < 5) return '증빙 메모를 5자 이상 적어 주세요';
        return { quote: o, evidence: ev };
      } });
  };

  /* ---------- RFP 상세 클릭 핸들러 (rfp.html 에서 main 클릭 위임 중 data-ptr 만 처리) ---------- */
  P.handleRfpAction = async function (t, rfp, rerender) {
    var act = t.getAttribute('data-ptr'), ref = rfp.id;
    if (act === 'assign') {
      var a = await P.dlgAssign(rfp); if (!a) return;
      var ok = await P.op('rfp_assign', { p_ref: ref, p_partner_code: a.code, p_reason: a.reason || null }, function () {
        var o = P.org(a.code); rfp.delegation = 'delegated'; rfp.partner = { code: a.code, name: o ? o.displayName : a.code, status: 'active' }; rfp.holdReason = null; rfp.delegatedAt = A.NOW; rfp.takenOverAt = null;
        rfp.assignments.push({ t: A.NOW, action: 'assign', to: a.code, reason: a.reason }); A.log(rfp, '운영자', null, null, '지역 파트너 배정 · ' + (o ? o.displayName : a.code)); });
      if (ok) { rerender(); A.toast('파트너에게 배정했습니다', 'ok'); } return;
    }
    if (act === 'hold') {
      var w = await A.memoDialog('본사 보유로 전환', '사유', '파트너 배정을 해제하고 본사가 직접 처리합니다. 파트너는 이 요청을 더 볼 수 없습니다.', '전환', true); if (w === null) return;
      var ok2 = await P.op('rfp_hold', { p_ref: ref, p_reason: w }, function () { rfp.assignments.push({ t: A.NOW, action: 'hold', to: null, reason: w }); rfp.delegation = 'hq_held'; rfp.partner = null; rfp.holdReason = 'manual'; A.log(rfp, '운영자', null, null, '본사 보유 전환 · ' + w); });
      if (ok2) { rerender(); A.toast('본사 보유로 전환했습니다', 'ok'); } return;
    }
    if (act === 'set-region') {
      var rg = await P.dlgRegion(rfp); if (!rg) return;
      var ok3 = await P.op('rfp_set_region', { p_ref: ref, p_region_code: rg.code, p_reason: rg.reason || null, p_reassign: rg.reassign }, function () { rfp.regionCode = rg.code; rfp.regionSource = 'operator'; rfp.assignments.push({ t: A.NOW, action: 'region_set', to: null, reason: rg.code }); A.log(rfp, '운영자', null, null, '지역 변경 · ' + rg.code); });
      if (ok3) { rerender(); A.toast('지역을 ' + rg.code + '(으)로 바꿨습니다', 'ok'); } return;
    }
    if (act === 'takeover') {
      var tk = await P.dlgTakeover(rfp); if (!tk) return;
      var ok4 = await P.op('rfp_takeover', { p_ref: ref, p_reason: tk.reason, p_share_override_pct: tk.pct }, function () { rfp.delegation = 'taken_over'; rfp.takenOverAt = A.NOW; rfp.takeoverReason = tk.reason; rfp.shareOverridePct = tk.pct; rfp.assignments.push({ t: A.NOW, action: 'takeover', to: rfp.partner && rfp.partner.code, reason: tk.reason }); A.log(rfp, '운영자', null, null, '본사 인계 · ' + tk.reason); });
      if (ok4) { rerender(); A.toast('본사가 인계했습니다. 파트너는 읽기만 가능합니다', 'ok'); } return;
    }
    if (act === 'release') {
      var ok5 = await A.confirm('파트너에게 다시 위임합니다. 인계 사유·몫 조정은 해제됩니다.', '되돌리기'); if (!ok5) return;
      var ok6 = await P.op('rfp_release', { p_ref: ref, p_reason: null }, function () { rfp.delegation = 'delegated'; rfp.takenOverAt = null; rfp.takeoverReason = null; rfp.shareOverridePct = null; rfp.assignments.push({ t: A.NOW, action: 'release', to: rfp.partner && rfp.partner.code }); A.log(rfp, '운영자', null, null, '파트너 위임 복원'); });
      if (ok6) { rerender(); A.toast('파트너 위임을 복원했습니다', 'ok'); } return;
    }
    if (act === 'decline') {
      var dw = await A.memoDialog('배정 반려', '사유', '이 요청을 맡을 수 없을 때 본사로 되돌립니다. 접수·요건 확인 단계에서만 가능합니다.', '반려', true); if (dw === null) return;
      var ok7 = await P.op('rfp_decline_assignment', { p_ref: ref, p_reason: dw }, function () { rfp.delegation = 'hq_held'; rfp.holdReason = 'partner_declined'; });
      if (ok7) { A.toast('본사로 되돌렸습니다', 'ok'); location.href = 'rfps.html'; } return;
    }
    if (act === 'reveal' || act === 'reveal-phone') {
      var ctx = act === 'reveal-phone' ? 'reveal_phone' : 'rfp_detail';
      if (window.MGA && MGA.mode === 'api') {
        try { var j = await MGA.call('rfp_get_identity', { p_ref: ref, p_context: ctx }); rfp._identity = { company: j.company, contact: j.contact, email: j.email, phone: j.phone, budget: j.budget, phoneFull: ctx === 'reveal_phone' }; rfp.identityViews = (rfp.identityViews || 0) + 1; } catch (e) { P.err(e); return; }
      } else { var f = rfp.organizer._full || {}; rfp._identity = { company: f.company, contact: f.contact, email: f.email, phone: ctx === 'reveal_phone' ? f.phone : A.maskPhone(f.phone), budget: f.budget, phoneFull: ctx === 'reveal_phone' }; rfp.identityViews = (rfp.identityViews || 0) + 1; A.save(); }
      rerender(); return;
    }
    if (act === 'proxy') {
      var inv = rfp.invitations.filter(function (i) { return i.id === t.getAttribute('data-inv'); })[0];
      var ex = inv.proxyQuoteId ? rfp.quotes.filter(function (q) { return q.id === inv.proxyQuoteId; })[0] : null;
      var pr = await P.dlgProxy(rfp, inv, ex); if (!pr) return;
      var ok8 = await P.op('partner_quote_proxy_enter', { p_ref: ref, p_invitation_id: inv.id, p_quote: pr.quote, p_evidence_note: pr.evidence }, function () {
        var q = ex || { id: 'q-proxy-' + inv.id, invId: inv.id, round: rfp.round, label: null, usdRef: null, usdDate: null }; if (!ex) rfp.quotes.push(q);
        q.currency = pr.quote.currency; q.twin = pr.quote.twinRate; q.king = pr.quote.kingRate; q.tax = pr.quote.tax === 'included' ? '포함' : '별도'; q.breakfast = pr.quote.breakfast === 'included' ? '포함' : '별도'; q.validUntil = pr.quote.validUntil; q.cancel = pr.quote.cancellation; q.enteredBy = 'partner'; q.proxyEnteredAt = A.NOW; q.confirmedAt = null; q.comparable = false; q.evidenceNote = pr.evidence; q.ballroomName = pr.quote.ballroomName; q.ballroomFee = pr.quote.ballroomFee;
        inv.status = 'proxy_entered'; inv.proxyQuoteId = q.id; inv.confirmSentAt = A.NOW; inv.confirmExpiresAt = A.NOW + 72 * 3600e3; inv.disputeReason = null;
        A.log(rfp, A.me && A.me.role !== 'operator' ? '파트너 · ' + (A.me.partnerName || '') : '운영자', null, null, inv.hotel + ' 견적 대리 입력 · 호텔 확인 요청 발송'); });
      if (ok8) { rerender(); A.toast('저장했습니다. 호텔에 확인 링크를 보냈습니다', 'ok'); } return;
    }
    if (act === 'proxy-resend') {
      var inv2 = rfp.invitations.filter(function (i) { return i.id === t.getAttribute('data-inv'); })[0];
      var ok9 = await P.op('partner_quote_proxy_resend', { p_ref: ref, p_invitation_id: inv2.id }, function () { inv2.confirmSentAt = A.NOW; inv2.confirmExpiresAt = A.NOW + 72 * 3600e3; A.log(rfp, '운영자', null, null, inv2.hotel + ' 확인 요청 재발송'); });
      if (ok9) { rerender(); A.toast('확인 요청을 다시 보냈습니다', 'ok'); } return;
    }
  };

  /* ---------- 정산 화면 헬퍼 ---------- */
  P.settlement = function (ref) { return (A.data().settlements || []).filter(function (s) { return s.ref === ref; })[0] || null; };
  P.settlementActions = function (s) {
    var hq = A.isOperator(), pa = A.isPartnerAdmin(), out = [];
    var partnerCan = pa || (hq && !s.partner);
    if (s.status === 'pending_commission' && partnerCan) out.push(['submit_commission', '커미션 입력', 'primary']);
    if (s.status === 'commission_submitted' && hq) { out.push(['approve_commission', '커미션 승인', 'primary']); out.push(['reject_commission', '반려', 'danger']); }
    if (s.status === 'commission_confirmed' && partnerCan) out.push(['record_collection', '수금 기록', 'primary']);
    if (s.status === 'collected' && partnerCan) out.push(['record_remittance', '송금 기록', 'primary']);
    if (s.status === 'remitted' && hq) out.push(['confirm_receipt', '입금 확인 · 완료', 'primary']);
    if (['completed', 'voided', 'disputed'].indexOf(s.status) < 0 && (hq || pa)) out.push(['open_dispute', '분쟁 제기', '']);
    if (s.status === 'disputed' && hq) out.push(['resolve_dispute', '분쟁 해소', 'primary']);
    if (['completed', 'voided'].indexOf(s.status) < 0 && hq) out.push(['void', '무효 처리', 'danger']);
    return out;
  };
  P.dlgSettlement = function (s, action) {
    var T = { submit_commission: '커미션 입력', approve_commission: '커미션 승인', reject_commission: '커미션 반려', record_collection: '수금 기록', record_remittance: '송금 기록', confirm_receipt: '입금 확인', open_dispute: '분쟁 제기', resolve_dispute: '분쟁 해소', void: '무효 처리' }[action];
    var body = '', collect;
    var agreed = (action === 'submit_commission' && s.agreedRatePct != null) ? Number(s.agreedRatePct) : null;
    if (action === 'submit_commission') {
      body = (agreed != null ? '<p class="note-box">이 호텔과 합의한 요율은 <b>' + esc(agreed) + '%</b>입니다. 합의 요율을 그대로 쓰면 요율은 바꿀 수 없습니다.</p>' : '<p class="note-box">합의 요율이 기록되지 않은 건입니다. 요율과 근거를 메모에 남겨 주세요.</p>') +
        '<label class="lbl" for="st-contract">호텔 계약 금액 (순액: 세금·봉사료 제외) · ' + esc(s.hotelCurrency) + '</label><input id="st-contract" class="inp" type="number" min="0" step="0.01" value="' + esc(s.contractAmount || '') + '">' +
        (agreed != null ? '<label class="chk-row"><input type="checkbox" id="st-dev"> 합의 요율과 다르게 입력</label>' : '') +
        '<label class="lbl" for="st-basis">커미션 기준</label><select id="st-basis" class="inp"' + (agreed != null ? ' disabled' : '') + '><option value="rate">요율(%)</option><option value="fixed">고정 금액</option></select>' +
        '<label class="lbl" for="st-rate">요율 % (요율 기준일 때)</label><input id="st-rate" class="inp" type="number" min="0" max="50" step="0.1"' + (agreed != null ? ' readonly' : '') + ' value="' + esc(agreed != null ? agreed : (s.commissionRatePct || 10)) + '">' +
        '<label class="lbl" for="st-amt">커미션 금액 (고정 금액일 때)</label><input id="st-amt" class="inp" type="number" min="0" step="0.01">' +
        '<label class="lbl" for="st-note" id="st-note-l">' + (agreed != null ? '메모 (합의 요율과 다르게 입력하면 필수, 계약가가 견적보다 크게 낮아도 필수)' : '메모 (요율이 5~20% 밖이거나 계약가가 견적보다 크게 낮으면 필수)') + '</label><input id="st-note" class="inp">';
      collect = function (d) {
        var g = function (i) { return d.querySelector('#' + i).value.trim(); }; var dev = agreed != null && d.querySelector('#st-dev').checked;
        var basis = agreed != null && !dev ? 'rate' : g('st-basis'); var p = { contractAmount: Number(g('st-contract')), commissionBasis: basis };
        if (basis === 'rate') p.commissionRatePct = agreed != null && !dev ? agreed : Number(g('st-rate')); else p.commissionAmount = Number(g('st-amt'));
        if (!(p.contractAmount > 0)) return '계약 금액을 입력해 주세요'; if (basis === 'rate' && !(p.commissionRatePct > 0)) return '요율을 입력해 주세요'; if (basis === 'fixed' && !(p.commissionAmount >= 0)) return '커미션 금액을 입력해 주세요';
        if (dev && !g('st-note')) return '합의 요율과 다르게 입력하려면 사유를 메모에 적어 주세요';
        return { p: p, note: g('st-note') };
      };
    } else if (action === 'record_collection') {
      body = '<label class="lbl" for="st-at">수금일</label><input id="st-at" class="inp" type="date"><label class="lbl" for="st-amt">수금액 (' + esc(s.hotelCurrency) + ') · 확정 커미션 ' + P.fmtMoney(s.commissionAmount, s.hotelCurrency) + '</label><input id="st-amt" class="inp" type="number" min="0" step="0.01" value="' + esc(s.commissionAmount || '') + '"><label class="lbl" for="st-note">메모 (금액이 다르면 필수)</label><input id="st-note" class="inp">';
      collect = function (d) { var g = function (i) { return d.querySelector('#' + i).value.trim(); }; if (!g('st-at')) return '수금일을 입력해 주세요'; return { p: { collectedAt: g('st-at') + 'T09:00:00+09:00', collectedAmount: Number(g('st-amt')) }, note: g('st-note') }; };
    } else if (action === 'record_remittance') {
      body = '<p class="muted">MICEGO 몫 ' + P.fmtMoney(s.micegoShareAmount, s.hotelCurrency) + '을(를) 송금 통화로 환산해 보냅니다. 환율은 송금 은행 적용 환율을 적고 증빙을 첨부합니다.</p><label class="lbl" for="st-ccy">송금 통화</label><input id="st-ccy" class="inp" value="' + esc(s.remitCurrency || 'USD') + '" maxlength="3"><label class="lbl" for="st-fx">환율 (1 ' + esc(s.hotelCurrency) + ' = ? 송금통화)</label><input id="st-fx" class="inp" type="number" min="0" step="0.00000001"><label class="lbl" for="st-at">송금일</label><input id="st-at" class="inp" type="date"><label class="lbl" for="st-amt">송금액 (송금 통화)</label><input id="st-amt" class="inp" type="number" min="0" step="0.01"><label class="lbl" for="st-ref">송금 참조번호</label><input id="st-ref" class="inp"><label class="lbl" for="st-src">환율 출처</label><input id="st-src" class="inp" value="송금 은행 적용 환율">';
      collect = function (d) { var g = function (i) { return d.querySelector('#' + i).value.trim(); }; if (!g('st-fx') || !g('st-at') || !g('st-amt')) return '환율·송금일·송금액을 입력해 주세요'; return { p: { remitCurrency: g('st-ccy').toUpperCase(), fxRate: Number(g('st-fx')), remittedAt: g('st-at') + 'T09:00:00+09:00', remitAmount: Number(g('st-amt')), remitReference: g('st-ref'), fxRateSource: g('st-src') }, note: '' }; };
    } else if (action === 'confirm_receipt') {
      body = '<label class="lbl" for="st-amt">입금 확인 금액 (' + esc(s.remitCurrency) + ') · 송금액 ' + P.fmtMoney(s.remitActual, s.remitCurrency) + '</label><input id="st-amt" class="inp" type="number" min="0" step="0.01" value="' + esc(s.remitActual || '') + '"><label class="lbl" for="st-note">메모 (금액이 다르면 필수)</label><input id="st-note" class="inp">';
      collect = function (d) { var g = function (i) { return d.querySelector('#' + i).value.trim(); }; return { p: { receivedAmount: Number(g('st-amt')) }, note: g('st-note') }; };
    } else if (action === 'resolve_dispute') {
      body = '<label class="lbl" for="st-to">해소 후 상태</label><select id="st-to" class="inp"><option value="">이전 상태로</option><option value="pending_commission">커미션 입력 대기</option><option value="commission_confirmed">커미션 확정</option><option value="collected">수금 완료</option><option value="remitted">송금 완료</option></select><label class="lbl" for="st-amt">조정 커미션 금액 (선택)</label><input id="st-amt" class="inp" type="number" min="0" step="0.01"><label class="lbl" for="st-note">해소 내용 (필수)</label><textarea id="st-note" class="inp" rows="2"></textarea>';
      collect = function (d) { var g = function (i) { return d.querySelector('#' + i).value.trim(); }; if (!g('st-note')) return '해소 내용을 적어 주세요'; var p = {}; if (g('st-to')) p.toStatus = g('st-to'); if (g('st-amt')) p.commissionAmount = Number(g('st-amt')); return { p: p, note: g('st-note') }; };
    } else {
      body = '<label class="lbl" for="st-note">' + (action === 'approve_commission' ? '메모 (선택)' : '사유 (필수)') + '</label><textarea id="st-note" class="inp" rows="2"></textarea>';
      collect = function (d) { var n = d.querySelector('#st-note').value.trim(); if (action !== 'approve_commission' && !n) return '사유를 적어 주세요'; return { p: {}, note: n }; };
    }
    var pr = A.dialog({ title: T, ok: T, body: body, collect: collect });
    if (agreed != null) { /* 체크하면 요율·기준 잠금 해제, 풀면 합의 요율로 되돌림 */
      var dv = document.getElementById('st-dev'), rt = document.getElementById('st-rate'), bs = document.getElementById('st-basis');
      if (dv) dv.addEventListener('change', function () { rt.readOnly = !dv.checked; bs.disabled = !dv.checked; if (!dv.checked) { rt.value = agreed; bs.value = 'rate'; } else rt.focus(); });
    }
    return pr;
  };
  P.applySettlementLocal = function (s, action, p, note) {
    var ev = { t: A.NOW, action: action, from: s.status, to: s.status, actor: A.me ? A.me.displayName : '운영자', actorRole: A.me ? A.me.role : 'operator', note: note || null };
    var r2 = function (n) { return Math.round(n * 100) / 100; };
    if (action === 'submit_commission') { s.contractAmount = p.contractAmount; s.commissionBasis = p.commissionBasis; s.commissionRatePct = p.commissionRatePct || null; s.commissionAmount = p.commissionBasis === 'rate' ? r2(p.contractAmount * p.commissionRatePct / 100) : p.commissionAmount; s.partnerShareAmount = r2(s.commissionAmount * s.partnerSharePct / 100); s.micegoShareAmount = r2(s.commissionAmount - s.partnerShareAmount); s.status = 'commission_submitted';
      s.flags = (s.flags || []).filter(function (f) { return f !== 'rate_deviation'; }); if (s.agreedRatePct != null && (p.commissionBasis !== 'rate' || Number(p.commissionRatePct) !== Number(s.agreedRatePct))) s.flags.push('rate_deviation'); }
    else if (action === 'approve_commission') s.status = 'commission_confirmed';
    else if (action === 'reject_commission') { s.status = 'pending_commission'; s.commissionRejectReason = note; }
    else if (action === 'record_collection') { s.status = 'collected'; s.collectedAt = p.collectedAt; s.collectedAmount = p.collectedAmount; s.remitDue = new Date(Date.parse(p.collectedAt) + 14 * 86400e3).toISOString().slice(0, 10); }
    else if (action === 'record_remittance') { s.status = 'remitted'; s.remitCurrency = p.remitCurrency; s.fxRate = p.fxRate; s.remittedAt = p.remittedAt; s.remitActual = p.remitAmount; s.remitReference = p.remitReference; s.fxRateSource = p.fxRateSource; s.remitExpected = r2(s.micegoShareAmount * p.fxRate); }
    else if (action === 'confirm_receipt') { s.status = 'completed'; s.receivedAt = A.NOW; s.receivedAmount = p.receivedAmount; }
    else if (action === 'open_dispute') { s.statusBeforeDispute = s.status; s.status = 'disputed'; s.disputeReason = note; }
    else if (action === 'resolve_dispute') { s.status = p.toStatus || s.statusBeforeDispute || 'pending_commission'; s.disputeResolution = note; if (p.commissionAmount) { s.commissionAmount = p.commissionAmount; s.partnerShareAmount = r2(p.commissionAmount * s.partnerSharePct / 100); s.micegoShareAmount = r2(p.commissionAmount - s.partnerShareAmount); } }
    else if (action === 'void') { s.status = 'voided'; s.voidReason = note; }
    ev.to = s.status; s.events.push(ev); s.rowVersion++;
  };
  P.runSettlement = async function (s, action, rerender) {
    var v = await P.dlgSettlement(s, action); if (!v) return;
    var ok = await A.persist('settlement_action', { p_ref: s.ref, p_action: action, p: v.p, p_note: v.note || null }, function () { P.applySettlementLocal(s, action, v.p, v.note); });
    if (ok) { if (window.MGA && MGA.mode === 'api') { try { var j = await MGA.call('settlement_get', { p_ref: s.ref }); var list = A.data().settlements; for (var i = 0; i < list.length; i++) if (list[i].ref === s.ref) list[i] = j; A.save(); } catch (e) { } } rerender(); A.toast('처리했습니다', 'ok'); }
  };

  /* ---------- 대시보드 위젯 ---------- */
  P.interventionWidget = function () {
    var list = A.data().interventions || [];
    if (!list.length) return '<section class="card"><h2>개입 필요</h2><p class="muted small">지금은 개입이 필요한 건이 없습니다.</p></section>';
    return '<section class="card" id="interventions"><h2>개입 필요 <span class="badge red">' + list.length + '</span></h2><div class="tbl-wrap"><table><thead><tr><th>구분</th><th>요청</th><th>파트너</th><th>발생</th><th></th></tr></thead><tbody>' + list.map(function (a) {
      return '<tr><td><span class="badge ' + (a.severity === 1 ? 'red' : 'amber') + '">' + esc(P.INT[a.kind] || a.kind) + '</span></td><td>' + (a.rfpId ? '<a class="mono" href="rfp.html?id=' + a.rfpId + '">' + a.rfpId + '</a>' : (a.settlementId ? '정산' : '—')) + '</td><td>' + esc(a.partner || '—') + '</td><td>' + A.fmtDT(typeof a.openedAt === 'number' ? a.openedAt : Date.parse(a.openedAt)) + '</td><td>' + (A.isOperator() ? '<button type="button" class="btn sm" data-int="' + a.id + '">처리 완료</button>' : '') + '</td></tr>';
    }).join('') + '</tbody></table></div></section>';
  };
  P.partnerSummary = function () {
    var S = A.data(), me = A.me || {}, rf = S.rfps, act = rf.filter(function (r) { return A.TERMINAL.indexOf(r.state) < 0; });
    var st = (S.settlements || []).filter(function (s) { return ['pending_commission', 'commission_confirmed', 'collected'].indexOf(s.status) >= 0; });
    return '<section class="card"><h2>' + esc(me.partnerName || '내 조직') + ' · 담당 지역 ' + esc((me.regions || []).join(', ')) + '</h2><dl class="kv"><dt>진행 중 요청</dt><dd>' + act.length + '건 (접수 ' + act.filter(function (r) { return r.state === 'received'; }).length + ' · 검증 ' + act.filter(function (r) { return r.state === 'verifying' || r.state === 'open'; }).length + ' · 비딩 ' + act.filter(function (r) { return r.state === 'bidding' || r.state === 'collecting'; }).length + ' · 전달 ' + act.filter(function (r) { return r.state === 'delivered'; }).length + ')</dd><dt>본사 인계</dt><dd>' + rf.filter(function (r) { return r.delegation === 'taken_over'; }).length + '건</dd><dt>정산 처리 필요</dt><dd>' + st.length + '건 <a href="settlements.html">정산으로</a></dd><dt>배분율</dt><dd>파트너 ' + (me.sharePct || 70) + ' : MICEGO ' + (100 - (me.sharePct || 70)) + '</dd></dl></section>';
  };

  /* ---------- 호텔 파트너: 지역 파트너의 호텔 등록 + 본사 사후 검토 ---------- */
  P.hotelBadges = function (p) {
    var b = [];
    if (p.sourcedBy) b.push('<span class="badge teal" title="지역 파트너가 등록한 호텔">' + esc(p.sourcedBy) + ' 등록</span>');
    if (p.approvedVia === 'partner' && !p.hqReviewedAt) b.push('<span class="badge amber">본사 사후 검토 대기</span>');
    if (p.riskFlags && p.riskFlags.length) b.push('<span class="badge red" title="' + esc(p.riskFlags.join(', ')) + '">위험 표시 ' + p.riskFlags.length + '</span>');
    var cb = A.commissionBadgeHtml(p); if (cb) b.push(cb);
    return b.join(' ');
  };

  /* ---------- 커미션 요율 카드 (호텔 상세) ---------- */
  var CM_ACT = { proposed: '요율 제안', resent: '링크 다시 보냄', accepted: '호텔 동의', expired: '링크 만료', backfilled: '기존 합의 등록' };
  var CM_ROLE = { operator: '본사', partner_admin: '파트너 관리자', partner_member: '파트너 담당자' };
  P.commissionSection = function (p) {
    var c = A.commissionOf(p), live = p.status === 'approved' || p.status === 'suspended', canEdit = live && !(A.me && A.me.role === 'partner_member');
    var pend = c.pendingRatePct != null && !c.tokenUsedAt, expired = pend && (c.status === 'expired' || (A.tms(c.tokenExpiresAt) || 0) < A.NOW);
    var b = A.commissionBadgeHtml(p);
    var rows = '<dt>합의 요율</dt><dd>' + (A.commissionAgreed(p) ? '<b id="cmRateNow">' + esc(c.ratePct) + '%</b>' : '<span class="warn-cell" id="cmRateNow">합의 전</span> <span class="small muted">합의하기 전에는 견적 초대를 보낼 수 없습니다</span>') + '</dd>' +
      '<dt>산정 기준</dt><dd>객실 + 연회·F&amp;B 순액 <span class="small muted">(세금·봉사료 제외)</span></dd>' +
      '<dt>동의</dt><dd>' + (A.commissionAgreed(p) ? dtv(c.acceptedAt) + ' · 약관 ' + esc(c.termsVersion || '—') : '<span class="muted">—</span>') + '</dd>';
    if (pend) {
      rows += '<dt>대기 중 요율</dt><dd><b>' + esc(c.pendingRatePct) + '%</b> <span class="small muted">' + esc(CM_ROLE[c.setByRole] || '') + ' 제안 · ' + dtv(c.setAt) + '</span>' + (c.pendingReason ? '<div class="small">범위 밖 사유: ' + esc(c.pendingReason) + '</div>' : '') + '</dd>' +
        '<dt>동의 링크</dt><dd>발송 ' + dtv(c.tokenSentAt) + ' · 만료 ' + dtv(c.tokenExpiresAt) + (expired ? ' <span class="badge red">만료됨</span>' : '') + ' · 발송 ' + (c.sendCount || 0) + '회' + ((c.sendCount || 0) >= 5 ? ' <span class="small muted">(다시 보내기 한도 5회)</span>' : '') + '</dd>';
    }
    var hist = (c.history || []).slice().sort(function (x, y) { return A.tms(x.t) - A.tms(y.t); }).map(function (h) {
      var who = h.action === 'accepted' ? '호텔' : (h.actorRole ? (CM_ROLE[h.actorRole] || h.actorRole) : '시스템');
      return '<tr><td style="white-space:nowrap" class="mono">' + dtv(h.t) + '</td><td>' + esc(CM_ACT[h.action] || h.action) + '</td><td class="num">' + (h.ratePct != null ? esc(h.ratePct) + '%' : '—') + (h.prevRatePct != null && h.prevRatePct !== h.ratePct ? ' <span class="small muted">← ' + esc(h.prevRatePct) + '%</span>' : '') + '</td><td>' + esc(who) + '</td><td class="mono small">' + esc(h.termsVersion || '—') + '</td><td>' + (h.hqOverride ? '<span class="badge amber">본사 예외</span> ' : '') + esc(h.reason || '') + '</td></tr>';
    }).join('');
    var btns = '';
    if (canEdit) {
      btns += '<button type="button" class="btn sm primary" data-ptr="cm-set">요율 변경 제안</button>';
      if (pend) btns += ' <button type="button" class="btn sm" data-ptr="cm-resend"' + ((c.sendCount || 0) >= 5 ? ' disabled title="다시 보내기는 최대 5회입니다"' : '') + '>동의 링크 다시 보내기</button>';
    }
    return '<section class="card" id="cmSection" aria-labelledby="h-cm"><h2 id="h-cm">커미션 요율 ' + b + '</h2>' +
      (live ? '' : '<p class="sub">요율은 승인할 때 정합니다. 승인하면 호텔에 동의 링크가 나갑니다.</p>') +
      '<dl class="kv">' + rows + '</dl>' + (btns ? '<div class="memo-add" style="gap:6px">' + btns + '</div>' : (live ? '<p class="small muted">요율 변경은 본사 또는 파트너 관리자가 제안합니다. 담당자는 조회만 할 수 있습니다.</p>' : '')) +
      '<h3>요율 이력</h3>' + (hist ? '<div class="tbl-wrap"><table id="cmHist"><thead><tr><th>시각</th><th>구분</th><th class="num">요율</th><th>주체</th><th>약관</th><th>사유</th></tr></thead><tbody>' + hist + '</tbody></table></div>' : '<p class="muted small">아직 요율 이력이 없습니다.</p>') + '</section>';
  };
  P.RISK = { free_mail: '무료 메일 도메인', domain_mismatch: '호텔 도메인 불일치', partner_domain: '파트너 조직 도메인과 동일', dup_phone: '전화번호 중복', dup_domain: '도메인 중복 호텔' };
  P.hotelCard = function (p) {
    var hq = A.isOperator();
    var rows = '<dl class="kv"><dt>지역</dt><dd>' + P.regionLabel(p.regionCode) + '</dd><dt>등록 경로</dt><dd>' + (p.sourcedBy ? '지역 파트너 ' + esc(p.sourcedBy) : '호텔 직접 신청') + '</dd>' +
      '<dt>승인 경로</dt><dd>' + (p.approvedVia === 'partner' ? '지역 파트너 승인' + (p.approvedAt ? ' · ' + A.fmtDT(typeof p.approvedAt === 'number' ? p.approvedAt : Date.parse(p.approvedAt)) : '') : p.approvedVia === 'hq' ? '본사 승인' : '—') + '</dd>' +
      '<dt>본사 사후 검토</dt><dd>' + (p.hqReviewedAt ? '완료 · ' + A.fmtDT(typeof p.hqReviewedAt === 'number' ? p.hqReviewedAt : Date.parse(p.hqReviewedAt)) : (p.approvedVia === 'partner' ? '<span class="warn-cell">대기</span> <span class="small muted">검토 전에는 이 호텔이 선정된 건의 커미션 승인이 막힙니다</span>' : '해당 없음')) + '</dd>' +
      '<dt>위험 표시</dt><dd>' + (p.riskFlags && p.riskFlags.length ? p.riskFlags.map(function (f) { return '<span class="badge red">' + esc(P.RISK[f] || f) + '</span>'; }).join(' ') + ' <span class="small muted">위험 표시가 있으면 본사만 승인할 수 있습니다</span>' : '없음') + '</dd></dl>';
    var btns = '';
    if (hq) {
      btns += '<button type="button" class="btn sm" data-ptr="hotel-region">지역 변경</button>';
      if (p.approvedVia === 'partner' && !p.hqReviewedAt) btns += '<button type="button" class="btn sm primary" data-ptr="hotel-review">사후 검토 완료</button>';
    }
    return '<section class="card" aria-labelledby="h-rg"><h2 id="h-rg">지역 · 등록 경로</h2>' + rows + (btns ? '<div class="memo-add" style="gap:6px">' + btns + '</div>' : '') + '</section>';
  };
  P.handleHotelAction = async function (t, p, rerender) {
    var act = t.getAttribute('data-ptr'), code = p.id;
    if (act === 'hotel-review') {
      var ok = await A.confirm('이 호텔의 파트너 승인을 본사가 검토했다고 표시합니다. 이후 이 호텔이 선정된 건의 커미션 승인이 열립니다.', '검토 완료로 표시');
      if (!ok) return;
      var r = await A.persist('admin_partner_update', { p_code: code, p_patch: { hqReviewed: true } }, function () { p.hqReviewedAt = A.NOW; A.plog && A.plog(p, '운영자', null, null, '본사 사후 검토 완료'); });
      if (r) { rerender(); A.toast('사후 검토 완료로 표시했습니다', 'ok'); }
      return;
    }
    if (act === 'cm-set') {
      var cm = A.commissionOf(p);
      var v0 = await A.commissionDialog(p, { title: '요율 변경 제안', ok: '제안하고 링크 보내기', def: cm.pendingRatePct != null ? cm.pendingRatePct : cm.ratePct,
        help: '새 요율은 호텔이 메일 링크에서 동의해야 적용됩니다. ' + (cm.ratePct != null ? '동의 전까지는 지금 합의한 ' + cm.ratePct + '%가 그대로 유지되고, ' : '') + '새 요율은 동의한 뒤 만드는 초대부터 적용됩니다.' });
      if (!v0) return;
      var r0 = await A.persist('admin_partner_update', { p_code: code, p_patch: { commissionRatePct: v0.rate, commissionReason: v0.reason } }, function () { A.commissionLocal(p, v0.rate, v0.reason); A.plog && A.plog(p, '운영자', null, null, '커미션 요율 ' + v0.rate + '% 제안'); });
      if (r0) { rerender(); A.toast('요율 ' + v0.rate + '%를 제안하고 동의 링크를 보냈습니다', 'ok'); }
      return;
    }
    if (act === 'cm-resend') {
      var cm2 = A.commissionOf(p);
      if ((cm2.sendCount || 0) >= 5) { A.toast('동의 링크는 최대 5회까지 다시 보낼 수 있습니다', 'error'); return; }
      var ok2 = await A.confirm(p.name + ' 담당자(' + p.email + ')에게 요율 ' + cm2.pendingRatePct + '% 동의 링크를 새로 보냅니다. 이전에 보낸 링크는 쓸 수 없게 됩니다.', '다시 보내기');
      if (!ok2) return;
      var r2c = await A.persist('partner_commission_resend', { p_code: code }, function () {
        A.data().tick += 1; var t = A.NOW + A.data().tick * 60000;
        cm2.tokenSentAt = t; cm2.tokenExpiresAt = t + 168 * 3600e3; cm2.tokenUsedAt = null; cm2.sendCount = (cm2.sendCount || 0) + 1; cm2.status = 'pending';
        cm2.history = (cm2.history || []).concat([{ t: t, action: 'resent', ratePct: cm2.pendingRatePct, prevRatePct: cm2.ratePct, basis: cm2.basis, termsVersion: 'PT-2026-10', actorRole: A.me ? A.me.role : 'operator', reason: null, hqOverride: false }]);
      });
      if (r2c) { rerender(); A.toast('동의 링크를 다시 보냈습니다', 'ok'); }
      return;
    }
    if (act === 'hotel-region') {
      var v = await A.dialog({ title: '호텔 지역 변경', ok: '저장', body: '<label class="lbl" for="dlgRg">지역</label><select id="dlgRg" class="inp">' + regionOptions(p.regionCode) + '</select>', collect: function (d) { return { code: d.querySelector('#dlgRg').value }; } });
      if (!v) return;
      var r2 = await A.persist('admin_partner_update', { p_code: code, p_patch: { regionCode: v.code } }, function () { p.regionCode = v.code; p.dest = P.regionName(v.code); });
      if (r2) { rerender(); A.toast('지역을 ' + P.regionLabel(v.code) + '(으)로 바꿨습니다', 'ok'); }
    }
  };
  P.dlgHotelRegister = function () {
    var me = A.me || {}, def = (me.regions || [])[0] || '';
    var opts = P.REGIONS.filter(function (x) { return !me.regions || me.regions.some(function (rc) { return P.covers(rc, x[0]); }); });
    var f = function (id, lbl, ph, type) { return '<label class="lbl" for="' + id + '">' + lbl + '</label><input class="inp" id="' + id + '" type="' + (type || 'text') + '" placeholder="' + (ph || '') + '">'; };
    return A.dialog({ title: '호텔 등록', ok: '등록', body:
      '<p class="sub">담당 지역의 호텔을 등록합니다. 등록 즉시 심사 대기 상태가 되며, 위험 표시가 없으면 파트너 관리자가 직접 승인할 수 있습니다.</p>' +
      f('h-name', '호텔명 (영문 공식 명칭)', 'Amari Pattaya') + f('h-loc', '소재지', 'Pattaya, Chonburi') +
      '<label class="lbl" for="h-rg">지역</label><select id="h-rg" class="inp">' + opts.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === def ? ' selected' : '') + '>' + x[0] + ' · ' + esc(x[1]) + '</option>'; }).join('') + '</select>' +
      '<div class="panel-cols">' + '<div>' + f('h-cap', '최대 단체 수용(명)', '300', 'number') + '</div><div><label class="lbl" for="h-ban">연회장</label><select id="h-ban" class="inp"><option value="true">있음</option><option value="false">없음</option></select></div></div>' +
      f('h-cn', '담당자 이름', '') + f('h-ce', '담당자 이메일 (호텔 도메인 권장)', 'sales@hotel.com', 'email') + f('h-cp', '담당자 전화', '+66 ...', 'tel') + f('h-dom', '호텔 웹사이트 도메인', 'hotel.com') +
      '<label class="lbl" for="h-desc">소개 · 확인 메모</label><textarea class="inp" id="h-desc" rows="2" placeholder="예: 세일즈 매니저와 통화로 확인, 2026-10 시찰"></textarea>',
      collect: function (d) {
        var g = function (i) { return d.querySelector('#' + i).value.trim(); };
        var cap = Number(g('h-cap'));
        if (!g('h-name') || !g('h-loc')) return '호텔명과 소재지를 입력해 주세요';
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(g('h-ce'))) return '담당자 이메일을 확인해 주세요';
        if (!(cap > 0)) return '수용 인원을 입력해 주세요';
        var band = cap < 50 ? 'Under 50' : cap < 100 ? '50-99' : cap < 200 ? '100-199' : cap < 300 ? '200-299' : cap < 500 ? '300-499' : '500+';
        return { name: g('h-name'), location: g('h-loc'), regionCode: g('h-rg'), dest: P.regionName(g('h-rg')), cap: cap, capBand: band, banquet: g('h-ban') === 'true', contactName: g('h-cn'), contactEmail: g('h-ce').toLowerCase(), contactPhone: g('h-cp'), domain: g('h-dom').toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, ''), description: g('h-desc') };
      } });
  };
  P.registerHotel = async function (rerender) {
    var v = await P.dlgHotelRegister(); if (!v) return;
    var S = A.data(), me = A.me || {};
    var ok = await A.persist('partner_hotel_register', { p: v }, function () {
      var n = S.partners.length + 1, id = 'PT-2610-' + String(100 + n).slice(-3);
      var flags = []; if (/@(gmail|naver|hotmail|outlook|yahoo|daum)\./.test(v.contactEmail)) flags.push('free_mail'); if (v.domain && v.contactEmail.split('@')[1] !== v.domain) flags.push('domain_mismatch');
      S.partners.push({ id: id, name: v.name, hotelLocation: v.location, dest: v.dest, regionCode: v.regionCode, cap: v.cap, capBand: v.capBand, ballroom: v.banquet, contactName: v.contactName, email: v.contactEmail, contactPhone: v.contactPhone, hotelDomain: v.domain, description: v.description, status: 'pending', appliedAt: A.NOW, check: { url: '', exists: false, affil: '', capOk: false, contactOk: false }, history: [{ t: A.NOW, actor: me.displayName || '파트너', from: null, to: 'pending', memo: '지역 파트너 등록' }], sourcedBy: me.partnerCode || null, approvedVia: null, hqReviewedAt: null, riskFlags: flags });
    });
    if (ok) { rerender(); A.toast('호텔을 등록했습니다. 심사 체크리스트를 채운 뒤 승인하세요', 'ok'); }
  };

  /* ---------- 지역 파트너 조직 (HQ: partner-orgs.html · 파트너: my-org.html) ---------- */
  P.ORG_ST = { onboarding: '온보딩', active: '활성', suspended: '정지', terminated: '종료' };
  P.orgChip = function (st) { var cls = st === 'active' ? 'teal' : st === 'suspended' ? 'red' : st === 'terminated' ? '' : 'amber'; return '<span class="badge ' + cls + '">' + esc(P.ORG_ST[st] || st) + '</span>'; };
  P.USER_ST = { invited: '초대됨', active: '활성', disabled: '비활성' };
  P.ROLE = { operator: '운영자', partner_admin: '파트너 관리자', partner_member: '파트너 담당자' };
  function tsv(v) { return v == null ? null : (typeof v === 'number' ? v : Date.parse(v)); }
  function dtv(v) { var m = tsv(v); return m ? A.fmtDT(m) : '—'; }
  function replaceOrg(o) { var list = A.data().partnerOrgs = A.data().partnerOrgs || []; for (var i = 0; i < list.length; i++) if (list[i].code === o.code) { list[i] = o; return; } list.push(o); }
  P.orgInfoCard = function (o) {
    var hq = A.isOperator();
    return '<section class="card" aria-labelledby="h-oi"><h2 id="h-oi">조직 정보</h2><dl class="kv"><dt>코드</dt><dd class="mono">' + esc(o.code) + '</dd><dt>법인명</dt><dd>' + esc(o.legalName || '') + '</dd><dt>표시명</dt><dd>' + esc(o.displayName || '') + '</dd><dt>호텔에 보이는 이름</dt><dd>' + esc(o.publicName || '') + '</dd><dt>국가 · 시간대</dt><dd>' + esc(o.countryCode || '') + ' · ' + esc(o.timezone || '') + '</dd>' +
      '<dt>담당자</dt><dd>' + esc(o.contactName || '') + ' · ' + esc(o.contactEmail || '') + (o.contactPhone ? ' · ' + esc(o.contactPhone) : '') + '</dd>' +
      '<dt>수익 배분</dt><dd>파트너 ' + (o.sharePct != null ? o.sharePct : '—') + '% · MICEGO ' + (o.sharePct != null ? (100 - Number(o.sharePct)) : '—') + '% · 정산 통화 ' + esc(o.settlementCurrency || '') + '</dd>' +
      '<dt>계약</dt><dd>' + (o.contractRef ? esc(o.contractRef) + ' · ' : '') + (o.contractStart ? String(o.contractStart).slice(0, 10) : '—') + ' ~ ' + (o.contractEnd ? String(o.contractEnd).slice(0, 10) : '—') + (o.dpaSignedAt ? ' · DPA 서명 ' + dtv(o.dpaSignedAt).slice(0, 10) : ' · <span class="warn-cell">DPA 미서명</span>') + '</dd>' +
      '<dt>신규 배정</dt><dd>' + (o.acceptingNew ? '받음' : '<span class="warn-cell">중지</span>') + (o.maxActiveRfps ? ' · 동시 진행 상한 ' + o.maxActiveRfps + '건' : '') + ' · 진행 중 ' + (o.activeRfps || 0) + '건</dd>' +
      '<dt>담당 지역</dt><dd>' + ((o.regions || []).length ? o.regions.map(function (x) { return '<span class="badge ' + (x.active ? (x.primary ? 'teal' : '') : 'red') + '" title="우선순위 ' + x.priority + '">' + esc(x.code) + ' ' + esc(P.regionName(x.code)) + (x.primary ? ' · 주' : ' · 백업') + (x.active ? '' : ' · 비활성') + '</span>'; }).join(' ') : '<span class="muted">없음</span>') + '</dd>' +
      (o.suspendedReason ? '<dt>정지 사유</dt><dd class="warn-cell">' + esc(o.suspendedReason) + '</dd>' : '') + '</dl>' +
      (hq ? '<div class="memo-add" style="gap:6px;flex-wrap:wrap"><button type="button" class="btn sm" data-org="edit">정보 수정</button><button type="button" class="btn sm" data-org="region">지역 설정</button>' + (o.status === 'onboarding' ? '<button type="button" class="btn sm primary" data-org="activate">활성화</button>' : '') + (o.status === 'active' ? '<button type="button" class="btn sm danger" data-org="suspend">정지</button>' : '') + (o.status === 'suspended' ? '<button type="button" class="btn sm primary" data-org="activate">정지 해제</button><button type="button" class="btn sm danger" data-org="terminate">종료</button>' : '') + '</div>' : '') + '</section>';
  };
  P.orgUsersCard = function (o) {
    var hq = A.isOperator(), pa = A.isPartnerAdmin(), me = A.me || {};
    var rows = (o.users || []).map(function (u) {
      var acts = '';
      if ((hq || pa) && u.userId !== me.userId) {
        if (u.status === 'active') acts += '<button type="button" class="btn sm danger" data-usr="disable" data-uid="' + esc(u.userId) + '">비활성</button>';
        if (u.status === 'disabled') acts += '<button type="button" class="btn sm" data-usr="enable" data-uid="' + esc(u.userId) + '">복구</button>';
        if (u.status !== 'disabled' && u.role === 'partner_member') acts += ' <button type="button" class="btn sm" data-usr="promote" data-uid="' + esc(u.userId) + '">관리자로</button>';
        if (u.status !== 'disabled' && u.role === 'partner_admin') acts += ' <button type="button" class="btn sm" data-usr="demote" data-uid="' + esc(u.userId) + '">담당자로</button>';
      }
      return '<tr><td>' + esc(u.displayName || '') + (u.userId === me.userId ? ' <span class="badge">나</span>' : '') + '<div class="small muted">' + esc(u.email || '') + '</div></td><td>' + esc(P.ROLE[u.role] || u.role) + '</td><td><span class="badge ' + (u.status === 'active' ? 'teal' : u.status === 'disabled' ? 'red' : 'amber') + '">' + esc(P.USER_ST[u.status] || u.status) + '</span></td><td class="small muted">' + (u.status === 'invited' ? '초대 ' + dtv(u.invitedAt) : '최근 ' + dtv(u.lastSeenAt)) + '</td><td>' + (acts || '—') + '</td></tr>';
    }).join('');
    var n = (o.users || []).filter(function (u) { return u.status !== 'disabled'; }).length, mx = o.maxAccounts || 10;
    return '<section class="card" aria-labelledby="h-ou"><h2 id="h-ou">계정 <span class="muted small">' + n + ' / ' + mx + '</span></h2><p class="sub">계정은 이메일 초대로만 만듭니다. 초대받은 사람은 메일의 링크에서 비밀번호를 정하면 바로 콘솔을 씁니다.</p><div class="tbl-wrap"><table><thead><tr><th>이름 · 이메일</th><th>역할</th><th>상태</th><th>활동</th><th></th></tr></thead><tbody>' + (rows || '<tr><td colspan="5" class="muted">아직 계정이 없습니다.</td></tr>') + '</tbody></table></div>' +
      ((hq || pa) && o.status !== 'terminated' ? '<div class="memo-add"><button type="button" class="btn primary" data-org="invite"' + (n >= mx ? ' disabled title="계정 상한에 도달했습니다"' : '') + '>계정 초대</button></div>' : '') + '</section>';
  };
  P.dlgOrgEdit = function (o) {
    var f = function (id, lbl, val, type, ph) { return '<label class="lbl" for="' + id + '">' + lbl + '</label><input class="inp" id="' + id + '" type="' + (type || 'text') + '" value="' + esc(val == null ? '' : String(val)) + '" placeholder="' + (ph || '') + '">'; };
    var isNew = !o;
    o = o || {};
    return A.dialog({ title: isNew ? '지역 파트너 등록' : '조직 정보 수정', ok: isNew ? '등록' : '저장', body:
      (isNew ? f('o-code', '코드 (영문 대문자, 변경 불가)', '', 'text', 'TMTHAI') : '') + f('o-legal', '법인명', o.legalName) + f('o-disp', '표시명 (콘솔)', o.displayName) + f('o-pub', '호텔에 보이는 이름', o.publicName, 'text', 'MICEGO Thailand · Tmthai') +
      '<div class="panel-cols"><div>' + f('o-cc', '국가 코드', o.countryCode || 'TH') + '</div><div>' + f('o-tz', '시간대', o.timezone || 'Asia/Bangkok') + '</div></div>' +
      '<div class="panel-cols"><div>' + f('o-pct', '파트너 수익 배분(%)', o.sharePct != null ? o.sharePct : 70, 'number') + '</div><div>' + f('o-ccy', '정산 통화', o.settlementCurrency || 'USD') + '</div></div>' +
      f('o-cn', '담당자 이름', o.contactName) + f('o-ce', '담당자 이메일', o.contactEmail, 'email') + f('o-cp', '담당자 전화', o.contactPhone, 'tel') +
      '<div class="panel-cols"><div>' + f('o-cref', '계약 번호', o.contractRef) + '</div><div>' + f('o-max', '동시 진행 상한 (비우면 없음)', o.maxActiveRfps, 'number') + '</div></div>' +
      '<div class="panel-cols"><div>' + f('o-cs', '계약 시작', o.contractStart ? String(o.contractStart).slice(0, 10) : '', 'date') + '</div><div>' + f('o-cend', '계약 종료', o.contractEnd ? String(o.contractEnd).slice(0, 10) : '', 'date') + '</div></div>' +
      f('o-dpa', 'DPA 서명일', o.dpaSignedAt ? dtv(o.dpaSignedAt).slice(0, 10) : '', 'date') +
      (isNew ? '' : '<label class="chk-row"><input type="checkbox" id="o-acc"' + (o.acceptingNew !== false ? ' checked' : '') + '> 신규 자동 배정 받음</label>'),
      collect: function (d) {
        var g = function (i) { var el = d.querySelector('#' + i); return el ? el.value.trim() : ''; };
        var out = { legalName: g('o-legal'), displayName: g('o-disp'), publicName: g('o-pub'), countryCode: g('o-cc').toUpperCase(), timezone: g('o-tz'), sharePct: Number(g('o-pct')), settlementCurrency: g('o-ccy').toUpperCase(), contactName: g('o-cn'), contactEmail: g('o-ce').toLowerCase(), contactPhone: g('o-cp'), contractRef: g('o-cref'), maxActiveRfps: g('o-max') === '' ? null : Number(g('o-max')), contractStart: g('o-cs') || null, contractEnd: g('o-cend') || null, dpaSignedAt: g('o-dpa') ? g('o-dpa') + 'T00:00:00+09:00' : null };
        if (isNew) { out.code = g('o-code').toUpperCase(); if (!/^[A-Z0-9]{3,12}$/.test(out.code)) return '코드는 영문 대문자·숫자 3–12자입니다'; } else { out.id = o.id; out.acceptingNew = d.querySelector('#o-acc').checked; }
        if (!out.legalName || !out.displayName) return '법인명과 표시명을 입력해 주세요';
        if (!(out.sharePct >= 0 && out.sharePct <= 100)) return '수익 배분은 0–100 사이입니다';
        if (out.contactEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(out.contactEmail)) return '담당자 이메일을 확인해 주세요';
        return out;
      } });
  };
  P.saveOrg = async function (patch, rerender, msg) {
    var S = A.data(), isNew = !patch.id;
    var ok = await A.persist('partner_org_upsert', { p: patch }, function () {
      if (isNew) { S.partnerOrgs.push({ id: 'po-' + patch.code.toLowerCase(), status: 'onboarding', acceptingNew: true, maxAccounts: 10, regions: [], users: [], activeRfps: 0, createdAt: A.NOW, code: patch.code, legalName: patch.legalName, displayName: patch.displayName, publicName: patch.publicName, countryCode: patch.countryCode, timezone: patch.timezone, sharePct: patch.sharePct, settlementCurrency: patch.settlementCurrency, contactName: patch.contactName, contactEmail: patch.contactEmail, contactPhone: patch.contactPhone, contractRef: patch.contractRef, contractStart: patch.contractStart, contractEnd: patch.contractEnd, dpaSignedAt: patch.dpaSignedAt, maxActiveRfps: patch.maxActiveRfps }); }
      else { var o = S.partnerOrgs.filter(function (x) { return x.id === patch.id; })[0]; if (o) for (var k in patch) if (k !== 'id') o[k] = patch[k]; }
    });
    if (ok) { await P.refreshOrg(); rerender(); A.toast(msg || '저장했습니다', 'ok'); }
    return ok;
  };
  P.handleOrgAction = async function (t, o, rerender) {
    var act = t.getAttribute('data-org'), S = A.data();
    if (act === 'edit') { var v = await P.dlgOrgEdit(o); if (v) await P.saveOrg(v, rerender); return; }
    if (act === 'activate') { var ok0 = await A.confirm(o.status === 'onboarding' ? '이 파트너를 활성화합니다. 담당 지역의 새 요청이 자동으로 배정됩니다.' : '정지를 해제합니다. 보류된 건은 자동으로 되돌아가지 않으니 견적 관리에서 재배정하세요.', '활성화'); if (!ok0) return; await P.saveOrg({ id: o.id, status: 'active', suspendedReason: null }, rerender, '활성화했습니다'); return; }
    if (act === 'suspend') { var m = await A.memoDialog('파트너 정지', '정지 사유', '진행 중 위임 건은 본사 개입 목록에 오르고, 파트너 계정은 읽기 전용이 됩니다.', '정지', true); if (m === null) return; await P.saveOrg({ id: o.id, status: 'suspended', suspendedReason: m }, rerender, '정지했습니다'); return; }
    if (act === 'terminate') { var m2 = await A.memoDialog('파트너 종료', '종료 사유', '모든 계정이 비활성화됩니다. 되돌릴 수 없습니다.', '종료', true); if (m2 === null) return; await P.saveOrg({ id: o.id, status: 'terminated', suspendedReason: m2 }, rerender, '종료했습니다'); return; }
    if (act === 'region') {
      var cur = (o.regions || []);
      var v2 = await A.dialog({ title: '담당 지역 설정 · ' + esc(o.displayName), ok: '저장', body: '<p class="sub">국가 코드(TH)를 넣으면 그 나라의 모든 도시를 맡습니다. 한 지역의 "주 담당"은 한 파트너뿐이며, 새로 주 담당으로 지정하면 기존 파트너는 백업으로 내려갑니다.</p><label class="lbl" for="rg-code">지역</label><select id="rg-code" class="inp">' + regionOptions(cur[0] ? cur[0].code : 'TH') + '</select><label class="chk-row"><input type="checkbox" id="rg-primary" checked> 주 담당</label><label class="lbl" for="rg-pri">우선순위 (낮을수록 먼저)</label><input id="rg-pri" class="inp" type="number" value="100"><label class="chk-row"><input type="checkbox" id="rg-active" checked> 활성 (끄면 이 지역 배정을 멈춥니다)</label>',
        collect: function (d) { return { code: d.querySelector('#rg-code').value, primary: d.querySelector('#rg-primary').checked, priority: Number(d.querySelector('#rg-pri').value) || 100, active: d.querySelector('#rg-active').checked }; } });
      if (!v2) return;
      var ok2 = await A.persist('partner_region_set', { p_partner_code: o.code, p_region_code: v2.code, p_is_primary: v2.primary, p_priority: v2.priority, p_active: v2.active, p_force: false }, function () {
        o.regions = (o.regions || []).filter(function (x) { return x.code !== v2.code; }).concat([{ code: v2.code, primary: v2.primary, priority: v2.priority, active: v2.active }]);
        if (v2.primary) S.partnerOrgs.forEach(function (x) { if (x.code !== o.code) (x.regions || []).forEach(function (r) { if (r.code === v2.code) r.primary = false; }); });
      });
      if (ok2) { await P.refreshOrg(); rerender(); A.toast('지역을 저장했습니다', 'ok'); }
      return;
    }
    if (act === 'invite') {
      var hq = A.isOperator();
      var v3 = await A.dialog({ title: '계정 초대 · ' + esc(o.displayName), ok: '초대 메일 보내기', body: '<label class="lbl" for="iv-name">이름</label><input id="iv-name" class="inp"><label class="lbl" for="iv-email">이메일</label><input id="iv-email" class="inp" type="email"><label class="lbl" for="iv-role">역할</label><select id="iv-role" class="inp"><option value="partner_member">파트너 담당자 (요청 운영·견적 대리 입력)</option><option value="partner_admin">파트너 관리자 (+ 호텔 승인·정산·계정)</option></select><p class="small muted" style="margin-top:8px">초대 메일은 MICEGO 이름으로 나가며 72시간 안에 비밀번호를 정해야 합니다.</p>',
        collect: function (d) { var e = d.querySelector('#iv-email').value.trim().toLowerCase(), n = d.querySelector('#iv-name').value.trim(); if (!n) return '이름을 입력해 주세요'; if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return '이메일을 확인해 주세요'; return { email: e, display_name: n, role: d.querySelector('#iv-role').value, partner_code: hq ? o.code : undefined }; } });
      if (!v3) return;
      var ok3 = await A.persist('partner_invite', v3, function () { o.users = (o.users || []).concat([{ userId: 'u-' + Date.now(), role: v3.role, status: 'invited', email: v3.email, displayName: v3.display_name, invitedAt: A.NOW, acceptedAt: null, lastSeenAt: null }]); });
      if (ok3) { await P.refreshOrg(); rerender(); A.toast(v3.email + '(으)로 초대 메일을 보냈습니다', 'ok'); }
      return;
    }
  };
  P.handleUserAction = async function (t, o, rerender) {
    var act = t.getAttribute('data-usr'), uid = t.getAttribute('data-uid');
    var u = (o.users || []).filter(function (x) { return x.userId === uid; })[0]; if (!u) return;
    var reason = null;
    if (act === 'disable') { reason = await A.memoDialog('계정 비활성', '사유', esc(u.displayName || u.email) + ' 계정을 비활성화합니다. 즉시 콘솔 접근이 막힙니다.', '비활성', true); if (reason === null) return; }
    else { var ok = await A.confirm({ enable: '계정을 복구합니다.', promote: '파트너 관리자로 올립니다. 호텔 승인·정산·계정 관리 권한이 생깁니다.', demote: '파트너 담당자로 내립니다.' }[act], '확인'); if (!ok) return; }
    var ok2 = await A.persist('console_user_action', { p_user_id: uid, p_action: act, p_reason: reason }, function () {
      if (act === 'disable') u.status = 'disabled'; if (act === 'enable') u.status = 'active'; if (act === 'promote') u.role = 'partner_admin'; if (act === 'demote') u.role = 'partner_member';
    });
    if (ok2) { await P.refreshOrg(); rerender(); A.toast('처리했습니다', 'ok'); }
  };
  /* api 모드: 조직 상세를 서버에서 다시 읽어 교체 (partner_org_upsert 응답이 전체 조직이므로 persist 의 replaceEntity 대신 사용) */
  P.refreshOrg = function (code) {
    if (!(window.MGA && MGA.mode === 'api')) return Promise.resolve();
    return MGA.call('admin_snapshot', {}).then(function (snap) { if (snap && snap.partnerOrgs) { A.data().partnerOrgs = snap.partnerOrgs; A.save(); } }, function () { });
  };

  return P;
})();
