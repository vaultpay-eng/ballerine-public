import { Injectable, NestMiddleware, Scope } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { env } from '@/env';
import { ClsService } from 'nestjs-cls';

@Injectable({ scope: Scope.REQUEST })
export class AdminKeyMiddleware implements NestMiddleware {
  constructor(private readonly cls: ClsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    const apiKey = authHeader?.split?.(' ')?.[1];

    // Where we check if the API key is the admin API key
    if (!!apiKey && apiKey == env.ADMIN_API_KEY) {
      const entity = {
        projectIds: ['*'],
        type: 'admin',
      };

      this.cls.set('entity', entity);

      // @ts-expect-error
      req.user = entity;
    }

    next();
  }
}
