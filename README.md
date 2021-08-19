# HomeRemote_Plugin_PurpleAir
Purple Air integration for Home Remote; allows read-only access to one private sensor (with read key) or one public sensor.

## Plugin Settings:
- **SensorID**: ID of PurpleAir sensor (can be found in URL of public sensors)
- **ReadKey**: *[optional]* Required to access a private sensor
- **US_EPA_Correction**: Boolean value.  Default of "true" applies the US EPA correction to the PM2.5 reading in calculating the US AQI (more accurate for wildfire smoke).  More information about this correction can be found [here](https://cfpub.epa.gov/si/si_public_record_report.cfm?Lab=CEMM&dirEntryId=348488).

## Device capabilities:
- **AirQualitySensor**
- **PressureMeasurement**
- **RelativeHumidityMeasurement**
- **TemperatureMeasurement**

## Device attributes:
- **AirQuality**: Estimate of CAQI based solely on PM2.5 readings. (Required for compatibility with AirQualitySensor capability)
- **Altitude**: Altitude of PurpleAir sensor
- **Humidity**: Relative humidity inside housing of PurpleAir sensor.  Roughly 4% lower than ambient conditions.
- **Latitude**: Latitude of PurpleAir sensor
- **Longitude**: Longitude of PurpleAir sensor
- **Pm1**: Sensor's calculation of PM1.0 (ug/m3)
- **Pm10**: Sensor's calculation of PM10.0 (ug/m3)
- **Pm2_5**: Sensor's calculation of PM2.5 (ug/m3) using PurpleAir's correction
- **Pm2_5cf1**: Sensor's calculation of PM2.5 (ug/m3) without correction
- **Pm2_5_10minute**: Sensor's calculation of average PM2.5 over 10 minutes
- **Pm2_5_30minute**: Sensor's calculation of average PM2.5 over 30 minutes
- **Pm2_5_60minute**: Sensor's calculation of average PM2.5 over 60 minutes
- **Pm2_5_6hour**: Sensor's calculation of average PM2.5 over 6 hours
- **Pm2_5_24hour**: Sensor's calculation of average PM2.5 over 24 hours
- **Pm2_5_1week**: Sensor's calculation of average PM2.5 over 1 week
- **Pressure**: Pressure (millibars) measured inside housing of PurpleAir sensor
- **SensorName**: Name of sensor as assigned in PurpleAir
- **Temperature**: Temperature (degrees F) inside housing of PurpleAir sensor. Roughly 8 degrees F higher than ambient conditions.
- **UsAqi**: Calculation of US-defined AQI using the PM2.5 readings.  If US_EPA_Correction is "true", the US EPA correction for wildfire smoke is applied.
- **UsAqiDescription**: Label description of the AQI category (e.g. "Unhealthy for Sensitive Groups")
- **UsApiMessage**: Text describing the effects of the AQI category
