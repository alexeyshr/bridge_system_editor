type LogLevel = 'info' | 'warn' | 'error';

type LogPayload = {
  event: string;
  message?: string;
  [key: string]: unknown;
};

function emit(level: LogLevel, payload: LogPayload): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    ...payload,
  };

  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
    return;
  }
  if (level === 'warn') {
    console.warn(line);
    return;
  }
  console.info(line);
}

export function logInfo(payload: LogPayload): void {
  emit('info', payload);
}

export function logWarn(payload: LogPayload): void {
  emit('warn', payload);
}

export function logError(payload: LogPayload): void {
  emit('error', payload);
}
