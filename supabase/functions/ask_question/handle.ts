import type { Deps } from "../_shared/deps.ts";
import { handleRfpMessage } from "../_shared/rfp_message.ts";

export function handle(req: Request, deps: Deps): Promise<unknown> {
  return handleRfpMessage(req, deps, "question");
}
