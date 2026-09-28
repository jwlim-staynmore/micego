# legal_render.py — renders legal/*.json (이용약관·Partner Terms·개인정보처리방침·Privacy Notice) into the
# page body HTML used by build_legal.py. Pure functions: no file writes, no globals from the build chain.
#
# JSON shape (legal/REVIEW_NOTES.md):
#   terms:   {title, effective, preamble, chapters:[{title, articles:[{no, title, paras:[str | {list:[str]}]}]}], supplement:[str]}
#   privacy: {title, effective, sections:[{no, title, paras:[str | {list:[str]} | {table:{head:[..], rows:[[..]]}}]}]}
# Placeholders `{{NAME}}` are filled from the site config (fill_placeholders). `[법무 검토]` / `[legal review]`
# tags become visible <mark class="t-review"> chips until legal.reviewed is true, at which point they are removed.
import html as _html
import re

PLACEHOLDER_RE = re.compile(r'\{\{([A-Z_]+)\}\}')
REVIEW_RE = re.compile(r'\s*\[(?:법무 검토|legal review)\]')
LEGAL_PAGES = ('ko/terms.html', 'ko/privacy.html', 'en/terms.html', 'en/privacy.html')


def placeholder_values(cfg, mail, pmail, lang):
    """Map every {{NAME}} the JSON files use to display text. Empty config values fall back to a
    visible '확인 후 기재' note so a draft page never shows a blank, and the caller can detect the
    fallback via the TODO(operator) comment it appends."""
    op = cfg.get('operator') or {}
    po = op.get('privacyOfficer') or {}
    legal = cfg.get('legal') or {}
    ko = lang == 'ko'

    def val(v, what_ko, what_en):
        v = (v or '').strip()
        if v:
            return _html.escape(v)
        return ('<span class="t-fill">(%s — 확인 후 기재)</span><!-- TODO(operator): %s -->' % (what_ko, what_ko)) if ko \
            else ('<span class="t-fill">(%s — to be confirmed)</span><!-- TODO(operator): %s -->' % (what_en, what_en))

    eff = (legal.get('effectiveDate') or '').strip()
    officer = ' '.join(x for x in [(po.get('name') or '').strip(), (po.get('title') or '').strip()] if x)
    if officer and (po.get('email') or '').strip():
        officer += ' (%s)' % po['email'].strip()
    return {
        'OPERATOR_LEGAL_NAME': val(op.get('legalName'), '상호(법인명)', 'legal entity name'),
        'OPERATOR_REPRESENTATIVE': val(op.get('representative'), '대표자', 'representative'),
        'OPERATOR_BIZ_REG_NO': val(op.get('bizRegNo'), '사업자등록번호', 'business registration number'),
        'OPERATOR_ADDRESS': val(op.get('address'), '주소', 'address'),
        'OPERATOR_PHONE': val(op.get('phone'), '전화번호', 'phone number'),
        'OPERATOR_PRIVACY_OFFICER': val(officer, '개인정보 보호책임자', 'privacy officer'),
        'OFFICIAL_EMAIL': '<a class="alink" href="mailto:%s">%s</a>' % (_html.escape(mail), _html.escape(mail)),
        'PRIVACY_EMAIL': '<a class="alink" href="mailto:%s">%s</a>' % (_html.escape(pmail), _html.escape(pmail)),
        'SMS_VENDOR_NAME': val((cfg.get('sms') or {}).get('vendorName'), '문자 발송 대행사', 'SMS vendor'),
        'EFFECTIVE_DATE': _html.escape(eff) if eff else ('<span class="t-fill">○○○○년 ○월 ○일(시행일 확정 후 기재)</span>' if ko else '<span class="t-fill">[date to be confirmed]</span>'),
    }


def fill_placeholders(text, values):
    def sub(m):
        k = m.group(1)
        if k not in values:
            raise KeyError('legal_render: unknown placeholder {{%s}}' % k)
        return values[k]
    return PLACEHOLDER_RE.sub(sub, text)


def _review(text, reviewed, lang):
    if reviewed:
        return REVIEW_RE.sub('', text)
    chip = '<mark class="t-review" title="%s">%s</mark>' % (
        ('법무 검토가 필요한 부분입니다' if lang == 'ko' else 'Pending legal review'),
        ('법무 검토' if lang == 'ko' else 'legal review'))
    return REVIEW_RE.sub(' ' + chip, text)


def _inline(text, values, reviewed, lang):
    # escape first, then substitute placeholders (whose values are already HTML) and review chips
    t = _html.escape(text, quote=False)
    t = t.replace('&quot;', '"')
    t = fill_placeholders(t, values)
    return _review(t, reviewed, lang)


def _para(p, values, reviewed, lang):
    if isinstance(p, str):
        return '<p>%s</p>' % _inline(p, values, reviewed, lang)
    if 'list' in p:
        return '<ul>' + ''.join('<li>%s</li>' % _inline(i, values, reviewed, lang) for i in p['list']) + '</ul>'
    if 'table' in p:
        tb = p['table']
        heads = tb.get('head', [])
        head = ''.join('<th scope="col">%s</th>' % _inline(h, values, reviewed, lang) for h in heads)
        # data-h carries the column label so the phone layout (<640px, CSS in build_legal.py) can stack
        # each row as label/value pairs instead of squeezing five columns into 360px.
        rows = ''.join('<tr>' + ''.join('<td data-h="%s">%s</td>' % (_html.escape(heads[i] if i < len(heads) else '', quote=True), _inline(c, values, reviewed, lang))
                                        for i, c in enumerate(r)) + '</tr>' for r in tb.get('rows', []))
        return '<div class="t-tablewrap"><table class="t-table"><thead><tr>%s</tr></thead><tbody>%s</tbody></table></div>' % (head, rows)
    raise ValueError('legal_render: unknown paragraph object %r' % list(p.keys()))


def _head(doc, values, lang, kind, draft_note):
    ko = lang == 'ko'
    eff = values['EFFECTIVE_DATE']
    eff_line = ('시행일 %s' % eff) if ko else ('Effective %s' % eff)
    badge = ('<p class="t-draft">%s</p>' % draft_note) if draft_note else ''
    return ('<header class="t-head"><h1>%s</h1>%s<p class="t-lead">%s</p><p class="t-eff">%s</p></header>'
            % (_html.escape(doc['title']), badge, _inline(doc.get('preamble', ''), values, True, lang) if doc.get('preamble') else '', eff_line))


def render_terms(doc, values, lang, reviewed, draft_note=''):
    ko = lang == 'ko'
    toc, body = [], []
    for ch in doc['chapters']:
        ch_title = _html.escape(ch['title'])
        toc.append('<li class="t-toc-ch">%s</li>' % ch_title)
        body.append('<h2 class="t-ch">%s</h2>' % ch_title)
        for a in ch['articles']:
            aid = 'art%d' % a['no']
            no = ('제%d조' % a['no']) if ko else ('Article %d' % a['no'])
            title = _inline(a['title'], values, True, lang)
            toc.append('<li><a href="#%s"><span>%s</span>%s</a></li>' % (aid, no, title))
            body.append('<section class="t-art" id="%s" aria-labelledby="%s-h"><span class="t-no">%s</span><h3 id="%s-h">%s</h3>%s</section>'
                        % (aid, aid, no, aid, title, ''.join(_para(p, values, reviewed, lang) for p in a['paras'])))
    if doc.get('supplement'):
        body.append('<section class="t-art" id="supplement"><h3>%s</h3>%s</section>' % (
            '부칙' if ko else 'Supplementary provisions', ''.join(_para(p, values, reviewed, lang) for p in doc['supplement'])))
    nav = '<nav class="t-toc" aria-label="%s"><b>%s</b><ol>%s</ol></nav>' % (
        ('조항 바로가기' if ko else 'Jump to an article'), ('조항 바로가기' if ko else 'Contents'), ''.join(toc))
    return _head(doc, values, lang, 'terms', draft_note) + nav + ''.join(body)


def render_privacy(doc, values, lang, reviewed, draft_note=''):
    ko = lang == 'ko'
    toc, body = [], []
    for s in doc['sections']:
        sid = 's%d' % s['no']
        no = ('제%d조' % s['no']) if ko else ('%d.' % s['no'])
        title = _inline(s['title'], values, True, lang)
        toc.append('<li><a href="#%s"><span>%s</span>%s</a></li>' % (sid, no, title))
        body.append('<section class="t-art" id="%s" aria-labelledby="%s-h"><span class="t-no">%s</span><h2 id="%s-h">%s</h2>%s</section>'
                    % (sid, sid, no, sid, title, ''.join(_para(p, values, reviewed, lang) for p in s['paras'])))
    nav = '<nav class="t-toc" aria-label="%s"><b>%s</b><ol>%s</ol></nav>' % (
        ('항목 바로가기' if ko else 'Jump to a section'), ('항목 바로가기' if ko else 'Contents'), ''.join(toc))
    return _head(doc, values, lang, 'privacy', draft_note) + nav + ''.join(body)


# The cookie sentence in the privacy JSON describes the no-analytics default. When analytics.ga4 is set,
# build_legal.py swaps it for the GA4 disclosure below (both languages) so the policy matches the site.
COOKIE_DEFAULT = {
    'ko': '① 회사는 쿠키를 사용하지 않습니다. 방문 통계 도구 등 쿠키를 쓰는 기능을 도입하면 도입 전에 이 방침을 고쳐 목적과 보유 기간을 알립니다.',
    'en': 'We do not use cookies. If we introduce analytics or other cookies, we will update this notice first.',
}
COOKIE_GA4 = {
    'ko': '① 회사는 방문 통계를 위해 Google Analytics(GA4) 쿠키를 사용합니다. 쿠키로 수집한 방문 기록(방문한 화면, 유입 경로, 기기·브라우저 종류, 가려진 IP 주소)은 Google LLC(미국)에 전송되어 처리됩니다. 보유 기간은 최대 14개월이며, 브라우저 설정에서 쿠키를 거부하거나 지울 수 있습니다. [법무 검토]',
    'en': 'We use Google Analytics (GA4) cookies to measure traffic. Visit data collected by these cookies (pages viewed, referrer, device and browser type, truncated IP address) is sent to and processed by Google LLC (United States). It is kept for up to 14 months, and you can block or delete cookies in your browser settings. [legal review]',
}


def swap_cookie_sentence(doc, lang):
    """Return a copy of the privacy doc with the default cookie sentence replaced by the GA4 one."""
    import copy
    d = copy.deepcopy(doc)
    hit = 0
    for s in d['sections']:
        for i, p in enumerate(s['paras']):
            if isinstance(p, str) and p.strip() == COOKIE_DEFAULT[lang]:
                s['paras'][i] = COOKIE_GA4[lang]
                hit += 1
    if hit != 1:
        raise ValueError('legal_render: cookie sentence for %s not found exactly once (%d)' % (lang, hit))
    return d
