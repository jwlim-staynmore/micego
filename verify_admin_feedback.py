from playwright.sync_api import sync_playwright
import os
SITE=os.environ.get('MG_SITE_DIR') or os.path.dirname(os.path.abspath(__file__))
SHOTS=os.path.join(SITE,'admin_shots'); os.makedirs(SHOTS,exist_ok=True)
BASE='file://'+SITE+'/admin/'
res=[]; errs=[]
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
    def ids(pg): return pg.eval_on_selector_all('.fb-table tbody tr[data-id]','e=>e.map(x=>x.dataset.id)')
    def qs(pg): return pg.evaluate('location.search')
    def dlg_ok(pg,reason=None,note=None):
        if reason: pg.select_option('#dlgReason',reason)
        if note is not None: pg.fill('#dlgNote',note)
        pg.click('.dlg [data-x=ok]'); pg.wait_for_timeout(120)

    # ---------- nav + list ----------
    ctx,pg=newpage(); login(pg)
    ok('nav has feedback entry',pg.locator('.side a[href="feedback.html"]').count()==1)
    ok('feedback badge = 5 (new, non-demo)',pg.inner_text('.side a[href="feedback.html"] .nav-badge')=='5',pg.inner_text('.side a[href="feedback.html"] .nav-badge'))
    pg.click('.side a[href="feedback.html"]'); pg.wait_for_url('**/feedback.html'); pg.wait_for_timeout(80)
    ok('default view hides demo, 9 open rows',sorted(ids(pg))==sorted(['fb1','fb2','fb3','fb4','fb5','fb6','fb7','fb8','fb11']),ids(pg))
    ok('default url has no query',qs(pg)=='')
    # status chip toggle -> url + rows change
    pg.click('#summary button[data-status="on_hold"]'); pg.wait_for_timeout(60)
    ok('toggle off on_hold: row gone',('fb8' not in ids(pg)))
    ok('toggle off on_hold: url has status=',  'status=' in qs(pg),qs(pg))
    pg.click('#summary button[data-status="on_hold"]'); pg.wait_for_timeout(60)
    ok('toggle on_hold back: fb8 returns',('fb8' in ids(pg)))
    # category filter
    pg.select_option('#fCat','SYS'); pg.wait_for_timeout(60)
    ok('category SYS filters to 5 rows',sorted(ids(pg))==sorted(['fb1','fb4','fb5','fb6','fb8']),ids(pg))
    ok('category filter in url','cat=SYS' in qs(pg))
    pg.select_option('#fCat',''); pg.wait_for_timeout(60)
    # assignee = me
    pg.select_option('#fAsg','me'); pg.wait_for_timeout(60)
    ok('assignee=me -> fb6 only',ids(pg)==['fb6'],ids(pg))
    pg.select_option('#fAsg',''); pg.wait_for_timeout(60)
    # flags
    pg.check('#fSuspect'); pg.wait_for_timeout(60); ok('suspect only -> fb4',ids(pg)==['fb4'],ids(pg)); pg.uncheck('#fSuspect'); pg.wait_for_timeout(60)
    pg.check('#fMailfail'); pg.wait_for_timeout(60); ok('mail failed only -> fb11',ids(pg)==['fb11'],ids(pg)); pg.uncheck('#fMailfail'); pg.wait_for_timeout(60)
    pg.check('#fHasemail'); pg.wait_for_timeout(60); ok('has reply email -> 7 rows',len(ids(pg))==7,ids(pg)); pg.uncheck('#fHasemail'); pg.wait_for_timeout(60)
    pg.check('#fDemo'); pg.wait_for_timeout(60); ok('demo included -> 10 rows',len(ids(pg))==10,ids(pg)); ok('demo url has demo=1','demo=1' in qs(pg)); pg.uncheck('#fDemo'); pg.wait_for_timeout(60)
    # search
    pg.fill('#fQ','MG-2610-014'); pg.wait_for_timeout(80)
    ok('search rfp_ref -> fb1 only',ids(pg)==['fb1'],ids(pg)); ok('search in url','q=MG-2610-014' in qs(pg))
    pg.fill('#fQ',''); pg.wait_for_timeout(80)
    # weekly preset
    pg.click('#weeklyBtn'); pg.wait_for_timeout(80)
    ok('weekly preset -> includes fb8','fb8' in ids(pg),ids(pg)); ok('weekly preset in url','preset=weekly' in qs(pg))
    pg.click('#weeklyBtn'); pg.wait_for_timeout(80)
    ok('weekly preset off -> back to 9',len(ids(pg))==9,ids(pg))
    # warn chip
    pg.click('#warns button[data-warn="mailfail"]'); pg.wait_for_timeout(80)
    ok('warn mailfail -> fb11 only',ids(pg)==['fb11'],ids(pg)); ok('warn in url','warn=mailfail' in qs(pg))
    pg.click('#warns button[data-warn="mailfail"]'); pg.wait_for_timeout(80)
    # sort toggle
    created_desc=pg.eval_on_selector_all('.fb-table tbody tr td:nth-child(1)','e=>e.map(x=>x.textContent.trim())')
    pg.click('th[data-sortcol="created"]'); pg.wait_for_timeout(80)
    created_asc=pg.eval_on_selector_all('.fb-table tbody tr td:nth-child(1)','e=>e.map(x=>x.textContent.trim())')
    ok('sort by created toggles order',created_desc!=created_asc,(created_desc,created_asc))
    ok('sort in url','sort=' in qs(pg))
    # responsive: no overflow at 360/768/1280, no console errors
    for w in (360,768,1280):
        pg.set_viewport_size({'width':w,'height':900}); pg.goto(BASE+'feedback.html'); pg.wait_for_timeout(150)
        sw=pg.evaluate('document.documentElement.scrollWidth'); cw=pg.evaluate('document.documentElement.clientWidth')
        ok(f'no overflow feedback.html @{w}',sw<=cw,(sw,cw))
    pg.screenshot(path=os.path.join(SHOTS,'feedback_360.png'),full_page=True) if False else None
    ctx.close()

    # screenshots: list @360, @1280
    for w,fn in [(360,'feedback_360.png'),(1280,'feedback_1280.png')]:
        ctx,pg=newpage(w,900); login(pg); pg.goto(BASE+'feedback.html'); pg.wait_for_timeout(200)
        pg.screenshot(path=os.path.join(SHOTS,fn),full_page=True); ctx.close()

    # ---------- detail: badges, mail, anonymized ----------
    ctx,pg=newpage(); login(pg)
    pg.goto(BASE+'feedback-detail.html?id=fb1'); pg.wait_for_timeout(150)
    ok('fb1 verified badge','일치' in pg.inner_text('#resolveBox'),pg.inner_text('#resolveBox'))
    pg.screenshot(path=os.path.join(SHOTS,'feedback_detail_fb1_1280.png'),full_page=True)
    pg.goto(BASE+'feedback-detail.html?id=fb7'); pg.wait_for_timeout(150)
    ok('fb7 mismatch','다릅니다' in pg.inner_text('#resolveBox'),pg.inner_text('#resolveBox'))
    pg.goto(BASE+'feedback-detail.html?id=fb2'); pg.wait_for_timeout(150)
    ok('fb2 token_only','후보' in pg.inner_text('#resolveBox'),pg.inner_text('#resolveBox'))
    pg.goto(BASE+'feedback-detail.html?id=fb11'); pg.wait_for_timeout(150)
    ok('fb11 mail failed shown','실패' in pg.inner_text('#mailBox'),pg.inner_text('#mailBox'))
    ok('fb11 retry button present',pg.locator('#mailBox [data-mailretry]').count()>0)
    pg.goto(BASE+'feedback-detail.html?id=fb13'); pg.wait_for_timeout(150)
    ok('fb13 anonymized notice','익명화' in pg.inner_text('main'))
    ctx.close()

    # ---------- guard: new -> triaged disabled until P+subcode set ----------
    ctx,pg=newpage(); login(pg); pg.goto(BASE+'feedback-detail.html?id=fb4'); pg.wait_for_timeout(150)
    ok('fb4 triaged button disabled initially',pg.is_disabled('[data-to="triaged"]'))
    pg.click('#pGrid [data-p="2"]'); pg.wait_for_timeout(150)
    ok('fb4 still disabled (no subcode)',pg.is_disabled('[data-to="triaged"]'))
    pg.select_option('#subSel','BUG'); pg.wait_for_timeout(150)
    ok('fb4 enabled once P+subcode set',not pg.is_disabled('[data-to="triaged"]'))
    evN=pg.locator('#timeline li').count()
    pg.click('[data-to="triaged"]'); pg.wait_for_timeout(150)
    ok('fb4 now triaged','분류됨' in pg.inner_text('.dh .chip'))
    ok('fb4 transition appended to timeline',pg.locator('#timeline li').count()>evN)
    ctx.close()

    # ---------- hold requires note ----------
    ctx,pg=newpage(); login(pg); pg.goto(BASE+'feedback-detail.html?id=fb5'); pg.wait_for_timeout(150)
    pg.click('[data-to="on_hold"]'); pg.click('.dlg [data-x=ok]'); pg.wait_for_timeout(80)
    ok('hold needs note','적어 주세요' in pg.inner_text('.dlg-err'),pg.inner_text('.dlg-err'))
    pg.fill('#dlgTxt','요청자 회신 대기'); pg.click('.dlg [data-x=ok]'); pg.wait_for_timeout(120)
    ok('fb5 on_hold now','보류' in pg.inner_text('.dh .chip'))
    ctx.close()

    # ---------- done requires resolution; new->done restricted set ----------
    ctx,pg=newpage(); login(pg); pg.goto(BASE+'feedback-detail.html?id=fb6'); pg.wait_for_timeout(150)
    pg.click('[data-to="done"]')
    opts=pg.eval_on_selector_all('#dlgReason option','e=>e.map(x=>x.textContent.trim())')
    ok('fb6 (in_progress) done offers full resolution set',all(k in opts for k in ['수정함','답변함','수정 안 함','중복 접수','스팸','조치 없음']),opts)
    pg.click('.dlg [data-x=ok]'); pg.wait_for_timeout(80)
    ok('done needs resolution','선택' in pg.inner_text('.dlg-err'),pg.inner_text('.dlg-err'))
    dlg_ok(pg,'수정함')
    ok('fb6 done now','완료' in pg.inner_text('.dh .chip'))
    ctx.close()

    ctx,pg=newpage(); login(pg); pg.goto(BASE+'feedback-detail.html?id=fb3'); pg.wait_for_timeout(150)
    pg.click('[data-to="done"]')
    opts2=pg.eval_on_selector_all('#dlgReason option','e=>e.map(x=>x.textContent.trim())')
    opts2=[o for o in opts2 if o!='사유를 선택하세요']
    ok('fb3 (new) 바로 종료 offers only spam/duplicate/no_action',sorted(opts2)==sorted(['스팸','중복 접수','조치 없음']),opts2)
    dlg_ok(pg,'스팸')
    ok('fb3 done via 바로 종료','완료' in pg.inner_text('.dh .chip'))
    ctx.close()

    # ---------- reopen requires note ----------
    ctx,pg=newpage(); login(pg); pg.goto(BASE+'feedback-detail.html?id=fb10'); pg.wait_for_timeout(150)
    ok('fb10 done actions = reopen only',pg.eval_on_selector_all('#tbtns [data-to]','e=>e.map(x=>x.dataset.to)')==['in_progress'])
    pg.click('[data-to="in_progress"]'); pg.click('.dlg [data-x=ok]'); pg.wait_for_timeout(80)
    ok('reopen needs note','적어 주세요' in pg.inner_text('.dlg-err'),pg.inner_text('.dlg-err'))
    pg.fill('#dlgTxt','요청자가 추가 문의를 다시 보냄'); pg.click('.dlg [data-x=ok]'); pg.wait_for_timeout(120)
    ok('fb10 reopened to in_progress','처리 중' in pg.inner_text('.dh .chip'))
    ctx.close()

    # ---------- note add ----------
    ctx,pg=newpage(); login(pg); pg.goto(BASE+'feedback-detail.html?id=fb2'); pg.wait_for_timeout(150)
    ok('fb2 timeline starts empty','기록이 없습니다' in pg.inner_text('#timeline'))
    pg.click('#addNoteBtn'); pg.wait_for_timeout(60)
    ok('note add needs content','입력해' in toast(pg),toast(pg))
    pg.fill('#noteIn','호텔 담당자에게 재현 방법 문의함'); pg.click('#addNoteBtn'); pg.wait_for_timeout(120)
    ok('note appears in timeline','재현 방법 문의함' in pg.inner_text('#timeline'))
    ok('empty placeholder gone after note','기록이 없습니다' not in pg.inner_text('#timeline'))
    ctx.close()

    b.close()
print('ERRS',errs)
print('FAILS',[r[0] for r in res if not r[1]])
