// Lightweight console logging for following app activity in the terminal
// (Metro / `expo run:android` output).

type MutationPhase = 'start' | 'success' | 'error';

const PHASE_LABEL: Record<MutationPhase, string> = {
  start: '▶ START',
  success: '✔ SUCCESS',
  error: '✘ ERROR',
};

export function logMutation(
  name: string,
  phase: MutationPhase,
  data?: unknown,
): void {
  const header = `[mutation:${name}] ${PHASE_LABEL[phase]} ${new Date().toISOString()}`;

  if (phase === 'error') {
    console.error(header, data);
  } else {
    console.log(header, data);
  }
}
