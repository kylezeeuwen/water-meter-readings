const _ = require('lodash')
const fs = require('fs')
const request = require('request')

const FileNotFoundError = require('./errors/fileNotFound')
const SettingsUnavailableError = require('./errors/settingsUnavailable')

// settings data format
// {
//   deviceChannels: {
//     deviceChannelId: {
//       field: value
//     }
//   }
// }
const defaultInitialSettings = { deviceChannels: {} }

function _delay (milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

class MeterSettings {
  constructor ({fileStore, settingsFileName} = {}) {
    this.fileStore = fileStore
    this.settingsFileName = settingsFileName
    this.initialSettingsReadComplete = false
    this.settings = {}

    this.getInitialSettingsReading()
      .then(() => { this.initialSettingsReadComplete = true })
      .catch(error => {
        console.log({ eventType: 'initial settings file load error', error: error && error.message, stack: error && error.stack })
        throw error
      })
  }

  getInitialSettingsReading () {
    return this._readSettingsFile()
      .catch(error => {
        if (error.type && error.type === FileNotFoundError.type) {
          this.settings = _.cloneDeep(defaultInitialSettings)
          return this.writeSettings()
        } else {
          return _delay(5000).then(() => this._readSettingsFile())
        }
      })
  }

  _readSettingsFile () {
    return this.fileStore.readFile(this.settingsFileName)
      .then(JSON.parse)
      .then(settingsFromNetwork => { this.settings = settingsFromNetwork })
  }

  bulkGetDeviceChannelSettings (deviceChannelIds) {
    if (!this.initialSettingsReadComplete) {
      throw new SettingsUnavailableError()
    }

    let response = []
    return Promise.resolve().then(() => {
      _(deviceChannelIds).each(deviceChannelId => {
        if (_.has(this.settings.deviceChannels, deviceChannelId)) {
          response[deviceChannelId] = this.settings.deviceChannels[deviceChannelId]
        }
      })
      return response
    })
  }

  setDeviceChannelField (deviceChannelId, fieldName, fieldValue) {
    if (!this.initialSettingsReadComplete) {
      throw new SettingsUnavailableError()
    }

    return Promise.resolve().then(() => {
      if (!_.has(this.settings.deviceChannels, deviceChannelId)) {
        this.settings.deviceChannels[deviceChannelId] = {}
      }
      this.settings.deviceChannels[deviceChannelId][fieldName] = fieldValue
      return this.writeSettings()
    })
  }

  writeSettings () {
    return this.fileStore.writeFile(this.settingsFileName, JSON.stringify(this.settings))
  }
}

module.exports = MeterSettings