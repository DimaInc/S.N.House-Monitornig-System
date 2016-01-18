/**
 *  Copyright 2014 Nest Labs Inc. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
/* globals $, Firebase */
(function () {
    'use strict';
    
    var nestToken, dataRef, allStructures = {}, allDevices = {};

    nestToken = getNestToken();
    dataRef = oAuth(nestToken);
    
    $('#logOutButton').on('click', function () {
        dataRef.unauth();
        window.location.replace('/auth/nest');
    });


    dataRef.on('value', function (snapshot) {
        
        var data = snapshot.val(),
            newStructures = data.structures;
        allDevices = data.devices;

        if (isIDsChanged(allStructures, newStructures) ||
            isNamesChanged(allStructures, newStructures) ||
            isDevicesChanged(allStructures, newStructures)) {
            
            allStructures = newStructures;

            updateStructuresTreeView(allStructures);
            updateSmokeCOAlarmsListners(allStructures, snapshot.child('devices/smoke_co_alarms'));
            updateStructureAwayStatusListners(allStructures, snapshot.child('structures'));
        }
    });

    function updateStructuresTreeView(allStructures) {
        
        showLoading();
        _.each($('#structures section'), function (listItem) {
            listItem.remove();
        });
        
        hideLoading();
        _.each(allStructures, function (structure) {
            $('#structures').append(getCommonHouseViewTemplate(structure.name, structure.structure_id));
            $('#status' + structure.structure_id).text(structure.away);
            $('#'+structure.structure_id + " > header").addClass(structure.away);
        });
    }
    
    function updateSmokeCOAlarmsListners(allStructures, smokeCOAlarms) {
        for (var id in smokeCOAlarms.val()) {
            var alarm = smokeCOAlarms.child(id);
            var deviceLocation = getStrucureBySmokeCOAlarmID(allStructures, id);
            listenForSmokeAlarms(alarm, deviceLocation, id);
        }
    }

    function listenForSmokeAlarms(alarm, deviceLocation, smokeCOAlarmID) {
        
        var alarmState;
        alarm.child('smoke_alarm_state').ref().on('value', function (state) {
            var roomName = getDeviceRoomByID(deviceLocation, smokeCOAlarmID),
                viewElementID = "alarm" + deviceLocation.structure_id + smokeCOAlarmID;

            if (alarmState !== state.val()) {
                setAlarmStatusOnView(deviceLocation, viewElementID, state.val(), roomName);

                var isEmergency = isAnyEmergency(deviceLocation);
                var isWarning = isAnyWarning(deviceLocation);
                
                if(isEmergency) {
                    setEmergencyEffects(deviceLocation, alarmState);
                }
                
                if(isWarning) {
                    setWarningEffects(deviceLocation, alarmState);
                }
                
                if(!isWarning && !isEmergency) {
                    getFirstHeaderElement(deviceLocation).removeClass(alarmState + "House"); 
                }
                
                if(!isEmergency) {
                    getFirstHeaderElement(deviceLocation).find("#house_image").attr("src", "images/house.png");
                    getFirstHeaderElement(deviceLocation).find("#house_image").removeClass("animated infinite shake");
                }
            }

            alarmState = state.val();
        });
    }
    
    function updateStructureAwayStatusListners(structures, allStructures) {
        for (var id in allStructures.val()) {
            var status = allStructures.child(id);
            var location = getStrucureObjByID(structures, id);
            listenForAwayStatus(status, location);
        }
    }

    function listenForAwayStatus(status, location) {
        
        var awayState;
        status.child('away').ref().on('value', function (state) {
            $('#status' + location.structure_id).text(state.val());
            getFirstHeaderElement(location).removeClass("away auto-away home");
            getFirstHeaderElement(location).addClass(state.val());
            awayState = state.val();
        });
    }
    
    function oAuth(token) {
        if (token) {
            var dataRef = new Firebase('wss://developer-api.nest.com');
            dataRef.auth(token);
            return dataRef;
        } else {
            window.location.replace('/auth/nest');
        }
    }

    function getNestToken() {
        return $.cookie('nest_token');
    }
    
    function showLoading() {
        $('#loadImg').removeClass("hide");
        $('#loadImg').addClass("show");
    }
    
    function hideLoading() {
        $('#loadImg').removeClass("show");
        $('#loadImg').addClass("hide");
    }
    
    function isAnyWarning(location) {
              if($('#'+location.structure_id ).find(".warning").length > 0){
          return true;  
       }
        return false; 
    }
    
    function isAnyEmergency(location){
       if($('#'+location.structure_id ).find(".emergency").length > 0){
          return true;  
       }
        return false;
    }
    
    function setAlarmStatusOnView(deviceLocation, viewElementID, state, roomName) {
        $('#' + viewElementID).remove();
        $('#status' + deviceLocation.structure_id).after("<h6 class=" + state + " id=" + viewElementID + 
                                                         ">Smoke status: " + state + "</h6>");
        $('#' + viewElementID).append("<p>" + roomName + "</p>");
    }
    
    function setEmergencyEffects(deviceLocation, alarmState) {
        getFirstHeaderElement(deviceLocation).removeClass(alarmState + "House");
        getFirstHeaderElement(deviceLocation).find("#house_image").attr("src", "images/houseBurned.png");
        getFirstHeaderElement(deviceLocation).find("#house_image").addClass("animated infinite shake");
        $('#'+deviceLocation.structure_id ).find(".emergency").addClass("animated infinite flash");
        getFirstHeaderElement(deviceLocation).addClass("emergency" + "House");
    }
    
    function setWarningEffects(deviceLocation, alarmState) {
        getFirstHeaderElement(deviceLocation).removeClass(alarmState + "House");
        getFirstHeaderElement(deviceLocation).addClass("warning" + "House");
    }
    
    function getFirstHeaderElement(deviceLocation) {
        return $('#'+deviceLocation.structure_id + " > header");
    }
    
    function isIDsChanged(oldModel, newModel) {
        
        var oldModelIDsArray = getStructuresIDsArray(oldModel);
        var newModelIDsArray = getStructuresIDsArray(newModel);

        return !(JSON.stringify(oldModelIDsArray) === JSON.stringify(newModelIDsArray));
    }

    function getStructuresIDsArray(structures) {
        
        return _.map(structures, function (structureObj) {
            return structureObj.structure_id;
        });
    }

    function isNamesChanged(oldModel, newModel) {
        
        var oldModelNamesArray = getStructuresNamesArray(oldModel);
        var newModelNamesArray = getStructuresNamesArray(newModel);

        return !(JSON.stringify(oldModelNamesArray) === JSON.stringify(newModelNamesArray));
    }

    function getStructuresNamesArray(structures) {
        
        return _.map(structures, function (structureObj) {
            return structureObj.name;
        });
    }

    function isDevicesChanged(oldModel, newModel) {

        var oldModelAlarmsArray = getStructuresSmokeCOAlarmDevicesIDsArray(oldModel);
        var newModelAlarmsArray = getStructuresSmokeCOAlarmDevicesIDsArray(newModel);

        return !(JSON.stringify(oldModelAlarmsArray) === JSON.stringify(newModelAlarmsArray));
    }

    function getStructuresSmokeCOAlarmDevicesIDsArray(structures) {
        
        var nestedArray = _.map(structures, function (structureObj) {
            return _.map(structureObj.smoke_co_alarms, function (smoke_co_alarm) {
                return smoke_co_alarm;
            });
        });
        
        return _.flatten(nestedArray);
    }
    
    function getStrucureBySmokeCOAlarmID(allStructures, id) {

        return _.find(allStructures, function (structure) {
            return _.contains(structure.smoke_co_alarms, id);
        });
    }

    function getDeviceRoomByID(structure, deviceID) {

        var currentDevice = _.find(allDevices.smoke_co_alarms, function (device) {
            return (device.device_id == deviceID);
        });

        var room = _.find(structure.wheres, function (where) {
            return (where.where_id == currentDevice.where_id);
        });

        return room.name;
    }
    
    function getStrucureObjByID(allStructures, id) {

        return _.find(allStructures, function (structure) {
            return (structure.structure_id == id);
        });
    }
    
    function getCommonHouseViewTemplate(name, id){
        return " <section class=\"section--center mdl-grid mdl-grid--no-spacing mdl-shadow--2dp\" id=" + id +
            "><header class=\"mdl-cell mdl-cell--3-col-desktop mdl-cell--2-col-tablet\"><img id=\"house_image\""+
            "src=\"images/house.png\"></img><img src=\"images/houseBurned.png\"style=\"display:none\">" +
            "</img></header><div class=\"mdl-card mdl-cell mdl-cell--9-col-desktop mdl-cell--6-col-tablet\"><div class=" +
            "\"mdl-card__supporting-text\"><h4>" + name + "</h4><h6 id=status" + id + "></h6></div></div></section>";
    }
})();
