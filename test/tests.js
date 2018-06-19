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
	const borrower = accounts[0]
	const lender = accounts[1]

	let requestRegistry
	// As we delete and create new agreements in the tests, this one always stored the latest:
	let lendingAgreement
	let collateralToken
	let token
	let DX

	before(async () => {

  		requestRegistry = await RequestRegistry.deployed()
		collateralToken = await ERC20.deployed()
		token = await ERC20.new([lender, borrower, accounts[2]])
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

	it('should change lender of an agreement', async () => {
		await changeLender()
	})

	it('should change borrower of an agreement', async () => {
		await changeBorrower()
	})

	it('should increase collateralAmount for an agreement', async () => {
		await changeAgreementCollateralAmount(12 * ONE)
	})

	it('should decrease collateralAmount for an agreement', async () => {
		await changeAgreementCollateralAmount(8 * ONE)
	})

	it('should return borrowedAmount and claim collateralAmount', async () => {
		await returnBorrowedAmount()
	})

	it('should liquidate and claim as lender after returnTime', async () => {
		await createRequest(ONE)
		await createAgreement(ONE)

		const now = web3.eth.getBlock('latest').timestamp
		const returnTime = (await lendingAgreement.returnTime()).toNumber()
		await wait(returnTime - now + 100)
		await lendingAgreement.liquidate({ from: lender })
		const tokenBalBefore = (await token.balanceOf(lender)).toNumber()

		// We simulate a trade by adding balance for the DX:
		await token.transfer(DX.address, 3 * ONE)
		await lendingAgreement.claimFunds({ from: lender })

		// Check lender received liquidated collateral
		const tokenBalAfter = (await token.balanceOf(lender)).toNumber()
		assert.equal(tokenBalBefore + 3 * ONE, tokenBalAfter)
	})

	it('should liquidate and claim as lender due to insufficient collateral', async () => {
		await createRequest(ONE)
		await createAgreement(ONE)

		await DX.changeMarketPrice(4)

		await lendingAgreement.liquidate({ from: lender })
		const tokenBalBefore = (await token.balanceOf(lender)).toNumber()

		// We simulate a trade by adding balance for the DX:
		await token.transfer(DX.address, 3 * ONE)
		await lendingAgreement.claimFunds({ from: lender })

		// Check lender received liquidated collateral
		const tokenBalAfter = (await token.balanceOf(lender)).toNumber()
		assert.equal(tokenBalBefore + 3 * ONE, tokenBalAfter)
	})

	it('should reward non lender with incentivization, liquidate and claim due to insufficient collateral', async () => {
		// We have to reset market price to 2
		await DX.changeMarketPrice(2)
		await createRequest(ONE)
		await createAgreement(ONE)

		await DX.changeMarketPrice(4)
		const collateralTokenBalBefore = (await collateralToken.balanceOf(accounts[2])).toNumber()
		const tokenBalBefore = (await token.balanceOf(lender)).toNumber()

		const inc = (await lendingAgreement.incentivization()).toNumber()
		
		await lendingAgreement.liquidate({ from: accounts[2] })

		// We simulate a trade by adding balance for the DX:
		await token.transfer(DX.address, 3 * ONE - 10 ** 15)
		await lendingAgreement.claimFunds({ from: lender })

		// Check incetivizer received part of collateral
		const collateralTokenBalAfter = (await collateralToken.balanceOf(accounts[2])).toNumber()
		assert.equal(collateralTokenBalBefore + 10 ** 15, collateralTokenBalAfter)

		// Check lender received liquidated collateral
		const tokenBalAfter = (await token.balanceOf(lender)).toNumber()
		assert.equal(tokenBalBefore + 3 * ONE - 10 ** 15, tokenBalAfter)
	})

	async function createRequest(borrowedAmount) {
		const now = web3.eth.getBlock('latest').timestamp
		const sixHrs = 60 * 60 * 6
		const latestIndex = (await requestRegistry.latestIndices(token.address)).toNumber()
		// We multiply by latestIndex for calls after wait() to scuceed
		const returnTime = now + (latestIndex + 1) * sixHrs
		await requestRegistry.postRequest(collateralToken.address, token.address, borrowedAmount, returnTime, { from: borrower })

		// Check req was created
		const thisRequest = await requestRegistry.requests(token.address, latestIndex)
		for (let i = 2; i < 4; i++) {
			thisRequest[i] = thisRequest[i].toNumber()
		}
		const a = [borrower, collateralToken.address, borrowedAmount, returnTime]
		assert.deepEqual(thisRequest, a)

		// Check latest index was incremented
		const latestIndexAfter = (await requestRegistry.latestIndices(token.address)).toNumber()
		assert.equal(latestIndex + 1, latestIndexAfter)

		count++
	}

	async function cancelRequest() {
		await requestRegistry.cancelRequest(token.address, 0, { from: borrower })

		// Check request was deleted
		const thisRequest = await requestRegistry.requests(token.address, 0)
		for (let i = 2; i < 4; i++) {
			thisRequest[i] = thisRequest[i].toNumber()
		}
		for (let i = 0; i < 4; i++) {
			// request has been nulified
			assert(thisRequest[i] == '0x0000000000000000000000000000000000000000' ||
				thisRequest[i] == 0)
		}
	}

	async function createAgreement(borrowedAmount) {
		await collateralToken.approve(requestRegistry.address, 6 * borrowedAmount, { from: borrower })
		await token.approve(requestRegistry.address, borrowedAmount, { from: lender })
		const latestIndex = (await requestRegistry.latestIndices(token.address)).toNumber()

		const tokenBalBefore = (await token.balanceOf(borrower)).toNumber()

		let agreement
		await requestRegistry.acceptRequest(token.address, latestIndex - 1, 6000, { from: lender })
			.then(res => {
				// Expectation: agreement is last log
				let length = res.logs.length
				let log = res.logs[length - 1]
				agreement = log.args.agreement
			})

		lendingAgreement = LendingAgreement.at(agreement)
		
		// Check agreement was created correctly
		const returnTime = (await lendingAgreement.returnTime()).toNumber()
		const now = web3.eth.getBlock('latest').timestamp
		assert(now < returnTime)

		// Check collateral was provided
		const collateralTokenBal = (await collateralToken.balanceOf(lendingAgreement.address)).toNumber()
		assert.equal(collateralTokenBal, 6 * borrowedAmount)

		// Check token was provided
		const tokenBalAfter = (await token.balanceOf(borrower)).toNumber()
		assert.equal(tokenBalBefore + borrowedAmount, tokenBalAfter)
	}

	async function changeLender() {
		await lendingAgreement.changeLender(accounts[2], { from: lender })
		const newLender = await lendingAgreement.lender()
		assert.equal(newLender, accounts[2])

		await lendingAgreement.changeLender(lender, { from: accounts[2] })
		const newerlender = await lendingAgreement.lender()
		assert.equal(newerlender, lender)
	}

	async function changeBorrower() {
		await lendingAgreement.changeBorrower(accounts[2], { from: borrower })
		const newBorrower = await lendingAgreement.borrower()
		assert.equal(newBorrower, accounts[2])

		await lendingAgreement.changeBorrower(borrower, { from: accounts[2] })
		const newerborrower = await lendingAgreement.borrower()
		assert.equal(newerborrower, borrower)
	}

	async function changeAgreementCollateralAmount(collateralAmount) {
		await collateralToken.approve(lendingAgreement.address, collateralAmount, { from: borrower })
		await lendingAgreement.changeCollateralAmount(collateralAmount, { from: borrower })

		// Check collateralAmount has been increased
		const newCollateralAmount = await lendingAgreement.collateralAmount()
		assert.equal(newCollateralAmount, collateralAmount)
	}

	async function returnBorrowedAmount() {
		const balBorrowedAmountBefore = (await token.balanceOf(borrower)).toNumber()
		const balCollateralAmountBefore = (await collateralToken.balanceOf(borrower)).toNumber()
		const borrowedAmount = (await lendingAgreement.borrowedAmount()).toNumber()
		const collateralAmount = (await lendingAgreement.collateralAmount()).toNumber()

		await token.approve(lendingAgreement.address, borrowedAmount, { from: borrower })
		await lendingAgreement.returnTokensAndChangeCollateralAmount(borrowedAmount, 0)

		// Check borrowedAmount has been returned
		const balBorrowedAmountAfter = (await token.balanceOf(borrower)).toNumber()
		assert.equal(balBorrowedAmountBefore - borrowedAmount, balBorrowedAmountAfter)

		// Check collateralAmount has been returned
		const balCollateralAmountAfter = (await collateralToken.balanceOf(borrower)).toNumber()
		assert.equal(balCollateralAmountBefore + collateralAmount, balCollateralAmountAfter)
	}

	async function liquidate(account) {
		await lendingAgreement.liquidate()
	}
})