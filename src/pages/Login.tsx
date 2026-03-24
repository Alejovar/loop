import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MathCaptcha from "@/components/MathCaptcha";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logAction } from "@/hooks/useAuditLog";
import { loginSchema } from "@/lib/validation";

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleCaptchaChange = useCallback((verified: boolean) => {
    setCaptchaVerified(verified);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaVerified) return;

    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      await logAction("login", "auth", { email });

      // Check MFA
      const { data: mfaData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (mfaData?.nextLevel === "aal2" && mfaData?.currentLevel === "aal1") {
        navigate("/mfa-verify");
      } else {
        navigate("/dashboard");
      }
    } catch (error: any) {
      let message = error.message;
      if (message.includes("Invalid login credentials")) {
        message = "Email o contraseña incorrectos.";
      } else if (message.includes("Email not confirmed")) {
        message = "Debes verificar tu email antes de iniciar sesión.";
      }
      toast({
        title: "Error al iniciar sesión",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold text-foreground">Iniciar sesión</h2>
        <p className="text-muted-foreground text-sm">Ingresa tus datos para acceder a tu cuenta</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input id="email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-input border-border" required />
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <div className="relative">
            <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-input border-border pr-10" required />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
        </div>

        <MathCaptcha onVerified={handleCaptchaChange} />

        <Button type="submit" disabled={!captchaVerified || loading} className="w-full gradient-primary text-primary-foreground font-semibold h-11 disabled:opacity-50">
          {loading ? <Loader2 size={16} className="animate-spin" /> : "Entrar"}
        </Button>
      </form>

      <div className="space-y-2 text-center text-sm text-muted-foreground">
        <p>
          <Link to="/forgot-password" className="text-primary hover:underline font-medium">¿Olvidaste tu contraseña?</Link>
        </p>
        <p>
          ¿No tienes cuenta?{" "}
          <Link to="/register" className="text-primary hover:underline font-medium">Regístrate</Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default Login;
