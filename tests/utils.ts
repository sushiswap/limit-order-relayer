import { BigNumber } from '@ethersproject/bignumber';
import { ChainId } from '@sushiswap/sdk';
import { expect } from 'chai';
import { fetchLimitOrderPairs } from '../src/relayer-config/pairs';
import { NetworkPrices } from '../src/utils/networkPrices';
import { getOrderPrice } from '../src/utils/price';

describe('Utils', () => {
  it('Should get price', async () => {
    const _in = BigNumber.from("1000");
    const _out = BigNumber.from("300000");
    const price = getOrderPrice(_in, _out);
    expect(price.toString()).to.be.eq("300902708124373119358");
    expect(BigNumber.from("300902708124373119358").mul("997").div("1000").add(1).toString()).to.be.eq("300000000000000000000")
  });

  it('Should get gas price', async () => {
    const supportedChains = [ChainId.MAINNET, ChainId.MATIC];
    const prices = await Promise.all(supportedChains.map(chain => {
      return (new NetworkPrices).getWeiGasPrice(chain);
    }));
    const errIndex = prices.indexOf(undefined);
    expect(errIndex).to.be.equal(-1, `Couldn't fetch gas price for ${supportedChains[errIndex]}`)
  }).timeout(4000);

  it('Should fetch pairs', async () => {
    const pairs = await fetchLimitOrderPairs(+process.env.CHAINID);
    expect(pairs.length).to.be.greaterThan(0, "no pairs were fetched");
    expect(typeof pairs[0][0]).to.be.eq("string", "no pairs were fetched");
  })
});
