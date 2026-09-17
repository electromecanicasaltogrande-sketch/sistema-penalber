const EMAIL_DOMAIN = "penalber.internal";
const PASSWORD_SUFFIX = "-penalber";

export function usuarioToEmail(usuario: string) {
  return `${usuario.trim().toLowerCase()}@${EMAIL_DOMAIN}`;
}

export function toSupabasePassword(password: string) {
  return `${password}${PASSWORD_SUFFIX}`;
}
