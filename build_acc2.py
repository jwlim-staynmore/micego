_nw = lambda s, sep: sep.join('<span style="white-space:nowrap">%s</span>' % x for x in s.split(sep))
# build_acc2.py — my / account / withdraw / terms (exec'd from build_acc.py, shares its globals)

# ================================================================== my.html
MY_ROWS = [
  dict(ref='MG-2610-014', num='2610014', title='다낭 인센티브 행사', dest='베트남 다낭', dates='2027-03-15(월) – 03-18(목)', st='delivered', bcls='badge-open', blab='비교표 도착', nxt='비교표 도착 · 선택 대기', grp='active', hot='선택이 필요합니다', tag=''),
  dict(ref='MG-2610-017', num='2610017', title='방콕 시상식', dest='태국 방콕', dates='2027-04-19(월) – 04-22(목)', st='rebid', bcls='badge-open', blab='새 조건으로 재요청', nxt='제안 마감 10-16(금) 18:00', grp='active', hot='', tag=''),
  dict(ref='MG-2610-020', num='2610020', title='푸껫 팀 워크숍', dest='태국 푸껫', dates='2027-05-10(월) – 05-13(목)', st='verifying', bcls='badge-wait', blab='요건 확인 중', nxt='요건 확인 중 · 10-23(금)까지 회신', grp='active', hot='', tag='연결된 이전 요청 · 비회원 접수'),
  dict(ref='MG-2609-006', num='2609006', title='세부 인센티브', dest='필리핀 세부', dates='2026-12-07(월) – 12-10(목)', st='won', bcls='badge-done', blab='연결 완료', nxt='선정 호텔 연결 완료 (10-14)', grp='closed', hot='', tag=''),
  dict(ref='MG-2609-003', num='2609003', title='오사카 세미나', dest='일본 오사카', dates='2026-11-09(월) – 11-11(수)', st='cancelled', bcls='badge-closed', blab='취소됨', nxt='취소됨 (09-18)', grp='closed', hot='', tag=''),
]
def rfp_row(r):
    return ('<li class="rfp%s" data-grp="%s" data-ref="%s"><div class="rfp-main">'
      '<div class="rfp-cell"><span class="sr-only">요청 번호 </span><span class="ref">%s</span></div>'
      '<div class="rfp-cell"><span class="sr-only">행사명 </span><span class="ttl">%s</span>%s%s</div>'
      '<div class="rfp-cell"><span class="lbl">목적지·일정</span>%s<br>%s</div>'
      '<div class="rfp-cell"><span class="lbl">상태</span><span class="badge %s">%s</span></div>'
      '<div class="rfp-cell"><span class="lbl">다음 일정</span>%s</div>'
      '<div class="rfp-act"><a class="btn btn-accent btn-sm" href="track.html?t=demo-%s&amp;state=%s" aria-label="%s 열기">열기</a><button type="button" class="btn btn-ghost btn-sm" data-share-toggle aria-expanded="false" aria-controls="rs-%s">공유 링크</button></div></div>'
      '<div class="rfp-share" id="rs-%s" hidden>%s</div></li>') % (
        ' is-hot' if r['hot'] else '', r['grp'], r['ref'], r['ref'], r['title'],
        ('<span class="rfp-hot">%s</span>' % r['hot']) if r['hot'] else '', ('<span class="rfp-tag">%s</span>' % r['tag']) if r['tag'] else '',
        r['dest'], _nw(r['dates'],' – '), r['bcls'], r['blab'], _nw(r['nxt'],' · '), r['num'], r['st'], r['ref'], r['num'], r['num'], share_ui(r['ref'], r['num'], r['st']))

MY_LIST = ('<div class="seg seg-tabs" role="group" aria-label="요청 보기"><button type="button" data-tab="active" aria-pressed="true">진행 중 <span data-cnt="active">3</span></button><button type="button" data-tab="closed" aria-pressed="false">종료 <span data-cnt="closed">2</span></button><button type="button" data-tab="all" aria-pressed="false">전체 <span data-cnt="all">5</span></button></div>'
  '<p class="sr-only" id="tabStatus" role="status" aria-live="polite"></p>'
  '<div class="rfp-head" aria-hidden="true"><div>REF</div><div>행사명</div><div>목적지·일정</div><div>상태</div><div>다음 일정</div><div class="h-act"></div></div>'
  '<ul class="rfp-list" id="rfpList">' + ''.join(rfp_row(r) for r in MY_ROWS) + '</ul>'
  '<!--demo:start--><p class="demo-hint">데모: ‘열기’는 상태만 다른 같은 예시 진행 상황 페이지를 엽니다.</p><!--demo:end-->')
MY_BODY = ('<div class="app-wrap"><h1>내 견적 요청</h1>'
  '<div data-states="loading" class="mg-loading" role="status" aria-live="polite">불러오는 중입니다… / Loading…</div>'
  '<div data-states="need_login"><div class="panel">' + spanel(' is-wait', '!', '로그인이 필요합니다', '<p>내 견적 요청은 로그인한 뒤에 볼 수 있습니다. 회원이 아니어도 견적 요청은 할 수 있습니다.</p><div class="app-actions"><a class="btn btn-accent" href="login.html?next=my.html">로그인</a><a class="btn btn-ghost" href="signup.html">회원가입</a><a class="btn btn-ghost" href="index.html#register">비회원으로 요청하기</a></div>') + '</div></div>'
  '<div data-states="list empty linked link_pending"><div class="page-head"><div><p class="acc-lead" style="margin-top:6px"><b><span id="myName">김지은</span>님</b> · <span id="myCo">한빛투어</span></p></div>'
  '<div class="app-actions"><a class="btn btn-accent" href="index.html#register">새 견적 요청</a><a class="btn btn-ghost" href="account.html">계정 설정</a><button type="button" class="btn btn-ghost" id="myLogout">로그아웃</button></div></div>'
  + banner('ok', '<span class="txt"><b>이전 요청 1건을 연결했습니다.</b> 비회원으로 접수하신 MG-2610-020이 이 계정에 연결되었습니다.</span>', states='linked')
  + banner('info', '<span class="txt" id="lnkTxt">휴대전화 번호가 같은 비회원 요청 1건이 있습니다 (MG-2609-011 · 방콕 · 2026-09-02 접수). 본인 요청이라면 연결을 요청해 주세요.</span><button type="button" class="btn btn-ghost btn-sm" id="lnkReq">연결 요청</button>', states='link_pending')
  + '<div data-states="list linked link_pending">' + MY_LIST + '</div>'
  '<div data-states="empty"><div class="panel empty-panel"><h2>아직 견적 요청이 없습니다</h2><p>일정이 확정된 해외 행사라면 지금 요청하실 수 있습니다. 요청하면 이 계정에서 진행 상황을 확인할 수 있습니다.</p><p>이전에 비회원으로 요청하셨다면 같은 이메일로 가입하면 자동 연결됩니다.</p><div class="app-actions"><a class="btn btn-accent" href="index.html#register">새 견적 요청</a></div></div></div>'
  '</div></div>')
MY_JS = r'''
  var mgApi=!!(window.MG && MG.mode==='api' && !MG.preview);
  function esc(s){return (s==null?'':String(s)).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function wireTabs(){var tabs=[].slice.call(document.querySelectorAll('[data-tab]')),rows=[].slice.call(document.querySelectorAll('#rfpList .rfp'));
    function tab(k){tabs.forEach(function(b){b.setAttribute('aria-pressed',b.getAttribute('data-tab')===k?'true':'false');});
      var n=0;rows.forEach(function(r){var show=k==='all'||r.getAttribute('data-grp')===k;r.hidden=!show;if(show)n++;});
      $('tabStatus').textContent=n+'건을 보여 줍니다';}
    tabs.forEach(function(b){b.addEventListener('click',function(){tab(b.getAttribute('data-tab'));});});
    tab('active');}
  function wireShareToggles(){document.querySelectorAll('[data-share-toggle]').forEach(function(b){b.addEventListener('click',function(){var p=$(b.getAttribute('aria-controls')),open=p.hidden;p.hidden=!open;b.setAttribute('aria-expanded',open?'true':'false');});});}
  if(!mgApi){
    var mem=getMember();
    if(st()==='list'&&!QS.has('state')&&!mem)go('need_login');
    var mm=mem||DEMO;$('myName').textContent=mm.name;$('myCo').textContent=mm.company;
    $('myLogout').addEventListener('click',function(){clearMember();location.href='login.html';});
    wireTabs();
    document.querySelectorAll('[data-share]').forEach(shareInit);
    wireShareToggles();
    var lr=$('lnkReq');if(lr){lr.addEventListener('click',function(){$('lnkTxt').textContent='연결을 요청했습니다. 운영팀 확인 후 연결됩니다(영업일 기준 1일). 결과는 이메일로 알려 드립니다.';lr.remove();});}
  } else {
    $('myLogout').addEventListener('click',function(){MG.auth.signOut().then(function(){location.href='login.html';});});
    function wireShare(box,ref){
      var none=box.querySelector('[data-share-none]'),on=box.querySelector('[data-share-on]'),url=box.querySelector('[data-share-url]'),live=box.querySelector('[data-share-live]');
      function render(u){none.hidden=!!u;on.hidden=!u;if(u)url.value=u;}
      box.querySelector('[data-share-create]').addEventListener('click',function(){MG.api.create_share_link({ref:ref}).then(function(resp){render(resp.url);live.textContent='보기 전용 링크를 만들었습니다.';box.querySelector('[data-share-copy]').focus();},function(err){toast(MG.msg(err));});});
      box.querySelector('[data-share-regen]').addEventListener('click',function(){MG.api.create_share_link({ref:ref}).then(function(resp){render(resp.url);live.textContent='새 링크를 만들었습니다. 이전 링크는 더 이상 열리지 않습니다.';},function(err){toast(MG.msg(err));});});
      box.querySelector('[data-share-revoke]').addEventListener('click',function(){MG.api.revoke_share_link({ref:ref}).then(function(){render('');live.textContent='링크를 껐습니다. 이 링크로는 더 이상 열 수 없습니다.';box.querySelector('[data-share-create]').focus();},function(err){toast(MG.msg(err));});});
      box.querySelector('[data-share-copy]').addEventListener('click',function(){copyText(url.value,url,'링크를 복사했습니다','링크를 직접 선택해 복사해 주세요');});
      render(isOnUrl(box));
    }
    function isOnUrl(box){var u=box.getAttribute('data-init-url');return u||'';}
    function buildRow(r,i){
      var li=document.createElement('li');li.className='rfp'+(r.needs_action?' is-hot':'');li.setAttribute('data-grp',r.group||'active');li.setAttribute('data-ref',r.ref||'');
      var trackHref=(window.MG&&MG.url&&r.track_token)?MG.url.track(r.track_token):'#';
      var shareOn=r.share&&r.share.state==='active',shareUrl=shareOn?new URL('track.html?s='+encodeURIComponent(r.share.token),location.href).href:'';
      li.innerHTML='<div class="rfp-main">'
        +'<div class="rfp-cell"><span class="sr-only">요청 번호 </span><span class="ref">'+esc(r.ref)+'</span></div>'
        +'<div class="rfp-cell"><span class="sr-only">행사명 </span><span class="ttl">'+esc(r.title)+'</span>'+(r.needs_action?'<span class="rfp-hot">'+esc(r.needs_action)+'</span>':'')+(r.linked_from_guest?'<span class="rfp-tag">연결된 이전 요청 · 비회원 접수</span>':'')+'</div>'
        +'<div class="rfp-cell"><span class="lbl">목적지·일정</span>'+esc(r.region)+'<br>'+esc(r.start_date)+' – '+esc(r.end_date)+'</div>'
        +'<div class="rfp-cell"><span class="lbl">상태</span><span class="badge badge-open">'+esc(r.next_step||r.track_state||'')+'</span></div>'
        +'<div class="rfp-cell"><span class="lbl">다음 일정</span>'+esc(r.next_step||'')+'</div>'
        +'<div class="rfp-act"><a class="btn btn-accent btn-sm" href="'+trackHref+'" aria-label="열기">열기</a><button type="button" class="btn btn-ghost btn-sm" data-share-toggle aria-expanded="false" aria-controls="rs-'+i+'">공유 링크</button></div>'
        +'</div><div class="rfp-share" id="rs-'+i+'" hidden>'
        +'<div class="share-ui" data-init-url="'+esc(shareUrl)+'"><p class="share-expl"><b>보기 전용 링크</b> · 진행 상황과 비교표만 보이고 선택·변경은 할 수 없습니다 · 요청이 끝나고 30일 뒤 자동 만료</p>'
        +'<div data-share-none'+(shareOn?' hidden':'')+'><button type="button" class="btn btn-ghost btn-sm" data-share-create>링크 만들기</button></div>'
        +'<div data-share-on'+(shareOn?'':' hidden')+'><label class="lbl-t">공유 링크</label><div class="share-line"><input type="text" class="share-url" data-share-url readonly value="'+esc(shareUrl)+'"><button type="button" class="btn btn-accent btn-sm" data-share-copy>복사</button></div>'
        +'<div class="app-actions"><button type="button" class="btn btn-ghost btn-sm" data-share-regen>새 링크 만들기</button><button type="button" class="btn btn-ghost btn-sm" data-share-revoke>링크 끄기</button></div>'
        +'<p class="hint">링크는 요청당 하나만 유지됩니다. 새로 만들면 이전 링크는 바로 꺼집니다.</p></div>'
        +'<p class="sr-only" role="status" aria-live="polite" data-share-live></p></div></div>';
      wireShare(li.querySelector('.share-ui'),r.ref);
      return li;
    }
    if(!MG.auth.session()){go('need_login');}
    else{
      Promise.all([MG.api.my_profile(),MG.api.my_rfps()]).then(function(res){
        var prof=res[0],data=res[1]||{};
        $('myName').textContent=prof.name;$('myCo').textContent=prof.company;
        var list=$('rfpList');list.innerHTML='';
        (data.rows||[]).forEach(function(r,i){list.appendChild(buildRow(r,i));});
        wireTabs();wireShareToggles();
        var lr=$('lnkReq');
        if((data.rows||[]).length===0 && !(data.link_candidates&&data.link_candidates.length) && !data.linked_recent){go('empty');}
        else if(data.link_candidates&&data.link_candidates.length){var c=data.link_candidates[0];$('lnkTxt').textContent='휴대전화 번호가 같은 비회원 요청 1건이 있습니다 ('+esc(c.ref)+' · '+esc(c.region)+' · '+esc(c.created_at)+' 접수). 본인 요청이라면 연결을 요청해 주세요.';go('link_pending');
          if(lr)lr.addEventListener('click',function(){MG.api.link_request({ref:c.ref}).then(function(){$('lnkTxt').textContent='연결을 요청했습니다. 운영팀 확인 후 연결됩니다(영업일 기준 1일). 결과는 이메일로 알려 드립니다.';lr.remove();},function(err){toast(MG.msg(err));});});}
        else if(data.linked_recent){go('linked');}
        else{go('list');}
      },function(err){go('need_login');});
    }
  }
'''
acc_page('my', '내 견적 요청 | MICEGO 마이스고', '회원 전용 내 견적 요청 목록입니다.', MY_BODY, 'list', MY_JS, noindex=True, share=True)

# ================================================================== account.html
def flow_panel(p, title, lead, label, itype, ac, hint, err, ttl, show_fmt):
    return ('<div class="panel"><h2 id="%sTitle" tabindex="-1">%s</h2><p class="acc-lead" style="margin-top:6px">%s</p>'
      '<div id="%sPh1"><div class="field" id="f-%sVal" style="margin-top:14px"><label for="%sVal">%s <span class="req">*</span></label><input type="%s" id="%sVal" autocomplete="%s"%s><p class="hint">%s</p><p class="field-msg">%s</p></div>'
      '<div class="app-actions"><button type="button" class="btn btn-accent" id="%sSend">인증번호 받기</button><button type="button" class="btn btn-ghost" id="%sCancel">취소</button></div></div>'
      '<div id="%sPh2" hidden><p class="acc-lead" style="margin-top:14px"><b id="%sShow"></b>로 인증번호 6자리를 보냈습니다.</p>%s<p class="otp-help">인증번호는 %s 유효하고, 5회 틀리면 다시 받아야 합니다.</p><button type="button" class="linkbtn" id="%sBack">%s 수정</button></div></div>'
      % (p, title, lead, p, p, p, label, itype, p, ac, ' inputmode="email"' if itype == 'email' else ' inputmode="tel"', hint, err, p, p, p, p, code_block(p, ttl, '인증하고 변경하기'), show_fmt, p, label))

AC_BODY = ('<div class="app-wrap acc"><a class="acc-back" href="my.html">← 내 견적 요청</a><h1>계정 설정</h1>'
  '<div data-states="loading" class="mg-loading" role="status" aria-live="polite">불러오는 중입니다… / Loading…</div>'
  + banner('ok', '<span class="txt" id="savedMsg" tabindex="-1">변경 사항을 저장했습니다.</span>', states='saved')
  + banner('ok', '<span class="txt" id="pwDoneMsg" tabindex="-1">비밀번호를 바꿨습니다. 다른 기기에서는 로그아웃되었고, 변경 알림 메일을 보냈습니다.</span>', states='pw_done')
  # reauth
  + '<div data-states="reauth"><div class="panel"><h2 id="raTitle" tabindex="-1">비밀번호를 한 번 더 확인합니다</h2><p class="acc-lead" style="margin-top:6px">마지막 로그인 후 10분이 지났습니다. 이메일·휴대전화 변경이나 탈퇴 전에는 비밀번호를 다시 확인합니다.</p><form id="raForm" novalidate style="margin-top:14px">'
    + pw_field('raPw', '비밀번호', ac='current-password', rules=False).replace('비밀번호를 확인해 주세요.', '10자 이상의 비밀번호를 입력해 주세요.') +
    '<div class="app-actions"><button type="submit" class="btn btn-accent">확인</button><button type="button" class="btn btn-ghost" id="raCancel">취소</button></div></form></div></div>'
  + '<div data-states="email_step">' + flow_panel('ne', '이메일 변경', '새 이메일 주소를 인증하면 로그인 아이디가 바뀝니다. 이전 주소로 변경 안내 메일이 갑니다.', '새 이메일', 'email', 'email', '지금 쓰는 메일과 같은 주소로는 바꿀 수 없습니다.', '이메일 형식을 확인해 주세요.', '10:00', '10분 동안') + '</div>'
  + '<div data-states="phone_step">' + flow_panel('np', '휴대전화 변경', '새 번호로 받은 인증번호를 입력하면 바뀝니다. 진행 중인 요청의 제안 선택 인증번호도 새 번호로 갑니다.', '새 휴대전화', 'tel', 'tel', '진행 알림(알림톡·문자)과 제안 선택 확인에 쓰는 번호입니다.', '휴대전화 번호를 확인해 주세요.', '3:00', '3분 동안') + '</div>'
  + '<div data-states="default saved pw_done">'
  # profile
  '<section class="panel acc-sec"><h2>담당자 정보</h2><p class="sub">이미 호텔에 보낸 요청서에는 반영되지 않고, 진행 중인 요청의 알림은 바뀐 정보로 보냅니다.</p><form id="acProfile" novalidate>'
  '<div class="field" id="f-acName"><label for="acName">이름 <span class="req">*</span></label><input type="text" id="acName" autocomplete="name"><p class="field-msg">이름을 입력해 주세요.</p></div>'
  '<div class="field" id="f-acOrg"><span class="lbl-t">소속 유형 <span class="req">*</span></span><div class="radio-row" role="radiogroup" aria-label="소속 유형">' + chips('acOrg', ORG_VALS, cls='sm') + '</div></div>'
  '<div class="field" id="f-acCompany"><label for="acCompany">회사·단체명 <span class="req">*</span></label><input type="text" id="acCompany" autocomplete="organization"><p class="field-msg">회사 또는 단체명을 입력해 주세요.</p></div>'
  '<button type="submit" class="btn btn-accent">저장</button></form></section>'
  # email
  '<section class="panel acc-sec"><h2>이메일(아이디)</h2><div class="kv"><span class="v" id="acEmailCur">jieun.kim@hanbit-tour.example</span><button type="button" class="btn btn-ghost btn-sm" id="acEmailBtn">이메일 변경</button></div><p class="sub" style="margin:10px 0 0">새 주소로 인증한 뒤 바뀌며, 이전 주소로 안내 메일이 갑니다.</p></section>'
  # phone
  '<section class="panel acc-sec"><h2>휴대전화</h2><div class="kv"><span class="v" id="acPhoneCur">010-****-5678</span><button type="button" class="btn btn-ghost btn-sm" id="acPhoneBtn">휴대전화 변경</button></div><p class="sub" style="margin:10px 0 0">번호를 바꾸면 진행 중인 요청의 제안 선택 인증번호도 새 번호로 갑니다.</p></section>'
  # password
  '<section class="panel acc-sec"><h2>비밀번호</h2><form id="acPw" novalidate style="margin-top:12px">'
  + pw_field('acCur', '현재 비밀번호', ac='current-password', rules=False).replace('비밀번호를 확인해 주세요.', '현재 비밀번호를 입력해 주세요.')
  + pw_field('acNew', '새 비밀번호') + '<button type="submit" class="btn btn-accent">비밀번호 바꾸기</button></form></section>'
  # notifications
  '<section class="panel acc-sec"><h2>알림 수신</h2><p class="sub">진행 알림은 서비스에 꼭 필요한 안내라 끌 수 없습니다.</p>'
  '<div class="toggle-row"><div class="t">진행 알림<small>접수·제안 마감·비교표 도착 등 (이메일, 알림톡·문자)</small></div><span class="always-on">항상 받음</span></div>'
  '<div class="toggle-row"><label class="tap" for="acMktMail"><span class="t">서비스 소식 · 이메일<small id="tsMail">동의 일시 2026-09-14 10:32</small></span><input type="checkbox" id="acMktMail" checked></label></div>'
  '<div class="toggle-row"><label class="tap" for="acMktSms"><span class="t">서비스 소식 · 문자·알림톡<small id="tsSms">수신 안 함</small></span><input type="checkbox" id="acMktSms"></label></div>'
  '<p class="sr-only" id="notiStatus" role="status" aria-live="polite"></p></section>'
  # devices
  '<section class="panel acc-sec"><h2>로그인 기기</h2><ul class="dev-list" id="devList"><li><span>Chrome · Windows · 서울<br><small style="color:var(--gray)">방금 전</small></span><span class="cur">현재 기기</span></li><li id="devOther"><span>Safari · iPhone · 서울<br><small style="color:var(--gray)">어제 18:40</small></span></li></ul>'
  '<div class="app-actions"><button type="button" class="btn btn-ghost btn-sm" id="devOut">다른 기기 모두 로그아웃</button></div><p class="sr-only" id="devStatus" role="status" aria-live="polite"></p></section>'
  '<p style="margin-top:24px"><a class="danger-link" href="withdraw.html">회원 탈퇴</a></p></div>'
  '\n</div>')
AC_JS = r'''
  var mgApi=!!(window.MG && MG.mode==='api' && !MG.preview);
  var pendingRetry=null;
  function saved(msg,s){if(msg)$('savedMsg').textContent=msg;go(s||'saved');$(s==='pw_done'?'pwDoneMsg':'savedMsg').focus();}
  if(!mgApi){
    var mem=getMember()||DEMO,pend='',stale=(st()==='reauth');
    function fill(){$('acName').value=mem.name;$('acCompany').value=mem.company;var r=document.querySelector('input[name="acOrg"][value="'+mem.orgType+'"]');if(r){r.checked=true;r.dispatchEvent(new Event('change',{bubbles:true}));}
      $('acEmailCur').textContent=mem.email;if(emEl)emEl.value=mem.email;$('acPhoneCur').textContent=maskPhone(mem.phone);}
    fill();
    $('acProfile').addEventListener('submit',function(e){e.preventDefault();var bad=false;
      if(setErr('f-acName',!$('acName').value.trim())){bad=true;$('acName').focus();}
      else if(setErr('f-acCompany',!$('acCompany').value.trim())){bad=true;$('acCompany').focus();}
      if(bad)return;
      var o=document.querySelector('input[name="acOrg"]:checked');
      mem.name=$('acName').value.trim();mem.company=$('acCompany').value.trim();if(o)mem.orgType=o.value;setMember(mem);
      saved('담당자 정보를 저장했습니다. 이미 호텔에 보낸 요청서에는 반영되지 않습니다.');});
    /* sensitive actions: password re-entry when the last login is older than 10 minutes */
    function sens(kind){if(stale){pend=kind;go('reauth','raPw');}else start(kind);}
    function start(kind){if(kind==='email'){reset('ne');go('email_step','neTitle');}else{reset('np');go('phone_step','npTitle');}}
    $('acEmailBtn').addEventListener('click',function(){sens('email');});
    $('acPhoneBtn').addEventListener('click',function(){sens('phone');});
    $('raForm').addEventListener('submit',function(e){e.preventDefault();
      if(setErr('f-raPw',$('raPw').value.length<10)){$('raPw').focus();return;}
      stale=false;$('raPw').value='';var k=pend||'email';pend='';start(k);});
    $('raCancel').addEventListener('click',function(){pend='';go('default');});
    /* change flows (email / phone): new value -> code -> done */
    var OT={};
    function flow(p,kind){
      var otp=OT[p]=Otp({input:$(p+'Code'),timer:$(p+'Timer'),resend:$(p+'Resend'),msg:$(p+'Msg'),ttl:kind==='email'?600:180,cool:60,max:5,deadMsg:'인증번호를 다시 받아 주세요.'}),val='';
      function ok(v){return kind==='email'?(EMAIL_RE.test(v)&&v.toLowerCase()!==mem.email.toLowerCase()):PHONE_RE.test(v.replace(/\s+/g,''));}
      $(p+'Send').addEventListener('click',function(){val=$(p+'Val').value.trim();
        if(setErr('f-'+p+'Val',!ok(val))){$(p+'Val').focus();return;}
        $(p+'Ph1').hidden=true;$(p+'Ph2').hidden=false;$(p+'Show').textContent=kind==='email'?val:maskPhone(val);otp.start();$(p+'Code').focus();});
      $(p+'Back').addEventListener('click',function(){otp.stop();$(p+'Ph2').hidden=true;$(p+'Ph1').hidden=false;$(p+'Val').focus();});
      $(p+'Cancel').addEventListener('click',function(){otp.stop();go('default');});
      $(p+'Resend').addEventListener('click',function(){otp.start();otp.say('인증번호를 다시 보냈습니다.');$(p+'Code').focus();});
      function verify(){var r=otp.check($(p+'Code').value.trim());
        if(r==='ok'){otp.stop();
          if(kind==='email'){mem.email=val;setMember(mem);fill();saved('이메일을 바꿨습니다. 이전 주소로 변경 안내 메일을 보냈습니다.');}
          else{mem.phone=val;setMember(mem);fill();saved('휴대전화를 바꿨습니다. 진행 중인 요청의 제안 선택 인증번호도 새 번호로 갑니다. 변경 안내 메일을 보냈습니다.');}}
        else if(r==='void'){otp.say('인증번호를 5회 잘못 입력해 무효가 되었습니다. 새 인증번호를 받아 주세요.',true);$(p+'Code').disabled=true;otp.allow();}
        else $(p+'Code').focus();}
      $(p+'Verify').addEventListener('click',verify);$(p+'Code').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();verify();}});}
    flow('ne','email');flow('np','phone');
    function reset(p){OT[p].stop();$(p+'Ph1').hidden=false;$(p+'Ph2').hidden=true;$(p+'Val').value='';$(p+'Code').value='';$(p+'Code').disabled=false;setErr('f-'+p+'Val',false);}
    /* password */
    var emEl=document.createElement('input');emEl.value=mem.email;var updNew=bindPw($('acNew'),$('acNew-rules'),emEl);
    $('acPw').addEventListener('submit',function(e){e.preventDefault();var bad=false;
      if(setErr('f-acCur',$('acCur').value.length<10)){bad=true;$('acCur').focus();}
      if(setErr('f-acNew',!updNew().ok)){if(!bad)$('acNew').focus();bad=true;}
      if(bad)return;
      $('acCur').value='';$('acNew').value='';updNew();saved('','pw_done');});
    /* notifications */
    function now(){var d=new Date(),z=function(n){return ('0'+n).slice(-2);};return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate())+' '+z(d.getHours())+':'+z(d.getMinutes());}
    function noti(cb,el,name){cb.addEventListener('change',function(){el.textContent=cb.checked?'동의 일시 '+now():'수신 안 함 · 철회 '+now();$('notiStatus').textContent=name+' 수신을 '+(cb.checked?'켰습니다':'껐습니다');});}
    noti($('acMktMail'),$('tsMail'),'이메일 서비스 소식');noti($('acMktSms'),$('tsSms'),'문자·알림톡 서비스 소식');
    $('devOut').addEventListener('click',function(){var o=$('devOther');if(o){o.remove();$('devStatus').textContent='다른 기기 1곳에서 로그아웃했습니다.';$('devOut').disabled=true;}});
    var S0=st();
    if(S0==='email_step')reset('ne');if(S0==='phone_step')reset('np');
  } else {
    /* ---- api mode ---- */
    var mem={name:'',company:'',orgType:'',email:'',phone:''};
    function fill(){$('acName').value=mem.name;$('acCompany').value=mem.company;var r=document.querySelector('input[name="acOrg"][value="'+mem.orgType+'"]');if(r){r.checked=true;r.dispatchEvent(new Event('change',{bubbles:true}));}
      $('acEmailCur').textContent=mem.email;$('acPhoneCur').textContent=mem.phone?maskPhone(mem.phone):'';
      $('acMktMail').checked=!!mem.mktEmail;$('acMktSms').checked=!!mem.mktSms;}
    var emEl=document.createElement('input');var updNew=bindPw($('acNew'),$('acNew-rules'),emEl);
    function loadProfile(){return MG.api.my_profile().then(function(p){mem=p;emEl.value=p.email;fill();return p;});}
    loadProfile().then(function(){go('default');},function(err){location.href='login.html?next=account.html';});
    function refreshSessions(){
      MG.api.my_sessions().then(function(rows){
        var list=$('devList');if(!list)return;list.innerHTML='';
        (rows||[]).forEach(function(s){var li=document.createElement('li');
          li.innerHTML='<span>'+(s.ua?s.ua.replace(/</g,'&lt;'):'기기')+(s.ip?' · '+s.ip:'')+'<br><small style="color:var(--gray)">'+(s.updated_at||'')+'</small></span>'+(s.current?'<span class="cur">현재 기기</span>':'');
          list.appendChild(li);});
      },function(){});
    }
    refreshSessions();
    $('acProfile').addEventListener('submit',function(e){e.preventDefault();var bad=false;
      if(setErr('f-acName',!$('acName').value.trim())){bad=true;$('acName').focus();}
      else if(setErr('f-acCompany',!$('acCompany').value.trim())){bad=true;$('acCompany').focus();}
      if(bad)return;
      var o=document.querySelector('input[name="acOrg"]:checked');
      MG.api.account_update({op:'profile',name:$('acName').value.trim(),company:$('acCompany').value.trim(),orgType:o?o.value:mem.orgType}).then(function(resp){
        if(resp&&resp.member)mem=resp.member;fill();saved('담당자 정보를 저장했습니다. 이미 호텔에 보낸 요청서에는 반영되지 않습니다.');
      },function(err){MG.show(err,{setErr:setErr,toast:toast});});});
    function start(kind){if(kind==='email'){reset('ne');go('email_step','neTitle');}else{reset('np');go('phone_step','npTitle');}}
    $('acEmailBtn').addEventListener('click',function(){start('email');});
    $('acPhoneBtn').addEventListener('click',function(){start('phone');});
    $('raForm').addEventListener('submit',function(e){e.preventDefault();
      var pw=$('raPw').value;
      if(setErr('f-raPw',pw.length<10)){$('raPw').focus();return;}
      var fn=pendingRetry;pendingRetry=null;$('raPw').value='';
      if(fn)fn(pw);else go('default');});
    $('raCancel').addEventListener('click',function(){pendingRetry=null;go('default');});
    var OT={},PEND={};
    function flow(p,kind){
      var otp=OT[p]=Otp({input:$(p+'Code'),timer:$(p+'Timer'),resend:$(p+'Resend'),msg:$(p+'Msg'),ttl:kind==='email'?600:180,cool:60,max:5,deadMsg:'인증번호를 다시 받아 주세요.'});
      function ok(v){return kind==='email'?(EMAIL_RE.test(v)&&v.toLowerCase()!==mem.email.toLowerCase()):PHONE_RE.test(v.replace(/\s+/g,''));}
      function doSend(val,pw){
        var call=kind==='email'?MG.api.account_update({op:'email_start',new_email:val,password:pw}):MG.api.send_phone_otp({phone:val,purpose:'phone_change',password:pw});
        return call.then(function(resp){
          PEND[p]={val:val,otpId:resp.otp_id};
          $(p+'Ph1').hidden=true;$(p+'Ph2').hidden=false;$(p+'Show').textContent=kind==='email'?val:(resp.phone_masked||maskPhone(val));otp.start();$(p+'Code').focus();
        },function(err){
          if(err.code==='REAUTH_REQUIRED'){pendingRetry=function(pw2){doSend(val,pw2);};go('reauth','raPw');}
          else{MG.show(err,{setErr:setErr,toast:toast});}
        });
      }
      $(p+'Send').addEventListener('click',function(){var val=$(p+'Val').value.trim();
        if(setErr('f-'+p+'Val',!ok(val))){$(p+'Val').focus();return;}
        doSend(val,undefined);});
      $(p+'Back').addEventListener('click',function(){otp.stop();$(p+'Ph2').hidden=true;$(p+'Ph1').hidden=false;$(p+'Val').focus();});
      $(p+'Cancel').addEventListener('click',function(){otp.stop();go('default');});
      $(p+'Resend').addEventListener('click',function(){var pd=PEND[p];if(!pd)return;doSend(pd.val,undefined);otp.say('인증번호를 다시 보냈습니다.');$(p+'Code').focus();});
      function verify(){var code=$(p+'Code').value.trim(),pd=PEND[p]||{};
        if(!/^\d{6}$/.test(code)){otp.say('인증번호 6자리를 숫자로 입력해 주세요.',true);$(p+'Code').focus();return;}
        var call=kind==='email'?MG.api.account_update({op:'email_verify',otp_id:pd.otpId,code:code}):MG.api.verify_phone_otp({otp_id:pd.otpId,code:code});
        call.then(function(resp){otp.stop();
          if(kind==='email'){if(resp&&resp.member)mem=resp.member;else mem.email=pd.val;fill();saved('이메일을 바꿨습니다. 이전 주소로 변경 안내 메일을 보냈습니다.');}
          else{mem.phone=pd.val;fill();saved('휴대전화를 바꿨습니다. 진행 중인 요청의 제안 선택 인증번호도 새 번호로 갑니다. 변경 안내 메일을 보냈습니다.');}
        },function(err){
          if(err.code==='OTP_VOID'||err.code==='OTP_LOCKED'){otp.say(MG.msg(err),true);$(p+'Code').disabled=true;otp.allow();}
          else{otp.say(MG.msg(err),true);$(p+'Code').focus();}
        });}
      $(p+'Verify').addEventListener('click',verify);$(p+'Code').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();verify();}});}
    flow('ne','email');flow('np','phone');
    function reset(p){OT[p].stop();$(p+'Ph1').hidden=false;$(p+'Ph2').hidden=true;$(p+'Val').value='';$(p+'Code').value='';$(p+'Code').disabled=false;setErr('f-'+p+'Val',false);}
    $('acPw').addEventListener('submit',function(e){e.preventDefault();var bad=false;
      if(setErr('f-acCur',$('acCur').value.length<10)){bad=true;$('acCur').focus();}
      if(setErr('f-acNew',!updNew().ok)){if(!bad)$('acNew').focus();bad=true;}
      if(bad)return;
      var cur=$('acCur').value,nw=$('acNew').value;
      MG.api.account_update({op:'password',current:cur,new:nw}).then(function(resp){
        if(resp&&resp.member)mem=resp.member;$('acCur').value='';$('acNew').value='';updNew();saved('','pw_done');
      },function(err){
        if(err.code==='REAUTH_REQUIRED'){pendingRetry=function(pw2){/* password op re-sent is unusual; just ask user to retry */toast(MG.msg(err));};go('reauth','raPw');}
        else{setErr('f-acCur',true);toast(MG.msg(err));}
      });});
    function noti(){MG.api.account_update({op:'marketing',mktEmail:$('acMktMail').checked,mktSms:$('acMktSms').checked}).then(function(){},function(err){toast(MG.msg(err));});}
    function now(){var d=new Date(),z=function(n){return ('0'+n).slice(-2);};return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate())+' '+z(d.getHours())+':'+z(d.getMinutes());}
    $('acMktMail').addEventListener('change',function(){$('tsMail').textContent=$('acMktMail').checked?'동의 일시 '+now():'수신 안 함 · 철회 '+now();$('notiStatus').textContent='이메일 서비스 소식 수신을 '+($('acMktMail').checked?'켰습니다':'껐습니다');noti();});
    $('acMktSms').addEventListener('change',function(){$('tsSms').textContent=$('acMktSms').checked?'동의 일시 '+now():'수신 안 함 · 철회 '+now();$('notiStatus').textContent='문자·알림톡 서비스 소식 수신을 '+($('acMktSms').checked?'켰습니다':'껐습니다');noti();});
    $('devOut').addEventListener('click',function(){MG.auth.signOut('others').then(function(){$('devStatus').textContent='다른 기기에서 로그아웃했습니다.';$('devOut').disabled=true;refreshSessions();});});
  }
'''
acc_page('account', '계정 설정 | MICEGO 마이스고', '회원 계정 설정.', AC_BODY, 'default', AC_JS, noindex=True)

# ================================================================== withdraw.html
WD_REASONS = ['더 이상 쓰지 않음', '담당자가 바뀜', '원하는 호텔 제안이 없음', '기타']
WD_BODY = ('<div class="app-wrap acc"><h1>회원 탈퇴</h1>'
  '<div data-states="loading" class="mg-loading" role="status" aria-live="polite">불러오는 중입니다… / Loading…</div>'
  '<div data-states="default"><p class="acc-lead">탈퇴하기 전에 아래 내용을 확인해 주세요.</p>'
  '<div class="info-box warm"><h3>탈퇴하면 이렇게 됩니다</h3><ul><li>계정과 연락처를 바로 파기합니다.</li><li>진행 상황 링크와 공유 링크를 모두 쓸 수 없게 됩니다.</li><li>접수됨·요건 확인 중인 요청은 자동으로 취소됩니다.</li><li>같은 이메일로 다시 가입할 수 있지만, 이전 요청은 연결되지 않습니다.</li></ul></div>'
  '<div class="info-box warm"><h3>보관하는 기록</h3><p>성사된 요청의 연결 기록(회사명·담당자·연락처·선정 호텔·연결 일시)은 분쟁 대응을 위해 3년간 보관 후 파기합니다.<!-- TODO(legal): 보관 기간·근거 법령 검토 --> 이미 선정 호텔에 전달된 정보는 회수되지 않습니다.</p></div>'
  '<div class="panel"><form id="wdForm" novalidate>'
  '<div class="field"><span class="lbl-t">탈퇴 사유 <span class="opt">(선택)</span></span><div class="radio-row" role="radiogroup" aria-label="탈퇴 사유">' + chips('reason', WD_REASONS, cls='sm') + '</div></div>'
  + pw_field('wdPw', '비밀번호', ac='current-password', rules=False, hint='본인 확인을 위해 비밀번호를 입력해 주세요.').replace('비밀번호를 확인해 주세요.', '비밀번호를 입력해 주세요.') +
  '<div class="field" id="f-wdOk"><div class="check-row" style="align-items:center;min-height:44px"><input type="checkbox" id="wdOk"><label for="wdOk">위 내용을 확인했으며 탈퇴하겠습니다.</label></div><p class="field-msg">탈퇴 내용을 확인했다는 체크가 필요합니다.</p></div>'
  '<div class="app-actions" style="margin-top:4px"><button type="submit" class="btn btn-danger">탈퇴하기</button><a class="btn btn-ghost" href="account.html">취소</a></div></form></div></div>'
  '<div data-states="blocked"><div class="panel">' + spanel(' is-wait', '!', '진행 중인 요청이 2건 있어 지금은 탈퇴할 수 없습니다',
      '<p>요청을 취소하거나 종료된 뒤 탈퇴할 수 있습니다. 접수됨·요건 확인 중인 요청은 탈퇴할 때 자동으로 취소되지만, 호텔에 요청했거나 비교표가 도착한 요청은 끝난 뒤에 탈퇴할 수 있습니다.</p>'
      '<ul class="blocked-list"><li><span><b>MG-2610-014</b> · 다낭 인센티브 행사<br><span class="small-note">비교표 도착</span></span><a class="btn btn-ghost btn-sm" href="track.html?t=demo-2610014&amp;state=delivered" aria-label="MG-2610-014 열기">열기</a></li>'
      '<li><span><b>MG-2610-017</b> · 방콕 시상식<br><span class="small-note">재요청</span></span><a class="btn btn-ghost btn-sm" href="track.html?t=demo-2610017&amp;state=rebid" aria-label="MG-2610-017 열기">열기</a></li></ul>'
      '<div class="app-actions"><a class="btn btn-accent" href="my.html">내 견적 요청으로 가기</a><a class="btn btn-ghost" href="contact.html">취소 문의하기</a></div>') + '</div></div>'
  '<div data-states="confirm"><div class="panel">' + spanel(' is-wait', '!', '정말 탈퇴하시겠습니까?', '<p id="wdConfirmMsg" tabindex="-1">탈퇴하면 계정과 연락처가 바로 파기되고, 되돌릴 수 없습니다. 진행 상황 링크와 공유 링크도 모두 쓸 수 없게 됩니다.</p><div class="app-actions"><button type="button" class="btn btn-danger" id="wdFinal">탈퇴를 확정합니다</button><button type="button" class="btn btn-ghost" id="wdBack">돌아가기</button></div>') + '</div></div>'
  '<div data-states="done"><div class="panel">' + spanel('', '✓', '탈퇴를 마쳤습니다', '<p id="wdDoneMsg" tabindex="-1">그동안 이용해 주셔서 감사합니다. 계정과 연락처를 파기했고, 탈퇴 안내 메일을 보냈습니다.</p><div class="app-actions"><a class="btn btn-accent" href="index.html">홈으로</a></div>') + '</div></div>'
  '\n</div>')
WD_JS = r'''
  var mgApi=!!(window.MG && MG.mode==='api' && !MG.preview);
  if(mgApi && st()==='loading'){go('default');}
  $('wdForm').addEventListener('submit',function(e){e.preventDefault();var bad=false;
    if(setErr('f-wdPw',$('wdPw').value.length<10)){bad=true;$('wdPw').focus();}
    if(setErr('f-wdOk',!$('wdOk').checked)){if(!bad)$('wdOk').focus();bad=true;}
    if(bad)return;go('confirm','wdConfirmMsg');});
  $('wdBack').addEventListener('click',function(){go('default','wdPw');});
  function renderBlockers(list){
    var ul=document.querySelector('.blocked-list');if(!ul)return;ul.innerHTML='';
    (list||[]).forEach(function(b){var li=document.createElement('li');
      li.innerHTML='<span><b>'+b.ref+'</b><br><span class="small-note">'+(b.track_state||'')+'</span></span>'+((window.MG&&b.token)?'<a class="btn btn-ghost btn-sm" href="'+MG.url.track(b.token)+'">열기</a>':'');
      ul.appendChild(li);});
  }
  $('wdFinal').addEventListener('click',function(){
    if(mgApi){
      $('wdFinal').disabled=true;
      var reason=document.querySelector('input[name="reason"]:checked');
      MG.api.withdraw({password:$('wdPw').value,reasons:reason?[reason.value]:[],confirm:true}).then(function(){
        MG.auth.signOut().then(function(){go('done','wdDoneMsg');});
      },function(err){
        $('wdFinal').disabled=false;
        if(err.code==='WITHDRAW_BLOCKED'){renderBlockers(err.blockers);go('blocked');}
        else if(err.code==='LOGIN_FAILED'){setErr('f-wdPw',true);go('default','wdPw');toast(MG.msg(err));}
        else{toast(MG.msg(err));}
      });
      return;
    }
    clearMember();go('done','wdDoneMsg');});
  if(!mgApi && st()==='done')clearMember();
'''
acc_page('withdraw', '회원 탈퇴 | MICEGO 마이스고', '회원 탈퇴 안내.', WD_BODY, 'default', WD_JS, noindex=True)

# ================================================================== terms.html (draft summary)
ART = [
 ('art1', '제1조 서비스 내용', '<p>MICEGO(마이스고)는 일정이 확정된 해외 MICE 행사의 요건을 받아, 조건에 맞는 해외 호텔에 같은 요건서를 보내고 도착한 제안을 비교표로 정리해 드리는 역경매 중개 서비스입니다. 행사 주최 측은 별도의 수수료 없이 이용합니다.</p>'),
 ('art2', '제2조 이용 대상', '<p>일정이 확정된 해외 행사를 준비하는 여행사·기업 등 주최 측 담당자가 이용할 수 있습니다. 국내에서 열리는 행사나 일정이 확정되지 않은 요청은 호텔에 보내지 않습니다.</p>'),
 ('art3', '제3조 회원 가입', '<p>견적 요청은 회원가입 없이도 할 수 있습니다. 회원가입은 만 14세 이상만 할 수 있으며, 이메일과 휴대전화 인증을 마쳐야 완료됩니다. 같은 이메일로 접수한 이전 요청은 가입 후 계정에 연결됩니다.</p>'),
 ('art4', '제4조 계정 관리', '<ul><li>계정은 1인 1계정으로 만들고, 다른 사람과 공유하지 않습니다.</li><li>담당자가 바뀌면 운영팀에 알려 주세요. 운영팀이 확인한 뒤 요청을 새 담당자의 계정으로 옮깁니다.</li></ul>'),
 ('art5', '제5조 보기 전용 공유 링크', '<p>동료와 함께 검토할 수 있도록 요청마다 보기 전용 링크를 만들 수 있습니다. 링크로는 진행 상황과 비교표만 볼 수 있고, 제안 선택과 조건 변경은 요청하신 분만 할 수 있습니다. 링크는 언제든 끌 수 있으며, 요청이 끝나고 30일이 지나면 자동으로 만료됩니다.</p>'),
 ('art6', '제6조 견적 요청과 제안 비교', '<p>호텔에는 회사명·예산·담당자 연락처를 뺀 표준 요건서만 전달합니다. 도착한 제안은 선정 전까지 제안 A·B·C로 호텔명을 가리고 비교하며, 금액은 호텔이 제출한 통화 그대로 보여 드립니다.</p>'),
 ('art7', '제7조 성사 시 정보 제공', '<ul><li>제안을 선택하면 선정된 호텔에 회사명·담당자 이름·이메일·연락처가 자동으로 전달됩니다. 선정되지 않은 호텔에는 결과만 알립니다.</li><li>선택은 요청서에 등록한 휴대전화로 받은 인증번호를 입력해야 확정됩니다. 공유 링크로는 선택할 수 없습니다.</li></ul>'),
 ('art8', '제8조 계약과 결제', '<p>호텔 계약과 결제는 선정된 호텔과 직접 진행합니다. MICEGO는 결제 대금을 대신 받지 않으며, 주최 측이 MICEGO에 내는 수수료는 없습니다.</p>'),
 ('art9', '제9조 탈퇴와 기록 보관', '<p>회원은 언제든 탈퇴할 수 있습니다. 탈퇴하면 계정과 연락처를 바로 파기하고, 진행 상황 링크와 공유 링크는 모두 쓸 수 없게 됩니다. 호텔에 요청했거나 비교표가 도착한 요청이 있으면 끝난 뒤에 탈퇴할 수 있습니다. 성사된 요청의 연결 기록은 분쟁 대응을 위해 3년간 보관 후 파기합니다.<!-- TODO(legal): 보관 기간·근거 법령 검토 --></p>'),
 ('art10', '제10조 운영자와 계약 당사자', '<p>서비스 이용 계약의 당사자는 MatchGo입니다. 문의는 <a class="alink" href="mailto:mysteri1984@gmail.com">mysteri1984@gmail.com</a>으로 보내 주세요.<!-- TODO(operator): 상호(법인명), 대표자, 사업자등록번호, 주소 — 확인 후 기재 --></p>'),
]
TERMS_CSS = r"""
.terms-doc{padding-top:8px}
.terms-doc .t-head{padding-bottom:24px;border-bottom:1px solid var(--line,#E4E8F0)}
.terms-doc .t-head h1{font-size:28px;line-height:1.3;letter-spacing:-.02em;margin:0}
.terms-doc .t-draft{display:inline-block;margin-top:14px;padding:6px 12px;border-radius:8px;background:#FFF3D6;color:#7A4E00;font-size:13.5px;line-height:1.5;font-weight:700}
.terms-doc .t-lead{margin-top:12px;font-size:15px;line-height:1.75;color:var(--ink-60,#5B6785);word-break:keep-all}
.terms-doc .t-toc{margin:24px 0 4px;padding:16px 18px;border-radius:12px;background:#fff;border:1px solid var(--line,#E4E8F0)}
.terms-doc .t-toc b{display:block;font-size:13px;letter-spacing:.02em;color:var(--ink-60,#5B6785);margin-bottom:8px}
.terms-doc .t-toc ol{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr;gap:2px}
.terms-doc .t-toc a{display:flex;gap:10px;align-items:center;min-height:36px;font-size:14.5px;color:var(--ink,#0F1E3D);text-decoration:none;word-break:keep-all}
.terms-doc .t-toc a span{flex:none;width:44px;font:600 12px/1 'JetBrains Mono',monospace;color:#076E67}
.terms-doc .t-toc a:hover{color:#076E67;text-decoration:underline}
.terms-doc .t-art{padding:28px 0;border-bottom:1px solid var(--line,#E4E8F0);scroll-margin-top:88px}
.terms-doc .t-art:last-of-type{border-bottom:0}
.terms-doc .t-no{display:block;font:600 12px/1 'JetBrains Mono',monospace;letter-spacing:.06em;color:#076E67;margin-bottom:8px}
.terms-doc .t-art h2{font-size:19px;line-height:1.45;font-weight:800;letter-spacing:-.01em;margin:0 0 12px}
.terms-doc .t-art p,.terms-doc .t-art li{font-size:15.5px;line-height:1.8;color:var(--ink-80,#2B3654);text-align:left;word-break:keep-all;overflow-wrap:anywhere}
.terms-doc .t-art p+p{margin-top:10px}
.terms-doc .t-art ul{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.terms-doc .t-art li{position:relative;padding-left:16px}
.terms-doc .t-art li::before{content:"";position:absolute;left:2px;top:.8em;width:5px;height:5px;border-radius:50%;background:#0B8F86}
.terms-doc .alink{color:#076E67;text-decoration:underline}
.terms-doc .app-actions{margin-top:8px;padding-top:24px;border-top:1px solid var(--line,#E4E8F0)}
@media (min-width:768px){
 .terms-doc .t-head h1{font-size:34px}
 .terms-doc .t-toc ol{grid-template-columns:1fr 1fr;column-gap:24px}
 .terms-doc .t-art{padding:34px 0}
 .terms-doc .t-art h2{font-size:21px}
 .terms-doc .t-art p,.terms-doc .t-art li{font-size:16px}
}
"""
def _art(a):
    aid, title, html_ = a
    no, name = title.split(' ', 1)
    return '<section class="t-art" id="%s" aria-labelledby="%s-h"><span class="t-no">%s</span><h2 id="%s-h">%s</h2>%s</section>' % (aid, aid, no, aid, name, html_)
TM_TOC = '<nav class="t-toc" aria-label="조항 바로가기"><b>조항 바로가기</b><ol>' + ''.join('<li><a href="#%s"><span>%s</span>%s</a></li>' % (a[0], a[1].split(' ', 1)[0], a[1].split(' ', 1)[1]) for a in ART) + '</ol></nav>'
TM_BODY = ('<div class="app-wrap narrow terms-doc"><header class="t-head"><h1>이용약관</h1><p class="t-draft">초안 · 전문은 법무 검토 후 게시합니다</p><!-- TODO(legal): 이용약관 전문 작성·법무 검토 후 이 요약을 교체 -->'
  '<p class="t-lead">지금까지 안내한 서비스 운영 방식을 조항별로 정리한 요약본입니다.</p></header>' + TM_TOC + ''.join(_art(a) for a in ART) +
  '<div class="app-actions"><a class="btn btn-ghost" href="privacy.html">개인정보처리방침</a><a class="btn btn-ghost" href="signup.html">회원가입</a></div></div>')
wr('ko/terms.html', app_page('ko', '이용약관(초안) | MICEGO 마이스고', 'MICEGO 이용약관 요약 초안입니다. 서비스 내용, 회원 계정, 공유 링크, 성사 시 정보 제공, 탈퇴와 기록 보관을 안내합니다.', 'ko/terms.html', TM_BODY, nav=PUB_NAV_KO, cur='ko', ko_href='index.html', en_href='../en/index.html', cur_page='terms.html', extra_css=TERMS_CSS))
