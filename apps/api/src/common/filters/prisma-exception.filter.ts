import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Catch()
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    // @ts-ignore - Prisma type issue
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // @ts-ignore
      if (exception.code === 'P2002') {
        response.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          message: 'Conflit de donnée en base.',
          // @ts-ignore
          details: exception.meta,
          path: request.url,
        });
        return;
      }

      // @ts-ignore
      if (exception.code === 'P2025') {
        response.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Ressource introuvable.',
          // @ts-ignore
          details: exception.meta,
          path: request.url,
        });
        return;
      }
    }

    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).json({
        statusCode: exception.getStatus(),
        message: exception.message,
        path: request.url,
      });
      return;
    }

    // Toute exception non reconnue ci-dessus finissait en 500 générique sans
    // aucune trace serveur — impossible à diagnostiquer depuis les logs.
    this.logger.error(
      `Erreur non gérée sur ${request.method} ${request.url} : ${exception?.message ?? exception}`,
      exception?.stack,
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Erreur serveur interne.',
      path: request.url,
    });
  }
}
