const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'app');

const replacements = [
    ['bg-[#06241b]', 'bg-emerald-50/50'],
    ['bg-slate-900', 'bg-emerald-50'],
    ['bg-emerald-950', 'bg-emerald-100'],
    ['bg-slate-800/50', 'bg-white shadow-sm shadow-emerald-900/5'],
    ['bg-white/5', 'bg-white'],
    ['border-white/5', 'border-emerald-100'],
    ['border-white/10', 'border-emerald-200'],
    ['hover:border-white/10', 'hover:border-emerald-300'],
    ['text-slate-400', 'text-emerald-600'],
    ['text-slate-300', 'text-emerald-700'],
    ['text-slate-500', 'text-emerald-500'],
    ['placeholder-slate-500', 'placeholder-emerald-400/70'],
    ['placeholder-slate-600', 'placeholder-emerald-300'],
    ['text-white font-medium', 'text-emerald-950 font-medium'],
    ['text-white font-semibold', 'text-emerald-950 font-semibold'],
    ['text-white font-bold', 'text-emerald-950 font-bold'],
    ['text-2xl font-bold text-white', 'text-2xl font-bold text-emerald-950'],
    ['text-xl font-bold text-white', 'text-xl font-bold text-emerald-950'],
    ['text-lg font-bold text-white', 'text-lg font-bold text-emerald-950'],
    ['text-lg font-semibold text-white', 'text-lg font-semibold text-emerald-950'],
    ['hover:bg-white/[0.02]', 'hover:bg-emerald-50/50'],
    ['divide-white/5', 'divide-emerald-100'],
    ['rounded-xl text-white', 'rounded-xl text-emerald-900'],
    ['rounded-lg text-white', 'rounded-lg text-emerald-900'],
    ['focus:ring-emerald-500/50', 'focus:ring-emerald-500/30'],
    ['text-white truncate', 'text-emerald-950 truncate'],
    ['text-emerald-400', 'text-emerald-600'],
    ['text-slate-900', 'text-emerald-950'],
    ['text-white mb-2', 'text-emerald-950 mb-2'],
    ['text-white mb-1', 'text-emerald-950 mb-1'],
    ['text-white mb-3', 'text-emerald-950 mb-3'],
    ['text-white mt-1', 'text-emerald-950 mt-1'],
    ['text-white mt-2', 'text-emerald-950 mt-2'],
    ['text-white', 'text-emerald-950'], // DANGEROUS, but necessary for generic text. Will break buttons.
];

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        if (fs.statSync(dirPath).isDirectory()) {
            walkDir(dirPath, callback);
        } else if (f.endsWith('.tsx') || f.endsWith('.css')) {
            callback(dirPath);
        }
    });
}

walkDir(srcDir, (filePath) => {
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    // Manual safe replacements first
    replacements.slice(0, 25).forEach(([search, replace]) => {
        content = content.replace(new RegExp(escapeRegExp(search), 'g'), replace);
    });

    // Custom Regex for specific button fixes before doing the broad text-white replace
    content = content.replace(/text-white/g, 'TEXT_WHITE_PLACEHOLDER');

    // Revert TEXT_WHITE_PLACEHOLDER for buttons
    content = content.replace(/(bg-gradient-to-r[^"]*)TEXT_WHITE_PLACEHOLDER/g, '$1text-white');
    content = content.replace(/(bg-emerald-[56]00[^"]*)TEXT_WHITE_PLACEHOLDER/g, '$1text-white');
    content = content.replace(/(bg-red-[56]00[^"]*)TEXT_WHITE_PLACEHOLDER/g, '$1text-white');
    content = content.replace(/(bg-amber-[56]00[^"]*)TEXT_WHITE_PLACEHOLDER/g, '$1text-white');

    // Also fix Lucide icons inside buttons that might have had text-white
    content = content.replace(/className="w-5 h-5 TEXT_WHITE_PLACEHOLDER"/g, 'className="w-5 h-5 text-emerald-950"');

    // Replace the remaining generic whites with emerald-950
    content = content.replace(/TEXT_WHITE_PLACEHOLDER/g, 'text-emerald-950');

    // Fix remaining slate colors
    content = content.replace(/text-slate-400/g, 'text-emerald-600');
    content = content.replace(/text-slate-300/g, 'text-emerald-700');
    content = content.replace(/text-slate-500/g, 'text-emerald-500');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Updated ${filePath}`);
    }
});
