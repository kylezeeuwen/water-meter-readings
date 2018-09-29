const shell = require('shelljs')
const _ = require('lodash')

class KeyboardHandler {
  constructor ({config} = {}) {
    this.config = {}

    if (!_.has(config, 'path')) {
      throw new Error('KeyboardHandler missing path to keyboard command')
    }
    this.path = config.path

    // opening the keyboard too many times causes issues
    if (!_.has(config, 'throttle_interval_seconds')) {
      throw new Error('KeyboardHandler missing throttle_interval_seconds setting')
    }
    const parsedThrottleValue = parseFloat(config.throttle_interval_seconds) * 1000
    if (_.isNaN(parsedThrottleValue) || parsedThrottleValue < 0) {
      throw new Error('KeyboardHandler invalid throttle_interval_seconds. Must be valid positive number')
    }

    this.throttling = {
      lastKeyboardOpenCommand: Date.now() - parsedThrottleValue,
      interval: parsedThrottleValue
    }

    // NB bind handler so fn handler can be passed direct to express route
    this.requestHandler = this.requestHandler.bind(this)
  }

  requestHandler(req, res) {
    if (Date.now() < this.throttling.lastKeyboardOpenCommand + this.throttling.interval) {
      console.log({eventType: 'throttling open keyboard request'})
      res.status(200)
      res.send()
      return
    }

    try {
      this.throttling.lastKeyboardOpenCommand = Date.now()
      shell.exec(this.path, function (code, stdout, stderr) {
        console.log({eventType: '/server/keyboard/show command result', code, stdout, stderr})
      })
      res.status(200)
      res.send()
    } catch (error) {
      res.status(500)
      console.log({eventType: '/server/keyboard/show failed', message: error.message, stack: error.stack})
      res.header('content-type', 'application/json')
      res.send({error: error.message, stack: error.stack})
    }
  }
}

module.exports = KeyboardHandler