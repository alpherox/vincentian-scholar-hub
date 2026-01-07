import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { createNotification } from '@/integrations/supabase/helpers';
import type { QAQuestion, QAAnswer } from '@/types';

export function useQAQuestions(researchId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['qa-questions', researchId],
    queryFn: async () => {
      if (!researchId) return [];

      const { data: questions, error } = await supabase
        .from('qa_questions')
        .select(`
          *,
          profiles!qa_questions_user_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .eq('research_id', researchId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get answers for each question
      const questionIds = questions.map(q => q.id);
      
      const { data: answers } = await supabase
        .from('qa_answers')
        .select(`
          *,
          profiles!qa_answers_user_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .in('question_id', questionIds)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      // Get user's upvotes
      let userUpvotes: { question_id: string | null; answer_id: string | null }[] = [];
      if (user) {
        const { data } = await supabase
          .from('qa_upvotes')
          .select('question_id, answer_id')
          .eq('user_id', user.id);
        userUpvotes = data || [];
      }

      const questionsWithAnswers: QAQuestion[] = questions.map(q => ({
        ...q,
        user_name: q.profiles?.full_name,
        user_avatar: q.profiles?.avatar_url,
        user_has_upvoted: userUpvotes.some(u => u.question_id === q.id),
        answers: (answers || [])
          .filter(a => a.question_id === q.id)
          .map(a => ({
            ...a,
            user_name: a.profiles?.full_name,
            user_avatar: a.profiles?.avatar_url,
            user_has_upvoted: userUpvotes.some(u => u.answer_id === a.id),
          })) as QAAnswer[],
      }));

      return questionsWithAnswers;
    },
    enabled: !!researchId,
  });
}

export function useCreateQuestion() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ researchId, content }: { researchId: string; content: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('qa_questions')
        .insert({
          research_id: researchId,
          user_id: user.id,
          content,
        })
        .select()
        .single();

      if (error) throw error;

      // Notify the research author
      const { data: research } = await supabase
        .from('researches')
        .select('author_id, title')
        .eq('id', researchId)
        .single();

      if (research && research.author_id !== user.id) {
        await createNotification(
          research.author_id,
          'New Question on Your Research',
          `Someone asked a question on "${research.title}"`,
          'info',
          `/research/${researchId}`
        );
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['qa-questions', variables.researchId] });
    },
  });
}

export function useCreateAnswer() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ questionId, researchId, content }: { 
      questionId: string; 
      researchId: string;
      content: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('qa_answers')
        .insert({
          question_id: questionId,
          user_id: user.id,
          content,
        })
        .select()
        .single();

      if (error) throw error;

      // Notify the question author
      const { data: question } = await supabase
        .from('qa_questions')
        .select('user_id')
        .eq('id', questionId)
        .single();

      if (question && question.user_id !== user.id) {
        await createNotification(
          question.user_id,
          'New Answer to Your Question',
          `Someone answered your question`,
          'info',
          `/research/${researchId}`
        );
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['qa-questions', variables.researchId] });
    },
  });
}

export function useToggleUpvote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      questionId, 
      answerId,
      researchId,
      hasUpvoted 
    }: { 
      questionId?: string;
      answerId?: string;
      researchId: string;
      hasUpvoted: boolean;
    }) => {
      if (!user) throw new Error('Not authenticated');

      if (hasUpvoted) {
        // Remove upvote
        let query = supabase.from('qa_upvotes').delete().eq('user_id', user.id);
        
        if (questionId) {
          query = query.eq('question_id', questionId);
        } else if (answerId) {
          query = query.eq('answer_id', answerId);
        }

        const { error } = await query;
        if (error) throw error;

        // Decrement counter
        if (questionId) {
          const { data: q } = await supabase
            .from('qa_questions')
            .select('upvotes')
            .eq('id', questionId)
            .single();
          
          await supabase
            .from('qa_questions')
            .update({ upvotes: Math.max(0, (q?.upvotes || 1) - 1) })
            .eq('id', questionId);
        } else if (answerId) {
          const { data: a } = await supabase
            .from('qa_answers')
            .select('upvotes')
            .eq('id', answerId)
            .single();
          
          await supabase
            .from('qa_answers')
            .update({ upvotes: Math.max(0, (a?.upvotes || 1) - 1) })
            .eq('id', answerId);
        }
      } else {
        // Add upvote
        const { error } = await supabase
          .from('qa_upvotes')
          .insert({
            user_id: user.id,
            question_id: questionId || null,
            answer_id: answerId || null,
          });

        if (error) throw error;

        // Increment counter
        if (questionId) {
          const { data: q } = await supabase
            .from('qa_questions')
            .select('upvotes')
            .eq('id', questionId)
            .single();
          
          await supabase
            .from('qa_questions')
            .update({ upvotes: (q?.upvotes || 0) + 1 })
            .eq('id', questionId);
        } else if (answerId) {
          const { data: a } = await supabase
            .from('qa_answers')
            .select('upvotes')
            .eq('id', answerId)
            .single();
          
          await supabase
            .from('qa_answers')
            .update({ upvotes: (a?.upvotes || 0) + 1 })
            .eq('id', answerId);
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['qa-questions', variables.researchId] });
    },
  });
}

export function useDeleteQA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      type, 
      id, 
      researchId 
    }: { 
      type: 'question' | 'answer';
      id: string;
      researchId: string;
    }) => {
      const table = type === 'question' ? 'qa_questions' : 'qa_answers';
      
      const { error } = await supabase
        .from(table)
        .update({ is_deleted: true })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['qa-questions', variables.researchId] });
    },
  });
}
