import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useParams } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useBranding } from "@/contexts/BrandingContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, Sparkles, User, Mail, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().optional().or(z.literal("")),
  lastName: z.string().optional().or(z.literal("")),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function Auth() {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login, register: registerUser, isLoggingIn, isRegistering, isAuthenticated } = useAuth();
  const { logo, darkLogo,isLoading: brandingLoading } = useBranding();
  
  const defaultLogo = '/codelogo.png';
  const defaultDarkLogo = '/logo-code-light.jpeg';

  // Check if user is already logged in and redirect
  useEffect(() => {
    if (isAuthenticated && !isLoggingIn && !isRegistering) {
      // Use setTimeout to ensure auth state has fully propagated
      const timer = setTimeout(() => {
        const pendingIdea = sessionStorage.getItem("pendingIdea");
        if (pendingIdea) {
          sessionStorage.removeItem("pendingIdea");
          createProjectFromIdea(pendingIdea);
        } else {
          setLocation("/");
        }
      }, 300); // Increased delay to allow queries to be removed
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isLoggingIn, isRegistering, setLocation]);

  const createProjectMutation = useMutation({
    mutationFn: async (ideaText: string) => {
      // First, get or create an organization
      const orgResponse = await fetch("/api/organizations", {
        credentials: "include",
      });
      let organizations = [];
      if (orgResponse.ok) {
        organizations = await orgResponse.json();
      }
      
      let orgId;
      if (organizations.length === 0) {
        const newOrgResponse = await fetch("/api/organizations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: t('projects.myVentures') }),
          credentials: "include",
        });
        const newOrg = await newOrgResponse.json();
        orgId = newOrg.id;
      } else {
        orgId = organizations[0].id;
      }
      
      // Create project
      const projectResponse = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          title: ideaText.length > 50 ? ideaText.substring(0, 47) + "..." : ideaText,
          description: ideaText
        }),
        credentials: "include",
      });
      const project = await projectResponse.json();
      
      // Create initial chat
      const chatResponse = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          title: t('projects.initialConversation')
        }),
        credentials: "include",
      });
      const chat = await chatResponse.json();
      
      // Create initial user message
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: chat.id,
          role: "user",
          text: ideaText
        }),
        credentials: "include",
      });
      
      return { project, chat };
    },
    onSuccess: ({ project, chat }) => {
      toast({
        title: t('projects.projectCreated'),
        description: t('projects.projectCreatedDesc')
      });
      setLocation(`/chat/${chat.id}`);
    },
    onError: (error) => {
      console.error("Failed to create project:", error);
      toast({
        title: t('common.error'),
        description: "Failed to create project. Please try again.",
        variant: "destructive"
      });
      setLocation("/");
    }
  });

  const createProjectFromIdea = (idea: string) => {
    createProjectMutation.mutate(idea);
  };

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      firstName: "",
      lastName: "",
    },
  });

  const onLogin = (data: LoginForm) => {
    login(data);
  };

  const onRegister = (data: RegisterForm) => {
    const cleanData = {
      ...data,
      email: data.email || undefined,
      firstName: data.firstName || undefined,
      lastName: data.lastName || undefined,
    };
    registerUser(cleanData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* ✅ Logo from Branding */}
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex items-center justify-center mb-6"
          >
            {brandingLoading ? (
              // Loading skeleton
              <div className="h-12 w-48 bg-muted animate-pulse rounded" />
            ) : (
              <>
              {(logo || darkLogo) ? (
                <>
                  <img
                    src={darkLogo || logo}
                    alt="Logo"
                    className="h-12 w-auto object-contain hidden dark:block"
                  />
                  <img
                    src={logo || darkLogo}
                    alt="Logo"
                    className="h-12 w-auto object-contain block dark:hidden"
                  />
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 hidden dark:flex">
                    <img src={defaultDarkLogo} alt="Logo" className="h-12 w-auto object-contain" />
                    <span className="text-3xl font-bold text-foreground">OS</span>
                  </div>
                  <div className="flex items-center gap-2 dark:hidden">
                    <img src={defaultLogo} alt="Logo" className="h-12 w-auto object-contain" />
                    <span className="text-3xl font-bold text-foreground">OS</span>
                  </div>
                </>
              )}
            </>
            )}
          </motion.div>
        </div>

        {/* Auth Form */}
        <Card className="border-border/50 shadow-lg backdrop-blur-sm bg-card/95">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" className="text-sm font-medium">{t('auth.signIn')}</TabsTrigger>
              <TabsTrigger value="register" className="text-sm font-medium">{t('auth.createAccount')}</TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login">
              <CardHeader className="pb-4">
                <CardTitle className="text-text-primary">{t('auth.signIn')}</CardTitle>
                <CardDescription className="text-text-secondary">
                  {t('auth.signInDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-medium text-text-primary">
                      Username
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-text-muted" />
                      <Input
                        id="username"
                        type="text"
                        placeholder="Enter your username"
                        className="pl-10 bg-input-bg border-input-border text-text-primary placeholder-text-muted"
                        {...loginForm.register("username")}
                        data-testid="input-login-username"
                      />
                    </div>
                    {loginForm.formState.errors.username && (
                      <p className="text-xs text-destructive">
                        {loginForm.formState.errors.username.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-text-primary">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-text-muted" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        className="pl-10 pr-10 bg-input-bg border-input-border text-text-primary placeholder-text-muted"
                        {...loginForm.register("password")}
                        data-testid="input-login-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1 h-8 w-8 p-0 text-text-muted hover:text-text-primary"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="text-xs text-destructive">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                    disabled={isLoggingIn}
                    data-testid="button-login"
                  >
                    {isLoggingIn ? t('auth.loggingIn') : t('auth.signIn')}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>

            {/* Register Tab */}
            <TabsContent value="register">
              <CardHeader className="pb-4">
                <CardTitle className="text-text-primary">{t('auth.createAccount')}</CardTitle>
                <CardDescription className="text-text-secondary">
                  {t('auth.createAccountDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-sm font-medium text-text-primary">
                        First Name
                      </Label>
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="First name"
                        className="bg-input-bg border-input-border text-text-primary placeholder-text-muted"
                        {...registerForm.register("firstName")}
                        data-testid="input-register-firstName"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-sm font-medium text-text-primary">
                        Last Name
                      </Label>
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Last name"
                        className="bg-input-bg border-input-border text-text-primary placeholder-text-muted"
                        {...registerForm.register("lastName")}
                        data-testid="input-register-lastName"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-username" className="text-sm font-medium text-text-primary">
                      Username <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-text-muted" />
                      <Input
                        id="reg-username"
                        type="text"
                        placeholder="Choose a username"
                        className="pl-10 bg-input-bg border-input-border text-text-primary placeholder-text-muted"
                        {...registerForm.register("username")}
                        data-testid="input-register-username"
                      />
                    </div>
                    {registerForm.formState.errors.username && (
                      <p className="text-xs text-destructive">
                        {registerForm.formState.errors.username.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-text-primary">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-text-muted" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        className="pl-10 bg-input-bg border-input-border text-text-primary placeholder-text-muted"
                        {...registerForm.register("email")}
                        data-testid="input-register-email"
                      />
                    </div>
                    {registerForm.formState.errors.email && (
                      <p className="text-xs text-destructive">
                        {registerForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-password" className="text-sm font-medium text-text-primary">
                      Password <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-text-muted" />
                      <Input
                        id="reg-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password"
                        className="pl-10 pr-10 bg-input-bg border-input-border text-text-primary placeholder-text-muted"
                        {...registerForm.register("password")}
                        data-testid="input-register-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1 h-8 w-8 p-0 text-text-muted hover:text-text-primary"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {registerForm.formState.errors.password && (
                      <p className="text-xs text-destructive">
                        {registerForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                    disabled={isRegistering}
                    data-testid="button-register"
                  >
                    {isRegistering ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Footer */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-text-muted mt-6"
        >
          Transform ideas into structured business assets with AI
        </motion.p>
      </motion.div>
    </div>
  );
}