import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useGroqNotesChat } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { BookOpen, Upload, Send, FileText, Trash2, Bot, User, ChevronDown } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export default function Notes() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<any[]>([]);
  const [activeDoc, setActiveDoc] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [question, setQuestion] = useState("");
  const [uploading, setUploading] = useState(false);

  const notesChat = useGroqNotesChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadDocs = async () => {
    if (!user) return;
    const { data } = await supabase.from('uploaded_docs').select('*').eq('user_id', user.id);
    setDocs(data || []);
  };

  useEffect(() => { loadDocs(); }, [user]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File exceeds 10MB limit.");
      return;
    }

    setUploading(true);
    const fileName = `${Date.now()}_${file.name}`;

    try {
      const { data, error } = await supabase.from('uploaded_docs').insert({
        user_id: user.id,
        file_name: file.name,
        storage_path: `mock_path_${fileName}`,
        extracted_text: "Simulated extracted text content from document. " + file.name,
        subject: "General"
      }).select().single();

      if (error) throw error;

      toast.success("Document acquired and processed.");
      loadDocs();
      if (!activeDoc) setActiveDoc(data);
    } catch (err) {
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAsk = async () => {
    if (!question.trim() || !activeDoc) return;

    const newMsgs = [...messages, { role: 'user', content: question }];
    setMessages(newMsgs);
    setQuestion("");

    try {
      const res = await notesChat.mutateAsync({
        data: {
          question: newMsgs[newMsgs.length - 1].content,
          documentText: activeDoc.extracted_text,
          previousMessages: newMsgs.slice(0, -1)
        }
      });
      setMessages(prev => [...prev, { role: 'assistant', content: res.content }]);
    } catch (error) {
      toast.error("Analysis failed.");
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('uploaded_docs').delete().eq('id', id);
    if (activeDoc?.id === id) setActiveDoc(null);
    loadDocs();
  };

  return (
    <div className="flex flex-col gap-3 md:gap-4" style={{ height: 'calc(100dvh - 8.5rem)' }}>
      <div className="shrink-0">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold uppercase tracking-widest text-foreground flex items-center gap-2 md:gap-3">
          <BookOpen className="h-5 w-5 sm:h-7 sm:w-7 md:h-8 md:w-8 text-primary shrink-0" />
          Intel Database
        </h1>
        <p className="text-muted-foreground uppercase text-[10px] sm:text-xs tracking-wider font-semibold mt-1">
          Upload documents and interrogate the data.
        </p>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-3 md:gap-6 min-h-0">
        {/* Mobile: Doc selector as sheet */}
        <div className="md:hidden shrink-0 flex gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="border-primary/30 text-primary uppercase tracking-widest font-bold text-[10px] flex-1 h-9">
                <FileText className="h-3 w-3 mr-1" />
                {activeDoc ? activeDoc.file_name.substring(0, 20) + '…' : 'Select Document'}
                <ChevronDown className="h-3 w-3 ml-auto" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="bg-background border-t border-primary/20 h-64">
              <SheetHeader>
                <SheetTitle className="uppercase tracking-widest text-primary text-sm">Intel Files</SheetTitle>
              </SheetHeader>
              <div className="space-y-2 mt-4 overflow-y-auto max-h-36">
                {docs.length === 0 ? (
                  <p className="text-muted-foreground uppercase text-[10px] text-center p-4">No documents.</p>
                ) : docs.map(doc => (
                  <div key={doc.id} className={`flex items-center justify-between p-2 rounded cursor-pointer border ${activeDoc?.id === doc.id ? 'bg-primary/20 border-primary' : 'bg-black/40 border-primary/10'}`} onClick={() => setActiveDoc(doc)}>
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="h-4 w-4 shrink-0 text-primary" />
                      <span className="text-xs truncate font-mono">{doc.file_name}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive shrink-0" onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} size="sm" variant="secondary" className="uppercase tracking-widest font-bold text-[10px] h-9 shrink-0">
            <Upload className="h-3 w-3 mr-1" />
            {uploading ? "Loading..." : "Upload"}
          </Button>
          <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.txt,.docx" onChange={handleUpload} />
        </div>

        {/* Desktop: Sidebar */}
        <Card className="hidden md:flex w-64 shrink-0 border-primary/20 bg-black/20 flex-col h-full">
          <CardHeader className="p-4 border-b border-primary/20">
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full uppercase tracking-widest font-bold text-xs" variant="secondary">
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "Extracting..." : "Upload Intel"}
            </Button>
            <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.txt,.docx" onChange={handleUpload} />
          </CardHeader>
          <ScrollArea className="flex-1 p-2">
            <div className="space-y-2">
              {docs.length === 0 ? (
                <p className="text-muted-foreground uppercase text-[10px] text-center p-4">No documents found.</p>
              ) : (
                docs.map(doc => (
                  <div key={doc.id} className={`flex items-center justify-between p-2 rounded cursor-pointer border transition-colors ${activeDoc?.id === doc.id ? 'bg-primary/20 border-primary' : 'bg-black/40 border-primary/10 hover:border-primary/40'}`} onClick={() => setActiveDoc(doc)}>
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className={`h-4 w-4 shrink-0 ${activeDoc?.id === doc.id ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="text-xs truncate font-mono">{doc.file_name}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive shrink-0" onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col min-h-0 border-primary/20 bg-black/20 backdrop-blur-sm overflow-hidden">
          {!activeDoc ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/50">
              <BookOpen className="h-12 w-12 sm:h-16 sm:w-16 mb-4" />
              <p className="uppercase tracking-widest font-bold text-xs sm:text-sm text-center px-4">Select or Upload a Document</p>
            </div>
          ) : (
            <>
              <div className="p-2 sm:p-3 border-b border-primary/20 bg-primary/5 flex items-center gap-2 shrink-0">
                <span className="text-[10px] sm:text-xs uppercase font-bold text-primary tracking-widest">Active Source:</span>
                <span className="font-mono text-xs sm:text-sm truncate">{activeDoc.file_name}</span>
              </div>
              <ScrollArea className="flex-1 p-3 sm:p-4" ref={scrollRef}>
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50">
                    <p className="uppercase tracking-widest font-bold text-xs sm:text-sm text-center">Data loaded. Ready for interrogation.</p>
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
                            <div className="prose prose-sm dark:prose-invert text-foreground">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          ) : (
                            <div className="text-foreground/90">{msg.content}</div>
                          )}
                        </div>
                      </div>
                    ))}
                    {notesChat.isPending && (
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

              <CardFooter className="p-3 sm:p-4 border-t border-primary/20 bg-black/40 shrink-0">
                <div className="flex w-full gap-2 relative">
                  <Textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Interrogate the document..."
                    className="resize-none min-h-[52px] sm:min-h-[60px] bg-background border-primary/30 pr-12 sm:pr-14 font-mono text-xs sm:text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAsk();
                      }
                    }}
                    disabled={notesChat.isPending}
                  />
                  <Button
                    size="icon"
                    className="absolute right-2 bottom-2 h-8 w-8 sm:h-10 sm:w-10 shrink-0"
                    onClick={handleAsk}
                    disabled={!question.trim() || notesChat.isPending}
                  >
                    <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
