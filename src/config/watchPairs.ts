import { _limitOrderPairs } from './pairs';
import axios, { AxiosResponse } from 'axios';
import { IWatchPair } from '../models/models';

const tokenListUrl = "https://tokens.coingecko.com/uniswap/all.json";

interface IToken { chainId: number, address: string, name: string, symbol: string, decimals: number, logoUrl: string };
interface ITokenList { name: string, logoURL: string, keywords: any, timestamp: any, tokens: IToken[], version: any };

export const getLimitOrderPairs = async (): Promise<IWatchPair[]> => {

  return axios.get(tokenListUrl).then(({ data }: AxiosResponse<ITokenList>) => {

    const watchPairs: IWatchPair[] = [];

    _limitOrderPairs.forEach(([token0Symbol, token1Symbol]) => {

      const token0 = data.tokens.find(token => token.symbol === token0Symbol);
      const token1 = data.tokens.find(token => token.symbol === token1Symbol);

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
        console.log(`Error! Couldn't find token ${token0 ? token1Symbol : token0Symbol}`);
      }

    });

    return watchPairs;

  });

};