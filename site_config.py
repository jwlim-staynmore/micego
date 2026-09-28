# site_config.py — WP2. Loads site.config.json (path from MG_SITE_CONFIG env, else ./site.config.json
# relative to the current working directory) and exposes the values every build*.py script needs.
#
# Exposes: CFG, SITE_BASE, MAIL, PMAIL, API, DEMO, PROD, plus a couple of small helpers used by
# build_launch.py (REL, SENTINELS). Every file write in the generator chain stays relative to the
# cwd so a build can run inside a copied directory (see verify_launch.py's 3-config test).
#
# NOTE: the domain-base-URL global is named SITE_BASE, not BASE — build.py already defines a
# global called BASE (the shared "Reset" CSS block text extracted from KO). Since build.py execs
# into these same globals() right after this file, a variable named BASE here would be silently
# clobbered by build.py's BASE the moment it runs, and build_launch.py (which execs afterwards,
# in the same chain) would read build.py's CSS text back out as if it were the site's base URL.
# This is exactly the bug that once corrupted canonical/hreflang/sitemap.xml output — don't
# reintroduce the name collision.
import json, os, sys

_DEFAULT = {
  "domain": "", "officialEmail": "", "privacyEmail": "",
  "operator": {
    "legalName": "", "brandName": "MICEGO (마이스고)", "representative": "", "bizRegNo": "", "ecommerceRegNo": "",
    "address": "", "phone": "", "privacyOfficer": {"name": "", "title": "", "email": ""}
  },
  "analytics": {"ga4": ""},
  "siteVerification": {"google": "", "naver": ""},
  "supabase": {"url": "", "anonKey": "", "functionsUrl": ""},
  "sms": {"vendor": "solapi", "vendorName": ""},
  "prod": False, "demo": True,
}

def _merge(base, over):
    out = dict(base)
    for k, v in (over or {}).items():
        if isinstance(v, dict) and isinstance(base.get(k), dict):
            out[k] = _merge(base[k], v)
        else:
            out[k] = v
    return out

def _fail(msg):
    sys.stderr.write('site_config: BUILD FAILED — %s\n' % msg)
    raise SystemExit(1)

def _warn(msg):
    sys.stderr.write('site_config: WARNING — %s\n' % msg)

_CFG_PATH = os.environ.get('MG_SITE_CONFIG') or os.path.join(os.getcwd(), 'site.config.json')
if os.path.exists(_CFG_PATH):
    with open(_CFG_PATH, encoding='utf-8') as _f:
        _raw = json.load(_f)
else:
    _raw = {}
CFG = _merge(_DEFAULT, _raw)
CFG_PATH = _CFG_PATH

_dom = (CFG.get('domain') or '').strip()
_email = (CFG.get('officialEmail') or '').strip()
_pemail = (CFG.get('privacyEmail') or '').strip()
_sb = CFG.get('supabase') or {}
_sb_url = (_sb.get('url') or '').strip()
_sb_key = (_sb.get('anonKey') or '').strip()
if _sb_url and not (_sb.get('functionsUrl') or '').strip():
    _sb['functionsUrl'] = _sb_url.rstrip('/') + '/functions/v1'
    CFG['supabase'] = _sb

SITE_BASE = ('https://' + _dom) if _dom else ''
MAIL = _email or 'mysteri1984@gmail.com'
PMAIL = _pemail or MAIL
API = bool(_sb_url)
DEMO = bool(CFG.get('demo', True))
PROD = bool(CFG.get('prod', False))

# ---------------- validation ----------------
if not DEMO and not (_sb_url and _sb_key):
    _fail("demo:false requires supabase.url and supabase.anonKey to be set.")

if PROD:
    problems = []
    if DEMO:
        problems.append('demo must be false')
    if not _dom:
        problems.append('domain is empty')
    if not _email:
        problems.append('officialEmail is empty')
    if not _pemail:
        problems.append('privacyEmail is empty')
    if _email.lower().endswith('@gmail.com'):
        problems.append('officialEmail must not be a @gmail.com address')
    if _pemail.lower().endswith('@gmail.com'):
        problems.append('privacyEmail must not be a @gmail.com address')
    if not (_sb_url and _sb_key):
        problems.append('supabase.url/anonKey must be set')
    if problems:
        _fail('prod:true but ' + '; '.join(problems))
    if not (CFG.get('operator') or {}).get('legalName'):
        _warn('prod:true but operator.legalName is empty — TODO(operator) placeholders will remain.')

# ---------------- helpers used by build_launch.py ----------------
def REL(path):
    """Relative asset-path prefix for a generated file path like 'ko/index.html' or 'index.html'."""
    depth = path.count('/')
    return '../' * depth

SENTINELS = ['MG-2610-', '김지은', '김하늘', '한빛투어', 'hanbit-tour', 'Ocean Pearl', '123456',
             'mysteri1984', 'micego.example', 'demo-share-', 'mg_demo_member', '?state=']

print('site_config: loaded %s (domain=%r prod=%r demo=%r api=%r)' % (_CFG_PATH, _dom, PROD, DEMO, API))
