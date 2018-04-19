const {
  eventWatcher,
  log: utilsLog,
  assertRejects,
  gasLogger,
  gasLogWrapper,
} = require('./utils')

const RequestRegistry = artifacts.require('RequestRegistry')
const StandardToken = artifacts.require('StandardToken')
const ERC20 = artifacts.require('ERC20')

const ONE = 10 ** 18

contract('RequestRegistry', async (accounts) => {
	const Pc = accounts[0]
	const Pb = accounts[1]

	let RR
	let LA
	let Tc
	let Tb

	before(async () => {

  		RR = await RequestRegistry.deployed()
		Tc = await ERC20.deployed()
		Tb = await ERC20.new([Pb, Pc, accounts[2]])

	})

	// Request Registry tests
	it('should create a req', async () => {
		await createRequest(ONE)
	})

	it('should increase Ac for a req', async () => {
		await changeReqAc(10 * ONE)
	})

	it('should decrease Ac for a req', async () => {
		await changeReqAc(8 * ONE)
	})

	it('should cancel a req', async () => {
		await cancelRequest()
	})

	// Lending Agreement tests
	it('should create an agreement', async () => {
		await createRequest(ONE)
		await createAgreement()
	})

	it('should change Pb of an agreement', async () => {
		// await changePb()
	})

	it('should change Pc of an agreement', async () => {
		// await changePc()
	})

	it('should increase Ac for an agreement', async () => {
		// await createAgreement()
		// await changeAgreementAc()
	})

	it('should decrease Ac for an agreement', async () => {
		// await createAgreement()
		// await changeAgreementAc()
	})

	it('should return Ab and claim Ac', async () => {

	})

	it('should liquidate and claim as Pb after returnTime', async () => {

	})

	it('should liquidate and claim as Pb due to insufficient collateral', async () => {

	})

	it('should reward non Pb with incentivization, liquidate and claim due to insufficient collateral', async () => {

	})

	async function createRequest(Ab) {
		const now = Math.round((new Date()).getTime() / 1000)
		const sixHrs = 60 * 60 * 6
		await Tc.approve(RR.address, 8 * Ab, { from: Pc })
		const latestIndex = (await RR.latestIndices(Tb.address)).toNumber()
		await RR.postRequest(Tc.address, Tb.address, 0, Ab, now + sixHrs, { from: Pc })

		// Check req was created
		const thisRequest = await RR.requests(Tb.address, latestIndex)
		for (let i = 3; i < 6; i++) {
			thisRequest[i] = thisRequest[i].toNumber()
		}
		const a = [Pc, Tc.address, Tb.address, 8 * Ab, Ab, now + sixHrs]
		assert.deepEqual(thisRequest, a)

		// Check latest index was incremented
		const latestIndexAfter = (await RR.latestIndices(Tb.address)).toNumber()
		assert.equal(latestIndex + 1, latestIndexAfter)
	}

	async function cancelRequest() {
		await RR.cancelRequest(Tb.address, 0, { from: Pc })

		// Check Ac was returned
		const bal = (await Tc.balanceOf(Pc)).toNumber()
		assert.equal(bal, 100 * ONE)

		// Check request was deleted
		const thisRequest = await RR.requests(Tb.address, 0)
		for (let i = 3; i < 6; i++) {
			thisRequest[i] = thisRequest[i].toNumber()
		}
		for (let i = 0; i < 6; i++) {
			// request has been nulified
			assert(thisRequest[i] == '0x0000000000000000000000000000000000000000' ||
				thisRequest[i] == 0)
		}
	}

	async function changeReqAc(Ac) {
		await Tc.approve(RR.address, Ac, { from: Pc })
		await RR.changeAc(Tb.address, 0, Ac, { from: Pc })

		// Check Ac was changed
		const thisRequest = await RR.requests(Tb.address, 0)
		const newAc = thisRequest[3].toNumber()

		assert.equal(Ac, newAc)
	}

	async function createAgreement() {
		await Tb.approve(Pc, ONE, { from: Pb })
		const latestIndex = (await RR.latestIndices(Tb.address)).toNumber()
		await RR.acceptRequest(Tb.address, latestIndex - 1, 10 ** 15)

		// Check agreement was created
	}

	async function changePb() {

	}

	async function changePc() {

	}
})