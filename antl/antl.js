var b = require('bonescript'),
    config = require('./config'),
    async = require('async');
// set up mongodb
var mongodb = require("mongodb"),
    mongoserver = new mongodb.Server(config.settings.mongodb_host, config.settings.mongodb_port, {auto_reconnect:true}),
    mongoclient = new mongodb.Db(config.settings.mongodb_database, mongoserver, {numberOfRetries:9999, w: 1}),
    mongocollection;

// PINS
var ldr_pin = 'P9_38';
var tmp_pin = 'P9_40';

// NOTES:
// may need to toss the first result, as it seems to be cached

function readSensors(callback) {
    var sensors = [{name:'light', 'pin':ldr_pin}, {name:'temperature', 'pin':tmp_pin}];
    async.mapSeries(sensors, function(sensor, cb){
        //console.log('requesting sensor: '+v);
        b.analogRead(sensor['pin'], function(val){
            if('value' in val)
            {
                sensor['value'] = val['value'];
                cb(null, sensor);
            }
            else
                cb('no value');
        });
    }, function(err, results){
        //console.log('readSensors: ');
        //console.dir(results);
        callback(err, results);
    });
	/*var ldr = b.analogRead(ldr_pin);
	var tmp = b.analogRead(tmp_pin);

	if (ldr < 1780 && tmp < 1780) {
		return {
			light: ldr,
			temperature: (tmp - 500) / 10
		};
	}
	else {
		console.log('sensor values are too high!');
		return false;
	}*/
}


function processReadings(readings)
{
    var light = null;
	var temperature = null;
	var reading_count = readings.length;
    var usable_reading_count = 0;
    
    for (var i = 0; i < reading_count; i++) {
    	var reading = readings[i];
    	if (reading.length == 2) {
            usable_reading_count++;
    		for (var j = 0; j < reading.length; j++) {
    			var sensor = reading[j];
                
				if (sensor.name === 'light') {
					var value = sensor.value;
                    //console.log(sensor.name+' '+value);
					if (light === null) {
						light = value;
					}
					else {
						light += value;
					}
				}
				if (sensor.name === 'temperature') {
                    var value = (sensor.value-500)/10;
                    //console.log(sensor.name+' '+value);
					if (temperature === null) {
						temperature = value;
					}
					else {
						temperature += value;
					}
				}

    			
    		}
    	}
    }
	temperature /= usable_reading_count;
	light /= usable_reading_count;

    
    var obj = {
        host: config.settings.machine_name,
        time: new Date(),
        light: light,
		temp: temperature
	};
    mongocollection.insert(obj, {safe:true}, function(err, records){
        if(err)
        {
            console.log('error while inserting record');
            console.log(err);
        }
        else
            console.log('inserted record');
    });
	console.log(obj);
}

function tick() {
    console.log('*tick*');
    async.timesSeries(10, function(n, next){
        setTimeout(function(){readSensors(next);}, 1000);
    }, function(err, readings){
        readings.shift(); // toss the first reading, since it somehow can be off sometimes.
        processReadings(readings);
    });
}

function start_ticking()
{
    console.log('Setting up intervalled tick');
    tick();
    setInterval(tick, 30000);
}


// load config
config.loadConfigFileSync('/home/root/.antl.conf');


// connect to mongo db
mongoclient.open(function(error, client){
    if(error)
    {
        console.log('error connecting to mongodb:');
        console.log(error);
        process.exit(1);
    }else{
        console.log('Connected to mongodb.');
        console.log('auth with: '+config.settings.mongodb_username);
        client.authenticate(config.settings.mongodb_username,config.settings.mongodb_password,function(error,data){
             if(data){
                client.collection(config.settings.mongodb_collection, function(error, collection) {
                    if(error)
                    {
                        console.log('error opening collecction:');
                        console.log(error);
                        process.exit(1);
                    }else{
                        console.log('Got collecction');
                        mongocollection = collection;
                        start_ticking();
                    }
                });
             }
             else{
                 console.log(error);
                 process.exit(1);
             }
        });

        

    }
});



