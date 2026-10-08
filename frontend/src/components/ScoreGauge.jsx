import React from 'react';

export default function ScoreGauge({ score = 0, recommendation = 'Trial', isStatutoryEligible = true }) {
  const radius = 80;
  const stroke = 10;
  const normalizedRadius = radius - stroke;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

  let colorClass = 'text-emerald-400';
  let glowClass = 'glow-emerald';
  let strokeColor = '#10B981';

  if (!isStatutoryEligible || score < 40) {
    colorClass = 'text-rose-500';
    glowClass = 'glow-crimson';
    strokeColor = '#EF4444';
  } else if (score < 65) {
    colorClass = 'text-amber-400';
    glowClass = 'glow-gold';
    strokeColor = '#F59E0B';
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-950/60 rounded-2xl border border-slate-800/80 shadow-inner">
      <div className={`relative flex items-center justify-center rounded-full ${glowClass}`}>
        <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
          <circle
            stroke="#1E293B"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke={strokeColor}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.8s ease-in-out' }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
          <span className={`text-2xl sm:text-[28px] leading-none font-extrabold font-serif tracking-tight tabular-nums ${colorClass}`}>
            {score.toFixed(1)}%
          </span>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mt-1">
            Suitability
          </span>
        </div>
      </div>

      <div className="mt-4 text-center">
        <div className="text-xs text-slate-400 font-medium mb-1">Committee Recommendation</div>
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
          <span className={`w-2 h-2 rounded-full ${colorClass.replace('text-', 'bg-')}`} />
          <span className={`text-sm font-bold font-serif ${colorClass}`}>
            {recommendation}
          </span>
        </div>
      </div>
    </div>
  );
}
