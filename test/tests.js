const {
  eventWatcher,
  log: utilsLog,
  assertRejects,
  gasLogger,
  gasLogWrapper,
} = require('./utils')

const RequestRegistry = artifacts.require('./RequestRegistry.sol')
const LendingAgreement = artifacts.require('./LendingAgreement.sol')
const StandardToken = artifacts.require('./StandardToken.sol')
const TokenWithConstr = artifacts.require('./TokenWithConstr')

contract('RequestRegistry', async (accounts) => {
	const initializer = accounts[0]
	const borrower = accounts[1]
	const lender = accounts[2]

	let RR
	let LA
	let cT
	let bT

	// const contractNames = [
	// 	'RequestRegistry',
	// 	'LendingAgreement',
	// 	'TokenWithConstr',
	// ]

	// const getContracts = async () => {
	//   const depContracts = contractNames.map(c => artifacts.require(c)).map(cc => cc.deployed())
	//   const contractInstances = await Promise.all(depContracts)

	//   const gasLoggedContracts = gasLogWrapper(contractInstances)

	//   const deployedContracts = contractNames.reduce((acc, name, i) => {
	//     acc[name] = gasLoggedContracts[i]
	//     return acc
	//   }, {});

	//   [deployedContracts.DutchExchange, deployedContracts.TokenOWL] = gasLogWrapper([
	//     artifacts.require('DutchExchange').at(deployedContracts.Proxy.address),
	//     artifacts.require('TokenOWL').at(deployedContracts.TokenOWLProxy.address),
	//   ])
	//   return deployedContracts
	// }

	before(async () => {
		// const { DutchExchange: dx } = await getContracts()

  		RR = await RequestRegistry.deployed()
  		// LA = await LendingAgreement.deployed()
		cT = await TokenWithConstr.deployed()
		bT = await TokenWithConstr.new(100000 * (10 ** 18))
			
		// const arr0 = [RR, LA, cT, bT]
		// const arr = arr0.map(x => x.address)
		// console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
		// console.log('addresses',arr);
		// console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');

  		// eventWatcher(cT, 'Transfer')

  		// eventWatcher(cT, 'Approval')

  		// eventWatcher(bT, 'Transfer')

	   //  eventWatcher(RR, 'Log')
	})

	it('should create a request and cancel it', async () => {
		await cT.transfer(borrower, 10 ** 18, { from: initializer })
		await bT.transfer(lender, 10 ** 18, { from: initializer })
		await cT.approve(RR.address, 1000, { from: borrower })
		await RR.postBorrowRequest(cT.address, bT.address, 10, 11, { from: borrower })
		await RR.cancelBorrowRequest(bT.address, 1, { from: borrower })
	})

	it('should create a request and corresponding agreement', async () => {
		await cT.transfer(borrower, 10 ** 18, { from: initializer })
		await bT.transfer(lender, 10 ** 18, { from: initializer })
		await cT.approve(RR.address, 1000, { from: borrower })
		await RR.postBorrowRequest(cT.address, bT.address, 10, 11, { from: borrower })
		await RR.createAgreement(bT.address, 1, 0, { from: lender })
	})
})