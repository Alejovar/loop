import { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast({
        title: "Correo enviado",
        description: "Revisa tu bandeja de entrada para restablecer tu contraseña.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar el correo de recuperación.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold text-foreground">Recuperar contraseña</h2>
        <p className="text-muted-foreground text-sm">
          {sent
            ? "Te hemos enviado un enlace de recuperación"
            : "Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña"}
        </p>
      </div>

      {sent ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            Revisa tu correo <strong>{email}</strong> y haz clic en el enlace para restablecer tu contraseña.
          </p>
          <Button variant="outline" onClick={() => setSent(false)} className="w-full">
            Enviar de nuevo
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-input border-border"
              required
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground font-semibold h-11">
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Enviar enlace de recuperación"}
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        <Link to="/login" className="text-primary hover:underline font-medium inline-flex items-center gap-1">
          <ArrowLeft size={14} /> Volver al inicio de sesión
        </Link>
      </p>
    </AuthLayout>
  );
};

export default ForgotPassword;
