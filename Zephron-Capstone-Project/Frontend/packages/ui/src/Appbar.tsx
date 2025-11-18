import { Button } from "./button";

interface AppbarProps {
    user?: {
        name?: string | null;
    },
    onSignin: any,
    onSignout: any
}

export const Appbar = ({
    user,
    onSignin,
    onSignout
}: AppbarProps) => {
    return <header className="sticky top-0 z-30 w-full bg-white/70 backdrop-blur border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="h-16 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600" />
                    <div className="text-base font-semibold tracking-tight text-slate-900">
                        Wallet
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden sm:block text-sm text-slate-600">
                        {user?.name ? `Hi, ${user.name}` : ""}
                    </div>
                    <Button onClick={user ? onSignout : onSignin}>{user ? "Logout" : "Login"}</Button>
                </div>
            </div>
        </div>
    </header>
}
