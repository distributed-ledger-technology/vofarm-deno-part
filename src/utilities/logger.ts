import { IVFLogger } from "../interfaces/logger.ts"

export class VFLogger implements IVFLogger {

    public constructor(private apiKey: string, private logLevel: number) {
    }

    public log(message: string, level: number = 0): void {
        if (level >= this.logLevel) {
            console.log(message)
        }
    }
}