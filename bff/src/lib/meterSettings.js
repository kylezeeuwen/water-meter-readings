const _ = require('lodash')
const fs = require('fs')

// settings data format
// {
//   deviceChannels: {
//     deviceChannelId: {
//       field: value
//     }
//   }
// }
const defaultInitialSettings = { deviceChannels: {} }


class MeterSettings {
  constructor ({ initialSettings = defaultInitialSettings, settingsFilePath = null } = {}) {
    if (this.validateInitialSettings(initialSettings)) {
      this.settings = initialSettings
    } else {
      console.log({ eventType: 'meterSettingsValidationFail' })
      this.settings = defaultInitialSettings
    }
    this.settingsFilePath = settingsFilePath
  }

  validateInitialSettings (initialSettings) {
    return true
  }

  bulkGetDeviceChannelField (fieldName, deviceChannelIds) {
    const response = {}
    _(deviceChannelIds).each(deviceChannelId => {
      if (_.has(this.settings.deviceChannels, `${deviceChannelId}.${fieldName}`)) {
        response[deviceChannelId] = this.settings.deviceChannels[deviceChannelId][fieldName]
      }
    })
    return response
  }

  setDeviceChannelField (deviceChannelId, fieldName, fieldValue) {
    if (!_.has(this.settings.deviceChannels, deviceChannelId)) {
      this.settings.deviceChannels[deviceChannelId] = {}
    }
    this.settings.deviceChannels[deviceChannelId][fieldName] = fieldValue
    this.writeSettings()
  }

  writeSettings () {
    if (_.isNull(this.settingsFilePath)) { return }
    fs.writeFileSync(this.settingsFilePath, JSON.stringify(this.settings), 'utf8')
  }
}

module.exports = MeterSettings