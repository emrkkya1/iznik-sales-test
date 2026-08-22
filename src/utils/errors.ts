export type ErrorType = 'network' | 'auth' | 'validation' | 'unknown';

const errorMessages: Record<ErrorType, string> = {
  network: 'Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.',
  auth: 'Oturum süresi doldu. Lütfen tekrar giriş yapın.',
  validation: 'Girdiğiniz bilgileri kontrol edin.',
  unknown: 'Bir sorun oluştu. Lütfen tekrar deneyin.',
};

export function getUserMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return errorMessages.network;
    }

    if (message.includes('auth') || message.includes('session') || message.includes('token')) {
      return errorMessages.auth;
    }

    if (message.includes('validation') || message.includes('invalid')) {
      return errorMessages.validation;
    }
  }

  return errorMessages.unknown;
}

export function getErrorMessage(type: ErrorType): string {
  return errorMessages[type];
}
