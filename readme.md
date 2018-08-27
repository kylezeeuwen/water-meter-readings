# Use case

Given a http hosted static json file, display something that looks like [assets/acceptance_criteria1.png](assets/acceptance_criteria1.png)

hours : 3.5, 5:36 - 6, 6:15 - 7, 8:20 -

## known issues

* Given original displayName is X, If you update the displayName successfully to Y, then attempt to update to Z but fail, the display will revert to X, but the DB will maintain Y. After a page refresh, it will display Y. The same applies for pulsesPerLitre.
 