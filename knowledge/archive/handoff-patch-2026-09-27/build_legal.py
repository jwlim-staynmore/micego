# build_legal.py — exec'd from build2.py (after build_acc.py/build_acc2.py, before the og-image pass and
# build_launch.py). Renders legal/terms_ko.json, legal/partner_terms_en.json, legal/privacy_ko.json and
# legal/privacy_en.json into ko/terms.html, en/terms.html, ko/privacy.html and en/privacy.html.
#
# These four pages are the ONLY place the legal text lives: edit the JSON (or site.config.json's operator /
# legal blocks), never the HTML. The earlier summary/patch code for these pages (build.py KO_BODY/EN_BODY,
# build2.py MEMBER_SEC/FEEDBACK_PRIVACY_*, build_acc2.py ART) still runs first but is overwritten here.
#
# site.config.json → legal block:
#   "legal": {"effectiveDate": "", "reviewed": false}
#   effectiveDate empty → page carries a draft badge and "시행일 미정"; reviewed false → every [법무 검토] /
#   [legal review] tag in the JSON renders as a visible chip (prod build warns). reviewed true → tags removed.
import json as _json, os as _os, sys as _sys, importlib.util as _ilu

_spec = _ilu.spec_from_file_location('legal_render', _os.path.join(_SITE_DIR, 'legal_render.py'))
_LR = _ilu.module_from_spec(_spec); _spec.loader.exec_module(_LR)

_LEGAL = CFG.get('legal') or {}
_REVIEWED = bool(_LEGAL.get('reviewed'))
_EFF = (_LEGAL.get('effectiveDate') or '').strip()
_GA4 = bool(((CFG.get('analytics') or {}).get('ga4') or '').strip())
if PROD and not _REVIEWED:
    _sys.stderr.write('build_legal: WARNING — prod:true but legal.reviewed is false; [법무 검토] chips stay visible on the legal pages.\n')
if PROD and not _EFF:
    _sys.stderr.write('build_legal: WARNING — prod:true but legal.effectiveDate is empty; legal pages show "시행일 미정".\n')


def _load(name):
    with open(_os.path.join(_SITE_DIR, 'legal', name), encoding='utf-8') as f:
        return _json.load(f)


LEGAL_CSS = TERMS_CSS + """
.terms-doc .t-eff{margin-top:10px;font:600 13px/1.5 'JetBrains Mono',monospace;color:#076E67}
.terms-doc .t-fill{color:#7A4E00;background:#FFF3D6;border-radius:4px;padding:0 4px;font-weight:600}
.terms-doc .t-review{display:inline-block;vertical-align:baseline;margin-left:2px;padding:1px 7px;border-radius:999px;background:#FFF3D6;color:#7A4E00;font-size:11.5px;line-height:1.5;font-weight:700;letter-spacing:.01em}
.terms-doc .t-toc-ch{margin-top:8px;font-size:12.5px;font-weight:700;color:var(--ink-60,#5B6785);letter-spacing:.02em;grid-column:1/-1}
.terms-doc .t-toc-ch:first-child{margin-top:0}
.terms-doc .t-ch{margin:36px 0 0;padding-top:24px;border-top:2px solid var(--ink,#0F1E3D);font-size:15px;line-height:1.5;font-weight:800;letter-spacing:.02em;color:var(--ink-60,#5B6785)}
.terms-doc .t-ch+.t-art{padding-top:18px}
.terms-doc .t-art h3{font-size:19px;line-height:1.45;font-weight:800;letter-spacing:-.01em;margin:0 0 12px}
.terms-doc .t-art ul+p,.terms-doc .t-art .t-tablewrap+p,.terms-doc .t-art p+ul,.terms-doc .t-art p+.t-tablewrap{margin-top:10px}
.terms-doc .t-tablewrap{margin:12px 0 4px;overflow-x:auto;-webkit-overflow-scrolling:touch;border:1px solid var(--line,#E4E8F0);border-radius:10px}
.terms-doc .t-table{width:100%;min-width:560px;border-collapse:collapse;font-size:14px;line-height:1.6}
.terms-doc .t-table th,.terms-doc .t-table td{padding:10px 12px;border-bottom:1px solid var(--line,#E4E8F0);vertical-align:top;text-align:left;word-break:keep-all;overflow-wrap:anywhere;color:var(--ink-80,#2B3654)}
.terms-doc .t-table th{background:#F5F7FB;font-size:12.5px;font-weight:700;color:var(--ink-60,#5B6785);white-space:nowrap}
.terms-doc .t-table tr:last-child td{border-bottom:0}
@media (max-width:639px){
 .terms-doc .t-table{min-width:0;display:block}
 .terms-doc .t-table thead{display:none}
 .terms-doc .t-table tbody,.terms-doc .t-table tr{display:block}
 .terms-doc .t-table tr{padding:6px 0;border-bottom:1px solid var(--line,#E4E8F0)}
 .terms-doc .t-table tr:last-child{border-bottom:0}
 .terms-doc .t-table td{display:grid;grid-template-columns:88px minmax(0,1fr);gap:8px;padding:6px 12px;border-bottom:0}
 .terms-doc .t-table td::before{content:attr(data-h);font-size:12px;font-weight:700;line-height:1.6;color:var(--ink-60,#5B6785);word-break:keep-all}
}
@media (min-width:768px){
 .terms-doc .t-art h3{font-size:21px}
 .terms-doc .t-table{font-size:14.5px}
}
"""

_DRAFT_KO = '' if (_EFF and _REVIEWED) else ('초안 · ' + ('법무 검토 전' if not _REVIEWED else '시행일 확정 전'))
_DRAFT_EN = '' if (_EFF and _REVIEWED) else ('DRAFT — ' + ('pending legal review' if not _REVIEWED else 'effective date to be set'))

_vals_ko = _LR.placeholder_values(CFG, MAIL, PMAIL, 'ko')
_vals_en = _LR.placeholder_values(CFG, MAIL, PMAIL, 'en')

# ---- ko/terms.html (이용약관) ----
_doc = _load('terms_ko.json')
_body = ('<div class="app-wrap narrow terms-doc">' + _LR.render_terms(_doc, _vals_ko, 'ko', _REVIEWED, _DRAFT_KO)
         + '<div class="app-actions"><a class="btn btn-ghost" href="privacy.html">개인정보처리방침</a><a class="btn btn-ghost" href="signup.html">회원가입</a></div></div>')
wr('ko/terms.html', app_page('ko', '이용약관 | MICEGO 마이스고',
    'MICEGO 이용약관입니다. 견적 요청 서비스의 내용, 제안 선정과 정보 제공, 회원 계정, 공유 링크, 탈퇴와 기록 보관, 책임과 분쟁 해결을 정합니다.',
    'ko/terms.html', _body, nav=PUB_NAV_KO, cur='ko', ko_href='index.html', en_href='../en/terms.html', cur_page='terms.html', extra_css=LEGAL_CSS))

# ---- en/terms.html (Partner Terms) ----
_doc = _load('partner_terms_en.json')
_body = ('<div class="app-wrap narrow terms-doc">' + _LR.render_terms(_doc, _vals_en, 'en', _REVIEWED, _DRAFT_EN)
         + '<div class="app-actions"><a class="btn btn-ghost" href="privacy.html">Privacy notice</a><a class="btn btn-ghost" href="index.html#register">Register your property</a></div></div>')
wr('en/terms.html', app_page('en', 'Partner terms | MICEGO Partner',
    'MICEGO Partner Terms for hotels and resorts: invitations, quotes, deadlines, anonymity before selection, organizer data, non-circumvention, liability and governing law.',
    'en/terms.html', _body, nav=PUB_NAV_EN, cur='en', ko_href='../ko/terms.html', en_href='index.html', cur_page='terms.html', extra_css=LEGAL_CSS))

# ---- ko/privacy.html (개인정보처리방침) ----
_doc = _load('privacy_ko.json')
if _GA4:
    _doc = _LR.swap_cookie_sentence(_doc, 'ko')
_body = ('<div class="app-wrap narrow terms-doc">' + _LR.render_privacy(_doc, _vals_ko, 'ko', _REVIEWED, _DRAFT_KO)
         + '<div class="app-actions"><a class="btn btn-ghost" href="terms.html">이용약관</a><a class="btn btn-ghost" href="account.html">계정 설정</a></div>'
         + '<p lang="en" class="t-lead" style="margin-top:20px">Hotel partners: see the <a class="alink" href="../en/privacy.html">Privacy Notice</a> in English.</p></div>')
wr('ko/privacy.html', app_page('ko', '개인정보처리방침 | MICEGO 마이스고',
    'MICEGO 개인정보처리방침입니다. 처리 목적과 항목, 보유 기간, 제3자 제공, 위탁, 국외 이전, 정보주체의 권리, 보호책임자를 안내합니다.',
    'ko/privacy.html', _body, nav=PUB_NAV_KO, cur='ko', ko_href='index.html', en_href='../en/privacy.html', cur_page='privacy.html', extra_css=LEGAL_CSS))

# ---- en/privacy.html (Privacy Notice) ----
_doc = _load('privacy_en.json')
if _GA4:
    _doc = _LR.swap_cookie_sentence(_doc, 'en')
_body = ('<div class="app-wrap narrow terms-doc">' + _LR.render_privacy(_doc, _vals_en, 'en', _REVIEWED, _DRAFT_EN)
         + '<div class="app-actions"><a class="btn btn-ghost" href="terms.html">Partner terms</a><a class="btn btn-ghost" href="contact.html">Contact</a></div>'
         + '<p lang="ko" class="t-lead" style="margin-top:20px">여행사·기업 고객은 <a class="alink" href="../ko/privacy.html">한국어 개인정보처리방침</a>을 확인해 주십시오.</p></div>')
wr('en/privacy.html', app_page('en', 'Privacy notice | MICEGO Partner',
    'How MICEGO handles personal data from hotel partners and organizers: what we collect, why, who we share it with, international transfers, retention and your rights.',
    'en/privacy.html', _body, nav=PUB_NAV_EN, cur='en', ko_href='../ko/privacy.html', en_href='index.html', cur_page='privacy.html', extra_css=LEGAL_CSS))

# ---- footer links (en sub-pages gain the Partner terms link; FL_EN_SUB2 is also applied in build_launch.py) ----
set_footer_links('ko/terms.html', FL_KO_SUB)
set_footer_links('ko/privacy.html', FL_KO_SUB)
set_footer_links('en/terms.html', FL_EN_SUB + [('terms.html', 'Partner terms', '')])
set_footer_links('en/privacy.html', FL_EN_SUB + [('terms.html', 'Partner terms', '')])

# sanity: no placeholder survived, and every draft page says so
for _p in _LR.LEGAL_PAGES:
    _t = rd(_p)
    assert '{{' not in _t, ('build_legal: unfilled placeholder in', _p)
    if _REVIEWED:
        assert 'class="t-review"' not in _t and '[법무 검토]' not in _t and '[legal review]' not in _t, ('build_legal: review tag left in', _p)
print('build_legal ok (reviewed=%s effective=%r ga4=%s)' % (_REVIEWED, _EFF, _GA4))
