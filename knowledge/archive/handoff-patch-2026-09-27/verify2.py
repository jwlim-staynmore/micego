import re, os, glob, json
from playwright.sync_api import sync_playwright
pages=['index.html','ko/index.html','ko/privacy.html','ko/about.html','ko/faq.html','ko/contact.html','ko/track.html','en/index.html','en/sample-request.html','en/privacy.html','en/faq.html','en/contact.html','en/bid.html']
root=os.getcwd()
fails=[]
def F(m): fails.append(m); print('FAIL',m)
# static checks
txt={p:open(p,encoding='utf-8').read() for p in pages}
for p,t in txt.items():
    nc=re.sub(r'<!--.*?-->','',t,flags=re.S)
    for m in re.finditer(r'href="([^"#]*(?:\?[^"#]*)?)(#[^"]*)?"',nc):
        h,fr=m.group(1).split('?')[0],m.group(2)
        if not h or h.startswith(('mailto:','http','javascript','data:')): 
            continue
        if h.endswith('/'): F(f'{p}: dir href {h}')
        tgt=os.path.normpath(os.path.join(os.path.dirname(p),h))
        if not os.path.exists(tgt): F(f'{p}: missing {h}'); continue
        if fr and fr!='#':
            if f'id="{fr[1:]}"' not in txt.get(tgt,open(tgt,encoding='utf-8').read()): F(f'{p}: missing anchor {h}{fr}')
    for m in re.finditer(r'href="(#[^"]+)"',nc):
        if f'id="{m.group(1)[1:]}"' not in nc: F(f'{p}: local anchor {m.group(1)}')
    if re.search(r'컨셉검증|베타|준비중|사전등록|coming soon|pre-regist|\bbeta\b',nc,re.I): F(f'{p}: forbidden phrase')
    if 'hello@micego.kr' in nc: F(f'{p}: hello@')
    for m in re.finditer(r'mailto:([^"?]+)',re.sub(r'<script.*?</script>','',nc,flags=re.S)):
        if m.group(1)!='mysteri1984@gmail.com': F(f'{p}: mailto {m.group(1)}')
    if re.search(r'Aug 2026|Nov 2026|BID_DEADLINE',nc) : F(f'{p}: dated')
h=re.sub(r'<!--.*?-->','',txt['index.html'],flags=re.S)
body=re.search(r'<main.*?</main>',h,re.S).group(0)
if re.search(r'무료|수수료|free|MatchGo',body,re.I): F('hub forbidden')
for p in ['en/index.html','en/sample-request.html','en/privacy.html','en/bid.html','en/faq.html','en/contact.html']:
    nc=re.sub(r'<!--.*?-->','',txt[p],flags=re.S)
    for m in re.finditer(r'free|commission',nc,re.I):
        ctx=nc[max(0,m.start()-30):m.end()+20]
        if 'Free cancellation' not in ctx and 'listing fee' not in nc[max(0,m.start()-60):m.end()+40].lower(): print('note',p,ctx.replace('\n',' '))
        if p in ('en/bid.html','en/faq.html','en/contact.html') and re.search(r'free of charge|commission|forever|always free',nc,re.I): F(p+': forbidden commercial phrase')
for p in ('en/bid.html','ko/track.html'):
    if 'noindex,nofollow' not in txt[p] or 'no-referrer' not in txt[p]: F(p+': noindex/referrer')
for p in pages:
    if p not in ('en/bid.html','ko/track.html') and 'noindex' in txt[p] and p!='en/sample-request.html': F(p+': unexpected noindex')
apps={p:re.search(r'/\* ===== App: components.*?/\* ===== /App ===== \*/',t,re.S).group(0) for p,t in txt.items() if 'App: components' in t}
if len(set(apps.values()))!=1: F('App block differs')
if len(apps)!=9: F('App block pages %d'%len(apps))  # 7 → 9 (2026-09-27): ko/privacy·en/privacy 가 legal/*.json 전문 렌더링(App CSS 사용)으로 바뀜
from urllib.parse import quote
if os.path.exists('ko/compare.html'): F('stale compare.html')
FORBID=[r'예비',r'동의하신 경우에만',r'backup',r'ref-krw',r'≈\s*[\d,]+\s*원',r'12:00 KST',r'compare\.html',r'Notes from organizer',r'No minimum property size',r"Ignore the ones"]
for p,t in txt.items():
    nc=re.sub(r'<!--.*?-->','',t,flags=re.S)
    for pat in FORBID:
        if re.search(pat,nc): F(f'{p}: forbidden {pat}')
tr=txt['ko/track.html']
if '<form' in tr or 'type="checkbox"' in tr or 'consent' in tr: F('track has form/consent')
if len(re.findall(r'<a [^>]*data-pick="[ABC]"',tr))!=3: F('pick links')
for i in 'ABC':
    if 'subject='+quote('[MICEGO 제안 선택] MG-2610-014 · 제안 '+i) not in tr: F('pick subject '+i)
if 'Thu 8 Oct 2026, 18:00 KST' not in txt['en/bid.html'] or '2026-10-08(목) 18:00 KST' not in tr: F('deadline 18:00')
app0=list(apps.values())[0]
for st in ['open','submitted','declined','expired','cancelled','invalid','received','verifying','rejected','bidding','rebid','collecting','delivered','won','lost']:
    if f'html[data-state="{st}"] [data-states~="{st}"]' not in app0: F('state css '+st)
# shared block equality
blocks={p:re.search(r'/\* ===== Shared: header additions.*?/\* ===== /Shared ===== \*/',t,re.S).group(0) for p,t in txt.items()}
if len(set(blocks.values()))!=1: F('shared block differs')
roots={p:re.sub(r'\s+','',re.search(r':root\{.*?\n\}',t,re.S).group(0)) for p,t in txt.items()}
if len(set(roots.values()))!=1: F('root differs')
for p,t in txt.items():
    exp='ko' if p.startswith('ko') or p=='index.html' else 'en'
    # WP-F2: ko/en contact.html carries an extra data-mgfb-launcher="off" attribute on <html> (the
    # feedback widget loads there for MICEGO_FB.submit but suppresses its floating launcher).
    if f'<html lang="{exp}">' not in t and f'<html lang="{exp}" data-mgfb-launcher="off">' not in t: F(f'{p}: lang')
with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome') if os.path.exists('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') else pw.chromium.launch()
    for js in (True,False):
        ctx=b.new_context(java_script_enabled=js,viewport={'width':360,'height':800})
        for p in pages:
            pg=ctx.new_page(); errs=[]
            pg.on('pageerror',lambda e:errs.append(str(e)))
            pg.goto('file://'+os.path.join(root,p)); pg.wait_for_timeout(300)
            for w in (360,390,768,1024,1280):
                pg.set_viewport_size({'width':w,'height':800}); pg.wait_for_timeout(50)
                ov=pg.evaluate("()=>{document.body.style.overflowX='visible';document.documentElement.style.overflowX='visible';const r=document.documentElement.scrollWidth-window.innerWidth;document.body.style.overflowX='';return r}")
                if ov>0: F(f'{p} js={js} w={w} overflow {ov}')
                ms=pg.evaluate("()=>[...document.querySelectorAll('.mode-switch a')].map(a=>{const r=a.getBoundingClientRect();return [r.width,r.height,r.right]})")
                if len(ms)!=2 or any(x[0]<44 or x[1]<44 or x[2]>w for x in ms): F(f'{p} js={js} w={w} switch {ms}')
                hd=pg.evaluate("()=>{const c=document.querySelector('.site-header .container');return [...c.children].map(e=>{const r=e.getBoundingClientRect();return [r.left,r.right]})}")
                if len(hd)>1 and hd[0][1]>hd[-1][0]+1: F(f'{p} js={js} w={w} header overlap {hd}')
            pg.set_viewport_size({'width':360,'height':800})
            if not js:
                bad=pg.evaluate("()=>[...document.querySelectorAll('.reveal')].filter(e=>getComputedStyle(e).opacity!='1').length")
                if bad: F(f'{p} reveal hidden {bad}')
                fh=pg.evaluate("()=>[...document.querySelectorAll('.faq-panel p')].filter(e=>e.getBoundingClientRect().height<=0).length")
                if fh: F(f'{p} faq hidden')
                bg=pg.evaluate("()=>getComputedStyle(document.querySelector('.site-header')).backgroundColor")
                if bg in('rgba(0, 0, 0, 0)','transparent'): F(f'{p} header transparent')
                if pg.query_selector('.nav-menu'):
                    pg.click('.nav-menu summary'); 
                    if not pg.evaluate("()=>document.querySelector('.nav-menu').open"): F(f'{p} menu no open')
            else:
                if errs: F(f'{p} console {errs}')
            pg.close()
        ctx.close()
    # interactive
    ctx=b.new_context(viewport={'width':360,'height':800}); pg=ctx.new_page()
    pg.goto('file://'+root+'/ko/index.html')
    pg.click('.nav-menu summary'); pg.click('.nav-menu-panel a[href="#faq"]'); pg.wait_for_timeout(500)
    if pg.evaluate("()=>document.querySelector('.nav-menu').open"): F('menu not closed after click')
    pg.click('.nav-menu summary'); pg.keyboard.press('Escape')
    if pg.evaluate("()=>document.querySelector('.nav-menu').open"): F('esc')
    # switch nav
    pg.goto('file://'+root+'/ko/index.html'); pg.click('.mode-switch a[lang=en]'); pg.wait_for_load_state()
    if not pg.url.endswith('en/index.html'): F('switch url '+pg.url)
    pg.click('.mode-switch a[lang=ko]'); 
    if not pg.url.endswith('ko/index.html'): F('switch back '+pg.url)
    # chip radio ko
    pg.set_viewport_size({'width':1280,'height':900})
    pg.goto('file://'+root+'/ko/index.html')
    g=pg.evaluate("()=>{const gs=[...document.querySelectorAll('.chip-radio-group')];return gs.length}")
    # click first chip in each group, then second in first group
    pg.evaluate("()=>{const gs=[...document.querySelectorAll('.chip-radio-group')];gs.forEach(g=>g.querySelector('.chip-radio').click());gs[0].querySelectorAll('.chip-radio')[1].click()}")
    res=pg.evaluate("()=>[...document.querySelectorAll('.chip-radio-group')].map(g=>g.querySelectorAll('.chip-radio.is-checked').length)")
    print('ko chip groups',res)
    if any(x!=1 for x in res): F(f'ko chip {res}')
    pg.goto('file://'+root+'/en/index.html')
    pg.evaluate("()=>{const g=document.querySelector('.chip-radio-group');g.querySelectorAll('.chip-radio')[0].click();g.querySelectorAll('.chip-radio')[1].click()}")
    print('en chip',pg.evaluate("()=>document.querySelector('.chip-radio-group').querySelectorAll('.chip-radio.is-checked').length"))
    # sample page submit
    pg.goto('file://'+root+'/en/sample-request.html')
    pg.evaluate("()=>document.getElementById('bidForm').requestSubmit()"); pg.wait_for_timeout(300)
    print('sample empty submit -> success?', pg.evaluate("()=>!!document.querySelector('.success')"))
    # screenshots
    os.makedirs('shots',exist_ok=True)
    for w in (360,1280):
        pg.set_viewport_size({'width':w,'height':900})
        for p in ['index.html','ko/index.html','en/index.html','en/sample-request.html']:
            pg.goto('file://'+os.path.join(root,p)); pg.wait_for_timeout(300)
            pg.screenshot(path=f'shots/{p.replace("/","_")}_{w}.png')
    b.close()
print('FAILS',len(fails))
