# -*- coding: utf-8 -*-
"""build_commission.py — en/commission.html (호텔 커미션 요율 동의 페이지) 생성.  - 클로드
build_confirm.py 와 같은 방식: en/unsubscribe.html 을 템플릿으로 삼아 head/header/footer 를 재사용하고 본문·스크립트만 바꾼다.
호텔 커미션 설계서 v1 §2 기준:
  · 링크를 GET 으로 열어도 토큰이 소비되지 않는다(메일 보안 스캐너 대비). 동의는 버튼(POST partner_commission_accept, action=accept)으로만.
  · 상태: loading → review(동의 대기) / done(동의 완료) / used(이미 처리) / expired / invalid
  · 데모(백엔드 없음)에서는 ?state=review|done|used|expired|invalid 로 화면을 미리 볼 수 있다.
  · 이 페이지에는 호텔 본인의 요율만 나온다. 오거나이저 화면(ko/*)에는 요율이 없다.
실행: python3 build_commission.py   (build_launch.py 가 en/unsubscribe.html 을 만든 직후 자동 실행한다)
"""
import io, os, re

ROOT = os.environ.get('MG_SITE_DIR') or os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'en', 'unsubscribe.html')
DST = os.path.join(ROOT, 'en', 'commission.html')

tpl = io.open(SRC, encoding='utf-8').read()

# ---- head: title/description/state bootstrap
assert '<title>Unsubscribe | MICEGO Partner</title>' in tpl
tpl = tpl.replace('<title>Unsubscribe | MICEGO Partner</title>', '<title>Accept commission terms | MICEGO Partner</title>')
tpl = tpl.replace('<meta name="description" content="Stop MICEGO invitation emails for your property.">',
                  '<meta name="description" content="Review and accept the commission terms for your property to start receiving MICEGO invitations.">')
tpl, n = re.subn(r'<script>\(function\(\)\{var h=document\.documentElement,q=new URLSearchParams\(location\.search\).*?\}\)\(\);</script>',
  '<script>(function(){var h=document.documentElement,q=new URLSearchParams(location.search),t=q.get(\'t\')||\'\',s=q.get(\'state\')||\'review\';var C=window.MG_CONFIG||{},api=!!(C.supabase&&C.supabase.url),preview=(C.demo!==false)&&q.has(\'state\');if(!/^[A-Za-z0-9_-]{16,64}$/.test(t)){s=\'invalid\';}else if(api&&!preview){s=\'loading\';}else if(["review","done","used","expired","invalid","loading"].indexOf(s)<0){s=\'invalid\';}h.setAttribute(\'data-state\',s);h.setAttribute(\'data-mode\',(api&&!preview)?\'api\':\'demo\');})();</script>',
  tpl, count=1, flags=re.S)
assert n == 1, 'state bootstrap not found'

def spanel(cls, icon, title, body):
    return ('<div class="status-panel' + cls + '"><div class="status-icon" aria-hidden="true">' + icon + '</div><div class="status-body"><h2>' + title + '</h2>' + body + '</div></div>')

BASIS_TEXT = 'Total contract value for guest rooms and for banquet, meeting and food &amp; beverage services, excluding taxes and service charges'

BODY = (
  '<div class="app-wrap narrow">'
  '<div data-states="loading" class="mg-loading" role="status" aria-live="polite">Loading…</div>'
  '<noscript><div class="panel"><h1>JavaScript is needed on this page</h1>'
  '<p class="app-lead">This page shows your commission terms and records your acceptance, which requires JavaScript. Please turn it on and reload the page. '
  'Nothing has been accepted yet. If you cannot use JavaScript, reply to the email that contained this link and we will confirm the terms with you another way.</p>'
  '<div class="app-actions"><a class="btn btn-ghost" href="contact.html">Contact MICEGO</a></div></div></noscript>'
  '<div data-states="invalid"><div class="panel">' + spanel(' is-muted', '!', 'This link is not valid',
    '<p>Part of the address is missing, or this link is no longer active — for example because a newer link was sent to you. Please use the most recent email, or contact MICEGO.</p>'
    '<div class="app-actions"><a class="btn btn-ghost" href="contact.html">Contact MICEGO</a></div>') + '</div></div>'
  '<div data-states="expired"><div class="panel">' + spanel(' is-muted', '–', 'This link has expired',
    '<p>Commission terms links are single-use and valid for a limited time. Nothing was accepted. Reply to the original email, or contact MICEGO, and we will send you a new link.</p>'
    '<div class="app-actions"><a class="btn btn-ghost" href="contact.html">Contact MICEGO</a></div>') + '</div></div>'
  '<div data-states="used"><div class="panel">' + spanel(' is-muted', '–', 'Already accepted',
    '<p>These commission terms have already been accepted with this link. No further action is needed. If you need a change, contact MICEGO.</p>'
    '<div class="app-actions"><a class="btn btn-ghost" href="contact.html">Contact MICEGO</a></div>') + '</div></div>'
  '<div data-states="review"><div class="panel">'
  '<p class="section-num">Partner terms <span data-mg="version">PT-2026-10</span></p>'
  '<h1>Accept the commission terms for <span data-mg="hotel">your property</span></h1>'
  '<p class="app-lead">MICEGO earns a commission on confirmed bookings only. Please review the rate set for your property. '
  '<b>We can’t send you request invitations until you accept.</b></p>'
  '<div class="card" style="margin-top:20px"><dl class="kv" id="cmBox">'
  '<dt>Property</dt><dd data-mg="hotel">your property</dd>'
  '<dt>Commission</dt><dd><span data-mg="rate">10%</span> of net booking value</dd>'
  '<dt>Net booking value</dt><dd data-mg="basis">' + BASIS_TEXT + '</dd>'
  '<dt>Applies to</dt><dd>Bookings that result from a selection of your quote on an invitation sent to you while this rate is in effect</dd>'
  '<dt>Invoice</dt><dd>Issued after the event; payable within 30 days of the invoice date</dd>'
  '<dt>Link valid until</dt><dd data-mg="expiresAt">—</dd>'
  '</dl></div>'
  '<p class="app-lead" style="margin-top:16px;font-size:14px">The full wording is in <a class="tlink" href="terms.html#art5" target="_blank" rel="noopener">Article 5 of the Partner Terms</a>. '
  'Your rate is confidential between you and MICEGO and is never shown to organizers. '
  'A different rate later requires a new link and your acceptance again, and applies only to invitations sent after that.</p>'
  '<div class="check-row" style="margin-top:8px"><input type="checkbox" id="cmAgree"> '
  '<label for="cmAgree">I am authorised to accept these terms for <span data-mg="hotel">your property</span>, and I accept the commission above under Article 5 of the MICEGO Partner Terms.</label></div>'
  '<div class="app-actions"><button type="button" class="btn btn-accent" id="cmBtn" disabled>Accept commission terms</button>'
  '<a class="btn btn-ghost" href="contact.html">Questions about the rate? Contact MICEGO</a></div>'
  '<p class="app-lead" style="margin-top:12px;font-size:13px">Opening this page does not accept anything. Acceptance is recorded, with the time and the version of the terms, only when you press the button.</p>'
  '</div></div>'
  '<div data-states="done"><div class="panel">' + spanel('', '✓', 'Commission terms accepted',
    '<p>Thank you. <b data-mg="hotel">Your property</b> has accepted a commission of <b><span data-mg="rate">10%</span> of net booking value</b> under the MICEGO Partner Terms (<span data-mg="version">PT-2026-10</span>). '
    'We can now invite you to quote when a request matches your destination and capacity.</p>') + '</div></div>'
  '</div>')

JS = r'''
  // --- PTR:COMMISSION_JS start ---
  (function(){
    var H=document.documentElement,QS2=new URLSearchParams(location.search),TOKEN2=QS2.get('t')||'';
    var mgApi2=!!(window.MG && MG.mode==='api' && !MG.preview);
    function go2(s){H.setAttribute('data-state',s);}
    function put(k,v){document.querySelectorAll('[data-mg="'+k+'"]').forEach(function(el){el.textContent=(v==null||v==='')?'—':v;});}
    function fill(v){
      if(!v)return;
      put('hotel',v.hotel);
      if(v.ratePct!=null&&isFinite(Number(v.ratePct)))put('rate',Number(v.ratePct)+'%');
      put('version',v.termsVersion);
      if(v.basis&&v.basis!=='rooms_fnb_net')put('basis',v.basis);
      if(v.expiresAt){try{put('expiresAt',new Date(v.expiresAt).toUTCString().replace(':00 GMT',' UTC'));}catch(e){}}
    }
    function fail(err,btn){
      var c=err&&err.code;
      if(c==='TOKEN_EXPIRED')go2('expired');else if(c==='TOKEN_USED')go2('used');else if(c==='TOKEN_INVALID'||c==='STATE_CONFLICT')go2('invalid');
      else{if(btn)btn.disabled=!(document.getElementById('cmAgree')||{}).checked;toast(MG.msg(err));}
    }
    var chk=document.getElementById('cmAgree'),btn=document.getElementById('cmBtn');
    if(chk&&btn)chk.addEventListener('change',function(){btn.disabled=!chk.checked;});
    if(mgApi2){
      // GET-equivalent: lookup only (does not consume the token)
      MG.api.partner_commission_accept({token:TOKEN2,action:'lookup'}).then(function(v){
        fill(v);
        var st=v&&v.status; go2(st==='pending'?'review':st==='used'?'used':st==='expired'?'expired':'invalid');
      },function(){go2('invalid');});
      if(btn)btn.addEventListener('click',function(){
        if(!chk||!chk.checked)return; btn.disabled=true;
        MG.api.partner_commission_accept({token:TOKEN2,action:'accept'}).then(function(r){
          if(r){put('hotel',r.hotel);if(r.ratePct!=null&&isFinite(Number(r.ratePct)))put('rate',Number(r.ratePct)+'%');}
          go2('done');
        },function(err){fail(err,btn);});
      });
    } else {
      if(btn)btn.addEventListener('click',function(){if(chk&&chk.checked)go2('done');});
    }
  })();
  // --- PTR:COMMISSION_JS end ---
'''

# ---- swap main body
m = re.search(r'<main id="main" class="app-main">.*?</main>', tpl, flags=re.S)
assert m, 'main not found'
tpl = tpl[:m.start()] + '<main id="main" class="app-main">' + BODY + '</main>' + tpl[m.end():]
# ---- swap script block
tpl, n = re.subn(r'  // --- WP3:UNSUB_JS start ---.*?  // --- WP3:UNSUB_JS end ---\n', lambda _m: JS.lstrip('\n'), tpl, count=1, flags=re.S)
assert n == 1 and 'PTR:COMMISSION_JS' in tpl, 'script swap failed'
tpl = tpl.replace('</style>', 'html[data-state="review"] [data-states~="review"],html[data-state="used"] [data-states~="used"]{display:revert}\n'
                  '.kv{display:grid;grid-template-columns:minmax(140px,1fr) 2fr;gap:8px 16px;font-size:14.5px}.kv dt{color:var(--gray)}.kv dd{font-weight:600}@media(max-width:560px){.kv{grid-template-columns:1fr}.kv dt{margin-top:6px}}\n'
                  '.app-actions .btn[disabled]{opacity:.45;cursor:not-allowed}\n</style>', 1)
io.open(DST, 'w', encoding='utf-8').write(tpl)
print('wrote', DST, len(tpl))
