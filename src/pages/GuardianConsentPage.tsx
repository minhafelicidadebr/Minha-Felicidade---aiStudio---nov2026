import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Sparkles, Clock, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getSafeRedirectPath } from "@/lib/redirect";
import { GUARDIAN_CONSENT_STATEMENT } from "@/lib/guardian-consent";

interface ConsentStatusPayload {
  reason?: string;
  has_pending_request?: boolean;
  pending_expires_at?: string | null;
  pending_guardian_name?: string | null;
}

/**
 * Fallback de RequireGuardianConsent: alcançada quando uma conta menor de
 * idade tem sessão ativa mas o consentimento não está válido (nunca pedido,
 * recusado, revogado ou pendente de reconsentimento).
 *
 * TRUST-1.6 (R06): esta página NÃO grava consentimento — ela só cria/reenvia
 * o REQUEST (create_guardian_consent_request). A decisão real acontece na
 * tela do responsável, pelo link enviado ao e-mail dele
 * (GuardianDecisionPage, alcançada por token, sem exigir conta).
 */
export default function GuardianConsentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const redirectPath = getSafeRedirectPath(searchParams.get("redirect"));

  const [guardianName, setGuardianName] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [ack, setAck] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [status, setStatus] = useState<ConsentStatusPayload | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.rpc("get_my_guardian_consent_status").then(({ data, error }) => {
      if (!active) return;
      if (!error && data && typeof data === "object") setStatus(data as unknown as ConsentStatusPayload);
      setCheckingStatus(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.rpc("create_guardian_consent_request", {
        _guardian_name: guardianName,
        _guardian_email: guardianEmail,
      });
      if (error) throw error;
      setSent(true);
      toast({
        title: "Pedido registrado 💌",
        description: "O e-mail foi colocado na fila de notificações. A entrega depende do serviço de envio.",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast({ title: "Erro ao enviar", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const reasonMessage: Record<string, string> = {
    minor_pending: "Ainda não recebemos a autorização do responsável.",
    minor_declined: "O responsável indicado não autorizou o uso da plataforma nesta data.",
    minor_revoked: "A autorização anterior foi retirada pelo responsável.",
    reconsent_required: "Nossa política de dados foi atualizada — pedimos que o responsável confirme novamente sob o termo vigente.",
  };

  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" role="status" aria-live="polite">
        <div className="w-10 h-10 rounded-full border-2 border-primary/25 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="bg-card rounded-3xl border border-border p-8 shadow-warm">
          <div className="flex items-center gap-2 text-primary mb-1">
            <ShieldCheck className="w-5 h-5" />
            <h1 className="font-display font-bold text-lg">Autorização do responsável</h1>
          </div>

          {status?.reason && reasonMessage[status.reason] && (
            <p className="text-xs text-muted-foreground mt-1 mb-2">{reasonMessage[status.reason]}</p>
          )}

          {status?.has_pending_request && !sent ? (
            <div className="flex items-start gap-2.5 text-xs text-foreground bg-muted rounded-xl p-3.5 mt-3 mb-6">
              <Clock className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
              <span>
                Já enviamos um link para {status.pending_guardian_name || "o responsável indicado"}.
                Se ele(a) não recebeu, você pode enviar um novo abaixo — o link anterior deixa de valer.
              </span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-1 mb-6">
              Como você tem menos de 18 anos, a lei (LGPD, art. 14) exige a autorização de um pai, mãe ou
              responsável legal. Enviaremos um link para o e-mail informado — é o responsável, pelo
              próprio e-mail, quem confirma a autorização.
            </p>
          )}

          {sent ? (
            <div className="text-center py-4">
              <span className="text-3xl mb-2 block">💌</span>
              <p className="text-sm font-display font-bold">Pedido colocado na fila</p>
              <p className="text-xs text-muted-foreground mt-1">
                Avise {guardianName || "seu responsável"} para verificar o e-mail. A mensagem pode levar alguns instantes para chegar.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Nome do responsável</label>
                <input type="text" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} placeholder="Nome completo do responsável" className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" required />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">E-mail do responsável</label>
                <input type="email" value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)} placeholder="responsavel@email.com" className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" required />
              </div>
              <p className="text-xs text-foreground bg-muted rounded-xl p-3.5">
                O responsável verá este termo antes de decidir: <span className="italic">{GUARDIAN_CONSENT_STATEMENT}</span>
              </p>
              <label className="flex items-start gap-2.5 text-xs text-foreground cursor-pointer">
                <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 w-4 h-4 accent-primary shrink-0" required />
                <span>Confirmo que os dados acima são de um pai, mãe ou responsável legal real.</span>
              </label>
              <button type="submit" disabled={loading || !ack} className="w-full py-3.5 rounded-xl gradient-institute text-primary-foreground font-semibold text-sm shadow-warm hover:shadow-glow transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <><Sparkles className="w-4 h-4" />Enviar link ao responsável</>}
              </button>
            </form>
          )}

          {status?.reason === "minor_declined" && (
            <button
              onClick={() => navigate("/")}
              className="w-full mt-3 py-2.5 rounded-xl bg-muted text-sm font-medium text-muted-foreground flex items-center justify-center gap-2"
            >
              <XCircle className="w-4 h-4" /> Voltar ao início
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
