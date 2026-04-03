import { Router, type IRouter } from "express";
import { getGroq, GROQ_MODEL } from "../lib/groq";

const router: IRouter = Router();

router.post("/groq/chat", async (req, res): Promise<void> => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: "messages array is required" });
    return;
  }

  try {
    const completion = await getGroq().chat.completions.create({
      model: GROQ_MODEL,
      messages,
    });
    const content = completion.choices[0]?.message?.content ?? "";
    res.json({ content });
  } catch (err) {
    req.log.error({ err }, "Groq chat error");
    res.status(500).json({ error: "AI service error. Please try again." });
  }
});

router.post("/groq/tutor", async (req, res): Promise<void> => {
  const { subject, chapter, previousMessages } = req.body;
  if (!subject || !chapter) {
    res.status(400).json({ error: "subject and chapter are required" });
    return;
  }

  const systemPrompt = `You are an expert CBSE Class 10 tutor specializing in ${subject}. 
Teach the topic "${chapter}" step by step in simple language suitable for a 14-16 year old Indian student. 
Use examples relevant to Indian daily life. 
After explaining each concept clearly, conclude with a comprehension check question prefixed with "COMPREHENSION CHECK:" to test understanding.
Keep CBSE board exam patterns in mind. Focus on exam-relevant content.
Format your response clearly with numbered steps.`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...(previousMessages || []),
    {
      role: "user" as const,
      content: `Please teach me about: ${chapter} from ${subject} (CBSE Class 10)`,
    },
  ];

  try {
    const completion = await getGroq().chat.completions.create({
      model: GROQ_MODEL,
      messages,
    });
    const content = completion.choices[0]?.message?.content ?? "";
    res.json({ content });
  } catch (err) {
    req.log.error({ err }, "Groq tutor error");
    res.status(500).json({ error: "AI service error. Please try again." });
  }
});

router.post("/groq/doubt", async (req, res): Promise<void> => {
  const { question, subject, previousMessages } = req.body;
  if (!question) {
    res.status(400).json({ error: "question is required" });
    return;
  }

  const systemPrompt = `You are an expert CBSE Class 10 doubt solver. 
Answer the student's question with step-by-step reasoning. 
Highlight the formula or rule used at each step.
For Maths: show all working clearly.
For Science: give conceptual + numerical breakdown.
At the end, mention if the topic is from CBSE Class 10 syllabus or beyond.
Keep answers clear and to the point.
${subject ? `Subject context: ${subject}` : ""}`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...(previousMessages || []),
    { role: "user" as const, content: question },
  ];

  try {
    const completion = await getGroq().chat.completions.create({
      model: GROQ_MODEL,
      messages,
    });
    const content = completion.choices[0]?.message?.content ?? "";
    res.json({ content });
  } catch (err) {
    req.log.error({ err }, "Groq doubt solver error");
    res.status(500).json({ error: "AI service error. Please try again." });
  }
});

router.post("/groq/generate-test", async (req, res): Promise<void> => {
  const { subject, testType, chapter, numQuestions } = req.body;
  if (!subject || !testType) {
    res.status(400).json({ error: "subject and testType are required" });
    return;
  }

  const testTypeLabels: Record<string, string> = {
    full_mock: "Full Mock Test",
    chapter_test: "Chapter Test",
    mini_test: "Subject Mini Test",
    speed_round: "Speed Round",
  };

  const qCount =
    numQuestions ||
    (testType === "full_mock"
      ? 20
      : testType === "chapter_test"
        ? 15
        : testType === "mini_test"
          ? 10
          : 5);

  const chapterContext = chapter ? ` focused on the chapter "${chapter}"` : "";

  const prompt = `Generate a ${testTypeLabels[testType] || testType} for CBSE Class 10 ${subject}${chapterContext}.
Create exactly ${qCount} questions following the CBSE marking scheme.
Mix question types: MCQ (with 4 options), short answer (2-3 marks), long answer (5 marks).

Return ONLY a valid JSON array with this exact structure, no other text:
[
  {
    "question_number": 1,
    "question_text": "Question here",
    "question_type": "mcq",
    "marks": 1,
    "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
    "correct_answer": "A) Option 1",
    "explanation": "Brief explanation why this is correct"
  },
  {
    "question_number": 2,
    "question_text": "Question here",
    "question_type": "short_answer",
    "marks": 2,
    "options": null,
    "correct_answer": "Complete answer here",
    "explanation": "Explanation of the answer"
  }
]

Make questions curriculum-accurate and exam-relevant for CBSE Class 10 ${subject}.`;

  try {
    const completion = await getGroq().chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: "user" as const,
          content: prompt,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "[]";

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      req.log.error({ content }, "No JSON array found in test generation response");
      res.status(500).json({ error: "Failed to generate test. Please try again." });
      return;
    }

    let questions;
    try {
      questions = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      req.log.error({ parseErr, content }, "Failed to parse test JSON");
      res.status(500).json({ error: "Failed to parse test questions. Please try again." });
      return;
    }

    res.json({ questions });
  } catch (err) {
    req.log.error({ err }, "Groq generate test error");
    res.status(500).json({ error: "AI service error. Please try again." });
  }
});

router.post("/groq/analyze-results", async (req, res): Promise<void> => {
  const { subject, wrongAnswers, score, total } = req.body;
  if (!subject || !Array.isArray(wrongAnswers)) {
    res.status(400).json({ error: "subject and wrongAnswers are required" });
    return;
  }

  const wrongAnswersSummary = wrongAnswers
    .map(
      (w: { question: string; userAnswer: string; correctAnswer: string; topic: string }) =>
        `Q: ${w.question} | Your answer: ${w.userAnswer} | Correct: ${w.correctAnswer} | Topic: ${w.topic}`,
    )
    .join("\n");

  const prompt = `Based on these wrong answers for CBSE Class 10 ${subject} test (Score: ${score}/${total}):

${wrongAnswersSummary || "No wrong answers — perfect score!"}

Generate a SWOT analysis for the student's exam preparation.
Return ONLY a valid JSON object with this exact structure, no other text:
{
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "opportunities": ["opportunity 1", "opportunity 2"],
  "threats": ["threat 1", "threat 2"],
  "time_analysis": "Analysis of time management and pacing",
  "error_pattern": "Pattern observed in errors and how to fix them"
}`;

  try {
    const completion = await getGroq().chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: "user" as const, content: prompt }],
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      res.status(500).json({ error: "Failed to generate analysis. Please try again." });
      return;
    }

    let analysis;
    try {
      analysis = JSON.parse(jsonMatch[0]);
    } catch {
      res.status(500).json({ error: "Failed to parse analysis. Please try again." });
      return;
    }

    res.json(analysis);
  } catch (err) {
    req.log.error({ err }, "Groq analyze results error");
    res.status(500).json({ error: "AI service error. Please try again." });
  }
});

router.post("/groq/generate-plan", async (req, res): Promise<void> => {
  const { examDates, availableHoursPerDay, weakTopics, daysCount } = req.body;
  if (!examDates || !availableHoursPerDay) {
    res.status(400).json({ error: "examDates and availableHoursPerDay are required" });
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  const days = daysCount || 30;
  const examDatesStr = examDates
    .map((e: { subject: string; date: string }) => `${e.subject}: ${e.date}`)
    .join(", ");
  const weakTopicsStr =
    weakTopics && weakTopics.length > 0
      ? weakTopics
          .map(
            (t: { subject: string; chapter: string; confidence_score: number }) =>
              `${t.subject} - ${t.chapter} (confidence: ${t.confidence_score}%)`,
          )
          .join(", ")
      : "None identified yet";

  const prompt = `Create a day-by-day study plan for a CBSE Class 10 student.
Subjects: Mathematics, Science, Social Science, English, Hindi
Exam dates: ${examDatesStr}
Available hours per day: ${availableHoursPerDay}
Today's date: ${today}
Weak topics: ${weakTopicsStr}
Generate a ${days}-day plan starting from today.

Return ONLY a valid JSON array with exactly ${days} items, no other text:
[
  {
    "date": "YYYY-MM-DD",
    "subject": "Subject Name",
    "chapters": ["Chapter 1", "Chapter 2"],
    "tasks": ["Task description 1", "Task description 2"],
    "estimated_minutes": 90,
    "is_mock_test_day": false
  }
]

Prioritize weak topics, include mock test days weekly, and distribute subjects evenly based on exam proximity.`;

  try {
    const completion = await getGroq().chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: "user" as const, content: prompt }],
    });

    const content = completion.choices[0]?.message?.content ?? "[]";
    const jsonMatch = content.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      res.status(500).json({ error: "Failed to generate study plan. Please try again." });
      return;
    }

    let plan;
    try {
      plan = JSON.parse(jsonMatch[0]);
    } catch {
      res.status(500).json({ error: "Failed to parse study plan. Please try again." });
      return;
    }

    res.json({ plan });
  } catch (err) {
    req.log.error({ err }, "Groq generate plan error");
    res.status(500).json({ error: "AI service error. Please try again." });
  }
});

router.post("/groq/notes-chat", async (req, res): Promise<void> => {
  const { question, documentText, previousMessages } = req.body;
  if (!question || !documentText) {
    res.status(400).json({ error: "question and documentText are required" });
    return;
  }

  const maxContextLength = 8000;
  const truncatedDoc =
    documentText.length > maxContextLength
      ? documentText.substring(0, maxContextLength) +
        "\n\n[Document truncated for context window]"
      : documentText;

  const systemPrompt = `You are a study assistant. Answer ONLY from the provided document content below.
If the answer is not in the document, say "I could not find this in your uploaded notes."
Always cite approximately which part of the document your answer comes from.

DOCUMENT CONTENT:
${truncatedDoc}`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...(previousMessages || []),
    { role: "user" as const, content: question },
  ];

  try {
    const completion = await getGroq().chat.completions.create({
      model: GROQ_MODEL,
      messages,
    });
    const content = completion.choices[0]?.message?.content ?? "";
    res.json({ content });
  } catch (err) {
    req.log.error({ err }, "Groq notes chat error");
    res.status(500).json({ error: "AI service error. Please try again." });
  }
});

router.post("/groq/evaluate-answer", async (req, res): Promise<void> => {
  const { subject, chapter, teachingContent, comprehensionQuestion, studentAnswer } = req.body;
  if (!comprehensionQuestion || !studentAnswer) {
    res.status(400).json({ error: "comprehensionQuestion and studentAnswer are required" });
    return;
  }

  const systemPrompt = `You are a CBSE Class 10 ${subject} examiner evaluating a student's answer.
The topic being taught is: ${chapter}

Teaching content summary:
${teachingContent ? teachingContent.substring(0, 1000) : "As covered in the explanation above."}

Comprehension question asked: "${comprehensionQuestion}"
Student's answer: "${studentAnswer}"

Evaluate the answer. Be encouraging but honest. Provide:
1. Whether the answer is correct, partially correct, or incorrect
2. Specific feedback on what was good
3. What was missing or incorrect
4. The complete correct answer for reference
5. A motivational note to keep studying`;

  try {
    const completion = await getGroq().chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: "user" as const, content: systemPrompt }],
    });
    const content = completion.choices[0]?.message?.content ?? "";
    res.json({ content });
  } catch (err) {
    req.log.error({ err }, "Groq evaluate answer error");
    res.status(500).json({ error: "AI service error. Please try again." });
  }
});

export default router;
