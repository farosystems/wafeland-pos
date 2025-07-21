import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea un número como moneda, configurable por código de moneda y locale.
 * @param value Monto numérico
 * @param currency Código de moneda (ej: "ARS", "USD")
 * @param locale Locale para formateo (ej: "es-AR", "en-US")
 */
export function formatCurrency(
  value: number | undefined | null,
  currency: string = "ARS",
  locale: string = "es-AR"
): string {
  const safeValue = typeof value === "number" && !isNaN(value) ? value : 0;
  return safeValue.toLocaleString(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export const DEFAULT_CURRENCY = "ARS";
export const DEFAULT_LOCALE = "es-AR";
