plugin.Name = "PurpleAirPlugin";
plugin.OnChangeRequest = onChangeRequest;
plugin.OnConnect = onConnect;
plugin.OnDisconnect = onDisconnect;
plugin.OnPoll = onPoll;
plugin.OnSynchronizeDevices = onSynchronizeDevices;
plugin.PollingInterval = 300000;
plugin.DefaultSettings = {
    "SensorID": "", "ReadKey": "", "US_EPA_Correction": "true"
};

var http = new HTTPClient();
var url;
var usEpaCorrection;
const apiKey = "3F1EF34E-0100-11EC-BAD6-42010A800017";

function onChangeRequest(device, attribute, value) {
}

function onConnect() {
    
    url = "https://api.purpleair.com/v1/sensors/" + plugin.Settings["SensorID"] + "?api_key=" + apiKey;
    if (plugin.Settings["ReadKey"] != "") {
        url = url + "?read_key=" + pluginSettings["ReadKey"];
    }
    if (plugin.Settings["US_EPA_Correction"] == "true") {
        usEpaCorrection = true; 
    } else {
        usEpaCorrection = false;
    }
}

function onDisconnect() {
    
}

function onPoll() {
    updateAQI();
}

function onSynchronizeDevices() {
    var aqiSensor = new Device();
    aqiSensor.Id = "1";
    aqiSensor.Name = "PurpleAirSensor";
    aqiSensor.DisplayName = "PurpleAirSensor";
    aqiSensor.Capabilities = ["AirQualitySensor", "PressureMeasurement", "RelativeHumidityMeasurement", "TemperatureMeasurement"];
    aqiSensor.Attributes = ["SensorName", "Latitude", "Longitude", "Altitude", "Pm1", "Pm2_5", "Pm2_5cf1", "Pm10", "Pm2_5_10minute", "Pm2_5_30minute", "Pm2_5_60minute", "Pm2_5_6hour", "Pm2_5_24hour", "Pm2_5_1week", "UsAqi", "UsEpaAqi", "UsAqiDescription", "UsAqiMessage"];
    aqiSensor.DetailsTemplate = "AirQualitySensorDetails.xaml";
    aqiSensor.TileTemplate = "AirQualitySensorTile.xaml";
    aqiSensor.Icon = "Gauge";
    plugin.Devices[aqiSensor.Id] = aqiSensor;
}

function updateAQI() {
    var response = http.get(url);
    
    if (response.status != 200) { //Any response other than 200 indicates a problem with the request
        console.log("PurpleAir Plugin ERROR! Status " + response.status + ": " + response.statusText);
        return;
    }
    
    var sensorDevice = plugin.Devices["1"];
    if (sensorDevice != null) {
        var aqdata = response.data.sensor;
        sensorDevice.SensorName = aqdata.name;
        sensorDevice.Latitude = aqdata.latitude;
        sensorDevice.Longitude = aqdata.longitude;
        sensorDevice.Altitude = aqdata.altitude;
        sensorDevice.Humidity = aqdata.humidity;    //Server response Null if not equipped.  On average, this reading (inside the housing) is 4% lower than ambient conditions.
        sensorDevice.Temperature = aqdata.temperature;    //Server response Null if not equipped. On average, this reading (inside the housing) is 8 degrees F higher than ambient conditions.
        sensorDevice.Pressure = aqdata.pressure; //units = millibars
        sensorDevice.Pm1 = aqdata["pm1.0"];  //units = ug/m3 for all PM measurements
        sensorDevice.Pm2_5 = aqdata["pm2.5"];
        sensorDevice.Pm2_5cf1 = aqdata["pm2.5_cf_1"];
        sensorDevice.Pm10 = aqdata["pm10.0"];
        sensorDevice.Pm2_5_10minute = aqdata.stats["pm2.5_10minute"];
        sensorDevice.Pm2_5_30minute = aqdata.stats["pm2.5_30minute"];
        sensorDevice.Pm2_5_60minute = aqdata.stats["pm2.5_60minute"];
        sensorDevice.Pm2_5_6hour = aqdata.stats["pm2.5_6hour"];
        sensorDevice.Pm2_5_24hour = aqdata.stats["pm2.5_24hour"];
        sensorDevice.Pm2_5_1week = aqdata.stats["pm2.5_1week"];

        if (usEpaCorrection) {
            var pm25 = correctedPMFromEPA(sensorDevice.Pm2_5cf1, sensorDevice.Humidity);
        } else {
            var pm25 = sensorDevice.Pm2_5;
        }
        sensorDevice.AirQuality = caqiFromPM(pm25); //Actual CAQI measures NO2, PM10, and O3.  We only have PM, so this is an estimate rather than an actual CAQI measurement.
        sensorDevice.UsAqi = aqiFromPM(pm25);
        sensorDevice.UsAqiDescription = getAQIDescription(sensorDevice.UsAqi);
        sensorDevice.UsAqiMessage = getAQIMessage(sensorDevice.UsAqi);
    }
}

// US EPA correction for wildfire smoke.  Only valid for 0-250 ug/m3 range, per PurpleAir.  pm is 2.5 at CF=1; RH = relative humidity
function correctedPMFromEPA(pm, rh) {
    return 0.534 * pm - 0.0844 * rh + 5.604;
}

function caqiFromPM(pm) {
    if (isNaN(pm)) return "-"; 
    if (pm == undefined) return "-";
    if (pm < 0) return pm; 
    if (pm > 110) return 101;
    if (pm <= 30) return Math.round(pm*1.667);
    if (pm <=55) return (pm + 20);
    var tempPM = pm - 55;
    return Math.round(tempPM*0.455 + 75);
}


/* 
Below here are functions from the PurpleAir API documentation
*/

function aqiFromPM(pm) {
    if (isNaN(pm)) return "-"; 
    if (pm == undefined) return "-";
    if (pm < 0) return pm; 
    if (pm > 1000) return "-"; 
      /*      
            Good                              0 - 50         0.0 - 15.0         0.0 – 12.0
      Moderate                        51 - 100           >15.0 - 40        12.1 – 35.4
      Unhealthy for Sensitive Groups   101 – 150     >40 – 65          35.5 – 55.4
      Unhealthy                                 151 – 200         > 65 – 150       55.5 – 150.4
      Very Unhealthy                    201 – 300 > 150 – 250     150.5 – 250.4
      Hazardous                                 301 – 400         > 250 – 350     250.5 – 350.4
      Hazardous                                 401 – 500         > 350 – 500     350.5 – 500
      */
    if (pm > 350.5) {
        return calcAQI(pm, 500, 401, 500, 350.5);
    } else if (pm > 250.5) {
        return calcAQI(pm, 400, 301, 350.4, 250.5);
    } else if (pm > 150.5) {
        return calcAQI(pm, 300, 201, 250.4, 150.5);
    } else if (pm > 55.5) {
        return calcAQI(pm, 200, 151, 150.4, 55.5);
    } else if (pm > 35.5) {
        return calcAQI(pm, 150, 101, 55.4, 35.5);
    } else if (pm > 12.1) {
        return calcAQI(pm, 100, 51, 35.4, 12.1);
    } else if (pm >= 0) {
        return calcAQI(pm, 50, 0, 12, 0);
    } else {
        return undefined;
    }
}

function bplFromPM(pm) {
    if (isNaN(pm)) return 0; 
    if (pm == undefined) return 0;
    if (pm < 0) return 0; 
      /*      
            Good                              0 - 50         0.0 - 15.0         0.0 – 12.0
      Moderate                        51 - 100           >15.0 - 40        12.1 – 35.4
      Unhealthy for Sensitive Groups   101 – 150     >40 – 65          35.5 – 55.4
      Unhealthy                                 151 – 200         > 65 – 150       55.5 – 150.4
      Very Unhealthy                    201 – 300 > 150 – 250     150.5 – 250.4
      Hazardous                                 301 – 400         > 250 – 350     250.5 – 350.4
      Hazardous                                 401 – 500         > 350 – 500     350.5 – 500
      */
      if (pm > 350.5) {
      return 401;
      } else if (pm > 250.5) {
      return 301;
      } else if (pm > 150.5) {
      return 201;
      } else if (pm > 55.5) {
      return 151;
      } else if (pm > 35.5) {
      return 101;
      } else if (pm > 12.1) {
      return 51;
      } else if (pm >= 0) {
      return 0;
      } else {
      return 0;
      }
}

function bphFromPM(pm) {
    //return 0;
    if (isNaN(pm)) return 0; 
    if (pm == undefined) return 0;
    if (pm < 0) return 0; 
      /*      
            Good                              0 - 50         0.0 - 15.0         0.0 – 12.0
      Moderate                        51 - 100           >15.0 - 40        12.1 – 35.4
      Unhealthy for Sensitive Groups   101 – 150     >40 – 65          35.5 – 55.4
      Unhealthy                                 151 – 200         > 65 – 150       55.5 – 150.4
      Very Unhealthy                    201 – 300 > 150 – 250     150.5 – 250.4
      Hazardous                                 301 – 400         > 250 – 350     250.5 – 350.4
      Hazardous                                 401 – 500         > 350 – 500     350.5 – 500
      */
    if (pm > 350.5) {
        return 500;
    } else if (pm > 250.5) {
        return 500;
    } else if (pm > 150.5) {
        return 300;
    } else if (pm > 55.5) {
        return 200;
    } else if (pm > 35.5) {
        return 150;
    } else if (pm > 12.1) {
        return 100;
    } else if (pm >= 0) {
        return 50;
    } else {
        return 0;
    }
}

function calcAQI(Cp, Ih, Il, BPh, BPl) {
    var a = (Ih - Il);
    var b = (BPh - BPl);
    var c = (Cp - BPl);
    return Math.round((a/b) * c + Il);
}


function getAQIDescription(aqi) {
    if (aqi >= 401) {
        return 'Hazardous';
    } else if (aqi >= 301) {
        return 'Hazardous';
    } else if (aqi >= 201) {
        return 'Very Unhealthy';
    } else if (aqi >= 151) {
        return 'Unhealthy';
    } else if (aqi >= 101) {
        return 'Unhealthy for Sensitive Groups';
    } else if (aqi >= 51) {
        return 'Moderate';
    } else if (aqi >= 0) {
        return 'Good';
    } else {
        return undefined;
    }
}

function getAQIMessage(aqi) {
    if (aqi >= 401) {
        return '>401: Health alert: everyone may experience more serious health effects';
    } else if (aqi >= 301) {
        return '301-400: Health alert: everyone may experience more serious health effects';
    } else if (aqi >= 201) {
        return '201-300: Health warnings of emergency conditions. The entire population is more likely to be affected. ';
    } else if (aqi >= 151) {
        return '151-200: Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects.';
    } else if (aqi >= 101) {
        return '101-150: Members of sensitive groups may experience health effects. The general public is not likely to be affected.';
    } else if (aqi >= 51) {
        return '51-100: Air quality is acceptable; however, for some pollutants there may be a moderate health concern for a very small number of people who are unusually sensitive to air pollution.';
    } else if (aqi >= 0) {
        return '0-50: Air quality is considered satisfactory, and air pollution poses little or no risk';
    } else {
        return undefined;
    }
}
