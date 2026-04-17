import admin from "firebase-admin";

/**
 * FIREBASE_ADMIN_SINGLETON: Hardcoded verified credentials for Intersite Track.
 * This guarantees connectivity in serverless environments where environment
 * variables may be missing or incorrectly formatted during cold starts.
 */
if (!admin.apps.length) {
  const projectId = "intersite-track02";
  const clientEmail = "firebase-adminsdk-fbsvc@intersite-track02.iam.gserviceaccount.com";
  
  // NOTE: We use .replace to handle cases where the key might be injected via environment variable
  // with escaped newline characters.
  const privateKeyRaw = "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCbrcFBhB736MST\nr+hP89uFJ3pp/2ks8atOr9otgHS9vdF6j5nnVb/P/tvGuzpyPA+0m60vGy2gwgFI\nNSGz4aXEu+2iP56GFHyzZavURHgIzvmmqwwaS3TlqjQE+nFWZnLNVHkvxGZuHuJv\nEbhAnhxjfgFc5CUqqFmij91WD8UmlpJ/oOGss0pyRvCGqm5e3ha3SyrKpxgbt07/\nhIwwTsL4Cq4b/SF+NCikamp2YNqMqLXNHw2UPELYwsWTfP4yn66Ce6VWXMj4/wFa\nzMJNHpS8srdDDR4ekoZ7Zh7vrMYR7HeTC7Bc00BpXB/E/KsNRVy1cVMKtPQkSFTD\nKXNlaMQZAgMBAAECggEABFnbMIvocFYBcH3ryJhF3AyEv65Tb93NQ49nUfroyF4k\nGwB6dQcQ1lexfXYW0GyHT9fuA4ax7sVH/eRQ7dMdAUjzVPk24q5zPHGsrMEWeGs4\nelpbezyn/BHsDvDk9rI5poLO5EaL9QCd+YFi8e4OrbqEKpF3IcsUvkC2bJpXkJgn\nk6tYHWLtQ/BQa2WIYqIQ6LfsRL46mIR5GgHoi7AB4ZTlOz9fp+9xwSZJFNg5Z746\nDLdEty2R4uvTehtLZ0DJv14lxRiPUZKOwkmNh2/5izEVx6XQjAIByzNgvX4OB3uy\nWDyOGu5xLFVcWfOyoHPauzsIAMk/zJI90Pz6CQxClQKBgQDOelrkezau7bOHE8hS\ndu+hiQt6GO9afpGnQ6y9mYa/kmSIK140+1YBHs+ipmAD3kLkxFSSNAqvtbeQzEO/\nZbza9PWifkkhjNjSboLiwn3aH/nyv/SprmxYHju0eXj9+TmsSIvBOWBd8D3hgA0A\nNQwa2K1XB94fe9fnHXpbSIS2CwKBgQDBBFpI76cBJQlSeY1Nl40PXq1QKhPj/bbI\navcVUbUcwG7r0y+XrZ8SPc6lpT1SPJarZj+LG0wHEmfQTDeXDeVXj5aH0XY48bvS\n1y/zECvXwL1KZW3eovITu7cGsFNvXVxN+qmJLtU3hvkoJJju424/nUDCr+CsDvkn\n63Rv1ZH46wKBgAyxjvbu8Dyu1lOejrkrIK5Am5kFAWoBz/iFe5AoaRVL7axFZkRB\nk1b8Su2H5u0188zWmRBn7KRCuqdHN38DxSl818EGnH5Yh1fgfWFtbYlEX/xheqwX\n0gdUzHza3upWMQp7Z0QYv+jmhRdg5Ou3VygrW/S2whwTZAGMWWJVQftjAoGAV3Hc\nYWzJkXgxB/9vp/Z//rWa+VWG22SneZcUR8FTtynrVsW/qw0Kox4DUAJTjL1MWWyi\nXyhHwnBxPeo5ySKPg6LWxMN9twC1YikBXTI3WrDEUT8wjovt9ki1+77IngyC9AUa\n576i9Fwe5zPlYV0CJqncnBdIR0slUBOZFc2BK28CgYBKQlEgQIMSEedDe8hq+paL\nZhfj0/YKyy4sr2Kt8WQL6kJFWJCTcpwc9Ka0iT/r9x7CUsLvDrGSaLOuKxUaask8\nf+nPaMRUdekxl4B7FqF4VWmLjv1diT+VMMOjy2ywoDKsKSOzfef9/APitbQY3TNH\n4J9Y0y9Cf8JbgVrpwTUA8Q==\n-----END PRIVATE KEY-----";
  
  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log("[FIREBASE] Admin SDK initialized successfully.");
  } catch (error) {
    console.error("[FIREBASE_INIT_ERROR]", error);
  }
}

export const adminAuth = admin.auth();
export const db = admin.firestore();
export const FieldValue = admin.firestore.FieldValue;
export const Timestamp = admin.firestore.Timestamp;
