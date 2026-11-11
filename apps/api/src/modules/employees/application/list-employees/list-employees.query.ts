import type { EmployeeListQuery } from '#validation';
import type { EmployeeActor } from '../shared/employee-actor.js';

export type ListEmployeesQuery = {
  readonly actor: EmployeeActor;
  readonly listQuery: EmployeeListQuery;
};
