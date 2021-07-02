import { BigNumber } from "@ethersproject/bignumber"
import { PRICE_MULTIPLIER } from "../pairs/pairUpdates";

// price ===  out / in
// e.g. 1 eth as input amount, 2000 dai as output amoutn -> limit price is 2000

export function getOrderPrice(amountIn: BigNumber, amountOut: BigNumber) {
  return amountOut.mul(PRICE_MULTIPLIER).mul("1000").div("997").div(amountIn);
}

export function getOrderPriceString(amountIn: string, amountOut: string) {
  return getOrderPrice(BigNumber.from(amountIn), BigNumber.from(amountOut)).toString();
}

// user must get output tokens by at least this rate
export function getMinRate(amountIn: BigNumber | string, amountOut: BigNumber | string) {
  return BigNumber.from(amountOut).mul(PRICE_MULTIPLIER).div(amountIn);
}