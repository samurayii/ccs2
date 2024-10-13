import { EventEmitter } from "events";
import { IKeyStore, IKeyStoreConfig, IKeyStoreEventName, IKeyStoreSource, IKeyStoreSourceEnvConfig, IKeyStoreSourceFSConfig, IKeyStoreSourceGitConfig, IKeyStoreSourceGitCryptConfig, IKeyStoreSourceVaultConfig } from "./interfaces";
import { ILoggerEventEmitter } from "logger-event-emitter";
import chalk from "chalk";
import { KeyStoreSourceEnv } from "./lib/key-store-env";
import { KeyStoreSourceFS } from "./lib/key-store-fs";
import { KeyStoreSourceGit } from "./lib/key-store-git";
import { KeyStoreSourceGitCrypt } from "./lib/key-store-git-crypt";
import { KeyStoreSourceVault } from "./lib/key-store-vault";


export * from "./interfaces";

export class KeyStore extends EventEmitter implements IKeyStore {

    private readonly _source: IKeyStoreSource;

    constructor (
        private readonly _config: IKeyStoreConfig,
        private readonly _logger: ILoggerEventEmitter
    ) {
        super();

        if (this._config.source.type === "env") {
            this._source = new KeyStoreSourceEnv(this._config.name, <IKeyStoreSourceEnvConfig>this._config.source, this._logger);
        }

        if (this._config.source.type === "fs") {
            this._source = new KeyStoreSourceFS(this._config.name, <IKeyStoreSourceFSConfig>this._config.source, this._logger);
        }

        if (this._config.source.type === "git") {
            this._source = new KeyStoreSourceGit(this._config.name, <IKeyStoreSourceGitConfig>this._config.source, this._logger);
        }

        if (this._config.source.type === "git-crypt") {
            this._source = new KeyStoreSourceGitCrypt(this._config.name, <IKeyStoreSourceGitCryptConfig>this._config.source, this._logger);
        }

        if (this._config.source.type === "vault") {
            this._source = new KeyStoreSourceVault(this._config.name, <IKeyStoreSourceVaultConfig>this._config.source, this._logger);
        }

        if (this._source === undefined) {
            this._logger.fatal(`KeyStore source type ${chalk.red(this._config.source.type)} not support`);
            process.exit(1);
        }

    }

    get name (): string {
        return this._config.name;
    }
    get list (): string[] {
        return this._source.list;
    }

    override on (event_name: IKeyStoreEventName, listener: (...args: unknown[]) => void): this {
        super.on(event_name, listener);
        return this;
    }
    override emit (event_name: IKeyStoreEventName, ...args: unknown[]): boolean {
        return super.emit(event_name, ...args);
    }

    async run (): Promise<void> {
        if (this._config.enable === false) {
            return;
        }

        await this._source.run();

        this._source.on("change", (name: string) => {
            this.emit("change", name);
        });
        this._source.on("delete", (name: string) => {
            this.emit("delete", name);
        });
        this._source.on("new", (name: string) => {
            this.emit("new", name);
        });

    }

    async close (): Promise<void> {
        if (this._config.enable === false) {
            return;
        }
        this._source.removeAllListeners();
        this._source.close();
    }

    async existKey (id: string): Promise<boolean> {
        return this._source.existKey(id);
    }

    async getKey (id: string): Promise<unknown> {
        return this._source.getKey(id);
    }
    
}