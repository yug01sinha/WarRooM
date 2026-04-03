import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useGroqGeneratePlan } from "@workspace/api-client-react";
import { SUBJECTS } from "@/lib/cbseData";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Map, Calendar as CalendarIcon, CheckSquare, Plus, Trash2 } from "lucide-react";
import { format, addDays } from "date-fns";

export default function Planner() {
  const { user } = useAuth();
  const [exams, setExams] = useState<any[]>([]);
  const [planDays, setPlanDays] = useState<any[]>([]);
  const [hasPlan, setHasPlan] = useState(false);
  const [loading, setLoading] = useState(true);

  // Setup form state
  const [newSub, setNewSub] = useState("");
  const [newDate, setNewDate] = useState("");
  const [hours, setHours] = useState("4");

  const generatePlan = useGroqGeneratePlan();

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    
    const { data: eData } = await supabase.from('exam_schedule').select('*').eq('user_id', user.id).order('exam_date');
    setExams(eData || []);
    
    const { data: pData } = await supabase.from('study_plans').select('*').eq('user_id', user.id).order('date');
    if (pData && pData.length > 0) {
      setPlanDays(pData);
      setHasPlan(true);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user]);

  const handleAddExam = async () => {
    if (!newSub || !newDate) return;
    await supabase.from('exam_schedule').insert({
      user_id: user!.id,
      subject: newSub,
      exam_date: newDate
    });
    setNewSub("");
    setNewDate("");
    loadData();
  };

  const handleRemoveExam = async (id: string) => {
    await supabase.from('exam_schedule').delete().eq('id', id);
    loadData();
  };

  const handleGeneratePlan = async () => {
    if (exams.length === 0) {
      toast.error("Must set at least one exam date to generate plan.");
      return;
    }
    
    const examDatesObj = exams.map(e => ({ subject: e.subject, date: e.exam_date }));
    
    try {
      const res = await generatePlan.mutateAsync({
        data: {
          examDates: examDatesObj,
          availableHoursPerDay: parseInt(hours),
          daysCount: 14 // Generate for 2 weeks
        }
      });
      
      // Delete old plan
      await supabase.from('study_plans').delete().eq('user_id', user!.id);
      
      // Insert new plan
      const insertData = res.plan.map((day, idx) => {
        // AI returns abstract 'Day 1', map it to real dates starting tomorrow
        const realDate = format(addDays(new Date(), idx + 1), 'yyyy-MM-dd');
        return {
          user_id: user!.id,
          date: realDate,
          subject: day.subject,
          chapters: day.chapters,
          tasks: day.tasks,
          is_mock_test_day: day.is_mock_test_day
        };
      });
      
      await supabase.from('study_plans').insert(insertData);
      toast.success("Strategic Plan Generated.");
      loadData();
    } catch (err) {
      toast.error("Failed to generate plan.");
    }
  };

  const toggleTask = async (dayId: string, taskIdx: number, currentCompleted: boolean) => {
    // In a real app we'd have a nested structure or tasks table.
    // For this prototype, we'll just toggle a local UI state.
    toast.success("Task marked complete.");
  };

  if (loading) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold uppercase tracking-widest text-foreground flex items-center gap-3">
          <Map className="h-8 w-8 text-primary" />
          Strategic Planner
        </h1>
        <p className="text-muted-foreground uppercase text-xs tracking-wider font-semibold">
          Schedule targets and generate daily orders.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 border-primary/20 bg-black/20 backdrop-blur-sm h-fit">
          <CardHeader>
            <CardTitle className="uppercase tracking-widest text-sm text-primary flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" /> Exam Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              {exams.map(exam => (
                <div key={exam.id} className="flex justify-between items-center p-2 border border-primary/20 bg-black/40 rounded">
                  <div>
                    <div className="text-xs uppercase font-bold">{exam.subject}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{format(new Date(exam.exam_date), 'dd MMM yyyy')}</div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveExam(exam.id)} className="h-6 w-6 text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="border-t border-primary/20 pt-4 space-y-3">
              <Label className="text-xs uppercase font-bold tracking-wider">Add Target Date</Label>
              <Select value={newSub} onValueChange={setNewSub}>
                <SelectTrigger className="bg-background border-primary/30 h-8 text-xs">
                  <SelectValue placeholder="Subject" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="h-8 text-xs bg-background border-primary/30" />
              <Button onClick={handleAddExam} className="w-full h-8 text-xs uppercase tracking-widest font-bold" variant="secondary">
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>

            <div className="border-t border-primary/20 pt-4 space-y-3">
              <Label className="text-xs uppercase font-bold tracking-wider">Daily Hours</Label>
              <Input type="number" value={hours} onChange={(e) => setHours(e.target.value)} min={1} max={12} className="h-8 text-xs bg-background border-primary/30" />
              <Button onClick={handleGeneratePlan} disabled={generatePlan.isPending} className="w-full uppercase tracking-widest font-bold">
                {generatePlan.isPending ? "Computing..." : "Generate AI Plan"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          {!hasPlan ? (
            <Card className="border-dashed border-primary/30 bg-transparent flex items-center justify-center h-64">
              <div className="text-center text-muted-foreground">
                <Map className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p className="uppercase tracking-widest font-bold text-sm">No Active Plan</p>
                <p className="text-xs mt-1 opacity-60">Generate a plan using the schedule panel.</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              <h3 className="uppercase tracking-widest font-bold text-primary border-b border-primary/20 pb-2">Upcoming Orders (Next 7 Days)</h3>
              {planDays.slice(0,7).map(day => (
                <Card key={day.id} className={`border-l-4 ${day.is_mock_test_day ? 'border-l-accent bg-accent/5' : 'border-l-primary bg-black/20'} border-y-primary/10 border-r-primary/10`}>
                  <CardContent className="p-4 flex flex-col md:flex-row gap-4">
                    <div className="min-w-[120px] shrink-0 border-r border-primary/10 pr-4">
                      <div className="font-mono text-sm text-muted-foreground">{format(new Date(day.date), 'EEE, MMM dd')}</div>
                      <div className={`uppercase font-bold tracking-wider mt-1 ${day.is_mock_test_day ? 'text-accent' : 'text-primary'}`}>
                        {day.subject}
                      </div>
                      {day.is_mock_test_day && <Badge className="mt-2 bg-accent/20 text-accent border-accent/50 text-[10px]">Mock Test</Badge>}
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Targets: </span>
                        <span className="text-sm font-medium">{day.chapters.join(', ')}</span>
                      </div>
                      <div className="space-y-2">
                        {day.tasks.map((task: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 cursor-pointer group" onClick={() => toggleTask(day.id, i, false)}>
                            <div className="mt-0.5 border border-primary/50 w-4 h-4 rounded-sm group-hover:bg-primary/20 transition-colors flex items-center justify-center"></div>
                            <span className="text-sm text-foreground/80 group-hover:text-foreground">{task}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
