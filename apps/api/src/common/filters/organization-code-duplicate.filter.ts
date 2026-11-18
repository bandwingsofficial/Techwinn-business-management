import { Catch, HttpStatus, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import { API_ERROR_CODES } from '#contracts';
import type { Request, Response } from 'express';
import { sendApiError } from './api-error.response.js';
import {
  ORGANIZATION_CODE_DUPLICATE_MESSAGE,
  OrganizationCodeDuplicateError,
} from '../../lib/organization-code/organization-code-duplicate.error.js';

@Catch(OrganizationCodeDuplicateError)
export class OrganizationCodeDuplicateExceptionFilter
  implements ExceptionFilter<OrganizationCodeDuplicateError>
{
  catch(error: OrganizationCodeDuplicateError, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    sendApiError(request, response, {
      status: HttpStatus.CONFLICT,
      code: API_ERROR_CODES.DUPLICATE_ORGANIZATION_CODE,
      message: ORGANIZATION_CODE_DUPLICATE_MESSAGE,
      details: [{ path: error.fieldPath, message: ORGANIZATION_CODE_DUPLICATE_MESSAGE }],
    });
  }
}