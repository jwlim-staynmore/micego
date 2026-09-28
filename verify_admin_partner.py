# -*- coding: utf-8 -*-
"""verify_admin_partner.py — 지역 파트너 콘솔(mock 모드) 화면 점검.  - 클로드
실행: python3 verify_admin_partner.py   (사이트 루트에서; file:// 로 admin/*.html, en/confirm.html 을 연다)
운영자 시점과 파트너 시점(?as=partner)을 각각 열어 카드·버튼·다이얼로그·로컬 재생을 확인한다.
"""
import os, sys, re
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.abspath(__file__))
BASE = 'file:///' + ROOT.replace('\\', '/').lstrip('/') + '/admin/'
EN = 'file:///' + ROOT.replace('\\', '/').lstrip('/') + '/en/'
res = []; errs = []
def ok(name, cond, extra=''):
    res.append((name, bool(cond), extra)); print(('PASS ' if cond else 'FAIL ') + name + (' | ' + str(extra) if extra and not cond else ''))
with sync_playwright() as p:
    b = p.chromium.launch()
    def newpage(w=1280, h=900):
        ctx = b.new_context(viewport={'width': w, 'height': h}); pg = ctx.new_page()
        pg.on('console', lambda m: errs.append((pg.url, m.text)) if m.type == 'error' and 'ERR_TUNNEL' not in m.text and 'net::' not in m.text else None)
        pg.on('pageerror', lambda e: errs.append((pg.url, str(e))))
        return ctx, pg
    def login(pg, as_partner=False):
        pg.goto(BASE + 'index.html'); pg.fill('#em', 'ops@matchgo.ai'); pg.fill('#pw', 'x'); pg.click('button[type=submit]'); pg.wait_for_url('**/dashboard.html')
        if as_partner:
            pg.goto(BASE + 'dashboard.html?as=partner'); pg.wait_for_timeout(200)

    # ---------- 운영자 ----------
    ctx, pg = newpage(); login(pg)
    ok('HQ nav has partner-orgs/settlements, no my-org', pg.locator('nav a[href="partner-orgs.html"]').count() >= 1 and pg.locator('nav a[href="settlements.html"]').count() >= 1 and pg.locator('nav a[href="my-org.html"]').count() == 0)
    ok('HQ dashboard intervention widget', pg.locator('#interventions').count() == 1 and pg.locator('#interventions tbody tr').count() >= 1)
    n0 = pg.locator('#interventions tbody tr').count()
    pg.click('#interventions button[data-int]'); pg.wait_for_selector('.dlg textarea, .dlg input', timeout=3000)
    pg.fill('.dlg textarea', '파트너에게 전화로 확인'); pg.click('.dlg .btn.primary'); pg.wait_for_timeout(300)
    ok('HQ intervention resolve (local replay)', pg.locator('#interventions tbody tr').count() == n0 - 1 or pg.locator('#interventions').count() == 0)

    pg.goto(BASE + 'rfps.html'); pg.wait_for_timeout(200)
    ok('rfps deleg/region filters present', pg.locator('#fd').count() == 1 and pg.locator('#fr').count() == 1)
    pg.select_option('#fd', 'delegated'); pg.wait_for_timeout(150)
    deleg = int(re.sub(r'\D', '', pg.text_content('#cnt')) or 0)
    ok('rfps delegated filter narrows', deleg > 0, deleg)
    pg.select_option('#fd', ''); pg.select_option('#fr', 'TH'); pg.wait_for_timeout(150)
    th = int(re.sub(r'\D', '', pg.text_content('#cnt')) or 0)
    ok('rfps region TH filter', th >= deleg, th)
    # 위임 건 상세
    pg.select_option('#fr', ''); pg.select_option('#fd', 'delegated'); pg.wait_for_timeout(150)
    pg.click('.seg button[data-v=list]'); href = pg.get_attribute('table a.rowlink', 'href'); pg.goto(BASE + href); pg.wait_for_timeout(200)
    ok('rfp detail assign card', pg.locator('#h-asg').count() == 1 and '파트너 위임' in pg.text_content('#h-asg ~ dl, section[aria-labelledby=h-asg]'))
    ok('rfp detail HQ buttons', pg.locator('[data-ptr=hold]').count() == 1 and pg.locator('[data-ptr=takeover]').count() == 1)
    pg.click('[data-ptr=takeover]'); pg.wait_for_selector('.dlg', timeout=3000); pg.fill('.dlg #dlgWhy', '오거나이저 VOC · 본사 직접 처리'); pg.click('.dlg .btn.primary'); pg.wait_for_timeout(300)
    ok('rfp takeover → 본사 인계 chip', '본사 인계' in pg.text_content('section[aria-labelledby=h-asg]'))
    ok('rfp takeover shows release', pg.locator('[data-ptr=release]').count() == 1)
    pg.click('[data-ptr=release]'); pg.wait_for_selector('.dlg', timeout=3000); pg.click('.dlg .btn.primary'); pg.wait_for_timeout(300)
    ok('rfp release → 파트너 위임', '파트너 위임' in pg.text_content('section[aria-labelledby=h-asg]'))
    # 대리 입력 상태 셀 (bidding 건)
    pg.goto(BASE + 'rfps.html?deleg=delegated&state=bidding'); pg.wait_for_timeout(200); pg.click('.seg button[data-v=list]')
    hrefs = [pg.get_attribute('table a.rowlink >> nth=' + str(i), 'href') for i in range(pg.locator('table a.rowlink').count())]
    found_proxy = False; found_wait = False
    for h in hrefs:
        pg.goto(BASE + h); pg.wait_for_timeout(150)
        found_proxy = found_proxy or pg.locator('[data-ptr=proxy]').count() >= 1
        found_wait = found_wait or ('호텔 확인 대기' in (pg.text_content('#invTable') or ''))
    ok('proxy cell in invitation table', found_proxy)
    ok('proxy_entered demo row shows 확인 대기', found_wait)
    # 정산
    pg.goto(BASE + 'settlements.html'); pg.wait_for_timeout(200)
    ok('settlements list rows', pg.locator('table tbody tr a.rowlink').count() >= 1)
    href = pg.get_attribute('table tbody tr a.rowlink', 'href'); pg.goto(BASE + href); pg.wait_for_timeout(200)
    ok('settlement detail renders', pg.locator('#h-b').count() == 1 and pg.locator('#h-m').count() == 1)
    if pg.locator('[data-st=approve_commission]').count():
        pg.click('[data-st=approve_commission]'); pg.wait_for_selector('.dlg', timeout=3000); pg.click('.dlg .btn.primary'); pg.wait_for_timeout(300)
        ok('HQ approve commission → 커미션 확정', '커미션 확정' in pg.text_content('.dh'))
    # 지역 파트너 조직
    pg.goto(BASE + 'partner-orgs.html'); pg.wait_for_timeout(200)
    ok('partner-orgs list', pg.locator('table tbody tr').count() >= 2)
    pg.goto(BASE + 'partner-orgs.html?code=TMTHAI'); pg.wait_for_timeout(200)
    ok('partner-org detail cards', pg.locator('#h-oi').count() == 1 and pg.locator('#h-ou').count() == 1)
    u0 = pg.locator('#h-ou ~ div tbody tr, section[aria-labelledby=h-ou] tbody tr').count()
    pg.click('[data-org=invite]'); pg.wait_for_selector('.dlg', timeout=3000); pg.fill('.dlg #iv-name', '테스트'); pg.fill('.dlg #iv-email', 'test@tmthai.example'); pg.click('.dlg .btn.primary'); pg.wait_for_timeout(300)
    ok('HQ invite adds user row', pg.locator('section[aria-labelledby=h-ou] tbody tr').count() == u0 + 1)
    pg.click('[data-org=region]'); pg.wait_for_selector('.dlg', timeout=3000); pg.select_option('.dlg #rg-code', 'VN-DAD'); pg.click('.dlg .btn.primary'); pg.wait_for_timeout(300)
    ok('HQ region set adds VN-DAD', 'VN-DAD' in pg.text_content('section[aria-labelledby=h-oi]'))
    # 호텔 상세 (HQ) — 지역 카드
    pg.goto(BASE + 'partners.html'); pg.wait_for_timeout(200); pg.click('.segs button[data-s=approved]'); href = pg.get_attribute('table a.hn', 'href'); pg.goto(BASE + href); pg.wait_for_timeout(200)
    ok('hotel detail region card', pg.locator('#h-rg').count() == 1 and pg.locator('[data-ptr=hotel-region]').count() == 1)
    ctx.close()

    # ---------- 파트너 (TMTHAI 관리자) ----------
    ctx, pg = newpage(); login(pg, True)
    ok('partner side-sub label', '파트너 콘솔' in pg.text_content('.side-sub'))
    ok('partner nav: my-org yes, members/settings/partner-orgs no', pg.locator('nav a[href="my-org.html"]').count() >= 1 and pg.locator('nav a[href="members.html"]').count() == 0 and pg.locator('nav a[href="settings.html"]').count() == 0 and pg.locator('nav a[href="partner-orgs.html"]').count() == 0)
    ok('partner dashboard summary', '담당 지역' in pg.text_content('main'))
    pg.goto(BASE + 'rfps.html'); pg.wait_for_timeout(200)
    ok('partner rfps: no deleg filter', pg.locator('#fd').count() == 0)
    pg.click('.seg button[data-v=list]'); n = pg.locator('table a.rowlink').count()
    ok('partner sees only own delegated rfps', n > 0 and n < 12, n)
    pg.goto(BASE + pg.get_attribute('table a.rowlink', 'href')); pg.wait_for_timeout(200)
    ok('partner: no copyTrack, no owner card', pg.locator('#copyTrack').count() == 0 and pg.locator('#h-own').count() == 0)
    ok('partner: masked organizer card with reveal', pg.locator('[data-ptr=reveal]').count() == 1)
    pg.click('[data-ptr=reveal]'); pg.wait_for_timeout(300)
    if pg.locator('.dlg').count(): pg.click('.dlg .btn.primary'); pg.wait_for_timeout(300)
    ok('partner: reveal shows identity + 열람 기록', '열람 기록됨' in pg.text_content('section[aria-labelledby=h-org]'))
    ok('partner: no HQ takeover buttons', pg.locator('[data-ptr=takeover]').count() == 0)
    # 호텔 등록
    pg.goto(BASE + 'partners.html'); pg.wait_for_timeout(200)
    ok('partner hotels: register button + region scope', pg.locator('#regHotel').count() == 1)
    pg.click('#regHotel'); pg.wait_for_selector('.dlg', timeout=3000)
    pg.fill('.dlg #h-name', 'Test Resort Pattaya'); pg.fill('.dlg #h-loc', 'Pattaya'); pg.fill('.dlg #h-cap', '300'); pg.fill('.dlg #h-cn', 'Somchai'); pg.fill('.dlg #h-ce', 'sales@testresort.com'); pg.fill('.dlg #h-dom', 'testresort.com')
    pg.click('.dlg .btn.primary'); pg.wait_for_timeout(300)
    pg.click('.segs button[data-s=queue]'); pg.wait_for_timeout(100)
    ok('partner hotel registered in queue', 'Test Resort Pattaya' in pg.text_content('#res'))
    # 내 조직
    pg.goto(BASE + 'my-org.html'); pg.wait_for_timeout(200)
    ok('my-org renders org + users', pg.locator('#h-oi').count() == 1 and pg.locator('#h-ou').count() == 1)
    ok('my-org: partner admin cannot edit org info', pg.locator('[data-org=edit]').count() == 0 and pg.locator('[data-org=invite]').count() == 1)
    # 정산 (파트너)
    pg.goto(BASE + 'settlements.html'); pg.wait_for_timeout(200)
    ok('partner settlements only own', pg.locator('table tbody tr a.rowlink').count() >= 1 and pg.locator('#fp').count() == 0)
    ctx.close()

    # ---------- accept.html / en/confirm.html (demo) ----------
    ctx, pg = newpage(); pg.goto(BASE + 'accept.html'); pg.wait_for_timeout(500)
    ok('accept page ready in demo', pg.locator('#afSubmit').is_enabled())
    pg.fill('#pw', 'abcdef1234'); pg.fill('#pw2', 'abcdef1234'); pg.check('#agree'); pg.click('#afSubmit'); pg.wait_for_url('**/dashboard.html?as=partner', timeout=5000)
    ok('accept demo → partner dashboard', True)
    pg.goto(EN + 'confirm.html?t=abcdefghijklmnop1234'); pg.wait_for_timeout(300)
    ok('confirm page review state', pg.get_attribute('html', 'data-state') == 'review')
    pg.click('#dpBtn'); ok('confirm dispute box opens', not pg.locator('#dpBox').is_hidden())
    pg.click('#cfBtn'); pg.wait_for_timeout(100)
    ok('confirm demo → done', pg.get_attribute('html', 'data-state') == 'done')
    pg.goto(EN + 'confirm.html?t=short'); pg.wait_for_timeout(200)
    ok('confirm invalid token', pg.get_attribute('html', 'data-state') == 'invalid')
    ctx.close()
    b.close()

bad = [e for e in errs if 'favicon' not in e[1] and 'fonts.g' not in e[1] and 'cdn.jsdelivr' not in e[1]]
ok('no console/page errors', not bad, bad[:5])
fails = [r for r in res if not r[1]]
print('\nTOTAL', len(res), 'FAIL', len(fails))
sys.exit(1 if fails else 0)
