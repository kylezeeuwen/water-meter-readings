'use strict'

const _ = require('lodash')
const express = require('express')
const http = require('http')
const path = require('path')
const fs = require('fs')
const jsonParser = require('body-parser').json()


const NetworkFileStore = require('./lib/networkFileStore')
const MeterSettings = require('./lib/meterSettings')
const PulseCounterManager = require('./lib/pulseCounterManager')

// simple stateless handlers
const redirectToSimpleReadingsHandler = require('./handlers/stateless/redirectToSimpleReadings')
const healthHandler = require('./handlers/stateless/health')

// stateful handlers
const KeyboardHandler = require('./handlers/stateful/keyboard')
const GetReadingsHandler = require('./handlers/stateful/getReadings')
const ResetReadingHandler = require('./handlers/stateful/resetReading')

// persistent services
const OverflowDetector = require('./services/overflowDetector')

class Server {
  constructor (config = {}) {

    this.config = config
    this.express = express()

    this.initialiseFileStore()
    this.initialiseMeterSettings()
    this.initialisePulseCounterManager()
    this.initialiseStatefulHandlers()
    this.initialiseServices()


    http.globalAgent.maxSockets = this.config.performance.max_sockets
    require('events').EventEmitter.defaultMaxListeners = this.config.performance.max_event_listeners
  }

  initialiseFileStore () {
    if (this.config.file_store.type === 'network') {
      this.fileStore = new NetworkFileStore({url: this.config.file_store.url})
    } else {
      throw new Error(`fileStore type '${this.fileStore.type}' not supported`)
    }
  }

  initialiseMeterSettings () {
    const meterSettingsConfig = {
      fileStore: this.fileStore,
      settingsFileName: this.config.file_store.settings_file_name
    }

    this.meterSettings = new MeterSettings(meterSettingsConfig)
  }

  initialisePulseCounterManager () {
    this.pulseCounterManager = new PulseCounterManager({
      readingsFileName: this.config.file_store.readings_file_name,
      fileStore: this.fileStore,
      meterSettings: this.meterSettings,
      pulseCounterMaxValue: this.config.pulse_counters.max_value,
      maxObservationAgeMilliseconds: parseFloat(this.config.pulse_counters.max_observation_age_seconds) * 1000,
    })
  }

  initialiseStatefulHandlers () {
    this.handlers = {
      keyboard: new KeyboardHandler({ config: this.config.keyboard }),
      getReadings: new GetReadingsHandler({ pulseCounterManager: this.pulseCounterManager }),
      resetReading: new ResetReadingHandler({ pulseCounterManager: this.pulseCounterManager })
    }
  }

  initialiseServices () {
    this.services = {
      overflowDetector: new OverflowDetector({ pulseCounterManager: this.pulseCounterManager, pollIntervalMilliseconds: parseInt(this.config.overflow_detector.polling_interval_seconds) * 1000 })
    }
  }

  start () {
    // NB callee catches
    return Promise.resolve()
      .then(this.addRoutes.bind(this))
      .then(this.addCatchAllErrorHandlers.bind(this))
      .then(this.startExpress.bind(this))
      .then(() => {
        _(this.services).each((service) => service.start())
      })
  }

  addRoutes () {
    // static content handlers
    this.express.get('/', redirectToSimpleReadingsHandler)
    this.express.get('/index.html', redirectToSimpleReadingsHandler)
    this.express.use('/client', express.static(path.join(__dirname, '../client')))

    // server handlers
    this.express.use('/server/health', healthHandler)

    this.express.get('/server/meter/water-rates', this.handlers.getReadings.requestHandler)

    this.express.post('/server/keyboard/show', this.handlers.keyboard.requestHandler)

    this.express.post('/server/device-channels/:deviceChannelId/reset-reading', jsonParser, this.handlers.resetReading.requestHandler)

    this.express.post(`/server/device-channels/:deviceChannelId/update-display-name`, jsonParser, (req, res) => {
      const deviceChannelId = _.get(req, 'params.deviceChannelId', false)
      const displayName = _.get(req, 'body.value', false)

      // NB !deviceChannelId should not ever happen (cannot get here unless deviceChannelId in path
      if (!deviceChannelId) {this._sendValidationError(res,'missing deviceChannelId')}
      else if (!displayName) {this._sendValidationError(res,'missing value in request body')}
      else if (_.isEmpty(displayName)) {this._sendValidationError(res,'value cannot be empty')}
      else {
        this.meterSettings.setPulseCounterField(deviceChannelId, 'displayName', displayName)
          .then(() => {
            res.status(200)
            res.send()
          })
          .catch(error => {
            res.status(500)
            logger.error({ eventType: `${req.path} failed`, message: error.message, stack: error.stack })
            res.header('content-type', 'application/json')
            res.send({ error: error.message, stack: error.stack })
          })
      }
    })

    this.express.post(`/server/device-channels/:deviceChannelId/update-litres-per-pulse`, jsonParser, (req, res) => {
      const deviceChannelId = _.get(req, 'params.deviceChannelId', false)
      const litresPerPulse = parseFloat(_.get(req, 'body.value', false))

      // NB !deviceChannelId should not ever happen (cannot get here unless deviceChannelId in path
      if (!deviceChannelId) {this._sendValidationError(res,'missing deviceChannelId')}
      else if (_.isNaN(litresPerPulse)) {this._sendValidationError(res,'value is not a valid number')}
      else if (litresPerPulse < 0) {this._sendValidationError(res,'value cannot be negative')}
      else {
        this.meterSettings.setPulseCounterField(deviceChannelId, 'litresPerPulse', litresPerPulse)
          .then(() => {
            res.status(200)
            res.send()
          })
          .catch(error => {
            res.status(500)
            logger.error({ eventType: `${req.path} failed`, message: error.message, stack: error.stack })
            res.header('content-type', 'application/json')
            res.send({ error: error.message, stack: error.stack })
          })
      }
    })
  }

  addCatchAllErrorHandlers () {
    this.express.use((error, req, res, next) => {

      const stack = _.get(error, 'stack')
      const message = _.get(error, 'message')

      logger.error({eventType: 'generic-error-handler', stack, message})

      res.status(500)
      res.header('content-type', 'application/json')
      res.send({ error, stack })
    })
  }

  startExpress (port = this.config.port) {
    return new Promise((resolve) => {
      this.server = this.express.listen(port, () => {
        logger.info({eventType: 'server-listening', port: port})
        resolve()
      })
      if (_.has(this.config, 'http_timeout_seconds')) {
        this.server.setTimeout(this.config.http_timeout_seconds * 1000)
      }
      return this.server
    })
  }

  stop (signal) {
    logger.info({eventType: 'shutdown-start', signal: signal})

    return new Promise((resolve) => {
      const forceShutdownTimeout = 5000
      const didntShutdownTimer = setTimeout(() => {
        logger.error({eventType: 'shutdown-failure', timeout: forceShutdownTimeout})
        resolve()
      }, forceShutdownTimeout)
      this.server.close(() => {
        _(this.services).each((service) => service.stop())
        logger.info({eventType: 'shutdown-complete'})
        clearTimeout(didntShutdownTimer)
        resolve()
      })
    })
  }

  _readFileContents (filePath) {
    let fileContents = ''

    if (fs.existsSync(filePath)) {
      fileContents = fs.readFileSync(filePath, 'utf-8')
    } else {
      logger.error({
        eventType: 'file-not-found',
        error: {message: `file ${filePath} not found`}
      })
      throw new Error(`Unable to start server: file ${filePath} not found`)
    }

    return fileContents
  }

  _sendValidationError (res, message) {
    res.status(400)
    res.header('content-type', 'application/json')
    res.send(JSON.stringify({message}))
  }
}

module.exports = Server
