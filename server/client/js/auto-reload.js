var autoReloadDelayInMinutes = 30

document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function () {
    window.location.reload()
  }, autoReloadDelayInMinutes * 60 * 1000)
})