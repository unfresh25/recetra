/** Extracts an invitation token from a pasted link or a bare token. */
export function parseInviteToken(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  const match = value.match(/\/invite\/([A-Za-z0-9_-]+)/);
  const token = match ? match[1] : value;
  return /^[A-Za-z0-9_-]{16,64}$/.test(token) ? token : null;
}
