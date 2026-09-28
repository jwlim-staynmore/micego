import os, re, json
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright
root=os.getcwd(); fails=[]
def F(m): fails.append(m); print('FAIL',m)
def url(p,q=''): return 'file://'+os.path.join(root,p)+q
T='?t=demo-2610'
BID_S=['open','submitted','selected','not_selected','declined','expired','cancelled','invalid']
TRK_S=['received','verifying','rejected','bidding','rebid','collecting','delivered','won','lost','cancelled','invalid']
NOCMP={'received','verifying','rejected','bidding','rebid','collecting','lost','cancelled','invalid'}
combos={'en/bid.html':[(T+'&state='+s,s) for s in BID_S]+[(T,'open'),('?state=open','invalid'),(T+'&state=closed','invalid'),(T+'&state=zzz','invalid')],
        'ko/track.html':[(T+'&state='+s,s) for s in TRK_S]+[(T,'delivered'),('?state=delivered','invalid'),(T+'&state=ready','invalid'),(T+'&state=zzz','invalid')]}
with sync_playwright() as pw:
    b=pw.chromium.launch()
    def page(w=1280,js=True):
        c=b.new_context(viewport={'width':w,'height':900},java_script_enabled=js); pg=c.new_page(); pg.errs=[]; pg.on('pageerror',lambda e:pg.errs.append(str(e))); return pg
    os.makedirs('shots3',exist_ok=True)
    for p,lst in combos.items():
        for q,exp in lst:
            for w in (360,390,768,1024,1280):
                pg=page(w); pg.goto(url(p,q)); pg.wait_for_timeout(120)
                st=pg.evaluate("document.documentElement.getAttribute('data-state')")
                if st!=exp: F(f'{p}{q} state {st}!={exp}')
                ov=pg.evaluate("()=>{document.body.style.overflowX='visible';document.documentElement.style.overflowX='visible';return document.documentElement.scrollWidth-innerWidth}")
                if ov>0: F(f'{p}{q} w={w} overflow {ov}')
                if pg.errs: F(f'{p}{q} console {pg.errs}')
                stray=pg.evaluate("()=>[...document.querySelectorAll('[data-states]')].filter(e=>getComputedStyle(e).display!=='none'&&!(' '+e.getAttribute('data-states')+' ').includes(' '+document.documentElement.dataset.state+' ')).length")
                if stray: F(f'{p}{q} stray visible {stray}')
                if w==1280:
                    txt=pg.evaluate("document.body.innerText"); html=pg.content()
                    if pg.evaluate("document.querySelectorAll('form,input[type=checkbox]').length") and p=='ko/track.html': F(f'{p}{q} track has form')
                    if p=='ko/track.html':
                        if exp in NOCMP:
                            for k in ['Ocean Pearl','제안 A','제안 B','제안 C','USD','VND','추정 합계','검토 메모']:
                                if k in txt: F(f'{p}{q} leak {k}')
                            if pg.evaluate("document.querySelectorAll('#cmp,.pcard,#pickCard,[data-pick]').length"): F(f'{p}{q} cmp DOM present')
                        if exp!='won' and 'Ocean Pearl' in html: F(f'{p}{q} hotel name in DOM')
                        if exp=='invalid':
                            for k in ['MG-2610','다낭','2027']:
                                if k in txt: F(f'{p}{q} invalid leak {k}')
                        if exp=='delivered' and ('USD 참고' not in txt or '기준일 2026-10-12' not in txt): F('delivered fx note')
                    if p=='en/bid.html':
                        if exp in ('declined','expired','cancelled','invalid'):
                            for k in ['Da Nang','2027','Twin','USD','Ocean Pearl','Gala','Requirements']:
                                if k in txt: F(f'{p}{q} leak {k}')
                            if pg.evaluate("document.querySelectorAll('#bidForm,#declineForm').length"): F(f'{p}{q} form present')
                        if exp=='selected':
                            if 'Hanbit Tour' not in txt or 'Your proposal was selected' not in txt: F('selected content')
                            if pg.evaluate("document.querySelectorAll('#bidForm,#declineForm').length"): F('selected form present')
                        if exp=='not_selected':
                            for k in ['Hanbit','한빛','jieun','Kim Ji-eun']:
                                if k.lower() in (txt+html).lower(): F('not_selected leak '+k)
                            if 'Not selected this time' not in txt: F('not_selected content')
                            if pg.evaluate("document.querySelectorAll('#bidForm,#declineForm').length"): F('not_selected form present')
                        if exp in ('selected','not_selected') and 'Your submitted quote' not in txt: F(exp+' no quote summary')
                        if exp=='open':
                            for k in ['18:00 KST','24 hours before the deadline','marks the invitation as viewed','Notes (reviewed by MICEGO)',"Can't quote on this one?"]:
                                if k.lower() not in txt.lower(): F(f'bid open missing {k}')
                    if q.endswith('state='+exp) or q==T: pg.screenshot(path='shots3/%s_%s.png'%(p.replace('/','_'),exp),full_page=True)
                pg.context.close()
    # JS off
    pg=page(1280,False); pg.goto(url('en/bid.html',T))
    if not pg.is_visible('#bidForm'): F('bid js-off form')
    pg.context.close()
    pg=page(1280,False); pg.goto(url('ko/track.html',T))
    if not pg.is_visible('.cmp-table'): F('track js-off table 1280')
    pg.set_viewport_size({'width':360,'height':800})
    if not pg.evaluate("()=>getComputedStyle(document.querySelector('.pcards')).display!=='none'"): F('track js-off cards 360')
    pg.context.close()
    # sorting + pick mails
    pg=page(1280); pg.goto(url('ko/track.html',T+'&state=delivered'))
    th=lambda:pg.evaluate("()=>[...document.querySelectorAll('.cmp-table thead th[data-p]')].map(e=>e.dataset.p).join('')")
    pc=lambda:pg.evaluate("()=>[...document.querySelectorAll('.pcards .pcard')].map(e=>e.dataset.p).join('')")
    if th()!='CBA' or pc()!='CBA': F('initial order '+th()+pc())
    pg.click('#sortArrival')
    if th()!='ABC' or pc()!='ABC': F('arrival order')
    ok=pg.evaluate("()=>{const o=[...document.querySelectorAll('.cmp-table thead th[data-p]')].map(e=>e.dataset.p).join('');return [...document.querySelectorAll('.cmp-table tr')].every(tr=>{const c=[...tr.children].filter(x=>x.dataset&&x.dataset.p).map(x=>x.dataset.p).join('');return c===''||c===o})}")
    if not ok: F('row order mismatch')
    pg.click('#sortPrice')
    if th()!='CBA': F('price order')
    pr=pg.evaluate("()=>[...document.querySelectorAll('.cmp-table thead th[data-p]')].map(e=>+e.dataset.price)")
    if pr!=[123,126,145]: F('prices '+str(pr))
    for pid,h in pg.evaluate("()=>[...document.querySelectorAll('a[data-pick]')].map(a=>[a.dataset.pick,a.href])"):
        u=urlparse(h); q=parse_qs(u.query)
        if u.path!='mysteri1984@gmail.com' or q['subject'][0]!='[MICEGO 제안 선택] MG-2610-014 · 제안 '+pid or 'demo-2610' not in q['body'][0] or len(h)>1800: F('pick mail '+pid)
    pg.click('a[data-pick="B"]')   # pick flow is now OTP-gated: select -> code -> confirm (JS-off keeps the mailto links checked above)
    if pg.evaluate("pickStep.hidden"): F('pick step not opened')
    pg.fill('#pickCode','000000'); pg.click('#pickVerify')
    if '남은 시도 4회' not in pg.evaluate("pickMsg.textContent"): F('pick wrong code msg')
    pg.fill('#pickCode','123456'); pg.click('#pickVerify')
    if pg.evaluate("pickOk.hidden") or '휴대전화 확인' not in parse_qs(urlparse(pg.evaluate("pickConfirm.href")).query)['body'][0]: F('pick confirm mail')
    pg.click('#pickCopyBtn')
    if pg.evaluate("pickCopy.hidden") or '제안 B' not in pg.evaluate("pickCopy.value"): F('pick copy')
    pg.context.close()
    # bid form
    pg=page(1280); pg.goto(url('en/bid.html',T+'&state=open'))
    pg.evaluate("()=>document.getElementById('bidForm').requestSubmit()")
    if pg.evaluate("document.getElementById('sendPanel').hidden")!=True: F('bid empty submit passed')
    pg.evaluate("""()=>{const f=bidForm;const s=(n,v)=>f.elements[n].value=v;s('twinRate','145');s('kingRate','165');document.querySelector('input[name=breakfast][value="Included in rate"]').click();document.querySelector('input[name=tax][value="Included in all rates"]').click();document.querySelector('input[name=availability][value="All 80 rooms available"]').click();s('ballroomFee','3500');s('ballroomName','Grand Ballroom, 300 pax');s('validUntil','2027-01-31');s('cancellation','Free cancellation until 60 days prior');s('hotelName','Ocean Pearl');s('contactName','Nguyen');s('contactEmail','a@b.co');consent.checked=true;}""")
    pg.evaluate("()=>document.getElementById('bidForm').requestSubmit()")
    href=pg.evaluate("document.getElementById('mailBtn').href"); box=pg.evaluate("document.getElementById('copyBox').value")
    if not href.startswith('mailto:mysteri1984@gmail.com?subject=') or len(href)>1800 or 'MG-2610-014' not in box or 'demo-2610' not in box: F('bid mail')
    pg.click('#editBtn'); pg.evaluate("()=>document.querySelector('input[name=tax][value=\"Not included\"]').click()")
    pg.evaluate("()=>document.getElementById('bidForm').requestSubmit()")
    if 'error' not in pg.evaluate("document.getElementById('f-taxNote').className"): F('taxNote required')
    pg.context.close()
    # decline flow at 360
    pg=page(360); pg.goto(url('en/bid.html',T+'&state=open'))
    pg.evaluate("()=>document.getElementById('declineForm').requestSubmit()")
    if 'error' not in pg.evaluate("document.getElementById('f-dreason').className"): F('decline reason required')
    pg.select_option('#dreason',"Capacity doesn't fit")
    pg.evaluate("()=>document.getElementById('declineForm').requestSubmit()")
    if pg.evaluate("document.getElementById('declinePanel').hidden"): F('decline panel')
    h=pg.evaluate("document.getElementById('dMailBtn').href"); q=parse_qs(urlparse(h).query)
    if q['subject'][0]!='[MICEGO Decline] MG-2610-014' or 'Capacity' not in q['body'][0] or 'demo-2610' not in q['body'][0]: F('decline mail')
    pg.click('#dDoneBtn')
    if pg.evaluate("document.documentElement.dataset.state")!='declined' or not pg.is_visible('#declinedPanel') or pg.is_visible('#bidForm'): F('declined state')
    ov=pg.evaluate("()=>{document.body.style.overflowX='visible';return document.documentElement.scrollWidth-innerWidth}")
    if ov>0: F('declined overflow')
    pg.context.close()
    pg=page(1280); pg.goto(url('en/bid.html',T+'&state=submitted')); pg.click('#reviseBtn')
    if pg.evaluate("document.documentElement.dataset.state")!='open' or pg.evaluate("bidForm.elements.twinRate.value")!='145': F('revise')
    pg.context.close()
    for p,vals in [('ko/contact.html',"topic.value='견적 요청 문의';cname.value='홍';cemail.value='a@b.co';cmsg.value='문의 내용입니다 열 글자 이상';cconsent.checked=true;"),('en/contact.html',"topic.selectedIndex=1;cname.value='Kim';cemail.value='a@b.co';cmsg.value='Hello this is a message';cconsent.checked=true;")]:
        pg=page(1280); pg.goto(url(p)); pg.evaluate("()=>contactForm.requestSubmit()")
        if pg.evaluate("sendPanel.hidden")!=True: F(p+' empty passed')
        pg.evaluate("()=>{"+vals+"}"); pg.evaluate("()=>contactForm.requestSubmit()")
        if pg.evaluate("sendPanel.hidden")!=False or not pg.evaluate("mailBtn.href").startswith('mailto:mysteri1984@gmail.com'): F(p+' send')
        pg.context.close()
    for p in ('ko/faq.html','en/faq.html'):
        pg=page(360); pg.goto(url(p)); pg.click('.faq-q >> nth=0')
        if not pg.evaluate("document.querySelector('.faq-panel:not([hidden]) p')"): F(p+' faq open')
        pg.context.close()
    pg=page(1280,False); pg.goto(url('ko/faq.html'))
    if not pg.evaluate("[...document.querySelectorAll('.faq-panel p')].every(e=>e.getBoundingClientRect().height>0)"): F('faq jsoff hidden')
    pg.context.close()
    b.close()
print('FAILS3',len(fails))
