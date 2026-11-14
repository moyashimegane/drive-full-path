const POLL_INTERVAL_MS = 16;

export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Polls `probe` until it returns a non-null value, or rejects after `timeoutMs`. */
export const waitFor = async <T>(probe: () => T | null, timeoutMs: number): Promise<T> => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = probe();
    if (value !== null) return value;
    if (Date.now() >= deadline) throw new Error(`Timed out after ${timeoutMs}ms`);
    await sleep(POLL_INTERVAL_MS);
  }
};
