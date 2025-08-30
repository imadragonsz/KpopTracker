// Node.js script to combine and minify CSS files for gallery.bundle.min.css
// Requires 'clean-css' package: npm install clean-css

const fs = require('fs');
const path = require('path');
const CleanCSS = require('clean-css');

const cssFiles = [
  'styles/global.css',
  'styles/navbar.css',
  'styles/album-cards.css',
  'styles/modals.css',
  'styles/forms.css',
  'styles/loading.css',
  'styles/albumCollectionOverrides.css',
  'styles/albumCollectionRowOverrides.css',
  'styles/animations.css',
  'styles/flatpickr-dark.css',
];

let combined = '';
for (const file of cssFiles) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    combined += fs.readFileSync(filePath, 'utf8') + '\n';
  } else {
    console.warn('Missing CSS file:', file);
  }
}

const minified = new CleanCSS({ level: 2 }).minify(combined).styles;
fs.writeFileSync(path.join(__dirname, 'styles', 'gallery.bundle.min.css'), minified);
console.log('gallery.bundle.min.css created and minified.');
