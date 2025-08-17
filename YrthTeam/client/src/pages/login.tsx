import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { loginUserSchema, insertUserSchema, type LoginUser, type InsertUser } from "@shared/schema";
import { ChartBar, Eye, EyeOff, UserPlus, LogIn } from "lucide-react";
import { z } from "zod";

export default function LoginPage() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, register, loginLoading, registerLoading } = useAuth();
  const { toast } = useToast();

  const loginForm = useForm<LoginUser>({
    resolver: zodResolver(loginUserSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const handleLogin = async (data: LoginUser) => {
    try {
      await login(data);
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    }
  };

  const handleRegister = async (data: InsertUser) => {
    try {
      await register(data);
      toast({
        title: "Account Created!",
        description: "You have successfully registered and logged in.",
      });
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <ChartBar className="text-primary text-3xl" />
            <h1 className="text-2xl font-bold text-white">Prediction Dashboard</h1>
          </div>
          <p className="text-slate-400">Access your prediction analytics</p>
        </div>

        <Card className="border-slate-700 bg-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">
                  {isRegistering ? "Create Account" : "Sign In"}
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {isRegistering 
                    ? "Register to access the prediction dashboard" 
                    : "Enter your credentials to access the dashboard"
                  }
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-primary hover:text-primary-foreground"
                data-testid="button-toggle-auth-mode"
              >
                {isRegistering ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            {isRegistering ? (
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Username</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter username"
                            className="bg-slate-700 border-slate-600 text-white"
                            data-testid="input-register-username"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter password"
                              className="bg-slate-700 border-slate-600 text-white pr-10"
                              data-testid="input-register-password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-white"
                              onClick={() => setShowPassword(!showPassword)}
                              data-testid="button-toggle-password-visibility"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90"
                    disabled={registerLoading}
                    data-testid="button-register"
                  >
                    {registerLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </Form>
            ) : (
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Username</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter username"
                            className="bg-slate-700 border-slate-600 text-white"
                            data-testid="input-login-username"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter password"
                              className="bg-slate-700 border-slate-600 text-white pr-10"
                              data-testid="input-login-password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-white"
                              onClick={() => setShowPassword(!showPassword)}
                              data-testid="button-toggle-password-visibility"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90"
                    disabled={loginLoading}
                    data-testid="button-login"
                  >
                    {loginLoading ? "Signing In..." : "Sign In"}
                  </Button>
                </form>
              </Form>
            )}

            <div className="mt-4 text-center text-sm text-slate-400">
              {isRegistering ? (
                <>
                  Already have an account?{" "}
                  <Button
                    variant="link"
                    className="p-0 h-auto text-primary hover:text-primary/80"
                    onClick={() => setIsRegistering(false)}
                    data-testid="button-switch-to-login"
                  >
                    Sign in here
                  </Button>
                </>
              ) : (
                <>
                  Don't have an account?{" "}
                  <Button
                    variant="link"
                    className="p-0 h-auto text-primary hover:text-primary/80"
                    onClick={() => setIsRegistering(true)}
                    data-testid="button-switch-to-register"
                  >
                    Register here
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-slate-500">
          <p>Secure prediction dashboard with real-time analytics</p>
        </div>
      </div>
    </div>
  );
}