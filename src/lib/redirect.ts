export function getSafeRedirectPath(redirect: string | null) {
  if (!redirect || !redirect.startsWith("/") || redirect.startsWith("//") || redirect.includes("\\"))
    return "/dashboard";
  if (redirect.startsWith("/auth")) return "/dashboard";
  return redirect;
}
