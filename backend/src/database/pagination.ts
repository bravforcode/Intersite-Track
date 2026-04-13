import { db } from "../config/firebase-admin.js";

export interface PaginationResult<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}

/**
 * Cursor-based pagination for Firestore queries.
 * Returns limit+1 documents to determine if more pages exist.
 */
export async function paginate<T>(
  query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData>,
  limit: number = 50,
  cursor?: string,
  mapFn?: (data: any) => T
): Promise<PaginationResult<T>> {
  if (limit < 1) limit = 50;
  if (limit > 1000) limit = 1000; // Safety cap

  let q = query;

  // If cursor provided, start after that document
  if (cursor) {
    const cursorDoc = await db.collection("tasks").doc(cursor).get();
    if (cursorDoc.exists) {
      q = q.startAfter(cursorDoc);
    }
  }

  // Fetch limit+1 to determine if there are more pages
  const snap = await q.limit(limit + 1).get();

  const items = snap.docs
    .slice(0, limit)
    .map((doc) => (mapFn ? mapFn(doc.data()) : (doc.data() as T)));

  return {
    items,
    nextCursor: snap.docs.length > limit ? snap.docs[limit].id : undefined,
    hasMore: snap.docs.length > limit,
  };
}

/**
 * Get total count of documents for a query.
 * WARNING: This reads a document for each count() call. Use sparingly.
 * For production, consider maintaining count in a separate collection.
 */
export async function getQueryCount(
  query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData>
): Promise<number> {
  const snap = await query.count().get();
  return snap.data().count;
}
