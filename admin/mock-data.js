/* MICEGO 운영 콘솔 목업 데이터 (전부 가상. 회사·호텔·이메일은 예시입니다) */
(function () {
  function T(s) { return Date.parse(s.replace(' ', 'T') + ':00+09:00'); }
  function H(t, actor, from, to, memo) { return { t: T(t), actor: actor, from: from, to: to, memo: memo || '' }; }

  var partners = [
    { id: 'p1', name: 'Ocean Pearl Resort Da Nang', dest: '다낭', cap: 400, ballroom: true, email: 'events@oceanpearl-danang.example', status: 'approved' },
    { id: 'p2', name: 'Lotus Bay Resort Da Nang', dest: '다낭', cap: 300, ballroom: true, email: 'sales@lotusbay-danang.example', status: 'approved' },
    { id: 'p3', name: 'Sunrise Garden Hotel Da Nang', dest: '다낭', cap: 200, ballroom: false, email: 'groups@sunrisegarden.example', status: 'approved' },
    { id: 'p4', name: 'Marble Coast Resort', dest: '다낭', cap: 500, ballroom: true, email: 'mice@marblecoast.example', status: 'approved' },
    { id: 'p5', name: 'Hoi An Riverside Retreat', dest: '다낭', cap: 120, ballroom: false, email: 'stay@hoianriverside.example', status: 'approved' },
    { id: 'p6', name: 'Coral Crown Resort Da Nang', dest: '다낭', cap: 350, ballroom: true, email: 'events@coralcrown.example', status: 'approved' },
    { id: 'p7', name: 'Chao Phraya Grand Bangkok', dest: '방콕', cap: 600, ballroom: true, email: 'events@chaophrayagrand.example', status: 'approved' },
    { id: 'p8', name: 'Silom Garden Hotel', dest: '방콕', cap: 250, ballroom: true, email: 'groups@silomgarden.example', status: 'approved' },
    { id: 'p9', name: 'Sukhumvit Sky Hotel', dest: '방콕', cap: 150, ballroom: false, email: 'sales@sukhumvitsky.example', status: 'approved' },
    { id: 'p10', name: 'Riverside Orchid Bangkok', dest: '방콕', cap: 400, ballroom: true, email: 'mice@riversideorchid.example', status: 'approved' },
    { id: 'p11', name: 'Ubud Rice Terrace Resort', dest: '발리', cap: 200, ballroom: false, email: 'groups@ubudriceterrace.example', status: 'approved' },
    { id: 'p12', name: 'Nusa Dua Horizon Resort', dest: '발리', cap: 700, ballroom: true, email: 'events@nusaduahorizon.example', status: 'approved' },
    { id: 'p13', name: 'Seminyak Palm Resort', dest: '발리', cap: 300, ballroom: true, email: 'sales@seminyakpalm.example', status: 'approved' },
    { id: 'p14', name: 'Jimbaran Cliff Resort', dest: '발리', cap: 250, ballroom: true, email: 'mice@jimbarancliff.example', status: 'approved' },
    { id: 'p15', name: 'Pearl Island Resort Phu Quoc', dest: '푸꾸옥', cap: 450, ballroom: true, email: 'events@pearlisland-pq.example', status: 'approved' },
    { id: 'p16', name: 'Long Beach Bay Resort', dest: '푸꾸옥', cap: 300, ballroom: true, email: 'groups@longbeachbay.example', status: 'approved' },
    { id: 'p17', name: 'Sao Beach Retreat', dest: '푸꾸옥', cap: 180, ballroom: false, email: 'stay@saobeach.example', status: 'approved' },
    { id: 'p18', name: 'Sanur Lagoon Hotel', dest: '발리', cap: 220, ballroom: true, email: 'sales@sanurlagoon.example', status: 'pending', appliedAt: T('2026-09-29 10:20') },
    { id: 'p19', name: 'Patong Sands Hotel', dest: '방콕', cap: 120, ballroom: false, email: 'groupsales.patongsands@gmail.com', status: 'reviewing', appliedAt: T('2026-10-06 14:05'),
      hotelLocation: '태국 · 방콕', hotelDomain: 'patongsands.example', contactName: 'Somchai P.', contactPhone: '+66 00 000 0019',
      description: '객실 120실 규모의 시티 호텔입니다. 회의실 3개, 단체 조식과 연회 케이터링을 지원합니다.',
      history: [H('2026-10-06 14:05', '시스템', null, 'pending', '신청 접수'), H('2026-10-07 10:10', '운영자', 'pending', 'reviewing', '호텔 대표번호로 소속 확인 중')] },
    { id: 'p20', name: 'Gangneung Sea Hotel', dest: '강릉', cap: 300, ballroom: true, email: 'sales@gangneungsea.example', status: 'rejected', appliedAt: T('2026-10-01 09:30'),
      hotelLocation: '대한민국 · 강릉', hotelDomain: 'gangneungsea.example', contactName: '박세라', contactPhone: '033-000-0020',
      description: '동해안 바다 전망의 비즈니스 호텔입니다. 대연회장과 분과 회의실을 갖추고 있습니다.',
      history: [H('2026-10-01 09:30', '시스템', null, 'pending', '신청 접수'), H('2026-10-02 11:00', '운영자', 'pending', 'rejected', '국내 소재 · 시스템이 결과 메일 발송')] },
    { id: 'p21', name: 'Bangkok Riverfront Suites', dest: '방콕', cap: 180, ballroom: true, email: 'events@riverfrontsuites.example', status: 'suspended', appliedAt: T('2026-07-14 10:00'),
      hotelLocation: '태국 · 방콕', hotelDomain: 'riverfrontsuites.example', contactName: 'Pimchanok S.', contactPhone: '+66 00 000 0021',
      description: '강변 스위트 중심의 호텔입니다. 소규모 연회장과 단체 객실 블록을 운영합니다.',
      history: [H('2026-07-14 10:00', '시스템', null, 'pending', '신청 접수'), H('2026-07-16 15:00', '운영자', 'pending', 'approved', '시스템이 결과 메일 발송'),
        H('2026-09-18 10:30', '운영자', 'approved', 'suspended', '반복 부정확 견적 · 중지 안내 메일은 직접 발송')] },
    { id: 'p22', name: 'Canggu Cliff Resort', dest: '발리', cap: 260, ballroom: false, email: 'groups@cangguclif.example', status: 'pending', appliedAt: T('2026-10-07 11:40'),
      hotelLocation: '인도네시아 · 발리', hotelDomain: 'cangguclif.example', contactName: 'Made Wirawan', contactPhone: '+62 000 0000 0022',
      description: '절벽 위 리조트로 야외 가든 행사에 적합합니다. 단체 객실 260실 규모입니다.',
      history: [H('2026-10-07 11:40', '시스템', null, 'pending', '신청 접수')] }
  ];

  /* 기존 파트너 보강: 누락 필드는 기본값으로 채운다 (기존 값은 건드리지 않음) */
  var LOC = { '다낭': '베트남 · 다낭', '방콕': '태국 · 방콕', '발리': '인도네시아 · 발리', '푸꾸옥': '베트남 · 푸꾸옥', '강릉': '대한민국 · 강릉' };
  var CN = ['Tran Minh Anh', 'Le Hoang Nam', 'Pham Thu Ha', 'Nguyen Van Long', 'Somsak K.', 'Ketut Adi', 'Wayan Sari'];
  function band(c) { return c < 50 ? 'Under 50' : c < 100 ? '50–99' : c < 200 ? '100–199' : c < 400 ? '200–399' : '400+'; }
  partners.forEach(function (p, i) {
    var d = p.email.split('@')[1];
    if (!p.hotelLocation) p.hotelLocation = LOC[p.dest] || p.dest;
    if (!p.hotelDomain) p.hotelDomain = d;
    if (!p.capBand) p.capBand = band(p.cap);
    if (!p.contactName) p.contactName = CN[i % CN.length];
    if (!p.contactPhone) p.contactPhone = '+84 000 000 ' + (1000 + i);
    if (!p.appliedAt) p.appliedAt = T('2026-06-' + (10 + i) + ' 10:00');
    if (!p.description) p.description = '단체·인센티브 전담 세일즈팀이 있으며 연회와 회의 행사를 함께 운영합니다.';
    if (!p.check) p.check = { url: '', exists: false, capOk: false, contactOk: false, affil: '' };
    if (!p.history) {
      var a = p.appliedAt;
      p.history = [{ t: a, actor: '시스템', from: null, to: 'pending', memo: '신청 접수' }];
      if (p.status === 'approved') p.history.push({ t: a + 2 * 864e5, actor: '운영자', from: 'pending', to: 'approved', memo: '시스템이 결과 메일 발송' });
      if (p.status === 'pending') p.history[0].t = a;
    }
    if (p.status === 'pending' && p.history.length > 1) p.history.length = 1;
  });
  partners.filter(function (p) { return p.id === 'p18'; })[0].hotelLocation = '인도네시아 · 발리';
  /* p19 는 신청 이력에서 이미 심사중, 체크리스트는 비어 있음 */

  /* 종료된 과거 RFP 초대 기록 (콘솔에 없는 8~9월 요청, 가상) */
  var invArchive = [
    { rfpId: 'MG-2608-014', round: 1, hotelId: 'p9', invitedAt: T('2026-08-19 15:00'), status: 'expired', submittedAt: null },
    { rfpId: 'MG-2609-003', round: 1, hotelId: 'p9', invitedAt: T('2026-09-04 11:00'), status: 'expired', submittedAt: null },
    { rfpId: 'MG-2609-011', round: 1, hotelId: 'p9', invitedAt: T('2026-09-16 10:30'), status: 'expired', submittedAt: null },
    { rfpId: 'MG-2608-009', round: 1, hotelId: 'p21', invitedAt: T('2026-08-12 10:00'), status: 'submitted', submittedAt: T('2026-08-14 16:00'), inaccurate: true },
    { rfpId: 'MG-2609-006', round: 1, hotelId: 'p21', invitedAt: T('2026-09-07 10:00'), status: 'submitted', submittedAt: T('2026-09-10 11:00'), inaccurate: true },
    { rfpId: 'MG-2609-013', round: 1, hotelId: 'p21', invitedAt: T('2026-09-15 14:00'), status: 'expired', submittedAt: null },
    { rfpId: 'MG-2608-011', round: 1, hotelId: 'p7', invitedAt: T('2026-08-24 10:00'), status: 'submitted', submittedAt: T('2026-08-26 09:30') }
  ];
  var hol = [['2026-01-01', '신정'], ['2026-02-16', '설날 연휴'], ['2026-02-17', '설날'], ['2026-02-18', '설날 연휴'], ['2026-03-02', '삼일절 대체공휴일'], ['2026-05-05', '어린이날'], ['2026-05-25', '부처님오신날 대체공휴일'],
    ['2026-08-17', '광복절 대체공휴일'], ['2026-09-24', '추석 연휴'], ['2026-09-25', '추석'], ['2026-09-26', '추석 연휴'], ['2026-10-03', '개천절'], ['2026-10-05', '개천절 대체공휴일'], ['2026-10-09', '한글날'], ['2026-12-25', '성탄절']]
    .map(function (x) { return { date: x[0], name: x[1] }; });
  var sendLog = [
    ['minsu.park@saegil-travel.example', 'ORG_RECEIVED 접수 확인', '2026-10-08 16:40', 'MG-2610-021', 'sent'],
    ['dy.lee@daehan-pharma.example', 'ORG_RECEIVED 접수 확인', '2026-10-08 09:31', 'MG-2610-020', 'sent'],
    ['seoyeon.choi@barun-travel.example', 'ORG_RECEIVED 접수 확인', '2026-10-07 09:41', 'MG-2610-017', 'sent'],
    ['groups@ubudriceterrace.example', 'HTL_INVITE 초대', '2026-10-02 09:31', 'MG-2610-016', 'sent'],
    ['sales@seminyakpalm.example', 'HTL_INVITE 초대', '2026-10-02 09:31', 'MG-2610-016', 'sent'],
    ['mice@jimbarancliff.example', 'HTL_INVITE 초대', '2026-10-02 09:31', 'MG-2610-016', 'sent'],
    ['groups@ubudriceterrace.example', 'HTL_REMINDER 리마인더', '2026-10-08 09:10', 'MG-2610-016', 'sent'],
    ['events@chaophrayagrand.example', 'HTL_INVITE 초대', '2026-09-30 10:31', 'MG-2610-015', 'sent'],
    ['seojin.yoon@purungil.example', 'ORG_DELIVERED 견적 도착', '2026-10-07 15:21', 'MG-2610-012', 'sent'],
    ['jieun.kim@hanbit-tour.example', 'ORG_RECEIVED 접수 확인', '2026-09-28 10:01', 'MG-2610-014', 'sent'],
    ['events@coralcrown.example', 'HTL_SELECTED_CONNECT 선정 연결 메일', '2026-09-25 10:40', 'MG-2610-009', 'sent', 'sua.im@sejong-medical.example']
  ].map(function (x, i) { return { id: 'l' + (i + 1), to: x[0], template: x[1], at: T(x[2]), rfpId: x[3], status: x[4], cc: x[5] || '' }; });

  function inv(id, hotelId, status, round, o) {
    var p = partners.filter(function (x) { return x.id === hotelId; })[0];
    var x = { id: id, hotelId: hotelId, hotel: p.name, email: p.email, status: status, round: round, viewedAt: null, submittedAt: null, sel: null, note: '' };
    for (var k in (o || {})) x[k] = o[k];
    return x;
  }
  function q(id, invId, round, o) {
    var x = { id: id, invId: invId, round: round, currency: 'USD', twin: null, king: null, tax: '', breakfast: '', validUntil: '', cancel: '', usdRef: '', usdDate: '' };
    for (var k in o) x[k] = o[k];
    return x;
  }

  var rfps = [
    { id: 'MG-2610-021', token: 'mg2610021kq4', state: 'received', round: 1, createdAt: T('2026-10-08 16:40'), verifyingAt: null,
      destination: '방콕', eventType: '인센티브', headcount: 80, start: '2027-02-10', end: '2027-02-13', twin: 35, king: 5, ballroom: '필요 · 환영 만찬',
      publicMemo: '방콕 도심 5성급 선호. 2일차 오후 세미나 30분 진행 예정.',
      rawMemo: '새길여행사 박민수입니다. 임직원 80명 인센티브이고 1인 예산은 130만 원 내외로 생각합니다. 급하면 010-0000-1111 로 연락 주세요.',
      organizer: { company: '새길여행사(주)', contact: '박민수 대리', email: 'minsu.park@saegil-travel.example', phone: '02-000-1111', budget: '1인 130만 원 내외' },
      anonReviewed: false, anonAt: null, deadline: null, invitations: [], quotes: [], connectDone: [],
      history: [H('2026-10-08 16:40', '시스템', null, 'received', '접수 확인 메일 발송 시도(실패 — 발송 실패 목록 참고)')] },

    { id: 'MG-2610-020', token: 'mg2610020ab8', state: 'verifying', round: 1, createdAt: T('2026-10-08 09:30'), verifyingAt: T('2026-10-08 10:00'),
      destination: '발리', eventType: '인센티브', headcount: 70, start: '2027-03-22', end: '2027-03-25', twin: 30, king: 5, ballroom: '불필요',
      publicMemo: '대한제약 임직원 70명 워크숍입니다. 담당 이도윤 대리(010-2345-6789)에게 연락 주세요. 1인 예산 200만 원.',
      rawMemo: '대한제약 임직원 70명 워크숍입니다. 담당 이도윤 대리(010-2345-6789)에게 연락 주세요. 1인 예산 200만 원, 리조트형 선호. 골프 라운드 가능하면 좋겠습니다.',
      organizer: { company: '대한제약(주)', contact: '이도윤 대리', email: 'dy.lee@daehan-pharma.example', phone: '010-2345-6789', budget: '1인 200만 원' },
      anonReviewed: false, anonAt: null, deadline: null, invitations: [], quotes: [], connectDone: [],
      history: [H('2026-10-08 09:30', '시스템', null, 'received', '접수 확인 메일 발송'), H('2026-10-08 10:00', '운영자', 'received', 'verifying')] },

    { id: 'MG-2610-019', token: 'mg2610019zr2', state: 'verifying', round: 1, createdAt: T('2026-10-06 08:50'), verifyingAt: T('2026-10-06 09:00'),
      destination: '발리', eventType: '컨퍼런스', headcount: 150, start: '2027-04-20', end: '2027-04-23', twin: 8, king: 2, ballroom: '필요 · 오프닝 세션',
      publicMemo: '개막 세션에 전체 인원이 모이는 컨퍼런스. 동시통역 부스 설치 가능 여부 확인 희망.',
      rawMemo: '전체 150명 참석, 객실은 우선 10실로 잡아 주세요. 나머지는 추후 확정. 통역 부스 필요.',
      organizer: { company: '누리컨벤션(주)', contact: '정하은 과장', email: 'haeun.jung@nuri-convention.example', phone: '02-000-1234', budget: '미기재' },
      anonReviewed: false, anonAt: null, deadline: null, invitations: [], quotes: [], connectDone: [],
      history: [H('2026-10-06 08:50', '시스템', null, 'received', '접수 확인 메일 발송'), H('2026-10-06 09:00', '운영자', 'received', 'verifying'),
        H('2026-10-07 14:20', '운영자', null, null, '인원 150명 대비 객실 10실로 모순. 이메일로 확인 요청, 회신 대기.')] },

    { id: 'MG-2610-017', token: 'mg2610017hd5', state: 'open', round: 1, createdAt: T('2026-10-07 09:40'), verifyingAt: T('2026-10-07 10:00'),
      destination: '푸꾸옥', eventType: '인센티브', headcount: 120, start: '2027-03-05', end: '2027-03-08', twin: 55, king: 5, ballroom: '필요 · 시상식',
      publicMemo: '해변 리조트 선호. 마지막 날 저녁 시상식(약 120명)을 야외 또는 연회장에서 진행하고 싶습니다.',
      rawMemo: '푸꾸옥 해변 리조트, 마지막 날 저녁 시상식. 예산은 1인 170만 원 정도. 담당: 최서연 팀장.',
      organizer: { company: '바른여행(주)', contact: '최서연 팀장', email: 'seoyeon.choi@barun-travel.example', phone: '02-000-5678', budget: '1인 170만 원 정도' },
      anonReviewed: true, anonAt: T('2026-10-08 11:15'), deadline: null, invitations: [], quotes: [], connectDone: [],
      history: [H('2026-10-07 09:40', '시스템', null, 'received', '접수 확인 메일 발송'), H('2026-10-07 10:00', '운영자', 'received', 'verifying'),
        H('2026-10-08 11:15', '운영자', null, null, '익명화 검토 완료 표시'), H('2026-10-08 11:20', '운영자', 'verifying', 'open')] },

    { id: 'MG-2610-016', token: 'mg2610016wn3', state: 'bidding', round: 1, createdAt: T('2026-09-30 10:10'), verifyingAt: T('2026-09-30 10:30'),
      destination: '발리', eventType: '시상식', headcount: 100, start: '2027-05-12', end: '2027-05-14', twin: 45, king: 5, ballroom: '필요 · 시상식',
      publicMemo: '2박 3일 시상식 겸 워크숍. 야외 정원 만찬 가능 여부 문의.',
      rawMemo: '시상식 100명. 예산 1인 190만 원. 정원 만찬 필수.',
      organizer: { company: '한울프로모션(주)', contact: '오지훈 과장', email: 'jihun.oh@hanul-promotion.example', phone: '02-000-3456', budget: '1인 190만 원' },
      anonReviewed: true, anonAt: T('2026-10-01 10:00'), deadline: T('2026-10-09 12:00'),
      invitations: [
        inv('i1', 'p11', 'viewed', 1, { viewedAt: T('2026-10-05 10:12') }),
        inv('i2', 'p12', 'viewed', 1, { viewedAt: T('2026-10-05 15:40') }),
        inv('i3', 'p13', 'viewed', 1, { viewedAt: T('2026-10-07 09:05') }),
        inv('i4', 'p14', 'invited', 1)],
      quotes: [], connectDone: [],
      history: [H('2026-09-30 10:10', '시스템', null, 'received'), H('2026-09-30 10:30', '운영자', 'received', 'verifying'),
        H('2026-10-01 10:05', '운영자', 'verifying', 'open'), H('2026-10-02 09:30', '운영자', 'open', 'bidding', '초대 4곳 · 마감 10/09(금) 12:00 (현지 주말 회피)'),
        H('2026-10-08 09:10', '시스템', null, null, '마감 24시간 전 리마인더 발송')] },

    { id: 'MG-2610-015', token: 'mg2610015tv6', state: 'bidding', round: 2, createdAt: T('2026-09-21 11:00'), verifyingAt: T('2026-09-21 11:20'),
      destination: '방콕', eventType: '컨퍼런스', headcount: 160, start: '2027-01-26', end: '2027-01-29', twin: 75, king: 5, ballroom: '필요 · 전체 세션',
      publicMemo: '조건 변경: 인원 120명에서 160명으로 늘었습니다. 전체 세션용 연회장이 필요합니다.',
      rawMemo: '인원이 120명에서 160명으로 늘어 재요청합니다. 예산은 1인 150만 원.',
      organizer: { company: '미래에듀(주)', contact: '한도현 과장', email: 'dohyun.han@miraeedu.example', phone: '02-000-7788', budget: '1인 150만 원' },
      anonReviewed: true, anonAt: T('2026-09-22 10:00'), deadline: T('2026-10-13 18:00'),
      invitations: [
        inv('i1', 'p7', 'submitted', 1, { viewedAt: T('2026-09-24 10:00'), submittedAt: T('2026-09-25 14:00') }),
        inv('i2', 'p8', 'submitted', 1, { viewedAt: T('2026-09-24 11:30'), submittedAt: T('2026-09-26 09:40') }),
        inv('i3', 'p10', 'expired', 1),
        inv('i4', 'p7', 'submitted', 2, { viewedAt: T('2026-10-07 10:20'), submittedAt: T('2026-10-07 16:00') }),
        inv('i5', 'p8', 'viewed', 2, { viewedAt: T('2026-10-07 11:00') }),
        inv('i6', 'p10', 'invited', 2)],
      quotes: [
        q('q1', 'i1', 1, { currency: 'USD', twin: 120, king: 135, tax: '포함', breakfast: '포함', validUntil: '2027-02-28', cancel: '입실 30일 전까지 무료 취소' }),
        q('q2', 'i2', 1, { currency: 'THB', twin: 4200, king: 4500, tax: '포함', breakfast: '포함', validUntil: '2027-02-28', cancel: '입실 21일 전까지 무료 취소' }),
        q('q3', 'i4', 2, { currency: 'USD', twin: 128, king: 142, tax: '포함', breakfast: '포함', validUntil: '2027-02-28', cancel: '입실 30일 전까지 무료 취소' })],
      connectDone: [],
      history: [H('2026-09-21 11:00', '시스템', null, 'received'), H('2026-09-21 11:20', '운영자', 'received', 'verifying'),
        H('2026-09-22 10:05', '운영자', 'verifying', 'open'), H('2026-09-22 15:00', '운영자', 'open', 'bidding', '초대 3곳'),
        H('2026-09-29 18:05', '시스템', 'bidding', 'collecting', '마감 경과'), H('2026-09-30 10:30', '운영자', 'collecting', 'bidding', '조건 변경(인원 120→160) → 새 라운드 2. 이전 견적 2건은 이력으로 보관.')] },

    { id: 'MG-2610-013', token: 'mg2610013bl8', state: 'collecting', round: 2, createdAt: T('2026-09-22 09:00'), verifyingAt: T('2026-09-22 09:20'),
      destination: '발리', eventType: '워크숍', headcount: 60, start: '2027-05-19', end: '2027-05-22', twin: 28, king: 2, ballroom: '불필요',
      publicMemo: '발리 3박 4일 임직원 워크숍. 회의실 1개와 조용한 리조트형 숙소를 선호합니다.',
      rawMemo: '소담트래블 배지현 과장. 임직원 60명 워크숍, 1인 예산 210만 원.',
      organizer: { company: '소담트래블(주)', contact: '배지현 과장', email: 'jihyun.bae@sodam-travel.example', phone: '02-000-4321', budget: '1인 210만 원' },
      anonReviewed: true, anonAt: T('2026-09-23 09:30'), deadline: T('2026-10-07 18:00'),
      invitations: [
        inv('i1', 'p11', 'declined', 1, { viewedAt: T('2026-09-24 10:00'), note: '요청 일정에 객실 부족(Dates unavailable)', deadline: T('2026-09-30 18:00') }),
        inv('i2', 'p12', 'expired', 1, { viewedAt: T('2026-09-25 11:00'), deadline: T('2026-09-30 18:00') }),
        inv('i3', 'p13', 'expired', 1, { deadline: T('2026-09-30 18:00') }),
        inv('i4', 'p14', 'expired', 2, { viewedAt: T('2026-10-02 14:00'), deadline: T('2026-10-07 18:00') }),
        inv('i5', 'p12', 'expired', 2, { deadline: T('2026-10-07 18:00') })],
      quotes: [], connectDone: [],
      history: [H('2026-09-22 09:00', '시스템', null, 'received'), H('2026-09-22 09:20', '운영자', 'received', 'verifying'),
        H('2026-09-23 10:00', '운영자', 'verifying', 'open'), H('2026-09-23 15:00', '운영자', 'open', 'bidding', '초대 3곳 · 마감 09/30(수) 18:00'),
        H('2026-09-30 18:10', '시스템', 'bidding', 'collecting', '마감 경과 · 제출 0건 · 미응답 초대 2건 마감 처리'),
        H('2026-10-01 10:30', '운영자', 'collecting', 'bidding', '조건 변경(일정 1주 조정) → 새 라운드 2. 다른 호텔 포함 2곳 재초대.'),
        H('2026-10-07 18:10', '시스템', 'bidding', 'collecting', '마감 경과 · 제출 0건 · 미응답 초대 2건 마감 처리')] },

    { id: 'MG-2610-014', token: 'mg2610014xq7', state: 'collecting', round: 1, createdAt: T('2026-09-28 10:00'), verifyingAt: T('2026-09-28 10:20'),
      destination: '다낭', eventType: '인센티브', headcount: 150, start: '2027-03-15', end: '2027-03-18', twin: 60, king: 20, ballroom: '필요 · 갈라 디너 03-17',
      publicMemo: '해변 리조트 선호. 3월 17일 저녁 갈라 디너(150~199명 규모)를 연회장에서 진행합니다.',
      rawMemo: '150~199명 인센티브. 갈라 디너 3/17. 예산 1인 180만 원, 한빛투어 김지은 과장 담당.',
      organizer: { company: '한빛투어(주)', contact: '김지은 과장', email: 'jieun.kim@hanbit-tour.example', phone: '010-2345-5678', budget: '1인 180만 원' },
      anonReviewed: true, anonAt: T('2026-09-29 10:00'), deadline: T('2026-10-08 18:00'),
      invitations: [
        inv('i1', 'p1', 'submitted', 1, { viewedAt: T('2026-10-01 10:05'), submittedAt: T('2026-10-02 09:30') }),
        inv('i2', 'p2', 'submitted', 1, { viewedAt: T('2026-10-01 14:20'), submittedAt: T('2026-10-06 11:10') }),
        inv('i3', 'p3', 'submitted', 1, { viewedAt: T('2026-10-02 09:00'), submittedAt: T('2026-10-07 16:45') }),
        inv('i4', 'p4', 'expired', 1, { viewedAt: T('2026-10-03 10:00') }),
        inv('i5', 'p5', 'declined', 1, { viewedAt: T('2026-10-01 11:00'), note: '요청 일정에 객실 부족(Dates unavailable)' })],
      quotes: [
        q('q1', 'i1', 1, { currency: 'USD', twin: 145, king: 165, tax: '포함', breakfast: '포함', validUntil: '2027-03-31', cancel: '입실 30일 전까지 무료 취소' }),
        q('q2', 'i2', 1, { currency: 'VND', twin: 3300000, king: 3900000, tax: '13.4% 별도', breakfast: '포함', validUntil: '2027-03-31', cancel: '입실 45일 전까지 무료 취소' }),
        q('q3', 'i3', 1, { currency: 'KRW', twin: 175000, king: 199000, tax: '포함', breakfast: '별도', validUntil: '2027-03-10', cancel: '입실 30일 전까지 무료 취소' })],
      connectDone: [],
      history: [H('2026-09-28 10:00', '시스템', null, 'received'), H('2026-09-28 10:20', '운영자', 'received', 'verifying'),
        H('2026-09-29 10:05', '운영자', 'verifying', 'open'), H('2026-09-30 09:40', '운영자', 'open', 'bidding', '초대 5곳 · 마감 10/08(목) 18:00'),
        H('2026-10-08 18:10', '시스템', 'bidding', 'collecting', '마감 경과 · 미응답 초대 1건 마감 처리')] },

    { id: 'MG-2610-012', token: 'mg2610012pe9', state: 'delivered', round: 1, createdAt: T('2026-09-22 09:30'), verifyingAt: T('2026-09-22 09:50'),
      destination: '푸꾸옥', eventType: '컨퍼런스', headcount: 130, start: '2027-02-02', end: '2027-02-05', twin: 60, king: 5, ballroom: '필요 · 전체 세션',
      publicMemo: '2월 초 컨퍼런스. 전체 세션용 연회장과 분과 회의실 2개가 필요합니다.',
      rawMemo: '컨퍼런스 130명. 예산은 1인 140만 원.',
      organizer: { company: '푸른길컨설팅(주)', contact: '윤서진 과장', email: 'seojin.yoon@purungil.example', phone: '02-000-2468', budget: '1인 140만 원' },
      anonReviewed: true, anonAt: T('2026-09-23 10:00'), deadline: T('2026-10-06 18:00'),
      invitations: [
        inv('i1', 'p15', 'submitted', 1, { viewedAt: T('2026-09-25 10:00'), submittedAt: T('2026-09-30 10:00') }),
        inv('i2', 'p16', 'submitted', 1, { viewedAt: T('2026-09-25 13:00'), submittedAt: T('2026-10-02 15:00') }),
        inv('i3', 'p17', 'submitted', 1, { viewedAt: T('2026-09-26 09:00'), submittedAt: T('2026-10-05 10:00') })],
      quotes: [
        q('q1', 'i1', 1, { currency: 'USD', twin: 155, king: 175, tax: '포함', breakfast: '포함', validUntil: '2027-03-01', cancel: '입실 30일 전까지 무료 취소' }),
        q('q2', 'i2', 1, { currency: 'USD', twin: 148, king: 168, tax: '10% 별도', breakfast: '포함', validUntil: '2027-03-01', cancel: '입실 45일 전까지 무료 취소' }),
        q('q3', 'i3', 1, { currency: 'USD', twin: 160, king: 150, tax: '포함', breakfast: '별도', validUntil: '2027-03-01', cancel: '' })],
      connectDone: [],
      history: [H('2026-09-22 09:30', '시스템', null, 'received'), H('2026-09-22 09:50', '운영자', 'received', 'verifying'),
        H('2026-09-23 10:05', '운영자', 'verifying', 'open'), H('2026-09-24 10:00', '운영자', 'open', 'bidding', '초대 3곳'),
        H('2026-10-06 18:10', '시스템', 'bidding', 'collecting', '마감 경과'), H('2026-10-07 15:20', '운영자', 'collecting', 'delivered', '제안 3건 전달')] },

    { id: 'MG-2610-011', token: 'mg2610011ct1', state: 'rejected', round: 1, createdAt: T('2026-10-01 09:10'), verifyingAt: T('2026-10-01 09:20'),
      destination: '제주', eventType: '워크숍', headcount: 60, start: '2026-12-10', end: '2026-12-11', twin: 30, king: 0, ballroom: '불필요',
      publicMemo: '제주 2일 워크숍.', rawMemo: '제주도 워크숍 60명. 예산 1인 30만 원.',
      organizer: { company: '동행물산(주)', contact: '서민재 주임', email: 'minjae.seo@donghaeng.example', phone: '02-000-9090', budget: '1인 30만 원' },
      anonReviewed: false, anonAt: null, deadline: null, invitations: [], quotes: [], connectDone: [],
      history: [H('2026-10-01 09:10', '시스템', null, 'received'), H('2026-10-01 09:20', '운영자', 'received', 'verifying'),
        H('2026-10-01 09:45', '운영자', 'verifying', 'rejected', '국내 행사(정책 2)')] },

    { id: 'MG-2610-010', token: 'mg2610010dz4', state: 'cancelled', round: 1, createdAt: T('2026-09-28 13:00'), verifyingAt: T('2026-09-28 13:20'),
      destination: '방콕', eventType: '인센티브', headcount: 55, start: '2027-01-12', end: '2027-01-15', twin: 27, king: 1, ballroom: '불필요',
      publicMemo: '방콕 4일 인센티브.', rawMemo: '55명 방콕. 예산 1인 120만 원.',
      organizer: { company: '해오름여행(주)', contact: '강나래 대리', email: 'narae.kang@haeoreum.example', phone: '02-000-1357', budget: '1인 120만 원' },
      anonReviewed: true, anonAt: T('2026-09-29 10:00'), deadline: null, invitations: [], quotes: [], connectDone: [],
      history: [H('2026-09-28 13:00', '시스템', null, 'received'), H('2026-09-28 13:20', '운영자', 'received', 'verifying'),
        H('2026-09-29 10:05', '운영자', 'verifying', 'open'), H('2026-10-02 10:00', '운영자', 'open', 'cancelled', '오거나이저 요청 · 행사 취소로 접수 철회')] },

    { id: 'MG-2610-009', token: 'mg2610009lm2', state: 'won', round: 1, createdAt: T('2026-09-14 10:00'), verifyingAt: T('2026-09-14 10:15'),
      destination: '다낭', eventType: '컨퍼런스', headcount: 90, start: '2026-12-02', end: '2026-12-05', twin: 42, king: 3, ballroom: '필요 · 전체 세션',
      publicMemo: '12월 초 컨퍼런스. 전체 세션용 연회장이 필요합니다.', rawMemo: '컨퍼런스 90명. 예산 1인 160만 원.',
      organizer: { company: '세종메디컬(주)', contact: '임수아 과장', email: 'sua.im@sejong-medical.example', phone: '02-000-8642', budget: '1인 160만 원' },
      anonReviewed: true, anonAt: T('2026-09-15 10:00'), deadline: T('2026-09-21 18:00'),
      invitations: [
        inv('i1', 'p6', 'submitted', 1, { viewedAt: T('2026-09-16 10:00'), submittedAt: T('2026-09-18 15:00'), sel: 'selected' }),
        inv('i2', 'p1', 'submitted', 1, { viewedAt: T('2026-09-16 11:00'), submittedAt: T('2026-09-21 10:00'), sel: 'notselected' }),
        inv('i3', 'p2', 'declined', 1, { viewedAt: T('2026-09-16 12:00'), sel: 'notselected', note: 'Dates unavailable' })],
      quotes: [
        q('q1', 'i1', 1, { currency: 'USD', twin: 138, king: 152, tax: '포함', breakfast: '포함', validUntil: '2026-12-31', cancel: '입실 30일 전까지 무료 취소' }),
        q('q2', 'i2', 1, { currency: 'USD', twin: 149, king: 166, tax: '포함', breakfast: '포함', validUntil: '2026-12-31', cancel: '입실 45일 전까지 무료 취소' })],
      connectDone: ['content', 'cc', 'sent'],
      history: [H('2026-09-14 10:00', '시스템', null, 'received'), H('2026-09-14 10:15', '운영자', 'received', 'verifying'),
        H('2026-09-15 10:05', '운영자', 'verifying', 'open'), H('2026-09-15 15:00', '운영자', 'open', 'bidding', '초대 3곳'),
        H('2026-09-21 18:10', '시스템', 'bidding', 'collecting', '마감 경과'), H('2026-09-22 14:00', '운영자', 'collecting', 'delivered'),
        H('2026-09-25 10:30', '운영자', null, null, 'Coral Crown Resort Da Nang 선정 · 연결 메일 자동 발송(오거나이저 참조)'), H('2026-09-25 10:40', '운영자', 'delivered', 'won')] }
  ];

  /* 초대별 마감: 없으면 요청의 마감으로 채운다. 이전 라운드 초대는 그때의 마감을 따로 둔다 */
  rfps.forEach(function (r) {
    r.invitations.forEach(function (i) {
      if (i.deadline === undefined) i.deadline = (i.round < r.round) ? T('2026-09-29 18:00') : r.deadline;
    });
  });


  /* ---------- 회원 (가상. 이름·회사·주소는 예시입니다) ----------
   * 요청 소유: rfp.ownerId 가 회원 id, null 이면 비회원 접수. 콘솔에 없는 과거 요청은 member.refs 에 요약으로만 둡니다. */
  var OWNER = { 'MG-2610-021': null, 'MG-2610-020': 'm1', 'MG-2610-019': null, 'MG-2610-017': 'm1', 'MG-2610-016': 'm5', 'MG-2610-015': 'm4', 'MG-2610-014': 'm1',
    'MG-2610-013': 'm6', 'MG-2610-012': 'm3', 'MG-2610-011': null, 'MG-2610-010': null, 'MG-2610-009': 'm2' };
  rfps.forEach(function (r) { r.ownerId = OWNER[r.id] || null; });
  /* 성사 요청의 선택 인증 기록 (휴대전화 OTP) */
  rfps.filter(function (r) { return r.id === 'MG-2610-009'; })[0].pickOtp = { at: T('2026-09-25 10:31'), phone: '010-3456-8642' };

  function sess(id, dev, ip, at) { return { id: id, device: dev, ip: ip, at: T(at) }; }
  function acc(at, ip, ua, ok) { return { t: T(at), ip: ip, ua: ua, ok: ok }; }
  var members = [
    { id: 'm1', name: '김지은', company: '한빛투어', orgType: '여행사', email: 'jieun.kim@hanbit-tour.example', phone: '010-2345-5678', state: 'active',
      createdAt: T('2026-08-19 14:22'), emailVerifiedAt: T('2026-08-19 14:25'), phoneVerifiedAt: T('2026-08-19 14:28'), lastLoginAt: T('2026-10-08 09:14'),
      mktEmail: true, mktSms: false, mktAt: T('2026-08-19 14:22'), fails: 0, sends: 0,
      sessions: [sess('s1', 'Chrome · Windows', '203.0.113.24', '2026-10-08 09:14'), sess('s2', 'Safari · iPhone', '198.51.100.7', '2026-10-07 18:02')],
      refs: [{ id: 'MG-2609-006', title: '방콕 · 인센티브', state: 'won', createdAt: T('2026-09-07 10:00') }, { id: 'MG-2609-003', title: '방콕 · 워크숍', state: 'cancelled', createdAt: T('2026-09-04 11:00') }],
      access: [acc('2026-10-08 09:14', '203.0.113.24', 'Chrome · Windows', true), acc('2026-10-07 18:02', '198.51.100.7', 'Safari · iPhone', true), acc('2026-10-06 09:40', '203.0.113.24', 'Chrome · Windows', true), acc('2026-09-28 09:52', '203.0.113.24', 'Chrome · Windows', true), acc('2026-09-12 10:05', '203.0.113.24', 'Chrome · Windows', false), acc('2026-09-12 10:06', '203.0.113.24', 'Chrome · Windows', true), acc('2026-08-19 14:28', '203.0.113.24', 'Chrome · Windows', true)] },
    { id: 'm2', name: '임수아', company: '세종메디컬', orgType: '기업(인하우스)', email: 'sua.im@sejong-medical.example', phone: '010-3456-8642', state: 'active',
      createdAt: T('2026-09-10 11:02'), emailVerifiedAt: T('2026-09-10 11:05'), phoneVerifiedAt: T('2026-09-10 11:08'), lastLoginAt: T('2026-10-01 13:20'),
      mktEmail: false, mktSms: false, mktAt: null, fails: 0, sends: 0,
      sessions: [sess('s3', 'Edge · Windows', '192.0.2.61', '2026-10-01 13:20')], refs: [],
      access: [acc('2026-10-01 13:20', '192.0.2.61', 'Edge · Windows', true), acc('2026-09-25 10:20', '192.0.2.61', 'Edge · Windows', true), acc('2026-09-10 11:08', '192.0.2.61', 'Edge · Windows', true)] },
    { id: 'm3', name: '윤서진', company: '푸른길컨설팅', orgType: '기타', email: 'seojin.yoon@purungil.example', phone: '010-4567-2468', state: 'active',
      createdAt: T('2026-09-22 09:12'), emailVerifiedAt: T('2026-09-22 09:15'), phoneVerifiedAt: T('2026-09-22 09:18'), lastLoginAt: T('2026-10-07 15:30'),
      mktEmail: true, mktSms: true, mktAt: T('2026-09-22 09:12'), fails: 0, sends: 0,
      sessions: [sess('s4', 'Chrome · macOS', '198.51.100.88', '2026-10-07 15:30')], refs: [],
      access: [acc('2026-10-07 15:30', '198.51.100.88', 'Chrome · macOS', true), acc('2026-09-22 09:18', '198.51.100.88', 'Chrome · macOS', true)] },
    { id: 'm4', name: '한도현', company: '미래에듀', orgType: '기업(인하우스)', email: 'dohyun.han@miraeedu.example', phone: '010-5678-7788', state: 'active',
      createdAt: T('2026-09-21 10:40'), emailVerifiedAt: T('2026-09-21 10:43'), phoneVerifiedAt: T('2026-09-21 10:46'), lastLoginAt: T('2026-10-07 10:15'),
      mktEmail: true, mktSms: false, mktAt: T('2026-09-21 10:40'), fails: 1, sends: 0,
      sessions: [sess('s5', 'Chrome · Windows', '192.0.2.140', '2026-10-07 10:15'), sess('s6', 'Chrome · Android', '192.0.2.141', '2026-10-05 08:50')], refs: [],
      access: [acc('2026-10-07 10:15', '192.0.2.140', 'Chrome · Windows', true), acc('2026-10-05 08:50', '192.0.2.141', 'Chrome · Android', true), acc('2026-09-30 10:20', '192.0.2.140', 'Chrome · Windows', false), acc('2026-09-30 10:21', '192.0.2.140', 'Chrome · Windows', true), acc('2026-09-21 10:46', '192.0.2.140', 'Chrome · Windows', true)] },
    { id: 'm5', name: '오지훈', company: '한울프로모션', orgType: '여행사', email: 'jihun.oh@hanul-promotion.example', phone: '010-6789-3456', state: 'locked', lockedAt: T('2026-10-08 17:42'),
      createdAt: T('2026-09-29 16:00'), emailVerifiedAt: T('2026-09-29 16:04'), phoneVerifiedAt: T('2026-09-29 16:09'), lastLoginAt: T('2026-10-05 09:30'),
      mktEmail: false, mktSms: false, mktAt: null, fails: 10, sends: 0, sessions: [], refs: [],
      access: [acc('2026-10-08 17:42', '203.0.113.200', 'Chrome · Windows', false), acc('2026-10-08 17:38', '203.0.113.200', 'Chrome · Windows', false), acc('2026-10-08 17:31', '203.0.113.200', 'Chrome · Windows', false), acc('2026-10-05 09:30', '198.51.100.19', 'Safari · macOS', true), acc('2026-09-29 16:09', '198.51.100.19', 'Safari · macOS', true)] },
    { id: 'm6', name: '배지현', company: '소담트래블', orgType: '여행사', email: 'jihyun.bae@sodam-travel.example', phone: '010-7890-4321', state: 'suspended', suspendedAt: T('2026-09-29 11:05'),
      createdAt: T('2026-09-22 08:50'), emailVerifiedAt: T('2026-09-22 08:53'), phoneVerifiedAt: T('2026-09-22 08:57'), lastLoginAt: T('2026-09-29 10:40'),
      mktEmail: false, mktSms: false, mktAt: null, fails: 0, sends: 0, sessions: [], refs: [],
      access: [acc('2026-09-29 10:40', '192.0.2.77', 'Chrome · Windows', true), acc('2026-09-29 10:12', '203.0.113.9', 'Firefox · Windows', true), acc('2026-09-22 08:57', '192.0.2.77', 'Chrome · Windows', true)] },
    { id: 'm7', name: '이가온', company: '새싹투어', orgType: '여행사', email: 'gaon.lee@saessak-tour.example', phone: '', state: 'pending_email',
      createdAt: T('2026-10-08 18:55'), emailVerifiedAt: null, phoneVerifiedAt: null, lastLoginAt: null,
      mktEmail: false, mktSms: false, mktAt: null, fails: 0, sends: 1, sessions: [], refs: [], access: [] },
    { id: 'm8', name: '정유진', company: '온누리에듀', orgType: '기업(인하우스)', email: 'yujin.jung@onnuri-edu.example', phone: '010-9012-3344', state: 'pending_phone',
      createdAt: T('2026-10-07 11:20'), emailVerifiedAt: T('2026-10-07 11:24'), phoneVerifiedAt: null, lastLoginAt: null,
      mktEmail: true, mktSms: false, mktAt: T('2026-10-07 11:20'), fails: 0, sends: 0, phoneSends: 2, sessions: [], refs: [], access: [] },
    { id: 'm9', name: '', company: '온새미로여행', orgType: '여행사', email: '', phone: '', state: 'withdrawn', withdrawnAt: T('2026-09-30 15:10'),
      createdAt: T('2026-08-10 10:00'), emailVerifiedAt: T('2026-08-10 10:03'), phoneVerifiedAt: T('2026-08-10 10:06'), lastLoginAt: T('2026-09-30 14:50'),
      mktEmail: false, mktSms: false, mktAt: null, fails: 0, sends: 0, sessions: [],
      refs: [{ id: 'MG-2608-011', title: '방콕 · 컨퍼런스', state: 'won', createdAt: T('2026-08-24 09:40') }],
      retained: '성사 연결 기록 1건(회사명·담당자·연락처·선정 호텔·연결 일시)은 분쟁 대응을 위해 2029-09-30까지 보관합니다.',
      access: [acc('2026-09-30 14:50', '203.0.113.55', 'Chrome · Windows', true)] }
  ];
  var shareLinks = [
    { id: 'sl1', rfpId: 'MG-2610-014', memberId: 'm1', token: 'demo-share-2610014', status: 'active', createdAt: T('2026-10-02 10:30'), views: 4, lastViewedAt: T('2026-10-07 16:12') },
    { id: 'sl2', rfpId: 'MG-2610-009', memberId: 'm2', token: 'share-2610009-xk2', status: 'active', createdAt: T('2026-09-22 15:00'), views: 2, lastViewedAt: T('2026-09-24 09:30') },
    { id: 'sl3', rfpId: 'MG-2610-012', memberId: 'm3', token: 'share-2610012-qp7', status: 'revoked', createdAt: T('2026-10-07 15:40'), revokedAt: T('2026-10-07 17:05'), views: 1, lastViewedAt: T('2026-10-07 16:00') },
    { id: 'sl4', rfpId: 'MG-2608-011', memberId: 'm9', token: 'share-2608011-wm3', status: 'disabled', createdAt: T('2026-08-25 10:00'), revokedAt: T('2026-09-30 15:10'), views: 3, lastViewedAt: T('2026-08-27 11:00') }
  ];
  var linkRequests = [
    { id: 'lr1', memberId: 'm1', matchType: '휴대전화 번호 일치', requestedAt: T('2026-10-08 15:48'), status: 'pending',
      ref: { id: 'MG-2609-011', title: '방콕 · 인센티브', state: 'lost', createdAt: T('2026-09-02 10:12') } }
  ];
  var memberAudit = [
    ['a1', 'm1', '2026-08-19 14:28', '시스템', 'signup', '가입 완료(이메일·휴대전화 인증)', '', 'ACC_WELCOME'],
    ['a2', 'm5', '2026-10-08 17:42', '시스템', 'lock', '로그인 실패 10회로 잠금', '1시간 내 10회 실패', 'ACC_LOCKED'],
    ['a3', 'm6', '2026-09-29 11:05', '운영자', 'suspend', '이용 정지', '계정 공유 의심 · 서로 다른 IP 2곳에서 동시 로그인', ''],
    ['a4', 'm9', '2026-09-30 15:10', '운영자', 'withdraw', '탈퇴 처리', '회원 본인 요청(고객센터) · 본인 요청 확인', 'ACC_WITHDRAWN'],
    ['a5', 'm4', '2026-09-30 10:21', '시스템', 'note', '로그인 실패 1회 후 성공', '', '']
  ].map(function (x) { return { id: x[0], memberId: x[1], t: T(x[2]), actor: x[3], action: x[4], label: x[5], reason: x[6], notif: x[7] }; });
  var memberLog = [
    ['ml1', 'm1', '2026-08-19 14:25', 'ACC_EMAIL_CODE 이메일 인증번호', 'jieun.kim@hanbit-tour.example', 'sent'],
    ['ml2', 'm1', '2026-08-19 14:28', 'ACC_WELCOME 가입 완료 안내', 'jieun.kim@hanbit-tour.example', 'sent'],
    ['ml3', 'm5', '2026-10-08 17:42', 'ACC_LOCKED 잠금 안내', 'jihun.oh@hanul-promotion.example', 'sent'],
    ['ml4', 'm7', '2026-10-08 18:55', 'ACC_EMAIL_CODE 이메일 인증번호', 'gaon.lee@saessak-tour.example', 'sent'],
    ['ml5', 'm9', '2026-09-30 15:10', 'ACC_WITHDRAWN 탈퇴 완료 안내', 'onsaemiro.example (파기됨)', 'sent']
  ].map(function (x) { return { id: x[0], memberId: x[1], t: T(x[2]), template: x[3], to: x[4], status: x[5] }; });

  /* ---------- 피드백 (가상. 접수 내용은 예시입니다) ----------
   * MOCK.feedback 은 public.feedback 테이블 행 모양을 그대로 흉내 낸다(스네이크 케이스, SPEC_FEEDBACK.md §2.2).
   * MOCK.feedbackNotes/feedbackEvents 도 각각 feedback_note/feedback_event 행 모양이다.
   * _mockResolve 는 서버 RPC feedback_resolve_rfp() 의 결과를 대신하는 목업 전용 필드다(실제 토큰 해시는 계산하지 않는다). */
  var operators = [
    { id: 'op-ops', name: '안지민', email: 'ops@matchgo.ai' },
    { id: 'op-yjyoo', name: '유예진', email: 'yejin.yoo@matchgo.ai' },
    { id: 'op-shpark', name: '박성훈', email: 'seonghun.park@matchgo.ai' }
  ];
  function fb(o) {
    var d = {
      client_submission_id: 'csid-' + o.id, source: 'widget', subcode: null, priority: null, resolution: null, assignee: null,
      triaged_at: null, started_at: null, done_at: null, body_hash: '0'.repeat(64),
      reply_email: null, reply_consent_at: null, contact_name: null, member_id: null,
      ui_state: null, rfp_ref: null, token_kind: null, token_hash8: null, viewport: '390x844@3',
      ua: 'iOS 17.5 · Safari', referrer: null, last_js_errors: null, tz: 'Asia/Seoul', build_version: '2026.10.08-1',
      submitted_at: null, dwell_ms: 42000, is_demo: false, is_suspect: false, suspect_reasons: [],
      ops_mail_status: 'sent', ops_mail_attempts: 1, ops_mail_error: null, ops_mail_sent_at: null,
      ack_mail_status: 'skipped', ack_mail_attempts: 0, ack_mail_error: null, ack_mail_sent_at: null,
      mail_lease_until: null, updated_at: null, anonymized_at: null, _mockResolve: null
    };
    for (var k in o) d[k] = o[k];
    if (d.submitted_at === null) d.submitted_at = d.created_at;
    if (d.updated_at === null) d.updated_at = d.created_at;
    if (d.reply_email && d.reply_consent_at === null) d.reply_consent_at = d.created_at;
    if (d.reply_email && d.ack_mail_status === 'skipped') d.ack_mail_status = 'sent';
    if (d.ops_mail_sent_at === null && d.ops_mail_status === 'sent') d.ops_mail_sent_at = d.created_at + 30000;
    if (d.ack_mail_sent_at === null && d.ack_mail_status === 'sent') d.ack_mail_sent_at = d.created_at + 45000;
    return d;
  }
  var feedback = [
    fb({ id: 'fb1', ref: 'FB-261008-4K7Q', status: 'new', category: 'SYS', user_type: 'organizer_guest',
      created_at: T('2026-10-08 14:10'),
      content: '트래킹 페이지에서 견적 비교표가 안 열려요. 화면이 하얗게 나옵니다. 사파리에서 확인했는데 다른 기기에서도 똑같았어요.',
      reply_email: 'jieun.kim@hanbit-tour.example', page_path: '/ko/track.html', mode: 'agency', lang: 'ko',
      ui_state: 'delivered', rfp_ref: 'MG-2610-014', token_kind: 'track', token_hash8: 'a1c9de02',
      referrer: '/ko/index.html',
      last_js_errors: [
        { t: '2026-10-08T05:09:40.000Z', m: "Cannot read properties of undefined (reading 'twin')", s: '/assets/track.js', l: '112:9' },
        { t: '2026-10-08T05:09:41.000Z', m: 'NetworkError when attempting to fetch resource.', s: '/assets/track.js', l: '88:12' }
      ],
      _mockResolve: { match: 'verified', candidates: [{ rfp_id: 'MG-2610-014', rfp_ref: 'MG-2610-014', token_kind: 'track', hotel_name: null }] } }),

    fb({ id: 'fb2', ref: 'FB-261008-9M2X', status: 'new', category: 'OPS', user_type: 'hotel',
      created_at: T('2026-10-08 11:20'),
      content: '비딩 페이지에서 견적 제출 버튼을 눌렀는데 "잠시 후 다시 시도해 주세요" 오류가 뜨고 제출이 안 됩니다. 새로고침 후에도 같습니다.',
      reply_email: 'events@chaophrayagrand.example', page_path: '/en/bid.html', mode: 'hotel', lang: 'en',
      ui_state: 'preview:bidding', token_kind: 'bid', token_hash8: '9f86d081', ua: 'Windows · Chrome 129', viewport: '1440x900@1',
      _mockResolve: { match: 'token_only', candidates: [{ rfp_id: 'MG-2610-015', rfp_ref: 'MG-2610-015', token_kind: 'bid', hotel_name: 'Chao Phraya Grand Bangkok' }] } }),

    fb({ id: 'fb3', ref: 'FB-261006-2R8T', status: 'new', category: 'ETC', user_type: 'visitor',
      created_at: T('2026-10-06 09:30'),
      content: '사이트를 처음 써보는데 견적을 어디서 신청하는지 잘 못 찾겠어요. 첫 화면에 안내가 조금 더 있으면 좋겠습니다.',
      page_path: '/ko/index.html', mode: 'root', lang: 'ko', ack_mail_status: 'skipped' }),

    fb({ id: 'fb4', ref: 'FB-261008-7H4W', status: 'new', category: 'SYS', user_type: 'visitor',
      created_at: T('2026-10-08 16:45'),
      content: '여기보다 훨씬 싼 견적 사이트 추천합니다 http://cheap-quote.example http://mice-deal.example http://best-hotel-price.example http://group-tour-sale.example http://resort-discount.example 방문해보세요!',
      page_path: '/ko/index.html', mode: 'root', lang: 'ko', is_suspect: true, suspect_reasons: ['urls'],
      ops_mail_status: 'skipped', ack_mail_status: 'skipped' }),

    fb({ id: 'fb5', ref: 'FB-260930-6D1N', status: 'triaged', category: 'SYS', subcode: 'TEXT', priority: 3, user_type: 'travel_agency',
      created_at: T('2026-09-30 10:00'), triaged_at: T('2026-09-30 11:00'), member_id: 'm1',
      content: "요청 상세 페이지 볼룸 항목에 '연회장이 필요' 처럼 조사가 겹쳐 나옵니다. '연회장 필요'로 고치면 좋겠어요.",
      reply_email: 'jieun.kim@hanbit-tour.example', page_path: '/ko/rfp-detail.html', mode: 'agency', lang: 'ko', ui_state: 'open' }),

    fb({ id: 'fb6', ref: 'FB-261008-3P5J', status: 'in_progress', category: 'SYS', subcode: 'BUG', priority: 1, user_type: 'organizer_guest',
      created_at: T('2026-10-08 14:00'), triaged_at: T('2026-10-08 14:30'), started_at: T('2026-10-08 18:30'), assignee: 'op-ops',
      content: '카카오톡에서 링크를 눌러 들어왔는데 페이지가 하얗게 뜨고 아무것도 안 보입니다. 크롬으로 열면 정상적으로 보여요.',
      reply_email: 'jihun.oh@hanul-promotion.example', page_path: '/ko/track.html', mode: 'agency', lang: 'ko',
      ui_state: 'bidding', rfp_ref: 'MG-2610-016', token_kind: 'track', token_hash8: 'b73ae410', ua: 'Android 14 · Chrome 128 · KakaoTalk',
      _mockResolve: { match: 'verified', candidates: [{ rfp_id: 'MG-2610-016', rfp_ref: 'MG-2610-016', token_kind: 'track', hotel_name: null }] } }),

    fb({ id: 'fb7', ref: 'FB-261007-8W3B', status: 'in_progress', category: 'OPS', subcode: 'RFP', priority: 2, user_type: 'travel_agency',
      created_at: T('2026-10-07 10:00'), triaged_at: T('2026-10-07 10:40'), started_at: T('2026-10-07 11:00'), assignee: 'op-yjyoo',
      content: '제가 보낸 요청번호가 MG-2610-017인데 추적 페이지에는 다른 요청번호가 표시되는 것 같습니다. 확인 부탁드립니다.',
      reply_email: 'jihyun.bae@sodam-travel.example', member_id: 'm6', page_path: '/ko/track.html', mode: 'agency', lang: 'ko',
      ui_state: 'collecting', rfp_ref: 'MG-2610-017', token_kind: 'track', token_hash8: 'a1c9de02',
      _mockResolve: { match: 'mismatch', candidates: [
        { rfp_id: 'MG-2610-017', rfp_ref: 'MG-2610-017', token_kind: null, hotel_name: null },
        { rfp_id: 'MG-2610-014', rfp_ref: 'MG-2610-014', token_kind: 'track', hotel_name: null }
      ] } }),

    fb({ id: 'fb8', ref: 'FB-261001-1Y9C', status: 'on_hold', category: 'SYS', subcode: 'IDEA', priority: 4, user_type: 'hotel',
      created_at: T('2026-10-01 09:00'), triaged_at: T('2026-10-01 09:40'), assignee: 'op-yjyoo',
      content: '비딩 페이지에 통화 단위를 자동으로 바꿔주는 계산기가 있으면 여러 곳에서 요청 견적 낼 때 편할 것 같습니다.',
      reply_email: 'groups@ubudriceterrace.example', page_path: '/en/bid.html', mode: 'hotel', lang: 'en', ui_state: 'bidding' }),

    fb({ id: 'fb9', ref: 'FB-260920-5Q4E', status: 'done', category: 'OPS', subcode: 'ACCT', priority: 3, resolution: 'answered', user_type: 'travel_agency',
      created_at: T('2026-09-20 10:00'), triaged_at: T('2026-09-20 10:30'), started_at: T('2026-09-21 09:00'), done_at: T('2026-09-23 15:00'), assignee: 'op-shpark',
      content: '계정 담당자 연락처를 바꾸고 싶은데 어디서 수정하나요? 회사 이메일 도메인도 함께 바뀌었습니다.',
      reply_email: 'seojin.yoon@purungil.example', member_id: 'm3', page_path: '/ko/account.html', mode: 'agency', lang: 'ko' }),

    fb({ id: 'fb10', ref: 'FB-261004-0Z6F', status: 'done', category: 'SYS', resolution: 'spam', user_type: 'visitor',
      created_at: T('2026-10-04 08:00'), done_at: T('2026-10-04 08:05'),
      content: '★★★ 지금 가입하면 전 상품 반값! 아래 링크에서 바로 확인하세요! 한정 수량! 서두르세요!! ★★★',
      page_path: '/ko/index.html', mode: 'root', lang: 'ko', ops_mail_status: 'skipped', ack_mail_status: 'skipped' }),

    fb({ id: 'fb11', ref: 'FB-261007-6T2K', status: 'new', category: 'OPS', user_type: 'visitor', source: 'contact',
      created_at: T('2026-10-07 09:00'),
      content: '단체 150명 정도 인센티브 여행 견적을 받고 싶은데 회원가입 없이도 진행할 수 있나요? 담당자 연락 부탁드립니다.',
      reply_email: 'minjun.choi@example-corp.example', contact_name: '최민준', page_path: '/ko/contact.html', mode: 'root', lang: 'ko',
      ops_mail_status: 'failed', ops_mail_attempts: 3, ops_mail_error: 'Resend API timeout (3 attempts)', ack_mail_status: 'sent' }),

    fb({ id: 'fb12', ref: 'FB-261008-3D9L', status: 'new', category: 'SYS', user_type: 'organizer_guest',
      created_at: T('2026-10-08 18:00'), is_demo: true,
      content: '데모 화면 확인 중인데 비딩중 단계에서 초대 현황 표가 잘려서 보입니다. 가로 스크롤이 필요해 보여요.',
      page_path: '/ko/bid.html', mode: 'agency', lang: 'ko', ui_state: 'preview:bidding', ops_mail_status: 'skipped' }),

    fb({ id: 'fb13', ref: 'FB-250915-8B4M', status: 'done', category: 'SYS', subcode: 'BUG', priority: 2, resolution: 'fixed', user_type: 'visitor',
      created_at: T('2025-09-15 10:00'), triaged_at: T('2025-09-15 11:00'), started_at: T('2025-09-16 09:00'), done_at: T('2025-09-18 14:00'),
      assignee: 'op-shpark', anonymized_at: T('2025-10-20 00:00'),
      content: '제출 페이지에서 자꾸 오류가 나서 예약을 못했어요. 담당자님께 문의드리려 했는데 연락처는 [email]로 남겨 두었습니다.',
      page_path: '/ko/track.html', mode: 'agency', lang: 'ko', ua: null, viewport: null, tz: null, referrer: null, build_version: null,
      ops_mail_status: 'sent', ack_mail_status: 'skipped' })
  ];
  var feedbackNotes = [
    { id: 1, feedback_id: 'fb8', author: 'op-yjyoo', body: '호텔에 통화 계산기 아이디어는 좋으나 이번 스프린트 범위 밖입니다. 다음 분기 백로그로 보류.', created_at: T('2026-10-02 10:00') },
    { id: 2, feedback_id: 'fb9', author: 'op-shpark', body: '계정 담당자 변경 절차 안내 메일 발송함(도메인 변경 확인 포함).', created_at: T('2026-09-21 09:10') },
    { id: 3, feedback_id: 'fb9', author: 'op-shpark', body: '회신 확인 완료. 담당자 정보 갱신하고 완료 처리.', created_at: T('2026-09-23 14:50') }
  ];
  var feedbackEvents = [
    { id: 1, feedback_id: 'fb5', actor: null, kind: 'status', field: 'status', from_value: null, to_value: 'new', created_at: T('2026-09-30 10:00') },
    { id: 2, feedback_id: 'fb5', actor: 'op-ops', kind: 'triage', field: 'category', from_value: null, to_value: 'SYS·TEXT', created_at: T('2026-09-30 10:55') },
    { id: 3, feedback_id: 'fb5', actor: 'op-ops', kind: 'status', field: 'status', from_value: 'new', to_value: 'triaged', created_at: T('2026-09-30 11:00') },

    { id: 4, feedback_id: 'fb6', actor: null, kind: 'status', field: 'status', from_value: null, to_value: 'new', created_at: T('2026-10-08 14:00') },
    { id: 5, feedback_id: 'fb6', actor: 'op-ops', kind: 'triage', field: 'category', from_value: null, to_value: 'SYS·BUG · P1', created_at: T('2026-10-08 14:25') },
    { id: 6, feedback_id: 'fb6', actor: 'op-ops', kind: 'status', field: 'status', from_value: 'new', to_value: 'triaged', created_at: T('2026-10-08 14:30') },
    { id: 7, feedback_id: 'fb6', actor: 'op-ops', kind: 'triage', field: 'assignee', from_value: null, to_value: '안지민', created_at: T('2026-10-08 18:25') },
    { id: 8, feedback_id: 'fb6', actor: 'op-ops', kind: 'status', field: 'status', from_value: 'triaged', to_value: 'in_progress', created_at: T('2026-10-08 18:30') },

    { id: 9, feedback_id: 'fb7', actor: null, kind: 'status', field: 'status', from_value: null, to_value: 'new', created_at: T('2026-10-07 10:00') },
    { id: 10, feedback_id: 'fb7', actor: 'op-yjyoo', kind: 'triage', field: 'category', from_value: null, to_value: 'OPS·RFP · P2', created_at: T('2026-10-07 10:35') },
    { id: 11, feedback_id: 'fb7', actor: 'op-yjyoo', kind: 'status', field: 'status', from_value: 'new', to_value: 'triaged', created_at: T('2026-10-07 10:40') },
    { id: 12, feedback_id: 'fb7', actor: 'op-yjyoo', kind: 'status', field: 'status', from_value: 'triaged', to_value: 'in_progress', created_at: T('2026-10-07 11:00') },

    { id: 13, feedback_id: 'fb8', actor: null, kind: 'status', field: 'status', from_value: null, to_value: 'new', created_at: T('2026-10-01 09:00') },
    { id: 14, feedback_id: 'fb8', actor: 'op-yjyoo', kind: 'triage', field: 'category', from_value: null, to_value: 'SYS·IDEA · P4', created_at: T('2026-10-01 09:35') },
    { id: 15, feedback_id: 'fb8', actor: 'op-yjyoo', kind: 'status', field: 'status', from_value: 'new', to_value: 'triaged', created_at: T('2026-10-01 09:40') },
    { id: 16, feedback_id: 'fb8', actor: 'op-yjyoo', kind: 'status', field: 'status', from_value: 'triaged', to_value: 'on_hold', created_at: T('2026-10-02 10:00') },

    { id: 17, feedback_id: 'fb9', actor: null, kind: 'status', field: 'status', from_value: null, to_value: 'new', created_at: T('2026-09-20 10:00') },
    { id: 18, feedback_id: 'fb9', actor: 'op-shpark', kind: 'triage', field: 'category', from_value: null, to_value: 'OPS·ACCT · P3', created_at: T('2026-09-20 10:25') },
    { id: 19, feedback_id: 'fb9', actor: 'op-shpark', kind: 'status', field: 'status', from_value: 'new', to_value: 'triaged', created_at: T('2026-09-20 10:30') },
    { id: 20, feedback_id: 'fb9', actor: 'op-shpark', kind: 'status', field: 'status', from_value: 'triaged', to_value: 'in_progress', created_at: T('2026-09-21 09:00') },
    { id: 21, feedback_id: 'fb9', actor: 'op-shpark', kind: 'status', field: 'status', from_value: 'in_progress', to_value: 'done', created_at: T('2026-09-23 15:00') },

    { id: 22, feedback_id: 'fb10', actor: null, kind: 'status', field: 'status', from_value: null, to_value: 'new', created_at: T('2026-10-04 08:00') },
    { id: 23, feedback_id: 'fb10', actor: 'op-ops', kind: 'status', field: 'status', from_value: 'new', to_value: 'done', created_at: T('2026-10-04 08:05') },

    { id: 24, feedback_id: 'fb13', actor: null, kind: 'status', field: 'status', from_value: null, to_value: 'new', created_at: T('2025-09-15 10:00') },
    { id: 25, feedback_id: 'fb13', actor: 'op-shpark', kind: 'status', field: 'status', from_value: 'new', to_value: 'triaged', created_at: T('2025-09-15 11:00') },
    { id: 26, feedback_id: 'fb13', actor: 'op-shpark', kind: 'status', field: 'status', from_value: 'triaged', to_value: 'in_progress', created_at: T('2025-09-16 09:00') },
    { id: 27, feedback_id: 'fb13', actor: 'op-shpark', kind: 'status', field: 'status', from_value: 'in_progress', to_value: 'done', created_at: T('2025-09-18 14:00') },
    { id: 28, feedback_id: 'fb13', actor: null, kind: 'anonymize', field: null, from_value: null, to_value: null, created_at: T('2025-10-20 00:00') }
  ];

  window.MOCK_DATA = {
    tick: 0,
    rfps: rfps,
    partners: partners,
    invArchive: invArchive,
    inaccMarks: {},
    holidays: hol,
    sendLog: sendLog,
    members: members,
    shareLinks: shareLinks,
    linkRequests: linkRequests,
    memberAudit: memberAudit,
    memberLog: memberLog,
    feedback: feedback,
    feedbackNotes: feedbackNotes,
    feedbackEvents: feedbackEvents,
    operators: operators,
    failures: [
      { id: 'f1', to: 'minsu.park@saegil-travel.exampel', template: 'ORG_RECEIVED 접수 확인', at: T('2026-10-08 16:41'), rfpId: 'MG-2610-021', manual: false },
      { id: 'f2', to: 'events@nusaduahorizon.exmaple', template: 'HTL_INVITE 초대', at: T('2026-10-05 15:31'), rfpId: 'MG-2610-016', manual: false }
    ],
    metrics: {
      month: '2026-09', base: 9,
      items: [
        { key: 'sla', name: 'SLA 준수율', value: '89%', sub: '9건 중 8건', target: '기준 90% 이상', met: false },
        { key: 'rej', name: '반려율', value: '22%', sub: '국내 행사 1 · 일정 미확정 1', target: '사유별로 추적 (국내 행사가 늘면 랜딩 문구 점검)', met: null },
        { key: 'lead', name: '접수→전달 소요일', value: '6영업일', sub: '중앙값', target: '기준 7영업일 이하', met: true },
        { key: 'resp', name: '호텔 응답률', value: '63%', sub: '제출 또는 거절 (마감 제외)', target: '기준 60% 이상', met: true },
        { key: 'view', name: '호텔 열람률', value: '81%', sub: '열람 이상', target: '낮으면 메일 제목·발신자 점검', met: null },
        { key: 'quotes', name: '요청당 제출 견적', value: '2.7건', sub: '전달 시점 평균', target: '기준 3건 이상', met: false },
        { key: 'won', name: '성사율', value: '40%', sub: '전달됨 중 성사', target: '추적만 합니다', met: null },
        { key: 'partner', name: '파트너 심사 준수율', value: '100%', sub: '5영업일 안 승인/거절', target: '기준 100%', met: true },
        { key: 'fail', name: '발송 실패', value: '2건', sub: 'notification.failed', target: '기준 0건', met: false }
      ]
    }
  };
})();
