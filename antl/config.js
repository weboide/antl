/* Handles configuration */

var fs = require('fs');
var os = require('os');


// default config
var settings = exports.settings = {
    machine_name: os.hostname(),
    mongodb_host: 'localhost',
    mongodb_port: '27017',
    mongodb_database: 'beaglebone',
    mongodb_collection: 'sensors',
    mongodb_username: null,
    mongodb_password: null,
    xively_api_url: null,
    xively_api_key: null
};

exports.loadConfigFileSync = function(filepath) {
    var data, conf;
    
    try {
        data = fs.readFileSync(filepath);
    }
    catch (err) {
        console.log('Could not read file: ' + filepath);
        console.log(err);
        return false;
    }
    
    try {
        conf = JSON.parse(data);
    }
    catch (err) {
        console.log('There has been an error parsing your JSON.');
        console.log(err);
        return false;
    }
    
    for(var key in conf) {
        if(key in settings)
            settings[key] = conf[key];
    }
    return true;
};
