const startTime = Date.now()
const Server = require('../src/server')
const _ = require('lodash')


const argParser = require('yargs')
const defaultConfig = require('../config/defaultConfig')
const commandLineOverrides = argParser.argv
const config = _.merge(defaultConfig, commandLineOverrides)

const server = new Server(config)

process.on('uncaughtException', function (error) {
  const stack_trace = _.get(error, 'stack')
  const message = _.get(error, 'message')

  console.log({ eventType: 'uncaught-exception', stack_trace, message })
  process.exit(1)
})

server.start().then(function () {
  console.log({ eventType: 'server-start', message: `${new Date()} : BFF started in ${Date.now() - startTime}ms` })
}).catch(function (error) {
  const stack_trace = _.get(error, 'stack')
  const message = _.get(error, 'message')
  console.log({ eventType: 'server-start-failure', message, stack_trace })
})
