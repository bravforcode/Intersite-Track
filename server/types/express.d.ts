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
      };
    }
  }
}

export {};
