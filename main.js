const path = require('path');
const url = require('url');
const iohook = require('iohook');

const { app, BrowserWindow, screen } = require('electron');

// See:
// https://stackoverflow.com/questions/54763647/transparent-windows-on-linux-electron
// https://github.com/electron/electron/issues/7076
// https://github.com/electron/electron/issues/16809
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-transparent-visuals');
}

require('./lib/app-id.js')(app);
require('./lib/versions.js');
const icon = require('./lib/icon.js')();
const log = require('./lib/log.js')('main');
const config = require('./lib/config.js');
const tray = require('./lib/tray.js');

const WINDOWS = [];
const THEME = {
  get: () => config.getProp('theme.palette'),
  set: name => config.setProp('theme.palette', name)
};

function windowOptionsForDisplay(display) {
  if (process.platform === 'linux') {
    return display.workArea;
  }

  return {
    x: display.bounds.x + 1,
    y: display.bounds.y + 1
  };
}

(async () => {
  await Promise.all([
    app.whenReady(),
    config.read()
  ]);

  // see Linux notes above
  await new Promise(r => process.platform === 'linux' ? setTimeout(r, 1000) : r());

  const displays = screen.getAllDisplays().map(display => {
    const windowOptions = {
      darkTheme: true,
      webPreferences: {
        nodeIntegration: true,
        enableRemoteModule: true,
        contextIsolation: false
      },
      icon: icon,
      frame: false,
      focusable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      transparent: true,
      ...windowOptionsForDisplay(display),
    };

    // Create the browser window.
    const window = new BrowserWindow(windowOptions);
    window.setIgnoreMouseEvents(true, { forward: true });
    window.maximize();

    window.loadURL(url.format({
      pathname: path.join(__dirname, 'public', 'index.html'),
      protocol: 'file:',
      slashes: true
    }));

    WINDOWS.push(window);

    return { display, window, bounds: display.bounds };
  });

  iohook.on('mouseclick', (data) => {
    if (data.button !== 1) {
      return;
    }

    const { x, y } = data;
    const dpiPoint = screen.screenToDipPoint ?
      screen.screenToDipPoint({ x, y }) :
      { x, y };

    log.info('CLICK', data, dpiPoint);

    const { display, window } = displays.filter(({ bounds }) => {
      return dpiPoint.x >= bounds.x && dpiPoint.x <= bounds.x + bounds.width &&
        dpiPoint.y >= bounds.y && dpiPoint.y <= bounds.y + bounds.height;
    })[0] || {};

    if (window) {
      window.webContents.send('asynchronous-message', {
        command: 'draw',
        x: (dpiPoint.x - display.bounds.x),
        y: (dpiPoint.y - display.bounds.y),
        palette: THEME.get()
      });
    }
  });

  iohook.start();

  const destroyTray = tray({ theme: THEME });

  app.once('before-quit', () => {
    log.info('before-quit: cleanup starting');

    iohook.unload();
    destroyTray();

    for (const window of WINDOWS) {
      window.close();
    }

    log.info('before-quit: cleanup complete');
  });
})().then(() => {
  log.info('application is running');
}).catch(err => {
  log.error('application has failed to start', err);
  process.exitCode = 1;
});
