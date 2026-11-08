import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type AuthenticatedUser = {
  id: string;
  email?: string;
};

type AuthContext = {
  user: AuthenticatedUser;
  supabase: ReturnType<typeof createClient>;
};

export async function requireAuthContext(authHeader: string | null): Promise<AuthContext> {
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

  return {
    user: { id: user.id, email: user.email ?? undefined },
    supabase,
  };
}

export async function requireUser(authHeader: string | null): Promise<AuthenticatedUser> {
  const { user } = await requireAuthContext(authHeader);
  return user;
}
