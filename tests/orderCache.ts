import { expect } from 'chai';
import { ExecuteHelper } from '../src/orders/execute';
import { getWeth } from '../src/utils/misc';

describe('Order Cahce', () => {
  it('Should prevent the second order form executing', async () => {

    const digest = "digeststring";
    expect(ExecuteHelper.Instance.alreadyExecuted(digest)).to.be.false;
    expect(ExecuteHelper.Instance.alreadyExecuted(digest)).to.be.true;
    expect(ExecuteHelper.Instance.profitTokens.pop()).to.equal(getWeth(+process.env.CHAINID));

  });
});
