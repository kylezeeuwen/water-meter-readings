const type = 'FileNotFound'

class FileNotFoundError extends Error {

  static get type() { return type }

  constructor (fileName, fullUrl = '') {
    super(`Fail to retrieve ${fileName} at ${fullUrl}`)
    this.fileName = fileName
    this.fullUrl = fullUrl
    this.type = type
  }
}

module.exports = FileNotFoundError