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

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCaptchaChange = useCallback((verified: boolean) => {
    setCaptchaVerified(verified);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaVerified) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error al iniciar sesión",
        description: error.message,
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <div className="relative">
            <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-input border-border pr-10" required />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <MathCaptcha onVerified={handleCaptchaChange} />

        <div className="text-right">
          <button type="button" className="text-sm text-primary hover:underline">¿Olvidaste tu contraseña?</button>
        </div>

        <Button type="submit" disabled={!captchaVerified || loading} className="w-full gradient-primary text-primary-foreground font-semibold h-11 disabled:opacity-50">
          {loading ? <Loader2 size={16} className="animate-spin" /> : "Entrar"}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
        <div className="relative flex justify-center text-xs">
          <span className="px-2 text-muted-foreground" style={{ backgroundColor: "hsl(230 15% 12% / 0.6)" }}>o continúa con</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="border-border bg-secondary hover:bg-muted">Google</Button>
        <Button variant="outline" className="border-border bg-secondary hover:bg-muted">Apple</Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{" "}
        <Link to="/register" className="text-primary hover:underline font-medium">Regístrate</Link>
      </p>
    </AuthLayout>
  );
};

export default Login;
