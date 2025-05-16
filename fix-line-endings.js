const fs = require('fs');
const files = [
  './functions/src/index.ts',
  './functions/syncLearn2EarnStatus.ts'
];
files.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed line endings in ${file}`);
  }
});
