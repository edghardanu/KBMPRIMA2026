import { Loader2, BookOpen } from "lucide-react";

export default function LoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#fdfcfb] via-white to-[#f0fdf4] relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-400/15 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-sky-400/15 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Loading Container */}
      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo Animation */}
        <div className="flex items-center justify-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-bounce">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
        </div>

        {/* Loading Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-stone-100/80 p-8 shadow-xl">
          <div className="space-y-6">
            {/* Header Skeleton */}
            <div className="text-center space-y-3 mb-8">
              <div className="h-8 bg-gradient-to-r from-stone-200 to-stone-100 rounded-lg w-3/4 mx-auto animate-pulse"></div>
              <div className="h-4 bg-stone-100 rounded w-4/5 mx-auto animate-pulse"></div>
            </div>

            {/* Form Fields Skeleton */}
            <div className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <div className="h-4 bg-stone-200 rounded w-20 animate-pulse"></div>
                <div className="h-12 bg-stone-100 rounded-xl animate-pulse"></div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="h-4 bg-stone-200 rounded w-24 animate-pulse"></div>
                <div className="h-12 bg-stone-100 rounded-xl animate-pulse"></div>
              </div>
            </div>

            {/* Button Skeleton */}
            <div className="h-12 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full animate-pulse mt-6"></div>

            {/* Footer Skeleton */}
            <div className="pt-6 border-t border-stone-100">
              <div className="h-4 bg-stone-100 rounded w-full text-center animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Loading Indicator */}
        <div className="flex items-center justify-center mt-8 gap-3">
          <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
          <span className="text-sm font-semibold text-stone-600">Memuat halaman login...</span>
        </div>
      </div>
    </div>
  );
}
