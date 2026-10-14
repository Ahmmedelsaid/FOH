// GitHub Pages serves 404.html for unknown paths. Copying index.html to it makes deep links like
// /FOH/orders/1041 load the app, and Angular's router then shows the right page.
const fs = require('fs');
const path = require('path');

const out = path.join(__dirname, '..', 'dist', 'kitchen-order-board');
const dir = fs.existsSync(path.join(out, 'browser')) ? path.join(out, 'browser') : out;
fs.copyFileSync(path.join(dir, 'index.html'), path.join(dir, '404.html'));
console.log(`Copied index.html to 404.html in ${dir}`);
