import { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import OtpVerification from "@/components/OtpVerification";
import { Eye, EyeOff, CalendarIcon, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const INTEREST_CATEGORIES = [
  { id: "musica", label: "🎵 Música", emoji: "🎵" },
  { id: "deportes", label: "⚽ Deportes", emoji: "⚽" },
  { id: "tecnologia", label: "💻 Tecnología", emoji: "💻" },
  { id: "arte", label: "🎨 Arte", emoji: "🎨" },
  { id: "viajes", label: "✈️ Viajes", emoji: "✈️" },
  { id: "gaming", label: "🎮 Gaming", emoji: "🎮" },
  { id: "moda", label: "👗 Moda", emoji: "👗" },
  { id: "cocina", label: "🍳 Cocina", emoji: "🍳" },
  { id: "cine", label: "🎬 Cine & TV", emoji: "🎬" },
  { id: "literatura", label: "📚 Literatura", emoji: "📚" },
];

const INTEREST_TAGS = [
  "fotografía", "fitness", "anime", "podcasts", "naturaleza",
  "startups", "diseño", "rap", "rock", "yoga",
  "meditación", "DIY", "mascotas", "astrología", "ciencia",
  "comedia", "streetwear", "skincare", "criptomonedas", "running",
];

const STEPS = [
  { number: 1, label: "Cuenta" },
  { number: 2, label: "Perfil" },
  { number: 3, label: "Intereses" },
  { number: 4, label: "Verificar" },
];

const Register = () => {
  const [step, setStep] = useState(1);

  // Step 1
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Step 2
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [gender, setGender] = useState("");
  const [birthDate, setBirthDate] = useState<Date>();

  // Step 3
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [bio, setBio] = useState("");

  const toggleCategory = (id: string) =>
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );

  const toggleTag = (tag: string) =>
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
    } else {
      // TODO: integrate auth
    }
  };

  return (
    <AuthLayout>
      {/* Stepper */}
      <div className="flex items-center justify-between mb-2">
        {STEPS.map((s, i) => (
          <div key={s.number} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300",
                  step > s.number
                    ? "gradient-primary text-primary-foreground"
                    : step === s.number
                    ? "border-2 border-primary text-primary"
                    : "border border-border text-muted-foreground"
                )}
              >
                {step > s.number ? <Check size={16} /> : s.number}
              </div>
              <span
                className={cn(
                  "text-xs mt-1 transition-colors",
                  step >= s.number ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-px flex-1 mx-1 -mt-4 transition-colors",
                  step > s.number ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ====== STEP 1: Cuenta ====== */}
        {step === 1 && (
          <>
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-bold text-foreground">Crear cuenta</h2>
              <p className="text-muted-foreground text-sm">
                Introduce tu email y contraseña
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-input border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-input border-border pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 text-muted-foreground" style={{ backgroundColor: "hsl(230 15% 12% / 0.6)" }}>
                  o regístrate con
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant="outline" className="border-border bg-secondary hover:bg-muted">
                Google
              </Button>
              <Button type="button" variant="outline" className="border-border bg-secondary hover:bg-muted">
                Apple
              </Button>
            </div>
          </>
        )}

        {/* ====== STEP 2: Perfil ====== */}
        {step === 2 && (
          <>
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-bold text-foreground">Tu perfil</h2>
              <p className="text-muted-foreground text-sm">
                Cuéntanos un poco sobre ti
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  placeholder="Tu nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Usuario</Label>
                <Input
                  id="username"
                  placeholder="@usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-input border-border"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Género</Label>
              <RadioGroup value={gender} onValueChange={setGender} className="grid grid-cols-2 gap-2">
                {[
                  { value: "hombre", label: "Hombre" },
                  { value: "mujer", label: "Mujer" },
                  { value: "no-binario", label: "No binario" },
                  { value: "prefiero-no-decirlo", label: "Prefiero no decirlo" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2.5 cursor-pointer transition-all text-sm",
                      gender === opt.value
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-input text-muted-foreground hover:border-muted-foreground"
                    )}
                  >
                    <RadioGroupItem value={opt.value} />
                    {opt.label}
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Fecha de nacimiento</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-input border-border",
                      !birthDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {birthDate ? format(birthDate, "PPP", { locale: es }) : "Selecciona una fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={birthDate}
                    onSelect={setBirthDate}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    captionLayout="dropdown-buttons"
                    fromYear={1940}
                    toYear={new Date().getFullYear()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </>
        )}

        {/* ====== STEP 3: Intereses ====== */}
        {step === 3 && (
          <>
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-bold text-foreground">Tus intereses</h2>
              <p className="text-muted-foreground text-sm">
                Elige lo que te apasiona para personalizar tu experiencia
              </p>
            </div>

            <div className="space-y-2">
              <Label>Categorías</Label>
              <div className="grid grid-cols-2 gap-2">
                {INTEREST_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm text-left transition-all",
                      selectedCategories.includes(cat.id)
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-input text-muted-foreground hover:border-muted-foreground"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {INTEREST_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition-all",
                      selectedTags.includes(tag)
                        ? "border-primary bg-primary/15 text-foreground"
                        : "border-border text-muted-foreground hover:border-muted-foreground"
                    )}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Cuéntale al mundo quién eres..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={160}
                className="bg-input border-border resize-none h-20"
              />
              <p className="text-xs text-muted-foreground text-right">{bio.length}/160</p>
            </div>
          </>
        )}

        {/* Navigation buttons */}
        <div className="flex gap-3">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="flex-1 border-border bg-secondary hover:bg-muted"
            >
              <ArrowLeft size={16} className="mr-1" /> Atrás
            </Button>
          )}
          <Button
            type="submit"
            className={cn(
              "gradient-primary text-primary-foreground font-semibold h-11",
              step > 1 ? "flex-1" : "w-full"
            )}
          >
            {step < 3 ? (
              <>
                Siguiente <ArrowRight size={16} className="ml-1" />
              </>
            ) : (
              "Crear cuenta"
            )}
          </Button>
        </div>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link to="/login" className="text-primary hover:underline font-medium">
          Inicia sesión
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Register;
