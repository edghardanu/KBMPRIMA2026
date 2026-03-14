const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'app');

const replacements = [
    // 1. TEXT CONTRAST (Make text darker for readability on ivory)
    // stone-500 is often too light for generic text, pushing to stone-600
    // stone-600 to stone-700, stone-800 to stone-900
    [/text-stone-500/g, 'text-stone-600'],
    [/text-stone-600/g, 'text-stone-700'],
    [/text-stone-800/g, 'text-stone-900'],

    // 2. ICON CONTRAST
    // Primary icons were emerald-600 or blue-600. Let's make sure they pop
    // Some icons were text-blue-600, make sure they are a rich nature green
    [/text-blue-600/g, 'text-emerald-700'],

    // 3. HOVER STATES (Make hovers feel organic)
    // Instead of turning light blue or generic gray, use soft sage greens for row hovers
    [/hover:bg-slate-50\/50/g, 'hover:bg-[#eef2e6]'], // Soft sage hover for table rows instead of ivory

    // Link & Button Text Hovers
    [/hover:text-emerald-300/g, 'hover:text-emerald-800'],
    [/text-indigo-600 hover:text-emerald-300/g, 'text-emerald-700 hover:text-emerald-900'],
    [/text-emerald-600 hover:text-emerald-300/g, 'text-emerald-600 hover:text-emerald-800'],
    [/text-stone-400 hover:text-white/g, 'text-stone-500 hover:text-stone-900'],
    [/hover:text-stone-950/g, 'hover:text-emerald-800'],

    // Primary solid buttons (Make hover deeper forest green instead of bright blue)
    [/hover:bg-blue-700/g, 'hover:bg-emerald-800'],
    [/bg-blue-600/g, 'bg-emerald-700'],

    // 4. DIVIDERS & BORDERS (Subtle but visible)
    [/border-stone-200/g, 'border-stone-300'],
    [/divide-stone-200/g, 'divide-stone-300'],
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
