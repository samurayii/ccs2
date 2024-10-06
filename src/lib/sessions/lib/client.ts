import { EventEmitter } from "events";
import { ISessionsClient, ISessionsClientConfig, ISessionsClientEventName, ISessionsClientProperties, ISessionsClientSettings } from "../interfaces";

export class SessionsClient extends EventEmitter implements ISessionsClient {

    private _id_interval: ReturnType<typeof setTimeout>;

    constructor (
        private readonly _id: string,
        private readonly _ttl: number,
        private readonly _config: ISessionsClientConfig
    ) {
        super();
    }
    
    override on (event_name: ISessionsClientEventName, listener: (...args: unknown[]) => void): this {
        super.on(event_name, listener);
        return this;
    }
    override emit (event_name: ISessionsClientEventName, ...args: unknown[]): boolean {
        return super.emit(event_name, ...args);
    }

    get id (): string {
        return this._id;
    }
    get name (): string {
        return this._config.name;
    }
    get group (): string {
        return this._config.group;
    }
    get settings (): ISessionsClientSettings {
        return this._config.settings;
    }
    get properties (): ISessionsClientProperties {
        return this._config.properties;
    }

    updateTTL (): void {
        clearTimeout(this._id_interval);
        this._id_interval = setTimeout( () => {
            this.emit("outdated");
        }, this._ttl*1000);
    }
    
    init (): void {
        this.updateTTL();
    }

    destroy (): void {
        clearTimeout(this._id_interval);
    }
}