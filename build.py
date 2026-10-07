import re, io
try:
    _SITE_DIR
except NameError:
    import os as _os_
    _SITE_DIR = _os_.environ.get('MG_SITE_DIR') or _os_.path.dirname(_os_.path.abspath(__file__))
# 디자인 원천(초기 시안 3종). build.py 가 CSS·마크업 조각을 여기서 추출한다. 이 파일들이 정본이며(2026-09-27 D-33),
# PC 폴더 _archive/초기시안/ 의 같은 이름 파일과는 카피가 다르다(아카이브는 참고용, 빌드에 쓰지 않음).
_SRC = _os_.path.join(_SITE_DIR, 'src')
KO = open(_os_.path.join(_SRC, 'micego-organizer-landing.html'), encoding='utf-8').read()
EN = open(_os_.path.join(_SRC, 'micego-hotel-partner-landing.html'), encoding='utf-8').read()
SP = open(_os_.path.join(_SRC, 'micego-hotel-bid-page.html'), encoding='utf-8').read()

# ---------- pieces from KO ----------
ROOT = re.search(r':root\{.*?\n\}', KO, re.S).group(0).replace('--error:#EF4444;', '--error:#EF4444;\n  --amber-deep:#8A5A00;')
assert '--amber-deep' in ROOT
BASE = re.search(r'/\* ===== Reset =====.*?(?=/\* ===== Hero)', KO, re.S).group(0)
BASE = re.sub(r':root\{.*?\n\}', lambda m: ROOT, BASE, count=1, flags=re.S)
FOOT_CSS = "\n".join(l for l in KO.split('\n') if re.match(r'\.(site-footer|footer-top|footer-brand|footer-desc|footer-right|footer-contact|footer-links|footer-bottom|footer-notice|footer-copyright)[ {.]', l))
HEADER_CSS = re.search(r'/\* ===== Header =====.*?(?=/\* ===== Hero)', KO, re.S).group(0)
CONTAINER = re.search(r'\.container\{[^\n]*\}', KO).group(0)

SHARED = r'''/* ===== Shared: header additions ===== */
.site-header.is-solid,html:not(.js-anim) .site-header{background:rgba(255,255,255,.96);border-bottom:1px solid var(--line)}
.header-right{display:flex;align-items:center;gap:12px}
.mode-switch{display:inline-flex;border:1.5px solid var(--line);border-radius:999px;background:var(--white);overflow:hidden;flex:0 0 auto}
.mode-switch a{display:inline-flex;align-items:center;justify-content:center;min-height:44px;min-width:44px;padding:0 14px;font:700 13px/1 var(--font-sans);color:var(--gray);white-space:nowrap}
.mode-switch a[lang=en]{font-family:var(--font-display)}
.mode-switch a:hover{color:var(--ink);background:var(--bg)}
.mode-switch a[aria-current],.mode-switch a.is-current{background:var(--ink);color:var(--white)}
.hdr-cta{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:8px;background:var(--ink);color:var(--white);font:700 13.5px/1 var(--font-sans);white-space:nowrap}
.hdr-cta:hover{background:var(--teal)}
.hdr-login{display:inline-flex;align-items:center;justify-content:center;min-height:44px;min-width:44px;padding:0 8px;font:600 13.5px/1 var(--font-sans);color:var(--ink-60);white-space:nowrap}
.hdr-login:hover{color:var(--ink)}
.hdr-login.is-member{color:var(--teal-deep)}
.nav-menu{display:none}
.nav-menu summary{list-style:none;display:flex;align-items:center;justify-content:center;width:44px;height:44px;border:1.5px solid var(--line);border-radius:8px;background:var(--white);cursor:pointer}
.nav-menu summary::-webkit-details-marker{display:none}
.nav-bars,.nav-bars::before,.nav-bars::after{display:block;width:18px;height:2px;border-radius:1px;background:var(--ink);position:relative;transition:transform .15s}
.nav-bars::before,.nav-bars::after{content:'';position:absolute;left:0}
.nav-bars::before{top:-6px}.nav-bars::after{top:6px}
.nav-menu[open] .nav-bars{background:transparent}
.nav-menu[open] .nav-bars::before{top:0;transform:rotate(45deg)}
.nav-menu[open] .nav-bars::after{top:0;transform:rotate(-45deg)}
.nav-menu-panel{position:absolute;top:100%;left:0;right:0;display:flex;flex-direction:column;background:var(--white);border-bottom:1px solid var(--line);box-shadow:var(--sh-elevated);padding:8px 20px 16px;max-height:calc(100vh - 72px);overflow-y:auto}
.nav-menu-panel a{display:flex;align-items:center;min-height:48px;border-bottom:1px solid var(--line-dim);font-size:15px;font-weight:600;color:var(--ink)}
.nav-menu-panel a.nav-menu-cta{justify-content:center;margin-top:12px;border:none;border-radius:8px;background:var(--teal);color:var(--white)}
.nav-menu-panel a.nav-menu-hub{justify-content:center;border:none;font-size:13px;color:var(--gray)}
.sr-only{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.footer-links{flex-wrap:wrap;row-gap:10px}
.footer-modes{display:flex;flex-wrap:wrap;gap:10px 18px;font-size:13px}
.footer-modes a{color:var(--white)}
@media (max-width:1200px){.header-nav{gap:24px}}
@media (max-width:1024px){.header-nav{display:none}.nav-menu{display:block}}
@media (max-width:768px){.hdr-cta{display:none}.header-right{gap:8px}.nav-menu-panel{padding:8px 16px 16px}.has-mobile-cta .site-footer{padding-bottom:calc(96px + env(safe-area-inset-bottom))}.footer-right{align-items:flex-start}}
@media (max-width:480px){.brand-tag{display:none}.mode-switch a{padding:0 10px;font-size:12.5px}.hdr-login{padding:0 4px;font-size:12.5px}}
@media (max-width:400px){.mode-switch a{padding:0 8px}.header-right{gap:4px}.brand-word{font-size:18px}}
/* ===== /Shared ===== */
'''

SUB_BASE_MEDIA = '''
body.has-fixed-header{padding-top:72px}
.site-header a,.site-footer a{text-decoration:none}
@media (max-width:768px){body.has-fixed-header{padding-top:56px}.container{padding:0 20px}.site-header{height:56px}.site-header .container{height:56px}.brand-mark{width:26px;height:26px}.brand-word{font-size:19px}.footer-top{grid-template-columns:1fr}.footer-bottom{flex-direction:column;align-items:flex-start}}
'''

ICON = re.search(r'<link rel="icon"[^\n]*', KO).group(0)
SVG = lambda fill: f'''<svg class="brand-mark" viewBox="0 0 32 32" role="img" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="{fill}"/>
        <rect x="6.5" y="9" width="14" height="2.6" rx="1.3" fill="#FFFFFF"/>
        <rect x="6.5" y="14.7" width="11" height="2.6" rx="1.3" fill="#16B5A8"/>
        <rect x="6.5" y="20.4" width="8" height="2.6" rx="1.3" fill="#FFC24B"/>
        <circle cx="24.5" cy="16" r="2.6" fill="#FFFFFF"/>
      </svg>'''

LAND_FIX = ('/* mobile card/step grids: icon spans rows, text stays in column 2 */\n'
  '@media (max-width:1024px){.problem .card>.problem-icon,.why-grid .card>.problem-icon{grid-row:1/span 2}.problem .card>h3,.problem .card>p,.why-grid .card>h3,.why-grid .card>p{grid-column:2;min-width:0}.problem .card,.why-grid .card{row-gap:8px}.problem .card>h3,.why-grid .card>h3{margin:0;padding-top:8px}}\n'
  'html[lang="ko"] .card h3,html[lang="ko"] .card p,html[lang="ko"] .how-step h3,html[lang="ko"] .how-step p,html[lang="ko"] .section-head .lead,html[lang="ko"] .faq-panel p{word-break:keep-all;overflow-wrap:anywhere}\n'
  '@media (max-width:768px){.how-step>.how-badge{grid-row:1/span 2}.how-step>h3,.how-step>p{grid-column:2;min-width:0}.how-step{row-gap:6px}.how-step>h3{margin:0;padding-top:7px}}\n')

def header(lang, brand_href, brand_label, tag, nav, cta_href, cta_text, menu_cta, ko_href, en_href, cur, hub_href, hub_html, solid=False, contrast=None, login=None):
    ko_cur = ' aria-current="page"' if cur == 'ko' else ''
    en_cur = ' aria-current="page"' if cur == 'en' else ''
    tag_html = f'\n      <span class="brand-tag">{tag}</span>' if tag else ''
    nav_html = ''
    menu_html = ''
    if nav:
        nav_html = f'''    <nav class="header-nav" aria-label="{'주요 메뉴' if lang=='ko' else 'Main'}">
''' + ''.join(f'      <a href="{h}">{t}</a>\n' for h, t in nav) + '    </nav>\n'
        menu_html = f'''      <details class="nav-menu">
        <summary><span class="nav-bars" aria-hidden="true"></span><span class="sr-only">{'메뉴' if lang=='ko' else 'Menu'}</span></summary>
        <nav class="nav-menu-panel" aria-label="{'메뉴' if lang=='ko' else 'Menu'}">
''' + ''.join(f'          <a href="{h}">{t}</a>\n' for h, t in nav) + f'''          <a class="nav-menu-cta" href="{cta_href}">{menu_cta}</a>
          <a class="nav-menu-hub" href="{hub_href}">{hub_html}</a>
        </nav>
      </details>
'''
    login_html = f'      <a class="hdr-login" href="{login}" data-acc-login>로그인</a>\n' if login else ''
    cta = f'      <a class="hdr-cta" href="{cta_href}">{cta_text}</a>\n' if cta_href else ''
    return f'''<header class="site-header{' is-solid' if solid else ''}" id="siteHeader">
  <div class="container">
    <a class="brand" href="{brand_href}" aria-label="{brand_label}">
      {SVG('#0F1E3D')}
      <span class="brand-word">MICE<span class="go">GO</span></span>{tag_html}
    </a>
{nav_html}    <div class="header-right">
      <nav class="mode-switch" aria-label="모드 선택 / Choose mode">
        <a href="{ko_href}" lang="ko"{ko_cur}>여행사</a>
        <a href="{en_href}" lang="en" hreflang="en"{en_cur}>Hotels</a>
      </nav>
{login_html}{cta}{menu_html}    </div>
  </div>
</header>'''

def footer(lang, desc, notice, links, modes_html, brand_sub, contact_note=''):
    links_html = ''.join(f'\n          <a href="{h}"{(" lang=%s" % l) if l else ""}>{t}</a>' for h, t, l in links)
    return f'''<footer class="site-footer">
  <div class="container">
    <div class="footer-top">
      <div>
        <div class="footer-brand">
          {SVG('#1F3266').replace('      ','          ')}
          <span class="brand-word">MICE<span class="go">GO</span></span>
          <span style="font-size:12px;color:rgba(255,255,255,.5);margin-left:8px">{brand_sub}</span>
        </div>
        <p class="footer-desc">{desc}</p>
      </div>
      <div class="footer-right">
        <a class="footer-contact" href="mailto:mysteri1984@gmail.com">mysteri1984@gmail.com</a>
        <div class="footer-links">{links_html}
        </div>
        {modes_html}
      </div>
    </div>
    <div class="footer-bottom">
      <p class="footer-notice">{notice}</p>
      <p class="footer-copyright">© 2026 MICEGO. ALL RIGHTS RESERVED.</p>
    </div>
  </div>
</footer>'''

HREFLANG = '''<!-- TODO(domain): 도메인 확정 후 주석 해제 / uncomment once the domain is confirmed
<link rel="canonical" href="https://micego.kr/{path}">
<link rel="alternate" hreflang="ko" href="https://micego.kr/ko/">
<link rel="alternate" hreflang="en" href="https://micego.kr/en/">
<link rel="alternate" hreflang="x-default" href="https://micego.kr/">
-->'''

ACC_FLIP_JS = '''try{
  var _isMember = false;
  if(window.MG && MG.mode==='api' && !MG.preview){ _isMember = !!MG.auth.member(); }
  else{/*demo:start*/ var _m=sessionStorage.getItem('mg_demo_member'); _isMember = !!(_m&&JSON.parse(_m)); /*demo:end*/}
  if(_isMember){document.querySelectorAll('[data-acc-login]').forEach(function(a){a.textContent='내 견적 요청';a.setAttribute('href','my.html');a.classList.add('is-member');});}
}catch(e){}'''

NAV_JS = '''
  ''' + ACC_FLIP_JS + '''
  /* ---- Mobile nav menu (details) ---- */
  document.querySelectorAll('.nav-menu').forEach(function(menu){
    menu.querySelectorAll('a').forEach(function(a){ a.addEventListener('click', function(){ menu.removeAttribute('open'); }); });
    document.addEventListener('keydown', function(e){ if(e.key==='Escape' && menu.open){ menu.removeAttribute('open'); menu.querySelector('summary').focus(); } });
    document.addEventListener('click', function(e){ if(menu.open && !menu.contains(e.target)) menu.removeAttribute('open'); });
  });
  try{ localStorage.setItem('micego.mode','%s'); }catch(e){}
'''

def landing(t, lang):
    ko = lang == 'ko'
    # tokens
    t = t.replace('--error:#EF4444;', '--error:#EF4444;\n  --amber-deep:#8A5A00;', 1)
    # shared css + remove old header btn rule
    t = re.sub(r'\n  \.header-right \.btn\{[^\n]*\}', '', t)
    t = t.replace('</style>', LAND_FIX + SHARED + '</style>', 1)
    # faq: JS-off visible
    t = t.replace('role="region" hidden>', 'role="region">')
    t = re.sub(r'\n\.faq-panel\{([^\n]*)\}', r'\n.js-anim .faq-panel{\1}', t, count=1)
    t = t.replace('"use strict";', '"use strict";\n  document.querySelectorAll(\'.faq-panel\').forEach(function(p){ p.hidden = true; });', 1)
    # form
    t = t.replace('<form id="registerForm" novalidate>', '<form id="registerForm" novalidate action="mailto:mysteri1984@gmail.com" method="post" enctype="text/plain">', 1)
    t = t.replace('<body>', '<body class="has-mobile-cta">', 1)
    # header
    if ko:
        nav = [('#problem', '문제'), ('#how', '동작 방식'), ('#who', '대상'), ('#policy', '이용 조건'), ('#faq', '자주 묻는 질문')]
        h = header('ko', '#hero', 'MICEGO 처음으로', None, nav, '#register', '견적 요청', '지금 견적 요청하기', 'index.html', '../en/index.html', 'ko', '../index.html', '모드 선택 · <span lang="en">Choose mode</span>', login='login.html')
    else:
        nav = [('#why', 'Why partner'), ('#how', 'How it works'), ('#sample', 'Sample request'), ('#terms', 'Partner terms'), ('#faq', 'FAQ')]
        h = header('en', '#hero', 'MICEGO home', 'Partner', nav, '#register', 'Register', 'Register your property', '../ko/index.html', 'index.html', 'en', '../index.html', 'Choose mode · <span lang="ko">모드 선택</span>')
    t, n = re.subn(r'<header class="site-header" id="siteHeader">.*?</header>', lambda m: h, t, count=1, flags=re.S)
    assert n == 1
    # footer
    if ko:
        modes = '<div class="footer-modes"><a href="../en/index.html" lang="en" hreflang="en">Hotels (English) →</a><a href="../index.html">모드 선택 · <span lang="en">Choose mode</span></a></div>'
        links = [('#how', '동작 방식', ''), ('#policy', '이용 조건', ''), ('#faq', '자주 묻는 질문', ''), ('privacy.html', '개인정보처리방침', '')]
    else:
        modes = '<div class="footer-modes"><a href="../ko/index.html" lang="ko" hreflang="ko">여행사 (한국어) →</a><a href="../index.html">Choose mode · <span lang="ko">모드 선택</span></a></div>'
        links = [('#how', 'How it works', ''), ('#terms', 'Partner terms', ''), ('#faq', 'FAQ', ''), ('privacy.html', 'Privacy', '')]
    old_foot = re.search(r'<footer class="site-footer">.*?</footer>', t, re.S).group(0)
    notice = re.search(r'<p class="footer-notice">(.*?)</p>', old_foot, re.S).group(1)
    desc = re.search(r'<p class="footer-desc">(.*?)</p>', old_foot, re.S).group(1)
    sub = re.search(r'margin-left:8px">(.*?)</span>', old_foot).group(1)
    nf = footer(lang, desc, notice, links, modes, sub)
    t = t.replace(old_foot, nf, 1)
    # consent link
    if ko:
        t = t.replace('<!-- TODO(legal): 개인정보처리방침 페이지 신설 및 링크 연결, 문구 법무 검토 필요 -->', '<br><a href="privacy.html" target="_blank" rel="noopener" style="text-decoration:underline">개인정보처리방침 보기</a><!-- TODO(legal): 문구 법무 검토 필요 -->', 1)
        old = '호텔·리조트 파트너 등록 페이지가 별도로 마련되어 있습니다. 아래 메일로 연락 주시면 등록 안내를 드립니다.'
        assert old in t
        t = t.replace(old, '호텔·리조트 파트너 등록은 영문 호텔 모드에서 진행합니다. <a href="../en/index.html#register" lang="en" style="text-decoration:underline">Hotels → Register</a>', 1)
    else:
        old = 'to contact me about partnership.</label>'
        assert old in t
        t = t.replace(old, 'to contact me about partnership. See our <a href="privacy.html" target="_blank" rel="noopener" style="text-decoration:underline">privacy notice</a>.</label>', 1)
        # relative dates
        for a, b in [('16–19 Nov 2026 (confirmed)', 'Mon – Thu, 3 nights (confirmed)'), ('Mon 16 – Thu 19 Nov 2026 (confirmed)', 'Mon – Thu, 3 nights (confirmed)'), ('Wed 18 Nov 2026', 'Night 3 (Wed)')]:
            assert a in t, a
            t = t.replace(a, b)
        old = '<p class="sample-footnote reveal">'
        i = t.index(old); j = t.index('</p>', i) + 4
        t = t[:j] + '\n    <p class="reveal" style="text-align:center;margin-top:20px"><a class="btn btn-ghost btn-arrow" href="sample-request.html">Open the full sample request page</a></p>' + t[j:]
        # sample footnote clarifies relative dates
        t = t.replace('Sample brief, shown for format. Deadlines', 'Sample brief, shown for format. Dates are shown relative to the request; live requests state exact calendar dates. Deadlines', 1)
    # head: og locale + hreflang
    loc = ('ko_KR', 'en_US') if ko else ('en_US', 'ko_KR')
    path = 'ko/' if ko else 'en/'
    t = t.replace('<meta property="og:type" content="website">', f'<meta property="og:type" content="website">\n<meta property="og:locale" content="{loc[0]}">\n<meta property="og:locale:alternate" content="{loc[1]}">\n' + HREFLANG.replace('{path}', path), 1)
    # js
    k = t.rindex('})();')
    t = t[:k] + (NAV_JS % lang) + '\n' + t[k:]
    return t

ko_out = landing(KO, 'ko')
en_out = landing(EN, 'en')
open('ko/index.html', 'w', encoding='utf-8').write(ko_out)
open('en/index.html', 'w', encoding='utf-8').write(en_out)

# ---------- sample page ----------
def sample(t):
    # root tokens
    t = re.sub(r':root\{.*?\n\}', lambda m: ROOT + '\n' + CONTAINER + '\n' + HEADER_CSS.replace('/* ===== Header ===== */', '/* ===== Site header ===== */') + '\n' + FOOT_CSS + SUB_BASE_MEDIA, t, count=1, flags=re.S)
    # drop old brand/topbar css
    t = re.sub(r'\.topbar\{[^\n]*\}\n', '.req-bar{background:var(--white);border-bottom:1px solid var(--line)}\n', t)
    t = re.sub(r'\.brand\{[^\n]*\}\n\.brand-word\{[^\n]*\}\n\.brand-tag\{[^\n]*\}\n', '', t)
    t = t.replace('.topbar-inner', '.req-bar-inner').replace('.topbar-right', '.req-bar-right')
    t = t.replace('footer{margin-top:8px;padding:36px 0 44px}', '.req-foot{margin-top:8px;padding:36px 0 44px}')
    t = t.replace('.footer-bottom{border-top:1px solid var(--line);padding-top:20px;font-size:12px;color:var(--gray-light);display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px}', '.req-foot-bottom{border-top:1px solid var(--line);padding-top:20px;font-size:12px;color:var(--gray-light);display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px}')
    t = t.replace('</style>', LAND_FIX + SHARED + '</style>', 1)
    # head
    t = t.replace('<title>New MICE Quote Request — MG-2608-007 | MICEGO Partner</title>', '<title>Sample MICE quote request (demo) | MICEGO Partner</title>\n<meta name="robots" content="noindex">\n<meta property="og:locale" content="en_US">\n<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 32 32\'%3E%3Crect width=\'32\' height=\'32\' rx=\'9\' fill=\'%230F1E3D\'/%3E%3Crect x=\'6.5\' y=\'9\' width=\'14\' height=\'2.6\' rx=\'1.3\' fill=\'%23FFFFFF\'/%3E%3Crect x=\'6.5\' y=\'14.7\' width=\'11\' height=\'2.6\' rx=\'1.3\' fill=\'%2316B5A8\'/%3E%3Crect x=\'6.5\' y=\'20.4\' width=\'8\' height=\'2.6\' rx=\'1.3\' fill=\'%23FFC24B\'/%3E%3Ccircle cx=\'24.5\' cy=\'16\' r=\'2.6\' fill=\'%23FFFFFF\'/%3E%3C/svg%3E">')
    t = t.replace('<script>document.documentElement.className', '<script>document.documentElement.className')  # noop
    h = header('en', 'index.html', 'MICEGO Partner home', None, None, 'index.html#register', 'Register', '', '../ko/index.html', 'index.html', None, '../index.html', '', solid=True)
    h = h.replace('<a href="index.html" lang="en" hreflang="en">Hotels</a>', '<a href="index.html" lang="en" hreflang="en" class="is-current">Hotels</a>')
    t = t.replace('<body>', '<body class="has-fixed-header">\n' + h, 1)
    # req bar
    t = re.sub(r'<div class="topbar">\s*<div class="wrap topbar-inner">\s*<div class="brand">.*?</div>\s*<div class="topbar-right">', '<div class="req-bar">\n  <div class="wrap req-bar-inner">\n    <span class="ref-code">MICE QUOTE REQUEST</span>\n    <div class="req-bar-right">', t, count=1, flags=re.S)
    t = t.replace('<span class="badge badge-deadline" id="deadlinePill">Closes in —</span>', '<span class="badge badge-deadline">Deadline: Day 4, 18:00 KST</span>')
    # countdown js
    t = re.sub(r"\n  var BID_DEADLINE[^\n]*", '', t)
    t = re.sub(r"\n  /\* ---- Countdown pill ---- \*/.*?var timer = setInterval\(renderCountdown, 30000\);\n", '\n', t, flags=re.S)
    # dates
    reps = [('12 Aug 2026, 09:00 KST', 'Day 1 · 09:00 KST'), ('13 Aug 2026, 12:00 KST</span></div>', 'Day 4 · 18:00 KST (3 business days after the invitation)</span></div>'), ('14 Aug 2026</span>', 'Day 5</span>'),
            ('Mon 16 – Thu 19 Nov 2026', 'Mon – Thu, 3 nights'), ('Wed 18 Nov 2026', 'Night 3 (Wed)'),
            ('Deadline 13 Aug 2026, 12:00 KST · You can revise your quote until the deadline by replying to hello@micego.kr.', 'Sample deadline: Day 4, 18:00 KST · On a live request you can revise your quote until the deadline by replying to the request email.'),
            ('has been recorded at 12 Aug 2026, 10:24 KST. MICEGO will compile all responses and deliver the comparison to the organizer by 14 Aug 2026.', 'has been recorded. On a live request, MICEGO compiles all responses and delivers the comparison to the organizer by the stated response date.')]
    for a, b in reps:
        assert a in t, a
        t = t.replace(a, b)
    t = t.replace('<form id="bidForm" novalidate>', '<form id="bidForm" novalidate action="javascript:void(0)">', 1)
    # footer
    t = t.replace('<footer>\n    <div class="next-steps">', '<div class="req-foot">\n    <div class="next-steps">', 1)
    t = t.replace('''    <div class="footer-bottom">
      <span>Questions? hello@micego.kr</span>
      <span>Demo sample — not a live sourcing request.</span>
    </div>
  </footer>''', '''    <div class="req-foot-bottom">
      <span>Questions? <a href="mailto:mysteri1984@gmail.com">mysteri1984@gmail.com</a> · <a href="index.html#sample" style="text-decoration:underline">← Back to hotel mode</a></span>
      <span>Demo sample — not a live sourcing request. Sample dates are shown as Day 1, Day 4 and so on; every live request states exact calendar dates and a KST deadline.</span>
    </div>
  </div>''', 1)
    assert 'hello@micego.kr' not in t
    foot = footer('en', 'Overseas MICE hotel sourcing for Korean organizers.', 'Demo sample — not a live sourcing request.', [('index.html', 'Hotel mode', ''), ('privacy.html', 'Privacy', '')],
                  '<div class="footer-modes"><a href="../ko/index.html" lang="ko" hreflang="ko">여행사 (한국어) →</a><a href="../index.html">Choose mode · <span lang="ko">모드 선택</span></a></div>', 'Partner Network')
    t = t.replace('\n<script>\n(function(){', '\n' + foot + '\n\n<script>\n(function(){', 1)
    k = t.rindex('})();')
    t = t[:k] + "  try{ localStorage.setItem('micego.mode','en'); }catch(e){}\n" + t[k:]
    return t
open('en/sample-request.html', 'w', encoding='utf-8').write(sample(SP))

# ---------- privacy pages ----------
def page(lang, title, desc, path, body, cur, brand_href):
    ko = lang == 'ko'
    css = BASE + '\n' + FOOT_CSS + SUB_BASE_MEDIA + '''
.doc{max-width:760px;margin:0 auto;padding:56px 32px 96px}
.doc h1{font-family:var(--font-display);font-size:clamp(26px,3.4vw,36px);margin-bottom:8px}
.doc h2{font-size:18px;margin:36px 0 10px;font-family:var(--font-sans)}
.doc p,.doc li{font-size:15px;line-height:1.8;color:var(--ink-80)}
.doc ul{list-style:disc;padding-left:20px}
.doc a{color:var(--teal-deep);text-decoration:underline}
.doc .updated{font-size:13px;color:var(--gray)}
@media (max-width:480px){.doc{padding:32px 16px 72px}}
''' + SHARED
    h = header(lang, 'index.html', 'MICEGO', None, None, 'index.html#register', '견적 요청' if ko else 'Register', '', 'index.html' if ko else '../ko/index.html', '../en/index.html' if ko else 'index.html', None, '../index.html', '', solid=True, login='login.html' if ko else None)
    cls = 'is-current'
    h = h.replace('<a href="index.html" lang="ko"', f'<a href="index.html" lang="ko" class="{cls}"', 1) if ko else h.replace('<a href="index.html" lang="en" hreflang="en">', f'<a href="index.html" lang="en" hreflang="en" class="{cls}">', 1)
    if ko:
        f = footer('ko', '해외 MICE 호텔 역경매 플랫폼', '해외 호텔 대상 · 주최 측 수수료 없음 · 영업일 3일 이내 회신 · 요건서에 회사명·예산 미포함.', [('index.html', '여행사 모드', ''), ('privacy.html', '개인정보처리방침', '')],
                   '<div class="footer-modes"><a href="../en/index.html" lang="en" hreflang="en">Hotels (English) →</a><a href="../index.html">모드 선택 · <span lang="en">Choose mode</span></a></div>', '마이스고')
    else:
        f = footer('en', 'Overseas MICE hotel sourcing for Korean organizers.', 'No listing fee · You choose which requests to quote on · Confirmed-date requests only · Organizer identity withheld.', [('index.html', 'Hotel mode', ''), ('privacy.html', 'Privacy', '')],
                   '<div class="footer-modes"><a href="../ko/index.html" lang="ko" hreflang="ko">여행사 (한국어) →</a><a href="../index.html">Choose mode · <span lang="ko">모드 선택</span></a></div>', 'Partner Network')
    loc = ('ko_KR', 'en_US') if ko else ('en_US', 'ko_KR')
    return f'''<!DOCTYPE html>
<html lang="{lang}">
<head>
<script>document.documentElement.className+=' js-anim';</script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta property="og:title" content="{title}">
<meta property="og:type" content="website">
<meta property="og:locale" content="{loc[0]}">
<meta property="og:locale:alternate" content="{loc[1]}">
{HREFLANG.replace('{path}', path)}
{ICON}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=JetBrains+Mono:wght@500;600&display=swap">
<style>
{css}
</style>
</head>
<body class="has-fixed-header">
{h}
<main class="doc">
{body}
</main>
{f}
<script>try{{localStorage.setItem('micego.mode','{lang}');}}catch(e){{}}{ACC_FLIP_JS if ko else ''}</script>
</body>
</html>
'''

KO_BODY = '''<h1>개인정보처리방침</h1>
<p class="updated">최종 업데이트: 2026-09-25<!-- TODO(legal): 공개일로 갱신 --></p>

<h2>1. 수집하는 항목</h2>
<p>견적 요청 폼에서 아래 정보를 받습니다.</p>
<ul>
<li>필수: 소속 유형, 회사·기관명, 담당자명, 이메일, 행사 정보(행사 유형, 시작일·종료일, 예상 인원, 국가·도시, 트윈·킹 객실 수, 볼룸 사용 여부와 목적)</li>
<li>선택: 연락처, 추가 메모</li>
</ul>

<h2>2. 이용 목적</h2>
<p>견적 요청을 처리하고, 표준 요건서를 만들고, 진행 상황과 회신을 안내하는 데 사용합니다.</p>

<h2>3. 호텔(공급자)에 전달하는 정보</h2>
<p>호텔에는 회사명, 예산, 담당자 연락처를 뺀 행사 요건만 전달합니다. 제안을 선택해 호텔과 연결하는 단계에서는 별도로 동의를 받은 뒤에 담당자 정보를 해당 해외 호텔에 전달합니다.<!-- TODO(legal): 국외 이전 고지 요건 검토 --></p>

<h2>4. 처리 방식</h2>
<p>폼 내용은 이용자의 메일 앱을 통해 이메일로 전송되며, 운영자의 Gmail 메일함으로 받아 보관합니다. 글꼴을 불러오는 과정에서 Google Fonts와 jsDelivr에 접속 정보(IP 등)가 전달될 수 있습니다. 쿠키는 사용하지 않고, 브라우저에는 마지막으로 고른 모드(ko/en) 값만 저장합니다.</p>

<h2>5. 보유 기간</h2>
<p>처리가 끝나거나 동의를 철회할 때까지 보관합니다. 관계 법령에 따라 보존해야 하는 정보는 그 기간 동안 보관합니다.</p>

<h2>6. 이용자의 권리</h2>
<p>열람, 정정, 삭제, 처리정지를 이메일로 요청할 수 있습니다.</p>

<h2>7. 문의</h2>
<p>개인정보 관련 문의는 <a href="mailto:mysteri1984@gmail.com">mysteri1984@gmail.com</a>으로 보내 주세요.</p>

<h2>8. 운영자</h2>
<p>운영: MICEGO (마이스고) · 문의 mysteri1984@gmail.com</p>
<!-- TODO(operator): 상호(법인명), 대표자, 사업자등록번호, 주소, 개인정보 보호책임자 성명·직책 — 확인 후 기재 -->

<p lang="en" style="margin-top:32px">Hotels: see the <a href="../en/privacy.html">English privacy notice</a>.</p>'''

EN_BODY = '''<h1>Privacy notice</h1>
<p class="updated">Last updated: 2026-09-25<!-- TODO(legal): update on publication --></p>

<h2>1. What we collect</h2>
<p>Through the partner registration form:</p>
<ul>
<li>Property name, city and country, largest group capacity, banquet space availability</li>
<li>Contact name and contact email</li>
<li>Optional: phone / WhatsApp number</li>
</ul>
<p>The sample request page is a demo. No data you type there is transmitted or stored.</p>

<h2>2. Why we use it</h2>
<p>To send you matching MICE requests and to contact you about partnership.</p>

<h2>3. What is shared</h2>
<p>When you submit a quote on a live request, your quote and property name appear in the comparison sheet sent to that organizer. We do not sell personal data.</p>

<h2>4. How it is handled</h2>
<p>Form content is sent as an email through your mail app and received in the operator's Gmail inbox. Loading fonts may send connection data (such as your IP address) to Google Fonts and jsDelivr. We do not use cookies. Your browser stores only the last mode you chose (ko/en).</p>

<h2>5. Retention</h2>
<p>We keep your details until you withdraw consent or ask us to delete them, unless the law requires us to keep them longer.</p>

<h2>6. Your rights</h2>
<p>You can ask us by email to access, correct, delete, or stop processing your data.</p>

<h2>7. Contact</h2>
<p>Privacy questions: <a href="mailto:mysteri1984@gmail.com">mysteri1984@gmail.com</a></p>

<h2>8. Operator</h2>
<p>Operated by MICEGO · Contact mysteri1984@gmail.com</p>
<!-- TODO(operator): legal entity name, representative, business registration number, address, privacy officer — fill in once confirmed -->

<p lang="ko" style="margin-top:32px">여행사·기업 고객은 <a href="../ko/privacy.html">한국어 방침</a>을 확인하세요.</p>'''

open('ko/privacy.html', 'w', encoding='utf-8').write(page('ko', '개인정보처리방침 | MICEGO 마이스고', 'MICEGO 견적 요청 폼의 개인정보 수집·이용 안내입니다.', 'ko/privacy.html', KO_BODY, 'ko', 'index.html'))
open('en/privacy.html', 'w', encoding='utf-8').write(page('en', 'Privacy notice | MICEGO Partner', 'How MICEGO handles personal data submitted through the partner registration form.', 'en/privacy.html', EN_BODY, 'en', 'index.html'))

# ---------- hub ----------
HUB_CSS = '''
.hub-main{position:relative;padding:136px 0 88px;background:var(--white)}
.hub-main::before{content:'';position:absolute;inset:0;background:radial-gradient(600px 400px at 82% 12%,var(--teal-soft) 0%,transparent 70%);pointer-events:none}
.hub-main .container{position:relative;max-width:1040px}
.hub-head{text-align:center;max-width:680px;margin:0 auto 48px}
.hub-head .chip{margin-bottom:20px}
.hub-head h1{font-family:var(--font-display);font-size:clamp(28px,4vw,44px);line-height:1.22;letter-spacing:-.03em}
.hub-head .h1-en{display:block;font-size:.5em;color:var(--ink-60);letter-spacing:-.01em;margin-top:10px}
.hub-choose{font:600 12px/1 var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--teal-deep);margin-top:28px}
.hub-lead{font-size:16px;line-height:1.7;color:var(--gray);margin-top:14px}
.mode-cards{display:grid;grid-template-columns:1fr 1fr;gap:24px}
.mode-card{position:relative;display:flex;flex-direction:column;gap:14px;border:1.5px solid var(--line);border-radius:20px;padding:36px;background:var(--white);box-shadow:var(--sh-card);transition:border-color .15s,box-shadow .15s,transform .15s}
.mode-card.is-hotel{background:var(--ink);border-color:var(--ink);color:var(--white)}
@media (hover:hover){.mode-card:hover{border-color:var(--teal);box-shadow:var(--sh-card-hover);transform:translateY(-2px)}}
.mode-card h2{font-family:var(--font-display);font-size:clamp(22px,2.4vw,28px);line-height:1.3}
.mode-card p{font-size:15px;line-height:1.7;color:var(--gray)}
.mode-card.is-hotel p,.mode-card.is-hotel li{color:rgba(255,255,255,.72)}
.mode-card ul li{font-size:14.5px;line-height:1.8;color:var(--ink-80);padding-left:16px;position:relative}
.mode-card ul li::before{content:'·';position:absolute;left:0;color:var(--teal)}
.mode-card.is-hotel ul li::before{color:var(--amber)}
.mode-card .chip{align-self:flex-start}
.mode-card .chip.on-dark{background:rgba(255,255,255,.1);color:var(--amber)}
.mode-card-cta{margin-top:auto;display:inline-flex;align-items:center;gap:6px;min-height:44px;font-weight:700;font-size:15px;color:var(--teal-deep)}
.mode-card.is-hotel .mode-card-cta{color:var(--amber)}
.mode-card-recent{position:absolute;top:16px;right:16px;font:600 10.5px/1 var(--font-mono);letter-spacing:.06em;text-transform:uppercase;padding:5px 8px;border-radius:5px;background:var(--amber-soft);color:var(--amber-deep)}
.mode-card-recent[hidden]{display:none}
.hub-head h1,.hub-lead,.mode-card h2,.mode-card p{word-break:keep-all}
.hub-note{text-align:center;font-size:13px;color:var(--gray);margin-top:28px}
@media (max-width:768px){.hub-main{padding:88px 0 56px}}
@media (max-width:640px){.mode-cards{grid-template-columns:1fr;gap:16px}.mode-card{padding:24px}}
'''
hub_header = header('ko', 'index.html', 'MICEGO', None, None, None, '', '', 'ko/index.html', 'en/index.html', None, 'index.html', '', solid=True)
hub_header = hub_header.replace('<a href="ko/index.html" lang="ko">', '<a href="ko/index.html" lang="ko">')
hub_footer = footer('ko', '해외 MICE 호텔 역경매 · Overseas MICE hotel sourcing', '해외 MICE 호텔 역경매 · Overseas MICE hotel sourcing',
                    [('ko/privacy.html', '개인정보처리방침', ''), ('en/privacy.html', 'Privacy notice', 'en')], '', '마이스고')
hub = f'''<!DOCTYPE html>
<html lang="ko">
<head>
<script>document.documentElement.className+=' js-anim';</script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>MICEGO 마이스고 · 여행사 / Hotels</title>
<meta name="description" content="해외 MICE 호텔 역경매 MICEGO. 여행사·기업 행사 담당자는 한국어 페이지로, 호텔·리조트는 영문 페이지로 이동하세요. Hotels &amp; resorts: continue in English.">
<meta property="og:title" content="MICEGO 마이스고 · 여행사 / Hotels">
<meta property="og:description" content="해외 MICE 호텔 역경매 MICEGO. 여행사·기업 행사 담당자는 한국어 페이지로, 호텔·리조트는 영문 페이지로 이동하세요. Hotels &amp; resorts: continue in English.">
<meta property="og:type" content="website">
<meta property="og:locale" content="ko_KR">
<meta property="og:locale:alternate" content="en_US">
{HREFLANG.replace('{path}', '')}
{ICON}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=JetBrains+Mono:wght@500;600&display=swap">
<style>
{BASE}
{FOOT_CSS}
{SUB_BASE_MEDIA}
{HUB_CSS}
{SHARED}
</style>
</head>
<body>
<a class="skip-link" href="#hero">본문으로 건너뛰기</a>
{hub_header}
<main class="hub-main" id="hero"><div class="container">
 <div class="hub-head">
  <span class="chip">OVERSEAS MICE · REVERSE AUCTION</span>
  <h1><span lang="ko">해외 MICE 호텔 견적, 역경매로</span><span class="h1-en" lang="en">Overseas MICE hotel sourcing, by reverse auction</span></h1>
  <p class="hub-lead"><span lang="ko">MICEGO(마이스고)는 일정이 확정된 해외 MICE 행사의 요건을 받아, 조건에 맞는 해외 호텔의 제안을 모아 드리는 서비스입니다.</span><br><span lang="en">MICEGO connects Korean MICE organizers with hotels overseas through one standard request brief.</span></p>
  <p class="hub-choose">이용하실 모드를 선택해 주세요 · <span lang="en">Choose your mode</span></p>
 </div>
 <div class="mode-cards">
  <a class="mode-card" data-mode="ko" href="ko/index.html" lang="ko" hreflang="ko">
   <span class="mode-card-recent" hidden>최근 방문 · <span lang="en">Last visited</span></span>
   <span class="chip">한국어 · 여행사 모드</span>
   <h2>여행사·랜드사·기업 행사 담당자</h2>
   <p>해외 행사 요건을 한 번 등록하면, 조건에 맞는 해외 호텔의 제안을 모아 영업일 기준 3일 이내에 회신드립니다.</p>
   <ul><li>일정이 확정된 해외 행사 대상</li><li>회사명·예산은 공급자에게 비공개</li><li>최소 행사 규모 제한 없음</li></ul>
   <span class="mode-card-cta">여행사 모드로 이동 →</span>
  </a>
  <a class="mode-card is-hotel" data-mode="en" href="en/index.html" lang="en" hreflang="en">
   <span class="mode-card-recent" hidden><span lang="ko">최근 방문</span> · Last visited</span>
   <span class="chip on-dark">English · Hotel mode</span>
   <h2>Hotels &amp; resorts</h2>
   <p>Receive confirmed-date MICE group requests from Korean organizers, in one standard brief.</p>
   <ul><li>Confirmed-date requests only</li><li>You choose which requests to quote on</li><li>Organizer identity withheld until selection</li></ul>
   <span class="mode-card-cta">Enter hotel mode →</span>
  </a>
 </div>
 <p class="hub-note"><span lang="ko">상단의 ‘여행사 | Hotels’ 버튼으로 언제든 전환할 수 있습니다.</span> <span lang="en">Switch anytime with the toggle at the top.</span></p>
</div></main>
{hub_footer}
<script>(function(){{try{{var m=localStorage.getItem('micego.mode');var c=m&&document.querySelector('.mode-card[data-mode="'+m+'"]');if(c){{var b=c.querySelector('.mode-card-recent');if(b)b.hidden=false;}}}}catch(e){{}}}})();</script>
</body>
</html>
'''
open('index.html', 'w', encoding='utf-8').write(hub)
print('ok')
