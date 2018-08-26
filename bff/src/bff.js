'use strict'

const _ = require('lodash')
const express = require('express')
const http = require('http')
const path = require('path')
const fs = require('fs')
// const jsonParser = require('body-parser').json()

const MeterSettings = require('./lib/meterSettings')

const defaultConfig = {
  performance: {
    maxSockets: 500
  },
  port: 8080,
  http_timeout_seconds: 120,
  meter: {
    // readingFilePath: path.join(__dirname, '../data/reading1.json')
    readingFilePath: path.join(__dirname, '../data/reading1.modified.pretty.json')
  }
}

class BFF {
  constructor ({ config = defaultConfig } = {}) {
    this.config = config
    this.express = express()
    this.meterSettings = new MeterSettings()

    if (_.has(this.config, 'bff.max_outbound_sockets')) {
      http.globalAgent.maxSockets = this.config.performance.maxSockets
    }
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
      try {
        const meterReading = JSON.parse(this._readFileContents(this.config.meter.readingFilePath))

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

        const litresPerPulseValues = this.meterSettings.bulkGetDeviceChannelField('liters_per_pulse', uniqueDeviceChannelIds)

        const modifiedPulseCounterRows = _(pulseCounterRows)
          .map(pulseCounterRow => {
            if (_.has(litresPerPulseValues, pulseCounterRow.deviceChannelId)) {
              pulseCounterRow.litresPerPulse = litresPerPulseValues[pulseCounterRow.deviceChannelId]
            }
            return pulseCounterRow
          })
          .value()


        console.log('modifiedPulseCounterRows')
        console.log(JSON.stringify(modifiedPulseCounterRows, {}, 2))


        res.status(200)
        res.header('content-type', 'application/json')
        res.send(JSON.stringify(modifiedPulseCounterRows))
      } catch (error) {
        error.message = `/meter/reading failed parsing file ${this.config.meter.readingFilePath}: ${error.message}`
        throw error
      }
    })

    this.express.post(`/server/device-channels/:deviceChannelId/update-display-name`, (req, res) => {
      console.log('got a post')
    })
  }

  addCatchAllErrorHandlers () {
    this.express.use((error, req, res, next) => {

      const stack_trace = _.get(error, 'stack')
      const message = _.get(error, 'message')

      console.log({
        eventType: 'generic-error-handler',
        stack_trace,
        message
      })

      const responseBody = { message: 'server error. See server log for details' }
      res.status(500)
      res.header('content-type', 'application/json')
      res.send(JSON.stringify(responseBody))
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
}

module.exports = BFF
