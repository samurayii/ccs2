/* eslint-disable @typescript-eslint/ban-types */
import { IDependencyInjectionRegistry } from "./interfaces";

class DependencyInjectionRegistry implements IDependencyInjectionRegistry {

    private _registry: {
        [key: string]: {
            type: "singleton" | "container" | "factory"
            class?: FunctionConstructor,
            container?: Object,
            instance?: Function, 
            factory?: Function
        }
    };

    constructor () {
        this._registry = {};
    }
    
    getService (service_name: string, args: unknown[]): Function | Object {
        
        const service = this._registry[service_name];

        if (service.type === "container") {
            return JSON.parse(JSON.stringify(service.container));
        }

        if (service.type === "singleton") {
            if (service.instance !== undefined) {
                return service.instance;
            }
            if (service.factory !== undefined) {
                service.instance = service.factory(...args);
            } else {
                service.instance = new service.class();
            }
            return service.instance;
        }

        return service.factory(...args);

    }

    existService (service_name: string): boolean {
        if (this._registry[service_name] === undefined) {
            return false;
        }
        return true;
    }

    addSingleton (service_name: string, class_fn: FunctionConstructor, factory_fn?: Function): void {
        this._registry[service_name] = {
            type: "singleton",
            class: class_fn,
            factory: factory_fn,
            instance: undefined
        };
    }

    addFactory (service_name: string, class_fn: FunctionConstructor, factory_fn: Function): void {
        this._registry[service_name] = {
            type: "factory",
            class: class_fn,
            factory: factory_fn
        };
    }

    addDataContainer (service_name: string, container: Object): void {
        this._registry[service_name] = {
            type: "container",
            container: container
        };
    }

    removeService (service_name: string): void {
        if (this._registry[service_name] !== undefined) {
            delete this._registry[service_name];
        }
    }

    clear (): void {
        this._registry = {};
    }

}

const registry = new DependencyInjectionRegistry();

// eslint-disable-next-line @typescript-eslint/ban-types
export function $Inject<T> (service_name: Function | string, ...args: unknown[]): T {

    if (typeof service_name !== "function" && typeof service_name !== "string") {
        throw Error("Argument not \"string\" or \"class\"");
    }

    if (typeof service_name === "function") {
        service_name = service_name.name;
    }
    if (registry.existService(service_name) === false) {
        throw Error(`Service named "${service_name}" not found`);
    }
    return <T>registry.getService(service_name, args);
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function $Singleton (service_name: Function | string, class_fn?: Function, factory_fn?: Function): void {

    if (typeof service_name !== "function" && typeof service_name !== "string") {
        throw Error("First argument must be \"string\" or \"class\" type");
    }

    if (typeof class_fn !== "function" && class_fn !== undefined) {
        throw Error("Second argument must be \"class\" type");
    }

    if (typeof factory_fn !== "function" && factory_fn !== undefined) {
        throw Error("Third argument must be \"function\" type");
    }

    if (typeof service_name === "function") {
        class_fn = service_name;
        service_name = service_name.name;
    }
    if (registry.existService(service_name) === true) {
        throw Error(`Service named "${service_name}" already exist`);
    }
    registry.addSingleton(service_name, <FunctionConstructor>class_fn, factory_fn);
}

export function $Factory (service_name: Function | string, factory_fn: Function, class_fn?: Function): void {

    if (typeof service_name !== "function" && typeof service_name !== "string") {
        throw Error("First argument must be \"string\" or \"class\" type");
    }

    if (typeof class_fn !== "function" && class_fn !== undefined) {
        throw Error("Third argument must be \"class\" type");
    }

    if (typeof factory_fn !== "function" && factory_fn !== undefined) {
        throw Error("Second argument must be \"function\" type");
    }

    if (typeof service_name === "function") {
        class_fn = service_name;
        service_name = service_name.name;
    }
    if (registry.existService(service_name) === true) {
        throw Error(`Service named "${service_name}" already exist`);
    }
    registry.addFactory(service_name, <FunctionConstructor>class_fn, factory_fn);
}

export function $DataContainer (service_name: string, container: Object): void {

    if (typeof service_name !== "string") {
        throw Error("First argument must be \"string\" type");
    }

    if (typeof container !== "object") {
        throw Error("Second argument must be \"object\" type");
    }

    if (registry.existService(service_name) === true) {
        throw Error(`Service named "${service_name}" already exist`);
    }
    registry.addDataContainer(service_name, container);
}

export function $Clear (): void {
    registry.clear();
}