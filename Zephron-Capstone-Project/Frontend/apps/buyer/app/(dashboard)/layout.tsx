import { SidebarItem } from "../components/SidebarItem";

export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {    
    return (
        <div className="min-h-[calc(100vh-64px)]">
            <div className="flex gap-6">
                <aside className="hidden md:flex w-72 shrink-0">
                    <div className="sticky top-4 h-[calc(100vh-120px)] w-full rounded-2xl bg-white/80 backdrop-blur border border-slate-200 shadow-sm p-4">
                        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Navigation
                        </div>
                        <nav className="mt-1 space-y-1">
                            <SidebarItem href="/dashboard" title="Gold Portfolio" icon={<div>🏠</div>} />
                            <SidebarItem href="/transfer" title="Buy Gold" icon={<div>🪙</div>} />
                            <SidebarItem href="/transactions" title="Gold History" icon={<div>📊</div>} />
                            <SidebarItem href="/p2p" title="Send Gold" icon={<div>📤</div>} />
                        </nav>
                    </div>
                </aside>
                <section className="flex-1">
                    {children}
                </section>
            </div>
        </div>
    );
}