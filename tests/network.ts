import { getLimitOrderPairs } from '../src/utils/watchPairs';
import { NetworkPrices } from '../src/utils/networkPrices';
import { IWatchPair } from '../src/models/models';
import { expect } from 'chai';
import { PriceUpdate, PRICE_MULTIPLIER } from '../src/price-updates/pair-updates';

describe('Token prices', () => {
  it.only('Should get price of every token', async () => {

    const pairs: IWatchPair[] = await getLimitOrderPairs();
    console.log(pairs);

    // const tokens = [].concat.apply([], pairs.map(pair => [pair.token0, pair.token1])).filter((v, i, a) => a.findIndex(el => el.address === v.address) === i);

    const networkPrices = new NetworkPrices();

    const mockPriceUpdates = pairs.map(pair => {
      return {
        pair,
        token0: {
          price: PRICE_MULTIPLIER,
          address: pair.token0.address,
          addressMainnet: pair.token0.addressMainnet
        },
        token1: {
          price: PRICE_MULTIPLIER,
          address: pair.token1.address,
          addressMainnet: pair.token1.addressMainnet
        }
      } as PriceUpdate
    })

    const prices = Promise.all(mockPriceUpdates.map(pu => networkPrices.getPrices(pu, +process.env.chainId)));

    expect(await prices).to.not.throw;

  }).timeout(20000);

});
