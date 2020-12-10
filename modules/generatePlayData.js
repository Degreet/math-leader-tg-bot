const rnd = require("./rnd")

module.exports = function generatePlayData() {
  const playData = [
    {
      first: rnd(100, 500),
      second: rnd(100, 500)
    }
  ]
  
  for (let i = 0; playData.length != 5; i++) {
    playData.push({
      first: rnd(100, 500),
      second: rnd(100, 500)
    })
  }

  return playData
}