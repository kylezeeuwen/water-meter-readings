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
})