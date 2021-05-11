import Mongoose from "mongoose";
import { IWatchPairModel } from "./models";
import { ethers } from "ethers";

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

watchPairModel.set("collection", "watchpairs");

// middleware - execute before saving a "watch pair"
watchPairModel.pre<IWatchPairModel>("save", function (next) {

  // sort tokens so token0 < token1 always holds true
  if (ethers.BigNumber.from(this.token0.address).gt(ethers.BigNumber.from(this.token1.address))) {
    const tmp = { ...this.token0 };
    this.token0 = { ...this.token1 };
    this.token1 = tmp;
  }

  const pairCodeHash = "0xe18a34eb0e04b04f7a0ac29a6e80748dca96319b42c54d679cb821dca90c6303";
  const factory = "0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac";

  this.pairAddress = ethers.utils.getCreate2Address(
    factory,
    ethers.utils.keccak256(ethers.utils.solidityPack(['address', 'address'], [this.token0.address, this.token1.address])),
    pairCodeHash
  );

  next();
});
