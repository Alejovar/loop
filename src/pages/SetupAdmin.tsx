import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AuthLayout from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Loader2, ShieldAlert } from "lucide-react";

const ADMIN_CODE = "desarrollo-seguro";

const SetupAdmin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const [promoting, setPromoting] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.rpc("check_admin_exists");
      setAdminExists(data ?? false);
    };
    check();
  }, []);

  useEffect(() => {
    if (adminExists === true) {
      navigate("/dashboard");
    }
  }, [adminExists, navigate]);

  const handlePromote = async () => {
    if (!user) {
      toast({
        title: "Inicia sesión primero",
        description: "Necesitas estar autenticado para convertirte en admin.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    setPromoting(true);
    try {
      const { data, error } = await supabase.rpc("seed_admin_if_none");
      if (error) throw error;

      if (data) {
        toast({
          title: "¡Admin configurado!",
          description: "Tu cuenta ahora tiene permisos de administrador.",
        });
        navigate("/admin");
      } else {
        toast({
          title: "Ya existe un admin",
          description: "No se puede crear otro admin con este método.",
          variant: "destructive",
        });
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setPromoting(false);
    }
  };

  if (authLoading || adminExists === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthLayout>
      <div className="space-y-6 text-center">
        <ShieldAlert className="mx-auto h-16 w-16 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">
          Configuración inicial
        </h2>
        <p className="text-muted-foreground text-sm">
          No se ha detectado ningún administrador. {user
            ? "¿Deseas convertir tu cuenta en administrador?"
            : "Inicia sesión o regístrate primero, luego vuelve aquí."}
        </p>

        {user ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Cuenta: <span className="text-foreground">{user.email}</span>
            </p>
            <Button
              onClick={handlePromote}
              disabled={promoting}
              className="w-full gradient-primary text-primary-foreground font-semibold h-11"
            >
              {promoting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Convertirme en Admin"
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Button
              onClick={() => navigate("/register")}
              className="w-full gradient-primary text-primary-foreground font-semibold h-11"
            >
              Registrarse
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/login")}
              className="w-full border-border"
            >
              Iniciar sesión
            </Button>
          </div>
        )}
      </div>
    </AuthLayout>
  );
};

export default SetupAdmin;
