import { EventEmitter } from "events";
import { INamespaceRepository } from "./interfaces";
import { INamespace, INamespaceConfig, INamespaceEventName, Namespace } from "../namespace";
import { ILoggerEventEmitter } from "logger-event-emitter";
import wildcard from "wildcard";
import chalk from "chalk";

export * from "./interfaces";

export class NamespaceRepository extends EventEmitter implements INamespaceRepository {

    private readonly _repository: {
        [key: string]: INamespace
    };
    private readonly _cache: {
        [key: string]: {
            [key: string]: string[]
        }
    };

    constructor (
        configs: INamespaceConfig[],
        private readonly _logger: ILoggerEventEmitter
    ) {
        super();
        this._repository = {};
        this._cache = {};
        for (const namespace_config of configs) {
            const namespace = new Namespace(namespace_config, this._logger.child(`${this._logger.name}:${namespace_config.name}`));
            namespace.on("change", (name: string) => {
                this._cache[namespace.name] = {};
                this.emit("change", name, namespace.name);
            });
            namespace.on("delete", (name: string) => {
                this._cache[namespace.name] = {};
                this.emit("delete", name, namespace.name);
            });
            namespace.on("new", (name: string) => {
                this._cache[namespace.name] = {};
                this.emit("new", name, namespace.name);
            });
            this._repository[namespace.name] = namespace;
            this._cache[namespace.name] = {};
        }
    }
        
    override on (event_name: INamespaceEventName, listener: (...args: unknown[]) => void): this {
        super.on(event_name, listener);
        return this;
    }
    override emit (event_name: INamespaceEventName, ...args: unknown[]): boolean {
        return super.emit(event_name, ...args);
    }

    get listFiles (): string[] {
        let result: string[] = [];
        for (const namespace of Object.values(this._repository)) {
            result = result.concat(namespace.list);
        }
        return result;
    }

    get list (): string[] {
        return Object.keys(this._repository);
    }

    exist (namespace_name: string): boolean {
        if (this._repository[namespace_name] === undefined) {
            return false;
        }
        return true;
    }
    
    get (namespace_name: string): INamespace {
        return this._repository[namespace_name];
    }

    async run (): Promise<void> {
        for (const namespace of Object.values(this._repository)) {
            await namespace.run();
        }
    }

    async close (): Promise<void> {
        for (const namespace of Object.values(this._repository)) {
            namespace.removeAllListeners();
            await namespace.close();
        }
    }

    async search (pattern: string): Promise<string[]> {
        
        let result: string[] = [];

        for (const namespace of Object.values(this._repository)) {
            if (this._cache[namespace.name][pattern] !== undefined) {
                result = result.concat(this._cache[namespace.name][pattern]);
                continue;
            }

            const files_list = namespace.list;
            const namespace_result: string[] = [];
            for (const file_name of files_list) {
                if (Array.isArray(wildcard(`${pattern}*`, file_name)) === true) {
                    namespace_result.push(file_name);
                }
            }
            result = result.concat(namespace_result);
            this._cache[namespace.name][pattern] = namespace_result;
            this._logger.debug(`Search record ${chalk.cyan(`${namespace.name}:${pattern}`)} created`);
        }
        
        return result;

    }
    
}