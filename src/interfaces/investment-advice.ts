
import { Action } from "./action.ts"

export interface InvestmentAdvice {
    action: Action,
    amount: number
    pair: string,
    reason: string
}
