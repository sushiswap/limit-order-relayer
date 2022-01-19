import { IWatchPair } from "../models/models";
import { BigNumber, ethers } from "ethers";
import { Observable, Subject } from 'rxjs';
import HELPER from '../abis/helper';
import { MyProvider } from "../utils/myProvider";
import { MyLogger } from "../utils/myLogger";

export const PRICE_MULTIPLIER = BigNumber.from(1e18.toString());

export interface PriceUpdate {
  pair: IWatchPair,
  token0: {
    poolBalance: BigNumber,
    price: BigNumber, // price is calculated as (token1Balance * {PRICE_MULTIPLIER}) / token0Balance
    address: string,
    decimals: number,
    addressMainnet?: string
  },
  token1: {
    poolBalance: BigNumber,
    price: BigNumber, // price is calculated as (token0Balance * {PRICE_MULTIPLIER}) / token1Balance
    address: string,
    decimals: number,
    addressMainnet?: string
  }
}

export function watchSushiwapPairs(watchPairs: IWatchPair[]): Observable<PriceUpdate[]> {

  const provider = MyProvider.Instance.provider;

  const updates = new Subject<PriceUpdate[]>();

  const updatePrices = async () => {

    const poolsInfo = await getPoolBalances(watchPairs, provider);

    const _updates = [];

    poolsInfo.forEach((poolInfo, i) => {

      const pair = watchPairs[i];

      const token0 = {
        price: (poolInfo.token1.mul(PRICE_MULTIPLIER)).div(poolInfo.token0),
        poolBalance: poolInfo.token0,
        address: pair.token0.address,
        decimals: pair.token0.decimals,
        addressMainnet: pair.token0.addressMainnet
      };

      const token1 = {
        price: (poolInfo.token0.mul(PRICE_MULTIPLIER)).div(poolInfo.token1),
        poolBalance: poolInfo.token1,
        address: pair.token1.address,
        decimals: pair.token1.decimals,
        addressMainnet: pair.token1.addressMainnet
      };

      _updates.push({ token0, token1, pair });

    });

    updates.next(_updates);

  }

  updatePrices(); // once at the start

  setInterval(async () => {

    updatePrices().then().catch(e => MyLogger.log(`Failed to fetch pool price ${e.toString().substring(0, 400)} ...`));

  }, +process.env.INTERVAL_MINUTES * 60 * 1000); // then every x min

  return updates;
}

export async function getPoolBalances(pairs: IWatchPair[], provider: ethers.providers.Provider): Promise<{ token0: BigNumber, token1: BigNumber }[]> {

  const helper = new ethers.Contract(process.env.HELPER, HELPER, provider);

  const poolInfos = await helper.getPoolInfo(pairs.map(pair => pair.token0.address), pairs.map(pair => pair.token1.address));

  return poolInfos.map(info => { return { token0: info.tokenAPoolBalance, token1: info.tokenBPoolBalance } });

}