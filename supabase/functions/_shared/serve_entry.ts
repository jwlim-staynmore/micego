// 모든 index.ts 가 공유하는 진입점 보일러플레이트.
import { defaultDeps, Deps } from "./deps.ts";
import { serve } from "./http.ts";

export function makeEntry(handle: (req: Request, deps: Deps) => Promise<unknown>) {
  const origins = (Deno.env.get("SITE_ORIGINS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const notifyModeLog = Deno.env.get("NOTIFY_MODE") === "log";
  Deno.serve((req) => serve(req, { allowedOrigins: origins, notifyModeLog }, (r) => handle(r, defaultDeps())));
}
