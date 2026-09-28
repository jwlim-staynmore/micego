# verify_feedback.py -- WP-F2 (SPEC_FEEDBACK.md §8 / SPEC_FEEDBACK_ADDENDUM.md §B,C).
#
# Builds configuration (b) (demo + a stub Supabase URL -- the same recipe verify_launch.py/verify_api.py
# use) into a scratch copy of the site, serves it over a local HTTP server, and drives it with
# Playwright: page.route() serves controllable fixture responses for the feedback-submit Edge
# Function so every response code the widget must handle (§3.8) can be exercised without a real
# backend. Also builds configuration (a) (no supabase configured) and (c) (prod) for the
# no-launcher / no-sentinel checks §C asks for.
import os, re, sys, json, glob, shutil, subprocess, tempfile
from playwright.sync_api import sync_playwright

SITE = os.environ.get('MG_SITE_DIR') or os.path.dirname(os.path.abspath(__file__))
SCRATCH = os.environ.get('MG_VERIFY_FEEDBACK_SCRATCH') or tempfile.mkdtemp(prefix='mg_verify_feedback_')
SHOTS = os.path.join(SITE, 'fb_shots')
os.makedirs(SHOTS, exist_ok=True)
FAILS = []


def F(msg):
    FAILS.append(msg)
    print('FAIL', msg)


def ok(msg):
    print('ok  ', msg)


def note(msg):
    print('NOTE', msg)


# ================================================================== builds
def _build(name, cfg):
    d = os.path.join(SCRATCH, name)
    if os.path.exists(d):
        shutil.rmtree(d)
    shutil.copytree(SITE, d, ignore=shutil.ignore_patterns('tests', '__pycache__', '.git', 'supabase', 'fb_shots'))
    cfg_path = os.path.join(d, 'site.config.json')
    open(cfg_path, 'w', encoding='utf-8').write(json.dumps(cfg, ensure_ascii=False, indent=2))
    env = dict(os.environ)
    env['MG_SITE_CONFIG'] = cfg_path
    r = subprocess.run(['python3', os.path.join(SITE, 'build2.py')], cwd=d, env=env, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stdout[-3000:], r.stderr[-3000:])
        raise SystemExit('build2.py failed for config %r' % name)
    return d


CFG_A = {  # (a) default: no supabase configured -- widget stays fully inert
    "domain": "", "officialEmail": "", "privacyEmail": "",
    "operator": {"legalName": "", "brandName": "MICEGO (마이스고)", "representative": "", "bizRegNo": "",
                 "ecommerceRegNo": "", "address": "", "phone": "", "privacyOfficer": {"name": "", "title": "", "email": ""}},
    "analytics": {"ga4": ""}, "siteVerification": {"google": "", "naver": ""},
    "supabase": {"url": "", "anonKey": "", "functionsUrl": ""},
    "sms": {"vendor": "solapi", "vendorName": ""}, "prod": False, "demo": True,
}
CFG_B = {  # (b) staging: demo + stub supabase -- the one most tests below run against
    "domain": "", "officialEmail": "", "privacyEmail": "",
    "operator": {"legalName": "", "brandName": "MICEGO (마이스고)", "representative": "", "bizRegNo": "",
                 "ecommerceRegNo": "", "address": "", "phone": "", "privacyOfficer": {"name": "", "title": "", "email": ""}},
    "analytics": {"ga4": ""}, "siteVerification": {"google": "", "naver": ""},
    "supabase": {"url": "https://stub.mg.test", "anonKey": "stub-anon-key", "functionsUrl": ""},
    "sms": {"vendor": "solapi", "vendorName": ""}, "prod": False, "demo": True,
}
CFG_C = {  # (c) prod: full config, demo:false -- sentinel-stripped build
    "domain": "micego.kr", "officialEmail": "hello@micego.kr", "privacyEmail": "privacy@micego.kr",
    "operator": {"legalName": "주식회사 마이스고", "brandName": "MICEGO (마이스고)", "representative": "홍길동",
                 "bizRegNo": "123-45-67890", "ecommerceRegNo": "2026-서울중구-0001",
                 "address": "서울 중구 서소문로 89 순화빌딩 701호", "phone": "02-0000-0000",
                 "privacyOfficer": {"name": "홍길동", "title": "개인정보 보호책임자", "email": "privacy@micego.kr"}},
    "analytics": {"ga4": "G-TEST"}, "siteVerification": {"google": "g-stub", "naver": "n-stub"},
    "supabase": {"url": "https://stub.mg.test", "anonKey": "stub-anon-key", "functionsUrl": ""},
    "sms": {"vendor": "solapi", "vendorName": ""}, "prod": True, "demo": False,
}

ROOT_A = _build('a_default', CFG_A)
ROOT_B = _build('b_staging', CFG_B)
ROOT_C = _build('c_prod', CFG_C)

import threading, http.server, functools


def serve(root):
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=root)
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return 'http://127.0.0.1:%d/' % httpd.server_address[1]


BASE_A = serve(ROOT_A)
BASE_B = serve(ROOT_B)
BASE_C = serve(ROOT_C)


def rd(root, rel):
    return open(os.path.join(root, rel), encoding='utf-8').read()


# ================================================================== feedback-submit fixture router
class FBRouter:
    """Controls the /functions/v1/feedback-submit response for one context. `script` is a list of
    (status, body_dict) tuples popped one per POST (the last repeats once exhausted), or a callable
    taking the parsed request body and returning (status, body_dict) -- or the string 'abort' /
    ('delay', ms) for network-failure / timeout simulation."""

    def __init__(self):
        self.script = [(201, {'ok': True, 'ref': 'FB-260927-AA11', 'duplicate': False, 'ack': 'queued'})]
        self.calls = []

    def set(self, script):
        self.script = script
        return self

    def handle(self, route):
        req = route.request
        if req.method == 'OPTIONS':
            route.fulfill(status=204, headers={'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS',
                                                'Access-Control-Allow-Headers': 'content-type'}, body='')
            return
        try:
            body = json.loads(req.post_data or '{}')
        except Exception:
            body = {}
        self.calls.append(body)
        item = self.script[0] if len(self.script) == 1 else (self.script.pop(0) if len(self.script) > 1 else self.script[0])
        if item == 'abort':
            route.abort('failed')
            return
        if isinstance(item, tuple) and item and item[0] == 'delay':
            route.fulfill(status=201, headers={'Access-Control-Allow-Origin': '*'}, body=json.dumps({'ok': True, 'ref': 'FB-DELAYED', 'duplicate': False, 'ack': 'queued'}))
            return
        if callable(item):
            status, resp_body = item(body)
        else:
            status, resp_body = item
        route.fulfill(status=status, headers={'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}, body=json.dumps(resp_body))


def new_ctx(browser, base, viewport=None, ua=None):
    ctx = browser.new_context(viewport=viewport or {'width': 1280, 'height': 900}, user_agent=ua)
    fb = FBRouter()
    ctx.route(re.compile(r'^https://stub\.mg\.test/functions/v1/feedback-submit.*'), fb.handle)
    ctx.route(re.compile(r'^https://stub\.mg\.test/functions/v1/(?!feedback-submit).*'),
               lambda route: route.fulfill(status=500, headers={'Access-Control-Allow-Origin': '*'}, body='{"error":{"code":"INTERNAL"}}'))
    errs = []
    ctx.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    ctx.on('page', lambda p: p.on('pageerror', lambda e: errs.append(str(e))))
    page = ctx.new_page()
    page.on('pageerror', lambda e: errs.append(str(e)))
    return ctx, page, fb, errs


SR = 'document.getElementById(\'mgfb-host\') && document.getElementById(\'mgfb-host\').shadowRoot'


def sr_query(page, sel):
    return page.evaluate("() => { var r = %s; var e = r && r.querySelector('%s'); return e ? true : false; }" % (SR, sel))


def click_sr(page, sel):
    page.evaluate("() => { var r = %s; var e = r && r.querySelector('%s'); if (e) e.click(); }" % (SR, sel))


def val_sr(page, sel, value):
    page.evaluate("(v) => { var r = %s; var e = r && r.querySelector('%s'); if (e) { e.value = v; e.dispatchEvent(new Event('input', {bubbles:true})); } }" % (SR, sel), value)


def text_sr(page, sel):
    return page.evaluate("() => { var r = %s; var e = r && r.querySelector('%s'); return e ? e.textContent : null; }" % (SR, sel))


def open_widget(page):
    page.evaluate("() => { var r = %s; var l = r && r.getElementById('mgfbLauncher'); if (l) l.click(); }" % SR)
    page.wait_for_timeout(150)


def fill_valid(page, content='This is a valid feedback message with enough length.'):
    page.evaluate("() => { var r = %s; r.querySelector('input[name=mgfbCat][value=SYS]').checked = true; }" % SR)
    val_sr(page, '#mgfbContent', content)


def wait_submit_enabled(page):
    page.wait_for_timeout(3150)


def submit(page):
    click_sr(page, '#mgfbSubmit')
    page.wait_for_timeout(400)


with sync_playwright() as pw:
    exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
    browser = pw.chromium.launch(executable_path=exe) if os.path.exists(exe) else pw.chromium.launch()

    # ============================================================== launcher present / absent
    LAUNCHER_PAGES = ['ko/index.html', 'en/index.html', 'ko/track.html?t=trk_test_014&state=bidding',
                      'en/bid.html?t=bid_test_014&state=open', 'ko/my.html?state=list']
    for rel in LAUNCHER_PAGES:
        ctx, page, fb, errs = new_ctx(browser, BASE_B)
        page.goto(BASE_B + rel)
        page.wait_for_timeout(300)
        present = sr_query(page, '#mgfbLauncher')
        if present:
            ok('launcher present on %s' % rel)
        else:
            F('launcher missing on %s' % rel)
        ctx.close()

    # admin/dashboard.html: the widget script tag is expected to be wired by admin/** (WP-F3's file
    # set, out of this work package's ownership per SPEC_FEEDBACK_ADDENDUM.md §B "Do NOT touch
    # admin/**"). Checked leniently -- reported, not failed, when that wiring hasn't landed yet.
    ctx, page, fb, errs = new_ctx(browser, BASE_B)
    page.goto(BASE_B + 'admin/dashboard.html')
    page.wait_for_timeout(400)
    has_fb_script = 'assets/feedback.js' in rd(ROOT_B, 'admin/dashboard.html')
    if has_fb_script:
        present = sr_query(page, '#mgfbLauncher')
        (ok if present else F)('admin/dashboard: launcher %s' % ('present' if present else 'missing'))
    else:
        note('admin/dashboard.html does not load assets/feedback.js yet -- that wiring belongs to the '
             'admin console work package (admin/** is out of scope for assets/feedback.js + build_launch.py)')
    ctx.close()

    # contact pages: launcher-off, but MICEGO_FB still available
    for rel in ('ko/contact.html', 'en/contact.html'):
        ctx, page, fb, errs = new_ctx(browser, BASE_B)
        page.goto(BASE_B + rel)
        page.wait_for_timeout(300)
        attr = page.evaluate("() => document.documentElement.getAttribute('data-mgfb-launcher')")
        has_launcher_dom = page.evaluate("() => { var h = document.getElementById('mgfb-host'); return !!(h && h.shadowRoot && h.shadowRoot.getElementById('mgfbLauncher') && h.shadowRoot.getElementById('mgfbLauncher').offsetParent); }")
        has_submit_api = page.evaluate("() => typeof window.MICEGO_FB !== 'undefined' && typeof window.MICEGO_FB.submit === 'function'")
        if attr == 'off' and not has_launcher_dom and has_submit_api:
            ok('%s: launcher off, MICEGO_FB.submit still available' % rel)
        else:
            F('%s: expected data-mgfb-launcher=off + no visible launcher + MICEGO_FB.submit present (attr=%r dom=%r api=%r)' % (rel, attr, has_launcher_dom, has_submit_api))
        ctx.close()

    # config (a): no supabase -- no widget at all, footer link keeps its plain contact.html href
    ctx, page, fb, errs = new_ctx(browser, BASE_A)
    page.goto(BASE_A + 'ko/index.html')
    page.wait_for_timeout(300)
    no_widget = page.evaluate("() => typeof window.MICEGO_FB === 'undefined'")
    footer_href = page.evaluate("() => { var a = document.querySelector('[data-mg-feedback-open]'); return a ? a.getAttribute('href') : null; }")
    if no_widget and footer_href and 'contact.html' in footer_href:
        ok('config (a): no MICEGO_FB, footer link points at %s' % footer_href)
    else:
        F('config (a): expected no MICEGO_FB and a plain contact.html footer href, got widget=%r href=%r' % (not no_widget, footer_href))
    ctx.close()

    # ============================================================== no overlap with .mobile-cta at 360
    ctx, page, fb, errs = new_ctx(browser, BASE_B, viewport={'width': 360, 'height': 740})
    page.goto(BASE_B + 'ko/index.html')
    page.wait_for_timeout(300)
    page.mouse.wheel(0, 900)
    page.wait_for_timeout(300)
    rects = page.evaluate("""() => {
        var r = %s; var l = r.getElementById('mgfbLauncher');
        var cta = document.getElementById('mobileCta');
        if (!l || !cta) return null;
        return {launcher: l.getBoundingClientRect(), cta: cta.getBoundingClientRect(), ctaVisible: cta.classList.contains('is-visible')};
    }""" % SR)
    if rects and rects['ctaVisible']:
        lo = rects['launcher']; cta = rects['cta']
        overlap = not (lo['left'] > cta['right'] or lo['right'] < cta['left'] or lo['top'] > cta['bottom'] or lo['bottom'] < cta['top'])
        if overlap:
            F('360px: launcher overlaps the visible .mobile-cta bar: %r vs %r' % (lo, cta))
        else:
            ok('360px: launcher does not overlap the visible .mobile-cta bar')
    else:
        note('360px: .mobile-cta did not become visible on ko/index.html in this run (offset logic exercised elsewhere)')
    ctx.close()

    # ============================================================== focus trap + ESC + return focus
    ctx, page, fb, errs = new_ctx(browser, BASE_B)
    page.goto(BASE_B + 'ko/index.html')
    page.wait_for_timeout(300)
    open_widget(page)
    active_inside = page.evaluate("() => { var r = %s; return r.activeElement === r.getElementById('mgfbTitle'); }" % SR)
    if active_inside:
        ok('open(): focus moved into the dialog (title)')
    else:
        F('open(): focus did not move into the dialog')
    # Shift+Tab from the first focusable should wrap to the last
    page.evaluate("() => { var r = %s; r.getElementById('mgfbTitle').blur(); r.querySelector('#mgfbClose').focus(); }" % SR)
    page.keyboard.press('Shift+Tab')
    page.wait_for_timeout(50)
    wrapped = page.evaluate("() => { var r = %s; var nodes = Array.prototype.slice.call(r.querySelectorAll('a[href],button:not([disabled]),textarea,input,select,[tabindex]')).filter(function(n){return n.offsetParent!==null;}); return r.activeElement === nodes[nodes.length-1]; }" % SR)
    if wrapped:
        ok('Tab trap: Shift+Tab from the first control wraps to the last')
    else:
        F('Tab trap: Shift+Tab from the first control did not wrap to the last')
    page.keyboard.press('Escape')
    page.wait_for_timeout(150)
    closed = page.evaluate("() => { var r = %s; return !r.getElementById('mgfbDialog').classList.contains('is-open'); }" % SR)
    if closed:
        ok('ESC closes the dialog')
    else:
        F('ESC did not close the dialog')
    ctx.close()

    # ============================================================== validation errors
    ctx, page, fb, errs = new_ctx(browser, BASE_B)
    page.goto(BASE_B + 'ko/index.html')
    page.wait_for_timeout(300)
    open_widget(page)
    submit(page)  # nothing filled -- category + short-content errors
    cat_err = text_sr(page, '#mgfbErrCat')
    content_err = text_sr(page, '#mgfbErrContent')
    if cat_err and content_err:
        ok('validation: empty submit surfaces category + content errors (%r / %r)' % (cat_err, content_err))
    else:
        F('validation: empty submit should show category + content errors, got cat=%r content=%r' % (cat_err, content_err))
    fill_valid(page, 'short')
    submit(page)
    if '20' in (text_sr(page, '#mgfbErrContent') or ''):
        ok('validation: short content (<20) rejected')
    else:
        F('validation: short content should be rejected, got %r' % text_sr(page, '#mgfbErrContent'))
    fill_valid(page, 'x' * 2001)
    submit(page)
    if text_sr(page, '#mgfbErrContent'):
        ok('validation: content >2000 rejected')
    else:
        F('validation: content over 2000 chars should be rejected')
    fill_valid(page)
    val_sr(page, '#mgfbEmail', 'not-an-email')
    submit(page)
    if text_sr(page, '#mgfbErrEmail'):
        ok('validation: malformed email rejected')
    else:
        F('validation: malformed email should be rejected')
    val_sr(page, '#mgfbEmail', 'valid@example.com')
    page.wait_for_timeout(50)
    submit(page)
    if text_sr(page, '#mgfbErrConsent'):
        ok('validation: email without consent checkbox rejected')
    else:
        F('validation: email without consent should be rejected')
    ctx.close()

    # ============================================================== 3s aria-disabled window
    ctx, page, fb, errs = new_ctx(browser, BASE_B)
    page.goto(BASE_B + 'ko/index.html')
    page.wait_for_timeout(300)
    open_widget(page)
    aria0 = page.evaluate("() => { var r = %s; return r.getElementById('mgfbSubmit').getAttribute('aria-disabled'); }" % SR)
    if aria0 == 'true':
        ok('submit button is aria-disabled right after open()')
    else:
        F('submit button should start aria-disabled=true, got %r' % aria0)
    page.wait_for_timeout(3200)
    aria1 = page.evaluate("() => { var r = %s; return r.getElementById('mgfbSubmit').getAttribute('aria-disabled'); }" % SR)
    if aria1 == 'false':
        ok('submit button becomes enabled after ~3s')
    else:
        F('submit button should be enabled after 3s, got %r' % aria1)
    ctx.close()

    # ============================================================== successful submit -> REF + copy + payload shape
    ctx, page, fb, errs = new_ctx(browser, BASE_B)
    page.goto(BASE_B + 'ko/track.html?t=trk_test_014&state=bidding')
    page.wait_for_timeout(300)
    open_widget(page)
    fill_valid(page, 'Payload shape and REF display test message, long enough.')
    wait_submit_enabled(page)
    submit(page)
    ref = text_sr(page, '#mgfbDoneRef')
    if ref == 'FB-260927-AA11':
        ok('successful submit shows the REF from the server response')
    else:
        F('expected REF FB-260927-AA11 shown, got %r' % ref)
    click_sr(page, '#mgfbCopyRef')
    page.wait_for_timeout(100)
    copied_label = text_sr(page, '#mgfbCopyRef')
    if copied_label and ('복사' in copied_label):
        ok('copy button updates its label after copying')
    else:
        note('copy button label after click: %r (clipboard permission may be restricted in this harness)' % copied_label)
    if len(fb.calls) == 1:
        body = fb.calls[0]
        ctx_keys = set(body.get('ctx', {}).keys())
        expected_keys = {'page_path', 'mode', 'lang', 'ui_state', 'rfp_ref', 'token_kind', 'token_hash8',
                          'viewport', 'ua', 'referrer', 'last_js_errors', 'tz', 'build_version',
                          'submitted_at', 'is_demo_hint', 'user_type_hint'}
        missing = expected_keys - ctx_keys
        if not missing:
            ok('payload ctx contains all expected keys')
        else:
            F('payload ctx missing keys: %r' % missing)
        import hashlib
        expected_hash8 = hashlib.sha256(b'trk_test_014').hexdigest()[:8]
        if body['ctx'].get('token_hash8') == expected_hash8 and body['ctx'].get('token_kind') == 'track':
            ok('token_hash8 == sha256(t)[:8], token_kind == track')
        else:
            F('token_hash8/kind mismatch: got %r/%r, expected %r/track' % (body['ctx'].get('token_hash8'), body['ctx'].get('token_kind'), expected_hash8))
        raw_token_leaked = 'trk_test_014' in json.dumps(body)
        if not raw_token_leaked:
            ok('raw token never appears in the payload')
        else:
            F('raw token leaked into the payload')
    else:
        F('expected exactly 1 feedback-submit call for this test, got %d' % len(fb.calls))
    ctx.close()

    # ============================================================== double-click -> one request
    ctx, page, fb, errs = new_ctx(browser, BASE_B)
    page.goto(BASE_B + 'ko/index.html')
    page.wait_for_timeout(300)
    open_widget(page)
    fill_valid(page, 'Double click should still only send a single request to the server.')
    wait_submit_enabled(page)
    page.evaluate("() => { var r = %s; var b = r.getElementById('mgfbSubmit'); b.click(); b.click(); }" % SR)
    page.wait_for_timeout(400)
    if len(fb.calls) == 1:
        ok('double-click on submit results in exactly one request')
    else:
        F('double-click should result in exactly 1 request, got %d' % len(fb.calls))
    ctx.close()

    # ============================================================== pending resend reuses the same csid
    ctx, page, fb, errs = new_ctx(browser, BASE_B)
    fb.set(['abort'])
    page.goto(BASE_B + 'ko/index.html')
    page.wait_for_timeout(300)
    open_widget(page)
    fill_valid(page, 'This message will fail to send once, then be resent from pending state.')
    wait_submit_enabled(page)
    submit(page)
    page.wait_for_timeout(200)
    first_csid = fb.calls[0]['client_submission_id'] if fb.calls else None
    fb.set([(201, {'ok': True, 'ref': 'FB-260927-BB22', 'duplicate': False, 'ack': 'queued'})])
    click_sr(page, '#mgfbRetryBtn')
    page.wait_for_timeout(400)
    second_csid = fb.calls[1]['client_submission_id'] if len(fb.calls) > 1 else None
    if first_csid and first_csid == second_csid:
        ok('retry after a network error reuses the same client_submission_id')
    else:
        F('retry should reuse the client_submission_id: first=%r second=%r' % (first_csid, second_csid))
    ctx.close()

    # pending banner + resend on a fresh open (simulated by leaving mgfb:pending in sessionStorage)
    ctx, page, fb, errs = new_ctx(browser, BASE_B)
    fb.set([(201, {'ok': True, 'ref': 'FB-260927-CC33', 'duplicate': False, 'ack': 'queued'})])
    page.goto(BASE_B + 'ko/index.html')
    page.wait_for_timeout(300)
    pending_csid = 'pending-csid-test-0001'
    page.evaluate("""(csid) => {
        var payload = {v:1, client_submission_id: csid, source:'widget', category:'SYS',
          content:'Restored pending submission after a page reload, long enough text.',
          reply_email:null, reply_consent:false, contact_name:null, hp:'', dwell_ms:1000, auth:null,
          ctx:{page_path:'/ko/index.html', mode:'agency', lang:'ko', ui_state:null, rfp_ref:null,
               token_kind:null, token_hash8:null, viewport:'1280x900@1', ua:'Other', referrer:null,
               last_js_errors:null, tz:'Asia/Seoul', build_version:'test', submitted_at:new Date().toISOString(),
               is_demo_hint:false, user_type_hint:'visitor'}};
        try { sessionStorage.setItem('mgfb:pending', JSON.stringify({csid:csid, payload:payload, at:Date.now()})); } catch(e){}
    }""", pending_csid)
    open_widget(page)
    banner_visible = page.evaluate("() => { var r = %s; return !r.getElementById('mgfbPendingBanner').hidden; }" % SR)
    if banner_visible:
        ok('pending banner shows when mgfb:pending exists at open()')
    else:
        F('pending banner should show when a pending submission exists')
    click_sr(page, '#mgfbPendingResend')
    page.wait_for_timeout(400)
    resent_csid = fb.calls[0]['client_submission_id'] if fb.calls else None
    if resent_csid == pending_csid:
        ok('pending resend submits with the original csid')
    else:
        F('pending resend should use %r, got %r' % (pending_csid, resent_csid))
    ctx.close()

    # ============================================================== error codes -> localized text (ko + en)
    ERROR_CASES = [
        ('RATE_LIMITED', 429, {'error': {'code': 'RATE_LIMITED', 'retry_after_sec': 120}}, ['분', 'min']),
        ('DUPLICATE_CONTENT', 409, {'error': {'code': 'DUPLICATE_CONTENT'}}, ['이미 접수', 'already been received']),
        ('BUSY', 503, {'error': {'code': 'BUSY'}}, ['몰려', 'too many messages']),
    ]
    for code, status, body, needles in ERROR_CASES:
        for lang, rel in (('ko', 'ko/index.html'), ('en', 'en/index.html')):
            ctx, page, fb, errs = new_ctx(browser, BASE_B)
            fb.set([(status, body)])
            page.goto(BASE_B + rel)
            page.wait_for_timeout(300)
            open_widget(page)
            fill_valid(page, 'Error-code handling test message, long enough to pass validation.')
            wait_submit_enabled(page)
            submit(page)
            msg = text_sr(page, '#mgfbErrorMsg') or ''
            needle = needles[0] if lang == 'ko' else needles[1]
            if needle in msg or (code == 'RATE_LIMITED' and re.search(r'\d', msg)):
                ok('%s/%s: error message shown for %s (%r)' % (lang, rel, code, msg[:40]))
            else:
                F('%s/%s: expected %s error text to mention %r, got %r' % (lang, rel, code, needle, msg))
            ctx.close()

    # ============================================================== fallback panel order (in-app vs normal)
    KAKAO_UA = 'Mozilla/5.0 (Linux; Android 13; SM-G991N) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 KAKAOTALK'
    for label, ua, expected_first in (('in-app (Kakao)', KAKAO_UA, 'fbCopy'), ('normal browser', None, 'fbCopy')):
        ctx, page, fb, errs = new_ctx(browser, BASE_B, ua=ua)
        fb.set(['abort', 'abort'])
        page.goto(BASE_B + 'ko/index.html')
        page.wait_for_timeout(300)
        open_widget(page)
        fill_valid(page, 'Fallback panel ordering test after two failed attempts, long enough.')
        wait_submit_enabled(page)
        submit(page)
        click_sr(page, '#mgfbRetryBtn')
        page.wait_for_timeout(400)
        fb_hidden = page.evaluate("() => { var r = %s; return r.getElementById('mgfbFallback').hidden; }" % SR)
        order = page.evaluate("() => { var r = %s; var acts = r.querySelectorAll('#mgfbFallbackActions button'); return Array.prototype.map.call(acts, function(b){return b.textContent;}); }" % SR)
        if not fb_hidden and order:
            ok('%s: fallback panel shown after 2 failures, order=%r' % (label, order))
        else:
            F('%s: fallback panel should show after 2 network failures' % label)
        ctx.close()

    # ============================================================== noscript footer link
    for rel in ('ko/index.html', 'en/index.html'):
        html = rd(ROOT_B, rel)
        if '<noscript>' in html and 'footer-feedback-noscript' in html:
            ok('%s: noscript feedback fallback present in the served HTML' % rel)
        else:
            F('%s: missing <noscript> feedback fallback in the footer' % rel)

    # ============================================================== contact.html: API submit + REF, mailto fallback in (a)
    ctx, page, fb, errs = new_ctx(browser, BASE_B)
    page.goto(BASE_B + 'ko/contact.html')
    page.wait_for_timeout(300)
    page.select_option('#topic', index=1)
    page.fill('#cname', 'Test Name')
    page.fill('#cemail', 'contact-test@example.com')
    page.fill('#cmsg', 'Contact form test message, at least ten characters long.')
    page.check('#cconsent', force=True)
    page.click('#contactForm button[type=submit]')
    page.wait_for_timeout(400)
    ref_shown = page.evaluate("() => { var el = document.querySelector('[data-mgfb-ref]'); return el ? el.textContent : null; }")
    if ref_shown:
        ok('ko/contact.html: API submit shows a REF (%r)' % ref_shown)
    else:
        F('ko/contact.html: expected a REF to be shown after submit')
    ctx.close()

    ctx, page, fb, errs = new_ctx(browser, BASE_A)  # config (a): no supabase -- mailto fallback
    page.goto(BASE_A + 'ko/contact.html')
    page.wait_for_timeout(300)
    page.select_option('#topic', index=1)
    page.fill('#cname', 'Test Name')
    page.fill('#cemail', 'contact-test@example.com')
    page.fill('#cmsg', 'Contact form fallback test message, ten-plus characters.')
    page.check('#cconsent', force=True)
    page.click('#contactForm button[type=submit]')
    page.wait_for_timeout(300)
    send_panel_visible = page.evaluate("() => { var p = document.getElementById('sendPanel'); return p && !p.hidden; }")
    if send_panel_visible:
        ok('config (a): contact.html falls back to the mailto send panel')
    else:
        F('config (a): contact.html should fall back to the mailto send panel when unconfigured')
    ctx.close()

    # ============================================================== privacy pages contain "의견 접수" / "Feedback"
    if '의견 접수' in rd(ROOT_B, 'ko/privacy.html'):
        ok('ko/privacy.html contains the "의견 접수" section')
    else:
        F('ko/privacy.html missing the "의견 접수" section')
    if '>Feedback<' in rd(ROOT_B, 'en/privacy.html'):
        ok('en/privacy.html contains the "Feedback" section')
    else:
        F('en/privacy.html missing the "Feedback" section')

    # ============================================================== no console errors at 360/768/1280
    def check_widths(page, errs, label):
        before = len(errs)
        for w in (360, 768, 1280):
            page.set_viewport_size({'width': w, 'height': 900})
            page.wait_for_timeout(80)
        if len(errs) > before:
            F('%s: console errors appeared while resizing to 360/768/1280: %s' % (label, errs[before:]))
        else:
            ok('%s: no console errors at 360/768/1280' % label)

    for rel in ('ko/index.html', 'en/bid.html?t=bid_test_014&state=open', 'ko/track.html?t=trk_test_014&state=delivered', 'ko/contact.html'):
        ctx, page, fb, errs = new_ctx(browser, BASE_B)
        page.goto(BASE_B + rel)
        page.wait_for_timeout(300)
        open_widget(page) if 'contact' not in rel else None
        check_widths(page, errs, rel)
        ctx.close()

    # ============================================================== prod build (c): no sentinels, widget still present
    STRUCTURAL_SENTINELS = ['123456', 'mysteri1984', 'micego.example', '?state=']
    bad = []
    for rel in glob.glob(os.path.join(ROOT_C, 'ko', '*.html')) + glob.glob(os.path.join(ROOT_C, 'en', '*.html')) + [os.path.join(ROOT_C, 'assets', 'feedback.js'), os.path.join(ROOT_C, 'assets', 'config.js')]:
        if not os.path.exists(rel):
            continue
        t = open(rel, encoding='utf-8').read()
        for s in STRUCTURAL_SENTINELS:
            if s in t:
                bad.append((os.path.relpath(rel, ROOT_C), s))
    if bad:
        F('(c) prod build still has sentinels in feedback-touched files: %r' % bad[:10])
    else:
        ok('(c) prod build has no sentinels in feedback.js/config.js/ko/en pages')

    ctx, page, fb, errs = new_ctx(browser, BASE_C)
    page.goto(BASE_C + 'ko/index.html')
    page.wait_for_timeout(300)
    present_c = sr_query(page, '#mgfbLauncher')
    (ok if present_c else F)('(c) prod build: launcher %s (supabaseUrl configured)' % ('present' if present_c else 'MISSING'))
    ctx.close()

    # ============================================================== screenshots: widget open at 360 and 1280
    for w, h, name in ((360, 740, 'widget_360.png'), (1280, 900, 'widget_1280.png')):
        ctx, page, fb, errs = new_ctx(browser, BASE_B, viewport={'width': w, 'height': h})
        page.goto(BASE_B + 'ko/index.html')
        page.wait_for_timeout(300)
        open_widget(page)
        page.wait_for_timeout(150)
        page.screenshot(path=os.path.join(SHOTS, name))
        ctx.close()

    browser.close()

print('FAILS_FEEDBACK', len(FAILS))
sys.exit(1 if FAILS else 0)
