import { BigNumber } from "@ethersproject/bignumber";
import { ILimitOrder } from "../models/models";
import { PriceUpdate } from "../price-updates/pair-updates";
import axios from 'axios';

// calculate if order is profitable enough
export async function profitableOrders(priceUpdate: PriceUpdate, orders: ILimitOrder[]): Promise<ILimitOrder[]> {

  let profit = 0;
  const [_gasPrice, ethPrice, token0price, token1price] = await Promise.all([
    axios(`https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${process.env.ETHERSCAN_API_KEY}`),
    axios(`https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${process.env.ETHERSCAN_API_KEY}`),
    axios(`https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${process.env.ETHERSCAN_API_KEY}`),
    axios(`https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${process.env.ETHERSCAN_API_KEY}`)
  ]);
  const gasPrice = _gasPrice.data?.result?.FastGasPrice;
  console.log(gasPrice);

  orders.forEach(order => {

  });

  return orders;
}

function estimateOutput(token0Amount: BigNumber, token1Amount: BigNumber, token0In: BigNumber, token1In: BigNumber): BigNumber {
  return token0In;
}

function estimateGasCost(n: number) {
  return 160000 + n * 100000;
}