import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { LogOut, ShieldCheck, Shield } from "lucide-react";
import { maskEmail } from "@/lib/maskEmail";
import { useNavigate } from "react-router-dom";
import LoopLogo from "@/components/LoopLogo";

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useRole();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen gradient-bg">
      <header className="border-b border-border glass">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-6 py-4">
          <LoopLogo />
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => navigate("/admin")} className="border-border">
                <Shield size={14} className="mr-1" /> Admin
              </Button>
            )}
            <span className="text-sm text-muted-foreground hidden sm:block">{maskEmail(user?.email ?? "")}</span>
            <Button variant="outline" size="sm" onClick={signOut} className="border-border">
              <LogOut size={16} className="mr-1" /> Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-6">
        <div className="glass rounded-2xl p-8 text-center space-y-4">
          <h1 className="text-3xl font-bold text-foreground">¡Bienvenido a Loop! 🎉</h1>
          <p className="text-muted-foreground">
            Tu cuenta ha sido creada exitosamente. Pronto tendrás acceso a tu feed personalizado.
          </p>
        </div>

        <div className="glass rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck size={20} className="text-primary" /> Seguridad
          </h3>
          <p className="text-sm text-muted-foreground">
            Protege tu cuenta activando la autenticación de dos factores (MFA).
          </p>
          <Button variant="outline" onClick={() => navigate("/mfa-setup")} className="border-border">
            Configurar MFA
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
