import { IVFLogger } from "../interfaces/logger.ts"

export class VFLogger implements IVFLogger {

    private apiKey: string = ""

    public constructor(apiKey: string) {
        this.apiKey = apiKey
    }

    public log(message: string): void {
        console.log(message)
    }
}