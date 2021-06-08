
export function validateEnv() {

  if (!process.env.PRIVATE_KEY) throw new Error("PRIVATE_KEY missing from env")

  if (!process.env.MONGODB_URL) throw new Error("MONGODB_URL missing from env")

  if (!process.env.WEBSOCKET_JSON_RPC && process.env.USE_WSS === 'TRUE') throw new Error("WEBSOCKET_JSON_RPC missing from env")

  if (!process.env.HTTP_JSON_RPC) throw new Error("HTTP_JSON_RPC missing from env")

  // if (!process.env.USE_WSS) throw new Error("USE_WSS missing from env")

  // if (!process.env.ETHERSCAN_API_KEY) throw new Error("ETHERSCAN_API_KEY missing from env")

  if (!process.env.WETH_ADDRESS) throw new Error("WETH_ADDRESS missing from env")

  if (!process.env.CHAINID) throw new Error("CHAINID missing from env")

  if (!process.env.FACTORY_ADDRESS) throw new Error("FACTORY_ADDRESS missing from env")

  if (!process.env.PAIR_CODE_HASH) throw new Error("PAIR_CODE_HASH missing from env")

  if (!process.env.PROFIT_RECEIVER_ADDRESS) throw new Error("PROFIT_RECEIVER_ADDRESS missing from env")

}