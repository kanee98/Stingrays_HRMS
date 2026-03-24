const MIN_PASSWORD_LENGTH = 12;

const PASSWORD_REQUIREMENTS = [
  { pattern: /.{12,}/, message: `be at least ${MIN_PASSWORD_LENGTH} characters long` },
  { pattern: /[a-z]/, message: "include at least one lowercase letter" },
  { pattern: /[A-Z]/, message: "include at least one uppercase letter" },
  { pattern: /\d/, message: "include at least one number" },
  { pattern: /[^A-Za-z0-9]/, message: "include at least one symbol" },
];

export function validatePasswordStrength(password: string): string | null {
  const normalizedPassword = password.trim();
  if (!normalizedPassword) {
    return "Password is required";
  }

  if (/\s/.test(password)) {
    return "Password must not contain spaces";
  }

  for (const requirement of PASSWORD_REQUIREMENTS) {
    if (!requirement.pattern.test(password)) {
      return `Password must ${requirement.message}`;
    }
  }

  return null;
}

export function isPasswordReuse(currentPassword: string, nextPassword: string): boolean {
  return currentPassword === nextPassword;
}
