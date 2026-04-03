import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { SUBJECTS } from "@/lib/cbseData";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import { toast } from "sonner";
import { Send, Crosshair, Bot, User, History } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function Doubt() {
const { user } = useAuth();

const [subject, setSubject] = useState("");
const [question, setQuestion] = useState("");
const [messages, setMessages] = useState<any[]>([]);
const [history, setHistory] = useState<any[]>([]);
const [loading, setLoading] = useState(false);

const scrollRef = useRef<HTMLDivElement>(null);

useEffect(() => {
if (scrollRef.current) {
scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
}
}, [messages]);

useEffect(() => {
if (user) {
supabase
.from("doubt_history")
.select("*")
.eq("user_id", user.id)
.order("created_at", { ascending: false })
.limit(20)
.then(({ data }) => setHistory(data || []));
}
}, [user]);

const handleAsk = async () => {
if (!question.trim()) return;

```
const newMsgs = [...messages, { role: "user", content: question }];
setMessages(newMsgs);
setQuestion("");
setLoading(true);

try {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + import.meta.env.VITE_GROQ_API_KEY,
    },
    body: JSON.stringify({
      model: "llama3-70b-8192",
      messages: newMsgs.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  const data = await res.json();
  const responseContent = data.choices?.[0]?.message?.content || "No response.";

  setMessages((prev) => [...prev, { role: "assistant", content: responseContent }]);

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("xp_points")
      .eq("id", user.id)
      .single();

    if (profile) {
      await supabase
        .from("profiles")
        .update({ xp_points: profile.xp_points + 10 })
        .eq("id", user.id);

      toast.success("+10 XP Awarded");
    }

    await supabase.from("doubt_history").insert({
      user_id: user.id,
      subject: subject || "General",
      question,
      answer: responseContent,
    });
  }
} catch (err) {
  toast.error("AI request failed");
} finally {
  setLoading(false);
}
```

};

return ( <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]"> <div className="flex justify-between items-start"> <div> <h1 className="text-2xl font-bold flex gap-2 items-center"> <Crosshair className="text-green-400" /> Doubt Solver </h1> <p className="text-xs text-gray-400">Ask anything</p> </div>

```
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">
          <History /> History
        </Button>
      </SheetTrigger>

      <SheetContent>
        <SheetHeader>
          <SheetTitle>History</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-full mt-4">
          {history.map((item) => (
            <Card key={item.id} className="mb-3">
              <CardHeader>{item.subject}</CardHeader>
              <CardContent>
                <p>{item.question}</p>
                <p className="text-sm text-gray-500">{item.answer}</p>
              </CardContent>
            </Card>
          ))}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  </div>

  <Card className="flex-1 flex flex-col">
    <ScrollArea className="flex-1 p-4" ref={scrollRef}>
      {messages.map((msg, i) => (
        <div key={i} className="mb-4">
          <b>{msg.role === "user" ? "You" : "AI"}:</b>
          <ReactMarkdown>{msg.content}</ReactMarkdown>
        </div>
      ))}

      {loading && <p>Thinking...</p>}
    </ScrollArea>

    <div className="p-4 flex gap-2">
      <Textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask your doubt..."
      />

      <Button onClick={handleAsk} disabled={loading}>
        <Send />
      </Button>
    </div>
  </Card>
</div>
);
}
