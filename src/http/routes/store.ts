import { FastifyInstance, FastifyReply } from "fastify";
import { $Inject } from "../../lib/dependency-injection";
import { ISessions, Sessions } from "../../lib/sessions";
import Ajv from "ajv";
import * as request_schema from "../schemes/store-key-request.json";
import { AjvErrorHelperNoColor } from "../../lib/tools/ajv_error_helper_no_color";
import { IStoreKeyFastifyRequest, ServerResponse } from "../interfaces";
import { IKeyStoreRepository, KeyStoreRepository } from "../../lib/key-store-repository";

export async function routeStore(
    fastify: FastifyInstance,
    sessions = $Inject<ISessions>(Sessions),
    key_store_repository = $Inject<IKeyStoreRepository>(KeyStoreRepository)
) {
   
    const handler = async function (request: IStoreKeyFastifyRequest, reply: FastifyReply) {

        const ajv = new Ajv({
            allErrors: true, 
            strict: false
        });

        const validate = ajv.compile(request_schema);

        if (validate(request.body) === false) {
            const error_text = AjvErrorHelperNoColor(validate);
            reply.code(200);
            reply.send(<ServerResponse>{
                status: "fail",
                message: error_text
            });
            return;
        }

        if (sessions.exist(request.body.session_token) === false) {
            reply.code(200);
            reply.send(<ServerResponse>{
                status: "fail",
                message: "Session not found"
            });
            return;
        }
        
        if (key_store_repository.exist(request.body.store) === false) {
            reply.code(200);
            reply.send(<ServerResponse>{
                status: "fail",
                message: `Key store "${request.body.store}" not found`
            });
        }

        const key_store = key_store_repository.get(request.body.store);
        const full_key_name = `${request.body.store}.${request.body.key}`;

        if ((await key_store.existKey(full_key_name)) === false) {
            reply.code(200);
            reply.send(<ServerResponse>{
                status: "fail",
                message: `Key "${request.body.key}" for store "${request.body.store}" not found`
            });
        }

        const key_value = await key_store.getKey(full_key_name);

        reply.code(200);
        reply.send(<ServerResponse>{
            status: "success",
            data: {
                store: request.body.store,
                key: request.body.key,
                value: `${key_value}`
            }
        });

    };

    fastify.route({
        url: "/store/key",
        handler: handler,
        method: "POST"
    });
}


