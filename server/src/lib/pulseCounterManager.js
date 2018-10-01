const _ = require('lodash')
const PulseCounter = require('./pulseCounter')

const noop = () => {}

class PulseCounterManager {
  constructor ({ pulseCounterMaxValue, readingsFileName, fileStore, meterSettings }) {
    this.fileStore = fileStore
    this.meterSettings = meterSettings
    this.readingsFileName = readingsFileName
    this.pulseCounterMaxValue = pulseCounterMaxValue
  }

  getRawReadingData () {
    return this.fileStore.readFile(this.readingsFileName)
      .then(JSON.parse)
      .then(meterReading => {
        return _(meterReading.devices)
          .flatMap(({ name: deviceName, channels }) => {
            return channels.filter(({name}) => name.match('^pulse_counter_.'))
              .map(channel => {
                return {
                  id: `${deviceName}-${channel.name}`,
                  value: channel.value,
                  time: channel.time // format "2018-08-15 17:33:03" , TODO UTC or local ?
                }
              })
          })
          .value()
      })
  }

  _initialiseSettingsFrom (pulseCounterData) {
    const initialObservations = {
      displayName: pulseCounterData.id,
      litresPerPulse: 1,
      meterReadingBaseLitres: 0,
      pulseCountBase: pulseCounterData.value,
      pulseCountLastObservedValue: pulseCounterData.value,
      pulseCountLastObservedTimestamp: Date.now(),
      overflowCount: 0,
    }
    logger.info({ eventType: 'pulse_count_observation_initialise', ...initialObservations })
    return initialObservations
  }

  _buildPulseCounter ({ data, settings, updateSettings = true}) {

    const updateSettingsHandler = (updateSettings)
      ? ({id, fields}) => {
        logger.info({ eventType: 'pulse_count_observation_update', id, fields })
        return this.meterSettings.setPulseCounterFields(id, fields)
      }
      : noop

    return new PulseCounter({
      id: data.id,
      time: data.time,
      displayName: settings.displayName,
      litresPerPulse: settings.litresPerPulse,
      meterReadingBaseLitres: settings.meterReadingBaseLitres,
      pulseCountBase: settings.pulseCountBase,
      pulseCountMaxValue: this.pulseCounterMaxValue,
      pulseCountLastObservedValue: settings.pulseCountLastObservedValue,
      pulseCountLastObservedTimestamp: settings.pulseCountLastObservedTimestamp,
      staleObservationThresholdSeconds: 30,
      pulseCountCurrent: data.value,
      overflowCount: settings.overflowCount,
      updateSettings: updateSettingsHandler
    })
  }

  getPulseCounters () {
    return Promise.all([this.getRawReadingData(), this.meterSettings.getAllPulseCounterSettings()]).then(([pulseCountersData, pulseCountersSettings]) => {
      return pulseCountersData.map(data => {
        if (!_.has(pulseCountersSettings, data.id)) {
          const initialSettings = this._initialiseSettingsFrom(data)
          pulseCountersSettings[data.id] = initialSettings
          this.meterSettings.setPulseCounterFields(data.id, initialSettings)
        }

        const settings = pulseCountersSettings[data.id]
        return this._buildPulseCounter({ data, settings })
      })
    })
  }

  getPulseCounter (pulseCounterId) {
    return Promise.all([this.getRawReadingData(), this.meterSettings.getAllPulseCounterSettings()]).then(([pulseCountersData, pulseCountersSettings]) => {
      const data = pulseCountersData.filter(data => data.id === pulseCounterId)
      if (data.length < 1) { throw new Error(`Cannot find pulse counter data with id ${pulseCounterId}`) }

      const settings = pulseCountersSettings[pulseCounterId]
      if (!settings) { throw new Error(`Cannot find pulse counter settings with id ${pulseCounterId}`) }

      return this._buildPulseCounter({ data: data[0], settings })
    })
  }
}

module.exports = PulseCounterManager