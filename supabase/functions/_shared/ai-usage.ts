import { requireAuthContext } from "./auth.ts";

type AiUsageResult = {
  allowed: boolean;
  function_name: string;
  usage_date: string;
  limit: number;
  used: number;
  remaining: number;
  reset_at: string;
};

export class AiUsageLimitError extends Error {
  status = 429;
  resetAt?: string;

  constructor(resetAt?: string) {
    super("AI usage limit exceeded");
    this.resetAt = resetAt;
  }
}

export async function enforceAiUsageLimit(authHeader: string | null, functionName: string) {
  const { supabase, user } = await requireAuthContext(authHeader);
  const { data, error } = await supabase.rpc("enforce_ai_usage_limit", {
    _function_name: functionName,
  });

  if (error) {
    throw error;
  }

  const usage = data as AiUsageResult | null;
  if (!usage?.allowed) {
    throw new AiUsageLimitError(usage?.reset_at);
  }

  return { user, usage };
}

export function getEdgeErrorStatus(error: unknown) {
  if (error instanceof Error && error.message === "Authentication required") return 401;
  if (error instanceof AiUsageLimitError) return error.status;
  return 500;
}

export function getEdgeErrorMessage(error: unknown) {
  if (error instanceof AiUsageLimitError) {
    return "Limite diario de IA atingido. Tente novamente apos a proxima janela.";
  }
  return error instanceof Error ? error.message : "Erro desconhecido";
}
