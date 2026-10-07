from playwright.sync_api import sync_playwright
import os
SITE=os.environ.get('MG_SITE_DIR') or os.path.dirname(os.path.abspath(__file__))
SHOTS=os.path.join(SITE,'admin_shots'); os.makedirs(SHOTS,exist_ok=True)
BASE='file://'+SITE+'/admin/'
res=[];errs=[]
def ok(n,c,e=''):
    res.append((n,bool(c))); print(('PASS ' if c else 'FAIL ')+n+((' | '+str(e)) if not c else ''))
with sync_playwright() as p:
    b=p.chromium.launch()
    def newpage(w=1280,h=900):
        ctx=b.new_context(viewport={'width':w,'height':h}); pg=ctx.new_page()
        pg.on('console',lambda m: errs.append((pg.url,m.text)) if m.type=='error' and 'ERR_' not in m.text else None)
        pg.on('pageerror',lambda e: errs.append((pg.url,str(e))))
        return ctx,pg
    def login(pg):
        pg.goto(BASE+'index.html'); pg.fill('#em','ops@matchgo.ai'); pg.fill('#pw','x'); pg.click('button[type=submit]'); pg.wait_for_url('**/dashboard.html')
    def toast(pg): return pg.inner_text('#toasts')
    ctx,pg=newpage(); login(pg)
    # dashboard
    todo=pg.eval_on_selector_all('.todo li a','els=>els.map(e=>[e.dataset.key,e.getAttribute("href")])'); d=dict(todo)
    ok('dash partner link',d['partner']=='partners.html?filter=delayed',d)
    ok('dash log link',pg.locator('#allLog').count()==1)
    ok('badge 1','1'==pg.inner_text('.side a[href="partners.html"] .nav-badge'))
    # list
    pg.goto(BASE+'partners.html'); pg.wait_for_timeout(100)
    seg=pg.eval_on_selector_all('#segs button','e=>e.map(x=>x.textContent.replace(/\\s+/g," "))'); print(seg)
    ok('queue=3','심사 대기 3' in seg[0],seg); ok('전체 22','전체 22' in seg[4],seg)
    ids=pg.eval_on_selector_all('.ptable tbody tr','e=>e.map(x=>x.dataset.id)'); ok('queue rows p18 p19 p22',sorted(ids)==['p18','p19','p22'],ids)
    txt=pg.inner_text('.ptable'); ok('지연/오늘/남은','지연' in txt and '남은 2영업일' in txt and '남은 3영업일' in txt,txt[:400])
    ok('domain warn p19',pg.locator('tr[data-id=p19] .badge.amber').count()>=1)
    pg.goto(BASE+'partners.html?filter=delayed'); ids=pg.eval_on_selector_all('.ptable tbody tr','e=>e.map(x=>x.dataset.id)'); ok('delayed only p18',ids==['p18'],ids)
    pg.goto(BASE+'partners.html?filter=flag'); ids=pg.eval_on_selector_all('.ptable tbody tr','e=>e.map(x=>x.dataset.id)'); ok('flag only p9',ids==['p9'],ids)
    pg.goto(BASE+'partners.html'); pg.click('#segs [data-s=approved]'); pg.select_option('#fd','발리'); ids=pg.eval_on_selector_all('.ptable tbody tr','e=>e.map(x=>x.dataset.id)'); ok('approved 발리 = 5',len(ids)==4,ids)
    pg.fill('#fq','zzz'); ok('search empty','없습니다' in pg.inner_text('.ptable'))
    ctx.close()
    # dashboard link click
    ctx,pg=newpage(); login(pg); pg.click('[data-key=partner]'); pg.wait_for_url('**/partners.html?filter=delayed'); ok('link works',pg.locator('.ptable tbody tr').count()==1); ctx.close()
    # p19 approve
    ctx,pg=newpage(); login(pg); pg.goto(BASE+'partner.html?id=p19')
    ok('p19 buttons',sorted(pg.eval_on_selector_all('#tbtns [data-to]','e=>e.map(x=>x.dataset.to)'))==['approved','rejected'])
    pg.screenshot(path=os.path.join(SHOTS,'partner_p19_1280.png'),full_page=True)
    pg.click('[data-to=approved]'); pg.wait_for_timeout(80); t=toast(pg); ok('p19 blocked toast','승인하려면' in t and '실재 확인' in t and '소속 확인' in t,t)
    ok('still reviewing','심사중' in pg.inner_text('.dh'))
    pg.fill('#ckUrl','https://maps.example/patong'); pg.check('[data-k=exists]'); pg.check('[data-k=capOk]'); pg.check('[data-k=contactOk]')
    pg.click('[data-to=approved]'); pg.wait_for_timeout(80); ok('still blocked w/o memo','소속 확인 방법 메모' in toast(pg).split('승인하려면')[-1])
    pg.fill('#ckAff','호텔 대표번호로 통화해 재직 확인')
    ok('summary ok','모두 충족' in pg.inner_text('#chkSum'))
    pg.click('[data-to=approved]'); pg.wait_for_selector('.dlg #cmRate',timeout=3000); ok('p19 approval opens rate dialog','5~20%' in pg.inner_text('#cmHint') and pg.get_attribute('#cmRate','step')=='0.5')
    pg.fill('#cmRate',''); pg.click('.dlg [data-x=ok]'); ok('rate required','요율' in pg.inner_text('.dlg-err'),pg.inner_text('.dlg-err'))
    pg.fill('#cmRate','10'); pg.click('.dlg [data-x=ok]'); pg.wait_for_timeout(100); ok('p19 approved','승인' in pg.inner_text('.dh .chip') and '시스템이 결과 메일을 보냅니다' in toast(pg))
    ok('p19 approved with 10% proposal, 동의 대기','동의 대기' in pg.inner_text('.dh') and '10%' in pg.inner_text('#cmSection'),pg.inner_text('.dh'))
    ok('p19 approved -> suspend only',pg.eval_on_selector_all('#tbtns [data-to]','e=>e.map(x=>x.dataset.to)')==['suspended'])
    ok('history appended','승인' in pg.inner_text('#histTable'))
    # p22 reject
    pg.goto(BASE+'partner.html?id=p22'); pg.click('[data-to=rejected]'); pg.click('.dlg [data-x=ok]'); ok('reject needs reason','사유를 선택' in pg.inner_text('.dlg-err'))
    pg.select_option('#dlgReason','기타'); pg.click('.dlg [data-x=ok]'); ok('기타 note','메모' in pg.inner_text('.dlg-err'))
    pg.select_option('#dlgReason','실재 확인 불가'); pg.click('.dlg [data-x=ok]'); pg.wait_for_timeout(100)
    ok('p22 rejected','거절' in pg.inner_text('.dh .chip') and pg.locator('#tbtns').count()==0 and '시스템이 결과 메일' in toast(pg))
    # p18 delayed reject -> badge gone
    pg.goto(BASE+'partner.html?id=p18'); ok('p18 지연 badge','지연' in pg.inner_text('.dh'))
    pg.click('[data-to=reviewing]'); pg.wait_for_timeout(100); ok('reviewing no mail msg','메일' not in toast(pg))
    ok('p18 buttons after reviewing',sorted(pg.eval_on_selector_all('#tbtns [data-to]','e=>e.map(x=>x.dataset.to)'))==['approved','rejected'])
    pg.click('[data-to=rejected]'); pg.select_option('#dlgReason','단체 50명 미만'); pg.click('.dlg [data-x=ok]'); pg.wait_for_timeout(100)
    ok('badge gone after p18 done',pg.locator('.side a[href="partners.html"] .nav-badge').count()==0)
    # p21 re-approve
    pg.goto(BASE+'partner.html?id=p21'); ok('p21 재승인 btn',pg.inner_text('#tbtns')=='재승인',pg.inner_text('#tbtns'))
    pg.click('[data-to=approved]'); pg.click('.dlg [data-x=ok]'); ok('재승인 needs memo','적어' in pg.inner_text('.dlg-err'))
    pg.fill('#dlgTxt','호텔이 견적 담당자를 교체했다고 답신'); pg.click('.dlg [data-x=ok]'); pg.wait_for_timeout(100)
    ok('p21 approved','승인' in pg.inner_text('.dh .chip') and '답신' in pg.inner_text('#histTable'))
    # p9 suspend
    pg.goto(BASE+'partner.html?id=p9'); ok('p9 flag','중지 검토' in pg.inner_text('#flagBox'))
    ok('p9 invites 3',pg.locator('#invTable tbody tr').count()==3)
    pg.click('[data-to=suspended]'); ok('suspend note','직접' in pg.inner_text('.dlg'))
    pg.click('.dlg [data-x=ok]'); ok('suspend needs reason','사유' in pg.inner_text('.dlg-err'))
    pg.select_option('#dlgReason','3회 연속 무응답'); pg.click('.dlg [data-x=ok]'); pg.wait_for_timeout(100)
    ok('p9 suspended','중지' in pg.inner_text('.dh .chip') and '중지 안내 메일을 직접 보내세요' in toast(pg))
    pg.goto(BASE+'partners.html?filter=flag'); ids=pg.eval_on_selector_all('.ptable tbody tr[data-id]','e=>e.map(x=>x.dataset.id)'); ok('flag now only re-approved p21 (2 inaccurate quotes)',ids==['p21'],ids)
    ctx.close()
    # settings
    ctx,pg=newpage(); login(pg); pg.goto(BASE+'settings.html'); pg.wait_for_timeout(100)
    ok('2027 warn','비어 있으면 영업일 계산에서 주말만 빠져 SLA가 짧게' in pg.inner_text('#nyWarn'))
    before=pg.inner_text('#ex2')
    pg.fill('#hd','2027-01-06'); pg.fill('#hn','테스트 휴일'); pg.click('#holAdd'); pg.wait_for_timeout(100)
    ok('warn removed',pg.locator('#nyWarn').count()==0)
    after=pg.inner_text('#ex2'); ok('calc changed',before!=after,(before,after))
    pg.click('[data-del="2027-01-06"]'); pg.wait_for_timeout(50); ok('warn back',pg.locator('#nyWarn').count()==1 and pg.inner_text('#ex2')==before)
    pg.click('#holAdd'); ok('form err','날짜' in pg.inner_text('#holErr'))
    pg.goto(BASE+'settings.html#notify'); pg.wait_for_timeout(100)
    ok('notify visible only',pg.is_visible('#h-tp') and not pg.is_visible('#h-hol'))
    ok('log has failed 2',pg.locator('#logTable [data-fail]').count()==2)
    pg.check('[data-fail=f1]'); pg.wait_for_timeout(50)
    pg.goto(BASE+'dashboard.html'); ok('dash sync manual',pg.locator('[data-fail=f1]').is_checked() and pg.inner_text('#h-f .badge').startswith('1'))
    pg.goto(BASE+'settings.html#notify'); pg.select_option('#lf','failed'); ok('filter failed',pg.locator('#logTable tbody tr').count()==2)
    pg.click('[data-resend=f2]'); ok('resend toast','재발송' in toast(pg))
    pg.select_option('#lf','sent'); ok('sent 11',pg.locator('#logTable tbody tr').count()==11)
    for t in ['rules','ops','system','prereq']:
        pg.goto(BASE+'settings.html#'+t); pg.evaluate('location.reload()'); pg.wait_for_timeout(1200); ok('tab '+t,pg.locator('.tabpanel.on').count()==1 and pg.locator('.tabpanel.on').get_attribute('id')==t)
    ok('prereq track',('화면 제작됨' in pg.inner_text('#prereqTable')) )
    ctx.close()
    # reset
    ctx,pg=newpage(); login(pg); pg.goto(BASE+'partner.html?id=p22'); pg.click('[data-to=rejected]'); pg.select_option('#dlgReason','실재 확인 불가'); pg.click('.dlg [data-x=ok]'); pg.wait_for_timeout(80)
    pg.click('#resetLink'); pg.wait_for_load_state(); pg.wait_for_timeout(200); pg.goto(BASE+'partner.html?id=p22'); ok('reset restores partner',pg.locator('#tbtns [data-to]').count()==3); ctx.close()
    # overflow
    for w in (360,768,1280):
        ctx,pg=newpage(w,800); login(pg)
        pages=['partners.html','partners.html?filter=delayed','partner.html?id=p19','partner.html?id=p9','partner.html?id=p21','partner.html?id=p18']+['settings.html#'+t for t in ['holidays','rules','notify','ops','system','prereq']]+['dashboard.html']
        for n in pages:
            pg.goto(BASE+n); pg.evaluate('location.reload()'); pg.wait_for_timeout(600)
            pg.add_style_tag(content='body{overflow-x:visible!important}html{overflow-x:visible!important}')
            sw=pg.evaluate('document.documentElement.scrollWidth'); cw=pg.evaluate('document.documentElement.clientWidth')
            ok(f'no overflow {n} @{w}',sw<=cw,(sw,cw))
            nm=n.replace('.html','').replace('?filter=','_').replace('?id=','_').replace('#','_').replace('partner_','partner_')
            if n.startswith(('partners','partner.html?id=p19','settings')): pg.screenshot(path=os.path.join(SHOTS,f'{nm}_{w}.png'),full_page=True)
        ctx.close()
    b.close()
print('ERRS',errs); print('FAILS',[r[0] for r in res if not r[1]])
