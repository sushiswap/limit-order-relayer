import { BigNumber, Contract, providers } from 'ethers';
import bentoBoxABI from '../abis/bentoBox';

export async function bentoBalance(user: string, token: string, provider: providers.Provider): Promise<BigNumber> {

  const bentoBox = new Contract(process.env.BENTO_BOX_ADDRESS, bentoBoxABI, provider); // todo, don't fetch address from env
  return await bentoBox.balanceOf(token, user);

}