import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Save, User, ShieldCheck, ShieldOff } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";

interface ConsentStatusPayload {
  requires_consent: boolean;
  granted: boolean;
  policy_version?: string;
  occurred_at?: string;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState<ConsentStatusPayload | null>(null);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      setEmail(session.user.email || "");
      const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", session.user.id).single();
      if (profile) {
        setFullName(profile.full_name || "");
        setAvatarUrl(profile.avatar_url || "");
      }
      // TRUST-1.6 (R06): estado de consentimento é sempre lido do servidor,
      // nunca inferido no cliente. Só exibimos a seção quando aplicável
      // (requires_consent=true), e a ação de revogar existe só quando há
      // um grant ativo (granted=true) para revogar.
      const { data: statusData, error: statusError } = await supabase.rpc("get_my_guardian_consent_status");
      if (!statusError && statusData && typeof statusData === "object") {
        setConsent(statusData as unknown as ConsentStatusPayload);
      }
      setLoading(false);
    };
    load();
  }, [navigate]);

  const handleRevoke = async () => {
    if (!consent?.policy_version) return;
    setRevoking(true);
    try {
      const { error } = await supabase.rpc("revoke_guardian_consent", { _policy_version: consent.policy_version });
      if (error) throw error;
      toast({ title: "Autorização retirada", description: "O acesso a recursos que dependem dela será pausado." });
      const { data: statusData } = await supabase.rpc("get_my_guardian_consent_status");
      if (statusData && typeof statusData === "object") setConsent(statusData as unknown as ConsentStatusPayload);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast({ title: "Não foi possível retirar a autorização", description: message, variant: "destructive" });
    } finally {
      setRevoking(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { error } = await supabase.from("profiles").update({
      full_name: fullName.trim(),
      avatar_url: avatarUrl.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq("user_id", session.user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Perfil atualizado! ✨" });
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 container pt-24 pb-16 max-w-lg">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" /> Voltar ao dashboard
          </button>

          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-2xl gradient-institute flex items-center justify-center mx-auto mb-4 shadow-warm overflow-hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={fullName || "Avatar"}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // URL inválida ou imagem quebrada: volta para o ícone.
                    e.currentTarget.style.display = "none";
                    e.currentTarget.nextElementSibling?.classList.remove("hidden");
                  }}
                />
              ) : null}
              <User className={`w-10 h-10 text-primary-foreground ${avatarUrl ? "hidden" : ""}`} />
            </div>
            <h1 className="text-3xl font-display font-bold">Meu Perfil</h1>
            <p className="text-muted-foreground text-sm mt-1">Gerencie suas informações pessoais</p>
          </div>

          <div className="bg-card rounded-3xl border border-border p-8 shadow-warm space-y-5">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
              <input type="email" value={email} disabled className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-muted-foreground" />
              <p className="text-xs text-muted-foreground mt-1">O email não pode ser alterado</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Nome completo</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">URL do avatar (opcional)</label>
              <input type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <button onClick={handleSave} disabled={saving} className="w-full py-3.5 rounded-xl gradient-institute text-primary-foreground font-semibold shadow-warm hover:shadow-glow transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <><Save className="w-4 h-4" /> Salvar Alterações</>}
            </button>
          </div>

          {consent?.requires_consent && (
            <div className="bg-card rounded-3xl border border-border p-8 shadow-warm space-y-3 mt-6">
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck className="w-5 h-5" />
                <h2 className="font-display font-bold text-base">Autorização do responsável</h2>
              </div>
              {consent.granted ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Autorização ativa (versão {consent.policy_version}).
                    {consent.occurred_at && ` Confirmada em ${new Date(consent.occurred_at).toLocaleDateString("pt-BR")}.`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Retirar a autorização pausa o acesso a recursos que dependem dela até uma nova autorização ser dada.
                  </p>
                  <button
                    onClick={handleRevoke}
                    disabled={revoking}
                    className="w-full py-3 rounded-xl border border-destructive/30 text-destructive font-semibold text-sm hover:bg-destructive/5 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {revoking ? (
                      <div className="w-4 h-4 border-2 border-destructive/30 border-t-destructive rounded-full animate-spin" />
                    ) : (
                      <><ShieldOff className="w-4 h-4" /> Retirar autorização</>
                    )}
                  </button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Ainda não há uma autorização válida do responsável.{" "}
                  <button onClick={() => navigate("/consentimento-responsavel")} className="text-primary underline">
                    Enviar pedido de autorização
                  </button>
                </p>
              )}
            </div>
          )}
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
