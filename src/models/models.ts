import { Document } from "mongoose";

export interface IWatchPair {
  token0: {
    address: string,
    decimals: number,
    symbol: string
  },
  token1: {
    address: string,
    decimals: number,
    symbol: string
  },
  pairAddress?: string;
}

export interface IWatchPairModel extends IWatchPair, Document { };