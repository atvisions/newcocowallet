const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '../assets');

// 确保目录存在
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// 图标尺寸配置
const ICON_SIZES = {
  android: [48, 72, 96, 144, 192],
  ios: [20, 29, 40, 60, 76, 83.5, 1024]
};

// 启动屏幕尺寸
const SPLASH_SIZE = {
  width: 1242,
  height: 2436
};

async function generateIcons() {
  const sourceIcon = path.join(ASSETS_DIR, 'splash.png');
  
  // Android 图标
  for (const size of ICON_SIZES.android) {
    const outputPath = path.join(ASSETS_DIR, 'android', `icon_${size}x${size}.png`);
    ensureDir(path.dirname(outputPath));
    
    await sharp(sourceIcon)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 23, g: 28, b: 50, alpha: 1 } // #171C32
      })
      .toFile(outputPath);
    
    console.log(`Generated Android icon: ${size}x${size}`);
  }

  // iOS 图标
  for (const size of ICON_SIZES.ios) {
    const outputPath = path.join(ASSETS_DIR, 'ios', `icon_${size}x${size}.png`);
    ensureDir(path.dirname(outputPath));
    
    await sharp(sourceIcon)
      .resize(Math.round(size), Math.round(size), {
        fit: 'contain',
        background: { r: 23, g: 28, b: 50, alpha: 1 } // #171C32
      })
      .toFile(outputPath);
    
    console.log(`Generated iOS icon: ${size}x${size}`);
  }
}

async function generateSplashScreens() {
  const sourceSplash = path.join(ASSETS_DIR, 'splash.png');
  
  // 生成 Android 启动屏幕
  const androidSplashPath = path.join(ASSETS_DIR, 'android', 'splash.png');
  ensureDir(path.dirname(androidSplashPath));
  
  await sharp(sourceSplash)
    .resize(SPLASH_SIZE.width, SPLASH_SIZE.height, {
      fit: 'contain',
      background: { r: 23, g: 28, b: 50, alpha: 1 } // #171C32
    })
    .toFile(androidSplashPath);
  
  console.log('Generated Android splash screen');

  // 生成 iOS 启动屏幕
  const iosSplashPath = path.join(ASSETS_DIR, 'ios', 'splash.png');
  ensureDir(path.dirname(iosSplashPath));
  
  await sharp(sourceSplash)
    .resize(SPLASH_SIZE.width, SPLASH_SIZE.height, {
      fit: 'contain',
      background: { r: 23, g: 28, b: 50, alpha: 1 } // #171C32
    })
    .toFile(iosSplashPath);
  
  console.log('Generated iOS splash screen');
}

async function main() {
  try {
    await generateIcons();
    await generateSplashScreens();
    console.log('All images generated successfully!');
  } catch (error) {
    console.error('Error generating images:', error);
    process.exit(1);
  }
}

main();