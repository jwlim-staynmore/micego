try:
    _SITE_DIR
except NameError:
    import os as _os_
    _SITE_DIR = _os_.environ.get('MG_SITE_DIR') or _os_.path.dirname(_os_.path.abspath(__file__))
import os
# build_launch.py — WP2 launch-asset post-pass.
# Executed via exec(open(...).read(), globals()) at the very end of build2.py, so it shares that
# call's globals: CFG/SITE_BASE/MAIL/PMAIL/API/DEMO/PROD/REL/SENTINELS (site_config.py), header/footer/
# ICON/HREFLANG/SVG (build.py), rd/wr/rep/app_page/spanel/ds/PUB_NAV_EN/FL_EN_SUB/APP/APP_JS/SHARED/
# UNSUB_STATES/STATE_HEAD (build2.py), acc_top/ACC_CSS (build_acc.py).
import re, json, os, sys, glob, datetime

def _exists(p): return os.path.exists(p)

# ============================================================== 0. page inventory
SITEMAP_15 = ['/', '/ko/', '/ko/about.html', '/ko/faq.html', '/ko/contact.html', '/ko/terms.html', '/ko/privacy.html',
              '/ko/signup.html', '/ko/login.html', '/en/', '/en/sample-request.html', '/en/faq.html',
              '/en/contact.html', '/en/privacy.html', '/en/terms.html']
ENTRY_URLS = {'/', '/ko/', '/en/'}
def _u2f(u):
    if u == '/': return 'index.html'
    if u == '/ko/': return 'ko/index.html'
    if u == '/en/': return 'en/index.html'
    return u.lstrip('/')
def _f2u(p):
    if p == 'index.html': return '/'
    if p in ('ko/index.html',): return '/ko/'
    if p in ('en/index.html',): return '/en/'
    return '/' + p

# ============================================================== 1. assets/config.js + assets/mg.js stub
os.makedirs('assets', exist_ok=True)
_cfg_out = {
    'domain': CFG.get('domain', ''), 'baseUrl': SITE_BASE, 'officialEmail': MAIL, 'privacyEmail': PMAIL,
    'supabase': CFG.get('supabase') or {'url': '', 'anonKey': '', 'functionsUrl': ''},
    'demo': DEMO, 'prod': PROD, 'lang': None,
}

# ---- feedback widget config (SPEC_FEEDBACK.md / SPEC_FEEDBACK_ADDENDUM.md §A.1 -- WP-F2) ----
# window.MICEGO_FEEDBACK is derived from the same CFG/MG_CONFIG the rest of this file already builds;
# there is no separate assets/site-config.js. Endpoint = supabaseUrl + '/functions/v1/feedback-submit'
# (or functionsUrl when set). buildVersion is git-less: today's date + a counter from MG_BUILD_NO
# (env var, default 0) so a same-day rebuild can still be told apart if the env var is bumped.
_fb_sb = CFG.get('supabase') or {}
_fb_build_no = os.environ.get('MG_BUILD_NO', '0')
FEEDBACK_BUILD_VERSION = datetime.date.today().strftime('%Y.%m.%d') + '-' + str(_fb_build_no)
_feedback_out = {
    'supabaseUrl': _fb_sb.get('url') or '',
    'anonKey': _fb_sb.get('anonKey') or '',  # unused by the widget (D2) -- kept for parity with MG_CONFIG
    'functionsUrl': _fb_sb.get('functionsUrl') or '',
    'fallbackEmail': MAIL,
    'contactPath': {'ko': '/ko/contact.html', 'en': '/en/contact.html'},
    'buildVersion': FEEDBACK_BUILD_VERSION,
    'launcher': True,
    'disabled': False,
}

open('assets/config.js', 'w', encoding='utf-8').write(
    'window.MG_CONFIG=' + json.dumps(_cfg_out, ensure_ascii=False) + ';\n'
    'window.mgTrack=window.mgTrack||function(){};\n'
    'window.MICEGO_FEEDBACK=' + json.dumps(_feedback_out, ensure_ascii=False) + ';\n')

MG_JS_STUB = r'''// assets/mg.js -- WP2 stub (SPEC_LAUNCH.md SS5). MG.mode stays 'mailto' until WP3 wires supabase-js.
// Plain ES5 IIFE: no arrow functions, no const/let, no async -- matches the rest of this site's JS.
window.MG = (function () {
  "use strict";
  var config = window.MG_CONFIG || {};
  function noop() {}
  return {
    config: config,
    mode: 'mailto',
    preview: true,
    lang: (document.documentElement.getAttribute('lang') || 'ko'),
    ready: function (cb) { return Promise.resolve().then(cb || noop); },
    api: {},
    auth: {
      signIn: noop, signOut: noop,
      session: function () { return null; },
      member: function () { return null; },
      onChange: noop, verifyRecovery: noop
    },
    msg: function (err) { return (err && (err.message || err.code)) || ''; },
    show: function (err, opts) { if (opts && opts.toast) opts.toast(this.msg(err)); },
    url: {
      track: function (t) { return 'track.html?t=' + encodeURIComponent(t); },
      share: function (s) { return 'track.html?s=' + encodeURIComponent(s); },
      bid: function (t) { return 'bid.html?t=' + encodeURIComponent(t); }
    }
  };
})();
'''
# WP3 now owns assets/mg.js (SPEC_LAUNCH.md §9 file ownership: "ownership then passes to WP3").
# Once a real assets/mg.js exists in the source tree (copied along with the rest of the site into
# a build's working copy), this post-pass must not clobber it back to the WP2 stub on every rebuild.
if not _exists('assets/mg.js'):
    open('assets/mg.js', 'w', encoding='utf-8').write(MG_JS_STUB)

def _cfg_tags(rel):
    return '<script src="%sassets/config.js"></script><script src="%sassets/mg.js"></script>' % (rel, rel)

# ============================================================== 2. icons (PIL; build_icons.py runs only if missing)
_ICON_FILES = ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'site.webmanifest']
if any(not _exists(p) for p in _ICON_FILES):
    exec(open(_os_.path.join(_SITE_DIR, 'build_icons.py'), encoding='utf-8').read(), globals())
    generate_icons()

def _icon_tags(rel):
    return ('\n<link rel="icon" type="image/svg+xml" href="%sfavicon.svg">'
            '\n<link rel="icon" href="%sfavicon.ico" sizes="32x32">'
            '\n<link rel="apple-touch-icon" href="%sapple-touch-icon.png">'
            '\n<link rel="manifest" href="%ssite.webmanifest">') % (rel, rel, rel, rel)

# ============================================================== 3. en/terms.html (draft partner terms)
TERMS_EN_BODY = (
  '<div class="app-wrap narrow">'
  '<span class="chip" style="background:var(--amber-soft);color:var(--amber-deep)">DRAFT — full terms after legal review</span>'
  '<!-- TODO(legal): outside counsel to confirm final wording, effective date and version -->'
  '<h1>Partner terms</h1>'
  '<p class="app-lead">These terms restate, as numbered articles, the commitments already described on the partner pages. They apply to any hotel or resort that registers with MICEGO.</p>'
  '<div class="panel" style="margin-top:24px">'
  '<h2>1. Service and parties</h2><p>MICEGO is operated by MatchGo and runs a reverse-auction sourcing service connecting Korean MICE organizers with overseas hotels and resorts. These terms are between MatchGo and the registered property (“you”).</p>'
  '<h2>2. No listing fee</h2><p>There is no fee to register your property or to receive requests.</p>'
  '<h2>3. Invitations are not a commitment</h2><p>Each request is an invitation, not an obligation. Declining takes a few seconds on the request page and never counts against you — only invitations left unanswered do. Three consecutive unanswered invitations pause your listing until we hear from you.</p>'
  '<h2>4. Eligibility</h2><p>We approve overseas properties (outside Korea) that can host groups of 50 or more. A ballroom or banquet space is not required — some programs need guest rooms only.</p>'
  '<h2>5. Deadlines</h2><p>Every request states a quote deadline — usually 3 business days after the invitation (5 for groups of 200 or more), closing at 18:00 KST. You may revise your quote at any time before the deadline closes.</p>'
  '<h2>6. Organizer identity</h2><p>The organizer’s company name and budget are withheld from the request brief. Likewise, your property name is not shown to the organizer in the comparison sheet — it is disclosed only if the organizer selects your proposal.</p>'
  '<h2>7. Quote accuracy and validity</h2><p>Rates, availability and terms you submit should be accurate, and should remain valid until at least the date you state, which must be no earlier than 2 business days after the request’s deadline.</p>'
  '<h2>8. Selection result and connection</h2><p>If selected, MICEGO introduces you to the organizer by email so you can connect and continue directly. If not selected, we notify you of the result only — no organizer details are shared.</p>'
  '<h2>9. Contracts and payment</h2><p>Any booking contract, deposit and payment terms are agreed directly between you and the organizer. MICEGO is not a party to that contract and does not process payments; MICEGO charges no commission to either side.</p>'
  '<h2>10. Contact</h2><p>Questions about these terms: <a href="mailto:mysteri1984@gmail.com">mysteri1984@gmail.com</a>.</p>'
  '<!-- TODO(operator): legal entity name, representative, business registration number, address, privacy officer -- fill in once confirmed -->'
  '</div></div>')
# 2026-09-28: legal/partner_terms_en.json 이 있으면 build_legal.py 가 이미 전문을 렌더링했으므로 요약 초안으로 덮어쓰지 않는다(K-12 때 유실된 가드 복원)
if not os.path.exists(os.path.join(_SITE_DIR, 'legal', 'partner_terms_en.json')):
  wr('en/terms.html', app_page('en', 'Partner terms (draft) | MICEGO Partner',
      'Draft partner terms for MICEGO hotel and resort partners, pending legal review.', 'en/terms.html', TERMS_EN_BODY,
      nav=PUB_NAV_EN, cur='en', ko_href='../ko/terms.html', en_href='index.html', cur_page='terms.html'))

# footer links: add the new terms page across EN sub-pages (contact/faq/privacy/sample-request/terms/bid)
FL_EN_SUB2 = FL_EN_SUB + [('terms.html', 'Partner terms', '')]
for _p in ['en/contact.html', 'en/faq.html', 'en/privacy.html', 'en/sample-request.html', 'en/terms.html']:
    if _exists(_p):
        set_footer_links(_p, FL_EN_SUB2)

# bid.html consent link now points at the standalone terms page instead of the landing-page anchor
if _exists('en/bid.html'):
    _t = rd('en/bid.html')
    if 'href="index.html#terms"' in _t:
        _t = _t.replace('href="index.html#terms"', 'href="terms.html"')
        wr('en/bid.html', _t)

# ============================================================== 4. en/unsubscribe.html
UNSUB_BODY = (
  '<div class="app-wrap narrow">'
  '<div data-states="loading" class="mg-loading" role="status" aria-live="polite">Loading…</div>'
  '<div data-states="invalid"><div class="panel">' + spanel(' is-muted', '!', 'This link is not valid',
    '<p>Part of the address is missing, or this link is no longer active. Please use the link from the original email.</p>'
    '<div class="app-actions"><a class="btn btn-ghost" href="contact.html">Contact MICEGO</a></div>') + '</div></div>'
  '<div data-states="confirm"><div class="panel"><h1>Stop invitation emails?</h1>'
  '<p>Stop MICEGO invitation emails for <b data-mg="property">Ocean Pearl Resort Da Nang</b>?</p>'
  '<p class="app-lead" style="margin-top:0">Selection results for quotes you already submitted will still be sent.</p>'
  '<div class="app-actions"><button type="button" class="btn btn-accent" id="unsubBtn">Unsubscribe</button>'
  '<button type="button" class="btn btn-ghost" id="unsubKeepBtn">Keep receiving</button></div></div></div>'
  '<div data-states="done"><div class="panel">' + spanel('', '✓', 'You’re unsubscribed',
    '<p>You will no longer receive MICEGO invitation emails for this property. Selection results for quotes you already submitted will still be sent.</p>') + '</div></div>'
  '<div data-states="already"><div class="panel">' + spanel(' is-muted', '–', 'Already unsubscribed',
    '<p>This property is already unsubscribed from MICEGO invitation emails.</p>') + '</div></div>'
  '</div>')
UNSUB_JS = r'''
  // --- WP3:UNSUB_JS start ---
  (function(){
    var H=document.documentElement,QS2=new URLSearchParams(location.search),TOKEN2=QS2.get('t')||'';
    var mgApi2=!!(window.MG && MG.mode==='api' && !MG.preview);
    function setProp(name){document.querySelectorAll('[data-mg="property"]').forEach(function(el){el.textContent=name;});}
    function go2(s){H.setAttribute('data-state',s);}
    var ubtn=document.getElementById('unsubBtn'),ukeep=document.getElementById('unsubKeepBtn');
    if(mgApi2){
      MG.api.unsubscribe({token:TOKEN2,action:'check'}).then(function(resp){
        if(resp&&resp.property)setProp(resp.property);
        go2((resp&&resp.state)||'confirm');
      },function(err){go2('invalid');});
      if(ubtn)ubtn.addEventListener('click',function(){
        ubtn.disabled=true;
        MG.api.unsubscribe({token:TOKEN2,action:'confirm'}).then(function(resp){
          if(resp&&resp.property)setProp(resp.property);
          go2((resp&&resp.state)||'done');
        },function(err){ubtn.disabled=false;toast(MG.msg(err));});
      });
      if(ukeep)ukeep.addEventListener('click',function(){location.href='index.html';});
    } else {
      if(ubtn)ubtn.addEventListener('click',function(){go2('done');});
      if(ukeep)ukeep.addEventListener('click',function(){location.href='index.html';});
    }
  })();
  // --- WP3:UNSUB_JS end ---
'''
wr('en/unsubscribe.html', app_page('en', 'Unsubscribe | MICEGO Partner',
    'Stop MICEGO invitation emails for your property.', 'en/unsubscribe.html', UNSUB_BODY, token=True,
    state_head=STATE_HEAD(UNSUB_STATES, 'confirm'), cur='en', ko_href='../ko/index.html', en_href='index.html',
    script=UNSUB_JS))

# ============================================================== 5. head tags: config.js/mg.js + icon links (every generated page)
ALL_HTML_NO_404 = ['index.html'] + sorted(glob.glob('ko/*.html')) + sorted(glob.glob('en/*.html'))

for _p in ALL_HTML_NO_404:
    _t = rd(_p)
    _rel = REL(_p)
    if 'assets/config.js' not in _t:
        _t, _n = re.subn(r'(<meta charset="UTF-8">)', lambda m: m.group(1) + '\n' + _cfg_tags(_rel), _t, count=1)
    if 'apple-touch-icon' not in _t and 'ICON' in globals():
        _t, _n2 = re.subn(re.escape(ICON), lambda m: m.group(0) + _icon_tags(_rel), _t, count=1)
    wr(_p, _t)

# ============================================================== 5b. feedback widget wiring (SPEC_FEEDBACK.md
# / SPEC_FEEDBACK_ADDENDUM.md -- WP-F2). Every generated page in ALL_HTML_NO_404 (index.html, ko/*, en/*)
# gets: the early-error head snippet (as the very first <script> in <head>, ahead of the js-anim script),
# <meta name="micego-build">, and assets/feedback.js loaded (defer) right after assets/mg.js. Every page
# also gets a footer "의견 보내기 / Feedback" link (data-mg-feedback-open, always a real contact.html href
# so it degrades to plain navigation with JS off or with the widget unconfigured) + a <noscript> fallback.
# admin/** is a separate, statically-authored file set (not part of ALL_HTML_NO_404 / this generator chain)
# and is wired by the admin console work package instead -- out of scope here (SPEC_FEEDBACK_ADDENDUM.md §B).
_FB_EARLY_SNIPPET = ("<script>window.__mgfbEarly=[];addEventListener('error',function(e){"
                     "__mgfbEarly.length<3&&__mgfbEarly.push({t:new Date().toISOString(),"
                     "m:String(e.message).slice(0,500),s:e.filename,l:e.lineno+':'+e.colno})});</script>")

def _fb_meta_build():
    return '<meta name="micego-build" content="%s">' % FEEDBACK_BUILD_VERSION

def _fb_contact_rel(p):
    if p == 'index.html':
        return 'ko/contact.html'
    return 'contact.html'

def _fb_lang(p):
    return 'en' if p.startswith('en/') else 'ko'

_FB_FOOTER_TXT = {
    'ko': ('의견 보내기', '의견이나 문제 신고는 ', '문의 페이지', ' 또는 ', '이메일', '로 보내 주세요.'),
    'en': ('Feedback', 'To send feedback or report a problem, use the ', 'contact page', ' or ', 'email', '.'),
}

for _p in ALL_HTML_NO_404:
    _t = rd(_p)
    _rel = REL(_p)
    _lang = _fb_lang(_p)

    # -- head: early-error snippet must be the first <script> in <head> -- inserted right after the
    # literal <head> tag itself so it precedes both page templates' own first script (the landing()
    # pages put js-anim before meta charset; the app_page() pages put meta charset, then config/mg/
    # feedback tags, then js-anim -- anchoring on <head> instead of either script is what stays first
    # in both layouts).
    if '__mgfbEarly' not in _t:
        _t, _n = re.subn(r'(<head>\n)', lambda m: m.group(1) + _FB_EARLY_SNIPPET + '\n', _t, count=1)

    # -- head: micego-build meta --
    if 'name="micego-build"' not in _t:
        _t, _n = re.subn(r'(<meta charset="UTF-8">)', lambda m: m.group(1) + '\n' + _fb_meta_build(), _t, count=1)

    # -- head: assets/feedback.js right after assets/mg.js --
    if 'assets/feedback.js' not in _t:
        _mgtag = '<script src="%sassets/mg.js"></script>' % _rel
        if _mgtag in _t:
            _t = _t.replace(_mgtag, _mgtag + '<script src="%sassets/feedback.js" defer></script>' % _rel, 1)

    # -- contact pages: no floating launcher (widget object still loads, for MICEGO_FB.submit) --
    if _p in ('ko/contact.html', 'en/contact.html') and 'data-mgfb-launcher' not in _t:
        _t = _t.replace('<html lang="%s">' % _lang, '<html lang="%s" data-mgfb-launcher="off">' % _lang, 1)

    # -- footer: "의견 보내기 / Feedback" link + noscript fallback --
    if 'data-mg-feedback-open' not in _t:
        _launcher_txt, _ns_a, _ns_b, _ns_c, _ns_d, _ns_e = _FB_FOOTER_TXT[_lang]
        _href = _fb_contact_rel(_p)
        _fb_footer_html = (
            '<p class="footer-feedback"><a data-mg-feedback-open href="%s">%s</a></p>'
            '<noscript><p class="footer-feedback-noscript">%s<a href="%s">%s</a>%s<a href="mailto:%s">%s</a>%s</p></noscript>'
        ) % (_href, _launcher_txt, _ns_a, _href, _ns_b, _ns_c, MAIL, _ns_d, _ns_e)
        _anchor = '<p class="footer-copyright">© 2026 MICEGO. ALL RIGHTS RESERVED.</p>'
        if _anchor in _t:
            _t = _t.replace(_anchor, _anchor + _fb_footer_html, 1)

    # -- fixed-bottom elements the widget's launcher must not cover --
    if 'data-mg-fixed-bottom' not in _t:
        _t = _t.replace('<div class="mobile-cta" id="mobileCta">',
                         '<div class="mobile-cta" id="mobileCta" data-mg-fixed-bottom>', 1)

    wr(_p, _t)

# -- admin console pages (static, not regenerated): widget for operators; no launcher on the feedback
#    console itself (SPEC_FEEDBACK.md §4.1). Idempotent: every insert is guarded by a presence check.
import glob as _glob
for _p in sorted(_glob.glob('admin/*.html')):
    _t = rd(_p)
    if '__mgfbEarly' not in _t:
        _t, _n = re.subn(r'(<head>\n)', lambda m: m.group(1) + _FB_EARLY_SNIPPET + '\n', _t, count=1)
    if 'name="micego-build"' not in _t:
        _t, _n = re.subn(r'(<meta charset="[Uu][Tt][Ff]-8">)', lambda m: m.group(1) + '\n' + _fb_meta_build(), _t, count=1)
    if 'assets/feedback.js' not in _t and '<script src="../assets/mg.js"></script>' in _t:
        _t = _t.replace('<script src="../assets/mg.js"></script>', '<script src="../assets/mg.js"></script>\n<script src="../assets/feedback.js" defer></script>', 1)
    if os.path.basename(_p).startswith('feedback') and 'data-mgfb-launcher' not in _t:
        _t = _t.replace('<html lang="ko">', '<html lang="ko" data-mgfb-launcher="off">', 1)
    wr(_p, _t)

# ============================================================== 6. 404.html (bilingual, zero JS, root-absolute links)
_404_CSS = ('*{box-sizing:border-box}'
  'body{margin:0;background:#F7F8FB;color:#0F1E3D;font:16px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI",Pretendard,sans-serif}'
  '.wrap{max-width:560px;margin:0 auto;padding:96px 24px 64px;text-align:center}'
  '.mark{width:48px;height:48px;margin:0 auto 24px;display:block}'
  'h1{font-size:26px;margin:0 0 8px;line-height:1.35}'
  'p{color:#6B7794;margin:8px 0}'
  '.links{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:28px}'
  'a.btn{display:inline-flex;min-height:44px;align-items:center;padding:0 18px;border-radius:8px;background:#0F1E3D;color:#fff;text-decoration:none;font-weight:700;font-size:14px}'
  'a.btn.ghost{background:#fff;color:#0F1E3D;border:1.5px solid #E4E7EF}'
  '.note{margin-top:32px;font-size:13px;color:#6B7794}')
_404_MARK = ('<svg class="mark" viewBox="0 0 32 32" role="img" aria-hidden="true">'
  '<rect width="32" height="32" rx="9" fill="#0F1E3D"/>'
  '<rect x="6.5" y="9" width="14" height="2.6" rx="1.3" fill="#FFFFFF"/>'
  '<rect x="6.5" y="14.7" width="11" height="2.6" rx="1.3" fill="#16B5A8"/>'
  '<rect x="6.5" y="20.4" width="8" height="2.6" rx="1.3" fill="#FFC24B"/>'
  '<circle cx="24.5" cy="16" r="2.6" fill="#FFFFFF"/></svg>')
PAGE_404 = ('<!DOCTYPE html>\n<html lang="ko">\n<head>\n<meta charset="UTF-8">\n'
  '<meta name="viewport" content="width=device-width,initial-scale=1">\n<meta name="robots" content="noindex,nofollow">\n'
  '<title>페이지를 찾을 수 없습니다 · Page not found | MICEGO</title>\n'
  '<link rel="icon" type="image/svg+xml" href="/favicon.svg">\n<link rel="icon" href="/favicon.ico" sizes="32x32">\n'
  '<link rel="apple-touch-icon" href="/apple-touch-icon.png">\n<link rel="manifest" href="/site.webmanifest">\n'
  '<style>' + _404_CSS + '</style>\n</head>\n<body>\n<div class="wrap">\n' + _404_MARK + '\n'
  '<h1 lang="ko">주소가 바낀거나 없는 페이지입니다</h1>\n'
  '<p lang="ko">찾으시는 페이지의 주소가 바낀거나 삭제되었을 수 있습니다.</p>\n'
  '<h1 lang="en">This page doesn’t exist.</h1>\n'
  '<p lang="en">The address may have changed, or the page may have been removed.</p>\n'
  '<p class="note" lang="ko">견적 요청 · 비교표 · 인증 링크(진행 상황, 제안 등)는 각 페이지 자체의 오류 화면을 보여줍니다. 링크가 열리지 않으면 받은 메일의 링크를 다시 누라 주세요.</p>\n'
  '<p class="note" lang="en">Quote-request, comparison and verification links (progress pages, proposals, etc.) show their own link-error screen instead of this page. If a link doesn’t open, use the link from the original email again.</p>\n'
  '<div class="links">\n<a class="btn" href="/">홈 · Home</a>\n<a class="btn ghost" href="/ko/">여행사 · Organizers</a>\n'
  '<a class="btn ghost" href="/en/">Hotels</a>\n<a class="btn ghost" href="/ko/contact.html">문의하기 · Contact</a>\n</div>\n</div>\n</body>\n</html>\n')
wr('404.html', PAGE_404)
assert '<script' not in PAGE_404

# ============================================================== 7. operator block (about / privacy x2 / terms x2 / footer of every page)
_OPERATOR = CFG.get('operator') or {}
_LEGAL = (_OPERATOR.get('legalName') or '').strip()
if _LEGAL:
    _rep = _OPERATOR.get('representative') or ''
    _biz = _OPERATOR.get('bizRegNo') or ''
    _ecom = _OPERATOR.get('ecommerceRegNo') or ''
    _addr = _OPERATOR.get('address') or ''
    _po = _OPERATOR.get('privacyOfficer') or {}
    _po_name, _po_title = _po.get('name') or '', _po.get('title') or ''
    _ko = ['상호 ' + _LEGAL, '대표 ' + _rep, '사업자등록번호 ' + _biz]
    if _ecom:
        _ko.append('통신판매업신고번호 ' + _ecom)
    _ko += ['주소 ' + _addr, '개인정보 보호책임자 %s(%s)' % (_po_name, _po_title)]
    KO_BIZ_P = '<p class="biz-info" style="font-size:12px;color:var(--gray);margin-top:8px">' + ' · '.join(_ko) + '</p>'
    _en = [_LEGAL, 'Representative ' + _rep, 'Business registration No. ' + _biz]
    if _ecom:
        _en.append('E-commerce registration No. ' + _ecom)
    _en += [_addr, 'Privacy officer %s (%s)' % (_po_name, _po_title)]
    EN_BIZ_P = '<p class="biz-info" style="font-size:12px;color:var(--gray);margin-top:8px">' + ' · '.join(_en) + '</p>'

    _OP_RE = re.compile(r'<!--\s*TODO\(operator\):.*?-->', re.S)
    for _p in ALL_HTML_NO_404:
        _t = rd(_p)
        _biz_p = EN_BIZ_P if _p.startswith('en/') else KO_BIZ_P
        _t2, _n = _OP_RE.subn(_biz_p, _t)
        if _n:
            _t = _t2
        if '<p class="footer-copyright">© 2026 MICEGO. ALL RIGHTS RESERVED.</p>' in _t:
            _t = _t.replace('<p class="footer-copyright">© 2026 MICEGO. ALL RIGHTS RESERVED.</p>',
                             '<p class="footer-copyright">© 2026 MICEGO. ALL RIGHTS RESERVED.</p>' + _biz_p, 1)
        wr(_p, _t)

# ============================================================== 8. mysteri1984@gmail.com -> MAIL / PMAIL
for _p in ALL_HTML_NO_404 + ['404.html']:
    _t = rd(_p)
    if 'mysteri1984@gmail.com' in _t:
        _repl = PMAIL if _p in ('ko/privacy.html', 'en/privacy.html') else MAIL
        wr(_p, _t.replace('mysteri1984@gmail.com', _repl))

# ============================================================== 9. domain: canonical/hreflang, og:image absolute, og:url
if CFG.get('domain'):
    _HREF_RE = re.compile(r'<!-- TODO\(domain\): 도메인 확정 후 주석 해제.*?-->', re.S)
    for _p in ALL_HTML_NO_404:
        _t = rd(_p)
        _path = '' if _f2u(_p) == '/' else _f2u(_p).lstrip('/')
        if _p in ('index.html', 'ko/index.html', 'en/index.html'):
            _block = ('<link rel="canonical" href="%s/%s">\n' % (SITE_BASE, _path) +
                       '<link rel="alternate" hreflang="ko" href="%s/ko/">\n' % SITE_BASE +
                       '<link rel="alternate" hreflang="en" href="%s/en/">\n' % SITE_BASE +
                       '<link rel="alternate" hreflang="x-default" href="%s/">' % SITE_BASE)
        else:
            _block = '<link rel="canonical" href="%s/%s">' % (SITE_BASE, _path)
        _t2, _n = _HREF_RE.subn(_block, _t, count=1)
        if _n:
            _t = _t2
        m = re.search(r'<meta property="og:image" content="([^"]+)">', _t)
        if m and not m.group(1).startswith('http'):
            _abs = SITE_BASE + '/' + re.sub(r'^(\.\./)+', '', m.group(1))
            _t = _t.replace(m.group(0), '<meta property="og:image" content="%s">' % _abs)
            _t = re.sub(r'\n?<!-- TODO\(domain\): og:image must be an absolute URL.*?-->', '', _t)
        if 'og:url' not in _t:
            _ogurl = '<meta property="og:url" content="%s/%s">' % (SITE_BASE, _path)
            _t, _n3 = re.subn(r'(<meta property="og:title"[^>]*>)', lambda m: m.group(1) + '\n' + _ogurl, _t, count=1)
        wr(_p, _t)

# ============================================================== 10. site-verification metas (index.html only)
_SV = CFG.get('siteVerification') or {}
_sv_tags = []
if _SV.get('google'):
    _sv_tags.append('<meta name="google-site-verification" content="%s">' % _SV['google'])
if _SV.get('naver'):
    _sv_tags.append('<meta name="naver-site-verification" content="%s">' % _SV['naver'])
if _sv_tags:
    _t = rd('index.html')
    _t = _t.replace('</head>', '\n'.join(_sv_tags) + '\n</head>', 1)
    wr('index.html', _t)

# ============================================================== 11. GA4 (15 public pages only) + privacy cookie sentence
_GA = (CFG.get('analytics') or {}).get('ga4') or ''
if _GA:
    _GA_SNIPPET = ('<script async src="https://www.googletagmanager.com/gtag/js?id=%s"></script>\n'
                   '<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}'
                   "gtag('js',new Date());gtag('config','%s');"
                   "window.mgTrack=function(n,p){gtag('event',n,p||{});};</script>") % (_GA, _GA)
    for _u in SITEMAP_15:
        _p = _u2f(_u)
        if not _exists(_p):
            continue
        _t = rd(_p)
        if 'googletagmanager.com/gtag/js' not in _t:
            _t = _t.replace('</title>', '</title>\n' + _GA_SNIPPET, 1)
            wr(_p, _t)
    if _exists('ko/privacy.html'):
        _t = rd('ko/privacy.html')
        if '쿠키는 사용하지 않고' in _t:
            _t = _t.replace('쿠키는 사용하지 않고',
                             '분석을 위해 Google Analytics 쿠키를 사용하고<!-- TODO(legal): 쿠키 활용 목적·보유기간 명시 -->', 1)
            wr('ko/privacy.html', _t)
    if _exists('en/privacy.html'):
        _t = rd('en/privacy.html')
        if 'We do not use cookies.' in _t:
            _t = _t.replace('We do not use cookies.',
                             'We use Google Analytics cookies to measure traffic.<!-- TODO(legal): describe cookie purpose and retention -->', 1)
            wr('en/privacy.html', _t)

# ============================================================== 12. demo:false strip + best-effort sentinel check
if not DEMO:
    for _p in ALL_HTML_NO_404:
        _t = rd(_p)
        _t2 = re.sub(r'<!--demo:start-->.*?<!--demo:end-->', '', _t, flags=re.S)
        _t2 = re.sub(r'/\*demo:start\*/.*?/\*demo:end\*/', '', _t2, flags=re.S)
        if _t2 != _t:
            wr(_p, _t2)
    # data-mg emptying pass (hook point for WP3's data-mg markup; nothing to empty until WP3 adds data-mg attrs)
    for _p in ALL_HTML_NO_404:
        _t = rd(_p)
        _t2 = re.sub(r'(<[a-zA-Z][^>]*\sdata-mg="[^"]*"[^>]*>)([^<]*)(</)', lambda m: m.group(1) + m.group(3), _t)
        if _t2 != _t:
            wr(_p, _t2)
    _bad = []
    for _p in ALL_HTML_NO_404 + ['404.html']:
        _t = rd(_p)
        for _s in SENTINELS:
            if _s in _t:
                _bad.append('%s: %r' % (_p, _s))
    if _bad:
        sys.stderr.write('build_launch: NOTE -- demo sentinels still present in a demo:false build (expected until WP3\n'
                          'wires the data-mg pass over track/bid/my/account content -- see final report):\n  ' + '\n  '.join(_bad[:40]) + '\n')

# ============================================================== 13. robots.txt / sitemap.xml
_robots = ['User-agent: *', 'Disallow: /admin/', 'Disallow: /docs/', 'Disallow: /emails/',
           'Disallow: /ko/track.html', 'Disallow: /ko/my.html', 'Disallow: /ko/account.html',
           'Disallow: /ko/withdraw.html', 'Disallow: /ko/reset.html', 'Disallow: /en/bid.html',
           'Disallow: /en/unsubscribe.html', 'Disallow: /404.html']
if CFG.get('domain'):
    _robots.append('Sitemap: %s/sitemap.xml' % SITE_BASE)
else:
    _robots.append('# TODO(domain): add "Sitemap: https://<domain>/sitemap.xml" once the domain is confirmed.')
    _robots.append('# This file only works when micego-site is served from the domain root.')
open('robots.txt', 'w', encoding='utf-8').write('\n'.join(_robots) + '\n')

if CFG.get('domain'):
    _today = datetime.date.today().isoformat()
    _entries = []
    for _u in SITEMAP_15:
        _alt = ''
        if _u in ENTRY_URLS:
            _alt = ('\n    <xhtml:link rel="alternate" hreflang="ko" href="%s/ko/"/>' % SITE_BASE
                    + '\n    <xhtml:link rel="alternate" hreflang="en" href="%s/en/"/>' % SITE_BASE
                    + '\n    <xhtml:link rel="alternate" hreflang="x-default" href="%s/"/>' % SITE_BASE)
        _entries.append('  <url>\n    <loc>%s%s</loc>\n    <lastmod>%s</lastmod>%s\n  </url>' % (SITE_BASE, _u, _today, _alt))
    _xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
            + '\n'.join(_entries) + '\n</urlset>\n')
    open('sitemap.xml', 'w', encoding='utf-8').write(_xml)

# ============================================================== 14. security headers: _headers + vercel.json
_SUPA = (CFG.get('supabase') or {}).get('url') or ''
_SUPA_WSS = ('wss://' + _SUPA[len('https://'):]) if _SUPA.startswith('https://') else ''
_GA_SCRIPT = ' https://www.googletagmanager.com' if _GA else ''
_GA_IMGCONN = ' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com' if _GA else ''
_FORM_ACTION = "form-action 'self' mailto:" if DEMO else "form-action 'self'"
_CSP = ("default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net%s; "
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; "
        "font-src 'self' data: https://cdn.jsdelivr.net https://fonts.gstatic.com; "
        "img-src 'self' data:%s; connect-src 'self' %s %s%s; frame-ancestors 'none'; base-uri 'self'; "
        "%s; object-src 'none'; upgrade-insecure-requests") % (_GA_SCRIPT, _GA_IMGCONN, _SUPA, _SUPA_WSS, _GA_IMGCONN, _FORM_ACTION)

_GLOBAL_HEADERS = [
    ('Strict-Transport-Security', 'max-age=31536000; includeSubDomains'),
    ('X-Content-Type-Options', 'nosniff'),
    ('X-Frame-Options', 'DENY'),
    ('Referrer-Policy', 'strict-origin-when-cross-origin'),
    ('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()'),
    ('Cross-Origin-Opener-Policy', 'same-origin'),
    ('Content-Security-Policy', _CSP),
]
_TOKEN_PAGES = ['/ko/track.html', '/en/bid.html', '/ko/reset.html', '/en/unsubscribe.html', '/ko/my.html', '/ko/account.html', '/ko/withdraw.html']
_TOKEN_HEADERS = [('Referrer-Policy', 'no-referrer'), ('Cache-Control', 'no-store'), ('X-Robots-Tag', 'noindex, nofollow')]
_NOINDEX_SECTIONS = ['/admin/*', '/docs/*', '/emails/*']
_NOINDEX_HEADERS = [('X-Robots-Tag', 'noindex'), ('Cache-Control', 'no-store')]

_headers_lines = ['/*']
for k, v in _GLOBAL_HEADERS:
    _headers_lines.append('  %s: %s' % (k, v))
for path in _TOKEN_PAGES:
    _headers_lines.append('')
    _headers_lines.append(path)
    for k, v in _TOKEN_HEADERS:
        _headers_lines.append('  %s: %s' % (k, v))
for path in _NOINDEX_SECTIONS:
    _headers_lines.append('')
    _headers_lines.append(path)
    for k, v in _NOINDEX_HEADERS:
        _headers_lines.append('  %s: %s' % (k, v))
_headers_lines += ['', '/assets/config.js', '  Cache-Control: no-cache']
open('_headers', 'w', encoding='utf-8').write('\n'.join(_headers_lines) + '\n')

def _vh(pairs):
    return [{'key': k, 'value': v} for k, v in pairs]

_vercel = {'headers': [{'source': '/(.*)', 'headers': _vh(_GLOBAL_HEADERS)}]}
for path in _TOKEN_PAGES:
    _vercel['headers'].append({'source': path, 'headers': _vh(_TOKEN_HEADERS)})
for path in _NOINDEX_SECTIONS:
    _vercel['headers'].append({'source': path, 'headers': _vh(_NOINDEX_HEADERS)})
_vercel['headers'].append({'source': '/assets/config.js', 'headers': _vh([('Cache-Control', 'no-cache')])})
open('vercel.json', 'w', encoding='utf-8').write(json.dumps(_vercel, indent=2, ensure_ascii=False) + '\n')

print('build_launch ok (domain=%r prod=%r demo=%r api=%r)' % (CFG.get('domain', ''), PROD, DEMO, API))
