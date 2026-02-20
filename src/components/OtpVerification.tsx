import { useState, useEffect } from "react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface OtpVerificationProps {
  email: string;
  onVerified: () => void;
  onBack: () => void;
}

const OtpVerification = ({ email, onVerified, onBack }: OtpVerificationProps) => {
  const [otp, setOtp] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    toast({
      title: "Código de verificación",
      description: `Tu código es: ${code} (demo)`,
    });
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleVerify = () => {
    if (otp === generatedCode) {
      toast({ title: "¡Verificado!", description: "Tu correo ha sido verificado correctamente." });
      onVerified();
    } else {
      toast({ title: "Código incorrecto", description: "Intenta de nuevo.", variant: "destructive" });
    }
  };

  const handleResend = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    setCountdown(60);
    setOtp("");
    toast({
      title: "Nuevo código enviado",
      description: `Tu código es: ${code} (demo)`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold text-foreground">Verifica tu correo</h2>
        <p className="text-muted-foreground text-sm">
          Ingresa el código de 6 dígitos enviado a{" "}
          <span className="text-foreground font-medium">{email}</span>
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <Label className="sr-only">Código de verificación</Label>
        <InputOTP maxLength={6} value={otp} onChange={setOtp}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>

        <Button
          type="button"
          onClick={handleVerify}
          disabled={otp.length !== 6}
          className="w-full gradient-primary text-primary-foreground font-semibold h-11"
        >
          Verificar
        </Button>

        <button
          type="button"
          onClick={handleResend}
          disabled={countdown > 0}
          className="text-sm text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
        >
          {countdown > 0 ? `Reenviar código en ${countdown}s` : "Reenviar código"}
        </button>

        <button
          type="button"
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Cambiar correo
        </button>
      </div>
    </div>
  );
};

export default OtpVerification;
