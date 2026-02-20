import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw } from "lucide-react";

interface MathCaptchaProps {
  onVerified: (verified: boolean) => void;
}

const generateChallenge = () => {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  return { a, b, answer: a + b };
};

const MathCaptcha = ({ onVerified }: MathCaptchaProps) => {
  const [challenge, setChallenge] = useState(generateChallenge);
  const [userAnswer, setUserAnswer] = useState("");

  const refresh = useCallback(() => {
    setChallenge(generateChallenge());
    setUserAnswer("");
    onVerified(false);
  }, [onVerified]);

  useEffect(() => {
    if (userAnswer === "") {
      onVerified(false);
      return;
    }
    onVerified(parseInt(userAnswer) === challenge.answer);
  }, [userAnswer, challenge.answer, onVerified]);

  return (
    <div className="space-y-2">
      <Label>Verificación de seguridad</Label>
      <div className="flex items-center gap-3">
        <span className="text-foreground font-mono text-lg font-bold bg-secondary rounded-md px-3 py-1.5 select-none">
          {challenge.a} + {challenge.b} = ?
        </span>
        <Input
          type="number"
          placeholder="Resultado"
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          className="bg-input border-border w-24"
        />
        <button
          type="button"
          onClick={refresh}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw size={16} />
        </button>
      </div>
    </div>
  );
};

export default MathCaptcha;
