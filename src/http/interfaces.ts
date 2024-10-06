import { FastifyInstance, FastifyRequest } from "fastify";
import { ILoggerEventEmitter } from "logger-event-emitter";

export interface IApiServerFastifyInstance extends FastifyInstance {
    logger: ILoggerEventEmitter
}

export interface IAuthorizationFastifyRequest extends FastifyRequest {
    body: {
        auth: {
            private_token: string;
        };
        client: {
            name: string;
            group: string;
        };
        settings: {
            [k: string]: unknown;
        };
        properties: {
            [k: string]: unknown;
        };
    }
}
export interface ILogoffFastifyRequest extends FastifyRequest {
    body: {
        session_token: string
    }
}
export interface INamespacesFastifyRequest extends FastifyRequest {
    body: {
        session_token: string
    }
}
export interface INamespaceBodyFastifyRequest extends FastifyRequest {
    body: {
        session_token: string
        path: string
    }
}
export interface INamespaceSearchFastifyRequest extends FastifyRequest {
    body: {
        session_token: string
        pattern: string
    }
}
export interface INamespaceKeyFastifyRequest extends FastifyRequest {
    body: {
        session_token: string
        path: string
        key: string
    }
}
export interface IStoreKeyFastifyRequest extends FastifyRequest {
    body: {
        session_token: string
        store: string
        key: string
    }
}




export interface ServerResponse {
    status: "success" | "error" | "fail"
    data?: unknown
    message?: string
}