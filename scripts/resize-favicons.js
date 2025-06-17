// Script para redimensionar favicon2x.png para 32x32 e 16x16 usando sharp
const sharp = require('sharp');
const fs = require('fs');

const input = 'public/favicon2x.png';
const sizes = [
  { size: 32, out: 'public/favicon-32x32.png' },
  { size: 16, out: 'public/favicon-16x16.png' },
];

sizes.forEach(({ size, out }) => {
  sharp(input)
    .resize(size, size)
    .toFile(out, (err, info) => {
      if (err) {
        console.error(`Erro ao criar ${out}:`, err);
      } else {
        console.log(`Criado ${out}:`, info);
      }
    });
});
