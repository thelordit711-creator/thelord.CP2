'use client';

import React from 'react';
import { AccessRole, AppPermission, hasPermission } from '@lord/shared-types';

interface PermissionGateProps {
  permission?: AppPermission;
  role?: AccessRole | AccessRole[];
  userRole?: AccessRole;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Executive Permission Gate
 * Declaratively guards UI elements based on the central RBAC permission matrix.
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  role,
  userRole: propUserRole,
  fallback = null,
  children
}) => {
  let activeRole: AccessRole | undefined = propUserRole;

  if (!activeRole && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('lord_current_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u.accessRole) activeRole = u.accessRole as AccessRole;
      }
    } catch {}
  }

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

