const { wait } = require('@digix/tempo');

const {
  eventWatcher,
  log: utilsLog,
  assertRejects,
  gasLogger,
  gasLogWrapper,
} = require('./utils')

const RequestRegistry = artifacts.require('RequestRegistry')
const LendingAgreement = artifacts.require('LendingAgreement')

const StandardToken = artifacts.require('StandardToken')
const ERC20 = artifacts.require('ERC20')

const ONE = 10 ** 18

contract('DTL', async (accounts) => {
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
		await createAgreement(ONE)
	})

	it('should change Pb of an agreement', async () => {
		await changePb()
	})

	it('should change Pc of an agreement', async () => {
		await changePc()
	})

	it('should increase Ac for an agreement', async () => {
		await changeAgreementAc(12 * ONE)
	})

	it('should decrease Ac for an agreement', async () => {
		await changeAgreementAc(8 * ONE)
	})

	it('should return Ab and claim Ac', async () => {
		await returnAb()
	})

	it('should liquidate and claim as Pb after returnTime', async () => {

		await liquidate(Pb)
	})

	it('should liquidate and claim as Pb due to insufficient collateral', async () => {
		await liquidate(Pb)
	})

	it('should reward non Pb with incentivization, liquidate and claim due to insufficient collateral', async () => {
		await liquidate(accounts[2])
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

	async function createAgreement(Ab) {
		await Tb.approve(RR.address, Ab, { from: Pb })
		const latestIndex = (await RR.latestIndices(Tb.address)).toNumber()

		let agreement
		await RR.acceptRequest(Tb.address, latestIndex - 1, 10 ** 15, { from: Pb })
			.then(res => {
				// Expectation: agreement is last log
				let length = res.logs.length
				let log = res.logs[length - 1]
				agreement = log.args.agreement
			})

		LA = LendingAgreement.at(agreement)
		
		// Check agreement was created correctly
		const returnTime = (await LA.returnTime()).toNumber()
		const now = Math.round((new Date()).getTime() / 1000)
		assert(now < returnTime)
	}

	async function changePb() {
		await LA.changePb(accounts[2], { from: Pb })
		const newPb = await LA.Pb()
		assert.equal(newPb, accounts[2])

		await LA.changePb(Pb, { from: accounts[2] })
		const newerPb = await LA.Pb()
		assert.equal(newerPb, Pb)
	}

	async function changePc() {
		await LA.changePc(accounts[2], { from: Pc })
		const newPc = await LA.Pc()
		assert.equal(newPc, accounts[2])

		await LA.changePc(Pc, { from: accounts[2] })
		const newerPc = await LA.Pc()
		assert.equal(newerPc, Pc)
	}

	async function changeAgreementAc(Ac) {
		await Tc.approve(LA.address, Ac, { from: Pc })
		await LA.changeAc(Ac, { from: Pc })

		// Check Ac has been increased
		const newAc = await LA.Ac()
		assert.equal(newAc, Ac)
	}

	async function returnAb() {
		const balAbBefore = (await Tb.balanceOf(Pc)).toNumber()
		const balAcBefore = (await Tc.balanceOf(Pc)).toNumber()
		const Ab = (await LA.Ab()).toNumber()
		const Ac = (await LA.Ac()).toNumber()

		await Tb.approve(LA.address, Ab, { from: Pc })
		await LA.returnAbAndClaimAc()

		// Check Ab has been returned
		const balAbAfter = (await Tb.balanceOf(Pc)).toNumber()
		assert.equal(balAbBefore - Ab, balAbAfter)

		// Check Ac has been returned
		const balAcAfter = (await Tc.balanceOf(Pc)).toNumber()
		assert.equal(balAcBefore + Ac, balAcAfter)
	}

	async function liquidate() {

	}
})