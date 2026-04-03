import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function Login() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setLocation('/');
    }
  }, [user, setLocation]);

  if (user) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName }
          }
        });
        if (error) throw error;
        toast.success("Enlistment successful. Welcome to the War Room.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Access granted. Awaiting orders.");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) toast.error(error.message);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-primary/20 bg-card shadow-2xl shadow-primary/10">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight text-primary uppercase">
            {isSignUp ? "Enlist Now" : "War Room Access"}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {isSignUp ? "Join the ranks and prepare for battle" : "Enter credentials to access headquarters"}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <form onSubmit={handleAuth} className="grid gap-4">
            {isSignUp && (
              <div className="grid gap-2">
                <Label htmlFor="fullName" className="uppercase text-xs font-semibold tracking-wider">Cadet Name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="John Doe" className="bg-background/50" />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="email" className="uppercase text-xs font-semibold tracking-wider">Comm Link (Email)</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="cadet@example.com" className="bg-background/50" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password" className="uppercase text-xs font-semibold tracking-wider">Clearance Code (Password)</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="bg-background/50" />
            </div>
            <Button type="submit" className="w-full font-bold tracking-widest uppercase mt-2" disabled={loading}>
              {loading ? "Processing..." : (isSignUp ? "Confirm Enlistment" : "Authorize")}
            </Button>
          </form>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground font-semibold tracking-wider">
                Or continue with
              </span>
            </div>
          </div>
          
          <Button variant="outline" type="button" onClick={handleGoogleLogin} className="w-full border-primary/20 hover:bg-primary/10">
            Google
          </Button>
        </CardContent>
        <CardFooter>
          <Button variant="ghost" className="w-full text-muted-foreground uppercase text-xs tracking-wider" onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? "Already enlisted? Authorize here" : "New recruit? Enlist here"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
