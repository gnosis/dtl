/*
eslint no-console:0,
no-confusing-arrow:0,
no-unused-expressions:0,
*/
// `truffle test -s` to suppress logs
const {
  silent,
} = require('minimist')(process.argv.slice(2), { alias: { silent: 's' } })

const log = silent ? () => {} : console.log.bind(console)

const assertRejects = async (q, msg) => {
  let res, catchFlag = false
  try {
    res = await q
    // checks if there was a Log event and its argument l contains string "R<number>"
    catchFlag = res.logs && !!res.logs.find(log => log.event === 'Log' && /\bR(\d+\.?)+/.test(log.args.l))
  } catch (e) {
    catchFlag = true
  } finally {
    if (!catchFlag) {
      assert.fail(res, null, msg)
    }
  }
}

module.exports = {
  assertRejects,
  log,
}
