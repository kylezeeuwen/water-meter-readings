const timings = {
  showErrorsFor: 2000,
  displaySavingForAtLeast: 100,
  afterSuccessDelayReloadFor: 1250
}

document.addEventListener('DOMContentLoaded', function() {
  fetch('/server/meter/water-rates', {})
    .then(response => {
      const error = response.status > 399
      if (error) { console.log(`meter reading http responded with ${response.status}. Aborting`)}

      return response.json().then(body => {

        const tableRows = _(body)
          .map(row => {
            row.reading = row.pulses * row.litresPerPulse / 1000
            return row
          })
          .value()

        const template = $('#table-body').html()
        Mustache.parse(template)
        const rendered = Mustache.render(template, { rows:  tableRows })
        $('#table-container').html(rendered)

        $('input.save').click((event) => {
          const deviceChannelId = event.target.dataset['deviceChannelId']

          const displayNameInput = $(`tr[data-device-channel-id="${deviceChannelId}"] input.display-name`)
          const displayNameNewValue = displayNameInput[0].value
          const displayNameOriginalValue = displayNameInput[0].dataset['originalValue']

          const litresPerPulseInput = $(`tr[data-device-channel-id="${deviceChannelId}"] input.litres-per-pulse`)
          const litresPerPulseNewValue = litresPerPulseInput[0].value
          const litresPerPulseOriginalValue = litresPerPulseInput[0].dataset['originalValue']

          const updatePromises = []
          if (displayNameNewValue !== displayNameOriginalValue) {
            const updatePromise = fetch(`/server/device-channels/${deviceChannelId}/update-display-name`, {
              method: 'POST',
              headers: {
                'content-type': 'application/json'
              },
              body: JSON.stringify({ value: displayNameNewValue })
            }).catch(error => {
              displayNameInput.value('POOP')
              throw error
            })
            updatePromises.push(updatePromise)
          }
          if (litresPerPulseNewValue !== litresPerPulseOriginalValue) {
            const updatePromise = fetch(`/server/device-channels/${deviceChannelId}/update-litres-per-pulse`, {
              method: 'POST',
              headers: {
                'content-type': 'application/json'
              },
              body: JSON.stringify({ value: litresPerPulseNewValue })
            }).catch(error => {
              litresPerPulseInput.value('POOP')
              throw error
            })
            updatePromises.push(updatePromise)
          }

          if (updatePromises.length > 0) {
            const row = $(`tr[data-device-channel-id="${deviceChannelId}"]`)
            row.addClass('saving')
            Promise.all(updatePromises)
              .then((responses) => {
                const success = _.every(responses, ({status}) => status === 200)
                if (success) {
                  setTimeout(() => { window.location = '/client' }, timings.afterSuccessDelayReloadFor)
                } else {
                  const failedResponses = responses.filter(({status}) => status !== 200)
                  Promise.all(failedResponses.map(response => response.json()))
                    .then(bodies => bodies.map(body => body.message).join(', '))
                    .then(errorMessage => {
                      displayErrorOnRow(deviceChannelId, errorMessage)
                    })
                    .catch(() => {
                      displayErrorOnRow(deviceChannelId, 'unknown error')
                    })
                }


              })
              .catch((error) => { console.log('updates failed:', error) })
              .finally(() => {
                setTimeout(() => {
                  row.removeClass('saving')
                }, timings.displaySavingForAtLeast)
              })
          }
        })
      })
    })
})

function delay(t, v) {
  return new Promise(function(resolve) {
    setTimeout(resolve.bind(null, v), t)
  });
}

function displayErrorOnRow (deviceChannelId, errorMessage) {
  const errorDiv = $(`tr[data-device-channel-id="${deviceChannelId}"] div.error-text`)
  errorDiv.html(errorMessage)
  setTimeout(() => {
    errorDiv.html('')
  }, timings.showErrorsFor)
}