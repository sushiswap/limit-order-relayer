import { IWatchPair } from "../models/models";
import { BigNumber, ethers } from "ethers";
import { Observable, Subject } from 'rxjs';
import dotenv from 'dotenv';
import ERC20_ABI from '../abis/erc20';

dotenv.config();

const provider = new ethers.providers.WebSocketProvider(process.env.MAINNET_WEBSOCKET_JSON_RPC);

export const PRICE_MULTIPLIER = BigNumber.from(1e18.toString());

export interface PriceUpdate {
  pair: IWatchPair,
  token0Balance: BigNumber,
  token1Balance: BigNumber,
  price: BigNumber // price is calculated as (token0Balance * {PRICE_MULTIPLIER}) / token1Balance
}

export function watchSushiwapPairs(watchPairs: IWatchPair[]): Observable<PriceUpdate> {

  // emit a PriceUpdate event after every swap for a given watch pair
  const updates = new Subject<PriceUpdate>();

  watchPairs.forEach(pair => {

    const filter = {
      address: pair.pairAddress,
      topics: [ethers.utils.id("Swap(address,uint256,uint256,uint256,uint256,address)")]
    };

    provider.on(filter, async () => {

      const { token0Balance, token1Balance } = await getPairBalances(pair);
      updates.next({ pair, token0Balance, token1Balance, price: (token0Balance.mul(PRICE_MULTIPLIER)).div(token1Balance) });

    });

  });

  return updates;
}

async function getPairBalances(pair: IWatchPair) {

  const token0 = new ethers.Contract(pair.token0.address, ERC20_ABI, provider);
  const token1 = new ethers.Contract(pair.token1.address, ERC20_ABI, provider);
  const token0Balance = await token0.balanceOf(pair.pairAddress);
  const token1Balance = await token1.balanceOf(pair.pairAddress);

  return { token0Balance, token1Balance };

}