const startTime = Date.now()
const _ = require('lodash')

const argParser = require('yargs')
const defaultConfig = require('../config/defaultConfig')
const commandLineOverrides = argParser.argv
const config = _.merge(defaultConfig, commandLineOverrides)

// cheap logging hack. must be done before importing anything that assumes logger is global
require('../src/lib/addGlobalLogger')(config.log_level)

const Server = require('../src/server')
const server = new Server(config)

process.on('uncaughtException', function (error) {
  const stack_trace = _.get(error, 'stack')
  const message = _.get(error, 'message')

  console.log({ eventType: 'uncaught-exception', stack_trace, message })
  process.exit(1)
})

server.start().then(function () {
  logger.info({ eventType: 'server-start', message: `${new Date()} : BFF started in ${Date.now() - startTime}ms` })
}).catch(function (error) {
  const stack_trace = _.get(error, 'stack')
  const message = _.get(error, 'message')
  logger.error({ eventType: 'server-start-failure', message, stack_trace })
})