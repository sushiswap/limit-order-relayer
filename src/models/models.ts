import { ChainId } from '@sushiswap/core-sdk'
import { ILimitOrderData } from '@sushiswap/limit-order-sdk'
import { Document } from 'mongoose'

export interface IWatchPair {
  token0: {
    address: string
    addressMainnet?: string
    decimals: number
    symbol: string
  }
  token1: {
    address: string
    addressMainnet?: string
    decimals: number
    symbol: string
  }
  pairAddress?: string
}

export interface IWatchPairModel extends IWatchPair, Document {}

export interface ILimitOrder {
  price: string
  digest: string
  order: {
    maker: string
    tokenIn: string
    tokenOut: string
    tokenInDecimals: number
    tokenOutDecimals: number
    tokenInSymbol: string
    tokenOutSymbol: string
    amountIn: string
    amountOut: string
    recipient: string
    startTime: number | string
    endTime: number | string
    stopPrice?: string
    oracleAddress?: string
    oracleData?: string
    v: number
    r: string
    s: string
    chainId: ChainId
    orderTypeHash?: string
  }
  pairAddress?: string
  filledAmount?: string
  userBalance?: string
}

export interface ILimitOrderModel extends ILimitOrder, Document {}

export interface IExecutedOrder {
  order: ILimitOrderData
  digest: string
  txHash: string
  fillAmount: string
  status: number
}

export interface IExecutedOrderModel extends IExecutedOrder, Document {}

export interface IOrderCounter {
  timestamp: number
  counter: number
}

export interface IOrderCounterModel extends IOrderCounter, Document {}
