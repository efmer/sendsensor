/*
    Send Sensor.
    Copyright (C) 2021-now  eFMer

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

// Modules to control application life and create native browser window
const {ipcMain, app, BrowserWindow, Menu, Tray } = require('electron')

const Logging = require('./sendsensor/rpc/functions/logging');
const logging = new Logging();

const WindowsState = require('./sendsensor/rpc/functions/window_state');
const windowsState = new WindowsState();

const Credits = require('./sendsensor/rpc/misc/credits');
const credits = new Credits();

const Server = require('./sendsensor/rpc/misc/server');
const server = new Server();

const ReadSensors = require('./sendsensor/rpc/misc/read_sensors');
const readSensors = new ReadSensors();

//const SendMenu = require('./sendsensor/rpc/functions/menu');
//const sendMenu = new SendMenu();
var g_menuSettings = null;

const sendConstants = require('./sendsensor/rpc/functions/send_constants');

const path = require('path');

const gotTheLock = app.requestSingleInstanceLock()

let gVersionNr = getVersion();

let gMainWindow = null;
let gChildWindowLog = null;
let gMenuTemplate;

let gSettingsSend = null;

let gTimerLog = null;
let gTimerTemperature = null;
let gTimerTemperatureTick = 0;
let gLogging = new Object();
gLogging.type = 0;
gLogging.len = 0;

let gSettings = null;

const isMac = process.platform === 'darwin'

let gVersionS = "V " + gVersionNr;


function initMenu()
{
  try {
    g_menuSettings = btMenu.read();
  } catch (error) {
  }

//https://www.electronjs.org/docs/api/menu

  gMenuTemplate = [ 
    // { role: 'appMenu' }
    ...(isMac ? [{
      label: app.name,
      submenu: [
        {
          label:'About Send Sensor',
          click(e) { 
            credits.about(gVersionNr);
          }
        }, 
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        {
          label:'Close',
          click(e) { 
            appExit();
          }
        },,
      ]
    }] : []),
    // { role: 'fileMenu' }    
      ...(isMac ? [ ] : [
        {
        label: 'File',
            submenu: [            
            {
              label:'Exit',
              click(e) { 
                appExit();
              }
            },            
        ]
        }
      ]),
    {
      label: 'Show',
        submenu: [
          {
            label:'Log',
            click() { 
              showLog(sendConstants.LOGGING_NORMAL) 
            }
          },              
          {
            label:'Debug Log',
            click() { 
              showLog(sendConstants.LOGGING_DEBUG);
            }               
          },     
          {
            label:'Error Log',
            click() { 
              showLog(sendConstants.LOGGING_ERROR);
            }
          },          
      ] 
    },
    {
      label: 'Extra',
        submenu: [
          {
            label:'Settings',
            click(e) { 
              gSettingsSend.show(gSettings);            
            }
          },                 
      ] 
    },      
    {
      label: 'Help',
        submenu: [
          {
            label:'About Send Sensor',
            click(e) { 
              credits.about(gVersionNr);
            }
          },                 
      ] 
    },       
  ]
}

function initialize () {
  if (!gotTheLock) {
    app.quit()
  } else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
      // A a second instance started
      if (gMainWindow !== null)
      {
        if (gMainWindow.isMinimized())
        {
          gMainWindow.restore(); 
        }
        else
        {
          gMainWindow.show();
        }
      }
    })
  }
  
  function createWindow () {
    // Create the browser window.

    let bShow = app.commandLine.getSwitchValue("show") != "no";

    if (gSettings.hideLogin === '1') 
    {
      bShow = false;
    }

    let state = windowsState.get("main",1200,600)

    gMainWindow = new BrowserWindow({
      'x' : state.x,
      'y' : state.y,
      'width': state.width,
      'height': state.height,
      icon: path.join(app.getAppPath(), 'assets/app-icon/png/512.png'),
      show: bShow, 
      webPreferences: {
        sandbox : false,
        contextIsolation: false,  
        nodeIntegration: true,
        nodeIntegrationInWorker: true,        
//        preload: path.join(__dirname, './preload/preload.js')
      },
    });

    initMenu();
 
    const g_mainMenu = Menu.buildFromTemplate(gMenuTemplate);

    if (process.platform == 'darwin') {
      Menu.setApplicationMenu(g_mainMenu); 
    }
    else
    {
      Menu.setApplicationMenu(null);
      gMainWindow.setMenu(g_mainMenu);
    }

    // and load the index.html of the app.
    gMainWindow.loadFile('index/index.html')

    gMainWindow.on('close', (e) => {
      let bounds = gMainWindow.getBounds();
      windowsState.set("main",bounds.x,bounds.y, bounds.width, bounds.height)

      if (!app.isQuiting)
      {
        e.preventDefault();
        gMainWindow.hide();
      }
    })

    gMainWindow.on('closed', () => {
      gMainWindow = null
    })


    gMainWindow.on('minimize', function (event) {
      event.preventDefault();
//      gMainWindow.hide(); // do not hide here.
   });

   gMainWindow.on('restore', function (event) {
      gMainWindow.show();
    });

    gMainWindow.once('ready-to-show', () => {   
//    gMainWindow.webContents.openDevTools()
      readSensors.start(gMainWindow);
      server.connect(gMainWindow, gSettings);
      startTimer();      
    });
  }

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
  app.whenReady().then(() => {
    logging.setVersion(gVersionS);
    if (gSettingsSend === null)
    {
      const SettingsSend = require('./sendsensor/rpc/settings/settings');
      gSettingsSend = new SettingsSend();
    }    
    gSettings = gSettingsSend.get();  
    createWindow();
    rendererRequests(); 
    gTray = createTray();

    app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
  })

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
  app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('will-quit', function () {
    btMenu.write();
  })

}

function appExit()
{
  app.isQuiting = true;
  app.quit();
}

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

initialize()

function createTray() {
  let appIcon = null;
  try {
    appIcon = new Tray(path.join(__dirname, "appicons/icons/png/16x16.png"));
    const contextMenu = Menu.buildFromTemplate([      
      {
        label: 'Open', click: function () {
        gMainWindow.show();
        }
      },
      { type: 'separator' },
      {
        label: 'Exit', click: function () {                
        app.isQuiting = true;
        app.quit();
        }
      }
    ]);

    appIcon.on('double-click', function (event) {
      gMainWindow.show();
    });
    appIcon.setToolTip('Send Sensor');
    appIcon.setContextMenu(contextMenu);
    return appIcon;
      
  } catch (error) {  
    var ii = 1;
  }
  return appIcon;
}

function getVersion()
{
  let version = app.getVersion();
  let split = version.split('.');
  let versionS = split[0] + '.' + split[1] + split[2];
  return versionS;
}

function rendererRequests()
{
  ipcMain.on("log", (renderer, type, data) => {
    switch(type)
    {
      case "button_clear":
        logging.logClear(gLogging.type)
      break;
      case "button_log":
        showLog(sendConstants.LOGGING_NORMAL);
      break;
      case "button_debug":
        showLog(sendConstants.LOGGING_DEBUG);
      break;
      case "button_error":
        showLog(sendConstants.LOGGING_ERROR);
      break;      
    }
  })
  ipcMain.on("settings_apply", (renderer, ip, localIp, port, hide) => {
    gSettings.port = port;
    gSettings.ip = ip;
    gSettings.hideLogin = hide;
    gSettings.localIp = localIp;
    gSettingsSend.apply(gSettings);
    server.connect(gMainWindow, gSettings);
  })
}

function startTimer()
{
    gTimerTemperature = setInterval(temperatureTimer, 1000);    // 1 seconds
}

function stopTimer()
{
    clearTimeout(gTimerTemperature);
}

function temperatureTimer()
{
  try {
   
    if (gTimerTemperatureTick === 0)
    {
      let visible = gMainWindow.isVisible();
      let request = server.lastRequest();
      let current = new Date().getTime();
      let diff= current - request;
      if (diff < 10000)   // stay active for 10 second after last request
      {
        readSensors.read();
        if (visible)
        {
          gMainWindow.webContents.send('insert_server_temperature_poll','');          
        }      
      }
      else
      {
        if (visible)
        {          
          readSensors.read();
          gMainWindow.webContents.send('insert_server_temperature_poll','Polling idle as soon as this window closes');          
        }
      }
    }
    else
    {
      server.temperature(readSensors.temperature());
    }
    gTimerTemperatureTick++;
    if (gTimerTemperatureTick > 1) gTimerTemperatureTick = 0;    

  } catch (error) {
    var ii = 1;
  }
}

function showLog(logType)
{
  try {
    clearTimeout(gTimerLog);
    gTimerLog =  setInterval(timerLog, 2000);

    let title = logging.logTitle(logType)

    let log = logging.logGet(logType)
    
    if (gLogging.type !== logType)
    {
      gLogging.len = -1;
    }
    gLogging.type = logType;

    if (gChildWindowLog == null)
    {
      let state = windowsState.get("log",500,800)
      gChildWindowLog = new BrowserWindow({
        'x': state.x,
        'y': state.y,
        'width': state.width,
        'height': state.height,      
        webPreferences: {
          sandbox : false,
          contextIsolation: false,  
          nodeIntegration: true,
          nodeIntegrationInWorker: true,
//          preload: path.join(__dirname, './preload/preload_log.js')
        }
      });
      gChildWindowLog.loadFile('index/index_log.html')
      gChildWindowLog.once('ready-to-show', () => {    
        gChildWindowLog.show();  
        gChildWindowLog.webContents.send('log_text', log); 
        gChildWindowLog.setTitle(title);
//        gChildWindowLog.webContents.openDevTools()    
      })  
      gChildWindowLog.on('close', () => {
        let bounds = gChildWindowLog.getBounds();
        windowsState.set("log",bounds.x,bounds.y, bounds.width, bounds.height)
      })
      gChildWindowLog.on('closed', () => {
        gChildWindowLog = null
      }) 
    }
    else
    {
      gChildWindowLog.setTitle(title); 
      gChildWindowLog.webContents.send('log_text', log); 
      gChildWindowLog.hide()
      gChildWindowLog.show()    
    }
  } catch (error) {
    var ii = 1;
  }
}

function timerLog()
{
  try {
    if (gChildWindowLog != null) 
    {
      let log = logging.logGet(gLogging.type)
      
      if (log.length !== gLogging.len)
      {
        gLogging.len = log.length;
        gChildWindowLog.webContents.send('log_text', log);
      }
    }
    else
    {
      clearTimeout(gTimerLog);      
    }
  } catch (error) {
    var ii = 1;
  }
} 