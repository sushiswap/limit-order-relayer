import Mongoose from "mongoose";
import { ILimitOrder, ILimitOrderModel, IWatchPairModel } from "./models";
import { isLessThan } from "../utils/orderTokens";
import { getPairAddress } from "../utils/pairAddress";

require('mongoose-long')(Mongoose);

const Long = (Mongoose.Types as any).Long;

const Schema = Mongoose.Schema;

export const watchPairModel = new Schema({
  token0: {
    address: String,
    decimals: Number,
    symbol: String
  },
  token1: {
    address: String,
    decimals: Number,
    symbol: String
  },
  pairAddress: String
})

export const limitOrderModel = new Schema({
  price: Long,
  digest: { type: String, unique: true },
  order: {
    maker: String,
    tokenIn: String,
    tokenOut: String,
    tokenInDecimals: Number,
    tokenOutDecimals: Number,
    amountIn: String,
    amountOut: String,
    recipient: String,
    startTime: String,
    endTime: String,
    stopPrice: String,
    oracleAddress: String,
    oracleData: String,
    v: Number,
    r: String,
    s: String,
    chainId: Number
  },
  side: Number,
  pairAddress: String,
  filledAmount: String
});

watchPairModel.set("collection", "watchpairs");
limitOrderModel.set("collection", "limitorders");


// middleware - execute before saving a "watch pair"
watchPairModel.pre<IWatchPairModel>("save", function (next) {

  // sort tokens so token0 < token1 always holds true
  if (!isLessThan(this.token0.address, this.token1.address)) {
    const tmp = { ...this.token0 };
    this.token0 = { ...this.token1 };
    this.token1 = tmp;
  }

  this.pairAddress = getPairAddress(this.token0.address, this.token1.address);

  next();

});

limitOrderModel.pre<ILimitOrderModel>("save", function (next) {

  this.pairAddress = getPairAddress(this.order.tokenIn, this.order.tokenOut);

  next();

});
