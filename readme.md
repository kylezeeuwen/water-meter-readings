#nickisawesome
# Installation
NB Tested with node 8.9.4 on OSX 10.13.6. No other environments tested yet 
NB Also tested with rasperry Pi 

## Prerequisites

* node

## Instructions

* in local repo directory, run `npm install`
* start server via `node server/bin/startServer.js`
* visit client pages:

    * `http://localhost:8080` : will immediately redirect to simple readings page
    * `http://localhost:8080/client` : will immediately redirect to simple readings page
    * `http://localhost:8080/client/startup.html` : will say "App loading" with a countdown, and redirect to simple readings page in 10 seconds
    * `http://localhost:8080/client/advanced-readings-page.html` : view and modify readings an settings
    * `http://localhost:8080/client/simple-readings-page.html` : view only mode of readings
    
* visit server pages:
 
    * `http://localhost:8080/server/health`
    * `http://localhost:8080/server/meter/water-rates`

### Configuring the Server

 Any variable in [./server/config/defaultConfig.js](server/config/defaultConfig.js) can be overridden on the command line by providing a parameter. "nested" parameters can be overridden one at a time using dot notation:
 
* Changing the location of the network filestore : `node server/bin/startServer.js --file_store.url='http://newlocation.com:8081'` 
* Changing the path and minimum interval of the keyboard command : `node server/bin/startServer.js --keyboard.path="/usr/bin/true" --keyboard.throttle_interval_seconds=6` 
* Changing the port the server binds to : `node server/bin/startServer.js --port='9000'` 
* Changing multiple things: `node server/bin/startServer.js --port='9000' --file_store.url='http://newlocation.com:8081' --handlerConfig.keyboard.path='/usr/bin/true'`

### Configuring the Client

#### To configure the delay on the startup.html page, add a 'delay' query parameter:

* `http://localhost/client/startup.html` will delay for 10 seconds then change browser to basic view 
* `http://localhost/client/startup.html?delay=15` will delay for 15 seconds then change browser to basic view 

#### To configure the auto reload delay on the meter readings pages:

Small code change in [./server/client/js/auto-reload.js](server/client/js/auto-reload.js) : change the value of the autoReloadDelayInMinutes var at top of file

# Initial Acceptance Criteria

Given a http hosted static json file [server/data/reading1.json](server/data/reading1.json), display something that looks like [assets/acceptance_criteria1.png](assets/acceptance_criteria1.png)

# Next steps

* ( 1-2  ) - I need to make the initial reading editable, and report KL readings using new equation, and detect pulse overflow
* DEFER - how to detect corrupt settings file

## known issues

* Given original displayName is X, If you update the displayName successfully to Y, then attempt to update to Z but fail, the display will revert to X, but the DB will maintain Y. After a page refresh, it will display Y. The same applies for litresPerPulse.
* If the meter settings file becomes corrupt, then the next time the server loads the corrupt file will be ignored and an default meter settings will be used (litres/pulse: 1, display name = device name). If someone then saves a value in the interface, the corrupt file will be overridden with a new file that ONLY CONTAINS THE UPDATE JUST MADE (other settings will be lost FOREVER).
* index.html is calling out to CDNs for dependencies, so this will not work when internet is down 
