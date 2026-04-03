import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useGroqGenerateTest, useGroqAnalyzeResults } from "@workspace/api-client-react";
import type { WrongAnswer } from "@workspace/api-client-react";
import { CBSE_SYLLABUS, SUBJECTS } from "@/lib/cbseData";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Swords, Timer, Flag, ChevronRight, CheckCircle, Target, AlertTriangle } from "lucide-react";

type TestPhase = 'setup' | 'active' | 'results';

export default function MockTest() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<TestPhase>('setup');
  const [testType, setTestType] = useState<any>("chapter_test");
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");

  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [flags, setFlags] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(0);

  const [analysis, setAnalysis] = useState<any>(null);
  const [score, setScore] = useState(0);

  const generateTest = useGroqGenerateTest();
  const analyzeTest = useGroqAnalyzeResults();

  useEffect(() => {
    let timer: any;
    if (phase === 'active' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (phase === 'active' && timeLeft === 0) {
      handleSubmitTest();
    }
    return () => clearInterval(timer);
  }, [phase, timeLeft]);

  const handleStart = async () => {
    if (!subject) { toast.error("Subject required."); return; }
    if (testType === 'chapter_test' && !chapter) { toast.error("Chapter required for Chapter Test."); return; }

    try {
      const res = await generateTest.mutateAsync({
        data: {
          subject,
          testType,
          chapter: testType === 'chapter_test' ? chapter : null,
          numQuestions: testType === 'speed_round' ? 5 : 10
        }
      });

      setQuestions(res.questions);
      setPhase('active');
      setCurrentIdx(0);
      setAnswers({});
      setFlags({});
      const minutes = testType === 'speed_round' ? 10 : testType === 'chapter_test' ? 45 : 30;
      setTimeLeft(minutes * 60);
    } catch (err) {
      toast.error("Failed to generate test.");
    }
  };

  const handleSubmitTest = async () => {
    setPhase('results');

    let correct = 0;
    const wrongAns: WrongAnswer[] = [];

    questions.forEach((q, i) => {
      const userAns = answers[i] || "No answer";
      if (userAns === q.correct_answer) {
        correct += q.marks;
      } else {
        wrongAns.push({
          question: q.question_text,
          userAnswer: userAns,
          correctAnswer: q.correct_answer,
          topic: chapter || subject
        });
      }
    });

    const totalMarks = questions.reduce((acc, q) => acc + q.marks, 0);
    const finalScore = Math.round((correct / totalMarks) * 1000);
    setScore(finalScore);

    if (user) {
      await supabase.from('mock_tests').insert({
        user_id: user.id,
        subject,
        score: finalScore,
        total_questions: questions.length
      });
      await supabase.from('profiles').select('xp_points').eq('id', user.id).single().then(({ data }) => {
        if (data) {
          supabase.from('profiles').update({ xp_points: data.xp_points + 100 }).eq('id', user.id).then();
          toast.success("+100 XP. Battle Survived.");
        }
      });
    }

    if (wrongAns.length > 0) {
      try {
        const res = await analyzeTest.mutateAsync({
          data: { subject, wrongAnswers: wrongAns, score: correct, total: totalMarks }
        });
        setAnalysis(res);
      } catch (err) {
        console.error("Analysis failed");
      }
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (phase === 'setup') {
    return (
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold uppercase tracking-widest text-foreground flex items-center gap-2 md:gap-3">
            <Swords className="h-5 w-5 sm:h-7 sm:w-7 md:h-8 md:w-8 text-primary shrink-0" />
            Battle Arena
          </h1>
          <p className="text-muted-foreground uppercase text-[10px] sm:text-xs tracking-wider font-semibold mt-1">
            Configure mock test parameters.
          </p>
        </div>

        <Card className="border-primary/20 bg-black/20 backdrop-blur-sm">
          <CardContent className="p-4 sm:p-6 space-y-5 sm:space-y-6">
            <div className="space-y-3 sm:space-y-4">
              <Label className="uppercase tracking-widest text-primary text-xs font-bold">Engagement Type</Label>
              <RadioGroup value={testType} onValueChange={setTestType} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { value: 'chapter_test', label: 'Chapter Test (45m)' },
                  { value: 'mini_test', label: 'Mini Test (30m)' },
                  { value: 'speed_round', label: 'Speed Round (10m)' },
                ].map(opt => (
                  <div
                    key={opt.value}
                    className={`flex items-center space-x-2 border ${testType === opt.value ? 'border-primary bg-primary/10' : 'border-primary/20'} p-3 sm:p-4 rounded-lg cursor-pointer`}
                    onClick={() => setTestType(opt.value)}
                  >
                    <RadioGroupItem value={opt.value} id={opt.value} />
                    <Label htmlFor={opt.value} className="cursor-pointer font-bold tracking-wider uppercase text-xs sm:text-sm">{opt.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <Label className="uppercase tracking-widest text-primary text-xs font-bold">Target Coordinates</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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

                <Select value={chapter} onValueChange={setChapter} disabled={!subject || testType !== 'chapter_test'}>
                  <SelectTrigger className="bg-background border-primary/30 uppercase tracking-widest font-bold text-xs h-10 sm:h-12">
                    <SelectValue placeholder={testType === 'chapter_test' ? "SELECT CHAPTER" : "ALL CHAPTERS"} />
                  </SelectTrigger>
                  <SelectContent>
                    {subject && CBSE_SYLLABUS[subject as keyof typeof CBSE_SYLLABUS].map(chap => (
                      <SelectItem key={chap} value={chap} className="uppercase tracking-wider text-xs">{chap}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleStart}
              disabled={generateTest.isPending}
              className="w-full h-12 sm:h-14 text-sm sm:text-base tracking-widest uppercase font-bold"
            >
              {generateTest.isPending ? "Generating Battle Scenario..." : "Deploy to Arena"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === 'active') {
    const q = questions[currentIdx];
    return (
      <div className="flex flex-col gap-3" style={{ height: 'calc(100dvh - 8rem)' }}>
        {/* Timer bar */}
        <div className="flex items-center justify-between bg-card border border-primary/20 p-3 sm:p-4 rounded-lg shrink-0">
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="font-mono text-lg sm:text-2xl font-bold text-primary tracking-wider">{formatTime(timeLeft)}</span>
            <Progress value={(currentIdx / questions.length) * 100} className="w-20 sm:w-64 h-2" />
          </div>
          <Button variant="destructive" onClick={handleSubmitTest} size="sm" className="uppercase tracking-widest font-bold text-[10px] sm:text-xs h-8 sm:h-10">
            Submit
          </Button>
        </div>

        {/* Mobile question navigator - horizontal scroll */}
        <div className="md:hidden shrink-0 flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIdx(i)}
              className={`shrink-0 h-8 w-8 rounded text-xs font-bold border transition-colors ${
                currentIdx === i ? 'bg-primary text-background border-primary' :
                flags[i] ? 'border-accent text-accent bg-accent/10' :
                answers[i] ? 'border-primary/50 text-primary bg-primary/10' :
                'border-border text-muted-foreground bg-black/20'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <div className="flex-1 flex gap-4 min-h-0">
          {/* Question card */}
          <Card className="flex-1 border-primary/20 bg-black/20 flex flex-col min-h-0">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 shrink-0 p-4 sm:p-6">
              <div className="flex-1">
                <span className="text-primary uppercase tracking-widest font-bold text-xs">
                  Q{currentIdx + 1} of {questions.length}
                </span>
                <CardTitle className="text-sm sm:text-base md:text-lg mt-2 leading-snug">{q.question_text}</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className={`shrink-0 h-8 w-8 ${flags[currentIdx] ? "text-accent" : "text-muted-foreground"}`}
                onClick={() => setFlags(f => ({ ...f, [currentIdx]: !f[currentIdx] }))}
              >
                <Flag className="h-4 w-4" />
              </Button>
            </CardHeader>
            <ScrollArea className="flex-1 px-4 sm:px-6 pb-2">
              {q.question_type === 'mcq' && q.options ? (
                <RadioGroup
                  value={answers[currentIdx] || ""}
                  onValueChange={(val) => setAnswers(a => ({ ...a, [currentIdx]: val }))}
                  className="space-y-2 sm:space-y-3"
                >
                  {q.options.map((opt: string, i: number) => (
                    <div key={i} className={`flex items-center space-x-3 border p-3 sm:p-4 rounded-lg cursor-pointer ${answers[currentIdx] === opt ? 'border-primary bg-primary/10' : 'border-primary/20 hover:border-primary/50'}`}>
                      <RadioGroupItem value={opt} id={`opt-${i}`} />
                      <Label htmlFor={`opt-${i}`} className="flex-1 cursor-pointer text-xs sm:text-sm">{opt}</Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <Textarea
                  value={answers[currentIdx] || ""}
                  onChange={(e) => setAnswers(a => ({ ...a, [currentIdx]: e.target.value }))}
                  placeholder="Type your answer here..."
                  className="min-h-[150px] sm:min-h-[200px] bg-background border-primary/30 text-sm"
                />
              )}
            </ScrollArea>
            <CardFooter className="justify-between border-t border-primary/20 bg-black/40 p-3 sm:p-4 shrink-0">
              <Button
                variant="outline"
                onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
                disabled={currentIdx === 0}
                className="uppercase tracking-widest text-xs font-bold border-primary/30 h-8 sm:h-10"
              >
                Prev
              </Button>
              <Button
                onClick={() => setCurrentIdx(i => Math.min(questions.length - 1, i + 1))}
                disabled={currentIdx === questions.length - 1}
                className="uppercase tracking-widest text-xs font-bold h-8 sm:h-10"
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardFooter>
          </Card>

          {/* Desktop navigator sidebar */}
          <Card className="w-56 hidden md:flex flex-col border-primary/20 bg-black/20">
            <CardHeader className="p-4 border-b border-primary/20">
              <CardTitle className="uppercase tracking-widest text-xs text-primary">Navigator</CardTitle>
            </CardHeader>
            <ScrollArea className="flex-1 p-2">
              <div className="grid grid-cols-4 gap-2">
                {questions.map((_, i) => (
                  <Button
                    key={i}
                    variant={currentIdx === i ? "default" : "outline"}
                    className={`h-10 w-10 p-0 text-xs ${flags[i] ? 'border-accent text-accent' : answers[i] ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
                    onClick={() => setCurrentIdx(i)}
                  >
                    {i + 1}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold uppercase tracking-widest text-foreground flex items-center gap-2 md:gap-3">
          <Target className="h-5 w-5 sm:h-7 sm:w-7 md:h-8 md:w-8 text-primary shrink-0" />
          Mission Report
        </h1>
        <p className="text-muted-foreground uppercase text-[10px] sm:text-xs tracking-wider font-semibold mt-1">
          After-action analysis complete.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <Card className="border-primary/20 bg-black/20 text-center flex flex-col justify-center py-6 sm:py-8">
          <span className="text-muted-foreground uppercase tracking-widest text-xs font-bold mb-2">Battle Score</span>
          <span className="text-5xl sm:text-6xl font-mono font-bold text-primary">{score}</span>
          <span className="text-muted-foreground uppercase tracking-widest text-xs mt-1">/ 1000</span>
        </Card>

        {analysis ? (
          <Card className="sm:col-span-2 border-primary/20 bg-black/20">
            <CardHeader className="p-4">
              <CardTitle className="uppercase tracking-widest text-xs sm:text-sm text-primary flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> AI SWOT Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm p-4 pt-0">
              <div className="space-y-2">
                <span className="text-primary uppercase tracking-widest text-[10px] sm:text-xs font-bold">Strengths</span>
                <ul className="list-disc pl-4 text-muted-foreground space-y-1">
                  {analysis.strengths.slice(0, 2).map((s: string, i: number) => <li key={i}>{s}</li>)}
                </ul>
              </div>
              <div className="space-y-2">
                <span className="text-destructive uppercase tracking-widest text-[10px] sm:text-xs font-bold">Weaknesses</span>
                <ul className="list-disc pl-4 text-muted-foreground space-y-1">
                  {analysis.weaknesses.slice(0, 2).map((s: string, i: number) => <li key={i}>{s}</li>)}
                </ul>
              </div>
              <div className="col-span-2 text-xs text-muted-foreground bg-black/40 p-3 rounded border border-primary/10 mt-2">
                <span className="text-accent font-bold uppercase tracking-widest block mb-1">Error Pattern Detected:</span>
                {analysis.error_pattern}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="sm:col-span-2 border-primary/20 bg-black/20 flex items-center justify-center p-6">
            <p className="text-muted-foreground text-sm text-center uppercase tracking-wider">
              {analyzeTest.isPending ? "Generating tactical analysis..." : "Perfect score. No critical weaknesses detected."}
            </p>
          </Card>
        )}
      </div>

      <Card className="border-primary/20 bg-black/20">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="uppercase tracking-widest text-xs sm:text-sm text-primary">Detailed Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
          {questions.map((q, i) => {
            const isCorrect = answers[i] === q.correct_answer;
            return (
              <div key={i} className={`p-3 sm:p-4 border rounded-lg ${isCorrect ? 'border-primary/30 bg-primary/5' : 'border-destructive/30 bg-destructive/5'}`}>
                <div className="flex justify-between items-start gap-3">
                  <p className="font-medium text-xs sm:text-sm">{i + 1}. {q.question_text}</p>
                  {isCorrect ? <CheckCircle className="text-primary h-4 w-4 sm:h-5 sm:w-5 shrink-0" /> : <AlertTriangle className="text-destructive h-4 w-4 sm:h-5 sm:w-5 shrink-0" />}
                </div>
                {!isCorrect && (
                  <div className="mt-3 text-[11px] sm:text-xs space-y-1">
                    <p className="text-muted-foreground"><span className="uppercase font-bold tracking-widest">Your Answer:</span> {answers[i] || 'None'}</p>
                    <p className="text-primary"><span className="uppercase font-bold tracking-widest">Correct Answer:</span> {q.correct_answer}</p>
                    <p className="text-muted-foreground mt-2">{q.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
        <CardFooter className="justify-end bg-black/40 border-t border-primary/20 p-4">
          <Button onClick={() => setPhase('setup')} className="uppercase tracking-widest font-bold text-xs sm:text-sm h-9 sm:h-10">Return to Setup</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
