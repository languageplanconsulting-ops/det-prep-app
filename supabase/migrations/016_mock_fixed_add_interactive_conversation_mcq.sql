alter table public.mock_fixed_set_items
  drop constraint if exists mock_fixed_set_items_task_type_check;

alter table public.mock_fixed_set_items
  add constraint mock_fixed_set_items_task_type_check check (task_type in (
    'fill_in_blanks',
    'write_about_photo',
    'dictation',
    'real_english_word',
    'vocabulary_reading',
    'speak_about_photo',
    'read_and_write',
    'read_then_speak',
    'interactive_conversation_mcq',
    'interactive_speaking',
    'conversation_summary'
  ));
