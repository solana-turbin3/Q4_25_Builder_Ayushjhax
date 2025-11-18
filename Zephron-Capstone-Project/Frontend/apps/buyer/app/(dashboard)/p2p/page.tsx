import { SendCard } from "../../components/SendCard";


export default function P2PPage() { 
    return (    
    <div className="w-full space-y-6">
        <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">Send Gold</h1>
            <p className="text-slate-600">Transfer your tokenized gold to other users instantly.</p>
        </div>
        <SendCard />
    </div>
    )
}