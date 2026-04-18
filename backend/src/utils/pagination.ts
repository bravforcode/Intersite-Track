/**
 * Pagination Helper for Firestore Queries
 * 
 * Supports both offset-based and cursor-based pagination.
 * Cursor-based is more efficient for large datasets.
 */

import type { DocumentSnapshot } from "firebase-admin/firestore";

/**
 * Pagination metadata for responses
 */
export interface PaginationMeta {
  total: number;
  offset: number;
  limit: number;
  has_more: boolean;
  cursor?: string;
}

/**
 * Paginated response envelope
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Build pagination metadata for offset-based pagination
 * 
 * @param total - Total count of items
 * @param offset - Current offset
 * @param limit - Items per page
 * @returns Pagination metadata
 */
export function buildOffsetPagination(
  total: number,
  offset: number,
  limit: number
): PaginationMeta {
  return {
    total,
    offset,
    limit,
    has_more: offset + limit < total,
  };
}

/**
 * Build pagination metadata for cursor-based pagination
 * 
 * @param items - Retrieved items
 * @param limit - Expected limit
 * @param cursor - Optional cursor for next page
 * @returns Pagination metadata
 */
export function buildCursorPagination(
  items: any[],
  limit: number,
  cursor?: string
): PaginationMeta {
  return {
    total: -1, // Unknown with cursor-based
    offset: 0,
    limit,
    has_more: items.length >= limit,
    cursor,
  };
}

/**
 * Create a cursor from a Firestore document
 * Cursor is a base64-encoded snapshot of the last document
 * 
 * @param doc - Last document in current page
 * @returns Base64 cursor for next page
 */
export function createCursor(doc: DocumentSnapshot): string {
  // In production, you'd serialize the doc's id or key fields
  // For simplicity, we use the doc id
  return Buffer.from(doc.id).toString("base64");
}

/**
 * Decode cursor to get starting point for next query
 * 
 * @param cursor - Base64 encoded cursor
 * @returns Decoded document ID
 */
export function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, "base64").toString("utf-8");
}

/**
 * Wrap query results in paginated response
 * 
 * @param data - Query results
 * @param pagination - Pagination metadata
 * @returns Paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginationMeta
): PaginatedResponse<T> {
  return { data, pagination };
}

/**
 * Parse pagination params from HTTP request
 * 
 * @param query - Express query object
 * @returns Pagination params { limit, offset }
 */
export function parsePaginationParams(query: any): {
  limit: number;
  offset: number;
} {
  const rawLimit = Number.parseInt(query.limit ?? "50", 10);
  const rawOffset = Number.parseInt(query.offset ?? "0", 10);

  // Guard against NaN (non-numeric query params) with safe defaults
  const limit = Math.min(Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 50, 500);
  const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

  return { limit, offset };
}

/**
 * Validate pagination bounds
 * 
 * @param total - Total items available
 * @param offset - Requested offset
 * @param limit - Requested limit
 * @returns Valid { offset, limit }
 */
export function validatePaginationBounds(
  total: number,
  offset: number,
  limit: number
): { offset: number; limit: number } {
  if (offset > total) {
    return { offset: 0, limit };
  }

  if (offset + limit > total) {
    return { offset, limit: total - offset };
  }

  return { offset, limit };
}
