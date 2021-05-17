token0, token1 == order(tokenIn, tokenOut);

If token0 === tokenIn then this is considered a Sell order
If token1 === tokenIn then this is considered a Buy order

External price determined by token0 / token1 amounts in the Sushiswap pools.
E.g. token0 is DAI and token1 is WETH the price is in terms of DAI (4000 DAI for 1 WETH)
E.g. token0 is WETH and token1 is USDC the price is in terms of ETH (0.00025 WETH for 1 USDC)