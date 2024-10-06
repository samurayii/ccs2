/* eslint-disable @typescript-eslint/ban-types */
export interface IDependencyInjectionRegistry {
    existService: (service_name: string) => boolean
    addSingleton: (service_name: string, class_fn: FunctionConstructor, factory_fn?: Function) => void
    addFactory: (service_name: string, class_fn: FunctionConstructor, factory_fn: Function) => void
    addDataContainer: (service_name: string, container: Object) => void
    getService: (service_name: string, args: unknown[]) => Function | Object 
    removeService: (service_name: string) => void
    clear: () => void
}