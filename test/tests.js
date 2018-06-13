const { wait } = require('@digix/tempo')(web3)

const {
  log: utilsLog,
  assertRejects,
} = require('./utils')

const RequestRegistry = artifacts.require('RequestRegistry')
const LendingAgreement = artifacts.require('LendingAgreement')
const dx = artifacts.require('DX')

const StandardToken = artifacts.require('StandardToken')
const ERC20 = artifacts.require('ERC20')

const ONE = 10 ** 18

let count = 0

contract('DTL', async (accounts) => {
	const Pc = accounts[0]
	const Pb = accounts[1]

	let RR
	// As we delete and create new agreements in the tests, this one always stored the latest:
	let LA
	let Tc
	let Tb
	let DX

	before(async () => {

  		RR = await RequestRegistry.deployed()
		Tc = await ERC20.deployed()
		Tb = await ERC20.new([Pb, Pc, accounts[2]])
		DX = await dx.deployed()
	})

	// Request Registry tests
	it('should create a req', async () => {
		await createRequest(ONE)
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
		await createRequest(ONE)
		await createAgreement(ONE)

		const now = web3.eth.getBlock('latest').timestamp
		const returnTime = (await LA.returnTime()).toNumber()
		await wait(returnTime - now + 100)
		await LA.liquidate({ from: Pb })
		const TbBalBefore = (await Tb.balanceOf(Pb)).toNumber()

		// We simulate a trade by adding balance for the DX:
		await Tb.transfer(DX.address, 3 * ONE)
		await LA.claimFunds({ from: Pb })

		// Check Pb received liquidated collateral
		const TbBalAfter = (await Tb.balanceOf(Pb)).toNumber()
		assert.equal(TbBalBefore + 3 * ONE, TbBalAfter)
	})

	it('should liquidate and claim as Pb due to insufficient collateral', async () => {
		await createRequest(ONE)
		await createAgreement(ONE)

		await DX.changeMarketPrice(4)

		await LA.liquidate({ from: Pb })
		const TbBalBefore = (await Tb.balanceOf(Pb)).toNumber()

		// We simulate a trade by adding balance for the DX:
		await Tb.transfer(DX.address, 3 * ONE)
		await LA.claimFunds({ from: Pb })

		// Check Pb received liquidated collateral
		const TbBalAfter = (await Tb.balanceOf(Pb)).toNumber()
		assert.equal(TbBalBefore + 3 * ONE, TbBalAfter)
	})

	it('should reward non Pb with incentivization, liquidate and claim due to insufficient collateral', async () => {
		// We have to reset market price to 2
		await DX.changeMarketPrice(2)
		await createRequest(ONE)
		await createAgreement(ONE)

		await DX.changeMarketPrice(4)
		const TcBalBefore = (await Tc.balanceOf(accounts[2])).toNumber()
		const TbBalBefore = (await Tb.balanceOf(Pb)).toNumber()

		const inc = (await LA.incentivization()).toNumber()
		
		await LA.liquidate({ from: accounts[2] })

		// We simulate a trade by adding balance for the DX:
		await Tb.transfer(DX.address, 3 * ONE - 10 ** 15)
		await LA.claimFunds({ from: Pb })

		// Check incetivizer received part of collateral
		const TcBalAfter = (await Tc.balanceOf(accounts[2])).toNumber()
		assert.equal(TcBalBefore + 10 ** 15, TcBalAfter)

		// Check Pb received liquidated collateral
		const TbBalAfter = (await Tb.balanceOf(Pb)).toNumber()
		assert.equal(TbBalBefore + 3 * ONE - 10 ** 15, TbBalAfter)
	})

	async function createRequest(Ab) {
		const now = web3.eth.getBlock('latest').timestamp
		const sixHrs = 60 * 60 * 6
		const latestIndex = (await RR.latestIndices(Tb.address)).toNumber()
		// We multiply by latestIndex for calls after wait() to scuceed
		const returnTime = now + (latestIndex + 1) * sixHrs
		await RR.postRequest(Tc.address, Tb.address, Ab, returnTime, { from: Pc })

		// Check req was created
		const thisRequest = await RR.requests(Tb.address, latestIndex)
		for (let i = 2; i < 4; i++) {
			thisRequest[i] = thisRequest[i].toNumber()
		}
		const a = [Pc, Tc.address, Ab, returnTime]
		assert.deepEqual(thisRequest, a)

		// Check latest index was incremented
		const latestIndexAfter = (await RR.latestIndices(Tb.address)).toNumber()
		assert.equal(latestIndex + 1, latestIndexAfter)

		count++
	}

	async function cancelRequest() {
		await RR.cancelRequest(Tb.address, 0, { from: Pc })

		// Check request was deleted
		const thisRequest = await RR.requests(Tb.address, 0)
		for (let i = 2; i < 4; i++) {
			thisRequest[i] = thisRequest[i].toNumber()
		}
		for (let i = 0; i < 4; i++) {
			// request has been nulified
			assert(thisRequest[i] == '0x0000000000000000000000000000000000000000' ||
				thisRequest[i] == 0)
		}
	}

	async function createAgreement(Ab) {
		await Tc.approve(RR.address, 6 * Ab, { from: Pc })
		await Tb.approve(RR.address, Ab, { from: Pb })
		const latestIndex = (await RR.latestIndices(Tb.address)).toNumber()

		const TbBalBefore = (await Tb.balanceOf(Pc)).toNumber()

		let agreement
		await RR.acceptRequest(Tb.address, latestIndex - 1, 6000, { from: Pb })
			.then(res => {
				// Expectation: agreement is last log
				let length = res.logs.length
				let log = res.logs[length - 1]
				agreement = log.args.agreement
			})

		LA = LendingAgreement.at(agreement)
		
		// Check agreement was created correctly
		const returnTime = (await LA.returnTime()).toNumber()
		const now = web3.eth.getBlock('latest').timestamp
		assert(now < returnTime)

		// Check collateral was provided
		const TcBal = (await Tc.balanceOf(LA.address)).toNumber()
		assert.equal(TcBal, 6 * Ab)

		// Check Tb was provided
		const TbBalAfter = (await Tb.balanceOf(Pc)).toNumber()
		assert.equal(TbBalBefore + Ab, TbBalAfter)
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
		await LA.returnTbAndChangeAc(Ab, 0)

		// Check Ab has been returned
		const balAbAfter = (await Tb.balanceOf(Pc)).toNumber()
		assert.equal(balAbBefore - Ab, balAbAfter)

		// Check Ac has been returned
		const balAcAfter = (await Tc.balanceOf(Pc)).toNumber()
		assert.equal(balAcBefore + Ac, balAcAfter)
	}

	async function liquidate(account) {
		await LA.liquidate()
	}
})