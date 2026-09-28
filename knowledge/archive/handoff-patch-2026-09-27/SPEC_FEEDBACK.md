# SPEC_FEEDBACK.md — 피드백(VOC) 시스템 기술 설계서

> 코드·README가 인용하는 `SPEC_FEEDBACK.md §N` / `D1~D7` / `S12` 등은 이 문서의 해당 번호를 가리킨다. 본문은 프로젝트 문서 **'micego-피드백-시스템-설계서-v1 - 클로드'**(2026-09-27 스냅샷)와 동일하며, 두 문서는 함께 갱신한다. 구현 부록은 `SPEC_FEEDBACK_ADDENDUM.md`.

---

# MICEGO 피드백 시스템 기술 설계서 v1 - 클로드

v1.0 · 2026-09-27 · 확정 결정: 답변은 메일함에서 직접 회신(콘솔은 상태·메모만), 스크린샷 미지원, contact.html 통합

> 범위: 피드백 위젯(`feedback.js`), 접수 Edge Function(`feedback-submit`), DB(`feedback`과 부속 테이블), 운영 콘솔(`admin/feedback*.html`), 문의 폼(`contact.html`) 통합
> 기준 문서: 기획안(유형·필드·SOP), 회원제 설계서 v1(operator 판정 = `app_metadata.role`), 사이트맵 오픈 전 점검 v1(카카오 인앱, DEMO 띠, mock-data 콘솔)
> 표기: `MUST`는 구현에서 빠지면 안 되는 규칙, `TODO(x)`는 외부 확인이 필요한 항목입니다.

---

## 0. 설계하면서 새로 정한 것 (확정 결정 보완)

확정 결정과 충돌하지 않는 범위에서, 아래 항목은 이 설계서에서 새로 정했습니다. 근거는 7장 자체 검증에 있습니다.

| # | 결정 | 이유 |
|---|---|---|
| D1 | 위젯은 **CORS 단순 요청**(`POST`, `Content-Type: text/plain;charset=UTF-8`, 커스텀 헤더 없음)으로 호출합니다. preflight가 생기지 않습니다. | 카카오 인앱과 구형 WebView에서 OPTIONS 실패로 제출이 유실되는 경로를 없앱니다. |
| D2 | 그래서 `feedback-submit`은 `verify_jwt = false`로 배포하고, 인증은 함수 안에서 직접 처리합니다. 설정의 `anonKey`는 **MVP에서 사용하지 않습니다**. 계약상 필드는 유지하되 전송하지 않습니다. | `apikey`나 `Authorization` 헤더를 붙이면 preflight가 생깁니다. Edge Function이 유일한 진입점이므로 위젯은 REST나 RPC를 호출하지 않습니다. |
| D3 | 클라이언트는 `member_id`를 **보내지 않습니다**. 로그인 세션의 access token을 본문 `auth.access_token`에 담아 보내면 서버가 검증해서 `member_id`와 operator 여부를 정합니다. | member_id 위조를 막습니다. |
| D4 | `is_demo`는 **서버가 Origin으로 정합니다**. 스테이징 Origin이면 항상 true, 운영 Origin이면 클라이언트 힌트를 무시하고 false입니다. | 운영 URL에 `?state=`가 붙은 실제 제보가 알림 없이 묻히는 것을 막습니다. |
| D5 | 페이지 상태 훅은 **`window.MICEGO_PAGE_STATE` 객체**로 하고, 위젯은 이 값을 열 때와 제출할 때 늦게 읽습니다. | 4.3절에 이유가 있습니다. |
| D6 | 회신 이메일을 입력하면 **수집·이용 동의 체크박스**가 나타나고 필수가 됩니다. 이메일을 비워 두면 체크박스도 없습니다. `TODO(legal)` 문구 확정이 필요합니다. | 개인정보보호법상 수집 고지와 동의가 필요합니다. |
| D7 | 접수 확인 메일에는 **유저가 쓴 본문을 넣지 않습니다**. | 남의 이메일을 회신 주소로 넣어 스팸을 중계하는 경로를 막습니다. |
| D8 | 상태(`status`) 변경은 **RPC `feedback_set_status`로만** 합니다. 분류 필드(P·하위 코드·담당)는 RLS와 컬럼 권한 아래에서 직접 UPDATE할 수 있습니다. | 전이 가드와 메모 필수 조건을 한곳에서 집행하기 위해서입니다. |
| D9 | 레이트리밋 저장소는 **Postgres 이벤트 테이블 + advisory lock**(슬라이딩 윈도)입니다. | 3.4절에 이유가 있습니다. |
| D10 | 위젯 UI는 **Shadow DOM(open)**에 렌더링하고, 스타일은 shadow root 안에 주입합니다. | 기존 페이지 CSS와 양방향으로 격리되고, 기존 Playwright 검사(h1 1개 등)에도 걸리지 않습니다. |

---

## 1. 아키텍처

### 1.1 다이어그램

```
┌──────────────────── 브라우저 (정적 사이트: /, /ko/, /en/, /admin/) ─────────────────────┐
│                                                                                  │
│  페이지 스크립트 (track.js / bid.js 등)                                            │
│    └─ window.MICEGO_PAGE_STATE = {page, state, rfpRef, tokenKind, prefillEmail}   │
│                                                                                  │
│  /assets/site-config.js  → window.MICEGO_FEEDBACK = {supabaseUrl, anonKey, ...}  │
│  /assets/feedback.js (defer)                                                     │
│    ├─ 오류 수집(링버퍼 3) · 컨텍스트 수집 · 토큰 SHA-256 앞 8자                       │
│    ├─ Shadow DOM 런처 + 바텀시트/카드 (closed→open→submitting→done|error)          │
│    └─ fetch POST text/plain, keepalive, 15초 타임아웃, 멱등 키                      │
│                                                                                  │
│  /ko|en/contact.html 폼 ── window.MICEGO_FB.submit({source:'contact', ...}) ──┐    │
└───────────────────────────────────────────────────────────────┼──────┼───────────┘
                               단순 CORS 요청(프리플라이트 없음)  │      │
                                                                ▼      ▼
┌──────────────── Supabase Edge Function: feedback-submit (유일한 쓰기 진입점) ─────────┐
│  1 Origin 허용 목록   2 크기 ≤16KB   3 JSON 파싱                                     │
│  4 IP 추출 → HMAC(pepper) → rpc feedback_rate_hit (advisory lock, 슬라이딩 윈도)     │
│  5 허니팟 → 가짜 성공   6 스키마 검증   7 멱등(client_submission_id)                  │
│  8 본문 해시 중복   9 JWT 검증 → member_id / operator   10 서버 판정 필드             │
│  11 INSERT(service_role)   12 201 응답                                             │
│  13 EdgeRuntime.waitUntil → Resend: 운영 알림 메일 · 접수 확인 메일 → 메일 상태 기록     │
└──────────────┬──────────────────────────────────────────────┬───────────────────────┘
               │ service_role (RLS 우회)                        │ HTTPS
               ▼                                               ▼
┌──────────── Postgres ─────────────────────┐        ┌──────── Resend API ────────┐
│ public.feedback      (RLS: operator만)     │        │ ① 운영 알림 → FEEDBACK_INBOX │
│ public.feedback_note (append-only)         │        │    Reply-To = 접수자 이메일   │
│ public.feedback_event (감사 로그)           │        │ ② 접수 확인 → 접수자          │
│ private.feedback_rate_event (48시간 보관)   │        │    Reply-To = FEEDBACK_INBOX │
│ RPC: feedback_set_status, feedback_resolve_rfp, feedback_claim_mail ...           │
│ pg_cron: 메일 재시도(10분) · 레이트 정리(시간) · DEMO 삭제(일) · 12개월 익명화(월)      │
└──────┬────────────────────────────┬───────┘        └────────────────────────────┘
       │ pg_net (x-internal-secret) │                         ▲
       ▼                            │                         │
┌─ Edge Function: feedback-mail-retry ─┐                      │
│  cron 또는 operator JWT(수동 재발송)    │──────────────────────┘
└──────────────────────────────────────┘
       ▲
       │ PostgREST (operator JWT, RLS) — SELECT / 분류 UPDATE / RPC
┌─ admin/feedback.html · admin/feedback-detail.html ─┐   운영자 회신은
│  MVP: mock-data.js, // SUPABASE: 주석으로 연결 지점 표시 │   메일함에서 직접 (REF 스레드)
└───────────────────────────────────────────────────┘
```

### 1.2 RPC 대신 Edge Function을 단일 진입점으로 두는 이유

| 관점 | anon이 호출하는 SECURITY DEFINER RPC | Edge Function 단일 진입점 (채택) |
|---|---|---|
| IP 해시 | `current_setting('request.headers')`로 `x-forwarded-for`를 읽을 수는 있습니다. 다만 pepper 비밀값이 DB(Vault)에 있어야 하고, SQL에서 HMAC을 계산해야 합니다. | pepper는 함수 환경변수에만 둡니다. 헤더 우선순위(3.5절)를 코드로 명확히 관리합니다. |
| 레이트리밋 위치 | 요청 본문이 이미 PostgREST를 통과해 DB 트랜잭션이 열린 뒤에야 판단할 수 있습니다. | Origin·크기·파싱 단계에서 먼저 거르고, DB에는 가벼운 RPC 한 번만 보냅니다. 16KB가 넘는 본문은 DB에 닿지 않습니다. |
| 메일 발송 원자성 | 트랜잭션 안에서 외부 HTTP 결과를 받을 수 없습니다. `pg_net`은 비동기로 보내고 결과를 잊는 방식이라 발송 성공 여부가 행에 남지 않습니다. `RESEND_API_KEY`도 DB에 둬야 합니다. | 순서를 **INSERT 커밋 → 발송 → 상태 기록**으로 강제합니다. "메일은 나갔는데 행이 없는" 상태는 구조적으로 생기지 않습니다. "행은 있는데 메일이 안 나간" 상태는 `pending/failed`로 남고, 재시도 함수와 Resend Idempotency-Key로 결국 한 번 발송됩니다(at-least-once + 멱등). |
| 공격 표면 | anon에게 EXECUTE 권한이 생깁니다. Supabase 기본 권한 때문에 다른 함수까지 노출되는 실수가 흔합니다. | anon은 `feedback` 관련 객체에 **권한이 전혀 없습니다**. 감사할 쓰기 경로가 하나뿐입니다. |
| 회원 판정 | `auth.uid()`를 쓸 수 있지만, 그러려면 `Authorization` 헤더가 필요해 preflight가 생깁니다. | 본문의 access token을 `auth.getUser()`로 검증합니다(D1과 양립). |
| 단점 | — | 콜드 스타트 수백 ms, 함수 호출 쿼터가 있습니다. 피드백 트래픽 규모에서는 문제가 되지 않습니다. |

---

## 2. DB 스키마

마이그레이션 파일: `supabase/migrations/20261001000000_feedback.sql` (스키마·함수·RLS), `20261001000100_feedback_cron.sql` (스케줄)

### 2.1 확장·스키마·enum

```sql
create extension if not exists pgcrypto;      -- gen_random_bytes, digest
create extension if not exists pg_cron;
create extension if not exists pg_net;
create schema if not exists private;          -- PostgREST 비노출 스키마
revoke all on schema private from public, anon, authenticated;

create type public.feedback_category   as enum ('SYS','OPS','ETC');
create type public.feedback_status     as enum ('new','triaged','in_progress','done','on_hold');
create type public.feedback_user_type  as enum ('travel_agency','organizer_guest','hotel','admin','visitor');
create type public.feedback_resolution as enum ('fixed','answered','wontfix','duplicate','spam','no_action');
create type public.feedback_mail_status as enum ('pending','sent','failed','skipped');
create type public.feedback_source     as enum ('widget','contact');
```

하위 코드는 enum이 아니라 `text` + CHECK로 둡니다. 대분류에 따라 허용값이 달라지기 때문입니다.

### 2.2 `public.feedback`

```sql
create table public.feedback (
  id                    uuid primary key default gen_random_uuid(),
  ref                   text not null unique
                          check (ref ~ '^FB-[0-9]{6}-[A-HJ-NP-Z2-9]{4}$'),
  client_submission_id  uuid not null unique,                 -- 멱등 키(위젯이 생성)
  source                public.feedback_source not null default 'widget',

  -- 분류·처리 (운영자)
  category              public.feedback_category not null,     -- 유저가 고름. 운영자가 재분류 가능
  subcode               text null,
  priority              smallint null check (priority between 1 and 4),
  status                public.feedback_status not null default 'new',
  resolution            public.feedback_resolution null,
  assignee              uuid null references auth.users(id) on delete set null,
  triaged_at            timestamptz null,
  started_at            timestamptz null,
  done_at               timestamptz null,

  -- 본문 (유저)
  content               text not null check (char_length(content) between 20 and 2000),
  body_hash             text not null check (body_hash ~ '^[0-9a-f]{64}$'),
  reply_email           text null check (
                          reply_email is null or (
                            char_length(reply_email) <= 254
                            and reply_email = lower(reply_email)
                            and reply_email ~ '^[^\s@,;<>"]{1,64}@[^\s@,;<>"]+\.[^\s@,;<>"]{2,}$')),
  reply_consent_at      timestamptz null,                       -- 이메일 수집 동의 시각(서버 시각)
  contact_name          text null check (char_length(contact_name) <= 60),

  -- 신원 (서버 판정만)
  user_type             public.feedback_user_type not null,
  member_id             uuid null references auth.users(id) on delete set null,

  -- 자동 컨텍스트
  page_path             text not null check (page_path ~ '^/' and char_length(page_path) <= 200),
  mode                  text not null check (mode in ('agency','hotel','admin','root')),
  lang                  text not null check (lang in ('ko','en')),
  ui_state              text null check (ui_state ~ '^(preview:)?[a-z0-9_]{1,32}$'),
  rfp_ref               text null check (rfp_ref ~ '^MG-[0-9]{4}-[0-9]{3,4}$'),
  token_kind            text null check (token_kind in ('track','share','bid')),
  token_hash8           text null check (token_hash8 ~ '^[0-9a-f]{8}$'),
  viewport              text null check (viewport ~ '^[0-9]{2,5}x[0-9]{2,5}@[0-9.]{1,4}$'),
  ua                    text null check (char_length(ua) <= 120),
  referrer              text null check (char_length(referrer) <= 200),
  last_js_errors        jsonb null check (
                          last_js_errors is null or (jsonb_typeof(last_js_errors) = 'array'
                          and jsonb_array_length(last_js_errors) <= 3)),
  tz                    text null check (char_length(tz) <= 64),
  build_version         text null check (char_length(build_version) <= 40),
  submitted_at          timestamptz null,                       -- 클라이언트 시계(참고용)
  dwell_ms              integer null check (dwell_ms >= 0),

  -- 플래그
  is_demo               boolean not null default false,
  is_suspect            boolean not null default false,
  suspect_reasons       text[] not null default '{}',           -- 'urls','fast','dup_cross','cap'

  -- 메일 상태
  ops_mail_status       public.feedback_mail_status not null default 'pending',
  ops_mail_attempts     smallint not null default 0,
  ops_mail_error        text null,
  ops_mail_sent_at      timestamptz null,
  ack_mail_status       public.feedback_mail_status not null default 'skipped',
  ack_mail_attempts     smallint not null default 0,
  ack_mail_error        text null,
  ack_mail_sent_at      timestamptz null,
  mail_lease_until      timestamptz null,                       -- 동시 발송 방지 임대

  created_at            timestamptz not null default now(),     -- 접수 시각의 기준
  updated_at            timestamptz not null default now(),
  anonymized_at         timestamptz null,

  constraint fb_subcode_by_category check (
    subcode is null
    or (category = 'SYS' and subcode in ('BUG','IDEA','TEXT'))
    or (category = 'OPS' and subcode in ('RFP','BID','ACCT','PARTNER','POLICY'))),
  constraint fb_done_needs_resolution check (status <> 'done' or resolution is not null),
  constraint fb_contact_needs_email   check (source <> 'contact' or reply_email is not null or anonymized_at is not null),
  constraint fb_email_needs_consent   check (reply_email is null or reply_consent_at is not null),
  constraint fb_token_pair            check ((token_kind is null) = (token_hash8 is null))
);
```

`last_js_errors`의 원소 형식은 `{"t":"ISO시각","m":"메시지(≤500)","s":"/assets/x.js","l":"12:34"}`입니다.

### 2.3 부속 테이블

```sql
-- 운영 메모 (추가만, 수정·삭제 없음)
create table public.feedback_note (
  id          bigint generated always as identity primary key,
  feedback_id uuid not null references public.feedback(id) on delete cascade,
  author      uuid not null default auth.uid() references auth.users(id),
  body        text not null check (char_length(body) between 1 and 2000),
  created_at  timestamptz not null default now()
);

-- 감사 로그 (트리거와 RPC가 기록)
create table public.feedback_event (
  id          bigint generated always as identity primary key,
  feedback_id uuid not null references public.feedback(id) on delete cascade,
  actor       uuid null,                          -- null = 시스템(서비스 롤, 크론)
  kind        text not null check (kind in ('status','triage','note','mail','anonymize')),
  field       text null,                          -- 'priority','subcode','category','assignee' ...
  from_value  text null,
  to_value    text null,
  created_at  timestamptz not null default now()
);

-- 레이트리밋 이벤트 (비노출 스키마, 48시간 보관)
create table private.feedback_rate_event (
  id          bigint generated always as identity primary key,
  ip_hash     text not null check (ip_hash ~ '^[0-9a-f]{32}$|^noip$'),
  created_at  timestamptz not null default now()
);
```

### 2.4 인덱스

```sql
create index fb_inbox_idx      on public.feedback (status, priority, created_at desc) where is_demo = false;
create index fb_created_idx    on public.feedback (created_at desc);
create index fb_rfp_idx        on public.feedback (rfp_ref) where rfp_ref is not null;
create index fb_tokenhash_idx  on public.feedback (token_hash8) where token_hash8 is not null;
create index fb_bodyhash_idx   on public.feedback (body_hash, created_at desc);
create index fb_reply_idx      on public.feedback (reply_email, created_at desc) where reply_email is not null;
create index fb_assignee_idx   on public.feedback (assignee) where status in ('triaged','in_progress','on_hold');
create index fb_mail_due_idx   on public.feedback (created_at)
  where ops_mail_status in ('pending','failed') or ack_mail_status in ('pending','failed');
create index fb_note_fk_idx    on public.feedback_note (feedback_id, created_at);
create index fb_event_fk_idx   on public.feedback_event (feedback_id, created_at);
create index fb_rate_idx       on private.feedback_rate_event (ip_hash, created_at desc);
```

본문 검색은 MVP에서 `ilike`로 처리합니다. 1만 건을 넘으면 `pg_trgm` GIN 인덱스를 추가합니다.

### 2.5 REF 생성

```sql
create or replace function public.feedback_gen_ref() returns text
language plpgsql volatile set search_path = public, pg_temp as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- 32자: 0 O 1 I 제외
  b bytea := gen_random_bytes(4);
  s text := '';
begin
  for i in 0..3 loop
    s := s || substr(alphabet, (get_byte(b, i) & 31) + 1, 1);    -- 32 = 2^5, 편향 없음
  end loop;
  return 'FB-' || to_char(now() at time zone 'Asia/Seoul', 'YYMMDD') || '-' || s;
end $$;

create or replace function public.feedback_before_insert() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if new.ref is null then
    for i in 1..8 loop
      new.ref := public.feedback_gen_ref();
      exit when not exists (select 1 from public.feedback where ref = new.ref);
    end loop;
  end if;
  new.status := 'new';                        -- 삽입 시 다른 상태 금지
  return new;
end $$;
create trigger fb_bi before insert on public.feedback
  for each row execute function public.feedback_before_insert();
```

- 날짜는 **KST 기준**입니다. 하루 32^4 = 1,048,576개 조합이 나오므로 충돌은 사실상 없고, 동시성 경합은 `unique` 제약이 잡습니다. Edge Function은 `23505`(ref) 오류가 나면 INSERT를 **한 번 재시도**합니다.

### 2.6 `updated_at`·전이 가드·감사 트리거

```sql
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger fb_bu_ts before update on public.feedback
  for each row execute function public.set_updated_at();

-- 허용 전이 그래프 (RPC와 트리거가 함께 씀)
create or replace function public.feedback_transition_ok(f public.feedback_status, t public.feedback_status)
returns boolean language sql immutable as $$
  select (f, t) in (
    ('new','triaged'), ('new','done'),
    ('triaged','in_progress'), ('triaged','on_hold'), ('triaged','done'),
    ('in_progress','done'), ('in_progress','on_hold'),
    ('on_hold','in_progress'), ('on_hold','done'),
    ('done','in_progress')                         -- 재오픈
  )
$$;

create or replace function public.feedback_before_update() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  -- 본문·컨텍스트는 익명화 함수 말고는 바꿀 수 없음 (컬럼 권한과 이중 방어)
  if current_setting('mgfb.anonymizing', true) is distinct from 'on' and (
     new.content is distinct from old.content or new.reply_email is distinct from old.reply_email
     or new.page_path is distinct from old.page_path or new.member_id is distinct from old.member_id
     or new.ref is distinct from old.ref or new.created_at is distinct from old.created_at) then
    raise exception 'immutable column' using errcode = '42501';
  end if;
  if new.status is distinct from old.status then
    if not public.feedback_transition_ok(old.status, new.status) then
      raise exception 'invalid transition % -> %', old.status, new.status using errcode = 'P0001';
    end if;
    if new.status = 'triaged' and old.status = 'new' then new.triaged_at := now(); end if;
    if new.status = 'in_progress' and new.started_at is null then new.started_at := now(); end if;
    if new.status = 'done' then new.done_at := now(); end if;
    if old.status = 'done' then new.done_at := null; new.resolution := null; end if;
  end if;
  return new;
end $$;
create trigger fb_bu_guard before update on public.feedback
  for each row execute function public.feedback_before_update();

-- AFTER UPDATE: category/subcode/priority/assignee/status 변경을 feedback_event에 기록
-- actor = auth.uid() (서비스 롤이면 null)
create trigger fb_au_audit after update on public.feedback
  for each row execute function public.feedback_audit();   -- 본문은 필드별 비교 후 insert
```

### 2.7 상태 변경 RPC

```sql
create or replace function public.feedback_set_status(
  p_id uuid, p_to public.feedback_status,
  p_resolution public.feedback_resolution default null,
  p_note text default null
) returns public.feedback
language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.feedback;
begin
  if not public.is_operator() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into r from public.feedback where id = p_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if not public.feedback_transition_ok(r.status, p_to) then
    raise exception 'INVALID_TRANSITION' using errcode = 'P0001'; end if;

  -- 가드 (오류 메시지 = 콘솔 i18n 키)
  if p_to = 'triaged' and (r.priority is null or (r.category <> 'ETC' and r.subcode is null)) then
    raise exception 'GUARD_TRIAGE_FIELDS' using errcode = 'P0001'; end if;
  if p_to = 'in_progress' and r.assignee is null then
    raise exception 'GUARD_ASSIGNEE' using errcode = 'P0001'; end if;
  if p_to = 'on_hold' and coalesce(btrim(p_note), '') = '' then
    raise exception 'GUARD_HOLD_NOTE' using errcode = 'P0001'; end if;
  if p_to = 'done' and p_resolution is null then
    raise exception 'GUARD_RESOLUTION' using errcode = 'P0001'; end if;
  if p_to = 'done' and r.status = 'new' and p_resolution not in ('spam','duplicate','no_action') then
    raise exception 'GUARD_NEW_TO_DONE' using errcode = 'P0001'; end if;
  if r.status = 'done' and coalesce(btrim(p_note), '') = '' then
    raise exception 'GUARD_REOPEN_NOTE' using errcode = 'P0001'; end if;

  update public.feedback
     set status = p_to,
         resolution = case when p_to = 'done' then p_resolution else resolution end
   where id = p_id returning * into r;
  if coalesce(btrim(p_note), '') <> '' then
    insert into public.feedback_note (feedback_id, body) values (p_id, btrim(p_note));
  end if;
  return r;
end $$;
```

`is_operator()`:

```sql
create or replace function public.is_operator() returns boolean
language sql stable set search_path = public, pg_temp as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'operator', false)
$$;
```

`app_metadata`는 서비스 롤만 수정할 수 있어 유저가 위조할 수 없습니다. 다만 역할을 회수해도 JWT가 갱신될 때까지(최대 1시간) 권한이 유지됩니다(6장 체크리스트 참조).

### 2.8 RLS와 권한 (anon 완전 차단)

```sql
alter table public.feedback        enable row level security;
alter table public.feedback_note   enable row level security;
alter table public.feedback_event  enable row level security;
alter table private.feedback_rate_event enable row level security;   -- 정책 없음 = 서비스 롤만

-- Supabase 기본 권한 제거 (MUST: 새 테이블은 anon/authenticated에 자동 GRANT됨)
revoke all on public.feedback, public.feedback_note, public.feedback_event from public, anon, authenticated;

grant select on public.feedback to authenticated;
grant update (category, subcode, priority, assignee) on public.feedback to authenticated;  -- status 제외
grant select, insert on public.feedback_note to authenticated;
grant select on public.feedback_event to authenticated;

create policy fb_sel on public.feedback for select to authenticated using (public.is_operator());
create policy fb_upd on public.feedback for update to authenticated
  using (public.is_operator()) with check (public.is_operator());
create policy fbn_sel on public.feedback_note for select to authenticated using (public.is_operator());
create policy fbn_ins on public.feedback_note for insert to authenticated
  with check (public.is_operator() and author = auth.uid());
create policy fbe_sel on public.feedback_event for select to authenticated using (public.is_operator());

-- 함수 실행 권한 (MUST: 기본 EXECUTE 권한 회수)
revoke execute on all functions in schema public from public, anon;   -- 이 마이그레이션의 함수에 한정해 개별 revoke로 작성
grant execute on function public.feedback_set_status(uuid, public.feedback_status, public.feedback_resolution, text) to authenticated;
grant execute on function public.feedback_resolve_rfp(uuid) to authenticated;
grant execute on function public.is_operator() to authenticated;
-- feedback_rate_hit, feedback_claim_mail, feedback_anonymize, feedback_purge_* : service_role만
```

- 회원(authenticated지만 operator가 아닌 사용자)은 RLS 때문에 0행만 보이고 UPDATE도 0행에 적용됩니다.
- INSERT 권한은 누구에게도 주지 않습니다. 서비스 롤(Edge Function)만 넣을 수 있습니다.

### 2.9 레이트리밋 RPC

```sql
create or replace function public.feedback_rate_hit(
  p_ip_hash text, p_max_10m int default 5, p_max_day int default 30, p_global_day int default 500
) returns jsonb
language plpgsql security definer set search_path = private, public, pg_temp as $$
declare c10 int; c24 int; oldest10 timestamptz; oldest24 timestamptz; g int;
begin
  perform pg_advisory_xact_lock(hashtextextended('mgfb:' || p_ip_hash, 0));   -- 같은 IP 직렬화
  select count(*) filter (where created_at > now() - interval '10 minutes'),
         count(*),
         min(created_at) filter (where created_at > now() - interval '10 minutes'),
         min(created_at)
    into c10, c24, oldest10, oldest24
    from private.feedback_rate_event
   where ip_hash = p_ip_hash and created_at > now() - interval '24 hours';

  if c10 >= p_max_10m then
    return jsonb_build_object('allowed', false, 'reason', 'ip_10m',
      'retry_after_sec', greatest(1, ceil(600 - extract(epoch from now() - oldest10))));
  end if;
  if c24 >= p_max_day then
    return jsonb_build_object('allowed', false, 'reason', 'ip_day',
      'retry_after_sec', greatest(1, ceil(86400 - extract(epoch from now() - oldest24))));
  end if;
  select count(*) into g from public.feedback
   where created_at > now() - interval '24 hours' and is_demo = false;
  if g >= p_global_day then
    return jsonb_build_object('allowed', false, 'reason', 'global', 'retry_after_sec', 3600);
  end if;

  insert into private.feedback_rate_event (ip_hash) values (p_ip_hash);   -- 허용된 시도만 기록
  return jsonb_build_object('allowed', true);
end $$;
```

거부된 시도는 기록하지 않습니다. 그래야 `retry_after_sec`이 정확하고, 한도에 걸린 사람이 재시도할 때마다 창이 계속 늘어나지 않습니다.

### 2.10 메일 임대(claim) RPC

```sql
-- 재시도 함수가 호출. 임대가 끝난 행만 가져가서 시도 횟수를 올리고 2분짜리 임대를 설정
create or replace function public.feedback_claim_mail(p_limit int default 20)
returns setof public.feedback
language sql security definer set search_path = public, pg_temp as $$
  update public.feedback f
     set mail_lease_until = now() + interval '2 minutes'
   where f.id in (
     select id from public.feedback
      where created_at > now() - interval '2 days'
        and (mail_lease_until is null or mail_lease_until < now())
        and ((ops_mail_status in ('pending','failed') and ops_mail_attempts < 5)
          or (ack_mail_status in ('pending','failed') and ack_mail_attempts < 5))
      order by created_at
      limit p_limit
      for update skip locked)
  returning f.*;
$$;
```

`feedback-submit`은 INSERT할 때 `mail_lease_until = now() + 2 minutes`를 함께 넣습니다. 그래서 `waitUntil`로 발송하는 동안 재시도 함수가 같은 행을 가져가지 않습니다.

### 2.11 RFP 연결 조회 RPC

```sql
create or replace function public.feedback_resolve_rfp(p_feedback_id uuid)
returns table (rfp_id uuid, rfp_ref text, match text, token_kind text, hotel_name text)
language plpgsql security definer stable set search_path = public, pg_temp as $$ ... $$;
```

동작 규칙(의사코드):

```
if not is_operator() → forbidden
f := feedback 행
candidates := []
if f.token_hash8 is not null:
   kind = f.token_kind
   track → select rfp_id from rfp_access_token  where left(token_sha256,8) = f.token_hash8
   share → select rfp_id from rfp_share_link    where left(token_sha256,8) = f.token_hash8
   bid   → select rfp_id, hotel_id from bid_invitation where left(token_sha256,8) = f.token_hash8
   (만료·폐기된 토큰도 포함합니다. 제보가 만료 시점 전후일 수 있기 때문입니다.)
if f.rfp_ref is not null: refRow := select id from rfp where ref = f.rfp_ref

match 판정:
  refRow and refRow.id ∈ candidates  → 'verified'     (녹색: 요청번호와 토큰 일치)
  refRow and candidates empty        → 'ref_only'     (회색: 클라이언트 값만 있음)
  refRow and candidates ≠ ∅ and refRow ∉ candidates → 'mismatch' (적색: 둘 다 표시)
  not refRow and candidates ≠ ∅      → 'token_only'   (후보가 2건 이상이면 모두 반환)
  none                               → 결과 0행
```

**전제 조건(MUST, 상태전이 시스템과 합의 필요):** 토큰 테이블(`rfp_access_token`, `rfp_share_link`, `bid_invitation` — 실제 테이블명으로 바꿔서 구현)에 `token_sha256 text`(원문 토큰의 UTF-8 SHA-256 소문자 hex, salt와 pepper 없음) 컬럼이 있어야 하고, `create index ... (left(token_sha256, 8))` 인덱스가 필요합니다. 토큰을 HMAC이나 pepper로 해시해 저장하고 있다면 클라이언트가 같은 값을 계산할 수 없으므로 7장 F-6의 대안을 적용합니다.

### 2.12 보관·익명화 (함수 서명)

```sql
-- 12개월이 지난 행: reply_email, contact_name, member_id, token_hash8, ua, viewport, referrer,
-- last_js_errors, tz, reply_consent_at → null
-- content와 note.body는 이메일·전화·토큰 URL을 마스킹. anonymized_at = now(), feedback_event(kind='anonymize')
-- 분류·상태·page_path·ui_state·rfp_ref·created_at은 통계용으로 유지
public.feedback_anonymize(p_before timestamptz default now() - interval '12 months') returns integer

public.feedback_purge_demo(p_before timestamptz default now() - interval '30 days') returns integer  -- is_demo 행 삭제
public.feedback_rate_purge(p_before timestamptz default now() - interval '48 hours') returns integer -- 레이트 이벤트 삭제
```

크론(`20261001000100_feedback_cron.sql`, 시각은 UTC 기준):

| 작업 | 주기 | 내용 |
|---|---|---|
| `mgfb-mail-retry` | `*/10 * * * *` | `pg_net.http_post`로 `feedback-mail-retry` 호출. 헤더 `x-internal-secret`의 값은 Vault의 `FEEDBACK_CRON_SECRET` |
| `mgfb-rate-purge` | `7 * * * *` | `feedback_rate_purge()` |
| `mgfb-demo-purge` | `20 18 * * *` (KST 03:20) | `feedback_purge_demo()` |
| `mgfb-anonymize` | `10 18 1 * *` (매월 2일 KST 03:10) | `feedback_anonymize()` |

---

## 3. Edge Function `feedback-submit` 명세

### 3.1 배포·환경변수

`supabase/config.toml`:

```toml
[functions.feedback-submit]
verify_jwt = false
[functions.feedback-mail-retry]
verify_jwt = false      # 함수 안에서 cron 비밀값 또는 operator JWT를 검증
```

| 변수 | 예시 | 용도 |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` | 자동 주입 | DB 접근, `auth.getUser` |
| `RESEND_API_KEY` | — | 메일 발송 |
| `FEEDBACK_INBOX` | `feedback@micego.kr` | 운영 알림 수신 주소, 확인 메일의 Reply-To |
| `FEEDBACK_FROM` | `MICEGO <noreply@notify.micego.kr>` | 발신자(Resend 인증 도메인) |
| `FEEDBACK_ALLOWED_ORIGINS` | `https://micego.kr,https://www.micego.kr` | 운영 Origin |
| `FEEDBACK_STAGING_ORIGINS` | `https://staging.micego.kr` | 스테이징 Origin(is_demo 강제) |
| `FEEDBACK_IP_PEPPER` | 32바이트 이상 랜덤 | IP HMAC 키 |
| `FEEDBACK_CONSOLE_BASE_URL` | `https://micego.kr/admin` | 메일 속 콘솔 링크 |
| `FEEDBACK_CRON_SECRET` | 32바이트 이상 랜덤 | 재시도 함수 인증 |
| `FEEDBACK_DAILY_CAP` | `500` | 전체 일일 접수 상한 |
| `FEEDBACK_OPS_MAIL_DAILY_CAP` | `150` | 운영 알림 일일 상한 |
| `FEEDBACK_ACK_PER_EMAIL_DAY` | `3` | 같은 수신자에게 보내는 확인 메일 일일 상한 |

### 3.2 요청 스키마

`POST {supabaseUrl}/functions/v1/feedback-submit`
헤더: `Content-Type: text/plain;charset=UTF-8`(위젯). `application/json`도 받습니다. 본문은 JSON 문자열이며 최대 16,384바이트입니다.

```jsonc
{
  "v": 1,                                   // 필수, 정수 1
  "client_submission_id": "uuid-v4",        // 필수
  "source": "widget" | "contact",           // 필수
  "category": "SYS" | "OPS" | "ETC",        // 필수 (contact면 서버가 OPS로 강제)
  "content": "string",                      // 필수, 정규화 후 20~2000자(코드포인트 기준)
  "reply_email": "string" | null,           // 선택 (contact면 필수)
  "reply_consent": true | false,            // reply_email이 있으면 true 필수
  "contact_name": "string" | null,          // contact 전용, ≤60
  "hp": "",                                 // 허니팟. 빈 문자열이어야 함
  "dwell_ms": 12345,                        // 시트를 연 뒤 제출까지 걸린 시간(ms), 정수 ≥0
  "auth": { "access_token": "jwt" } | null, // 로그인 세션이 있을 때만
  "ctx": {
    "page_path": "/ko/track.html",          // 필수, '/'로 시작, 쿼리·해시 없음
    "mode": "agency|hotel|admin|root",      // 필수
    "lang": "ko|en",                        // 필수
    "ui_state": "delivered" | "preview:bidding" | null,
    "rfp_ref": "MG-2610-014" | null,
    "token_kind": "track|share|bid" | null,
    "token_hash8": "9f86d081" | null,
    "viewport": "390x844@3" | null,
    "ua": "iOS 17.5 · Safari · KakaoTalk" | null,
    "referrer": "/ko/index.html" | "naver.com" | null,
    "last_js_errors": [ { "t": "...", "m": "...", "s": "/assets/track.js", "l": "88:12" } ],
    "tz": "Asia/Seoul" | null,
    "build_version": "2026.10.01-3" | null,
    "submitted_at": "2026-10-08T10:30:00.000Z",
    "is_demo_hint": false,
    "user_type_hint": "organizer_guest"
  }
}
```

알 수 없는 최상위 키나 `ctx` 키는 **무시**합니다(전방 호환). 거부하지 않습니다.

### 3.3 검증·처리 순서 (의사코드)

```ts
serve(async (req) => {
  const origin = req.headers.get('origin')
  const cors = corsHeaders(origin)                     // 허용 Origin이면 echo, 아니면 헤더 없음

  // 1. 메서드
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return err(405, 'METHOD_NOT_ALLOWED', cors)

  // 2. Origin 허용 목록 (보안 경계는 아니고, 남용 신호를 1차로 거르는 용도)
  const env = originEnv(origin)                        // 'prod' | 'staging' | null
  if (!env) return err(403, 'ORIGIN_DENIED', cors)

  // 3. 크기: Content-Length 선검사 + 스트림 읽기 상한 16KB
  const raw = await readCapped(req, 16384)             // 초과하면 throw TooLarge
  if (raw === TOO_LARGE) return err(413, 'TOO_LARGE', cors)

  // 4. JSON
  let body; try { body = JSON.parse(raw) } catch { return err(400, 'BAD_JSON', cors) }
  if (typeof body !== 'object' || body?.v !== 1) return err(400, 'BAD_VERSION', cors)

  // 5. 레이트리밋 (JSON이 유효한 모든 시도가 대상)
  const ipHash = await hashIp(clientIp(req))           // 3.5절
  const rl = await db.rpc('feedback_rate_hit', { p_ip_hash: ipHash, p_global_day: DAILY_CAP })
  if (!rl.allowed) return rl.reason === 'global'
     ? err(503, 'BUSY', cors, { retry_after_sec: rl.retry_after_sec })
     : err(429, 'RATE_LIMITED', cors, { retry_after_sec: rl.retry_after_sec })

  // 6. 허니팟 → 저장하지 않고 가짜 성공 응답 (봇이 눈치채지 못하게)
  if (typeof body.hp !== 'string' || body.hp !== '')
    return json(201, { ok: true, ref: fakeRef(), duplicate: false, ack: 'none' }, cors)

  // 7. 스키마 검증 → 필드별 오류 코드 모음
  const v = validate(body)                             // 3.6절 규칙
  if (v.errors) return err(400, 'VALIDATION', cors, { fields: v.errors })

  // 8. 멱등: 같은 client_submission_id가 있으면 기존 REF 반환
  const prev = await db.from('feedback').select('ref').eq('client_submission_id', v.csid).maybeSingle()
  if (prev) return json(200, { ok: true, ref: prev.ref, duplicate: true, ack: 'none' }, cors)

  // 9. 본문 중복: 24시간 안에 같은 body_hash가 있으면 차단
  const bodyHash = sha256hex(dedupNormalize(v.content))  // 소문자화, 공백 압축
  if (await existsBodyHash(bodyHash, '24 hours')) return err(409, 'DUPLICATE_CONTENT', cors)

  // 10. 세션 검증 (실패하면 조용히 비회원으로 처리)
  const who = await verifySession(body.auth?.access_token) // {memberId|null, isOperator}

  // 11. 서버 판정 필드
  const isDemo   = env === 'staging'                   // D4: 운영 Origin에서는 힌트 무시
  const userType = decideUserType(v.ctx, who)          // 4.5절 서버 규칙
  const suspect  = []
  if (countUrls(v.content) > 3) suspect.push('urls')
  if (v.dwell_ms < 3000)        suspect.push('fast')
  const content  = maskSecrets(v.content)              // 토큰 URL 마스킹 (3.6절)
  const ctx      = sanitizeCtx(v.ctx)                  // 길이 절단, 경로 검사, 오류 재마스킹

  // 12. 메일 결정
  const opsCapHit = !isDemo && !suspect.length && (await opsMailsToday()) >= OPS_MAIL_CAP
  const ackAllowed = v.reply_email && !isDemo && !suspect.length
                     && (await ackCount24h(v.reply_email)) < ACK_PER_EMAIL
  const row = {
    client_submission_id: v.csid, source: v.source,
    category: v.source === 'contact' ? 'OPS' : v.category,
    content, body_hash: bodyHash,
    reply_email: v.reply_email, reply_consent_at: v.reply_email ? new Date() : null,
    contact_name: v.contact_name, user_type: userType, member_id: who.memberId,
    ...ctx, dwell_ms: v.dwell_ms, is_demo: isDemo,
    is_suspect: suspect.length > 0, suspect_reasons: opsCapHit ? [...suspect, 'cap'] : suspect,
    ops_mail_status: (isDemo || suspect.length || opsCapHit) ? 'skipped' : 'pending',
    ack_mail_status: ackAllowed ? 'pending' : 'skipped',
    mail_lease_until: in2min(),
  }

  // 13. INSERT (ref 충돌이면 1회 재시도, csid 충돌이면 기존 REF 반환)
  const ins = await insertWithRetry(row)
  if (ins.conflict === 'csid') return json(200, { ok: true, ref: ins.ref, duplicate: true, ack: 'none' }, cors)

  // 14. 응답은 여기서 확정 (메일 결과를 기다리지 않음)
  EdgeRuntime.waitUntil(sendMails(ins.row))            // 3.8절, 결과는 행에 기록
  return json(201, { ok: true, ref: ins.row.ref, duplicate: false,
                     ack: ackAllowed ? 'queued' : 'none' }, cors)
})
```

- `opsCapHit`는 그날 상한에 처음 걸릴 때 "알림 상한 도달" 메일을 한 번만 `FEEDBACK_INBOX`로 보냅니다(`feedback_event`의 kind='mail', field='cap'으로 당일 중복을 판정).
- 모든 응답에 `Cache-Control: no-store`를 붙입니다.

### 3.4 레이트리밋 저장소 선택

| 후보 | 판단 |
|---|---|
| **Postgres 이벤트 테이블 + advisory lock (채택)** | 추가 인프라가 없습니다. 트랜잭션 안에서 "읽고 판단하고 기록"이 원자적으로 끝나고, 슬라이딩 윈도가 정확합니다. 트래픽이 작아 행 수가 수천 개 수준이고, 48시간 뒤 정리합니다. |
| Deno KV | Supabase Edge Runtime은 영속 KV를 기본으로 제공하지 않습니다(Deno Deploy 전용 기능). `TODO(infra)`: 구현 시점에 한 번 더 확인하되, 제공되더라도 DB와 이원화하지 않습니다. |
| 함수 메모리(Map) | isolate가 여러 개이고 수시로 재시작되므로 한도가 새어 나갑니다. |
| Upstash Redis | 정확하고 빠르지만 벤더와 비밀값이 하나 더 늘어납니다. 트래픽이 커지면 이 방식으로 옮깁니다(인터페이스는 `rateHit(ipHash)` 하나로 격리). |

고정 윈도가 아니라 슬라이딩 윈도를 쓰므로 창 경계에서 10건이 연달아 들어오는 문제가 없습니다.

### 3.5 IP 추출·해시

```ts
function clientIp(req): string | null {
  // 우선순위: cf-connecting-ip → x-real-ip → x-forwarded-for의 첫 값
  // TODO(infra): 스테이징에서 세 헤더의 존재와 형태를 한 번 확인한 뒤 고정합니다.
  //   확인할 때도 원문을 로그에 남기지 말고 "존재 여부 + HMAC 앞 6자"만 남깁니다.
  //   클라이언트가 XFF를 직접 붙이면 첫 값이 위조될 수 있으므로, 게이트웨이가 덧붙이는 위치를 확인해 정합니다.
}
async function hashIp(ip): string {
  if (!ip) return 'noip'                               // 식별 불가 요청은 공용 버킷 하나로 묶어 엄격하게 제한
  const norm = ip.includes(':') ? ipv6Prefix64(ip) : ip // IPv6는 /64 단위로 묶음 (주소 순환 회피 방지)
  return hmacSha256Hex(FEEDBACK_IP_PEPPER, norm).slice(0, 32)
}
```

IP 원문과 해시는 `feedback` 행에 **저장하지 않습니다**. `private.feedback_rate_event`에만 48시간 보관합니다.

### 3.6 필드 검증 규칙

| 필드 | 규칙 | 오류 코드 |
|---|---|---|
| `client_submission_id` | UUID v4 정규식 | `csid_invalid` |
| `source` | `widget` \| `contact` | `source_invalid` |
| `category` | enum. `contact`면 무시하고 `OPS` | `category_required` |
| `content` | 정규화: NFC → `\r\n`을 `\n`으로 → `\n`·`\t`를 뺀 제어문자 제거 → 앞뒤 trim. `Array.from(s).length`가 20 이상 2000 이하 | `content_short` / `content_long` |
| `reply_email` | trim → 소문자 → 254자 이하 → 2.2절 정규식. CR·LF·쉼표·세미콜론·꺾쇠 금지 | `email_invalid` |
| `reply_consent` | `reply_email`이 있으면 `true` | `consent_required` |
| `contact_name` | trim, 60자 이하, 제어문자 제거. contact가 아니면 무시 | `name_long` |
| `dwell_ms` | 0 이상 86,400,000 이하 정수. 벗어나면 0으로 간주(suspect 'fast') | — |
| `ctx.page_path` | `^/[A-Za-z0-9/_\-.]{0,199}$`. 쿼리·해시가 있으면 잘라냄 | `ctx_invalid` |
| `ctx.mode`·`lang` | enum | `ctx_invalid` |
| `ctx.ui_state` | `^(preview:)?[a-z0-9_]{1,32}$`, 아니면 null | — (조용히 null) |
| `ctx.rfp_ref` | `^MG-\d{4}-\d{3,4}$`, 아니면 null | — |
| `ctx.token_kind`·`token_hash8` | 둘 다 있거나 둘 다 없음. hash는 `^[0-9a-f]{8}$` | — (둘 다 null) |
| `ctx.viewport` | 2.2절 정규식, 아니면 null | — |
| `ctx.ua`·`referrer`·`tz`·`build_version` | 문자열이면 각각 120·200·64·40자로 절단 | — |
| `ctx.last_js_errors` | 최대 3개, 각 `m` 500자 절단, `s` 경로만, **서버에서 한 번 더 마스킹** | — |

`maskSecrets(text)`는 본문, 오류 메시지, referrer에 공통으로 적용합니다.

```
([?&](?:t|s|token|access_token)=)[A-Za-z0-9._~\-]{8,}  → $1[token]
eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,} → [jwt]
```

본문의 이메일·전화번호는 **마스킹하지 않습니다**. 유저가 연락처를 남기려고 쓴 것일 수 있어서입니다. 대신 12개월 익명화 대상입니다. 오류 메시지(`last_js_errors.m`)에서는 이메일을 `[email]`로, 9자리 이상 숫자열을 `[num]`으로 추가 마스킹합니다.

### 3.7 CORS

- 허용 Origin(운영 + 스테이징)이면 `Access-Control-Allow-Origin: <그 Origin>`과 `Vary: Origin`을 붙입니다. **오류 응답에도 붙입니다**. 그래야 위젯이 오류 코드를 읽을 수 있습니다.
- `Access-Control-Allow-Methods: POST, OPTIONS`, `Access-Control-Allow-Headers: content-type`, `Access-Control-Max-Age: 86400`. `Allow-Credentials`는 쓰지 않습니다.
- 허용되지 않은 Origin(`null` 포함, 예: 파일 미리보기)이면 ACAO 헤더 없이 403을 돌려줍니다. 위젯은 응답을 읽지 못하므로 `NETWORK`로 처리하고 폴백을 보여줍니다.
- `localhost` 개발 Origin은 `FEEDBACK_STAGING_ORIGINS`에 넣으면 됩니다(is_demo 강제).

### 3.8 응답 스키마와 오류 코드

성공:

```jsonc
{ "ok": true, "ref": "FB-261008-7KQ3", "duplicate": false, "ack": "queued" | "none" }
```

실패:

```jsonc
{ "ok": false, "error": { "code": "RATE_LIMITED", "retry_after_sec": 420, "fields": { "content": "content_short" } } }
```

서버는 현지화된 문구를 보내지 않고 **코드만** 보냅니다. 문구는 위젯의 i18n 표가 담당합니다.

| HTTP | code | 발생 조건 | 위젯 처리 | 재시도 |
|---|---|---|---|---|
| 201 | — | 신규 접수 | done | — |
| 200 | — (`duplicate:true`) | 같은 csid 재전송 | done(같은 REF) | — |
| 400 | `BAD_JSON` / `BAD_VERSION` | 파싱 실패, v≠1 | error(`server`) | 아니요 |
| 400 | `VALIDATION` | 필드 규칙 위반 | open으로 돌아가 필드 오류 표시 | 수정 후 |
| 403 | `ORIGIN_DENIED` | Origin 불허 | (응답을 읽지 못함 → `NETWORK`) | 아니요, 폴백 표시 |
| 405 | `METHOD_NOT_ALLOWED` | GET 등 | error(`server`) | 아니요 |
| 409 | `DUPLICATE_CONTENT` | 24시간 내 같은 본문 | error(`duplicate`) | 아니요 |
| 413 | `TOO_LARGE` | 16KB 초과 | error(`server`) | 아니요 |
| 429 | `RATE_LIMITED` | IP 10분 5건 / 24시간 30건 | error(`rate`, 분 단위 표시) | 시간이 지난 뒤 |
| 503 | `BUSY` | 전체 일일 상한 | error(`busy`) + 폴백 | 예 |
| 500 | `INTERNAL` | DB 오류 등 | error(`server`) | 예(같은 csid) |
| — | (네트워크·타임아웃·CORS) | fetch 거부, 15초 초과 | error(`network`) | 예(같은 csid) |

### 3.9 메일 2종 규격

공통 사항:
- Resend `POST https://api.resend.com/emails`, `Authorization: Bearer RESEND_API_KEY`, 헤더 `Idempotency-Key: fb-ops-{id}` 또는 `fb-ack-{id}`
- `text` 본문을 필수로 넣고 `html`은 선택입니다. HTML에 들어가는 값은 **모두 HTML 이스케이프**합니다. 링크는 콘솔 링크 하나만 둡니다.
- 제목에 들어가는 사용자 입력은 CR·LF·탭을 공백으로 바꾸고 제어문자를 제거합니다.
- 성공하면 `*_mail_status='sent'`, `*_sent_at`을 기록합니다. 실패하면 `failed`, `attempts+1`, `error`(200자)를 기록합니다. 5회 실패하면 최종 `failed`로 두고 콘솔에 "알림 실패" 배지를 띄웁니다.

**① 운영 알림 메일**

| 항목 | 규칙 |
|---|---|
| From | `FEEDBACK_FROM` |
| To | `FEEDBACK_INBOX` |
| Reply-To | `reply_email`. 없으면 **생략**하고 제목에 `· 회신 없음`을 붙입니다. |
| 제목 | `[MICEGO 피드백] {REF} · {대분류} · {유저 유형 라벨} · {본문 앞 30자}…` / contact면 `[MICEGO 문의] {REF} · {이름 또는 이메일 앞부분} · {본문 앞 30자}…` |
| 제목 규칙 | REF는 항상 두 번째 토큰입니다. 운영자는 답장할 때 제목의 REF를 **지우지 않습니다**. 메일함 검색과 스레드의 기준이 REF입니다. |
| 태그 | `tags: [{name:'kind', value:'ops'}]`, 헤더 `X-MICEGO-Ref: {REF}` |

본문 구성(텍스트 기준, HTML도 같은 순서로 2열 표):

```
접수번호  FB-261008-7KQ3
접수 시각 2026-10-08 19:30 (KST)
유형      SYS (하위 분류 전)
보낸 사람 여행사 회원 · 로그인 확인됨   ← member면 "로그인 확인됨"만, id·이메일은 넣지 않음
언어·모드 ko · 여행사 모드
회신 주소 jieun.kim@hanbit-tour.example  (이 메일에 답장하면 바로 전달됩니다)

──── 내용 ────
{content 원문, 이스케이프, 줄바꿈 유지}

──── 화면 정보 ────
페이지    /ko/track.html
화면 상태 delivered
요청번호  MG-2610-014   → 콘솔에서 요청 열기: {CONSOLE}/rfp.html?ref=MG-2610-014
브라우저  iOS 17.5 · Safari · KakaoTalk
화면 크기 390x844@3 · Asia/Seoul
빌드      2026.10.01-3
이전 페이지 /ko/index.html

──── 최근 오류 (최대 3건, 각 200자) ────
19:29:58 TypeError: Cannot read properties of null … (/assets/track.js 88:12)

콘솔에서 열기: {CONSOLE}/feedback-detail.html?id={uuid}
제목의 접수번호를 지우지 말고 답장해 주세요.
```

**넣지 않는 것:** token_hash8, token_kind 원값, member_id, IP나 그 해시, body_hash, client_submission_id, UA 원문, referrer의 쿼리, suspect 사유(suspect는 알림 자체를 보내지 않음), dwell_ms.

**② 접수 확인 메일** (`reply_email`이 있고, 동의했고, demo·suspect가 아니며, 같은 수신자에게 24시간 내 3건 미만일 때)

| 항목 | ko | en |
|---|---|---|
| From | `FEEDBACK_FROM` | 같음 |
| To | `reply_email` | 같음 |
| Reply-To | `FEEDBACK_INBOX` | 같음 |
| 제목 | `[MICEGO] 보내 주신 의견을 접수했습니다 ({REF})` | `[MICEGO] We've received your feedback ({REF})` |

본문(ko):

```
MICEGO에 의견을 보내 주셔서 감사합니다.

접수번호  FB-261008-7KQ3
접수 유형 시스템 오류·개선
접수 시각 2026-10-08 19:30 (KST)

답변이 필요한 내용이면 담당자가 이 주소로 회신드립니다.
덧붙일 내용이 있으면 이 메일에 그대로 답장해 주세요. 제목의 접수번호는 지우지 말아 주세요.

직접 보내신 적이 없다면 이 메일은 무시하셔도 됩니다.
MICEGO 운영팀
```

본문(en):

```
Thanks for sending feedback to MICEGO.

Reference  FB-261008-7KQ3
Type       System issue / improvement
Received   2026-10-08 19:30 (KST)

If your message needs a reply, our team will respond to this address.
To add details, just reply to this email and keep the reference in the subject line.

If you didn't send this, you can ignore this email.
The MICEGO team
```

**넣지 않는 것:** 유저가 쓴 본문(D7), 페이지나 토큰 정보, 사이트 링크(피싱 표면 최소화), 개인 이름.

언어는 행의 `lang`을 따릅니다. 유형 라벨은 4.8절 i18n 표를 서버의 `_shared/feedback-templates.ts`로 복제해 씁니다(두 곳의 문자열이 같은지 테스트로 확인).

### 3.10 `feedback-mail-retry`

```
인증: header x-internal-secret == FEEDBACK_CRON_SECRET  → 배치 모드
      또는 body {id} + auth.getUser(Bearer JWT).app_metadata.role == 'operator' → 단건 모드
        (단건: 상태가 failed이면 attempts를 0으로 되돌리고 pending으로 바꾼 뒤 처리)
배치:  rows = rpc feedback_claim_mail(20)
       for row: ops가 pending|failed면 sendOps, ack가 pending|failed면 sendAck (같은 Idempotency-Key)
응답:  {processed, sent, failed}
```

단건 모드는 콘솔 브라우저에서 호출하므로 `Authorization` 헤더 때문에 preflight가 생깁니다. OPTIONS를 처리하고, 허용 Origin은 운영 콘솔 도메인만 둡니다.

---

## 4. 위젯 `feedback.js` 명세

### 4.1 설정·공개 API

```js
// /assets/site-config.js (빌드가 환경별로 생성, feedback.js보다 먼저 로드)
window.MICEGO_FEEDBACK = {
  supabaseUrl: 'https://xxxx.supabase.co',   // 필수
  anonKey: 'eyJ...',                         // 계약상 유지. MVP에서는 전송하지 않음(D2)
  mode: undefined,                           // 선택: 'agency'|'hotel'|'admin'|'root' (없으면 경로로 판정)
  buildVersion: '2026.10.01-3',              // 선택: 없으면 <meta name="micego-build">
  // 선택 확장 키 (없으면 기본값)
  fallbackEmail: 'hello@micego.kr',          // TODO(operator): 공식 주소 확정 전에는 현재 접수 주소
  contactPath: { ko: '/ko/contact.html', en: '/en/contact.html' },
  sessionKey: undefined,                     // 기본 'sb-{projectRef}-auth-token'
  launcher: true,                            // false면 떠 있는 버튼 없이 [data-mg-feedback-open] 트리거만
  disabled: false
};
```

페이지 태그(모든 대상 페이지, 빌드가 삽입):

```html
<script src="/assets/site-config.js"></script>
<script src="/assets/feedback.js" defer></script>
```

공개 API:

```ts
window.MICEGO_FB = {
  version: '1.0.0',
  open(opts?: { category?: 'SYS'|'OPS'|'ETC' }): void,
  close(): void,
  submit(p: {                                // contact.html 폼 전용. UI 없이 전송만
    source: 'contact', content: string, reply_email: string,
    contact_name?: string, consent: boolean, hp: string, dwell_ms: number,
    client_submission_id?: string            // 폼이 재시도에 쓰도록 보관
  }): Promise<{ ok: true, ref: string, ack: 'queued'|'none', duplicate: boolean }
             | { ok: false, code: string, fields?: Record<string,string>, retry_after_sec?: number }>
}
```

대상 페이지: `/index.html`, `ko/*`, `en/*`(bid·track 등 토큰 페이지 포함), `admin/*`(단 `admin/feedback*.html`은 `launcher:false`). 제외: 이메일 템플릿, `docs/`.
`contact.html`에서는 `<html data-mgfb-launcher="off">`를 둡니다. 폼 자체가 입구라 런처가 필요 없습니다.

### 4.2 초기화 순서

```
0. 즉시 실행(IIFE). 중복 로드 방지: if (window.__MGFB) return; window.__MGFB = true
1. 오류 수집 설치: window 'error', 'unhandledrejection' 리스너 → ringBuffer(3)
   + window.__mgfbEarly(선택 헤드 스니펫)가 모아 둔 초기 오류를 흡수 (4.4 참조)
2. cfg 읽기. supabaseUrl이 없거나 disabled면 → [data-mg-feedback-open] 링크를 원래 href대로 두고 종료
3. env 판정: lang, mode, isDemoHint (4.4)
4. DOM 준비(defer라 이미 준비됨) →
   a. host <div id="mgfb-host"> 를 body 끝에 추가 → attachShadow({mode:'open'})
      (attachShadow가 없으면 host 없이 2번 경로로 폴백)
   b. <style> 주입(4.9) → 런처·다이얼로그 마크업 생성(닫힌 상태, hidden)
   c. [data-mg-feedback-open] 요소에 click 위임 → preventDefault + open()
   d. 하단 고정 요소 감시(4.9 오프셋) 시작
   e. 보류 중인 제출 확인: sessionStorage 'mgfb:pending' 이 있으면 런처에 점 배지,
      열면 "이전 전송 결과를 확인하지 못했습니다" 배너 + [다시 보내기]
   f. window.MICEGO_FB 노출
5. 여기까지 네트워크 요청 0건 (열거나 제출할 때만 요청)
```

모든 `sessionStorage`·`localStorage` 접근은 try/catch로 감쌉니다. 실패하면 초안 저장과 세션 인식만 꺼지고 나머지는 동작합니다.

### 4.3 페이지 상태 훅: `window.MICEGO_PAGE_STATE`로 정한 이유

```ts
window.MICEGO_PAGE_STATE = {
  page: 'track' | 'bid' | 'my' | ...,     // 선택
  state: 'delivered',                      // 필수(해당 페이지): ^[a-z0-9_]{1,32}$, 토큰 무효면 'invalid'
  rfpRef: 'MG-2610-014' | null,            // 서버에서 받은 값만 (URL에서 추측 금지)
  tokenKind: 'track' | 'share' | 'bid' | null,
  prefillEmail: 'sales@hotel.example' | null  // bid: 초대 데이터의 담당자 이메일
};
// 페이지는 데이터를 불러온 뒤, 상태가 바뀔 때마다 Object.assign으로 갱신합니다.
```

data 속성 대신 전역 객체로 정한 이유:
1. **읽는 시점을 늦출 수 있습니다.** 위젯은 `defer`로 로드되는데, track·bid의 실제 상태는 토큰 조회 fetch가 끝난 뒤에 정해집니다. 위젯이 초기화 때가 아니라 열 때와 제출할 때 객체를 읽으면 로드 순서와 상관없이 항상 최신 값을 얻습니다. data 속성도 늦게 읽을 수는 있지만, 여러 속성을 동기화해야 하고 문자열만 담을 수 있습니다.
2. **DOM에 남기지 않을 값이 있습니다.** `prefillEmail`(호텔 담당자 이메일)이 `outerHTML`, 스크린샷 도구, 분석 스크립트의 DOM 수집에 노출되지 않습니다.
3. **CSS 상태 표현과 분리됩니다.** 기존 `html[data-view="share"]` 같은 표현용 속성과 섞이지 않아, 스타일 변경이 피드백 컨텍스트를 깨뜨리지 않습니다.
4. **원문 토큰은 어느 방식으로도 넘기지 않습니다.** 위젯이 `location.search`에서 직접 읽어 해시만 계산합니다.

`?state=` 미리보기(스테이징) 페이지도 같은 객체에 미리보기 상태를 넣습니다. 위젯은 URL에 `state` 파라미터가 있으면 `ui_state = 'preview:' + state`로 기록합니다.

### 4.4 컨텍스트 수집 함수 규칙

| 항목 | 함수 | 데이터 소스 | 규칙·마스킹 |
|---|---|---|---|
| `lang` | `detectLang()` | `location.pathname` | `/ko/`·`/admin/`로 시작하면 ko, `/en/`이면 en, 그 밖에는 `navigator.language`가 `ko`로 시작하면 ko, 아니면 en |
| `mode` | `detectMode()` | `cfg.mode` → 경로 | `/ko/`→agency, `/en/`→hotel, `/admin/`→admin, 그 밖→root |
| `page_path` | `pagePath()` | `location.pathname` | 경로만. 쿼리·해시는 버립니다. 200자 절단 |
| `ui_state` | `uiState()` | URL `state` 파라미터 → `MICEGO_PAGE_STATE.state` | 미리보기면 `preview:`를 앞에 붙임. 정규식에 맞지 않으면 null |
| `rfp_ref` | `rfpRef()` | `MICEGO_PAGE_STATE.rfpRef` | 정규식에 맞지 않으면 null |
| `token_kind`·`token_hash8` | `tokenInfo()` | 종류: `PAGE_STATE.tokenKind`, 없으면 경로와 파라미터로 판정(`/ko/track.html`+`t`→track, `+s`→share, `/en/bid.html`+`t`→bid). 원문: `URLSearchParams`의 `t` 또는 `s` | `crypto.subtle.digest('SHA-256', utf8(raw))` → 소문자 hex 앞 8자. subtle이 없으면(비보안 컨텍스트) **둘 다 null**. 원문은 지역 변수에만 두고 저장·전송하지 않습니다 |
| `member`(auth) | `sessionToken()` | `localStorage[cfg.sessionKey ?? 'sb-'+projectRef+'-auth-token']` JSON의 `access_token` | `expires_at`(초)이 지났으면 보내지 않습니다. 이메일 프리필용으로 `user.email`을 읽습니다. `projectRef`는 `supabaseUrl` 호스트의 첫 라벨 |
| `viewport` | `viewport()` | `innerWidth`, `innerHeight`, `devicePixelRatio` | `390x844@3`, dpr은 소수 둘째 자리까지 |
| `ua` | `shortUA()` | `navigator.userAgent` | 아래 표. 120자 절단, 원문 전송 금지 |
| `referrer` | `ref()` | `document.referrer` | 같은 Origin이면 경로만(쿼리·해시 제거), 다른 Origin이면 hostname만(`www.` 제거), 없으면 null |
| `last_js_errors` | 링버퍼 | error·unhandledrejection | 원소 `{t, m, s, l}`. `m` = message 또는 reason 문자열 → `maskSecrets` + 이메일→`[email]`, 9자리 이상 숫자→`[num]` → 500자 절단. `s` = filename의 경로만. 같은 메시지가 연속되면 하나만. 최대 3건(최신 우선) |
| `tz` | `tz()` | `Intl.DateTimeFormat().resolvedOptions().timeZone` | 실패하면 null |
| `build_version` | `build()` | `cfg.buildVersion` → `<meta name="micego-build">` | 40자 절단 |
| `submitted_at` | — | `new Date().toISOString()` | 참고용. 기준 시각은 서버 `created_at` |
| `is_demo_hint` | `demoHint()` | URL `state` 파라미터 존재 또는 `.demo-strip`, `[data-demo-strip]` 존재 | 화면 안내에만 씀. 서버는 Origin으로 판정(D4) |
| `user_type_hint` | 4.5 | — | 서버가 다시 판정 |
| `dwell_ms` | — | 이번 초안에서 시트를 처음 연 시각부터 제출까지 | 초안을 복원하면 시계를 이어서 셈 |

`shortUA()` 규칙(앞에서부터 해당되는 것을 ` · `로 연결):
1. OS: `iPhone|iPad` → `iOS {버전}`, `Android {주버전}`, `Windows`, `Mac`, 그 밖에는 `Other`
2. 브라우저: `Edg/`→Edge, `SamsungBrowser`→Samsung, `Whale`→Whale, `CriOS|Chrome/`→Chrome {주버전}, `FxiOS|Firefox/`→Firefox, `Safari/` 단독→Safari
3. 인앱 표시: `KAKAOTALK`→KakaoTalk, `NAVER(`→NaverApp, `Instagram`, `FBAN|FBAV`→Facebook, `Line/`→LINE, `DaumApps`→Daum, 그 밖에 `; wv)`→WebView

초기 오류를 잡는 선택 스니펫(빌드가 `<head>` 맨 앞에 삽입, 1줄):

```html
<script>window.__mgfbEarly=[];addEventListener('error',function(e){__mgfbEarly.length<3&&__mgfbEarly.push({t:new Date().toISOString(),m:String(e.message).slice(0,500),s:e.filename,l:e.lineno+':'+e.colno})});</script>
```

### 4.5 유저 유형 판별

**클라이언트 힌트**(표시와 힌트 용도, 위에서부터 먼저 맞는 것):

| 순서 | 조건 | 힌트 |
|---|---|---|
| 1 | 경로가 `/admin/` | `admin` |
| 2 | `token_kind === 'bid'` | `hotel` |
| 3 | 유효한 세션 토큰이 있고 경로가 `/ko/` | `travel_agency` |
| 4 | `token_kind ∈ {track, share}` | `organizer_guest` |
| 5 | 그 밖 | `visitor` |

**서버 최종 판정**(저장값):

| 순서 | 조건 | 결과 |
|---|---|---|
| 1 | JWT 검증 성공 + `app_metadata.role='operator'` | `admin` (`member_id`는 null. 운영자는 회원이 아님) |
| 2 | `token_kind='bid'` + `token_hash8` 있음 | `hotel` |
| 3 | JWT 검증 성공 + 운영자 아님 | `travel_agency` (`member_id = user.id`) |
| 4 | `token_kind ∈ {track, share}` + hash 있음 | `organizer_guest` |
| 5 | 그 밖 (admin 경로인데 검증 실패도 포함) | `visitor` |

회원이 자기 요청의 track 페이지를 열면 3번이 4번보다 우선해 `travel_agency`가 되고, 토큰 정보도 함께 저장됩니다.

### 4.6 UI 구성과 상태 머신

**런처**
- 모바일(<768px): 44×44 원형 아이콘 버튼, `aria-label="의견 보내기"`
- 데스크톱(≥768px): 알약형 버튼(아이콘 + 텍스트)
- 위치: 오른쪽 아래(4.9 오프셋 규칙 적용). 보류 중인 제출이 있으면 앰버색 점

**다이얼로그**
- 모바일: 바텀시트(아래에서 올라옴)
- 데스크톱: 오른쪽 아래에 고정된 380px 카드

다이얼로그 안의 요소 순서:
1. 제목 `<h2>`와 닫기 버튼
2. 안내 한 줄
3. (DEMO일 때) 앰버 안내 띠
4. 유형 fieldset: 라디오 카드 3개(제목과 설명 한 줄)
5. 내용 textarea와 글자 수 카운터
6. 회신 이메일(선택). 프리필되었으면 도움말 문구가 달라짐
7. 동의 체크박스(이메일이 비어 있지 않을 때만 표시되고 필수)
8. 허니팟(시각적으로 숨김, `tabindex=-1`, `autocomplete=off`, `aria-hidden=true`, name=`mgfb_website`)
9. `<details>` "함께 보내는 정보"
10. 보내기 버튼
11. 상태 영역(live region)

**상태 머신**

```
            OPEN                       SUBMIT(유효)                OK(201/200)
 closed ─────────▶ open ─────────────────────▶ submitting ─────────────────▶ done
   ▲                │  ▲   SUBMIT(무효):              │  │                    │
   │     CLOSE      │  │   필드 오류 표시, 첫 오류에 포커스  │  │ FAIL(VALIDATION)   │ CLOSE
   └────────────────┘  └──────────────────────────────┘  │ → open + 필드 오류   │ (폼 초기화,
   ▲                                                      │                    │  새 csid)
   │ CLOSE (초안·보류 유지)          FAIL(재시도 가능/불가)   ▼                    │
   └──────────────────────────────────────────────────── error ◀───────────────┘
                                     RETRY → submitting (같은 csid)
                                     EDIT  → open
```

| 상태 | 진입 시 동작 | 허용 이벤트 |
|---|---|---|
| `closed` | 시트를 숨기고 런처에 포커스를 되돌림, inert 해제, 스크롤 잠금 해제 | OPEN |
| `open` | 초안 복원(`mgfb:draft:{page_path}`), csid가 없으면 생성, 첫 오픈 시각 기록, 첫 번째 미선택 라디오나 textarea에 포커스, 3초 전에는 보내기 버튼이 `aria-disabled`(툴팁 없음, 3초 뒤 자동 활성) | CLOSE, SUBMIT, 입력 |
| `submitting` | 버튼 `disabled` + "보내는 중…", 모든 입력 `readonly`, `mgfb:pending = {csid, payload, at}` 저장, `beforeunload` 경고 등록, fetch(keepalive, 15초 AbortController) | OK, FAIL. **CLOSE·ESC 무시**(live region에 "보내는 중입니다" 안내) |
| `done` | 초안과 pending 삭제, `beforeunload` 해제, REF를 크게 표시하고 복사 버튼 제공, 제목에 포커스(`tabindex=-1`) | CLOSE |
| `error` | `beforeunload` 해제, 오류 문구, 재시도할 수 있으면 [다시 보내기], [내용 고치기], 폴백 영역(연속 실패 2회 이상이거나 `network`·`busy`일 때) | RETRY, EDIT, CLOSE |

오류 분류:
- 재시도 가능: `network`, `timeout`, `INTERNAL`, `BUSY`, `RATE_LIMITED`(대기 후)
- 재시도 불가: `DUPLICATE_CONTENT`, `BAD_*`, `TOO_LARGE`
- 재시도할 수 없는 오류에서는 pending을 삭제합니다. `network`·`timeout`은 결과를 알 수 없으므로 pending을 유지합니다.

전송 코드:

```js
fetch(endpoint, {
  method: 'POST', mode: 'cors', credentials: 'omit', keepalive: true,
  headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
  body: JSON.stringify(payload), signal: ac.signal
})
```

keepalive 요청은 본문 64KB 제한이 있습니다. 이 페이로드는 최대 16KB라 여유가 있습니다.

**클라이언트 검증**(서버와 같은 규칙): 유형 필수 / `Array.from(trimmed).length`가 20~2000 / 이메일 정규식 / 이메일이 있으면 동의 필수. 카운터는 `0 / 2000`, 20자 미만이면 회색으로 "20자 이상".

### 4.7 접근성

- 런처: `<button type="button" aria-haspopup="dialog" aria-expanded="false|true" aria-controls="mgfb-dialog">`
- 다이얼로그: `role="dialog" aria-modal="true" aria-labelledby="mgfb-title" aria-describedby="mgfb-intro"`
- 유형: `<fieldset><legend>`에 네이티브 라디오(시각적으로 카드), 화살표 키 이동은 브라우저 기본 동작을 씁니다.
- 필드 오류: `aria-invalid="true"`, `aria-describedby`로 오류 문구 id와 도움말을 연결. 제출 실패 시 첫 오류 필드로 포커스
- 상태 알림: `role="status" aria-live="polite"`(보내는 중, 접수 완료) / 오류는 `role="alert"`
- **포커스 트랩:** shadow root 안에서 포커스 가능한 요소 목록(`button, [href], input:not([type=hidden]):not([tabindex="-1"]), textarea, select, summary`)을 두고, Tab과 Shift+Tab을 처음과 끝에서 순환시킵니다.
- **배경 비활성화:** 열 때 `body`의 직계 자식 중 host가 아니고 이미 inert가 아닌 요소에 `inert`를 설정하고 목록을 기억해 두었다가 닫을 때 복원합니다. `inert`를 지원하지 않으면 `aria-hidden="true"`로 대신합니다.
- **ESC:** open·error·done에서는 닫고, submitting에서는 무시합니다. 닫으면 여는 데 쓴 요소(런처나 트리거 링크)로 포커스를 되돌립니다.
- 터치 영역 44px 이상, 포커스 링은 `:focus-visible`에서 2px Teal outline + 2px offset
- 텍스트 대비 AA 이상(Navy `#0F1E3D`/흰 배경, Teal 버튼 위 흰 글자는 18px bold 이상이거나 `#087A72`로 한 단계 어둡게)
- `prefers-reduced-motion: reduce`이면 슬라이드·페이드 없이 즉시 표시
- 스크롤 잠금: 열 때 `document.documentElement.style.overflow='hidden'`(이전 값 저장). 시트 내부는 `overscroll-behavior: contain`

### 4.8 i18n 문자열 표 (전량)

| 키 | ko | en |
|---|---|---|
| `launcher` | 의견 보내기 | Feedback |
| `title` | 의견 보내기 | Send feedback |
| `intro` | 불편한 점이나 바라는 점을 알려 주세요. 담당자가 직접 확인합니다. | Tell us what's not working or what you'd like to see. A person on our team reads every message. |
| `close` | 닫기 | Close |
| `demoNotice` | 테스트 화면이라 운영팀 알림은 보내지 않습니다. 접수는 기록됩니다. | This is a test page. Your message is saved, but our team won't be notified. |
| `catLegend` | 어떤 내용인가요? | What is this about? |
| `catSYS` | 화면·기능 문제 | Site problem |
| `catSYSDesc` | 오류, 잘못된 문구, 개선 아이디어 | Errors, wrong text, or ideas to improve |
| `catOPS` | 견적·운영 문의 | Quotes & operations |
| `catOPSDesc` | 견적 요청, 제안, 계정, 파트너 관련 | Requests, bids, accounts, or partnership |
| `catETC` | 기타 | Something else |
| `catETCDesc` | 위에 해당하지 않는 내용 | Anything not listed above |
| `contentLabel` | 내용 | Message |
| `contentPh` | 어떤 화면에서 무엇을 하다가 어떤 일이 있었는지 적어 주세요. | Tell us which page you were on, what you were doing, and what happened. |
| `counter` | {n} / 2000 | {n} / 2000 |
| `counterMin` | 20자 이상 적어 주세요 | At least 20 characters |
| `emailLabel` | 회신 받을 이메일 (선택) | Email for a reply (optional) |
| `emailHelp` | 남겨 주시면 답변을 이 주소로 보내 드립니다. | Leave your email if you'd like a reply. |
| `emailPrefilled` | 등록된 이메일을 넣어 두었습니다. 다른 주소로 바꿔도 됩니다. | We've filled in your email on file. You can change it. |
| `consentLabel` | 회신을 위해 이메일을 수집·이용하는 데 동의합니다. (12개월 보관 후 파기) | I agree that MICEGO may use this email to reply. (Deleted after 12 months) |
| `consentLink` | 개인정보처리방침 | Privacy notice |
| `ctxSummary` | 함께 보내는 정보 | Also sent with your message |
| `ctxBody` | 문제를 빨리 찾기 위해 지금 보고 있는 페이지 주소(접속 링크의 비밀 코드 제외), 화면 상태, 요청번호, 브라우저 종류, 화면 크기, 최근 오류 기록이 함께 전송됩니다. IP 주소는 저장하지 않습니다. | To help us find the problem, we include the page address (without your private link code), page status, request number, browser type, screen size, and recent error logs. We don't store your IP address. |
| `submit` | 보내기 | Send |
| `submitting` | 보내는 중… | Sending… |
| `submittingLocked` | 보내는 중입니다. 잠시만 기다려 주세요. | Sending now. Please wait a moment. |
| `doneTitle` | 접수되었습니다 | Message received |
| `doneRefLabel` | 접수번호 | Reference |
| `doneAck` | 확인 메일을 곧 보내 드립니다. 답변도 같은 주소로 드립니다. | We'll send a confirmation email shortly, and reply to the same address. |
| `doneNoEmail` | 회신 이메일을 남기지 않으셔서 따로 답변드리기는 어렵습니다. 보내 주신 내용은 꼭 확인하겠습니다. | You didn't leave an email, so we can't reply directly. We'll still review your message. |
| `copyRef` | 접수번호 복사 | Copy reference |
| `copied` | 복사했습니다 | Copied |
| `doneClose` | 닫기 | Done |
| `errCategory` | 어떤 내용인지 골라 주세요. | Please choose a topic. |
| `errShort` | 20자 이상 적어 주세요. 지금 {n}자입니다. | Please write at least 20 characters ({n} so far). |
| `errLong` | 2,000자까지 쓸 수 있습니다. {n}자를 줄여 주세요. | Please keep it under 2,000 characters ({n} over). |
| `errEmail` | 이메일 형식을 확인해 주세요. | Please check the email address. |
| `errConsent` | 이메일을 남기시려면 동의에 체크해 주세요. | Please tick the box to let us reply by email. |
| `errNetwork` | 인터넷 연결이 불안정해 보내지 못했습니다. 연결을 확인하고 다시 보내 주세요. | We couldn't send your message due to a connection problem. Please check your connection and try again. |
| `errTimeout` | 응답이 늦어 전송 결과를 확인하지 못했습니다. 다시 보내도 중복으로 접수되지 않습니다. | The server took too long to respond. You can send again — it won't be duplicated. |
| `errRate` | 짧은 시간에 여러 번 보내셨습니다. {m}분 뒤에 다시 보내 주세요. | You've sent several messages in a short time. Please try again in {m} min. |
| `errDuplicate` | 같은 내용이 이미 접수되어 있습니다. 덧붙일 내용이 있으면 새로 적어 보내 주세요. | This message has already been received. To add details, please write a new message. |
| `errBusy` | 지금은 접수가 몰려 받지 못했습니다. 잠시 뒤 다시 보내거나 아래 방법으로 보내 주세요. | We're receiving too many messages right now. Please try again later or use an option below. |
| `errServer` | 일시적인 문제로 보내지 못했습니다. 다시 보내 주세요. | Something went wrong on our side. Please try again. |
| `retry` | 다시 보내기 | Try again |
| `edit` | 내용 고치기 | Edit message |
| `fbTitle` | 다른 방법으로 보내기 | Other ways to reach us |
| `fbCopy` | 내용 복사 | Copy message |
| `fbMail` | 메일로 보내기 | Send by email |
| `fbContact` | 문의 페이지로 이동 | Go to contact page |
| `fbCopyHint` | 복사한 내용을 메일이나 문의 페이지에 붙여 넣어 주세요. | Paste the copied text into an email or the contact form. |
| `pendingBanner` | 이전에 보낸 내용의 전송 결과를 확인하지 못했습니다. 다시 보내도 중복으로 접수되지 않습니다. | We couldn't confirm your last message was sent. Sending again won't create a duplicate. |
| `pendingResend` | 다시 보내기 | Send again |
| `pendingDiscard` | 지우기 | Discard |
| `noscript` | 의견이나 문제 신고는 {문의 페이지} 또는 {메일}로 보내 주세요. | To send feedback or report a problem, use the {contact page} or {email}. |
| `mailSubject` | [MICEGO 의견] {유형} · {페이지} | [MICEGO feedback] {type} · {page} |
| `mailTrunc` | (이하 생략 — "내용 복사"로 전체 내용을 붙여 넣어 주세요) | (Truncated — use "Copy message" to paste the full text) |
| `userType.travel_agency` | 여행사 회원 | Agency member |
| `userType.organizer_guest` | 비회원 요청자 | Guest requester |
| `userType.hotel` | 호텔 | Hotel |
| `userType.admin` | 운영자 | Operator |
| `userType.visitor` | 방문자 | Visitor |

### 4.9 스타일·배치 규칙

CSS 변수(`:host`에 정의, 페이지에서 host에 덮어쓰기 가능):

```css
:host {
  --mgfb-accent:#0B8F86; --mgfb-accent-strong:#087A72; --mgfb-amber:#FFC24B;
  --mgfb-ink:#0F1E3D; --mgfb-ink-2:#4A5670; --mgfb-line:#E3E7EE; --mgfb-bg:#FFFFFF;
  --mgfb-danger:#C62828; --mgfb-radius:12px; --mgfb-sheet-radius:16px;
  --mgfb-z-launcher:980;         /* 사이트 헤더·스티키 CTA보다 위, 사이트 모달(≥1000)보다 아래 */
  --mgfb-z-dialog:10000;         /* 모든 요소보다 위 */
  --mgfb-offset:0px;             /* JS가 계산한 하단 고정 요소 높이 */
  --mgfb-safe:env(safe-area-inset-bottom, 0px);
  font-family: inherit; color: var(--mgfb-ink);
}
```

- `TODO(FE)`: 구현 전에 사이트 CSS의 z-index를 전부 grep해서 `launcher < 사이트 모달`, `dialog > 모든 것` 관계를 확인합니다.
- 입력 요소의 `font-size`는 **16px 이상**입니다. iOS는 이보다 작으면 포커스할 때 화면을 확대합니다.
- 런처 위치: `right:16px; bottom:calc(16px + var(--mgfb-offset) + var(--mgfb-safe))`
- 바텀시트(<768px): `left:0; right:0; bottom:0; max-height:min(90dvh, 680px)`(dvh를 지원하지 않으면 `90vh`), `padding-bottom:calc(16px + env(safe-area-inset-bottom))`, 위쪽 모서리만 둥글게. 배경막은 `rgba(15,30,61,.45)`
- 카드(≥768px): `right:24px; bottom:calc(24px + var(--mgfb-offset)); width:380px; max-height:min(640px, calc(100dvh - 48px))`. 배경막은 `rgba(15,30,61,.2)`
- 키보드 대응(모바일): `visualViewport`가 있으면 resize할 때 `--mgfb-kb = innerHeight - visualViewport.height`를 계산해 시트의 `bottom`에 더하고 시트 안에서 스크롤되게 합니다.
- `@media print { :host { display:none } }`
- 가로 스크롤 금지: 모든 요소 `box-sizing:border-box`, 시트 `width:100%`, `max-width:100vw`

**기존 하단 CTA와 충돌 피하기**
- 페이지 쪽 규칙(MUST): 화면 하단에 고정되는 요소(랜딩 모바일 스티키 CTA, track·bid 하단 액션 바 등)에는 `data-mg-fixed-bottom`을 붙입니다. 빌드에서 일괄 추가합니다.
- 위젯 쪽 계산:

```js
function computeOffset() {
  let max = 0
  for (const el of document.querySelectorAll('[data-mg-fixed-bottom]')) {
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue
    const r = el.getBoundingClientRect()
    if (r.height === 0 || r.top >= innerHeight) continue
    max = Math.max(max, innerHeight - r.top)
  }
  host.style.setProperty('--mgfb-offset', max ? (max + 8) + 'px' : '0px')
  host.style.setProperty('--mgfb-safe', max ? '0px' : 'env(safe-area-inset-bottom, 0px)') // 안전 영역 이중 계산 방지
}
```

- 호출 시점: 초기화, rAF로 조절한 scroll·resize, `ResizeObserver`(대상 요소), `MutationObserver`(대상 요소의 `class`·`style`·`hidden` 속성)
- 모바일(`pointer:coarse`)에서 host 밖의 input·textarea·select에 포커스가 들어오면(focusin) 런처를 숨기고, focusout하면 되돌립니다. 키보드가 올라온 상태에서 폼을 가리지 않기 위해서입니다.
- 시트가 열려 있는 동안 런처는 숨깁니다.
- `html[data-mgfb-launcher="off"]`이거나 `cfg.launcher === false`이면 런처를 만들지 않습니다(트리거 링크는 계속 동작).

### 4.10 폴백: mailto와 복사

폴백 영역의 버튼 3개:
1. **내용 복사**: `navigator.clipboard.writeText` 시도 → 실패하면 숨긴 textarea를 선택하고 `document.execCommand('copy')` → 그래도 실패하면 textarea를 보이게 해서 전체 선택해 두고 `fbCopyHint`를 표시합니다.
2. **메일로 보내기**: `mailto:` 링크(규격은 아래)
3. **문의 페이지로 이동**: `cfg.contactPath[lang]`

카카오 인앱에서는 mailto가 열리지 않는 경우가 많습니다. 그래서 폴백 버튼 순서는 **복사 → 문의 페이지 → 메일**로 둡니다. 인앱 UA로 판정되면 메일 버튼을 뒤로 보냅니다.

mailto 규격:

```
to:      cfg.fallbackEmail
subject: [MICEGO 의견] {유형 라벨} · {page_path}          (en: [MICEGO feedback] …)
body:
유형: {유형 라벨}
내용:
{content}

---- 아래는 자동으로 붙은 정보입니다 ----
페이지: {page_path}
화면 상태: {ui_state 또는 -}
요청번호: {rfp_ref 또는 -}
언어·모드: {lang} · {mode}
브라우저: {ua}
화면: {viewport}
빌드: {build_version 또는 -}
시각: {YYYY-MM-DD HH:mm} ({tz})
확인코드: {client_submission_id 앞 8자}
```

- 인코딩된 전체 URL이 1,800자를 넘으면 content를 잘라 맞추고 `mailTrunc` 문구를 붙입니다.
- **넣지 않는 것:** token_hash8, 토큰 원문, 세션 정보, 오류 로그(길이 문제와 민감도)

### 4.11 JS가 실행되지 않는 환경

- 빌드가 모든 페이지 푸터에 **평범한 링크**를 넣습니다: `<a href="/ko/contact.html" data-mg-feedback-open>의견 보내기</a>`(en은 `/en/contact.html`, `Feedback`). JS가 없으면 문의 페이지로 이동하고, JS가 있으면 시트를 엽니다.
- 푸터에 `<noscript>`로 `noscript` 문구(문의 페이지 링크와 `mailto:` 링크)를 넣습니다.
- 위젯이 없어도 페이지의 핵심 콘텐츠는 그대로 보여야 합니다. 프로젝트 원칙(JS에만 의존해 콘텐츠를 보이는 방식 금지)에 따라, 위젯은 콘텐츠를 숨기지 않습니다.
- `contact.html`은 JS가 없을 때 기존 mailto 경로를 유지하고, JS가 있을 때만 `MICEGO_FB.submit`으로 보냅니다.

### 4.12 contact.html 통합

- 필드: 이름(선택, ≤60), 이메일(필수), 내용(필수, 20~2000), 동의(필수), 허니팟
- 제출: `MICEGO_FB.submit({source:'contact', ...})`. csid는 폼이 처음 입력될 때 만들어 두고 재시도 때 재사용합니다. dwell은 페이지 로드 시각부터 셉니다.
- 성공 화면: 접수번호와 "확인 메일을 곧 보내 드립니다"
- 저장: `category=OPS`, `subcode=null`(운영자가 부여), `source=contact`

---

## 5. 콘솔 화면 명세

두 페이지 모두 기존 admin 레이아웃·네비게이션·mock 패턴을 따릅니다.
- 네비게이션에 "피드백" 메뉴를 추가하고, `new` 건수를 배지로 표시합니다.
- 데모 시계는 기존 `2026-10-08 19:30`을 그대로 씁니다.
- 로직 파일은 `admin/feedback-console.js`, 데이터는 `mock-data.js`의 `MOCK.feedback`, `MOCK.feedbackNotes`, `MOCK.feedbackEvents`입니다.
- 모든 Supabase 연결 지점에 `// SUPABASE(<id>): <요청>` 주석을 남깁니다.

### 5.1 목록 `admin/feedback.html`

**상단 요약:** 상태별 칩과 개수(신규·분류됨·처리 중·보류·완료), 경고 칩(P1 미착수, 알림 실패, 분류 지연)

**필터**(URL 쿼리와 동기화, 새로고침하거나 공유해도 유지):

| 필터 | 값 | 기본값 |
|---|---|---|
| 상태 | 다중 선택 | `new, triaged, in_progress, on_hold` |
| 대분류 / 하위 코드 | SYS·OPS·ETC / 대분류에 따라 달라지는 하위 목록 | 전체 |
| 우선순위 | P1~P4, 미지정 | 전체 |
| 유저 유형 | 5종 | 전체 |
| 모드·언어 | agency·hotel·admin·root / ko·en | 전체 |
| 담당 | 나, 미지정, 운영자 목록 | 전체 |
| 기간 | 오늘, 7일, 30일, 직접 입력 | 30일 |
| 플래그 | `DEMO 포함`(기본 끔), `의심만`, `알림 실패만`, `회신 이메일 있음` | — |
| 검색 | REF, 본문, rfp_ref, 회신 이메일(부분 일치) | — |
| 프리셋 | **주간 정리**: 보류 전체 + 이번 주 완료 + 7일 넘은 신규 | — |

**정렬 기본값:** 상태 순서(new → triaged → in_progress → on_hold → done), 우선순위 오름차순(미지정은 맨 뒤), 접수 시각 내림차순. 열 머리를 누르면 접수 시각이나 우선순위로 정렬을 바꿀 수 있습니다.

**열**(데스크톱):

| 열 | 내용 |
|---|---|
| 접수번호 | `FB-…` 모노 폰트, 상세 링크 |
| 접수 시각 | 상대 시각과 절대 시각 툴팁 |
| 유형 | `SYS·BUG`처럼 표시, 하위 코드가 없으면 `SYS·—` |
| P | 칩(P1 빨강, P2 앰버, P3 청록, P4 회색) |
| 상태 | 칩 |
| 요약 | 본문 앞 60자(이스케이프) |
| 보낸 사람 | 유저 유형 라벨, 회신 이메일이 있으면 봉투 아이콘 |
| 페이지 | page_path와 ui_state |
| 연결 요청 | rfp_ref(검증 배지는 상세에서만) |
| 담당 | 이름 또는 "미지정" |
| 플래그 | DEMO, 의심, 알림 실패, 익명화 |

360px에서는 카드 레이아웃입니다: 1줄 REF·P·상태, 2줄 요약, 3줄 유형·페이지·경과 시간.

**SLA 표시**(SOP 기준값, 운영하면서 조정):

| P | 정의 | 착수 기준 | 표시 |
|---|---|---|---|
| P1 | 견적 요청·제안 선택·비딩 제출 같은 핵심 흐름이 막힘, 개인정보 노출, 여러 사용자에게 영향 | 접수 후 4영업시간 안에 in_progress | 넘으면 빨간 "착수 지연" |
| P2 | 기능 오류지만 우회할 수 있음, 특정 요청의 진행이 늦어질 우려 | 1영업일 | 앰버 |
| P3 | 사소한 오류·문구·작은 개선 | 주간 정리에서 | — |
| P4 | 아이디어·참고 | 주간 정리에서 검토 | — |
| (신규) | 분류 전 | 1영업일 안에 triaged | 넘으면 "분류 지연" |

**연결 지점:**

```
// SUPABASE(list): GET /rest/v1/feedback?select=id,ref,created_at,category,subcode,priority,status,
//   user_type,page_path,ui_state,rfp_ref,assignee,reply_email,is_demo,is_suspect,
//   ops_mail_status,anonymized_at,content
//   &status=in.(new,triaged,in_progress,on_hold)&is_demo=eq.false&order=created_at.desc&limit=50&offset=0
//   (본문은 목록에서 60자만 쓰지만 PostgREST로 자를 수 없으므로 전체를 받음. 1만 건 이상이면 view로 left(content,80))
// SUPABASE(counts): 상태별 HEAD 요청 + Prefer: count=exact (5회) 또는 RPC feedback_counts(filters jsonb)
// SUPABASE(operators): RPC feedback_operators() → [{id, name}]  (TODO: 기존 admin의 운영자 목록 소스와 통합)
```

### 5.2 상세 `admin/feedback-detail.html?id=`

레이아웃: 데스크톱은 2열(왼쪽: 본문·처리, 오른쪽: 컨텍스트 패널), 모바일은 1열(본문 → 처리 → 컨텍스트 → 기록 순).

**헤더:** REF(복사 버튼), 상태 칩, P 칩, 플래그, 접수 시각(KST), `source`(위젯/문의 폼)

**본문 카드:**
- `white-space: pre-wrap`, 텍스트로만 렌더링합니다(`textContent`). URL을 자동으로 링크로 바꾸지 않습니다(피싱 방지).
- 회신 이메일이 있으면 두 가지 방법을 보여줍니다.
  - 주 방법: "메일함에서 `{REF}`로 검색해 알림 메일에 답장하세요." (스레드가 유지됨)
  - 보조: `mailto:{reply_email}?subject=Re: [MICEGO 피드백] {REF}` 링크
- 회신 이메일이 없으면 "회신 이메일 없음 — 답장할 수 없습니다"
- contact 행이면 이름도 표시합니다.

**처리 패널:**

| 필드 | UI | 저장 방식 |
|---|---|---|
| 대분류 | 세그먼트(SYS/OPS/ETC) | 직접 UPDATE. 바꾸면 하위 코드를 null로 초기화 |
| 하위 코드 | 대분류에 따라 달라지는 select(ETC면 비활성) | 직접 UPDATE |
| 우선순위 | P1~P4 세그먼트, 각 버튼에 5.1 정의 툴팁 | 직접 UPDATE |
| 담당 | 운영자 select, "나에게 배정" 버튼 | 직접 UPDATE |
| 상태 버튼 | 현재 상태에서 **허용된 전이만** 표시(아래 표) | RPC `feedback_set_status` |
| 처리 결과 | 완료로 바꿀 때 뜨는 모달에서 select | RPC 인자 |
| 메모 | 텍스트 영역 + "메모 남기기" | INSERT `feedback_note` |

```
// SUPABASE(triage): PATCH /rest/v1/feedback?id=eq.{id}  body {priority, subcode, category, assignee}
//   Prefer: return=representation
// SUPABASE(status): POST /rest/v1/rpc/feedback_set_status {p_id, p_to, p_resolution, p_note}
// SUPABASE(note):   POST /rest/v1/feedback_note {feedback_id, body}
// SUPABASE(retry):  POST {supabaseUrl}/functions/v1/feedback-mail-retry {id}  Authorization: Bearer <operator JWT>
```

**상태 전이 가드**(UI와 RPC가 같은 규칙, 버튼이 비활성일 때는 이유를 버튼 아래 문구로 표시):

| 현재 → 다음 | 버튼 이름 | 가드 | 비활성 문구 |
|---|---|---|---|
| 신규 → 분류됨 | 분류 완료 | P 지정 + (ETC가 아니면 하위 코드) | "우선순위와 하위 분류를 먼저 정해 주세요." |
| 신규 → 완료 | 바로 종료 | 결과 ∈ {스팸, 중복, 조치 없음} | (모달에서 이 셋만 선택 가능) |
| 분류됨 → 처리 중 | 처리 시작 | 담당 지정 | "담당자를 먼저 지정해 주세요." |
| 분류됨·처리 중 → 보류 | 보류 | 보류 사유 메모 필수 | (모달의 사유 입력이 필수) |
| 분류됨·처리 중·보류 → 완료 | 완료 | 처리 결과 필수 | (모달에서 필수) |
| 보류 → 처리 중 | 다시 진행 | 담당 지정 | 위와 같음 |
| 완료 → 처리 중 | 다시 열기 | 재오픈 사유 메모 필수, 결과는 초기화 | (모달) |

RPC 오류 키 `GUARD_*`, `INVALID_TRANSITION`은 위 문구로 매핑하고, `forbidden`은 "권한이 없습니다. 다시 로그인해 주세요."로 표시합니다.

**컨텍스트 패널**(라벨-값 목록):
- 보낸 사람: 유저 유형. 회원이면 `회원 · {이름}` → `member.html?id=`로 연결 (`SUPABASE: member_id로 회원 프로필 조회`)
- 페이지: page_path(새 탭 링크, 쿼리 없이), 화면 상태
- 연결 요청: `feedback_resolve_rfp` 결과
  - `verified`: 녹색 "요청번호·링크 일치"와 `rfp.html?ref=`
  - `ref_only`: 회색 "화면에서 보낸 요청번호(링크로 확인 안 됨)"
  - `mismatch`: 빨간 "요청번호와 접속 링크가 다른 요청을 가리킵니다"와 두 요청 모두 표시
  - `token_only`: 후보 요청들(2건 이상이면 "후보 N건")
  - bid 링크면 호텔 이름도 표시
- 링크 종류: 추적 / 공유(보기 전용) / 호텔 비딩. 해시 앞 8자는 접힌 "기술 정보"에만 둡니다.
- 모드·언어, 브라우저, 화면 크기, 시간대, 빌드, 이전 페이지
- 최근 JS 오류: 최대 3건, 모노 폰트, 펼치기
- 메일: 운영 알림 상태·시도 횟수·오류, 확인 메일 상태. 실패면 [알림 다시 보내기]
- 기술 정보(접힘): 체류 시간, 클라이언트 시각과 서버 시각의 차이, 의심 사유, `client_submission_id`
- 익명화된 행이면 패널 위에 "12개월이 지나 개인정보를 지웠습니다"를 표시하고 빈 값은 "—"

**기록 타임라인:** `feedback_note`와 `feedback_event`를 시간순으로 합쳐 보여줍니다(누가, 언제, 무엇을 → 무엇으로).

### 5.3 mock 데이터 (`MOCK.feedback`, 13건 — 원문 제목의 '12건'은 오기, 표·시드는 13건)

| # | 상태 | 유형 | 유저 유형 | 특징 |
|---|---|---|---|---|
| 1 | new | SYS | organizer_guest | track `delivered`, MG-2610-014, **verified**, 회신 이메일 있음, JS 오류 2건 |
| 2 | new | OPS | hotel | bid, 호텔 담당자 이메일 프리필, **token_only** |
| 3 | new | ETC | visitor | 회신 이메일 없음, 분류 지연(2일 경과) |
| 4 | new | SYS | visitor | **의심**(URL 5개), 알림 skipped |
| 5 | triaged | SYS·TEXT | travel_agency | P3, 담당 미지정, 김지은(m1) |
| 6 | in_progress | SYS·BUG | organizer_guest | **P1**, 착수 1시간, 카카오 인앱 UA |
| 7 | in_progress | OPS·RFP | travel_agency | P2, **mismatch**(MG-2610-017이지만 토큰은 014) |
| 8 | on_hold | SYS·IDEA | hotel | P4, 보류 사유 메모 |
| 9 | done | OPS·ACCT | travel_agency | answered, 메모 2건, 기록 5건 |
| 10 | done | SYS | visitor | new에서 바로 spam |
| 11 | new | OPS | visitor | **source=contact**, 이름 있음, 운영 알림 **failed**(3회) |
| 12 | new | SYS | organizer_guest | **DEMO**(`preview:bidding`), 기본 필터에서 숨김 |
| (+1) | done | SYS·BUG | visitor | **익명화됨**(2025-09 접수) |

---

## 6. 보안·개인정보 체크리스트

| # | 항목 | 설계 반영 위치 |
|---|---|---|
| S1 | anon·authenticated에 `feedback*` INSERT 권한 없음, 기본 GRANT 회수 | 2.8 |
| S2 | 새 함수의 기본 EXECUTE를 회수하고 필요한 것만 GRANT | 2.8 |
| S3 | operator 판정은 `app_metadata.role`만 사용(`user_metadata` 금지) | 2.7 |
| S4 | 역할 회수는 JWT 만료(≤1시간) 뒤에 반영됨. 긴급하면 해당 사용자의 세션을 강제 종료(`auth.admin.signOut`) | 운영 절차 |
| S5 | 서비스 롤 키는 Edge Function 환경변수에만 둠. 정적 사이트·저장소·크론 SQL에 두지 않음(크론은 Vault 비밀값 참조) | 3.1, 2.12 |
| S6 | IP 원문 비저장, HMAC(pepper), 48시간 보관 | 3.5 |
| S7 | 토큰 원문은 전송·저장하지 않음. 본문·오류·referrer에서 토큰 URL과 JWT를 마스킹 | 3.6, 4.4 |
| S8 | member_id는 서버가 JWT로 판정, 클라이언트 값 없음 | 3.3, 4.5 |
| S9 | 메일 헤더 인젝션 차단(이메일 정규식, 제목 CR·LF 제거, Resend JSON API 사용) | 3.6, 3.9 |
| S10 | 확인 메일에 사용자 본문을 넣지 않고, 수신자별 하루 3건 상한 | 3.9, D7 |
| S11 | 운영 알림 HTML 이스케이프, 콘솔 본문 `textContent`로 렌더링, 자동 링크 금지 | 3.9, 5.2 |
| S12 | 회신 이메일 수집 동의(시각 저장), 개인정보처리방침에 "의견 접수" 항목 추가: 수집 항목(회신 이메일·이름·자동 컨텍스트), 목적(회신·오류 개선), 보유 기간(12개월 후 익명화), IP 미저장 명시 — `TODO(legal)` | D6, 8장 |
| S13 | 12개월 익명화, DEMO 30일 삭제, 레이트 48시간 삭제 크론 | 2.12 |
| S14 | 레이트리밋·전체 일일 상한·알림 상한·16KB 본문 상한·허니팟·URL 의심 판정 | 3.3 |
| S15 | CORS는 허용 목록에서 echo, credentials 없음. 보안 경계로 간주하지 않음 | 3.7 |
| S16 | 위젯은 서드파티 스크립트 없음, `eval`·`innerHTML`에 사용자 값 금지(템플릿은 고정 문자열, 값은 `textContent`) | 4 |
| S17 | 콘솔 페이지는 `noindex,nofollow`, robots Disallow `/admin/` 유지 | 기존 규칙 |
| S18 | 추적 분석 도구(GA4 등)가 도입되면 위젯 이벤트에 본문·이메일을 보내지 않음(열기·제출 성공 여부만) | 향후 |
| S19 | Resend 발신 도메인 SPF·DKIM·DMARC 설정 후 운영 — `TODO(infra)` | 3.9 |
| S20 | 함수 로그에 본문·이메일·토큰·IP를 남기지 않음(REF와 오류 코드만) | 3.3 |

---

## 7. 자체 검증

설계를 공격자, 카카오 인앱 사용자, 운영자 관점에서 차례로 점검했습니다. 발견한 문제와 처리 결과입니다.

| # | 발견한 문제 | 영향 | 수정 | 반영 |
|---|---|---|---|---|
| F-1 **(a) 익명 남용** | IP 기준 한도만 있으면 여러 IP(프록시, 모바일망 순환)로 우회해 ① 운영 메일함을 폭격하거나 ② **남의 이메일을 회신 주소로 넣어 우리 도메인으로 스팸을 중계**하거나 ③ DB를 채울 수 있습니다. | 도메인 평판 하락, 운영 마비 | ② 확인 메일에 본문을 넣지 않음(D7) + 수신자별 하루 3건 + suspect·demo는 발송 안 함. ① 운영 알림 일일 상한(150) 뒤에는 상한 도달 메일 1통만. ③ 전체 일일 상한(500)이면 503 + 폴백 안내. 추가로 Origin 허용 목록, 16KB 상한, 허니팟은 가짜 성공, IPv6는 /64로 묶음. **남은 위험:** 끈질긴 공격자는 하루 500건까지 콘솔을 어지럽힐 수 있습니다. 관측되면 Turnstile을 켜는 스위치(`FEEDBACK_REQUIRE_CAPTCHA`)를 2단계로 둡니다(위젯은 토큰 필드만 예약). | 반영 |
| F-2 | IP를 `x-forwarded-for` 첫 값에서 가져오면 클라이언트가 헤더를 직접 붙여 **매 요청마다 다른 IP로 위장**할 수 있습니다. | 레이트리밋 무력화 | `cf-connecting-ip` → `x-real-ip` → XFF 순서로 정하고, 스테이징에서 헤더 구성을 확인한 뒤 고정하는 작업을 `TODO(infra)`로 명시. 추가로 전체 일일 상한이 최후 방어선입니다. | 반영(확인 작업 남음) |
| F-3 **(b) member_id 위조** | 초안처럼 클라이언트가 `member_id`를 보내면 누구나 다른 회원 이름으로 제보할 수 있고, 콘솔이 그 회원 페이지로 연결됩니다. | 운영자 오판, 사칭 | 클라이언트 필드를 삭제하고, 세션 JWT를 본문으로 받아 `auth.getUser`로 검증(D3). 실패하면 조용히 비회원 처리. `user_type`도 서버가 다시 판정하고, admin은 operator JWT가 있을 때만. `rfp_ref`도 위조할 수 있으므로 콘솔에서 토큰 해시와 교차 검증해 `mismatch`를 표시합니다. | 반영 |
| F-4 **(c) 카카오 인앱 fetch/CORS** | 확정 결정의 "anonKey로 Supabase 호출"을 그대로 구현하면 `apikey`·`Authorization` 헤더 때문에 **preflight(OPTIONS)**가 생깁니다. 인앱 WebView, 사내 프록시, 느린 망에서 요청이 두 번 왕복하고 실패 지점이 늘어납니다. mailto 폴백도 카카오에서는 대개 열리지 않습니다. | 제출 유실 | CORS 단순 요청(text/plain, 커스텀 헤더 없음, D1)으로 preflight를 없애고 `verify_jwt=false`(D2). 오류 응답에도 ACAO를 붙여 코드를 읽을 수 있게 함. 인앱 UA면 폴백 순서를 복사 → 문의 페이지 → 메일로. `crypto.subtle`이 없는 환경이면 토큰 해시만 생략하고 제출은 진행. **남은 작업:** 안드로이드·iOS 카카오 실기기 QA(사이트맵 점검표의 B 항목과 같이 진행). | 반영 |
| F-5 **(d) 제출 중 페이지 이탈** | 제출하자마자 탭을 닫거나 링크로 이동하면 일반 fetch는 취소되고, 사용자는 접수됐는지 모릅니다. | 유실 또는 불안해서 중복 제출 | `keepalive: true`로 이동한 뒤에도 요청이 끝나게 함. submitting 동안 `beforeunload` 경고. 보내기 전에 `mgfb:pending`(csid 포함)을 저장해 두고, 다음에 열 때 "결과를 확인하지 못했다" 배너와 [다시 보내기] 제공 → 같은 csid이므로 서버가 기존 REF를 돌려줌. sessionStorage는 탭 단위라 탭을 닫으면 사라지는 한계가 있고, 그 경우 keepalive에 의존합니다. | 반영 |
| F-6 **(e) 이중 제출** | 더블 탭, 느린 응답 중 재클릭, 타임아웃 후 재시도, 이탈 후 재전송 | 중복 행, 중복 알림 | 3중 방어: ① 상태 머신(submitting에서 SUBMIT 무시, 버튼 disabled) ② `client_submission_id` UNIQUE(재전송하면 200 + 같은 REF) ③ 24시간 내 같은 본문 해시면 409. 메일도 `mail_lease_until` 임대와 Resend `Idempotency-Key`로 중복 발송을 막습니다. | 반영 |
| F-7 **(f) 토큰 해시만으로 RFP 연결이 되는가** | 된다고 하려면 두 조건이 필요합니다. ① 토큰 테이블이 **salt 없는 SHA-256 hex**를 저장해야 합니다. HMAC·pepper 방식이면 클라이언트가 같은 값을 만들 수 없습니다. ② 앞 8자(32비트)는 유일하지 않습니다. 토큰이 N개면 우연히 겹칠 확률이 대략 N/2^32(1만 개일 때 약 0.0002%)라 드물지만 0이 아닙니다. | 연결 실패나 오연결 | `feedback_resolve_rfp`가 후보를 **모두** 돌려주고 콘솔은 "후보 N건"으로 표시(2.11). 1차 연결 수단은 화면이 알고 있는 `rfp_ref`이고, 해시는 **검증용**입니다(verified/mismatch 판정). 토큰 테이블의 `token_sha256` 컬럼과 `left(…,8)` 인덱스를 상태전이 시스템의 요구사항으로 명시. **대안(①을 못 맞출 경우):** 서버가 원문 토큰을 받아 즉시 pepper HMAC으로 대조하고 `rfp_id`만 저장하는 방식이 있습니다. 다만 확정 결정("원문 금지")과 충돌하므로 채택하지 않았고, 필요하면 결정 변경이 필요합니다. | 반영(외부 합의 필요) |
| F-8 | 운영 URL에 `?state=`가 붙은 링크(스테이징에서 복사된 링크 등)로 들어온 실제 사용자의 제보가 `is_demo=true`로 저장되어 **알림 없이 묻힙니다**. | 실제 제보 누락 | `is_demo`는 서버가 Origin으로만 판정(D4). 클라이언트 힌트는 화면 안내에만 사용. | 반영 |
| F-9 | 확정 결정의 "`anonKey`로 REST/RPC 호출"과 "Edge Function 단일 진입점"이 서로 맞지 않습니다. 위젯이 RPC를 부르려면 anon에게 권한이 있어야 하는데, 그러면 단일 진입점이 깨집니다. | 설계 모순 | 위젯은 Edge Function만 호출하고, `anonKey`는 설정 계약에 남기되 MVP에서 쓰지 않는다고 명시(D2). | 반영(결정 문구 정정 필요) |
| F-10 | 사용자가 추적 링크 전체(`…/track.html?t=…`)를 본문에 붙여 넣으면 **유효한 토큰이 운영 메일과 DB에 평문으로** 남습니다. 오류 메시지와 referrer에도 같은 위험이 있습니다. | 요청 정보 노출 | 서버 `maskSecrets`로 `t`·`s`·`token` 파라미터와 JWT 패턴을 `[token]`/`[jwt]`로 치환. 위젯도 같은 마스킹을 먼저 적용하고, referrer는 경로만 보냄. | 반영 |
| F-11 | 최소 체류 3초를 서버에서 거부 조건으로 쓰면, 내용을 붙여 넣고 바로 보내는 사람이 막힙니다. 반대로 클라이언트 값이라 봇은 쉽게 속입니다. | 정상 사용자 거부 | 클라이언트는 3초 전에 버튼만 비활성(거부 문구 없음). 서버는 3초 미만이면 거부하지 않고 suspect 'fast'로 저장해 알림을 보류. | 반영 |
| F-12 | 회신 이메일(개인정보)을 동의 없이 수집하면 개인정보보호법 위반 소지가 있습니다. | 법적 위험 | 이메일을 입력하면 동의 체크박스가 필수로 나타나고, 동의 시각을 저장(D6). 보유 기간 12개월을 명시. 문구는 `TODO(legal)`. | 반영(법무 확인 남음) |
| F-13 | 콘솔이 PostgREST로 `status`를 직접 PATCH하면 전이 가드(담당 필수, 보류 사유)를 우회합니다. | 데이터 일관성 | `status` 컬럼은 GRANT에서 제외하고 RPC로만 변경(D8). 트리거가 전이 그래프를 한 번 더 검사. | 반영 |
| F-14 | 메일 발송 도중 함수가 종료되거나(waitUntil 시간 초과), 발송은 성공했는데 응답만 타임아웃되면 재시도에서 **메일이 두 번** 나갑니다. | 중복 알림 | 재시도 함수는 임대가 끝난 행만 가져감. Resend Idempotency-Key(`fb-ops-{id}`)로 같은 발송을 거부. `TODO(infra)`: 구현할 때 Resend의 멱등 키 지원 범위(보관 기간)를 확인합니다. | 반영 |
| F-15 | 런처가 랜딩의 모바일 스티키 CTA와 bid 하단 제출 바를 가리고, 안전 영역이 두 번 더해져 너무 높게 뜹니다. | 전환율 하락 | `data-mg-fixed-bottom` 표식과 오프셋 계산, 오프셋이 있으면 safe-area를 0으로(4.9). 입력 포커스 중에는 숨김. | 반영 |
| F-16 | `defer`로 로드되는 위젯은 HTML 파싱 중에 난 초기 오류를 놓칩니다. 정작 "화면이 안 나와요" 제보에 필요한 오류입니다. | 진단 정보 부족 | 선택 헤드 스니펫(`__mgfbEarly`) 한 줄을 빌드가 삽입(4.4). | 반영 |
| F-17 | 기존 Playwright 검증(h1 1개, 가로 넘침 없음, 콘솔 오류 0)이 위젯 추가로 깨질 수 있습니다. | 회귀 | Shadow DOM 안에서는 `h2`만 사용(문서 쿼리에 잡히지 않음), 고정 위치 요소는 `max-width:100vw`, 네트워크 요청은 열 때만. `verify_feedback.py`로 기존 스위트와 같이 실행. | 반영 |
| F-18 | REF의 날짜를 UTC로 만들면 한국 시간 00:00~09:00 접수분의 날짜가 하루 앞으로 찍혀 운영자가 혼동합니다. | 혼동 | `now() at time zone 'Asia/Seoul'`(2.5). | 반영 |

---

## 8. 구현 파일 목록

| 파일 | 책임 |
|---|---|
| `supabase/migrations/20261001000000_feedback.sql` | enum, `feedback`·`feedback_note`·`feedback_event`·`private.feedback_rate_event`, 인덱스, 트리거(REF·updated_at·가드·감사), RPC(`feedback_set_status`, `feedback_rate_hit`, `feedback_claim_mail`, `feedback_resolve_rfp`, `feedback_operators`, `feedback_anonymize`, `feedback_purge_demo`, `feedback_rate_purge`), RLS·GRANT·REVOKE |
| `supabase/migrations/20261001000100_feedback_cron.sql` | pg_cron 4종과 Vault 비밀값 참조(메일 재시도 호출 포함) |
| `supabase/config.toml` | 두 함수의 `verify_jwt = false` |
| `supabase/functions/feedback-submit/index.ts` | 3.3절 처리 순서 전체(유일한 INSERT 경로) |
| `supabase/functions/feedback-submit/validate.ts` | 요청 스키마 검증, 정규화, `dedupNormalize`, `countUrls` |
| `supabase/functions/feedback-submit/validate_test.ts` | 검증·마스킹·유저 유형 판정 단위 테스트(deno test) |
| `supabase/functions/feedback-mail-retry/index.ts` | 크론 배치와 운영자 단건 재발송, 임대 기반 재시도 |
| `supabase/functions/_shared/cors.ts` | Origin 허용 목록, prod/staging 판정, CORS 헤더 |
| `supabase/functions/_shared/ip.ts` | IP 추출 우선순위, IPv6 /64, HMAC 해시 |
| `supabase/functions/_shared/sanitize.ts` | `maskSecrets`, 제목 정리, HTML 이스케이프, 문자열 절단 |
| `supabase/functions/_shared/auth.ts` | access token 검증 → `{memberId, isOperator}` |
| `supabase/functions/_shared/mail.ts` | Resend 호출(멱등 키, 태그), 결과를 행 상태로 기록 |
| `supabase/functions/_shared/feedback-templates.ts` | 운영 알림·접수 확인 메일 제목과 본문(ko/en, text와 html), 유형·유저 라벨 |
| `assets/feedback.js` | 위젯 전체: 오류 수집, 컨텍스트, Shadow DOM UI, 상태 머신, 접근성, 폴백, `MICEGO_FB` API, 스타일 주입 |
| `assets/site-config.js` | 환경별 `window.MICEGO_FEEDBACK`(빌드가 생성, 운영과 스테이징 값 분리) |
| `build.py` / `build2.py` (수정) | 모든 대상 페이지에 설정·위젯 스크립트, 헤드 오류 스니펫, 푸터 `data-mg-feedback-open` 링크와 `<noscript>`, 하단 고정 요소에 `data-mg-fixed-bottom`, `<meta name="micego-build">` 삽입 |
| `ko/track.html`, `en/bid.html`의 페이지 스크립트 (수정) | 데이터 로드 뒤와 상태가 바뀔 때마다 `window.MICEGO_PAGE_STATE` 갱신(bid는 `prefillEmail` 포함) |
| `ko/contact.html`, `en/contact.html` (수정) | 폼을 `MICEGO_FB.submit`으로 연결, 동의·허니팟, 성공 화면에 REF, JS가 없으면 기존 mailto 유지, `data-mgfb-launcher="off"` |
| `ko/privacy.html`, `en/privacy.html` (수정) | "의견 접수" 수집 항목·목적·보유 기간(12개월)·IP 미저장 추가 — `TODO(legal)` |
| `admin/feedback.html` | 목록 화면(필터, 정렬, 요약 칩, 모바일 카드, 주간 정리 프리셋) |
| `admin/feedback-detail.html` | 상세 화면(본문, 처리 패널, 전이 버튼과 가드 모달, 컨텍스트, RFP 연결 배지, 기록 타임라인) |
| `admin/feedback-console.js` | 두 콘솔 화면의 로직(mock 기반, `// SUPABASE(id):` 연결 지점 주석, 전이 가드 규칙을 RPC와 같게) |
| `admin/mock-data.js` (수정) | `MOCK.feedback` 13건, `feedbackNotes`, `feedbackEvents`, 운영자 목록 |
| admin 공통 네비게이션 (수정) | "피드백" 메뉴와 신규 건수 배지 |
| `verify_feedback.py` | Playwright 검증: 360/768/1280에서 런처 위치·스티키 CTA와 겹치지 않음, 포커스 트랩·ESC·포커스 복귀, 필드 검증, 3초 전 비활성, 제출 성공(모킹한 응답), 오류 코드별 문구, 폴백 3종, 이중 클릭 시 요청 1건, 보류 제출 재전송 시 같은 csid, noscript 링크, 기존 verify 스위트 0 FAILS |

---

**구현 전 외부 확인이 필요한 항목:** 상태전이 시스템 토큰 테이블의 `token_sha256` 형식(F-7), 게이트웨이 IP 헤더 구성(F-2), Resend 멱등 키 범위와 발신 도메인 인증(F-14, S19), 동의·방침 문구(F-12), 공식 접수 주소(`fallbackEmail`, `FEEDBACK_INBOX`), 사이트 z-index 전수 확인(4.9), 카카오 실기기 QA(F-4).
