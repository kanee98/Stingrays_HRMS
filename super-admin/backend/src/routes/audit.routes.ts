import { Router } from "express";
import sql from "mssql";
import { poolPromise } from "../config/db";

const router = Router();
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

function readQueryValue(value: unknown): string | null {
  if (Array.isArray(value)) {
    return readQueryValue(value[0]);
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function parsePositiveInt(value: unknown, fallback: number): number {
  const rawValue = readQueryValue(value);
  const parsed = rawValue == null ? Number.NaN : Number.parseInt(rawValue, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeFilter(value: unknown): string | null {
  const normalized = readQueryValue(value);
  return normalized == null || normalized.toLowerCase() === "all" ? null : normalized;
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_\[\]]/g, "\\$&");
}

router.get("/", async (req, res) => {
  const page = parsePositiveInt(req.query.page, 1);
  const pageSize = Math.min(parsePositiveInt(req.query.pageSize, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
  const action = normalizeFilter(req.query.action);
  const entity = normalizeFilter(req.query.entity);
  const search = readQueryValue(req.query.search);
  const searchPattern = search ? `%${escapeLikePattern(search)}%` : null;

  try {
    const pool = await poolPromise;

    const buildFilteredRequest = () =>
      pool
        .request()
        .input("action", sql.NVarChar(128), action)
        .input("entity", sql.NVarChar(128), entity)
        .input("searchPattern", sql.NVarChar(sql.MAX), searchPattern);

    const summaryResult = await buildFilteredRequest().query(`
      SELECT
        COUNT(*) AS TotalCount,
        COALESCE(SUM(CASE WHEN al.Action LIKE '%login%' OR al.Action LIKE '%logout%' THEN 1 ELSE 0 END), 0) AS SignIns,
        COALESCE(SUM(CASE WHEN al.Action LIKE 'client.%' THEN 1 ELSE 0 END), 0) AS TenantChanges,
        COALESCE(SUM(CASE WHEN su.Email IS NULL THEN 1 ELSE 0 END), 0) AS SystemEvents
      FROM SuperAdminAuditLogs al
      LEFT JOIN SuperAdminUsers su ON su.Id = al.UserId
      WHERE (@action IS NULL OR al.Action = @action)
        AND (@entity IS NULL OR al.EntityType = @entity)
        AND (
          @searchPattern IS NULL OR
          al.Summary LIKE @searchPattern ESCAPE '\' OR
          ISNULL(al.EntityKey, '') LIKE @searchPattern ESCAPE '\' OR
          ISNULL(su.Email, '') LIKE @searchPattern ESCAPE '\' OR
          al.Action LIKE @searchPattern ESCAPE '\' OR
          al.EntityType LIKE @searchPattern ESCAPE '\'
        )
    `);

    const summaryRow = summaryResult.recordset[0] ?? {
      TotalCount: 0,
      SignIns: 0,
      TenantChanges: 0,
      SystemEvents: 0,
    };

    const total = Number(summaryRow.TotalCount || 0);
    const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize);
    const currentPage = Math.min(page, totalPages);
    const offset = (currentPage - 1) * pageSize;

    const [itemsResult, actionsResult, entitiesResult] = await Promise.all([
      buildFilteredRequest()
        .input("offset", sql.Int, offset)
        .input("pageSize", sql.Int, pageSize)
        .query(`
          SELECT
            al.Id,
            al.Action,
            al.EntityType,
            al.EntityKey,
            al.Summary,
            al.PayloadJson,
            al.CreatedAt,
            su.Email AS UserEmail
          FROM SuperAdminAuditLogs al
          LEFT JOIN SuperAdminUsers su ON su.Id = al.UserId
          WHERE (@action IS NULL OR al.Action = @action)
            AND (@entity IS NULL OR al.EntityType = @entity)
            AND (
              @searchPattern IS NULL OR
              al.Summary LIKE @searchPattern ESCAPE '\' OR
              ISNULL(al.EntityKey, '') LIKE @searchPattern ESCAPE '\' OR
              ISNULL(su.Email, '') LIKE @searchPattern ESCAPE '\' OR
              al.Action LIKE @searchPattern ESCAPE '\' OR
              al.EntityType LIKE @searchPattern ESCAPE '\'
            )
          ORDER BY al.CreatedAt DESC, al.Id DESC
          OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
        `),
      pool.request().query(`
        SELECT DISTINCT Action
        FROM SuperAdminAuditLogs
        WHERE Action IS NOT NULL AND LTRIM(RTRIM(Action)) <> ''
        ORDER BY Action ASC
      `),
      pool.request().query(`
        SELECT DISTINCT EntityType
        FROM SuperAdminAuditLogs
        WHERE EntityType IS NOT NULL AND LTRIM(RTRIM(EntityType)) <> ''
        ORDER BY EntityType ASC
      `),
    ]);

    return res.json({
      items: itemsResult.recordset,
      total,
      page: currentPage,
      pageSize,
      totalPages,
      summary: {
        total,
        signIns: Number(summaryRow.SignIns || 0),
        tenantChanges: Number(summaryRow.TenantChanges || 0),
        systemEvents: Number(summaryRow.SystemEvents || 0),
      },
      filters: {
        actions: actionsResult.recordset.map((row) => row.Action),
        entities: entitiesResult.recordset.map((row) => row.EntityType),
      },
    });
  } catch (error) {
    console.error("Failed to load audit logs:", error);
    return res.status(500).json({ message: "Failed to load audit logs" });
  }
});

export default router;
