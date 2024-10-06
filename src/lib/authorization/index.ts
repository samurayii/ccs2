
import { IAuthorization, IAuthorizationConfig } from "./interfaces";

export * from "./interfaces";

export class Authorization implements IAuthorization {

    constructor (
        private readonly _config: IAuthorizationConfig
    ) {}

    async check (token: string): Promise<boolean> {
        return this._config.tokens.includes(token);
    }

}