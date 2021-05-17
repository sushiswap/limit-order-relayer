import { ILimitOrderData } from "limitorderv2-sdk";
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

export enum Side { Buy, Sell };
export interface ILimitOrder {
  price: string,
  digest: string,
  order: ILimitOrderData,
  side: Side,
  pairAddress?: string,
  filledAmount: string,
}

export interface ILimitOrderModel extends ILimitOrder, Document { };