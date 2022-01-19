import { ChainId, WETH9_ADDRESS } from "@sushiswap/core-sdk";

export function getWeth(chainId: ChainId) {

  return WETH9_ADDRESS[chainId];

}