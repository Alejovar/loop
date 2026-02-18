const LoopLogo = ({ size = 48 }: { size?: number }) => (
  <div className="flex items-center gap-3">
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="loopGrad" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="hsl(16, 90%, 58%)" />
          <stop offset="100%" stopColor="hsl(340, 80%, 55%)" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="20" stroke="url(#loopGrad)" strokeWidth="4" fill="none" />
      <circle cx="24" cy="24" r="10" stroke="url(#loopGrad)" strokeWidth="3" fill="none" strokeDasharray="8 6" />
    </svg>
    <span className="text-gradient text-2xl font-bold tracking-tight">Loop</span>
  </div>
);

export default LoopLogo;
