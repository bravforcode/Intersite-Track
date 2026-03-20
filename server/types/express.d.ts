declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        userId: number;
        authId: string;
        email: string | null;
        username: string;
        role: string;
        first_name?: string;
        last_name?: string;
        department_id?: number | null;
        department_name?: string | null;
        position?: string | null;
        created_at?: string;
      };
    }
  }
}

export {};
