'use client';

const currencyFormatter = new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  maximumFractionDigits: 2,
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-LK', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const monthFormatter = new Intl.DateTimeFormat('en-LK', {
  month: 'short',
  year: 'numeric',
});

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function getMonthName(month: number) {
  return monthNames[month - 1] ?? 'Unknown';
}

export function formatMonthYear(month: number, year: number) {
  const date = new Date(Date.UTC(year, Math.max(month - 1, 0), 1));
  return monthFormatter.format(date);
}

export function formatCurrency(value: number | null | undefined) {
  return currencyFormatter.format(value ?? 0);
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Not available';
  }

  return dateTimeFormatter.format(date);
}

export function formatCount(value: number) {
  return new Intl.NumberFormat('en-LK').format(value);
}

export function getPayrollStatusTone(status: string) {
  switch (status.toLowerCase()) {
    case 'finalized':
      return 'success' as const;
    case 'draft':
      return 'warning' as const;
    default:
      return 'neutral' as const;
  }
}

export function formatPayrollStatus(status: string) {
  if (!status) {
    return 'Unknown';
  }

  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}
