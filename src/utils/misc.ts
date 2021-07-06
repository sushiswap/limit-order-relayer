import { ChainId } from "@sushiswap/sdk";

export function getWeth(chainId: ChainId) {

  if (chainId === ChainId.MATIC) return "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";

  throw new Error(`Couldn't find weth address for chain ${chainId}`);

}