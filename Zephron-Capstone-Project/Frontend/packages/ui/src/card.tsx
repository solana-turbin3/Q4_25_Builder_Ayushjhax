import React from "react";

export function Card({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}): JSX.Element {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/90 backdrop-blur shadow-sm">
      <div className="absolute inset-0 [mask-image:radial-gradient(50%_50%_at_50%_0%,rgba(255,255,255,0.6)_0%,rgba(255,255,255,0)_100%)]" />
      <div className="p-6 relative z-10">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900/90">
          {title}
        </h2>
        <div className="mt-4">
          {children}
        </div>
      </div>
    </div>
  );
}