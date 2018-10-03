module.exports = function (req, res) {
  res.status(200)
  res.header('content-type', 'application/json')
  res.send(JSON.stringify({status: 'ok'}))
}