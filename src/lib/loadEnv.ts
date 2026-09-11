/**
 * Carga .env y .env.local para scripts fuera de Next.js (p. ej. index-docs).
 * Next.js carga estos archivos automáticamente en dev/build; no es necesario
 * importar este módulo desde rutas API ni componentes del servidor Next.
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";

export function loadEnvFiles(): void {
  for (const file of [".env", ".env.local"]) {
    const filePath = join(process.cwd(), file);
    if (!existsSync(filePath)) continue;

    for (const line of readFileSync(filePath, "utf-8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;

      const key = trimmed.slice(0, separator).trim();
      if (!key || process.env[key] !== undefined) continue;

      let value = trimmed.slice(separator + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    }
  }
}
