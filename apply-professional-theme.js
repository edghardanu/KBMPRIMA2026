const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'app');

const replacements = [
    // Backgrounds
    [/bg-emerald-50\/50/g, 'bg-slate-50'],
    [/bg-emerald-50\/80/g, 'bg-white\/90'],
    [/bg-emerald-50/g, 'bg-slate-50'],
    [/bg-emerald-100/g, 'bg-slate-100'],
    [/bg-white shadow-sm shadow-emerald-900\/5/g, 'bg-white shadow-sm border border-slate-200'],

    // Borders
    [/border-emerald-100/g, 'border-slate-200'],
    [/border-emerald-200/g, 'border-slate-300'],
    [/hover:border-emerald-200/g, 'hover:border-blue-300'],
    [/hover:border-emerald-300/g, 'hover:border-blue-400'],
    [/divide-emerald-100/g, 'divide-slate-200'],

    // Text
    [/text-emerald-950/g, 'text-slate-800'],
    [/text-emerald-900/g, 'text-slate-800'],
    [/text-emerald-700/g, 'text-slate-600'],
    [/text-emerald-600/g, 'text-slate-500'],
    [/text-emerald-500/g, 'text-slate-500'],
    [/text-emerald-400/g, 'text-blue-600'],
    [/text-teal-400/g, 'text-indigo-600'],

    // Placeholders
    [/placeholder-emerald-400\/70/g, 'placeholder-slate-400'],
    [/placeholder-emerald-300/g, 'placeholder-slate-400'],

    // Focus Rings
    [/focus:ring-emerald-500\/30/g, 'focus:ring-blue-500/20'],
    [/focus:ring-emerald-500\/50/g, 'focus:ring-blue-500/20'],
    [/focus:border-emerald-500\/50/g, 'focus:border-blue-500/30'],

    // Gradients
    [/from-emerald-/g, 'from-blue-'],
    [/to-teal-/g, 'to-indigo-'],

    // Specific Buttons / Backgrounds
    [/bg-emerald-600/g, 'bg-blue-600'],
    [/hover:bg-emerald-500/g, 'hover:bg-blue-700'],
    [/bg-emerald-500\/10/g, 'bg-blue-500/10'],
    [/bg-emerald-500\/20/g, 'bg-blue-500/10'],

    // Teal to Indigo specifics
    [/bg-teal-500\/10/g, 'bg-indigo-500/10'],

    // Green to Cyan
    [/bg-green-500\/10/g, 'bg-cyan-500/10'],
    [/from-green-/g, 'from-cyan-'],
    [/to-emerald-/g, 'to-blue-'],

    // Miscellaneous
    [/shadow-emerald-500/g, 'shadow-blue-500'],
    [/shadow-emerald-900\/5/g, 'shadow-slate-900\/5'],
];

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

    replacements.forEach(([regex, replace]) => {
        content = content.replace(regex, replace);
    });

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Updated ${filePath}`);
    }
});
