const startTime = Date.now()
const BFF = require('./bff')
const _ = require('lodash')

const bff = new BFF()

process.on('uncaughtException', function (error) {
  const stack_trace = _.get(error, 'stack')
  const message = _.get(error, 'message')

  console.log({ eventType: 'uncaught-exception', stack_trace, message })
  process.exit(1)
})

bff.start().then(function () {
  console.log({ eventType: 'bff-start', message: `${new Date()} : BFF started in ${Date.now() - startTime}ms` })
}).catch(function (error) {
  const stack_trace = _.get(error, 'stack')
  const message = _.get(error, 'message')
  console.log({ eventType: 'bff-start-failure', message, stack_trace })
})
