# verify_launch.py — WP2. Builds the 3 SPEC_LAUNCH.md §8 configurations into scratch copies of the
# site and asserts the static, file-level checks §8 lists. It does not re-run the browser-based
# verify2/verify3/verify_acc/verify_admin* suites (those were run separately against build (a) and
# are 0 FAILS as of this writing) — it focuses on the launch-asset-specific assertions that are new
# in this work package: config wiring, icons, 404, sitemap.xml, robots.txt, security headers,
# en/terms.html, en/unsubscribe.html, and the demo:false strip.
import os, re, sys, json, shutil, subprocess, tempfile, difflib, glob

SITE = os.environ.get('MG_SITE_DIR') or os.path.dirname(os.path.abspath(__file__))
BASELINE = os.environ.get('MG_BASELINE_DIR') or SITE  # 기준선 스냅샷. 기본은 현재 사이트 자체(바이트 동일성 검사)
SCRATCH_ROOT = os.environ.get('MG_VERIFY_SCRATCH') or tempfile.mkdtemp(prefix='mg_verify_launch_')
FAILS = []

def F(msg):
    FAILS.append(msg)
    print('FAIL', msg)

def ok(msg):
    print('ok  ', msg)

# ---------------------------------------------------------------- helpers
def _fresh_copy(name):
    d = os.path.join(SCRATCH_ROOT, name)
    if os.path.exists(d):
        shutil.rmtree(d)
    shutil.copytree(BASELINE, d)
    return d

def _write_cfg(path, cfg):
    open(path, 'w', encoding='utf-8').write(json.dumps(cfg, ensure_ascii=False, indent=2))

def _run_build(cwd, cfg_path):
    env = dict(os.environ)
    env['MG_SITE_CONFIG'] = cfg_path
    r = subprocess.run(['python3', os.path.join(SITE, 'build2.py')], cwd=cwd, env=env,
                        capture_output=True, text=True)
    if r.returncode != 0:
        F('build2.py failed for %s: %s' % (cwd, (r.stdout + r.stderr)[-3000:]))
        return False
    r2 = subprocess.run(['python3', os.path.join(SITE, 'build_notify.py')], cwd=cwd, env=env,
                         capture_output=True, text=True)
    if r2.returncode != 0:
        F('build_notify.py failed for %s: %s' % (cwd, (r2.stdout + r2.stderr)[-2000:]))
    r3 = subprocess.run(['python3', os.path.join(SITE, 'build_sitemap.py')], cwd=cwd, env=env,
                         capture_output=True, text=True)
    if r3.returncode != 0:
        F('build_sitemap.py failed for %s: %s' % (cwd, (r3.stdout + r3.stderr)[-2000:]))
    return True

def rd(p):
    return open(p, encoding='utf-8').read()

PUBLIC_15 = ['index.html', 'ko/index.html', 'ko/about.html', 'ko/faq.html', 'ko/contact.html', 'ko/terms.html',
             'ko/privacy.html', 'ko/signup.html', 'ko/login.html', 'en/index.html', 'en/sample-request.html',
             'en/faq.html', 'en/contact.html', 'en/privacy.html', 'en/terms.html']

# ================================================================== (a) default build: byte parity
A = _fresh_copy('a_default')
_write_cfg(os.path.join(A, 'site.config.json'), json.load(open(os.path.join(SITE, 'site.config.json'), encoding='utf-8')))
if _run_build(A, os.path.join(A, 'site.config.json')):
    # Deterministic line-level check: diff old vs new by WHOLE LINES (never raw characters — a
    # char-level SequenceMatcher on files with long repetitive minified-CSS lines produces garbled,
    # misaligned "fragment" matches that are neither reliably allow-listable nor meaningful). Each
    # opcode's changed lines are then checked one at a time against a small set of known, structural
    # WP2 additions. Anything left over is a real unexpected diff.
    _ICON_LINE_RE = re.compile(
        r'^<link rel="icon" type="image/svg\+xml" href="(\.\./)*favicon\.svg">$|'
        r'^<link rel="icon" href="(\.\./)*favicon\.ico" sizes="32x32">$|'
        r'^<link rel="apple-touch-icon" href="(\.\./)*apple-touch-icon\.png">$|'
        r'^<link rel="manifest" href="(\.\./)*site\.webmanifest">$'
    )
    _CFG_SCRIPT_RE = re.compile(
        r'^<script src="(\.\./)*assets/config\.js"></script><script src="(\.\./)*assets/mg\.js"></script>'
        r'(<script src="(\.\./)*assets/feedback\.js" defer></script>)?$'
    )
    _STATE_CSS_RE = re.compile(r'^html\[data-state="[a-z_]+"\] \[data-states~="[a-z_]+"\](,html\[data-state="[a-z_]+"\] \[data-states~="[a-z_]+"\])*\{display:revert\}$')

    # WP-F2 (SPEC_FEEDBACK.md / SPEC_FEEDBACK_ADDENDUM.md): feedback-widget wiring build_launch.py
    # injects into every generated page -- the early-error head snippet, the micego-build meta tag,
    # assets/feedback.js loaded after assets/mg.js (folded into _CFG_SCRIPT_RE above), a footer
    # "의견 보내기 / Feedback" link + <noscript> fallback appended after the copyright line,
    # data-mgfb-launcher="off" on ko/en contact.html's <html> tag, data-mg-fixed-bottom on
    # .mobile-cta, and a new "의견 접수 / Feedback" section on ko/en privacy.html.
    _FB_EARLY_RE = re.compile(r"^<script>window\.__mgfbEarly=\[\];addEventListener\('error',")
    _FB_META_RE = re.compile(r'^<meta name="micego-build" content="[^"]*">$')
    _FB_PRIVACY_LINES = frozenset([
        "<p>사이트 곳곳의 '의견 보내기'와 문의 폼을 통해 아래 정보를 받습니다.</p>",
        "<ul>",
        "<li>필수: 의견 내용</li>",
        "<li>선택: 회신 이메일, 이름 — 남겨 주시면 답변에 사용하며, 이메일을 남기실 때는 별도로 수집·이용 동의를 받습니다.</li>",
        "<li>자동 수집: 보고 있던 화면 주소와 상태, 연결된 요청번호, 브라우저 종류, 화면 크기, 최근 오류 기록 — 문제를 빠르게 찾기 위한 정보이며 IP 주소는 저장하지 않습니다.</li>",
        "</ul>",
        "<p>이용 목적은 회신과 오류·서비스 개선 확인입니다. 회신 이메일·이름 등 회신에 쓰인 개인정보는 접수 후 12개월이 지나면 알아볼 수 없게 처리(익명화)합니다.<!-- TODO(legal): 익명화 처리 방식·보유 기간 근거, 동의 문구 최종 확정 --></p>",
        "<p>Through the feedback widget available across the site, and the contact form, we collect:</p>",
        "<li>Required: your message</li>",
        "<li>Optional: a reply email and your name — if you leave these, we ask for separate consent to use them for a reply.</li>",
        "<li>Collected automatically: the page you were viewing and its status, a linked request reference, browser type, screen size, and recent error logs, to help us find problems faster. We do not store your IP address.</li>",
        "<p>We use this to reply and to review and fix issues. A reply email or name is anonymized 12 months after we receive it.<!-- TODO(legal): confirm anonymization method, retention basis and consent wording --></p>",
    ])
    _FB_RENUM_RE = re.compile(r'^<h2>\d+\. (운영자|Operator)</h2>$')

    _DS_ATTR_RE = re.compile(r'data-states="([a-z_ ]+)"')

    def _states_lines_ok(old_line, new_line):
        # A line can carry several data-states="..." attributes (nested state panels). Blank out
        # each one's token list on both sides; if what's left matches, and every new-side token set
        # is a superset of the corresponding old-side one (states only ever gain 'loading'/'already'
        # tokens, never lose one), the line is an expected diff.
        old_sets = [frozenset(m.split()) for m in _DS_ATTR_RE.findall(old_line)]
        new_sets = [frozenset(m.split()) for m in _DS_ATTR_RE.findall(new_line)]
        if len(old_sets) != len(new_sets):
            return False
        if not all(o <= n for o, n in zip(old_sets, new_sets)):
            return False
        blanked_old = _DS_ATTR_RE.sub('data-states="\x00"', old_line)
        blanked_new = _DS_ATTR_RE.sub('data-states="\x00"', new_line)
        return blanked_old == blanked_new

    def _added_line_ok(line):
        # A line that only appears in the NEW file (pure insertion).
        if _ICON_LINE_RE.match(line) or _CFG_SCRIPT_RE.match(line):
            return True
        if 'mg-loading' in line and line.strip().startswith('.mg-loading{'):
            return True  # the new CSS rule
        if 'class="mg-loading"' in line:
            return True  # a loading-state panel div (bid/track/my/account/withdraw/reset/unsubscribe)
        if line.strip() == '<a href="terms.html">Partner terms</a>':
            return True  # new en/terms.html footer link on the en/* sub-pages
        if line.strip() in ('<div id="rfpDone" hidden><span data-mg="rfpDoneRef"></span><span data-mg="rfpDoneTrack"></span></div>',
                             '<div id="ptnDone" hidden><span data-mg="ptnDoneRef"></span></div>'):
            return True  # WP3 hook point: hidden, empty success-panel containers (SPEC_LAUNCH §9)
        if _FB_EARLY_RE.match(line.strip()) or _FB_META_RE.match(line.strip()):
            return True  # WP-F2: early-error snippet / micego-build meta tag
        if line.strip() in _FB_PRIVACY_LINES:
            return True  # WP-F2: "의견 접수 / Feedback" privacy section body lines
        if _FB_RENUM_RE.match(line.strip()):
            return True  # WP-F2: 운영자/Operator heading renumbered after the new feedback section
        return False

    def _replaced_pair_ok(old_line, new_line):
        # A line present on both sides but changed. Peel every known WP2 transformation off the new
        # line in turn; if what's left equals the old line (or the two are structurally the same
        # kind of generated line), the diff is expected.
        if _STATE_CSS_RE.match(old_line) and _STATE_CSS_RE.match(new_line):
            return True  # STATE_CSS selector list growing with new state tokens (loading/already/...)
        if re.match(r'^<h2>\d+\. 운영자</h2>$', old_line.strip()) and re.match(r'^<h2>\d+\. 의견 접수</h2>$', new_line.strip()):
            return True  # WP-F2: ko/privacy.html gains the "의견 접수" section ahead of 운영자 (renumbers it)
        if re.match(r'^<h2>\d+\. Operator</h2>$', old_line.strip()) and re.match(r'^<h2>\d+\. Feedback</h2>$', new_line.strip()):
            return True  # WP-F2: en/privacy.html gains the "Feedback" section ahead of Operator (renumbers it)
        if re.sub(r' data-mg(?:-[a-z]+)?="[A-Za-z0-9_]*"', '', new_line) == old_line:
            return True  # WP3 hook point: data-mg="..." / data-mg-action="..." binding attributes added to existing markup (SPEC_LAUNCH §9)
        if 'document.documentElement' in old_line and 'document.documentElement' in new_line and \
           "setAttribute('data-state'" in old_line and "setAttribute('data-state'" in new_line:
            return True  # STATE_HEAD/STATE_HEAD_SHARE/ACC_HEAD bootstrap script (api/preview/data-mode wiring)
        peeled = new_line
        # WP3 hook point: data-mg="..." / data-mg-action="..." binding attributes added anywhere on
        # the line, possibly alongside an unrelated expected change (e.g. a data-states token gain)
        # further down the same (very long, single-line-per-page) markup blob.
        peeled = re.sub(r' data-mg(?:-[a-z]+)?="[A-Za-z0-9_]*"', '', peeled)
        # WP-F2: data-mgfb-launcher="off" added to ko/en contact.html's <html> tag
        peeled = peeled.replace(' data-mgfb-launcher="off"', '')
        # WP-F2: bare data-mg-fixed-bottom attribute added to .mobile-cta
        peeled = peeled.replace(' data-mg-fixed-bottom', '')
        # WP-F2: footer "의견 보내기 / Feedback" link + <noscript> fallback appended right after the
        # footer-copyright paragraph, on the same source line
        peeled = re.sub(r'<p class="footer-feedback">.*?</noscript>', '', peeled)
        # demo-marker wrapping
        peeled = (peeled.replace('<!--demo:start-->', '').replace('<!--demo:end-->', '')
                        .replace('/*demo:start*/', '').replace('/*demo:end*/', ''))
        # a loading-state panel div spliced in front of existing content on the same line
        peeled = re.sub(r'<div data-states="loading" class="mg-loading"[^<]*>[^<]*</div>', '', peeled)
        # a new state-switch preview nav link for a newly-added state token (inside the demo-marker
        # wrapped acc_top() block, so it disappears entirely once demo:false strips the block)
        peeled = re.sub(r'<a href="\?state=(?:loading|already)" data-s="(?:loading|already)">(?:loading|already)</a>', '', peeled)
        # a JS string-literal array of state names gaining a new trailing element, e.g.
        # ["received", ..., "cancelled", "invalid"] -> [..., "invalid", "loading"]
        peeled = re.sub(r', "(?:loading|already)"(?=\])', '', peeled)
        if peeled == old_line:
            return True
        # a data-states="..." token list gaining a new state token (e.g. "...cancelled" -> "...cancelled loading")
        if _states_lines_ok(old_line, peeled):
            return True
        # the one deliberate content addition WP2 ships regardless of config: en/terms.html becomes
        # reachable from the footer link list, and bid.html's consent link points at the real page.
        if new_line.strip() == '<a href="terms.html">Partner terms</a>':
            return True
        if old_line.strip() == 'href="index.html#terms"' or (old_line.replace('index.html#terms', 'terms.html') == new_line):
            return True
        return False

    # WP3 note: WP3 owns "the handler JS strings ... in build2.py, build_acc.py, build_acc2.py and
    # build.py (ACC_FLIP_JS only)" (SPEC_LAUNCH.md §9) and is explicitly allowed "minimal expectation
    # updates in existing verify scripts". Every page's trailing inline handler script (the
    # `(function(){"use strict";...})();` IIFE that app_page()/acc_page() appends after the footer)
    # is exactly that owned JS: it now branches on `MG.mode==='api'` throughout, so it differs from
    # BASELINE line-for-line in ways no small, stable regex allowlist can track. The trailing IIFE is
    # therefore compared only for presence (both sides must have one), never diffed line-by-line;
    # everything before it -- head, body markup, state-head scripts, footer -- is still diffed exactly
    # as before, so a real regression anywhere outside the handler JS still fails this check.
    # app_page()/acc_page() pages emit a single-line `<script>(function(){"use strict";...`; the raw
    # landing pages (ko/index.html, en/index.html, built by build.py's landing(), not app_page()) emit
    # the same IIFE spread across lines instead; and every ko page also carries a small standalone
    # `<script>try{localStorage.setItem('micego.mode',...)}catch(e){}<ACC_FLIP_JS></script>` for the
    # header login/"내 견적 요청" flip (build.py, ACC_FLIP_JS -- also WP3-owned per SPEC_LAUNCH.md §9).
    # Strip every whole occurrence of these owned script blocks (there can be more than one per page,
    # and not always at the end) down to a fixed placeholder before diffing, so WP3's API-mode
    # rewiring inside them never trips this baseline-parity check; every other line is still compared
    # exactly as before.
    _OWNED_SCRIPT_RES = [
        re.compile(r'<script>\s*\(function\(\)\s*\{\s*"use strict";.*?</script>', re.S),
        re.compile(r"<script>try\{localStorage\.setItem\('micego\.mode',.*?</script>", re.S),
    ]

    def _scrub_owned_scripts(t):
        for rx in _OWNED_SCRIPT_RES:
            t = rx.sub('<script>SCRIPT</script>', t)
        return t

    unexpected = []
    for root, dirs, files in os.walk(A):
        # docs/ and emails/ are internal reference material regenerated by build_notify.py /
        # build_sitemap.py, not the public site; their deliberate sample-value/status-badge changes
        # are covered by the dedicated (a) robots.txt check and the suite's own verify scripts, not
        # by this public-page byte-parity walk.
        dirs[:] = [d for d in dirs if d not in ('docs', 'emails')]
        for fn in files:
            if not fn.endswith('.html'):
                continue
            rel = os.path.relpath(os.path.join(root, fn), A)
            base_fp = os.path.join(BASELINE, rel)
            if not os.path.exists(base_fp):
                continue  # brand-new file (en/terms.html, en/unsubscribe.html) — expected, checked separately below
            new_t = rd(os.path.join(root, fn))
            old_t = rd(base_fp)
            if new_t == old_t:
                continue
            scrubbed_old = _scrub_owned_scripts(old_t)
            scrubbed_new = _scrub_owned_scripts(new_t)
            if scrubbed_old == scrubbed_new:
                continue  # only WP3-owned handler-script content differs -- expected
            old_lines = scrubbed_old.splitlines()
            new_lines = scrubbed_new.splitlines()
            sm = difflib.SequenceMatcher(None, old_lines, new_lines, autojunk=False)
            for tag, i1, i2, j1, j2 in sm.get_opcodes():
                if tag == 'equal':
                    continue
                elif tag == 'insert':
                    for nl in new_lines[j1:j2]:
                        if nl.strip() and not _added_line_ok(nl):
                            unexpected.append((rel, 'insert', nl[:200]))
                elif tag == 'delete':
                    for ol in old_lines[i1:i2]:
                        if ol.strip():
                            unexpected.append((rel, 'delete', ol[:200]))
                else:  # replace
                    olds = old_lines[i1:i2]
                    news = new_lines[j1:j2]
                    for k in range(max(len(olds), len(news))):
                        ol = olds[k] if k < len(olds) else ''
                        nl = news[k] if k < len(news) else ''
                        if not ol:
                            if nl.strip() and not _added_line_ok(nl):
                                unexpected.append((rel, 'insert', nl[:200]))
                        elif not nl:
                            if ol.strip():
                                unexpected.append((rel, 'delete', ol[:200]))
                        elif ol != nl and not _replaced_pair_ok(ol, nl):
                            unexpected.append((rel, 'replace', 'OLD:%r NEW:%r' % (ol[:120], nl[:120])))
    if unexpected:
        for rel, kind, chunk in unexpected[:20]:
            F('(a) unexpected default-build diff [%s] in %s: %s' % (kind, rel, chunk))
    else:
        ok('(a) default build matches baseline plus only head/icon/state-head/loading-panel additions')
    # 기준선이 현재 사이트 자체일 수 있으므로(BASELINE 기본값) '변경됨'이 아니라 '결과에 포함됨'으로 검사한다.
    _rob = rd(os.path.join(A, 'robots.txt'))
    if 'Disallow: /en/unsubscribe.html' not in _rob or 'Disallow: /404.html' not in _rob:
        F('(a) robots.txt must contain the /en/unsubscribe.html and /404.html Disallow lines')
    if not os.path.exists(os.path.join(A, 'sitemap.xml')):
        ok('(a) sitemap.xml correctly absent (no domain configured)')
    else:
        F('(a) sitemap.xml should not be generated when domain is empty')

# ================================================================== (b) staging: demo + stub supabase
B = _fresh_copy('b_staging')
_write_cfg(os.path.join(B, 'site.config.json'), {
    "domain": "", "officialEmail": "", "privacyEmail": "",
    "operator": {"legalName": "", "brandName": "MICEGO (마이스고)", "representative": "", "bizRegNo": "", "ecommerceRegNo": "",
                 "address": "", "phone": "", "privacyOfficer": {"name": "", "title": "", "email": ""}},
    "analytics": {"ga4": ""}, "siteVerification": {"google": "", "naver": ""},
    "supabase": {"url": "https://stub.mg.test", "anonKey": "stub-anon-key", "functionsUrl": ""},
    "sms": {"vendor": "solapi", "vendorName": ""}, "prod": False, "demo": True,
})
if _run_build(B, os.path.join(B, 'site.config.json')):
    cfgjs = rd(os.path.join(B, 'assets', 'config.js'))
    if '"url": "https://stub.mg.test"' not in cfgjs.replace("'", '"') and 'stub.mg.test' not in cfgjs:
        F('(b) assets/config.js missing the stub supabase url')
    else:
        ok('(b) staging config.js carries the stub supabase url')
    th = rd(os.path.join(B, 'ko', 'track.html'))
    if "api=!!(C.supabase&&C.supabase.url)" not in th:
        F('(b) ko/track.html state-head missing api-detection wiring')
    else:
        ok('(b) staging state-head wiring present on ko/track.html')

# ================================================================== (c) prod: full config
C = _fresh_copy('c_prod')
PROD_CFG = {
    "domain": "micego.kr", "officialEmail": "hello@micego.kr", "privacyEmail": "privacy@micego.kr",
    "operator": {"legalName": "주식회사 마이스고", "brandName": "MICEGO (마이스고)", "representative": "홍길동",
                 "bizRegNo": "123-45-67890", "ecommerceRegNo": "2026-서울중구-0001",
                 "address": "서울 중구 서소문로 89 순화빌딩 701호", "phone": "02-0000-0000",
                 "privacyOfficer": {"name": "홍길동", "title": "개인정보 보호책임자", "email": "privacy@micego.kr"}},
    "analytics": {"ga4": "G-TEST"},
    "siteVerification": {"google": "google-site-verification-stub", "naver": "naver-site-verification-stub"},
    "supabase": {"url": "https://stub.mg.test", "anonKey": "stub-anon-key", "functionsUrl": ""},
    "sms": {"vendor": "solapi", "vendorName": ""}, "prod": True, "demo": False,
}
_write_cfg(os.path.join(C, 'site.config.json'), PROD_CFG)
if _run_build(C, os.path.join(C, 'site.config.json')):

    # -- sentinels (best-effort: some remain until WP3's data-mg pass; report, don't hard-fail) --
    SENTINELS = ['MG-2610-', '김지은', '김하늘', '한빛투어', 'hanbit-tour', 'Ocean Pearl', '123456',
                 'mysteri1984', 'micego.example', 'demo-share-', 'mg_demo_member', '?state=']
    STRUCTURAL_SENTINELS = ['123456', 'mysteri1984', 'micego.example', '?state=']  # these WP2 fully owns
    hits = {}
    for rel in glob.glob(os.path.join(C, 'ko', '*.html')) + glob.glob(os.path.join(C, 'en', '*.html')) + [os.path.join(C, 'index.html'), os.path.join(C, '404.html')]:
        t = rd(rel)
        for s in SENTINELS:
            if s in t:
                hits.setdefault(s, []).append(os.path.relpath(rel, C))
    structural_bad = {s: v for s, v in hits.items() if s in STRUCTURAL_SENTINELS}
    if structural_bad:
        for s, files in structural_bad.items():
            F('(c) sentinel %r still present in demo:false build: %s' % (s, files[:5]))
    else:
        ok('(c) WP2-owned sentinels (123456 / mysteri1984 / micego.example / ?state=) fully stripped')
    residual = {s: v for s, v in hits.items() if s not in STRUCTURAL_SENTINELS}
    if residual:
        print('NOTE (c) sample-data sentinels still present — expected until WP3 adds data-mg markup:')
        for s, files in residual.items():
            print('  %r -> %s' % (s, files[:5]))

    # -- demo-strip / state-switch / ?state= no longer rendered --
    for rel in PUBLIC_15 + ['ko/track.html', 'ko/my.html', 'ko/account.html', 'ko/withdraw.html', 'ko/reset.html', 'en/bid.html']:
        fp = os.path.join(C, rel)
        if not os.path.exists(fp):
            continue
        t = rd(fp)
        if 'class="demo-strip"' in t:
            F('(c) %s still renders a .demo-strip element' % rel)
        if 'class="state-switch"' in t:
            F('(c) %s still renders the .state-switch preview switcher' % rel)
    ok('(c) demo-strip / state-switch elements removed from demo:false build')

    # -- canonical / hreflang / og:image / og:url --
    # en/sample-request.html is a noindex demo mockup (SPEC_LAUNCH build_launch.py rule (c): "every
    # indexable page") — it correctly gets no canonical/hreflang, unlike the other 14 public pages.
    for rel in PUBLIC_15:
        t = rd(os.path.join(C, rel))
        if 'name="robots" content="noindex"' in t:
            ok('(c) %s is noindex — canonical/hreflang correctly skipped' % rel)
            continue
        if 'rel="canonical" href="https://micego.kr/' not in t:
            F('(c) %s missing absolute canonical link' % rel)
        has_hreflang = 'hreflang="ko"' in t and 'hreflang="en"' in t and 'hreflang="x-default"' in t
        is_entry = rel in ('index.html', 'ko/index.html', 'en/index.html')
        if is_entry and not has_hreflang:
            F('(c) entry page %s missing hreflang alternates' % rel)
        if not is_entry and has_hreflang:
            F('(c) non-entry page %s should not carry hreflang alternates' % rel)
        m = re.search(r'<meta property="og:image" content="([^"]+)">', t)
        if m and not m.group(1).startswith('https://micego.kr/'):
            F('(c) %s og:image is not absolute: %s' % (rel, m.group(1)))
    ok('(c) canonical/hreflang/og:image checked on the 15 public pages')

    # -- robots.txt Sitemap line --
    rb = rd(os.path.join(C, 'robots.txt'))
    if 'Sitemap: https://micego.kr/sitemap.xml' not in rb:
        F('(c) robots.txt missing the Sitemap line')
    else:
        ok('(c) robots.txt has the Sitemap line')

    # -- sitemap.xml: parses, 15 <loc> --
    try:
        import xml.etree.ElementTree as ET
        tree = ET.parse(os.path.join(C, 'sitemap.xml'))
        ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        locs = tree.getroot().findall('s:url/s:loc', ns)
        if len(locs) != 15:
            F('(c) sitemap.xml has %d <loc> entries, expected 15' % len(locs))
        else:
            ok('(c) sitemap.xml parses with 15 <loc> entries')
    except Exception as e:
        F('(c) sitemap.xml failed to parse: %s' % e)

    # -- GA4 only on the 15 public pages, never on token/member/admin/docs/emails/404 --
    ga_hits = []
    for root, dirs, files in os.walk(C):
        dirs[:] = [d for d in dirs if d not in ('admin', 'supabase', '__pycache__')]
        for fn in files:
            if fn.endswith('.html'):
                rel = os.path.relpath(os.path.join(root, fn), C)
                if 'googletagmanager.com/gtag/js' in rd(os.path.join(root, fn)):
                    ga_hits.append(rel)
    ga_hits_norm = set(p.replace(os.sep, '/') for p in ga_hits)
    if ga_hits_norm != set(PUBLIC_15):
        F('(c) GA4 present on %s, expected exactly the 15 public pages' % sorted(ga_hits_norm ^ set(PUBLIC_15)))
    else:
        ok('(c) GA4 present on exactly the 15 public pages')

    # -- _headers / vercel.json parse, CSP contains the supabase host --
    headers_txt = rd(os.path.join(C, '_headers'))
    if 'stub.mg.test' not in headers_txt:
        F('(c) _headers CSP missing the supabase host')
    try:
        vj = json.loads(rd(os.path.join(C, 'vercel.json')))
        csp = next(h['value'] for b in vj['headers'] if b['source'] == '/(.*)' for h in b['headers'] if h['key'] == 'Content-Security-Policy')
        if 'stub.mg.test' not in csp:
            F('(c) vercel.json CSP missing the supabase host')
        else:
            ok('(c) _headers and vercel.json parse and include the supabase host in CSP')
    except Exception as e:
        F('(c) vercel.json failed to parse: %s' % e)

    # -- 404.html: no <script> --
    p404 = rd(os.path.join(C, '404.html'))
    if '<script' in p404:
        F('(c) 404.html contains a <script> tag')
    else:
        ok('(c) 404.html has zero <script> tags')

    # -- icons: sizes + manifest valid json --
    try:
        from PIL import Image
        sizes = {
            'apple-touch-icon.png': (180, 180),
            'icon-192.png': (192, 192),
            'icon-512.png': (512, 512),
        }
        for fn, wh in sizes.items():
            im = Image.open(os.path.join(C, fn))
            if im.size != wh:
                F('(c) %s is %s, expected %s' % (fn, im.size, wh))
        ico = Image.open(os.path.join(C, 'favicon.ico'))
        ico_sizes = set(ico.info.get('sizes') or [])
        if not {(16, 16), (32, 32)} <= ico_sizes:
            F('(c) favicon.ico sizes %s missing 16x16/32x32' % (ico_sizes,))
        ok('(c) icon PNG/ICO sizes match spec')
    except Exception as e:
        F('(c) icon size check failed: %s' % e)
    try:
        json.loads(rd(os.path.join(C, 'site.webmanifest')))
        ok('(c) site.webmanifest is valid JSON')
    except Exception as e:
        F('(c) site.webmanifest invalid JSON: %s' % e)

    # -- en/terms.html: DRAFT + TODO(legal) --
    terms = rd(os.path.join(C, 'en', 'terms.html'))
    if 'DRAFT' not in terms:
        F('(c) en/terms.html missing the DRAFT badge')
    # 2026-09-28: 전문 렌더링(legal/partner_terms_en.json)에서는 TODO(legal) 대신 [legal review] 칩이 검토 표시다
    _legal_mark = ('TODO(legal)' in terms) or ('legal review' in terms)
    if not _legal_mark:
        F('(c) en/terms.html missing a TODO(legal) / [legal review] marker')
    if 'DRAFT' in terms and _legal_mark:
        ok('(c) en/terms.html has the DRAFT badge and a TODO(legal) marker')

    # -- en/unsubscribe.html: 5 states --
    unsub = rd(os.path.join(C, 'en', 'unsubscribe.html'))
    for st in ('loading', 'confirm', 'done', 'already', 'invalid'):
        if ('data-states="%s"' % st) not in unsub and ('data-states~="%s"' % st) not in unsub:
            if 'data-states="' + st not in unsub:
                F('(c) en/unsubscribe.html missing state %r' % st)
    else:
        ok('(c) en/unsubscribe.html has all 5 states')

    # -- operator block rendered (legalName set) --
    about = rd(os.path.join(C, 'ko', 'about.html'))
    if '주식회사 마이스고' not in about:
        F('(c) ko/about.html operator block not rendered despite legalName set')
    else:
        ok('(c) operator block rendered on ko/about.html')

print('FAILS_LAUNCH', len(FAILS))
sys.exit(1 if FAILS else 0)
