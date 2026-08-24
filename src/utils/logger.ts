// Lightweight console logging for following app activity in the terminal
// (Metro / `expo run:android` output).

type MutationPhase = 'start' | 'success' | 'error';

const MUTATION_PHASE_LABEL: Record<MutationPhase, string> = {
  start: '▶ START',
  success: '✔ SUCCESS',
  error: '✘ ERROR',
};

export function logMutation(
  name: string,
  phase: MutationPhase,
  data?: unknown,
): void {
  const header = `[mutation:${name}] ${MUTATION_PHASE_LABEL[phase]} ${new Date().toISOString()}`;
  if (phase === 'error') console.error(header, data);
  else console.log(header, data);
}

type QueryPhase = 'fetch' | 'success' | 'error';

const QUERY_PHASE_LABEL: Record<QueryPhase, string> = {
  fetch: '◀ FETCH',
  success: '✔ SUCCESS',
  error: '✘ ERROR',
};

// Queries use a 'fetch' phase instead of 'start' to distinguish from
// mutation lifecycle. RPC names are snake_case to match the server.
export function logQuery(
  name: string,
  phase: QueryPhase,
  data?: unknown,
): void {
  const header = `[query:${name}] ${QUERY_PHASE_LABEL[phase]} ${new Date().toISOString()}`;
  if (phase === 'error') console.error(header, data);
  else console.log(header, data);
}

// Wraps a queryFn so every fetch logs fetch/success/error with a bounded
// payload. Use this from React Query hooks to get consistent terminal
// diagnostics without each hook having to repeat the try/catch dance.
export function instrumentQuery<T>(
  name: string,
  fn: () => Promise<T>,
  summarize?: (result: T) => unknown,
): () => Promise<T> {
  return async () => {
    logQuery(name, 'fetch');
    try {
      const result = await fn();
      logQuery(name, 'success', summarize ? summarize(result) : undefined);
      return result;
    } catch (error) {
      logQuery(name, 'error', error);
      throw error;
    }
  };
}

// Compact payload summarizer for hooks that fetch arrays or RPC payloads.
// Keeps terminal output bounded — full payloads live in the React Query
// cache, not in logs.
export function summarizeResult<T>(result: T): unknown {
  if (Array.isArray(result)) {
    return { count: result.length };
  }
  if (result && typeof result === 'object') {
    const obj = result as Record<string, unknown>;
    return { keys: Object.keys(obj) };
  }
  return undefined;
}