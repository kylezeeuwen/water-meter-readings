const timings = {
  showErrorsFor: 2000,
  displaySavingForAtLeast: 100
}

document.addEventListener('DOMContentLoaded', function() {
  fetch('/server/meter/water-rates', {})
    .then(response => {
      const error = response.status > 399
      if (error) { console.log(`meter reading http responded with ${response.status}. Aborting`)}

      return response.json().then(tableRows => {
        const template = $('#table-body').html()
        Mustache.parse(template)
        const rendered = Mustache.render(template, { rows:  tableRows })
        $('#table-container').html(rendered)
        _(tableRows).each(({deviceChannelId}) => updateReadingCell({deviceChannelId}))

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
            updatePromises.push(updateDisplayName({
              deviceChannelId,
              newValue: displayNameNewValue,
              originalValue: displayNameOriginalValue,
              inputElement: displayNameInput
            }))
          }

          if (litresPerPulseNewValue !== litresPerPulseOriginalValue) {
            updatePromises.push(updateLitresPerPulse({
              deviceChannelId,
              newValue: litresPerPulseNewValue,
              originalValue: litresPerPulseOriginalValue,
              inputElement: litresPerPulseInput
            }))
          }

          if (updatePromises.length > 0) {
            const row = $(`tr[data-device-channel-id="${deviceChannelId}"]`)
            row.addClass('saving')
            Promise.all(updatePromises)
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

function updateDisplayName ({ inputElement, deviceChannelId, newValue, originalValue }) {
  return fetch(`/server/device-channels/${deviceChannelId}/update-display-name`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({ value: newValue })
  })
    .then(response => {
      const success = response.status === 200
      if (!success) {
        inputElement.val(originalValue)
        return response.json()
          .then(body => body.message)
          .then(errorMessage => {
            displayErrorOnRow(deviceChannelId, errorMessage)
          })
      }
    })
    .catch(error => {
      inputElement.val(originalValue)
      displayErrorOnRow(deviceChannelId, 'unknown error')
    })
}

function updateLitresPerPulse ({ inputElement, deviceChannelId, newValue, originalValue }) {
  return fetch(`/server/device-channels/${deviceChannelId}/update-litres-per-pulse`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({ value: newValue })
  })
    .then(response => {
      const success = response.status === 200
      if (success) {
        updateReadingCell({ deviceChannelId })
      } else {
        inputElement.val(originalValue)
        return response.json()
          .then(body => body.message)
          .then(errorMessage => {
            displayErrorOnRow(deviceChannelId, errorMessage)
          })
      }
    })
    .catch(error => {
      inputElement.val(originalValue)
      displayErrorOnRow(deviceChannelId, 'unknown error')
    })
}

function updateReadingCell ({ deviceChannelId }) {
  const pulses = parseFloat($(`tr[data-device-channel-id="${deviceChannelId}"] td.reading`)[0].dataset['pulses'])
  const litresPerPulse = parseFloat($(`tr[data-device-channel-id="${deviceChannelId}"] input.litres-per-pulse`)[0].value)
  const reading = pulses * litresPerPulse / 1000

  $(`tr[data-device-channel-id="${deviceChannelId}"] td.reading`).html(reading)
}


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