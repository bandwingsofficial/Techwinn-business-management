import type { EmployeeActor } from '../shared/employee-actor.js';

export type CheckEmployeeCodeAvailabilityQuery = {
  readonly actor: EmployeeActor;
  readonly code: string;
  readonly excludeEmployeeId?: string;
};