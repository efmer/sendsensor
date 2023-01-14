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

const os = require('os');
const { spawn } = require('child_process');

const Logging = require('../functions/logging');
const logging = new Logging();

let DEBUG_FAKE = false;

//sensors -u coretemp-isa-0000 -j
let dataSensors = {
   "coretemp-isa-0000":{
      "Adapter": "ISA adapter",
      "Package id 0":{
         "temp1_input": 84.000,
         "temp1_max": 80.000,
         "temp1_crit": 100.000,
         "temp1_crit_alarm": 0.000
      },
      "Core 0":{
         "temp2_input": 82.000,
         "temp2_max": 80.000,
         "temp2_crit": 100.000,
         "temp2_crit_alarm": 0.000
      },
      "Core 1":{
         "temp3_input": 83.000,
         "temp3_max": 80.000,
         "temp3_crit": 100.000,
         "temp3_crit_alarm": 0.000
      },
      "Core 2":{
         "temp4_input": 84.000,
         "temp4_max": 80.000,
         "temp4_crit": 100.000,
         "temp4_crit_alarm": 0.000
      },
      "Core 3":{
         "temp5_input": 80.000,
         "temp5_max": 80.000,
         "temp5_crit": 100.000,
         "temp5_crit_alarm": 0.000
      }
   }
}
//nvidia-smi --query-gpu=name,utilization.gpu,temperature.gpu --format=csv
let dataNvidia = "name, utilization.gpu [%], temperature.gpu\nGeForce GTX 1080, 81 %, 70\nGeForce GTX 770, [N/A], 27";

let gSensors = null;
let gMainWindow = null;

class ReadSensors{
   start(window)
   {
      gMainWindow = window;
      sensorRead();
   }
   read()
   {
      sensorRead();
   } catch (error) {
      logging.logError('ReadSensors,read', error);            
   }
   temperature()
   {
      return gSensors;
   }   
}
module.exports = ReadSensors;

function sensorRead()
{
   if (gSensors === null) gSensors = new Object();

   setTimeout(function(){ readSensors(); }, 10);  //make async
   setTimeout(function(){ readNvidia(); }, 10);
   setTimeout(function(){ readPi(); }, 10);   

   try {
      let txt = "";
      if (gMainWindow.isVisible())
      {
         let list = gSensors.cpuTList;
         if (list !== void 0)
         {
            for (let i = 0;i<list.length;i++)
            {
               txt += "Cpu" + i + ": " + list[i] + "℃ ";
            }
         }
         if (txt.length > 0)
         {
            gMainWindow.webContents.send('insert_server_temperature_cpu', txt);
         }
         else
         {
            gMainWindow.webContents.send('insert_server_temperature_cpu', "No sensor data");
         }
         txt = "";         
         list = gSensors.gpuTList;
         listP = gSensors.gpuPList
         if (list !== void 0)
         {
            for (let i = 0;i<list.length;i++)
            {
               txt += "Gpu" + i + ": " + list[i] + "℃ " + listP[i] + "% ";
            }
         }
         if (txt.length > 0)
         {
            gMainWindow.webContents.send('insert_server_temperature_gpu', txt);
         }
         else
         {
            gMainWindow.webContents.send('insert_server_temperature_gpu', "No sensor data");
         }
      }       
    } catch (error) {
      logging.logError('ReadSensors,sensorTimer', error);            
    }
}

function readSensors()
{
   try {
      if (DEBUG_FAKE)
      {
         let data = dataSensors;
         parseSensors(data);
      }
      else
      {
         let completeData = "";
         const sensors = spawn('sensors',['coretemp-isa-0000','-j']);
         
         sensors.stdout.on('data', function(data) {
            gMainWindow.webContents.send('insert_sensors_sensor', "sensors: OK");
            completeData += data;
         });      

         sensors.stderr.on('data', function(data) {
            var ii = 1;
         });         
         
         sensors.on('close', function(code) {
            try {
               let str = String(completeData);
               str = str.replace( /\s\s+/g, ' ' )
               let obj = JSON.parse(str);
               parseSensors(obj);               
            } catch (error) {
               
            }
         });         

         sensors.on('error', function(err) {
            gMainWindow.webContents.send('insert_sensors_sensor', "sensors: not Found"); 
         });
      }   
   } catch (error) {
      logging.logError('ReadSensors,readSensors', error);    
   }

}

function parseSensors(data)
{
   let cpuTList = [];
   try {
      let cpu = data['coretemp-isa-0000'];
      for (let i=0;i<30;i++)
      {
         core = cpu['Core ' + i];
         if (core === void 0) break;
         let temp = core['temp' + (i+2) + '_input'];
         if (temp === void 0) temp = core['temp' + (i+1) + '_input'];
         if (temp === void 0) temp = core['temp' + (i+3) + '_input'];
         if (isNaN(temp) || (temp === void 0)) temp = -1;         
         cpuTList.push(temp)
      }   
   } catch (error) {
      var ii = 1;
   }
   gSensors.cpuTList = cpuTList;
}

function readNvidia()
{
   try {
      if (DEBUG_FAKE)
      {
         let data = dataNvidia;
         parseNvidia(data);
      }
      else
      {
         let completeData = "";
         const smi = spawn('nvidia-smi', ['--query-gpu=name,utilization.gpu,temperature.gpu','--format=csv']);
       
         smi.stdout.on('data', function(data) {
            gMainWindow.webContents.send('insert_sensors_nvidia', "nvidia-smi: OK");
            completeData += data;
         });      

         smi.stderr.on('data', function(data) {
            var ii = 1;
         });         
         
         smi.on('close', function(code) {
            let str = String(completeData);
            parseNvidia(str);
         });         

         smi.on('error', function(err) {
            gMainWindow.webContents.send('insert_sensors_nvidia', "nvidia-smi: Not found");
         });
      } 
   } catch (error) {
      logging.logError('ReadSensors,readNvidia', error); 
   }
}

function parseNvidia(data)
{
   let gpuTList = [];
   let gpuPList = [];
   try {
      let items = data.split("\n");
      for (let i=1;i< items.length;i++)
      {
         let item = items[i];
         let itemsc = item.split(',')
         if (itemsc.length === 3)
         {
            let perc = parseFloat(itemsc[1]);
            if (isNaN(perc)) perc = -1;
            gpuPList.push(perc);
            let temp = parseFloat(itemsc[2]);
            if (isNaN(temp)) temp = -1;
            gpuTList.push(temp);
         }
         var ii = 1;
      }
      var ii = 1;  
   } catch (error) {
      var ii =1;
   }
   gSensors.gpuPList = gpuPList;   
   gSensors.gpuTList = gpuTList;
}

function readPi()
{
   try {
      if (os.platform() !== 'linux')
      {
         gMainWindow.webContents.send('insert_sensors_pi', "pi: No Linux");
         return;         
      }
      if (os.arch() !== 'arm')
      {
         gMainWindow.webContents.send('insert_sensors_pi', "pi: No Arm");
         return;
      }

      if (DEBUG_FAKE)
      {
         let data = dataPi;
         parsePi(data);
      }
      else
      {
         let completeData = "";
         const pi = spawn('cat', ['/sys/class/thermal/thermal_zone0/temp']);
       
         pi.stdout.on('data', function(data) {
            gMainWindow.webContents.send('insert_sensors_pi', "pi: OK");
            completeData += data;
         });      

         pi.stderr.on('data', function(data) {
            var ii = 1;
         });         
         
         pi.on('close', function(code) {
            let str = String(completeData);
            parsePi(str);
         });         

         pi.on('error', function(err) {
            gMainWindow.webContents.send('insert_sensors_pi', "pi: Not found");
         });
      } 
   } catch (error) {
      logging.logError('ReadSensors,readPi', error); 
   }
}

function parsePi(data)
{
   let cpuTList = [];
   try {
      let temp = data /= 1000;
      temp = Math.round(temp * 10) / 10;
      cpuTList.push(temp)   
   } catch (error) {
      var ii =1;
   }
   gSensors.cpuTList = cpuTList;
}