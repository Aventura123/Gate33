// Script para gerar apenas favicon-16x16.png e favicon-32x32.png a partir de favicon2x.png
const sharp = require('sharp');
const path = require('path');

const input = path.join(__dirname, '..', 'public', 'favicon2x.png');
const outputs = [
  { size: 16, out: path.join(__dirname, '..', 'public', 'favicon-16x16.png') },
  { size: 32, out: path.join(__dirname, '..', 'public', 'favicon-32x32.png') },
];

(async () => {
  for (const { size, out } of outputs) {
    await sharp(input)
      .resize(size, size)
      .toFile(out);
    console.log(`Gerado: ${out}`);
  }
})();
