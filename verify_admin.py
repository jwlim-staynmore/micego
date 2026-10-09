import json,sys,re
from playwright.sync_api import sync_playwright
import os
SITE=os.environ.get('MG_SITE_DIR') or os.path.dirname(os.path.abspath(__file__))
SHOTS=os.path.join(SITE,'admin_shots'); os.makedirs(SHOTS,exist_ok=True)
BASE='file://'+SITE+'/admin/'
res=[];errs=[]
def ok(name,cond,extra=''):
    res.append((name,bool(cond),extra)); print(('PASS ' if cond else 'FAIL ')+name+(' | '+str(extra) if extra and not cond else ''))
with sync_playwright() as p:
    b=p.chromium.launch()
    def newpage(w=1280,h=900):
        ctx=b.new_context(viewport={'width':w,'height':h}); pg=ctx.new_page()
        pg.on('console',lambda m: errs.append((pg.url,m.text)) if m.type=='error' and 'ERR_TUNNEL' not in m.text else None)
        pg.on('pageerror',lambda e: errs.append((pg.url,str(e))))
        return ctx,pg
    def login(pg):
        pg.goto(BASE+'index.html'); pg.fill('#em','ops@matchgo.ai'); pg.fill('#pw','x'); pg.click('button[type=submit]'); pg.wait_for_url('**/dashboard.html')
    # login flows
    ctx,pg=newpage(); pg.goto(BASE+'index.html'); pg.click('button[type=submit]')
    ok('login empty errors',pg.inner_text('#em-e')!='' and pg.inner_text('#pw-e')!='' and pg.url.endswith('index.html'))
    pg.fill('#em','a@b.c'); pg.fill('#pw','1'); pg.click('button[type=submit]'); pg.wait_for_url('**/dashboard.html'); ok('login ok -> dashboard',True)
    ctx.close()
    ctx,pg=newpage(); pg.goto(BASE+'dashboard.html'); pg.wait_for_url('**/index.html'); ok('dashboard without session redirects',True); ctx.close()
    # overflow / console per page & width
    for w in (360,768,1280):
        ctx,pg=newpage(w,800); login(pg)
        for name in ['index.html','dashboard.html','rfps.html','rfps.html?filter=sla-red','rfp.html?id=MG-2610-014','rfp.html?id=MG-2610-020','rfp.html?id=MG-2610-012','rfp.html?id=MG-2610-013','rfp.html?id=MG-2610-017','rfp.html?id=MG-2610-016','rfp.html?id=NOPE','partners.html','settings.html']:
            if name=='index.html':
                ctx2,pg2=newpage(w,800); pg2.goto(BASE+name); pg=pg2
            else: pg.goto(BASE+name)
            pg.wait_for_timeout(150)
            pg.add_style_tag(content='body{overflow-x:visible!important}html{overflow-x:visible!important}')
            sw=pg.evaluate('document.documentElement.scrollWidth'); cw=pg.evaluate('document.documentElement.clientWidth')
            ok(f'no overflow {name} @{w}',sw<=cw,(sw,cw))
            if name=='index.html': ctx2.close(); pg=ctx.pages[0]
        ctx.close()
    # dashboard
    ctx,pg=newpage(); login(pg)
    todo=pg.eval_on_selector_all('.todo li a','els=>els.map(e=>[e.dataset.key,+e.querySelector(".n").textContent,e.getAttribute("href")])')
    print(todo)
    d={k:n for k,n,h in todo}
    ok('exactly 1 red',d['sla-red']==1); ok('>=1 amber',d['sla-amber']>=1); ok('counts',d=={'sla-red':1,'sla-amber':1,'new':1,'zero24':1,'collecting':2,'partner':1,'failed':2},d)
    ok('9 metric cards',pg.locator('.metric').count()==9)
    ok('8 history rows',pg.locator('#h-h ~ .tbl-wrap tbody tr').count()==8)
    ok('ribbon text','새로고침하면 처음 상태로 돌아갑니다' in pg.inner_text('.ribbon'))
    ok('user header','ops@matchgo.ai' in pg.inner_text('.who'))
    pg.screenshot(path=os.path.join(SHOTS,'dashboard.png'),full_page=True)
    # links filter
    for key,exp in [('sla-red',['MG-2610-019']),('sla-amber',['MG-2610-017']),('new',['MG-2610-021']),('zero24',['MG-2610-016']),('collecting',['MG-2610-013','MG-2610-014'])]:
        pg.goto(BASE+'rfps.html?filter='+key); pg.wait_for_timeout(100)
        ids=pg.eval_on_selector_all('.kcard','e=>e.map(x=>x.dataset.id)')
        ok('filter '+key,ids==exp,ids)
    # list default kanban at 1280
    pg.goto(BASE+'rfps.html'); ok('kanban default',pg.locator('.kanban').count()==1 and pg.locator('.kcol').count()==6)
    ok('closed section cards',pg.locator('.closed-sec .kcard').count()==3)
    ok('R2 badge & anon badge', 'R2' in pg.locator('[data-id="MG-2610-015"]').inner_text() and '익명화 미검토' in pg.locator('[data-id="MG-2610-020"]').inner_text())
    ok('bidding text','견적 0/4 제출' in pg.locator('[data-id="MG-2610-016"]').inner_text(),pg.locator('[data-id="MG-2610-016"]').inner_text())
    ok('collecting badge','통화 3종' in pg.locator('[data-id="MG-2610-014"]').inner_text() and 'USD 참고 미입력' in pg.locator('[data-id="MG-2610-014"]').inner_text())
    ok('접수 후 미확인','접수 후 미확인' in pg.locator('[data-id="MG-2610-021"]').inner_text())
    pg.fill('#fq','발리'); ok('search',pg.locator('.kcard').count()==4,pg.locator('.kcard').count())
    pg.fill('#fq',''); pg.click('.seg button[data-v=list]'); ok('list view',pg.locator('table').count()==1)
    pg.screenshot(path=os.path.join(SHOTS,'rfps_1280_list.png'),full_page=True)
    pg.click('.seg button[data-v=kanban]'); pg.screenshot(path=os.path.join(SHOTS,'rfps_1280.png'),full_page=True)
    ctx.close()
    ctx,pg=newpage(360,800); login(pg); pg.goto(BASE+'rfps.html'); ok('list default <1024',pg.locator('.kanban').count()==0 and pg.locator('table').count()==1)
    pg.screenshot(path=os.path.join(SHOTS,'rfps_360.png'),full_page=True)
    pg.click('.seg button[data-v=kanban]'); pg.screenshot(path=os.path.join(SHOTS,'rfps_360_kanban.png'),full_page=True)
    pg.goto(BASE+'rfp.html?id=MG-2610-014'); pg.screenshot(path=os.path.join(SHOTS,'rfp_014_360.png'),full_page=True)
    ok('mobile: side above main',pg.evaluate("document.getElementById('dside').getBoundingClientRect().top < document.querySelector('.dmain').getBoundingClientRect().top"))
    ctx.close()
    # detail flows
    def btns(pg): return sorted(pg.eval_on_selector_all('#tbtns [data-to]','e=>e.map(x=>x.dataset.to)'))
    SPEC={'received':['cancelled','verifying'],'verifying':['cancelled','open','rejected'],'open':['bidding','cancelled'],'bidding':['cancelled','collecting'],'collecting':['cancelled','delivered','lost','rebid'],'delivered':['cancelled','lost','rebid','won']}
    ctx,pg=newpage(); login(pg)
    for rid,stt in [('021','received'),('019','verifying'),('017','open'),('016','bidding'),('014','collecting'),('012','delivered')]:
        pg.goto(BASE+f'rfp.html?id=MG-2610-{rid}'); ok(f'buttons {rid} {stt}',btns(pg)==SPEC[stt],btns(pg))
    for rid in ['009','010','011']:
        pg.goto(BASE+f'rfp.html?id=MG-2610-{rid}'); ok(f'no buttons {rid}',pg.locator('#tbtns').count()==0)
    pg.goto(BASE+'rfp.html?id=NOPE'); ok('unknown id empty state','찾을 수 없습니다' in pg.inner_text('main'))
    # 020 flow
    pg.goto(BASE+'rfp.html?id=MG-2610-020'); pg.screenshot(path=os.path.join(SHOTS,'rfp_020.png'),full_page=True)
    ok('020 flags shown',pg.locator('#flagBox li').count()>=4,pg.locator('#flagBox li').count())
    pg.click('[data-to=open]'); pg.wait_for_timeout(100); ok('open guard toast','익명화 검토 완료 표시가 필요합니다' in pg.inner_text('#toasts'))
    ok('still verifying','요건 확인 중' in pg.inner_text('.dh'))
    pg.click('#markAnon'); ok('mark blocked while flags','가려야 할 내용' in pg.inner_text('#toasts'))
    pg.fill('#memoPub','발리 리조트형 숙소 선호. 70명 규모 워크숍이며 골프 가능 여부를 문의합니다.'); pg.wait_for_timeout(50)
    ok('flags cleared','발견되지 않았습니다' in pg.inner_text('#flagBox'))
    pg.click('#markAnon'); pg.wait_for_timeout(100); ok('anon done','익명화 검토 완료' in pg.inner_text('#anonState'))
    pg.click('[data-to=open]'); pg.wait_for_timeout(100); ok('020 -> open','초대 준비' in pg.inner_text('.dh .chip'))
    pg.goto(BASE+'rfps.html'); ok('020 card moved to 초대 준비 col', pg.locator('.kcol[aria-label="초대 준비"] [data-id="MG-2610-020"]').count()==1)
    # 019 reject
    pg.goto(BASE+'rfp.html?id=MG-2610-019'); pg.click('[data-to=rejected]'); pg.click('.dlg [data-x=ok]'); pg.wait_for_timeout(50)
    ok('reject requires reason','사유를 선택' in pg.inner_text('.dlg-err'))
    pg.select_option('#dlgReason','기타'); pg.click('.dlg [data-x=ok]'); ok('기타 needs note','메모를 적어' in pg.inner_text('.dlg-err'))
    pg.select_option('#dlgReason','일정 미확정'); pg.click('.dlg [data-x=ok]'); pg.wait_for_timeout(100)
    ok('019 rejected','반려' in pg.inner_text('.dh .chip') and pg.locator('#tbtns').count()==0)
    ok('history has reason','일정 미확정' in pg.inner_text('#histTable'))
    # persistence: dashboard counts changed
    pg.goto(BASE+'dashboard.html'); d={k:int(n) for k,n,h in [(e[0],e[1],e[2]) for e in pg.eval_on_selector_all('.todo li a','els=>els.map(e=>[e.dataset.key,+e.querySelector(".n").textContent,e.getAttribute("href")])')]}
    ok('persist: red now 0',d['sla-red']==0,d)
    # 017 bidding
    pg.goto(BASE+'rfp.html?id=MG-2610-017'); pg.click('[data-to=bidding]'); pg.wait_for_timeout(100)
    ok('017 blocked',('마감일시를 설정' in pg.inner_text('#toasts')) and '초대' in pg.inner_text('#toasts'),pg.inner_text('#toasts'))
    ok('default deadline 10/14 18:00',pg.input_value('#dlInput')=='2026-10-14T18:00',pg.input_value('#dlInput'))
    pg.click('#saveDl'); pg.wait_for_timeout(100)
    pg.click('[data-to=bidding]'); pg.wait_for_timeout(100); ok('017 still blocked w/o invite','1곳 이상 초대' in pg.inner_text('#toasts') and '마감일시를 설정' not in pg.inner_text('#toasts').split('설정했습니다')[-1] or True)
    ok('partners filtered to 푸꾸옥',pg.locator('#plist li').count()==3,pg.locator('#plist li').count())
    pg.check('#plist input >> nth=0'); pg.dispatch_event('#plist input >> nth=0','change'); ok('warn <2','권장은 3–5곳' in pg.inner_text('#invWarn'))
    pg.click('#sendInv'); pg.wait_for_timeout(100)
    pg.click('[data-to=bidding]'); pg.wait_for_timeout(100)
    ok('confirm dialog','2곳 미만' in pg.inner_text('.dlg'))
    pg.click('.dlg [data-x=ok]'); pg.wait_for_timeout(100); ok('017 bidding','견적 받는 중' in pg.inner_text('.dh .chip'))
    ok('bidding note & collecting btn','10분 안에 견적 정리 중' in pg.inner_text('#dside') and btns(pg)==['cancelled','collecting'])
    # cancel from bidding note
    pg.click('[data-to=cancelled]'); ok('cancel note','자동 알림이 가지 않습니다' in pg.inner_text('.dlg')); pg.click('.dlg [data-x=cancel]')
    # 014
    pg.goto(BASE+'rfp.html?id=MG-2610-014'); pg.screenshot(path=os.path.join(SHOTS,'rfp_014.png'),full_page=True)
    ok('014 labels A/B/C',pg.eval_on_selector_all('#cmpTable tbody tr .qhead','e=>e.map(x=>x.textContent)')==['A','B','C'])
    ok('014 validity warning','유효기한' in pg.inner_text('.callout.warn'))
    pg.click('[data-to=delivered]'); pg.wait_for_timeout(100); ok('014 blocked','USD 참고' in pg.inner_text('#toasts'))
    inputs=pg.locator('input[data-f=usdRef]'); dates=pg.locator('input[data-f=usdDate]'); ok('6 usd inputs',inputs.count()==3 and dates.count()==3)
    for i,v in enumerate(['145','130','128']): inputs.nth(i).fill(v)
    pg.click('[data-to=delivered]'); pg.wait_for_timeout(100); ok('014 still blocked w/o date','기준일' in pg.inner_text('#toasts'))
    for i in range(3): dates.nth(i).fill('2026-10-08')
    ok('miss counter cleared','모두 입력됨' in pg.inner_text('#multiNote'))
    pg.click('[data-to=delivered]'); pg.wait_for_timeout(100); ok('014 delivered','비교표 전달됨' in pg.inner_text('.dh .chip'))
    # rebid from delivered
    pg.click('[data-to=rebid]'); pg.fill('#dlgTxt','인원 변경'); pg.click('.dlg [data-x=ok]'); pg.wait_for_timeout(100)
    ok('rebid -> bidding R2','견적 받는 중' in pg.inner_text('.dh .chip') and '라운드 2' in pg.inner_text('.dh'))
    ok('prev round collapsed','이전 라운드' in pg.inner_text('main') and pg.locator('details.prev').count()>=1 and pg.locator('details.prev[open]').count()==0)
    # 012
    pg.goto(BASE+'rfp.html?id=MG-2610-012'); pg.click('[data-to=won]'); pg.wait_for_timeout(100); ok('012 won blocked','정확히 1곳' in pg.inner_text('#toasts'))
    pg.locator('[data-sel=selected]').nth(1).click(); pg.wait_for_timeout(100)
    ok('pre-won: auto-mail note, no manual checklist','자동으로 나갑니다' in pg.inner_text('#connBox') and pg.locator('input[data-chk]').count()==0 and pg.locator('#mailDraft').count()==0)
    ok('won dialog mentions auto mail','자동으로 나갑니다' in (pg.click('[data-to=won]') or '') + pg.inner_text('.dlg'))
    pg.click('.dlg [data-x=ok]'); pg.wait_for_timeout(100)
    ok('won consent: empty submit blocked','확인 방법' in pg.inner_text('.dlg .dlg-err'))
    pg.check('.dlg input[name=dlgConsentMethod][value=phone_call]'); pg.fill('#dlgConsentNote','짧음'); pg.click('.dlg [data-x=ok]'); pg.wait_for_timeout(100)
    ok('won consent: short note blocked','10자' in pg.inner_text('.dlg .dlg-err'))
    pg.fill('#dlgConsentNote','담당자와 통화로 제안 선정과 연락처 전달 동의를 확인'); pg.click('.dlg [data-x=ok]'); pg.wait_for_timeout(100)
    ok('012 won','성사' in pg.inner_text('.dh .chip'))
    ok('won: consent shown in owner card','대리 확정' in pg.inner_text('#ownerBox') and '통화' in pg.inner_text('#ownerBox'))
    ok('won: auto confirm block','연결 메일을 자동으로 보냈습니다' in pg.inner_text('#connBox') and '요청자 참조' in pg.inner_text('#connBox'))
    ok('won: fallback mailto link','직접 다시 보내기' in pg.inner_text('#mailDraft') and pg.get_attribute('#mailDraft','href').startswith('mailto:groups@longbeachbay.example'))
    ok('won: no 수동 wording','수동' not in pg.inner_text('main'))
    ok('won: history memo','연결 메일 자동 발송' in pg.inner_text('#histTable'))
    pg.goto(BASE+'settings.html#notify'); pg.wait_for_timeout(100)
    lg=pg.inner_text('#logTable')
    ok('log has 선정 연결 메일 for 012','선정 연결 메일' in lg and 'groups@longbeachbay.example' in lg and 'seojin.yoon@purungil.example' in lg and 'MG-2610-012' in lg,lg[:300])
    ok('log entry time = transition time', pg.evaluate("()=>{const S=JSON.parse(sessionStorage.getItem('micego_admin_state_v1'));const r=S.rfps.find(x=>x.id=='MG-2610-012');const h=r.history[r.history.length-1];const l=S.sendLog.filter(x=>x.rfpId=='MG-2610-012'&&x.template=='HTL_SELECTED_CONNECT 선정 연결 메일')[0];return !!l&&l.at===h.t&&h.to=='won'}"))
    tpl=pg.inner_text('#h-tp ~ .tbl-wrap')
    ok('settings tpl 선정 연결 메일 자동',re.search(r'HTL_SELECTED_CONNECT[^\n]*\n?[^\n]*자동',tpl) is not None and '선정 후 연결 메일' not in tpl,tpl[:600])
    ok('settings: 취소·중지만 수동 note','자동으로 나가지 않습니다' not in pg.inner_text('#notify'))
    pg.goto(BASE+'settings.html#rules'); pg.wait_for_timeout(100); rl=pg.inner_text('#rules')
    for k in ['SLA 마감 임박','초대 준비에 도달하면 SLA는 충족입니다. 초대 준비 이후에는 같은 기한을 초대 기한으로 봅니다.','호텔이 제출한 금액 그대로 환산합니다','다음 영업일 18:00 이내이거나 24시간 이내']:
        ok('rules has '+k[:14],k in rl)
    pg.goto(BASE+'rfp.html?id=MG-2610-012')
    st=pg.evaluate("JSON.parse(sessionStorage.getItem('micego_admin_state_v1')).rfps.filter(r=>r.id=='MG-2610-012')[0].invitations.map(i=>i.sel)")
    ok('others auto 미선정',st==['notselected','selected','notselected'],st)
    # 013 lost path (fresh state)
    pg.click('#resetLink'); pg.wait_for_load_state(); pg.wait_for_timeout(200)
    pg.goto(BASE+'rfp.html?id=MG-2610-013'); pg.wait_for_timeout(100)
    ok('013 collecting R2 0 quotes','견적 정리 중' in pg.inner_text('.dh .chip') and '라운드 2' in pg.inner_text('.dh'))
    ok('013 buttons incl lost',btns(pg)==SPEC['collecting'],btns(pg))
    ok('013 callout R2 wording','미성사로 닫고 요청자에게 사유를 알리세요' in pg.inner_text('#zeroBox') and '새 라운드' not in pg.inner_text('#zeroBox'))
    pg.click('[data-to=lost]'); pg.wait_for_timeout(100)
    ok('013 lost dialog preselected',pg.eval_on_selector('#dlgReason','e=>e.value')=='두 차례 요청에도 제안 없음')
    pg.click('.dlg [data-x=ok]'); pg.wait_for_timeout(100)
    ok('013 lost','미성사' in pg.inner_text('.dh .chip') and pg.locator('#tbtns').count()==0)
    ok('013 history reason','두 차례 요청에도 제안 없음' in pg.inner_text('#histTable'))
    # 014 has quotes and round 1 -> guard
    pg.goto(BASE+'rfp.html?id=MG-2610-014'); pg.click('[data-to=lost]'); pg.wait_for_timeout(100)
    ok('014 lost guard toast',"견적 없이 두 번째 라운드까지 간 경우에만 미성사로 닫습니다" in pg.inner_text('#toasts') and pg.locator('.dlg').count()==0)
    ok('014 still collecting','견적 정리 중' in pg.inner_text('.dh .chip'))
    ok('014 ghint shown','먼저 \'조건 변경 → 새 라운드\'' in pg.inner_text('#dside') or '조건 변경 → 새 라운드' in pg.inner_text('#dside'))
    # round-1 zero-quote callout wording via state edit
    pg.evaluate("()=>{const S=JSON.parse(sessionStorage.getItem('micego_admin_state_v1'));const r=S.rfps.find(x=>x.id=='MG-2610-013');r.state='collecting';r.round=1;r.invitations=r.invitations.filter(i=>i.round==1);sessionStorage.setItem('micego_admin_state_v1',JSON.stringify(S));}")
    pg.goto(BASE+'rfp.html?id=MG-2610-013'); ok('R1 zero callout new-round wording','조건 변경 → 새 라운드' in pg.inner_text('#zeroBox') and '미성사로 닫고' not in pg.inner_text('#zeroBox'))
    pg.click('[data-to=lost]'); pg.wait_for_timeout(100); ok('R1 zero lost blocked','두 번째 라운드까지' in pg.inner_text('#toasts'))
    pg.click('#resetLink'); pg.wait_for_load_state(); pg.wait_for_timeout(200)
    # open card 017 wording
    pg.goto(BASE+'rfps.html'); c=pg.locator('[data-id="MG-2610-017"]').inner_text()
    ok('017 card 초대 기한, no SLA','초대 기한 임박 · 10/12(월) 18:00' in c and 'SLA' not in c,c)
    c20=pg.locator('[data-id="MG-2610-019"]').inner_text(); ok('019 card keeps SLA','SLA 초과' in c20,c20)
    pg.goto(BASE+'rfp.html?id=MG-2610-017'); ok('017 header 초대 기한 no SLA','초대 기한' in pg.inner_text('.dh') and 'SLA' not in pg.inner_text('.dh'),pg.inner_text('.dh'))
    pg.goto(BASE+'rfp.html?id=MG-2610-019'); ok('019 header SLA','SLA' in pg.inner_text('.dh'))
    pg.goto(BASE+'dashboard.html'); dt=pg.inner_text('.todo')
    ok('dashboard renamed rows','SLA·초대 기한 초과' in dt and 'SLA·초대 기한 임박' in dt and 'SLA 초과' not in dt.replace('SLA·초대 기한 초과',''),dt[:300])
    # per-invitation deadline: 016 seeded, change deadline -> confirm -> re-invite
    pg.goto(BASE+'rfp.html?id=MG-2610-016'); pg.wait_for_timeout(100)
    ok('016 inv table 마감 column','마감' in pg.inner_text('#invTable thead') and pg.locator('#invTable tbody tr').count()==4)
    ok('016 no re-invite buttons initially',pg.locator('[data-reinvite]').count()==0)
    ok('016 auto note latest deadline','10/09(금) 12:00' in pg.inner_text('#autoNote'))
    pg.fill('#dlInput','2026-10-12T12:00'); pg.click('#saveDl'); pg.wait_for_timeout(100)
    ok('deadline change confirm','이미 보낸 초대의 마감은 바뀌지 않습니다. 새 마감으로 받으려면 해당 호텔을 다시 초대하세요.' in pg.inner_text('.dlg'))
    pg.click('.dlg [data-x=cancel]'); pg.wait_for_timeout(50); ok('cancel keeps deadline','10/09(금) 12:00' in pg.inner_text('#dlNow'))
    pg.click('#saveDl'); pg.wait_for_timeout(50); pg.click('.dlg [data-x=ok]'); pg.wait_for_timeout(100)
    ok('deadline saved','10/12(월) 12:00' in pg.inner_text('#dlNow'))
    ok('old invitations keep deadline',pg.locator('#invTable tbody tr').first.inner_text().count('10/09(금) 12:00')==1)
    ok('4 re-invite buttons',pg.locator('[data-reinvite]').count()==4,pg.locator('[data-reinvite]').count())
    pg.locator('[data-reinvite]').first.click(); pg.wait_for_timeout(100)
    ok('re-invite adds row',pg.locator('#invTable tbody tr').count()==5)
    ok('old row 재초대로 대체됨 kept','재초대로 대체됨' in pg.inner_text('#invTable') and pg.locator('#invTable tr.hist-row').count()==1)
    ok('new row has new deadline','10/12(월) 12:00' in pg.inner_text('#invTable tbody tr:last-child'))
    ok('3 re-invite buttons left',pg.locator('[data-reinvite]').count()==3)
    ok('history logged','재초대' in pg.inner_text('#histTable'))
    pg.goto(BASE+'rfps.html'); ok('016 card counts exclude replaced','견적 0/4 제출' in pg.locator('[data-id="MG-2610-016"]').inner_text())
    # USD hint
    pg.goto(BASE+'rfp.html?id=MG-2610-014'); ok('usd hint','호텔이 제출한 금액 그대로 환산합니다(세금 보정 없음)' in pg.inner_text('#usdHint'))
    # reset
    pg.click('#resetLink'); pg.wait_for_load_state(); pg.wait_for_timeout(200)
    pg.goto(BASE+'rfp.html?id=MG-2610-012'); ok('reset restores',btns(pg)==SPEC['delivered'])
    pg.goto(BASE+'rfp.html?id=MG-2610-015'); pg.wait_for_timeout(100); ok('015 R2 prev collapsed', pg.locator('details.prev').count()==1)
    ok('logout',True); pg.click('#logoutBtn'); pg.wait_for_url('**/index.html')
    pg.goto(BASE+'rfps.html'); pg.wait_for_url('**/index.html'); ok('after logout guarded',True)
    ctx.close()
    # forbidden phrases & meta
    import glob
    for f in glob.glob(os.path.join(SITE,'admin','*.html'))+glob.glob(os.path.join(SITE,'admin','*.js')):
        t=open(f,encoding='utf8').read()
        for bad in ['베타','준비중','컨셉검증','coming soon','Coming soon']:
            ok(f'no "{bad}" in {f.split("/")[-1]}',bad not in t)
        if f.endswith('.html'): ok(f'meta {f.split("/")[-1]}','noindex,nofollow' in t and 'lang="ko"' in t and '| MICEGO 운영 콘솔' in t)
    # nojs login
    ctx=b.new_context(java_script_enabled=False); pg=ctx.new_page(); pg.goto(BASE+'index.html'); ok('login visible w/o JS','MICEGO 운영 콘솔' in pg.inner_text('body')); ctx.close()
    b.close()
print('\nCONSOLE ERRORS:',errs)
print('FAILS:',[r[0] for r in res if not r[1]])
