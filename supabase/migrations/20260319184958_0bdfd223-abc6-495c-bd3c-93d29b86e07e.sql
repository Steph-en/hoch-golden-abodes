
-- Fix permissive activity_logs insert policy - restrict to own user_id
DROP POLICY "System can insert activity" ON public.activity_logs;
CREATE POLICY "Users can insert own activity" ON public.activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
