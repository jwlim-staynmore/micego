try:
    _SITE_DIR
except NameError:
    import os as _os_
    _SITE_DIR = _os_.environ.get('MG_SITE_DIR') or _os_.path.dirname(_os_.path.abspath(__file__))
# build_acc.py — member-account pages (ko): signup, login, reset, my, account, withdraw, terms.
# exec'd at the end of build2.py (shares its globals: app_page, spanel, ds, share_ui, OTP_JS, SHARE_JS, ACC_HEAD, ACC_STATES, ...).
# Everything here is static demo UI: no backend, demo OTP is always 123456, demo member lives in sessionStorage `mg_demo_member`.

for _k, _v in ACC_STATES.items():
    assert _v, _k

# ------------------------------------------------------------------ shared css / js
ACC_CSS = ACC_SHARED_CSS + r'''
.acc-switch{background:var(--white);border-bottom:1px solid var(--line)}
.acc-switch-in{max-width:1040px;margin:0 auto;padding:0 32px}
.state-switch summary{display:flex;align-items:center;min-height:44px;cursor:pointer;list-style:none;font:600 12px/1 var(--font-mono);letter-spacing:.04em;color:var(--ink-60)}
.state-switch summary::-webkit-details-marker{display:none}
.state-switch summary::after{content:'+';margin-left:8px;font-size:14px}
.state-switch[open] summary::after{content:'−'}
.state-switch nav{display:flex;flex-wrap:wrap;gap:6px 8px;padding:0 0 12px}
.state-switch a{display:inline-flex;align-items:center;min-height:44px;padding:0 14px;border:1.5px solid var(--line);border-radius:999px;font:600 12px/1 var(--font-mono);color:var(--ink-60)}
.state-switch a[aria-current]{background:var(--ink);border-color:var(--ink);color:var(--white)}
.demo-strip code{text-transform:none;font:inherit}
.app-wrap.acc{max-width:600px}
.app-main .acc-lead{font-size:15px;line-height:1.75;color:var(--ink-60);margin-top:8px;word-break:keep-all}
.app-main .acc-lead a,.acc-links a,.app-main .alink{color:var(--teal-deep);text-decoration:underline}
.acc-links{display:flex;flex-wrap:wrap;gap:0 18px;margin-top:6px}
.acc-links a{display:inline-flex;align-items:center;min-height:44px;font-size:14px;font-weight:600}
.app-main .btn{min-height:44px}
.acc h2[tabindex]:focus,.acc h3[tabindex]:focus{outline:none}
.acc-steps{list-style:none;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:22px 0 0}
.acc-steps li{min-width:0;padding-top:10px;border-top:3px solid var(--line);font:600 13px/1.4 var(--font-sans);color:var(--gray);word-break:keep-all}
.acc-steps .n{display:block;margin-bottom:2px;font:700 10.5px/1.2 var(--font-mono);letter-spacing:.04em}
html[data-state="form"] .acc-steps li:nth-child(1),html[data-state^="email"] .acc-steps li:nth-child(2),html[data-state^="phone"] .acc-steps li:nth-child(3){border-top-color:var(--amber);color:var(--ink);font-weight:700}
html[data-state^="email"] .acc-steps li:nth-child(1),html[data-state^="phone"] .acc-steps li:nth-child(-n+2),html[data-state="done"] .acc-steps li{border-top-color:var(--teal);color:var(--ink-60)}
.pw-wrap{position:relative}
.field .pw-wrap input.pw-in{width:100%;min-height:48px;padding:12px 64px 12px 14px;border:1.5px solid var(--line);border-radius:8px;font-size:16px;background:var(--white);color:var(--ink)}
.field .pw-wrap input.pw-in:focus{border-color:var(--teal);outline:none}
.field.error .pw-wrap input.pw-in{border-color:var(--error)}
.pw-toggle{position:absolute;right:0;top:0;min-width:56px;height:48px;padding:0 12px;font:600 13px/1 var(--font-sans);color:var(--teal-deep)}
.rule-list{list-style:none;display:grid;gap:2px;margin-top:8px}
.rule-list li{position:relative;padding-left:24px;font-size:12.5px;line-height:1.7;color:var(--gray);word-break:keep-all}
.rule-list li::before{content:'○';position:absolute;left:2px;top:0;font-size:12px}
.rule-list li.is-ok{color:var(--teal-deep)}
.rule-list li.is-ok::before{content:'✓';font-weight:700}
.consent-box{border:1px solid var(--line);border-radius:12px;background:var(--white);padding:4px 16px;margin-bottom:8px}
.consent-row{padding:4px 0;border-bottom:1px solid var(--line-dim)}
.consent-row:last-child{border-bottom:none}
.consent-row .check-row{align-items:center;min-height:44px}
.consent-row .check-row label{flex:1 1 auto;min-height:44px;display:flex;align-items:center;flex-wrap:wrap;gap:0 6px;cursor:pointer;word-break:keep-all}
.consent-row.all .check-row label{font-weight:800;font-size:14.5px;color:var(--ink)}
.consent-row .sub{padding:0 0 10px 30px}
.ctag{font:700 11px/1 var(--font-mono);color:var(--teal-deep);margin-right:2px}
.ctag.opt{color:var(--gray)}
.consent-more summary{display:inline-flex;align-items:center;min-height:44px;cursor:pointer;font-size:13px;font-weight:600;color:var(--teal-deep);text-decoration:underline}
.consent-more table{width:100%;border-collapse:collapse;font-size:12.5px;line-height:1.55;margin:0 0 10px;table-layout:fixed}
.consent-more th{text-align:left;font:700 10.5px/1.3 var(--font-mono);color:var(--gray);padding:0 6px 6px 0;border-bottom:1px solid var(--line)}
.consent-more td{vertical-align:top;padding:8px 6px 8px 0;border-bottom:1px solid var(--line-dim);word-break:keep-all;overflow-wrap:anywhere;color:var(--ink-80)}
.consent-more tr:last-child td{border-bottom:none}
.radio-chip:has(input:disabled){opacity:.5;cursor:not-allowed}
.demo-hint{font-size:12.5px;line-height:1.6;color:var(--amber-deep);background:var(--amber-soft);border-radius:8px;padding:8px 12px;margin-top:12px}
.otp-help{font-size:13px;line-height:1.7;color:var(--gray);margin-top:12px;word-break:keep-all}
.step-ok{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700;color:var(--teal-deep);margin:8px 0 4px}
.acc-banner{display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap;border-radius:12px;padding:14px 16px;margin-top:20px;font-size:14px;line-height:1.7;word-break:keep-all}
.acc-banner .txt{flex:1 1 240px;min-width:0}
.acc-banner.ok{background:var(--teal-soft);color:#0B4B45}
.acc-banner.info{background:var(--amber-soft);color:var(--amber-deep)}
.acc-banner.err{background:#FEF2F2;color:#B42318}
.acc-banner b{color:var(--ink)}
.field-alert{font-size:13.5px;line-height:1.7;color:#B42318;background:#FEF2F2;border-radius:8px;padding:10px 12px;margin-bottom:16px;word-break:keep-all}
.pw-inline{margin-bottom:8px}
.page-head{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:12px 16px}
.page-head .app-actions{margin-top:0}
.seg-tabs{margin-top:22px}
.rfp-list{list-style:none;display:grid;gap:12px;margin-top:14px}
.rfp{background:var(--white);border:1px solid var(--line);border-radius:14px;padding:16px;min-width:0}
.rfp.is-hot{border-color:var(--amber);box-shadow:0 0 0 3px var(--amber-soft)}
.rfp-main{display:grid;gap:10px;min-width:0}
.rfp-cell{min-width:0;font-size:14px;line-height:1.6;color:var(--ink-80);word-break:keep-all}
.rfp-cell .lbl{display:block;font:600 10.5px/1.3 var(--font-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--gray);margin-bottom:2px}
.rfp-cell .ref{font:600 12.5px/1.3 var(--font-mono);color:var(--gray)}
.rfp-cell .ttl{display:block;font:800 16px/1.4 var(--font-display);color:var(--ink);word-break:keep-all}
.rfp-tag{display:inline-block;margin-top:6px;padding:4px 8px;border-radius:5px;background:var(--bg-warm);color:var(--ink-60);font:600 11.5px/1.3 var(--font-sans)}
.rfp-hot{display:inline-block;margin-top:6px;padding:4px 8px;border-radius:5px;background:var(--amber);color:var(--ink);font:700 11.5px/1.3 var(--font-sans)}
.rfp-act{display:flex;flex-wrap:wrap;gap:8px;min-width:0}
.rfp-share{margin-top:14px;padding-top:14px;border-top:1px dashed var(--line)}
.rfp-head{display:none}
.empty-panel{text-align:center;padding:36px 20px}
.empty-panel p{font-size:14.5px;line-height:1.75;color:var(--ink-60);word-break:keep-all;max-width:440px;margin:8px auto 0}
.empty-panel .app-actions{justify-content:center}
.acc-sec h2{font-size:17px;margin-bottom:6px}
.acc-sec .sub{font-size:13.5px;line-height:1.7;color:var(--gray);word-break:keep-all;margin-bottom:14px}
.kv{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 16px}
.kv .v{font:600 15px/1.5 var(--font-sans);color:var(--ink);overflow-wrap:anywhere;min-width:0}
.toggle-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--line-dim)}
.toggle-row:last-of-type{border-bottom:none}
.toggle-row .t{min-width:0;font-size:14px;line-height:1.6;color:var(--ink-80)}
.toggle-row .t small{display:block;font-size:12px;color:var(--gray)}
.toggle-row input{width:24px;height:24px;accent-color:var(--teal);flex:0 0 auto}
.toggle-row label.tap{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-height:44px;cursor:pointer}
.always-on{font:600 12px/1 var(--font-mono);color:var(--teal-deep);background:var(--teal-soft);padding:6px 8px;border-radius:6px;white-space:nowrap}
.dev-list{list-style:none;display:grid;gap:8px}
.dev-list li{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 12px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;font-size:13.5px;line-height:1.6;color:var(--ink-80)}
.dev-list .cur{font:700 11px/1.6 var(--font-mono);color:var(--teal-deep)}
.danger-link{display:inline-flex;align-items:center;min-height:44px;font-size:14px;font-weight:600;color:#B42318;text-decoration:underline}
.btn-danger{background:#B42318;color:var(--white)}
.btn-danger:hover{background:#912018}
.info-box{border-radius:12px;padding:16px 18px;margin-top:16px;font-size:14px;line-height:1.75;color:var(--ink-80);word-break:keep-all}
.info-box.warm{background:var(--bg-warm)}
.info-box.warn{background:#FEF2F2;color:#7A271A}
.info-box h3{font-size:14.5px;margin-bottom:6px}
.info-box ul{list-style:disc;padding-left:20px}
.blocked-list{list-style:none;display:grid;gap:8px;margin-top:14px}
.blocked-list li{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 12px;padding:12px 14px;border:1px solid var(--line);border-radius:10px;background:var(--white)}
.blocked-list b{font:600 13px/1.4 var(--font-mono);color:var(--ink)}
.terms-doc h2{font:800 17px/1.5 var(--font-sans);margin:32px 0 8px;scroll-margin-top:88px}
.terms-doc p,.terms-doc li{font-size:15px;line-height:1.85;color:var(--ink-80);word-break:keep-all}
.terms-doc ul,.terms-doc ol{padding-left:20px;margin-top:6px}
.terms-doc ul{list-style:disc}.terms-doc ol{list-style:decimal}
.draft-note{background:var(--amber-soft);color:var(--amber-deep);border-radius:10px;padding:12px 14px;font-size:14px;line-height:1.7;margin-top:16px;font-weight:600}
@media (min-width:768px){
 .rfp{padding:14px 18px}
 .rfp-head,.rfp-main{display:grid;grid-template-columns:132px minmax(0,1.5fr) minmax(0,1.3fr) 150px minmax(0,1.3fr) 170px;gap:14px;align-items:start}
 .rfp-head{padding:0 18px;font:600 10.5px/1.3 var(--font-mono);letter-spacing:.06em;color:var(--gray);text-transform:uppercase}
 .rfp-cell .lbl{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0,0,0,0)}
 .rfp-act{justify-content:flex-end}
}
@media (max-width:1023px) and (min-width:768px){
 .rfp-head,.rfp-main{grid-template-columns:108px minmax(0,1.3fr) minmax(0,1.2fr) 130px minmax(0,1.2fr)}
 .rfp-act{grid-column:1/-1;justify-content:flex-start}
 .rfp-head .h-act{display:none}
}
@media (max-width:768px){.acc-switch-in{padding:0 20px}}
@media (max-width:480px){.acc-switch-in{padding:0 16px}.consent-row .sub{padding-left:0}.acc-banner{padding:12px 14px}.code-input,.field input[type=text].code-input{max-width:100%}}
'''

ACC_JS = r'''
  var H=document.documentElement,MK='mg_demo_member',QS=new URLSearchParams(location.search);
  var $=function(i){return document.getElementById(i);};
  /*demo:start*/var DEMO={name:'김지은',company:'한빛투어',orgType:'여행사',email:'jieun.kim@hanbit-tour.example',phone:'010-2345-5678'};/*demo:end*/
  function getMember(){try{var m=sessionStorage.getItem(MK);return m?JSON.parse(m):null;}catch(e){return null;}}
  function setMember(m){try{sessionStorage.setItem(MK,JSON.stringify(m));}catch(e){}}
  function clearMember(){try{sessionStorage.removeItem(MK);}catch(e){}}
  function st(){return H.getAttribute('data-state');}
  function markSwitch(){document.querySelectorAll('.state-switch a').forEach(function(a){if(a.getAttribute('data-s')===st())a.setAttribute('aria-current','true');else a.removeAttribute('aria-current');});}
  function go(s,fid){H.setAttribute('data-state',s);markSwitch();var f=fid?$(fid):null;if(f)f.focus();}
  var PHONE_RE=/^(?:01[016789]-?\d{3,4}-?\d{4}|\+82-?\s?10-?\d{3,4}-?\d{4})$/;
  function maskPhone(v){var d=(v||'').replace(/\D/g,'');if(d.indexOf('8210')===0)d='0'+d.slice(2);return d.slice(0,3)+'-****-'+d.slice(-4);}
  function safeNext(n){var d='my.html';if(!n)return d;try{n=decodeURIComponent(n);}catch(e){return d;}
    return /^[A-Za-z0-9_-]+\.html(?:[?#][A-Za-z0-9_\-=&%.#?]*)?$/.test(n)?n:d;}
  function pwEval(pw,email){var len=pw.length,kinds=(/[A-Za-z]/.test(pw)?1:0)+(/\d/.test(pw)?1:0)+(/[^A-Za-z0-9]/.test(pw)?1:0);
    var local=(email||'').split('@')[0].toLowerCase(),r=[len>=10,len>=12||kinds>=2,!(local.length>=3&&pw.toLowerCase().indexOf(local)>=0)];
    return {r:r,ok:r[0]&&r[1]&&r[2]};}
  function bindPw(input,list,emailEl){
    function upd(){var r=pwEval(input.value,emailEl?emailEl.value:''),has=input.value.length>0;
      list.querySelectorAll('li[data-r]').forEach(function(li){var ok=r.r[+li.getAttribute('data-r')]&&has;li.classList.toggle('is-ok',ok);var s=li.querySelector('.rs');if(s)s.textContent=ok?' (충족)':' (미충족)';});return r;}
    input.addEventListener('input',upd);if(emailEl)emailEl.addEventListener('input',upd);upd();return upd;}
  document.querySelectorAll('.pw-toggle').forEach(function(b){var inp=$(b.getAttribute('data-pw'));b.addEventListener('click',function(){var show=inp.type==='password';inp.type=show?'text':'password';b.setAttribute('aria-pressed',show?'true':'false');b.textContent=show?'숨기기':'보기';});});
  bindChips(document);
  markSwitch();
'''

def pw_field(fid, label, ac='new-password', rules=True, email_rule=True, hint=''):
    r = ''
    if rules:
        r = ('<ul class="rule-list" id="%s-rules" aria-label="비밀번호 조건">'
             '<li data-r="0">10자 이상<span class="sr-only rs"> (미충족)</span></li>'
             '<li data-r="1">영문·숫자·특수문자 중 2종 이상 (12자 이상이면 종류 무관)<span class="sr-only rs"> (미충족)</span></li>' % fid
             + ('<li data-r="2">이메일 앞부분을 포함하지 않기<span class="sr-only rs"> (미충족)</span></li>' if email_rule else '<li data-r="2" hidden></li>') + '</ul>')
    return ('<div class="field" id="f-%s"><label for="%s">%s <span class="req">*</span></label>'
            '<div class="pw-wrap"><input type="password" class="pw-in" id="%s" name="%s" autocomplete="%s"%s><button type="button" class="pw-toggle" data-pw="%s" aria-pressed="false" aria-label="비밀번호 표시">보기</button></div>'
            % (fid, fid, label, fid, fid, ac, (' aria-describedby="%s-rules"' % fid) if rules else '', fid)
            + ('<p class="hint">%s</p>' % hint if hint else '') + r + '<p class="field-msg" id="%s-msg">비밀번호를 확인해 주세요.</p></div>' % fid)

def acc_top(states):
    links = ''.join('<a href="?state=%s" data-s="%s">%s</a>' % (s, s, s) for s in states)
    return ('<!--demo:start--><div class="demo-strip">DEMO · 회원 기능 예시 화면입니다. 인증번호는 123456을 입력하세요. 상태 미리보기: <code>?state=…</code></div>'
            '<div class="acc-switch"><div class="acc-switch-in"><details class="state-switch"><summary>상태 미리보기 (검토용)</summary><nav aria-label="상태 미리보기">' + links + '</nav></details></div></div><!--demo:end-->')

def acc_page(name, title, desc, body, default, js, *, noindex, k=None, share=False, top_extra='', loading=True):
    states = ACC_STATES[name]
    assert default in states
    css = ACC_CSS + '\nhtml:not([data-state]) [data-states~="%s"]{display:revert}\nhtml:not(.js-anim) .share-ui{display:none}' % default
    scr = OTP_JS + (SHARE_JS if share else '') + ACC_JS + js
    wr('ko/%s.html' % name, app_page('ko', title, desc, 'ko/%s.html' % name, body, token=False, noindex=noindex, state_head=ACC_HEAD(states, default, k, loading=loading),
        top=acc_top(states) + top_extra, cur='ko', ko_href='index.html', en_href='../en/index.html', extra_css=css, script=scr))

def code_block(p, ttl, verify_label='인증하기'):
    return ('<div class="field otp-field"><label for="%sCode">인증번호 6자리</label><input type="text" id="%sCode" class="code-input" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="000000" aria-describedby="%sMsg"></div>'
            '<p class="otp-meta">남은 시간 <span class="otp-timer" id="%sTimer" role="timer">%s</span><button type="button" class="linkbtn" id="%sResend" disabled>1:00 후 재발송</button></p>'
            '<p class="otp-msg" id="%sMsg" role="alert"></p>'
            '<div class="app-actions" style="margin-top:8px"><button type="button" class="btn btn-accent" id="%sVerify">%s</button></div>') % (p, p, p, p, ttl, p, p, p, verify_label)

def banner(cls, inner, states=None, ident='', role='status'):
    b = '<div class="acc-banner %s"%s role="%s">%s</div>' % (cls, (' id="%s"' % ident) if ident else '', role, inner)
    return ('<div data-states="%s">%s</div>' % (states, b)) if states else b

def chips(name, vals, checked=None, cls='', dis=False):
    return ''.join('<label class="radio-chip %s"><input type="radio" name="%s" value="%s"%s>%s</label>' % (cls, name, v, ' checked' if v == checked else '', v) for v in vals)

ORG_VALS = ['여행사', '랜드사', '기업(행사 주최)', '협회·기관', '기타']  # submit_rfp·signup_start·account_update ORG_TYPES와 같은 목록

# ================================================================== signup
PRIV_TABLE = ('<details class="consent-more"><summary>수집 항목 자세히 보기</summary><table><thead><tr><th scope="col" style="width:34%">항목</th><th scope="col" style="width:36%">목적</th><th scope="col">보유 기간</th></tr></thead><tbody>'
    '<tr><td>이메일, 비밀번호, 이름, 소속 유형, 회사·단체명</td><td>회원 식별, 로그인, 견적 요청 이력 관리</td><td>탈퇴 시까지</td></tr>'
    '<tr><td>휴대전화</td><td>진행 알림, 제안 선택 시 인증번호 확인</td><td>탈퇴 시까지</td></tr>'
    '<tr><td>이메일·휴대전화 인증 기록</td><td>본인 확인, 부정 이용 방지</td><td>탈퇴 시까지</td></tr>'
    '<tr><td>접속 기록(IP·일시·브라우저)</td><td>보안, 부정 이용 방지</td><td>3개월</td></tr>'
    '</tbody></table><p class="hint" style="margin:0 0 8px;font-size:12.5px;color:var(--gray)">동의를 거부할 수 있으나, 필수 항목에 동의하지 않으면 가입할 수 없습니다. <a class="alink" href="privacy.html" target="_blank" rel="noopener">개인정보처리방침 보기</a></p></details>')
CONSENT = ('<fieldset class="fset" id="f-consents"><legend class="lbl-t" style="font-weight:700;font-size:13.5px;margin-bottom:8px">약관 동의</legend><div class="consent-box">'
    '<div class="consent-row all"><div class="check-row"><input type="checkbox" id="suAll"><label for="suAll">전체 동의</label></div></div>'
    '<div class="consent-row"><div class="check-row"><input type="checkbox" id="suAge" name="age14"><label for="suAge"><span class="ctag">[필수]</span> 만 14세 이상입니다</label></div></div>'
    '<div class="consent-row"><div class="check-row"><input type="checkbox" id="suTerms" name="terms"><label for="suTerms"><span class="ctag">[필수]</span> <a class="alink" href="terms.html" target="_blank" rel="noopener">이용약관</a> 동의</label></div></div>'
    '<div class="consent-row"><div class="check-row"><input type="checkbox" id="suPriv" name="priv"><label for="suPriv"><span class="ctag">[필수]</span> 개인정보 수집·이용 동의</label></div><div class="sub">' + PRIV_TABLE + '</div></div>'
    '<div class="consent-row"><div class="check-row"><input type="checkbox" id="suMkt" name="mkt"><label for="suMkt"><span class="ctag opt">[선택]</span> 서비스 소식 받기</label></div>'
    '<div class="sub"><div class="radio-row" role="group" aria-label="받을 채널"><label class="radio-chip sm"><input type="checkbox" name="mktCh" value="이메일" disabled>이메일</label><label class="radio-chip sm"><input type="checkbox" name="mktCh" value="문자·알림톡" disabled>문자·알림톡</label></div></div></div>'
    '</div><p class="field-msg" id="f-consents-msg">필수 항목에 모두 동의해 주세요.</p><p class="field-msg" id="f-mktch-msg">받을 채널을 하나 이상 골라 주세요.</p></fieldset>')

SU_FORM = ('<form id="suForm" novalidate>'
    '<div class="field" id="f-suEmail"><label for="suEmail">이메일(아이디) <span class="req">*</span></label><input type="email" id="suEmail" name="email" autocomplete="email" inputmode="email" placeholder="name@company.com"><p class="hint">로그인 아이디로 쓰입니다. 개인 메일도 사용할 수 있습니다.</p><p class="field-msg">이메일 형식을 확인해 주세요.</p></div>'
    + pw_field('suPw', '비밀번호') +
    '<div class="field" id="f-suName"><label for="suName">이름 <span class="req">*</span></label><input type="text" id="suName" name="name" autocomplete="name"><p class="field-msg">이름을 입력해 주세요.</p></div>'
    '<div class="field" id="f-suOrg"><span class="lbl-t">소속 유형 <span class="req">*</span></span><div class="radio-row" role="radiogroup" aria-label="소속 유형">' + chips('orgType', ORG_VALS, cls='sm') + '</div><p class="field-msg">소속 유형을 골라 주세요.</p></div>'
    '<div class="field" id="f-suCompany"><label for="suCompany">회사·단체명 <span class="req">*</span></label><input type="text" id="suCompany" name="company" autocomplete="organization"><p class="field-msg">회사 또는 단체명을 입력해 주세요.</p></div>'
    + CONSENT +
    '<div class="submit-row"><p class="submit-note">다음 단계에서 이메일과 휴대전화 번호를 인증합니다.</p><button type="submit" class="btn btn-accent" id="suSubmit">인증 메일 받기</button></div></form>')

SU_BODY = ('<div class="app-wrap acc"><h1>회원가입</h1><p class="acc-lead">요청을 한곳에서 확인하고, 동료에게 보기 전용 링크를 보낼 수 있습니다. 견적 요청은 가입하지 않아도 할 수 있습니다. 이미 회원이신가요? <a href="login.html">로그인</a></p>'
  '<ol class="acc-steps" id="accSteps" aria-label="가입 단계"><li><span class="n">01</span>기본 정보</li><li><span class="n">02</span>이메일 인증</li><li><span class="n">03</span>휴대전화 인증</li></ol>'
  # step 1
  '<div data-states="form"><div class="panel"><h2 id="suTitle" tabindex="-1">기본 정보</h2>' + SU_FORM + '</div></div>'
  # step 2
  '<div data-states="email_sent email_wrong email_expired"><div class="panel"><h2 id="emTitle" tabindex="-1">이메일 인증</h2>'
  '<p class="acc-lead" style="margin-top:6px"><b id="emShow">jieun.kim@hanbit-tour.example</b>로 인증번호 6자리를 보냈습니다.</p>'
  + code_block('em', '10:00') +
  '<p class="otp-help">인증번호는 10분 동안 유효하고, 5회 틀리면 무효가 되어 다시 받아야 합니다. 메일이 보이지 않으면 스팸함을 확인해 주세요. 회사 메일은 받기까지 몇 분 걸릴 수 있습니다.</p>'
  '<button type="button" class="linkbtn" id="emBack">이메일 주소 수정</button></div></div>'
  '<div data-states="email_capped"><div class="panel">' + spanel(' is-wait', '!', '오늘은 인증 메일을 더 보낼 수 없습니다', '<p>같은 이메일 주소로는 하루 10회까지 인증 메일을 보낼 수 있습니다. 내일 다시 시도하시거나, 다른 이메일 주소로 가입해 주세요. 계속 어려우시면 문의하기로 알려 주세요.</p><div class="app-actions"><button type="button" class="btn btn-ghost" id="emCapBack">이메일 주소 수정</button><a class="btn btn-ghost" href="contact.html">문의하기</a></div>') + '</div></div>'
  # step 3
  '<div data-states="phone_entry phone_sent phone_wrong phone_locked phone_capped phone_taken"><div class="panel"><h2 id="phTitle" tabindex="-1">휴대전화 인증</h2><p class="step-ok"><span aria-hidden="true">✓</span> 이메일 인증을 마쳤습니다</p>'
  '<div data-states="phone_entry"><div class="field" id="f-phNum" style="margin-top:14px"><label for="phNum">휴대전화 <span class="req">*</span></label><input type="tel" id="phNum" name="phone" autocomplete="tel" inputmode="tel" placeholder="010-0000-0000"><p class="hint">진행 알림(알림톡·문자)과 제안 선택 확인에 쓰는 번호입니다.</p><p class="field-msg">휴대전화 번호를 확인해 주세요.</p></div>'
  '<div class="app-actions"><button type="button" class="btn btn-accent" id="phSend">인증번호 받기</button></div><!--demo:start--><p class="demo-hint">데모: 010-9999-0000은 이미 다른 계정에 등록된 번호로 처리됩니다.</p><!--demo:end--></div>'
  '<div data-states="phone_sent phone_wrong"><p class="acc-lead" style="margin-top:12px"><b id="phShow">010-****-5678</b>로 인증번호 6자리를 보냈습니다.</p>' + code_block('ph', '3:00') +
  '<p class="otp-help">인증번호는 3분 동안 유효하고, 5회 틀리면 10분 동안 인증할 수 없습니다. 하루에 같은 번호로 5회까지 받을 수 있습니다.</p><button type="button" class="linkbtn" id="phBack">휴대전화 번호 수정</button></div>'
  '<div data-states="phone_locked">' + spanel(' is-wait', '!', '잠시 후 다시 시도해 주세요', '<p>인증번호를 5회 잘못 입력해 10분 동안 인증할 수 없습니다. 남은 시간 <span class="otp-timer" id="phLockTimer" role="timer">10:00</span></p><div class="app-actions"><a class="btn btn-ghost" href="contact.html">문의하기</a></div>') + '</div>'
  '<div data-states="phone_capped">' + spanel(' is-wait', '!', '오늘은 이 번호로 인증번호를 더 받을 수 없습니다', '<p>같은 번호로는 하루 5회까지 받을 수 있습니다. 다른 번호로 진행하시거나 내일 다시 시도해 주세요.</p><div class="app-actions"><button type="button" class="btn btn-ghost" id="phCapBack">휴대전화 번호 수정</button></div>') + '</div>'
  '<div data-states="phone_taken">' + spanel(' is-muted', '!', '이미 다른 계정에 등록된 번호입니다', '<p>번호 소유는 확인했지만, 이 번호는 이미 쓰고 있는 회원 계정에 연결되어 있습니다. 본인 계정이라면 로그인해 주세요. 담당자가 바뀌었다면 문의하기로 알려 주세요.</p><div class="app-actions"><a class="btn btn-accent" href="login.html">로그인</a><a class="btn btn-ghost" href="contact.html">문의하기</a><button type="button" class="btn btn-ghost" id="phTakenBack">다른 번호 입력</button></div>') + '</div>'
  '</div></div>'
  # done
  '<div data-states="done"><div class="panel">' + spanel('', '✓', '가입을 마쳤습니다', '<p><span id="doneName">김지은</span>님, 환영합니다.</p><p>이 이메일로 접수된 이전 요청 1건을 계정에 연결했습니다.</p><div class="app-actions"><a class="btn btn-accent" href="my.html" id="doneMy">내 견적 요청 보기</a><a class="btn btn-ghost" href="index.html#register">새 견적 요청하기</a></div>') + '</div></div>'
  '\n</div>')

SU_JS = r'''
  var su={email:'',name:'',company:'',orgType:'',phone:''},phSends=0,emSends=0,phLockEnd=0,phLockIv=null,suTicket='',suPw='',phOtpId='';
  var form=$('suForm'),att=false;
  var emOtp=Otp({input:$('emCode'),timer:$('emTimer'),resend:$('emResend'),msg:$('emMsg'),ttl:600,cool:60,max:5,deadMsg:'인증번호가 무효가 되었습니다. 새 인증번호를 받아 주세요.'});
  var phOtp=Otp({input:$('phCode'),timer:$('phTimer'),resend:$('phResend'),msg:$('phMsg'),ttl:180,cool:60,max:5,deadMsg:'인증번호를 다시 받아 주세요.'});
  var all=$('suAll'),reqs=['suAge','suTerms','suPriv'].map($),mkt=$('suMkt'),chs=[].slice.call(form.querySelectorAll('input[name="mktCh"]'));
  function syncAll(){all.checked=reqs.every(function(c){return c.checked;})&&mkt.checked&&chs.every(function(c){return c.checked;});}
  function syncCh(){chs.forEach(function(c){c.disabled=!mkt.checked;if(!mkt.checked){c.checked=false;c.closest('.radio-chip').classList.remove('is-checked');}});}
  all.addEventListener('change',function(){reqs.forEach(function(c){c.checked=all.checked;});mkt.checked=all.checked;syncCh();chs.forEach(function(c){c.checked=all.checked;c.closest('.radio-chip').classList.toggle('is-checked',all.checked);});});
  reqs.concat([mkt]).forEach(function(c){c.addEventListener('change',function(){if(c===mkt)syncCh();syncAll();});});
  chs.forEach(function(c){c.addEventListener('change',syncAll);});
  var em0=(QS.get('email')||'').trim();if(em0&&EMAIL_RE.test(em0))$('suEmail').value=em0;
  var updPw=bindPw($('suPw'),$('suPw-rules'),$('suEmail'));
  function validate(){var er=[];
    function chk(id,bad){if(setErr(id,bad))er.push(id);}
    chk('f-suEmail',!EMAIL_RE.test($('suEmail').value.trim()));
    chk('f-suPw',!updPw().ok);
    chk('f-suName',!$('suName').value.trim());
    chk('f-suOrg',!form.querySelector('input[name="orgType"]:checked'));
    chk('f-suCompany',!$('suCompany').value.trim());
    var cbad=!reqs.every(function(c){return c.checked;});
    var f=$('f-consents');f.classList.toggle('error',cbad);if(cbad)er.push('f-consents');
    var chbad=mkt.checked&&!chs.some(function(c){return c.checked;});
    if(!cbad){f.classList.toggle('error',chbad);$('f-consents-msg').style.display=chbad?'none':'';$('f-mktch-msg').style.display=chbad?'block':'none';if(chbad)er.push('f-consents');}
    else{$('f-consents-msg').style.display='block';$('f-mktch-msg').style.display='none';}
    return er;}
  form.querySelectorAll('input').forEach(function(el){el.addEventListener('change',function(){if(att)validate();});el.addEventListener('blur',function(){if(att)validate();});});
  form.addEventListener('submit',function(e){e.preventDefault();att=true;var er=validate();
    if(er.length){var t=$(er[0]);if(t){t.scrollIntoView({block:'center',behavior:'smooth'});var x=t.querySelector('input');if(x)x.focus();}return;}
    su.email=$('suEmail').value.trim();su.name=$('suName').value.trim();su.company=$('suCompany').value.trim();su.orgType=form.querySelector('input[name="orgType"]:checked').value;suPw=$('suPw').value;
    if(window.MG && MG.mode==='api' && !MG.preview){
      var chans=[];if(chs[0]&&chs[0].checked)chans.push('email');if(chs[1]&&chs[1].checked)chans.push('sms');
      $('suSubmit').disabled=true;
      MG.api.signup_start({email:su.email,password:suPw,name:su.name,orgType:su.orgType,company:su.company,consents:{age:true,terms:true,privacy:true,marketing:!!mkt.checked,channels:chans}}).then(function(resp){
        $('suSubmit').disabled=false;suTicket=resp.ticket;emSends=1;$('emShow').textContent=su.email;go('email_sent','emTitle');emOtp.start();
      },function(err){$('suSubmit').disabled=false;MG.show(err,{setErr:setErr,toast:toast});});
      return;
    }
    /* enumeration-safe: an address that already belongs to a member gets the same screen (the real mail is ACC_EMAIL_EXISTS) */
    emSends=1;$('emShow').textContent=su.email;go('email_sent','emTitle');emOtp.start();});
  function emSetup(){$('emShow').textContent=su.email||QS.get('email')||DEMO.email;}
  $('emVerify').addEventListener('click',emVerify);$('emCode').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();emVerify();}});
  function emVerify(){
    if(window.MG && MG.mode==='api' && !MG.preview){
      var code=$('emCode').value.trim();
      if(!/^\d{6}$/.test(code)){emOtp.say('인증번호 6자리를 숫자로 입력해 주세요.',true);$('emCode').focus();return;}
      MG.api.verify_email({ticket:suTicket,code:code}).then(function(){emOtp.stop();go('phone_entry','phTitle');},function(err){
        if(err.code==='OTP_VOID'){emOtp.say(MG.msg(err),true);$('emCode').disabled=true;emOtp.allow();if(st()!=='email_wrong')go('email_wrong');}
        else{emOtp.say(MG.msg(err),true);if(st()==='email_sent')go('email_wrong');}
        $('emCode').focus();
      });
      return;
    }
    var r=emOtp.check($('emCode').value.trim());
    if(r==='ok'){emOtp.stop();go('phone_entry','phTitle');}
    else if(r==='void'){emOtp.say('인증번호를 5회 잘못 입력해 무효가 되었습니다. 새 인증번호를 받아 주세요.',true);$('emCode').disabled=true;emOtp.allow();if(st()!=='email_wrong')go('email_wrong');}
    else if(r==='wrong'||r==='expired'){if(st()==='email_sent')go('email_wrong');$('emCode').focus();}
    else $('emCode').focus();}
  $('emResend').addEventListener('click',function(){
    if(window.MG && MG.mode==='api' && !MG.preview){
      MG.api.resend_email_code({ticket:suTicket}).then(function(){go('email_sent');emOtp.start();emOtp.say('인증번호를 다시 보냈습니다.');$('emCode').focus();},function(err){
        if(err.code==='OTP_CAP'){emOtp.stop();go('email_capped','emTitle');}else{toast(MG.msg(err));}
      });
      return;
    }
    emSends++;if(emSends>10){emOtp.stop();go('email_capped','emTitle');return;}go('email_sent');emOtp.start();emOtp.say('인증번호를 다시 보냈습니다.');$('emCode').focus();});
  $('emBack').addEventListener('click',function(){emOtp.stop();go('form','suEmail');});
  $('emCapBack').addEventListener('click',function(){go('form','suEmail');});
  function phSetup(){$('phShow').textContent=maskPhone(su.phone||DEMO.phone);}
  $('phSend').addEventListener('click',function(){var v=$('phNum').value.trim().replace(/\s+/g,'');
    if(setErr('f-phNum',!PHONE_RE.test(v))){$('phNum').focus();return;}
    su.phone=$('phNum').value.trim();
    if(window.MG && MG.mode==='api' && !MG.preview){
      $('phSend').disabled=true;
      MG.api.send_phone_otp({ticket:suTicket,phone:su.phone,purpose:'signup_phone'}).then(function(resp){
        $('phSend').disabled=false;phOtpId=resp.otp_id;$('phShow').textContent=resp.phone_masked||maskPhone(su.phone);go('phone_sent');phOtp.start();$('phCode').focus();
      },function(err){
        $('phSend').disabled=false;
        if(err.code==='OTP_CAP'){go('phone_capped','phTitle');}else{toast(MG.msg(err));}
      });
      return;
    }
    phSends++;if(phSends>5){go('phone_capped','phTitle');return;}
    phSetup();go('phone_sent');phOtp.start();$('phCode').focus();});
  $('phNum').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();$('phSend').click();}});
  function phLockTick(){var left=Math.ceil((phLockEnd-Date.now())/1000);$('phLockTimer').textContent=fmtT(left);if(left<=0){clearInterval(phLockIv);phLockEnd=0;go('phone_entry','phTitle');}}
  function phLock(){phOtp.stop();phLockEnd=Date.now()+600000;go('phone_locked','phTitle');phLockTick();clearInterval(phLockIv);phLockIv=setInterval(phLockTick,1000);}
  $('phVerify').addEventListener('click',phVerify);$('phCode').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();phVerify();}});
  function phVerify(){
    if(window.MG && MG.mode==='api' && !MG.preview){
      var code=$('phCode').value.trim();
      if(!/^\d{6}$/.test(code)){phOtp.say('인증번호 6자리를 숫자로 입력해 주세요.',true);$('phCode').focus();return;}
      MG.api.verify_phone_otp({ticket:suTicket,otp_id:phOtpId,code:code}).then(function(){phOtp.stop();finish();},function(err){
        if(err.code==='PHONE_TAKEN'){go('phone_taken','phTitle');}
        else if(err.code==='OTP_VOID'||err.code==='OTP_LOCKED'){phLock();}
        else{phOtp.say(MG.msg(err),true);if(st()==='phone_sent')go('phone_wrong');$('phCode').focus();}
      });
      return;
    }
    var r=phOtp.check($('phCode').value.trim());
    if(r==='ok'){phOtp.stop();var d=(su.phone||'').replace(/\D/g,'');if(d==='01099990000'){go('phone_taken','phTitle');}else finish();}
    else if(r==='void'){phLock();}
    else if(r==='wrong'||r==='expired'){if(st()==='phone_sent')go('phone_wrong');$('phCode').focus();}
    else $('phCode').focus();}
  $('phResend').addEventListener('click',function(){phSends++;if(phSends>5){phOtp.stop();go('phone_capped','phTitle');return;}go('phone_sent');phOtp.start();phOtp.say('인증번호를 다시 보냈습니다.');$('phCode').focus();});
  $('phBack').addEventListener('click',function(){phOtp.stop();go('phone_entry','phNum');});
  $('phCapBack').addEventListener('click',function(){go('phone_entry','phNum');});
  $('phTakenBack').addEventListener('click',function(){$('phNum').value='';go('phone_entry','phNum');});
  function finish(){
    if(window.MG && MG.mode==='api' && !MG.preview){
      MG.auth.signIn(su.email,suPw,false).then(function(resp){var m=resp.member||{};$('doneName').textContent=m.name||su.name;go('done');var b=$('doneMy');if(b)b.focus();},
      function(err){toast(MG.msg(err));go('phone_entry','phTitle');});
      return;
    }
    var m={name:su.name||DEMO.name,company:su.company||DEMO.company,orgType:su.orgType||DEMO.orgType,email:su.email||DEMO.email,phone:su.phone||DEMO.phone};
    setMember(m);$('doneName').textContent=m.name;go('done');var b=$('doneMy');if(b)b.focus();}
  /* seed the previewed state */
  var S0=st();
  if(/^email_/.test(S0)&&S0!=='email_capped'){emSetup();emOtp.start();if(S0==='email_wrong')emOtp.setWrong(2);if(S0==='email_expired')emOtp.expire();}
  if(/^phone_/.test(S0)){phSetup();if(S0==='phone_sent'||S0==='phone_wrong'){phOtp.start();if(S0==='phone_wrong')phOtp.setWrong(2);}
    if(S0==='phone_locked'){phLockEnd=Date.now()+600000;phLockTick();phLockIv=setInterval(phLockTick,1000);}}
  if(S0==='done'){var m0=getMember();if(!m0){m0=DEMO;setMember(DEMO);}$('doneName').textContent=m0.name;}
'''
acc_page('signup', '회원가입 | MICEGO 마이스고', 'MICEGO 회원가입. 견적 요청을 한곳에서 확인하고 동료에게 보기 전용 링크를 보낼 수 있습니다.', SU_BODY, 'form', SU_JS, noindex=False, loading=False)

# ================================================================== login
LG_BODY = ('<div class="app-wrap acc"><h1>로그인</h1><p class="acc-lead">내 견적 요청을 한곳에서 확인합니다. 회원이 아니어도 견적 요청은 할 수 있습니다 → <a href="index.html#register">비회원으로 요청하기</a></p>'
  '<div class="panel">'
  '<div data-states="pending">' + spanel(' is-wait', '…', '가입 인증이 남아 있습니다', '<p>이메일 또는 휴대전화 인증을 마치지 않아 가입이 끝나지 않았습니다. 이어서 진행해 주세요. 72시간이 지나면 입력한 정보는 파기됩니다.</p><div class="app-actions"><!--demo:start--><a class="btn btn-accent" href="signup.html?state=email_sent">가입 이어서 하기</a><!--demo:end--></div>') + '</div>'
  '<div data-states="suspended">' + spanel(' is-muted', '!', '이용이 제한된 계정입니다', '<p>운영 정책에 따라 이 계정의 이용이 제한되었습니다. 사유와 해제 방법은 문의하기로 알려 주세요.</p><div class="app-actions"><a class="btn btn-ghost" href="contact.html">문의하기</a></div>') + '</div>'
  '<div data-states="locked">' + spanel(' is-wait', '!', '계정이 잠겼습니다', '<p>1시간 안에 로그인에 10회 실패해 보안을 위해 계정을 잠갔습니다. 비밀번호를 재설정하면 바로 풀립니다. 안내 메일도 보냈습니다.</p><div class="app-actions"><a class="btn btn-accent" href="reset.html">비밀번호 재설정</a></div>') + '</div>'
  '<div data-states="default error cooldown"><form id="lgForm" novalidate>'
  '<p class="field-alert" id="lgErr" role="alert" data-states="error">이메일 또는 비밀번호가 맞지 않습니다.</p>'
  '<p class="field-alert" id="lgCool" role="alert" data-states="cooldown">로그인에 5회 실패해 15분 동안 시도할 수 없습니다. 남은 시간 <span class="otp-timer" id="lgCd" role="timer">15:00</span> · 급하시면 <a class="alink" href="reset.html">비밀번호를 재설정</a>해 주세요.</p>'
  '<div class="field" id="f-lgEmail"><label for="lgEmail">이메일</label><input type="email" id="lgEmail" name="email" autocomplete="username" inputmode="email"><p class="field-msg">이메일을 입력해 주세요.</p></div>'
  + pw_field('lgPw', '비밀번호', ac='current-password', rules=False).replace(' <span class="req">*</span>', '').replace('비밀번호를 확인해 주세요.', '비밀번호를 입력해 주세요.') +
  '<div class="field"><div class="check-row" style="align-items:center;min-height:44px"><input type="checkbox" id="lgKeep" name="keep"><label for="lgKeep">로그인 상태 유지 <span class="opt" style="color:var(--gray)">· 공용 PC에서는 선택하지 마세요</span></label></div></div>'
  '<button type="submit" class="btn btn-accent btn-block" id="lgSubmit">로그인</button></form></div>'
  '<div class="acc-links" style="margin-top:14px"><a href="reset.html">비밀번호를 잊으셨나요?</a><a href="signup.html">회원가입</a></div></div>'
  '<!--demo:start--><p class="demo-hint">데모: jieun.kim@hanbit-tour.example 과 10자 이상 비밀번호로 로그인할 수 있습니다.</p><!--demo:end-->\n</div>')
LG_JS = r'''
  var fails=0,cdEnd=0,cdIv=null,form=$('lgForm'),nextUrl=safeNext(QS.get('next'));
  function cdTick(){var left=Math.ceil((cdEnd-Date.now())/1000);$('lgCd').textContent=fmtT(left);if(left<=0){clearInterval(cdIv);cdEnd=0;$('lgSubmit').disabled=false;fails=0;go('default');}}
  function cooldown(s){$('lgSubmit').disabled=true;if(s)go('cooldown');cdEnd=Date.now()+900000;cdTick();clearInterval(cdIv);cdIv=setInterval(cdTick,1000);}
  form.addEventListener('submit',function(e){e.preventDefault();
    if(cdEnd)return;
    var em=$('lgEmail').value.trim(),pw=$('lgPw').value;
    var bad=false;if(setErr('f-lgEmail',!em)){bad=true;}if(setErr('f-lgPw',!pw)){bad=true;}
    if(bad){(!em?$('lgEmail'):$('lgPw')).focus();return;}
    if(window.MG && MG.mode==='api' && !MG.preview){
      $('lgSubmit').disabled=true;
      MG.auth.signIn(em,pw,!!$('lgKeep').checked).then(function(resp){
        $('lgSubmit').disabled=false;
        var st2=(resp.member&&resp.member.state)||'active';
        if(st2!=='active'){location.href='signup.html?email='+encodeURIComponent(em);return;}
        location.href=nextUrl;
      },function(err){
        $('lgSubmit').disabled=false;
        if(err.code==='LOGIN_COOLDOWN'){cdEnd=Date.now()+(err.retry_after?err.retry_after*1000:900000);go('cooldown');cdTick();clearInterval(cdIv);cdIv=setInterval(cdTick,1000);}
        else if(err.code==='ACCOUNT_LOCKED'){go('locked');}
        else if(err.code==='ACCOUNT_SUSPENDED'){go('suspended');}
        else{go('error');$('lgPw').value='';$('lgPw').focus();}
      });
      return;
    }
    /*demo:start*/if(em.toLowerCase()===DEMO.email&&pw.length>=10){var m=getMember()||DEMO;setMember({name:m.name||DEMO.name,company:m.company||DEMO.company,orgType:m.orgType||DEMO.orgType,email:DEMO.email,phone:m.phone||DEMO.phone});location.href=nextUrl;return;}/*demo:end*/
    fails++;
    if(fails>=10){go('locked');return;}
    if(fails>=5){cooldown(true);return;}
    go('error');$('lgPw').value='';$('lgPw').focus();});
  form.querySelectorAll('input').forEach(function(x){x.addEventListener('input',function(){var f=x.closest('.field');if(f)f.classList.remove('error');});});
  if(st()==='cooldown'){cooldown(false);}
'''
acc_page('login', '로그인 | MICEGO 마이스고', 'MICEGO 회원 로그인. 내 견적 요청을 한곳에서 확인합니다.', LG_BODY, 'default', LG_JS, noindex=False, loading=False)

# ================================================================== reset
RS_BODY = ('<div class="app-wrap acc"><h1>비밀번호 재설정</h1>'
  '<div data-states="loading" class="mg-loading" role="status" aria-live="polite">불러오는 중입니다… / Loading…</div>'
  '<div data-states="request"><p class="acc-lead">가입한 이메일 주소를 입력하시면 재설정 링크를 보내 드립니다. 비밀번호 재설정은 이메일로만 할 수 있습니다.</p><div class="panel"><form id="rsForm" novalidate>'
  '<div class="field" id="f-rsEmail"><label for="rsEmail">이메일 <span class="req">*</span></label><input type="email" id="rsEmail" name="email" autocomplete="email" inputmode="email"><p class="field-msg">이메일 형식을 확인해 주세요.</p></div>'
  '<button type="submit" class="btn btn-accent btn-block">재설정 메일 받기</button></form></div><div class="acc-links"><a href="login.html">로그인으로 돌아가기</a></div></div>'
  '<div data-states="sent"><div class="panel">' + spanel('', '✓', '메일을 확인해 주세요', '<p id="rsSentMsg" tabindex="-1">가입된 주소라면 비밀번호 재설정 메일을 보냈습니다. 링크는 30분 동안 한 번만 쓸 수 있습니다.</p><p>메일이 보이지 않으면 스팸함을 확인해 주세요.</p><div class="app-actions"><button type="button" class="btn btn-ghost" id="rsAgain">다른 주소로 다시 받기</button><a class="btn btn-ghost" href="reset.html?k=demo-reset-1234">(데모) 메일 속 링크 열기</a></div>') + '</div></div>'
  '<div data-states="form"><p class="acc-lead">새 비밀번호를 입력해 주세요. 바꾸면 모든 기기에서 로그아웃됩니다.</p><div class="panel"><form id="rsNew" novalidate>'
  + pw_field('rsPw', '새 비밀번호', email_rule=False) + '<button type="submit" class="btn btn-accent btn-block">비밀번호 바꾸기</button></form></div></div>'
  '<div data-states="done"><div class="panel">' + spanel('', '✓', '비밀번호를 바꿨습니다', '<p id="rsDoneMsg" tabindex="-1">모든 기기에서 로그아웃했습니다. 새 비밀번호로 로그인해 주세요.</p><p>로그인 실패로 잠긴 계정이었다면 잠금도 풀렸습니다. 변경 사실을 알리는 메일을 보냈습니다.</p><div class="app-actions"><a class="btn btn-accent" href="login.html">로그인</a></div>') + '</div></div>'
  '<div data-states="expired"><div class="panel">' + spanel(' is-muted', '×', '링크를 쓸 수 없습니다', '<p>링크가 만료되었거나 이미 사용했습니다. 재설정 링크는 30분 동안 한 번만 쓸 수 있습니다. 다시 요청해 주세요.</p><div class="app-actions"><button type="button" class="btn btn-accent" id="rsRetry">재설정 메일 다시 받기</button></div>') + '</div></div>'
  '\n</div>')
RS_JS = r'''
  (function(){
    if(!(window.MG && MG.mode==='api' && !MG.preview))return;
    var k=QS.get('k');
    if(k){MG.auth.verifyRecovery(k).then(function(){go('form','rsPw');},function(){go('expired');});}
    else{go('request','rsEmail');}
  })();
  var f1=$('rsForm');
  f1.addEventListener('submit',function(e){e.preventDefault();var v=$('rsEmail').value.trim();
    if(setErr('f-rsEmail',!EMAIL_RE.test(v))){$('rsEmail').focus();return;}
    if(window.MG && MG.mode==='api' && !MG.preview){
      MG.api.password_reset_request({email:v}).then(function(){go('sent','rsSentMsg');},function(err){toast(MG.msg(err));});
      return;
    }
    go('sent','rsSentMsg');});
  $('rsAgain').addEventListener('click',function(){go('request','rsEmail');});
  $('rsRetry').addEventListener('click',function(){go('request','rsEmail');});
  var updRs=bindPw($('rsPw'),$('rsPw-rules'),null);
  $('rsNew').addEventListener('submit',function(e){e.preventDefault();
    if(setErr('f-rsPw',!updRs().ok)){$('rsPw').focus();return;}
    if(window.MG && MG.mode==='api' && !MG.preview){
      MG.api.password_reset_complete({password:$('rsPw').value}).then(function(){go('done','rsDoneMsg');},function(err){
        if(err.code==='AUTH_REQUIRED'){go('expired');}else{toast(MG.msg(err));}
      });
      return;
    }
    clearMember();go('done','rsDoneMsg');});
  if(QS.get('k')==='expired'){go('expired');}
'''
acc_page('reset', '비밀번호 재설정 | MICEGO 마이스고', 'MICEGO 비밀번호 재설정.', RS_BODY, 'request', RS_JS, noindex=True, k='form')

exec(open(_os_.path.join(_SITE_DIR, 'build_acc2.py'), encoding='utf-8').read(), globals())
print('build_acc ok')
