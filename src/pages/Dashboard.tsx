import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import LoopLogo from "@/components/LoopLogo";

const Dashboard = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen gradient-bg">
      <header className="border-b border-border glass">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-6 py-4">
          <LoopLogo />
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={signOut} className="border-border">
              <LogOut size={16} className="mr-1" /> Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="glass rounded-2xl p-8 text-center space-y-4">
          <h1 className="text-3xl font-bold text-foreground">¡Bienvenido a Loop! 🎉</h1>
          <p className="text-muted-foreground">
            Tu cuenta ha sido creada exitosamente. Pronto tendrás acceso a tu feed personalizado.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
