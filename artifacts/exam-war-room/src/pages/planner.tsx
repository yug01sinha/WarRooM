import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { SUBJECTS } from "@/lib/cbseData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Planner() {
const { user } = useAuth();
const [exams, setExams] = useState<any[]>([]);
const [newSub, setNewSub] = useState("");
const [newDate, setNewDate] = useState("");

const loadData = async () => {
if (!user) return;
const { data } = await supabase.from('exam_schedule').select('*').eq('user_id', user.id);
setExams(data || []);
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

const generatePlan = async () => {
try {
const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
method: "POST",
headers: {
"Content-Type": "application/json",
"Authorization": "Bearer " + import.meta.env.VITE_GROQ_API_KEY,
},
body: JSON.stringify({
model: "llama3-70b-8192",
messages: [{
role: "user",
content: "Create a 7 day study plan for exams: " + JSON.stringify(exams)
}]
})
});


  const data = await res.json();
  console.log(data);
  toast.success("Plan generated (check console)");
} catch {
  toast.error("Failed to generate plan");
}


};

return ( <div className="space-y-4"> <h1 className="text-xl font-bold">Planner</h1>

```
  <Card>
    <CardContent className="space-y-3">
      <Select value={newSub} onValueChange={setNewSub}>
        <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
        <SelectContent>
          {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>

      <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />

      <Button onClick={handleAddExam}>Add Exam</Button>
      <Button onClick={generatePlan}>Generate AI Plan</Button>
    </CardContent>
  </Card>
</div>

);
}
