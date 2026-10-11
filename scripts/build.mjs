import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('dist/vendor',{recursive:true});
await copyFile('node_modules/exceljs/dist/exceljs.min.js','dist/vendor/exceljs.min.js');
await copyFile('node_modules/exceljs/LICENSE','dist/vendor/EXCELJS-LICENSE.txt');
console.log('Static site ready in dist/');
