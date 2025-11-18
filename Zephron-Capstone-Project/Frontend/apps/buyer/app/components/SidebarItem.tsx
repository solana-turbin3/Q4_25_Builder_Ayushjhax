"use client"
import { usePathname, useRouter } from "next/navigation";
import React from "react";

export const SidebarItem = ({ href, title, icon }: { href: string; title: string; icon: React.ReactNode }) => {
    const router = useRouter();
    const pathname = usePathname()
    const selected = pathname === href

    return <button
        onClick={() => router.push(href)}
        className={`group w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all relative overflow-hidden
        ${selected ? "text-indigo-700 bg-white accent-ring" : "text-slate-600 hover:bg-white/70 hover:text-slate-900 border border-transparent hover:border-slate-200"}`}
        aria-current={selected ? "page" : undefined}
    >
        <span className={`text-lg relative ${selected ? "" : "opacity-70 group-hover:opacity-100"}`}>
            {icon}
        </span>
        <span className="truncate">
            {title}
        </span>
        {selected ? <span className="ml-auto h-2 w-2 rounded-full bg-indigo-500" /> : null}
        <span className="pointer-events-none absolute inset-0 rounded-xl" style={{
            background: "linear-gradient(90deg, rgba(99,102,241,0.08), rgba(124,58,237,0.06))",
            maskImage: "radial-gradient(120% 60% at 0% 0%, black, transparent)"
        }} />
    </button>
}