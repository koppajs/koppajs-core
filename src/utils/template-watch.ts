import { isSimplePathExpression } from './helper'

const MUSTACHE_RE = /\{\{([\s\S]+?)\}\}/g

const STRIP_STRINGS_RE = /(["'`])(?:\\.|(?!\1)[^\\])*\1/g // removes "..." '...' `...`

const PATH_EXPR_RE =
  /[A-Za-z_$][0-9A-Za-z_$]*(?:\[(?:\d+|\w+)\]|\.[A-Za-z_$][0-9A-Za-z_$]*)*/g

const KEYWORDS = new Set([
  'true',
  'false',
  'null',
  'undefined',
  'NaN',
  'Infinity',
  'this',
  // common built-ins (optional, conservative)
  'Math',
  'Date',
  'JSON',
  'Object',
  'Array',
  'Number',
  'String',
  'Boolean',
])

function normalizeExpr(expr: string): string {
  return expr.replace(/\?\./g, '.').trim() // normalize optional chaining
}

function stripStrings(expr: string): string {
  return expr.replace(STRIP_STRINGS_RE, '')
}

function extractFromExpression(expression: string): string[] {
  const exp = normalizeExpr(expression)
  if (!exp) return []

  // simplest case: direct path
  if (isSimplePathExpression(exp)) return [exp]

  // complex expression: split into segments
  const safe = stripStrings(exp)

  const out: string[] = []

  for (const match of safe.matchAll(PATH_EXPR_RE)) {
    const segment = match[0]
    if (!segment || KEYWORDS.has(segment)) continue

    // If "(" follows the segment, it's likely a function call
    const start = match.index ?? 0
    const after = safe.slice(start + segment.length).trimStart()
    if (after.startsWith('(')) continue

    out.push(segment)
  }

  return out
}

/**
 * Extracts property paths from template expressions for automatic watching.
 * Parses {{ expression }} syntax and extracts simple property paths.
 * @param templateHtml - Template HTML string
 * @returns Array of unique property paths to watch
 */
export function extractWatchListFromTemplate(templateHtml: string): string[] {
  const found: string[] = []
  let match: RegExpExecArray | null

  while ((match = MUSTACHE_RE.exec(templateHtml))) {
    const expr = match[1]?.trim() ?? ''
    if (!expr) continue
    found.push(...extractFromExpression(expr))
  }

  // deduplicate while preserving order
  return Array.from(new Set(found))
}
