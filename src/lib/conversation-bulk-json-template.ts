/**
 * Minimal valid one-exam JSON for interactive conversation bulk import (copy for admins).
 * Each exam needs 3 scenarioQuestions and 5 mainQuestions after import validation.
 * Grouped upload is also allowed:
 * `[ { "round": 1, "difficulty": "easy", "sets": [ { ...set 1 }, { ...set 2 } ] } ]`
 */
export const CONVERSATION_BULK_JSON_TEMPLATE = `[
  {
    "title": "Example conversation set",
    "difficulty": "easy",
    "round": 1,
    "setNumber": 1,
    "scenario": "A short scenario. Two people discuss weekend plans.",
    "highlightedWords": [
      { "word": "weekend", "translation": "สุดสัปดาห์" }
    ],
    "scenarioQuestions": [
      { "question": "What are they mainly discussing?", "options": ["Weather", "Plans"], "correctIndex": 1, "explanation": "They talk about plans." },
      { "question": "How many speakers are implied?", "options": ["One", "Two"], "correctIndex": 1, "explanation": "Two people." },
      { "question": "Is the tone formal?", "options": ["Yes", "No"], "correctIndex": 1, "explanation": "Casual chat." }
    ],
    "mainQuestions": [
      { "question": "Meaning of line 1?", "options": ["A", "B"], "correctIndex": 0, "explanation": "A fits.", "transcript": "First spoken line here." },
      { "question": "Meaning of line 2?", "options": ["A", "B"], "correctIndex": 1, "explanation": "B fits.", "transcript": "Second spoken line." },
      { "question": "Meaning of line 3?", "options": ["A", "B"], "correctIndex": 0, "explanation": "A.", "transcript": "Third line." },
      { "question": "Meaning of line 4?", "options": ["A", "B"], "correctIndex": 1, "explanation": "B.", "transcript": "Fourth line." },
      { "question": "Meaning of line 5?", "options": ["A", "B"], "correctIndex": 0, "explanation": "A.", "transcript": "Fifth line." }
    ]
  }
]`;
