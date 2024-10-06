import { FastifyInstance, FastifyReply } from "fastify";
import { $Inject } from "../../lib/dependency-injection";
import { ISessions, Sessions } from "../../lib/sessions";
import Ajv from "ajv";
import * as request_schema from "../schemes/logoff-request.json";
import { AjvErrorHelperNoColor } from "../../lib/tools/ajv_error_helper_no_color";
import { ILogoffFastifyRequest, ServerResponse } from "../interfaces";

export async function routeLogoff(
    fastify: FastifyInstance,
    sessions = $Inject<ISessions>(Sessions)
) {
   
    const handler = async function (request: ILogoffFastifyRequest, reply: FastifyReply) {

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

        sessions.remove(request.body.session_token);

        reply.code(200);
        reply.send(<ServerResponse>{
            status: "success"
        });

    };

    fastify.route({
        url: "/logoff",
        handler: handler,
        method: "POST"
    });
}


