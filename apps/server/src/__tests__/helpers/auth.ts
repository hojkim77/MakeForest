/** Returns the header object that satisfies requireInternalAuth. */
export function internalAuthHeader(): Record<string, string> {
  return { 'x-internal-secret': process.env.INTERNAL_API_SECRET ?? '' };
}
