document.addEventListener('DOMContentLoaded', function() {
  fetch('/server/meter/reading', {})
    .then(response => {
      const error = response.status > 399
      if (error) { console.log(`meter reading http responded with ${response.status}. Aborting`)}

      return response.json().then(body => {
        const tableRows = meterResponseToTableRowDataMapper(body)
        console.log('tableRows')
        console.log(JSON.stringify(tableRows, {}, 2))


        var template = $('#table-body').html()
        Mustache.parse(template)   // optional, speeds up future uses
        var rendered = Mustache.render(template, { rows:  tableRows })
        $('#table-container').html(rendered)
      })
    })

})

function meterResponseToTableRowDataMapper (meterResponse) {
  return _(meterResponse.devices)
    .flatMap(({ name: deviceName, channels }) => {
      return _.map(channels, channel => _.merge(channel, {
        deviceName: deviceName,
        channelName: channel.name,
        deviceChannelName: `${deviceName}-${channel.name}`,
        reading: `TODO` // push this into server
      }))
    })
    .filter(({name}) => name.match('^pulse_counter_.'))
    .value()
}

function drawTable (rows) {
  $()
}