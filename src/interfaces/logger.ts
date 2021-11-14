
export interface IVFLogger {
    log(message: string): Promise<void> | void
}