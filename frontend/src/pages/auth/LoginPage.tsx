import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accessibility, LogIn, UserPlus } from "lucide-react";

type LoginMode = "user" | "admin";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<LoginMode>("user");
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setErrorCode("");
    if (!email || !password) { setError("All fields are required."); return; }
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      const message = err?.message || "Login failed. Please try again.";
      // Parse error code from message if available
      if (message.includes("No account found")) {
        setErrorCode("USER_NOT_FOUND");
        setError(message);
      } else if (message.includes("Invalid admin")) {
        setErrorCode("INVALID_ADMIN");
        setError(message);
      } else {
        setErrorCode("");
        setError(message);
      }
      setLoading(false);
      return;
    }
    setLoading(false);
  };

  // Redirect after user state updates from login
  if (user) {
    const dest = user.role === "admin" ? "/admin" : user.role === "recruiter" ? "/recruiter" : "/candidate";
    navigate(dest, { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link to="/" className="mx-auto mb-4 flex items-center gap-2 text-xl font-bold text-primary">
            <Accessibility className="h-7 w-7" /> AbelUp
          </Link>
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>Log in to your AbelUp account</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={mode} onValueChange={(v) => { setMode(v as LoginMode); setError(""); setErrorCode(""); }} className="mb-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="user">Candidate / Recruiter</TabsTrigger>
              <TabsTrigger value="admin">Admin</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                <p>{error}</p>
                {errorCode === "USER_NOT_FOUND" && mode === "user" && (
                  <Link
                    to="/register"
                    className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <UserPlus className="h-3.5 w-3.5" /> Register Now
                  </Link>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" />
            </div>
            <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
              <LogIn className="h-5 w-5" /> {loading ? "Logging in..." : "Log In"}
            </Button>

            {mode === "user" && (
              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/register" className="font-medium text-primary hover:underline">Register</Link>
              </p>
            )}

            {mode === "admin" && (
              <p className="text-center text-xs text-muted-foreground">
                Admin accounts are created by the system administrator.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
