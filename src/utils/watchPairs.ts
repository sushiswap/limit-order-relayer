import { _limitOrderPairs } from '../relayer-config/pairs';
import { IWatchPair } from '../models/models';
import DEFAULT_TOKEN_LIST from '@sushiswap/default-token-list';
import { ChainId } from '@sushiswap/sdk';
import { getPairAddress } from './pairAddress';
import { getPairBalances } from '../price-updates/pair-updates';
import { MyProvider } from './myProvider';

interface IToken { chainId: number, address: string, name: string, symbol: string, decimals: number, logoUrl?: string };
export interface ITokenList { name: string, logoURL?: string, keywords: any, timestamp: any, tokens: IToken[], version: any };

export const getLimitOrderPairs = async (): Promise<IWatchPair[]> => {

  const tokens = (DEFAULT_TOKEN_LIST as ITokenList).tokens.filter(token => token.chainId === +process.env.CHAINID);
  const tokensMainnet = (DEFAULT_TOKEN_LIST as ITokenList).tokens.filter(token => token.chainId === ChainId.MAINNET);

  const watchPairs: IWatchPair[] = [];

  await Promise.all(_limitOrderPairs.map(async ([token0Symbol, token1Symbol]) => {

    const token0 = tokens.find(token => token.symbol === token0Symbol);
    const token1 = tokens.find(token => token.symbol === token1Symbol);


    const token0mainnet = tokensMainnet.find(token => token.symbol === token0Symbol) ?? { address: "" };
    const token1mainnet = tokensMainnet.find(token => token.symbol === token1Symbol) ?? { address: "" };

    if (token0 && token1) {

      const watchPair = {
        token0: {
          address: token0.address,
          addressMainnet: token0mainnet.address,
          symbol: token0.symbol,
          decimals: token0.decimals
        },
        token1: {
          address: token1.address,
          addressMainnet: token1mainnet.address,
          symbol: token1.symbol,
          decimals: token1.decimals
        },
        pairAddress: getPairAddress(token0.address, token1.address)
      }

      const { token0Balance, token1Balance } = await getPairBalances(watchPair, MyProvider.Instance.provider);

      if (token0Balance.gt(0) && token1Balance.gt(0)) {

        watchPairs.push(watchPair);

      }

    } else {

      throw new Error(`Error! Couldn't find token ${token0 ? token1Symbol : token0Symbol}`);

    }

  }));

  console.log(`Running on ${watchPairs.map(wp => ` ${wp.token0.symbol}-${wp.token1.symbol}`)}`)

  return watchPairs;

};

