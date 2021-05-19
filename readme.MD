## Execute limit orders on Sushiswap.

Limit orders have a tokenIn and a tokenOut parameter. This service sorts the tokens

`token0, token1 = sort(tokenIn, tokenOut)`

If `token0 === tokenIn` Then the service considers this as a sell order.

If `token1 === tokenIn` Then the service considers this as a buy order.

Price is determined by `token0 / token1` amounts in the Sushiswap pools.

If `token0` is DAI and `token1` is WETH the price is in terms of DAI (e.g. 4000 DAI for one WETH)

If `token0` is WETH and `token1` is USDC the price is in terms of ETH (e.g. 0.00025 WETH for one USDC)

## Execute limit orders on Sushiswap.

Limit orders have a tokenIn and a tokenOut parameter. Every order is considered as a sell order of tokenIn.
Service denominates prices in terms of tokenOut.

