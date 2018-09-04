
# Installation
NB Tested with node 8.9.4 on OSX 10.13.6. No other environments tested yet 
NB Also tested with rasperry Pi 

## Prerequisites

* node

## Instructions

* in local repo directory, run `npm install`
* start server via `node bff/src/startServer.js`
* visit `http://localhost:8080/client/` , `http://localhost:8080/server/health`, and/or `http://localhost:8080/server/meter/water-rates`

### Configuring the Server

 Any variable in [./bff/config/defaultConfig.js](./bff/config/defaultConfig.js) can be overridden on the command line by providing a parameter. "nested" parameters can be overridden one at a time using dot notation:
 
* Changing the location of the network filestore : `node bff/bin/startServer.js --fileStore.url='http://newlocation.com:8081'` 
* Changing the path of the keyboard command : `node bff/bin/startServer.js --keyboard.path='/new/path'` 
* Changing the port the server binds to : `node bff/bin/startServer.js --port='9000'` 
* Changing multiple things: `node bff/bin/startServer.js --port='9000' --fileStore.url='http://newlocation.com:8081' --keyboard.path='/new/path'`

### Configuring the Client

#### To configure the delay on the startup.html page, add a 'delay' query parameter:

* `http://localhost/client/startup.html` will delay for 10 seconds then change browser to basic view 
* `http://localhost/client/startup.html?delay=15` will delay for 15 seconds then change browser to basic view 

#### To configure the auto reload delay on the meter readings pages:

Small code change in [./bff/client/js/auto-reload.js](./bff/client/js/auto-reload.js) : change the value of the autoReloadDelayInMinutes var at top of file

# Initial Acceptance Criteria

Given a http hosted static json file [bff/data/reading1.json](bff/data/reading1.json), display something that looks like [assets/acceptance_criteria1.png](assets/acceptance_criteria1.png)

# Next steps

* remove all bff references
* support command line parameter overrides for config file
* ( 1 ) - add a startup page that delays for X then redirects to client/. Add better routes
* ( 0.25 ) - limit decimals in reading (K.L)
* ( 0.25 ) - 'meter 1' !== 'meter 1' cuz of spaces issue
* ( 1-2 ) - interact with X4
* ( 0.25 ) - on load read settings from network (always use the X4 for settings)
* ( 0.25 ) - on save settings write settings file to the network
* ( 0.25 ) - get readings from network
* ( 1-2  ) - I need to make the initial reading editable, and report KL readings using new equation, and detect pulse overflow
* ( 0.25 ) - refresh logic:
  ** button to refresh browser
  ** auto refresh browser every X minutes
* ( 0.5 ) - no external internet (pull in all your libraries)
* DEFER - how to detect corrupt settings file

## known issues

* Given original displayName is X, If you update the displayName successfully to Y, then attempt to update to Z but fail, the display will revert to X, but the DB will maintain Y. After a page refresh, it will display Y. The same applies for litresPerPulse.
* If the meter settings file becomes corrupt, then the next time the bff loads the corrupt file will be ignored and an default meter settings will be used (litres/pulse: 1, display name = device name). If someone then saves a value in the interface, the corrupt file will be overridden with a new file that ONLY CONTAINS THE UPDATE JUST MADE (other settings will be lost FOREVER).
* index.html is calling out to CDNs for dependencies, so this will not work when internet is down 
