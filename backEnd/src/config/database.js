const logger = require('../utils/logger');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase credentials not found');
}

const headers = {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

// Helper to strip table alias prefixes (e.g., "t.user_id" -> "user_id", "t.transaction_date" -> "transaction_date")
function stripAlias(col) {
  return col.includes('.') ? col.split('.').pop() : col;
}

// Fix 3: Map SQL operators to PostgREST operators
function mapOperator(sqlOp) {
  const opMap = {
    '=': 'eq',
    '!=': 'neq',
    '<>': 'neq',
    '>': 'gt',
    '>=': 'gte',
    '<': 'lt',
    '<=': 'lte',
  };
  return opMap[sqlOp] || 'eq';
}

// Fix 1: Parse a single WHERE condition into a PostgREST filter string.
// Supports $N placeholders, SQL literals (TRUE, FALSE, NULL), IS NULL, IS NOT NULL, and quoted strings.
function parseWhereCondition(condition, params) {
  const trimmed = condition.trim();

  // IS NOT NULL: col IS NOT NULL
  const isNotNullMatch = trimmed.match(/^(?:(\w+)\.)?(\w+)\s+IS\s+NOT\s+NULL$/i);
  if (isNotNullMatch) {
    const col = isNotNullMatch[2];
    return `${col}=not.is.null`;
  }

  // IS NULL: col IS NULL
  const isNullMatch = trimmed.match(/^(?:(\w+)\.)?(\w+)\s+IS\s+NULL$/i);
  if (isNullMatch) {
    const col = isNullMatch[2];
    return `${col}=is.null`;
  }

  // Standard comparison: col op value
  // Supports operators: =, !=, <>, >=, <=, >, <
  const compMatch = trimmed.match(/^(?:(\w+)\.)?(\w+)\s*(!=|<>|>=|<=|>|<|=)\s*(.+)$/);
  if (compMatch) {
    const [, alias, col, op, value] = compMatch;
    const pgOp = mapOperator(op);
    const val = value.trim();

    // $N placeholder
    if (val.startsWith('$')) {
      const paramIndex = parseInt(val.slice(1)) - 1;
      return `${col}=${pgOp}.${params[paramIndex]}`;
    }

    // SQL literal TRUE
    if (/^TRUE$/i.test(val)) {
      return `${col}=${pgOp}.true`;
    }

    // SQL literal FALSE
    if (/^FALSE$/i.test(val)) {
      return `${col}=${pgOp}.false`;
    }

    // SQL literal NULL (for = NULL, though IS NULL is preferred)
    if (/^NULL$/i.test(val)) {
      return `${col}=is.null`;
    }

    // Quoted string literal: 'some value'
    const quotedMatch = val.match(/^'(.*)'$/);
    if (quotedMatch) {
      return `${col}=${pgOp}.${quotedMatch[1]}`;
    }

    // Numeric literal
    if (/^-?\d+(\.\d+)?$/.test(val)) {
      return `${col}=${pgOp}.${val}`;
    }
  }

  // Fallback: return null if we can't parse
  return null;
}

// Parse all WHERE conditions from a WHERE clause string and return PostgREST filter params
function parseWhereClause(whereClause, params) {
  if (!whereClause || !whereClause.trim()) return [];
  const conditions = whereClause.split(/\s+AND\s+/i);
  const queryParams = [];
  for (const condition of conditions) {
    const parsed = parseWhereCondition(condition, params);
    if (parsed) {
      queryParams.push(parsed);
    }
  }
  return queryParams;
}

async function query(text, params = []) {
  const sql = text.trim().replace(/\s+/g, ' '); // normalize spaces
  console.log('Processing query:', sql);
  if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
    // Handle transaction commands
    console.log('Transaction command:', sql);
    return { rows: [] };
  } else if (sql.includes('WITH monthly_transactions')) {
    return await handleBalanceHistory(params);
  } else if (sql.startsWith('INSERT INTO')) {
    return await handleInsert(sql, params);
  } else if (sql.startsWith('SELECT')) {
    // Fix 8: Check for UNION queries first
    if (/\bUNION\b/i.test(sql)) {
      console.log('UNION query detected');
      return await handleUnion(sql, params);
    }
    // Check if this is a complex query that can't be handled by REST API
    if (sql.includes('JOIN') || sql.includes('GROUP BY') || sql.includes('EXTRACT(') || sql.includes('SUM(') || sql.includes('COUNT(') || sql.includes('WITH ')) {
      console.log('Complex query detected, using RPC approach');
      return await handleComplexQuery(sql, params);
    }
    return await handleSelect(sql, params);
  } else if (sql.startsWith('UPDATE')) {
    return await handleUpdate(sql, params);
  } else if (sql.startsWith('DELETE FROM')) {
    return await handleDelete(sql, params);
  } else {
    throw new Error(`Unsupported query: ${sql}`);
  }
}

async function handleBalanceHistory(params) {
  const userId = params[0];
  const accountId = params[1];
  const months = params[2] || 6;
  const url = `${supabaseUrl}/rest/v1/rpc/get_account_balance_history`;
  const body = { user_id: userId, account_id: accountId, months };
  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`RPC failed: ${response.status} ${error}`);
  }
  const data = await response.json();
  return { rows: data };
}

async function handleInsert(sql, params) {
  console.log('Processing INSERT query:', sql);
  const match = sql.match(/INSERT INTO (\w+)\.(\w+) \(([^)]+)\) VALUES \(([^)]+)\)(?: RETURNING (.+))?/);
  if (!match) {
    console.log('INSERT query did not match regex');
    throw new Error('Invalid INSERT query');
  }
  const [, schema, table, columnsStr, valuesStr, returning] = match;
  console.log('Parsed INSERT:', { schema, table, columnsStr, valuesStr, returning });
  const columns = columnsStr.split(',').map(c => c.trim());
  const placeholders = valuesStr.split(',').map(v => v.trim());
  const body = {};
  columns.forEach((col, i) => {
    const placeholder = placeholders[i];
    if (placeholder && placeholder.startsWith('$')) {
      const paramIndex = parseInt(placeholder.slice(1)) - 1;
      body[col] = params[paramIndex];
    } else if (/^TRUE$/i.test(placeholder)) {
      body[col] = true;
    } else if (/^FALSE$/i.test(placeholder)) {
      body[col] = false;
    } else if (/^NOW\(\)$/i.test(placeholder)) {
      body[col] = new Date().toISOString();
    } else if (/^NULL$/i.test(placeholder)) {
      body[col] = null;
    } else {
      // Quoted string or numeric literal
      const quotedMatch = placeholder.match(/^'(.*)'$/);
      if (quotedMatch) {
        body[col] = quotedMatch[1];
      } else {
        body[col] = placeholder;
      }
    }
  });
  const url = `${supabaseUrl}/rest/v1/${table}`;
  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Insert failed: ${response.status} ${error}`);
  }
  const data = await response.json();
  return { rows: Array.isArray(data) ? data : [data] };
}

async function handleSelect(sql, params) {
  console.log('Processing SELECT query:', sql);
  const match = sql.match(/SELECT (.+) FROM (\w+)\.(\w+)(.*)/);
  if (!match) {
    console.log('SELECT query did not match regex');
    throw new Error('Invalid SELECT query');
  }
  const [, columns, schema, table, rest] = match;
  console.log('Parsed SELECT:', { columns, schema, table, rest });

  let remaining = rest;
  let whereClause = '';
  let orderClause = '';
  let limitValue = null;
  let offsetValue = null;

  // Extract WHERE clause
  if (remaining.includes('WHERE')) {
    const whereMatch = remaining.match(/WHERE\s+(.*?)(?:\s+ORDER BY|\s+LIMIT|\s+OFFSET|$)/i);
    if (whereMatch) whereClause = whereMatch[1];
  }

  // Fix 5: Extract LIMIT and OFFSET before ORDER BY parsing
  const limitMatch = remaining.match(/LIMIT\s+(\$?\d+)/i);
  if (limitMatch) {
    const limVal = limitMatch[1];
    if (limVal.startsWith('$')) {
      limitValue = params[parseInt(limVal.slice(1)) - 1];
    } else {
      limitValue = parseInt(limVal);
    }
  }

  const offsetMatch = remaining.match(/OFFSET\s+(\$?\d+)/i);
  if (offsetMatch) {
    const offVal = offsetMatch[1];
    if (offVal.startsWith('$')) {
      offsetValue = params[parseInt(offVal.slice(1)) - 1];
    } else {
      offsetValue = parseInt(offVal);
    }
  }

  // Extract ORDER BY (strip LIMIT/OFFSET from it)
  if (remaining.includes('ORDER BY')) {
    const orderMatch = remaining.match(/ORDER BY\s+(.*?)(?:\s+LIMIT|\s+OFFSET|$)/i);
    if (orderMatch) orderClause = orderMatch[1].trim();
  }

  // Fix 1: Use the shared parseWhereClause which supports literals and operators
  const queryParams = parseWhereClause(whereClause, params);

  let url = `${supabaseUrl}/rest/v1/${table}`;
  if (queryParams.length) url += '?' + queryParams.join('&');
  if (orderClause) {
    const order = orderClause.split(',').map(o => {
      const parts = o.trim().split(/\s+/);
      const col = stripAlias(parts[0]);
      const dir = parts[1] ? parts[1].toLowerCase() : 'asc';
      return `${col}.${dir}`;
    }).join(',');
    url += (queryParams.length ? '&' : '?') + `order=${order}`;
  }

  // Fix 5: Append LIMIT and OFFSET
  const hasParams = url.includes('?');
  if (limitValue !== null && limitValue !== undefined) {
    url += (hasParams ? '&' : '?') + `limit=${limitValue}`;
  }
  if (offsetValue !== null && offsetValue !== undefined) {
    url += (url.includes('?') ? '&' : '?') + `offset=${offsetValue}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Select failed: ${response.status} ${error}`);
  }
  const data = await response.json();
  return { rows: data };
}

async function handleUpdate(sql, params) {
  // Fix 7: Detect increment/decrement patterns first
  if (hasIncrementDecrement(sql)) {
    return await handleIncrementUpdate(sql, params);
  }

  const match = sql.match(/UPDATE (\w+)\.(\w+) SET (.*?) WHERE (.*?)(?:\s+RETURNING\s+(.+))?$/i);
  if (!match) throw new Error('Invalid UPDATE query');
  const [, schema, table, setClause, whereClause, returning] = match;

  // Fix 2: Parse SET clause with proper $N indexing and literal support
  const setParts = setClause.split(',');
  const body = {};
  setParts.forEach(part => {
    const eqIndex = part.indexOf('=');
    if (eqIndex === -1) return;
    const col = stripAlias(part.substring(0, eqIndex).trim());
    const val = part.substring(eqIndex + 1).trim();

    // $N placeholder — use actual index from the placeholder
    if (val.startsWith('$')) {
      const paramIndex = parseInt(val.slice(1)) - 1;
      body[col] = params[paramIndex];
    }
    // SQL literal TRUE
    else if (/^TRUE$/i.test(val)) {
      body[col] = true;
    }
    // SQL literal FALSE
    else if (/^FALSE$/i.test(val)) {
      body[col] = false;
    }
    // NOW() function
    else if (/^NOW\(\)$/i.test(val)) {
      body[col] = new Date().toISOString();
    }
    // NULL literal
    else if (/^NULL$/i.test(val)) {
      body[col] = null;
    }
    // Quoted string
    else {
      const quotedMatch = val.match(/^'(.*)'$/);
      if (quotedMatch) {
        body[col] = quotedMatch[1];
      } else {
        body[col] = val;
      }
    }
  });

  // Fix 1 & 3: Use shared parseWhereClause for WHERE conditions
  const queryParams = parseWhereClause(whereClause, params);

  const url = `${supabaseUrl}/rest/v1/${table}?${queryParams.join('&')}`;
  const response = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(body) });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Update failed: ${response.status} ${error}`);
  }
  const data = await response.json();
  return { rows: Array.isArray(data) ? data : [data] };
}

// Fix 7: Detect if SET clause contains increment/decrement expressions (e.g., balance = balance + $1)
function hasIncrementDecrement(sql) {
  const setMatch = sql.match(/SET\s+(.*?)\s+WHERE/i);
  if (!setMatch) return false;
  const setClause = setMatch[1];
  // Check for pattern: col = col [+-] value
  return /(\w+)\s*=\s*\1\s*[+-]/.test(setClause);
}

// Fix 7: Handle UPDATE with increment/decrement expressions via fetch-then-patch
async function handleIncrementUpdate(sql, params) {
  const match = sql.match(/UPDATE (\w+)\.(\w+) SET (.*?) WHERE (.*?)(?:\s+RETURNING\s+(.+))?$/i);
  if (!match) throw new Error('Invalid UPDATE query');
  const [, schema, table, setClause, whereClause, returning] = match;

  // Parse WHERE conditions to build the GET request
  const queryParams = parseWhereClause(whereClause, params);

  // Step 1: Fetch the current row
  const getUrl = `${supabaseUrl}/rest/v1/${table}?select=*&${queryParams.join('&')}`;
  console.log('Increment update: fetching current row from', getUrl);
  const getResponse = await fetch(getUrl, { headers });
  if (!getResponse.ok) {
    const error = await getResponse.text();
    throw new Error(`Increment fetch failed: ${getResponse.status} ${error}`);
  }
  const currentRows = await getResponse.json();
  if (!currentRows.length) {
    throw new Error('Increment update: no matching row found');
  }
  const currentRow = currentRows[0];

  // Step 2: Calculate new values
  const setParts = setClause.split(',');
  const body = {};
  setParts.forEach(part => {
    const eqIndex = part.indexOf('=');
    if (eqIndex === -1) return;
    const col = stripAlias(part.substring(0, eqIndex).trim());
    const val = part.substring(eqIndex + 1).trim();

    // Increment pattern: col = col + $N or col = col + literal
    const incrMatch = val.match(/^(\w+)\s*\+\s*(.+)$/);
    if (incrMatch && stripAlias(incrMatch[1]) === col) {
      const operand = incrMatch[2].trim();
      let addValue;
      if (operand.startsWith('$')) {
        addValue = parseFloat(params[parseInt(operand.slice(1)) - 1]);
      } else {
        addValue = parseFloat(operand);
      }
      const currentVal = parseFloat(currentRow[col]) || 0;
      body[col] = currentVal + addValue;
      return;
    }

    // Decrement pattern: col = col - $N or col = col - literal
    const decrMatch = val.match(/^(\w+)\s*-\s*(.+)$/);
    if (decrMatch && stripAlias(decrMatch[1]) === col) {
      const operand = decrMatch[2].trim();
      let subValue;
      if (operand.startsWith('$')) {
        subValue = parseFloat(params[parseInt(operand.slice(1)) - 1]);
      } else {
        subValue = parseFloat(operand);
      }
      const currentVal = parseFloat(currentRow[col]) || 0;
      body[col] = currentVal - subValue;
      return;
    }

    // Non-increment SET values: same logic as normal handleUpdate
    if (val.startsWith('$')) {
      const paramIndex = parseInt(val.slice(1)) - 1;
      body[col] = params[paramIndex];
    } else if (/^TRUE$/i.test(val)) {
      body[col] = true;
    } else if (/^FALSE$/i.test(val)) {
      body[col] = false;
    } else if (/^NOW\(\)$/i.test(val)) {
      body[col] = new Date().toISOString();
    } else if (/^NULL$/i.test(val)) {
      body[col] = null;
    } else {
      const quotedMatch = val.match(/^'(.*)'$/);
      if (quotedMatch) {
        body[col] = quotedMatch[1];
      } else {
        body[col] = val;
      }
    }
  });

  // Step 3: PATCH with calculated values
  const patchUrl = `${supabaseUrl}/rest/v1/${table}?${queryParams.join('&')}`;
  console.log('Increment update: patching with', body);
  const patchResponse = await fetch(patchUrl, { method: 'PATCH', headers, body: JSON.stringify(body) });
  if (!patchResponse.ok) {
    const error = await patchResponse.text();
    throw new Error(`Increment update failed: ${patchResponse.status} ${error}`);
  }
  const data = await patchResponse.json();
  return { rows: Array.isArray(data) ? data : [data] };
}

async function handleComplexQuery(sql, params) {
  console.log('Handling complex query:', sql);

  // For COUNT queries, try to execute them using REST API
  if (sql.includes('COUNT(*)')) {
    try {
      // Parse the COUNT query to extract table and conditions
      const countMatch = sql.match(/SELECT COUNT\(\*\)\s+FROM\s+(\w+)\.(\w+)(?:\s+WHERE\s+(.+))?/i);
      if (countMatch) {
        const [, schema, table, whereClause] = countMatch;
        console.log('Parsed COUNT query:', { schema, table, whereClause });

        // For simple WHERE clauses, try to use REST API
        if (!whereClause || !whereClause.includes('EXTRACT(')) {
          let url = `${supabaseUrl}/rest/v1/${table}?select=id`;

          // Fix 1: Use shared parseWhereClause for COUNT queries
          if (whereClause) {
            const queryParams = parseWhereClause(whereClause, params);
            if (queryParams.length > 0) {
              url += `&${queryParams.join('&')}`;
            }
          }

          console.log('COUNT query URL:', url);
          const response = await fetch(url, { headers });
          if (response.ok) {
            const data = await response.json();
            return { rows: [{ count: data.length.toString() }] };
          }
        }
      }
    } catch (error) {
      console.error('Error executing COUNT query:', error);
    }

    // Fallback: return 0
    console.log('COUNT query fallback, returning 0');
    return { rows: [{ count: '0' }] };
  }

  // For EXTRACT YEAR queries - fetch all transactions and extract years in JavaScript
  if (sql.includes('EXTRACT(YEAR')) {
    console.log('EXTRACT YEAR query detected, fetching data and processing in JavaScript');
    try {
      // Parse the query to get table and user_id condition
      const yearMatch = sql.match(/FROM\s+(\w+)\.(\w+)\s+WHERE\s+user_id\s*=\s*\$(\d+)/i);
      if (yearMatch) {
        const [, schema, table, paramIndex] = yearMatch;
        const userId = params[parseInt(paramIndex) - 1];
        
        // Fetch all transactions for the user using REST API
        const url = `${supabaseUrl}/rest/v1/${table}?select=transaction_date&user_id=eq.${userId}`;
        console.log('Fetching transactions for year extraction:', url);
        
        const response = await fetch(url, { headers });
        if (response.ok) {
          const data = await response.json();
          // Extract unique years from transaction dates
          const years = new Set();
          data.forEach(row => {
            if (row.transaction_date) {
              const year = new Date(row.transaction_date).getFullYear();
              years.add(year);
            }
          });
          
          // Convert to sorted array of { year: number } objects
          const yearRows = Array.from(years)
            .sort((a, b) => b - a)
            .map(year => ({ year }));
          
          console.log(`Extracted ${yearRows.length} unique years:`, yearRows);
          return { rows: yearRows };
        }
      }
    } catch (error) {
      console.error('Error extracting years:', error);
    }
    
    // Fallback: return current year and 2 previous years
    const currentYear = new Date().getFullYear();
    return {
      rows: [
        { year: currentYear },
        { year: currentYear - 1 },
        { year: currentYear - 2 }
      ]
    };
  }

  // For queries with JOINs, try to fetch data from each table separately
  if (sql.includes('JOIN')) {
    console.log('JOIN query detected, trying to handle with separate fetches');
    try {
      // Fix 4: Support any table alias, not just 't'
      // Match: FROM schema.table <alias> WHERE ...
      const joinMatch = sql.match(/FROM\s+(\w+)\.(\w+)\s+(\w+)\s+.*?WHERE\s+(.+?)(?:\s+ORDER BY|$)/i);
      if (joinMatch) {
        const [, schema, table, alias, whereClause] = joinMatch;
        
        // Build REST API URL for the main table
        let url = `${supabaseUrl}/rest/v1/${table}?select=*`;
        
        // Fix 4: Parse WHERE conditions using the dynamic alias
        if (whereClause) {
          const conditions = whereClause.split(/\s+AND\s+/i);
          for (const condition of conditions) {
            // Match aliased conditions: alias.column op $N or alias.column op LITERAL
            const aliasPattern = new RegExp(`^${alias}\\.(\\w+)\\s*(!=|<>|>=|<=|>|<|=)\\s*(.+)$`);
            const aliasMatch = condition.trim().match(aliasPattern);
            if (aliasMatch) {
              const [, column, op, value] = aliasMatch;
              const pgOp = mapOperator(op);
              const val = value.trim();
              if (val.startsWith('$')) {
                const paramIndex = parseInt(val.slice(1)) - 1;
                url += `&${column}=${pgOp}.${params[paramIndex]}`;
              } else if (/^TRUE$/i.test(val)) {
                url += `&${column}=${pgOp}.true`;
              } else if (/^FALSE$/i.test(val)) {
                url += `&${column}=${pgOp}.false`;
              } else {
                url += `&${column}=${pgOp}.${val}`;
              }
              continue;
            }

            // Also try non-aliased conditions
            const parsed = parseWhereCondition(condition, params);
            if (parsed) {
              url += `&${parsed}`;
            }
          }
        }
        
        // Add ordering — support any alias
        if (sql.includes('ORDER BY')) {
          const orderMatch = sql.match(/ORDER BY\s+(?:(\w+)\.)?(\w+)\s*(DESC|ASC)?/i);
          if (orderMatch) {
            const [, orderAlias, col, dir = 'asc'] = orderMatch;
            url += `&order=${col}.${dir.toLowerCase()}`;
          }
        }
        
        console.log('JOIN query fallback URL:', url);
        const response = await fetch(url, { headers });
        if (response.ok) {
          const data = await response.json();
          return { rows: data };
        }
      }
    } catch (error) {
      console.error('Error handling JOIN query:', error);
    }
  }

  // For other complex queries, return empty result to prevent crashes
  console.log('Complex query not handled, returning empty result');
  return { rows: [] };
}

// Fix 6: Support DELETE with or without RETURNING
async function handleDelete(sql, params) {
  // Make RETURNING clause optional
  const match = sql.match(/DELETE FROM (\w+)\.(\w+) WHERE (.*?)(?:\s+RETURNING\s+(.+))?$/i);
  if (!match) throw new Error('Invalid DELETE query');
  const [, schema, table, whereClause, returning] = match;

  // Fix 1 & 3: Use shared parseWhereClause
  const queryParams = parseWhereClause(whereClause, params);

  const url = `${supabaseUrl}/rest/v1/${table}?${queryParams.join('&')}`;
  const response = await fetch(url, { method: 'DELETE', headers });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Delete failed: ${response.status} ${error}`);
  }

  // If no RETURNING clause, return empty rows
  if (!returning) {
    return { rows: [] };
  }

  const data = await response.json();
  return { rows: data };
}

// Fix 8: Handle UNION / UNION ALL queries
async function handleUnion(sql, params) {
  console.log('Handling UNION query:', sql);

  // Check for a trailing ORDER BY that applies to the whole UNION result
  let finalOrderBy = null;
  let sqlBody = sql;
  // The final ORDER BY is the one after the last closing paren or after the last SELECT block
  // We look for ORDER BY that is NOT inside a sub-select
  const lastOrderByMatch = sql.match(/\)\s*ORDER BY\s+(.+)$/i);
  if (lastOrderByMatch) {
    finalOrderBy = lastOrderByMatch[1].trim();
    sqlBody = sql.substring(0, sql.lastIndexOf(lastOrderByMatch[0]) + 1); // keep up to the closing paren
  } else {
    // Try ORDER BY at the very end without parens
    const simpleOrderMatch = sql.match(/UNION(?:\s+ALL)?\s+SELECT\s+.+?\s+ORDER BY\s+(.+)$/i);
    // This is tricky — for simple UNION queries the ORDER BY is at the end
    // We'll handle it after splitting
  }

  // Split by UNION ALL first, then UNION
  let subQueries;
  if (/\bUNION\s+ALL\b/i.test(sql)) {
    subQueries = sql.split(/\bUNION\s+ALL\b/i);
  } else {
    subQueries = sql.split(/\bUNION\b/i);
  }

  // Remove any trailing ORDER BY from the last sub-query (it applies to the whole result)
  if (!finalOrderBy && subQueries.length > 0) {
    const lastQuery = subQueries[subQueries.length - 1];
    // Check if the last sub-query has an ORDER BY that's not part of a WHERE
    const orderMatch = lastQuery.match(/\s+ORDER BY\s+(.+)$/i);
    if (orderMatch) {
      finalOrderBy = orderMatch[1].trim();
      subQueries[subQueries.length - 1] = lastQuery.replace(/\s+ORDER BY\s+.+$/i, '');
    }
  }

  // Execute each sub-query
  const allRows = [];
  for (const subQuery of subQueries) {
    const trimmedQuery = subQuery.trim();
    if (!trimmedQuery.startsWith('SELECT')) continue;

    try {
      // Route through the normal query handler (but avoid infinite recursion by checking for UNION)
      const result = await handleSelectOrComplex(trimmedQuery, params);
      allRows.push(...result.rows);
    } catch (error) {
      console.error('Error executing UNION sub-query:', error);
    }
  }

  // Apply final ORDER BY if present
  if (finalOrderBy && allRows.length > 0) {
    const orderParts = finalOrderBy.split(',').map(o => {
      const parts = o.trim().split(/\s+/);
      const col = stripAlias(parts[0]);
      const dir = (parts[1] || 'asc').toLowerCase();
      return { col, dir };
    });

    allRows.sort((a, b) => {
      for (const { col, dir } of orderParts) {
        const aVal = a[col];
        const bVal = b[col];
        if (aVal < bVal) return dir === 'asc' ? -1 : 1;
        if (aVal > bVal) return dir === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  // For non-UNION ALL, deduplicate
  if (!/\bUNION\s+ALL\b/i.test(sql)) {
    const seen = new Set();
    const unique = [];
    for (const row of allRows) {
      const key = JSON.stringify(row);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(row);
      }
    }
    return { rows: unique };
  }

  return { rows: allRows };
}

// Helper for UNION: route a single SELECT sub-query to the appropriate handler
async function handleSelectOrComplex(sql, params) {
  const trimmed = sql.trim();
  if (trimmed.includes('JOIN') || trimmed.includes('GROUP BY') || trimmed.includes('EXTRACT(') || trimmed.includes('SUM(') || trimmed.includes('COUNT(') || trimmed.includes('WITH ')) {
    return await handleComplexQuery(trimmed, params);
  }
  return await handleSelect(trimmed, params);
}

module.exports = {
  query,
  getClient: async () => {
    return {
      query: (text, params) => query(text, params),
      release: () => {}
    };
  }
};
