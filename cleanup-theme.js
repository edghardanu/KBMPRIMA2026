const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'app');

const replacements = [
    // Login/Register backgrounds
    [/from-\[\#06241b\] via-emerald-950 to-\[\#06241b\]/g, 'from-slate-50 via-blue-50 to-white'],
    [/via-emerald-950/g, 'via-blue-50'],

    // Spinners
    [/border-emerald-500\/30/g, 'border-blue-500/30'],
    [/border-t-emerald-500/g, 'border-t-blue-500'],

    // Borders
    [/border-emerald-500\/20/g, 'border-blue-500/20'],

    // Gradients and Texts
    [/emerald-400/g, 'blue-500'],
    [/emerald-300/g, 'blue-400'],
    [/emerald-500/g, 'blue-600'],
    [/emerald-600/g, 'blue-600'],
    [/emerald-950/g, 'slate-900'],

    // Other teal references
    [/text-teal-400/g, 'text-indigo-600'],
    [/text-teal-600/g, 'text-indigo-600'],
    [/to-teal-400/g, 'to-indigo-500'],
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
