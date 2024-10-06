export interface IHealthController {
    readonly healthy: boolean
    createTrigger: (trigger_type: string, healthy: boolean) => void
    unHealthTrigger: (trigger_type: string) => void
    healthTrigger: (trigger_type: string) => void
}