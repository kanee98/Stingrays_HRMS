import bcrypt from "bcrypt";
import sql from "mssql";
import { poolPromise } from "../config/db";
import { validatePasswordStrength } from "../utils/passwordPolicy";

export interface ClientAdminAccountInput {
  fullName?: string;
  email?: string;
  password?: string;
  isActive?: boolean;
  mustChangePassword?: boolean;
}

interface ExistingClientAdminAccountRow {
  UserId: number;
  FullName: string | null;
  Email: string;
  IsActive: boolean;
  MustChangePassword: boolean;
}

export interface ClientAdminAccountMutationResult {
  skipped: boolean;
  created: boolean;
  updated: boolean;
  passwordReset: boolean;
  deactivated: boolean;
  userId: number | null;
}

function normalizeText(value: string | undefined): string {
  return value?.trim() || "";
}

async function ensureAdminRoleId(transaction: sql.Transaction): Promise<number> {
  await new sql.Request(transaction).query(`
    IF NOT EXISTS (SELECT 1 FROM Roles WHERE Name = 'admin')
    BEGIN
      INSERT INTO Roles (Name) VALUES ('admin');
    END
  `);

  const result = await new sql.Request(transaction).query(`SELECT TOP 1 Id FROM Roles WHERE Name = 'admin'`);
  const roleId = Number(result.recordset[0]?.Id);
  if (!Number.isInteger(roleId)) {
    throw new Error("Failed to resolve admin role");
  }

  return roleId;
}

async function getExistingClientAdminAccount(
  transaction: sql.Transaction,
  clientId: number,
): Promise<ExistingClientAdminAccountRow | null> {
  const result = await new sql.Request(transaction)
    .input("clientId", sql.Int, clientId)
    .query(`
      SELECT TOP 1
        u.Id AS UserId,
        u.FullName,
        u.Email,
        u.IsActive,
        u.MustChangePassword
      FROM ClientAdminAccounts ca
      JOIN Users u ON u.Id = ca.UserId
      WHERE ca.ClientId = @clientId
    `);

  return (result.recordset[0] as ExistingClientAdminAccountRow | undefined) ?? null;
}

async function ensureEmailAvailable(transaction: sql.Transaction, email: string, existingUserId?: number) {
  const result = await new sql.Request(transaction)
    .input("email", sql.NVarChar(255), email)
    .input("userId", sql.Int, existingUserId ?? null)
    .query(`
      SELECT TOP 1 Id
      FROM Users
      WHERE Email = @email
        AND (@userId IS NULL OR Id <> @userId)
    `);

  if (result.recordset.length > 0) {
    throw new Error("A user with this email already exists");
  }
}

async function revokeAllUserSessions(transaction: sql.Transaction, userId: number, reason: string) {
  await new sql.Request(transaction)
    .input("userId", sql.Int, userId)
    .input("reason", sql.NVarChar(100), reason)
    .query(`
      IF OBJECT_ID('UserSessions', 'U') IS NOT NULL
      BEGIN
        UPDATE UserSessions
        SET RevokedAt = COALESCE(RevokedAt, SYSUTCDATETIME()),
            RevokedReason = COALESCE(RevokedReason, @reason)
        WHERE UserId = @userId
          AND RevokedAt IS NULL;
      END
    `);
}

export async function upsertClientAdminAccount(
  transaction: sql.Transaction,
  clientId: number,
  input: ClientAdminAccountInput | undefined,
): Promise<ClientAdminAccountMutationResult> {
  const existing = await getExistingClientAdminAccount(transaction, clientId);
  const normalizedFullName = normalizeText(input?.fullName);
  const normalizedEmail = normalizeText(input?.email).toLowerCase();
  const normalizedPassword = normalizeText(input?.password);

  if (!existing && !normalizedFullName && !normalizedEmail && !normalizedPassword) {
    return {
      skipped: true,
      created: false,
      updated: false,
      passwordReset: false,
      deactivated: false,
      userId: null,
    };
  }

  if (!existing) {
    if (!normalizedFullName || !normalizedEmail || !normalizedPassword) {
      throw new Error("Tenant admin full name, email, and password are required");
    }

    const passwordError = validatePasswordStrength(normalizedPassword);
    if (passwordError) {
      throw new Error(passwordError);
    }

    await ensureEmailAvailable(transaction, normalizedEmail);

    const adminRoleId = await ensureAdminRoleId(transaction);
    const passwordHash = await bcrypt.hash(normalizedPassword, 12);
    const isActive = input?.isActive ?? true;
    const mustChangePassword = input?.mustChangePassword ?? true;

    const insertResult = await new sql.Request(transaction)
      .input("email", sql.NVarChar(255), normalizedEmail)
      .input("fullName", sql.NVarChar(150), normalizedFullName)
      .input("passwordHash", sql.NVarChar(255), passwordHash)
      .input("isActive", sql.Bit, isActive)
      .input("mustChangePassword", sql.Bit, mustChangePassword)
      .query(`
        INSERT INTO Users (Email, FullName, PasswordHash, IsActive, MustChangePassword, PasswordChangedAt, LastPasswordResetAt, UpdatedAt)
        OUTPUT INSERTED.Id
        VALUES (
          @email,
          @fullName,
          @passwordHash,
          @isActive,
          @mustChangePassword,
          CASE WHEN @mustChangePassword = 1 THEN NULL ELSE SYSUTCDATETIME() END,
          SYSUTCDATETIME(),
          SYSUTCDATETIME()
        )
      `);

    const userId = Number(insertResult.recordset[0]?.Id);
    if (!Number.isInteger(userId)) {
      throw new Error("Failed to create tenant admin account");
    }

    await new sql.Request(transaction)
      .input("userId", sql.Int, userId)
      .input("roleId", sql.Int, adminRoleId)
      .query(`
        IF NOT EXISTS (SELECT 1 FROM UserRoles WHERE UserId = @userId AND RoleId = @roleId)
        BEGIN
          INSERT INTO UserRoles (UserId, RoleId)
          VALUES (@userId, @roleId);
        END
      `);

    await new sql.Request(transaction)
      .input("clientId", sql.Int, clientId)
      .input("userId", sql.Int, userId)
      .query(`
        INSERT INTO ClientAdminAccounts (ClientId, UserId, CreatedAt, UpdatedAt)
        VALUES (@clientId, @userId, SYSUTCDATETIME(), SYSUTCDATETIME())
      `);

    return {
      skipped: false,
      created: true,
      updated: false,
      passwordReset: false,
      deactivated: !isActive,
      userId,
    };
  }

  const nextFullName = normalizedFullName || (existing.FullName ?? "");
  const nextEmail = normalizedEmail || existing.Email;
  const nextIsActive = input?.isActive ?? existing.IsActive;
  const passwordProvided = normalizedPassword.length > 0;
  const mustChangePassword = passwordProvided ? (input?.mustChangePassword ?? true) : existing.MustChangePassword;

  if (!nextFullName || !nextEmail) {
    throw new Error("Tenant admin full name and email are required");
  }

  await ensureEmailAvailable(transaction, nextEmail, existing.UserId);

  const emailChanged = nextEmail !== existing.Email.toLowerCase();
  const fullNameChanged = nextFullName !== (existing.FullName ?? "");
  const isActiveChanged = nextIsActive !== existing.IsActive;
  const deactivated = existing.IsActive && !nextIsActive;

  if (passwordProvided) {
    const passwordError = validatePasswordStrength(normalizedPassword);
    if (passwordError) {
      throw new Error(passwordError);
    }

    const passwordHash = await bcrypt.hash(normalizedPassword, 12);
    await new sql.Request(transaction)
      .input("userId", sql.Int, existing.UserId)
      .input("fullName", sql.NVarChar(150), nextFullName)
      .input("email", sql.NVarChar(255), nextEmail)
      .input("isActive", sql.Bit, nextIsActive)
      .input("passwordHash", sql.NVarChar(255), passwordHash)
      .input("mustChangePassword", sql.Bit, mustChangePassword)
      .query(`
        UPDATE Users
        SET FullName = @fullName,
            Email = @email,
            IsActive = @isActive,
            PasswordHash = @passwordHash,
            MustChangePassword = @mustChangePassword,
            PasswordChangedAt = CASE WHEN @mustChangePassword = 1 THEN NULL ELSE SYSUTCDATETIME() END,
            LastPasswordResetAt = SYSUTCDATETIME(),
            UpdatedAt = SYSUTCDATETIME()
        WHERE Id = @userId
      `);

    await revokeAllUserSessions(transaction, existing.UserId, "super_admin_password_reset");

    return {
      skipped: false,
      created: false,
      updated: emailChanged || fullNameChanged || isActiveChanged,
      passwordReset: true,
      deactivated,
      userId: existing.UserId,
    };
  }

  if (!emailChanged && !fullNameChanged && !isActiveChanged) {
    return {
      skipped: true,
      created: false,
      updated: false,
      passwordReset: false,
      deactivated: false,
      userId: existing.UserId,
    };
  }

  await new sql.Request(transaction)
    .input("userId", sql.Int, existing.UserId)
    .input("fullName", sql.NVarChar(150), nextFullName)
    .input("email", sql.NVarChar(255), nextEmail)
    .input("isActive", sql.Bit, nextIsActive)
    .query(`
      UPDATE Users
      SET FullName = @fullName,
          Email = @email,
          IsActive = @isActive,
          UpdatedAt = SYSUTCDATETIME()
      WHERE Id = @userId
    `);

  if (deactivated) {
    await revokeAllUserSessions(transaction, existing.UserId, "super_admin_deactivated");
  }

  return {
    skipped: false,
    created: false,
    updated: true,
    passwordReset: false,
    deactivated,
    userId: existing.UserId,
  };
}

export async function getClientAdminAccountByClientId(clientId: number) {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .input("clientId", sql.Int, clientId)
    .query(`
      SELECT TOP 1
        u.Id AS Id,
        u.FullName,
        u.Email,
        u.IsActive,
        u.MustChangePassword,
        u.LastPasswordResetAt,
        u.PasswordChangedAt
      FROM ClientAdminAccounts ca
      JOIN Users u ON u.Id = ca.UserId
      WHERE ca.ClientId = @clientId
    `);

  return result.recordset[0] ?? null;
}
