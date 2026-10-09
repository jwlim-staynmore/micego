// ===== MICEGO Figma v2 prelude (paste at top of every use_figma script) =====
// Usage: const H = await MG(); then H.* helpers. Every builder returns nodes; collect ids.
async function MG(pageName) {
  const F = {r:{family:'Noto Sans KR',style:'Regular'}, m:{family:'Noto Sans KR',style:'Medium'}, b:{family:'Noto Sans KR',style:'Bold'}, mono:{family:'Roboto Mono',style:'Medium'}};
  await Promise.all(Object.values(F).map(f=>figma.loadFontAsync(f)));
  let page = null;
  if (pageName) {
    page = figma.root.children.find(p=>p.name===pageName);
    if (!page) { page = figma.createPage(); page.name = pageName; }
    await figma.setCurrentPageAsync(page);
  }
  const hex = h => ({r:parseInt(h.slice(1,3),16)/255,g:parseInt(h.slice(3,5),16)/255,b:parseInt(h.slice(5,7),16)/255});
  const solid = (h,o) => [{type:'SOLID',color:hex(h),...(o!=null?{opacity:o}:{})}];
  const C = {ink:'#1C1F24',sub:'#5B616B',mute:'#A3A8B0',line:'#E4E8F0',bg:'#F6F8FB',teal:'#128C7E',tealBg:'#E8F5F3',navy:'#0F1B2D',warn:'#8A5A00',warnBg:'#FFF3D6',err:'#EF4444',errBg:'#FDECEC',white:'#FFFFFF',blueBg:'#EAF1FD'};
  const TAG = {'핵심':'#1F9D55','보조':'#E0A800','다음 단계':'#8A8F98','결정 대기':'#7C5CDB'};
  const SRC = {'서버':'#2F6FDE','빌드 고정':'#4A4F57','예시 값':'#E8710A'};
  const PERM = {'운영자':'#0F1B2D','파트너 관리자':'#128C7E','파트너 담당자':'#5FB8AE','요청자':'#2F6FDE','공유 열람자':'#8A8F98','회원':'#3B82F6','호텔':'#B45309'};
  const ids = [];
  const keep = n => { ids.push(n.id); return n; };
  function T(parent, s, o={}) {
    const {font=F.r,size=14,color=C.ink,w=null,name='text',lh=null,underline=false,align=null} = o;
    const t = figma.createText(); t.fontName=font; t.fontSize=size; t.characters=String(s); t.fills=solid(color); t.name=name;
    if (lh) t.lineHeight={unit:'PERCENT',value:lh};
    if (underline) t.textDecoration='UNDERLINE';
    if (align) t.textAlignHorizontal=align;
    parent.appendChild(t);
    if (w==='fill') { t.textAutoResize='HEIGHT'; t.layoutSizingHorizontal='FILL'; }
    else if (w) { t.textAutoResize='HEIGHT'; t.resize(w,t.height); }
    return t;
  }
  function AL(parent, dir, props={}, fill=null) { const f=figma.createAutoLayout(dir, props); parent.appendChild(f); f.fills = fill?solid(fill):[]; return f; }
  const fillW = n => { n.layoutSizingHorizontal='FILL'; return n; };
  function stroke(n, color=C.line, w=1, sides) { n.strokes=solid(color); n.strokeWeight=w; if (sides) { n.strokeTopWeight=sides[0]; n.strokeRightWeight=sides[1]; n.strokeBottomWeight=sides[2]; n.strokeLeftWeight=sides[3]; } return n; }
  function box(parent, name, o={}) {
    const {pad=24, gap=12, fill=C.white, line=C.line, radius=12, dir='VERTICAL', fill_w=true} = o;
    const b = AL(parent, dir, {name, itemSpacing:gap, paddingLeft:pad, paddingRight:pad, paddingTop:pad, paddingBottom:pad}, fill);
    if (line) stroke(b, line); b.cornerRadius=radius; if (fill_w) fillW(b); return b;
  }
  function row(parent, name='row', gap=8, o={}) { const r=AL(parent,'HORIZONTAL',{name,itemSpacing:gap,counterAxisAlignItems:'CENTER',...o}); return r; }
  function btn(parent, s, kind='primary', name) {
    const k = {primary:[C.teal,C.white,null], ghost:[C.white,C.ink,'#C9CDD3'], danger:[C.white,C.err,C.err], disabled:['#EEF0F3',C.mute,null], dark:[C.navy,C.white,null]}[kind] || [C.teal,C.white,null];
    const b = AL(parent,'HORIZONTAL',{name:name||('btn/'+s),paddingLeft:18,paddingRight:18,paddingTop:11,paddingBottom:11,primaryAxisAlignItems:'CENTER',counterAxisAlignItems:'CENTER'}, k[0]);
    b.cornerRadius=8; if (k[2]) stroke(b,k[2]);
    T(b, s, {font:F.b,size:15,color:k[1]}); return b;
  }
  function link(parent, s, name) { return T(parent, s, {font:F.m,size:15,color:C.teal,underline:true,name:name||('link/'+s)}); }
  function field(parent, label, o={}) {
    const {value='', placeholder='', state='default', hint=null, req=false, type='input', w='fill'} = o;
    const f = AL(parent,'VERTICAL',{name:'field/'+label,itemSpacing:6}); if (w==='fill') fillW(f); else { f.resize(w,f.height); f.counterAxisSizingMode='FIXED'; }
    T(f, label+(req?' *':''), {font:F.m,size:13,color:C.sub});
    const inp = AL(f,'HORIZONTAL',{name:'input',paddingLeft:14,paddingRight:14,paddingTop:type==='textarea'?14:11,paddingBottom:type==='textarea'?44:11,counterAxisAlignItems:'CENTER',primaryAxisAlignItems:'SPACE_BETWEEN'}, state==='disabled'?'#F1F3F5':C.white);
    fillW(inp); inp.cornerRadius=8; stroke(inp, state==='error'?C.err:'#CBD2DC');
    T(inp, value||placeholder||' ', {size:15,color:value?C.ink:C.mute});
    if (type==='select') T(inp,'▾',{size:14,color:C.sub});
    if (hint) T(f, hint, {size:12,color:state==='error'?C.err:C.sub,w:'fill'});
    return f;
  }
  function check(parent, s, on=false, kind='check') { const r=row(parent,'check/'+s.slice(0,12),8); const b=figma.createRectangle(); r.appendChild(b); b.resize(18,18); b.cornerRadius=kind==='radio'?9:4; b.fills=on?solid(C.teal):solid(C.white); stroke(b,on?C.teal:'#A3A8B0'); T(r,s,{size:14}); return r; }
  function chip(parent, s, color, o={}) { const {name='chip', text=C.white, size=13, outline=false} = o; const c=AL(parent,'HORIZONTAL',{name,paddingLeft:8,paddingRight:8,paddingTop:3,paddingBottom:3}, outline?null:color); c.cornerRadius=4; if (outline) stroke(c,color); T(c,s,{font:F.b,size,color:outline?color:text}); return c; }
  function pill(parent, s, bg, fg, name='badge/state') { const p=AL(parent,'HORIZONTAL',{name,paddingLeft:12,paddingRight:12,paddingTop:5,paddingBottom:5},bg); p.cornerRadius=999; T(p,s,{font:F.b,size:13,color:fg}); return p; }
  function divider(parent) { const r=figma.createRectangle(); r.name='divider'; parent.appendChild(r); r.resize(10,1); r.fills=solid(C.line); fillW(r); return r; }
  function table(parent, cols, rows, o={}) {
    const {name='table', widths=null, headFill='#F1F3F5', size=14} = o;
    const tb = AL(parent,'VERTICAL',{name,itemSpacing:0}, C.white); fillW(tb); stroke(tb); tb.cornerRadius=8; tb.clipsContent=true;
    [cols, ...rows].forEach((r,i)=>{ const tr=AL(tb,'HORIZONTAL',{name:i===0?'thead':'row/'+i,paddingTop:11,paddingBottom:11,paddingLeft:14,paddingRight:14,itemSpacing:12,counterAxisAlignItems:'CENTER'}, i===0?headFill:C.white); fillW(tr); if (i>0) stroke(tr,C.line,1,[1,0,0,0]);
      r.forEach((c,j)=>{ let n; if (c && typeof c==='object' && c.chip) { const holder=AL(tr,'HORIZONTAL',{name:'cell'}); n=holder; pill(holder,c.chip,c.bg||C.tealBg,c.fg||C.teal,'chip/cell'); } else if (c && typeof c==='object' && c.btn) { const holder=AL(tr,'HORIZONTAL',{name:'cell',itemSpacing:6}); n=holder; (Array.isArray(c.btn)?c.btn:[c.btn]).forEach(b=>btn(holder,b,c.kind||'ghost')); } else { n=T(tr, c==null?'':c, {font:i===0?F.b:F.r,size,color:i===0?C.sub:C.ink,w:widths?widths[j]:120}); }
        if (widths) { n.layoutSizingHorizontal='FIXED'; if (n.type!=='TEXT') { n.resize(widths[j], n.height); } } else { n.layoutSizingHorizontal='FILL'; } }); });
    return tb;
  }
  // ---------- frames ----------
  function nextPos(container, gapX=160) { let x=80; for (const c of container.children) if (c.type!=='TEXT' || c.name!=='section-title') x=Math.max(x, c.x+c.width+gapX); return x; }
  function section(name, o={}) {
    const {width=8000} = o;
    let sec = figma.currentPage.children.find(n=>n.type==='SECTION' && n.name===name);
    if (!sec) { let maxY=0; for (const c of figma.currentPage.children) maxY=Math.max(maxY,c.y+c.height); sec=figma.createSection(); sec.name=name; figma.currentPage.appendChild(sec); sec.x=0; sec.y=maxY? maxY+240 : 0; sec.resizeWithoutConstraints(width, 1200); sec.fills=solid('#EEF0F3');
      const t=T(sec, name, {font:F.b,size:40,name:'section-title'}); t.x=80; t.y=56; keep(sec); }
    return sec;
  }
  function fitSection(sec) { let r=0,b=0; for (const n of sec.children) { r=Math.max(r,n.x+n.width); b=Math.max(b,n.y+n.height); } sec.resizeWithoutConstraints(Math.max(sec.width, r+120), b+120); }
  // slot: frame + annotation column; returns {fr, x, y, nx (notes column x)}
  function frame(sec, name, kind='PC', o={}) {
    const W = {PC:1280, '컴팩트':640, '모바일':360, '모달':560}[kind] || 1280;
    const {x=null, y=220, bg=kind==='모달'?C.white:C.bg} = o;
    const X = x!=null ? x : nextPos(sec);
    const fr = figma.createAutoLayout('VERTICAL',{name, itemSpacing:0}); sec.appendChild(fr); fr.x=X; fr.y=y; fr.fills=solid(bg);
    fr.resize(W,100); fr.counterAxisSizingMode='FIXED'; fr.primaryAxisSizingMode='AUTO'; fr.clipsContent=true;
    if (kind==='모달') { fr.cornerRadius=14; stroke(fr,'#C9CDD3'); fr.effects=[{type:'DROP_SHADOW',color:{r:0,g:0,b:0,a:0.18},offset:{x:0,y:12},radius:32,spread:0,visible:true,blendMode:'NORMAL'}]; }
    if (kind==='컴팩트' && o.band!==false) { const b=AL(fr,'HORIZONTAL',{name:'compact-band',paddingLeft:20,paddingRight:20,paddingTop:8,paddingBottom:8},'#E3E6EA'); fillW(b); T(b, o.bandText||'앞 PC 프레임과 같음 · 바뀐 영역만', {size:12,color:C.sub}); }
    keep(fr);
    return {fr, x:X, y, W, nx: X+W+40};
  }
  function content(fr, o={}) { const {padX=fr.width>=1000?152:(fr.width<=360?16:32), padY=32, gap=20, fill=null} = o; const w=AL(fr,'VERTICAL',{name:'content',paddingLeft:padX,paddingRight:padX,paddingTop:padY,paddingBottom:padY+8,itemSpacing:gap}, fill); fillW(w); return w; }
  // ---------- site atoms ----------
  function siteHeader(fr, lang='ko', o={}) {
    const {member=null, mobile=fr.width<=360} = o;
    const hd = AL(fr,'HORIZONTAL',{name:'header',paddingLeft:mobile?16:48,paddingRight:mobile?16:48,paddingTop:16,paddingBottom:16,primaryAxisAlignItems:'SPACE_BETWEEN',counterAxisAlignItems:'CENTER'}, C.white); fillW(hd); stroke(hd,C.line,1,[0,0,1,0]);
    T(hd, lang==='en'?'MICEGO Partner':'MICEGO', {font:F.b,size:mobile?18:22,color:C.navy,name:'logo'});
    const nav = row(hd,'nav',mobile?10:20);
    if (mobile) T(nav,'☰',{size:20,color:C.sub});
    else if (lang==='en') ['How it works','Partner terms','FAQ','Contact','한국어'].forEach(s=>T(nav,s,{font:F.m,size:14,color:C.sub}));
    else { ['서비스 소개','FAQ','문의','Hotels'].forEach(s=>T(nav,s,{font:F.m,size:14,color:C.sub})); if (member) T(nav, member+' 님 · 내 견적 요청', {font:F.b,size:14,color:C.teal}); else T(nav,'로그인',{font:F.b,size:14,color:C.teal}); }
    return hd;
  }
  function reqBar(fr, label, badge, tone='teal') {
    const tones = {teal:[C.tealBg,C.teal], warn:[C.warnBg,C.warn], gray:['#EEF0F3',C.sub], err:[C.errBg,C.err], blue:[C.blueBg,'#2F6FDE']};
    const rb = AL(fr,'HORIZONTAL',{name:'req-bar',paddingLeft:fr.width>=1000?152:16,paddingRight:fr.width>=1000?152:16,paddingTop:14,paddingBottom:14,primaryAxisAlignItems:'SPACE_BETWEEN',counterAxisAlignItems:'CENTER'}, C.navy); fillW(rb);
    T(rb, label, {font:F.m,size:14,color:C.white}); if (badge) pill(rb, badge, tones[tone][0], tones[tone][1]); return rb;
  }
  function progress(parent, steps, now, o={}) {
    const p = row(parent,'progress',8); fillW(p);
    steps.forEach((s,i)=>{ const st=AL(p,'VERTICAL',{name:'step/'+(i+1),itemSpacing:3,paddingTop:10,paddingBottom:10,paddingLeft:12,paddingRight:12}, i===now?C.tealBg:C.white); st.cornerRadius=8; stroke(st, i===now?C.teal:C.line); fillW(st);
      T(st,String(i+1).padStart(2,'0'),{font:F.b,size:12,color:i<=now?C.teal:C.mute}); T(st,s,{font:i===now?F.b:F.m,size:14,color:i<=now?C.ink:C.mute}); if (o.dates && o.dates[i]) T(st,o.dates[i],{size:11,color:C.sub}); });
    return p;
  }
  function panel(parent, title, paras=[], tone='teal', o={}) {
    const bg = {teal:C.tealBg, warn:C.warnBg, gray:'#EEF0F3', err:C.errBg, white:C.white, blue:C.blueBg}[tone];
    const p = box(parent, o.name||'status-panel', {fill:bg, line:tone==='white'?C.line:null});
    if (title) T(p, title, {font:F.b,size:o.size||20});
    paras.forEach(s=>T(p, s, {size:15,w:'fill',lh:160}));
    return p;
  }
  function h(parent, s, size=22) { return T(parent, s, {font:F.b,size,name:'heading'}); }
  function p(parent, s, o={}) { return T(parent, s, {size:o.size||15,color:o.color||C.ink,w:'fill',lh:160,name:o.name||'para'}); }
  function footer(fr, lang='ko') { const f=AL(fr,'VERTICAL',{name:'footer',paddingLeft:fr.width>=1000?152:16,paddingRight:fr.width>=1000?152:16,paddingTop:28,paddingBottom:28,itemSpacing:6}, '#0F1B2D'); fillW(f);
    T(f, lang==='en'?'MICEGO Partner · operated by MatchGo':'MICEGO 마이스고 · 운영 매치고(MatchGo)', {font:F.b,size:14,color:C.white});
    T(f, lang==='en'?'Partner terms · Privacy notice · Contact · Unsubscribe':'이용약관 · 개인정보처리방침 · 문의 · 지역 운영 파트너 안내', {size:12,color:'#AAB4C3'}); return f; }
  // ---------- console atoms ----------
  const MENU_HQ = ['대시보드','견적 관리','호텔 파트너','정산','회원','지역 파트너','피드백','설정'];
  const MENU_PTR = ['대시보드','견적 관리','호텔 파트너','정산','내 조직'];
  function shell(fr, o={}) {
    const {role='operator', active=0, email='ops@micego.example', title='', badges={}, org='티엠타이(Tmthai)'} = o;
    const wrap = AL(fr,'HORIZONTAL',{name:'console-shell',itemSpacing:0}); fillW(wrap);
    const side = AL(wrap,'VERTICAL',{name:'sidebar',paddingLeft:20,paddingRight:20,paddingTop:24,paddingBottom:24,itemSpacing:4}, C.navy); side.resize(232,side.height); side.counterAxisSizingMode='FIXED'; side.layoutSizingVertical='FILL';
    T(side,'MICEGO',{font:F.b,size:20,color:C.white}); T(side, role==='operator'?'운영 콘솔':org+' · 파트너 콘솔', {size:12,color:'#AAB4C3',name:'side-sub'});
    const sp=figma.createRectangle(); side.appendChild(sp); sp.resize(10,14); sp.fills=[]; sp.name='spacer';
    (role==='operator'?MENU_HQ:MENU_PTR).forEach((m,i)=>{ const it=AL(side,'HORIZONTAL',{name:'menu/'+m,paddingLeft:12,paddingRight:12,paddingTop:10,paddingBottom:10,primaryAxisAlignItems:'SPACE_BETWEEN',counterAxisAlignItems:'CENTER'}, i===active?'#1F2E46':null); it.cornerRadius=8; fillW(it); T(it,m,{font:i===active?F.b:F.m,size:14,color:i===active?C.white:'#C8D0DC'}); if (badges[m]!=null) pill(it,String(badges[m]),'#EF4444',C.white,'menu-badge'); });
    const main = AL(wrap,'VERTICAL',{name:'main',itemSpacing:0}); main.layoutSizingHorizontal='FILL';
    const top = AL(main,'HORIZONTAL',{name:'topbar',paddingLeft:32,paddingRight:32,paddingTop:16,paddingBottom:16,primaryAxisAlignItems:'SPACE_BETWEEN',counterAxisAlignItems:'CENTER'}, C.white); fillW(top); stroke(top,C.line,1,[0,0,1,0]);
    T(top, title, {font:F.b,size:20});
    const r=row(top,'account',14); T(r, (role==='operator'?'operator':role==='partner_admin'?'partner_admin':'partner_member')+' · '+email, {size:13,color:C.sub}); T(r,'로그아웃',{font:F.m,size:13,color:C.teal,underline:true});
    const body = AL(main,'VERTICAL',{name:'body',paddingLeft:32,paddingRight:32,paddingTop:24,paddingBottom:40,itemSpacing:16}); fillW(body);
    return body;
  }
  function card(parent, title, o={}) { const c=box(parent, 'card/'+(title||'card'), {pad:20, gap:12, ...o}); if (title) T(c, title, {font:F.b,size:17}); return c; }
  function kv(parent, pairs, o={}) { const g=AL(parent,'VERTICAL',{name:'kv',itemSpacing:8}); fillW(g); pairs.forEach(([k,v])=>{ const r=row(g,'kv/'+k,12); fillW(r); T(r,k,{size:14,color:C.sub,w:o.kw||140}); const t=T(r,v,{size:14,w:'fill'}); }); return g; }
  function stateChip(parent, s, tone='teal') { const t={teal:[C.tealBg,C.teal],warn:[C.warnBg,C.warn],gray:['#EEF0F3',C.sub],err:[C.errBg,C.err],blue:[C.blueBg,'#2F6FDE'],green:['#E6F6EC','#1F9D55'],purple:['#F1ECFD','#7C5CDB']}[tone]||[C.tealBg,C.teal]; return pill(parent,s,t[0],t[1],'chip/state'); }
  function modalBody(fr, title, o={}) { const top=AL(fr,'HORIZONTAL',{name:'modal-head',paddingLeft:24,paddingRight:24,paddingTop:20,paddingBottom:12,primaryAxisAlignItems:'SPACE_BETWEEN'}); fillW(top); T(top,title,{font:F.b,size:19}); T(top,'✕',{size:16,color:C.sub});
    const b=AL(fr,'VERTICAL',{name:'modal-body',paddingLeft:24,paddingRight:24,paddingTop:4,paddingBottom:16,itemSpacing:12}); fillW(b); return b; }
  function modalFoot(fr, cancel='취소', ok='확인', okKind='primary') { const f=AL(fr,'HORIZONTAL',{name:'modal-foot',paddingLeft:24,paddingRight:24,paddingTop:12,paddingBottom:20,itemSpacing:8,primaryAxisAlignItems:'MAX'}); fillW(f); const a=btn(f,cancel,'ghost','btn/cancel'); const b=btn(f,ok,okKind,'btn/ok'); return {cancel:a, ok:b}; }
  // ---------- annotations ----------
  function badge(sec, slot, label, tag) { const b=AL(sec,'HORIZONTAL',{name:'badge',itemSpacing:0}); b.x=slot.x; b.y=slot.y-62;
    const l=AL(b,'HORIZONTAL',{name:'badge/id',paddingLeft:14,paddingRight:14,paddingTop:9,paddingBottom:9},C.ink); T(l,label,{font:F.b,size:18,color:C.white});
    const c=AL(b,'HORIZONTAL',{name:'badge/tag',paddingLeft:14,paddingRight:14,paddingTop:9,paddingBottom:9},TAG[tag]||TAG['핵심']); T(c,tag,{font:F.b,size:18,color:C.white}); keep(b); return b; }
  const colBottom = {};
  function colY(slot) { return colBottom[slot.nx] || slot.y; }
  function sticker(sec, slot, title, set, cur, foot) { const s=AL(sec,'VERTICAL',{name:'sticker/states',itemSpacing:5,paddingLeft:18,paddingRight:18,paddingTop:16,paddingBottom:16},C.white); s.x=slot.nx; s.y=colY(slot); stroke(s,'#D5D8DD'); s.cornerRadius=8; s.resize(460,s.height); s.counterAxisSizingMode='FIXED';
    T(s,title,{font:F.b,size:14,color:C.sub,w:'fill'}); for (const [k,v] of set) { const on = Array.isArray(cur)?cur.includes(k):k===cur; T(s,(on?'● ':'○ ')+k+'  '+v,{font:on?F.b:F.r,size:14,color:on?C.ink:C.mute,w:'fill'}); }
    if (foot) T(s,foot,{size:13,w:'fill',lh:150}); colBottom[slot.nx]=s.y+s.height+16; keep(s); return s; }
  function absIn(sec, n) { const b=n.absoluteBoundingBox, sb=sec.absoluteBoundingBox; return {x:b.x-sb.x, y:b.y-sb.y, w:b.width, h:b.height}; }
  function note(sec, slot, target, text, o={}) { const {notif=null, tag=null, perm=null} = o;
    const t = target ? absIn(sec,target) : null; const ty = t ? t.y+t.h/2 : colY(slot)+24;
    const y = Math.max(ty-24, colY(slot));
    const n=AL(sec,'VERTICAL',{name:'note/branch',itemSpacing:6,paddingLeft:14,paddingRight:14,paddingTop:10,paddingBottom:10},'#FFF4B8'); n.x=slot.nx; n.y=y; stroke(n,'#E8D36A'); n.cornerRadius=6; n.resize(480,n.height); n.counterAxisSizingMode='FIXED';
    if (tag || perm) { const r=row(n,'note/chips',6); if (tag) chip(r,tag[1]||tag[0],TAG[tag[0]],{name:'chip/tag'}); if (perm) (Array.isArray(perm)?perm:[perm]).forEach(pm=>chip(r,pm,PERM[pm.replace(/(만| 이상| 불가)$/,'')]||'#4A4F57',{name:'chip/perm'})); }
    T(n,text,{size:14,w:'fill',lh:150});
    if (notif) { const r=row(n,'chip/notif',6); (Array.isArray(notif)?notif:[notif]).forEach(s=>chip(r,'🔔 '+s,'#6D4BD8',{name:'chip/notif'})); }
    colBottom[slot.nx]=y+n.height+12;
    if (t) { const tx=t.x+t.w; const v=figma.createVector(); v.name='note/line'; sec.appendChild(v); v.vectorPaths=[{windingRule:'NONE',data:`M ${slot.nx} ${y+20} L ${tx+5} ${ty}`}]; v.strokes=solid('#C9A800'); v.strokeWeight=2; v.dashPattern=[6,4];
      const d=figma.createEllipse(); d.name='note/dot'; sec.appendChild(d); d.resize(9,9); d.x=tx; d.y=ty-4.5; d.fills=solid('#C9A800'); }
    keep(n); return n; }
  function info(sec, slot, text, kind='info') { // free note without target: E-sticker style or plain
    const col = {info:['#FFFFFF','#D5D8DD'], e:['#FDE2E1','#E5484D'], decide:['#F1ECFD','#7C5CDB'], check:['#F1F3F5','#8A8F98']}[kind];
    const n=AL(sec,'VERTICAL',{name:kind==='e'?'sticker/E':'note/info',paddingLeft:14,paddingRight:14,paddingTop:10,paddingBottom:10},col[0]); n.x=slot.nx; n.y=colY(slot); stroke(n,col[1]); n.cornerRadius=6; n.resize(480,n.height); n.counterAxisSizingMode='FIXED';
    T(n,text,{size:14,w:'fill',lh:150}); colBottom[slot.nx]=n.y+n.height+12; keep(n); return n; }
  function eSticker(sec, slot, num, text, target) { const n=info(sec,slot,num+' · '+text,'e'); if (target) { const t=absIn(sec,target); const v=figma.createVector(); v.name='sticker/E-line'; sec.appendChild(v); v.vectorPaths=[{windingRule:'NONE',data:`M ${slot.nx} ${n.y+18} L ${t.x+t.w} ${t.y+12}`}]; v.strokes=solid('#E5484D'); v.strokeWeight=1.5; v.dashPattern=[3,3]; } return n; }
  function marker(sec, target, kind, label) { const t=absIn(sec,target);
    const r=figma.createRectangle(); r.name='marker/area-'+kind; sec.appendChild(r); r.x=t.x-3; r.y=t.y-3; r.resize(t.w+6,t.h+6); r.fills=[]; r.strokes=solid(SRC[kind]); r.strokeWeight=2; r.dashPattern=[8,5];
    const c=AL(sec,'HORIZONTAL',{name:'marker/source-'+kind,paddingLeft:7,paddingRight:7,paddingTop:2,paddingBottom:2},SRC[kind]); c.cornerRadius=4; T(c,kind+(label?' · '+label:''),{font:F.b,size:12,color:C.white}); c.x=t.x+t.w-c.width; c.y=t.y+4; return r; }
  function watermark(sec, slot) { const fr=slot.fr; const w=T(sec,'예시',{font:F.b,size:Math.min(360, fr.width*0.45),color:'#8A8F98',name:'watermark/example'}); w.opacity=0.10; w.rotation=20; w.x=fr.x+fr.width*0.18; w.y=fr.y+Math.min(fr.height*0.4, 1200); return w; }
  function ref(sec, slot, text) { const t=T(sec,'근거 · '+text,{size:13,color:C.sub,name:'ref/spec',w:slot.W}); t.x=slot.x; t.y=slot.fr.y+slot.fr.height+16; return t; }
  function inlineChip(parent, s, tag) { return chip(parent, s, TAG[tag]||tag, {name:'chip/tag'}); }
  function finish(sec) { fitSection(sec); return ids; }
  return {F,C,TAG,SRC,PERM,hex,solid,T,AL,fillW,stroke,box,row,btn,link,field,check,chip,pill,divider,table,section,fitSection,frame,content,siteHeader,reqBar,progress,panel,h,p,footer,shell,card,kv,stateChip,modalBody,modalFoot,badge,sticker,note,info,eSticker,marker,watermark,ref,inlineChip,finish,ids,keep,page,MENU_HQ,MENU_PTR};
}
// ===== end prelude =====
