const _ = require('lodash')

// settings data format
// {
//   deviceChannels: {
//     deviceChannelId: {
//       field: value
//     }
//   }
// }

class MeterSettings {
  constructor (initialSettings = { deviceChannels: {} }) {
    this.settings = initialSettings
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
  }
}

module.exports = MeterSettings