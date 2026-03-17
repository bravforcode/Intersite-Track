export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: string;
  reference_id: number;
  is_read: number;
  created_at: string;
}
