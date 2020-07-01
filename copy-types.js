const fs = require('fs');
const src = 'src/aria-tablist-types.d.ts';
const dest = 'dist/index.d.ts';

fs.copyFile(src, dest, (err) => {
    if (err) throw err;
    console.log(`${src} was copied to ${dest}`);
});
