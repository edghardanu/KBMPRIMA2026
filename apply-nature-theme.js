const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'app');

const replacements = [
    // Backgrounds and Gradients
    [/bg-slate-50/g, 'bg-[#f8f9f5]'], // very soft sage/warm off-white
    [/bg-slate-100/g, 'bg-[#f0f3eb]'],
    [/from-slate-50 via-blue-50 to-white/g, 'from-[#f8f9f5] via-[#eef2e6] to-white'],
    [/via-blue-50/g, 'via-[#eef2e6]'],
    [/bg-white\/90/g, 'bg-white/95'],

    // Slate to Stone (for a warmer neutral)
    [/slate-200/g, 'stone-200'],
    [/slate-300/g, 'stone-300'],
    [/slate-400/g, 'stone-400'],
    [/slate-500/g, 'stone-500'],
    [/slate-600/g, 'stone-600'],
    [/slate-700/g, 'stone-700'],
    [/slate-800/g, 'stone-800'],
    [/slate-900/g, 'stone-900'],

    // Blue to Nature Greens (Emerald/Teal/Green)
    [/blue-[34567]00/g, (match) => match.replace('blue', 'emerald')],
    [/indigo-[34567]00/g, (match) => match.replace('indigo', 'teal')],
    [/cyan-[34567]00/g, (match) => match.replace('cyan', 'green')],
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
