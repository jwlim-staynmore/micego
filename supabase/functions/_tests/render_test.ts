import { assert, assertEquals } from "./_assert.ts";
import { allTemplateIds, getTemplate, sampleVars, renderEmail, renderAlimtalk, renderSms, eucKrBytes } from "../_shared/notify/render.ts";

Deno.test("every template renders with sample values and leaves no {{ (email/alimtalk/sms)", () => {
  for (const id of allTemplateIds()) {
    const def = getTemplate(id)!;
    const vars = sampleVars(def);
    if (def.channels.email) {
      const r = renderEmail(id, vars, "https://micego.kr");
      assert(!/\{\{\w+\}\}/.test(r.html), `${id} email left {{ }}`);
      assert(!/\{\{\w+\}\}/.test(r.subject), `${id} subject left {{ }}`);
      assert(!r.html.includes("https://micego.example"), `${id} did not rewrite base url`);
    }
    if (def.channels.alimtalk) {
      const r = renderAlimtalk(id, vars, "https://micego.kr");
      assert(!/\{\{\w+\}\}/.test(r.body), `${id} alimtalk body left {{ }}`);
      assert(!/\{\{\w+\}\}/.test(r.fallbackBody), `${id} alimtalk fallback left {{ }}`);
    }
    if (def.sms) {
      const r = renderSms(id, vars);
      assert(!/\{\{\w+\}\}/.test(r.body), `${id} sms left {{ }}`);
      assert(r.bytes <= 90, `${id} sms body exceeds 90 EUC-KR bytes: ${r.bytes}`);
    }
  }
});

Deno.test("HTL_INVITE optional REINVITE block only appears when __block_REINVITE is true", () => {
  const def = getTemplate("HTL_INVITE")!;
  const vars = sampleVars(def);
  const withBlock = renderEmail("HTL_INVITE", { ...vars, __block_REINVITE: true }, "https://micego.kr");
  const withoutBlock = renderEmail("HTL_INVITE", { ...vars, __block_REINVITE: false }, "https://micego.kr");
  assert(withBlock.html.length !== withoutBlock.html.length, "REINVITE block should change output length");
});

Deno.test("ORG_REBID uses subject_round2 when ROUND >= 2", () => {
  const def = getTemplate("ORG_REBID");
  if (def?.email?.subject_round2) {
    const vars = sampleVars(def);
    const r1 = renderEmail("ORG_REBID", { ...vars, ROUND: 1 }, "https://micego.kr");
    const r2 = renderEmail("ORG_REBID", { ...vars, ROUND: 2 }, "https://micego.kr");
    assert(r1.subject !== r2.subject || def.email.subject === def.email.subject_round2, "round2 subject should differ");
  }
});

Deno.test("eucKrBytes counts Korean as 2 bytes, ASCII as 1", () => {
  assertEquals(eucKrBytes("ab"), 2);
  assertEquals(eucKrBytes("가"), 2);
  assertEquals(eucKrBytes("a가"), 3);
});
