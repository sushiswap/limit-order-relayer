# Execute limit orders on Sushiswap

## Run service

`npm run start`

## Run service using forever

`npm run forever-<chainName>`


## Test service

`npm run test`

## Migrate database 

`npm run copy-remote`

## Configuration

See '.example.env' for configuration.

See 'limitOrderConfig/pairs.ts' to set pairs for wich the service will execute limit orders.

Limit orders have a tokenIn and a tokenOut parameter. Every order is considered as a sell order of tokenIn.
Service denominates prices in terms of tokenOut.

Price of limit order is calculated as `amountOut / amountIn` and multiplied by `1000 / 997` to account for LP fees.
