// lib/npi.ts
// Placeholder — implemented in ST-10.
// Wraps CMS NPI Registry API (server-side only).
// Filtered to taxonomy code 133V00000X (registered dietitian).

export async function searchDietitians(
  _location: string,
  _filters?: Record<string, string>
): Promise<unknown[]> {
  throw new Error('Not implemented — coming in ST-10')
}
