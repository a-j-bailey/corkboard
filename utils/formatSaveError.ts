/**
 * User-facing and dev-detail formatting for errors during event save (Supabase, auth, storage, network).
 */

export type FormattedSaveError = {
  title: string;
  message: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function normalizeMessage(msg: string): string {
  return msg.trim() || 'Something went wrong. Please try again.';
}

/** Network / fetch-style errors (React Native, undici, etc.) */
function isLikelyNetworkError(message: string, name?: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('network request failed') ||
    m.includes('failed to fetch') ||
    m.includes('network error') ||
    m.includes('timeout') ||
    m.includes('timed out') ||
    m.includes('connection') ||
    name === 'TypeError'
  );
}

/**
 * Formats an unknown error for Alert dialogs when saving an event.
 * In __DEV__, appends a compact technical line when code/details are available.
 */
export function formatSaveError(error: unknown): FormattedSaveError {
  const defaultTitle = "Couldn't save event";

  if (error === undefined || error === null) {
    return {
      title: defaultTitle,
      message: normalizeMessage('An unexpected error occurred.'),
    };
  }

  if (typeof error === 'string') {
    return {
      title: defaultTitle,
      message: normalizeMessage(error),
    };
  }

  if (!isRecord(error)) {
    return {
      title: defaultTitle,
      message: normalizeMessage(String(error)),
    };
  }

  const name = readString(error, 'name');
  const rawMessage = readString(error, 'message') ?? '';
  const code = readString(error, 'code');
  const details = readString(error, 'details');
  const hint = readString(error, 'hint');
  const status = typeof error.status === 'number' ? error.status : undefined;

  const combinedLower = `${rawMessage} ${code ?? ''} ${details ?? ''}`.toLowerCase();

  // Explicit app / context errors
  if (
    rawMessage.includes('User must be logged in') ||
    rawMessage.includes('User must be authenticated to upload images')
  ) {
    return {
      title: 'Sign in required',
      message: 'You must be signed in to save events. Please sign in and try again.',
    };
  }

  if (rawMessage.includes('Session expired') || rawMessage.includes('must be authenticated')) {
    return {
      title: 'Session problem',
      message: normalizeMessage(rawMessage),
    };
  }

  // JWT / PostgREST auth
  if (
    code === 'PGRST301' ||
    combinedLower.includes('jwt') ||
    combinedLower.includes('expired') && combinedLower.includes('token')
  ) {
    return {
      title: 'Session expired',
      message: 'Your session may have expired. Please sign in again and try saving.',
    };
  }

  // RLS / permission (Postgres 42501, Supabase hints)
  if (
    code === '42501' ||
    combinedLower.includes('permission denied') ||
    combinedLower.includes('row-level security') ||
    combinedLower.includes('violates row-level security')
  ) {
    return {
      title: 'Permission denied',
      message:
        'You may not have permission to save this event. Try signing out and back in, then try again.',
    };
  }

  // Storage (bucket policy, etc.)
  if (
    name === 'StorageApiError' ||
    name === 'StorageUnknownError' ||
    (rawMessage.length > 0 &&
      (combinedLower.includes('bucket') || combinedLower.includes('storage')))
  ) {
    return {
      title: 'Image upload issue',
      message: normalizeMessage(
        rawMessage || 'There was a problem uploading the poster image. Your event may still be saved without it.'
      ),
    };
  }

  // Network
  if (isLikelyNetworkError(rawMessage, name)) {
    return {
      title: 'Connection problem',
      message:
        'Check your internet connection and try again. If you are online, the server may be temporarily unavailable.',
    };
  }

  // HTTP status from Auth or other APIs
  if (status === 401 || status === 403) {
    return {
      title: status === 401 ? 'Not authorized' : 'Access denied',
      message:
        status === 401
          ? 'Please sign in again and try saving your event.'
          : 'You do not have permission to complete this action.',
    };
  }

  let userMessage = normalizeMessage(rawMessage || 'Something went wrong. Please try again.');

  if (__DEV__ && (code || details || hint)) {
    const parts: string[] = [];
    if (code) parts.push(`code: ${code}`);
    if (details) parts.push(`details: ${details}`);
    if (hint) parts.push(`hint: ${hint}`);
    if (parts.length > 0) {
      userMessage += `\n\nTechnical: ${parts.join(' · ')}`;
    }
  }

  return {
    title: defaultTitle,
    message: userMessage,
  };
}

/**
 * Single-line message for context state (e.g. EventContext error banner).
 */
export function getSaveErrorMessage(error: unknown): string {
  return formatSaveError(error).message;
}
