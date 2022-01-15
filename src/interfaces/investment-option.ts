export interface AssetInfo {
    pair: string
    minTradingAmount: number
    decimalPlaces: number
    targetLSD: number
    minLSD: number
    maxLSD: number
    longPercentageHistory: number[]
    shortPercentageHistory: number[]
}