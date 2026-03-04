import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LoopLogo from "@/components/LoopLogo";
import { toast } from "@/hooks/use-toast";
import { logAction } from "@/hooks/useAuditLog";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, ShieldCheck, ArrowLeft, Copy } from "lucide-react";

const MfaSetup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<"intro" | "enroll" | "verify">("intro");
  const [loading, setLoading] = useState(false);
  const [factorId, setFactorId] = useState("");
  const [qrUri, setQrUri] = useState("");
  const [secret, setSecret] = useState("");
  const [verifyCode, setVerifyCode] = useState("");

  const handleEnroll = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Loop TOTP",
      });

      if (error) throw error;

      setFactorId(data.id);
      setQrUri(data.totp.uri);
      setSecret(data.totp.secret);
      setStep("enroll");
    } catch (err: any) {
      toast({
        title: "Error al configurar MFA",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verifyCode,
      });
      if (verifyError) throw verifyError;

      await logAction("mfa_enrolled", "auth", { factor_id: factorId });

      toast({
        title: "MFA activado",
        description:
          "La autenticación de dos factores ha sido configurada exitosamente.",
      });
      navigate("/dashboard");
    } catch (err: any) {
      toast({
        title: "Código inválido",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    toast({ title: "Copiado", description: "Clave secreta copiada al portapapeles." });
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-6">
      <div className="glass rounded-2xl p-8 w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <LoopLogo size={40} />
        </div>

        {step === "intro" && (
          <div className="space-y-6 text-center">
            <ShieldCheck className="mx-auto h-16 w-16 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">
              Autenticación de dos factores
            </h2>
            <p className="text-muted-foreground text-sm">
              Protege tu cuenta con una capa adicional de seguridad usando una
              app autenticadora como Google Authenticator o Authy.
            </p>
            <div className="space-y-3">
              <Button
                onClick={handleEnroll}
                disabled={loading}
                className="w-full gradient-primary text-primary-foreground font-semibold h-11"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Configurar MFA"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard")}
                className="w-full border-border"
              >
                <ArrowLeft size={16} className="mr-1" /> Volver al dashboard
              </Button>
            </div>
          </div>
        )}

        {step === "enroll" && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-foreground">
                Escanea el código QR
              </h2>
              <p className="text-muted-foreground text-sm">
                Abre tu app autenticadora y escanea este código
              </p>
            </div>

            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-xl">
                <QRCodeSVG value={qrUri} size={200} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                ¿No puedes escanear? Ingresa esta clave manualmente:
              </Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-secondary text-foreground text-xs p-2 rounded font-mono break-all">
                  {secret}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copySecret}
                  className="border-border"
                >
                  <Copy size={14} />
                </Button>
              </div>
            </div>

            <Button
              onClick={() => setStep("verify")}
              className="w-full gradient-primary text-primary-foreground font-semibold h-11"
            >
              Siguiente
            </Button>
          </div>
        )}

        {step === "verify" && (
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-foreground">
                Verifica el código
              </h2>
              <p className="text-muted-foreground text-sm">
                Ingresa el código de 6 dígitos de tu app autenticadora
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Código TOTP</Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="000000"
                value={verifyCode}
                onChange={(e) =>
                  setVerifyCode(e.target.value.replace(/\D/g, ""))
                }
                className="bg-input border-border text-center text-2xl tracking-[0.5em] font-mono"
                required
              />
            </div>

            <div className="space-y-3">
              <Button
                type="submit"
                disabled={loading || verifyCode.length !== 6}
                className="w-full gradient-primary text-primary-foreground font-semibold h-11"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Verificar y activar"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("enroll")}
                className="w-full border-border"
              >
                <ArrowLeft size={16} className="mr-1" /> Volver
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default MfaSetup;
