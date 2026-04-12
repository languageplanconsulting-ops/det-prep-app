-- Mock test v2: up to 10 phases; expanded question_type list (mock bank only — separate from practice content).

alter table public.mock_questions drop constraint if exists mock_questions_phase_check;
alter table public.mock_questions add constraint mock_questions_phase_check check (phase >= 1 and phase <= 10);

alter table public.mock_questions drop constraint if exists mock_questions_question_type_check;
alter table public.mock_questions add constraint mock_questions_question_type_check check (question_type in (
  'fill_in_blanks',
  'dictation',
  'real_english_word',
  'vocabulary_reading',
  'read_and_write',
  'read_then_speak',
  'write_about_photo',
  'speak_about_photo',
  'interactive_speaking',
  'conversation_summary',
  'read_and_select',
  'interactive_listening',
  'vocabulary_in_context',
  'summarize_conversation',
  'essay_writing'
));
