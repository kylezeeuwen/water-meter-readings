const _ = require('lodash')

const FileNotFoundError = require('./errors/fileNotFound')
const SettingsUnavailableError = require('./errors/settingsUnavailable')

// settings data format
// {
//   pulseCounters: {
//     id: {
//       field: value
//     }
//   }
// }
const defaultInitialSettings = { pulseCounters: {} }

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
        logger.error({ eventType: 'initial settings file load error', error: error && error.message, stack: error && error.stack })
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
          return _delay(5000).then(() => this.getInitialSettingsReading())
        }
      })
  }

  _readSettingsFile () {
    return this.fileStore.readFile(this.settingsFileName)
      .then(JSON.parse)
      .then(settingsFromNetwork => { this.settings = settingsFromNetwork })
  }

  bulkGetPulseCounterSettings (pulseCounterIds) {
    if (!this.initialSettingsReadComplete) {
      throw new SettingsUnavailableError()
    }

    let response = {}
    return Promise.resolve().then(() => {
      _(pulseCounterIds).each(pulseCounterId => {
        if (_.has(this.settings.pulseCounters, pulseCounterId)) {
          response[pulseCounterId] = this.settings.pulseCounters[pulseCounterId]
        }
      })
      return response
    })
  }

  getAllPulseCounterSettings () {
    if (!this.initialSettingsReadComplete) {
      throw new SettingsUnavailableError()
    }

    return Promise.resolve(_.cloneDeep(this.settings.pulseCounters))
  }

  setPulseCounterFields (pulseCounterId, fields) {
    if (!this.initialSettingsReadComplete) {
      throw new SettingsUnavailableError()
    }

    if (!_.has(this.settings.pulseCounters, pulseCounterId)) {
      this.settings.pulseCounters[pulseCounterId] = {}
    }
    _.map(fields, (fieldValue, fieldName) => {
      this.settings.pulseCounters[pulseCounterId][fieldName] = fieldValue
    })

    return this.writeSettings()
  }

  setPulseCounterField (pulseCounterId, fieldName, fieldValue) {
    return this.setPulseCounterFields(pulseCounterId, { [fieldName]: fieldValue })
  }

  writeSettings () {
    return this.fileStore.writeFile(this.settingsFileName, JSON.stringify(this.settings))
  }
}

module.exports = MeterSettings
