import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useGroqTutor, useGroqEvaluateAnswer } from "@workspace/api-client-react";
import { CBSE_SYLLABUS, SUBJECTS } from "@/lib/cbseData";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Send, Target, Bot, User, CheckCircle2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';

export default function Tutor() {
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [studentAnswer, setStudentAnswer] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [missionComplete, setMissionComplete] = useState(false);

  const tutorMutation = useGroqTutor();
  const evaluateMutation = useGroqEvaluateAnswer();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleStartBriefing = async () => {
    if (!subject || !chapter) {
      toast.error("Select target coordinates (Subject & Chapter)");
      return;
    }

    setMessages([]);
    setMissionComplete(false);

    const initialMsg = { role: 'user' as const, content: `Brief me on the core concepts of ${chapter} from ${subject} for CBSE Class 10. Then ask me a comprehension question.` };
    setMessages([initialMsg]);

    try {
      const res = await tutorMutation.mutateAsync({
        data: { subject, chapter, previousMessages: [initialMsg] }
      });
      setMessages(prev => [...prev, { role: 'assistant', content: res.content }]);
    } catch (error) {
      toast.error("Comms link failed. Try again.");
    }
  };

  const handleSubmitAnswer = async () => {
    if (!studentAnswer.trim()) return;

    const newMsgs = [...messages, { role: 'user', content: studentAnswer }];
    setMessages(newMsgs);
    setStudentAnswer("");
    setIsEvaluating(true);

    try {
      const res = await evaluateMutation.mutateAsync({
        data: {
          subject,
          chapter,
          teachingContent: messages[1]?.content || "",
          comprehensionQuestion: "Provided in previous message",
          studentAnswer: studentAnswer
        }
      });

      setMessages(prev => [...prev, { role: 'assistant', content: res.content }]);

      if (res.content.toLowerCase().includes("correct") || res.content.toLowerCase().includes("good job")) {
        setMissionComplete(true);
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('xp_points').eq('id', user.id).single();
          if (profile) {
            await supabase.from('profiles').update({ xp_points: profile.xp_points + 50 }).eq('id', user.id);
            toast.success("+50 XP Awarded. Objective Secured.");
          }
          await supabase.from('topic_progress').upsert({
            user_id: user.id, subject, chapter,
            status: 'Revised', last_reviewed: new Date().toISOString()
          }, { onConflict: 'user_id,subject,chapter' });
        }
      }
    } catch (error) {
      toast.error("Evaluation failed.");
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 md:gap-4" style={{ height: 'calc(100dvh - 8.5rem)' }}>
      <div className="shrink-0">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold uppercase tracking-widest text-foreground flex items-center gap-2 md:gap-3">
          <Target className="h-5 w-5 sm:h-7 w-7 md:h-8 md:w-8 text-primary shrink-0" />
          Mission Briefing
        </h1>
        <p className="text-muted-foreground uppercase text-[10px] sm:text-xs tracking-wider font-semibold mt-1">
          AI Instructor active. Select target topic.
        </p>
      </div>

      <Card className="border-primary/20 bg-black/20 backdrop-blur-sm shrink-0">
        <CardContent className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
          <Select value={subject} onValueChange={(val) => { setSubject(val); setChapter(""); }}>
            <SelectTrigger className="bg-background border-primary/30 uppercase tracking-widest font-bold text-xs h-10 sm:h-12">
              <SelectValue placeholder="SELECT SUBJECT" />
            </SelectTrigger>
            <SelectContent>
              {SUBJECTS.map(sub => (
                <SelectItem key={sub} value={sub} className="uppercase tracking-wider text-xs">{sub}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={chapter} onValueChange={setChapter} disabled={!subject}>
            <SelectTrigger className="bg-background border-primary/30 uppercase tracking-widest font-bold text-xs h-10 sm:h-12">
              <SelectValue placeholder="SELECT CHAPTER" />
            </SelectTrigger>
            <SelectContent>
              {subject && CBSE_SYLLABUS[subject as keyof typeof CBSE_SYLLABUS].map(chap => (
                <SelectItem key={chap} value={chap} className="uppercase tracking-wider text-xs">{chap}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={handleStartBriefing}
            disabled={tutorMutation.isPending || !subject || !chapter}
            className="h-10 sm:h-12 uppercase tracking-widest font-bold w-full"
          >
            {tutorMutation.isPending ? "Establishing Link..." : "Initiate Briefing"}
          </Button>
        </CardContent>
      </Card>

      <Card className="flex-1 flex flex-col min-h-0 border-primary/20 bg-black/20 backdrop-blur-sm overflow-hidden">
        <ScrollArea className="flex-1 p-3 sm:p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50 gap-4 mt-12 sm:mt-20">
              <Target className="h-12 w-12 sm:h-16 sm:w-16" />
              <p className="uppercase tracking-widest font-bold text-xs sm:text-sm">Awaiting Target Coordinates</p>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6 pb-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 sm:gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`shrink-0 h-7 w-7 sm:h-8 sm:w-8 rounded flex items-center justify-center ${msg.role === 'user' ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-primary/20 text-primary border border-primary/30'}`}>
                    {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={`max-w-[85%] sm:max-w-[80%] rounded-lg p-3 sm:p-4 text-xs sm:text-sm ${msg.role === 'user' ? 'bg-accent/10 border border-accent/20' : 'bg-card border border-primary/20'}`}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border prose-pre:border-primary/20 text-foreground">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="text-foreground/90">{msg.content}</div>
                    )}
                  </div>
                </div>
              ))}
              {(tutorMutation.isPending || isEvaluating) && (
                <div className="flex gap-2 sm:gap-3">
                  <div className="shrink-0 h-7 w-7 sm:h-8 sm:w-8 rounded flex items-center justify-center bg-primary/20 text-primary border border-primary/30">
                    <Bot className="h-4 w-4 animate-pulse" />
                  </div>
                  <div className="rounded-lg p-3 sm:p-4 bg-card border border-primary/20 flex items-center gap-2">
                    <div className="h-2 w-2 bg-primary rounded-full animate-bounce"></div>
                    <div className="h-2 w-2 bg-primary rounded-full animate-bounce delay-150"></div>
                    <div className="h-2 w-2 bg-primary rounded-full animate-bounce delay-300"></div>
                  </div>
                </div>
              )}
              {missionComplete && (
                <div className="flex justify-center py-4">
                  <Badge className="bg-primary/20 text-primary border-primary hover:bg-primary/30 px-4 py-2 text-xs sm:text-sm uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Objective Secured (+50 XP)
                  </Badge>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <CardFooter className="p-3 sm:p-4 border-t border-primary/20 bg-black/40 shrink-0">
          <div className="flex w-full gap-2 relative">
            <Textarea
              value={studentAnswer}
              onChange={(e) => setStudentAnswer(e.target.value)}
              placeholder="Enter your response, Cadet..."
              className="resize-none min-h-[52px] sm:min-h-[60px] bg-background border-primary/30 pr-12 sm:pr-14 font-mono text-xs sm:text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitAnswer();
                }
              }}
              disabled={messages.length === 0 || tutorMutation.isPending || isEvaluating || missionComplete}
            />
            <Button
              size="icon"
              className="absolute right-2 bottom-2 h-8 w-8 sm:h-10 sm:w-10 shrink-0"
              onClick={handleSubmitAnswer}
              disabled={!studentAnswer.trim() || tutorMutation.isPending || isEvaluating || missionComplete}
            >
              <Send className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
