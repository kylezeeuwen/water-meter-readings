'use strict'

const _ = require('lodash')
const express = require('express')
const http = require('http')
const path = require('path')
const fs = require('fs')
const jsonParser = require('body-parser').json()
const shell = require('shelljs')

const NetworkFileStore = require('./lib/networkFileStore')
const MeterSettings = require('./lib/meterSettings')

class Server {
  constructor (config = {}) {
    this.config = config
    this.express = express()

    // opening the keyboard too many times causes issues
    const minKeyboardOpenRequestInterval = 2000
    this.throttling = {
      lastKeyboardOpenCommand: Date.now() - minKeyboardOpenRequestInterval,
      minKeyboardOpenRequestInterval
    }

    this.initialiseFileStore()
    this.initialiseMeterSettings()

    if (_.has(this.config, 'server.max_outbound_sockets')) {
      http.globalAgent.maxSockets = this.config.performance.maxSockets
    }

    require('events').EventEmitter.prototype._maxListeners = 100
  }

  initialiseFileStore () {
    if (this.config.fileStore.type === 'network') {
      this.fileStore = new NetworkFileStore({url: this.config.fileStore.url})
    } else {
      throw new Error(`fileStore type '${this.fileStore.type}' not supported`)
    }
  }

  initialiseMeterSettings () {
    const meterSettingsConfig = {
      fileStore: this.fileStore,
      settingsFileName: this.config.fileStore.settingsFileName
    }

    this.meterSettings = new MeterSettings(meterSettingsConfig)
  }

  start () {
    // NB callee catches
    return Promise.resolve()
      .then(this.addRoutes.bind(this))
      .then(this.addCatchAllErrorHandlers.bind(this))
      .then(this.startExpress.bind(this))
  }

  addRoutes () {
    this.express.use('/client', express.static(path.join(__dirname, '../client')))

    this.express.use('/server/health', (req, res) => {
      res.status(200)
      res.header('content-type', 'application/json')
      res.send(JSON.stringify({ status: 'ok'}))
    })

    this.express.get('/server/meter/water-rates', (req, res) => {
      this.fileStore.readFile(this.config.fileStore.readingsFileName)
      .then(JSON.parse)
      .then(meterReading => {
        const pulseCounterRows = _(meterReading.devices)
          .flatMap(({ name: deviceName, channels }) => {
            return _.map(channels, channel => {
              return {
                deviceName: deviceName,
                channelName: channel.name,
                deviceChannelId: `${deviceName}-${channel.name}`,
                displayName: `${deviceName}-${channel.name}`,
                litresPerPulse: 1,
                pulses: channel.value,
                time: channel.time
              }
            })
          })
          .filter(({channelName}) => channelName.match('^pulse_counter_.'))
          .value()

        const uniqueDeviceChannelIds = _(pulseCounterRows)
          .map('deviceChannelId')
          .value()

        return this.meterSettings.bulkGetDeviceChannelSettings(uniqueDeviceChannelIds)
          .then(deviceChannelSettings => {
            const modifiedPulseCounterRows = _(pulseCounterRows)
              .map(pulseCounterRow => {
                if (_.has(deviceChannelSettings, `${pulseCounterRow.deviceChannelId}.litresPerPulse`)) {
                  pulseCounterRow.litresPerPulse = deviceChannelSettings[pulseCounterRow.deviceChannelId]['litresPerPulse']
                }
                if (_.has(deviceChannelSettings, `${pulseCounterRow.deviceChannelId}.displayName`)) {
                  pulseCounterRow.displayName = deviceChannelSettings[pulseCounterRow.deviceChannelId]['displayName']
                }
                return pulseCounterRow
              })
              .value()

            res.status(200)
            res.header('content-type', 'application/json')
            res.send(JSON.stringify(modifiedPulseCounterRows))
          })
      })
      .catch(error => {
        res.status(500)
        console.log({ eventType: '/server/meter/water-rates failed', message: error.message, stack: error.stack })
        res.header('content-type', 'application/json')
        res.send({ error: error.message, stack: error.stack })
      })
    })

    this.express.post('/server/keyboard/show', (req, res) => {

      if (Date.now() < this.throttling.lastKeyboardOpenCommand + this.throttling.minKeyboardOpenRequestInterval) {
        console.log({ eventType: 'throttling open keyboard request' })
        res.status(200)
        res.send()
        return
      }

      try {
        this.throttling.lastKeyboardOpenCommand = Date.now()
        shell.exec(this.config.keyboard.path, function(code, stdout, stderr) {
          console.log({ eventType: '/server/keyboard/show command result', code, stdout, stderr })
        })
        res.status(200)
        res.send()
      } catch (error) {
        res.status(500)
        console.log({ eventType: '/server/keyboard/show failed', message: error.message, stack: error.stack })
        res.header('content-type', 'application/json')
        res.send({ error: error.message, stack: error.stack })
      }
    })

    this.express.post(`/server/device-channels/:deviceChannelId/update-display-name`, jsonParser, (req, res) => {
      const deviceChannelId = _.get(req, 'params.deviceChannelId', false)
      const displayName = _.get(req, 'body.value', false)

      // NB !deviceChannelId should not ever happen (cannot get here unless deviceChannelId in path
      if (!deviceChannelId) {this._sendValidationError(res,'missing deviceChannelId')}
      else if (!displayName) {this._sendValidationError(res,'missing value in request body')}
      else if (_.isEmpty(displayName)) {this._sendValidationError(res,'value cannot be empty')}
      else {
        this.meterSettings.setDeviceChannelField(deviceChannelId, 'displayName', displayName)
          .then(() => {
            res.status(200)
            res.send()
          })
          .catch(error => {
            res.status(500)
            console.log({ eventType: `${req.path} failed`, message: error.message, stack: error.stack })
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
        this.meterSettings.setDeviceChannelField(deviceChannelId, 'litresPerPulse', litresPerPulse)
          .then(() => {
            res.status(200)
            res.send()
          })
          .catch(error => {
            res.status(500)
            console.log({ eventType: `${req.path} failed`, message: error.message, stack: error.stack })
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

      console.log({eventType: 'generic-error-handler', stack, message})

      res.status(500)
      res.header('content-type', 'application/json')
      res.send({ error, stack })
    })
  }

  startExpress (port = this.config.port) {
    return new Promise((resolve) => {
      this.server = this.express.listen(port, () => {
        console.log({eventType: 'server-listening', port: port})
        resolve()
      })
      if (_.has(this.config, 'http_timeout_seconds')) {
        this.server.setTimeout(this.config.http_timeout_seconds * 1000)
      }
      return this.server
    })
  }

  stop (signal) {
    console.log({eventType: 'shutdown-start', signal: signal})

    return new Promise((resolve) => {
      const forceShutdownTimeout = 5000
      const didntShutdownTimer = setTimeout(() => {
        console.log({eventType: 'shutdown-failure', timeout: forceShutdownTimeout})
        resolve()
      }, forceShutdownTimeout)
      this.server.close(() => {
        console.log({eventType: 'shutdown-complete'})
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
      console.log({
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
