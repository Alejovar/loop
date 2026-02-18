import { ReactNode } from "react";
import LoopLogo from "./LoopLogo";

const AuthLayout = ({ children }: { children: ReactNode }) => (
  <div className="flex min-h-screen gradient-bg">
    {/* Left decorative panel */}
    <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full border border-primary/30"
            style={{
              width: `${200 + i * 120}px`,
              height: `${200 + i * 120}px`,
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}
      </div>
      <div className="relative z-10 text-center space-y-6 max-w-md">
        <LoopLogo size={64} />
        <h1 className="text-4xl font-bold text-foreground">
          Conéctate con el mundo
        </h1>
        <p className="text-muted-foreground text-lg">
          Comparte momentos, descubre tendencias y forma parte de la conversación global.
        </p>
      </div>
    </div>

    {/* Right form panel */}
    <div className="flex w-full lg:w-1/2 items-center justify-center p-6">
      <div className="glass rounded-2xl p-8 w-full max-w-md space-y-6">
        <div className="lg:hidden flex justify-center mb-4">
          <LoopLogo size={40} />
        </div>
        {children}
      </div>
    </div>
  </div>
);

export default AuthLayout;
