const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'app');

const replacements = [
    // Corrupted classes found: [#f8f9f5]0 or [#f8f9f5] followed by a zero
    // These likely should have been emerald-500 or blue-500 equivalents
    // Based on the 'nature' vs 'professional' theme history, 
    // we should restore them to a sensible emerald (Nature) or blue (Professional)
    // The current UI seems to want Emerald/Nature (from current page.tsx)

    [/\[#f8f9f5\]0\/10/g, 'emerald-500/10'],
    [/\[#f8f9f5\]0\/20/g, 'emerald-500/20'],
    [/\[#f8f9f5\]0\/30/g, 'emerald-500/30'],
    [/\[#f8f9f5\]0/g, 'emerald-500'],
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

console.log('Starting CSS fix...');

walkDir(srcDir, (filePath) => {
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    replacements.forEach(([regex, replace]) => {
        content = content.replace(regex, replace);
    });

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Fixed corrupted classes in: ${filePath}`);
    }
});

console.log('CSS fix completed.');
