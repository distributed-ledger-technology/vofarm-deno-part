import { IVFLogger } from "../interfaces/logger.ts"

export class VFLogger implements IVFLogger {

    private apiKey: string = ""

    public constructor(apiKey: string) {
        this.apiKey = apiKey
    }

    public async log(message: string): Promise<void> {
        console.log(message)
    }
}