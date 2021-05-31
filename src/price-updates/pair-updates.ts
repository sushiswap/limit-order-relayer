import { IWatchPair } from "../models/models";
import { BigNumber, ethers } from "ethers";
import { Observable, Subject } from 'rxjs';
import dotenv from 'dotenv';
import ERC20_ABI from '../abis/erc20';

dotenv.config();

const provider = useWss() ?
  new ethers.providers.WebSocketProvider(process.env.WEBSOCKET_JSON_RPC) :
  new ethers.providers.JsonRpcProvider(process.env.HTTP_JSON_RPC);

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

  // emit a PriceUpdate event after every swap for a given watch pair
  const updates = new Subject<PriceUpdate>();

  watchPairs.forEach(pair => {

    if (useWss()) {

      const filter = {
        address: pair.pairAddress,
        topics: [ethers.utils.id("Swap(address,uint256,uint256,uint256,uint256,address)")]
      };

      provider.on(filter, async () => {

        const { token0Balance, token1Balance } = await getPairBalances(pair).catch();

        if (!token0Balance || !token1Balance) return;

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

        updates.next({ pair, token0, token1 });

      });

    } else {

      setInterval(async () => {

        const { token0Balance, token1Balance } = await getPairBalances(pair).catch();

        if (!token0Balance || !token1Balance) return;

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

        updates.next({ pair, token0, token1 });

      }, 10000);

    }

  });

  return updates;
}

async function getPairBalances(pair: IWatchPair) {

  const token0 = new ethers.Contract(pair.token0.address, ERC20_ABI, provider);
  const token1 = new ethers.Contract(pair.token1.address, ERC20_ABI, provider);
  const token0Balance = await token0.balanceOf(pair.pairAddress).catch();
  const token1Balance = await token1.balanceOf(pair.pairAddress).catch();

  return { token0Balance, token1Balance };

}

export function useWss() {
  return process.env.USE_WSS === 'TRUE';
}