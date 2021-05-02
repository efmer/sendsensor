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

const SERVER_DEBUG = false;

const Logging = require('../functions/logging');
const logging = new Logging();

// https://www.yld.io/blog/building-a-tcp-service-using-node-js/
// https://gist.github.com/sid24rane/2b10b8f4b2f814bd0851d861d3515a10

let net = require('net');

let serverIdle = "No connections.";
let gAllowIp;
let gTemperatureString = "";
let gServer = null;
let gLastRequest = new Date().getTime() 

class Server{
    connect(window,settings)
    {
        server(window,settings)
            
    } catch (error) {
        logging.logError('Server,connect', error);            
    }
    lastRequest()
    {
        return gLastRequest; 
    }
    temperature(sensors)
    {
        makeTempString(sensors)
    }
}
module.exports = Server;

function server(window,settings)
{
    try {
        if (gServer !== null)
        {
            gServer.close();
            gServer = null;
        }
        window.webContents.send("insert_status",serverIdle);
        const ExtactIp = require('../misc/extract_ip');
        const extactIp = new ExtactIp();
        let allowIp = extactIp.validate(settings);
        if (!allowIp.all)
        {
            if (allowIp.invalid.length > 0)
            {
                window.webContents.send('insert_server_status', "IP address error, go to Extra->Setting.<br>Error: " + allowIp.invalid);
                return;
            }
            if (allowIp.list.length === 0)
            {
                window.webContents.send('insert_server_status', "No allowed IP address found, go to Extra->Setting.");
                return;
            }            
        }
        gAllowIp = allowIp;

        gServer = net.createServer();    

        gServer.on('close',function(){
            window.webContents.send("The server shut down.");
        });

        gServer.on('connection',function(socket){   
            let raddr = socket.remoteAddress;
            if (SERVER_DEBUG)   
            {
                let lport = socket.localPort;
                let laddr = socket.localAddress;
                let txt = "Listening at LOCAL port" + lport + "<br>";
                txt += "LOCAL ip :"  + laddr + "<br>";
        
                txt += "------------remote client info --------------<br>" ;
        
                let rport = socket.remotePort;
                let rfamily = socket.remoteFamily;
        
                txt += "REMOTE computer is listening on port" + rport + "<br>";
                txt += "REMOTE computer ip :"  + raddr + " " + rfamily + "<br>";
        
                txt += " --------------------------------------------";
                logging.logDebug(txt); 
            }

            gServer.getConnections(function(error,count){
                let txt = "Connected to: " + count + " computer(s), connected to IP: " + raddr;
                window.webContents.send('insert_status', txt);
                logging.logDebug(txt);                 
            });

        socket.setEncoding('utf8');

        // time in ms, 30 sec timeout.
        socket.setTimeout(30000,function(){
            socket.destroy();
        });

        socket.on('data',function(data){
            let raddr = socket.remoteAddress;
            if (!allowedIP(raddr))
            {
                logging.logDebug("Not alllowed request from IP : " + raddr); 
                return;
            }
            if (data.indexOf("<BT>") < 0) return;

            gLastRequest = new Date().getTime();

            if (SERVER_DEBUG)
            {
                let bread = socket.bytesRead;
                let bwrite = socket.bytesWritten;

                logging.logDebug("Bytes read : " + bread); 
                logging.logDebug("Bytes written : " + bwrite); 
                logging.logDebug("Data sent to server : " + data);
            }

            let is_kernel_buffer_full = socket.write(gTemperatureString);
            if(is_kernel_buffer_full){
                if (SERVER_DEBUG)
                {
                    logging.logDebug("Data was flushed successfully from kernel buffer i.e written successfully!");
                }
            }else{
              socket.pause();
            }          
        });

        socket.on('drain',function(){
            if (SERVER_DEBUG)
            {
                logging.logDebug("Write buffer is empty now, resume the writable stream!");
            }
            socket.resume();
        });
          
        socket.on('error',function(error){
            if (SERVER_DEBUG)
            {
                logging.logDebug("Error : " + error);
            }
        });

        socket.on('end',function(data){
            if (SERVER_DEBUG)
            {
                logging.logDebug("Socket ended from other end, data : " + data);
            }
        });

        socket.on('close',function(error){
            let raddr = socket.remoteAddress;

            gServer.getConnections(function(error,count){
                if (count === 0) window.webContents.send("insert_status",serverIdle);
                else window.webContents.send('insert_status', "Connected to: " + count);
                let txt = "Connected to: " + count + " computer(s), disconnected from IP: " + raddr;            
                logging.logDebug(txt);                
            });
            if (SERVER_DEBUG)
            {
                let bread = socket.bytesRead;
                let bwrite = socket.bytesWritten;
                logging.logDebug("Bytes read : " + bread);
                logging.logDebug("Bytes written : " + bwrite);
                logging.logDebug("Socket closed!");
                if(error){
                    logging.logDebug("Socket closed with error" + error);
                }
            }
        });
    });

    gServer.on('error',function(error){
       logging.logDebug("Error: " + error);
    });

    gServer.on('listening',function(){
        if (SERVER_DEBUG) logging.logDebug("I am listening");
    });

    gServer.maxConnections = 5;

    gServer.listen(settings.port, settings.localIp, function() { // force ipv4
        let address = gServer.address();
        let txt = "Listening Ip: " + address.address + " port: " + address.port;
        window.webContents.send('insert_server_status', txt);
        if (SERVER_DEBUG) logging.logDebug("Listen on : " + address.address + " port: " + address.port + " family: " + address.family);
    });

//    var islistening = gServer.listening;

    } catch (error) {
        logging.logError('Server,server', error);
    }
}

function allowedIP(ipIn)
{
    let ret = false;
    try {
        if (gAllowIp.all) return true;
        for(let i=0;i<gAllowIp.list.length;i++)
        {
            let ip = gAllowIp.list[i];
            if (ip === ipIn) return true;
        }    
    } catch (error) {
        logging.logError('Server,allowedIP', error);       
    }
    return ret;
}

// <TThrottle><HN: hostname>	header
// 
// <CT%d %.1f>" Cpu count, temperature  0-16
// <GT%d %.1f>" Cpu count  temperature  0-7
// <AA%d>		Auto active
//x <SC%d>		Set Core 
//x <SG%d>		Set Gpu 
//x <XC%d>		Max Cpu
//x <MC%d>		Min Cpu
//x <TX%s>		Program list
//x <RS%s>		Random string
//x <RG%d 34    Gpu run %
// <TThrottle>  end

// "<TThrottle><HN:Linux><PV 7.52><AC 1><TC 66><TG 43><NV 1><NA 0><DC 100><DG 100><CT0 66.4><CT1 65.5><CT2 66.8><CT3 64.1><GT0 43.0><RS1X8TPFn><AA1><SC70><SG64><XC100><MC2><TXAantal gevonden Programma's (Processen): 0\r\n>\u0000"

function makeTempString(sensors)
{
    try {
        if (sensors === null) return;
        let gpuC = 0
        if (sensors.gpuTList !== void 0) gpuC = sensors.gpuTList.length;
        let txt = "<TThrottle><HN:??>";
        txt += "<PV 0>";
        txt += "<AC 1>";   
        txt += "<TC 0>";
        txt += "<TG 0>";
        txt += "<NV " + gpuC + "";
        txt += "<NA 0>";;
        txt += "<DC 100>";   // cpu tthrottle;
        txt += "<DG 100>";   // gpu tthrottle;
        let cpuT = sensors.cpuTList;
        if (cpuT !== void 0)
        {
            for (let i=0;i<cpuT.length;i++)
            {
                txt += "<CT" + i + " " + cpuT[i] + ">";
            }
        }
        let gpuT = sensors.gpuTList;
        if (gpuT !== void 0)
        {
            for (let i=0;i<gpuT.length;i++)
            {
                txt += "<GT" + i + " " + gpuT[i] + ">";
            }
        }
        let gpuP = sensors.gpuPList;
            if (gpuP !== void 0)   
            {
            for (let i=0;i<gpuP.length;i++)
            {
                txt += "<GP" + i + " " + gpuP[i] + ">";
            }
        }
        txt += "<TThrottle>";
        gTemperatureString = txt;        
    } catch (error) {
        logging.logError('Server,makeTempString', error);         
    }

   
}