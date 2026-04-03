import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { CBSE_SYLLABUS, SUBJECTS } from "@/lib/cbseData";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

import { toast } from "sonner";
import { Send, Target, Bot, User, CheckCircle2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function Tutor() {
const { user } = useAuth();

const [subject, setSubject] = useState("");
const [chapter, setChapter] = useState("");
const [messages, setMessages] = useState<any[]>([]);
const [studentAnswer, setStudentAnswer] = useState("");
const [isEvaluating, setIsEvaluating] = useState(false);
const [missionComplete, setMissionComplete] = useState(false);
const [loading, setLoading] = useState(false);

const scrollRef = useRef<HTMLDivElement>(null);

useEffect(() => {
if (scrollRef.current) {
scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
}
}, [messages]);

// 🔥 GROQ CALL
const callAI = async (msgs: any[]) => {
const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
method: "POST",
headers: {
"Content-Type": "application/json",
"Authorization": "Bearer " + import.meta.env.VITE_GROQ_API_KEY,
},
body: JSON.stringify({
model: "llama3-70b-8192",
messages: msgs.map((m) => ({
role: m.role,
content: m.content,
})),
}),
});

```
const data = await res.json();
return data.choices?.[0]?.message?.content || "No response";
```

};

const handleStartBriefing = async () => {
if (!subject || !chapter) {
toast.error("Select subject & chapter");
return;
}


setMessages([]);
setMissionComplete(false);

const initialMsg = {
  role: "user",
content: "Teach me " + chapter + " from " + subject + " (CBSE Class 10) and ask me a question.",
};

setMessages([initialMsg]);
setLoading(true);

try {
  const response = await callAI([initialMsg]);
  setMessages((prev) => [...prev, { role: "assistant", content: response }]);
} catch {
  toast.error("AI failed");
} finally {
  setLoading(false);
}
```

};

const handleSubmitAnswer = async () => {
if (!studentAnswer.trim()) return;

```
const newMsgs = [...messages, { role: "user", content: studentAnswer }];
setMessages(newMsgs);
setStudentAnswer("");
setIsEvaluating(true);

try {
  const response = await callAI(newMsgs);
  setMessages((prev) => [...prev, { role: "assistant", content: response }]);

  if (response.toLowerCase().includes("correct")) {
    setMissionComplete(true);

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("xp_points")
        .eq("id", user.id)
        .single();

      if (profile) {
        await supabase
          .from("profiles")
          .update({ xp_points: profile.xp_points + 50 })
          .eq("id", user.id);

        toast.success("+50 XP Awarded");
      }
    }
  }
} catch {
  toast.error("Evaluation failed");
} finally {
  setIsEvaluating(false);
}


};

return ( <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]"> <h1 className="text-2xl font-bold flex gap-2 items-center"> <Target /> AI Tutor </h1>

```
  <Card>
    <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <Select value={subject} onValueChange={(val) => { setSubject(val); setChapter(""); }}>
        <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
        <SelectContent>
          {SUBJECTS.map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={chapter} onValueChange={setChapter} disabled={!subject}>
        <SelectTrigger><SelectValue placeholder="Chapter" /></SelectTrigger>
        <SelectContent>
          {subject &&
            CBSE_SYLLABUS[subject as keyof typeof CBSE_SYLLABUS].map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
        </SelectContent>
      </Select>

      <Button onClick={handleStartBriefing} disabled={loading}>
        Start
      </Button>
    </CardContent>
  </Card>

  <Card className="flex-1 flex flex-col">
    <ScrollArea className="flex-1 p-4" ref={scrollRef}>
      {messages.map((msg, i) => (
        <div key={i}>
          <b>{msg.role === "user" ? "You" : "AI"}:</b>
          <ReactMarkdown>{msg.content}</ReactMarkdown>
        </div>
      ))}

      {(loading || isEvaluating) && <p>Thinking...</p>}

      {missionComplete && (
        <Badge className="mt-4">Completed (+50 XP)</Badge>
      )}
    </ScrollArea>

    <CardFooter>
      <Textarea
        value={studentAnswer}
        onChange={(e) => setStudentAnswer(e.target.value)}
        placeholder="Your answer..."
      />

      <Button onClick={handleSubmitAnswer}>
        <Send />
      </Button>
    </CardFooter>
  </Card>
</div>
);
}
