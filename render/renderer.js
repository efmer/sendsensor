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

const { ipcRenderer } = require('electron')

'use strict';

$(document).ready(function() {
  ipcRenderer.on('insert_connections', (event, tableData) => {
    $("#insert_connections").html(tableData);
  });
  ipcRenderer.on('insert_server_status', (event, txt) => {
    $("#insert_server_status").html(txt);
  });
  ipcRenderer.on('insert_status', (event, txt) => {
    $("#insert_status").html(txt);
  });
  ipcRenderer.on('insert_server_temperature_cpu', (event, txt) => {
    $("#insert_server_temperature_cpu").html(txt);
  });
  ipcRenderer.on('insert_server_temperature_gpu', (event, txt) => {
    $("#insert_server_temperature_gpu").html(txt);
  }); 
  ipcRenderer.on('insert_server_temperature_poll', (event, txt) => {
    $("#insert_server_temperature_poll").html(txt);
  });
  ipcRenderer.on('insert_sensors_sensor', (event, txt) => {
    $("#insert_sensors_sensor").html(txt);
  });
  ipcRenderer.on('insert_sensors_nvidia', (event, txt) => {
    $("#insert_sensors_nvidia").html(txt);
  });
});