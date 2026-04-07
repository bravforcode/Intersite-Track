export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  reference_id: string;
  is_read: number;
  created_at: string;
}
