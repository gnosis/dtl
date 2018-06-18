# Decentralized Token Lending

[![Logo](https://raw.githubusercontent.com/gnosis/gnosis-contracts/master/assets/logo.png)](https://gnosis.pm/)

Decentralized token lending (DTL) is a project that allows the lending of any token with ERC-20 support in a fully decentralized way. It uses the DutchX [repo](ttps://github.com/gnosis/dx-contracts) as a price oracle to determine the necessary value of collateral. If the value of the collateral ever falls below `MINIMUM_COLLATERAL` (initally set to 2x) OR the borrower doesn't return the tokens within `returnTime`, anyone can liquidate the collateral. In that case it is sold on the DutchX for the borrowed token, which the lender can then withdraw.

The project is structured in the following way:

RequestRegistry stores all requests to borrow tokens and allows users to create and accept such requests. Once a request is accepted, a new proxy contract is created with the LendingAgreement as it's `masterCopy`.

LendingAgreement is the model that all proxies point to. It allows to increase (or decrease) collateral amount, return the tokens, and liqudiate them in the cases described above.

DTL can potentially allow to short ERC-20 tokens. The current project performs the settlement layer. However, in order to be market-viable, an interest-rate layer would likely be necessary, otherwise there is no incentive to accept any lending request.

To get started, clone the project, run `npm i` and `ganache-cli`, `truffle compile && truffle migrate`. Or alternatively, `truffle compile && truffle test`. The project uses the [decode-eth](https://github.com/dteiml/decode) package, which can be called anytime using `npm run decode` to get a human-readable view of all tx's and all contracts locally deployed.

The DTL implements this specification: https://docs.google.com/document/d/1EuyY1oGeuvWIoGJvwh-nl_i1pgUC5nJDQNpq1WNXPCM/edit

For additional information about the DutchX, check out the repo at [http://github.com/gnosis/dx-contracts](https://github.com/gnosis/dx-contracts).
