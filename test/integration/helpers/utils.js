
function rand8() {
    return Math.floor(Math.random() * 1000000000)
}
async function sleep(ms)  {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}


module.exports = {
  rand8,
  sleep,
}
