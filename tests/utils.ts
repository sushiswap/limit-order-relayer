import { BigNumber } from '@ethersproject/bignumber';
import { expect } from 'chai';
import { PRICE_MULTIPLIER } from '../src/price-updates/pair-updates';
import { getOrderPrice } from '../src/utils/price';

describe('Utils', () => {
  it('Should get price', async () => {
    const _in = BigNumber.from("1000");
    const _out = BigNumber.from("300000");
    const price = getOrderPrice(_in, _out);
    expect(price.toString()).to.be.eq("300902708124373119358");
    expect(BigNumber.from("300902708124373119358").mul("997").div("1000").add(1).toString()).to.be.eq("300000000000000000000")
  });
});
