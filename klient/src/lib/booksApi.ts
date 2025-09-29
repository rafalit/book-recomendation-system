import api from "./api";
import { Book } from "../components/books/BookCard";

export type Loan = {
  id: number;
  book_id: number;
  user_id: number;
  start_date: string;
  due_date: string;
  returned_at?: string | null;
};

export async function fetchMyLoans(): Promise<Loan[]> {
  const r = await api.get<Loan[]>("/books/loans/me");
  return r.data;
}

export async function fetchMyActiveLoans(): Promise<Loan[]> {
  const r = await api.get<Loan[]>("/books/loans/active");
  return r.data;
}
