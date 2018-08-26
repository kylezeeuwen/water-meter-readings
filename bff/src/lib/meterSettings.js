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
  constructor (initialSettings = { deviceChannels: { 'DMS144007645-pulse_counter_4': { liters_per_pulse: 4 }} }) {
    this.settings = initialSettings
  }

  bulkGetDeviceChannelField (fieldName, deviceChannelIds) {
    const response = {}
    _(deviceChannelIds).each(deviceChannelId => {
      if (_.has(this.settings.deviceChannels, deviceChannelId)) {
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