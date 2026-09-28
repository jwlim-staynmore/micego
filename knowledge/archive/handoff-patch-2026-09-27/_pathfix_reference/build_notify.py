#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""MICEGO notification library generator.

Single data definition -> emails/*.html, docs/notification-templates.json,
docs/alimtalk-templates.csv, docs/notification-library.html.
Run:  python3 build_notify.py   (cwd = micego-site/)
Placeholders: write {{KEY}} everywhere. Emails keep {{KEY}}; 알림톡 turns it into #{한글변수}.
"""
import csv, html, json, os, re, io
import os as _os_
_SITE_DIR = _os_.environ.get('MG_SITE_DIR') or _os_.path.dirname(_os_.path.abspath(__file__))

ROOT = os.getcwd()  # WP2: outputs stay relative to the cwd so a build can run inside a copied directory
exec(open(_os_.path.join(_SITE_DIR, 'site_config.py'), encoding='utf-8').read())  # CFG/SITE_BASE/MAIL/PMAIL (WP2)
BASE_URL = SITE_BASE or "https://micego.example"  # site.config.json domain, else the placeholder (TODO: domain TBD)
PH = re.compile(r"\{\{([A-Z0-9_]+)\}\}")

# --------------------------------------------------------------------------
# 1. Variable registry  key -> (한글 변수명, 설명, 샘플(ko), 샘플(en) or None, maxLen)
# --------------------------------------------------------------------------
V = {
 "RFP_ID": ("요청번호", "견적 요청 번호", "MG-2610-014", None, 12),
 "PARTNER_ID": ("신청번호", "파트너 신청 번호", "PT-2609-007", None, 12),
 "ORG_CONTACT_NAME": ("담당자명", "오거나이저 담당자 이름·직함", "김지은 과장", "Jieun Kim", 20),
 "RECEIVED_AT": ("접수일시", "접수 시각 (KST)", "2026-09-26 14:32", None, 16),
 "DESTINATION": ("목적지", "행사 목적지", "다낭", "Da Nang, Vietnam", 20),
 "EVENT_TYPE": ("행사유형", "행사 유형", "인센티브", "Incentive program", 12),
 "PAX": ("인원", "예상 인원", "150–199명", "150–199 attendees", 14),
 "EVENT_DATES": ("행사일정", "행사 기간", "2027-03-15~18", "Mon 15 – Thu 18 Mar 2027 (3 nights)", 20),
 "ROOMS": ("객실", "필요 객실 구성", "트윈 60·킹 20", "Twin 60 / King 20 (240 room-nights)", 20),
 "EVENT_SPACE": ("연회장", "연회장 사용 (호텔 공개 요건)", "", "Gala dinner · Night 3 (Wed 17 Mar 2027)", 60),
 "PUBLIC_NOTE": ("공개메모", "운영자가 검토한 공개 메모", "", "Full details are on the request page.", 200),
 "TRACK_URL": ("추적링크", "오거나이저 추적 링크 전체 (이메일용)", BASE_URL + "/ko/track.html?t=demo-2610", None, 90),
 "TRACK_TOKEN": ("추적토큰", "추적 링크 토큰 (알림톡 버튼·LMS용, URL 끝 변수)", "demo-2610", None, 40),
 "REGISTER_URL": ("신규요청URL", "랜딩 접수 폼 링크", BASE_URL + "/ko/#register", None, 60),
 "REJECT_REASON": ("반려사유", "반려 사유 문장 (고정 3종 중 택1, 아래 표)", "행사 시작일이 확정되지 않아 호텔에 요청을 보내지 못했습니다.", None, 60),
 "DEADLINE_KST": ("견적마감", "호텔 견적 마감 (KST)", "2026-10-08(목) 18:00 KST", "Thu 8 Oct 2026, 18:00 KST", 26),
 "PREV_DEADLINE": ("이전마감", "이전 라운드 마감", "", "Thu 8 Oct 2026, 18:00 KST", 30),
 "COMPARE_DATE": ("비교표예정일", "비교표 전달 예정일", "2026-10-12(월)", None, 14),
 "ROUND": ("라운드", "요청 라운드 (2 이상)", "2", "2", 2),
 "CHANGE_SUMMARY": ("변경내용", "바뀐 조건 요약 한 줄", "인원 150–199명 → 200–250명, 행사일 2027-03-22~25", "Attendees 150–199 → 200–250; dates now 22–25 Mar 2027", 60),
 "PROPOSAL_COUNT": ("제안건수", "받은 제안 수", "3", None, 2),
 "VALID_UNTIL_MIN": ("유효기한", "제안 중 가장 빠른 견적 유효기한", "2026-12-15", None, 10),
 "SELECTED_HOTEL": ("선정호텔", "선정된 호텔명", "Ocean Pearl Resort Da Nang", None, 50),
 "ORG_COMPANY": ("회사명", "오거나이저 회사명", "한빛투어(주)", "Hanbit Tour Co., Ltd.", 30),
 "ORG_CONTACT_FULL": ("담당자", "오거나이저 담당자 (호텔에 전달)", "김지은 과장", "Jieun Kim (Manager)", 30),
 "ORG_EMAIL": ("이메일", "오거나이저 담당자 이메일", "jieun.kim@hanbit-tour.example", None, 50),
 "ORG_PHONE": ("연락처", "오거나이저 담당자 전화", "010-0000-0014", None, 16),
 "LOST_REASON": ("미성사사유", "미성사 사유 문장 (고정 3종 중 택1, 아래 표)", "받으신 제안 중 선택하지 않으셔서 종료했습니다.", None, 45),
 "CANCELLED_AT": ("취소일시", "취소 처리 시각 (KST)", "2026-09-28 10:05", None, 16),
 "SUPPORT_EMAIL": ("문의메일", "문의 수신 주소 (운영 메일, 미확정)", MAIL, None, 40),
 "FROM_ADDRESS": ("발신주소", "발신 주소 (Resend 인증 도메인, 미확정)", "notify@micego.example", None, 40),
 "UNSUBSCRIBE_URL": ("수신거부URL", "초대 메일 수신거부 링크", BASE_URL + "/en/unsubscribe.html?t=demo-2610", None, 90),
 "HOTEL_BID_URL": ("호텔링크", "호텔 개인 견적 링크 전체", BASE_URL + "/en/bid.html?t=demo-2610", None, 90),
 "HOTEL_NAME": ("호텔명", "수신 호텔(숙박시설)명", "Ocean Pearl Resort Da Nang", None, 50),
 "HOTEL_CONTACT_NAME": ("호텔담당자", "호텔 담당자 이름", "Ms. Linh", None, 30),
 "HOTEL_CONTACT_EMAIL": ("호텔이메일", "호텔 담당자 이메일 (수신 주소)", "sales@oceanpearl.example", None, 50),
 "CURRENCY": ("통화", "제출 통화", "USD", None, 3),
 "SUBMITTED_AT": ("제출일시", "견적 제출·수정 시각", "", "Wed 7 Oct 2026, 15:42 KST", 30),
 "PROPERTY_NAME": ("시설명", "파트너 신청 숙박시설명", "Sanur Lagoon Resort", None, 50),
 "PROPERTY_LOCATION": ("소재지", "숙박시설 소재지", "Sanur, Bali, Indonesia", None, 40),
 "APPLICANT_NAME": ("신청자", "파트너 신청 담당자 이름", "Putri Wijaya", None, 30),
 "APPLIED_AT": ("신청일시", "파트너 신청 시각", "", "Tue 6 Oct 2026, 10:12 KST", 30),
 "REVIEW_BY": ("회신기한", "파트너 심사 회신 기한 (5영업일)", "", "Tue 13 Oct 2026, 18:00 KST", 30),
 "PTN_REJECT_REASON": ("거절사유", "파트너 거절 사유 문장 (고정 5종 중 택1, 아래 표)", "", "Our organizers' groups start at 50 attendees, and the group capacity you listed is below that.", 120),
 "PARTNER_APPLY_URL": ("파트너신청URL", "파트너 신청 페이지 링크", BASE_URL + "/en/index.html#register", None, 60),
 # --- manual (OPS) ---
 "CURRENT_STEP": ("현재단계", "현재 진행 단계", "호텔 견적 취합 중", None, 30),
 "PROGRESS_NOTE": ("진행내용", "지금까지 한 일 한두 문장", "조건에 맞는 호텔에 요청을 보냈고, 마감까지 제안을 받고 있습니다.", None, 100),
 "NEXT_DATE": ("다음일정", "다음 안내 예정일", "2026-10-12(월)", None, 14),
 "NEXT_ACTION": ("다음조치", "그날 하는 일", "비교표를 전달드리겠습니다", None, 40),
 "MISSING_ITEMS": ("확인항목", "확인이 필요한 항목 목록", "- 트윈·킹 객실 수\n- 연회장 사용 여부와 목적", None, 120),
 "REPLY_BY": ("회신기한", "회신 요청 기한", "2026-10-01(목) 18:00", "Tue 6 Oct 2026, 18:00 KST", 24),
 "DATE_ASKED": ("확인일정", "확정 여부를 묻는 일정 표기", "2027-03-15~18", None, 20),
 "REBID_DATE": ("재요청예정일", "다른 호텔로 다시 요청할 예정일", "2026-10-13(화)", None, 14),
 "OPTION_NOTE": ("조정방안", "조건을 조정할 수 있는 항목", "행사 규모나 일정을 유연하게 조정하시면 요청을 보낼 수 있는 호텔이 늘어납니다.", None, 100),
 "INCIDENT_FACT": ("노출사실", "무엇이 어떻게 노출됐는지", "호텔에 공개되는 요건서 메모에 회사명이 한 차례 기재되어 있었습니다.", None, 100),
 "INCIDENT_SCOPE": ("노출범위", "노출 시각·열람한 호텔 범위", "2026-09-30 11:20부터 14:05까지, 그 사이 요건서를 연 호텔은 1곳입니다.", None, 100),
 "INCIDENT_ACTION": ("조치내용", "수정·재발 방지 조치", "메모를 수정해 회사명을 삭제했고, 공개 메모 검토 절차를 한 단계 늘렸습니다.", None, 100),
 "FOLLOWUP_HOURS": ("남은시간", "마감까지 남은 시간", "", "24 hours", 12),
 "QUOTE_ISSUES": ("확인사항", "견적에서 확인할 항목 목록", "", "- Twin rate is higher than the King rate\n- Validity ends before the event dates (15 Mar 2027)", 200),
 "SUSPEND_REASON": ("중지사유", "중지 사유", "", "the last three invitations went unanswered", 80),
 # --- member accounts (ACC_*) ---
 "CODE": ("인증번호", "6자리 인증번호 (숫자)", "123456", None, 6),
 "FB_REF": ("접수번호", "피드백 접수번호 (FB-YYMMDD-XXXX, KST 날짜)", "FB-261008-7KQ3", None, 16),
 "FB_CATEGORY": ("피드백유형", "대분류 라벨 (화면·기능 문제 / 견적·운영 문의 / 기타)", "화면·기능 문제", "System issue / improvement", 20),
 "FB_USER_TYPE": ("보낸사람", "유저 유형 라벨 (여행사 회원 · 비회원 요청자 · 호텔 · 운영자 · 방문자)", "비회원 요청자", "Guest requester", 12),
 "FB_RECEIVED_AT": ("접수시각", "접수 시각 (KST)", "2026-10-08 19:30", None, 16),
 "FB_REPLY_EMAIL": ("회신주소", "접수자가 남긴 회신 이메일 (없으면 '회신 없음')", "jieun.kim@hanbit-tour.example", None, 60),
 "FB_CONTENT": ("내용", "접수자가 쓴 본문 (원문, 이스케이프)", "비교표에서 제안 B의 취소 규정이 두 줄로 겹쳐 보입니다. 갤럭시 S24, 카카오톡에서 열었습니다.", None, 2000),
 "FB_PAGE": ("페이지", "page_path · 화면 상태", "/ko/track.html · delivered", None, 60),
 "FB_UA": ("브라우저", "OS · 브라우저 · 인앱 요약", "Android 14 · Chrome 128 · KakaoTalk", None, 60),
 "FB_CONSOLE_URL": ("콘솔링크", "운영 콘솔 상세 URL", BASE_URL + "/admin/feedback-detail.html?id=…", None, 120),
 "EXPIRES_MIN": ("유효시간", "인증번호·링크 유효 시간 (분)", "10", None, 2),
 "PURPOSE": ("인증목적", "이메일 인증 목적 (회원 가입 · 이메일 변경 중 택1)", "회원 가입", None, 8),
 "CONTACT_NAME": ("가입자명", "회원 이름", "김지은", None, 20),
 "LOGIN_URL": ("로그인URL", "회원 로그인 페이지 링크", BASE_URL + "/ko/login.html", None, 60),
 "RESET_URL": ("재설정URL", "비밀번호 재설정 링크 (1회용 토큰 포함)", BASE_URL + "/ko/reset.html?k=demo-reset-token", None, 90),
 "MY_URL": ("내요청URL", "내 견적 요청 페이지 링크", BASE_URL + "/ko/my.html", None, 60),
 "LINKED_COUNT": ("연결건수", "계정에 연결한 이전 요청 수", "1", None, 2),
 "RFP_REFS": ("연결요청번호", "연결한 요청번호 목록 (줄바꿈으로 구분)", "MG-2609-011", None, 60),
 "CHANGED_AT": ("변경일시", "변경·처리 시각 (KST)", "2026-10-08 19:30", None, 16),
 "NEW_EMAIL_MASKED": ("새이메일", "마스킹한 새 로그인 이메일", "ha****@hanbit-tour.example", None, 40),
 "NEW_PHONE_MASKED": ("새번호", "마스킹한 새 휴대전화 (가운데 4자리 가림)", "010-****-5678", None, 13),
 "LOCKED_AT": ("잠금일시", "계정 잠금 시각 (KST)", "2026-10-08 17:42", None, 16),
 "WITHDRAWN_AT": ("탈퇴일시", "탈퇴 처리 시각 (KST)", "2026-10-08 19:30", None, 16),
 "MEMBER_EMAIL": ("회원이메일", "회원 로그인 이메일 (운영자 화면 기준)", "jieun.kim@hanbit-tour.example", None, 50),
 "FROM_NAME": ("이전담당자", "요청을 넘기는 회원 (이름과 회사)", "김지은 (한빛투어)", None, 30),
 "TO_NAME": ("새담당자", "요청을 받는 회원 (이름과 회사)", "이서준 (한빛투어)", None, 30),
}
# 문자(SMS) 바이트 계산에서 영문·숫자로만 채워지는 변수는 1byte 기준으로 센다 (그 밖의 변수는 한글 2byte로 보수적으로 계산)
ASCII_VARS = {"CODE", "EXPIRES_MIN", "RFP_ID"}
SMS_LIMIT = 90

# --------------------------------------------------------------------------
# 2. Helpers
# --------------------------------------------------------------------------
def used_keys(*texts):
    ks = []
    for t in texts:
        for k in PH.findall(t or ""):
            if k not in ks: ks.append(k)
    return ks

def sample_of(key, lang, overrides=None):
    if overrides and key in overrides: return overrides[key]
    kr, desc, sk, se, ml = V[key]
    if lang == "en":
        return se if se is not None else sk
    return sk if sk != "" else (se or "")

def subst(text, lang, overrides=None):
    def f(m):
        return sample_of(m.group(1), lang, overrides)
    return PH.sub(f, text)

def to_kr(text):
    return PH.sub(lambda m: "#{" + V[m.group(1)][0] + "}", text)

def to_max(text, overrides=None, lang="ko"):
    """Replace each variable by its maxLen filler (Hangul, 1 char each)."""
    def f(m):
        k = m.group(1)
        return "가" * V[k][4]
    return PH.sub(f, text)

def eucbytes(s):
    return sum(1 if ord(c) < 128 else 2 for c in s)

def bytes_max(text):
    """EUC-KR-ish bytes with each var at maxLen Korean (2 bytes each) — conservative."""
    def f(m):
        return "가" * V[m.group(1)][4]
    return eucbytes(PH.sub(f, text))

def sms_bytes_max(text):
    """SMS byte length (EUC-KR) with every variable at maxLen; numeric-only variables count as ASCII."""
    def f(m):
        k = m.group(1)
        return ("0" if k in ASCII_VARS else "가") * V[k][4]
    return eucbytes(PH.sub(f, text))

# --------------------------------------------------------------------------
# 3. Template definitions
# --------------------------------------------------------------------------
REJECT_PHRASES = [
 ("국내 행사", "MICEGO는 해외에서 열리는 행사만 다루고 있어, 국내 행사는 진행하기 어렵습니다."),
 ("일정 미확정", "행사 시작일이 확정되지 않아 호텔에 요청을 보내지 못했습니다."),
 ("필수 정보 부족", "행사 유형·인원·객실 수 등 필수 정보를 확인하지 못해 호텔에 요청을 보내지 못했습니다."),
]
LOST_PHRASES = [
 ("선택하지 않음", "받으신 제안 중 선택하지 않으셔서 종료했습니다."),
 ("유효기한 경과", "견적 유효기한이 지나도록 선택 회신이 없어 종료했습니다."),
 ("두 차례 요청에도 제안 없음", "두 차례 요청했지만 호텔의 제안을 받지 못해 종료했습니다."),
]
PTN_REJECT_PHRASES = [
 ("해외 소재 요건", "MICEGO currently works only with properties located outside Korea."),
 ("단체 수용 50명 미만", "Our organizers' groups start at 50 attendees, and the group capacity you listed is below that."),
 ("담당자 연락처 확인 불가", "We couldn't verify the contact details you provided."),
 ("시설 확인 불가", "We couldn't verify the property from the information provided."),
 ("기타", "Your application doesn't meet our current partner requirements."),
]

KO_POLICY = "호텔에 전달되는 요건서에는 회사명과 예산이 포함되지 않습니다. 주최 측 수수료는 없습니다."
KO_WHY = "이 메일은 MICEGO에 견적을 요청하신 분께 발송됩니다."
KO_LINK = "이 링크는 회원님만 쓰는 개인 링크입니다. 로그인 없이 열리며, 외부에 전달하지 말아 주세요."
KO_LINK = "개인 링크입니다. 로그인 없이 열리니 외부에 전달하지 말아 주세요."
EN_POLICY = ("The organizer's company name is withheld until a proposal is selected, and the budget is never part of the brief. "
             "Your property name is shown to the organizer only if they select your proposal. "
             "Declining never counts against you; three unanswered invitations in a row pause your listing.")
EN_WHY_HTL = "You are receiving this because your property is listed in the MICEGO supplier network."
EN_LINK = ("This is your personal link &mdash; no login needed. Please don&rsquo;t forward it.")

T = []   # ordered list of template dicts

def add(**kw):
    T.append(kw)

# ---------------- Organizer (KO) ----------------
ORG_TRIG_NOTE = "이메일 + 알림톡 (미수신 시 LMS 대체발송)"
add(id="ORG_RECEIVED", name="접수 확인", recipient="org", mode="auto", lang="ko",
    trigger="#0 접수 폼 제출 → 접수됨", trig_nums=["0"], states="접수됨",
    subject="[MICEGO] 견적 요청이 접수되었습니다 · {{RFP_ID}}",
    preheader="요청번호 {{RFP_ID}} · {{DESTINATION}} {{EVENT_TYPE}} · 3영업일 안에 진행 상황을 알려 드립니다.",
    chip=("접수됨", "teal"), tag="견적 요청",
    title="견적 요청이 접수되었습니다.",
    lead="{{ORG_CONTACT_NAME}}님, 요청해 주셔서 감사합니다. 아래 내용으로 접수했습니다. 진행 상황은 개인 링크에서 언제든 확인하실 수 있습니다.",
    rows=[("요청번호", "{{RFP_ID}}"), ("접수일시", "{{RECEIVED_AT}}"), ("목적지", "{{DESTINATION}}"),
          ("행사 유형", "{{EVENT_TYPE}}"), ("예상 인원", "{{PAX}}")],
    callouts=[("amber", "3영업일 안에 진행 상황을 알려 드립니다", "접수된 영업일에 확인을 시작해 3영업일 안에 진행 상황과 다음 일정을 알려 드립니다.")],
    cta=("진행 상황 보기", "{{TRACK_URL}}"), link_note=KO_LINK, policy=KO_POLICY, why=KO_WHY,
    alimtalk=dict(code="micego_org_received", emph=None, buttons=["진행 상황 보기"],
      body="[MICEGO] 견적 요청을 접수했습니다.\n\n{{ORG_CONTACT_NAME}}님, 요청이 정상적으로 접수되었습니다. 접수된 영업일에 확인을 시작해 3영업일 안에 진행 상황과 다음 일정을 알려 드립니다.\n\n■ 요청번호: {{RFP_ID}}\n■ 접수일시: {{RECEIVED_AT}}\n■ 행사: {{DESTINATION}} {{EVENT_TYPE}} · {{PAX}}\n\n진행 상황은 아래 버튼에서 언제든 확인하실 수 있습니다. 개인 링크이므로 외부에 전달하지 말아 주세요.\n\n※ 이 메시지는 견적을 요청하신 분께 발송되는 안내입니다.",
      fb_title="[MICEGO] 접수 확인"))

add(id="ORG_REJECTED", name="반려 안내", recipient="org", mode="auto", lang="ko",
    trigger="#2 검증중 → 반려됨", trig_nums=["2"], states="검증중 → 반려됨",
    subject="[MICEGO] 이번 요청은 진행하기 어렵습니다 · {{RFP_ID}}",
    preheader="요청번호 {{RFP_ID}} · 사유를 안내드립니다. 조건이 갖춰지면 새로 요청해 주세요.",
    chip=("반려됨", "red"), tag="견적 요청",
    title="이번 요청은 진행하기 어렵습니다.",
    lead="{{ORG_CONTACT_NAME}}님, 요청 내용을 검토했지만 이번에는 호텔에 요청을 보내지 못했습니다. 사유를 아래에 적었습니다.",
    rows=[("요청번호", "{{RFP_ID}}"), ("접수일시", "{{RECEIVED_AT}}"), ("목적지", "{{DESTINATION}}")],
    callouts=[("red", "반려 사유", "{{REJECT_REASON}}")],
    extra_para="사유가 해결되면 새로 요청해 주세요. 접수된 내용은 호텔에 전달되지 않았습니다.",
    cta=("새로 요청하기", "{{REGISTER_URL}}"), link_note=None, policy=KO_POLICY, why=KO_WHY,
    reject_phrases=REJECT_PHRASES,
    alimtalk=dict(code="micego_org_rejected", emph=None, buttons=["새로 요청하기"], btn_static=True,
      body="[MICEGO] 이번 요청은 진행하기 어렵습니다.\n\n{{ORG_CONTACT_NAME}}님, {{RFP_ID}} 요청을 검토했지만 이번에는 호텔에 요청을 보내지 못했습니다.\n\n■ 사유: {{REJECT_REASON}}\n\n사유가 해결되면 아래 버튼에서 새로 요청해 주세요. 접수하신 내용은 호텔에 전달되지 않았습니다.\n\n※ 이 메시지는 견적을 요청하신 분께 발송되는 안내입니다.",
      fb_title="[MICEGO] 요청 반려 안내"))

add(id="ORG_BIDDING", name="비딩중 진입", recipient="org", mode="auto", lang="ko",
    trigger="#4 오픈 → 비딩중 (초대 발송 시점)", trig_nums=["4"], states="오픈 → 비딩중",
    subject="[MICEGO] 호텔에 견적을 요청했습니다 · {{RFP_ID}}",
    preheader="요청번호 {{RFP_ID}} · 견적 마감 {{DEADLINE_KST}} · 비교표는 {{COMPARE_DATE}}까지 전달합니다.",
    chip=("비딩중", "teal"), tag="견적 요청",
    title="조건에 맞는 호텔에 요청을 보냈습니다.",
    lead="{{ORG_CONTACT_NAME}}님, 검토를 마치고 조건에 맞는 해외 호텔 몇 곳에 요청을 보냈습니다. 호텔이 견적을 내는 동안 따로 하실 일은 없습니다.",
    rows=[("행사", "{{DESTINATION}} {{EVENT_TYPE}} · {{PAX}}"), ("행사 일정", "{{EVENT_DATES}}"),
          ("호텔 견적 마감", "{{DEADLINE_KST}}"), ("비교표 전달 예정", "{{COMPARE_DATE}}")],
    callouts=[("amber", "마감 후 비교표를 전달합니다", "마감 후 받은 제안을 비교표로 정리해 {{COMPARE_DATE}}까지 전달합니다. 제안이 도착하면 다시 알려 드립니다.")],
    cta=("진행 상황 보기", "{{TRACK_URL}}"), link_note=KO_LINK, policy=KO_POLICY, why=KO_WHY,
    alimtalk=dict(code="micego_org_bidding", emph=None, buttons=["진행 상황 보기"],
      body="[MICEGO] 호텔에 견적을 요청했습니다.\n\n{{ORG_CONTACT_NAME}}님, {{RFP_ID}} 요청의 검토를 마치고 조건에 맞는 해외 호텔 몇 곳에 요청을 보냈습니다.\n\n■ 호텔 견적 마감: {{DEADLINE_KST}}\n■ 비교표 전달 예정일: {{COMPARE_DATE}}\n\n마감 후 받은 제안을 비교표로 정리해 다시 알려 드립니다. 진행 상황은 아래 버튼에서 확인하실 수 있습니다.\n\n※ 이 메시지는 견적을 요청하신 분께 발송되는 안내입니다.",
      fb_title="[MICEGO] 호텔 견적 요청 안내"))

add(id="ORG_REBID", name="새 라운드 (조건 변경)", recipient="org", mode="auto", lang="ko",
    trigger="#7 취합중 → 비딩중 · #9 전달됨 → 비딩중 (라운드 ≥ 2)", trig_nums=["7", "9"], states="취합중·전달됨 → 비딩중 (라운드 2 이상)",
    subject="[MICEGO] 바뀐 조건으로 호텔에 다시 요청했습니다 · {{RFP_ID}}",
    preheader="요청번호 {{RFP_ID}} · 새 견적 마감 {{DEADLINE_KST}} · 비교표는 {{COMPARE_DATE}}까지.",
    chip=("비딩중 · 라운드 {{ROUND}}", "teal"), tag="견적 요청",
    title="바뀐 조건으로 호텔에 다시 요청했습니다.",
    lead="{{ORG_CONTACT_NAME}}님, 조건이 바뀌어 호텔에 다시 요청을 보냈습니다. 이전 라운드에서 받은 제안은 기록으로 보관됩니다.",
    rows=[("변경 내용", "{{CHANGE_SUMMARY}}"), ("행사", "{{DESTINATION}} {{EVENT_TYPE}}"),
          ("새 견적 마감", "{{DEADLINE_KST}}"), ("새 비교표 예정", "{{COMPARE_DATE}}")],
    callouts=[("amber", "새 마감: {{DEADLINE_KST}}", "새 마감 후 비교표를 정리해 {{COMPARE_DATE}}까지 전달합니다.")],
    cta=("진행 상황 보기", "{{TRACK_URL}}"), link_note=KO_LINK, policy=KO_POLICY, why=KO_WHY,
    alimtalk=dict(code="micego_org_rebid", emph=None, buttons=["진행 상황 보기"],
      body="[MICEGO] 바뀐 조건으로 호텔에 다시 요청했습니다.\n\n{{ORG_CONTACT_NAME}}님, {{RFP_ID}} 요청의 조건이 바뀌어 {{ROUND}}차로 호텔에 다시 요청을 보냈습니다.\n\n■ 변경 내용: {{CHANGE_SUMMARY}}\n■ 새 견적 마감: {{DEADLINE_KST}}\n■ 새 비교표 예정일: {{COMPARE_DATE}}\n\n이전에 받은 제안은 기록으로 보관됩니다. 진행 상황은 아래 버튼에서 확인하실 수 있습니다.\n\n※ 이 메시지는 견적을 요청하신 분께 발송되는 안내입니다.",
      fb_title="[MICEGO] 호텔 재요청 안내"))

add(id="ORG_DELIVERED", name="견적 도착 (전달됨)", recipient="org", mode="auto", lang="ko",
    trigger="#6 취합중 → 전달됨", trig_nums=["6"], states="취합중 → 전달됨",
    subject="[MICEGO] 받은 제안을 비교표로 전달드립니다 · {{RFP_ID}}",
    preheader="요청번호 {{RFP_ID}} · 제안 {{PROPOSAL_COUNT}}건 · 가장 빠른 견적 유효기한 {{VALID_UNTIL_MIN}}",
    chip=("전달됨", "teal"), tag="견적 요청",
    title="받은 제안 {{PROPOSAL_COUNT}}건을 비교표로 정리했습니다.",
    lead="{{ORG_CONTACT_NAME}}님, 호텔 제안이 도착했습니다. 아래 링크에서 비교표를 보시고 마음에 드는 제안을 골라 알려 주세요.",
    rows=[("받은 제안", "{{PROPOSAL_COUNT}}건"), ("가장 빠른 견적 유효기한", "{{VALID_UNTIL_MIN}}"),
          ("호텔 이름", "선택 전까지 제안 A·B·C로 표시")],
    callouts=[("amber", "견적 유효기한 {{VALID_UNTIL_MIN}}", "가장 빠른 제안의 유효기한입니다. 그 전에 선택 여부를 알려 주세요."),
              ("gray", "선택하는 방법", "이 메일에 회신해 고르신 제안을 알려 주시거나, 링크의 페이지에서 「제안 선택하기」 버튼을 눌러 메일 초안을 여세요.")],
    cta=("비교표 보기", "{{TRACK_URL}}"), link_note=KO_LINK, policy=KO_POLICY, why=KO_WHY,
    alimtalk=dict(code="micego_org_delivered", emph="비교표가 도착했습니다", buttons=["비교표 보기"],
      body="[MICEGO] 받은 제안을 비교표로 전달드립니다.\n\n{{ORG_CONTACT_NAME}}님, {{RFP_ID}} 요청에 호텔 제안이 도착해 비교표로 정리했습니다.\n\n■ 받은 제안: {{PROPOSAL_COUNT}}건\n■ 가장 빠른 견적 유효기한: {{VALID_UNTIL_MIN}}\n\n비교표는 아래 버튼에서 보실 수 있고, 호텔 이름은 선택 전까지 제안 A·B·C로 표시됩니다. 고르신 제안은 페이지의 「제안 선택하기」 버튼으로 메일 초안을 열거나, MICEGO에서 받은 이메일에 회신해 알려 주세요.\n\n※ 이 메시지는 견적을 요청하신 분께 발송되는 안내입니다.",
      fb_title="[MICEGO] 비교표 도착"))

add(id="ORG_WON", name="성사 (호텔 선정·연결)", recipient="org", mode="auto", lang="ko",
    trigger="#10 전달됨 → 성사", trig_nums=["10"], states="전달됨 → 성사",
    subject="[MICEGO] 선정하신 호텔과 연결해 드렸습니다 · {{RFP_ID}}",
    preheader="요청번호 {{RFP_ID}} · {{SELECTED_HOTEL}} 담당자에게 연결 메일을 보냈고 참조로 넣었습니다.",
    chip=("성사", "gray"), tag="견적 요청",
    title="선정하신 호텔과 연결해 드렸습니다.",
    lead="{{ORG_CONTACT_NAME}}님, 선정하신 호텔의 담당자에게 연결 메일을 보냈고 참조로 넣었습니다. 이 메일은 확인용이니, 이후 소통은 연결 메일에서 이어 가시면 됩니다.",
    rows=[("선정 호텔", "{{SELECTED_HOTEL}}"), ("호텔에 전달한 정보", "회사명 · 담당자 이름 · 이메일 · 전화"),
          ("연결 메일", "호텔 담당자에게 발송, 담당자님 참조")],
    callouts=[("gray", "이제 호텔과 직접 진행하시면 됩니다", "계약과 결제는 호텔과 직접 진행합니다. 다른 호텔에는 결과만 전달되며 회사명과 연락처는 전달되지 않았습니다.")],
    cta=("진행 상황 보기", "{{TRACK_URL}}"), link_note=KO_LINK, policy=KO_POLICY, why=KO_WHY,
    alimtalk=dict(code="micego_org_won", emph="선정 호텔과 연결했습니다", buttons=["진행 상황 보기"],
      body="[MICEGO] 선정하신 호텔과 연결해 드렸습니다.\n\n{{ORG_CONTACT_NAME}}님, {{RFP_ID}} 요청의 선정 호텔은 {{SELECTED_HOTEL}}입니다.\n\n호텔 담당자에게 연결 메일을 보냈고 담당자님을 참조로 넣었습니다. 호텔에는 회사명({{ORG_COMPANY}})과 담당자 연락처(이메일·전화)가 전달되었습니다.\n\n계약과 결제는 호텔과 직접 진행하시면 됩니다. 주최 측 수수료는 없습니다.\n\n※ 이 메시지는 견적을 요청하신 분께 발송되는 안내입니다.",
      fb_title="[MICEGO] 호텔 선정·연결 안내"))

add(id="ORG_LOST", name="미성사 종료", recipient="org", mode="auto", lang="ko",
    trigger="#11 전달됨 → 미성사 · #8 취합중 → 미성사", trig_nums=["11", "8"], states="전달됨·취합중 → 미성사",
    subject="[MICEGO] 이번 요청은 성사 없이 종료되었습니다 · {{RFP_ID}}",
    preheader="요청번호 {{RFP_ID}} · 종료 사유와 이후 안내를 드립니다. 새 요청은 언제든 가능합니다.",
    chip=("미성사", "gray"), tag="견적 요청",
    title="이번 요청은 성사 없이 종료되었습니다.",
    lead="{{ORG_CONTACT_NAME}}님, {{RFP_ID}} 요청을 다음 사유로 종료했습니다.",
    rows=[("요청번호", "{{RFP_ID}}"), ("행사", "{{DESTINATION}} {{EVENT_TYPE}} · {{PAX}}")],
    callouts=[("gray", "종료 사유", "{{LOST_REASON}}"),
              ("gray", "호텔에 전달되는 정보", "호텔에는 요청이 종료되었다는 결과만 전달되며, 회사명과 담당자 연락처는 전달되지 않았습니다.")],
    extra_para="조건이 정해지면 새로 요청해 주세요. 진행 상황 페이지에서 받으신 제안 기록을 계속 보실 수 있습니다.",
    cta=("진행 상황 보기", "{{TRACK_URL}}"), link_note=KO_LINK, policy=KO_POLICY, why=KO_WHY,
    lost_phrases=LOST_PHRASES,
    alimtalk=dict(code="micego_org_lost", emph=None, buttons=["진행 상황 보기"],
      body="[MICEGO] 이번 요청은 성사 없이 종료되었습니다.\n\n{{ORG_CONTACT_NAME}}님, {{RFP_ID}} 요청을 종료했습니다.\n\n■ 사유: {{LOST_REASON}}\n\n호텔에는 종료 결과만 전달되며, 회사명과 담당자 연락처는 전달되지 않았습니다. 조건이 정해지면 새로 요청해 주세요.\n\n※ 이 메시지는 견적을 요청하신 분께 발송되는 안내입니다.",
      fb_title="[MICEGO] 요청 종료 안내"))

add(id="ORG_CANCELLED", name="취소 확인", recipient="org", mode="auto", lang="ko",
    trigger="#12 종료 전 어느 상태 → 취소", trig_nums=["12"], states="접수됨~전달됨 → 취소",
    subject="[MICEGO] 요청이 취소되었습니다 · {{RFP_ID}}",
    preheader="요청번호 {{RFP_ID}} · 취소를 확인했습니다. 회사명과 연락처는 어느 호텔에도 전달되지 않았습니다.",
    chip=("취소", "red"), tag="견적 요청",
    title="요청이 취소되었습니다.",
    lead="{{ORG_CONTACT_NAME}}님, 아래 요청의 취소를 확인했습니다.",
    rows=[("요청번호", "{{RFP_ID}}"), ("행사", "{{DESTINATION}} {{EVENT_TYPE}}"), ("취소일시", "{{CANCELLED_AT}}")],
    callouts=[("red", "전달된 정보 없음", "회사명과 담당자 연락처는 어느 호텔에도 전달되지 않았습니다.")],
    extra_para="다시 진행하실 때는 새로 요청해 주세요.",
    cta=("진행 상황 보기", "{{TRACK_URL}}"), link_note=KO_LINK, policy=KO_POLICY, why=KO_WHY,
    alimtalk=dict(code="micego_org_cancelled", emph=None, buttons=["진행 상황 보기"],
      body="[MICEGO] 요청이 취소되었습니다.\n\n{{ORG_CONTACT_NAME}}님, {{RFP_ID}} 요청의 취소를 확인했습니다.\n\n■ 행사: {{DESTINATION}} {{EVENT_TYPE}}\n■ 취소일시: {{CANCELLED_AT}}\n\n회사명과 담당자 연락처는 어느 호텔에도 전달되지 않았습니다. 다시 진행하실 때는 새로 요청해 주세요.\n\n※ 이 메시지는 견적을 요청하신 분께 발송되는 안내입니다.",
      fb_title="[MICEGO] 요청 취소 확인"))

add(id="ORG_PICK_OTP", name="제안 선택 인증번호 (문자)", recipient="org", mode="auto", kind="sms", lang="ko",
    trigger="제안 선택 확인 (회원·비회원 모두, 요청에 등록된 휴대전화로 발송) · 공유 링크로는 발송되지 않음", trig_nums=[], states="전달됨 (선택 확인 단계)",
    sms=dict(body="[MICEGO] {{RFP_ID}} 제안 선택 인증번호 [{{CODE}}] (3분). 요청하지 않았다면 무시하세요."),
    note="알림톡 대신 문자로만 보냅니다. 유효 3분, 재발송 60초, 5회 틀리면 10분 잠금.")

# ---------------- Hotel (EN) ----------------
EN_SUMMARY_ROWS = [("Event type", "{{EVENT_TYPE}}"), ("Dates", "{{EVENT_DATES}}"), ("Attendees", "{{PAX}}"),
                   ("Destination", "{{DESTINATION}}"), ("Rooms required", "{{ROOMS}}")]
SHORT_ROWS = [("Destination", "{{DESTINATION}}"), ("Attendees", "{{PAX}}"), ("Dates", "{{EVENT_DATES}}")]

add(id="HTL_INVITE", name="Bid invitation", recipient="htl", mode="auto", lang="en",
    trigger="#4 오픈 → 비딩중 · 비딩중 추가 초대 · 재초대 (라운드 ≥ 2)", trig_nums=["4", "7", "9"], states="초대 생성 (invited)",
    subject="[MICEGO] New group request · REF {{RFP_ID}} · quotes by {{DEADLINE_KST}}",
    subject_alt="[MICEGO] Updated request, new deadline · REF {{RFP_ID}} · quotes by {{DEADLINE_KST}}",
    preheader="Ref {{RFP_ID}} · {{DESTINATION}} · Quotes due {{DEADLINE_KST}}.",
    chip=("New request", "teal"), tag="Partner Network",
    title="A new MICE group request matches your destination.",
    lead="MICEGO sources overseas MICE programs for Korean organizers. This request has confirmed dates and a complete brief, and we are inviting a short list of hotels to quote.",
    optional_block=dict(name="REINVITE", cond="ROUND >= 2 (re-invite after the organizer changed the brief)",
        callout=("amber", "Updated request &mdash; new deadline",
                 "The organizer changed the brief (round {{ROUND}}): {{CHANGE_SUMMARY}}. The earlier deadline ({{PREV_DEADLINE}}) no longer applies &mdash; please quote by {{DEADLINE_KST}}. Any earlier quote is kept on file, but please submit a new one for the updated request.")),
    rows=EN_SUMMARY_ROWS + [("Event space", "{{EVENT_SPACE}}"), ("Notes (reviewed by MICEGO)", "{{PUBLIC_NOTE}}")],
    callouts=[("amber", "Quote deadline &mdash; {{DEADLINE_KST}}", "Late submissions cannot be included in the organizer's comparison sheet. We'll send a reminder 24 hours before the deadline.")],
    cta=("View request & submit quote", "{{HOTEL_BID_URL}}"),
    link_note="This is your personal link &mdash; no login needed. Opening it marks the invitation as viewed, and it stops working when the request closes. Please don&rsquo;t forward it.",
    decline="<a href=\"{{HOTEL_BID_URL}}\" style=\"color:#076E67;text-decoration:underline;\">Can&rsquo;t quote on this one? Decline on the request page</a> &mdash; it never counts against you; three unanswered invitations in a row pause your listing.",
    policy="The organizer's company name is withheld, and the budget is never part of the brief. Your property name is shown to the organizer only if they select your proposal &mdash; in that case you receive the organizer's company name and contact details.",
    why=EN_WHY_HTL, unsub=True)

add(id="HTL_REMINDER", name="Deadline reminder (24h)", recipient="htl", mode="auto", lang="en",
    trigger="마감 24시간 전 · 미제출·미거절 초대 (cron 1분)", trig_nums=[], states="비딩중 · 초대 invited/viewed",
    subject="[MICEGO] Reminder: quotes close in 24 hours · REF {{RFP_ID}} · quotes by {{DEADLINE_KST}}",
    preheader="Ref {{RFP_ID}} · {{PAX}} · Quotes close {{DEADLINE_KST}}.",
    chip=("Reminder", "amber"), tag="Partner Network",
    title="Quotes for this request close in 24 hours.",
    lead="You haven&rsquo;t submitted or declined yet. If you&rsquo;d like to be considered, please quote before the deadline. If this one isn&rsquo;t a fit, declining takes one click.",
    rows=SHORT_ROWS + [("Status", "Not yet submitted")],
    callouts=[("amber", "Quote deadline &mdash; {{DEADLINE_KST}}", "Late submissions cannot be included in the organizer's comparison sheet.")],
    cta=("Open request page", "{{HOTEL_BID_URL}}"),
    link_note="This is your personal link &mdash; no login needed. Please don&rsquo;t forward it. If you&rsquo;ve just submitted or declined, you can ignore this reminder.",
    decline="<a href=\"{{HOTEL_BID_URL}}\" style=\"color:#076E67;text-decoration:underline;\">Decline on the request page</a> &mdash; it never counts against you.",
    policy="The organizer's company name is withheld, and the budget is never part of the brief. Your property name is shown to the organizer only if they select your proposal.",
    why=EN_WHY_HTL, unsub=True)

add(id="HTL_QUOTE_RECEIVED", name="Quote received", recipient="htl", mode="auto", lang="en",
    trigger="호텔 견적 제출·수정 (초대 상태 submitted, 호텔 액션)", trig_nums=[], states="비딩중 · 초대 submitted",
    subject="[MICEGO] Quote received · REF {{RFP_ID}}",
    preheader="Ref {{RFP_ID}} · Quote received ({{CURRENCY}}). Revise until {{DEADLINE_KST}}.",
    chip=("Quote received", "teal"), tag="Partner Network",
    title="We&rsquo;ve received your quote.",
    lead="Thank you, {{HOTEL_CONTACT_NAME}}. Your quote is on file. If you revise it, the latest version replaces the earlier one.",
    rows=[("Request", "{{DESTINATION}} &middot; {{PAX}}"), ("Currency", "{{CURRENCY}}"), ("Submitted at", "{{SUBMITTED_AT}}"),
          ("Changes allowed until", "{{DEADLINE_KST}}")],
    callouts=[("amber", "You can revise until {{DEADLINE_KST}}", "Use the same personal link below. After the deadline the quote is locked and goes into the organizer's comparison sheet.")],
    cta=("Review or revise quote", "{{HOTEL_BID_URL}}"), link_note=EN_LINK, policy="Your property name is shown to the organizer only if they select your proposal. We&rsquo;ll email you the result either way.",
    why=EN_WHY_HTL)

add(id="HTL_SELECTED_CONNECT", name="Selected + organizer introduction", recipient="htl", mode="auto", lang="en",
    trigger="#10 전달됨 → 성사 (선정 호텔 1곳, 오거나이저 참조)", trig_nums=["10"], states="전달됨 → 성사 · 초대 selected",
    subject="[MICEGO] Your proposal was selected · REF {{RFP_ID}}",
    preheader="Ref {{RFP_ID}} · The organizer selected your proposal. Their contact details are below.",
    chip=("Selected", "teal"), tag="Partner Network",
    title="Your proposal was selected.",
    lead="The organizer selected {{HOTEL_NAME}} for the request below. Their details follow, and they are copied on this email &mdash; reply to all to get started.",
    rows=[("Organizer company", "{{ORG_COMPANY}}"), ("Contact name", "{{ORG_CONTACT_FULL}}"), ("Email", "{{ORG_EMAIL}}"), ("Phone", "{{ORG_PHONE}}"),
          ("Request", "{{DESTINATION}} &middot; {{PAX}} &middot; {{EVENT_DATES}}")],
    callouts=[("gray", "Next step", "Contracting and payment are arranged directly between your property and the organizer.")],
    cta=("View result page", "{{HOTEL_BID_URL}}"), link_note=EN_LINK,
    policy="The budget was never part of the brief. Your personal link keeps showing your submitted quote and this result.",
    why=EN_WHY_HTL, cc="{{ORG_EMAIL}}")

add(id="HTL_NOT_SELECTED", name="Not selected", recipient="htl", mode="auto", lang="en",
    trigger="#10 전달됨 → 성사 (선정되지 않은 제출 호텔)", trig_nums=["10"], states="전달됨 → 성사 · 초대 not_selected",
    subject="[MICEGO] Result: not selected this time · REF {{RFP_ID}}",
    preheader="Ref {{RFP_ID}} · The organizer chose another proposal. Your details were not shared.",
    chip=("Not selected", "gray"), tag="Partner Network",
    title="The organizer chose another proposal this time.",
    lead="Thank you for quoting, {{HOTEL_CONTACT_NAME}}. We appreciate the time you put into this request.",
    rows=SHORT_ROWS + [("Result", "Not selected")],
    callouts=[("gray", "Nothing was shared", "Your property name and contact details were not shared with the organizer. Your personal link still shows this result and your submitted quote.")],
    cta=("View result page", "{{HOTEL_BID_URL}}"), link_note=EN_LINK,
    policy="Not being selected never affects your listing. We&rsquo;ll invite you to matching requests as they come in.",
    why=EN_WHY_HTL)

# ---------------- Partner applicant (EN) ----------------
PTN_WHY = "You are receiving this because you applied to the MICEGO Partner Network."
add(id="PTN_APPLIED", name="Partner application received", recipient="ptn", mode="auto", lang="en",
    trigger="파트너 신청 접수 (상태 pending 생성)", trig_nums=[], states="신청 (pending)",
    subject="[MICEGO] Partner application received · REF {{PARTNER_ID}}",
    preheader="Ref {{PARTNER_ID}} · We received your application and will reply within 5 business days.",
    chip=("Application received", "teal"), tag="Partner Network", ref_var="PARTNER_ID",
    title="We received your partner application.",
    lead="Thank you for applying to join the MICEGO Partner Network, {{APPLICANT_NAME}}. We&rsquo;ll check the property and contact details and reply by email.",
    rows=[("Property", "{{PROPERTY_NAME}}"), ("Location", "{{PROPERTY_LOCATION}}"), ("Applicant", "{{APPLICANT_NAME}}"), ("Received", "{{APPLIED_AT}}")],
    callouts=[("amber", "We&rsquo;ll reply within 5 business days", "Expect our decision by {{REVIEW_BY}}. If we need to confirm anything, we&rsquo;ll write to you at this address.")],
    cta=None, link_note=None, policy="There is no listing fee to join the network.", why=PTN_WHY)

add(id="PTN_APPROVED", name="Partner approved", recipient="ptn", mode="auto", lang="en",
    trigger="신청·심사중 → 승인", trig_nums=[], states="파트너 승인 (approved)",
    subject="[MICEGO] Partner application approved · REF {{PARTNER_ID}}",
    preheader="Ref {{PARTNER_ID}} · You're approved. Invitations arrive by email; here is how it works.",
    chip=("Approved", "teal"), tag="Partner Network", ref_var="PARTNER_ID",
    title="Welcome to the MICEGO Partner Network.",
    lead="{{PROPERTY_NAME}} is approved. From now on, when an organizer&rsquo;s request matches your destination and group capacity, we&rsquo;ll invite you to quote. Here is what to expect.",
    rows=[("Invitations", "You receive a personal quote link by email &mdash; no login and no account to manage."),
          ("Declining", "You can decline any request. Declining never counts against you."),
          ("Pausing", "If three invitations in a row go unanswered, we pause your listing. Reply to us and we&rsquo;ll reinstate it."),
          ("Fees", "There is no listing fee to join.")],
    callouts=[("gray", "Approved &middot; {{PROPERTY_NAME}}", "Listed for {{PROPERTY_LOCATION}}. Your first invitation will come when a matching request opens.")],
    cta=None, link_note=None, policy="Organizers&rsquo; company names are withheld until they select a proposal, and the budget is never part of a brief.", why=PTN_WHY)

add(id="PTN_REJECTED", name="Partner not approved", recipient="ptn", mode="auto", lang="en",
    trigger="신청·심사중 → 거절 (사유 필수)", trig_nums=[], states="파트너 거절 (rejected)",
    subject="[MICEGO] Partner application update · REF {{PARTNER_ID}}",
    preheader="Ref {{PARTNER_ID}} · We can't approve this application right now. The reason is inside.",
    chip=("Not approved", "red"), tag="Partner Network", ref_var="PARTNER_ID",
    samples={"PROPERTY_NAME": "Patong Sands Hotel", "PROPERTY_LOCATION": "Patong, Phuket, Thailand", "APPLICANT_NAME": "Nattapong S."},
    title="We can&rsquo;t approve this application right now.",
    lead="Thank you for applying, {{APPLICANT_NAME}}. We reviewed {{PROPERTY_NAME}} and weren&rsquo;t able to approve it.",
    rows=[("Property", "{{PROPERTY_NAME}}"), ("Location", "{{PROPERTY_LOCATION}}")],
    callouts=[("red", "Reason", "{{PTN_REJECT_REASON}}")],
    extra_para="You&rsquo;re welcome to reapply when this changes.",
    cta=("Apply again", "{{PARTNER_APPLY_URL}}"), link_note=None, policy="There is no listing fee to join the network.", why=PTN_WHY,
    ptn_reject_phrases=PTN_REJECT_PHRASES)

add(id="PTN_REINSTATED", name="Partner reinstated", recipient="ptn", mode="auto", lang="en",
    trigger="중지 → 승인 (재승인)", trig_nums=[], states="파트너 재승인 (suspended → approved)",
    subject="[MICEGO] Your listing is active again · REF {{PARTNER_ID}}",
    preheader="Ref {{PARTNER_ID}} · Thanks for getting back to us. Invitations will resume.",
    chip=("Reinstated", "teal"), tag="Partner Network", ref_var="PARTNER_ID",
    title="Your listing is active again.",
    lead="Thanks for getting back to us. {{PROPERTY_NAME}} is approved again and can receive invitations.",
    rows=[("Property", "{{PROPERTY_NAME}}"), ("Status", "Active")],
    callouts=[("gray", "Nothing else to do", "Invitations will arrive by email as matching requests open.")],
    cta=None, link_note=None, policy="Declining a request never counts against you. There is no listing fee to join.", why=PTN_WHY)

# ---------------- Member accounts (KO) ----------------
ACC_WHY = "이 메일은 MICEGO 회원 계정과 관련해 해당 이메일 주소로 발송됩니다."
KO_MY_LINK = "개인 링크입니다. 외부에 전달하지 말아 주세요."
def acc(**kw):
    kw.setdefault("recipient", "mem"); kw.setdefault("mode", "auto"); kw.setdefault("lang", "ko")
    kw.setdefault("tag", "회원 계정"); kw.setdefault("ref_var", None); kw.setdefault("why", ACC_WHY)
    kw.setdefault("link_note", None); kw.setdefault("trig_nums", []); kw.setdefault("cta", None)
    add(**kw)

acc(id="ACC_EMAIL_CODE", name="이메일 인증번호", trigger="회원 가입 · 이메일 변경 중 이메일 인증 단계 (재발송 포함)", states="가입 진행 (pending_email) · 이메일 변경",
    subject="[MICEGO] 이메일 인증번호를 보내드립니다",
    preheader="{{PURPOSE}} 화면에 아래 6자리 인증번호를 입력해 주세요. 유효 시간은 {{EXPIRES_MIN}}분입니다.",
    chip=("이메일 인증", "teal"),
    title="이메일 인증번호를 보내드립니다.",
    lead="MICEGO {{PURPOSE}} 화면에 아래 6자리 인증번호를 입력해 주세요.",
    code=("인증번호 (6자리)", "{{CODE}}"),
    rows=[("용도", "{{PURPOSE}}"), ("유효 시간", "{{EXPIRES_MIN}}분"), ("재발송", "60초 뒤부터 가능")],
    callouts=[("amber", "{{EXPIRES_MIN}}분 안에 입력해 주세요", "시간이 지났거나 5회 잘못 입력하면 이 번호는 무효가 됩니다. 화면에서 새 인증번호를 받아 주세요.")],
    policy="본인이 요청하지 않았다면 이 메일을 무시해 주세요. 인증번호를 입력하지 않으면 아무 일도 일어나지 않습니다. MICEGO는 전화나 메일로 인증번호를 묻지 않으니 다른 사람에게 알려 주지 마세요.",
    why="이 메일은 MICEGO 회원 가입 또는 이메일 변경을 시도한 주소로 발송됩니다.")

acc(id="ACC_EMAIL_EXISTS", name="이미 가입된 이메일 안내", trigger="이미 회원인 이메일로 가입을 시도 (가입 화면에는 티 내지 않고 이 메일로만 알림)", states="가입 시도 (기존 회원)",
    subject="[MICEGO] 이미 가입된 이메일입니다",
    preheader="방금 이 주소로 회원 가입이 시도되었습니다. 이미 계정이 있어 새로 만들지 않았고, 로그인 방법을 안내드립니다.",
    chip=("가입 안내", "gray"),
    title="이 이메일은 이미 회원으로 가입되어 있습니다.",
    lead="방금 이 주소로 회원 가입이 시도되었습니다. 이미 가입하신 계정이 있어 새 계정은 만들어지지 않았습니다. 기존 계정으로 로그인해 주세요.",
    rows=[],
    callouts=[("gray", "비밀번호가 기억나지 않으신가요", "재설정 링크를 받아 새 비밀번호를 정하실 수 있습니다. 링크는 30분 동안 한 번만 쓸 수 있습니다.")],
    extra_para='<a href="{{RESET_URL}}" style="color:#0B8F86;font-weight:700;">비밀번호 재설정하기</a>',
    cta=("로그인하기", "{{LOGIN_URL}}"),
    policy="본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다. 계정에는 아무 변경도 없습니다. 누군가 내 이메일로 계속 가입을 시도하는 것 같다면 {{SUPPORT_EMAIL}}로 알려 주세요.")

acc(id="ACC_WELCOME", name="가입 완료 안내", trigger="휴대전화 인증 완료 → 정상(active) 전환", states="pending_phone → active",
    subject="[MICEGO] 회원 가입을 마쳤습니다",
    preheader="{{CONTACT_NAME}}님, 가입해 주셔서 감사합니다. 이제 견적 요청을 「내 견적 요청」에서 한곳에 볼 수 있습니다.",
    chip=("가입 완료", "teal"),
    title="{{CONTACT_NAME}}님, 가입을 마쳤습니다.",
    lead="이제 견적 요청 현황을 한곳에서 확인하고, 동료에게는 요청별 보기 전용 링크를 보낼 수 있습니다.",
    rows=[("이전 요청 연결", "{{LINKED_COUNT}}건"), ("내 견적 요청", "로그인 후 상단 「내 견적 요청」"), ("제안 선택", "요청하신 분만 가능 (휴대전화 인증)")],
    callouts=[("gray", "이전에 접수한 요청이 있다면", "같은 이메일로 접수한 비회원 요청은 자동으로 연결됩니다. 휴대전화 번호만 같은 요청은 운영팀 확인 뒤(영업일 기준 1일) 연결됩니다.")],
    cta=("내 견적 요청 보기", "{{MY_URL}}"), link_note=KO_MY_LINK,
    policy="본인이 가입하지 않았다면 이 메일에 회신해 알려 주세요. 확인 후 계정을 삭제하겠습니다.",
    alimtalk=dict(code="micego_acc_welcome", emph=None, buttons=["내 견적 요청 보기"], btn_url=BASE_URL + "/ko/my.html", fb_label="내 견적 요청",
      notice="※ 이 메시지는 MICEGO 회원 가입을 마치신 분께 발송되는 안내입니다.",
      body="[MICEGO] 회원 가입을 마쳤습니다.\n\n{{CONTACT_NAME}}님, 가입해 주셔서 감사합니다. 이제 견적 요청 현황을 「내 견적 요청」에서 한곳에 확인하실 수 있습니다.\n\n■ 연결한 이전 요청: {{LINKED_COUNT}}건\n\n동료에게는 요청별 보기 전용 링크를 보내 함께 볼 수 있습니다. 제안 선택은 요청하신 분만 할 수 있습니다.\n\n※ 이 메시지는 MICEGO 회원 가입을 마치신 분께 발송되는 안내입니다.",
      fb_title="[MICEGO] 회원 가입 완료"))

acc(id="ACC_LINKED", name="이전 요청 연결 안내", trigger="비회원 요청 자동 연결 (같은 이메일) · 운영자 연결 승인 (휴대전화만 일치)", states="비회원 요청 → 회원 요청",
    subject="[MICEGO] 이전 요청을 계정에 연결했습니다",
    preheader="비회원으로 접수하신 요청 {{LINKED_COUNT}}건이 「내 견적 요청」에 추가되었습니다. 요청번호를 확인해 주세요.",
    chip=("요청 연결", "teal"),
    title="이전 요청 {{LINKED_COUNT}}건을 계정에 연결했습니다.",
    lead="비회원으로 접수하신 요청이 이 계정의 「내 견적 요청」에 추가되었습니다.",
    rows=[("연결한 요청", "{{RFP_REFS}}"), ("확인 위치", "내 견적 요청")],
    callouts=[("gray", "달라지는 점", "요청의 진행 알림은 계속 받으시고, 제안을 선택할 때의 인증번호는 계정에 등록한 휴대전화로 갑니다. 동료에게는 보기 전용 링크를 보낼 수 있습니다.")],
    cta=("내 견적 요청 보기", "{{MY_URL}}"), link_note=KO_MY_LINK,
    policy="본인이 요청하지 않았거나 내 요청이 아니라면 이 메일에 회신해 알려 주세요. 확인 후 바로 연결을 해제하겠습니다.")

acc(id="ACC_PW_RESET", name="비밀번호 재설정 링크", trigger="비밀번호 재설정 요청 (가입된 이메일일 때만 실제 발송, 화면 응답은 동일)", states="재설정 요청",
    subject="[MICEGO] 비밀번호 재설정 링크를 보내드립니다",
    preheader="아래 버튼으로 새 비밀번호를 정해 주세요. 링크는 {{EXPIRES_MIN}}분 동안 한 번만 쓸 수 있습니다.",
    chip=("비밀번호 재설정", "amber"),
    title="비밀번호 재설정 링크를 보내드립니다.",
    lead="아래 버튼을 눌러 새 비밀번호를 정해 주세요. 새 비밀번호는 이 메일에 담기지 않습니다.",
    rows=[("유효 시간", "{{EXPIRES_MIN}}분 · 한 번만 사용"), ("완료 후", "모든 기기에서 로그아웃됩니다")],
    callouts=[("amber", "재설정은 이메일로만 진행합니다", "문자로는 재설정하지 않습니다. 링크가 만료됐거나 이미 썼다면 로그인 화면에서 다시 요청해 주세요.")],
    cta=("비밀번호 재설정하기", "{{RESET_URL}}"), link_note="개인 링크입니다. 외부에 전달하지 말아 주세요.",
    samples={"EXPIRES_MIN": "30"},
    policy="본인이 요청하지 않았다면 이 메일을 무시해 주세요. 링크를 누르지 않으면 비밀번호는 바뀌지 않습니다. 계속 요청이 온다면 {{SUPPORT_EMAIL}}로 알려 주세요.")

acc(id="ACC_PW_CHANGED", name="비밀번호 변경 완료", trigger="비밀번호 변경 · 재설정 완료", states="비밀번호 변경",
    subject="[MICEGO] 비밀번호가 변경되었습니다",
    preheader="{{CHANGED_AT}}에 계정 비밀번호가 바뀌었고 다른 기기는 모두 로그아웃되었습니다. 본인이 아니라면 바로 확인해 주세요.",
    chip=("비밀번호 변경", "gray"),
    title="비밀번호가 변경되었습니다.",
    lead="{{CHANGED_AT}}에 계정 비밀번호가 바뀌었습니다. 다른 기기는 모두 로그아웃되었습니다.",
    rows=[("변경 일시", "{{CHANGED_AT}}"), ("다른 기기", "모두 로그아웃됨")],
    callouts=[("red", "본인이 바꾸지 않았다면 바로 재설정해 주세요", "아래 버튼으로 비밀번호를 다시 정하면 다른 사람이 쓰던 로그인이 모두 종료됩니다.")],
    cta=("비밀번호 재설정하기", "{{RESET_URL}}"), link_note="개인 링크입니다. 외부에 전달하지 말아 주세요. 30분 안에 한 번만 쓸 수 있습니다.",
    policy="본인이 요청하지 않았다면 위 버튼으로 바로 비밀번호를 다시 정하고 {{SUPPORT_EMAIL}}로 알려 주세요. 비밀번호는 이 메일에 담기지 않으며 MICEGO도 알 수 없습니다.")

acc(id="ACC_EMAIL_CHANGED", name="이메일 변경 완료 (이전 주소)", trigger="로그인 이메일 변경 완료 → 변경 전 주소로 발송", states="이메일 변경",
    subject="[MICEGO] 로그인 이메일이 변경되었습니다",
    preheader="이 계정의 로그인 이메일이 {{NEW_EMAIL_MASKED}}(으)로 바뀌었습니다. 본인이 아니라면 바로 알려 주세요.",
    chip=("이메일 변경", "gray"),
    title="로그인 이메일이 변경되었습니다.",
    lead="이 계정의 로그인 이메일이 새 주소로 바뀌었습니다. 이 주소로는 더 이상 로그인할 수 없고 알림도 가지 않습니다.",
    rows=[("새 이메일", "{{NEW_EMAIL_MASKED}}"), ("변경 일시", "{{CHANGED_AT}}")],
    callouts=[("red", "본인이 바꾸지 않았다면", "{{SUPPORT_EMAIL}}로 바로 알려 주세요. 확인 후 계정을 원래대로 되돌려 드립니다.")],
    policy="본인이 요청하지 않았다면 이 메일에 회신해 즉시 알려 주세요. 이 메일은 변경 전 주소로만 발송됩니다.",
    why="이 메일은 변경 전 로그인 이메일 주소로 발송됩니다.")

acc(id="ACC_PHONE_CHANGED", name="휴대전화 변경 완료", trigger="계정 휴대전화 변경 완료 (새 번호 인증 후)", states="휴대전화 변경",
    subject="[MICEGO] 휴대전화 번호가 변경되었습니다",
    preheader="계정의 휴대전화가 {{NEW_PHONE_MASKED}}(으)로 바뀌었습니다. 본인이 아니라면 바로 알려 주세요.",
    chip=("휴대전화 변경", "gray"),
    title="휴대전화 번호가 변경되었습니다.",
    lead="계정에 등록된 휴대전화가 바뀌었습니다. 앞으로 진행 알림과 제안 선택 인증번호는 새 번호로 갑니다.",
    rows=[("새 휴대전화", "{{NEW_PHONE_MASKED}}"), ("변경 일시", "{{CHANGED_AT}}")],
    callouts=[("amber", "진행 중인 요청에도 적용됩니다", "제안을 선택할 때 받는 인증번호도 새 번호로 갑니다.")],
    cta=("비밀번호 재설정하기", "{{RESET_URL}}"), link_note="본인이 바꾸지 않았다면 이 링크로 비밀번호를 다시 정해 주세요. 30분 안에 한 번만 쓸 수 있습니다.",
    policy="본인이 요청하지 않았다면 바로 {{SUPPORT_EMAIL}}로 알려 주세요. 로그인 비밀번호도 함께 바꾸시길 권합니다.")

acc(id="ACC_LOCKED", name="계정 잠금 안내", trigger="1시간 안에 로그인 10회 실패 → 잠금", states="active → locked",
    subject="[MICEGO] 로그인 실패가 반복되어 계정을 잠갔습니다",
    preheader="{{LOCKED_AT}}에 로그인 실패가 10회 이어져 계정을 보호하려고 잠갔습니다. 비밀번호를 재설정하면 풀립니다.",
    chip=("계정 잠금", "red"),
    title="로그인 실패가 반복되어 계정을 잠갔습니다.",
    lead="1시간 안에 로그인에 10회 실패해 계정을 보호하려고 로그인을 막았습니다.",
    rows=[("잠금 일시", "{{LOCKED_AT}}"), ("해제 방법", "비밀번호 재설정")],
    callouts=[("amber", "재설정하면 바로 풀립니다", "아래 버튼으로 새 비밀번호를 정하면 잠금이 풀리고 모든 기기에서 로그아웃됩니다. 링크는 30분 동안 한 번만 쓸 수 있습니다.")],
    cta=("비밀번호 재설정하기", "{{RESET_URL}}"), link_note="개인 링크입니다. 외부에 전달하지 말아 주세요.",
    policy="본인이 요청하지 않았다면(본인의 로그인 시도가 아니라면) 위 링크를 누르지 않으셔도 됩니다. 다른 사이트에서 같은 비밀번호를 쓰고 있다면 그쪽도 바꾸시길 권합니다. 문의는 {{SUPPORT_EMAIL}}로 보내 주세요.")

acc(id="ACC_WITHDRAWN", name="탈퇴 완료 안내", trigger="회원 탈퇴 완료 (본인 요청 · 운영자 처리 포함)", states="active → withdrawn",
    subject="[MICEGO] 회원 탈퇴를 마쳤습니다",
    preheader="계정과 연락처를 파기하고 공유 링크를 모두 중지했습니다. 성사 기록은 3년간 보관합니다.",
    chip=("탈퇴 완료", "gray"),
    title="회원 탈퇴를 마쳤습니다.",
    lead="그동안 MICEGO를 이용해 주셔서 감사합니다. 계정과 연락처는 즉시 파기했고, 추적 링크와 공유 링크는 모두 사용을 중지했습니다.",
    rows=[("탈퇴 일시", "{{WITHDRAWN_AT}}"), ("파기한 정보", "이메일 · 휴대전화 · 로그인 정보"), ("보관하는 기록", "성사 요청의 연결 기록 (3년)")],
    callouts=[("gray", "이미 호텔에 전달된 정보", "선정 호텔에 이미 전달된 회사명과 담당자 정보는 회수되지 않습니다. 성사된 요청의 연결 기록은 분쟁 대응을 위해 3년간 보관한 뒤 파기합니다.")],
    policy="본인이 요청하지 않았다면 바로 {{SUPPORT_EMAIL}}로 알려 주세요. 같은 이메일로 다시 가입할 수 있지만 이전 요청은 연결되지 않습니다.",
    why="이 메일은 탈퇴한 계정의 이메일 주소로 마지막으로 발송됩니다.")

# ---------------- Feedback / VOC (KO) — 실제 발송은 supabase/functions/_shared/feedback_templates.ts (이 항목은 라이브러리 등록용) ----------------
FB_WHY = "이 메일은 MICEGO 사이트의 '의견 보내기' 또는 문의 페이지로 접수된 내용을 운영팀에 전달합니다."
add(id="FB_OPS_ALERT", name="피드백 운영 알림", recipient="fbk", mode="auto", lang="ko", tag="피드백", ref_var="FB_REF", trig_nums=[], cta=None, link_note=None,
    trigger="feedback-submit 접수 성공 (DEMO·의심·일일 상한 초과는 제외) → FEEDBACK_INBOX", states="feedback new",
    subject="[MICEGO 피드백] {{FB_REF}} · {{FB_CATEGORY}} · {{FB_USER_TYPE}}",
    preheader="{{FB_PAGE}} · 이 메일에 답장하면 접수자에게 바로 전달됩니다.",
    chip=("신규 접수", "amber"),
    title="새 의견이 접수되었습니다.",
    lead="접수번호 {{FB_REF}}. 답장할 때 제목의 접수번호를 지우지 마세요. 메일함 검색과 스레드의 기준입니다.",
    rows=[("접수번호", "{{FB_REF}}"), ("접수 시각", "{{FB_RECEIVED_AT}}"), ("유형", "{{FB_CATEGORY}}"), ("보낸 사람", "{{FB_USER_TYPE}}"),
          ("회신 주소", "{{FB_REPLY_EMAIL}}"), ("페이지", "{{FB_PAGE}}"), ("브라우저", "{{FB_UA}}")],
    callouts=[("gray", "내용", "{{FB_CONTENT}}"), ("amber", "콘솔에서 열기", "{{FB_CONSOLE_URL}}")],
    policy="토큰 원문·IP·회원 ID는 이 메일에 담지 않습니다. 접속 링크가 본문에 있으면 [token]으로 가려집니다.",
    why=FB_WHY)
add(id="FB_ACK", name="피드백 접수 확인", recipient="fbk", mode="auto", lang="ko", tag="피드백", ref_var="FB_REF", trig_nums=[], cta=None, link_note=None,
    trigger="회신 이메일 + 수집 동의가 있는 접수 (DEMO·의심 제외, 같은 주소 하루 3건까지)", states="feedback new",
    subject="[MICEGO] 보내 주신 의견을 접수했습니다 ({{FB_REF}})",
    preheader="접수번호 {{FB_REF}} · 답변이 필요한 내용이면 이 주소로 회신드립니다.",
    chip=("접수 확인", "teal"),
    title="보내 주신 의견을 접수했습니다.",
    lead="MICEGO에 의견을 보내 주셔서 감사합니다. 답변이 필요한 내용이면 담당자가 이 주소로 회신드립니다.",
    rows=[("접수번호", "{{FB_REF}}"), ("접수 유형", "{{FB_CATEGORY}}"), ("접수 시각", "{{FB_RECEIVED_AT}}")],
    callouts=[("gray", "덧붙일 내용이 있다면", "이 메일에 그대로 답장해 주세요. 제목의 접수번호는 지우지 말아 주세요.")],
    policy="직접 보내신 적이 없다면 이 메일은 무시하셔도 됩니다. 보안을 위해 보내 주신 본문은 이 확인 메일에 담지 않습니다.",
    why="이 메일은 MICEGO 사이트에서 의견을 보내며 회신 이메일을 남기고 동의하신 분께 발송됩니다.")

acc(id="ACC_SMS_OTP", name="휴대전화 인증번호 (문자)", trigger="회원 가입 · 휴대전화 변경 중 휴대전화 인증 단계 (이메일 인증 후에만 발송)", states="가입 진행 (pending_phone) · 휴대전화 변경",
    kind="sms", sms=dict(body="[MICEGO] 인증번호 [{{CODE}}]를 {{EXPIRES_MIN}}분 안에 입력해 주세요. 타인에게 알려주지 마세요."), samples={"EXPIRES_MIN": "3"},
    note="알림톡 대신 문자로만 보냅니다. 유효 3분, 재발송 60초, 하루 5회(번호당), 5회 틀리면 10분 잠금.")

# ---------------- Manual OPS ----------------
def ops(id, name, recipient_lang, trigger, subject, body, note=""):
    add(id=id, name=name, recipient="ops", mode="manual", lang=recipient_lang,
        trigger=trigger, trig_nums=[], states="", subject=subject, body=body, note=note)

ops("OPS_ORG_PROGRESS", "진행 상황 회신 (SLA)", "ko", "SLA 임박·초과 카드 (콘솔 적색/황색 바) — 진행 상황 + 예상일 안내",
 "[MICEGO] 진행 상황을 알려 드립니다 · {{RFP_ID}}",
 "{{ORG_CONTACT_NAME}}님, 안녕하세요. MICEGO입니다.\n\n{{RFP_ID}}({{DESTINATION}} {{EVENT_TYPE}}) 요청의 진행 상황을 알려 드립니다.\n\n- 현재 단계: {{CURRENT_STEP}}\n- 진행 내용: {{PROGRESS_NOTE}}\n- 다음 일정: {{NEXT_DATE}}에 {{NEXT_ACTION}}\n\n궁금하신 점은 이 메일에 회신해 주세요.\n\n감사합니다.\nMICEGO 드림\n{{SUPPORT_EMAIL}}",
 "SOP B-4: 진행 상황 + 예상일이면 회신으로 인정.")
ops("OPS_ORG_INFO", "정보 보완 요청", "ko", "검증중 · 필수 정보 부족·모순 (반려 전 1회 확인)",
 "[MICEGO] 요청 내용 확인을 부탁드립니다 · {{RFP_ID}}",
 "{{ORG_CONTACT_NAME}}님, 안녕하세요. MICEGO입니다.\n\n{{RFP_ID}} 요청을 검토하다가 아래 내용을 확인해야 호텔에 요청을 보낼 수 있어 문의드립니다.\n\n{{MISSING_ITEMS}}\n\n{{REPLY_BY}}까지 알려 주시면 바로 이어서 진행하겠습니다. 그때까지 확인이 어려우면 이번 요청은 진행하지 못할 수 있으니, 그 경우 알려 주세요.\n\n감사합니다.\nMICEGO 드림\n{{SUPPORT_EMAIL}}",
 "정보 부족은 3영업일 무응답이면 반려(사유: 필수 정보 부족).")
ops("OPS_ORG_DATE", "일정 확정 확인", "ko", "검증중 · 일정 미확정 의심 (자유 기재란의 '미정·예정·대략')",
 "[MICEGO] 행사 일정이 확정인지 확인 부탁드립니다 · {{RFP_ID}}",
 "{{ORG_CONTACT_NAME}}님, 안녕하세요. MICEGO입니다.\n\n{{RFP_ID}} 요청에 적어 주신 행사 일정({{DATE_ASKED}})이 확정된 일정인지 확인하고 싶습니다. MICEGO는 시작일이 확정된 요청만 호텔에 보내고 있습니다.\n\n확정이라면 「확정」이라고만 회신해 주세요. 아직 정해지지 않았다면, 확정되는 대로 새로 요청해 주시면 됩니다.\n\n{{REPLY_BY}}까지 회신이 없으면 이번 요청은 일정 미확정으로 종료합니다.\n\n감사합니다.\nMICEGO 드림\n{{SUPPORT_EMAIL}}",
 "1영업일 내 확정 답이 없으면 반려(사유: 일정 미확정).")
ops("OPS_ORG_NOQUOTE", "취합중 0건 현황 + 재요청 예정일", "ko", "취합중 · 제출 견적 0건",
 "[MICEGO] 받은 제안 현황과 다음 일정 안내 · {{RFP_ID}}",
 "{{ORG_CONTACT_NAME}}님, 안녕하세요. MICEGO입니다.\n\n{{RFP_ID}} 요청은 견적 마감({{DEADLINE_KST}})까지 호텔의 제안을 받지 못했습니다. 기다려 주셔서 감사하고, 결과를 바로 알려 드리지 못해 죄송합니다.\n\n다른 호텔에 {{REBID_DATE}}까지 다시 요청을 보낼 예정입니다. 새 마감과 비교표 예정일은 요청을 보낸 뒤 바로 알려 드리겠습니다. 조건을 조정하실 수 있다면 알려 주세요.\n\n감사합니다.\nMICEGO 드림\n{{SUPPORT_EMAIL}}",
 "두 라운드에도 0건이면 미성사로 닫고 사유를 알린다.")
ops("OPS_ORG_CLOSE_CHECK", "미성사 닫기 전 확인", "ko", "전달됨 · 선택 회신 없음 / 유효기한 임박 (닫기 전 1회 확인)",
 "[MICEGO] 제안 선택 여부를 확인드립니다 · {{RFP_ID}}",
 "{{ORG_CONTACT_NAME}}님, 안녕하세요. MICEGO입니다.\n\n{{RFP_ID}} 요청의 비교표를 전달드린 뒤 아직 선택 소식이 없어 확인드립니다. 제안 중 가장 빠른 견적 유효기한은 {{VALID_UNTIL_MIN}}입니다.\n\n- 진행하실 제안이 있다면 고르신 제안(A·B·C)을 회신해 주세요.\n- 이번에는 선택하지 않으신다면 그렇게만 알려 주셔도 됩니다.\n\n{{REPLY_BY}}까지 회신이 없으면 이번 요청은 성사 없이 종료합니다. 종료 후에도 새로 요청하실 수 있습니다.\n\n감사합니다.\nMICEGO 드림\n{{SUPPORT_EMAIL}}",
 "닫기 전 반드시 1회 이메일로 묻는다 (SOP 6).")
ops("OPS_ORG_FEW_HOTELS", "초대 가능 호텔 2곳 미만 사전 안내", "ko", "오픈 → 비딩중 전환 확인 창 (초대 2곳 미만)",
 "[MICEGO] 받으실 제안이 적을 수 있어 미리 안내드립니다 · {{RFP_ID}}",
 "{{ORG_CONTACT_NAME}}님, 안녕하세요. MICEGO입니다.\n\n{{RFP_ID}} 요청은 검토를 마쳤습니다. 다만 요청하신 조건에 맞는 호텔이 많지 않아, 받으시는 제안이 적을 수 있어 미리 알려 드립니다.\n\n{{OPTION_NOTE}}\n\n조건을 조정하실지, 지금 조건 그대로 진행할지 {{REPLY_BY}}까지 알려 주세요. 별도 회신이 없으면 지금 조건으로 요청을 보내겠습니다.\n\n감사합니다.\nMICEGO 드림\n{{SUPPORT_EMAIL}}",
 "호텔 수는 숫자로 적지 않는다.")
ops("OPS_ORG_ANON_INCIDENT", "익명화 누락 고지", "ko", "예외: 공개 메모에 회사명 등 노출 발견 (이미 열람한 호텔이 있을 때 당일)",
 "[MICEGO] 요건서 정보 노출 관련 안내 · {{RFP_ID}}",
 "{{ORG_CONTACT_NAME}}님, 안녕하세요. MICEGO입니다.\n\n{{RFP_ID}} 요청과 관련해 알려 드릴 일이 있습니다.\n\n- 사실: {{INCIDENT_FACT}}\n- 범위: {{INCIDENT_SCOPE}}\n- 조치: {{INCIDENT_ACTION}}\n\n확인이 늦지 않도록 발견한 당일 알려 드립니다. 저희 검토 과정에서 생긴 일이며, 불편과 우려를 드려 죄송합니다. 더 궁금하신 점은 이 메일에 회신해 주세요.\n\nMICEGO 드림\n{{SUPPORT_EMAIL}}",
 "약관 제7조 3항과 별개로 알린다. 이력에 메모를 남긴다. 사실·범위·조치만 적고 사유를 꾸미지 않는다.")
ops("OPS_HTL_FOLLOWUP", "Deadline follow-up (no reply)", "en", "비딩중 · 마감 24시간 이내 제출 0건 (자동 리마인더 이후)",
 "[MICEGO] Quick check before the deadline · REF {{RFP_ID}}",
 "Hello {{HOTEL_CONTACT_NAME}},\n\nA quick note on request {{RFP_ID}} ({{DESTINATION}}, {{PAX}}, {{EVENT_DATES}}). Quotes close {{DEADLINE_KST}}, and we haven't received one from {{HOTEL_NAME}} yet.\n\nIf you're planning to quote, the request page has everything you need: {{HOTEL_BID_URL}}\nIf this one isn't a fit, a quick decline there is just as helpful, and it never counts against you.\n\nThanks,\nMICEGO\n{{SUPPORT_EMAIL}}",
 "전화·개인 메일로 보낸 경우도 이력에 남긴다.")
ops("OPS_HTL_QUOTE_CHECK", "Quote check (blank fields / outliers)", "en", "취합중 · 비교표에 빈 항목·이상치 (트윈>킹, 유효기한이 행사일 전)",
 "[MICEGO] A quick check on your quote · REF {{RFP_ID}}",
 "Hello {{HOTEL_CONTACT_NAME}},\n\nThank you for your quote on {{RFP_ID}}. Before we pass it on, could you confirm the following?\n\n{{QUOTE_ISSUES}}\n\nPlease reply by {{REPLY_BY}} with the correct figures or a short confirmation. If we don't hear back, we'll send the quote as submitted.\n\nThanks,\nMICEGO\n{{SUPPORT_EMAIL}}",
 "마감 후에는 웹 수정이 닫히므로 답장으로 확인한다.")
ops("OPS_HTL_CANCELLED", "Request cancelled (during bidding)", "en", "#12 비딩중 취소 — SOP상 자동 알림 없음",
 "[MICEGO] Request cancelled · REF {{RFP_ID}}",
 "Hello {{HOTEL_CONTACT_NAME}},\n\nThe organizer has cancelled request {{RFP_ID}} ({{DESTINATION}}, {{EVENT_DATES}}), so we're no longer collecting quotes. Your personal link now shows the cancellation.\n\nThank you for the time you spent on it. This doesn't affect your listing, and we'll invite you to matching requests as they open.\n\nMICEGO\n{{SUPPORT_EMAIL}}",
 "취소 사유(오거나이저 사정)는 자세히 적지 않는다.")
ops("OPS_PTN_SUSPEND", "Listing paused + how to reinstate", "en", "파트너 승인 → 중지 (3회 연속 무응답 또는 견적 부정확 반복)",
 "[MICEGO] Your listing is paused · REF {{PARTNER_ID}}",
 "Hello {{APPLICANT_NAME}},\n\nWe've paused {{PROPERTY_NAME}} in the MICEGO Partner Network because {{SUSPEND_REASON}}. While paused, you won't receive new invitations.\n\nTo reinstate the listing, just reply to this email and confirm that {{HOTEL_CONTACT_EMAIL}} is still the right address for requests. We'll approve it again once we hear from you.\n\nThanks,\nMICEGO\n{{SUPPORT_EMAIL}}",
 "답이 오면 콘솔에서 재승인 → PTN_REINSTATED 자동 발송.")
ops("OPS_PTN_DOMAIN_CHECK", "Affiliation check (personal email)", "en", "파트너 심사중 · 담당자 이메일이 개인 메일 (호텔 도메인 아님)",
 "[MICEGO] Confirming your affiliation · REF {{PARTNER_ID}}",
 "Hello {{APPLICANT_NAME}},\n\nThank you for applying with {{PROPERTY_NAME}}. Your application uses a personal email address, so we'd like to confirm your affiliation with the property before approving.\n\nCould you reply with one of the following?\n- A message from an email address on the property's own domain, or\n- The property's official website page that lists you (or the sales team) as a contact.\n\nWe'll continue the review as soon as we hear from you, within our 5 business day window.\n\nThanks,\nMICEGO\n{{SUPPORT_EMAIL}}",
 "심사 기한(5영업일)은 계속 흐른다. 확인이 필요하면 심사중으로 두고 상황을 남긴다.")

ops("OPS_ACC_LINK", "회원 연결 요청 확인 (휴대전화 일치)", "ko", "회원 상세 · 연결 요청 대기 (비회원 요청의 휴대전화가 회원과 같지만 이메일은 다름) — 승인 전 본인 확인",
 "[MICEGO] 이전 요청을 계정에 연결할지 확인드립니다 · {{RFP_ID}}",
 "{{CONTACT_NAME}}님, 안녕하세요. MICEGO입니다.\n\n{{RFP_ID}} 요청이 회원님과 같은 휴대전화 번호로 접수되어 있어 확인드립니다. 회원님이 직접 접수하신 요청이 맞으면 「맞습니다」라고 회신해 주세요. 확인되면 {{MEMBER_EMAIL}} 계정의 「내 견적 요청」에 연결하고, 연결 안내 메일이 자동으로 나갑니다.\n\n본인이 접수한 요청이 아니라면 그렇게만 알려 주세요. 연결하지 않고 그대로 두겠습니다. {{REPLY_BY}}까지 회신이 없으면 연결하지 않습니다.\n\n감사합니다.\nMICEGO 드림\n{{SUPPORT_EMAIL}}",
 "요청의 회사명·행사 내용은 적지 않는다(요청번호만). 승인은 콘솔 회원 상세에서 사유와 함께 처리한다.")
ops("OPS_RFP_TRANSFER", "요청 이관 안내 (양쪽 회원)", "ko", "회원 상세 · 요청 이관 처리 직후 — 이전·새 담당 회원 두 분께 같은 내용을 보낸다 (자동 발송 없음)",
 "[MICEGO] 요청 담당자가 변경되었습니다 · {{RFP_ID}}",
 "안녕하세요. MICEGO입니다.\n\n{{RFP_ID}} 요청의 담당 회원이 {{FROM_NAME}}님에서 {{TO_NAME}}님으로 변경되었습니다. 이 안내는 두 분께 같은 내용으로 보냅니다.\n\n- {{TO_NAME}}님은 「내 견적 요청」에서 이 요청을 확인하고 제안을 선택하실 수 있습니다.\n- {{FROM_NAME}}님이 만드셨던 공유 링크는 꺼졌고, 이 요청은 더 이상 목록에 보이지 않습니다.\n- 이미 호텔에 보낸 요청서 내용은 바뀌지 않았습니다.\n\n본인이 요청하지 않았거나 다르게 알고 계신 부분이 있다면 이 메일에 회신해 주세요.\n\n감사합니다.\nMICEGO 드림\n{{SUPPORT_EMAIL}}",
 "이관 사유와 결과는 회원 상세 감사 로그에 남는다. 두 회원 각각에게 보내고 발송 기록은 콘솔에서 '직접 발송 필요'로 표시된다.")

# Console TPL name -> new IDs
CONSOLE_MAP = [
 ("접수 확인", "오거나이저", "ORG_RECEIVED", "알림톡·LMS 추가"),
 ("반려", "오거나이저", "ORG_REJECTED", "사유 3종 변수화, 알림톡·LMS 추가"),
 ("(신규) 비딩중 진입", "오거나이저", "ORG_BIDDING", "콘솔 목록에 없던 알림. 추가 필요"),
 ("(신규) 새 라운드", "오거나이저", "ORG_REBID", "콘솔 목록에 없던 알림. 추가 필요"),
 ("견적 도착", "오거나이저", "ORG_DELIVERED", "알림톡(강조표기)·LMS 추가"),
 ("(신규) 성사 확인", "오거나이저", "ORG_WON", "연결 메일 참조 수신 + 알림톡. 콘솔 목록에 없던 알림"),
 ("(신규) 미성사 종료", "오거나이저", "ORG_LOST", "콘솔 목록에 없던 알림. 추가 필요"),
 ("(신규) 취소 확인", "오거나이저", "ORG_CANCELLED", "콘솔 목록에 없던 알림. 추가 필요"),
 ("초대", "호텔", "HTL_INVITE", "라운드 2 이상 재초대 블록 포함"),
 ("리마인더", "호텔", "HTL_REMINDER", ""),
 ("(신규) 견적 수신 확인", "호텔", "HTL_QUOTE_RECEIVED", "콘솔 목록에 없던 알림. 추가 필요"),
 ("선정 · 미선정 결과", "호텔", "HTL_NOT_SELECTED", "미선정 결과는 이 템플릿. 선정 결과는 아래 연결 메일에 통합"),
 ("선정 연결 메일", "선정 호텔 (오거나이저 참조)", "HTL_SELECTED_CONNECT", "선정 결과와 연결 메일을 한 통으로 통합"),
 ("(신규) 파트너 신청 접수", "호텔 담당자", "PTN_APPLIED", "콘솔 목록에 없던 알림. 추가 필요"),
 ("파트너 심사 결과", "호텔 담당자", "PTN_APPROVED · PTN_REJECTED", "승인/거절 2개로 분리"),
 ("(신규) 파트너 재승인", "호텔 담당자", "PTN_REINSTATED", "콘솔 목록에 없던 알림. 추가 필요"),
 ("취소 시 호텔 안내", "초대 호텔", "OPS_HTL_CANCELLED", "수동 유지"),
 ("파트너 중지 안내", "호텔 담당자", "OPS_PTN_SUSPEND", "수동 유지"),
 ("(신규) 제안 선택 인증번호", "오거나이저 (회원·비회원)", "ORG_PICK_OTP", "문자(SMS) 전용, 알림톡 미사용"),
 ("(신규) 회원 가입·인증", "회원", "ACC_EMAIL_CODE · ACC_EMAIL_EXISTS · ACC_SMS_OTP · ACC_WELCOME", "회원제 v1. 이메일 3종 + 문자 1종(ACC_SMS_OTP)"),
 ("(신규) 요청 연결", "회원", "ACC_LINKED · OPS_ACC_LINK", "자동 연결은 ACC_LINKED, 휴대전화만 일치하면 운영자가 OPS_ACC_LINK로 확인"),
 ("(신규) 계정 보안 알림", "회원", "ACC_PW_RESET · ACC_PW_CHANGED · ACC_EMAIL_CHANGED · ACC_PHONE_CHANGED · ACC_LOCKED · ACC_WITHDRAWN", "모두 「본인이 요청하지 않았다면」 안내로 끝남"),
 ("(신규) 요청 이관", "회원 (양쪽)", "OPS_RFP_TRANSFER", "수동. 콘솔 회원 상세 · 요청 이관 뒤 직접 발송"),
 ("(신규) 피드백·VOC", "운영팀 / 접수자", "FB_OPS_ALERT · FB_ACK", "feedback-submit 함수가 직접 발송 (Resend, 멱등 키). 운영자 답변은 메일함에서 알림 메일에 답장"),
]

NEEDS_CONFIRM = [
 "카카오 알림톡 발송에는 카카오톡 채널 개설, 발신프로필 등록, 비즈니스 인증(사업자 확인)과 발송 대행사(딜러) 계약이 필요한 것으로 알려져 있습니다. 실제 요건은 카카오 비즈니스와 대행사 안내로 확인이 필요합니다.",
 "템플릿 검수에 걸리는 시간은 대행사·시기에 따라 다르며, 반려되면 문구를 고쳐 다시 제출해야 합니다. 일정을 잡기 전에 확인이 필요합니다.",
 "버튼 URL에 변수(#{추적토큰})를 넣는 방식이 검수에서 허용되는지: 변수 URL 허용 여부 검수 확인 필요. 도메인 뒤쪽(쿼리 값)에만 변수를 쓰는 형태로 작성했습니다.",
 "정보성 메시지가 맞는지: 「새로 요청하기」 버튼이 있는 반려 안내(ORG_REJECTED)는 광고성으로 분류될 여지가 있어 검수 확인이 필요합니다. 어렵다면 버튼을 빼고 문구만 남깁니다.",
 "강조표기 제목의 글자 수 제한과 사용 조건(ORG_DELIVERED, ORG_WON에만 사용)은 검수 안내로 확인이 필요합니다.",
 "야간 발송: 정보성 메시지는 법정 야간 제한(광고성 정보 21시–08시) 대상이 아닌 것으로 알려져 있으나 확인이 필요합니다. 운영 기준으로 리마인더성 문구는 08–21시 발송을 권장합니다. 현재 알림톡 8종은 상태 변경 즉시 발송이며 리마인더성은 없습니다.",
 "LMS 대체발송은 알림톡 수신 불가(카카오톡 미사용·차단 등) 시에만 나가도록 대행사 설정을 확인해야 합니다. 제목 40byte, 본문 2,000byte(EUC-KR 기준, 한글 2 · 영문·숫자·공백 1)로 계산했으며 특수문자(·, –, →)는 2byte로 보수적으로 셌습니다.",
 "도메인(micego.example)과 발신 주소(FROM_ADDRESS), 문의 메일(SUPPORT_EMAIL)은 미정입니다. 모든 링크·주소는 변수이며 도메인이 정해지면 BASE_URL 하나만 바꿔 다시 생성합니다.",
 "이메일 발송 도구는 Resend(SOP v2) 기준입니다. 파트너 신청번호(PARTNER_ID) 형식(PT-YYMM-NNN)과 제목의 REF 표기는 잠정안입니다.",
 "상태전이표 §7 알림 트리거표에는 아직 ORG_BIDDING, ORG_REBID, ORG_WON, ORG_LOST, ORG_CANCELLED, HTL_QUOTE_RECEIVED, PTN_APPLIED, PTN_REINSTATED 행이 없습니다. 이 표를 기준으로 갱신이 필요합니다.",
 "HTL_SELECTED_CONNECT는 수신 호텔에 오거나이저 회사명·연락처를 담습니다(약관 제7조). 수수료 관련 문구는 넣지 않았습니다.",
 "ORG_* 메일에 회원이면 MY_URL 링크 추가(조건부 변수) — 백엔드 템플릿 엔진 결정 후.",
 "문자(SMS) 발송: 국내 SMS 대행사와 발신번호 사전 등록이 필요하며 아직 정해지지 않았습니다(설정 > 전제 조건). 90byte를 넘으면 LMS로 분류되어 요금과 표시가 달라지므로 문구는 변수 최대 길이 기준으로 90byte 이내로 썼습니다. 통신사가 붙이는 발신 표기의 바이트 포함 여부는 대행사 확인이 필요합니다.",
 "인증번호(ORG_PICK_OTP, ACC_SMS_OTP)를 알림톡이 아닌 문자로만 보내는 결정은 검수 소요 기간과 카카오톡 미사용자 대체 발송 지연을 고려한 것입니다. 인증 문자가 정보성으로 분류되는지는 대행사 확인이 필요합니다.",
 "ACC_WELCOME 알림톡은 본문에 「내 견적 요청」 링크만 있는 정보성 안내로 작성했습니다. 마케팅 수신 동의를 받은 소식 안내와는 섞지 않으며, 검수 확인이 필요합니다.",
 "ACC_WITHDRAWN의 3년 보관 문구는 법무 검토 전 초안입니다(TODO: legal). 성사 연결 기록의 보관 기간이 확정되면 문구를 맞춥니다.",
]

# --------------------------------------------------------------------------
# 4. Email builder
# --------------------------------------------------------------------------
NAVY, TEAL, AMBER, BG, LINE = "#0F1E3D", "#0B8F86", "#FFC24B", "#F6F8FB", "#E4E8F0"
CHIP = {"teal": ("#E3F5F2", "#076B64"), "amber": ("#FFF3D6", "#8A5A00"), "gray": ("#EEF2F8", "#3F4C6B"), "red": ("#FBE9E9", "#9B2C2C")}
CALL = {"amber": ("#FFF3D6", AMBER, NAVY, "#7A4E00"), "gray": ("#EEF2F8", "#8B97B5", NAVY, "#3F4C6B"), "red": ("#FBEAEA", "#D08A8A", "#7A1F1F", "#8F3535")}
FONT_KO = "'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',Arial,sans-serif"
FONT_EN = "Arial,Helvetica,sans-serif"
MONO = "'Courier New',Courier,monospace"

def fmt(s, esc=True):
    """Author text -> HTML. Text already containing entities is passed through when it has '&'-entities."""
    if re.search(r"&(mdash|rsquo|middot|ndash|amp|nbsp);|<a ", s):
        return s
    return html.escape(s, quote=False)

def build_email(t, sample=False, variant=None):
    lang = t["lang"]
    F = FONT_KO if lang == "ko" else FONT_EN
    ref = t["ref_var"] if "ref_var" in t else "RFP_ID"
    chip_txt, chip_kind = t["chip"]
    cb, cf = CHIP[chip_kind]
    o = []
    A = o.append
    A('<!DOCTYPE html>')
    if not sample:
        A(email_header_comment(t))
    A('<html lang="%s" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">' % lang)
    A('<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<meta http-equiv="X-UA-Compatible" content="IE=edge">')
    A('<meta name="color-scheme" content="light">\n<meta name="supported-color-schemes" content="light">')
    subj = t["subject"]
    if variant == "round2" and t.get("subject_alt"): subj = t["subject_alt"]
    A('<title>%s</title>' % html.escape(subj, quote=False))
    A('<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->')
    A('<style>\n body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}\n table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}\n body{margin:0;padding:0;width:100% !important;}\n @media only screen and (max-width:620px){.email-container{width:100% !important;}.px-mobile{padding-left:20px !important;padding-right:20px !important;}.lbl{width:38% !important;}}\n</style>\n</head>')
    A('<body bgcolor="%s" style="margin:0;padding:0;background-color:%s;">' % (BG, BG))
    pre = t["preheader"]
    A('<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:%s;">%s%s</div>' % (BG, pre, "&#8203;&nbsp;" * 14))
    A('<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" bgcolor="%s" style="background-color:%s;"><tr><td align="center" bgcolor="%s" style="padding:32px 16px;background-color:%s;">' % (BG, BG, BG, BG))
    A('<table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;"><tr><td bgcolor="#FFFFFF" style="background-color:#FFFFFF;border:1px solid %s;border-radius:12px;overflow:hidden;">' % LINE)
    # A header
    A('<!-- A. Header bar -->\n<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" bgcolor="%s"><tr><td class="px-mobile" bgcolor="%s" style="padding:18px 32px;background-color:%s;">'
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%%"><tr>'
      '<td align="left" bgcolor="%s" style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:.5px;background-color:%s;">MICE<span style="color:%s;">GO</span></td>'
      '<td align="right" bgcolor="%s" style="font-family:%s;font-size:11px;font-weight:700;color:%s;letter-spacing:.08em;background-color:%s;">%s</td>'
      '</tr></table></td></tr></table>' % (NAVY, NAVY, NAVY, NAVY, NAVY, "#5FD6CC", NAVY, F, AMBER, NAVY, html.escape(t["tag"])))
    # B-D
    A('<!-- B. Eyebrow / C. Title / D. Lead -->\n<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="px-mobile" bgcolor="#FFFFFF" style="padding:32px 32px 0;background-color:#FFFFFF;">')
    refhtml = ("&nbsp;&nbsp;REF {{%s}}" % ref) if ref else ""
    A('<div style="font-family:%s;font-size:11px;font-weight:700;color:%s;letter-spacing:.08em;"><span style="display:inline-block;background-color:%s;color:%s;font-family:%s;font-size:12px;letter-spacing:0;padding:3px 10px;border-radius:99px;">%s</span>%s</div>' % (MONO, TEAL, cb, cf, F, fmt(chip_txt), refhtml))
    A('<div style="font-family:%s;font-size:24px;line-height:1.35;font-weight:700;color:%s;padding-top:14px;">%s</div>' % (F, NAVY, fmt(t["title"])))
    A('<div style="font-family:%s;font-size:15px;line-height:1.7;color:#4A5D8C;padding-top:14px;">%s</div>' % (F, fmt(t["lead"])))
    A('</td></tr></table>')
    if t.get("code"):
        clabel, cval = t["code"]
        A('<!-- D2. Code -->\n<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0"><tr><td class="px-mobile" bgcolor="#FFFFFF" style="padding:24px 32px 0;background-color:#FFFFFF;">'
          '<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="%s" style="background-color:%s;border:1px solid %s;border-radius:10px;padding:20px 12px;">'
          '<div style="font-family:%s;font-size:12px;line-height:1.5;color:#5B6788;">%s</div>'
          '<div style="font-family:%s;font-size:38px;line-height:1.3;font-weight:700;letter-spacing:10px;padding-left:10px;color:%s;padding-top:6px;">%s</div>'
          '</td></tr></table></td></tr></table>' % (BG, BG, LINE, F, fmt(clabel), MONO, NAVY, cval))
    # optional block
    ob = t.get("optional_block")
    if ob:
        block = callout(ob["callout"], F)
        if sample:
            if variant == "round2": A(block)
        else:
            A('<!-- OPTIONAL BLOCK START: %s. Include only when %s -->\n%s\n<!-- OPTIONAL BLOCK END: %s -->' % (ob["name"], ob["cond"], block, ob["name"]))
    # E rows
    if t["rows"]:
        A('<!-- E. Summary table -->\n<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="px-mobile" bgcolor="#FFFFFF" style="padding:24px 32px 0;background-color:#FFFFFF;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">')
        n = len(t["rows"])
        for i, (l, v) in enumerate(t["rows"]):
            bb = "" if i == n - 1 else "border-bottom:1px solid %s;" % LINE
            vs = fmt(v).replace("\n", "<br>")
            A('<tr><td class="lbl" valign="top" bgcolor="#FFFFFF" style="padding:10px 12px 10px 0;%sfont-family:%s;font-size:13px;line-height:1.5;color:#5B6788;width:36%%;background-color:#FFFFFF;">%s</td>'
              '<td class="val" valign="top" bgcolor="#FFFFFF" style="padding:10px 0;%sfont-family:%s;font-size:14px;line-height:1.5;font-weight:700;color:%s;background-color:#FFFFFF;">%s</td></tr>' % (bb, F, fmt(l), bb, F, NAVY, vs))
        A('</table></td></tr></table>')
    # F callouts
    for c in t.get("callouts", []):
        A(callout(c, F))
    if t.get("extra_para"):
        A('<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0"><tr><td class="px-mobile" bgcolor="#FFFFFF" style="padding:20px 32px 0;background-color:#FFFFFF;font-family:%s;font-size:14px;line-height:1.7;color:#4A5D8C;">%s</td></tr></table>' % (F, fmt(t["extra_para"])))
    # G CTA
    cta = t.get("cta")
    if cta:
        label, url = cta
        w = 300 if lang == "ko" else 320
        lab = fmt(label)
        A('<!-- G. CTA -->\n<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#FFFFFF" style="padding:28px 32px 8px;background-color:#FFFFFF;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="%s" style="border-radius:8px;background-color:%s;">'
          '<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="%s" style="height:52px;v-text-anchor:middle;width:%dpx;" arcsize="15%%" stroke="f" fillcolor="%s"><w:anchorlock/><center style="color:#FFFFFF;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">%s</center></v:roundrect><![endif]-->'
          '<!--[if !mso]><!-- --><a href="%s" target="_blank" style="display:inline-block;padding:16px 34px;font-family:%s;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:8px;background-color:%s;">%s</a><!--<![endif]-->'
          '</td></tr></table></td></tr></table>' % (TEAL, TEAL, url, w, TEAL, lab, url, F, TEAL, lab))
    # H link note
    if t.get("link_note") or t.get("decline"):
        parts = []
        if t.get("link_note"): parts.append(t["link_note"])
        if t.get("decline"): parts.append(t["decline"])
        A('<!-- H. Link note -->\n<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0"><tr><td class="px-mobile" align="center" bgcolor="#FFFFFF" style="padding:6px 32px 8px;background-color:#FFFFFF;font-family:%s;font-size:12px;line-height:1.7;color:#5B6788;">%s</td></tr></table>' % (F, "<br><br>".join(fmt(p) for p in parts)))
    # I policy
    A('<!-- I. Policy note -->\n<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0"><tr><td class="px-mobile" bgcolor="#FFFFFF" style="padding:24px 32px 32px;background-color:#FFFFFF;"><table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#FFFFFF" style="border-top:1px solid %s;padding-top:20px;font-family:%s;font-size:12.5px;line-height:1.7;color:#5B6788;background-color:#FFFFFF;">%s</td></tr></table></td></tr></table>' % (LINE, F, fmt(t["policy"])))
    A('</td></tr>')
    # J footer
    unsub = ""
    if t.get("unsub"):
        unsub = '<br><a href="{{UNSUBSCRIBE_URL}}" style="color:#7A86A5;text-decoration:underline;">Unsubscribe from sourcing invitations</a>'
    A('<!-- J. Footer -->\n<tr><td align="center" bgcolor="%s" style="background-color:%s;padding:24px 32px;font-family:%s;font-size:12px;line-height:1.8;color:#5B6788;">%s<br>MICEGO &middot; %s <a href="mailto:{{SUPPORT_EMAIL}}" style="color:#5B6788;">{{SUPPORT_EMAIL}}</a>%s</td></tr>'
      % (BG, BG, F, fmt(t["why"]), "문의" if lang == "ko" else "Contact", unsub))
    A('</table></td></tr></table>\n</body>\n</html>')
    out = "\n".join(o) + "\n"
    if sample:
        out = subst(out, lang, t.get("samples"))
    return out

def callout(c, F):
    kind, title, text = c
    bg, bd, tc, xc = CALL[kind]
    return ('<!-- F. Callout (%s) -->\n<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0"><tr><td class="px-mobile" bgcolor="#FFFFFF" style="padding:24px 32px 0;background-color:#FFFFFF;">'
            '<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" bgcolor="%s" style="background-color:%s;border-radius:8px;"><tr>'
            '<td bgcolor="%s" style="padding:14px 18px;border-left:3px solid %s;background-color:%s;font-family:%s;">'
            '<div style="font-size:14px;line-height:1.5;font-weight:700;color:%s;">%s</div>'
            '<div style="font-size:13px;line-height:1.6;color:%s;padding-top:4px;">%s</div></td></tr></table></td></tr></table>'
            % (kind, bg, bg, bg, bd, bg, F, tc, fmt(title), xc, fmt(text)))

def email_header_comment(t):
    ks = used_keys(email_raw_strings(t))
    lines = ["<!--",
             "MICEGO email template: %s (%s)" % (t["id"], t["name"]),
             "Subject: %s" % t["subject"]]
    if t.get("subject_alt"):
        lines.append("Subject (round >= 2 re-invite): %s" % t["subject_alt"])
    lines += ["Preheader: %s" % t["preheader"],
              "Trigger: %s" % t["trigger"],
              "From: MICEGO <{{FROM_ADDRESS}}>  |  Reply-To: {{SUPPORT_EMAIL}}"]
    if t.get("cc"): lines.append("Cc: %s" % t["cc"])
    lines += ["Variables: %s" % ", ".join("{{%s}}" % k for k in ks),
              "All values are HTML-escaped by the sender. Generated by build_notify.py - edit the data there, not this file.",
              "-->"]
    return "\n".join(lines)

def email_raw_strings(t):
    s = [t["subject"], t.get("subject_alt", ""), t["preheader"], t["title"], t["lead"], t.get("extra_para", ""), t.get("link_note") or "",
         t.get("decline", ""), t["policy"], t["why"], t["chip"][0], t.get("cc", "")]
    for l, v in t["rows"]: s += [l, v]
    for c in t.get("callouts", []): s += list(c[1:])
    if t.get("optional_block"): s += list(t["optional_block"]["callout"][1:])
    if t.get("cta"): s += [t["cta"][1]]
    if t.get("code"): s += list(t["code"])
    rv = t["ref_var"] if "ref_var" in t else "RFP_ID"
    s.append(("{{%s}} " % rv if rv else "") + "{{SUPPORT_EMAIL}} {{FROM_ADDRESS}}")
    if t.get("unsub"): s.append("{{UNSUBSCRIBE_URL}}")
    return "\n".join(s)

# --------------------------------------------------------------------------
# 5. Alimtalk / LMS
# --------------------------------------------------------------------------
def build_alimtalk(t):
    a = t["alimtalk"]
    body = a["body"]
    # buttons
    btn_urls = []
    for name in a["buttons"]:
        assert len(name) <= 14, name
        if a.get("btn_url"):
            btn_urls.append(a["btn_url"])
        elif a.get("btn_static"):
            btn_urls.append(BASE_URL + "/ko/#register")
        else:
            btn_urls.append(BASE_URL + "/ko/track.html?t={{TRACK_TOKEN}}")
    link = btn_urls[0]
    # LMS fallback: body without the trailing 안내 line + inline link
    core = body.split("\n\n※")[0]
    notice = a.get("notice", "※ 이 메시지는 견적을 요청하신 분께 발송되는 안내입니다.")
    if a.get("btn_static") and not a.get("btn_url"):
        fb_body = core + "\n\n▶ 새로 요청하기: " + link + "\n\n" + notice
    else:
        lbl = a.get("fb_label") or ("비교표 보기" if a["buttons"][0] == "비교표 보기" else "진행 상황")
        fb_body = core + "\n\n▶ %s: %s" % (lbl, link) + "\n\n" + notice
    keys = used_keys(body, *btn_urls, a["fb_title"], fb_body, a.get("emph") or "")
    ml = lambda s: len(PH.sub(lambda m: "가" * V[m.group(1)][4], s))
    res = dict(code=a["code"], emphasize_title=a.get("emph") or "", body=body, buttons=[dict(name=n, type="웹링크(WL)", url=u) for n, u in zip(a["buttons"], btn_urls)],
               fallback_title=a["fb_title"], fallback_body=fb_body,
               body_kr=to_kr(body), fallback_body_kr=to_kr(fb_body), buttons_kr=[dict(name=n, type="웹링크(WL)", url=to_kr(u)) for n, u in zip(a["buttons"], btn_urls)],
               body_chars_sample=len(subst(body, "ko", t.get("samples"))), body_chars_max=ml(body),
               fallback_bytes_sample=eucbytes(subst(fb_body, "ko", t.get("samples"))), fallback_bytes_max=bytes_max(fb_body),
               fallback_title_bytes=eucbytes(a["fb_title"]), keys=keys)
    assert res["body_chars_max"] <= 1000, (t["id"], res["body_chars_max"])
    assert res["fallback_bytes_max"] <= 2000, (t["id"], res["fallback_bytes_max"])
    assert res["fallback_title_bytes"] <= 40
    if res["emphasize_title"]: assert len(res["emphasize_title"]) <= 23
    return res

# --------------------------------------------------------------------------
# 6. Assemble
# --------------------------------------------------------------------------
REC_LABEL = {"org": "오거나이저", "htl": "호텔", "ptn": "파트너 신청자", "mem": "회원", "ops": "운영자 수동", "fbk": "피드백"}
LANG_LABEL = {"ko": "한국어", "en": "English"}

def assemble():
    out = []
    for t in T:
        d = dict(id=t["id"], name=t["name"], recipient=t["recipient"], recipient_label=REC_LABEL[t["recipient"]], mode=t["mode"],
                 language=t["lang"], trigger=t["trigger"], transitions=t["trig_nums"], states=t["states"])
        smp = t.get("samples")
        if t.get("kind") == "sms":
            body = t["sms"]["body"]
            keys = used_keys(body)
            sb, sm = eucbytes(subst(body, "ko", smp)), sms_bytes_max(body)
            assert sb <= SMS_LIMIT and sm <= SMS_LIMIT, (t["id"], sb, sm)
            d["channels"] = dict(email=False, alimtalk=False, lms=False, sms=True)
            d["sms"] = dict(body=body, body_sample=subst(body, "ko", smp), body_kr=to_kr(body), bytes_sample=sb, bytes_max=sm, limit_bytes=SMS_LIMIT, note=t.get("note", ""))
        elif t["mode"] == "auto":
            raw = email_raw_strings(t)
            al = build_alimtalk(t) if t.get("alimtalk") else None
            keys = used_keys(raw, *( [al["body"], al["fallback_body"], *(b["url"] for b in al["buttons"])] if al else [] ))
            d["channels"] = dict(email=True, alimtalk=bool(al), lms=bool(al), sms=False)
            d["email"] = dict(file="emails/%s.html" % t["id"], subject=t["subject"], subject_sample=subst(t["subject"], t["lang"], smp),
                              preheader=t["preheader"], preheader_sample=subst(t["preheader"], t["lang"], smp), cc=t.get("cc", ""),
                              unsubscribe_link=bool(t.get("unsub")), optional_blocks=[t["optional_block"]["name"]] if t.get("optional_block") else [])
            if t.get("subject_alt"): d["email"]["subject_round2"] = t["subject_alt"]
            pl = len(subst(t["preheader"], t["lang"], smp)); plain = re.sub(r"&\w+;", "-", subst(t["preheader"], t["lang"], smp))
            assert 40 <= len(plain) <= 90, (t["id"], len(plain), plain)
            if al: d["alimtalk"] = al
            if t.get("reject_phrases"): d["fixed_phrasings"] = dict(variable="REJECT_REASON", options=[dict(label=a, text=b) for a, b in t["reject_phrases"]])
            if t.get("lost_phrases"): d["fixed_phrasings"] = dict(variable="LOST_REASON", options=[dict(label=a, text=b) for a, b in t["lost_phrases"]])
            if t.get("ptn_reject_phrases"): d["fixed_phrasings"] = dict(variable="PTN_REJECT_REASON", options=[dict(label=a, text=b) for a, b in t["ptn_reject_phrases"]])
        else:
            keys = used_keys(t["subject"], t["body"])
            d["channels"] = dict(email=False, alimtalk=False, lms=False, sms=False)
            d["text"] = dict(subject=t["subject"], body=t["body"], note=t.get("note", ""))
        d["variables"] = []
        for k in keys:
            kr, desc, sk, se, ml = V[k]
            d["variables"].append(dict(key=k, kr_name=kr, description=desc, sample=sample_of(k, t["lang"], smp), maxLen=ml))
        out.append(d)
    return out

# --------------------------------------------------------------------------
# 7. Library page
# --------------------------------------------------------------------------
PAGE_CSS = r"""
:root{--teal:#0B8F86;--teal-soft:#E3F5F2;--amber:#FFC24B;--amber-soft:#FFF3D6;--navy:#0F1E3D;--bg:#F6F8FB;--line:#E4E8F0;--gray:#5B6788;--error:#EF4444;--card:#fff;
--sans:'Pretendard Variable',Pretendard,-apple-system,'Segoe UI','Noto Sans CJK KR','Noto Sans KR','Malgun Gothic',sans-serif;
--disp:'Archivo','Pretendard Variable',Pretendard,'Noto Sans CJK KR',sans-serif;
--mono:'JetBrains Mono',ui-monospace,'SFMono-Regular',Menlo,Consolas,'Noto Sans Mono CJK KR','Noto Sans CJK KR',monospace}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--navy);font-family:var(--sans);font-size:15px;line-height:1.7;word-break:keep-all;overflow-wrap:break-word}
.wrap{max-width:960px;margin:0 auto;padding:0 16px 56px}
header.top{padding:40px 0 20px}
.brand{font-family:var(--disp);font-weight:800;font-size:15px;letter-spacing:.02em;color:var(--navy)}
.brand b{color:var(--teal)}
h1{font-size:clamp(26px,5vw,36px);line-height:1.25;margin:10px 0 6px;letter-spacing:-.02em}
.ver{font-family:var(--mono);font-size:13px;color:var(--gray);margin:0 0 14px}
.note{background:var(--amber-soft);border-left:4px solid var(--amber);padding:12px 14px;border-radius:0 8px 8px 0;font-size:14px;margin:0}
nav.toc{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px 18px;margin:18px 0 8px}
nav.toc b{font-size:13px;color:var(--gray);letter-spacing:.04em}
nav.toc ol{margin:8px 0 0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:2px 16px;counter-reset:t}
nav.toc li{counter-increment:t}
nav.toc a{display:block;padding:5px 0;color:var(--navy);text-decoration:none;font-size:14px}
nav.toc a::before{content:counter(t)".";font-family:var(--mono);color:var(--teal);margin-right:6px}
nav.toc a:hover{color:var(--teal);text-decoration:underline}
section{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:22px 20px;margin-top:18px;scroll-margin-top:12px}
h2{font-size:20px;margin:0 0 4px;letter-spacing:-.01em}
h2 .n{font-family:var(--mono);color:var(--teal);font-size:15px;margin-right:8px}
p.lead{color:var(--gray);margin:0 0 14px;font-size:14px}
h3{font-size:15px;margin:20px 0 6px}
.tw{overflow-x:auto;-webkit-overflow-scrolling:touch;border:1px solid var(--line);border-radius:10px;margin:10px 0}
table{border-collapse:collapse;width:100%;min-width:640px;font-size:13.5px;line-height:1.55}
th,td{padding:9px 11px;text-align:left;vertical-align:top;border-bottom:1px solid var(--line)}
th{background:#EEF2F8;font-size:12.5px;color:var(--navy);white-space:nowrap}
tr:last-child td{border-bottom:0}
td.nw{white-space:nowrap}
td.c{text-align:center}
code,.slug{font-family:var(--mono);font-size:12px;background:#EEF2F8;border-radius:5px;padding:1px 6px;white-space:nowrap}
.tag{display:inline-block;font-size:12px;font-weight:600;padding:1px 8px;border-radius:99px;white-space:nowrap;border:1px solid transparent}
.op{background:var(--teal-soft);color:#076B64;border-color:#B5E3DD}
.sys{background:var(--amber-soft);color:#8A5A00;border-color:#F3D48F}
.org{background:#EEF0F5;color:#4A5570;border-color:#D5DAE5}
.ops{background:#E8EEFB;color:#2A4A8F;border-color:#C5D3F0}
.mem{background:#E9F6EE;color:#1E6B45;border-color:#BFE3CE}
.hot{background:#FDECEC;color:#B42323;border-color:#F6C4C4}
.small{font-size:13px;color:var(--gray)}
.callout{background:var(--teal-soft);border-radius:8px;padding:11px 14px;font-size:14px;margin:12px 0 0}
ul.tight{margin:6px 0;padding-left:20px}
ul.tight li{margin:3px 0}
footer{margin-top:22px;padding:18px 4px;color:var(--gray);font-size:13px;border-top:1px solid var(--line)}
.chips{position:sticky;top:0;z-index:5;display:flex;flex-wrap:wrap;gap:8px;align-items:center;background:rgba(246,248,251,.96);padding:10px 0;margin-top:14px;border-bottom:1px solid var(--line)}
.chips button,.btn{font:inherit;font-size:13px;font-weight:600;border:1px solid var(--line);background:#fff;color:var(--navy);border-radius:99px;padding:5px 14px;cursor:pointer;line-height:1.5}
.chips button[aria-pressed=true]{background:var(--navy);color:#fff;border-color:var(--navy)}
.chips button:focus-visible,.btn:focus-visible,summary:focus-visible{outline:3px solid var(--teal);outline-offset:2px}
.chips .sp{flex:1}
.btn{border-radius:8px;padding:4px 11px;font-size:12.5px}
.btn:hover{border-color:var(--teal);color:#076B64}
.btn.done{background:var(--teal-soft);border-color:var(--teal);color:#076B64}
article.tpl{border:1px solid var(--line);border-radius:12px;padding:16px 16px 14px;margin-top:16px;background:#fff;scroll-margin-top:60px}
article.tpl[hidden],tr[hidden]{display:none}
.th{display:flex;flex-wrap:wrap;gap:6px 8px;align-items:center}
.th h3{margin:0 8px 0 0;font-size:16px}
dl.meta{display:grid;grid-template-columns:96px 1fr;gap:4px 12px;margin:10px 0;font-size:13.5px}
dl.meta dt{color:var(--gray);font-weight:600}
dl.meta dd{margin:0;min-width:0}
dl.meta .v{font-family:var(--mono);font-size:12.5px;background:#F3F5FA;border-radius:5px;padding:1px 6px;overflow-wrap:anywhere;word-break:break-all}
details.pv{margin-top:10px;border-top:1px dashed var(--line);padding-top:8px}
details.pv>summary{cursor:pointer;font-weight:700;font-size:14px;list-style:none;padding:6px 0;color:var(--navy)}
details.pv>summary::before{content:"+";display:inline-block;width:18px;font-family:var(--mono);color:var(--teal)}
details.pv[open]>summary::before{content:"\2212"}
.emailwrap{position:relative;width:100%;max-width:640px;margin:10px auto 0;overflow:hidden;border:1px solid var(--line);border-radius:10px;background:#F6F8FB}
.emailwrap iframe{display:block;width:640px;height:900px;border:0;background:#F6F8FB;transform-origin:0 0}
.vlabel{font-size:12.5px;color:var(--gray);text-align:center;margin-top:6px}
.chan{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:16px;margin-top:16px}
.cap{font-size:12.5px;color:var(--gray);margin:6px 0 0;line-height:1.5}
.kk{max-width:340px;border-radius:12px;overflow:hidden;border:1px solid #E0D9A8;background:#B9CCDD}
.kk-h{background:#FFE45C;color:#3A2E00;font-size:13px;font-weight:700;padding:8px 12px;display:flex;justify-content:space-between}
.kk-body{padding:12px}
.kk-ch{font-size:12px;color:#33445A;font-weight:700;margin-bottom:6px}
.kk-card{background:#fff;border-radius:10px;overflow:hidden}
.kk-emph{padding:12px 14px 4px;font-size:17px;font-weight:800;line-height:1.35;border-bottom:1px solid #EEE;color:#111}
.kk-t{margin:0;padding:12px 14px;font:inherit;font-size:13.5px;line-height:1.6;white-space:pre-wrap;word-break:keep-all;color:#111}
.kk-btn{display:block;margin:0 10px 10px;text-align:center;background:#F2F2F2;border:1px solid #DDD;border-radius:6px;padding:8px;font-size:13px;font-weight:600;color:#222}
.lms{border:1px solid var(--line);border-radius:10px;background:#FBFCFE;max-width:420px}
.lms-h{padding:8px 12px;border-bottom:1px solid var(--line);font-weight:700;font-size:13.5px}
.sms{max-width:340px;border-radius:14px;border:1px solid var(--line);background:#EEF2F8;padding:12px}
.sms-b{background:#fff;border-radius:12px 12px 12px 4px;padding:10px 12px;font-size:13.5px;line-height:1.6;white-space:pre-wrap;word-break:keep-all;overflow-wrap:anywhere;border:1px solid var(--line)}
.lms-t{margin:0;padding:10px 12px;font:inherit;font-size:13px;line-height:1.6;white-space:pre-wrap;word-break:keep-all;overflow-wrap:anywhere}
.bytes{font-family:var(--mono);font-size:12px;color:var(--gray)}
.plain{border:1px solid var(--line);border-radius:10px;background:#FBFCFE;margin-top:10px}
.plain pre{margin:0;padding:12px 14px;font:inherit;font-size:13.5px;line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere}
.ph{background:var(--amber-soft);border-radius:4px;padding:0 2px}
.acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.tw.vars table{min-width:560px}
@media (max-width:520px){section{padding:18px 14px}body{font-size:14.5px}dl.meta{grid-template-columns:1fr;gap:0}dl.meta dt{margin-top:6px}article.tpl{padding:14px 12px}}
@media print{
@page{size:A4;margin:12mm}
html,body{background:#fff}
*{-webkit-print-color-adjust:exact;print-color-adjust:exact}
nav.toc,.chips,.acts{display:none}
.wrap{max-width:none;padding:0}
section{border-radius:0;box-shadow:none;padding:12px 0;border-left:0;border-right:0;margin-top:10px}
.tw{overflow:visible;border-radius:0}
table{min-width:0;font-size:10.5px}
th,td{padding:5px 6px}
tr,thead,article.tpl{break-inside:avoid;page-break-inside:avoid}
thead{display:table-header-group}
h2,h3{break-after:avoid}
details.pv{display:block}
body{font-size:11.5px}
}
"""

PAGE_JS = r"""
(function(){
var D={};try{D=JSON.parse(document.getElementById('copydata').textContent)}catch(e){}
function copy(txt,btn){
  function ok(){var o=btn.textContent;btn.classList.add('done');btn.textContent='복사됨';setTimeout(function(){btn.classList.remove('done');btn.textContent=o},1400)}
  function fb(){var ta=document.createElement('textarea');ta.value=txt;ta.setAttribute('readonly','');ta.style.cssText='position:fixed;left:-9999px;top:0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');ok()}catch(e){}document.body.removeChild(ta)}
  if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(txt).then(ok,fb)}else{fb()}
}
document.addEventListener('click',function(e){
  var b=e.target.closest('[data-copy]');if(!b)return;
  var p=b.getAttribute('data-copy').split('|'),d=D[p[0]];if(!d)return;
  copy(d[p[1]]||'',b);
});
function fit(w){
  var f=w.querySelector('iframe');if(!f||!w.clientWidth)return;
  var h=900;try{h=f.contentDocument.documentElement.scrollHeight||900}catch(e){}
  f.style.height=h+'px';
  var s=Math.min(1,w.clientWidth/640);
  f.style.transform='scale('+s+')';w.style.height=Math.ceil(h*s)+'px';
}
function fitAll(root){(root||document).querySelectorAll('.emailwrap').forEach(function(w){if(w.clientWidth)fit(w)})}
document.querySelectorAll('.emailwrap iframe').forEach(function(f){f.addEventListener('load',function(){fit(f.parentNode)})});
document.querySelectorAll('details.pv').forEach(function(d){d.addEventListener('toggle',function(){if(d.open)requestAnimationFrame(function(){fitAll(d)})})});
var rt;window.addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(function(){fitAll()},80)});
var chips=document.querySelectorAll('.chips button[data-f]');
chips.forEach(function(c){c.addEventListener('click',function(){
  var f=c.getAttribute('data-f');
  chips.forEach(function(x){x.setAttribute('aria-pressed',x===c?'true':'false')});
  document.querySelectorAll('[data-r]').forEach(function(el){el.hidden=!(f==='all'||el.getAttribute('data-r')===f)});
  var n=document.querySelectorAll('article.tpl:not([hidden])').length;document.getElementById('cnt').textContent=n+'개 표시';
  fitAll();
})});
var allbtn=document.getElementById('openall');
if(allbtn)allbtn.addEventListener('click',function(){
  var ds=document.querySelectorAll('article.tpl:not([hidden]) details.pv');
  var open=allbtn.getAttribute('data-open')!=='1';
  ds.forEach(function(d){d.open=open});
  allbtn.setAttribute('data-open',open?'1':'0');allbtn.textContent=open?'미리보기 모두 접기':'미리보기 모두 펼치기';
  requestAnimationFrame(function(){fitAll()});
});
window.addEventListener('load',function(){fitAll()});
})();
"""

def _e(s): return html.escape(s, quote=True)

def _ph(text):
    """Escape and highlight {{VAR}} / #{변수} placeholders for display."""
    x = html.escape(text, quote=False)
    x = re.sub(r"(\{\{[A-Z0-9_]+\}\}|#\{[^}]+\})", r'<span class="ph">\1</span>', x)
    return x

def render_page(data, doc):
    tmap = {t["id"]: t for t in T}
    copy = {}
    cards = []
    matrix = []
    for d in data:
        t = tmap[d["id"]]
        rl, mode = d["recipient"], d["mode"]
        rtag = '<span class="tag %s">%s</span>' % ({"org": "org", "htl": "op", "ptn": "sys", "mem": "mem", "ops": "ops", "fbk": "mem"}[rl], d["recipient_label"])
        mtag = '<span class="tag %s">%s</span>' % ("op" if mode == "auto" else "hot", "자동" if mode == "auto" else "수동")
        ch = d["channels"]
        dot = lambda b: "●" if b else "—"
        matrix.append('<tr data-r="%s"><td class="nw"><a href="#t-%s"><code>%s</code></a><div class="small">%s</div></td><td class="nw">%s</td><td>%s</td><td class="c">%s</td><td class="c">%s</td><td class="c">%s</td><td class="c">%s</td><td class="nw">%s</td></tr>'
                      % (rl, d["id"], d["id"], _e(d["name"]), rtag, _e(d["trigger"]) + ('<div class="small">%s</div>' % _e(d["states"]) if d["states"] and mode == "auto" else ""), dot(ch["email"]), dot(ch["alimtalk"]), dot(ch["lms"]), dot(ch["sms"]), mtag))
        # meta
        m = ['<dl class="meta">', '<dt>트리거</dt><dd>%s</dd>' % _e(d["trigger"])]
        if d.get("sms"):
            m.append('<dt>채널</dt><dd>SMS(문자) 전용 · 알림톡 미사용 · %s</dd>' % LANG_LABEL[d["language"]])
            m.append('<dt>길이</dt><dd><span class="bytes">%d / %d byte</span> (샘플) · 변수 최대 길이 가정 <span class="bytes">%d byte</span></dd>' % (d["sms"]["bytes_sample"], d["sms"]["limit_bytes"], d["sms"]["bytes_max"]))
            if d["sms"]["note"]: m.append('<dt>메모</dt><dd>%s</dd>' % _e(d["sms"]["note"]))
            copy[d["id"]] = dict(sms=d["sms"]["body_kr"])
        elif mode == "auto":
            chn = "이메일" + (" + 알림톡 (미수신 시 LMS 대체)" if ch["alimtalk"] else " 전용")
            m.append('<dt>채널</dt><dd>%s · %s</dd>' % (chn, LANG_LABEL[d["language"]]))
            m.append('<dt>제목</dt><dd><span class="v">%s</span></dd>' % _e(d["email"]["subject_sample"]))
            if d["email"].get("subject_round2"):
                m.append('<dt>제목 (재초대)</dt><dd><span class="v">%s</span></dd>' % _e(subst(d["email"]["subject_round2"], "en", t.get("samples"))))
            m.append('<dt>프리헤더</dt><dd><span class="v">%s</span> <span class="bytes">%d자</span></dd>' % (_e(d["email"]["preheader_sample"]), len(re.sub(r"&\w+;", "-", d["email"]["preheader_sample"]))))
            fl = "<code>%s</code>" % d["email"]["file"]
            if d["email"]["cc"]: fl += " · 참조(Cc): 오거나이저"
            if d["email"]["unsubscribe_link"]: fl += " · 수신거부 링크 포함"
            m.append('<dt>파일</dt><dd>%s</dd>' % fl)
            copy[d["id"]] = dict(subject=d["email"]["subject"])
        else:
            m.append('<dt>채널</dt><dd>복사용 텍스트 메일 (%s) · 자동 발송 없음</dd>' % LANG_LABEL[d["language"]])
            m.append('<dt>제목</dt><dd><span class="v">%s</span></dd>' % _e(subst(d["text"]["subject"], d["language"])))
            if d["text"]["note"]: m.append('<dt>메모</dt><dd>%s</dd>' % _e(d["text"]["note"]))
        m.append('</dl>')
        # variables
        vr = ['<div class="tw vars"><table><thead><tr><th>변수</th><th>알림톡 변수</th><th>샘플</th><th>maxLen</th><th>설명</th></tr></thead><tbody>']
        for v in d["variables"]:
            vr.append('<tr><td class="nw"><code>{{%s}}</code></td><td class="nw"><code>#{%s}</code></td><td>%s</td><td class="nw">%d</td><td>%s</td></tr>'
                      % (v["key"], _e(v["kr_name"]), _e(v["sample"]).replace("\n", "<br>"), v["maxLen"], _e(v["description"])))
        vr.append('</tbody></table></div>')
        fx = ""
        if d.get("fixed_phrasings"):
            fp = d["fixed_phrasings"]
            fx = '<p class="small" style="margin:8px 0 2px"><b>{{%s}} 고정 문구</b> (선택지에서 하나만 사용)</p><div class="tw vars"><table><thead><tr><th>선택지</th><th>문구</th></tr></thead><tbody>%s</tbody></table></div>' % (
                fp["variable"], "".join("<tr><td class=\"nw\">%s</td><td>%s</td></tr>" % (_e(o["label"]), _e(o["text"])) for o in fp["options"]))
        # preview
        pv = []
        if d.get("sms"):
            sm = d["sms"]
            pv.append('<div class="chan"><div><div class="sms"><div class="kk-ch">MICEGO</div><div class="sms-b">%s</div></div><p class="cap"><b>SMS 미리보기</b> · <span class="bytes">%d / %d byte</span> (EUC-KR: 한글 2 · 영문·숫자·공백 1) · 변수를 최대 길이로 채워도 <span class="bytes">%d byte</span></p></div></div>'
                      % (_e(sm["body_sample"]), sm["bytes_sample"], sm["limit_bytes"], sm["bytes_max"]))
            pv.append('<div class="acts"><button type="button" class="btn" data-copy="%s|sms">SMS 본문 복사</button></div><p class="cap">복사 텍스트는 변수 형식({{VAR}})입니다. 대행사 등록 시 90byte 이내인지 다시 확인하세요.</p>' % d["id"])
            summ = "미리보기 · SMS"
        elif mode == "auto":
            def ifr(variant, label):
                srcdoc = build_email(t, sample=True, variant=variant)
                return '<div class="emailwrap"><iframe srcdoc="%s" title="%s 이메일 미리보기" width="640" tabindex="-1" scrolling="no" sandbox="allow-same-origin"></iframe></div>%s' % (
                    _e(srcdoc), d["id"], '<div class="vlabel">%s</div>' % label if label else "")
            if t.get("optional_block"):
                pv.append(ifr(None, "이메일 미리보기 · 라운드 1 (기본)"))
                pv.append(ifr("round2", "이메일 미리보기 · 라운드 2 이상 재초대 (선택 블록 포함)"))
            else:
                pv.append(ifr(None, "이메일 미리보기 · 샘플 값 적용"))
            if d.get("alimtalk"):
                a = d["alimtalk"]
                emph = '<div class="kk-emph">%s</div>' % _e(a["emphasize_title"]) if a["emphasize_title"] else ""
                btns = "".join('<span class="kk-btn">%s</span>' % _e(b["name"]) for b in a["buttons"])
                urls = "".join("<br>버튼 %d · %s · <code>%s</code>" % (i + 1, b["type"], _e(b["url"])) for i, b in enumerate(a["buttons_kr"]))
                kk = ('<div><div class="kk"><div class="kk-h"><span>알림톡 도착</span><span>정보성</span></div><div class="kk-body"><div class="kk-ch">MICEGO</div><div class="kk-card">%s<pre class="kk-t">%s</pre>%s</div></div></div>'
                      '<p class="cap"><b>알림톡 미리보기</b> · 코드 <code>%s</code><br>본문 <span class="bytes">%d자</span> (변수 최대 길이 가정 %d자 / 한도 1,000자)%s<br>변수 URL 허용 여부 검수 확인 필요.%s</p></div>'
                      % (emph, _e(subst(a["body"], "ko", t.get("samples"))), btns, a["code"], a["body_chars_sample"], a["body_chars_max"],
                         " · 강조표기 제목 사용" if emph else "", urls))
                lms = ('<div><div class="lms"><div class="lms-h">%s</div><pre class="lms-t">%s</pre></div>'
                       '<p class="cap"><b>LMS 대체발송</b> · 제목 <span class="bytes">%d / 40 byte</span> · 본문 <span class="bytes">%s / 2,000 byte</span> (최대 가정 %s byte)</p></div>'
                       % (_e(a["fallback_title"]), _e(subst(a["fallback_body"], "ko", t.get("samples"))), a["fallback_title_bytes"], format(a["fallback_bytes_sample"], ","), format(a["fallback_bytes_max"], ",")))
                pv.append('<div class="chan">%s%s</div>' % (kk, lms))
                copy[d["id"]].update(alimtalk=a["body_kr"], lms=a["fallback_title"] + "\n\n" + a["fallback_body_kr"])
            acts = '<div class="acts"><button type="button" class="btn" data-copy="%s|subject">이메일 제목 복사</button>' % d["id"]
            if d.get("alimtalk"):
                acts += '<button type="button" class="btn" data-copy="%s|alimtalk">알림톡 본문 복사</button><button type="button" class="btn" data-copy="%s|lms">LMS 텍스트 복사</button>' % (d["id"], d["id"])
            acts += '</div><p class="cap">복사 텍스트는 변수 형식({{VAR}} / #{변수})이며 샘플 값이 들어가지 않습니다.</p>'
            pv.append(acts)
            summ = "미리보기 · 이메일" + (" · 알림톡 · LMS" if d.get("alimtalk") else "")
        else:
            body_disp = _ph(d["text"]["body"])
            pv.append('<div class="plain"><pre>%s</pre></div>' % body_disp)
            copy[d["id"]] = dict(subject=d["text"]["subject"], body=d["text"]["body"], all="제목: " + d["text"]["subject"] + "\n\n" + d["text"]["body"])
            pv.append('<div class="acts"><button type="button" class="btn" data-copy="%s|all">제목 + 본문 복사</button><button type="button" class="btn" data-copy="%s|body">본문만 복사</button></div><p class="cap">노란 표시는 발송 전에 채울 변수입니다. 복사하면 {{VAR}} 그대로 들어갑니다. 샘플 값 예시는 위 변수 표를 참고하세요.</p>' % (d["id"], d["id"]))
            summ = "본문 · 복사"
        cards.append('<article class="tpl" id="t-%s" data-r="%s"><div class="th"><h3><code>%s</code> %s</h3>%s%s</div>%s%s%s<details class="pv"%s><summary>%s</summary>%s</details></article>'
                     % (d["id"], rl, d["id"], _e(d["name"]), rtag, mtag, "".join(m), "".join(vr), fx, "", summ, "".join(pv)))
    # design rules
    blocks = [("A", "헤더 바", "네이비 #0F1E3D 바에 텍스트 로고 「MICE」+「GO」. 오른쪽 태그는 KO 「견적 요청」, EN 「Partner Network」."),
              ("B", "아이브로", "상태 칩(색: 진행=틸, 결과=회색, 반려·취소=붉은 톤)과 REF 번호(고정폭, 틸)."),
              ("C", "제목", "24px 굵게. 한 문장, 상태를 그대로 말한다."),
              ("D", "리드", "15px. 오거나이저에게는 「○○님」으로 시작하고, 호텔에는 이름 없이 사실부터."),
              ("E", "요약 표", "라벨/값 행. 모바일에서는 라벨과 값이 위아래로 쌓인다."),
              ("F", "콜아웃", "앰버=마감·유효기한, 회색=결과·안내, 붉은 톤(채도 낮춤)=반려·취소·거절. 왼쪽 3px 띠."),
              ("G", "CTA 버튼", "틸 #0B8F86 하나. 표 기반 버튼과 Outlook용 VML. 링크가 없는 메일(PTN_APPLIED 등)은 생략."),
              ("H", "링크 안내", "토큰 링크가 있는 메일만: 로그인 없음, 외부 전달 금지. 초대에는 거절 안내 추가."),
              ("I", "정책 문구", "KO: 요건서에 회사명·예산 미포함, 주최 측 수수료 없음. EN: 회사명은 선정 전까지 비공개, 가입비 없음, 거절해도 불이익 없음. HTL_SELECTED_CONNECT에는 수수료 문구를 넣지 않는다."),
              ("J", "푸터", "MICEGO · 문의 {{SUPPORT_EMAIL}}. 수신거부 링크는 HTL_INVITE와 HTL_REMINDER에만.")]
    br = "".join("<tr><td class=\"nw\"><code>%s</code></td><td class=\"nw\">%s</td><td>%s</td></tr>" % b for b in blocks)
    # tables
    console = "".join("<tr><td class=\"nw\">%s</td><td class=\"nw\">%s</td><td>%s</td><td>%s</td></tr>" % (_e(a), _e(b), "".join('<a href="#t-%s"><code>%s</code></a> ' % (i, i) if i in tmap else _e(i) for i in re.split(r" · ", c)), _e(dd)) for a, b, c, dd in CONSOLE_MAP)
    confirm = "".join("<li>%s</li>" % _e(x) for x in NEEDS_CONFIRM)
    counts = dict(auto=sum(1 for d in data if d["mode"] == "auto"), manual=sum(1 for d in data if d["mode"] != "auto"), kk=sum(1 for d in data if d.get("alimtalk")), sms=sum(1 for d in data if d.get("sms")))
    cd = json.dumps(copy, ensure_ascii=False).replace("</", "<\\/")
    chips = ('<div class="chips" role="group" aria-label="수신자 필터"><button type="button" data-f="all" aria-pressed="true">전체</button>'
             '<button type="button" data-f="org" aria-pressed="false">오거나이저</button><button type="button" data-f="htl" aria-pressed="false">호텔</button>'
             '<button type="button" data-f="ptn" aria-pressed="false">파트너</button><button type="button" data-f="mem" aria-pressed="false">회원</button><button type="button" data-f="ops" aria-pressed="false">운영자 수동</button>'
             '<span class="sp"></span><span class="small" id="cnt">%d개 표시</span><button type="button" id="openall" data-open="0">미리보기 모두 펼치기</button></div>' % len(data))
    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>MICEGO 알림 템플릿 라이브러리</title>
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>{PAGE_CSS}</style>
</head>
<body>
<div class="wrap">
<header class="top">
<div class="brand">MICE<b>GO</b></div>
<h1>MICEGO 알림 템플릿 라이브러리</h1>
<p class="ver">v1.1 · 2026-09-26 · 상태전이표 v1.6 · SOP v2 기준 · 자동 {counts["auto"]}종 · 수동 {counts["manual"]}종 · 알림톡 {counts["kk"]}종 · 문자(SMS) {counts["sms"]}종</p>
<p class="note">이 페이지는 <code>build_notify.py</code>의 데이터 정의 한 곳에서 이메일 HTML, JSON, CSV와 함께 생성됩니다. 미리보기는 샘플 값(MG-2610-014, 다낭 인센티브)이며, 링크 도메인 <code>micego.example</code>은 <b>미정</b>입니다. 카카오 알림톡은 검수 전 문구이고, 확인이 필요한 항목은 <a href="#s6">6장</a>에 모았습니다.</p>
</header>
<nav class="toc" aria-label="목차"><b>목차</b><ol>
<li><a href="#s1">개요</a></li><li><a href="#s2">알림 매트릭스</a></li><li><a href="#s3">이메일 디자인 규칙</a></li><li><a href="#s4">알림톡 · LMS 규칙</a></li><li><a href="#s5">템플릿 카드</a></li><li><a href="#s5b">콘솔 템플릿 이름 대조표</a></li><li><a href="#s6">확인 필요</a></li></ol></nav>

<section id="s1"><h2><span class="n">1</span>개요</h2>
<p class="lead">누가 무엇을 언제 받는지, 그리고 어디서 보내는지를 정리합니다.</p>
<ul class="tight">
<li><b>채널 원칙.</b> 오거나이저(한국어)는 이메일과 카카오 알림톡을 함께 받고, 알림톡을 받을 수 없으면 LMS로 대체 발송합니다. 호텔과 파트너 신청자(영어)는 이메일만 받습니다. 회원(한국어)은 계정 알림을 이메일로 받고, 가입 완료만 알림톡을 함께 받습니다. 운영자 수동 템플릿은 복사해 직접 보내는 텍스트 메일이며 채널이 없습니다.</li>
<li><b>인증번호는 문자(SMS)로만.</b> 제안 선택 인증(ORG_PICK_OTP)과 가입·번호 변경 인증(ACC_SMS_OTP)은 알림톡으로 보내지 않습니다. 알림톡 템플릿 검수에 시간이 걸리고, 카카오톡을 쓰지 않는 분에게는 대체 발송까지 지연이 생길 수 있어 인증번호가 늦게 도착할 수 있기 때문입니다. 문자는 90byte 이내(EUC-KR)로 짧게 씁니다.</li>
<li><b>회원 계정 알림(ACC_*).</b> 비밀번호·연락처·잠금처럼 보안과 관련된 메일은 본인이 요청하지 않았다면 어떻게 하면 되는지로 끝맺습니다. 어떤 메일과 문자에도 비밀번호와 전체 휴대전화 번호는 넣지 않습니다(번호는 가운데 4자리를 가립니다).</li>
<li><b>발송 주체.</b> 자동 템플릿은 시스템이 알림 테이블에 쌓고 1분 cron이 발송합니다(상태전이표 7장). 수동 템플릿은 운영자가 콘솔 사례에 맞춰 복사해 보냅니다.</li>
<li><b>보내지 않는 것.</b> 검증중 시작, 초대 열람·제출에 따른 상태 변화, USD 참고환산 입력에는 알림이 없습니다. 오거나이저에게 호텔 수와 호텔 이름은 알리지 않습니다(비딩중 안내는 「호텔 몇 곳」).</li>
<li><b>변수 표기.</b> 이메일은 <code>{{{{VAR}}}}</code> 영문 대문자, 알림톡은 <code>#{{한글변수}}</code>. 같은 변수는 두 채널에서 같은 값을 가리키며, 아래 카드의 변수 표에 두 이름과 샘플, 최대 길이(maxLen)를 함께 적었습니다.</li>
<li><b>수신 언어와 시각.</b> 오거나이저 한국어, 호텔·파트너 영어. 마감과 예정일은 모두 KST로 표기하고, 마감 시각은 해당일 18:00입니다.</li>
</ul></section>

<section id="s2"><h2><span class="n">2</span>알림 매트릭스</h2>
<p class="lead">트리거의 # 번호는 상태전이표 3장의 전이 번호입니다. 전이가 아닌 트리거는 문구로 적었습니다.</p>
<p class="small"><b>채널 범례.</b> 이메일 = HTML 메일 · 알림톡 = 카카오 알림톡 · LMS = 알림톡을 받을 수 없을 때 대신 가는 장문 문자 · SMS = 인증번호 전용 단문 문자(알림톡 미사용, 90byte 이내). ● 발송, — 없음.</p>
<div class="tw"><table><thead><tr><th>ID</th><th>수신자</th><th>트리거 (전이 · 상태)</th><th>이메일</th><th>알림톡</th><th>LMS</th><th>SMS</th><th>자동/수동</th></tr></thead><tbody>{"".join(matrix)}</tbody></table></div>
<p class="small">알림톡이 없는 자동 알림은 호텔·파트너 대상이라 이메일만 보냅니다. ORG_WON의 이메일은 짧은 확인용이고, 호텔 담당자에게 가는 연결 메일(HTL_SELECTED_CONNECT)에 오거나이저가 참조로 들어갑니다.</p></section>

<section id="s3"><h2><span class="n">3</span>이메일 디자인 규칙</h2>
<p class="lead">모든 자동 메일은 600px 표 레이아웃과 인라인 CSS로 만들고, 이미지와 배경 이미지를 쓰지 않습니다.</p>
<div class="tw"><table><thead><tr><th>블록</th><th>이름</th><th>규칙</th></tr></thead><tbody>{br}</tbody></table></div>
<h3>제목 규칙</h3>
<ul class="tight">
<li>KO: <code>[MICEGO] {{상태 문구}} · {{{{RFP_ID}}}}</code> 예) [MICEGO] 견적 요청이 접수되었습니다 · MG-2610-014</li>
<li>EN: <code>[MICEGO] {{phrase}} · REF {{{{RFP_ID}}}}</code>. 초대와 리마인더는 끝에 <code>· quotes by {{{{DEADLINE_KST}}}}</code>를 붙입니다. 파트너 메일의 REF는 <code>{{{{PARTNER_ID}}}}</code>입니다(잠정).</li>
<li>프리헤더는 40–90자, 화면에서 숨기고 뒤에 공백 문자로 본문 미리보기를 밀어 냅니다.</li>
</ul>
<h3>기술 규칙</h3>
<ul class="tight">
<li><code>color-scheme: light</code> 고정, 모든 셀에 bgcolor와 글자색 명시, 이미지 없음.</li>
<li>KO 글꼴: Apple SD Gothic Neo · Malgun Gothic · Noto Sans KR · Arial. EN 글꼴: Arial.</li>
<li>Outlook용 MSO 조건부 주석과 VML 버튼. 발신 주소(<code>{{{{FROM_ADDRESS}}}}</code>)와 문의 메일(<code>{{{{SUPPORT_EMAIL}}}}</code>)은 변수입니다.</li>
<li>각 파일 맨 위 HTML 주석에 Subject, Preheader, 트리거, 변수 목록이 들어 있습니다.</li>
</ul></section>

<section id="s4"><h2><span class="n">4</span>알림톡 · LMS 규칙</h2>
<p class="lead">아래 기준으로 문구를 썼습니다. 카카오 측 정책은 바뀔 수 있어 6장의 항목은 발송 대행사와 검수 결과로 확인해야 합니다.</p>
<ul class="tight">
<li>정보성 메시지만 사용합니다. 채널명은 「MICEGO」, 본문에 안내 사유 한 줄(「이 메시지는 견적을 요청하신 분께 발송되는 안내입니다」)을 넣었습니다.</li>
<li>본문은 변수 치환 후 1,000자 이내. 변수마다 maxLen을 정해 두고, 모든 변수가 최대 길이일 때도 넘지 않는지 함께 계산했습니다.</li>
<li>버튼은 웹링크 1개, 이름은 14자 이내. 링크는 <code>…/track.html?t=#{{추적토큰}}</code>처럼 URL 끝에만 변수를 씁니다(변수 URL 허용 여부 검수 확인 필요).</li>
<li>강조표기 제목은 ORG_DELIVERED와 ORG_WON에만 씁니다.</li>
<li>LMS 대체발송은 알림톡마다 있습니다. 제목 40byte 이내, 본문 2,000byte 이내(EUC-KR 기준: 한글 2, 영문·숫자·공백 1)이며 전체 링크를 본문에 넣습니다.</li>
<li>SMS(인증번호)는 알림톡을 거치지 않는 단문 문자입니다. 본문 90byte 이내(EUC-KR 기준)이며, 변수를 최대 길이로 채워도 넘지 않는지 계산합니다(인증번호·요청번호처럼 숫자·영문만 들어가는 변수는 1byte로 셉니다). 링크는 넣지 않습니다.</li>
</ul></section>

<section id="s5"><h2><span class="n">5</span>템플릿 카드</h2>
<p class="lead">수신자별로 걸러 볼 수 있습니다. 미리보기는 카드마다 펼쳐 봅니다.</p>
{chips}
{"".join(cards)}
</section>

<section id="s5b"><h2><span class="n">5-2</span>콘솔 템플릿 이름 대조표</h2>
<p class="lead">운영 콘솔 설정 &gt; 알림 템플릿 목록의 이름과 새 ID를 맞춘 표입니다. 「(신규)」는 콘솔 목록에 아직 없던 알림입니다.</p>
<div class="tw"><table><thead><tr><th>콘솔 템플릿 이름</th><th>수신자</th><th>새 ID</th><th>비고</th></tr></thead><tbody>{console}</tbody></table></div></section>

<section id="s6"><h2><span class="n">6</span>확인 필요</h2>
<p class="lead">아직 확정하지 않은 것과 외부 확인이 필요한 것입니다. 단정하지 않았습니다.</p>
<ul class="tight">{confirm}</ul></section>

<footer>MICEGO 알림 템플릿 라이브러리 v1.1 · <code>build_notify.py</code>로 생성 · 이 문서는 검색 색인 대상이 아닙니다.</footer>
</div>
<script type="application/json" id="copydata">{cd}</script>
<script>{PAGE_JS}</script>
</body>
</html>
"""


def write(path, s, bom=False):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8-sig" if bom else "utf-8", newline="") as f:
        f.write(s)

def main():
    data = assemble()
    # emails
    for t in T:
        if t["mode"] != "auto" or t.get("kind") == "sms": continue
        write(os.path.join(ROOT, "emails", t["id"] + ".html"), build_email(t))
    # JSON
    doc = dict(version="1.1", generated_by="build_notify.py", base_url=BASE_URL, base_url_note="도메인 미정 (BASE_URL 한 곳에서 변경)",
               channel_name="MICEGO", conventions=dict(email_placeholder="{{VAR}}", alimtalk_placeholder="#{변수}", alimtalk_body_limit_chars=1000,
                    lms_title_limit_bytes=40, lms_body_limit_bytes=2000, button_name_limit_chars=14, sms_body_limit_bytes=SMS_LIMIT),
               templates=data, console_template_map=[dict(console_name=a, recipient=b, new_ids=c, note=d) for a, b, c, d in CONSOLE_MAP],
               needs_confirmation=NEEDS_CONFIRM)
    write(os.path.join(ROOT, "docs", "notification-templates.json"), json.dumps(doc, ensure_ascii=False, indent=1) + "\n")
    # CSV
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\r\n")
    w.writerow("template_code,template_name,category,emphasize_title,body,variables,button1_name,button1_type,button1_url,button2_name,button2_type,button2_url,fallback_title,fallback_body,body_chars_sample,fallback_bytes_sample".split(","))
    for d in data:
        a = d.get("alimtalk")
        if not a: continue
        bt = a["buttons_kr"] + [dict(name="", type="", url="")] * (2 - len(a["buttons_kr"]))
        w.writerow([a["code"], d["name"], "정보성", a["emphasize_title"], a["body_kr"], ",".join("#{%s}" % V[k][0] for k in a["keys"]),
                    bt[0]["name"], bt[0]["type"], bt[0]["url"], bt[1]["name"], bt[1]["type"], bt[1]["url"],
                    a["fallback_title"], a["fallback_body_kr"], a["body_chars_sample"], a["fallback_bytes_sample"]])
    write(os.path.join(ROOT, "docs", "alimtalk-templates.csv"), buf.getvalue(), bom=True)
    # library
    write(os.path.join(ROOT, "docs", "notification-library.html"), render_page(data, doc))
    print("emails:", sum(1 for t in T if t["mode"] == "auto" and t.get("kind") != "sms"), " sms:", sum(1 for t in T if t.get("kind") == "sms"), " templates:", len(T), " alimtalk:", sum(1 for d in data if "alimtalk" in d))

if __name__ == "__main__":
    main()
