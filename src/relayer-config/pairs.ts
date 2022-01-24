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
  [ChainId.ETHEREUM]: [
    ['WETH', 'SUSHI'],
    ['ILV', 'WETH'],
    ['USDC', 'WETH'],
    ['WETH', 'USDT'],
    ['TOKE', 'WETH'],
    ['WBTC', 'WETH'],
    ['BIT', 'WETH'],
    ['WETH', 'ALCX'],
    ['DAI', 'WETH'],
    ['SUSHI', 'WETH'],
    ['SPELL', 'WETH'],
    ['DAI', 'wstETH'],
    ['KP3R', 'WETH'],
    ['AAVE', 'WETH'],
    ['SYN', 'WETH'],
    ['stkATOM', 'WETH'],
    ['WETH', 'RGT'],
    ['YFI', 'WETH'],
    ['SUSHI', 'FRAX'],
    ['FODL', 'USDC'],
    ['WBTC', 'BADGER'],
    ['FTM', 'WETH'],
    ['MKR', 'WETH'],
    ['FODL', 'WETH'],
    ['BENT', 'DAI'],
    ['DELTA', 'WETH'],
    ['xSUSHI', 'WETH'],
    ['NEWO', 'USDC'],
    ['WXRP', 'WETH'],
    ['WETH', 'ANY'],
    ['YGG', 'WETH'],
    ['LDO', 'WETH'],
    ['CVX', 'WETH'],
    ['SRM', 'WETH'],
    ['LINK', 'WETH'],
    ['LON', 'USDT'],
    ['BSGG', 'WETH'],
    ['COMP', 'WETH'],
    ['NTFX', 'WETH'],
    ['PERP', 'WETH'],
    ['WETH', 'ICE'],
    ['PUNK', 'WETH'],
  ],
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
    ['MIM', 'BSGG'],
    ['USDC', 'WAVAX'],
    ['SPELL', 'WAVAX'],
    ['sSPELL', 'SPELL'],
    ['WETH', 'WAVAX'],
    ['wMEMO', 'WAVAX'],
    ['SUSHI', 'WAVAX'],
    ['WBTC', 'WAVAX'],
    ['USDT', 'WAVAX'],
  ],
} as { [chainId in ChainId]: string[][] }

export const getDesiredProfitToken = function (chainId: ChainId): string[] {
  if (chainId === ChainId.MATIC) {
    return ['WMATIC', 'WETH', 'SUSHI', 'WBTC', 'USDC', 'DAI', 'USDT']
  } else if (chainId == ChainId.AVALANCHE) {
    return ['WAVAX', 'TIME', 'MIM']
  } else if (chainId == ChainId.ETHEREUM) {
    return ['WETH', 'MIM', 'DAI', 'USDC', 'WBTC', 'USDT']
  }
}
