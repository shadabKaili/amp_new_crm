import type { User, UserRole } from '@/lib/types';

const INTERNAL_ROLES: UserRole[] = ['super_admin', 'manager', 'team_member'];

const ROUTE_ROLE_MAP: Array<{ prefix: string; roles?: UserRole[] }> = [
    { prefix: '/portal', roles: [...INTERNAL_ROLES, 'member'] },
    { prefix: '/dashboard', roles: INTERNAL_ROLES },
    { prefix: '/members', roles: INTERNAL_ROLES },
    { prefix: '/tasks', roles: INTERNAL_ROLES },
    { prefix: '/projects', roles: INTERNAL_ROLES },
    { prefix: '/activities', roles: INTERNAL_ROLES },
    { prefix: '/donations', roles: INTERNAL_ROLES },
    { prefix: '/referrals', roles: INTERNAL_ROLES },
    { prefix: '/volunteer-applications', roles: INTERNAL_ROLES },
    { prefix: '/kpis', roles: ['super_admin', 'manager'] },
];

export function isInternalRole(role: UserRole | undefined): boolean {
    return Boolean(role && INTERNAL_ROLES.includes(role));
}

export function canAccessPath(user: User | null, pathname: string): boolean {
    const rule = ROUTE_ROLE_MAP.find((item) => pathname.startsWith(item.prefix));

    if (!rule?.roles) {
        return true;
    }

    return Boolean(user && rule.roles.includes(user.role));
}
