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

const Logging = require('../functions/logging');
const logging = new Logging();
const ReadWrite  = require('../functions/readwrite');
const readWrite = new ReadWrite();
const WindowsState = require('../functions/window_state');
const windowsState = new WindowsState();

const { networkInterfaces } = require('os');
const {BrowserWindow} = require('electron');

let gSettingsSend = null;

class SettingsSend{
    show(settings)
    {
      try {
        settingsShow(settings);
      } catch (error) {
        logging.logError('SettingsSend,show', error);         
      }
    }

    get()
    {
      try {
        return getSettings();          
      } catch (error) {
        logging.logError('SettingsSend,get', error);         
      }
        return gSettingsSend; 
    }

    apply(settings)
    {
      let json = null;
      try {
        json = JSON.stringify(settings);
        readWrite.write("settings", "settings.json",json);

        const ExtactIp = require('../misc/extract_ip');
        const extactIp = new ExtactIp();
        let allowIp = extactIp.validate(settings);
        if (allowIp.all) return;
        if (allowIp.invalid.length > 0)
        {
          gChildSettings.send('settings_error', allowIp.invalid); 
        }
        else
        {
          gChildSettings.send('settings_error', "");           
        }
      } catch (error) {
        logging.logError('SettingsSend,set', error);         
      }
    }

    send()
    {
      gChildSettings.send('settings_send_sensors', gSettingsSend);    
    }

  }
  module.exports = SettingsSend;

gChildSettings = null;

function settingsShow(settings)
{
    try {
        let title = "Send Sensors Settings";
        if (gChildSettings == null)
        {
          let state = windowsState.get("settings_send_sensors",700,800)
      
          gChildSettings = new BrowserWindow({
            'x' : state.x,
            'y' : state.y,
            'width': state.width,
            'height': state.height,
            webPreferences: {
              sandbox : false,
              contextIsolation: false,  
              nodeIntegration: true,
              nodeIntegrationInWorker: true,        
              preload: './preload/preload.js'
            }
          });
            gChildSettings.loadFile('index/index_settings.html')
            gChildSettings.once('ready-to-show', () => {    
//            gChildSettings.webContents.openDevTools()
              gChildSettings.show();  
              gChildSettings.setTitle(title);
              setTimeout(timerSettings,200,settings); // delay to make sure the windows is ready.
          }) 
          gChildSettings.on('close', () => {
            let bounds = gChildSettings.getBounds();
            windowsState.set("settings_send_sensors",bounds.x,bounds.y, bounds.width, bounds.height)
          })     
          gChildSettings.on('closed', () => {
            gChildSettings = null
          })    
        }
        else
        {
          gChildSettings.setTitle(title); 
          gChildSettings.hide();
          gChildSettings.show();
          inputIp(settings);
        }
              
    } catch (error) {
        logging.logError('SettingsSend,settings', error);        
    }  
}

function timerSettings(settings)
{
  inputIp(settings);
}

function inputIp(settings)
{
  let area = '<textarea id="settings_allowed_ip" name="settings_allowed_ip" rows="16" cols="40">' + settings.ip +'</textarea>';
  let text = "Ip address allowed to connect, next address on a new line.<br> Use * to allow all.<br>" + area;
  text += '<br><br><br><input id="settings_local_ip" name="settings_local_ip" type="text" value="' + settings.localIp +'"><label for="settings_local_ip"> Local IP:</label> ';
  text += '<br><br><input id="settings_port" name="settings_port" type="text" value="' + settings.port +'"><label for="settings_port"> Port:</label> ';
  let check = "";
  if (settings.hideLogin == "1") check = 'checked';
  text += '<br><br><input id="settings_hide" name="settings_hide" type="checkbox" ' + check +'> <label for="settings_hide"> Start hidden</label>'
  gChildSettings.send('settings_input_ip', text);
}

function getSettings()
{
  let settings = null;
  try {
    settings = JSON.parse(readWrite.read("settings", "settings.json"));
  } catch (error) {
    logging.logError('SettingsSend,getSettings', error);      
  }
  if (settings === null)
  {
    settings = new Object();
    settings.ip = "";
    settings.port = 31417;
    settings.hideLogin = "0"; 
  }
  if (settings.localIp === void 0)
  {
    let localIp = "";
    let localArr = getLocalIp();
    if (localArr.length > 0)
    {
      localIp = localArr[0];
    }
    settings.localIp = localIp;
  }
  return settings;
}


function getLocalIp()
{
  const ipArray = [];  
  try {  
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) 
    {
        for (const net of nets[name]) 
        {
            if (net.family === 'IPv4' && !net.internal) {
                ipArray.push(net.address);
            }
        }
    }
  } catch (error) {
    logging.logError('SettingsSend,localIp', error);      
  }
  return ipArray;

}