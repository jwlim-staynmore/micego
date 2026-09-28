// 템플릿 렌더러: {{VAR}} 치환, OPTIONAL BLOCK, 라운드별 제목, SITE_BASE_URL 치환, SMS 바이트 제한.
import { TEMPLATES, EMAIL_HTML, TemplateDef } from "../templates.gen.ts";

export class RenderError extends Error {}

// EUC-KR 기준 바이트 수 근사치: ASCII=1바이트, 그 외(한글 등)=2바이트로 센다 (SPEC_LAUNCH.md §4).
export function eucKrBytes(s: string): number {
  let n = 0;
  for (const ch of s) n += ch.codePointAt(0)! > 0x7f ? 2 : 1;
  return n;
}

function stripOptionalBlocks(text: string, vars: Record<string, unknown>): string {
  return text.replace(
    /<!--\s*OPTIONAL BLOCK START:\s*(\w+)[\s\S]*?-->([\s\S]*?)<!--\s*OPTIONAL BLOCK END:\s*\1\s*-->/g,
    (_all, name: string, inner: string) => (vars[`__block_${name}`] ? inner : ""),
  );
}

function replaceVars(text: string, vars: Record<string, unknown>): string {
  const out = text.replace(/\{\{(\w+)\}\}/g, (m, key: string) => {
    if (!(key in vars) || vars[key] === undefined || vars[key] === null) return m; // 남겨서 아래서 감지
    return String(vars[key]);
  });
  const leftover = out.match(/\{\{(\w+)\}\}/);
  if (leftover) throw new RenderError(`missing variable: ${leftover[1]}`);
  return out;
}

function rewriteBaseUrl(text: string, base: string): string {
  return text.split("https://micego.example").join(base);
}

export interface RenderedEmail {
  subject: string;
  html: string;
  preheader: string;
}

export function renderEmail(templateId: string, vars: Record<string, unknown>, baseUrl: string): RenderedEmail {
  const def = TEMPLATES[templateId];
  if (!def?.email) throw new RenderError(`no email template for ${templateId}`);
  const html = EMAIL_HTML[templateId];
  if (!html) throw new RenderError(`no email html for ${templateId}`);
  const round = Number(vars.ROUND ?? 1);
  const subjectTpl = round >= 2 && def.email.subject_round2 ? def.email.subject_round2 : def.email.subject;
  const subject = rewriteBaseUrl(replaceVars(subjectTpl, vars), baseUrl);
  const preheader = rewriteBaseUrl(replaceVars(def.email.preheader ?? "", vars), baseUrl);
  const bodyWithBlocks = stripOptionalBlocks(html, vars);
  const rendered = rewriteBaseUrl(replaceVars(bodyWithBlocks, vars), baseUrl);
  return { subject, html: rendered, preheader };
}

export interface RenderedAlimtalk {
  code: string;
  title: string;
  body: string;
  fallbackTitle: string;
  fallbackBody: string;
  buttons: { name: string; url: string }[];
}

export function renderAlimtalk(templateId: string, vars: Record<string, unknown>, baseUrl: string): RenderedAlimtalk {
  const def = TEMPLATES[templateId];
  if (!def?.alimtalk) throw new RenderError(`no alimtalk template for ${templateId}`);
  const a = def.alimtalk;
  const body = rewriteBaseUrl(replaceVars(stripOptionalBlocks(a.body, vars), vars), baseUrl);
  const fallbackBody = rewriteBaseUrl(replaceVars(stripOptionalBlocks(a.fallback_body, vars), vars), baseUrl);
  const buttons = a.buttons.map((b) => ({ name: b.name, url: rewriteBaseUrl(replaceVars(b.url, vars), baseUrl) }));
  return { code: a.code, title: "", body, fallbackTitle: a.fallback_title, fallbackBody, buttons };
}

export interface RenderedSms {
  body: string;
  bytes: number;
}

export function renderSms(templateId: string, vars: Record<string, unknown>): RenderedSms {
  const def = TEMPLATES[templateId];
  if (!def?.sms) throw new RenderError(`no sms template for ${templateId}`);
  const body = replaceVars(def.sms.body, vars);
  const bytes = eucKrBytes(body);
  if (bytes > (def.sms.limit_bytes ?? 90)) {
    throw new RenderError(`sms body too long: ${bytes} bytes (limit ${def.sms.limit_bytes ?? 90})`);
  }
  return { body, bytes };
}

// 샘플 값으로 전체 템플릿을 렌더링 — 테스트/스모크용 (§8: "every template renders with sample values, no leftover {{").
export function sampleVars(def: TemplateDef): Record<string, unknown> {
  const vars: Record<string, unknown> = { ROUND: 1 };
  for (const v of def.variables) vars[v.key] = v.sample;
  for (const blk of def.email?.optional_blocks ?? []) vars[`__block_${blk}`] = true;
  return vars;
}

export function allTemplateIds(): string[] {
  return Object.keys(TEMPLATES);
}

export function getTemplate(id: string): TemplateDef | undefined {
  return TEMPLATES[id];
}
