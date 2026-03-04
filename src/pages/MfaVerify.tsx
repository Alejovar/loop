import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LoopLogo from "@/components/LoopLogo";
import { toast } from "@/hooks/use-toast";
import { logAction } from "@/hooks/useAuditLog";
import { Loader2, ShieldCheck } from "lucide-react";

const MfaVerify = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [factorId, setFactorId] = useState("");

  useEffect(() => {
    const getFactors = async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error || !data.totp || data.totp.length === 0) {
        navigate("/dashboard");
        return;
      }
      // Use the first verified TOTP factor
      const verifiedFactor = data.totp.find((f) => f.status === "verified");
      if (verifiedFactor) {
        setFactorId(verifiedFactor.id);
      } else {
        navigate("/dashboard");
      }
    };
    getFactors();
  }, [navigate]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId || code.length !== 6) return;

    setLoading(true);
    try {
      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });
      if (verifyError) throw verifyError;

      await logAction("mfa_verified", "auth");

      toast({
        title: "Verificación exitosa",
        description: "Acceso concedido.",
      });
      navigate("/dashboard");
    } catch (err: any) {
      toast({
        title: "Código inválido",
        description: "El código ingresado no es correcto. Intenta de nuevo.",
        variant: "destructive",
      });
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-6">
      <div className="glass rounded-2xl p-8 w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <LoopLogo size={40} />
        </div>

        <div className="text-center space-y-2">
          <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">
            Verificación MFA
          </h2>
          <p className="text-muted-foreground text-sm">
            Ingresa el código de 6 dígitos de tu app autenticadora
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mfa-code">Código TOTP</Label>
            <Input
              id="mfa-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="bg-input border-border text-center text-2xl tracking-[0.5em] font-mono"
              autoFocus
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full gradient-primary text-primary-foreground font-semibold h-11"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              "Verificar"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default MfaVerify;
