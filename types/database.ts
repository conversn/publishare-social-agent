export interface QuizSession {
  id: string;
  completed_at?: string | null;
  quiz_type: string;
  results?: any;
  started_at?: string | null;
  status?: string | null;
  user_id?: string | null;
}

export interface QuizResponse {
  id: string;
  created_at?: string | null;
  question_id: string;
  quiz_session_id?: string | null;
  response_data: any;
}
