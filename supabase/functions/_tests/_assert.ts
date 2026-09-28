// jsr.io/std 없이 동작하도록 만든 최소 assert 헬퍼 (이 환경은 jsr.io 직접 접속이 막혀 있다).
export function assert(cond: unknown, msg = "assertion failed"): asserts cond {
  if (!cond) throw new Error(msg);
}

export function assertEquals<T>(actual: T, expected: T, msg?: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(msg ?? `expected ${e}, got ${a}`);
}

export async function assertThrowsAsync(fn: () => Promise<unknown>, msg = "expected throw"): Promise<unknown> {
  try {
    await fn();
  } catch (e) {
    return e;
  }
  throw new Error(msg);
}
