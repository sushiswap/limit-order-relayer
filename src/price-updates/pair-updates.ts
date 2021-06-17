import { IWatchPair } from "../models/models";
import { BigNumber, ethers } from "ethers";
import { Observable, Subject } from 'rxjs';
import ERC20_ABI from '../abis/erc20';
import { MyProvider } from "../utils/provider";
import { MyLogger } from "../utils/myLogger";

export const PRICE_MULTIPLIER = BigNumber.from(1e18.toString());

export interface PriceUpdate {
  pair: IWatchPair,
  token0: {
    poolBalance: BigNumber,
    price: BigNumber, // price is calculated as (token1Balance * {PRICE_MULTIPLIER}) / token0Balance
    address: string   // e.g. token0 is DAI, token1 is WETH ... token0.price is ~ 0.00033
  },
  token1: {
    poolBalance: BigNumber,
    price: BigNumber, // price is calculated as (token0Balance * {PRICE_MULTIPLIER}) / token1Balance
    address: string
  }
}

export function watchSushiwapPairs(watchPairs: IWatchPair[]): Observable<PriceUpdate> {

  const provider = MyProvider.Instance.provider;

  const updates = new Subject<PriceUpdate>();

  watchPairs.forEach(async pair => {

    fetchPairData(pair, provider).then(update => updates.next(update)).catch(); // do it once at the beginning

    if (MyProvider.Instance.usingSocket) {

      const filter = {
        address: pair.pairAddress,
        topics: [ethers.utils.id("Swap(address,uint256,uint256,uint256,uint256,address)")]
      };

      MyProvider.Instance.socketProvider.on(filter, async () => {
        fetchPairData(pair, provider).then(update => updates.next(update)).catch();
      });

    } else {

      setInterval(async () => {
        fetchPairData(pair, provider).then(update => updates.next(update)).catch();
      }, 180000); // every 3 min

    }

  });

  return updates;
}

async function fetchPairData(pair: IWatchPair, provider: ethers.providers.Provider): Promise<PriceUpdate> {

  const { token0Balance, token1Balance } = await getPairBalances(pair, provider);

  const token0 = {
    price: (token1Balance.mul(PRICE_MULTIPLIER)).div(token0Balance),
    poolBalance: token0Balance,
    address: pair.token0.address
  };

  const token1 = {
    price: (token0Balance.mul(PRICE_MULTIPLIER)).div(token1Balance),
    poolBalance: token1Balance,
    address: pair.token1.address
  };

  return { pair, token0, token1 };
}

async function getPairBalances(pair: IWatchPair, provider: ethers.providers.Provider) {

  const token0 = new ethers.Contract(pair.token0.address, ERC20_ABI, provider);
  const token1 = new ethers.Contract(pair.token1.address, ERC20_ABI, provider);

  const token0Balance = await token0.balanceOf(pair.pairAddress).catch(e => MyLogger.log(`Failed to fetch pool price: ${e}`));
  const token1Balance = await token1.balanceOf(pair.pairAddress).catch(e => MyLogger.log(`Failed to fetch pool price: ${e}`));

  return { token0Balance, token1Balance };

}
