const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 48, 57, 72, 76, 96, 114, 120, 128, 144, 152, 167, 180, 192, 256, 384, 512];
const inputImage = path.join(__dirname, '..', 'public', 'images', 'Logo_Icon-temp-no-glow.png');
const outputDir = path.join(__dirname, '..', 'public', 'icons');

// Check if input file exists
if (!fs.existsSync(inputImage)) {
  console.error('Input file not found:', inputImage);
  process.exit(1);
}

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  console.log('Generating PWA icons based on Gate33 logo...');
  
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
    
    try {
      await sharp(inputImage)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
        })
        .png()
        .toFile(outputPath);
        
      console.log(`✓ Icon ${size}x${size} generated`);
    } catch (error) {
      console.error(`Error generating icon ${size}x${size}:`, error);
    }
  }
    // Generate apple-touch-icon
  const appleTouchPath = path.join(__dirname, '..', 'public', 'apple-touch-icon.png');
  try {
    await sharp(inputImage)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(appleTouchPath);
      
    console.log('✓ Apple touch icon generated');
  } catch (error) {
    console.error('Error generating apple touch icon:', error);
  }
  
  // Generate special favicon sizes
  const faviconSizes = [
    { size: 16, name: 'favicon-16x16.png' },
    { size: 32, name: 'favicon-32x32.png' }
  ];
  
  for (const favicon of faviconSizes) {
    const faviconPath = path.join(__dirname, '..', 'public', favicon.name);
    try {
      await sharp(inputImage)
        .resize(favicon.size, favicon.size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(faviconPath);
        
      console.log(`✓ ${favicon.name} generated`);
    } catch (error) {
      console.error(`Error generating ${favicon.name}:`, error);
    }
  }  
  console.log('Icon generation completed!');
}

if (require.main === module) {
  generateIcons().catch(console.error);
}

module.exports = { generateIcons };
