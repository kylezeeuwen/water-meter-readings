# Use case

Given a http hosted static json file, display something that looks like [assets/acceptance_criteria1.png](assets/acceptance_criteria1.png)

hours : 6

## known issues

* Given original displayName is X, If you update the displayName successfully to Y, then attempt to update to Z but fail, the display will revert to X, but the DB will maintain Y. After a page refresh, it will display Y. The same applies for litresPerPulse.
* If the meter settings file becomes corrupt, then the next time the bff loads the corrupt file will be ignored and an default meter settings will be used (litres/pulse: 1, display name = device name). If someone then saves a value in the interface, the corrupt file will be overriden with a new file that ONLY CONTAINS THE UPDATE JUST MADE (other settings will be lost FOREVER).
* index.html is calling out to CDNs for dependencies, so this will not work when internet is down 