module.exports = function (req, res) {
  res.status(301)
  res.header('location', '/client/simple-readings-page.html')
  res.send()
}