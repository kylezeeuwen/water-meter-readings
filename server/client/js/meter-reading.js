const timings = {
  showErrorsFor: 2000,
  displaySavingForAtLeast: 100
}

document.addEventListener('DOMContentLoaded', function() {
  fetch('/server/meter/water-rates', {})
    .then(response => {
      const error = response.status > 399
      if (error) {
        console.log(`meter reading http responded with ${response.status}. Aborting`)
        $('#error-container').addClass('errors')
        $('#error-container').html('Cannot get readings. Reload page')
        return
      }

      return response.json().then(tableRows => {
        const template = $('#table-body').html()
        Mustache.parse(template)
        const rendered = Mustache.render(template, { rows:  tableRows })
        $('#table-container').html(rendered)
        $('input.save').click((event) => {
          const id = event.target.dataset.pulseCounterId

          const displayNameInput = $(`tr[data-pulse-counter-id="${id}"] input.display-name`)
          const displayNameNewValue = displayNameInput[0].value
          const displayNameOriginalValue = displayNameInput[0].dataset['originalValue']

          const litresPerPulseInput = $(`tr[data-pulse-counter-id="${id}"] input.litres-per-pulse`)
          const litresPerPulseNewValue = litresPerPulseInput[0].value
          const litresPerPulseOriginalValue = litresPerPulseInput[0].dataset['originalValue']

          const baseReadingInput = $(`tr[data-pulse-counter-id="${id}"] input.actual-reading`)
          const baseReadingNewValue = baseReadingInput[0].value

          const updatePromises = []
          if (!_.isUndefined(baseReadingNewValue) && !_.isEmpty(baseReadingNewValue)) {
            updatePromises.push(resetReading({
              id,
              newValue: baseReadingNewValue,
              inputElement: baseReadingInput
            }))
          }

          if (displayNameNewValue !== displayNameOriginalValue) {
            updatePromises.push(updateDisplayName({
              id,
              newValue: displayNameNewValue,
              originalValue: displayNameOriginalValue,
              inputElement: displayNameInput
            }))
          }

          if (litresPerPulseNewValue !== litresPerPulseOriginalValue) {
            updatePromises.push(updateLitresPerPulse({
              id,
              newValue: litresPerPulseNewValue,
              originalValue: litresPerPulseOriginalValue,
              inputElement: litresPerPulseInput
            }))
          }

          if (updatePromises.length > 0) {
            const row = $(`tr[data-pulse-counter-id="${id}"]`)
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

function updateDisplayName ({ inputElement, id, newValue, originalValue }) {
  return fetch(`/server/device-channels/${id}/update-display-name`, {
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
            displayErrorOnRow(id, errorMessage)
          })
      }
    })
    .catch(error => {
      inputElement.val(originalValue)
      displayErrorOnRow(id, 'unknown error')
    })
}

function updateLitresPerPulse ({ inputElement, id, newValue, originalValue }) {
  return fetch(`/server/device-channels/${id}/update-litres-per-pulse`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({ value: newValue })
  })
    .then(response => {
      const success = response.status === 200
      if (success) {
        addRefreshMessageTo({ id })
      } else {
        inputElement.val(originalValue)
        return response.json()
          .then(body => body.message || body.error)
          .then(errorMessage => {
            displayErrorOnRow(id, errorMessage)
          })
      }
    })
    .catch(error => {
      inputElement.val(originalValue)
      displayErrorOnRow(id, 'unknown error')
    })
}

function resetReading ({id, newValue, inputElement}) {
  return fetch(`/server/device-channels/${id}/reset-reading`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({ value: newValue })
  })
    .then(response => {
      const success = response.status === 200
      if (success) {
        addRefreshMessageTo({ id })
      } else {
        inputElement.val('')
        return response.json()
          .then(body => body.message)
          .then(errorMessage => {
            displayErrorOnRow(id, errorMessage)
          })
      }
    })
    .catch(error => {
      inputElement.val(originalValue)
      displayErrorOnRow(id, 'unknown error')
    })
}

function addRefreshMessageTo ({ id }) {
  $(`tr[data-pulse-counter-id="${id}"] td.computed-reading`).html('Reload for updated reading')
}


function delay(t, v) {
  return new Promise(function(resolve) {
    setTimeout(resolve.bind(null, v), t)
  });
}

function displayErrorOnRow (id, errorMessage) {
  const errorDiv = $(`tr[data-pulse-counter-id="${id}"] div.error-text`)
  errorDiv.html(errorMessage)
  setTimeout(() => {
    errorDiv.html('')
  }, timings.showErrorsFor)
}