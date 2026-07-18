/**
 * Logs de medición de rendimiento (solo servidor / consola).
 * No altera la lógica del chat; solo instrumenta tiempos y conteos.
 */

export type PerfScope = "chat" | "rag" | "ollama";

export type PerfValue = string | number | boolean | null | undefined;

/**
 * ENABLE_PERFORMANCE_LOGS=true|false fuerza on/off.
 * Si no está definida: activa en desarrollo, apagada en producción.
 */
export function isPerformanceLoggingEnabled(): boolean {
  const flag = process.env.ENABLE_PERFORMANCE_LOGS?.trim().toLowerCase();

  if (flag === "true" || flag === "1" || flag === "yes") return true;
  if (flag === "false" || flag === "0" || flag === "no") return false;

  return process.env.NODE_ENV !== "production";
}

/** Id corto para correlacionar logs de una misma petición. */
export function createRequestId(): string {
  return Math.random().toString(36).slice(2, 8);
}

export function nowMs(): number {
  return performance.now();
}

export function elapsedMs(start: number): number {
  return Math.round(performance.now() - start);
}

export function logPerf(
  scope: PerfScope,
  requestId: string,
  event: string,
  data?: Record<string, PerfValue>
): void {
  if (!isPerformanceLoggingEnabled()) return;

  const prefix = `[${scope}:timing][${requestId}]`;

  if (!data) {
    console.log(`${prefix} ${event}`);
    return;
  }

  const parts = Object.entries(data)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(" ");

  console.log(parts ? `${prefix} ${event} ${parts}` : `${prefix} ${event}`);
}
