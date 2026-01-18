import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Brain, Lock, User, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { authenticate, saveUser } from '@/lib/auth';

const Login = () => {
  const [patientId, setPatientId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const user = authenticate(patientId, password);

    if (user) {
      saveUser(user);
      toast({
        title: 'Welcome back!',
        description: `Logged in as ${user.name} (${user.patientId})`,
      });
      navigate('/dashboard');
    } else {
      toast({
        variant: 'destructive',
        title: 'Authentication Failed',
        description: 'Invalid Patient ID or Password. Please try again.',
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <Card className="border-border shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
              <Brain className="h-7 w-7 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>
              Sign in to access the Radiology-RAG dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="patientId">Patient ID</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="patientId"
                    type="text"
                    placeholder="Enter your Patient ID"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Demo Credentials:</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p><span className="font-mono">PID1</span> / <span className="font-mono">AAA</span></p>
                <p><span className="font-mono">PID2</span> / <span className="font-mono">BBB</span></p>
                <p><span className="font-mono">PID3</span> / <span className="font-mono">CCC</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;
