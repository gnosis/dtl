/* eslint no-multi-spaces: 0, no-console: 0 */

const Math = artifacts.require('Math')
const StandardToken = artifacts.require('StandardToken')
const ERC20 = artifacts.require('ERC20')

const DX = artifacts.require('DX')
const RequestRegistry = artifacts.require('RequestRegistry')
const LendingAgreement = artifacts.require('LendingAgreement')

module.exports = function deploy(deployer, networks, accounts) {
  deployer.deploy(Math)

    .then(() => deployer.link(Math, [StandardToken, ERC20]))

    .then(() => deployer.deploy(ERC20, [accounts[0], accounts[1], accounts[2]]))

    .then(() => deployer.deploy(DX))

    .then(() => deployer.deploy(LendingAgreement))

    .then(() => deployer.deploy(RequestRegistry, DX.address, ERC20.address, LendingAgreement.address))
}
