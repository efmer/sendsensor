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
  ipcRenderer.on('settings_input_ip', (event, txt) => {
    $("#settings_input_ip").html(txt);
  });

  ipcRenderer.on('settings_error', (event, error) => {
    $("#settings_error").html(error);
  });

  $("#settings_apply").click(function( event ) {
    let ip = $('textarea#settings_allowed_ip').val(); 
    let localip = $('#settings_local_ip').val();    
    let port = $('#settings_port').val(); 
    port = parseInt(port);
    if (isNaN(port )) port = 31417;    
    let hide = getBool($("#settings_hide").is(":checked"));     
    ipcRenderer.send('settings_apply', ip, localip, port, hide);
  });
});

function getBool(val)
{
    if (val) return "1";
    return "0";
};