import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { SUBJECTS } from "@/lib/cbseData";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

type TestPhase = 'setup' | 'active' | 'results';

export default function MockTest() {
const { user } = useAuth();

const [phase, setPhase] = useState<TestPhase>('setup');
const [subject, setSubject] = useState("");
const [questions, setQuestions] = useState<any[]>([]);
const [currentIdx, setCurrentIdx] = useState(0);
const [answers, setAnswers] = useState<Record<number, string>>({});
const [score, setScore] = useState(0);
const [timeLeft, setTimeLeft] = useState(0);

useEffect(() => {
let timer: any;
if (phase === 'active' && timeLeft > 0) {
timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
}
return () => clearInterval(timer);
}, [phase, timeLeft]);

// 🔥 AI GENERATE QUESTIONS
const generateTest = async () => {
if (!subject) {
toast.error("Select subject");
return;
}


try {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + import.meta.env.VITE_GROQ_API_KEY,
    },
    body: JSON.stringify({
      model: "llama3-70b-8192",
      messages: [
        {
          role: "user",
          content: "Generate 5 MCQ questions for " + subject + " in JSON format"
        }
      ]
    })
  });

  const data = await res.json();

  // ⚠️ simple mock parsing (you can improve later)
  const fakeQuestions = [
    {
      question_text: "Sample Question?",
      options: ["A", "B", "C", "D"],
      correct_answer: "A"
    }
  ];

  setQuestions(fakeQuestions);
  setPhase("active");
  setTimeLeft(300);
} catch {
  toast.error("Failed to generate test");
}


};

const handleSubmit = async () => {
let correct = 0;


questions.forEach((q, i) => {
  if (answers[i] === q.correct_answer) correct++;
});

const finalScore = Math.round((correct / questions.length) * 100);
setScore(finalScore);
setPhase("results");

if (user) {
  await supabase.from("mock_tests").insert({
    user_id: user.id,
    subject,
    score: finalScore
  });
}


};

// SETUP SCREEN
if (phase === "setup") {
return ( <div className="space-y-4"> <h1 className="text-xl font-bold">Mock Test</h1>

```
    <Select value={subject} onValueChange={setSubject}>
      <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
      <SelectContent>
        {SUBJECTS.map(s => (
          <SelectItem key={s} value={s}>{s}</SelectItem>
        ))}
      </SelectContent>
    </Select>

    <Button onClick={generateTest}>Start Test</Button>
  </div>
);


}

// TEST SCREEN
if (phase === "active") {
const q = questions[currentIdx];


return (
  <div className="space-y-4">
    <div>Time: {timeLeft}s</div>

    <Card>
      <CardHeader>
        <CardTitle>{q.question_text}</CardTitle>
      </CardHeader>

      <CardContent>
        <RadioGroup
          value={answers[currentIdx] || ""}
          onValueChange={(val) =>
            setAnswers(a => ({ ...a, [currentIdx]: val }))
          }
        >
          {q.options.map((opt: string, i: number) => (
            <div key={i}>
              <RadioGroupItem value={opt} id={opt} />
              <Label htmlFor={opt}>{opt}</Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>

      <CardFooter>
        <Button onClick={handleSubmit}>Submit</Button>
      </CardFooter>
    </Card>
  </div>
);


}

// RESULT SCREEN
return ( <div className="space-y-4"> <h1 className="text-xl font-bold">Result</h1> <p>Score: {score}</p>
<Button onClick={() => setPhase("setup")}>Restart</Button> </div>
);
}
