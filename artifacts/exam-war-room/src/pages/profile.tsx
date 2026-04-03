import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { getRank, getNextRankXp } from "@/lib/cbseData";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { UserCircle, Flame, Shield, Calendar as CalendarIcon, Edit2 } from "lucide-react";
import { format } from "date-fns";

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [exams, setExams] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({data}) => {
        setProfile(data);
        setEditName(data?.full_name || "");
      });
      supabase.from('exam_schedule').select('*').eq('user_id', user.id).order('exam_date').then(({data}) => {
        setExams(data || []);
      });
    }
  }, [user]);

  const handleSaveName = async () => {
    if (!editName.trim()) return;
    const { error } = await supabase.from('profiles').update({ full_name: editName }).eq('id', user!.id);
    if (!error) {
      setProfile({ ...profile, full_name: editName });
      setIsEditing(false);
      toast.success("Profile updated");
    }
  };

  if (!profile) return null;

  const xp = profile.xp_points || 0;
  const currentRank = getRank(xp);
  const nextXp = getNextRankXp(xp);
  const progress = nextXp > xp ? (xp / nextXp) * 100 : 100;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold uppercase tracking-widest text-foreground flex items-center gap-3">
          <UserCircle className="h-8 w-8 text-primary" />
          Service Record
        </h1>
        <p className="text-muted-foreground uppercase text-xs tracking-wider font-semibold">
          Cadet Details & Performance Metrics
        </p>
      </div>

      <Card className="border-primary/20 bg-black/20 backdrop-blur-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Shield className="h-48 w-48 text-primary" />
        </div>
        <CardContent className="p-8 flex flex-col md:flex-row gap-8 items-center md:items-start relative z-10">
          <Avatar className="h-32 w-32 border-4 border-primary/50 shadow-[0_0_20px_rgba(0,255,136,0.3)]">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-primary/20 text-primary text-4xl font-bold">
              {profile.full_name?.[0]?.toUpperCase() || 'C'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 w-full space-y-4 text-center md:text-left">
            <div className="space-y-1">
              {isEditing ? (
                <div className="flex items-center gap-2 max-w-sm mx-auto md:mx-0">
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-black/50 border-primary/30 text-lg uppercase tracking-wider" />
                  <Button onClick={handleSaveName} size="sm" className="uppercase tracking-widest font-bold">Save</Button>
                </div>
              ) : (
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <h2 className="text-2xl font-bold uppercase tracking-widest">{profile.full_name}</h2>
                  <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="h-8 w-8 text-muted-foreground hover:text-primary">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <p className="text-muted-foreground font-mono text-sm">{profile.email}</p>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <div className="bg-primary/10 border border-primary/30 px-4 py-2 rounded flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="uppercase tracking-widest font-bold text-sm text-primary">{currentRank}</span>
              </div>
              <div className="bg-accent/10 border border-accent/30 px-4 py-2 rounded flex items-center gap-2">
                <Flame className="h-5 w-5 text-accent" />
                <span className="uppercase tracking-widest font-bold text-sm text-accent">{profile.streak_count} Day Streak</span>
              </div>
            </div>

            <div className="pt-4 space-y-2">
              <div className="flex justify-between text-xs uppercase tracking-widest font-bold text-muted-foreground">
                <span>{xp} XP</span>
                <span>{nextXp > xp ? `${nextXp} XP (Next Rank)` : 'Max Rank'}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-black/20 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="uppercase tracking-widest text-sm text-primary flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Confirmed Exam Dates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {exams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exams.map(exam => (
                <div key={exam.id} className="flex justify-between items-center p-3 border border-primary/20 rounded bg-black/40">
                  <span className="uppercase font-bold tracking-wider text-sm">{exam.subject}</span>
                  <span className="font-mono text-primary">{format(new Date(exam.exam_date), "dd MMM yyyy")}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground uppercase text-xs font-semibold tracking-wider text-center p-4">No exams scheduled.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
