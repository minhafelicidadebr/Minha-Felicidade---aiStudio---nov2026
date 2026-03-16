import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Save, User } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [email, setEmail] = useState("");

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
      setLoading(false);
    };
    load();
  }, [navigate]);

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
            <div className="w-20 h-20 rounded-2xl gradient-institute flex items-center justify-center mx-auto mb-4 shadow-warm">
              <User className="w-10 h-10 text-primary-foreground" />
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
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
