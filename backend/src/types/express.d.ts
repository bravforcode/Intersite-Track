declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
      user?: {
        id: string;
        userId: string;
        authId: string;
        email: string | null;
        username: string;
        role: string;
        first_name?: string;
        last_name?: string;
        department_id?: string | null;
        department_name?: string | null;
        position?: string | null;
        created_at?: string;
      };
    }
  }
}

export {};
