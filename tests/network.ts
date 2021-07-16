import { NetworkPrices } from '../src/utils/networkPrices';
import { IWatchPair } from '../src/models/models';
import { expect } from 'chai';
import { getLimitOrderPairs } from '../src/pairs/watchPairs';
import { PriceUpdate, PRICE_MULTIPLIER } from '../src/pairs/pairUpdates';

describe('Token prices', () => {
  it('Should get price of every token', async () => {

    const pairs: IWatchPair[] = await getLimitOrderPairs();

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

    const prices = Promise.all(mockPriceUpdates.map(pu => networkPrices.getPrices(pu, +process.env.CHAINID)));

    expect(await prices).to.not.throw;

  }).timeout(30000);

});
