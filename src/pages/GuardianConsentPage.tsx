import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getSafeRedirectPath } from "@/lib/redirect";
import { GUARDIAN_CONSENT_POLICY_VERSION, GUARDIAN_CONSENT_STATEMENT } from "@/lib/guardian-consent";

/**
 * Fallback de RequireGuardianConsent: alcançada quando uma conta menor de
 * idade tem sessão ativa mas nenhum evento de consentimento registrado
 * (aba fechada durante o cadastro, login em outro dispositivo, etc.).
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.rpc("record_guardian_consent", {
        _guardian_name: guardianName,
        _guardian_email: guardianEmail,
        _policy_version: GUARDIAN_CONSENT_POLICY_VERSION,
      });
      if (error) throw error;
      toast({ title: "Autorização confirmada! 🎉" });
      navigate(redirectPath, { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="bg-card rounded-3xl border border-border p-8 shadow-warm">
          <div className="flex items-center gap-2 text-primary mb-1">
            <ShieldCheck className="w-5 h-5" />
            <h1 className="font-display font-bold text-lg">Autorização do responsável</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1 mb-6">
            Como você tem menos de 18 anos, a lei (LGPD, art. 14) exige a autorização de um pai, mãe ou
            responsável legal antes de continuar usando a plataforma. Se nossa política de dados foi
            atualizada desde a última autorização, pedimos que o responsável confirme novamente sob o
            termo vigente.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Nome do responsável</label>
              <input type="text" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} placeholder="Nome completo do responsável" className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" required />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">E-mail do responsável</label>
              <input type="email" value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)} placeholder="responsavel@email.com" className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" required />
            </div>
            <label className="flex items-start gap-2.5 text-xs text-foreground bg-muted rounded-xl p-3.5 cursor-pointer">
              <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 w-4 h-4 accent-primary shrink-0" required />
              <span>{GUARDIAN_CONSENT_STATEMENT}</span>
            </label>
            <button type="submit" disabled={loading || !ack} className="w-full py-3.5 rounded-xl gradient-institute text-primary-foreground font-semibold text-sm shadow-warm hover:shadow-glow transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <><Sparkles className="w-4 h-4" />Confirmar e continuar</>}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
