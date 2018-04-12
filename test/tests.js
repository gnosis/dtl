const {
  eventWatcher,
  log: utilsLog,
  assertRejects,
  gasLogger,
  gasLogWrapper,
} = require('./utils')

const RequestRegistry = artifacts.require('./RequestRegistry.sol')
const StandardToken = artifacts.require('./StandardToken.sol')
const ERC20 = artifacts.require('./ERC20.sol')

contract('RequestRegistry', async (accounts) => {
	const initializer = accounts[0]
	const borrower = accounts[1]
	const lender = accounts[2]

	let RR
	let LA
	let cT
	let bT

	before(async () => {

  		RR = await RequestRegistry.deployed()
		cT = await ERC20.deployed()
		bT = await ERC20.new([initializer, borrower, lender])

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

	// Request Registry tests

	it('should create a req', async () => {
		await createRequest()
	})

	it('should cancel a req', async () => {
		await createRequest()
		await cancelRequest()
	})

	it('should decrease Ac for a req', async () => {
		await createRequest()
		await changeReqAc()
	})

	it('should increase Ac for a req', async () => {
		await createRequest()
		await changeReqAc()
	})

	// Lending Agreement tests
	it('should create an agreement', async () => {
		await createAgreement()
	})

	it('should change Pb of an agreement', async () => {
		await createAgreement()
		await changePb()
	})

	it('should change Pc of an agreement', async () => {
		await createAgreement()
		await changePc()
	})

	it('should increase Ac for an agreement', async () => {
		await createAgreement()
		await changeAgreementAc()
	})

	it('should decrease Ac for an agreement', async () => {
		await createAgreement()
		await changeAgreementAc()
	})

	it('should return Ab and claim Ac', async () => {

	})

	it('should liquidate and claim as Pb after returnTime', async () => {

	})

	it('should liquidate and claim as Pb due to insufficient collateral', async () => {

	})

	it('should reward non Pb with incentivization, liquidate and claim due to insufficient collateral', async () => {

	})

	async function createRequest() {

	}

	async function 
})