module.exports = {
  async candidate(dataFind={}, successCallback, failCallback, ...argsForFailCallback) {
    const candidate = await users.findOne(dataFind)

    if (candidate) {
      (successCallback || console.log)(candidate)
    } else {
      (failCallback || (() => {}))(dataFind)
    }
  }
}