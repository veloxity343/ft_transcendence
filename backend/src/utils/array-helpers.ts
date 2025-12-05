/**
 * Parse a JSON string array, returning empty array if invalid
 */
export function parseJsonArray(jsonString: string | null | undefined): number[] {
  if (!jsonString) return [];
  
  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed)) {
      return parsed.filter(item => typeof item === 'number');
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Stringify an array to JSON string
 */
export function stringifyJsonArray(arr: number[]): string {
  return JSON.stringify(arr);
}

/**
 * Add an item to a JSON array string
 */
export function addToJsonArray(jsonString: string | null | undefined, item: number): string {
  const arr = parseJsonArray(jsonString);
  if (!arr.includes(item)) {
    arr.push(item);
  }
  return stringifyJsonArray(arr);
}

/**
 * Remove an item from a JSON array string
 */
export function removeFromJsonArray(jsonString: string | null | undefined, item: number): string {
  const arr = parseJsonArray(jsonString);
  const filtered = arr.filter(i => i !== item);
  return stringifyJsonArray(filtered);
}

/**
 * Check if an item exists in a JSON array string
 */
export function isInJsonArray(jsonString: string | null | undefined, item: number): boolean {
  const arr = parseJsonArray(jsonString);
  return arr.includes(item);
}

/**
 * Parse a generic JSON array (for game history, etc.)
 */
export function parseGenericJsonArray<T>(jsonString: string | null | undefined): T[] {
  if (!jsonString) return [];
  
  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Add to generic JSON array
 */
export function addToGenericJsonArray<T>(jsonString: string | null | undefined, item: T, maxLength?: number): string {
  const arr = parseGenericJsonArray<T>(jsonString);
  arr.push(item);
  
  // Optionally limit array size (keep most recent)
  if (maxLength && arr.length > maxLength) {
    arr.splice(0, arr.length - maxLength);
  }
  
  return JSON.stringify(arr);
}
