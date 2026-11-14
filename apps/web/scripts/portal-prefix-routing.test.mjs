/**
 * Trusted portal rewrite matrix (all system + custom slugs).
 * Run: `node --experimental-strip-types --test scripts/portal-prefix-routing.test.mjs`
 */
import assert from 'node:assert/strict';
import test from 'node:test';

const SYSTEM = {
  superAdmin: 'super-admin',
  admin: 'admin',
  employee: 'employee',
  projectManager: 'project-manager',
  sales: 'sales',
  financial: 'financial',
  member: 'member',
};

function normalizePathname(pathname) {
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

function pathBelongsToPortalSegment(pathname, portalSegment) {
  const prefix = `/${portalSegment}`;
  const normalized = normalizePathname(pathname);
  return normalized === prefix || normalized.startsWith(`${prefix}/`);
}

function mapHrefToPortalSegment(href, portalSegment) {
  const parts = href.split('/').filter(Boolean);
  if (parts.length === 0) return `/${portalSegment}/dashboard`;
  parts[0] = portalSegment;
  return `/${parts.join('/')}`;
}

function canonicalPermissionPath(pathname) {
  const normalized = normalizePathname(pathname);
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length < 2) return normalized;
  const head = parts[0];
  if (head === 'admin' || head === 'employee' || head === 'project-manager') {
    return normalized;
  }
  if (head === 'super-admin' || head === 'owner') {
    return `/admin/${parts.slice(1).join('/')}`;
  }
  return `/admin/${parts.slice(1).join('/')}`;
}

function adminFeaturePathToPortal(adminPath, portalSegment) {
  if (adminPath.startsWith('/admin/')) {
    return mapHrefToPortalSegment(adminPath, portalSegment);
  }
  if (adminPath.startsWith('/project-manager/')) {
    return mapHrefToPortalSegment(adminPath.replace('/project-manager/', '/admin/'), portalSegment);
  }
  if (adminPath.startsWith('/employee/')) {
    if (portalSegment === 'employee') return adminPath;
    return mapHrefToPortalSegment(adminPath.replace('/employee/', '/admin/'), portalSegment);
  }
  return adminPath;
}

function rewritePathToTrustedPortal(pathname, portalSegment) {
  const normalized = normalizePathname(pathname);
  if (pathBelongsToPortalSegment(normalized, portalSegment)) return null;

  const head = normalized.split('/').filter(Boolean)[0];
  if (!head) return null;

  if (
    portalSegment !== SYSTEM.superAdmin &&
    (head === SYSTEM.superAdmin || head === 'owner')
  ) {
    return null;
  }

  if (portalSegment === SYSTEM.superAdmin) {
    if (head === SYSTEM.admin || head === 'owner') {
      return mapHrefToPortalSegment(normalized, portalSegment);
    }
    return null;
  }

  if (head === SYSTEM.admin || head === SYSTEM.projectManager || head === SYSTEM.employee) {
    const canonical = canonicalPermissionPath(normalized);
    const mapped = adminFeaturePathToPortal(canonical, portalSegment);
    if (mapped !== normalized) return mapped;
  }

  const parts = normalized.split('/').filter(Boolean);
  if (parts.length >= 2 && head !== portalSegment) {
    parts[0] = portalSegment;
    return `/${parts.join('/')}`;
  }
  return null;
}

const PORTALS = [
  SYSTEM.superAdmin,
  SYSTEM.admin,
  SYSTEM.employee,
  SYSTEM.projectManager,
  SYSTEM.sales,
  SYSTEM.financial,
  SYSTEM.member,
  'test',
];

test('canonical /admin/daily-tasks rewrites to each trusted portal', () => {
  for (const portal of PORTALS) {
    if (portal === SYSTEM.superAdmin) {
      assert.equal(
        rewritePathToTrustedPortal('/admin/daily-tasks', portal),
        '/super-admin/daily-tasks',
      );
      continue;
    }
    if (portal === SYSTEM.employee) {
      assert.equal(
        rewritePathToTrustedPortal('/admin/daily-tasks', portal),
        '/employee/daily-tasks',
      );
      continue;
    }
    if (portal === SYSTEM.admin) {
      assert.equal(rewritePathToTrustedPortal('/admin/daily-tasks', portal), null);
      continue;
    }
    assert.equal(
      rewritePathToTrustedPortal('/admin/daily-tasks', portal),
      `/${portal}/daily-tasks`,
    );
  }
});

test('/project-manager/leads rewrites to sales portal', () => {
  assert.equal(
    rewritePathToTrustedPortal('/project-manager/leads', SYSTEM.sales),
    '/sales/leads',
  );
});

test('cross custom portal preserves feature suffix', () => {
  assert.equal(
    rewritePathToTrustedPortal('/financial/leads', SYSTEM.sales),
    '/sales/leads',
  );
});

test('super-admin canonical paths stay on super-admin', () => {
  assert.equal(rewritePathToTrustedPortal('/super-admin/roles', SYSTEM.superAdmin), null);
});

test('non-super cannot rewrite super-admin URLs', () => {
  assert.equal(rewritePathToTrustedPortal('/super-admin/roles', SYSTEM.sales), null);
});

test('trusted portal paths are not rewritten', () => {
  for (const portal of PORTALS) {
    assert.equal(rewritePathToTrustedPortal(`/${portal}/daily-tasks`, portal), null);
  }
});