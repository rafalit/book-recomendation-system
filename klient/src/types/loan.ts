export type Loan = {
  id: number;
  book_id: number;
  user_id: number;      
  start_date: string;
  due_date: string;
  returned_at?: string | null;
  book?: {
    id: number;
    title: string;
    authors: string;
    thumbnail?: string;
  };
};