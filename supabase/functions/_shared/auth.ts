import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type AuthenticatedUser = {
  id: string;
  email?: string;
};

export async function requireUser(authHeader: string | null): Promise<AuthenticatedUser> {
  if (!authHeader) {
    throw new Error("Authentication required");
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Authentication required");
  }

  return { id: user.id, email: user.email ?? undefined };
}
