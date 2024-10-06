import { FastifyInstance, FastifyReply } from "fastify";
import { $Inject } from "../../lib/dependency-injection";
import { ISessions, ISessionsClientConfig, Sessions } from "../../lib/sessions";
import Ajv from "ajv";
import * as request_schema from "../schemes/authorization-request.json";
import { AjvErrorHelperNoColor } from "../../lib/tools/ajv_error_helper_no_color";
import { IAuthorizationFastifyRequest, ServerResponse } from "../interfaces";
import { Authorization, IAuthorization } from "../../lib/authorization";

export async function routeAuth(
    fastify: FastifyInstance,
    sessions = $Inject<ISessions>(Sessions),
    authorization = $Inject<IAuthorization>(Authorization)
) {
   
    const handler = async function (request: IAuthorizationFastifyRequest, reply: FastifyReply) {

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

        if ((await authorization.check(request.body.auth.private_token)) === false) {
            reply.code(200);
            reply.send(<ServerResponse>{
                status: "fail",
                message: "Credentials are not valid"
            });
            return;
        }

        const client = sessions.add(<ISessionsClientConfig>{
            name: request.body.client.name,
            group: request.body.client.group,
            settings: request.body.settings, 
            properties: request.body.properties
        });

        reply.code(200);
        reply.send(<ServerResponse>{
            status: "success",
            data: {
                session_token: client.id
            }
        });

    };

    fastify.route({
        url: "/auth",
        handler: handler,
        method: "POST"
    });
}


