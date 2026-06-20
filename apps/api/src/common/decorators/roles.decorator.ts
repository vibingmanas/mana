import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@mana/db';

export const ROLES_KEY = 'roles';

/** Restrict a route/controller to the given user roles (enforced by RolesGuard). */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
