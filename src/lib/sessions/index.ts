import { ILoggerEventEmitter } from "logger-event-emitter";
import { ISessions, ISessionsClient, ISessionsClientConfig, ISessionsConfig, ISessionsEventName } from "./interfaces";
import { EventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";
import { SessionsClient } from "./lib/client";
import chalk from "chalk";

export * from "./interfaces";

export class Sessions extends EventEmitter implements ISessions {

    private readonly _sessions: {
        [key: string]: ISessionsClient
    };

    constructor (
        private readonly _config: ISessionsConfig,
        private readonly _logger: ILoggerEventEmitter
    ) {
        super();
        this._sessions = {};
    }

    override on (event_name: ISessionsEventName, listener: (...args: unknown[]) => void): this {
        super.on(event_name, listener);
        return this;
    }
    override emit (event_name: ISessionsEventName, ...args: unknown[]): boolean {
        return super.emit(event_name, ...args);
    }

    add (client_config: ISessionsClientConfig): ISessionsClient {
        const id = uuidv4();
        const client = new SessionsClient(id, this._config.ttl, client_config);
        client.once("outdated", () => {
            this._logger.debug(`Client session NAME ${chalk.cyan(`${client.group}/${client.name}`)} outdated`);
            this.remove(client.id);
        });
        this._sessions[client.id] = client;
        this._logger.debug(`Client session NAME ${chalk.cyan(`${client.group}/${client.name}`)} created`);
        this.emit("add", client.id);
        return client;
    }

    get (id: string): ISessionsClient {
        return this._sessions[id];
    }

    exist (id: string): boolean {
        if (this._sessions[id] === undefined) {
            return false;
        }
        return true;
    }

    remove (id: string): void {
        if (this._sessions[id] === undefined) {
            return;
        }
        this._logger.debug(`Client session NAME ${chalk.cyan(`${this._sessions[id].group}/${this._sessions[id].name}`)} removed`);
        this._sessions[id].removeAllListeners();
        this._sessions[id].destroy();
        delete this._sessions[id];
        this.emit("remote", id);
    }
    
}