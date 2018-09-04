const type = 'SettingsUnavailable'

class SettingsUnavailableError extends Error {

  static get type() { return type }

  constructor () {
    super(`Settings unavailable`)
    this.type = type
  }
}

module.exports = SettingsUnavailableError