// 토큰 생성. 형식: ^[A-Za-z0-9_-]{4,64}$ (SPEC_LAUNCH.md §3 "Tokens").
export function randomToken(rand: (n: number) => Uint8Array, nbytes = 24, prefix = ""): string {
  const bytes = rand(nbytes);
  let b64 = btoa(String.fromCharCode(...bytes));
  b64 = b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return prefix + b64;
}

export function isShareToken(token: string): boolean {
  return token.startsWith("s_");
}
