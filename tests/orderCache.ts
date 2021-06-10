import { expect } from 'chai';
import { ExecuteHelper } from '../src/orders/execute';

describe('Order Cahce', () => {
  it('Should prevent the second order form executing', async () => {

    const digest = "asdfasdf";
    expect(ExecuteHelper.Instance.alreadyExecuted(digest)).to.be.false;
    expect(ExecuteHelper.Instance.alreadyExecuted(digest)).to.be.true;
    expect(ExecuteHelper.Instance.profitTokens.pop()).to.equal(process.env.WETH_ADDRESS);
  });
});