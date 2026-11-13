import { Catch, HttpStatus, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import { API_ERROR_CODES, type ApiErrorCode } from '#contracts';
import type { Request, Response } from 'express';
import { sendApiError } from '../../../../../../../common/filters/api-error.response.js';
import {
  EmployeeOnApprovedLeaveError,
  employeeOnApprovedLeaveDetails,
} from '../../../../../../leave/index.js';
import {
  DailyTaskError,
  DailyTaskValidationError,
  type DailyTaskErrorCode,
} from '../../../domain/errors/daily-task.errors.js';

const HTTP_MAPPING: Record<DailyTaskErrorCode, { status: number; code: ApiErrorCode }> = {
  NOT_FOUND: { status: HttpStatus.NOT_FOUND, code: API_ERROR_CODES.NOT_FOUND },
  VALIDATION_FAILED: {
    status: HttpStatus.BAD_REQUEST,
    code: API_ERROR_CODES.VALIDATION_FAILED,
  },
  CONFLICT: { status: HttpStatus.CONFLICT, code: API_ERROR_CODES.BAD_REQUEST },
  FORBIDDEN: { status: HttpStatus.FORBIDDEN, code: API_ERROR_CODES.FORBIDDEN },
};

@Catch(DailyTaskError, EmployeeOnApprovedLeaveError)
export class DailyTaskExceptionFilter implements ExceptionFilter<DailyTaskError | EmployeeOnApprovedLeaveError> {
  catch(error: DailyTaskError | EmployeeOnApprovedLeaveError, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    if (error instanceof EmployeeOnApprovedLeaveError) {
      sendApiError(request, response, {
        status: HttpStatus.CONFLICT,
        code: API_ERROR_CODES.EMPLOYEE_ON_APPROVED_LEAVE,
        message: error.message,
        details: employeeOnApprovedLeaveDetails(error),
      });
      return;
    }
    const mapping = HTTP_MAPPING[error.code];
    sendApiError(request, response, {
      status: mapping.status,
      code: mapping.code,
      message: error.message,
      details: error instanceof DailyTaskValidationError ? error.details : undefined,
    });
  }
}
