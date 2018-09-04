document.addEventListener('DOMContentLoaded', function() {
  $('#open-keyboard').click(() => {
    return fetch(`/server/keyboard/show`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({})
    })
  })

  $('#reload-page').click(() => {
    window.location.reload()
  })

  $('#goto-simple-view').click(() => {
    window.location = '/client/simple-readings-page.html'
  })

  $('#goto-advanced-view').click(() => {
    window.location = '/client/advanced-readings-page.html'
  })
})