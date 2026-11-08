const DEFAULT_REDIRECT_PATH = "/dashboard";

/**
 * Sanitiza um caminho de redirect vindo da query string.
 *
 * Rejeita destino externo, protocol-relative (`//host`), backslash (`/\host`) e
 * volta para `/auth` (evita loop de login). Fallback configurável para permitir
 * destino role-aware sem abrir espaço para open redirect: o fallback é sempre
 * escolhido pela aplicação, nunca pelo usuário.
 */
export function getSafeRedirectPath(redirect: string | null, fallback: string = DEFAULT_REDIRECT_PATH) {
  const safeFallback = isInternalPath(fallback) ? fallback : DEFAULT_REDIRECT_PATH;

  if (!redirect || !redirect.startsWith("/") || redirect.startsWith("//") || redirect.includes("\\"))
    return safeFallback;
  if (redirect.startsWith("/auth")) return safeFallback;
  return redirect;
}

/** True quando o caminho é interno e seguro para navegação por router. */
export function isInternalPath(path: string | null | undefined): boolean {
  if (!path) return false;
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("\\");
}

/**
 * Entrada canônica autenticada. Resolve o painel do papel em uma única rota
 * (`RoleHomeRedirect`), em vez de espalhar decisão de papel pelas telas.
 */
export const ROLE_HOME_ENTRY_PATH = "/inicio";
