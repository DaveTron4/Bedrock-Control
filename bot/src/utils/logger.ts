/**
 * Logging utility for consistent error/info formatting
 */

export const Logger = {
  info: (message: string, data?: unknown) => {
    console.log(`[INFO] ${message}`, data ?? '');
  },

  error: (message: string, error?: unknown) => {
    console.error(`[ERROR] ${message}`, error ?? '');
  },

  warn: (message: string, data?: unknown) => {
    console.warn(`[WARN] ${message}`, data ?? '');
  },

  success: (message: string, data?: unknown) => {
    console.log(`[✅] ${message}`, data ?? '');
  },
};

/**
 * Format AWS command responses for Discord
 */
export function formatAWSResponse(state: string): string {
  const stateEmoji: { [key: string]: string } = {
    running: '🟢',
    stopped: '🔴',
    stopping: '🟡',
    pending: '🟡',
  };

  return `${stateEmoji[state] || '⚪'} \`${state.toUpperCase()}\``;
}
