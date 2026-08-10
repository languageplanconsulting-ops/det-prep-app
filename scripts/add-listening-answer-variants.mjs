/**
 * Interactive Listening — give every typed comprehension question a short reference answer and ten
 * accepted wordings.
 *
 * The sets were authored as multiple choice, so the only "answer" each question had was the whole
 * correct option — a full sentence like "I want to study Psychology." Now that comprehension is
 * typed, grading that sentence word-for-word marks a learner wrong for typing "Psychology", which
 * is a complete answer to "What department are you interested in?".
 *
 * This writes, for each of the 126 questions:
 *   answerRef    — the short natural answer, shown as "คำตอบที่ดีที่สุด"
 *   answerAccept — ten more wordings a learner could reasonably type
 *
 * Grading (src/lib/interactive-listening.ts) tries every one of them, tolerates spelling slips, and
 * only what all of them reject goes to the AI judge. Existing options/correctIndex are left alone so
 * scoring and the legacy report keep working.
 *
 * Usage:  node scripts/add-listening-answer-variants.mjs [--apply]
 * Without --apply it prints what would change and writes nothing.
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const BANK_KEY = "ep-conversation-bank-v2";
const SNAPSHOT_ID = "global";

/* ── shared answer sets — the same person appears in a lot of these scenarios ──────────────── */

const ADVISOR = [
  "an advisor",
  "my advisor",
  "my adviser",
  "an academic advisor",
  "the academic adviser",
  "academic advisor",
  "my academic advisor",
  "the advisor",
  "advisor",
  "adviser",
];
const COUNSELOR = [
  "a school counselor",
  "my school counselor",
  "a counselor",
  "my counselor",
  "the guidance counselor",
  "a guidance counsellor",
  "a school counsellor",
  "the school adviser",
  "school counselor",
  "counsellor",
];
const OFFICER = [
  "a university officer",
  "an officer",
  "the university officer",
  "a college officer",
  "university staff",
  "an officer at the university",
  "a university official",
  "someone from the university",
  "a member of staff",
  "the officer",
];
const PROFESSOR = [
  "a professor",
  "my professor",
  "the professor",
  "professor",
  "one of my professors",
  "a university professor",
  "my prof",
  "the prof",
  "my lecturer",
  "a teacher at university",
];
const CAREER_ADVISOR = [
  "a career advisor",
  "career advisor",
  "a career adviser",
  "my career advisor",
  "the career counselor",
  "a careers adviser",
  "a career counsellor",
  "the career advisor",
  "career adviser",
  "a job advisor",
];
const INTERNSHIP = [
  "an internship",
  "internship",
  "do an internship",
  "I want to do an internship",
  "an internship program",
  "work as an intern",
  "to intern somewhere",
  "get an internship",
  "internship experience",
  "an internship instead of a thesis",
];
const ABROAD = [
  "abroad",
  "study abroad",
  "overseas",
  "in another country",
  "on a semester abroad",
  "I want to study abroad",
  "a semester abroad",
  "in a foreign country",
  "outside the country",
  "abroad for a semester",
];
const RECOMMENDATION_LETTER = [
  "a recommendation letter",
  "a letter of recommendation",
  "recommendation letter",
  "a reference letter",
  "a rec letter",
  "my recommendation letter",
  "a letter for my application",
  "the recommendation",
  "a reference",
  "a letter",
];
const HISTORY = [
  "history",
  "a history major",
  "I am interested in history",
  "studying history",
  "history major",
  "I want to major in history",
  "the history major",
  "history studies",
  "majoring in history",
  "I study history",
];
const ENGINEERING = [
  "engineering",
  "an engineering major",
  "I study engineering",
  "my major is engineering",
  "engineering major",
  "majoring in engineering",
  "I am an engineering student",
  "engineering degree",
  "the engineering major",
  "I major in engineering",
];

/** key = `${round}|${examId}|${questionIndex}` → [answerRef, ...ten accepted wordings] */
const PATCH = {
  /* ── round 1 ──────────────────────────────────────────────────────────────────────────── */
  "1|conv_easy_01|0": ["Communications", [
    "communications", "communication", "I want to study Communications", "I want to major in Communications",
    "major in communications", "studying communications", "a communications major", "communications degree",
    "I would like to study communications", "comm",
  ]],
  "1|conv_easy_01|1": ["Feedback on my essay", [
    "feedback on my personal essay", "feedback on my college essay", "feedback", "comments on my essay",
    "advice on my essay", "help with my essay", "to check my essay", "her opinion on my essay",
    "feedback on my application essay", "essay feedback",
  ]],
  "1|conv_easy_01|2": ["A classmate", [
    "a high school classmate", "my classmate", "classmate", "a friend from school", "my school friend",
    "a fellow student", "a student in my class", "my high school friend", "another student", "a friend",
  ]],

  "1|conv_easy_02|0": ["Business", [
    "business", "I want to study business", "I want to major in business", "business studies",
    "study business", "business administration", "I am interested in business", "majoring in business",
    "business major", "a business camp",
  ]],
  "1|conv_easy_02|1": ["To submit a late application", [
    "to submit a late camp application", "to send my application late", "to apply late",
    "submit my application after the deadline", "a late application", "permission to apply late",
    "to hand in the camp application late", "if I can still send the application",
    "late application for the summer camp", "to still apply for the camp",
  ]],
  "1|conv_easy_02|2": ["My school counselor", COUNSELOR],

  "1|conv_easy_03|0": ["Psychology", [
    "psychology", "the psychology department", "I want to study psychology", "I want to major in psychology",
    "study psychology", "psychology major", "majoring in psychology", "I am interested in psychology",
    "psychology department", "the psychology dept",
  ]],
  "1|conv_easy_03|1": ["Information about part-time jobs on campus", [
    "info on part-time campus jobs", "information about part-time jobs", "part-time jobs",
    "a part-time job on campus", "if first-year students can get a part-time job", "how to find a campus job",
    "campus job information", "whether it is easy to get a part time job", "about working part time on campus",
    "part-time work on campus",
  ]],
  "1|conv_easy_03|2": ["A university officer", OFFICER],

  "1|conv_easy_14|0": ["Her leadership experience may be too limited", [
    "her leadership experience is too limited", "limited leadership experience",
    "she has little leadership experience", "not enough leadership experience",
    "she is worried about her leadership experience", "her leadership experience may be weak",
    "leadership experience", "that other candidates have more leadership experience",
    "she does not have much leadership experience", "her lack of leadership experience",
  ]],
  "1|conv_easy_14|1": ["International relations", [
    "international relations", "an international relations program", "the international relations program",
    "she wants to study international relations", "international relation",
    "a program in international relations", "international affairs", "studying international relations",
    "international relations major", "IR",
  ]],
  "1|conv_easy_14|2": ["To ask how her limited leadership may affect her application", [
    "to ask about her application", "to ask how limited leadership affects her application",
    "to get advice about applying", "to ask whether her leadership experience is enough",
    "to ask for advice on her application", "for advice about the international relations program",
    "to ask about her chances", "because she is worried about her application",
    "to ask if she can still apply", "advice on her application",
  ]],

  "1|conv_easy_17|0": ["To ask about joining a research lab", [
    "to ask about joining the lab", "to join a research lab", "to ask if I can join his research lab",
    "about joining the research lab", "to ask about the lab", "to ask for a place in the research lab",
    "to ask to be a student assistant", "because I want research experience",
    "to ask if the lab needs help", "join a lab",
  ]],
  "1|conv_easy_17|1": ["Research experience", [
    "research", "experience in research", "lab experience", "research experience before graduation",
    "experience working in a lab", "I want research experience", "some research experience",
    "experience in a research lab", "doing research", "research work",
  ]],
  "1|conv_easy_17|2": ["During office hours", [
    "office hours", "in office hours", "at his office hours", "during the professor's office hours",
    "during her office hours", "at office hours", "in his office during office hours", "during office hour",
    "office hour", "when the professor has office hours",
  ]],

  "1|conv_easy_18|0": ["That my course load may be too heavy", [
    "my course load may be too heavy", "a heavy course load", "too many difficult classes",
    "that the semester will be too hard", "the workload", "my course load is too heavy",
    "having too heavy a workload", "that I am taking too many hard classes", "the course load",
    "too heavy a course load",
  ]],
  "1|conv_easy_18|1": ["Because several difficult classes are in the same semester", [
    "several difficult classes are in the same semester", "too many hard classes at the same time",
    "because the hard classes are scheduled together", "several difficult courses fall in one semester",
    "many difficult subjects in one term", "because difficult classes overlap",
    "there are several hard classes at once", "because I have too many difficult courses that semester",
    "the difficult classes are all in the same semester", "hard classes at the same time",
  ]],
  "1|conv_easy_18|2": ["An academic advisor", ADVISOR],

  "1|conv_easy_19|0": ["Pre-med preparation", [
    "pre-med", "premed", "preparing for pre-med", "the pre-med path", "getting ready for medical school",
    "pre-med preparation before university", "studying pre-med", "a pre-med program", "pre med preparation",
    "medicine",
  ]],
  "1|conv_easy_19|1": ["What classes and activities would help", [
    "what classes and activities would be useful", "which classes and activities help",
    "what subjects I should take", "how to prepare for pre-med", "what preparation is most useful",
    "what courses would help me", "which activities are useful", "what classes to take before university",
    "the useful classes and activities", "what would prepare me best",
  ]],
  "1|conv_easy_19|2": ["A school counselor", COUNSELOR],

  "1|conv_easy_20|0": ["I was shortlisted for a scholarship interview", [
    "you were shortlisted for a scholarship interview", "I got a scholarship interview",
    "I was shortlisted for a scholarship", "shortlisted for a scholarship interview",
    "I have been selected for an interview", "I made the shortlist for a scholarship",
    "I have a scholarship interview", "I was chosen for a scholarship interview",
    "got shortlisted for the scholarship", "I reached the interview stage of a scholarship",
  ]],
  "1|conv_easy_20|1": ["The student support office", [
    "student support office", "the student support centre", "to the student support office",
    "the support office", "student services", "the student services office", "the student support center",
    "student support", "the university student support office", "support office",
  ]],
  "1|conv_easy_20|2": ["Excited but a little nervous", [
    "excited but nervous", "excited and a little nervous", "nervous but excited",
    "a bit nervous but excited", "happy but nervous", "excited, slightly nervous",
    "I feel excited but a little nervous", "excited yet nervous", "both excited and nervous",
    "a little nervous and excited",
  ]],

  "1|conv_easy_21|0": ["A business club", [
    "business club", "the campus business club", "a club about business", "the business club",
    "a business and leadership club", "business", "a student business club", "the business society",
    "business club on campus", "a leadership and business club",
  ]],
  "1|conv_easy_21|1": ["To build practical skills and meet guest speakers", [
    "to build practical skills and hear guest speakers", "to gain practical skills", "to meet guest speakers",
    "because it helps students build practical skills", "to learn practical skills and meet speakers",
    "for the practical skills and the speakers", "to develop skills and hear speakers",
    "because of the practical skills and guest speakers", "to build skills",
    "it helps me build practical skills",
  ]],
  "1|conv_easy_21|2": ["The student activities office", [
    "student activities office", "the activities office", "to the student activities office",
    "the student activity office", "student activities", "the office of student activities",
    "the campus activities office", "the student affairs office", "activities office",
    "the university student activities office",
  ]],

  /* ── round 2 ──────────────────────────────────────────────────────────────────────────── */
  "2|conv_easy_01|0": ["Environmental Science", [
    "environmental science", "I major in environmental science", "environment science",
    "my major is environmental science", "I study environmental science", "environmental studies",
    "environmental science major", "I am an environmental science major", "majoring in environmental science",
    "the science of the environment",
  ]],
  "2|conv_easy_01|1": ["Information about scholarships", [
    "information about special scholarships", "scholarships", "about special scholarships",
    "if there are scholarships", "help paying for the flights", "scholarship information",
    "whether there are special scholarships", "financial help for the plane tickets",
    "money for the airplane tickets", "a scholarship for studying abroad",
  ]],
  "2|conv_easy_01|2": ["A study abroad officer", [
    "a study abroad officer", "the study abroad officer", "an officer at the study abroad office",
    "study abroad staff", "an officer", "someone at the study abroad office",
    "the officer in the study abroad office", "a university officer", "a study abroad advisor",
    "the study abroad adviser",
  ]],

  "2|conv_easy_02|0": ["A theater program", [
    "a university theater program", "theater", "theatre", "a theatre program", "drama",
    "the theater program at university", "I want to study theater", "a university theatre course",
    "theater studies", "performing arts",
  ]],
  "2|conv_easy_02|1": ["A recommendation letter", RECOMMENDATION_LETTER],
  "2|conv_easy_02|2": ["My drama teacher", [
    "my drama teacher", "a drama teacher", "my favorite drama teacher", "the theater teacher",
    "my teacher", "the drama teacher at school", "my favourite teacher", "drama teacher",
    "my school drama teacher", "a teacher",
  ]],

  "2|conv_easy_03|0": ["Public Health", [
    "public health", "I study public health", "my major is public health", "a master's in public health",
    "public health major", "I am studying public health", "public health degree",
    "majoring in public health", "MPH", "a masters in public health",
  ]],
  "2|conv_easy_03|1": ["To borrow a book from another university", [
    "to borrow a book from another university", "how to borrow a book from a different university",
    "to borrow a health statistics book", "an interlibrary loan", "to get a book from another library",
    "borrow a book from another library", "how to request a book from another university",
    "to loan a book from a different school", "getting a book from another university library",
    "a book from another university",
  ]],
  "2|conv_easy_03|2": ["A library worker", [
    "a library worker", "a librarian", "someone at the library", "the library staff",
    "a worker at the library", "library staff", "the librarian", "a member of library staff",
    "a worker in the main library", "library worker",
  ]],

  "2|conv_easy_28|0": ["A personal statement", [
    "a personal statement", "my personal statement", "personal statement",
    "my grad school personal statement", "the statement for my application", "writing my personal statement",
    "a personal statement for grad school", "my application essay", "help with my personal statement",
    "the personal statement",
  ]],
  "2|conv_easy_28|1": ["A professor", PROFESSOR],
  "2|conv_easy_28|2": ["An appointment", [
    "an appointment", "appointment", "a meeting", "a session", "an appointment with the professor",
    "a personal statement session", "a time to meet", "a meeting with my professor",
    "to book an appointment", "an appointment time",
  ]],

  "2|conv_easy_29|0": ["History", HISTORY],
  "2|conv_easy_29|1": ["A career advisor", CAREER_ADVISOR],
  "2|conv_easy_29|2": ["A practical one", [
    "a practical one", "a practical double major", "something practical", "a practical major",
    "a more practical major", "practical", "a useful one", "a practical second major",
    "he recommends a practical double major", "a practical subject",
  ]],

  "2|conv_easy_30|0": ["Abroad", ABROAD],
  "2|conv_easy_30|1": ["My graduation", [
    "your graduation", "graduation", "graduating", "my graduation date", "finishing my degree",
    "that I will graduate late", "delaying graduation", "when I graduate", "my degree",
    "graduating on time",
  ]],
  "2|conv_easy_30|2": ["A university officer", OFFICER],

  "2|conv_easy_60|0": ["A recommendation letter", RECOMMENDATION_LETTER],
  "2|conv_easy_60|1": ["Thank the professor", [
    "thank the professor", "to thank my professor", "say thank you", "to thank him", "to thank her",
    "thank my professor for the letter", "express my thanks", "to say thank you to the professor",
    "thank you", "show my gratitude",
  ]],
  "2|conv_easy_60|2": ["In person", [
    "in person", "face to face", "face-to-face", "by talking to the professor in person", "personally",
    "meet in person", "by meeting the professor", "in person, not by email", "talking to them directly",
    "directly",
  ]],

  "2|conv_easy_61|0": ["An internship", INTERNSHIP],
  "2|conv_easy_61|1": ["Partner organizations", [
    "partner organizations", "partner organisations", "the university's partner organizations",
    "whether the university has partner organizations", "partner companies",
    "partners for communication students", "organizations that work with the university",
    "partner organization", "any partner organizations", "companies that partner with the university",
  ]],
  "2|conv_easy_61|2": ["A university officer", OFFICER],

  "2|conv_easy_62|0": ["The public sector and a law firm", [
    "the public sector and a law firm", "public sector or law firm",
    "working in the public sector or at a law firm", "a law firm or the public sector",
    "between the public sector and a law firm", "public sector vs law firm",
    "government work or a law firm", "the public sector or a private law firm",
    "law firm or public sector job", "whether to work in the public sector or a law firm",
  ]],
  "2|conv_easy_62|1": ["Career advice", [
    "career advice", "advice about my career", "advice", "help deciding my career",
    "guidance on my career", "career guidance", "advice on which job to choose", "career counselling",
    "some career advice", "advice about work after graduation",
  ]],
  "2|conv_easy_62|2": ["A career advisor", CAREER_ADVISOR],

  /* ── round 3 ──────────────────────────────────────────────────────────────────────────── */
  "3|conv_easy_25|0": ["French", [
    "a French major", "french", "I want to major in French", "the French major", "studying French",
    "French language", "major in French", "French studies", "I want to study French",
    "declaring a French major",
  ]],
  "3|conv_easy_25|1": ["An academic advisor", ADVISOR],
  "3|conv_easy_25|2": ["The prerequisite courses", [
    "the prerequisite courses for the major", "prerequisites", "which courses I need first",
    "the required courses before declaring the major", "what prerequisites are needed",
    "the prerequisite classes", "the courses required to declare the major",
    "what classes I have to take first", "prerequisite courses", "the requirements for the major",
  ]],

  "3|conv_easy_26|0": ["A Master's degree", [
    "a master's degree", "master's", "masters", "a masters degree", "master degree",
    "a professional master's program", "postgraduate", "graduate level", "a master's program", "MA",
  ]],
  "3|conv_easy_26|1": ["Writing a thesis", [
    "writing a thesis", "a thesis", "I don't want to write a thesis", "doing a thesis", "the thesis",
    "writing a dissertation", "avoid writing a thesis", "thesis writing", "not writing a thesis",
    "a research thesis",
  ]],
  "3|conv_easy_26|2": ["Do an internship", INTERNSHIP],

  "3|conv_easy_27|0": ["Engineering", ENGINEERING],
  "3|conv_easy_27|1": ["Japan", [
    "japan", "to Japan", "I went to Japan", "my exchange was in Japan", "Japan for my exchange semester",
    "in Japan", "a university in Japan", "Japan on exchange", "I studied in Japan",
    "an exchange semester in Japan",
  ]],
  "3|conv_easy_27|2": ["Transfer the credits toward my degree", [
    "transfer the credits", "transfer the credits toward my degree", "count them toward my degree",
    "use the credits for my degree", "have my classes counted", "transfer credit", "get credit for them",
    "transfer my credits from Japan", "make them count toward graduation", "credit transfer",
  ]],

  "3|conv_easy_57|0": ["Study abroad for one semester", [
    "study abroad for one semester", "study abroad", "a semester abroad", "go abroad for a semester",
    "I want to study abroad for one semester", "spend one semester abroad",
    "study overseas for a semester", "one semester abroad", "go on exchange for a semester",
    "study in another country for a semester",
  ]],
  "3|conv_easy_57|1": ["Whether my credits will transfer", [
    "whether your credits will transfer", "credit transfer", "if my courses will count toward my degree",
    "whether the credits count", "if my credits transfer", "whether my classes count for my degree",
    "about transferring credits", "if the courses will be recognized",
    "credit transfer for the semester abroad", "whether my courses will count",
  ]],
  "3|conv_easy_57|2": ["The university office", [
    "the university office", "university office", "the office at my university", "the university's office",
    "the administration office", "a university officer", "the student office",
    "the university administration", "the university admin office", "the office",
  ]],

  "3|conv_easy_58|0": ["Do an internship", INTERNSHIP],
  "3|conv_easy_58|1": ["Whether my program allows the internship option", [
    "whether your program allows the internship option",
    "if my program allows an internship instead of a thesis", "whether the internship option is allowed",
    "if I can do an internship instead", "whether my program offers that option",
    "if the program allows it", "whether an internship is possible in my program",
    "if my course allows an internship", "whether the option exists in my program",
    "if my program permits an internship",
  ]],
  "3|conv_easy_58|2": ["My advisor", ADVISOR],

  "3|conv_easy_59|0": ["Reconsider my application", [
    "reconsider your application", "reconsider my application", "to look at my application again",
    "review my application again", "reconsider it", "to reconsider the scholarship application",
    "give my application another chance", "consider my application again", "reconsider",
    "re-examine my application",
  ]],
  "3|conv_easy_59|1": ["My grade was lower than expected", [
    "your grade was lower than expected", "my grades were too low",
    "because my grade was lower than expected", "low grades", "my grade was not high enough",
    "because of my low grade", "my grades dropped", "the grade was lower than they expected",
    "poor grades", "my grade was below the requirement",
  ]],
  "3|conv_easy_59|2": ["A difficult family situation", [
    "a difficult family situation", "family problems", "a family problem", "problems at home",
    "a hard time with my family", "my family situation", "difficult family circumstances",
    "a family issue", "trouble at home", "a difficult situation in my family",
  ]],

  /* ── round 4 ──────────────────────────────────────────────────────────────────────────── */
  "4|conv_easy_28|0": ["Journalism and Economics", [
    "journalism and economics", "economics and journalism", "journalism or economics",
    "journalism, economics", "either journalism or economics", "econ and journalism",
    "the journalism major and the economics major", "journalism and econ",
    "studying journalism or economics", "journalism / economics",
  ]],
  "4|conv_easy_28|1": ["Whether I need specific prerequisite subjects", [
    "whether specific prerequisite subjects are needed", "prerequisites",
    "if I need certain subjects before applying", "whether prerequisite subjects are required",
    "what prerequisites I need", "if specific classes are required first",
    "whether I need particular subjects", "the prerequisite subjects",
    "if the majors need different prerequisites", "needing prerequisite subjects",
  ]],
  "4|conv_easy_28|2": ["My school counselor", COUNSELOR],

  "4|conv_easy_29|0": ["To ask whether I can apply for a scholarship", [
    "to ask whether you can apply for a scholarship", "to ask about a scholarship",
    "to ask if I am eligible for a scholarship", "about scholarship eligibility",
    "to see if I can get a scholarship", "to ask about applying for a scholarship",
    "to find out if I qualify for a scholarship", "for scholarship information",
    "to ask whether I qualify", "to ask about financial support",
  ]],
  "4|conv_easy_29|1": ["The main requirements for a scholarship", [
    "the main requirements for a scholarship", "the requirements", "what the scholarship requires",
    "the scholarship requirements", "what I need to qualify", "the main conditions",
    "what the main requirements are", "the eligibility requirements", "requirements for applying",
    "what is needed to apply",
  ]],
  "4|conv_easy_29|2": ["Financial support for next year", [
    "financial support for next year", "financial support", "money for next year", "financial help",
    "a scholarship for next year", "funding for next year", "financial aid",
    "help paying for next year", "money to study next year", "financial assistance",
  ]],

  "4|conv_easy_30|0": ["A study abroad program", [
    "a study abroad program", "study abroad", "the study abroad programme", "an exchange program",
    "studying abroad", "a program abroad", "the study abroad program at my university",
    "going abroad to study", "an overseas program", "study abroad programme",
  ]],
  "4|conv_easy_30|1": ["Some credits may not transfer back", [
    "some credits may not transfer back", "some credits will not transfer", "the credits may not count",
    "my credits might not transfer", "not all credits transfer",
    "some classes may not count toward my degree", "credit transfer problems",
    "some of the credits may not be accepted", "that it could delay my graduation",
    "some credits may not come back to my home university",
  ]],
  "4|conv_easy_30|2": ["Because the experience matters to me", [
    "because the experience matters to you", "because the experience is important to me",
    "the experience matters", "because I value the experience", "because it is a good experience",
    "the experience is worth it", "because I want the experience",
    "since the experience means a lot to me", "for the experience", "because it matters to me",
  ]],

  "4|conv_easy_31|0": ["An architecture assignment", [
    "an architecture assignment", "architecture", "the architecture assignment",
    "an assignment in architecture", "my architecture homework", "architecture work",
    "an architecture project", "the architecture homework", "an assignment for architecture class",
    "architecture assignment",
  ]],
  "4|conv_easy_31|1": ["My classmate", [
    "your classmate", "my classmate", "classmate", "a classmate", "a friend in my class",
    "my friend from class", "another student in my class", "a fellow student", "my study partner",
    "one of my classmates",
  ]],
  "4|conv_easy_31|2": ["To thank them for their help", [
    "to thank them for their help", "to say thank you", "to thank my classmate", "to thank them",
    "because they helped me", "to thank him for helping me", "to thank her for the help",
    "say thanks for the help", "to express thanks", "to show my appreciation",
  ]],

  "4|conv_easy_32|0": ["A university officer", OFFICER],
  "4|conv_easy_32|1": ["A scholarship", [
    "a scholarship", "scholarship", "a scholarship for a semester abroad", "a study abroad scholarship",
    "scholarship money", "financial support", "a grant", "the scholarship",
    "funding for my semester abroad", "a scholarship to study abroad",
  ]],
  "4|conv_easy_32|2": ["Abroad", ABROAD],

  "4|conv_easy_33|0": ["In the UK", [
    "in the UK", "the UK", "United Kingdom", "in the United Kingdom", "in Britain", "England",
    "in the U.K.", "a university in the UK", "the UK for my master's", "study in the UK",
  ]],
  "4|conv_easy_33|1": ["My personal statement", [
    "your personal statement", "my personal statement", "personal statement", "a personal statement",
    "the personal statement for my application", "my statement", "my application statement",
    "the statement", "my personal statement for a master's", "a statement of purpose",
  ]],
  "4|conv_easy_33|2": ["Feedback on my writing", [
    "feedback on your writing", "feedback", "feedback on my personal statement",
    "comments on my writing", "advice on my statement", "the professor's feedback",
    "help with my writing", "an opinion on my writing", "some feedback on my statement",
    "corrections and feedback",
  ]],

  "4|conv_easy_63|0": ["A double major", [
    "a double major at university", "a double major", "two majors", "double major",
    "economics and engineering", "I am doing a double major", "a double degree",
    "two majors at university", "double majoring", "a double major in economics and engineering",
  ]],
  "4|conv_easy_63|1": ["Economics and engineering", [
    "economics and engineering", "engineering and economics", "econ and engineering",
    "economics, engineering", "an economics and engineering major",
    "I take economics and engineering", "economic and engineering", "both economics and engineering",
    "engineering and econ", "economics and engineering double major",
  ]],
  "4|conv_easy_63|2": ["Choosing just one major", [
    "choosing just one major", "choose one major", "to pick only one major", "dropping one major",
    "that I should choose one major", "keeping only one major", "to study just one major",
    "choose a single major", "give up one of the majors", "focus on one major",
  ]],

  "4|conv_easy_64|0": ["My mental health", [
    "your mental health", "my mental health", "mental health", "mental health problems",
    "my mental health issues", "stress and mental health", "my mental health condition",
    "problems with my mental health", "mental health struggles", "my emotional health",
  ]],
  "4|conv_easy_64|1": ["My advisor", ADVISOR],
  "4|conv_easy_64|2": ["Contacting the mental health service", [
    "contacting the mental health service", "the mental health service",
    "to contact the college mental health service", "getting support from the mental health service",
    "to talk to the mental health service", "seeing the mental health service",
    "reaching out to mental health support", "the college counselling service",
    "to use the mental health service", "contact mental health support",
  ]],

  "4|conv_easy_65|0": ["A PhD in biology", [
    "a PhD in biology", "a PhD", "a biology PhD", "a doctorate in biology", "PhD in biology",
    "a doctoral program in biology", "a PhD program", "biology PhD", "a doctorate",
    "to do a PhD in biology",
  ]],
  "4|conv_easy_65|1": ["Useful activities and internship experience", [
    "useful activities and internship experience", "what activities and internships would help",
    "extracurricular activities and internships", "which experience would strengthen my application",
    "what would strengthen my application", "activities and internship experience",
    "helpful activities and internships", "what internships would help",
    "the activities and experience I need", "what experience is useful",
  ]],
  "4|conv_easy_65|2": ["My advisor", ADVISOR],

  /* ── round 5 ──────────────────────────────────────────────────────────────────────────── */
  "5|conv_easy_34|0": ["A tutoring school", [
    "a tutoring school", "tutoring school", "a tutoring class", "a cram school", "tutoring",
    "a tutoring program", "an extra tutoring school", "a tutorial school", "tutoring classes",
    "a private tutoring school",
  ]],
  "5|conv_easy_34|1": ["To apply to medical school", [
    "to apply to medical school", "medical school", "med school", "to go to medical school",
    "to become a doctor", "applying to med school", "I want to study medicine",
    "to enter medical school", "getting into medical school", "study medicine",
  ]],
  "5|conv_easy_34|2": ["Whether the plan would really help", [
    "whether the plan would really help", "if the tutoring school will help", "whether it is worth it",
    "if the plan helps my application", "whether tutoring really helps", "if the plan is useful",
    "whether attending would help me", "if it would really help",
    "whether the tutoring school is worth attending", "how much the plan would help",
  ]],

  "5|conv_easy_35|0": ["To ask for a recommendation letter", [
    "to ask for a recommendation letter", "for a recommendation letter",
    "to ask for a letter of recommendation", "to request a recommendation",
    "to ask the professor to write a letter", "a recommendation letter", "to get a reference letter",
    "to ask for a rec letter", "asking for a recommendation", "to request a letter for my internship",
  ]],
  "5|conv_easy_35|1": ["An internship", INTERNSHIP],
  "5|conv_easy_35|2": ["Because I did well in that course", [
    "because you did well in that course", "because I did well in that class",
    "I got a good grade in his course", "because I performed well in accounting",
    "since I did well in the course", "because my grade in that course was good",
    "I did well in accounting", "because I was a good student in that class",
    "because of my good result in the course", "I did well in the class",
  ]],

  "5|conv_easy_36|0": ["To ask how to join a service program", [
    "to ask how to join a service program", "to ask about community service",
    "how to join a community service program", "to ask how to join a program",
    "about joining a service program", "to find a suitable service program",
    "to ask which programs count", "for information about service programs",
    "to ask how to sign up for community service", "to join a community service program",
  ]],
  "5|conv_easy_36|1": ["To graduate", [
    "to graduate", "for graduation", "because it is required to graduate",
    "it is a graduation requirement", "so I can graduate", "in order to graduate",
    "to finish my degree", "a graduation requirement", "because I need it to graduate",
    "to complete my degree",
  ]],
  "5|conv_easy_36|2": ["That I choose the right option", [
    "that you choose the right option", "that I choose the right option", "choosing the right program",
    "that I pick the right one", "that the service counts", "that I make the right choice",
    "picking a suitable program", "that my choice is correct", "choosing correctly",
    "that I choose a program that counts",
  ]],

  "5|conv_easy_40|0": ["A tutoring school", [
    "a tutoring school", "tutoring school", "a tutoring class", "a cram school", "tutoring",
    "a tutoring program", "an extra tutoring school", "a tutorial school", "tutoring classes",
    "a private tutoring school",
  ]],
  "5|conv_easy_40|1": ["To apply to medical school", [
    "to apply to medical school", "medical school", "med school", "to go to medical school",
    "to become a doctor", "applying to med school", "I want to study medicine",
    "to enter medical school", "getting into medical school", "study medicine",
  ]],
  "5|conv_easy_40|2": ["Whether the plan would really help me", [
    "whether the plan would really help", "if the tutoring school will help", "whether it is worth it",
    "if the plan helps my application", "whether tutoring really helps", "if the plan is useful",
    "whether attending would help me", "if it would really help",
    "whether the tutoring school is worth attending", "how much the plan would help",
  ]],

  "5|conv_easy_41|0": ["To ask for a recommendation letter", [
    "to ask for a recommendation letter", "for a recommendation letter",
    "to ask for a letter of recommendation", "to request a recommendation",
    "to ask the professor to write a letter", "a recommendation letter", "to get a reference letter",
    "to ask for a rec letter", "asking for a recommendation", "to request a letter for my internship",
  ]],
  "5|conv_easy_41|1": ["An internship", INTERNSHIP],
  "5|conv_easy_41|2": ["Because I did well in that course", [
    "because you did well in that course", "because I did well in that class",
    "I got a good grade in his course", "because I performed well in accounting",
    "since I did well in the course", "because my grade in that course was good",
    "I did well in accounting", "because I was a good student in that class",
    "because of my good result in the course", "I did well in the class",
  ]],

  "5|conv_easy_42|0": ["To ask how to join a service program", [
    "to ask how to join a service program", "to ask about community service",
    "how to join a community service program", "to ask how to join a program",
    "about joining a service program", "to find a suitable service program",
    "to ask which programs count", "for information about service programs",
    "to ask how to sign up for community service", "to join a community service program",
  ]],
  "5|conv_easy_42|1": ["To graduate", [
    "to graduate", "for graduation", "because it is required to graduate",
    "it is a graduation requirement", "so I can graduate", "in order to graduate",
    "to finish my degree", "a graduation requirement", "because I need it to graduate",
    "to complete my degree",
  ]],
  "5|conv_easy_42|2": ["That I choose the right option", [
    "that you choose the right option", "that I choose the right option", "choosing the right program",
    "that I pick the right one", "that the service counts", "that I make the right choice",
    "picking a suitable program", "that my choice is correct", "choosing correctly",
    "that I choose a program that counts",
  ]],

  "5|conv_easy_43|0": ["A job fair", [
    "a job fair", "job fair", "the job fair", "a career fair", "a campus job fair",
    "the upcoming job fair", "a jobs fair", "the career fair on campus", "an employment fair",
    "a job fair on campus",
  ]],
  "5|conv_easy_43|1": ["Engineering students", [
    "engineering students", "engineering", "students of engineering", "engineers",
    "for engineering students", "engineering majors", "people studying engineering",
    "the engineering department's students", "engineering student", "students in engineering",
  ]],
  "5|conv_easy_43|2": ["Whether it is worth attending", [
    "whether it is worth attending", "if it is worth going", "whether we should go", "if it's worth it",
    "whether to attend", "if going is useful", "whether attending would help",
    "if the fair is worth attending", "whether it is a good idea to go", "if it is worth our time",
  ]],

  "5|conv_easy_44|0": ["History", HISTORY],
  "5|conv_easy_44|1": ["Economics", [
    "economics", "econ", "to economics", "I want to change to economics", "an economics major",
    "changing to economics", "the economics major", "economic", "study economics",
    "economics instead",
  ]],
  "5|conv_easy_44|2": ["To ask what I should consider", [
    "to ask what to consider", "to ask what I should think about",
    "for advice about changing my major", "to ask about changing majors",
    "to explain my thoughts and ask for advice", "to ask what academic issues to consider",
    "to get advice before changing major", "to ask whether I should change my major",
    "advice about switching majors", "to talk about changing my major",
  ]],

  "5|conv_easy_45|0": ["To ask about fee help later", [
    "to ask about fee help later", "to ask about a tuition waiver",
    "to ask about reduced fees if I return", "about fee help when I come back",
    "to ask if I can get help with fees next year", "about a tuition waiver or reduced fee",
    "to ask about tuition help", "to ask what happens with fees if I return",
    "about fee reduction next year", "to ask for help with tuition later",
  ]],
  "5|conv_easy_45|1": ["Because of family reasons", [
    "because of family reasons", "family reasons", "serious family problems", "a family situation",
    "because of my family", "family issues", "problems in my family", "serious family reasons",
    "because of a family emergency", "family problems at home",
  ]],
  "5|conv_easy_45|2": ["Whether I can get a tuition waiver", [
    "whether you can get a tuition waiver", "if I can get a tuition waiver",
    "whether there is a tuition waiver or reduced fee", "if the fee can be reduced",
    "about a tuition waiver", "whether I will pay less", "if I can get a fee reduction",
    "whether a waiver is possible", "if there is any fee help next year",
    "whether the tuition can be waived",
  ]],
};

/* ── apply ────────────────────────────────────────────────────────────────────────────────── */

function loadEnv() {
  const file = path.join(process.cwd(), ".env.local");
  const env = {};
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (!line.includes("=") || line.trim().startsWith("#")) continue;
    const i = line.indexOf("=");
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return env;
}

const apply = process.argv.includes("--apply");
const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data, error } = await supabase
  .from("content_bank_snapshots")
  .select("payload, updated_at")
  .eq("id", SNAPSHOT_ID)
  .maybeSingle();
if (error) throw new Error(error.message);

const payload = data?.payload ?? {};
const rawBank = payload[BANK_KEY];
if (typeof rawBank !== "string") throw new Error(`snapshot has no ${BANK_KEY}`);

const backup = path.join(process.cwd(), `conversation-bank-backup-${data.updated_at.replace(/[:.]/g, "-")}.json`);
fs.writeFileSync(backup, rawBank);
console.log(`backup written: ${backup}`);

const bank = JSON.parse(rawBank);
let patched = 0;
const missing = [];

for (const [round, byDifficulty] of Object.entries(bank)) {
  for (const list of Object.values(byDifficulty)) {
    for (const exam of list) {
      exam.scenarioQuestions.forEach((q, i) => {
        const key = `${round}|${exam.id}|${i}`;
        const entry = PATCH[key];
        if (!entry) {
          missing.push(`${key} — ${q.question}`);
          return;
        }
        const [ref, accept] = entry;
        if (accept.length !== 10) throw new Error(`${key} has ${accept.length} variations, expected 10`);
        q.answerRef = ref;
        q.answerAccept = accept;
        patched++;
      });
    }
  }
}

console.log(`patched ${patched} questions`);
if (missing.length) {
  console.log(`MISSING ${missing.length}:`);
  for (const m of missing) console.log("  " + m);
}

if (!apply) {
  console.log("dry run — pass --apply to write back");
  process.exit(missing.length ? 1 : 0);
}
if (missing.length) throw new Error("refusing to write with unpatched questions");

payload[BANK_KEY] = JSON.stringify(bank);
const { error: upErr } = await supabase
  .from("content_bank_snapshots")
  .update({ payload, updated_at: new Date().toISOString() })
  .eq("id", SNAPSHOT_ID);
if (upErr) throw new Error(upErr.message);
console.log("snapshot updated");
