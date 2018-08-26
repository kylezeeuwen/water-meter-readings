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

        console.log('tableRows')
        console.log(JSON.stringify(tableRows, {}, 2))

        var template = $('#table-body').html()
        Mustache.parse(template)
        var rendered = Mustache.render(template, { rows:  tableRows })
        $('#table-container').html(rendered)

        $('input.save').click((event) => {
          const deviceChannelId = event.target.dataset['deviceChannelId']

          const displayNameInput = $(`tr[data-device-channel-id="${deviceChannelId}"] input.display-name`)
          const displayNameNewValue = displayNameInput[0].value
          const displayNameOriginalValue = displayNameInput[0].dataset['originalValue']

          const litresPerPulseInput = $(`tr[data-device-channel-id="${deviceChannelId}"] input.litres-per-pulse`)
          const litresPerPulseNewValue = litresPerPulseInput[0].value
          const litresPerPulseOriginalValue = litresPerPulseInput[0].dataset['originalValue']
          
        })
      })
    })

})