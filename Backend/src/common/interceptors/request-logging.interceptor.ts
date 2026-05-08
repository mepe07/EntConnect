import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import * as appInsights from 'applicationinsights';
import { Request, Response } from 'express';
import { catchError, Observable, tap, throwError } from 'rxjs';

type RequestComUtilizador = Request & {
  user?: {
    sub?: number;
    username?: string;
    role?: string;
  };
};

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);
  private readonly slowRequestThresholdMs = 3000;

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestComUtilizador>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - startedAt;
        const statusCode = response.statusCode;
        const message = this.criarMensagem(request, statusCode, durationMs);

        this.registarRequestAppInsights(request, statusCode, durationMs);

        if (durationMs >= this.slowRequestThresholdMs) {
          this.logger.warn(message);
          return;
        }

        this.logger.log(message);
      }),
      catchError((error: unknown) => {
        const durationMs = Date.now() - startedAt;
        const statusCode = this.obterStatusCode(error);
        const message = this.criarMensagem(request, statusCode, durationMs);

        this.registarRequestAppInsights(request, statusCode, durationMs);

        if (statusCode >= 500) {
          const stack = error instanceof Error ? error.stack : undefined;
          this.logger.error(message, stack);
        } else {
          this.logger.warn(message);
        }

        return throwError(() => error);
      }),
    );
  }

  private criarMensagem(
    request: RequestComUtilizador,
    statusCode: number,
    durationMs: number,
  ): string {
    const user = request.user;
    const userInfo = user?.sub
      ? ` userId=${user.sub} role=${user.role ?? 'unknown'}`
      : ' userId=anonymous';

    return [
      `${request.method} ${this.sanitizarUrl(request.originalUrl ?? request.url)}`,
      `status=${statusCode}`,
      `durationMs=${durationMs}`,
      `ip=${request.ip ?? request.socket.remoteAddress ?? 'unknown'}`,
      `userAgent="${request.headers['user-agent'] ?? 'unknown'}"`,
      userInfo.trim(),
    ].join(' ');
  }

  private obterStatusCode(error: unknown): number {
    if (
      typeof error === 'object' &&
      error !== null &&
      'getStatus' in error &&
      typeof error.getStatus === 'function'
    ) {
      return error.getStatus();
    }

    return 500;
  }

  private registarRequestAppInsights(
    request: RequestComUtilizador,
    statusCode: number,
    durationMs: number,
  ): void {
    if (!appInsights.defaultClient) {
      return;
    }

    const path = this.sanitizarUrl(request.originalUrl ?? request.url);

    appInsights.defaultClient.trackRequest({
      name: `${request.method} ${path}`,
      url: this.obterUrlCompletoSanitizado(request, path),
      duration: durationMs,
      resultCode: String(statusCode),
      success: statusCode < 400,
      properties: {
        method: request.method,
        path,
        statusCode: String(statusCode),
        durationMs: String(durationMs),
        ip: request.ip ?? request.socket.remoteAddress ?? 'unknown',
        userAgent: String(request.headers['user-agent'] ?? 'unknown'),
        userId: request.user?.sub ? String(request.user.sub) : 'anonymous',
        username: request.user?.username ?? 'anonymous',
        role: request.user?.role ?? 'anonymous',
      },
    });
  }

  private obterUrlCompletoSanitizado(
    request: RequestComUtilizador,
    path: string,
  ): string {
    const protocol = request.protocol ?? 'http';
    const host = request.get('host') ?? 'localhost';

    return `${protocol}://${host}${path}`;
  }

  private sanitizarUrl(url: string): string {
    try {
      const parsedUrl = new URL(url, 'http://localhost');
      const sensitiveParams = ['token', 'resetToken', 'password', 'access_token'];

      sensitiveParams.forEach((param) => {
        if (parsedUrl.searchParams.has(param)) {
          parsedUrl.searchParams.set(param, '[redacted]');
        }
      });

      return `${parsedUrl.pathname}${parsedUrl.search}`;
    } catch {
      return url;
    }
  }
}
