import Link from "next/link";
import { ArrowRight, BookOpen, Shield, Users, BarChart, Zap, Award, CheckCircle, Star, MessageSquare, TrendingUp, Clock, Smartphone } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fdfcfb] via-white to-[#f0fdf4] relative overflow-hidden flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      {/* Dynamic Background Ornaments */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-emerald-400/15 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute top-1/2 -left-40 w-[400px] h-[400px] bg-sky-400/15 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute -bottom-40 right-1/4 w-[600px] h-[600px] bg-amber-400/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/4 right-1/3 w-[300px] h-[300px] bg-rose-400/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '3s' }}></div>
      </div>

      {/* Modern Friendly Navbar */}
      <nav className="relative z-20 border-b border-stone-100/50 bg-white/40 backdrop-blur-3xl sticky top-0">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-11 h-11 bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/50 group-hover:scale-110 transition-all duration-300">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black text-stone-900 tracking-tighter">PRIMA INTEGRATION<span className="text-emerald-500">.</span></span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              prefetch={false}
              className="px-6 py-2.5 text-sm font-bold text-stone-700 hover:text-emerald-600 transition-all duration-300 hover:scale-105"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              prefetch={false}
              className="px-6 py-2.5 text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 rounded-full transition-all duration-300 shadow-md hover:shadow-lg active:scale-95"
            >
              Registrasi
            </Link>
          </div>
        </div>
      </nav>

      {/* Playful Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 lg:px-12 text-center py-16 md:py-24">
        {/* Badge */}
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 text-xs font-bold uppercase tracking-widest mb-8 border border-emerald-200/50 shadow-sm hover:shadow-md transition-all cursor-pointer hover:scale-105" style={{ animationDuration: '3s' }}>
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          ✨ Platform Pembelajaran Terpadu
        </div>

        {/* Main Heading */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-stone-900 tracking-tight mb-8 max-w-6xl mx-auto leading-[1] md:leading-[0.95]">
          Pantau Pertumbuhan <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500">Anak Anda</span> dengan Mudah
        </h1>

        <p className="text-lg md:text-xl text-stone-600 mb-12 max-w-3xl mx-auto leading-relaxed font-medium">
          Kolaborasi guru, orang tua, dan pengurus dalam satu ekosistem digital yang aman. Pantau akademik, kehadiran, dan perkembangan anak real-time dengan dashboard intuitif.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-2xl mb-16">
          <Link
            href="/login"
            prefetch={false}
            className="flex-1 group px-10 py-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black rounded-full shadow-[0_20px_50px_rgba(16,185,129,0.3)] hover:shadow-[0_20px_50px_rgba(16,185,129,0.5)] transition-all duration-300 hover:-translate-y-2 flex items-center justify-center gap-3 active:scale-95"
          >
            Login
            <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
          </Link>
          <Link
            href="/register"
            prefetch={false}
            className="flex-1 px-10 py-5 bg-white hover:bg-stone-50 border-2 border-stone-200 text-stone-900 font-bold rounded-full transition-all duration-300 flex items-center justify-center shadow-sm hover:shadow-md hover:border-emerald-300"
          >
            Registrasi
          </Link>
        </div>

        
        {/* Feature Highlight Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto w-full mb-20" id="features">
          {[
            {
              title: "Kolaborasi Real-Time",
              desc: "Guru dan orang tua berkomunikasi langsung tentang kemajuan anak",
              icon: <MessageSquare className="w-8 h-8" />,
              color: "from-emerald-500 to-teal-500",
              bgColor: "bg-emerald-50"
            },
            {
              title: "Laporan Komprehensif",
              desc: "Analisis mendalam tentang performa akademik dan kehadiran siswa",
              icon: <TrendingUp className="w-8 h-8" />,
              color: "from-sky-500 to-cyan-500",
              bgColor: "bg-sky-50"
            },
            {
              title: "Akses Dimana Saja",
              desc: "Pantau perkembangan anak melalui web atau aplikasi mobile",
              icon: <Smartphone className="w-8 h-8" />,
              color: "from-violet-500 to-purple-500",
              bgColor: "bg-violet-50"
            }
          ].map((feature, i) => (
            <div 
              key={i} 
              className="group bg-white p-8 rounded-3xl text-left border border-stone-100/80 hover:border-emerald-300 transition-all duration-300 hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-2 cursor-default backdrop-blur-sm bg-white/80"
            >
              <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-6 text-white group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-stone-900 mb-3 tracking-tight">{feature.title}</h3>
              <p className="text-stone-600 text-sm leading-relaxed font-medium">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-stone-100/50 bg-white/30 backdrop-blur-xl py-12 mt-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
         
          <div className="border-t border-stone-100 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-stone-500 text-sm font-medium">© {new Date().getFullYear()} PRIMA Monitoring. Semua hak dilindungi.</p>
            <div className="flex gap-6">
              <Link href="#" className="text-stone-500 hover:text-emerald-600 transition-colors text-sm font-medium">Twitter</Link>
              <Link href="#" className="text-stone-500 hover:text-emerald-600 transition-colors text-sm font-medium">Facebook</Link>
              <Link href="#" className="text-stone-500 hover:text-emerald-600 transition-colors text-sm font-medium">Instagram</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
