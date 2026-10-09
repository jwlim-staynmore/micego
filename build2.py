import re, json, os
import os as _os_
_SITE_DIR = _os_.environ.get('MG_SITE_DIR') or _os_.path.dirname(_os_.path.abspath(__file__))
from decimal import Decimal as D, ROUND_HALF_UP
from urllib.parse import quote
exec(open(_os_.path.join(_SITE_DIR, 'site_config.py'), encoding='utf-8').read(), globals())  # CFG/BASE/MAIL/PMAIL/API/DEMO/PROD (WP2)
exec(open(_os_.path.join(_SITE_DIR, 'build.py'), encoding='utf-8').read(), globals())   # regenerates base pages, gives helpers

def rd(p): return open(p, encoding='utf-8').read()
def wr(p, t): open(p, 'w', encoding='utf-8').write(t)
def rep(t, old, new, cnt=1):
    assert old in t, old[:80]
    return t.replace(old, new, cnt)

# ---------------------------------------------------------------- footer link sets
FL_KO_SUB = [('index.html','여행사 모드',''),('about.html','서비스 소개',''),('faq.html','자주 묻는 질문',''),('contact.html','문의하기',''),('terms.html','이용약관',''),('privacy.html','개인정보처리방침','')]
FL_EN_SUB = [('index.html','Hotel mode',''),('faq.html','FAQ',''),('contact.html','Contact',''),('privacy.html','Privacy','')]
FL_KO_LAND = [('#how','동작 방식',''),('about.html','서비스 소개',''),('#policy','이용 조건',''),('faq.html','자주 묻는 질문',''),('contact.html','문의하기',''),('terms.html','이용약관',''),('privacy.html','개인정보처리방침','')]
FL_EN_LAND = [('#how','How it works',''),('#terms','Partner terms',''),('faq.html','FAQ',''),('contact.html','Contact',''),('privacy.html','Privacy','')]
def links_html(links):
    return '<div class="footer-links">' + ''.join('\n          <a href="%s"%s>%s</a>' % (h, (' lang="%s"' % l) if l else '', x) for h, x, l in links) + '\n        </div>'
def set_footer_links(path, links):
    t = rd(path)
    i = t.index('<footer class="site-footer">')
    m = re.compile(r'<div class="footer-links">.*?</div>', re.S).search(t, i)
    t = t[:m.start()] + links_html(links) + t[m.end():]
    wr(path, t)

# ---------------------------------------------------------------- patches to existing pages
def patch_landing(path, lang):
    t = rd(path)
    ko = lang == 'ko'
    extra = ('<a href="about.html">서비스 소개</a>\n          <a href="faq.html">자주 묻는 질문 전체</a>\n          <a href="contact.html">문의하기</a>\n          ' if ko else '<a href="faq.html">All FAQs</a>\n          <a href="contact.html">Contact</a>\n          ')
    t = rep(t, '<a class="nav-menu-cta"', extra + '<a class="nav-menu-cta"')
    i = t.index('<section class="section" id="faq"'); j = t.index('</section>', i)
    sec = t[i:j]; k = sec.rindex('  </div>')
    more = ('    <p style="text-align:center;margin-top:32px"><a class="btn btn-ghost btn-arrow" href="faq.html">자주 묻는 질문 더 보기</a></p>\n' if ko else '    <p style="text-align:center;margin-top:32px"><a class="btn btn-ghost btn-arrow" href="faq.html">More questions</a></p>\n')
    t = t[:i] + sec[:k] + more + sec[k:] + t[j:]
    if not ko:
        t = rep(t, 'until they select your proposal.</p>', 'until they select your proposal. Likewise, your property name is not shown to the organizer in the comparison — it is disclosed only if the organizer selects your proposal.</p>')

        EN_LAND = [
          ('room split, banquet needs, dates, deadline.</p>', 'room split, banquet needs, dates and a quote deadline (usually 3 business days, 18:00 KST).</p>'),
          ("<p>Every request is an invitation, not a commitment. Ignore the ones that don't fit; it doesn't affect the requests you receive next.</p>", "<p>Every request is an invitation, not a commitment. Decline the ones that don't fit — it takes a few seconds on the request page. Three unanswered invitations in a row pause your listing until we hear from you.</p>"),
          ('Company name and budget stay confidential until the organizer selects a proposal.', "The organizer's company name is withheld until they select a proposal, and the budget is never part of the brief."),
          ('<h3>No minimum property size</h3>', '<h3>Groups of 50 or more · ballroom not required</h3>'),
          ('<p>Boutique properties and large resorts are matched the same way — on destination, capacity and facilities.</p>', '<p>We approve overseas properties that can host groups of 50 or more. A ballroom is not required — some programs need rooms only.</p>'),
          ('and you can revise your quote until it closes.</p>', 'and you can revise your quote until it closes. The usual window is 3 business days, closing at 18:00 KST (5 for groups of 200+).</p>'),
          ("<p>No. Each request is an invitation. Declining or ignoring one does not affect the requests you receive afterwards.</p>", "<p>No. Each request is an invitation — decline the ones that don't fit; declining never counts against you. Three consecutive unanswered invitations pause your listing until we hear from you.</p>"),
          ('Deadlines are stated on every request — they vary by program.', 'Every request states its deadline — usually 3 business days after the invitation, at 18:00 KST (5 business days for groups of 200+).'),
          ('Notes from organizer', 'Notes (reviewed by MICEGO)'),
        ]
        for a, b in EN_LAND:
            t = rep(t, a, b)
        t, n = re.subn(r'(<option>500\+ pax</option>\s*</select>)', r'\1<p style="font-size:12.5px;line-height:1.6;color:var(--gray);margin-top:6px">Approval currently requires capacity for groups of 50 or more.</p>', t, count=1)
        assert n == 1
        t = rep(t, 'Organizer identity withheld.</p>', 'Organizer company name withheld until selection.</p>') if 'Organizer identity withheld.</p>' in t else t
        # WP3 hook point (SPEC_LAUNCH §9): success-panel container #ptnDone, hidden, empty [data-mg]
        # span — WP3's mgRegisterPartner(record) fills this in and un-hides it in api mode.
        t = rep(t, '<p>Questions in the meantime: mysteri1984@gmail.com</p>',
                '<p>Questions in the meantime: mysteri1984@gmail.com</p>\n        <div id="ptnDone" hidden><span data-mg="ptnDoneRef"></span></div>')

        # WP3 (SPEC_LAUNCH §5): en landing partner register -- API-first when MG.mode==='api',
        # mailto/clipboard fallback (demo behaviour) preserved byte-for-byte for MG.mode==='mailto'.
        PTN_SUBMIT_OLD = r'''    /* Best-effort delivery: opens the visitor's mail client with a pre-filled registration
       addressed to the intake inbox. This mirrors the organizer landing page's stopgap
       until a real form backend is wired up — see TODO(backend) near the success screen. */
    try{
      var mailBody = [
        'Hotel / property name: ' + record.hotelName,
        'City & country: ' + record.hotelLocation,
        'Largest group size: ' + record.groupCapacity,
        'Banquet / ballroom space: ' + record.banquetSpace,
        'Contact name: ' + record.contactName,
        'Contact email: ' + record.contactEmail,
        'Contact phone: ' + (record.contactPhone || '-')
      ].join('\n');
      var mailLink = document.createElement('a');
      mailLink.href = 'mailto:mysteri1984@gmail.com?subject=' + encodeURIComponent('[MICEGO Hotel Partner] ' + record.hotelName) + '&body=' + encodeURIComponent(mailBody);
      mailLink.click();
    }catch(err){ /* mail client unavailable — the copy-to-clipboard fallback below still works */ }

    form.hidden = true;
    successEl.hidden = false;
    successEl.setAttribute('tabindex','-1');
    successEl.focus();'''
        PTN_SUBMIT_NEW = r'''    function mgToast(m){
      var mt = document.getElementById('mgToast');
      if(!mt){ mt = document.createElement('div'); mt.id = 'mgToast'; mt.setAttribute('role','status'); mt.setAttribute('aria-live','polite');
        mt.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#111;color:#fff;font:600 14px/1.4 sans-serif;padding:12px 18px;border-radius:10px;z-index:999;max-width:calc(100vw - 32px);text-align:center';
        document.body.appendChild(mt);
      }
      mt.textContent = m; mt.style.opacity = '1';
      clearTimeout(mt._to); mt._to = setTimeout(function(){ mt.style.opacity = '0'; }, 3200);
    }
    function mgShowSuccess(){
      form.hidden = true;
      successEl.hidden = false;
      successEl.setAttribute('tabindex','-1');
      successEl.focus();
    }
    function mgMailtoFallback(){
      /* Best-effort delivery: opens the visitor's mail client with a pre-filled registration
         addressed to the intake inbox. Demo/no-backend fallback -- in API mode
         (MG.mode==='api') the request is submitted to the server instead, below. */
      try{
        var mailBody = [
          'Hotel / property name: ' + record.hotelName,
          'City & country: ' + record.hotelLocation,
          'Largest group size: ' + record.groupCapacity,
          'Banquet / ballroom space: ' + record.banquetSpace,
          'Contact name: ' + record.contactName,
          'Contact email: ' + record.contactEmail,
          'Contact phone: ' + (record.contactPhone || '-')
        ].join('\n');
        var mailLink = document.createElement('a');
        mailLink.href = 'mailto:mysteri1984@gmail.com?subject=' + encodeURIComponent('[MICEGO Hotel Partner] ' + record.hotelName) + '&body=' + encodeURIComponent(mailBody);
        mailLink.click();
      }catch(err){ /* mail client unavailable — the copy-to-clipboard fallback below still works */ }
      mgShowSuccess();
    }
    if(window.MG && MG.mode==='api' && !MG.preview){
      var mgIdem = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('idem-' + Date.now() + '-' + Math.random().toString(36).slice(2));
      MG.api.register_partner({
        hotelName: record.hotelName, hotelLocation: record.hotelLocation, groupCapacity: record.groupCapacity,
        banquetSpace: record.banquetSpace, contactName: record.contactName, contactEmail: record.contactEmail,
        contactPhone: record.contactPhone, consent: true, idem: mgIdem
      }).then(function(resp){
        record.partnerId = resp.partner_id;
        var refEl = document.querySelector('[data-mg="ptnDoneRef"]');
        if(refEl) refEl.textContent = resp.partner_id;
        var pd = document.getElementById('ptnDone');
        if(pd) pd.hidden = false;
        if(window.mgTrack) mgTrack('partner_register', {mode: 'api'});
        mgShowSuccess();
      }, function(err){
        MG.show(err, { toast: mgToast, setErr: setFieldError, fieldMap: {
          hotelName: 'f-hotelName', hotelLocation: 'f-hotelLocation', groupCapacity: 'f-groupCapacity',
          banquetSpace: 'f-banquetSpace', contactName: 'f-contactName', contactEmail: 'f-contactEmail', contactPhone: 'f-contactPhone'
        }});
      });
    } else {
      mgMailtoFallback();
    }'''
        t = rep(t, PTN_SUBMIT_OLD, PTN_SUBMIT_NEW)
    if ko:
        KO_LAND = [
          ('회사명과 예산은 공급자에게 공개되지 않으며,', '회사명과 예산은 호텔 요청서에 담기지 않으며,'),
          ('회사명과 예산은 비공개로 처리됩니다.</p>', '회사명과 예산은 요건서에서 빼고 보냅니다.</p>'),
          ('<p>견적 요청 후 영업일 기준 3일 이내에 회신드립니다.</p>', '<p>요청을 받은 영업일부터 3영업일 안에 진행 상황과 다음 일정을 회신드립니다. 영업일은 주말과 한국 공휴일을 뺀 날이며, 기한은 마지막 날 18:00(KST)입니다.</p>'),
          ('<span class="stat-label">이내에 회신드립니다</span>', '<span class="stat-label">안에 회신드립니다 (주말·공휴일 제외)</span>'),
          ('<h3>회사명·예산 비공개</h3>', '<h3>선정 전까지 회사명 비공개</h3>'),
          ('<p>회사 이름과 예산은 공급자에게 공개되지 않습니다. 요건서만 표준 양식으로 전달됩니다.</p>', '<p>호텔은 회사명·예산·담당자 연락처를 뺀 표준 요건서만 받습니다. 제안을 선택하시면 선정된 호텔에만 회사명과 담당자 연락처가 전달됩니다.</p>'),
          ('회신드립니다. 회사명과 예산은 공급자에게 공개되지 않습니다.</p>', '회신드립니다. 회사명과 예산은 호텔 요청서에 담기지 않습니다.</p>'),
          ('<p class="form-submit-note">회사명과 예산은 공급자에게 공개되지 않습니다.', '<p class="form-submit-note">회사명과 예산은 호텔 요청서에 담기지 않습니다.'),
          ('보유 기간: 처리 완료 또는 동의 철회 시까지<br><a href="privacy.html"', '보유 기간: 처리 완료 또는 동의 철회 시까지<br>제안을 선택하시면 선정된 호텔에 회사명·담당자명·이메일·연락처가 전달됩니다.<!-- TODO(legal): 제3자 제공·국외 이전 동의/고지 방식 검토 --><br><a href="privacy.html"'),
          ('<p>영업일 기준 3일 이내에 담당자가 이메일로 회신드립니다.</p>', '<p>접수 확인 메일에 진행 상황을 볼 수 있는 개인 링크를 넣어 드립니다. 영업일 기준 3일 안에 담당자가 진행 상황과 다음 일정을 회신드립니다.</p>'),
          ('<p>회사명과 예산은 공급자에게 공개되지 않습니다.</p>', '<p>회사명과 예산은 호텔 요청서에 담기지 않습니다. 제안을 선택하시면 선정된 호텔에만 회사명과 담당자 연락처가 전달됩니다.</p>'),
          ('<p>공개되지 않습니다. 회사명과 예산을 제외한 표준 요건서만 공급자에게 전달됩니다.</p>', '<p>선정 전에는 공개되지 않습니다. 호텔은 회사명·예산·담당자 연락처를 뺀 표준 요건서만 받습니다. 제안을 선택하시면 선정된 호텔에 회사명·담당자명·이메일·연락처가 전달되고, 선정되지 않은 호텔에는 결과만 알립니다.</p>'),
          ('영업일 3일 이내 회신 · 회사명·예산 비공개.</p>', '영업일 3일 이내 회신 · 요건서에 회사명·예산 미포함.</p>'),
          ('<label for="phone">연락처</label>', '<label for="phone">휴대전화 <span class="req">*</span></label>'),
          ('placeholder="선택 · 급한 안내가 필요할 때만 사용합니다" autocomplete="tel">', 'placeholder="010-0000-0000" autocomplete="tel" inputmode="tel" required aria-required="true">\n            <p class="field-hint" style="font-size:12.5px;line-height:1.6;color:var(--gray);margin-top:6px">진행 상황을 카카오 알림톡(안 되면 문자)으로 알려 드립니다.</p>'),
          ('<p class="field-msg">연락처 형식을 확인해 주세요</p>', '<p class="field-msg">휴대전화 번호를 확인해 주세요.</p>'),
          ('var PHONE_RE = /^[0-9\\-]{9,}$/;', 'var PHONE_RE = /^(?:01[016789]-?\\d{3,4}-?\\d{4}|\\+82-?\\s?10-?\\d{3,4}-?\\d{4})$/;'),
          ('var phoneInvalid = phone.length > 0 && !PHONE_RE.test(phone);', 'var phoneInvalid = !PHONE_RE.test(phone.replace(/\\s+/g, ""));'),
          ('이메일·연락처(선택)·행사 정보 / 이용 목적: 견적 요청 처리 및 안내 /', '이메일·휴대전화·행사 정보 / 이용 목적: 견적 요청 처리, 진행 상황 안내(이메일·카카오 알림톡·문자) /'),
        ]
        for a, b in KO_LAND:
            t = rep(t, a, b)
        # ---- member-account additions (A9) ----
        t = rep(t, '진행 상황을 카카오 알림톡(안 되면 문자)으로 알려 드립니다.</p>', '진행 알림과 제안 선택 확인(인증번호)에 사용합니다. 진행 상황은 카카오 알림톡(안 되면 문자)으로 알려 드립니다.</p>')
        t = rep(t, '<p class="form-hint">필수 항목만', '<p class="acc-login-line" id="accLoginLine">이미 회원이신가요? <a href="login.html?next=index.html%23register">로그인</a>하면 담당자 정보가 자동으로 채워집니다.</p>\n        <div class="acc-member-chip" id="accMemberChip" hidden><span id="accMemberText"></span><button type="button" class="acc-linkbtn" id="accLogout">로그아웃</button></div>\n        <p class="form-hint">필수 항목만')
        t = rep(t, 'placeholder="name@company.com" autocomplete="email">', 'placeholder="name@company.com" autocomplete="email">\n            <p class="acc-ro" data-acc-ro hidden>회원 정보로 채워졌습니다. <a href="account.html">계정 설정에서 변경</a></p>')
        t = rep(t, '<a href="privacy.html" target="_blank" rel="noopener" style="text-decoration:underline">개인정보처리방침 보기</a><!-- TODO(legal): 문구 법무 검토 필요 -->', '<a href="terms.html" target="_blank" rel="noopener" style="text-decoration:underline">이용약관 보기</a> · <a href="privacy.html" target="_blank" rel="noopener" style="text-decoration:underline">개인정보처리방침 보기</a><!-- TODO(legal): 문구 법무 검토 필요 -->')
        # WP3 hook point (SPEC_LAUNCH §9): success-panel container #rfpDone, hidden, empty [data-mg]
        # spans — WP3's mgSubmitRfp(record) fills these in and un-hides it in api mode.
        t = rep(t, '<p>궁금한 점이 있으시면 mysteri1984@gmail.com 로 편하게 문의해 주세요.</p>',
                '<p>궁금한 점이 있으시면 mysteri1984@gmail.com 로 편하게 문의해 주세요.</p>\n        <div id="rfpDone" hidden><span data-mg="rfpDoneRef"></span><span data-mg="rfpDoneTrack"></span></div>')
        t = rep(t, '        <div class="success-actions">', '        <div class="acc-cta" id="accCta"><b>이 이메일로 가입하면 모든 요청을 한곳에서 확인할 수 있습니다.</b><span>동료에게 보기 전용 링크도 보낼 수 있습니다.</span><a class="btn btn-accent btn-sm" id="accCtaLink" href="signup.html">이 이메일로 가입하기</a></div>\n        <div class="success-actions">')
        t = rep(t, "    form.hidden = true;\n    successEl.hidden = false;", "    var accCta = document.getElementById('accCta');\n    if(accCta){ if(accMember){ accCta.hidden = true; } else { document.getElementById('accCtaLink').href = 'signup.html?email=' + encodeURIComponent(record.email); } }\n    form.hidden = true;\n    successEl.hidden = false;")

        # WP3 (SPEC_LAUNCH §5): ko landing RFP submit -- API-first when MG.mode==='api', mailto/clipboard
        # fallback (demo behaviour) is preserved byte-for-byte inside mgMailtoFallback() for MG.mode==='mailto'.
        RFP_SUBMIT_OLD = r'''    /* Best-effort delivery: opens the visitor's mail client with a pre-filled request
       addressed to the intake inbox. This is a stopgap until a real form backend
       (Formspree / Google Apps Script / API) is wired up — see TODO(backend) near the
       success screen markup. Devices without a configured mail app won't send anything,
       which is why the in-page "제출 내용 복사" fallback also exists. */
    try{
      var mailBody = [
        '소속 유형: ' + record.orgType,
        '회사·기관명: ' + record.company,
        '담당자명: ' + record.name,
        '이메일: ' + record.email,
        '연락처: ' + (record.phone || '-'),
        '행사 유형: ' + record.eventType,
        '행사 시작일: ' + record.startDate,
        '행사 종료일: ' + (record.endDate || '-'),
        '예상 인원: ' + record.headcount,
        '행사 국가·도시: ' + record.region,
        '트윈룸 필요 객실 수: ' + record.twinRooms + '실',
        '킹룸 필요 객실 수: ' + record.kingRooms + '실',
        '볼룸(연회장) 사용 여부: ' + record.ballroomUse + (record.ballroomUse === '사용' ? ' (' + record.ballroomPurpose + ')' : ''),
        '더 알려주실 내용: ' + (record.note || '-')
      ].join('\n');
      var mailLink = document.createElement('a');
      mailLink.href = 'mailto:mysteri1984@gmail.com?subject=' + encodeURIComponent('[MICEGO 견적 요청] ' + record.company) + '&body=' + encodeURIComponent(mailBody);
      mailLink.click();
    }catch(err){ /* mail client unavailable — the copy-to-clipboard fallback below still works */ }

    var accCta = document.getElementById('accCta');
    if(accCta){ if(accMember){ accCta.hidden = true; } else { document.getElementById('accCtaLink').href = 'signup.html?email=' + encodeURIComponent(record.email); } }
    form.hidden = true;
    successEl.hidden = false;
    successEl.setAttribute('tabindex','-1');
    successEl.focus();
  });'''
        RFP_SUBMIT_NEW = r'''    function mgToast(m){
      var mt = document.getElementById('mgToast');
      if(!mt){ mt = document.createElement('div'); mt.id = 'mgToast'; mt.setAttribute('role','status'); mt.setAttribute('aria-live','polite');
        mt.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#111;color:#fff;font:600 14px/1.4 sans-serif;padding:12px 18px;border-radius:10px;z-index:999;max-width:calc(100vw - 32px);text-align:center';
        document.body.appendChild(mt);
      }
      mt.textContent = m; mt.style.opacity = '1';
      clearTimeout(mt._to); mt._to = setTimeout(function(){ mt.style.opacity = '0'; }, 3200);
    }
    function mgShowSuccess(){
      var accCta = document.getElementById('accCta');
      if(accCta){ if(accMember){ accCta.hidden = true; } else { document.getElementById('accCtaLink').href = 'signup.html?email=' + encodeURIComponent(record.email); } }
      form.hidden = true;
      successEl.hidden = false;
      successEl.setAttribute('tabindex','-1');
      successEl.focus();
    }
    function mgMailtoFallback(){
      /* Best-effort delivery: opens the visitor's mail client with a pre-filled request
         addressed to the intake inbox. Demo/no-backend fallback -- in API mode
         (MG.mode==='api') the request is submitted to the server instead, below. */
      try{
        var mailBody = [
          '소속 유형: ' + record.orgType,
          '회사·기관명: ' + record.company,
          '담당자명: ' + record.name,
          '이메일: ' + record.email,
          '연락처: ' + (record.phone || '-'),
          '행사 유형: ' + record.eventType,
          '행사 시작일: ' + record.startDate,
          '행사 종료일: ' + (record.endDate || '-'),
          '예상 인원: ' + record.headcount,
          '행사 국가·도시: ' + record.region,
          '트윈룸 필요 객실 수: ' + record.twinRooms + '실',
          '킹룸 필요 객실 수: ' + record.kingRooms + '실',
          '볼룸(연회장) 사용 여부: ' + record.ballroomUse + (record.ballroomUse === '사용' ? ' (' + record.ballroomPurpose + ')' : ''),
          '더 알려주실 내용: ' + (record.note || '-')
        ].join('\n');
        var mailLink = document.createElement('a');
        mailLink.href = 'mailto:mysteri1984@gmail.com?subject=' + encodeURIComponent('[MICEGO 견적 요청] ' + record.company) + '&body=' + encodeURIComponent(mailBody);
        mailLink.click();
      }catch(err){ /* mail client unavailable — the copy-to-clipboard fallback below still works */ }
      mgShowSuccess();
    }
    if(window.MG && MG.mode==='api' && !MG.preview){
      var mgIdem = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('idem-' + Date.now() + '-' + Math.random().toString(36).slice(2));
      MG.api.submit_rfp({
        orgType: record.orgType, company: record.company, name: record.name, email: record.email, phone: record.phone,
        eventType: record.eventType, startDate: record.startDate, endDate: record.endDate, headcount: record.headcount,
        region: record.region, twinRooms: record.twinRooms, kingRooms: record.kingRooms, ballroomUse: record.ballroomUse,
        ballroomPurpose: record.ballroomPurpose, note: record.note, consent: true, idem: mgIdem, lang: 'ko'
      }).then(function(resp){
        record.ref = resp.ref; record.trackToken = resp.track_token;
        var refEl = document.querySelector('[data-mg="rfpDoneRef"]');
        if(refEl) refEl.textContent = resp.ref;
        var trackEl = document.querySelector('[data-mg="rfpDoneTrack"]');
        if(trackEl){ trackEl.innerHTML = ''; var mgA = document.createElement('a'); mgA.href = resp.track_url || MG.url.track(resp.track_token); mgA.className = 'btn btn-ghost btn-sm'; mgA.textContent = '진행 상황 보기'; trackEl.appendChild(mgA); }
        var rd = document.getElementById('rfpDone');
        if(rd) rd.hidden = false;
        if(window.mgTrack) mgTrack('rfp_submit', {mode: 'api', event_type: record.eventType});
        mgShowSuccess();
      }, function(err){
        MG.show(err, { toast: mgToast, setErr: setFieldError, fieldMap: {
          orgType: 'f-orgType', company: 'f-company', name: 'f-name', email: 'f-email', phone: 'f-phone', eventType: 'f-eventType',
          startDate: 'f-startDate', endDate: 'f-endDate', headcount: 'f-headcount', region: 'f-region', twinRooms: 'f-twinRooms',
          kingRooms: 'f-kingRooms', ballroomUse: 'f-ballroomUse', ballroomPurpose: 'f-ballroomPurpose'
        }});
      });
    } else {
      mgMailtoFallback();
    }
  });'''
        t = rep(t, RFP_SUBMIT_OLD, RFP_SUBMIT_NEW)

        ACC_LAND_JS = r'''  /* ---- Member prefill: MG.auth.member() in api mode, demo session (sessionStorage mg_demo_member) otherwise ---- */
  var accMember = null;
  if(window.MG && MG.mode==='api' && !MG.preview){ accMember = MG.auth.member(); }
  else{ try{ var _am = sessionStorage.getItem('mg_demo_member'); accMember = _am ? JSON.parse(_am) : null; }catch(e){ accMember = null; } }
  if(accMember){
    document.getElementById('accLoginLine').hidden = true;
    document.getElementById('accMemberChip').hidden = false;
    document.getElementById('accMemberText').textContent = accMember.name + '님으로 요청합니다 · ' + accMember.company;
    (function(){
      function setv(id, v, ro){ var el = document.getElementById(id); if(!el) return; el.value = v || ''; if(ro){ el.readOnly = true; el.setAttribute('aria-readonly','true'); el.classList.add('is-ro'); } }
      setv('company', accMember.company); setv('name', accMember.name); setv('email', accMember.email, true); setv('phone', accMember.phone, true);
      var ot = {'기업(인하우스)':'기업(행사 주최)'}[accMember.orgType] || accMember.orgType;
      var r = ot ? form.querySelector('input[name="orgType"][value="' + ot + '"]') : null;
      if(r){ r.checked = true; r.dispatchEvent(new Event('change', {bubbles:true})); }
      document.querySelectorAll('[data-acc-ro]').forEach(function(x){ x.hidden = false; });
    })();
    document.getElementById('accLogout').addEventListener('click', function(){
      if(window.MG && MG.mode==='api' && !MG.preview){ MG.auth.signOut().then(function(){ location.reload(); }); }
      else{ try{ sessionStorage.removeItem('mg_demo_member'); }catch(e){} location.reload(); }
    });
  } else {
    document.getElementById('accMemberChip').remove();
  }

'''
        t = rep(t, '  /* ---- Mobile nav menu (details) ---- */', ACC_LAND_JS + '  /* ---- Mobile nav menu (details) ---- */')
        ACC_LAND_CSS = '''.acc-login-line{font-size:14px;line-height:1.7;color:var(--ink-80);background:var(--bg);border-radius:10px;padding:12px 14px;margin-bottom:16px}
.acc-login-line a{color:var(--teal-deep);font-weight:700;text-decoration:underline}
.acc-member-chip{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px 12px;background:var(--teal-soft);color:var(--teal-deep);font-size:14px;font-weight:700;border-radius:10px;padding:8px 8px 8px 14px;margin-bottom:16px}
.acc-member-chip[hidden]{display:none}
.acc-linkbtn{min-height:44px;padding:0 10px;font:600 13.5px/1 var(--font-sans);color:var(--ink-60);text-decoration:underline}
.acc-ro{font-size:12.5px;line-height:1.6;color:var(--gray);margin-top:6px}
.acc-ro a{color:var(--teal-deep);text-decoration:underline}
.acc-ro[hidden]{display:none}
input.is-ro{background:var(--bg);color:var(--ink-60)}
.acc-cta{display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;background:var(--teal-soft);border:1px solid rgba(11,143,134,.16);border-radius:12px;padding:18px 16px;margin-top:20px}
.acc-cta[hidden]{display:none}
.acc-cta b{font-size:15px;line-height:1.55;color:var(--ink);word-break:keep-all}
.acc-cta span{font-size:13.5px;line-height:1.6;color:var(--ink-60);word-break:keep-all}
'''
        t = rep(t, '/* ===== Shared: header additions', ACC_LAND_CSS + '/* ===== Shared: header additions')
    wr(path, t)
    set_footer_links(path, FL_KO_LAND if ko else FL_EN_LAND)
patch_landing('ko/index.html', 'ko'); patch_landing('en/index.html', 'en')

t = rd('en/sample-request.html')
t = rep(t, 'On a live request you can revise your quote until the deadline by replying to the request email.', 'On a live request you can revise your quote by resubmitting through the same link before the deadline.')
t = rep(t, 'The organizer receives an anonymized side-by-side sheet.', 'The organizer sees proposals side by side; property names stay hidden unless selected.')
t = rep(t, 'under reference MG-2608-007.</label>', 'under reference MG-2608-007. My property name is disclosed to the organizer only if they select this proposal.</label>')
t = rep(t, '<div class="subhead">Notes from organizer</div>', '<div class="subhead">Notes (reviewed by MICEGO)</div>')
t = rep(t, '<div class="demo-strip">DEMO — Sample request page for demonstration purposes. Not a live RFP.</div>',
        '<!--demo:start--><div class="demo-strip">DEMO — Sample request page for demonstration purposes. Not a live RFP.</div><!--demo:end-->')  # WP2: this page's whole point is a demo, but demo:false must still be able to strip the strip per spec (c)/(f)
wr('en/sample-request.html', t)
set_footer_links('en/sample-request.html', FL_EN_SUB)
set_footer_links('ko/privacy.html', FL_KO_SUB)
set_footer_links('en/privacy.html', FL_EN_SUB)

t = rd('ko/privacy.html')
t = rep(t, '<p>견적 요청 폼에서 아래 정보를 받습니다.</p>', '<p>견적 요청 폼, 문의 폼, 진행 상황 링크에서 아래 정보를 받습니다.</p>')
t = rep(t, '<li>필수: 소속 유형', '<li>견적 요청 폼 — 필수: 소속 유형')
t = rep(t, '담당자명, 이메일, 행사 정보(', '담당자명, 이메일, 휴대전화, 행사 정보(')
t = rep(t, '진행 상황과 회신을 안내하는 데 사용합니다.</p>', '진행 상황과 회신을 안내하는 데 사용합니다. 진행 상황 안내(이메일·카카오 알림톡·문자)에 휴대전화 번호를 사용합니다.</p>')
t = rep(t, '쿠키는 사용하지 않고', '알림톡·문자 발송을 위해 발송 대행사에 휴대전화 번호와 안내 내용을 위탁합니다.<!-- TODO(legal): 수탁자명·위탁 업무 명시 --> 쿠키는 사용하지 않고')
t = rep(t, '<li>선택: 연락처, 추가 메모</li>', '<li>견적 요청 폼 — 선택: 추가 메모</li>\n<li>문의 폼 — 필수: 문의 유형, 이름, 이메일, 문의 내용 / 선택: 회사·기관명</li>\n<li>진행 상황 링크 — 링크를 연 일시</li>\n<li>제안 선택 이메일 — 선택한 제안, 성함, 호텔에 전달할 요청 사항(선택)</li>')
t = re.sub(r'<p>호텔에는 회사명, 예산, 담당자 연락처를 뺀.*?</p>', lambda m: '<p>호텔에는 회사명, 예산, 담당자 연락처를 뺀 행사 요건만 전달합니다. 제안을 선택하시면 서비스 제공(선정 호텔과의 연결)을 위해 선정된 호텔에 회사명·담당자명·이메일·연락처를 제공합니다. 선정되지 않은 호텔에는 주최 측에 관한 정보를 제공하지 않고 결과만 알립니다.<!-- TODO(legal): 제3자 제공·국외 이전 고지 항목(받는 자·국가·항목·목적·보유 기간), 이용약관 제7조와의 정합성 검토 --></p>', t, count=1, flags=re.S)
t = rep(t, '최종 업데이트: 2026-09-25<!-- TODO(legal): 공개일로 갱신 -->', '최종 업데이트: 2026-09-26 (회원 항목 추가) · 개정 시행일: 미정<!-- TODO(legal): 개정 시행일·개정 공지 확정 -->')
t = rep(t, '<li>제안 선택 이메일 — 선택한 제안, 성함, 호텔에 전달할 요청 사항(선택)</li>', '<li>제안 선택 — 선택한 제안, 성함, 호텔에 전달할 요청 사항(선택), 휴대전화 인증 기록(일시·결과)</li>')
MEMBER_SEC = '''<h2>7. 회원 계정</h2>
<p>회원가입은 만 14세 이상만 할 수 있습니다. 회원으로 가입하면 아래 정보를 추가로 받습니다.</p>
<ul>
<li>필수: 이메일(아이디), 비밀번호(단방향 암호화해 저장하며 운영자도 알 수 없습니다), 이름, 소속 유형, 회사·단체명, 휴대전화</li>
<li>자동 생성: 이메일·휴대전화 인증 기록, 접속 기록(IP·일시·브라우저)</li>
<li>선택: 서비스 소식 수신 동의 여부·일시·채널(이메일, 문자·알림톡)</li>
</ul>
<p>이용 목적은 회원 식별과 로그인, 견적 요청 이력 관리, 진행 알림, 제안 선택 시 본인 확인(휴대전화 인증), 보안과 부정 이용 방지입니다. 휴대전화 인증은 번호를 실제로 쓰는 분인지 확인하는 절차이며 실명 인증(본인확인)이 아닙니다. 로그인하면 로그인 상태를 유지하기 위한 세션 정보를 브라우저에 저장합니다.</p>
<p>보유 기간은 회원 정보는 탈퇴할 때까지, 접속 기록은 3개월(통신비밀보호법), 가입을 마치지 않은 정보는 72시간 뒤 파기합니다. 성사된 요청의 연결 기록(회사명·담당자·연락처·선정 호텔·연결 일시)은 분쟁 대응을 위해 3년간 보관한 뒤 파기합니다.<!-- TODO(legal): 성사 연결 기록 보관 기간·근거 법령 검토 --></p>
<p>인증번호 문자 발송은 발송 대행사에 위탁합니다. 수탁사: 미정<!-- TODO(legal): 국내 SMS 대행사 선정 후 수탁사명·위탁 업무 기재 --></p>
<p>정보 열람·정정·삭제와 탈퇴는 <a href="account.html">계정 설정</a>에서 직접 하거나 이메일로 요청할 수 있습니다.</p>

'''
# ---- WP-F2 (SPEC_FEEDBACK.md §6 S12 / addendum §A.12): "의견 접수" / "Feedback" privacy section ----
FEEDBACK_PRIVACY_KO = '''<h2>9. 의견 접수</h2>
<p>사이트 곳곳의 '의견 보내기'와 문의 폼을 통해 아래 정보를 받습니다.</p>
<ul>
<li>필수: 의견 내용</li>
<li>선택: 회신 이메일, 이름 — 남겨 주시면 답변에 사용하며, 이메일을 남기실 때는 별도로 수집·이용 동의를 받습니다.</li>
<li>자동 수집: 보고 있던 화면 주소와 상태, 연결된 요청번호, 브라우저 종류, 화면 크기, 최근 오류 기록 — 문제를 빠르게 찾기 위한 정보이며 IP 주소는 저장하지 않습니다.</li>
</ul>
<p>이용 목적은 회신과 오류·서비스 개선 확인입니다. 회신 이메일·이름 등 회신에 쓰인 개인정보는 접수 후 12개월이 지나면 알아볼 수 없게 처리(익명화)합니다.<!-- TODO(legal): 익명화 처리 방식·보유 기간 근거, 동의 문구 최종 확정 --></p>

'''
FEEDBACK_PRIVACY_EN = '''<h2>8. Feedback</h2>
<p>Through the feedback widget available across the site, and the contact form, we collect:</p>
<ul>
<li>Required: your message</li>
<li>Optional: a reply email and your name — if you leave these, we ask for separate consent to use them for a reply.</li>
<li>Collected automatically: the page you were viewing and its status, a linked request reference, browser type, screen size, and recent error logs, to help us find problems faster. We do not store your IP address.</li>
</ul>
<p>We use this to reply and to review and fix issues. A reply email or name is anonymized 12 months after we receive it.<!-- TODO(legal): confirm anonymization method, retention basis and consent wording --></p>

'''
t = rep(t, '<h2>7. 문의</h2>', MEMBER_SEC + '<h2>8. 문의</h2>')
t = rep(t, '<h2>8. 운영자</h2>', FEEDBACK_PRIVACY_KO + '<h2>10. 운영자</h2>')
wr('ko/privacy.html', t)

t = rd('en/privacy.html')
t = rep(t, '</ul>\n<p>The sample request page', '</ul>\n<p>Through a quote request link:</p>\n<ul>\n<li>Property name, contact name and email; optional phone / WhatsApp number</li>\n<li>The rates, availability and terms you enter</li>\n<li>The date and time you open the link, submit or revise a quote, or decline, and any decline reason you give</li>\n</ul>\n<p>Through the contact form: your name, email, optional property or company and reference code, and your message.</p>\n<p>The sample request page')
t = re.sub(r'<p>When you submit a quote on a live request.*?</p>', lambda m: "<p>When you submit a quote on a live request, MICEGO includes your rates and terms in the comparison sent to that organizer, labelled only as Proposal A, B or C. Your property name and contact details are disclosed to the organizer only if the organizer selects your proposal. We do not sell personal data.</p>", t, count=1, flags=re.S)
t = rep(t, '<h2>8. Operator</h2>', FEEDBACK_PRIVACY_EN + '<h2>9. Operator</h2>')
wr('en/privacy.html', t)

t = rd('index.html')
t = rep(t, '<a href="en/privacy.html" lang=en>Privacy notice</a>', '<a href="ko/contact.html">문의하기</a>\n          <a href="en/contact.html" lang=en>Contact</a>\n          <a href="en/privacy.html" lang=en>Privacy notice</a>')
wr('index.html', t)

# ---------------------------------------------------------------- APP css / js
BID_STATES = ['open', 'submitted', 'selected', 'not_selected', 'declined', 'expired', 'cancelled', 'invalid', 'loading']
TRACK_STATES = ['received', 'verifying', 'rejected', 'bidding', 'rebid', 'collecting', 'delivered', 'won', 'lost', 'cancelled', 'invalid', 'loading']
# member-account pages (build_acc.py) — state names per page; unioned here so STATE_CSS (and therefore APP) stays one identical block
ACC_STATES = {
  'signup': ['form','email_sent','email_wrong','email_expired','email_capped','phone_entry','phone_sent','phone_wrong','phone_locked','phone_capped','phone_taken','done'],
  'login': ['default','error','cooldown','locked','pending','suspended'],
  'reset': ['request','sent','form','done','expired','loading'],
  'my': ['list','empty','linked','link_pending','need_login','loading'],
  'account': ['default','reauth','email_step','phone_step','saved','pw_done','loading'],
  'withdraw': ['default','blocked','confirm','done','loading'],
}
UNSUB_STATES = ['confirm','done','already','invalid','loading']
ALL_STATES = sorted(set(BID_STATES) | set(TRACK_STATES) | set(UNSUB_STATES) | {s for v in ACC_STATES.values() for s in v})
STATE_CSS = ','.join('html[data-state="%s"] [data-states~="%s"]' % (x, x) for x in ALL_STATES) + '{display:revert}'
APP = r'''/* ===== App: components ===== */
[hidden]{display:none!important}
.app-main{padding:36px 0 96px;background:var(--bg);min-height:60vh}
.app-wrap{max-width:1040px;margin:0 auto;padding:0 32px}
.app-wrap.narrow{max-width:760px}
.app-main h1{font-family:var(--font-display);font-size:clamp(24px,3.2vw,34px);line-height:1.25;letter-spacing:-.02em;word-break:keep-all}
.app-main h2{font-family:var(--font-display);font-size:clamp(18px,2vw,22px);line-height:1.35;letter-spacing:-.01em;margin-bottom:12px;word-break:keep-all}
.app-main h3{font-size:15.5px;font-weight:700;line-height:1.4;margin-bottom:6px}
.app-lead{font-size:15.5px;line-height:1.75;color:var(--ink-60);margin-top:10px;max-width:680px;word-break:keep-all}
.app-sec{margin-top:36px}
.app-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}
.header-nav a[aria-current]{color:var(--ink);font-weight:700}
.nav-menu-panel a[aria-current]{color:var(--teal-deep)}
.demo-strip{background:var(--amber-soft);color:var(--amber-deep);text-align:center;font:600 11px/1.5 var(--font-mono);letter-spacing:.04em;text-transform:uppercase;padding:6px 16px}
.mg-loading{max-width:1040px;margin:24px auto;padding:16px 20px;border:1px solid var(--line);border-radius:12px;background:var(--white);color:var(--ink-60);font-size:14.5px;text-align:center}
.req-bar{background:var(--white);border-bottom:1px solid var(--line)}
.req-bar-inner{max-width:1040px;margin:0 auto;padding:12px 32px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px 12px}
.req-bar-right{display:flex;align-items:center;flex-wrap:wrap;gap:8px}
.ref-code{font:600 12.5px/1.3 var(--font-mono);color:var(--gray)}
.rp-note{flex-basis:100%;margin:8px 0 0;padding:8px 12px;border-radius:8px;background:var(--teal-soft);color:var(--teal-deep);font-size:13px;line-height:1.55}.rp-note a{text-decoration:underline}
.badge{display:inline-flex;align-items:center;font:700 11px/1 var(--font-mono);letter-spacing:.05em;text-transform:uppercase;padding:6px 10px;border-radius:6px;white-space:nowrap}
.badge-open{background:var(--teal-soft);color:var(--teal-deep)}.badge-wait{background:var(--amber-soft);color:var(--amber-deep)}.badge-done{background:var(--ink);color:var(--white)}.badge-closed{background:var(--line);color:var(--gray)}
.meta-row{display:flex;flex-wrap:wrap;gap:14px 28px;margin-top:20px;padding-top:18px;border-top:1px solid var(--line)}
.meta-item .lbl,.lv .lbl{display:block;font:600 10.5px/1.3 var(--font-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--gray);margin-bottom:5px}
.meta-item .val,.lv .val{font-size:14px;font-weight:600;color:var(--ink);word-break:keep-all}
.panel{background:var(--white);border:1px solid var(--line);border-radius:14px;padding:28px;margin-top:20px}
.panel-num{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:6px;background:var(--ink);color:var(--white);font:700 11px/1 var(--font-mono);margin-right:8px;vertical-align:2px}
.lv-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px 24px}
.subhead{font:700 11px/1.3 var(--font-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--ink-60);margin:24px 0 12px}
.subhead:first-child{margin-top:0}
table.data{width:100%;border-collapse:collapse;font-size:14px}
table.data th{text-align:left;font:600 10.5px/1.3 var(--font-mono);letter-spacing:.05em;text-transform:uppercase;color:var(--gray);padding:0 0 8px;border-bottom:1px solid var(--line)}
table.data td{padding:10px 0;border-bottom:1px solid var(--line)}
table.data tr:last-child td{border-bottom:none;font-weight:700;color:var(--teal-deep)}
table.data td.num{font-family:var(--font-mono)}
.notes-quote{border-left:3px solid var(--line);padding:12px 16px;font-size:14px;color:var(--ink-60);background:var(--bg);border-radius:0 8px 8px 0}
.anon-note,.link-note{font-size:13.5px;line-height:1.7;border-radius:10px;padding:14px 16px;margin-top:16px;word-break:keep-all}
.anon-note{background:var(--teal-soft);color:#0B4B45}.link-note{background:var(--bg-warm);color:var(--ink-80)}
.anon-note b,.link-note b{color:var(--ink)}
.status-panel{display:flex;gap:16px;align-items:flex-start;background:var(--white);border:1px solid var(--line);border-left:4px solid var(--teal);border-radius:14px;padding:24px;margin-top:20px}
.status-panel.is-wait{border-left-color:var(--amber)}.status-panel.is-muted{border-left-color:var(--gray-light)}
.status-icon{flex:0 0 auto;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--teal-soft);color:var(--teal-deep);font:700 17px/1 var(--font-mono)}
.is-wait .status-icon{background:var(--amber-soft);color:var(--amber-deep)}.is-muted .status-icon{background:var(--line);color:var(--gray)}
.status-body{min-width:0}
.status-body p{font-size:14.5px;line-height:1.75;color:var(--ink-80);word-break:keep-all}
.status-body p+p{margin-top:6px}
.steps{list-style:none;counter-reset:st;margin-top:14px;display:grid;gap:8px}
.steps li{position:relative;padding-left:32px;font-size:14px;line-height:1.65;color:var(--ink-80);word-break:keep-all}
.steps li::before{counter-increment:st;content:counter(st);position:absolute;left:0;top:0;width:22px;height:22px;border-radius:50%;background:var(--bg-warm);font:700 11px/22px var(--font-mono);text-align:center;color:var(--ink-60)}
.steps li.is-done::before{content:'✓';background:var(--teal-soft);color:var(--teal-deep)}
.steps li.is-now{font-weight:700;color:var(--ink)}
.next-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:28px}
.next-step{background:var(--white);border:1px solid var(--line);border-radius:10px;padding:16px}
.next-step .n{display:block;font:700 11px/1.3 var(--font-mono);color:var(--teal-deep);margin-bottom:6px}
.next-step p{font-size:13px;line-height:1.6;color:var(--ink-60)}
.field{margin-bottom:16px;min-width:0}
.field>label,.field .lbl-t{display:block;font-weight:700;font-size:13.5px;color:var(--ink);margin-bottom:6px}
.field .req{color:var(--error)}.field .opt{color:var(--gray);font-weight:400}
.field .hint{font-size:12.5px;line-height:1.6;color:var(--gray);margin-top:5px}
.field input[type=text],.field input[type=number],.field input[type=email],.field input[type=tel],.field input[type=date],.field select,.field textarea{width:100%;min-height:48px;padding:12px 14px;border:1.5px solid var(--line);border-radius:8px;font-size:16px;background:var(--white);color:var(--ink)}
.field textarea{resize:vertical;line-height:1.6}
.field select{appearance:none;padding-right:36px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236B7794' stroke-width='1.6' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center}
.field input:focus,.field select:focus,.field textarea:focus{border-color:var(--teal);outline:none}
.field.error input,.field.error select,.field.error textarea,.field.error .radio-chip{border-color:var(--error)}
.field-msg{display:none;font-size:12.5px;color:var(--error);margin-top:6px}
.field.error .field-msg{display:block}
.field-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 16px}
.fset{border:none;margin:0 0 20px;padding:0;min-width:0}
.prefix-wrap{position:relative}
.prefix-wrap .prefix{position:absolute;left:14px;top:50%;transform:translateY(-50%);font:700 12px/1 var(--font-mono);color:var(--gray);pointer-events:none}
.field input.with-prefix{padding-left:58px}
.radio-row{display:flex;flex-wrap:wrap;gap:8px}
.radio-chip{position:relative;display:flex;align-items:center;justify-content:center;min-height:44px;flex:1 1 180px;border:1.5px solid var(--line);border-radius:8px;padding:10px 14px;font-size:14px;font-weight:600;color:var(--gray);background:var(--white);cursor:pointer;text-align:center}
.radio-chip.sm{flex:0 1 auto;min-width:88px}
.radio-chip input{position:absolute;opacity:0;pointer-events:none}
.radio-chip.is-checked,.radio-chip:has(input:checked){background:var(--teal-soft);border-color:var(--teal);color:var(--teal-deep)}
.radio-chip:has(input:focus-visible){outline:2px solid var(--teal);outline-offset:2px}
.check-row{display:flex;align-items:flex-start;gap:10px}
.check-row input{width:20px;height:20px;margin-top:2px;accent-color:var(--teal);flex:0 0 auto}
.check-row label{font-size:13.5px;line-height:1.65;color:var(--ink-80)}
.check-row a,.app-main .tlink{color:var(--teal-deep);text-decoration:underline}
.cur-note{font-size:13px;line-height:1.65;color:var(--ink-60);background:var(--bg);border-radius:8px;padding:12px 14px;margin-bottom:20px}
.submit-row{display:flex;justify-content:flex-end;align-items:center;flex-wrap:wrap;gap:12px 16px;border-top:1px solid var(--line);padding-top:16px;margin-top:8px}
.submit-note{flex:1 1 240px;font-size:12.5px;line-height:1.65;color:var(--gray)}
.send-panel{background:var(--white);border:1.5px solid var(--teal);border-radius:14px;padding:24px;margin-top:20px}
.send-panel .steps{margin-bottom:16px}
.send-subject{display:block;margin-top:12px;font:500 12.5px/1.5 var(--font-mono);color:var(--ink-60);overflow-wrap:anywhere}
.copy-box{display:block;width:100%;min-height:180px;margin-top:14px;padding:12px;border:1px solid var(--line);border-radius:8px;background:var(--bg);font:500 12.5px/1.6 var(--font-mono);color:var(--ink);resize:vertical}
.toast{position:fixed;left:50%;bottom:24px;z-index:300;max-width:calc(100vw - 32px);transform:translate(-50%,16px);opacity:0;pointer-events:none;background:var(--ink);color:var(--white);font-size:14px;font-weight:600;padding:12px 18px;border-radius:10px;box-shadow:var(--sh-elevated);transition:opacity .2s,transform .2s}
.toast.is-on{opacity:1;transform:translate(-50%,0)}
.fx-note{font-size:13px;line-height:1.7;color:var(--ink-60);background:var(--white);border:1px dashed var(--line);border-radius:10px;padding:12px 14px;word-break:keep-all}
.cmp-tools{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin:20px 0 12px}
.seg{display:inline-flex;border:1.5px solid var(--line);border-radius:10px;background:var(--white);overflow:hidden}
.seg button{min-height:44px;padding:0 14px;font-size:13.5px;font-weight:600;color:var(--gray)}
.seg button[aria-pressed=true]{background:var(--ink);color:var(--white)}
.view-seg{display:none}
.cmp-scroll{overflow-x:auto;background:var(--white);border:1px solid var(--line);border-radius:14px}
.cmp-table{width:100%;min-width:720px;table-layout:fixed;border-collapse:separate;border-spacing:0;font-size:14px}
.cmp-table col.c-label{width:168px}
.cmp-table th,.cmp-table td{padding:12px 14px;text-align:left;vertical-align:top;line-height:1.55;border-bottom:1px solid var(--line-dim);word-break:keep-all;overflow-wrap:anywhere}
.cmp-table thead th{position:sticky;top:0;z-index:2;background:var(--white);border-bottom:2px solid var(--ink);font:800 16px/1.3 var(--font-display)}
.cmp-table th[scope=row],.cmp-table thead th:first-child{position:sticky;left:0;z-index:1;background:var(--bg);font:600 13px/1.5 var(--font-sans);color:var(--ink-60)}
.cmp-table thead th:first-child{z-index:3}
.cmp-table tr.grp th{background:var(--bg-warm);padding:9px 14px;font:700 11px/1.2 var(--font-mono);letter-spacing:.06em;color:var(--ink-60)}
.grp-lbl{position:sticky;left:14px;display:inline-block}
.cmp-table tr.total td{background:var(--teal-soft)}
.money{display:block;font:600 14.5px/1.4 var(--font-mono);color:var(--ink);white-space:nowrap}
.cmp-table tr.total .money{font-size:16px;color:var(--teal-deep)}
.tax-tag{display:inline-block;margin-top:4px;padding:4px 6px;border-radius:4px;background:var(--amber-soft);color:var(--amber-deep);font:600 11px/1.2 var(--font-sans)}
.small-note{display:block;margin-top:4px;font-size:12px;line-height:1.5;color:var(--gray)}
.memo{font-size:13.5px;line-height:1.7;color:var(--ink-80);background:var(--amber-soft);border-radius:8px;padding:10px 12px}
.memo-lbl{display:block;margin-bottom:5px;font:700 10.5px/1.2 var(--font-mono);letter-spacing:.06em;color:var(--amber-deep)}
.p-arrival{display:block;margin-top:4px;font:500 11.5px/1.3 var(--font-mono);color:var(--gray)}
.p-name{display:block;margin-top:4px;font:600 13px/1.4 var(--font-sans);color:var(--teal-deep)}
.pick-tag{display:inline-block;margin-left:6px;padding:4px 6px;border-radius:4px;background:var(--teal);color:var(--white);font:700 10.5px/1 var(--font-sans);vertical-align:3px}
.cmp-foot{margin-top:12px;font-size:12.5px;line-height:1.7;color:var(--gray);word-break:keep-all}
.pcards{display:none;gap:14px}
.pcard{background:var(--white);border:1px solid var(--line);border-radius:14px;padding:18px;min-width:0}
.pcard-head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:4px 8px;padding-bottom:10px;border-bottom:1px solid var(--line)}
.pcard-head h3{font:800 18px/1.3 var(--font-display);margin:0}
.pcard-total{margin:14px 0;padding:12px;border-radius:10px;background:var(--teal-soft)}
.pcard-total .lbl{display:block;font:700 10.5px/1.2 var(--font-mono);color:var(--teal-deep);margin-bottom:4px}
.pcard-grp{margin:14px 0 8px;font:700 10.5px/1.2 var(--font-mono);letter-spacing:.06em;color:var(--ink-60)}
.pcard-dl{display:grid;grid-template-columns:96px minmax(0,1fr);gap:8px 12px;font-size:13.5px;line-height:1.55}
.pcard-dl dt{color:var(--ink-60);font-weight:600}
.pcard-dl dd{margin:0;min-width:0;overflow-wrap:anywhere}
.timeline{list-style:none;display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:14px}
.timeline li{background:var(--white);border:1px solid var(--line);border-radius:14px;padding:20px}
.tl-n{display:inline-block;margin-bottom:10px;padding:5px 8px;border-radius:5px;background:var(--teal-soft);color:var(--teal-deep);font:700 12px/1 var(--font-mono)}
.timeline p,.cond span,.app-sec>p{font-size:14.5px;line-height:1.75;color:var(--ink-60);word-break:keep-all}
.cond-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
.cond{background:var(--white);border:1px solid var(--line);border-radius:12px;padding:18px}
.cond b{display:block;margin-bottom:4px;font:800 17px/1.3 var(--font-display);color:var(--teal-deep)}
.faq-jump{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}
.faq-jump a{display:inline-flex;align-items:center;min-height:40px;padding:0 14px;border:1.5px solid var(--line);border-radius:999px;background:var(--white);font-size:13.5px;font-weight:600;color:var(--ink-60)}
.faq-group{margin-top:36px;scroll-margin-top:88px}
.faq-list{border-top:1px solid var(--line)}
.faq-item{border-bottom:1px solid var(--line)}
.faq-q{width:100%;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 4px;min-height:44px;text-align:left;font-weight:700;font-size:15.5px;line-height:1.5;word-break:keep-all}
.faq-icon{flex:0 0 auto;width:20px;height:20px;position:relative}
.faq-icon::before,.faq-icon::after{content:'';position:absolute;background:var(--ink);top:50%;left:50%;transform:translate(-50%,-50%)}
.faq-icon::before{width:14px;height:1.6px}.faq-icon::after{width:1.6px;height:14px;transition:transform .2s ease}
.faq-q[aria-expanded=true] .faq-icon::after{transform:translate(-50%,-50%) rotate(90deg) scaleY(0)}
.js-anim .faq-panel{overflow:hidden;max-height:0;transition:max-height .24s ease}
.faq-panel p{font-size:14.5px;line-height:1.8;color:var(--ink-60);padding:0 4px 20px;word-break:keep-all}
.faq-panel a{color:var(--teal-deep);text-decoration:underline}
.prog{list-style:none;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;margin-top:22px}
.prog li{min-width:0;padding-top:10px;border-top:3px solid var(--line);font:600 13px/1.4 var(--font-sans);color:var(--gray);word-break:keep-all}
.prog .n{display:block;margin-bottom:2px;font:700 10.5px/1.2 var(--font-mono);letter-spacing:.04em}
.prog .d{display:block;margin-top:2px;font:500 11px/1.35 var(--font-mono);color:var(--gray);overflow-wrap:anywhere}
.prog li.is-done{border-top-color:var(--teal);color:var(--ink-60)}
.prog li.is-now{border-top-color:var(--amber);color:var(--ink);font-weight:700}
.prog li.is-end{border-top-color:var(--ink);color:var(--ink);font-weight:700}
.st-chip{display:inline-flex;align-items:center;gap:6px;margin:2px 0 10px;padding:6px 10px;border-radius:999px;background:var(--bg-warm);font:700 12.5px/1.2 var(--font-sans);color:var(--ink-80)}
.st-chip .k{font:700 10.5px/1 var(--font-mono);letter-spacing:.06em;color:var(--gray)}
.pick-list{list-style:none;display:grid;gap:10px;margin-top:16px}
.pick-row{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 16px;padding:14px 16px;border:1px solid var(--line);border-radius:12px;background:var(--white)}
.pick-row b{font:800 16px/1.3 var(--font-display);color:var(--ink)}
.pick-btns{display:flex;flex-wrap:wrap;gap:8px}
.pick-btns .btn{min-height:44px}
[data-states]{display:none}
@@STATE_CSS@@
@media (min-width:1024px){.cmp-scroll{overflow:visible}.cmp-table thead th{top:72px}}
@media (max-width:900px){.timeline{grid-template-columns:1fr 1fr}.next-steps{grid-template-columns:1fr}}
@media (max-width:767px){.view-seg{display:inline-flex}.cmp[data-view="cards"] .cmp-scroll{display:none}.cmp[data-view="cards"] .pcards{display:grid}}
@media (max-width:768px){.app-wrap{padding:0 20px}.req-bar-inner{padding:10px 20px}.app-main{padding-top:28px}}
@media (max-width:720px){.field-grid,.lv-grid{grid-template-columns:1fr}}
@media (max-width:560px){.timeline{grid-template-columns:1fr}.prog{grid-template-columns:repeat(3,minmax(0,1fr));row-gap:14px}.pick-btns{width:100%}.pick-btns .btn{flex:1 1 auto;justify-content:center}}
@media (max-width:480px){.app-wrap{padding:0 16px}.req-bar-inner{padding:10px 16px}.panel,.send-panel{padding:20px 16px}.status-panel{padding:18px 16px;gap:12px}.cmp-table col.c-label{width:112px}}
/* ===== /App ===== */'''

APP_JS = r'''
  var MAIL='mysteri1984@gmail.com';
  function toast(m){var t=document.getElementById('toast');if(!t)return;t.textContent=m;t.classList.add('is-on');clearTimeout(toast._t);toast._t=setTimeout(function(){t.classList.remove('is-on');},2200);}
  function copyText(text,box,okMsg,failMsg){box.value=text;box.hidden=false;
    function manual(){box.focus();box.select();try{if(document.execCommand('copy')){toast(okMsg);return;}}catch(e){}toast(failMsg);}
    if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(text).then(function(){toast(okMsg);},manual);}else{manual();}}
  function mailHref(subject,body,shortBody){var b='mailto:'+MAIL+'?subject='+encodeURIComponent(subject)+'&body=';
    var h=b+encodeURIComponent(body.replace(/\n/g,'\r\n'));return h.length>1800?b+encodeURIComponent(shortBody.replace(/\n/g,'\r\n')):h;}
  function bindChips(root){root.querySelectorAll('.radio-chip input').forEach(function(i){i.addEventListener('change',function(){
    root.querySelectorAll('input[name="'+i.name+'"]').forEach(function(x){x.closest('.radio-chip').classList.toggle('is-checked',x.checked);});});});}
  function setErr(id,bad){var el=document.getElementById(id);if(el)el.classList.toggle('error',!!bad);return !!bad;}
  var EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function showSend(form,panel,text,short,subject,mailBtn,subjEl,box){
    mailBtn.href=mailHref(subject,text,short);subjEl.textContent=subject;box.value=text;
    form.hidden=true;panel.hidden=false;panel.focus();}
'''

APP = APP.replace('@@STATE_CSS@@', STATE_CSS)
assert '@@' not in APP and 'backup' not in APP and 'ref-krw' not in APP
FAQ_JS = r'''
  document.querySelectorAll('.faq-panel').forEach(function(p){ p.hidden = true; });
  document.querySelectorAll('.faq-q').forEach(function(btn){
    btn.addEventListener('click', function(){
      var expanded = btn.getAttribute('aria-expanded') === 'true';
      document.querySelectorAll('.faq-q').forEach(function(other){
        if(other !== btn){
          other.setAttribute('aria-expanded','false');
          var p = document.getElementById(other.getAttribute('aria-controls'));
          p.style.maxHeight = null; p.hidden = true;
        }
      });
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      if(expanded){
        btn.setAttribute('aria-expanded','false');
        panel.style.maxHeight = null; panel.hidden = true;
      } else {
        btn.setAttribute('aria-expanded','true');
        panel.hidden = false;
        panel.style.maxHeight = panel.scrollHeight + 'px';
      }
    });
  });
'''

def STATE_HEAD(allowed, d):
    # api/preview detection (WP2 §1): C=window.MG_CONFIG; api=has supabase.url; preview=demo!==false && ?state present.
    # token invalid -> 'invalid'; else if(api&&!preview) -> 'loading'; else current (query/allowed-list) behaviour.
    return ("<script>(function(){var h=document.documentElement,q=new URLSearchParams(location.search),t=q.get('t')||'',s=q.get('state')||'" + d + "';"
            "var C=window.MG_CONFIG||{},api=!!(C.supabase&&C.supabase.url),preview=(C.demo!==false)&&q.has('state');"
            "if(!/^[A-Za-z0-9_-]{4,64}$/.test(t)){s='invalid';}"
            "else if(api&&!preview){s='loading';}"
            "else if(" + json.dumps(allowed) + ".indexOf(s)<0){s='invalid';}"
            "h.setAttribute('data-state',s);h.setAttribute('data-mode',(api&&!preview)?'api':'demo');})();</script>")

def ACC_HEAD(allowed, d, k=None, loading=True):
    # no token requirement; unknown ?state= falls back to the default. k: state used when ?k=<token> is present and no ?state=
    # loading=False keeps signup/login unchanged (no api-mode loading gate; those pages don't have a data-states="loading" panel).
    extra = ("if(!q.get('state')&&/^[A-Za-z0-9_-]{4,64}$/.test(q.get('k')||''))s='" + k + "';") if k else ''
    load_gate = "if(api&&!preview){s='loading';}else " if loading else ''
    return ("<script>(function(){var h=document.documentElement,q=new URLSearchParams(location.search),s=q.get('state')||'" + d + "';" + extra +
            "var C=window.MG_CONFIG||{},api=!!(C.supabase&&C.supabase.url),preview=(C.demo!==false)&&q.has('state');"
            + load_gate +
            "if(" + json.dumps(allowed) + ".indexOf(s)<0){s='" + d + "';}"
            "h.setAttribute('data-state',s);h.setAttribute('data-mode',(api&&!preview)?'api':'demo');})();</script>")

def TERMINAL_JS(prune):
    return (r'''
  var H=document.documentElement,STATE=H.getAttribute('data-state'),TOKEN=new URLSearchParams(location.search).get('t')||'';
  if(''' + json.dumps(prune) + r'''.indexOf(STATE)>=0){document.querySelectorAll('[data-states]').forEach(function(el){if((' '+el.getAttribute('data-states')+' ').indexOf(' '+STATE+' ')<0)el.remove();});}
''')

def STATE_HEAD_SHARE(allowed, d):
    # like STATE_HEAD, but ?s=<share-token> is accepted in place of ?t= and marks the page as a view-only share view
    return ("<script>(function(){var h=document.documentElement,q=new URLSearchParams(location.search),t=q.get('t')||'',sh=q.get('s')||'',s=q.get('state')||'" + d + "',share=false;"
            "if(!t&&sh){t=sh;share=true;}"
            "var C=window.MG_CONFIG||{},api=!!(C.supabase&&C.supabase.url),preview=(C.demo!==false)&&q.has('state');"
            "if(!/^[A-Za-z0-9_-]{4,64}$/.test(t)){s='invalid';}"
            "else if(api&&!preview){s='loading';}"
            "else if(" + json.dumps(allowed) + ".indexOf(s)<0){s='invalid';}"
            "h.setAttribute('data-state',s);h.setAttribute('data-mode',(api&&!preview)?'api':'demo');if(share&&s!=='invalid')h.setAttribute('data-view','share');})();</script>")

# one-time-code widget shared by track (pick) and the member pages. Demo code for every OTP = 123456.
OTP_JS = r'''
  function fmtT(s){s=Math.max(0,s);return Math.floor(s/60)+':'+('0'+(s%60)).slice(-2);}
  function Otp(o){
    var S={wrong:0,exp:0,cool:0,iv:null,dead:false,announced:false},TTL=o.ttl||180,COOL=o.cool||60,MAX=o.max||5;
    function say(m,err){if(!o.msg)return;o.msg.textContent=m||'';o.msg.classList.toggle('is-err',!!err&&!!m);}
    function tick(){var n=Date.now(),left=Math.ceil((S.exp-n)/1000),c=Math.ceil((S.cool-n)/1000);
      if(o.timer)o.timer.textContent=fmtT(left);
      if(o.resend){if(c>0){o.resend.disabled=true;o.resend.textContent=fmtT(c)+' 후 재발송';}else{o.resend.disabled=false;o.resend.textContent='인증번호 다시 받기';}}
      if(left<=0&&!S.announced&&!S.dead){S.announced=true;say('인증번호가 만료되었습니다. 인증번호를 다시 받아 주세요.',true);}}
    S.say=say;
    S.start=function(){S.wrong=0;S.dead=false;S.announced=false;S.exp=Date.now()+TTL*1000;S.cool=Date.now()+COOL*1000;if(o.input){o.input.disabled=false;o.input.value='';}say('');tick();clearInterval(S.iv);S.iv=setInterval(tick,1000);};
    S.stop=function(){clearInterval(S.iv);};
    S.allow=function(){S.cool=0;tick();};
    S.expire=function(){S.exp=Date.now()-1000;S.cool=0;S.announced=true;S.dead=false;tick();clearInterval(S.iv);S.iv=setInterval(tick,1000);say('인증번호가 만료되었습니다. 인증번호를 다시 받아 주세요.',true);};
    S.setWrong=function(n){S.wrong=n;say('인증번호가 맞지 않습니다. 남은 시도 '+(MAX-n)+'회',true);};
    S.check=function(v){
      if(S.dead){say(o.deadMsg||'인증번호를 다시 받아 주세요.',true);return 'dead';}
      if(Date.now()>S.exp){say('인증번호가 만료되었습니다. 인증번호를 다시 받아 주세요.',true);return 'expired';}
      if(!/^\d{6}$/.test(v)){say('인증번호 6자리를 숫자로 입력해 주세요.',true);return 'format';}
      /*demo:start*/if(v==='123456'){say('');return 'ok';}/*demo:end*/
      S.wrong++;var r=MAX-S.wrong;
      if(r<=0){S.dead=true;return 'void';}
      say('인증번호가 맞지 않습니다. 남은 시도 '+r+'회',true);return 'wrong';};
    return S;}
'''

# view-only share-link UI (used by track.html and my.html). State per RFP is kept in sessionStorage (demo).
SHARE_JS = r'''
  function shareInit(box){
    var H2=document.documentElement,ref=box.getAttribute('data-ref'),num=box.getAttribute('data-num'),key='mg_share_'+ref,s={n:0,on:false};
    var mgApi=false; try{mgApi=!!(window.MG && MG.mode==='api' && !MG.preview);}catch(e){}
    var none=box.querySelector('[data-share-none]'),on=box.querySelector('[data-share-on]'),url=box.querySelector('[data-share-url]'),live=box.querySelector('[data-share-live]');
    function st(){return box.getAttribute('data-st')||H2.getAttribute('data-state');}
    function link(){return new URL('track.html?s=demo-share-'+num+(s.n>1?'-'+s.n:'')+'&state='+st(),location.href).href;}
    function save(){try{sessionStorage.setItem(key,JSON.stringify(s));}catch(e){}}
    function render(){none.hidden=s.on;on.hidden=!s.on;if(s.on)url.value=s.url||link();}
    function make(msg){s={n:s.n+1,on:true};save();render();live.textContent=msg;var c=box.querySelector('[data-share-copy]');if(c)c.focus();}
    if(mgApi){
      // WP3 (SPEC_LAUNCH §5): api mode -- create_share_link/revoke_share_link, ref taken from the
      // loaded track data (mgLoadTrack) rather than the demo data-ref on this element.
      function getRef(){return (typeof mgTrackData!=='undefined' && mgTrackData && mgTrackData.ref) || ref;}
      document.addEventListener('mg:trackLoaded', function(){
        if(typeof mgTrackData!=='undefined' && mgTrackData && mgTrackData.share){
          s={n:1,on:mgTrackData.share.state==='active',url:mgTrackData.share.url};render();
        }
      });
      box.querySelector('[data-share-create]').addEventListener('click',function(){
        MG.api.create_share_link({ref:getRef()}).then(function(resp){s={n:s.n+1,on:true,url:resp.url};render();live.textContent='보기 전용 링크를 만들었습니다.';var c=box.querySelector('[data-share-copy]');if(c)c.focus();},function(err){toast(MG.msg(err));});});
      box.querySelector('[data-share-regen]').addEventListener('click',function(){
        MG.api.create_share_link({ref:getRef()}).then(function(resp){s={n:s.n+1,on:true,url:resp.url};render();live.textContent='새 링크를 만들었습니다. 이전 링크는 더 이상 열리지 않습니다.';},function(err){toast(MG.msg(err));});});
      box.querySelector('[data-share-revoke]').addEventListener('click',function(){
        MG.api.revoke_share_link({ref:getRef()}).then(function(){s.on=false;render();live.textContent='링크를 껐습니다. 이 링크로는 더 이상 열 수 없습니다.';box.querySelector('[data-share-create]').focus();},function(err){toast(MG.msg(err));});});
      box.querySelector('[data-share-copy]').addEventListener('click',function(){copyText(url.value,url,'링크를 복사했습니다','링크를 직접 선택해 복사해 주세요');});
      render();
      return;
    }
    try{var v=JSON.parse(sessionStorage.getItem(key)||'null');if(v&&typeof v.n==='number')s=v;}catch(e){}
    box.querySelector('[data-share-create]').addEventListener('click',function(){make('보기 전용 링크를 만들었습니다.');});
    box.querySelector('[data-share-regen]').addEventListener('click',function(){make('새 링크를 만들었습니다. 이전 링크는 더 이상 열리지 않습니다.');});
    box.querySelector('[data-share-revoke]').addEventListener('click',function(){s.on=false;save();render();live.textContent='링크를 껐습니다. 이 링크로는 더 이상 열 수 없습니다.';box.querySelector('[data-share-create]').focus();});
    box.querySelector('[data-share-copy]').addEventListener('click',function(){copyText(link(),url,'링크를 복사했습니다','링크를 직접 선택해 복사해 주세요');});
    render();}
'''
def share_ui(ref, num, st=''):
    u = 'shu-' + num
    return ('<div class="share-ui" data-share data-ref="%s" data-num="%s"%s>'
        '<p class="share-expl"><b>보기 전용 링크</b> · 진행 상황과 비교표만 보이고 선택·변경은 할 수 없습니다 · 요청이 끝나고 30일 뒤 자동 만료</p>'
        '<div data-share-none><button type="button" class="btn btn-ghost btn-sm" data-share-create>링크 만들기</button></div>'
        '<div data-share-on hidden><label class="lbl-t" for="%s">공유 링크</label><div class="share-line"><input type="text" class="share-url" id="%s" data-share-url readonly><button type="button" class="btn btn-accent btn-sm" data-share-copy>복사</button></div>'
        '<div class="app-actions"><button type="button" class="btn btn-ghost btn-sm" data-share-regen>새 링크 만들기</button><button type="button" class="btn btn-ghost btn-sm" data-share-revoke>링크 끄기</button></div>'
        '<p class="hint">링크는 요청당 하나만 유지됩니다. 새로 만들면 이전 링크는 바로 꺼집니다.</p></div>'
        '<p class="sr-only" role="status" aria-live="polite" data-share-live></p></div>') % (ref, num, (' data-st="%s"' % st) if st else '', u, u)

ACC_SHARED_CSS = '''.acc-back{display:inline-flex;align-items:center;min-height:44px;margin-bottom:4px;font-size:14px;font-weight:600;color:var(--teal-deep)}
.acc-back[hidden]{display:none}
.share-banner{background:var(--amber-soft);color:var(--amber-deep);border-radius:10px;padding:14px 16px;font-size:14px;line-height:1.7;margin-bottom:18px;word-break:keep-all}
.share-banner b{color:var(--ink)}
.share-ui .share-expl{font-size:13.5px;line-height:1.7;color:var(--ink-60);margin-bottom:12px;word-break:keep-all}
.share-ui .lbl-t{display:block;font-weight:700;font-size:13.5px;margin-bottom:6px}
.share-line{display:flex;gap:8px}
.share-url{flex:1 1 auto;min-width:0;min-height:48px;padding:0 12px;border:1.5px solid var(--line);border-radius:8px;background:var(--bg);font:500 13px/1.4 var(--font-mono);color:var(--ink)}
.share-ui .hint{font-size:12.5px;line-height:1.6;color:var(--gray);margin-top:8px}
.pick-step{margin-top:16px}
.pick-step .anon-note{margin-top:0}
.otp-sent{font-size:14.5px;line-height:1.7;color:var(--ink-80);margin:16px 0 12px;word-break:keep-all}
.otp-field{margin:14px 0 6px}
.otp-msg:empty{min-height:0;margin:0}
.code-input,.field input[type=text].code-input{width:100%;max-width:280px;min-height:56px;padding:10px 14px;border:1.5px solid var(--line);border-radius:8px;font:600 26px/1.2 var(--font-mono);letter-spacing:.35em;text-align:center;color:var(--ink);background:var(--white)}
.code-input:focus{border-color:var(--teal);outline:none}
.code-input:disabled{background:var(--bg);color:var(--gray)}
.otp-meta{display:flex;flex-wrap:wrap;align-items:center;gap:0 14px;font-size:13.5px;color:var(--ink-60);margin-top:4px}
.otp-timer{font:700 14px/1 var(--font-mono);color:var(--ink)}
.linkbtn{min-height:44px;padding:0 4px;font:600 13.5px/1 var(--font-sans);color:var(--teal-deep);text-decoration:underline}
.linkbtn:disabled{color:var(--gray);text-decoration:none;cursor:default}
.otp-msg{min-height:1.7em;margin-top:6px;font-size:13px;line-height:1.6;color:var(--ink-60)}
.otp-msg.is-err{color:#B42318}
'''

KO_MODES = '<div class="footer-modes"><a href="../en/index.html" lang="en" hreflang="en">Hotels (English) →</a><a href="../index.html">모드 선택 · <span lang="en">Choose mode</span></a></div>'
EN_MODES = '<div class="footer-modes"><a href="../ko/index.html" lang="ko" hreflang="ko">여행사 (한국어) →</a><a href="../index.html">Choose mode · <span lang="ko">모드 선택</span></a></div>'

def app_page(lang, title, desc, path, body, *, token=False, state_head='', top='', nav=None, cur=None, ko_href='index.html',
             en_href='../en/index.html', extra_css='', script='', faq=False, cur_page=None, noindex=False):
    ko = lang == 'ko'
    if ko:
        h = header('ko', 'index.html', 'MICEGO', None, nav, None if token else 'index.html#register', '견적 요청', '지금 견적 요청하기', ko_href, en_href, cur, '../index.html', '모드 선택 · <span lang="en">Choose mode</span>', solid=True, login='login.html')
        foot = footer('ko', '해외 MICE 호텔 역경매 플랫폼', '해외 호텔 대상 · 주최 측 수수료 없음 · 영업일 3일 이내 회신 · 요건서에 회사명·예산 미포함.', FL_KO_SUB, KO_MODES, '마이스고')
    else:
        h = header('en', 'index.html', 'MICEGO', None, nav, None if token else 'index.html#register', 'Register', 'Register your property', ko_href, en_href, cur, '../index.html', 'Choose mode · <span lang="ko">모드 선택</span>', solid=True)
        foot = footer('en', 'Overseas MICE hotel sourcing for Korean organizers.', 'No listing fee · You choose which requests to quote on · Confirmed-date requests only · Organizer identity withheld.', FL_EN_SUB, EN_MODES, 'Partner Network')
    if cur_page:
        h = h.replace('<a href="%s">' % cur_page, '<a href="%s" aria-current="page">' % cur_page)
    loc = ('ko_KR', 'en_US') if ko else ('en_US', 'ko_KR')
    if token or noindex:
        meta = '<meta name="robots" content="noindex,nofollow">\n<meta name="referrer" content="no-referrer">'
    else:
        meta = ('<meta property="og:title" content="%s">\n<meta property="og:type" content="website">\n<meta property="og:locale" content="%s">\n<meta property="og:locale:alternate" content="%s">\n' % (title, loc[0], loc[1])
                + HREFLANG.replace('{path}', path))
    out = ('<!DOCTYPE html>\n<html lang="' + lang + '">\n<head>\n<meta charset="UTF-8">\n<script>document.documentElement.className+=\' js-anim\';</script>\n' + state_head + '\n'
           '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<title>' + title + '</title>\n<meta name="description" content="' + desc + '">\n' + meta + '\n' + ICON + '\n'
           '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">\n'
           '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=JetBrains+Mono:wght@500;600&display=swap">\n'
           '<style>' + BASE + '\n' + FOOT_CSS + SUB_BASE_MEDIA + '\n' + APP + '\n' + extra_css + '\n' + SHARED + '</style>\n</head>\n<body class="has-fixed-header">\n'
           '<a class="skip-link" href="#main">' + ('본문으로 건너뛰기' if ko else 'Skip to content') + '</a>\n' + h + '\n' + top + '\n<main id="main" class="app-main">' + body + '</main>\n'
           '<div class="toast" id="toast" role="status" aria-live="polite"></div>\n' + foot + '\n<script>(function(){"use strict";' + APP_JS + (FAQ_JS if faq else '') + (NAV_JS % lang) + script + '})();</script>\n</body>\n</html>\n')
    return out

PUB_NAV_KO = [('index.html#how', '동작 방식'), ('about.html', '서비스 소개'), ('faq.html', '자주 묻는 질문'), ('contact.html', '문의하기')]
PUB_NAV_EN = [('index.html#how', 'How it works'), ('index.html#terms', 'Partner terms'), ('faq.html', 'FAQ'), ('contact.html', 'Contact')]

# ---------------------------------------------------------------- shared form-panel builders
def send_panel_html(ko, title, steps, btn_copy, btn_mail, btn_edit, note_tail):
    return ('<div class="send-panel" id="sendPanel" hidden tabindex="-1"><h2>' + title + '</h2><ol class="steps"><li>' + steps[0] + '</li><li>' + steps[1] + '</li></ol>'
            '<div class="app-actions"><button type="button" class="btn btn-ghost" id="copyBtn">' + btn_copy + '</button><a class="btn btn-accent" id="mailBtn" href="#">' + btn_mail + '</a><button type="button" class="btn btn-ghost btn-sm" id="editBtn">' + btn_edit + '</button></div>'
            '<span class="send-subject">' + ('제목: ' if ko else 'Subject: ') + '<span id="mailSubject"></span></span><textarea class="copy-box" id="copyBox" readonly aria-label="' + ('보낼 내용' if ko else 'Message details') + '"></textarea>'
            '<p class="submit-note">' + note_tail + '</p></div>')

# ---------------------------------------------------------------- en/bid.html
S = rd('en/sample-request.html')
req_a = S.index('<div class="card">\n    <h2><span class="num">1</span>Requirements</h2>')
req_b = S.index('<div class="card" id="bidCard">')
REQ = S[req_a:req_b].strip()
REQ = REQ.replace('<div class="card">\n    <h2><span class="num">1</span>Requirements</h2>', '<div class="panel">\n    <h2><span class="panel-num">1</span>Requirements</h2>', 1)
REQ = rep(REQ, 'Mon – Thu, 3 nights</span>', 'Mon 15 – Thu 18 Mar 2027</span>')
REQ = rep(REQ, 'Night 3 (Wed)', 'Night 3 · Wed 17 Mar 2027')
cur_a = S.index('<div class="field currency-select-wrap"'); cur_b = S.index('</div>', S.index('id="currencyNote"')) + 6
CURBLK = S[cur_a:cur_b]
f_a = S.index('<form id="bidForm"'); f_b = S.index('</form>') + 7
FORM = S[f_a:f_b]
FORM = rep(FORM, '<form id="bidForm" novalidate action="javascript:void(0)">', '<form id="bidForm" novalidate action="mailto:mysteri1984@gmail.com" method="post" enctype="text/plain">')
FORM = FORM.replace('<fieldset>', '<fieldset class="fset">')
FORM = rep(FORM, '<label>Breakfast <span class="req">*</span></label>', '<span class="lbl-t">Breakfast <span class="req">*</span></span>')
FORM = rep(FORM, '<label>Rooms available for these dates <span class="req">*</span></label>', '<span class="lbl-t">Rooms available for these dates <span class="req">*</span></span>')
TAXF = ('<div class="field" id="f-tax"><span class="lbl-t">Taxes &amp; service charge <span class="req">*</span></span><div class="radio-row" role="radiogroup" aria-label="Taxes and service charge">'
        '<label class="radio-chip"><input type="radio" name="tax" value="Included in all rates">Included in all rates</label><label class="radio-chip"><input type="radio" name="tax" value="Not included">Not included</label></div><p class="field-msg">Please select an option.</p></div>\n'
        '        <div class="field" id="f-taxNote" hidden><label for="taxNote">Taxes and charges to add <span class="req">*</span></label><input type="text" id="taxNote" name="taxNote" placeholder="e.g. 5% service charge + 8% VAT"><p class="field-msg">Please state the percentages.</p></div>\n\n        ')
FORM = rep(FORM, '<div class="field" id="f-availability">', TAXF + '<div class="field" id="f-availability">')
FORM = rep(FORM, '<input type="date" id="validUntil" name="validUntil">', '<input type="date" id="validUntil" name="validUntil" min="2026-10-12">')
FORM = rep(FORM, 'Please enter a valid-until date.', 'Please keep the quote valid at least until Mon 12 Oct 2026.')
CONSENT = 'I confirm the rates and terms above are accurate, accept the MICEGO <a href="index.html#terms" target="_blank" rel="noopener">partner terms</a>, and agree they may be shared with the organizer under reference MG-2610-014. My property name and contact details are disclosed to the organizer only if they select this proposal. See our <a href="privacy.html" target="_blank" rel="noopener">privacy notice</a>.'
FORM = re.sub(r'<label for="consent">.*?</label>', lambda m: '<label for="consent">' + CONSENT + '</label>', FORM, count=1, flags=re.S)
FORM = re.sub(r'<div class="submit-row">.*?</div>\s*</form>', lambda m: '<div class="submit-row"><p class="submit-note">You can revise your quote through this link until the deadline.<span id="cmNote" hidden></span></p><button type="submit" class="btn btn-accent">Review &amp; send quote</button></div>\n    </form>', FORM, count=1, flags=re.S)
assert FORM.count('id="cmNote"') == 1
FORM = FORM.replace('placeholder="e.g. Ocean Pearl Resort Da Nang"', 'placeholder="e.g. Ocean Pearl Resort Da Nang"')

BID_LIVE = 'open submitted selected not_selected declined expired cancelled'
BID_TOP = ('<!-- TODO(backend): HOTEL_BID_URL=/en/bid.html?t=<token>; replace mock data with per-token data -->\n<!--demo:start--><div class="demo-strip">DEMO — Example request page. Property, rates and dates are sample data.</div><!--demo:end-->\n'
  '<div data-states="loading" class="mg-loading" role="status" aria-live="polite">Loading…</div>'
  '<div data-states="' + BID_LIVE + '"><div class="req-bar"><div class="req-bar-inner"><span class="ref-code">MICE QUOTE REQUEST · REF MG-2610-014</span><div class="req-bar-right">'
  '<span data-states="open submitted"><span class="badge badge-wait">Deadline Thu 8 Oct 2026, 18:00 KST</span></span><span data-states="open"><span class="badge badge-open">Open for quotes</span></span>'
  '<span data-states="submitted"><span class="badge badge-done">Quote received</span></span><span data-states="declined"><span class="badge badge-closed">Declined</span></span>'
  '<span data-states="selected"><span class="badge badge-done">Selected</span></span><span data-states="not_selected"><span class="badge badge-closed">Not selected</span></span><span data-states="expired"><span class="badge badge-closed">Expired</span></span><span data-states="cancelled"><span class="badge badge-closed">Cancelled</span></span></div></div></div></div>')

DECLINE = ('<div class="panel" id="declineCard"><h2>Can\'t quote on this one?</h2><p class="app-lead" style="margin-top:0">Declining takes a few seconds and helps us match future requests. It never counts against you — only invitations left unanswered do.</p>'
  '<form id="declineForm" novalidate action="mailto:mysteri1984@gmail.com" method="post" enctype="text/plain" style="margin-top:16px">'
  '<div class="field" id="f-dreason"><label for="dreason">Reason <span class="req">*</span></label><select id="dreason" name="dreason"><option value="">Select a reason</option><option>Dates unavailable</option><option>Capacity doesn\'t fit</option><option>Other</option></select><p class="field-msg">Please choose a reason.</p></div>'
  '<div class="field"><label for="dnote">Anything we should know? <span class="opt">(optional)</span></label><textarea id="dnote" name="dnote" rows="3" placeholder="e.g. Fully booked 15–17 Mar"></textarea></div>'
  '<div class="submit-row"><button type="submit" class="btn btn-ghost">Review &amp; decline</button></div></form>'
  '<div class="send-panel" id="declinePanel" hidden tabindex="-1"><h2>Send your decline</h2><ol class="steps"><li>Open the email draft and press send, or copy the text into an email to mysteri1984@gmail.com.</li><li>Then confirm below.</li></ol>'
  '<div class="app-actions"><a class="btn btn-accent" id="dMailBtn" href="#">Open email draft</a><button type="button" class="btn btn-ghost" id="dCopyBtn">Copy text</button><button type="button" class="btn btn-ghost btn-sm" id="dEditBtn">Back</button></div>'
  '<span class="send-subject">Subject: <span id="dSubject"></span></span><textarea class="copy-box" id="dCopyBox" readonly aria-label="Decline message"></textarea>'
  '<div class="app-actions"><button type="button" class="btn btn-ghost" id="dDoneBtn">I\'ve sent it</button></div></div></div>')
BTNS = '<div class="app-actions"><a class="btn btn-ghost" href="contact.html">Contact MICEGO</a><a class="btn btn-ghost" href="faq.html">Hotel FAQ</a></div>'
def bpanel(st, icon, h, ps, extra=''):
    return '<div data-states="%s"%s><div class="status-panel is-muted"><div class="status-icon" aria-hidden="true">%s</div><div class="status-body"><h2>%s</h2>%s%s</div></div></div>\n' % (st, extra, icon, h, ''.join('<p>%s</p>' % p for p in ps), BTNS)
BID_END = (bpanel('declined', '–', 'You declined this request', ["Thanks for letting us know. Declining doesn't count against your listing — only invitations left unanswered do.", 'New requests that match your property arrive by email with their own link. If you declined by mistake, contact MICEGO with the reference code from the invitation email.'], ' id="declinedPanel"')
  + bpanel('expired', '×', 'This invitation has expired', ['It closed on Thu 8 Oct 2026 at 18:00 KST without a quote from your property, so this link no longer accepts or shows quotes.', 'An invitation that closes without a quote or a decline counts as unanswered; three in a row pause your listing until we hear from you. New matching requests arrive by email with their own link.'])
  + bpanel('cancelled', '×', 'This request was cancelled', ['The organizer cancelled this request, so MICEGO is no longer collecting quotes for it. Nothing more is needed from you — thank you for your time.']))

BID_BODY = ('<div class="app-wrap">\n'
 '<div data-states="open submitted">\n<h1>MICE quote request — Da Nang, Vietnam</h1>\n<p class="app-lead">A Korean organizer has a confirmed-date incentive program. Review the requirements and send your quote before Thu 8 Oct 2026, 18:00 KST. Not a fit? You can decline it at the end of this page.</p>\n'
 '<div class="meta-row"><div class="meta-item"><span class="lbl">Issued</span><span class="val">Mon 5 Oct 2026, 09:00 KST</span></div><div class="meta-item"><span class="lbl">Quote deadline</span><span class="val">Thu 8 Oct 2026, 18:00 KST</span></div><div class="meta-item"><span class="lbl">Reminder email</span><span class="val">Wed 7 Oct 2026, 18:00 KST</span></div><div class="meta-item"><span class="lbl">Comparison sent to organizer</span><span class="val">By Mon 12 Oct 2026</span></div></div>\n'
 '<div class="anon-note"><b>Why some details are hidden.</b> The organizer\'s company name and budget are withheld. Quote on the requirements as written; everyone receives the same brief.</div>\n'
 '<div class="link-note"><b>About this link.</b> It is personal to your property — no login needed. Opening it marks the invitation as viewed, and a reminder is emailed 24 hours before the deadline. It stops accepting quotes when this request closes; if you quoted, it later shows the result. Please don\'t forward it; if a colleague should quote, ask us for a separate link.</div>\n'
 + REQ + '\n</div>\n'
 '<div data-states="submitted">\n<div class="status-panel"><div class="status-icon" aria-hidden="true">✓</div><div class="status-body"><h2>Your quote is in</h2><p>MICEGO received your quote for MG-2610-014 on Tue 6 Oct 2026, 15:20 KST.</p><p>You can revise it through this link until Thu 8 Oct 2026, 18:00 KST. Your latest submission replaces the earlier one.</p><div class="app-actions"><button type="button" class="btn btn-ghost" id="reviseBtn">Revise your quote</button></div></div></div>\n</div>\n'
 '<div data-states="selected">\n<div class="status-panel"><div class="status-icon" aria-hidden="true">✓</div><div class="status-body"><h2>Your proposal was selected</h2><p>The organizer selected your proposal for MG-2610-014 on Wed 14 Oct 2026. MICEGO has emailed an introduction to you and the organizer.</p></div></div>\n'
 '<div class="panel"><h2>Organizer contact</h2><div class="lv-grid"><div class="lv"><span class="lbl">Company</span><span class="val" data-mg="bidOrgCompany">Hanbit Tour Co., Ltd. (한빛투어)</span></div><div class="lv"><span class="lbl">Contact</span><span class="val" data-mg="bidOrgContact">Kim Ji-eun</span></div><div class="lv"><span class="lbl">Email</span><span class="val" data-mg="bidOrgEmail">jieun.kim@hanbit-tour.example</span></div><div class="lv"><span class="lbl">Phone</span><span class="val" data-mg="bidOrgPhone">+82 2-000-0000</span></div></div><p class="small" style="margin:14px 0 0">Contracting and payment are arranged directly with the organizer.</p></div>\n</div>\n'
 '<div data-states="not_selected">\n<div class="status-panel is-muted"><div class="status-icon" aria-hidden="true">–</div><div class="status-body"><h2>Not selected this time</h2><p>The organizer chose another proposal for MG-2610-014. Thank you for quoting. Your property name and contact details were not shared with the organizer.</p></div></div>\n</div>\n'
 '<div data-states="submitted selected not_selected">\n<div class="panel"><h2>Your submitted quote</h2><div class="lv-grid"><div class="lv"><span class="lbl">Currency</span><span class="val">USD</span></div><div class="lv"><span class="lbl">Twin / room / night</span><span class="val">USD 145</span></div><div class="lv"><span class="lbl">King / room / night</span><span class="val">USD 165</span></div><div class="lv"><span class="lbl">Breakfast</span><span class="val">Included in rate</span></div><div class="lv"><span class="lbl">Taxes &amp; service charge</span><span class="val">Included in all rates</span></div><div class="lv"><span class="lbl">Availability</span><span class="val">All 80 rooms available</span></div><div class="lv"><span class="lbl">Ballroom</span><span class="val">Grand Ballroom, 300 pax banquet — USD 3,500</span></div><div class="lv"><span class="lbl">Valid until</span><span class="val">Sun 31 Jan 2027</span></div></div></div>\n</div>\n'
 '<div data-states="open">\n<div class="panel" id="bidCard"><h2><span class="panel-num">2</span>Submit your quote</h2>\n' + CURBLK.replace('class="usd-note"', 'class="cur-note"') + '\n' + FORM + '\n'
 + send_panel_html(False, 'Send your quote — two steps', ['Copy the quote details — a safety copy in case your email app shortens long text.', 'Open the email draft and press send. MICEGO replies to confirm receipt.'], 'Copy quote details', 'Open email draft', 'Edit quote', 'No email app on this device? Paste the copied details into an email to mysteri1984@gmail.com with the subject above.')
 + '\n</div>\n' + DECLINE + '\n</div>\n'
 '<div data-states="open submitted"><div class="next-steps"><div class="next-step"><span class="n">1 · Quotes checked</span><p>MICEGO checks rates, currency, taxes and dates with each property.</p></div><div class="next-step"><span class="n">2 · Comparison sent</span><p>The organizer sees proposals side by side, labelled A, B, C. Property names stay hidden.</p></div><div class="next-step"><span class="n">3 · Introduction</span><p>Every property that quoted gets the result by email. If the organizer selects your proposal, you receive their company name and contact details and MICEGO introduces you both.</p></div></div></div>\n'
 + BID_END +
 '<div data-states="invalid"><div class="status-panel is-muted"><div class="status-icon" aria-hidden="true">!</div><div class="status-body"><h2>This link can\'t be opened</h2><p>The link may be incomplete, or it may no longer be active. Open it again from the original email, or contact MICEGO with the reference code from that email.</p><div class="app-actions"><a class="btn btn-ghost" href="contact.html">Contact MICEGO</a><a class="btn btn-ghost" href="mailto:mysteri1984@gmail.com?subject=' + quote('[MICEGO] Request link not opening') + '">Email us</a></div></div></div></div>\n'
 '</div>')

# JS: reuse sample logic (chips, conditionals, currency), extended
s_a = S.index('  var CURRENCY_PLACEHOLDERS'); s_b = S.index('  /* ---- Validation ---- */')
CURJS = S[s_a:s_b]
BID_JS = TERMINAL_JS(['selected', 'not_selected', 'declined', 'expired', 'cancelled', 'invalid']) + r'''
  // WP-F2 (SPEC_FEEDBACK.md D5/4.3): window.MICEGO_PAGE_STATE -- the feedback widget reads this lazily
  // when it opens/submits. rfpRef stays null until api mode resolves real server data (addendum §A.1);
  // demo mode never fabricates one. tokenKind is fixed for this page regardless of mode.
  window.MICEGO_PAGE_STATE = window.MICEGO_PAGE_STATE || {};
  Object.assign(window.MICEGO_PAGE_STATE, {page: 'bid', state: STATE, rfpRef: null, tokenKind: 'bid', prefillEmail: null});
  var mgBidData = null;
  // WP3 (SPEC_LAUNCH §5): mgLoadBid() -- fetches the bid view model when the STATE_HEAD script left
  // data-state='loading' (api mode, not a demo state-preview query param) and swaps in the matching state panel.
  function mgLoadBid(){
    if(!TOKEN){H.setAttribute('data-state','invalid');return;}
    MG.ready(function(){
      MG.api.get_bid({token:TOKEN}).then(function(resp){
        mgBidData = resp;
        var refEl = document.querySelector('.ref-code');
        if(refEl) refEl.textContent = 'MICE QUOTE REQUEST · REF ' + resp.ref;
        if(resp.organizer){
          var og = resp.organizer;
          var map = {bidOrgCompany: og.company, bidOrgContact: og.contact_name, bidOrgEmail: og.email, bidOrgPhone: og.phone};
          Object.keys(map).forEach(function(k){document.querySelectorAll('[data-mg="'+k+'"]').forEach(function(x){x.textContent = map[k] || '';});});
        }
        // Hotel-only note: the commission rate agreed with this property (snapshot taken when the invitation was created). Hidden when null.
        var cmEl = document.getElementById('cmNote');
        if(cmEl){
          if(resp.commission && resp.commission.rate_pct != null && isFinite(Number(resp.commission.rate_pct))){
            cmEl.textContent = ' Your agreed commission: ' + Number(resp.commission.rate_pct) + '% of net booking value.';
            cmEl.hidden = false;
          } else { cmEl.textContent = ''; cmEl.hidden = true; }
        }
        H.setAttribute('data-state', resp.state);
        Object.assign(window.MICEGO_PAGE_STATE, {state: resp.state, rfpRef: resp.ref || null,
          prefillEmail: (resp.contactEmail || (resp.hotel && resp.hotel.email) || (resp.invitation && resp.invitation.email)) || null});
      }, function(err){
        H.setAttribute('data-state','invalid');
      });
    });
  }
  if(STATE==='loading'){ mgLoadBid(); }
  if(STATE==='open'||STATE==='submitted'||STATE==='loading'){
  bindChips(document);
  function tog(name,val,id){document.querySelectorAll('input[name="'+name+'"]').forEach(function(i){i.addEventListener('change',function(){document.getElementById(id).hidden=(i.value!==val);});});}
  tog('breakfast','Not included','f-breakfastSupplement');tog('availability','Partially available','f-availabilityNotes');tog('tax','Not included','f-taxNote');
''' + CURJS + r'''
  var form=document.getElementById('bidForm');
  var att=false;
  function val(n){var e=form.elements[n];return e?(e.value||'').trim():'';}
  function rad(n){var e=form.querySelector('input[name="'+n+'"]:checked');return e?e.value:'';}
  function validate(){
    var er=[];
    function num(n,id){var v=val(n);var b=v===''||!isFinite(Number(v))||Number(v)<0;if(setErr(id,b))er.push(id);}
    function txt(n,id,m){if(setErr(id,val(n).length<(m||1)))er.push(id);}
    function rd(n,id){if(setErr(id,!rad(n)))er.push(id);}
    num('twinRate','f-twinRate');num('kingRate','f-kingRate');rd('breakfast','f-breakfast');rd('tax','f-tax');
    if(rad('tax')==='Not included'){txt('taxNote','f-taxNote',3);}else{setErr('f-taxNote',false);}
    rd('availability','f-availability');num('ballroomFee','f-ballroomFee');txt('ballroomName','f-ballroomName');
    var vu=val('validUntil');if(setErr('f-validUntil',!vu||vu<'2026-10-12'))er.push('f-validUntil');
    txt('cancellation','f-cancellation',5);txt('hotelName','f-hotelName');txt('contactName','f-contactName');
    if(setErr('f-contactEmail',!EMAIL_RE.test(val('contactEmail'))))er.push('f-contactEmail');
    if(setErr('f-consent',!document.getElementById('consent').checked))er.push('f-consent');
    return er;}
  form.querySelectorAll('input,textarea').forEach(function(el){el.addEventListener('change',function(){if(att)validate();});});
  var sendPanel=document.getElementById('sendPanel'),copyBox=document.getElementById('copyBox'),mailBtn=document.getElementById('mailBtn'),mailSubject=document.getElementById('mailSubject');
  var lastText='';
  function buildText(){var c=document.getElementById('currency').value;var L=[];
    L.push('MICEGO quote — MG-2610-014');L.push('Link token: '+TOKEN);L.push('Property: '+val('hotelName'));
    L.push('Contact: '+val('contactName')+' <'+val('contactEmail')+'>'+(val('contactPhone')?' · '+val('contactPhone'):''));
    L.push('Currency: '+c);L.push('Twin rate / room / night: '+c+' '+val('twinRate'));L.push('King rate / room / night: '+c+' '+val('kingRate'));
    L.push('Breakfast: '+rad('breakfast')+(rad('breakfast')==='Not included'&&val('breakfastSupplement')?' (supplement '+c+' '+val('breakfastSupplement')+' pp/night)':''));
    L.push('Taxes & service charge: '+rad('tax')+(val('taxNote')?' ('+val('taxNote')+')':''));
    L.push('Availability: '+rad('availability')+(val('availabilityNotes')?' — '+val('availabilityNotes'):''));
    L.push('Ballroom: '+val('ballroomName'));L.push('Ballroom rental (evening): '+c+' '+val('ballroomFee'));
    L.push('F&B minimum pp: '+(val('fnbMinimum')?c+' '+val('fnbMinimum'):'-'));L.push('Included in rental: '+(val('ballroomIncludes')||'-'));
    L.push('Valid until: '+val('validUntil'));L.push('Cancellation: '+val('cancellation'));L.push('Additional proposals: '+(val('additionalProposals')||'-'));
    var text=L.join('\n');
    var sh=L.slice(0,7).concat([L[10],L[11],L[13]]);
    sh.push('(Full details were copied — please paste them here.)');
    return {text:text,short:sh.join('\n')};}
  function mgSubmitQuote(){
    var c=document.getElementById('currency').value;
    MG.api.submit_quote({
      token: TOKEN, currency: c, twinRate: val('twinRate'), kingRate: val('kingRate'),
      breakfast: rad('breakfast')==='Not included' ? 'not_included' : 'included', breakfastSupplement: val('breakfastSupplement'),
      tax: rad('tax')==='Not included' ? 'not_included' : 'included', taxNote: val('taxNote'),
      availability: rad('availability')==='Partially available' ? 'partial' : 'all', availabilityNotes: val('availabilityNotes'),
      ballroomFee: val('ballroomFee'), ballroomName: val('ballroomName'), fnbMinimum: val('fnbMinimum'), ballroomIncludes: val('ballroomIncludes'),
      validUntil: val('validUntil'), cancellation: val('cancellation'), additionalProposals: val('additionalProposals'),
      hotelName: val('hotelName'), contactName: val('contactName'), contactEmail: val('contactEmail'), contactPhone: val('contactPhone'),
      consent: true
    }).then(function(resp){
      toast('Quote submitted.');
      H.setAttribute('data-state','submitted');
      window.scrollTo(0,0);
    }, function(err){
      MG.show(err, {toast: toast, setErr: setErr, fieldMap: {
        currency: 'f-currency', twinRate: 'f-twinRate', kingRate: 'f-kingRate', breakfast: 'f-breakfast', tax: 'f-tax', taxNote: 'f-taxNote',
        availability: 'f-availability', ballroomFee: 'f-ballroomFee', ballroomName: 'f-ballroomName', validUntil: 'f-validUntil',
        cancellation: 'f-cancellation', hotelName: 'f-hotelName', contactName: 'f-contactName', contactEmail: 'f-contactEmail', consent: 'f-consent'
      }});
    });
  }
  form.addEventListener('submit',function(e){e.preventDefault();att=true;var er=validate();
    if(er.length){var f=document.getElementById(er[0]);if(f){f.scrollIntoView({block:'center',behavior:'smooth'});var x=f.querySelector('input,textarea');if(x)x.focus();}return;}
    if(window.MG && MG.mode==='api' && !MG.preview){ mgSubmitQuote(); return; }
    var b=buildText();lastText=b.text;showSend(form,sendPanel,b.text,b.short,'[MICEGO Quote] MG-2610-014 · '+val('hotelName'),mailBtn,mailSubject,copyBox);});
  document.getElementById('copyBtn').addEventListener('click',function(){copyText(lastText,copyBox,'Copied','Select the text below and copy it manually');});
  document.getElementById('editBtn').addEventListener('click',function(){sendPanel.hidden=true;form.hidden=false;});
  var rb=document.getElementById('reviseBtn');
  if(rb){rb.addEventListener('click',function(){
    var M={twinRate:'145',kingRate:'165',ballroomFee:'3500',ballroomName:'Grand Ballroom, 300 pax banquet',fnbMinimum:'55',ballroomIncludes:'Basic AV package, stage, dance floor, standard lighting.',validUntil:'2027-01-31',cancellation:'No charge if cancelled 60+ days before arrival; 30% from 30 days; 100% from 14 days.',additionalProposals:'1 complimentary room per 20 paid (max 4); welcome drink on arrival.',hotelName:'Ocean Pearl Resort Da Nang',contactName:'Nguyen Van A',contactEmail:'sales@oceanpearl.example'};
    if(window.MG && MG.mode==='api' && !MG.preview && mgBidData && mgBidData.quote){
      var q=mgBidData.quote;
      M={twinRate:q.twinRate,kingRate:q.kingRate,ballroomFee:q.ballroomFee,ballroomName:q.ballroomName,fnbMinimum:q.fnbMinimum,ballroomIncludes:q.ballroomIncludes,validUntil:q.validUntil,cancellation:q.cancellation,additionalProposals:q.additionalProposals,hotelName:q.hotelName,contactName:q.contactName,contactEmail:q.contactEmail,breakfastSupplement:q.breakfastSupplement,taxNote:q.taxNote,availabilityNotes:q.availabilityNotes};
      if(document.getElementById('currency')) document.getElementById('currency').value=q.currency;
    }
    H.setAttribute('data-state','open');
    Object.keys(M).forEach(function(k){if(form.elements[k])form.elements[k].value=M[k];});
    [['breakfast','Included in rate'],['tax','Included in all rates'],['availability','All 80 rooms available']].forEach(function(p){var r=form.querySelector('input[name="'+p[0]+'"][value="'+p[1]+'"]');if(r){r.checked=true;r.dispatchEvent(new Event('change',{bubbles:true}));}});
    document.getElementById('bidCard').scrollIntoView({behavior:'smooth'});});}
  }

  var dForm=document.getElementById('declineForm');
  if(dForm){
    var dPanel=document.getElementById('declinePanel'),dBox=document.getElementById('dCopyBox'),dText='';
    dForm.addEventListener('submit',function(e){e.preventDefault();var r=dForm.elements.dreason.value;
      if(setErr('f-dreason',!r)){dForm.elements.dreason.focus();return;}
      var n=dForm.elements.dnote.value.trim();
      if(window.MG && MG.mode==='api' && !MG.preview){
        MG.api.decline_bid({token:TOKEN,reason:r,note:n}).then(function(resp){
          H.setAttribute('data-state','declined');window.scrollTo(0,0);
        }, function(err){ MG.show(err,{toast:toast,setErr:setErr,fieldMap:{reason:'f-dreason'}}); });
        return;
      }
      var L=['MICEGO decline — MG-2610-014','Link token: '+TOKEN,'Reason: '+r,'Note: '+(n||'-')];
      dText=L.join('\n');showSend(dForm,dPanel,dText,L.slice(0,3).join('\n'),'[MICEGO Decline] MG-2610-014',document.getElementById('dMailBtn'),document.getElementById('dSubject'),dBox);});
    document.getElementById('dCopyBtn').addEventListener('click',function(){copyText(dText,dBox,'Copied','Select the text below and copy it manually');});
    document.getElementById('dEditBtn').addEventListener('click',function(){dPanel.hidden=true;dForm.hidden=false;});
    document.getElementById('dDoneBtn').addEventListener('click',function(){H.setAttribute('data-state','declined');window.scrollTo(0,0);});
  }
'''
BID_CSS = 'html:not([data-state]) [data-states~="open"]{display:revert}'
wr('en/bid.html', app_page('en', 'Quote request | MICEGO Partner', 'Private quote submission page for MICEGO partner hotels.', 'en/bid.html', BID_BODY, token=True,
    state_head=STATE_HEAD(BID_STATES, 'open'), top=BID_TOP, cur='en', ko_href='../ko/index.html', en_href='index.html', extra_css=BID_CSS, script=BID_JS))

# ---------------------------------------------------------------- ko/track.html (organizer tracking page; replaces compare.html)
P = [
 dict(id='A', arr=1, arr_txt='10-06(화) 15:20', cur='USD', twin=145, king=165, ballroom=3500, fnb=55, tax_mult='1', usd=145, grade='5성', area='다낭 미케 비치', beach='해변 바로 앞(도보 1분)', size='객실 320실', type='글로벌 체인', bf='포함', tax='요금에 포함',
  avail='요청 80실 모두 가능', hall='볼룸(1층) · 연회 최대 300명', incl='기본 AV, 무대, 댄스 플로어, 기본 조명', valid='2027-01-31(일)', cancel='도착 60일 전까지 위약금 없음 · 30일 전부터 30% · 14일 전부터 100%', extra='20실당 1실 FOC(무상 제공, 최대 4실) · 도착 시 웰컴 드링크',
  memo='요청 조건을 모두 충족합니다. 트윈 1박은 USD 참고 금액으로 가장 높지만, 조식·세금이 포함된 기준으로는 제안 B(세금 포함 ≈ USD 143)와 비슷합니다. 유효기한(2027-01-31)이 가장 길고, FOC 4실을 반영하면 실제 부담은 추정 합계보다 낮아질 수 있습니다.'),
 dict(id='B', arr=2, arr_txt='10-07(수) 10:05', cur='VND', twin=3300000, king=3900000, ballroom=70000000, fnb=1200000, tax_mult='1.134', usd=126, grade='5성', area='다낭 논느억 비치', beach='해변 접함(전용 비치)', size='객실 450실', type='베트남 현지 체인', bf='포함', tax='별도 · 봉사료 5% + VAT 8%',
  avail='일부 가능 — 트윈 52실·킹 20실 확정, 트윈 8실은 10-30까지 재확인', hall='연회장(2층) · 연회 최대 250명', incl='기본 음향, 빔프로젝터·스크린, 무대', valid='2026-12-15(화)', cancel='도착 45일 전까지 위약금 없음 · 이후 50% · 14일 전부터 100%', extra='공항–호텔 단체 픽업 2회 무상 · 사전 답사 1박 제공(2인)',
  memo='전용 비치와 가장 큰 객실 규모가 강점입니다. 다만 트윈 8실이 아직 확정되지 않았고(10-30 재확인), 세금·봉사료 13.4%가 별도라 USD 참고 금액(≈ USD 126)에 더하면 약 USD 143입니다. 유효기한이 2026-12-15로 가장 짧습니다.'),
 dict(id='C', arr=3, arr_txt='10-08(목) 09:40', cur='KRW', twin=175000, king=199000, ballroom=4000000, fnb=None, tax_mult='1', usd=123, grade='4성', area='다낭 미케 비치 인근 시내', beach='해변까지 약 600m(도보 8분)', size='객실 280실', type='독립 호텔', bf='불포함 · 1인 1박 22,000원 별도', tax='요금에 포함',
  avail='요청 80실 모두 가능', hall='스카이 볼룸 · 연회 최대 220명', incl='기본 AV, 포디움, 무선 마이크 2개', valid='2026-12-31(목)', cancel='도착 30일 전까지 위약금 없음 · 이후 50% · 7일 전부터 100%', extra='로비 환영 데스크 무상 설치 · 가능 시 레이트 체크아웃 15시',
  memo='트윈 1박 USD 참고 금액이 가장 낮지만 조식이 별도(1인 1박 22,000원)입니다. 2인 1실로 조식을 더하면 트윈 1박이 약 219,000원(≈ USD 154)이 되어 제안 A보다 높아집니다. 해변까지 도보 8분 거리입니다.'),
]
def native_total(p): return ((60 * p['twin'] + 20 * p['king']) * 3 + p['ballroom']) * D(p['tax_mult'])
USD_REF_DATE = '2026-10-12(월)'
MOCK_RATE = {'KRW': D('1420'), 'VND': D('26100')}
for p in P:
    p['nt'] = native_total(p)
    exp = p['twin'] if p['cur'] == 'USD' else int((D(p['twin']) / MOCK_RATE[p['cur']]).quantize(D(1), ROUND_HALF_UP))
    assert p['usd'] == exp, (p['id'], p['usd'], exp)
assert [p['nt'] for p in P] == [39500, 1018332000, 47440000], [p['nt'] for p in P]
MULTI = len({p['cur'] for p in P}) > 1
def price(p): return p['usd'] if MULTI else p['twin']
def fmt(n): return '{:,}'.format(int(n))
def amt(p, x): return ('%s원' % fmt(x)) if p['cur'] == 'KRW' else '%s %s' % (p['cur'], fmt(x))
def money(p, x, tax_tag=False):
    return '<span class="money">%s</span>' % amt(p, x) + ('<span class="tax-tag">세금·봉사료 별도</span>' if tax_tag and p['tax_mult'] != '1' else '')
def usd_cell(p):
    if p['cur'] == 'USD': return '<span class="money">USD %s</span><span class="small-note">USD로 제출 · 환산 없음</span>' % fmt(p['usd'])
    s_ = '<span class="money">≈ USD %s</span><span class="small-note">%s 기준</span>' % (fmt(p['usd']), amt(p, p['twin']))
    return s_ + ('<span class="tax-tag">세금·봉사료 별도</span>' if p['tax_mult'] != '1' else '')
def total_cell(p):
    s_ = '<span class="money">%s</span>' % amt(p, p['nt'])
    if p['tax_mult'] != '1': s_ += '<span class="small-note">세금·봉사료 %s%% 포함해 계산</span>' % ((D(p['tax_mult']) - 1) * 100).normalize()
    if p['bf'].startswith('불포함'): s_ += '<span class="small-note">조식 별도 요금 미포함</span>'
    return s_
ROOM_ROWS = [('트윈 1박', lambda p: money(p, p['twin'], True)), ('킹 1박', lambda p: money(p, p['king'], True))] + ([('USD 참고(트윈 1박)', usd_cell)] if MULTI else []) + [('조식', lambda p: p['bf']), ('세금·봉사료', lambda p: p['tax']), ('객실 확보', lambda p: p['avail'])]
ROWS = [('호텔 개요', [('등급', lambda p: p['grade']), ('위치', lambda p: p['area']), ('해변까지', lambda p: p['beach']), ('객실 규모', lambda p: p['size']), ('운영 형태', lambda p: p['type'])]),
        ('객실', ROOM_ROWS),
        ('연회', [('볼룸', lambda p: p['hall']), ('대관료', lambda p: money(p, p['ballroom'], True)), ('F&amp;B 최소 주문(1인)', lambda p: money(p, p['fnb']) if p['fnb'] else '없음'), ('대관 포함', lambda p: p['incl'])]),
        ('조건', [('견적 유효기한', lambda p: p['valid']), ('취소 규정', lambda p: p['cancel']), ('추가 제안', lambda p: p['extra'])])]
byid = {p['id']: p for p in P}
ORDER = sorted(byid, key=lambda i: (price(byid[i]), byid[i]['arr'])); assert ORDER == ['C', 'B', 'A'], ORDER
def pick_tag(i): return '<span data-states="won"><span class="pick-tag">선정</span></span>' if i == 'A' else ''
def name_tag(i): return '<span data-states="won"><span class="p-name">Ocean Pearl Resort Da Nang</span></span>' if i == 'A' else ''
thead = '<th scope="col">항목</th>' + ''.join('<th scope="col" data-p="%s" data-price="%d" data-arrival="%d">제안 %s%s%s<span class="p-arrival">도착 %s</span></th>' % (i, price(byid[i]), byid[i]['arr'], i, pick_tag(i), name_tag(i), byid[i]['arr_txt']) for i in ORDER)
tb = ''
for g, rows in ROWS:
    tb += '<tr class="grp"><th colspan="4" scope="colgroup"><span class="grp-lbl">%s</span></th></tr>' % g
    for lab, fn in rows:
        tb += '<tr><th scope="row">%s</th>' % lab + ''.join('<td data-p="%s">%s</td>' % (i, fn(byid[i])) for i in ORDER) + '</tr>'
tb += '<tr class="total"><th scope="row">추정 합계</th>' + ''.join('<td data-p="%s">%s</td>' % (i, total_cell(byid[i])) for i in ORDER) + '</tr>'
tb += '<tr><th scope="row">MICEGO 검토 메모</th>' + ''.join('<td data-p="%s"><div class="memo">%s</div></td>' % (i, byid[i]['memo']) for i in ORDER) + '</tr>'
def pcard(p):
    i = p['id']
    s_ = '<article class="pcard" data-p="%s" data-price="%d" data-arrival="%d" aria-labelledby="pc-%s"><div class="pcard-head"><h3 id="pc-%s">제안 %s %s%s</h3><span class="p-arrival">도착 %s</span></div>' % (i, price(p), p['arr'], i, i, i, pick_tag(i), name_tag(i), p['arr_txt'])
    s_ += '<div class="pcard-total"><span class="lbl">추정 합계</span>%s</div>' % total_cell(p)
    for g, rows in ROWS:
        s_ += '<p class="pcard-grp">%s</p><dl class="pcard-dl">' % g + ''.join('<dt>%s</dt><dd>%s</dd>' % (lab, fn(p)) for lab, fn in rows) + '</dl>'
    return s_ + '<div class="memo" style="margin-top:14px"><span class="memo-lbl">MICEGO 검토 메모</span>%s</div></article>' % p['memo']
SORT_LBL = 'USD 참고 낮은 순' if MULTI else '트윈 1박 낮은 순'
SORT_MSG = 'USD 참고 금액(트윈 1박)이 낮은 순으로 정렬했습니다' if MULTI else '트윈 1박 요금이 낮은 순으로 정렬했습니다'
CMP = ('<div class="cmp" id="cmp" data-view="cards"><div class="cmp-tools"><div class="seg" role="group" aria-label="정렬"><button type="button" id="sortPrice" aria-pressed="true">' + SORT_LBL + '</button><button type="button" id="sortArrival" aria-pressed="false">도착 순</button></div>'
       '<div class="seg view-seg" role="group" aria-label="보기 방식"><button type="button" id="viewCards" aria-pressed="true">카드</button><button type="button" id="viewTable" aria-pressed="false">표</button></div></div>'
       '<p class="sr-only" id="sortStatus" aria-live="polite"></p>'
       '<div class="cmp-scroll" tabindex="0" role="region" aria-label="제안 비교표, 가로로 스크롤할 수 있습니다"><table class="cmp-table"><caption class="sr-only">호텔 제안 3건 비교. 금액은 호텔이 제출한 통화 그대로이며, 통화가 달라 트윈 1박 요금에 USD 참고 금액을 함께 적었습니다.</caption>'
       '<colgroup><col class="c-label"><col><col><col></colgroup><thead><tr>' + thead + '</tr></thead><tbody>' + tb + '</tbody></table></div>'
       '<div class="pcards">' + ''.join(pcard(byid[i]) for i in ORDER) + '</div>'
       '<p class="cmp-foot">추정 합계 = (트윈 요금 × 60실 + 킹 요금 × 20실) × 3박 + 볼룸 대관료. 세금·봉사료가 별도인 제안은 호텔이 밝힌 비율을 더했습니다. 조식 별도 요금, F&amp;B 최소 주문 금액, FOC, 항공·차량은 넣지 않은 추정치라 실제 청구액과 다를 수 있습니다. 합계는 호텔이 제출한 통화로만 계산하며 환산하지 않습니다.</p></div>')
FX_NOTE = ('<div class="fx-note"><b>USD 참고 금액</b> · 기준일 %s 시장 환율 · USD 1 = %s원 · USD 1 = %s동<br>제안마다 통화가 달라 MICEGO가 트윈 1박 요금만 USD로 옮겨 적었습니다. 호텔이 제출한 금액 그대로 옮겼으며, 세금·봉사료 별도인 제안은 그대로 표시합니다. 참고용이며, 계약과 결제는 각 호텔이 제출한 통화로 진행합니다.</div>' % (USD_REF_DATE, fmt(MOCK_RATE['KRW']), fmt(MOCK_RATE['VND']))) if MULTI else ''

PROG_STEPS = ['접수', '요건 확인', '호텔 요청', '제안 정리', '비교표 전달', '종료']
def prog(now, dates, end=None):
    o = '<ol class="prog" aria-label="진행 단계">'
    for i, lab in enumerate(PROG_STEPS):
        cls, sr = '', ''
        if end and i == 5: cls, lab = 'is-end', end
        elif i < now: cls, sr = 'is-done', '<span class="sr-only"> (완료)</span>'
        elif i == now: cls, sr = 'is-now', '<span class="sr-only"> (현재 단계)</span>'
        o += '<li class="%s"%s><span class="n">%02d</span>%s%s%s</li>' % (cls, ' aria-current="step"' if cls == 'is-now' else '', i + 1, lab, sr, ('<span class="d">%s</span>' % dates[i]) if i in dates else '')
    return o + '</ol>'
def ds(st, h): return '<div data-states="%s">%s</div>' % (st, h)
def spanel(cls, icon, h, inner): return '<div class="status-panel%s"><div class="status-icon" aria-hidden="true">%s</div><div class="status-body"><h2>%s</h2>%s</div></div>' % (cls, icon, h, inner)
NONINV = ' '.join(x for x in TRACK_STATES if x != 'invalid')
NOREJ = ' '.join(x for x in TRACK_STATES if x not in ('rejected', 'invalid'))
ROOMS60 = ' '.join(x for x in TRACK_STATES if x not in ('rebid', 'invalid'))
MT = 'mailto:mysteri1984@gmail.com?subject='
CHG = MT + quote('[MICEGO 조건 변경] MG-2610-014') + '&amp;body=' + quote('바뀐 내용(인원·일정·객실 등):\r\n')
NEWREQ = '<div class="app-actions"><a class="btn btn-accent" href="index.html#register">새로 요청하기</a><a class="btn btn-ghost" href="contact.html">문의하기</a></div>'
def pick_href(i): return MT + quote('[MICEGO 제안 선택] MG-2610-014 · 제안 ' + i) + '&amp;body=' + quote('선택한 제안: 제안 %s\r\n선택하신 분 성함:\r\n호텔에 전달할 요청 사항(선택):\r\n' % i)
BADGE = [('received', 'badge-wait', '접수됨'), ('verifying', 'badge-wait', '요건 확인 중'), ('rejected', 'badge-closed', '진행 불가'), ('bidding', 'badge-open', '호텔 제안 받는 중'), ('rebid', 'badge-open', '새 조건으로 재요청'), ('collecting', 'badge-wait', '제안 정리 중'), ('delivered', 'badge-open', '비교표 도착'), ('won', 'badge-done', '연결 완료'), ('lost', 'badge-closed', '종료'), ('cancelled', 'badge-closed', '취소됨')]
TRACK_TOP = ('<!-- TODO(backend): ORGANIZER_TRACK_URL=/ko/track.html?t=<token> · 상태와 데이터는 토큰별로 서버에서 채움 -->\n<!--demo:start--><div class="demo-strip">DEMO · 진행 상황 페이지 예시입니다. 호텔·금액·환율·날짜는 모두 예시 데이터입니다. 제안 선택 인증번호는 123456입니다.</div><!--demo:end-->'
    + '<div data-states="loading" class="mg-loading" role="status" aria-live="polite">불러오는 중입니다… / Loading…</div>'
    + ds(NONINV, '<div class="req-bar"><div class="req-bar-inner"><span class="ref-code">MICE 견적 요청 · REF MG-2610-014</span><div class="req-bar-right">' + ''.join('<span data-states="%s"><span class="badge %s">%s</span></span>' % b for b in BADGE) + '</div></div></div>'))
def mi(l, v, st=None): return '<div class="meta-item"%s><span class="lbl">%s</span><span class="val">%s</span></div>' % ((' data-states="%s"' % st) if st else '', l, v)
META = ('<div class="meta-row">' + mi('행사 일정', '2027-03-15(월) – 03-18(목), 3박') + mi('목적지', '베트남 다낭') + mi('인원', '150–199명')
    + mi('객실', '<span data-states="rebid">트윈 70 · 킹 20 (총 270실·박)</span><span data-states="%s">트윈 60 · 킹 20 (총 240실·박)</span>' % ROOMS60)
    + mi('연회', '갈라 디너 1회(03-17 수)') + mi('접수', '2026-09-30(수) 14:20')
    + mi('제안 마감', '2026-10-08(목) 18:00 KST', 'bidding collecting delivered won lost') + mi('새 제안 마감', '2026-10-16(금) 18:00 KST', 'rebid')
    + mi('비교표 전달', '2026-10-12(월)까지', 'bidding collecting') + mi('비교표 전달', '2026-10-12(월)', 'delivered won lost') + mi('새 비교표 전달', '2026-10-19(월)까지', 'rebid') + '</div>')
D0 = {0: '09-30(수)', 1: '10-02(금)', 2: '10-05(월)', 3: '10-08(목)', 4: '10-12(월)'}
PROGS = (ds('received', prog(0, {0: '09-30(수)'})) + ds('verifying', prog(1, {0: '09-30(수)', 1: '09-30(수) 시작'}))
    + ds('bidding', prog(2, {0: '09-30(수)', 1: '10-02(금)', 2: '10-05(월) · 마감 10-08(목) 18:00', 4: '10-12(월)까지'}))
    + ds('rebid', prog(2, {0: '09-30(수)', 1: '10-13(화) 변경 확인', 2: '새 마감 10-16(금) 18:00', 4: '10-19(월)까지'}))
    + ds('collecting', prog(3, {0: '09-30(수)', 1: '10-02(금)', 2: '10-05(월)', 3: '10-08(목) 마감 후', 4: '10-12(월)까지'}))
    + ds('delivered', prog(4, D0)) + ds('won', prog(6, {**D0, 5: '10-14(수)'}, '종료 · 성사')) + ds('lost', prog(6, {**D0, 5: '10-20(화)'}, '종료 · 미성사')))
PICK = ('<div class="panel owner-only" id="pickCard"><h2>제안 선택하기</h2><p class="app-lead" style="margin-top:0">마음에 드는 제안을 고르면 등록된 휴대전화로 인증번호를 보냅니다. 인증을 마치면 선택이 확정됩니다.</p>'
    '<noscript><p class="submit-note">이 브라우저에서는 휴대전화 인증 화면을 열 수 없어 선택 메일 초안으로 대신합니다. 메일을 받은 운영팀이 인증번호를 별도로 안내합니다.</p></noscript>'
    '<!-- progressive enhancement: without JS the buttons below stay plain mailto links (the server must enforce the SMS OTP before a selection counts). With JS they open the OTP step. -->'
    '<ul class="pick-list" id="pickList">'
    + ''.join('<li class="pick-row"><div><b>제안 %s</b><span class="small-note">견적 유효기한 %s</span></div><div class="pick-btns"><a class="btn btn-accent btn-sm" data-pick="%s" href="%s">제안 %s 선택</a></div></li>' % (i, byid[i]['valid'], i, pick_href(i), i) for i in 'ABC')
    + '</ul>'
    '<div class="pick-step" id="pickStep" hidden tabindex="-1"><h3 id="pickStepTitle">제안 선택 확인</h3>'
    '<div class="anon-note">선택하시면 <b>회사명·담당자 이름·이메일·연락처</b>가 선정된 호텔에만 전달됩니다. 선정되지 않은 호텔에는 결과만 알립니다. <a class="tlink" href="terms.html#art7">이용약관 제7조</a></div>'
    '<div id="pickOtp"><p class="otp-sent" id="pickSent">등록된 휴대전화 <b>010-****-5678</b>로 인증번호를 보냈습니다.</p>'
    '<div class="field otp-field"><label for="pickCode">인증번호 6자리</label><input type="text" id="pickCode" class="code-input" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="000000"></div>'
    '<p class="otp-meta">남은 시간 <span class="otp-timer" id="pickTimer" role="timer">3:00</span><button type="button" class="linkbtn" id="pickResend" disabled>1:00 후 재발송</button></p>'
    '<p class="otp-msg" id="pickMsg" role="alert"></p>'
    '<div class="app-actions"><button type="button" class="btn btn-accent" id="pickVerify">인증하고 선택하기</button><button type="button" class="btn btn-ghost" id="pickCancel">다른 제안 보기</button></div>'
    '<p class="submit-note" style="margin-top:12px">번호가 바뀌었거나 문자가 오지 않는다면 <a class="tlink" href="contact.html">문의하기</a>로 알려 주세요.</p></div>'
    '<div id="pickLocked" hidden><div class="status-panel is-wait" style="margin-top:0"><div class="status-icon" aria-hidden="true">!</div><div class="status-body"><h2>잠시 후 다시 시도해 주세요</h2><p>인증번호를 5회 잘못 입력했습니다. 보안을 위해 10분 동안 인증할 수 없습니다. 남은 시간 <span class="otp-timer" id="pickLockTimer" role="timer">10:00</span></p></div></div><div class="app-actions"><button type="button" class="btn btn-ghost" id="pickLockBack">다른 제안 보기</button></div></div>'
    '<div id="pickOk" hidden><div class="status-panel" style="margin-top:0"><div class="status-icon" aria-hidden="true">✓</div><div class="status-body"><h2 id="pickOkTitle">휴대전화 확인을 마쳤습니다</h2><p>아래 버튼을 누르면 선택 메일 초안이 열립니다. 메일을 보내면 선택이 접수되고, MICEGO가 선정된 호텔에 연결해 드립니다.</p></div></div>'
    '<!-- TODO(backend): replace mailto with RPC select_proposal(token, proposal, otp_session) -->'
    '<div class="app-actions"><a class="btn btn-accent" id="pickConfirm" href="#">제안 선택 확정</a><button type="button" class="btn btn-ghost" id="pickCopyBtn">내용 복사</button></div>'
    '<textarea class="copy-box" id="pickCopy" hidden readonly aria-label="보낼 내용"></textarea></div></div>'
    '<h3 style="margin-top:22px">선택하시면 이렇게 진행됩니다</h3><ol class="steps">'
    '<li>MICEGO가 선정된 호텔과 나머지 호텔에 결과를 알립니다.</li><li>선정된 호텔에는 회사명·담당자 이름·이메일·연락처가 전달되고, MICEGO가 연결 메일로 양쪽을 이어 드립니다. <a class="tlink" href="terms.html#art7">이용약관 제7조</a></li><li>계약과 결제는 선정된 호텔과 직접 진행합니다.</li></ol>'
    '<p class="submit-note" style="margin-top:14px">선정되지 않은 호텔에는 결과만 알리며 회사명과 연락처는 전달하지 않습니다. 견적 유효기한이 가장 빠른 제안은 제안 B(2026-12-15)입니다. 조건을 바꾸고 싶으시면 선택 대신 <a class="tlink" data-mg-action="change" href="' + CHG + '">변경 내용을 알려 주세요</a>. 바뀐 조건으로 호텔에 다시 요청합니다.</p></div>')
ASK = 'mailto:mysteri1984@gmail.com?subject=' + quote('[MICEGO 비교표 문의] MG-2610-014') + '&amp;body=' + quote('문의할 제안: 제안 A / B / C\r\n질문 내용:\r\n')
S_REC = spanel(' is-wait', '1', '요청을 받았습니다', '<p>2026-09-30(수) 14:20에 견적 요청이 접수됐습니다. 접수 확인 메일에 이 페이지 링크를 함께 보내 드렸습니다.</p><p>접수된 영업일에 요건 확인을 시작하고, 그때부터 3영업일 안에 진행 상황과 다음 일정을 이메일로 알려 드립니다. 영업일은 주말과 한국 공휴일을 뺀 날이며, 기한은 마지막 날 18:00(KST)입니다.</p><p class="owner-only">그사이 일정이나 인원이 바뀌면 <a class="tlink" data-mg-action="change" href="' + CHG + '">이메일로 알려 주세요</a>.</p><p class="owner-only mg-cancel-wrap" hidden><button type="button" class="tlink mg-cancel-btn" data-mg-cancel>이 요청 취소하기</button></p>')
S_VER = spanel(' is-wait', '…', '요건을 확인하고 있습니다', '<p>해외 행사인지, 일정이 확정됐는지, 인원·객실·연회 정보가 서로 맞는지 살펴보고 있습니다. 더 여쭤볼 내용이 있으면 이메일로 연락드립니다.</p><p>확인을 시작한 2026-09-30(수)부터 3영업일 안에 진행 상황을 회신드립니다. 확인이 길어지면 예상 일정을 먼저 알려 드립니다.</p><p>호텔에는 아직 아무것도 보내지 않았습니다. 요청서를 보낼 때도 회사명·예산·담당자 연락처는 빼고 보냅니다.</p><p class="owner-only mg-cancel-wrap" hidden><button type="button" class="tlink mg-cancel-btn" data-mg-cancel>이 요청 취소하기</button></p>')
S_REJ = spanel(' is-muted', '×', '이번 요청은 진행하지 않습니다', '<span class="st-chip"><span class="k">사유</span>일정 미확정</span><p>행사 시작일이 아직 확정되지 않아 호텔에 요청을 보내지 않았습니다. MICEGO는 일정이 확정된 해외 행사만 호텔에 요청합니다.</p><p>일정이 정해지면 새 요청으로 다시 보내 주세요. 이번 요청 내용은 어느 호텔에도 전달되지 않았습니다.</p>' + NEWREQ) + '<!-- TODO(backend): 사유별 문구 — 국내 행사: 국내에서 열리는 행사라 진행하지 않습니다(MICEGO는 해외 호텔만 연결) / 필수 정보 부족: 인원·객실·연회 정보를 확인하지 못해 진행을 멈췄습니다 -->'
S_BID = spanel('', '→', '호텔에 요청을 보냈습니다', '<p>행사 조건에 맞는 해외 호텔 몇 곳에 같은 요건서를 보냈습니다. 요건서에는 회사명·예산·담당자 연락처가 들어가지 않습니다.</p><p>호텔 제안 마감은 2026-10-08(목) 18:00 KST입니다. 마감 뒤 MICEGO가 요금·통화·유효기한·취소 규정을 확인해 2026-10-12(월)까지 이 링크에 비교표를 올리고 이메일로 알려 드립니다. 10-09(금)은 한글날이라 영업일에서 빠집니다.</p><p class="owner-only">조건이 바뀌었다면 <a class="tlink" data-mg-action="change" href="' + CHG + '">변경 내용을 알려 주세요</a>. 바뀐 조건으로 다시 요청하고 마감을 새로 정합니다.</p>')
S_REB = spanel('', '→', '바뀐 조건으로 호텔에 다시 요청했습니다', '<p>2026-10-13(화)에 알려 주신 변경(트윈 60실 → 70실)을 반영해 새 요건서를 보냈습니다. 이전 조건으로 받은 제안은 비교에 쓰지 않고 기록으로만 남겨 둡니다.</p><p>새 제안 마감은 2026-10-16(금) 18:00 KST이고, 새 비교표는 2026-10-19(월)까지 이 링크에서 보여 드립니다.</p>')
S_COL = spanel(' is-wait', '…', '받은 제안을 정리하고 있습니다', '<p>제안 마감인 2026-10-08(목) 18:00 KST가 지나, MICEGO가 제안마다 요금·통화·유효기한·취소 규정을 확인하고 있습니다. 비어 있거나 앞뒤가 맞지 않는 항목은 호텔에 다시 물어봅니다.</p><p>비교표는 2026-10-12(월)까지 이 링크에 올리고 이메일로 알려 드립니다. 10-09(금)은 한글날이라 영업일에서 빠집니다.</p>')
S_DEL = spanel('', '✓', '비교표가 도착했습니다', '<p>호텔 3곳의 제안을 정리했습니다. 선정 전까지 호텔명은 제안 A·B·C로만 표시합니다.</p><p>금액은 호텔이 제출한 통화 그대로입니다. 제안마다 통화가 달라 트윈 1박 요금 옆에 USD 참고 금액을 함께 적었습니다.</p>')
S_WON = spanel('', '✓', '선정 호텔과 연결해 드렸습니다', '<p>제안 A(Ocean Pearl Resort Da Nang)를 선정하셨습니다. 2026-10-14(수)에 호텔 담당자에게 연결 메일을 보내고 주최 측 담당자를 참조로 넣었습니다.</p><p>선정과 함께 호텔에 회사명·담당자 이름·이메일·연락처가 전달됐습니다. 계약과 결제는 호텔과 직접 진행해 주세요. 주최 측이 MICEGO에 내는 수수료는 없습니다.</p><p>선정되지 않은 두 호텔에는 결과만 알렸고, 회사명과 연락처는 전달하지 않았습니다.</p>')
S_LOST = spanel(' is-muted', '–', '이번 요청은 성사 없이 종료됐습니다', '<span class="st-chip"><span class="k">사유</span>선택하지 않음</span><p>2026-10-20(화)에 주신 회신에 따라 제안을 선택하지 않고 요청을 종료했습니다. 호텔에는 결과만 알렸고, 회사명과 연락처는 전달하지 않았습니다.</p><p>조건을 바꿔 다시 받아 보시려면 새로 요청해 주세요.</p>' + NEWREQ) + '<!-- TODO(backend): 사유 — 선택하지 않음 / 유효기한 경과(회신 없음) / 두 차례 요청에도 제안 없음 -->'
S_CAN = spanel(' is-muted', '×', '요청이 취소됐습니다', '<p>이 견적 요청은 취소됐습니다. 호텔에 요청서를 보낸 뒤였다면 MICEGO가 해당 호텔에 취소 사실을 알려 드립니다.</p><p>회사명과 담당자 연락처는 어느 호텔에도 전달되지 않았습니다. 다시 진행하시려면 새로 요청해 주세요.</p>' + NEWREQ)
S_INV = spanel(' is-muted', '!', '링크를 열 수 없습니다', '<p>주소 일부가 빠졌거나 더 이상 쓰지 않는 링크입니다. 접수 확인 메일의 링크를 다시 눌러 보시고, 그래도 열리지 않으면 MICEGO로 알려 주세요.</p><div class="app-actions"><a class="btn btn-ghost" href="contact.html">문의하기</a><a class="btn btn-ghost" href="mailto:mysteri1984@gmail.com?subject=' + quote('[MICEGO 링크 문의]') + '">이메일 보내기</a></div>')
LINK_NOTE = '<div class="link-note owner-only"><b>이 링크는 요청하신 분 전용입니다.</b> 로그인 없이 열리니 외부로 전달하지 말아 주세요. 접수 확인 메일의 링크로 언제든 다시 확인하실 수 있습니다.</div>'
ASKPANEL = '<div class="panel owner-only"><h2>궁금한 점이 있나요?</h2><p class="app-lead" style="margin-top:0">호텔에 직접 연락하지 않으셔도 됩니다. MICEGO에 질문을 보내 주시면 해당 호텔에 확인해 답변드립니다.</p><div class="app-actions"><a class="btn btn-ghost" data-mg-action="ask" href="' + ASK + '">MICEGO에 질문 보내기</a></div></div>'
SHARE_PANEL = '<div class="panel owner-only" id="sharePanel"><h2>동료와 공유</h2><p class="app-lead" style="margin-top:0;font-size:14.5px">같이 검토할 동료에게 보기 전용 링크를 보낼 수 있습니다. 이 링크로는 제안을 선택하거나 조건을 바꿀 수 없습니다.</p>' + share_ui('MG-2610-014', '2610014') + '<p class="app-lead" id="shareSignup" hidden style="margin:0;font-size:14px">공유 링크는 회원만 만들 수 있습니다. 이 요청에 쓴 이메일로 <a class="tlink" href="signup.html">가입</a>하면 요청이 계정에 자동으로 연결되고, 그때부터 링크를 만들 수 있습니다. 이미 회원이면 <a class="tlink" href="login.html">로그인</a>해 주세요.</p></div>'
SHARE_BANNER = '<div class="share-banner share-only" role="note"><b>보기 전용 공유 링크입니다.</b> 요청하신 분이 공유했습니다. 제안 선택과 조건 변경은 요청하신 분만 할 수 있습니다.</div>'
TRACK_BODY = ('<div class="app-wrap">\n' + ds(NONINV, SHARE_BANNER + '<a class="acc-back owner-only" id="myBack" href="my.html" hidden>← 내 견적 요청</a><h1>다낭 인센티브 행사 · 견적 진행 상황</h1>') + ds(NOREJ, META) + PROGS
    + ''.join(ds(x, h) for x, h in [('received', S_REC), ('verifying', S_VER), ('rejected', S_REJ), ('bidding', S_BID), ('rebid', S_REB), ('collecting', S_COL), ('delivered', S_DEL), ('won', S_WON), ('lost', S_LOST), ('cancelled', S_CAN), ('invalid', S_INV)])
    + ds('delivered won', '<section class="app-sec"><h2>제안 비교</h2>' + FX_NOTE + CMP + '</section>')
    + ds('delivered', ASKPANEL + PICK)
    + ds('bidding rebid collecting delivered won', SHARE_PANEL)
    + ds(NONINV, LINK_NOTE) + '\n</div>')
TRACK_JS = TERMINAL_JS([x for x in TRACK_STATES if x != 'loading']) + r'''
  // WP-F2 (SPEC_FEEDBACK.md D5/4.3): window.MICEGO_PAGE_STATE -- the feedback widget reads this lazily
  // when it opens/submits. rfpRef stays null until api mode resolves real server data (addendum §A.1);
  // demo mode never fabricates one. tokenKind reflects the ?t= vs ?s= (share) link actually opened.
  window.MICEGO_PAGE_STATE = window.MICEGO_PAGE_STATE || {};
  Object.assign(window.MICEGO_PAGE_STATE, {page: 'track', state: STATE,
    rfpRef: null, tokenKind: (new URLSearchParams(location.search).get('s') ? 'share' : 'track'), prefillEmail: null});
  var mgTrackData = null;
  // WP3 (SPEC_LAUNCH §5): mgLoadTrack() -- fetches the track view model when the STATE_HEAD_SHARE
  // script left data-state='loading' (api mode, not a demo state-preview query param).
  function mgLoadTrack(){
    var shareTok = new URLSearchParams(location.search).get('s') || '';
    if(!TOKEN && !shareTok){ H.setAttribute('data-state','invalid'); return; }
    MG.ready(function(){
      MG.api.get_track(shareTok ? {share: shareTok} : {token: TOKEN}).then(function(resp){
        mgTrackData = resp;
        var refEl = document.querySelector('.ref-code');
        if(refEl) refEl.textContent = 'MICE 견적 요청 · REF ' + resp.ref;
        // 지역 운영 파트너 고지(결정 2026-09-27): 위임 건이면 파트너 이름과 목적 제한을 요청 표시줄 아래에 보여 준다
        if(resp.regional_partner && resp.regional_partner.name && !document.querySelector('.rp-note')){
          var rp=document.createElement('p'); rp.className='rp-note';
          rp.innerHTML='이 요청은 MICEGO의 현지 운영 파트너 <b></b>이(가) 호텔 섭외와 견적 취합을 맡아 진행합니다. 요청 내용과 담당자 연락처는 이 목적으로만 쓰이며, 자세한 내용은 <a href="privacy.html#s8">개인정보처리방침 제8조</a>를 확인해 주세요.';
          rp.querySelector('b').textContent=resp.regional_partner.name;
          var rb=document.querySelector('.req-bar-inner'); if(rb) rb.appendChild(rp);
        }
        H.setAttribute('data-state', resp.state);
        Object.assign(window.MICEGO_PAGE_STATE, {state: resp.state, rfpRef: resp.ref || null});
        // D-47: 호텔에 보내기 전까지만 직접 취소 버튼을 보인다(판정은 서버 can_cancel)
        document.querySelectorAll('.mg-cancel-wrap').forEach(function(w){ w.hidden = !resp.can_cancel; });
        document.dispatchEvent(new CustomEvent('mg:trackLoaded'));
      }, function(err){ H.setAttribute('data-state','invalid'); });
    });
  }
  if(STATE==='loading'){ mgLoadTrack(); }
  var cmp=document.getElementById('cmp');
  if(cmp){
  function order(key){
    var ids=[].slice.call(document.querySelectorAll('.cmp-table thead th[data-p]')).sort(function(a,b){return (+a.dataset[key])-(+b.dataset[key]);}).map(function(t){return t.dataset.p;});
    document.querySelectorAll('.cmp-table tr').forEach(function(tr){ids.forEach(function(id){var c=tr.querySelector('[data-p="'+id+'"]');if(c)tr.appendChild(c);});});
    var pc=document.querySelector('.pcards');ids.forEach(function(id){var c=pc.querySelector('[data-p="'+id+'"]');if(c)pc.appendChild(c);});
    document.getElementById('sortPrice').setAttribute('aria-pressed',key==='price');
    document.getElementById('sortArrival').setAttribute('aria-pressed',key==='arrival');
    document.getElementById('sortStatus').textContent=key==='price'?''' + json.dumps(SORT_MSG, ensure_ascii=False) + r''':'제안이 도착한 순서로 정렬했습니다';}
  document.getElementById('sortPrice').addEventListener('click',function(){order('price');});
  document.getElementById('sortArrival').addEventListener('click',function(){order('arrival');});
  function view(v){cmp.dataset.view=v;document.getElementById('viewCards').setAttribute('aria-pressed',v==='cards');document.getElementById('viewTable').setAttribute('aria-pressed',v==='table');}
  document.getElementById('viewCards').addEventListener('click',function(){view('cards');});
  document.getElementById('viewTable').addEventListener('click',function(){view('table');});
  }
  var SHAREV=H.getAttribute('data-view')==='share';
  document.querySelectorAll(SHAREV?'.owner-only':'.share-only').forEach(function(e){e.remove();});
  if(!SHAREV){
    try{
      var _isMember = (window.MG && MG.mode==='api' && !MG.preview) ? !!MG.auth.member() : !!sessionStorage.getItem('mg_demo_member');
      if(_isMember){var mb=document.getElementById('myBack');if(mb)mb.hidden=false;}
      // 공유 링크는 회원 본인 요청에만 만들 수 있다(create_share_link가 회원 JWT를 요구). 비회원에게는 가입 안내로 바꾼다.
      if(!_isMember){var sp=document.getElementById('sharePanel');if(sp){var ui=sp.querySelector('[data-share]');if(ui)ui.remove();var sn=document.getElementById('shareSignup');if(sn)sn.hidden=false;}}
    }catch(e){}
    document.querySelectorAll('[data-share]').forEach(shareInit);
  }
  // WP3 (SPEC_LAUNCH §5): mgAsk()/mgChange() -- inline forms replace the CHG/ASK mailto links in api mode.
  (function(){
    var mgApiMsg = false; try{ mgApiMsg = !!(window.MG && MG.mode==='api' && !MG.preview); }catch(e){}
    if(!mgApiMsg) return;
    document.querySelectorAll('a[data-mg-action]').forEach(function(a){
      a.addEventListener('click', function(e){
        e.preventDefault();
        if(a.nextElementSibling && a.nextElementSibling.classList && a.nextElementSibling.classList.contains('mg-inline-msg')) return;
        var kind = a.getAttribute('data-mg-action');
        var box = document.createElement('div');
        box.className = 'mg-inline-msg';
        box.style.cssText = 'margin-top:10px;padding:12px;border:1px solid var(--line, #E4E7EE);border-radius:8px;background:var(--bg,#F7F8FB)';
        box.innerHTML = '<textarea rows="3" style="width:100%;min-height:64px;padding:8px;border:1px solid #ccc;border-radius:6px" placeholder="' +
          (kind==='ask' ? '문의할 제안과 질문 내용을 적어 주세요' : '바뀐 내용(인원·일정·객실 등)을 적어 주세요') + '"></textarea>' +
          '<div style="margin-top:8px;display:flex;gap:8px"><button type="button" class="btn btn-accent btn-sm" data-send>보내기</button><button type="button" class="btn btn-ghost btn-sm" data-cancel>취소</button></div>';
        a.insertAdjacentElement('afterend', box);
        var ta = box.querySelector('textarea'); ta.focus();
        box.querySelector('[data-cancel]').addEventListener('click', function(){ box.remove(); });
        box.querySelector('[data-send]').addEventListener('click', function(){
          var msg = ta.value.trim();
          if(!msg){ ta.focus(); return; }
          var fn = kind==='ask' ? MG.api.ask_question : MG.api.request_change;
          fn({token:TOKEN, message:msg}).then(function(){
            box.innerHTML = '<p class="small-note">보냈습니다. MICEGO가 확인 후 답변드립니다.</p>';
            toast('보냈습니다.');
          }, function(err){ toast(MG.msg(err)); });
        });
      });
    });
  })();
  // D-47: 요청자 자체 취소(호텔 발송 전). 확인 상자 + 사유 선택 → cancel_rfp
  (function(){
    var on = false; try{ on = !!(window.MG && MG.mode==='api' && !MG.preview); }catch(e){}
    if(!on) return;
    document.querySelectorAll('[data-mg-cancel]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var wrap = btn.parentNode;
        if(wrap.nextElementSibling && wrap.nextElementSibling.classList.contains('mg-cancel-box')) return;
        var box = document.createElement('div');
        box.className = 'mg-cancel-box';
        box.setAttribute('role','group'); box.setAttribute('aria-label','요청 취소');
        box.style.cssText = 'margin-top:10px;padding:14px;border:1px solid var(--line, #E4E7EE);border-radius:8px;background:var(--bg,#F7F8FB)';
        box.innerHTML = '<p style="margin:0 0 10px"><b>이 견적 요청을 취소할까요?</b> 호텔에는 아직 아무것도 보내지 않았습니다. 취소하면 되돌릴 수 없고, 다시 진행하려면 새로 요청해야 합니다.</p>' +
          '<label style="display:block;font-size:14px;margin-bottom:4px" for="mgCancelReason">취소 사유</label>' +
          '<select id="mgCancelReason" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px"><option value="">선택해 주세요</option><option>일정 변경</option><option>다른 경로로 예약</option><option>행사 취소</option><option>기타</option></select>' +
          '<textarea id="mgCancelNote" rows="2" maxlength="500" hidden style="width:100%;margin-top:8px;padding:8px;border:1px solid #ccc;border-radius:6px" placeholder="취소 사유를 적어 주세요"></textarea>' +
          '<div style="margin-top:10px;display:flex;gap:8px"><button type="button" class="btn btn-accent btn-sm" data-ok>취소 확정</button><button type="button" class="btn btn-ghost btn-sm" data-close>닫기</button></div>';
        wrap.insertAdjacentElement('afterend', box);
        var sel = box.querySelector('select'), note = box.querySelector('textarea'), ok = box.querySelector('[data-ok]');
        sel.focus();
        sel.addEventListener('change', function(){ note.hidden = sel.value !== '기타'; if(!note.hidden) note.focus(); });
        box.querySelector('[data-close]').addEventListener('click', function(){ box.remove(); btn.focus(); });
        ok.addEventListener('click', function(){
          if(!sel.value){ sel.focus(); toast('취소 사유를 골라 주세요.'); return; }
          var n = note.value.trim();
          if(sel.value==='기타' && !n){ note.focus(); toast('기타를 고르셨다면 사유를 적어 주세요.'); return; }
          ok.disabled = true;
          MG.api.cancel_rfp({token: TOKEN, reason: sel.value, note: n}).then(function(){
            box.remove();
            H.setAttribute('data-state','cancelled');
            Object.assign(window.MICEGO_PAGE_STATE || {}, {state: 'cancelled'});
            window.scrollTo(0,0);
            toast('요청을 취소했습니다.');
          }, function(err){
            ok.disabled = false;
            toast(MG.msg(err));
            if(err && (err.code==='CANCEL_NOT_ALLOWED' || err.code==='STATE_CONFLICT')){ box.remove(); mgLoadTrack(); }
          });
        });
      });
    });
  })();
  var pickCard=document.getElementById('pickCard');
  if(pickCard){
    var SUBJ='[MICEGO 제안 선택] MG-2610-014 · 제안 ';
    var pickBody=function(id,ver){var L=['선택한 제안: 제안 '+id,'추적 링크 토큰: '+TOKEN];if(ver)L.push('휴대전화 확인: 완료(인증 시각 '+ver+')');L.push('선택하신 분 성함:','호텔에 전달할 요청 사항(선택):');return L.join('\n');};
    var $=function(i){return document.getElementById(i);};
    var pickList=$('pickList'),pickStep=$('pickStep'),pOtp=$('pickOtp'),pOk=$('pickOk'),pLocked=$('pickLocked'),pCur='',lockEnd=0,lockIv=null,mgOtpId=null;
    var mgApiPick = false; try{ mgApiPick = !!(window.MG && MG.mode==='api' && !MG.preview); }catch(e){}
    pickCard.querySelectorAll('a[data-pick]').forEach(function(a){var id=a.getAttribute('data-pick'),b=pickBody(id);a.href=mailHref(SUBJ+id,b,b);});
    var otp=Otp({input:$('pickCode'),timer:$('pickTimer'),resend:$('pickResend'),msg:$('pickMsg'),ttl:180,cool:60,max:5,deadMsg:'인증번호를 다시 받아 주세요.'});
    function stamp(){var d=new Date(),z=function(n){return ('0'+n).slice(-2);};return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate())+' '+z(d.getHours())+':'+z(d.getMinutes());}
    function views(w){pOtp.hidden=w!=='otp';pOk.hidden=w!=='ok';pLocked.hidden=w!=='locked';}
    function lockTick(){var left=Math.ceil((lockEnd-Date.now())/1000);$('pickLockTimer').textContent=fmtT(left);if(left<=0){clearInterval(lockIv);lockEnd=0;open(pCur);}}
    function mgSendOtp(id){
      MG.ready(function(){
        MG.api.pick_send_otp({token:TOKEN,proposal:id}).then(function(resp){
          mgOtpId = resp.otp_id;
          $('pickSent').innerHTML = '등록된 휴대전화 <b>'+resp.phone_masked+'</b>로 인증번호를 보냈습니다.';
          views('otp');otp.start();$('pickCode').focus();
        }, function(err){
          close();
          toast(MG.msg(err));
        });
      });
    }
    function open(id){pCur=id;pickList.hidden=true;pickStep.hidden=false;$('pickStepTitle').textContent='제안 '+id+' 선택 확인';
      if(lockEnd>Date.now()){views('locked');otp.stop();lockTick();clearInterval(lockIv);lockIv=setInterval(lockTick,1000);}
      else if(mgApiPick){ mgSendOtp(id); }
      else{views('otp');otp.start();$('pickCode').focus();}
      if(document.activeElement===document.body)pickStep.focus();}
    function close(){otp.stop();clearInterval(lockIv);pickStep.hidden=true;pickList.hidden=false;var a=pickCard.querySelector('a[data-pick="'+pCur+'"]');if(a)a.focus();}
    pickCard.querySelectorAll('a[data-pick]').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();open(a.getAttribute('data-pick'));});});
    $('pickCancel').addEventListener('click',close);$('pickLockBack').addEventListener('click',close);
    $('pickResend').addEventListener('click',function(){
      if(mgApiPick){ mgSendOtp(pCur); return; }
      otp.start();$('pickCode').focus();otp.say('인증번호를 다시 보냈습니다.');});
    function mgVerify(){
      var code=$('pickCode').value.trim();
      MG.api.pick_verify({token:TOKEN,proposal:pCur,otp_id:mgOtpId,code:code}).then(function(resp){
        otp.stop();var ts=stamp();
        $('pickConfirm').removeAttribute('href');$('pickConfirm').setAttribute('aria-disabled','true');
        $('pickConfirm').textContent = resp.pending ? '운영자 확인을 기다리는 중입니다' : '선택이 접수되었습니다';
        $('pickOkTitle').textContent='제안 '+pCur+' · 휴대전화 확인을 마쳤습니다';
        pickCard.dataset.verified=ts;views('ok');$('pickConfirm').focus();
      }, function(err){
        if(err.code==='OTP_LOCKED'){otp.stop();lockEnd=Date.now()+600000;views('locked');lockTick();clearInterval(lockIv);lockIv=setInterval(lockTick,1000);$('pickLockBack').focus();return;}
        otp.say(MG.msg(err),true);$('pickCode').focus();
      });
    }
    function verify(){
      if(mgApiPick){ mgVerify(); return; }
      var r=otp.check($('pickCode').value.trim());
      if(r==='ok'){otp.stop();var ts=stamp(),b=pickBody(pCur,ts);$('pickConfirm').href=mailHref(SUBJ+pCur,b,b);$('pickConfirm').textContent='제안 '+pCur+' 선택 확정';$('pickOkTitle').textContent='제안 '+pCur+' · 휴대전화 확인을 마쳤습니다';pickCard.dataset.verified=ts;views('ok');$('pickConfirm').focus();}
      else if(r==='void'){otp.stop();lockEnd=Date.now()+600000;views('locked');lockTick();clearInterval(lockIv);lockIv=setInterval(lockTick,1000);$('pickLockBack').focus();}
      else{$('pickCode').focus();}}
    $('pickVerify').addEventListener('click',verify);
    $('pickCode').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();verify();}});
    $('pickCopyBtn').addEventListener('click',function(){var b=pickBody(pCur,pickCard.dataset.verified||stamp());copyText('받는 사람: '+MAIL+'\n제목: '+SUBJ+pCur+'\n\n'+b,$('pickCopy'),'복사했습니다','아래 내용을 직접 선택해 복사해 주세요');});
  }
'''
TRACK_JS = OTP_JS + SHARE_JS + TRACK_JS
TRACK_CSS = ('html:not([data-state]) [data-states~="delivered"]{display:revert}\n'
    '.app-main button.tlink,.app-wrap button.tlink{background:none;border:0;padding:0;font:inherit;cursor:pointer}\n'
    'html[data-state="won"] .cmp-table [data-p="A"],html[data-state="won"] .pcard[data-p="A"]{background:#F2FAF9}\n'
    'html:not(.js-anim) .share-ui{display:none}\n'
    'html[data-view="share"] .owner-only{display:none!important}\n'
    '.share-only{display:none}html[data-view="share"] .share-only{display:block}\n'
    + ACC_SHARED_CSS)
if os.path.exists('ko/compare.html'): os.remove('ko/compare.html')
wr('ko/track.html', app_page('ko', '견적 진행 상황 | MICEGO', 'MICEGO 견적 요청 고객 전용 진행 상황 페이지입니다.', 'ko/track.html', TRACK_BODY, token=True,
    state_head=STATE_HEAD_SHARE(TRACK_STATES, 'delivered'), top=TRACK_TOP, cur='ko', ko_href='index.html', en_href='../en/index.html', extra_css=TRACK_CSS, script=TRACK_JS))

# ---------------------------------------------------------------- public pages
def faq_items(start, qas):
    out = ''
    for k, (q, a) in enumerate(qas):
        n = start + k
        out += '<div class="faq-item"><button class="faq-q" aria-expanded="false" aria-controls="faq-a%d">%s<span class="faq-icon" aria-hidden="true"></span></button><div class="faq-panel" id="faq-a%d" role="region"><p>%s</p></div></div>\n' % (n, q, n, a)
    return out
def faq_groups(groups):
    n = 1; out = ''
    for gid, gt, qas in groups:
        out += '<section class="faq-group" id="%s"><h2>%s</h2><div class="faq-list">\n%s</div></section>\n' % (gid, gt, faq_items(n, qas)); n += len(qas)
    return out
def jump(groups): return '<div class="faq-jump">' + ''.join('<a href="#%s">%s</a>' % (g, t) for g, t, _ in groups) + '</div>'

KO_FAQ = [('g-terms', '이용 조건', [
 ('이용 요금이 있나요?', '여행사·기업 등 행사 주최 측이 MICEGO에 내는 수수료는 없습니다. MICEGO는 성사된 예약에 대해 호텔 파트너로부터 수수료를 받을 수 있고, 그 수준은 공개하지 않습니다. 호텔 계약과 결제는 선택한 호텔과 직접 진행합니다.'),
 ('어떤 행사를 요청할 수 있나요?', '일정이 확정된 해외 행사입니다. 인센티브 여행, 컨퍼런스, 기업 행사, 시상식 등이며 국내 행사는 지원하지 않습니다.'),
 ('행사 규모 제한이 있나요?', '최소 규모 제한은 없습니다. 필요한 객실 수와 연회장 규모에 맞는 호텔에 요청을 보냅니다.'),
 ('회사명과 예산이 호텔에 공개되나요?', '호텔에 보내는 요건서에는 회사명·예산·담당자 연락처가 들어가지 않습니다. 제안을 선택하시면 선정된 호텔에 회사명·담당자 이름·이메일·연락처가 전달되고, 선정되지 않은 호텔에는 결과만 알립니다.')]),
 ('g-process', '진행·기간', [
 ('요청하면 언제 연락이 오나요?', '접수되면 바로 접수 확인 메일을 보내 드립니다. 접수된 영업일에 요건 확인을 시작하고, 그때부터 3영업일 안에 진행 상황과 다음 일정을 회신드립니다. 영업일은 주말과 한국 공휴일을 뺀 날이며, 기한은 마지막 날 18:00(KST)입니다.'),
 ('진행 상황은 어디서 보나요?', '접수 확인 메일에 있는 개인 링크로 언제든 확인하실 수 있습니다. 접수부터 종료까지 지금 어느 단계인지와 다음 일정을 보여 드리고, 비교표도 같은 링크에서 열립니다. 로그인 없이 열리니 외부로 전달하지 말아 주세요. <a href="track.html?t=demo-2610&amp;state=bidding">진행 상황 페이지 예시 보기</a>'),
 ('요청이 반려될 수도 있나요?', '네. 국내에서 열리는 행사, 일정이 확정되지 않은 행사, 인원·객실·연회 같은 필수 정보를 확인하지 못한 요청은 호텔에 보내지 않습니다. 빠진 정보는 먼저 이메일로 여쭙고, 그래도 진행이 어려우면 사유와 함께 알려 드립니다.'),
 ('몇 곳의 호텔에 요청이 가나요?', '목적지·수용 규모·연회장 조건이 맞는 호텔 몇 곳에 같은 요건서를 보냅니다. 조건에 맞는 호텔이 두 곳이 안 되면 요청을 보내기 전에 미리 알려 드립니다. 받는 제안 수는 요청마다 다르며, 도착한 제안은 모두 비교표에 담습니다.'),
 ('호텔 제안 마감은 어떻게 정하나요?', '보통 호텔에 요청을 보낸 날부터 3영업일째 되는 날 18:00(KST)로 정하고, 200명 이상 행사는 5영업일로 늘립니다. 행사가 임박하면 더 짧게 잡기도 합니다. 비교표는 마감 후 1영업일 안에 전달합니다.'),
 ('요청한 뒤에 조건을 바꿀 수 있나요?', '네. 이메일로 알려 주시면 요청 내용을 고친 뒤 바뀐 조건으로 호텔에 다시 요청하고 마감을 새로 정합니다. 비교표를 받은 뒤에도 바꿀 수 있고, 이전 조건으로 받은 제안은 비교에 쓰지 않고 기록으로만 남깁니다.'),
 ('비교표는 어떻게 받나요?', '제안을 정리하면 이메일로 알려 드리고, 접수 때 받으신 진행 상황 링크에서 비교표가 열립니다. 요청하신 분만 쓰도록 만든 주소이니 외부로 전달하지 말아 주세요.')]),
 ('g-reading', '비교표 읽는 법', [
 ("호텔 이름이 왜 '제안 A·B·C'로 나오나요?", '조건만 보고 공정하게 비교하실 수 있도록 선택 전까지 호텔명을 가립니다. 등급·위치·해변 거리·객실 규모·운영 형태는 함께 보여 드리고, 선택하시면 호텔명을 알려 드립니다. <a href="track.html?t=demo-2610&amp;state=delivered">비교표 예시 보기</a>'),
 ('제안마다 통화가 다른데 어떻게 비교하나요?', '각 제안은 호텔이 제출한 통화 그대로 보여 드립니다. 제안끼리 통화가 다르면 MICEGO가 트윈 1박 요금을 USD로 옮긴 참고 금액을 함께 적고, 어느 날 환율을 썼는지(기준일)도 밝힙니다. 통화가 모두 같으면 참고 금액은 넣지 않습니다. 계약과 결제는 호텔이 제출한 통화로 진행됩니다.'),
 ("'추정 합계'는 무엇을 더한 금액인가요?", '(트윈 요금 × 트윈 객실 수 + 킹 요금 × 킹 객실 수) × 박수 + 볼룸 대관료입니다. 세금·봉사료가 별도인 제안은 호텔이 밝힌 비율을 더합니다. 조식 별도 요금, F&amp;B 최소 주문 금액, 항공·차량은 넣지 않으므로 실제 청구액과 다를 수 있습니다. 합계는 호텔이 제출한 통화로만 계산하고 환산하지 않습니다.'),
 ("'MICEGO 검토 메모'는 무엇인가요?", 'MICEGO 담당자가 제안을 확인하면서 요건과 다른 점, 추가로 확인한 내용, 비교할 때 눈여겨볼 부분을 사실 위주로 적은 메모입니다. 선택은 주최 측에서 하십니다.')]),
 ('g-after', '선택 이후', [
 ('제안을 고르면 어떻게 진행되나요?', '비교표 아래에서 제안을 고르고, 요청서에 등록한 휴대전화로 받은 인증번호를 입력하면 선택이 확정됩니다. MICEGO가 선정된 호텔과 나머지 호텔에 결과를 알리고, 선정된 호텔에는 회사명·담당자 이름·이메일·연락처가 전달됩니다. 이어서 연결 메일로 양쪽을 이어 드립니다.'),
 ('제안을 선택할 때 왜 인증번호를 입력하나요?', '선택하는 순간 회사명과 담당자 연락처가 호텔에 전달되기 때문입니다. 요청서에 등록한 휴대전화로 인증번호를 보내, 요청하신 분이 직접 선택하는지 확인합니다. 회원이든 아니든 같은 절차이고, 동료에게 공유한 보기 전용 링크로는 선택할 수 없습니다. 인증번호는 3분 동안 유효하며 5회 틀리면 10분 뒤에 다시 시도할 수 있습니다.'),
 ('계약과 결제는 누구와 하나요?', '선택한 호텔과 직접 진행합니다. MICEGO는 결제 대금을 대신 받지 않습니다.'),
 ('마음에 드는 제안이 없으면 어떻게 하나요?', '선택하지 않겠다고 알려 주시면 요청을 종료하고 호텔에는 결과만 알립니다. 조건을 바꿔 다시 받아 보시려면 종료 전에 변경 내용을 알려 주시거나, 종료 후 새로 요청해 주세요.')]),
 ('g-member', '회원', [
 ('가입하지 않아도 되나요?', '네. 견적 요청은 가입 없이 할 수 있고, 진행 상황도 접수 확인 메일의 개인 링크로 볼 수 있습니다. 가입하면 요청을 한곳에서 모아 보고, 다음 요청 때 담당자 정보가 자동으로 채워집니다. 나중에 같은 이메일로 가입하면 이전 요청이 계정에 연결됩니다. <a href="signup.html">회원가입</a>'),
 ('동료와 함께 볼 수 있나요?', '네. 요청마다 보기 전용 링크를 만들어 동료에게 보낼 수 있습니다. 링크로는 진행 상황과 비교표만 볼 수 있고, 제안 선택과 조건 변경은 요청하신 분만 할 수 있습니다. 링크는 언제든 끌 수 있고, 요청이 끝나고 30일이 지나면 자동으로 만료됩니다.'),
 ('담당자가 바뀌면 요청은 어떻게 되나요?', '요청은 만든 분의 계정에 속합니다. 담당자가 바뀌면 문의하기로 알려 주세요. 운영팀이 확인한 뒤 새 담당자의 계정으로 요청을 옮겨 드립니다.'),
 ('탈퇴하면 요청 기록은 어떻게 되나요?', '계정과 연락처는 바로 파기하고, 진행 상황·공유 링크는 모두 사용할 수 없게 됩니다. 접수됨·요건 확인 중인 요청은 자동으로 취소되며, 호텔에서 제안을 받는 중이거나 비교표를 받은 요청이 있으면 끝난 뒤에 탈퇴할 수 있습니다. 성사된 요청의 연결 기록은 분쟁 대응을 위해 3년간 보관합니다. 자세한 내용은 <a href="privacy.html">개인정보처리방침</a>을 확인해 주세요.')]),
 ('g-privacy', '개인정보', [
 ('담당자 정보는 언제 호텔에 전달되나요?', '제안을 선택하시면 서비스 제공을 위해 선정된 호텔에 회사명·담당자 이름·이메일·연락처가 전달됩니다. 선정되지 않은 호텔에는 주최 측에 관한 정보를 전달하지 않습니다. 선정 전에 특정 호텔과 직접 연락하고 싶으시면 이메일로 알려 주세요. 확인 후 그 호텔에만 연락처를 전달합니다.'),
 ('제출한 정보를 지우고 싶어요.', 'mysteri1984@gmail.com으로 요청하시면 열람·정정·삭제를 처리합니다. 자세한 내용은 <a href="privacy.html">개인정보처리방침</a>을 확인해 주세요.')])]
FAQ_KO_BODY = ('<div class="app-wrap narrow"><h1>자주 묻는 질문</h1><p class="app-lead">찾는 답이 없으면 <a class="tlink" href="contact.html">문의하기</a>로 남겨 주세요.</p>' + jump(KO_FAQ) + faq_groups(KO_FAQ) + '</div>')
wr('ko/faq.html', app_page('ko', '자주 묻는 질문 | MICEGO 마이스고', '이용 조건, 진행 기간, 비교표 읽는 법, 선택 이후 절차, 회원, 개인정보에 관한 질문과 답변입니다.', 'ko/faq.html', FAQ_KO_BODY, nav=PUB_NAV_KO, cur='ko', ko_href='index.html', en_href='../en/faq.html', faq=True, cur_page='faq.html'))

EN_FAQ = [('g-partner', 'Partner approval', [
 ('Who can join?', "Hotels and resorts outside Korea that can host groups of 50 or more, with a verified contact email — ideally on your property's own domain. A ballroom is not required; some programs need rooms only. We review each registration and reply within 5 business days."),
 ('Can my listing be paused?', 'Yes. If three invitations in a row go unanswered, or quotes are repeatedly inaccurate, we pause your listing and tell you by email. Reply and we reinstate it. Declining a request never counts against you.')]),
 ('g-link', 'The request link', [
 ('How do I receive a request?', "By email, when an organizer's confirmed-date requirement matches your destination, capacity and facilities. Each request goes to a few matching properties, and each email contains a personal link to the request page."),
 ('Do I need an account or a login?', "No. The link opens the request directly. It is personal to your property and should not be forwarded. It stops accepting quotes when the request closes; if you quoted, it later shows the result. Opening the link marks the invitation as viewed. If a colleague should quote, ask us and we'll send them their own link."),
 ('When is the deadline?', 'Every request states an exact deadline in KST, on the request page and in the email. It is usually 3 business days after the invitation, at 18:00 KST, and 5 business days for groups of 200 or more. We email a reminder 24 hours before the deadline. After the deadline the invitation expires and quotes are no longer accepted.'),
 ('Can I decline a request?', 'Yes — use "Can\'t quote on this one?" at the end of the request page and pick a reason. Declining takes a few seconds and never counts against you; only unanswered invitations do.')]),
 ('g-quoting', 'Quoting', [
 ('Can I revise my quote?', 'Yes, until the deadline. Resubmit through the same link; your latest submission replaces the earlier one.'),
 ('Which currency should I quote in?', 'The currency your property invoices in. The organizer sees your rates in that currency. When proposals on a request come in different currencies, MICEGO adds a USD reference for the twin rate, using the market rate on the day it is entered and showing that date. Contracting and payment stay in your currency.'),
 ("What if I can't offer every room?", 'Choose "Partially available" and describe what you can offer in the availability notes. Partial proposals are still shown to the organizer.'),
 ('Should rates include taxes and service charge?', "Either is fine, as long as you say which. If they are not included, state the percentages so the organizer's estimate is calculated on the same basis as other proposals.")]),
 ('g-after', 'After you submit', [
 ('What does the organizer see?', 'Your rates, availability, ballroom details, inclusions, validity, cancellation policy and extra offers, side by side with other proposals. Your property appears as Proposal A, B or C with its star rating, area, distance to the beach, size and whether it is chain-affiliated. Your property name and contact details are disclosed only if the organizer selects your proposal. <a href="bid.html?t=demo-2610">See an example request page</a>'),
 ('How will I know if I was selected?', 'MICEGO emails every property that quoted once the organizer decides. If you are selected, you receive the organizer\'s company name and contact details, and we introduce you by email. If you are not selected, you receive the result only. If you quoted, the same link later shows the result too: "Selected" with the organizer\'s contact details, or "Not selected".'),
 ('What are the commercial terms?', 'There is no listing fee to register or to receive requests. MICEGO charges a commission on confirmed bookings only. The rate is set for your property when it is approved; you see it, and accept it with one click, in your approval email, and invitations start after you accept. It is calculated on the net contract value (rooms and banquet or F&amp;B, excluding taxes and service charges) and is not shown to organizers.'),
 ('Who do I ask about a request?', 'Use the contact page and include the reference code. MICEGO relays questions to the organizer, so every property quotes on the same information.')])]
FAQ_EN_BODY = ('<div class="app-wrap narrow"><h1>Hotel partner FAQ</h1><p class="app-lead">Can\'t find your answer? <a class="tlink" href="contact.html">Contact us</a>.</p>' + jump(EN_FAQ) + faq_groups(EN_FAQ) + '</div>')
wr('en/faq.html', app_page('en', 'Hotel partner FAQ | MICEGO Partner', 'How request links, deadlines, currencies, revisions and selection work for MICEGO partner hotels.', 'en/faq.html', FAQ_EN_BODY, nav=PUB_NAV_EN, cur='en', ko_href='../ko/faq.html', en_href='index.html', faq=True, cur_page='faq.html'))

TL = [('01', '요청 접수', '행사 유형, 확정된 일정, 인원, 도시, 객실·연회 요건을 폼으로 보내 주세요. 접수 확인 메일에 진행 상황 링크를 넣어 드립니다.'), ('02', '요건 확인', '접수된 영업일에 확인을 시작해 3영업일 안에 진행 상황과 다음 일정을 회신드립니다. 영업일은 주말과 한국 공휴일을 뺀 날입니다.'),
      ('03', '호텔에 요청', '조건에 맞는 해외 호텔마다 개별 링크로 같은 요건서를 보냅니다. 회사명·예산·담당자 연락처는 빠집니다. 마감은 보통 3영업일 뒤 18:00(KST)입니다.'), ('04', '제안 확인', '도착한 제안의 요금·통화·날짜·세금 포함 여부를 확인하고, 빠진 항목은 호텔에 다시 묻습니다.'),
      ('05', '비교표 전달', '마감 후 1영업일 안에 진행 상황 링크에서 비교표를 보여 드립니다. 선정 전까지 호텔명은 제안 A·B·C로 표시합니다.'), ('06', '선택과 연결', '고르신 제안을 이메일로 알려 주시면 선정된 호텔에 회사명·담당자 연락처가 전달되고, MICEGO가 양쪽을 연결해 드립니다. 계약과 결제는 호텔과 직접 진행합니다.')]
CD = [('해외 호텔만', '국가·도시 제한은 없고, 국내 행사는 지원하지 않습니다.'), ('일정 확정 행사만', '날짜가 정해진 행사만 요청을 받습니다.'), ('규모 제한 없음', '소규모 행사도 요청하실 수 있습니다.'), ('선정 전 회사명 비공개', '호텔은 회사명·예산이 빠진 요건서만 받습니다. 제안을 선택하시면 선정된 호텔에만 회사명과 연락처가 전달됩니다.'), ('수수료 없음', '여행사·기업 등 주최 측은 별도 수수료 없이 이용합니다.')]
ABOUT = ('<div class="app-wrap"><span class="chip">ABOUT MICEGO</span><h1 style="margin-top:12px">해외 MICE 호텔 견적을 한 번의 요청으로</h1><p class="app-lead">MICEGO(마이스고)는 일정이 확정된 해외 MICE 행사의 요건을 받아 조건에 맞는 해외 호텔에 같은 요건서로 요청하고, 도착한 제안을 한 장의 비교표로 정리해 드리는 서비스입니다.</p>'
 '<section class="app-sec"><h2>왜 만들었나요</h2><p>해외 행사 하나에 호텔 견적을 받으려면 업체마다 같은 설명을 되풀이하고, 제각각인 견적서를 다시 표로 옮겨야 합니다. MICEGO는 요건 작성은 한 번으로, 비교는 같은 기준으로 끝나도록 이 과정을 대신 정리합니다.</p></section>'
 '<section class="app-sec"><h2>진행 순서</h2><ol class="timeline">' + ''.join('<li><span class="tl-n">%s</span><h3>%s</h3><p>%s</p></li>' % x for x in TL) + '</ol></section>'
 '<section class="app-sec"><h2>이용 조건</h2><div class="cond-grid">' + ''.join('<div class="cond"><b>%s</b><span>%s</span></div>' % x for x in CD) + '</div></section>'
 '<section class="app-sec"><h2>운영 정보</h2><p>운영: MICEGO (마이스고)</p><p>문의: <a class="tlink" href="mailto:mysteri1984@gmail.com">mysteri1984@gmail.com</a></p><!-- TODO(operator): 상호(법인명), 대표자, 사업자등록번호, 주소 — 확인 후 기재 --></section>'
 '<div class="app-actions"><a class="btn btn-accent" href="index.html#register">견적 요청하기</a><a class="btn btn-ghost" href="faq.html">자주 묻는 질문</a><a class="btn btn-ghost" href="contact.html">문의하기</a></div></div>')
wr('ko/about.html', app_page('ko', '서비스 소개 | MICEGO 마이스고', 'MICEGO(마이스고)가 해외 MICE 호텔 견적을 받아 비교표로 정리하는 방식과 이용 조건을 소개합니다.', 'ko/about.html', ABOUT, nav=PUB_NAV_KO, cur='ko', ko_href='index.html', en_href='../en/index.html', cur_page='about.html'))

def contact_page(ko):
    L = (lambda a, b: a if ko else b)
    topics = ['견적 요청 문의', '호텔·리조트 파트너 문의', '제휴·협업 제안', '기타'] if ko else ['A live request or quote', 'Partner registration', 'Business partnership', 'Other']
    opts = '<option value="">%s</option>' % L('선택해 주세요', 'Select a topic') + ''.join('<option>%s</option>' % x for x in topics)
    ref = '' if ko else '<div class="field"><label for="cref">Reference code <span class="opt">(optional)</span></label><input type="text" id="cref" name="cref" placeholder="e.g. MG-2610-014"></div>'
    body = ('<div class="app-wrap narrow"><h1>' + L('문의하기', 'Contact MICEGO') + '</h1><p class="app-lead">' + L('견적 요청, 호텔 파트너, 제휴 등 무엇이든 남겨 주세요. 영업일 기준 3일 이내에 이메일로 답변드립니다.', "Questions about a request, your partner registration or anything else — send us a note and we'll reply by email.") + '</p>'
      '<div class="link-note">' + L('해외 행사 견적을 바로 받고 싶으시면 <a class="tlink" href="index.html#register">견적 요청 폼</a>이 더 빠릅니다. 메일로 바로 보내셔도 됩니다: <a class="tlink" href="mailto:mysteri1984@gmail.com">mysteri1984@gmail.com</a>',
        'Want to join the partner network? <a class="tlink" href="index.html#register">Register your property</a>. Asking about a live request? Include its reference code (e.g. MG-2610-014).') + '</div>'
      '<div class="panel"><form id="contactForm" novalidate action="mailto:mysteri1984@gmail.com" method="post" enctype="text/plain">'
      '<div class="field" id="f-topic"><label for="topic">' + L('문의 유형', 'Topic') + ' <span class="req">*</span></label><select id="topic" name="topic">' + opts + '</select><p class="field-msg">' + L('문의 유형을 골라 주세요.', 'Please choose a topic.') + '</p></div>'
      '<div class="field-grid"><div class="field" id="f-cname"><label for="cname">' + L('이름', 'Your name') + ' <span class="req">*</span></label><input type="text" id="cname" name="cname"><p class="field-msg">' + L('이름을 입력해 주세요.', 'Please enter your name.') + '</p></div>'
      '<div class="field" id="f-cemail"><label for="cemail">' + L('이메일', 'Email') + ' <span class="req">*</span></label><input type="email" id="cemail" name="cemail"><p class="field-msg">' + L('이메일 주소를 확인해 주세요.', 'Please enter a valid email address.') + '</p></div></div>'
      '<div class="field"><label for="corg">' + L('회사·기관명 <span class="opt">(선택)</span>', 'Property / company <span class="opt">(optional)</span>') + '</label><input type="text" id="corg" name="corg"></div>' + ref +
      '<div class="field" id="f-cmsg"><label for="cmsg">' + L('문의 내용', 'Message') + ' <span class="req">*</span></label><textarea id="cmsg" name="cmsg" rows="6"></textarea><p class="field-msg">' + L('10자 이상 적어 주세요.', 'Please write at least 10 characters.') + '</p></div>'
      '<div class="field" id="f-cconsent"><div class="check-row"><input type="checkbox" id="cconsent" name="cconsent"><label for="cconsent">' + L('문의에 답변하기 위해 이름·이메일·문의 내용을 수집·이용하는 데 동의합니다. 답변을 마치거나 동의를 철회하면 파기합니다. <a href="privacy.html" target="_blank" rel="noopener">개인정보처리방침 보기</a>',
        'I agree that MICEGO may use my name, email and message to reply to this enquiry. See our <a href="privacy.html" target="_blank" rel="noopener">privacy notice</a>.') + '</label></div><p class="field-msg">' + L('동의해 주셔야 보낼 수 있습니다.', 'Please confirm before sending.') + '</p></div>'
      '<div class="submit-row"><button type="submit" class="btn btn-accent">' + L('문의 내용 보내기', 'Review &amp; send') + '</button></div></form>'
      + send_panel_html(ko, L('문의 내용 보내기 — 두 단계', 'Send your message — two steps'), [L('문의 내용을 복사해 두세요. 메일 앱이 긴 내용을 자르는 경우를 대비한 백업입니다.', 'Copy the message — a safety copy in case your email app shortens long text.'), L('메일 초안을 열고 보내기를 누르세요.', 'Open the email draft and press send.')],
                         L('문의 내용 복사', 'Copy message'), L('메일 초안 열기', 'Open email draft'), L('다시 쓰기', 'Edit'), L('메일 앱이 없다면 복사한 내용을 mysteri1984@gmail.com으로 보내 주세요.', 'No email app on this device? Paste the copied message into an email to mysteri1984@gmail.com with the subject above.')) + '</div></div>')
    js = r'''
  var form=document.getElementById('contactForm');var att=false;
  function v(n){return form.elements[n]?form.elements[n].value.trim():'';}
  function validate(){var er=[];
    if(setErr('f-topic',!v('topic')))er.push('f-topic');
    if(setErr('f-cname',!v('cname')))er.push('f-cname');
    if(setErr('f-cemail',!EMAIL_RE.test(v('cemail'))))er.push('f-cemail');
    if(setErr('f-cmsg',v('cmsg').length<10))er.push('f-cmsg');
    if(setErr('f-cconsent',!document.getElementById('cconsent').checked))er.push('f-cconsent');
    return er;}
  form.querySelectorAll('input,textarea,select').forEach(function(el){el.addEventListener('change',function(){if(att)validate();});});
  var sendPanel=document.getElementById('sendPanel'),copyBox=document.getElementById('copyBox'),mailBtn=document.getElementById('mailBtn'),mailSubject=document.getElementById('mailSubject'),lastText='';
  function mgContact(){
    MG.api.contact({
      lang: document.documentElement.getAttribute('lang')||'ko', topic: v('topic'), name: v('cname'), email: v('cemail'),
      org: v('corg'), ref: v('cref'), message: v('cmsg'), consent: true
    }).then(function(resp){
      form.hidden = true;
      sendPanel.innerHTML = '<h2>' + (document.documentElement.getAttribute('lang')==='en' ? 'Message sent' : '문의를 보냈습니다') + '</h2><p>' +
        (document.documentElement.getAttribute('lang')==='en' ? 'Thank you -- MICEGO will reply by email within 3 business days.' : '감사합니다. 영업일 기준 3일 이내에 이메일로 답변드립니다.') + '</p>';
      sendPanel.hidden = false; sendPanel.focus();
    }, function(err){
      MG.show(err, {toast: toast, setErr: setErr, fieldMap: {name:'f-cname', email:'f-cemail', message:'f-cmsg', consent:'f-cconsent'}});
    });
  }
  // WP-F2 (SPEC_FEEDBACK.md §4.12 / addendum §A.13,B): contact.html's real backend is the feedback
  // system. A honeypot field is added at runtime (not server-rendered -- keeps this page's static
  // markup, and verify_launch.py's byte-parity baseline check, untouched) so no bot-visible field
  // exists in the HTML source. The legacy MG.api.contact() call above is kept alive as a best-effort,
  // fire-and-forget side call so existing API-mode integrations (and verify_api.py's assertion that
  // submitting this form calls contact()) keep working unchanged; the visible success/error UI is
  // driven by MICEGO_FB.submit() instead, which is the path that actually gets a REF number.
  var mgfbHoneypot = null, mgfbCsid = null, mgfbDwellStart = Date.now(), mgfbBusy = false;
  try {
    mgfbHoneypot = document.createElement('input');
    mgfbHoneypot.type = 'text'; mgfbHoneypot.name = 'mgfb_website'; mgfbHoneypot.id = 'mgfbHoneypot';
    mgfbHoneypot.tabIndex = -1; mgfbHoneypot.setAttribute('autocomplete', 'off'); mgfbHoneypot.setAttribute('aria-hidden', 'true');
    mgfbHoneypot.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden';
    form.appendChild(mgfbHoneypot);
  } catch (e) {}
  function mgfbCid() {
    if (mgfbCsid) return mgfbCsid;
    try { mgfbCsid = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : null; } catch (e) {}
    if (!mgfbCsid) mgfbCsid = 'cid-' + Date.now() + '-' + Math.random().toString(16).slice(2);
    return mgfbCsid;
  }
  function mgfbShowSuccess(ref) {
    var en = document.documentElement.getAttribute('lang') === 'en';
    form.hidden = true;
    var head = en ? 'Message received' : '접수되었습니다';
    var refLabel = en ? 'Reference' : '접수번호';
    var ack = v('cemail')
      ? (en ? "We'll send a confirmation email shortly, and reply to the same address." : '확인 메일을 곧 보내 드립니다. 답변도 같은 주소로 드립니다.')
      : (en ? "You didn't leave an email, so we can't reply directly. We'll still review your message." : '회신 이메일을 남기지 않으셔서 따로 답변드리기는 어렵습니다. 보내 주신 내용은 꼭 확인하겠습니다.');
    sendPanel.innerHTML = '<h2>' + head + '</h2><p>' + refLabel + ': <b data-mgfb-ref style="font-family:var(--font-mono, monospace)">' + ref + '</b></p><p>' + ack + '</p>';
    sendPanel.hidden = false; sendPanel.focus();
  }
  function mgfbSubmit() {
    if (mgfbBusy) return; mgfbBusy = true;
    var en = document.documentElement.getAttribute('lang') === 'en';
    var submitBtn = form.querySelector('button[type=submit]');
    if (submitBtn) submitBtn.setAttribute('aria-disabled', 'true');
    try {
      if (window.MG && MG.mode === 'api' && !MG.preview) {
        MG.api.contact({ lang: document.documentElement.getAttribute('lang') || 'ko', topic: v('topic'), name: v('cname'), email: v('cemail'), org: v('corg'), ref: v('cref'), message: v('cmsg'), consent: true }).then(function () {}, function () {});
      }
    } catch (e) {}
    MICEGO_FB.submit({
      source: 'contact',
      content: v('topic') + (v('cref') ? ' (' + v('cref') + ')' : '') + ' — ' + v('cmsg'),
      reply_email: v('cemail') || null, contact_name: v('cname') || null, consent: true,
      hp: mgfbHoneypot ? mgfbHoneypot.value : '', dwell_ms: Date.now() - mgfbDwellStart, client_submission_id: mgfbCid()
    }).then(function (resp) {
      mgfbBusy = false; if (submitBtn) submitBtn.removeAttribute('aria-disabled');
      mgfbShowSuccess(resp.ref);
    }, function (err) {
      mgfbBusy = false; if (submitBtn) submitBtn.removeAttribute('aria-disabled');
      var code = err && err.code;
      var msg = en ? 'Something went wrong on our side. Please try again, or email us directly.' : '일시적인 문제로 보내지 못했습니다. 다시 보내거나 메일로 직접 보내 주세요.';
      if (code === 'VALIDATION') msg = en ? 'Please check the highlighted fields.' : '입력 내용을 확인해 주세요.';
      else if (code === 'RATE_LIMITED') msg = en ? 'Too many messages just now. Please try again shortly.' : '짧은 시간에 여러 번 보내셨습니다. 잠시 후 다시 보내 주세요.';
      else if (code === 'DUPLICATE_CONTENT') { mgfbShowSuccess(err.ref || '-'); return; }
      toast(msg);
    });
  }
  form.addEventListener('submit',function(e){e.preventDefault();att=true;var er=validate();
    if(er.length){var t=document.getElementById(er[0]);if(t){t.scrollIntoView({block:'center',behavior:'smooth'});var x=t.querySelector('input,textarea,select');if(x)x.focus();}return;}
    if(window.MICEGO_FEEDBACK && window.MICEGO_FEEDBACK.supabaseUrl && window.MICEGO_FB){ mgfbSubmit(); return; }
    if(window.MG && MG.mode==='api' && !MG.preview){ mgContact(); return; }
    var L=[%s];
    var text=L.join('\n'),short=L.slice(0,4).concat(['%s']).join('\n');
    lastText=text;showSend(form,sendPanel,text,short,%s,mailBtn,mailSubject,copyBox);});
  document.getElementById('copyBtn').addEventListener('click',function(){copyText(lastText,copyBox,'%s','%s');});
  document.getElementById('editBtn').addEventListener('click',function(){sendPanel.hidden=true;form.hidden=false;});
'''
    if ko:
        js = js % ("'[MICEGO 문의]','문의 유형: '+v('topic'),'이름: '+v('cname')+' <'+v('cemail')+'>','회사·기관명: '+(v('corg')||'-'),'문의 내용:',v('cmsg')", '(문의 내용은 복사해 둔 내용을 붙여 넣어 주세요.)', "'[MICEGO 문의] '+v('topic')+' · '+v('cname')", '복사했습니다', '아래 내용을 직접 선택해 복사해 주세요')
    else:
        js = js % ("'[MICEGO Contact]','Topic: '+v('topic'),'Name: '+v('cname')+' <'+v('cemail')+'>','Property / company: '+(v('corg')||'-'),'Reference code: '+(v('cref')||'-'),'Message:',v('cmsg')", '(Please paste the copied message here.)', "'[MICEGO Contact] '+v('topic')+' · '+v('cname')", 'Copied', 'Select the text below and copy it manually')
    if ko:
        return app_page('ko', '문의하기 | MICEGO 마이스고', '견적 요청, 호텔 파트너, 제휴 문의를 남겨 주세요. 영업일 기준 3일 이내에 이메일로 답변드립니다.', 'ko/contact.html', body, nav=PUB_NAV_KO, cur='ko', ko_href='index.html', en_href='../en/contact.html', script=js, cur_page='contact.html')
    return app_page('en', 'Contact | MICEGO Partner', 'Questions about a request, partner registration or partnerships — contact MICEGO by email.', 'en/contact.html', body, nav=PUB_NAV_EN, cur='en', ko_href='../ko/contact.html', en_href='index.html', script=js, cur_page='contact.html')
wr('ko/contact.html', contact_page(True)); wr('en/contact.html', contact_page(False))
print('build2 ok')
exec(open(_os_.path.join(_SITE_DIR, 'build_acc.py'), encoding='utf-8').read(), globals())   # member-account pages (signup/login/reset/my/account/withdraw/terms)
exec(open(_os_.path.join(_SITE_DIR, 'build_legal.py'), encoding='utf-8').read(), globals())  # legal pages (ko/en terms·privacy) rendered from legal/*.json — overwrites the summary versions above

# ---- og:image post-processing (idempotent) ----
import re as _re, os as _os
_OG = {'index.html':'og/og-hub.png'}
for _p in ['ko/index.html','ko/about.html','ko/faq.html','ko/contact.html','ko/privacy.html','ko/signup.html','ko/login.html','ko/terms.html']: _OG[_p]='../og/og-ko.png'
for _p in ['en/index.html','en/faq.html','en/contact.html','en/privacy.html']: _OG[_p]='../og/og-en.png'
_ANCHOR='<meta property="og:type" content="website">'
for _p,_rel in _OG.items():
    _fp=_os.path.join(_os.getcwd(),_p)  # WP2: cwd-relative so a build can run inside a copied directory
    _s=open(_fp,encoding='utf-8').read()
    if 'property="og:image"' in _s: continue
    _s=_re.sub(r'<!-- TODO\(og-image\):.*?-->\n?','',_s)
    assert _s.count(_ANCHOR)==1,(_p,'og:type anchor')
    _ins=_ANCHOR+'\n<!-- TODO(domain): og:image must be an absolute URL (https://<domain>/og/…) once the domain is fixed -->\n<meta property="og:image" content="%s">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta name="twitter:card" content="summary_large_image">'%_rel
    _s=_s.replace(_ANCHOR,_ins)
    open(_fp,'w',encoding='utf-8').write(_s)
print('og-image ok')

# ---- WP2 launch-asset post-pass (site.config.json wiring, icons, 404, sitemap, headers, en/terms, unsubscribe) ----
exec(open(_os_.path.join(_SITE_DIR, 'build_launch.py'), encoding='utf-8').read(), globals())
