# -*- coding: utf-8 -*-
"""build_confirm.py — en/confirm.html (호텔 대리 입력 견적 확인 페이지) 생성.  - 클로드
en/unsubscribe.html 을 템플릿으로 삼아 head/header/footer 를 그대로 재사용하고, 본문과 스크립트만 바꾼다.
지역파트너 콘솔 기술설계서 §12(대리 입력) 기준:
  · 링크는 GET 으로 열어도 토큰이 소비되지 않는다(메일 보안 스캐너 대비). 확인/이의는 버튼(POST quote_confirm) 으로만.
  · 상태: loading → review(확인 대기) / done(확인됨) / disputed(이의 접수) / used(이미 처리) / expired / invalid
실행: python3 build_confirm.py   (사이트 루트에서)
"""
import io, os, re, sys

ROOT = os.environ.get('MG_SITE_DIR') or os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'en', 'unsubscribe.html')
DST = os.path.join(ROOT, 'en', 'confirm.html')

tpl = io.open(SRC, encoding='utf-8').read()

# ---- head: title/description/state bootstrap
tpl = tpl.replace('<title>Unsubscribe | MICEGO Partner</title>', '<title>Confirm your quote | MICEGO Partner</title>')
tpl = tpl.replace('<meta name="description" content="Stop MICEGO invitation emails for your property.">',
                  '<meta name="description" content="Review the quote entered on your behalf and confirm it, or flag a correction.">')
tpl = re.sub(r'<script>\(function\(\)\{var h=document\.documentElement,q=new URLSearchParams\(location\.search\).*?\}\)\(\);</script>',
  '<script>(function(){var h=document.documentElement,q=new URLSearchParams(location.search),t=q.get(\'t\')||\'\',s=q.get(\'state\')||\'review\';var C=window.MG_CONFIG||{},api=!!(C.supabase&&C.supabase.url),preview=(C.demo!==false)&&q.has(\'state\');if(!/^[A-Za-z0-9_-]{16,64}$/.test(t)){s=\'invalid\';}else if(api&&!preview){s=\'loading\';}else if(["review","done","disputed","used","expired","invalid","loading"].indexOf(s)<0){s=\'invalid\';}h.setAttribute(\'data-state\',s);h.setAttribute(\'data-mode\',(api&&!preview)?\'api\':\'demo\');})();</script>',
  tpl, count=1, flags=re.S)

def spanel(cls, icon, title, body):
    return ('<div class="status-panel' + cls + '"><div class="status-icon" aria-hidden="true">' + icon + '</div><div class="status-body"><h2>' + title + '</h2>' + body + '</div></div>')

BODY = (
  '<div class="app-wrap narrow">'
  '<div data-states="loading" class="mg-loading" role="status" aria-live="polite">Loading…</div>'
  '<div data-states="invalid"><div class="panel">' + spanel(' is-muted', '!', 'This link is not valid',
    '<p>Part of the address is missing, or this link is no longer active. Please use the link from the original email, or contact MICEGO.</p>'
    '<div class="app-actions"><a class="btn btn-ghost" href="contact.html">Contact MICEGO</a></div>') + '</div></div>'
  '<div data-states="expired"><div class="panel">' + spanel(' is-muted', '–', 'This confirmation link has expired',
    '<p>Confirmation links are valid for 72 hours. The quote entered on your behalf was <b>not</b> included in the comparison. If you would still like to quote, ask your MICEGO regional contact to resend the link, or submit the quote yourself from the original invitation email.</p>'
    '<div class="app-actions"><a class="btn btn-ghost" href="contact.html">Contact MICEGO</a></div>') + '</div></div>'
  '<div data-states="used"><div class="panel">' + spanel(' is-muted', '–', 'Already handled',
    '<p>This quote has already been confirmed or flagged. No further action is needed.</p>') + '</div></div>'
  '<div data-states="review"><div class="panel">'
  '<p class="section-num">Request <span data-mg="ref">MG-2610-014</span> · Round <span data-mg="round">1</span></p>'
  '<h1>Please confirm the quote entered for <span data-mg="hotel">your property</span></h1>'
  '<p class="app-lead"><span data-mg="enteredBy">MICEGO Thailand</span> entered the following quote on your behalf after speaking with your sales team. '
  'It will only be shown to the organizer after you confirm it. If anything is wrong, flag it and we will not use it.</p>'
  '<div class="card" style="margin-top:20px"><dl class="kv" id="quoteBox">'
  '<dt>Currency</dt><dd data-mg="currency">THB</dd>'
  '<dt>Twin room (per night)</dt><dd data-mg="twinRate">4,500</dd>'
  '<dt>King room (per night)</dt><dd data-mg="kingRate">5,200</dd>'
  '<dt>Breakfast</dt><dd data-mg="breakfast">Included</dd>'
  '<dt>Tax &amp; service</dt><dd data-mg="tax">Included</dd>'
  '<dt>Availability</dt><dd data-mg="availability">All requested dates</dd>'
  '<dt>Ballroom</dt><dd data-mg="ballroom">—</dd>'
  '<dt>Valid until</dt><dd data-mg="validUntil">2027-01-31</dd>'
  '<dt>Cancellation</dt><dd data-mg="cancellation">Free cancellation up to 30 days before arrival</dd>'
  '<dt>Additional proposals</dt><dd data-mg="additionalProposals">—</dd>'
  '</dl></div>'
  '<p class="app-lead" style="margin-top:16px;font-size:14px">Link valid until <b data-mg="expiresAt">—</b>. Confirming is binding in the same way as submitting the quote yourself. '
  'Need to change something? Flag it below, then submit a corrected quote from your invitation link.</p>'
  '<div class="app-actions"><button type="button" class="btn btn-accent" id="cfBtn">Confirm this quote</button>'
  '<button type="button" class="btn btn-ghost" id="dpBtn">Something is wrong</button></div>'
  '<div id="dpBox" hidden style="margin-top:16px"><label class="lbl" for="dpReason">What should be corrected? (optional)</label>'
  '<textarea class="inp" id="dpReason" rows="3" placeholder="e.g. Twin rate should be 4,200 net; breakfast not included"></textarea>'
  '<div class="app-actions"><button type="button" class="btn btn-primary" id="dpSend">Flag and do not use this quote</button>'
  '<button type="button" class="btn btn-ghost" id="dpCancel">Back</button></div></div>'
  '</div></div>'
  '<div data-states="done"><div class="panel">' + spanel('', '✓', 'Quote confirmed',
    '<p>Thank you. Your quote is now part of the comparison for request <b data-mg="ref">MG-2610-014</b>. You will receive the selection result by email once the organizer decides.</p>') + '</div></div>'
  '<div data-states="disputed"><div class="panel">' + spanel('', '✓', 'Flagged — this quote will not be used',
    '<p>We have noted your correction and the quote entered on your behalf has been withdrawn. To quote, open your original invitation and submit it yourself before the deadline.</p>'
    '<div class="app-actions"><a class="btn btn-accent" id="bidLink" href="bid.html">Submit my own quote</a></div>') + '</div></div>'
  '</div>')

JS = r'''
  // --- PTR:CONFIRM_JS start ---
  (function(){
    var H=document.documentElement,QS2=new URLSearchParams(location.search),TOKEN2=QS2.get('t')||'';
    var mgApi2=!!(window.MG && MG.mode==='api' && !MG.preview);
    function go2(s){H.setAttribute('data-state',s);}
    function put(k,v){document.querySelectorAll('[data-mg="'+k+'"]').forEach(function(el){el.textContent=(v==null||v==='')?'—':v;});}
    function num(v){return (v==null||v==='')?'—':Number(v).toLocaleString('en-US');}
    function fill(v){
      if(!v)return; put('ref',v.ref);put('round',v.round);put('hotel',v.hotel);put('enteredBy',v.enteredBy||'MICEGO');
      var q=v.quote||{};put('currency',q.currency);put('twinRate',num(q.twinRate));put('kingRate',num(q.kingRate));
      put('breakfast',q.breakfast==='included'?'Included':'Not included'+(q.breakfastSupplement?' · supplement '+num(q.breakfastSupplement):''));
      put('tax',(q.tax==='included'?'Included':'Not included')+(q.taxNote?' · '+q.taxNote:''));
      put('availability',q.availability==='all'?'All requested dates':'Partial'+(q.availabilityNotes?' · '+q.availabilityNotes:''));
      put('ballroom',q.ballroomName||q.ballroomFee?[q.ballroomName,q.ballroomFee!=null?'fee '+num(q.ballroomFee):null,q.fnbMinimum!=null?'F&B minimum '+num(q.fnbMinimum):null,q.ballroomIncludes].filter(Boolean).join(' · '):'—');
      put('validUntil',q.validUntil);put('cancellation',q.cancellation);put('additionalProposals',q.additionalProposals);
      if(v.expiresAt){try{put('expiresAt',new Date(v.expiresAt).toUTCString().replace(':00 GMT',' UTC'));}catch(e){}}
      var bl=document.getElementById('bidLink');if(bl&&v.bidToken)bl.href=MG.url.bid(v.bidToken);
    }
    var cf=document.getElementById('cfBtn'),dp=document.getElementById('dpBtn'),dpBox=document.getElementById('dpBox'),dpSend=document.getElementById('dpSend'),dpCancel=document.getElementById('dpCancel');
    if(dp)dp.addEventListener('click',function(){dpBox.hidden=false;document.getElementById('dpReason').focus();});
    if(dpCancel)dpCancel.addEventListener('click',function(){dpBox.hidden=true;});
    if(mgApi2){
      MG.api.quote_confirm({token:TOKEN2,action:'lookup'}).then(function(v){
        fill(v);
        var st=v&&v.status; go2(st==='pending'?'review':st==='used'?'used':st==='expired'?'expired':st==='stale'?'used':'invalid');
      },function(){go2('invalid');});
      if(cf)cf.addEventListener('click',function(){cf.disabled=true;
        MG.api.quote_confirm({token:TOKEN2,action:'confirm'}).then(function(){go2('done');},function(err){cf.disabled=false;var c=err&&err.code;if(c==='TOKEN_EXPIRED')go2('expired');else if(c==='TOKEN_USED')go2('used');else toast(MG.msg(err));});});
      if(dpSend)dpSend.addEventListener('click',function(){dpSend.disabled=true;
        MG.api.quote_confirm({token:TOKEN2,action:'dispute',reason:document.getElementById('dpReason').value.trim()}).then(function(){go2('disputed');},function(err){dpSend.disabled=false;var c=err&&err.code;if(c==='TOKEN_EXPIRED')go2('expired');else if(c==='TOKEN_USED')go2('used');else toast(MG.msg(err));});});
    } else {
      if(cf)cf.addEventListener('click',function(){go2('done');});
      if(dpSend)dpSend.addEventListener('click',function(){go2('disputed');});
    }
  })();
  // --- PTR:CONFIRM_JS end ---
'''

# ---- swap main body
m = re.search(r'<main id="main" class="app-main">.*?</main>', tpl, flags=re.S)
assert m, 'main not found'
tpl = tpl[:m.start()] + '<main id="main" class="app-main">' + BODY + '</main>' + tpl[m.end():]
# ---- swap script block
tpl = re.sub(r'  // --- WP3:UNSUB_JS start ---.*?  // --- WP3:UNSUB_JS end ---\n', JS.lstrip('\n'), tpl, count=1, flags=re.S)
assert 'PTR:CONFIRM_JS' in tpl, 'script swap failed'
# kv style (confirm page shows a definition list; unsubscribe template has none)
tpl = tpl.replace('</style>', 'html[data-state="review"] [data-states~="review"],html[data-state="used"] [data-states~="used"],html[data-state="disputed"] [data-states~="disputed"]{display:revert}\n.kv{display:grid;grid-template-columns:minmax(140px,1fr) 2fr;gap:8px 16px;font-size:14.5px}.kv dt{color:var(--gray)}.kv dd{font-weight:600}@media(max-width:560px){.kv{grid-template-columns:1fr}.kv dt{margin-top:6px}}\n</style>', 1)
io.open(DST, 'w', encoding='utf-8').write(tpl)
print('wrote', DST, len(tpl))
