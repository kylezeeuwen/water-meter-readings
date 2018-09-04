var afterDelayRedirectTo = '/client/advanced-readings-page.html'
var defaultDelayInSeconds = 10

document.addEventListener('DOMContentLoaded', function() {
  var delay = parseInt(getQueryVariable('delay'))
  if (_.isNaN(delay)) { delay = defaultDelayInSeconds }
  $('#starting-counter').html(delay)

  var startTime = Date.now()
  var endTime = startTime + delay * 1000
  var intervalHandle = setInterval(function() {
    var remainingDelay = Math.max(0, Math.ceil((endTime - Date.now()) / 1000))
    console.log('remainingDelay')
    console.log(JSON.stringify(remainingDelay, {}, 2))

    $('#starting-counter').html(remainingDelay)
    if (Date.now() > endTime) {
      clearInterval(intervalHandle)
      window.location = afterDelayRedirectTo
    }
  }, 500)
})

// https://css-tricks.com/snippets/javascript/get-url-variables/
var getQueryVariable = function (variable) {
  var query = window.location.search.substring(1)
  var vars = query.split("&")
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split("=")
    if (pair[0] == variable) {
      return pair[1]
    }
  }
  return (false)
}