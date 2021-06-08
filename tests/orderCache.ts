import { expect } from 'chai';
import { OrderCache } from '../src/orders/execute';

describe('Order Cahce', () => {
  it('Should prevent the second order form executing', async () => {

    const digest = "asdfasdf";
    expect(OrderCache.Instance.alreadyExecuted(digest)).to.be.false;
    expect(OrderCache.Instance.alreadyExecuted(digest)).to.be.true;
  });
});
