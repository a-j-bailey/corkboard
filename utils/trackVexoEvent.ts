import { customEvent } from 'vexo-analytics';

/**
 * Sends a Vexo custom event in production only (matches vexo() / identifyDevice guards).
 */
export function trackVexoEvent(name: string, args: Record<string, string | number | boolean>): void {
  if (__DEV__) {
    return;
  }
  customEvent(name, args);
}
