import { BookOpen } from "lucide-react";

export default function Loading() {
    return (
        <div className="fixed inset-0 bg-[#fdfcfb] z-[9999] flex flex-col items-center justify-center">
            <div className="relative">
                {/* Playful pulsing background ripples */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-emerald-500/10 rounded-full animate-ping"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-teal-500/10 rounded-full animate-pulse"></div>

                {/* Main Logo Container */}
                <div className="relative w-20 h-20 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-[24px] flex items-center justify-center shadow-2xl shadow-emerald-500/20 animate-bounce" style={{ animationDuration: '2s' }}>
                    <BookOpen className="w-10 h-10 text-white" />
                </div>
            </div>

            <div className="mt-12 text-center">
                <h2 className="text-2xl font-black text-stone-900 tracking-tighter mb-2">Mohon Tunggu<span className="text-emerald-500">...</span></h2>
                <p className="text-stone-400 font-bold uppercase tracking-[0.2em] text-[10px]">Sedang Menyiapkan Data</p>
            </div>

            {/* Friendly loading line */}
            <div className="mt-8 w-48 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full animate-progress"></div>
            </div>
        </div>
    );
}
