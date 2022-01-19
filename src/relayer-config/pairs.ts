import dotenv from 'dotenv'
import { ChainId } from '@sushiswap/core-sdk'

dotenv.config()

export const fetchLimitOrderPairs = function (chainId: ChainId): string[][] {
  const limitOrderPairs = _limitOrderPairs[chainId]

  limitOrderPairs.forEach((pair0, i) => {
    limitOrderPairs.forEach((pair1, j) => {
      if (
        i !== j &&
        ((pair0[0] === pair1[0] && pair0[1] === pair1[1]) || (pair0[0] === pair1[1] && pair0[1] === pair1[0]))
      ) {
        throw new Error(`Doubled pairs ${i}, ${j}`)
      }
    })
  })

  return limitOrderPairs
}

export const _limitOrderPairs = {
  [ChainId.ETHEREUM]: [['WETH', 'SUSHI']],
  [ChainId.MATIC]: [
    ['WETH', 'WMATIC'],
    ['WETH', 'USDC'],
    ['WETH', 'DAI'],
    ['WBTC', 'WETH'],
    ['USDC', 'USDT'],
    ['USDC', 'IRON'],
    ['WETH', 'USDT'],
    ['USDC', 'DAI'],
    ['WETH', 'AAVE'],
    ['LINK', 'WETH'],
    ['FRAX', 'USDC'],
    ['WMATIC', 'USDC'],
    ['CRV', 'WETH'],
    ['SNX', 'USDC'],
    ['FRAX', 'FXS'],
    ['SUSHI', 'WETH'],
    ['SNX', 'WETH'],
    ['WETH', 'wFIL'],
    ['USDC', 'BIFI'],
    ['WMATIC', 'WOOFY'],
    ['SUSHI', 'WMATIC'],
    ['renDOGE', 'WETH'],
    ['WMATIC', 'BONE'],
    ['USDC', 'BONE'],
    ['USDC', 'SUSHI'],
    ['LINK', 'WMATIC'],
    ['WMATIC', 'DAI'],
    ['USDT', 'DAI'],
    ['WMATIC', 'DPI'],
    ['WMATIC', 'PIXEL'],
    ['WMATIC', 'GMS'],
    ['WMATIC', 'USDT'],
    ['WMATIC', 'AAVE'],
    ['WMATIC', 'POLAR'],
    ['USDC', 'POLAR'],
    ['USDC', 'JPYC'],
    ['USDC', 'CHUM'],
    ['WETH', 'JPYC'],
    ['WMATIC', 'JPYC'],
    ['WMATIC', 'WBTC'],
    ['USDC', 'WBTC'],
    ['renBTC', 'WBTC'],
    ['USDC', 'DINO'],
    ['WMATIC', 'DINO'],
    ['WMATIC', 'GAJ'],
    ['WMATIC', 'DMAGIC'],
    ['USDC', 'GAJ'],
    ['SUSHI', 'LINK'],
    ['SUSHI', 'USDT'],
    ['SUSHI', 'xSUSHI'],
    ['SUSHI', 'DAI'],
    ['SUSHI', 'WBTC'],
    ['WMATIC', 'CRV'],
    ['JPYC', 'USDT'],
  ],
  [ChainId.AVALANCHE]: [
    ['wMEMO', 'MIM'],
    ['MIM', 'WAVAX'],
  ],
} as { [chainId in ChainId]: string[][] }

export const getDesiredProfitToken = function (chainId: ChainId): string[] {
  if (chainId === ChainId.MATIC) {
    return ['WMATIC', 'WETH', 'SUSHI', 'WBTC', 'USDC', 'DAI', 'USDT']
  } else if (chainId == ChainId.AVALANCHE) {
    return ['WAVAX']
  }
}
