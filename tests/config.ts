import { BigNumber } from '@ethersproject/bignumber';
import { expect } from 'chai';
import { getOrderPrice } from '../src/utils/price';
import { getLimitOrderPairs } from "../src/utils/watchPairs";

describe('Config', () => {
  it('Should fetch addresses', async () => {
    let err;
    try {
      console.log(await getLimitOrderPairs());
    } catch (e) {
      err = e;
    }
    console.log(err);
    expect(err).to.be.undefined;
  });
});
