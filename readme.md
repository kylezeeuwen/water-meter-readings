
# Installation
NB Tested with node 8.9.4 on OSX 10.13.6. No other environments tested yet 

## Prerequisites

* node

## Instructions

* in local repo directory, run `npm install`
* start server via `node bff/src/startServer.js`
* visit `http://localhost:8080/client/` , `http://localhost:8080/server/health`, and/or `http://localhost:8080/server/meter/water-rates`


# Initial Acceptance Criteria

Given a http hosted static json file [bff/data/reading1.json](bff/data/reading1.json), display something that looks like [assets/acceptance_criteria1.png](assets/acceptance_criteria1.png)

hours : 6

## known issues

* Given original displayName is X, If you update the displayName successfully to Y, then attempt to update to Z but fail, the display will revert to X, but the DB will maintain Y. After a page refresh, it will display Y. The same applies for litresPerPulse.
* If the meter settings file becomes corrupt, then the next time the bff loads the corrupt file will be ignored and an default meter settings will be used (litres/pulse: 1, display name = device name). If someone then saves a value in the interface, the corrupt file will be overriden with a new file that ONLY CONTAINS THE UPDATE JUST MADE (other settings will be lost FOREVER).
* index.html is calling out to CDNs for dependencies, so this will not work when internet is down 