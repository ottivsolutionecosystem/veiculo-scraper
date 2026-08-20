/** Flags do cookie de sessão. Secure só quando a origem pública é HTTPS. */

const MAX_AGE = 60 * 60 * 24 * 14;

export function sessionCookieFlags(webOrigin: string): string {
  const secure = webOrigin.startsWith("https://");
  return `Path=/; Max-Age=${MAX_AGE}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}
