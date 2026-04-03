import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { getRank } from "@/lib/cbseData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { Shield, Target, Activity, Flame, Clock, Crosshair, AlertTriangle } from "lucide-react";
import { format, differenceInDays } from "date-fns";

export default function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [exams, setExams] = useState<any[]>([]);
  const [mockTests, setMockTests] = useState<any[]>([]);
  const [weakTopics, setWeakTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function loadDashboard() {
      try {
        // Upsert profile so it always exists (handles first-time login)
        const { data: profileData } = await supabase
          .from('profiles')
          .upsert({
            id: user!.id,
            email: user!.email,
            full_name: user!.user_metadata?.full_name || user!.email?.split('@')[0] || 'Cadet',
          }, { onConflict: 'id', ignoreDuplicates: true })
          .select()
          .maybeSingle();

        // Fetch profile after upsert
        const { data: fetchedProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user!.id)
          .maybeSingle();

        const currentProfile = fetchedProfile;
        setProfile(currentProfile);

        // Update streak
        if (currentProfile) {
          const today = new Date().toISOString().split('T')[0];
          const lastActive = currentProfile.last_active?.split('T')[0];

          if (lastActive !== today) {
            let newStreak = currentProfile.streak_count || 0;
            if (lastActive) {
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              const yesterdayStr = yesterday.toISOString().split('T')[0];
              if (lastActive === yesterdayStr) {
                newStreak += 1;
              } else if (lastActive < yesterdayStr) {
                newStreak = 0;
              }
            } else {
              newStreak = 1;
            }

            await supabase
              .from('profiles')
              .update({ streak_count: newStreak, last_active: new Date().toISOString() })
              .eq('id', user!.id);

            setProfile({ ...currentProfile, streak_count: newStreak });
          }
        }

        // Load exams
        const { data: examData } = await supabase
          .from('exam_schedule')
          .select('*')
          .eq('user_id', user!.id)
          .order('exam_date', { ascending: true });
        setExams(examData || []);

        // Load mock tests
        const { data: testData } = await supabase
          .from('mock_tests')
          .select('*')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: true })
          .limit(5);
        setMockTests(testData || []);

        // Load weak topics
        const { data: topicData } = await supabase
          .from('topic_progress')
          .select('*')
          .eq('user_id', user!.id)
          .order('confidence_score', { ascending: true })
          .limit(3);
        setWeakTopics(topicData || []);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [user]);

  if (loading) {
    return <div className="flex items-center justify-center h-full text-primary font-mono uppercase tracking-widest animate-pulse">Initializing HQ...</div>;
  }

  const rank = getRank(profile?.xp_points || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-widest text-foreground">War Room HQ</h1>
          <p className="text-muted-foreground uppercase text-xs tracking-wider font-semibold mt-1">
            Status: Active | Rank: <span className="text-primary">{rank}</span> | XP: {profile?.xp_points || 0}
          </p>
        </div>
        <div className="flex items-center gap-4 bg-card/50 p-3 rounded-lg border border-primary/20 backdrop-blur-sm">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Current Streak</span>
            <div className="flex items-center gap-1 text-accent font-bold text-lg">
              <Flame className="h-5 w-5" />
              {profile?.streak_count || 0} Days
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Countdown Card */}
        <Card className="col-span-1 md:col-span-2 border-primary/20 bg-black/20 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 uppercase tracking-widest text-sm text-primary">
              <Clock className="h-4 w-4" />
              Target Acquisition (Exam Countdown)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {exams.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {exams.map(exam => {
                  const daysLeft = differenceInDays(new Date(exam.exam_date), new Date());
                  const isUrgent = daysLeft < 30;
                  return (
                    <div key={exam.id} className={`p-4 rounded-lg border ${isUrgent ? 'border-destructive/50 bg-destructive/10 text-destructive' : 'border-primary/20 bg-primary/5 text-primary'} flex flex-col items-center justify-center text-center`}>
                      <span className="text-3xl font-bold">{daysLeft}</span>
                      <span className="text-xs uppercase font-semibold tracking-wider mt-1">{exam.subject}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center p-6 border border-dashed border-primary/20 rounded-lg text-muted-foreground uppercase text-xs font-semibold tracking-wider">
                No targets acquired. Set up exam schedule in Study Planner.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weak Flanks */}
        <Card className="border-destructive/30 bg-black/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 uppercase tracking-widest text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Weak Flanks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {weakTopics.length > 0 ? (
              weakTopics.map(topic => (
                <div key={topic.id} className="space-y-2">
                  <div className="flex justify-between text-xs uppercase font-bold tracking-wider">
                    <span className="truncate pr-2">{topic.chapter}</span>
                    <span className="text-destructive">{topic.confidence_score}%</span>
                  </div>
                  <Progress value={topic.confidence_score} className="h-1 [&>div]:bg-destructive" />
                </div>
              ))
            ) : (
              <div className="text-center p-4 text-muted-foreground uppercase text-xs font-semibold tracking-wider">
                Insufficient data. Take mock tests to identify weak flanks.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Battle Performance */}
        <Card className="border-primary/20 bg-black/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 uppercase tracking-widest text-sm text-primary">
              <Activity className="h-4 w-4" />
              Battle Performance Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mockTests.length > 0 ? (
              <div className="h-[200px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockTests}>
                    <XAxis dataKey="created_at" tickFormatter={(val) => format(new Date(val), 'MMM d')} stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--primary))' }}
                      labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                    />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: 'hsl(var(--background))', stroke: 'hsl(var(--primary))', strokeWidth: 2 }} activeDot={{ r: 6, fill: 'hsl(var(--primary))' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center border border-dashed border-primary/20 rounded-lg text-muted-foreground uppercase text-xs font-semibold tracking-wider">
                No battle data available.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Orders */}
        <Card className="border-primary/20 bg-black/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 uppercase tracking-widest text-sm text-primary">
              <Target className="h-4 w-4" />
              Today's Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center p-8 border border-dashed border-primary/20 rounded-lg text-muted-foreground uppercase text-xs font-semibold tracking-wider flex flex-col items-center gap-2">
              <Crosshair className="h-8 w-8 text-muted-foreground/50" />
              <span>Awaiting study plan generation</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
