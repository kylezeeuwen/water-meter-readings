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
      })
    })

})