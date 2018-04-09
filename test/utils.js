/*
eslint no-console:0,
no-confusing-arrow:0,
no-unused-expressions:0,
*/
// `truffle test -s` to suppress logs
const {
  silent,
  gas: gasLog,
  gasTx,
  noevents,
} = require('minimist')(process.argv.slice(2), { alias: { silent: 's', contract: 'c', gas: 'g', gasTx: 'gtx' } })

const log = silent ? () => {} : console.log.bind(console)


let totalGas = 0
const gasLogWrapper = (contracts) => {
  const handler = {
    // intercept all GETS to contracts
    get(target, propKey) {
      const origMethod = target[propKey]
      // if prompted prop !== a FUNCTION return prop
      if (typeof origMethod !== 'function' || !origMethod.sendTransaction) {
        return origMethod
      }
      // go one level deeper into actual METHOD - here access to (.call, .apply etc)
      return new Proxy(origMethod, {
        // called if @transaction function
        async apply(target, thisArg, argumentsList) {
          const result = await Reflect.apply(target, thisArg, argumentsList)
          // safeguards against constant functions and BigNumber returns
          if (typeof result !== 'object' || !result.receipt) return result
          const { receipt: { gasUsed } } = result
          // check that BOTH gas flags are used
          gasLog && gasTx && console.info(`
          ==============================
          TX name           ==> ${propKey}
          TX gasCost        ==> ${gasUsed}
          ==============================
          `)
          totalGas += gasUsed
          return result
        },
      })
    },
  }

  return contracts.map(c => new Proxy(c, handler))
}

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

// keeps track of watched events
let stopWatching = {}

const eventWatcher = noevents ? () => {} : (contract, eventName, argum = {}) => {

  const eventFunc = contract[eventName]

  if (!eventFunc) {
    log(`No event ${eventName} available in the contract`)
    return null
  }

  const eventObject = eventFunc(argum).watch((err, result) => {
    const { event, args } = result
    if (err) return log(err)

    return log(`
        LOG FOUND:
        ========================
        Event Name: ${event}
        Args:       
        ${JSON.stringify(args, undefined, 2)}
        ========================
    `)

    // switch (event) {
    //   // const { args: { returned, tulipsIssued } } = result
    //   case 'LogNumber':
    //     return log(`
    //     LOG FOUND:
    //     ========================
    //     ${args.l} ==> ${Number(args.n).toEth()}
    //     ========================
    //     `)
    //   case 'ClaimBuyerFunds':
    //     return log(`
    //     LOG FOUND:
    //     ========================
    //     RETURNED      ==> ${Number(args.returned).toEth()}
    //     TULIPS ISSUED ==> ${Number(args.tulipsIssued).toEth()}
    //     ========================
    //     `)
    //   default:
    //     return log()
    // }
  })
  const contractEvents = stopWatching[contract.address] || (stopWatching[contract.address] = {})
  if (contractEvents[eventName]) contractEvents[eventName]()
  const unwatch = contractEvents[eventName] = eventObject.stopWatching.bind(eventObject)

  return unwatch
}

module.exports = {
  assertRejects,
  eventWatcher,
  gasLogWrapper,
  log,
}
