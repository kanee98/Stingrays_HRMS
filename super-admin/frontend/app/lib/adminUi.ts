export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  pilot: 'Pilot',
  inactive: 'Inactive',
  suspended: 'Suspended',
};

const ACTION_LABELS: Record<string, string> = {
  'super_admin.login': 'Admin sign in',
  'super_admin.logout': 'Admin sign out',
  'client.create': 'Tenant created',
  'client.update': 'Tenant profile updated',
  'client.account.create': 'Tenant admin created',
  'client.account.update': 'Tenant admin updated',
  'client.account.password_reset': 'Tenant admin password reset',
  'client.access.update': 'Access policy updated',
};

const ENTITY_LABELS: Record<string, string> = {
  client: 'Tenant',
  'client-account': 'Tenant admin',
  'client-access': 'Access policy',
  'super-admin-user': 'Admin account',
};

export function formatStatusLabel(status: string) {
  return STATUS_LABELS[status?.trim().toLowerCase()] || toTitleCase(status || 'Unknown');
}

export function getStatusBadgeClasses(status: string) {
  switch (status?.trim().toLowerCase()) {
    case 'active':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'pilot':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'suspended':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    case 'inactive':
      return 'border-slate-200 bg-slate-100 text-slate-600';
    default:
      return 'border-slate-200 bg-slate-100 text-slate-700';
  }
}

export function formatActionLabel(action: string) {
  return ACTION_LABELS[action] || toTitleCase(action.replace(/[._-]+/g, ' '));
}

export function getActionBadgeClasses(action: string) {
  const normalized = action.toLowerCase();

  if (normalized.includes('login')) {
    return 'border-sky-200 bg-sky-50 text-sky-700';
  }

  if (normalized.includes('logout')) {
    return 'border-slate-200 bg-slate-100 text-slate-700';
  }

  if (normalized.includes('create')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (normalized.includes('access') || normalized.includes('policy')) {
    return 'border-indigo-200 bg-indigo-50 text-indigo-700';
  }

  if (normalized.includes('update')) {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  return 'border-slate-200 bg-slate-100 text-slate-700';
}

export function formatEntityLabel(entityType: string) {
  return ENTITY_LABELS[entityType] || toTitleCase(entityType.replace(/[-_]+/g, ' '));
}

export function formatDateTime(input: string) {
  return new Date(input).toLocaleString();
}

export function formatRelativeDate(input: string) {
  const targetTime = new Date(input).getTime();
  const diffInSeconds = Math.round((targetTime - Date.now()) / 1000);
  const absSeconds = Math.abs(diffInSeconds);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (absSeconds < 45) {
    return 'just now';
  }

  if (absSeconds < 3600) {
    return rtf.format(Math.round(diffInSeconds / 60), 'minute');
  }

  if (absSeconds < 86400) {
    return rtf.format(Math.round(diffInSeconds / 3600), 'hour');
  }

  return rtf.format(Math.round(diffInSeconds / 86400), 'day');
}

export function getConfigState(value: string | null | undefined) {
  if (!value?.trim()) {
    return {
      label: 'No override',
      classes: 'border-slate-200 bg-slate-100 text-slate-600',
    };
  }

  try {
    JSON.parse(value);
    return {
      label: 'Valid JSON',
      classes: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    };
  } catch {
    return {
      label: 'Invalid JSON',
      classes: 'border-rose-200 bg-rose-50 text-rose-700',
    };
  }
}

export function isJsonStringValid(value: string | null | undefined) {
  if (!value?.trim()) {
    return true;
  }

  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

export function formatJsonString(value: string | null | undefined) {
  if (!value?.trim()) {
    return '';
  }

  return JSON.stringify(JSON.parse(value), null, 2);
}

function toTitleCase(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}
