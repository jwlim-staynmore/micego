# -*- coding: utf-8 -*-
"""docs/sitemap.html — 전체 사이트맵 + 서비스 오픈 전 프론트엔드 미구현 항목 (v1.0)"""
import html, os, re, json
ROOT = os.getcwd()  # WP2: outputs stay relative to the cwd so a build can run inside a copied directory
VER = 'v1.2'; DATE = '2026-09-27'

def e(s): return html.escape(s, quote=False)

# ------------------------------------------------------------------ 1. 사이트맵
# (경로, 제목, 용도, 접근, 색인, 데모 상태/변형, 백엔드 연동)
ACC = {'pub': ('공개', 'org'), 'tok': ('토큰 링크', 'sys'), 'mem': ('로그인', 'op'), 'ops': ('운영자', 'hot'), 'int': ('내부 문서', 'org')}
SITE = [
 ('허브', [
  ('index.html', '모드 선택 홈', "'여행사 / Hotels' 두 모드 선택 화면. 언어·역할 분기의 시작점", 'pub', '색인', '—', '없음'),
 ]),
 ('여행사 모드 (ko/, 한국어)', [
  ('ko/index.html', '여행사 랜딩 + 견적 요청 폼', '문제·동작 방식·대상·이용 조건·FAQ 요약, #register 견적 요청 폼(비회원 제출 가능, 로그인 시 자동 입력)', 'pub', '색인', '로그인 전/후 2변형', '폼 제출 API'),
  ('ko/about.html', '서비스 소개', '운영 방식·정책·운영사 소개', 'pub', '색인', '—', '없음'),
  ('ko/faq.html', '자주 묻는 질문', '이용 조건·진행·회원 그룹', 'pub', '색인', '—', '없음'),
  ('ko/contact.html', '문의하기', '문의 폼 + 메일 주소', 'pub', '색인', '—', '폼 제출 API'),
  ('ko/terms.html', '이용약관(초안)', '10개 조항 요약. 전문은 법무 검토 후 교체', 'pub', '색인', '—', '없음'),
  ('ko/privacy.html', '개인정보처리방침', '수집 항목·목적·보유 기간·제3자 제공·회원 항목', 'pub', '색인', '—', '없음'),
  ('ko/track.html?t=…', '견적 진행 상황(요청자 전용)', '접수→비교표→선정까지 상태별 화면, 제안 비교, 제안 선택(휴대전화 인증), 조건 변경, 동료 공유 링크 발급', 'tok', 'noindex', '11 상태 + 공유 보기(?s=)', '토큰별 데이터, 선택 RPC, OTP, 공유 링크'),
  ('ko/signup.html', '회원가입', '기본 정보 → 이메일 인증번호 → 휴대전화 인증번호 3단계', 'pub', '색인', '12 상태', '가입·인증 API'),
  ('ko/login.html', '로그인', '이메일·비밀번호, 로그인 유지, ?next= 복귀', 'pub', '색인', '6 상태', '인증 API'),
  ('ko/reset.html', '비밀번호 재설정', '요청 → 메일 링크(?k=) → 새 비밀번호', 'pub', 'noindex', '5 상태', '인증 API'),
  ('ko/my.html', '내 견적 요청', '진행 중/종료 목록, 열기, 공유 링크, 이전 요청 연결 배너', 'mem', 'noindex', '5 상태', '회원 데이터 API'),
  ('ko/account.html', '계정 설정', '담당자 정보, 이메일·휴대전화 변경(재인증), 비밀번호, 알림 수신, 로그인 기기', 'mem', 'noindex', '6 상태', '회원 데이터 API'),
  ('ko/withdraw.html', '회원 탈퇴', '안내·차단 사유·확인·완료', 'mem', 'noindex', '4 상태', '회원 데이터 API'),
 ]),
 ('호텔 모드 (en/, 영어)', [
  ('en/index.html', 'Partner landing + Register', 'Why partner·How it works·Sample·Partner terms(#terms)·FAQ, #register 파트너 등록 폼', 'pub', '색인', '—', '폼 제출 API'),
  ('en/sample-request.html', 'Sample request', '호텔이 받게 될 요건서·견적 폼 예시', 'pub', '색인', '—', '없음'),
  ('en/bid.html?t=…', 'Request & quote(초대 호텔 전용)', '요건서 열람, 견적 제출, 거절, 결과 확인', 'tok', 'noindex', '8 상태', '토큰별 데이터, 견적 제출·거절 RPC'),
  ('en/faq.html', 'Hotel FAQ', '파트너 조건·비딩·선정 결과', 'pub', '색인', '—', '없음'),
  ('en/contact.html', 'Contact', '문의 폼 + 메일 주소', 'pub', '색인', '—', '폼 제출 API'),
  ('en/privacy.html', 'Privacy notice', '호텔 파트너·담당자 정보 처리', 'pub', '색인', '—', '없음'),
 ]),
 ('운영 콘솔 (admin/, 한국어 · 운영자 전용)', [
  ('admin/index.html', '로그인', '운영자 로그인(현재 데모: 값만 있으면 통과)', 'ops', 'robots 차단', '—', 'Supabase Auth + role'),
  ('admin/dashboard.html', '대시보드', 'SLA 임박·상태별 건수·심사 지연·회원 카드', 'ops', 'robots 차단', '—', 'DB 조회'),
  ('admin/rfps.html', '견적 요청 목록', '리스트/칸반, 상태·SLA 필터', 'ops', 'robots 차단', '—', 'DB 조회'),
  ('admin/rfp.html?id=…', '견적 요청 상세', '상태 전이(가드), 초대·재초대, 라운드, 선정, 회원·공유 링크·선정 인증 표시, 알림 로그', 'ops', 'robots 차단', '10 상태', 'DB + 상태전이 RPC + 알림 발송'),
  ('admin/partners.html', '호텔 파트너 목록', '심사 대기·승인·정지, 심사 기한', 'ops', 'robots 차단', '—', 'DB 조회'),
  ('admin/partner.html?id=…', '파트너 상세', '심사 승인/반려/정지/복구, 초대 이력', 'ops', 'robots 차단', '5 상태', 'DB + 알림 발송'),
  ('admin/members.html', '회원 목록', '검색, 상태 칩, 요청 수·마지막 로그인', 'ops', 'robots 차단', '—', 'DB 조회'),
  ('admin/member.html?id=…', '회원 상세', '잠금 해제·정지·이관·연결 요청 승인·탈퇴 처리(사유 필수), 접속 기록, 감사 로그', 'ops', 'robots 차단', '6 상태', 'DB + 감사 로그 + 알림 발송'),
  ('admin/feedback.html', '피드백 목록', '의견·VOC 접수 목록, 상태·우선순위·유형 필터, 주간 정리 프리셋, SLA 지연 배지', 'ops', 'robots 차단', '—', 'DB 조회'),
  ('admin/feedback-detail.html?id=…', '피드백 상세', '분류·우선순위·담당·상태 전이(가드), 메모, 컨텍스트(페이지·상태·요청 연결·브라우저·오류), 메일 상태·재발송', 'ops', 'robots 차단', '—', 'DB + RPC feedback_set_status + Edge Function'),
  ('admin/settings.html', '설정', '공휴일·규칙·알림·계정·시스템 상태·전제 조건 6탭', 'ops', 'robots 차단', '—', 'DB(설정값)'),
 ]),
 ('내부 문서 (docs/, emails/)', [
  ('docs/state-transitions.html', '상태전이표 v1.7', 'RFP·초대·파트너·회원·공유 링크·피드백 상태 머신과 알림 ID', 'int', 'noindex', '—', '—'),
  ('docs/notification-library.html', '알림 라이브러리', '이메일 29종·알림톡 9종·SMS 2종·운영자 수동 문안, JSON·CSV 동봉', 'int', 'noindex', '—', '—'),
  ('docs/sitemap.html', '사이트맵 · 오픈 전 점검(이 문서)', '전체 페이지 목록과 미구현 항목', 'int', 'noindex', '—', '—'),
  ('emails/*.html (29)', '이메일 템플릿', 'ORG 8 · HTL 5 · PTN 4 · ACC 10 · FB 2 — {{변수}} 치환 전 원본', 'int', 'robots 차단', '—', '템플릿 엔진 + 발송'),
 ]),
 ('시스템 파일', [
  ('assets/feedback.js (모든 페이지)', '의견 보내기 위젯', '우하단 고정 버튼 → 유형·내용·회신 이메일 입력, 페이지·상태·요청번호·브라우저·최근 오류 자동 첨부. Supabase 미설정 시 문의 페이지 링크로 대체', 'pub', '—', 'closed·open·submitting·done·error', 'Edge Function feedback-submit'),
  ('robots.txt', 'robots', 'admin/, docs/, emails/, 토큰·회원 페이지 차단', 'pub', '—', '—', '—'),
  ('og/og-hub.png · og-ko.png · og-en.png', 'OG 이미지', '공유 미리보기 이미지(1200×630)', 'pub', '—', '—', '절대 URL 필요'),
 ]),
]

# ------------------------------------------------------------------ 2. 미구현 항목
# (영역, 항목, 현재 상태, 오픈 조건, 우선순위, 담당 축)
P = {'A': ('오픈 차단', 'hot'), 'B': ('오픈 전 필수', 'sys'), 'C': ('오픈 직후', 'op'), 'D': ('결정 필요', 'org')}
GAPS = [
 ('백엔드 연동 (프론트에 이미 자리만 있음)', [
  ('견적 요청 폼 제출', 'ko/index.html — mailto + 복사 폴백(임시방편). 카카오 인앱 브라우저·메일 앱 없는 기기에서는 전달되지 않음', 'API 제출로 교체, 접수 번호(REF)·추적 링크를 응답으로 받아 완료 화면에 표시', 'A', 'FE+BE'),
  ('호텔 파트너 등록 폼', 'en/index.html#register — mailto', 'API 제출, 접수 확인 메일(PTN_APPLIED) 자동 발송', 'A', 'FE+BE'),
  ('호텔 견적 제출·거절', 'en/bid.html — mailto, 요건서·호텔·마감이 예시 데이터로 고정', '토큰으로 요건서 조회, 견적 제출·수정·거절 RPC, 마감 뒤 잠금', 'A', 'FE+BE'),
  ('견적 진행 상황 페이지', 'ko/track.html — 11개 상태 화면은 완성, 데이터는 예시 고정', '토큰 조회 API로 상태·일정·비교표 채우기, 만료·폐기 토큰은 invalid 처리', 'A', 'FE+BE'),
  ('제안 선택 + 휴대전화 인증', 'track.html — 인증번호 UI 완성, 확정 버튼은 mailto', 'OTP 발송·검증·select_proposal RPC로 교체. JS 꺼진 환경의 mailto 경로는 서버에서 OTP 강제', 'A', 'FE+BE'),
  ('조건 변경·비교표 문의', 'track.html — mailto 링크', '요청 내 메시지 폼 또는 최소한 서버 접수 API', 'B', 'FE+BE'),
  ('동료 공유 링크', 'my.html·track.html — 발급·끄기 UI는 데모', '공유 토큰 발급·폐기·만료(종료+30일) API, ?s= 조회 시 보기 전용 강제', 'B', 'FE+BE'),
  ('회원 가입·로그인·재설정', 'signup/login/reset — 화면·검증·타이머 완성, 인증번호는 123456 고정, 세션은 sessionStorage 데모', 'Supabase Auth(이메일) + 자체 휴대전화 OTP 테이블 + 국내 SMS 대행사. 잠금·쿨다운·재발송 한도는 서버에서 집행', 'A', 'FE+BE'),
  ('내 견적 요청·계정 설정·탈퇴', 'my/account/withdraw — 예시 데이터', '회원 데이터 API, 이메일·휴대전화 변경 재인증, 탈퇴 차단 규칙 서버 검증', 'A', 'FE+BE'),
  ('문의 폼', 'ko/en contact.html — mailto', '폼 백엔드(API 또는 폼 서비스)로 교체', 'B', 'FE+BE'),
  ('운영 콘솔 로그인', 'admin/index.html — 값만 있으면 통과', 'Supabase Auth + app_metadata.role=operator 확인, 세션 만료', 'A', 'FE+BE'),
  ('운영 콘솔 데이터', 'mock-data.js 고정 데이터, 데모 시계 2026-10-08 19:30', 'DB 조회·상태전이 RPC·감사 로그 저장, 실제 시각으로 SLA 계산', 'A', 'FE+BE'),
  ('알림 실제 발송', '상태전이 시 알림 로그만 기록', '이메일 발송(SES/Resend 등) + 템플릿 변수 치환, 알림톡 프로필·템플릿 검수, SMS 발신번호 사전등록·대행사 계약', 'A', 'BE+운영'),
 ]),
 ('만들지 않은 페이지·요소', [
  ('404 · 오류 페이지', '없음. 잘못된 주소는 호스팅 기본 화면', '두 모드 공용 404(한/영 병기) + 500 안내. 토큰 페이지의 invalid 상태와 구분', 'B', 'FE'),
  ('sitemap.xml', '없음', '공개 페이지 15개만 포함, 토큰·회원·admin 제외. 도메인 확정 후 생성', 'B', 'FE'),
  ('en/terms.html (Partner terms 독립 페이지)', '랜딩 #terms 요약 카드만 있음. 견적 폼 동의 문구가 이 앵커로 링크', '파트너 약관 전문 페이지 + bid.html 동의 링크 교체', 'B', 'FE+법무'),
  ('호텔 수신 거부(unsubscribe) 페이지', 'HTL_INVITE·HTL_REMINDER 메일에 {{UNSUBSCRIBE_URL}} 링크가 있으나 목적지 없음', '토큰 기반 수신 거부 확인 페이지(en/unsubscribe.html?t=) + 파트너 상태 연동', 'B', 'FE+BE'),
  ('favicon.ico · apple-touch-icon', 'data: SVG 아이콘만 있음. iOS Safari·카카오 인앱·홈 화면 추가에서는 표시되지 않음', 'favicon.ico(32) + apple-touch-icon.png(180) + 필요 시 manifest', 'B', 'FE'),
  ('이메일 열람용 웹 버전', '없음', '선택. 메일 렌더링 문제 대응용 "브라우저에서 보기"', 'C', 'FE'),
  ('파트너 신청 상태 확인', 'PTN_APPLIED 메일 뒤 호텔이 상태를 볼 곳이 없음(결과 메일만)', '선택. 토큰 링크로 신청 상태 표시', 'C', 'FE+BE'),
 ]),
 ('피드백·VOC 창구 (2026-09-27 추가)', [
  ('의견 보내기 위젯 + 문의 폼 통합', '모든 페이지 우하단 버튼, 페이지·상태·오류 자동 첨부, 접수번호 발급, 확인 메일', '코드 완료. Supabase 배포 + FEEDBACK_* 환경변수 + Resend 도메인 인증 후 동작', 'B', 'FE+BE'),
  ('피드백 운영 콘솔', 'admin/feedback·feedback-detail — 분류·우선순위·담당·상태 전이·메모·메일 재발송', '코드 완료(데모 데이터). DB 배포 후 실데이터', 'B', 'FE+BE'),
  ('VOC 처리 SOP·CX 응대', '일일 트리아지 10:00·16:00, 주간 정리 월 11:00, P1 4영업시간 착수, 답변 템플릿 4종', '문서 완료(프로젝트 문서 micego-voc-sop-cx-v1). 운영 시작 시 적용', 'B', '운영'),
 ]),
 ('데모 흔적 제거', [
  ('DEMO 띠·상태 미리보기 스위처', '공개 페이지 15개에 노출', '빌드 플래그로 제거(?state= 미리보기는 스테이징에서만 허용)', 'B', 'FE'),
  ('sessionStorage 데모 세션', '헤더 로그인 링크·랜딩 자동 입력·회원 페이지가 데모 세션을 봄', '실제 세션(Supabase)으로 교체, 데모 코드 삭제', 'A', 'FE'),
  ('예시 데이터·고정 날짜', 'REF MG-2610-014, 김지은 과장, 호텔 A·B·C, 2026-10 일정, 환율', '서버 데이터로 대체. 예시 값이 남는 곳이 없도록 빌드 검사', 'A', 'FE'),
  ('임시 메일 주소', 'mysteri1984@gmail.com이 폼·푸터·약관·문의에 노출', '공식 도메인 메일(예: hello@micego.kr, privacy@…)로 일괄 교체', 'A', 'FE+운영'),
  ('이메일 템플릿 BASE_URL', 'https://micego.example', '실제 도메인으로 교체 후 재생성', 'A', 'BE'),
 ]),
 ('도메인 · SEO · 메타', [
  ('도메인 확정', 'micego.kr로 가정한 canonical·hreflang이 주석 처리됨(TODO(domain) 14개 파일)', '도메인 확정 → 주석 해제, og:image 절대 URL, robots Sitemap 줄 추가', 'A', '운영+FE'),
  ('구조화 데이터', '없음', '선택. Organization·FAQPage JSON-LD', 'C', 'FE'),
  ('분석 도구', 'GA4·네이버 애널리틱스 등 없음', '전환(견적 요청 제출·파트너 등록·가입 완료) 이벤트 설계 후 삽입. 토큰·회원 페이지는 제외하거나 마스킹', 'B', 'FE'),
  ('네이버 서치어드바이저·구글 서치콘솔 인증', '없음', '도메인 확정 후 메타 태그 삽입', 'B', '운영'),
 ]),
 ('법무 · 사업자 정보', [
  ('이용약관 전문', 'ko/terms.html은 10개 조항 요약 초안', '전문 작성·법무 검토 후 교체(TODO(legal))', 'A', '법무'),
  ('개인정보처리방침 확정', 'TODO(legal) 5건 — 제3자 제공·국외 이전 고지 항목, 보관 기간, SMS 수탁사, 개정일', '법무 검토 후 문구 확정, en/privacy.html 동기화', 'A', '법무'),
  ('사업자 정보', '상호·대표자·사업자등록번호·주소·개인정보 보호책임자 미기재(TODO(operator) — about·privacy·terms)', '확정 후 푸터·약관·방침에 기재', 'A', '운영'),
  ('휴대전화 인증 범위 표기', '소유 확인이며 본인확인 아님 — 약관·방침에 반영됨', '법무 확인만', 'B', '법무'),
 ]),
 ('품질 · 호환 · 보안(프론트 측)', [
  ('카카오톡 인앱 브라우저 검증', '알림톡 링크는 카카오 인앱에서 열림. mailto·clipboard가 동작하지 않는 대표 환경', '백엔드 연동 후 실기기 검증(안드로이드·iOS), 외부 브라우저 열기 안내 불필요하게', 'B', 'QA'),
  ('폰트 CDN 의존', 'Pretendard(jsdelivr)·Archivo/JetBrains Mono(Google Fonts) 외부 로드. 차단 환경에서 시스템 폰트로 대체됨', '자체 호스팅 + preload, font-display 확인', 'C', 'FE'),
  ('보안 헤더', 'CSP·HSTS·X-Frame-Options 없음(호스팅 설정 영역)', '정적 호스팅에서 헤더 설정, 토큰 페이지 no-referrer 유지', 'B', '운영+FE'),
  ('토큰·상태 검증', '토큰 형식·상태는 클라이언트에서만 검사', '서버가 토큰 소유·만료·상태를 판정, 클라이언트 검사는 보조', 'A', 'BE'),
  ('접근성 실기기 검수', '자동 검사(포커스·라벨·대비·오버플로)만 통과', '스크린리더(TalkBack·VoiceOver) 1회 검수, 인증번호 입력·타이머 aria-live 확인', 'C', 'QA'),
  ('브라우저 매트릭스', 'Chromium만 자동 검증', '삼성 인터넷·iOS Safari·카카오 인앱·Whale 수동 검수', 'B', 'QA'),
 ]),
 ('결정이 필요한 항목 (unknown unknowns)', [
  ('첨부파일', 'RFP(행사 계획서·좌석 배치)·호텔 견적(PDF·연회장 도면)에 파일 첨부 필드가 없음', '필요하면 스토리지·바이러스 검사·용량 정책이 붙는 별도 작업. 없으면 "메일로 별도 전달" 문구로 고정', 'D', '결정'),
  ('호텔 마감 시각 현지 시간 병기', 'bid.html은 KST만 표기', '베트남·태국 호텔용으로 현지 시각 병기 여부', 'D', '결정'),
  ('견적 요청 수정', '제출 뒤 요청자가 내용을 고칠 화면이 없음(조건 변경은 메일)', '회원 my.html에서 "요건 확인 중"까지는 수정 허용할지', 'D', '결정'),
  ('운영자 계정 발급 방식', '설정 > 계정 탭 UI만 있음', '초대 메일 방식인지, Supabase 대시보드에서 수동 생성인지', 'D', '결정'),
  ('지역 운영 파트너(70:30) 콘솔 접근', '미결(이전 회차)', '파트너가 콘솔을 쓰면 권한·데이터 범위 설계가 추가됨', 'D', '결정'),
 ]),
]

def acc_tag(k): t, c = ACC[k]; return '<span class="tag %s">%s</span>' % (c, t)
def pri_tag(k): t, c = P[k]; return '<span class="tag %s">%s · %s</span>' % (c, k, t)

def site_rows(items):
    return ''.join('<tr><td class="nw"><code>%s</code></td><td><b>%s</b><div class="small">%s</div></td><td class="nw">%s</td><td class="nw">%s</td><td class="nw">%s</td><td>%s</td></tr>' % (e(p), e(t), e(u), acc_tag(a), e(i), e(st), e(be)) for p, t, u, a, i, st, be in items)
# 진행 상태 배지 — A·B 제작(2026-09-26) 반영
_B = lambda bg, fg, t: ' <span style="display:inline-block;margin-left:6px;padding:2px 7px;border-radius:4px;background:%s;color:%s;font-size:11px;font-weight:700;white-space:nowrap">%s</span>' % (bg, fg, t)
ST_DONE = _B('#DCFCE7', '#166534', '구현됨 · 설정 필요')          # 코드 완료, site.config.json 값만 채우면 동작
ST_BE   = _B('#DBEAFE', '#1E40AF', '코드 완료 · 배포 필요')       # supabase/ 코드·테스트 완료, 프로젝트 생성·배포 필요
ST_EXT  = _B('#FEF3C7', '#92400E', '외부 작업')                  # 법무·계약·실기기 검수 등 코드 밖
ST_PART = _B('#EDE9FE', '#5B21B6', '일부 구현')
STATUS = {
  # 백엔드 연동 — FE는 API 모드로 전환 완료(폴백 유지), BE는 supabase/ 에 코드·테스트 완료
  '견적 요청 폼 제출': ST_BE, '호텔 파트너 등록 폼': ST_BE, '호텔 견적 제출·거절': ST_BE, '견적 진행 상황 페이지': ST_BE,
  '제안 선택 + 휴대전화 인증': ST_BE, '조건 변경·비교표 문의': ST_BE, '동료 공유 링크': ST_BE, '회원 가입·로그인·재설정': ST_BE,
  '내 견적 요청·계정 설정·탈퇴': ST_BE, '문의 폼': ST_BE, '운영 콘솔 로그인': ST_BE, '운영 콘솔 데이터': ST_BE,
  '알림 실제 발송': ST_BE,
  # 만들지 않은 페이지·요소
  '404 · 오류 페이지': ST_DONE, 'sitemap.xml': ST_DONE, 'en/terms.html (Partner terms 독립 페이지)': ST_DONE,
  '호텔 수신 거부(unsubscribe) 페이지': ST_BE, 'favicon.ico · apple-touch-icon': ST_DONE,
  # 데모 흔적 제거
  'DEMO 띠·상태 미리보기 스위처': ST_DONE, 'sessionStorage 데모 세션': ST_DONE, '예시 데이터·고정 날짜': ST_PART,
  '임시 메일 주소': ST_DONE, '이메일 템플릿 BASE_URL': ST_DONE,
  # 도메인·SEO·메타
  '도메인 확정': ST_DONE, '분석 도구': ST_DONE, '네이버 서치어드바이저·구글 서치콘솔 인증': ST_DONE,
  # 법무·사업자 정보
  '이용약관 전문': ST_EXT, '개인정보처리방침 확정': ST_EXT, '사업자 정보': ST_DONE, '휴대전화 인증 범위 표기': ST_EXT,
  # 품질·호환·보안
  '카카오톡 인앱 브라우저 검증': ST_EXT,
  '의견 보내기 위젯 + 문의 폼 통합': ST_BE, '피드백 운영 콘솔': ST_BE, 'VOC 처리 SOP·CX 응대': ST_DONE, '보안 헤더': ST_DONE, '토큰·상태 검증': ST_BE, '브라우저 매트릭스': ST_EXT,
}
def gap_rows(items):
    return ''.join('<tr><td><b>%s</b>%s</td><td>%s</td><td>%s</td><td class="nw">%s</td><td class="nw">%s</td></tr>' %
        (e(n), STATUS.get(n, ''), e(c), e(o), pri_tag(pr), e(own)) for n, c, o, pr, own in items)


n_pages = sum(len(v) for _, v in SITE)
cnt = {k: 0 for k in P}
for _, items in GAPS:
    for it in items: cnt[it[3]] += 1

CSS = open(os.path.join(ROOT, 'docs', 'state-transitions.html'), encoding='utf-8').read()
CSS = CSS[CSS.index('<style>') + 7:CSS.index('</style>')]

TOC = ['사이트 구조도', '페이지 목록', '미구현 항목 요약', '백엔드 연동', '만들지 않은 페이지·요소', '데모 흔적 제거', '도메인·SEO·메타', '법무·사업자 정보', '품질·호환·보안', '결정이 필요한 항목', '오픈 순서 제안']

TREE = '''<pre class="tree">/  (모드 선택 홈)
├─ ko/  여행사 모드 · 한국어
│  ├─ index.html  랜딩 + #register 견적 요청 폼
│  ├─ about · faq · contact · terms · privacy
│  ├─ track.html?t=  진행 상황(요청자 전용) · ?s=  동료 공유(보기 전용)
│  └─ 회원  signup → login → my ─ account ─ withdraw · reset
├─ en/  호텔 모드 · 영어
│  ├─ index.html  Partner landing + #register · #terms
│  ├─ sample-request · faq · contact · privacy
│  └─ bid.html?t=  초대 호텔 전용 요건서·견적
├─ admin/  운영 콘솔 (robots 차단)
│  ├─ index(로그인) → dashboard
│  ├─ rfps → rfp?id  ·  partners → partner?id  ·  members → member?id
│  └─ settings  공휴일 · 규칙 · 알림 · 계정 · 시스템 상태 · 전제 조건
├─ docs/  state-transitions · notification-library(+json, csv) · sitemap
├─ emails/  템플릿 27종
└─ robots.txt · og/</pre>'''

body = '<div class="wrap"><header class="top"><div class="brand">MICE<b>GO</b> · 내부 문서</div><h1>사이트맵 · 서비스 오픈 전 프론트엔드 점검</h1><p class="ver">%s · %s · 페이지 %d개 · 미구현 항목 %d개</p>' % (VER, DATE, n_pages, sum(cnt.values()))
body += '<p class="note">이 문서는 정적 데모 사이트 기준입니다. 화면·상태·문안은 완성됐고, 아래 항목은 대부분 "백엔드가 채워야 하는 자리"와 "오픈 전에 걷어낼 데모 요소"입니다.</p>'
body += '<nav class="toc"><b>목차</b><ol>' + ''.join('<li><a href="#s%d">%s</a></li>' % (i + 1, e(t)) for i, t in enumerate(TOC)) + '</ol></nav>'
body += '<section id="s1"><h2><span class="n">01</span>사이트 구조도</h2><p class="lead">역할·언어별 3개 영역과 내부 문서. 화살표는 주요 이동 경로입니다.</p>' + TREE + '</section>'
body += '<section id="s2"><h2><span class="n">02</span>페이지 목록</h2><p class="lead">접근: 공개 / 토큰 링크(로그인 없음) / 로그인 / 운영자. 색인은 robots·meta 기준. 백엔드 열은 오픈 시 서버가 채워야 하는 것.</p>'
for grp, items in SITE:
    body += '<h3>%s</h3><div class="tw"><table><thead><tr><th>경로</th><th>페이지 · 용도</th><th>접근</th><th>색인</th><th>상태/변형</th><th>백엔드 연동</th></tr></thead><tbody>%s</tbody></table></div>' % (e(grp), site_rows(items))
body += '</section>'
body += '<section id="s3"><h2><span class="n">03</span>미구현 항목 요약</h2><p class="lead">우선순위 기준: A 오픈 차단(없으면 서비스가 동작하지 않음) · B 오픈 전 필수 · C 오픈 직후 · D 결정 필요.</p>'
body += '<div class="kpi">' + ''.join('<div class="kpi-t"><span class="tag %s">%s</span><b>%d</b><span>%s</span></div>' % (P[k][1], k, cnt[k], P[k][0]) for k in 'ABCD') + '</div>'
body += '<div class="callout">핵심: 프론트엔드 화면은 오픈에 필요한 만큼 갖춰졌습니다. 오픈을 막는 것은 <b>폼·토큰·회원·콘솔이 모두 mailto와 예시 데이터 위에서 돌아간다</b>는 점과 <b>도메인·법무·사업자 정보</b>입니다. 새로 만들 페이지는 404, sitemap.xml, 파트너 약관 독립 페이지, 수신 거부 페이지, 아이콘 파일 정도입니다.</div></section>'
for i, (grp, items) in enumerate(GAPS):
    body += '<section id="s%d"><h2><span class="n">%02d</span>%s</h2><div class="tw"><table><thead><tr><th>항목</th><th>현재 상태</th><th>오픈 조건</th><th>우선순위</th><th>담당</th></tr></thead><tbody>%s</tbody></table></div></section>' % (i + 4, i + 4, e(grp), gap_rows(items))
ORDER = [
 ('1', '도메인·스택 확정', '도메인, 호스팅(정적 + Supabase), 폼 백엔드 방식. 이후 모든 URL·메타·템플릿이 이 값을 씀'),
 ('2', '핵심 API 4종', '견적 요청 제출 → 토큰 조회(track/bid) → 견적 제출·거절 → 제안 선택(OTP). 이것만 붙어도 비회원 흐름으로 오픈 가능'),
 ('3', '알림 발송', '이메일 발송 + 알림톡·SMS 대행사. ORG_RECEIVED·HTL_INVITE·ORG_DELIVERED가 먼저'),
 ('4', '운영 콘솔 연결', '로그인·RFP 상태전이·파트너 심사. 회원 기능은 그다음'),
 ('5', '회원 기능', 'Supabase Auth + 휴대전화 OTP. 비회원 흐름이 안정된 뒤 켜도 됨'),
 ('6', '오픈 정리', '데모 요소 제거, 법무·사업자 정보, 404·sitemap·아이콘, 인앱 브라우저 검증'),
]
body += '<section id="s10b"><h2><span class="n">10-1</span>A·B 제작 결과와 남은 일</h2><p class="lead">2026-09-26 기준. 배지 뜻 — ' + ST_DONE + ' 코드 완료, site.config.json 값만 채우면 적용 · ' + ST_BE + ' supabase/ 폴더에 스키마·함수·테스트 완료, Supabase 프로젝트 생성과 배포가 남음 · ' + ST_EXT + ' 코드 밖의 일 · ' + ST_PART + ' 일부 남음</p><div class="tw"><table><thead><tr><th>남은 일</th><th>누가</th><th>어떻게</th></tr></thead><tbody>'
for a_, b_, c_ in [
 ('도메인·공식 메일 확정', '운영', 'site.config.json의 domain·officialEmail·privacyEmail을 채우고 다시 빌드하면 canonical·sitemap·메일 주소가 한 번에 바뀝니다'),
 ('사업자 정보 기재', '운영', 'site.config.json의 operator 블록(상호·대표자·사업자등록번호·주소·개인정보 보호책임자)'),
 ('Supabase 프로젝트 생성·배포', '개발', 'supabase/README.md 순서대로: link → db push → functions deploy → secrets → cron. 완료 후 site.config.json의 supabase.url·anonKey를 채우면 사이트가 API 모드로 전환됩니다'),
 ('메일·문자 발송 계정', '운영', 'Resend(이메일) 도메인 인증, Solapi(문자·알림톡) 가입·발신번호 사전등록·카카오 채널·알림톡 템플릿 9종 검수'),
 ('이용약관 전문·개인정보처리방침 확정', '법무', 'ko/terms.html 요약을 전문으로 교체, privacy의 TODO(legal) 5건, SMS 수탁사명 기재'),
 ('예시 데이터 잔여분', '개발', 'prod 빌드에서 REF·호텔명 등 예시값은 API 응답이 덮어쓰지만 정적 마크업에 남아 있음 — verify_launch.py의 NOTE 항목'),
 ('실기기 검수', 'QA', '카카오 인앱(안드로이드·iOS), 삼성 인터넷, iOS Safari에서 견적 요청→추적→선정 한 바퀴'),
]:
    body += '<tr><td><b>%s</b></td><td class="nw">%s</td><td>%s</td></tr>' % (e(a_), e(b_), e(c_))
body += '</tbody></table></div></section>'
body += '<section id="s11"><h2><span class="n">11</span>오픈 순서 제안</h2><p class="lead">비회원 견적 흐름을 먼저 열고, 회원 기능은 그 위에 얹는 순서입니다.</p><div class="tw"><table><thead><tr><th>단계</th><th>할 일</th><th>설명</th></tr></thead><tbody>' + ''.join('<tr><td class="nw"><code>%s</code></td><td><b>%s</b></td><td>%s</td></tr>' % (a, e(b), e(c)) for a, b, c in ORDER) + '</tbody></table></div></section>'
body += '<p class="small" style="margin-top:22px">개정 이력 · %s %s 최초 작성(회원제 v1 반영 시점) · v1.1 2026-09-26 A·B 제작 결과 반영(상태 배지, 남은 일) · v1.2 2026-09-27 피드백·VOC 창구 추가.</p></div>' % (VER, DATE)

EXTRA = '''
.tree{font-family:var(--mono);font-size:13px;line-height:1.7;background:#F6F8FB;border:1px solid var(--line);border-radius:10px;padding:14px 16px;overflow-x:auto;margin:0;white-space:pre}
.kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:8px 0 4px}
.kpi-t{border:1px solid var(--line);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:4px}
.kpi-t b{font-family:var(--mono);font-size:26px;line-height:1}
.kpi-t span:last-child{font-size:12.5px;color:var(--gray)}
@media (max-width:560px){.kpi{grid-template-columns:repeat(2,minmax(0,1fr))}}
'''
out = ('<!DOCTYPE html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta name="robots" content="noindex,nofollow">\n'
       '<title>MICEGO 사이트맵 · 오픈 전 점검 %s</title>\n<link rel="preconnect" href="https://cdn.jsdelivr.net">\n<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">\n'
       '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=JetBrains+Mono:wght@400;500&display=swap">\n<style>%s%s</style>\n</head>\n<body>\n%s\n</body>\n</html>\n') % (VER, CSS, EXTRA, body)
open(os.path.join(ROOT, 'docs', 'sitemap.html'), 'w', encoding='utf-8').write(out)

# Markdown twin for the project knowledge base
md = ['# MICEGO 사이트맵 · 서비스 오픈 전 프론트엔드 점검 - 클로드', '', '%s · %s · 페이지 %d개 · 미구현 항목 %d개 (A 오픈 차단 %d · B 오픈 전 필수 %d · C 오픈 직후 %d · D 결정 필요 %d)' % (VER, DATE, n_pages, sum(cnt.values()), cnt['A'], cnt['B'], cnt['C'], cnt['D']), '', '## 1. 페이지 목록', '']
for grp, items in SITE:
    md += ['### ' + grp, '', '| 경로 | 페이지 | 접근 | 색인 | 상태/변형 | 백엔드 연동 |', '|---|---|---|---|---|---|']
    md += ['| `%s` | %s — %s | %s | %s | %s | %s |' % (p, t, u, ACC[a][0], i, st, be) for p, t, u, a, i, st, be in items]
    md.append('')
md += ['## 2. 미구현 항목', '']
for grp, items in GAPS:
    md += ['### ' + grp, '', '| 항목 | 현재 상태 | 오픈 조건 | 우선순위 | 담당 | 진행 |', '|---|---|---|---|---|---|']
    md += ['| %s | %s | %s | %s %s | %s | %s |' % (n, c, o, pr, P[pr][0], own, re.sub('<[^>]+>', '', STATUS.get(n, '')).strip() or '—') for n, c, o, pr, own in items]
    md.append('')
md += ['## 3. 오픈 순서 제안', ''] + ['%s. **%s** — %s' % (a, b, c) for a, b, c in ORDER] + ['', '원본: micego-site/docs/sitemap.html']
open(os.path.join(ROOT, 'docs', 'sitemap.md'), 'w', encoding='utf-8').write('\n'.join(md))
print('sitemap ok', n_pages, cnt)
