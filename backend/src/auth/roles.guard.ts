import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';

export class MultipleRolesGuard implements CanActivate {
    constructor(private readonly requiredRoles: string[]) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user || (!this.requiredRoles.includes(user.role))) {
            throw new ForbiddenException(`Access forbidden. Required roles: ${this.requiredRoles.join(', ')}`);
        }
        return true;
    }
}

export const AdminGuard = new MultipleRolesGuard(['ADMIN']);
export const AdminOrTeacherGuard = new MultipleRolesGuard(['ADMIN', 'TEACHER']);
