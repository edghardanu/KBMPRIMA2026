export default function PublicFormLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#fcfdfa] font-sans antialiased text-stone-900">
            <main className="max-w-3xl mx-auto px-4 py-8">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Pendaftaran Murid Baru</h1>
                    <p className="text-stone-600 mt-2">Lengkapi formulir di bawah ini dengan data yang benar.</p>
                </div>
                {children}
            </main>
            <footer className="py-8 text-center text-stone-400 text-sm">
                &copy; {new Date().getFullYear()} KBM PRIMA. All rights reserved.
            </footer>
        </div>
    );
}
