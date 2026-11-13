import { demoData } from '../data/demoData.js';

/**
 * Static demo DB adapter (no external database).
 * - Serves sample data for common SELECT queries
 * - Accepts INSERT/UPDATE/DELETE with stubbed success (no persistence)
 * This enables easy Vercel deployment without provisioning a database.
 */

function tableFromSql(sql = '') {
  const s = String(sql).replace(/\s+/g, ' ');
  const from = s.match(/\bfrom\s+`?([a-zA-Z0-9_]+)`?/i);
  if (from) return from[1];
  const into = s.match(/\binto\s+`?([a-zA-Z0-9_]+)`?/i);
  if (into) return into[1];
  const upd = s.match(/\bupdate\s+`?([a-zA-Z0-9_]+)`?/i);
  if (upd) return upd[1];
  return null;
}

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

function rowsForTable(table) {
  if (!table) return [];
  const t = table.toLowerCase();
  if (demoData[t]) return clone(demoData[t]);
  // common aliases/views fallback
  if (t === 'academic_terms') return clone(demoData.terms || []);
  return [];
}

function applySimpleWhere(rows, sql, params = []) {
  // Handle very common patterns: WHERE id = ? / WHERE username = ? / WHERE email = ? / WHERE faculty_id = ?
  const s = String(sql);
  const pairs = [];
  const re = /\b([a-zA-Z0-9_\.]+)\s*=\s*\?/g;
  let m;
  while ((m = re.exec(s))) pairs.push(m[1].split('.').pop());
  if (!pairs.length || !params.length) return rows;
  return rows.filter(r => pairs.every((col, i) => {
    if (i >= params.length) return true;
    // loose compare for numeric/string ids
    return String(r[col]) === String(params[i]);
  }));
}

function handleSelect(sql, params) {
  const s = String(sql).trim();
  const lower = s.toLowerCase();
  const table = tableFromSql(s);

  // COUNT(*) queries
  if (/select\s+count\s*\(/i.test(s)) {
    let rows = rowsForTable(table);
    rows = applySimpleWhere(rows, s, params);
    // try to respect simple archived filters
    if (/is_archived\s*=\s*(false|0)/i.test(s)) rows = rows.filter(r => r.is_archived === 0 || r.is_archived === false || r.is_archived == null);
    return [[{ count: rows.length }], []];
  }

  // SHOW COLUMNS etc (MySQL-specific) -> return empty to avoid crashes
  if (/^show\s+/i.test(lower) || /information_schema/i.test(lower)) {
    return [[], []];
  }

  let rows = rowsForTable(table);

  // Basic special cases
  if (table && table.toLowerCase() === 'users' && /where\s+username\s*=\s*\?/i.test(s) && params?.[0]) {
    rows = rows.filter(u => u.username === params[0]);
  } else if (/where\s+email\s*=\s*\?/i.test(s) && params?.[0]) {
    rows = rows.filter(r => String(r.email) === String(params[0]));
  } else {
    rows = applySimpleWhere(rows, s, params);
  }

  // rudimentary JOIN enrichment is not implemented; routes expecting joined fields may get partial data.
  return [rows, []];
}

function handleMutation(sql, params) {
  const lower = String(sql).toLowerCase();
  // Try to return a plausible insertId for inserts
  const table = tableFromSql(sql);
  let insertId = 1;
  if (table && demoData[table.toLowerCase()]) {
    const arr = demoData[table.toLowerCase()];
    const maxId = arr.reduce((m, r) => Math.max(m, Number(r.id || 0)), 0);
    insertId = maxId + 1;
  }
  const result = {
    affectedRows: 1,
    insertId,
    warningStatus: 0,
    changedRows: /update/.test(lower) ? 1 : 0,
  };
  return [result, []];
}

async function query(sql, params = []) {
  const s = String(sql || '').trim();
  const lower = s.toLowerCase();
  if (lower.startsWith('select') || lower.startsWith('show') || lower.startsWith('describe') || lower.startsWith('with')) {
    return handleSelect(s, params);
  }
  // CREATE/ALTER/DROP/SET/USE etc - no-op success
  if (/^(create|alter|drop|set|use|begin|commit|rollback|start)/i.test(lower)) {
    return [{ affectedRows: 0 }, []];
  }
  return handleMutation(s, params);
}

async function execute(sql, params = []) {
  return query(sql, params);
}

function createConnectionLike() {
  return {
    async query(sql, params) { return query(sql, params); },
    async execute(sql, params) { return execute(sql, params); },
    async beginTransaction() { return; },
    async commit() { return; },
    async rollback() { return; },
    release() { return; },
  };
}

const pool = {
  async query(sql, params) { return query(sql, params); },
  async execute(sql, params) { return execute(sql, params); },
  async getConnection() { return createConnectionLike(); },
};

export default pool;
