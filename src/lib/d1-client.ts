/**
 * Cloudflare D1 HTTP API Client
 * 
 * Since this project runs as a standalone Next.js app (NOT on CF Workers),
 * we use the D1 REST API to query the database remotely.
 * 
 * Required env vars:
 *   CF_ACCOUNT_ID  - Your Cloudflare account ID
 *   CF_DATABASE_ID - Your D1 database ID
 *   CF_API_TOKEN    - Cloudflare API token with D1 read/write permissions
 */

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID!;
const CF_DATABASE_ID = process.env.CF_DATABASE_ID!;
const CF_API_TOKEN = process.env.CF_API_TOKEN!;

const D1_API_URL = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_DATABASE_ID}/query`;

interface D1Result<T = Record<string, unknown>> {
  success: boolean;
  meta: {
    changed_db: boolean;
    changes: number;
    duration: number;
    last_row_id: number;
    rows_read: number;
    rows_written: number;
    size_after: number;
  };
  results: T[];
}

interface D1Error {
  success: false;
  errors: Array<{ code: number; message: string }>;
}

async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const res = await fetch(D1_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`D1 API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as D1Result<T> | D1Error;

  if (!data.success) {
    const errMsg = (data as D1Error).errors?.map(e => e.message).join(', ');
    throw new Error(`D1 query error: ${errMsg}`);
  }

  return (data as D1Result<T>).results;
}

/** Execute a statement (INSERT, UPDATE, DELETE) and return metadata */
async function execute(
  sql: string,
  params: unknown[] = []
): Promise<{ changes: number; lastRowId: number }> {
  const res = await fetch(D1_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`D1 API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as D1Result | D1Error;

  if (!data.success) {
    const errMsg = (data as D1Error).errors?.map(e => e.message).join(', ');
    throw new Error(`D1 execute error: ${errMsg}`);
  }

  return {
    changes: (data as D1Result).meta.changes,
    lastRowId: (data as D1Result).meta.last_row_id,
  };
}

/** Execute multiple SQL statements in a single API call (for batch operations) */
async function batch(
  statements: Array<{ sql: string; params?: unknown[] }>
): Promise<Array<{ results: Record<string, unknown>[] }>> {
  const res = await fetch(D1_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(statements),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`D1 batch error ${res.status}: ${text}`);
  }

  const data = await res.json();

  if (!data.success) {
    const errMsg = data.errors?.map((e: { message: string }) => e.message).join(', ');
    throw new Error(`D1 batch error: ${errMsg}`);
  }

  return data.result;
}

export const d1 = { query, execute, batch };
