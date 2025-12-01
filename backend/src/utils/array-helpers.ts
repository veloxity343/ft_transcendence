// Helper functions to work with JSON arrays in SQLite
export function parseJsonArray(jsonString: string): number[] {
  try {
    return JSON.parse(jsonString) as number[];
  } catch {
    return [];
  }
}

export function stringifyJsonArray(array: number[]): string {
  return JSON.stringify(array);
}

export function addToJsonArray(jsonString: string, value: number): string {
  const array = parseJsonArray(jsonString);
  if (!array.includes(value)) {
    array.push(value);
  }
  return stringifyJsonArray(array);
}

export function removeFromJsonArray(jsonString: string, value: number): string {
  const array = parseJsonArray(jsonString);
  return stringifyJsonArray(array.filter(id => id !== value));
}
