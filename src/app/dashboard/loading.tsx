import { Loader2 } from "lucide-react";

export default function Loading() {
    return (
        <div className="w-full min-h-[400px] flex flex-col items-center justify-center animate-in fade-in duration-500">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                </div>
            </div>
            <div className="mt-6 text-center">
                <p className="text-stone-400 font-bold uppercase tracking-widest text-[9px] mb-1">Sedang Memuat Data</p>
                <p className="text-stone-600 font-bold text-sm italic">Mohon tunggu sejenak.</p>
            </div>
        </div>
    );
}
