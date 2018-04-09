/* eslint no-multi-spaces: 0, no-console: 0 */

const Math = artifacts.require('Math')
const StandardToken = artifacts.require('StandardToken')
const TokenWithConstr = artifacts.require('TokenWithConstr')

const DutchExchangeInterface = artifacts.require('DutchExchangeInterface')
const RequestRegistry = artifacts.require('RequestRegistry')
const LendingAgreement = artifacts.require('LendingAgreement')

module.exports = function deploy(deployer, networks, accounts) {
  deployer.deploy(Math)

    .then(() => deployer.link(Math, [StandardToken, TokenWithConstr]))

    .then(() => deployer.deploy(TokenWithConstr, 100000 * (10 ** 18)))

    .then(() => deployer.deploy(DutchExchangeInterface))

    .then(() => deployer.deploy(RequestRegistry, DutchExchangeInterface.address))
}
