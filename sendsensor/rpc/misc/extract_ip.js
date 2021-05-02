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

class ExtactIp{
    validate(settings,ipList)
    {
        return validate(settings.ip,ipList)          
    }        
}
module.exports = ExtactIp;

function validate(ipArea)
{
    let allowIp = null;
    try {
        allowIp = new Object();
        if (ipArea.indexOf("*") >= 0)
        {
            allowIp.all = true;
            return allowIp;
        }
        else allowIp.all = false;
        allowIp.list = [];
        allowIp.invalid = "";
        let split = ipArea.split("\n");
        for (let i=0;i<split.length;i++)
        {
            let ip = split[i];
            if (validIp(ip))
            {
                allowIp.list.push(ip);
            }
            else
            {
                allowIp.invalid += "Invalid Ip found: " + ip + "<br>";
            }
        }  
    } catch (error) {
        logging.logError('ExtactIp,validatef', error);
        allowIp.invalid = "Look in the logging file for an error";
    }
    return allowIp;
}

function validIp(ip) 
{
    var CheckIP = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;           
    if(CheckIP.test(ip)) 
    {
        return (true)
    }
    return (false)
}