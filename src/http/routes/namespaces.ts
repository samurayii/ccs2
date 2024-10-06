import { FastifyInstance, FastifyReply } from "fastify";
import { $Inject } from "../../lib/dependency-injection";
import { ISessions, Sessions } from "../../lib/sessions";
import Ajv from "ajv";
import * as request_schema from "../schemes/namespaces-request.json";
import { AjvErrorHelperNoColor } from "../../lib/tools/ajv_error_helper_no_color";
import { INamespacesFastifyRequest, ServerResponse } from "../interfaces";
import { INamespaceRepository, NamespaceRepository } from "../../lib/namespace-repository";

export async function routeNamespaces(
    fastify: FastifyInstance,
    sessions = $Inject<ISessions>(Sessions),
    namespace_repository = $Inject<INamespaceRepository>(NamespaceRepository)
) {
   
    const handler = async function (request: INamespacesFastifyRequest, reply: FastifyReply) {

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

        reply.code(200);
        reply.send(<ServerResponse>{
            status: "success",
            data: namespace_repository.list
        });

    };

    fastify.route({
        url: "/namespaces",
        handler: handler,
        method: "POST"
    });
}


