import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useGroqDoubt } from "@workspace/api-client-react";
import { SUBJECTS } from "@/lib/cbseData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Send, Crosshair, Bot, User, History } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CardHeader, CardContent } from "@/components/ui/card";

export default function Doubt() {
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  const doubtMutation = useGroqDoubt();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (user) {
      supabase.from('doubt_history').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
        .then(({ data }) => setHistory(data || []));
    }
  }, [user]);

  const handleAsk = async () => {
    if (!question.trim()) return;

    const newMsgs = [...messages, { role: 'user', content: question }];
    setMessages(newMsgs);
    setQuestion("");

    try {
      const res = await doubtMutation.mutateAsync({
        data: {
          question: newMsgs[newMsgs.length - 1].content,
          subject: subject || null,
          previousMessages: newMsgs.slice(0, -1)
        }
      });

      const responseContent = res.content;
      setMessages(prev => [...prev, { role: 'assistant', content: responseContent }]);

      if (user) {
        const { data: profile } = await supabase.from('profiles').select('xp_points').eq('id', user.id).single();
        if (profile) {
          await supabase.from('profiles').update({ xp_points: profile.xp_points + 10 }).eq('id', user.id);
          toast.success("+10 XP Awarded. Intel Collected.");
        }
        await supabase.from('doubt_history').insert({
          user_id: user.id,
          subject: subject || 'General',
          question: newMsgs[newMsgs.length - 1].content,
          answer: responseContent
        });
      }
    } catch (error) {
      toast.error("Comms link failed.");
    }
  };

  return (
    <div className="flex flex-col gap-3 md:gap-4" style={{ height: 'calc(100dvh - 8.5rem)' }}>
      <div className="shrink-0 flex items-start justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold uppercase tracking-widest text-foreground flex items-center gap-2 md:gap-3">
            <Crosshair className="h-5 w-5 sm:h-7 sm:w-7 md:h-8 md:w-8 text-primary shrink-0" />
            Doubt Solver
          </h1>
          <p className="text-muted-foreground uppercase text-[10px] sm:text-xs tracking-wider font-semibold mt-1">
            Tactical Query System. State your confusion.
          </p>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="border-primary/30 text-primary uppercase tracking-widest font-bold text-[10px] sm:text-xs h-8 sm:h-10 shrink-0 ml-2">
              <History className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Intel History</span>
              <span className="sm:hidden">History</span>
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[320px] sm:w-[420px] bg-background border-l border-primary/20">
            <SheetHeader>
              <SheetTitle className="uppercase tracking-widest text-primary flex items-center gap-2 text-sm">
                <History className="h-4 w-4" />
                Previous Queries
              </SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(100dvh-8rem)] mt-6 pr-4">
              <div className="space-y-4">
                {history.length > 0 ? history.map((item) => (
                  <Card key={item.id} className="border-primary/20 bg-black/20">
                    <CardHeader className="p-3 pb-0">
                      <div className="text-xs text-primary font-bold uppercase tracking-wider">{item.subject}</div>
                    </CardHeader>
                    <CardContent className="p-3 pt-1 space-y-2">
                      <p className="text-sm font-medium line-clamp-2">{item.question}</p>
                      <p className="text-xs text-muted-foreground line-clamp-3">{item.answer}</p>
                    </CardContent>
                  </Card>
                )) : (
                  <p className="text-muted-foreground uppercase text-xs font-semibold text-center mt-10">No history available.</p>
                )}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>

      <Card className="flex-1 flex flex-col min-h-0 border-primary/20 bg-black/20 backdrop-blur-sm overflow-hidden">
        <ScrollArea className="flex-1 p-3 sm:p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50 gap-4 mt-12 sm:mt-20">
              <Crosshair className="h-12 w-12 sm:h-16 sm:w-16" />
              <p className="uppercase tracking-widest font-bold text-xs sm:text-sm">System Ready for Queries</p>
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
                      <div className="prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-pre:bg-black/50 text-foreground">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="text-foreground/90">{msg.content}</div>
                    )}
                  </div>
                </div>
              ))}
              {doubtMutation.isPending && (
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
            </div>
          )}
        </ScrollArea>

        <div className="p-3 sm:p-4 border-t border-primary/20 bg-black/40 shrink-0 space-y-2 sm:space-y-3">
          <div className="w-full sm:w-1/3 sm:min-w-[200px]">
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger className="bg-background border-primary/30 uppercase tracking-widest font-bold text-[10px] sm:text-xs h-9 sm:h-10">
                <SelectValue placeholder="OPTIONAL: SELECT SUBJECT" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="null">General</SelectItem>
                {SUBJECTS.map(sub => (
                  <SelectItem key={sub} value={sub} className="uppercase tracking-wider text-xs">{sub}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-full gap-2 relative">
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="State your question, Cadet..."
              className="resize-none min-h-[52px] sm:min-h-[60px] bg-background border-primary/30 pr-12 sm:pr-14 font-mono text-xs sm:text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAsk();
                }
              }}
              disabled={doubtMutation.isPending}
            />
            <Button
              size="icon"
              className="absolute right-2 bottom-2 h-8 w-8 sm:h-10 sm:w-10 shrink-0"
              onClick={handleAsk}
              disabled={!question.trim() || doubtMutation.isPending}
            >
              <Send className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
