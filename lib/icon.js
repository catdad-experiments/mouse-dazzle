const path = require('path');

const iconMap = {
  'win32-runtime': 'icons/icon.ico',
  'linux-runtime': 'icons/32x32.png',
  'linux-build': 'icons/256x256.png',
  'darwin-runtime': 'icons/16x16.png',
  'darwin-build': 'icons/icon.icns',
};

module.exports = (type = 'runtime') => {
  const iconName = iconMap[`${process.platform}-${type}`] || iconMap[`${process.platform}-runtime`];
  let icon = iconName ? path.resolve(__dirname, '..', iconName) : undefined;

  if (type === 'build') {
    return icon;
  }

  if (process.platform === 'win32') {
    return icon;
  }

  if (process.platform === 'linux') {
    return icon;
  }

  if (process.platform === 'darwin') {
    return icon;
  }
};
