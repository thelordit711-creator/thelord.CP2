'use client';

import React from 'react';
import { AccessRole, AppPermission, hasPermission } from '@lord/shared-types';
import { useGetMeQuery } from '../../store/api/usersApi';

interface PermissionGateProps {
  permission?: AppPermission;
  role?: AccessRole | AccessRole[];
  userRole?: AccessRole;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Executive Permission Gate
 * Declaratively guards UI elements based on the central RBAC permission matrix
 * backed by the server-verified HttpOnly session (/users/me).
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  role,
  userRole: propUserRole,
  fallback = null,
  children
}) => {
  const { data: meRes } = useGetMeQuery(undefined, { skip: Boolean(propUserRole) });
  const activeRole: AccessRole | undefined =
    propUserRole || (meRes?.data?.accessRole as AccessRole | undefined);

  if (!activeRole) {
    return <>{fallback}</>;
  }

  // 1. Check direct role requirement if provided
  if (role) {
    const requiredRoles = Array.isArray(role) ? role : [role];
    if (!requiredRoles.includes(activeRole)) {
      return <>{fallback}</>;
    }
  }

  // 2. Check granular permission requirement if provided
  if (permission) {
    if (!hasPermission(activeRole, permission)) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};

