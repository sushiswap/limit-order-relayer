import { _limitOrderPairs } from '../relayer-config/pairs';
import { IWatchPair } from '../models/models';
import DEFAULT_TOKEN_LIST from '@sushiswap/default-token-list';

interface IToken { chainId: number, address: string, name: string, symbol: string, decimals: number, logoUrl?: string };
export interface ITokenList { name: string, logoURL?: string, keywords: any, timestamp: any, tokens: IToken[], version: any };

export const getLimitOrderPairs = async (): Promise<IWatchPair[]> => {

  const tokens = (DEFAULT_TOKEN_LIST as ITokenList).tokens.filter(token => token.chainId === +process.env.CHAINID);

  const watchPairs: IWatchPair[] = [];

  _limitOrderPairs.forEach(([token0Symbol, token1Symbol]) => {

    const token0 = tokens.find(token => token.symbol === token0Symbol);
    const token1 = tokens.find(token => token.symbol === token1Symbol);

    if (token0 && token1) {

      watchPairs.push({
        token0: {
          address: token0.address,
          symbol: token0.symbol,
          decimals: token0.decimals
        },
        token1: {
          address: token1.address,
          symbol: token1.symbol,
          decimals: token1.decimals
        }
      });

    } else {
      throw new Error(`Error! Couldn't find token ${token0 ? token1Symbol : token0Symbol}`);
    }

  });

  return watchPairs;

};

