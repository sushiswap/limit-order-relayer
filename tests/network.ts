import { NetworkPrices } from '../src/utils/networkPrices';
import { IWatchPair } from '../src/models/models';
import { expect } from 'chai';
import { getLimitOrderPairs } from '../src/pairs/watchPairs';
import { PriceUpdate, PRICE_MULTIPLIER } from '../src/pairs/pairUpdates';
import { safeAwait } from '../src/utils/myAwait';

describe('Token prices', () => {
  it('Should get price of every token', async () => {

    const pairs: IWatchPair[] = await getLimitOrderPairs();

    const networkPrices = new NetworkPrices();

    const mockPriceUpdates = pairs.map(pair => {
      return {
        pair,
        token0: {
          price: PRICE_MULTIPLIER,
          decimals: 18,
          address: pair.token0.address,
          addressMainnet: pair.token0.addressMainnet
        },
        token1: {
          price: PRICE_MULTIPLIER,
          decimals: 18,
          address: pair.token1.address,
          addressMainnet: pair.token1.addressMainnet
        }
      } as PriceUpdate
    })

    await Promise.all(mockPriceUpdates.map(async (pu, i) => {
      const [data, err] = await safeAwait(networkPrices.getPrices(pu, +process.env.CHAINID))
      expect(err).to.be.undefined;
    }));

    expect(true).to.be.true;

  }).timeout(60000); // allow up to 1 min (as coingecko requests are manually rate limited)

});
