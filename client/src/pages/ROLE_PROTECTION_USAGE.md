# Role-Based Route Protection Usage Guide

## Overview
The `RoleProtectedRoute` component allows you to restrict routes based on user roles. It's minimal, easy to use, and can be applied to any route.

## Basic Usage

### 1. Import the component
```jsx
import RoleProtectedRoute from "./pages/RoleProtectedRoute";
```

### 2. Wrap your route with RoleProtectedRoute
```jsx
<Route element={<RoleProtectedRoute allowedRoles={['admin', 'manager', 'hr']} />}>
  <Route path="/notifications" element={<NotificationsAdmin />} />
</Route>
```

## Examples

### Example 1: Admin Only Route
```jsx
<Route element={<RoleProtectedRoute allowedRoles={['admin', 'superadmin']} />}>
  <Route path="/admin-panel" element={<AdminPanel />} />
</Route>
```

### Example 2: HR and Manager Only
```jsx
<Route element={<RoleProtectedRoute allowedRoles={['hr', 'manager']} />}>
  <Route path="/candidates" element={<CandidatesPage />} />
</Route>
```

### Example 3: Multiple Routes with Same Roles
```jsx
<Route element={<RoleProtectedRoute allowedRoles={['admin', 'manager']} />}>
  <Route path="/salary-admin" element={<SalaryEditor />} />
  <Route path="/generate-salary" element={<MassSalaryEditor />} />
  <Route path="/attendance/admin" element={<AdminAttendancePage />} />
</Route>
```

### Example 4: Custom Redirect
```jsx
<Route element={<RoleProtectedRoute allowedRoles={['admin']} redirectTo="/dashboard" />}>
  <Route path="/super-secret" element={<SuperSecretPage />} />
</Route>
```

## Available Roles
Based on your User model:
- `'superadmin'`
- `'admin'`
- `'hr'`
- `'manager'`
- `'employee'`

## How It Works
1. Checks if user is authenticated (redirects to `/login` if not)
2. Checks if user's role is in `allowedRoles` array
3. If not authorized, redirects to `/unauthorized` (or custom `redirectTo` path)
4. If authorized, renders the child route using `<Outlet />`

## Unauthorized Page
The `/unauthorized` route shows a user-friendly message when access is denied. You can customize it in `Unauthorized.jsx`.
