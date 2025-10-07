import api from "./api";

export type ForumPost = {
  id: number;
  title: string;
  summary: string;
  body: string;
  topic: string;
  created_at: string;
  author: { id: number; first_name: string; last_name: string; role: "student"|"researcher"|"admin"; university?: string | null; academic_title?: string | null };
  reactions: Record<string, number>;
  reactions_emoji?: Record<string, string>;
  user_reaction?: string | null;
  replies_count: number;
  books?: Array<{
    id: number;
    title: string;
    authors: string;
    thumbnail?: string;
  }>;
};

export type ForumReplyTree = {
  id: number;
  body: string;
  created_at: string;
  author: { id: number; first_name: string; last_name: string; role: string };
  children?: ForumReplyTree[];
};

export async function fetchPosts(params: { q?: string; topic?: string; sort?: string } = {}) {
  const res = await api.get<ForumPost[]>("/forum", { params });
  return res.data;
}

export async function fetchPost(id: string | number) {
  const res = await api.get(`/forum/${id}`);
  return res.data as ForumPost & { replies: ForumReplyTree[] };
}

export async function createPost(payload: {
  title: string; summary: string; body: string; topic: string; university?: string; book_ids?: number[]
}) {
  const res = await api.post("/forum", payload);
  return res.data as { id: number };
}

export async function addReply(postId: number, body: string) {
  const res = await api.post(`/forum/${postId}/reply`, { body });
  return res.data;
}

export async function react(postId: number, type: string | null) {
  const res = await api.post(`/forum/${postId}/react`, { type });
  return res.data;
}

export async function report(postId: number, reason?: string) {
  const res = await api.post(`/forum/${postId}/report`, { reason });
  return res.data;
}

export async function reactToReply(replyId: number, type: "up"|"down") {
  const r = await api.post(`/forum/reply/${replyId}/react`, { type });
  return r.data as { counts: { up: number; down: number } };
}
export async function reportReply(replyId: number, reason?: string) {
  await api.post(`/forum/reply/${replyId}/report`, { reason });
}
export async function deleteReply(replyId: number) {
  await api.delete(`/forum/reply/${replyId}`);
}