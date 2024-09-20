import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { WorkflowService } from '@/workflow/workflow.service';
import { ClsService } from 'nestjs-cls';

/**
 * Expects a param named `id` in the request belonging to a workflow
 */
@Injectable()
export class WorkflowAssigneeGuard implements CanActivate {
  constructor(private service: WorkflowService, private readonly cls: ClsService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    console.log('Request info:', safeStringify(extractRequestInfo(request)));
    console.log('request.user', JSON.stringify(request.user, null, 2));
    console.log('request.params', JSON.stringify(request.params, null, 2));
    const workflowId = request.params.id;
    // @ts-expect-error `id` is not defined on `user`
    const requestingUserId = request.user!.user!.id;
    const workflowRuntime = await this.service.getWorkflowRuntimeDataById(
      workflowId as string,
      {
        include: {
          parentWorkflowRuntimeData: {
            select: {
              assigneeId: true,
            },
          },
        },
      },
      request.user!.projectIds,
    );

    return (
      workflowRuntime.assigneeId === requestingUserId ||
      // @ts-ignore - fix type from include/select not propagating from repository
      workflowRuntime.parentWorkflowRuntimeData?.assigneeId === requestingUserId
    );
  }
}

function safeStringify(obj: any, indent = 2) {
  const cache = new Set();
  return JSON.stringify(
    obj,
    (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (cache.has(value)) {
          return '[Circular]';
        }
        cache.add(value);
      }
      return value;
    },
    indent,
  );
}

function extractRequestInfo(req: any) {
  return {
    method: req.method,
    url: req.url,
    headers: req.headers,
    query: req.query,
    params: req.params,
    body: req.body,
    user: req.user,
  };
}
