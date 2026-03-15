import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import toast from 'react-hot-toast';
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  darkLogoUrl?: string;
  primaryColor?: string;
  defaultRoute?: string;
}

export default function WorkspaceLanding() {
  const { slug } = useParams<{ slug: string }>();
  const [location, setLocation] = useLocation();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("login");
  
  // map stored route key to actual path used in workspace URLs
  const routeKeyToPath = (key?: string) => {
    switch (key) {
      case 'navigation.myIdeas': return '/my-ideas';
      case 'navigation.challenges': return '/challenges';
      case 'navigation.radar': return '/radar';
      case 'navigation.experts': return '/experts';
      case 'navigation.dashboard':
      default:
        return '/dashboard';
    }
  };

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [signupData, setSignupData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });
  const [invitedUserId, setInvitedUserId] = useState<string | undefined>(undefined);
  const [invitedRole, setInvitedRole] = useState<string | undefined>(undefined);
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentModalOpen, setConsentModalOpen] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  // Reset-password specific state
  const [isResetFlow, setIsResetFlow] = useState(false);
  const [resetToken, setResetToken] = useState<string | undefined>(undefined);
  const [resetUserId, setResetUserId] = useState<string | undefined>(undefined);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");

  useEffect(() => {
    if (!slug || typeof window === "undefined") return;
    const registerPath = `/w/${slug}/register`;
    const resetPath = `/w/${slug}/reset-password`;

    const checkUrl = () => {
      const pathname = window.location.pathname;
      // invite/register handling
      if (pathname === registerPath || pathname === `${registerPath}/`) {
        const params = new URLSearchParams(window.location.search);
        const email = params.get("email") || "";
        const userId = params.get("userId") || "";
        const role = params.get("role") || "";
        setInvitedUserId(userId || undefined);
        setInvitedRole(role || undefined);
        if (email) setSignupData(prev => ({ ...prev, email }));
        setActiveTab("signup");
        setIsResetFlow(false);
        return;
      }

      // reset-password handling
      if (pathname === resetPath || pathname === `${resetPath}/`) {
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token") || "";
        const userId = params.get("userId") || "";
        setResetToken(token || undefined);
        setResetUserId(userId || undefined);
        setIsResetFlow(true);
        setActiveTab("login"); // don't show tabs when in reset flow; we'll render reset UI
        return;
      }

      // normal landing
      setIsResetFlow(false);
    };

    checkUrl();
    window.addEventListener("popstate", checkUrl);
    return () => window.removeEventListener("popstate", checkUrl);
  }, [location, slug]);

  // Fetch workspace info
  const { data: workspace, isLoading } = useQuery<Workspace>({
    queryKey: [`/api/workspaces/${slug}`],
    enabled: !!slug,
    staleTime: 0,
    refetchOnMount: true,
  });

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const response = await fetch(`/api/workspaces/${slug}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('workspaceLanding.loginFailed'));
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/user"], data.user);

      toast.success(t('workspaceLanding.welcomeBack', { email: data.user.email }), {
        duration: 2000,
      });

      setTimeout(() => {
        queryClient.removeQueries({ queryKey: ["/api/organizations"] });
        queryClient.removeQueries({ queryKey: ["/api/workspaces"] });
        const path = routeKeyToPath(workspace?.defaultRoute);
        setLocation(`/w/${slug}${path}`);
      }, 500);
    },
    onError: (error: Error) => {
      toast.error(error.message || t('workspaceLanding.loginFailed'));
    },
  });

  const signupMutation = useMutation({
    // accept optional userId when completing an invite
    mutationFn: async (data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      userId?: string;
    }) => {
      const endpoint = data.userId ? `/api/workspaces/${slug}/complete-invite` : `/api/workspaces/${slug}/signup`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('workspaceLanding.signupFailed'));
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/user"], data.user);

      toast.success(t('workspaceLanding.welcomeTo', { name: workspace?.name }), {
        duration: 2000,
      });

      setTimeout(() => {
        queryClient.removeQueries({ queryKey: ["/api/organizations"] });
        queryClient.removeQueries({ queryKey: ["/api/workspaces"] });
        const path = routeKeyToPath(workspace?.defaultRoute);
        setLocation(`/w/${slug}${path}`);
      }, 500);
    },
    onError: (error: Error) => {
      toast.error(error.message || t('workspaceLanding.signupFailed'));
    },
  });

  const forgotMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      const response = await fetch(`/api/workspaces/${slug}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('workspaceLanding.forgotFailed'));
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success(t('workspaceLanding.forgotSent'));
      setShowForgot(false);
      setForgotEmail("");
    },
    onError: (error: Error) => {
      toast.error(error.message || t('workspaceLanding.forgotFailed'));
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (data: { token: string; userId: string; password: string }) => {
      const response = await fetch(`/api/workspaces/${slug}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('workspaceLanding.resetFailed'));
      }
      return response.json();
    },
    onSuccess: (data) => {
      // server should return user and/or have created session
      if (data?.user) {
        queryClient.setQueryData(["/api/user"], data.user);
      }
      toast.success(t('workspaceLanding.resetSuccess'));
      setTimeout(() => {
        queryClient.removeQueries({ queryKey: ["/api/organizations"] });
        queryClient.removeQueries({ queryKey: ["/api/workspaces"] });
        const path = routeKeyToPath(workspace?.defaultRoute);
        setLocation(`/w/${slug}${path}`);
      }, 400);
    },
    onError: (error: Error) => {
      toast.error(error.message || t('workspaceLanding.resetFailed'));
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginData);
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();

    if (signupData.password.length < 8) {
      toast.error(t('workspaceLanding.passwordTooShort'));
      return;
    }

    if (invitedRole === "MENTOR" && !consentChecked) {
      toast.error("Please read and acknowledge the legal consent before creating your account.");
      return;
    }

    // include userId if this is an invited user (from URL)
    const payload: any = { ...signupData };
    if (invitedUserId) payload.userId = invitedUserId;
    signupMutation.mutate(payload);
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error(t('workspaceLanding.emailRequired'));
      return;
    }
    forgotMutation.mutate({ email: forgotEmail });
  };

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken || !resetUserId) {
      toast.error(t('workspaceLanding.resetMissingParams') || 'Missing reset token or user id.');
      return;
    }
    if (resetPassword.length < 8) {
      toast.error(t('workspaceLanding.passwordTooShort'));
      return;
    }
    if (resetPassword !== resetConfirm) {
      toast.error(t('workspaceLanding.passwordsNotMatch') || 'Passwords do not match');
      return;
    }
    resetMutation.mutate({ token: resetToken, userId: resetUserId, password: resetPassword });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">{t('workspaceLanding.loadingWorkspace')}</p>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-2xl">{t('workspaceLanding.workspaceNotFound')}</CardTitle>
            <CardDescription>
              {t('workspaceLanding.workspaceDoesNotExist', { slug })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/create-workspace")} className="w-full">
              {t('workspaceLanding.createNewWorkspace')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If reset flow detected, render dedicated reset UI
  if (isResetFlow) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>{t('workspaceLanding.resetTitle') || 'Reset your password'}</CardTitle>
            <CardDescription>{t('workspaceLanding.resetDescription') || 'Set a new password for your account.'}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-password">{t('workspaceLanding.newPassword') || 'New password'}</Label>
                <Input
                  id="reset-password"
                  type="password"
                  placeholder={t('workspaceLanding.passwordPlaceholder')}
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-confirm">{t('workspaceLanding.confirmPassword') || 'Confirm password'}</Label>
                <Input
                  id="reset-confirm"
                  type="password"
                  placeholder={t('workspaceLanding.confirmPasswordPlaceholder') || 'Confirm password'}
                  value={resetConfirm}
                  onChange={(e) => setResetConfirm(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={resetMutation.isPending}
                style={{ backgroundColor: workspace.primaryColor }}
              >
                {resetMutation.isPending ? t('workspaceLanding.saving') || 'Saving...' : t('workspaceLanding.resetSave') || 'Save new password'}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setLocation(`/w/${slug}`)}>
                {t('workspaceLanding.backToLogin') || 'Back to login'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: `linear-gradient(135deg, ${workspace.primaryColor}10 0%, var(--background) 50%, ${workspace.primaryColor}05 100%)`,
      }}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          {(workspace.logoUrl || workspace.darkLogoUrl) && (
            <div className="flex justify-center">
              <img
                src={workspace.darkLogoUrl || workspace.logoUrl}
                alt={workspace.name}
                className="h-9 w-auto object-contain hidden dark:block"
              />
              <img
                src={workspace.logoUrl || workspace.darkLogoUrl}
                alt={workspace.name}
                className="h-9 w-auto object-contain block dark:hidden"
              />
            </div>
          )}

          <div>
            {!workspace.logoUrl && !workspace.darkLogoUrl && (
              <CardTitle className="text-3xl font-bold">{workspace.name}</CardTitle>
            )}
            <CardDescription className="mt-2">
              {t('workspaceLanding.signInOrCreate')}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t('workspaceLanding.login')}</TabsTrigger>
              <TabsTrigger value="signup">{t('workspaceLanding.signUp')}</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 mt-4">
              {showForgot ? (
                <form onSubmit={handleForgot} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">{t('workspaceLanding.email')}</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder={t('workspaceLanding.emailPlaceholder')}
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={forgotMutation.isPending}
                    style={{ backgroundColor: workspace.primaryColor }}
                  >
                    {forgotMutation.isPending ? t('workspaceLanding.sending') : t('workspaceLanding.sendReset')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setShowForgot(false)}
                  >
                    {t('workspaceLanding.backToLogin')}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">{t('workspaceLanding.email')}</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder={t('workspaceLanding.emailPlaceholder')}
                      value={loginData.email}
                      onChange={(e) =>
                        setLoginData({ ...loginData, email: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">{t('workspaceLanding.password')}</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder={t('workspaceLanding.passwordPlaceholder')}
                      value={loginData.password}
                      onChange={(e) =>
                        setLoginData({ ...loginData, password: e.target.value })
                      }
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={loginMutation.isPending}
                    style={{ backgroundColor: workspace.primaryColor }}
                  >
                    {loginMutation.isPending ? t('workspaceLanding.signingIn') : t('workspaceLanding.signIn')}
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    className="w-full mt-2"
                    style={{ color: workspace.primaryColor }}
                    onClick={() => setShowForgot(true)}
                  >
                    {t('workspaceLanding.forgotPassword')}
                  </Button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 mt-4">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-firstName">{t('workspaceLanding.firstName')}</Label>
                    <Input
                      id="signup-firstName"
                      placeholder={t('workspaceLanding.firstNamePlaceholder')}
                      value={signupData.firstName}
                      onChange={(e) =>
                        setSignupData({ ...signupData, firstName: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-lastName">{t('workspaceLanding.lastName')}</Label>
                    <Input
                      id="signup-lastName"
                      placeholder={t('workspaceLanding.lastNamePlaceholder')}
                      value={signupData.lastName}
                      onChange={(e) =>
                        setSignupData({ ...signupData, lastName: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">{t('workspaceLanding.email')}</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder={t('workspaceLanding.emailPlaceholder')}
                    value={signupData.email}
                    onChange={(e) =>
                      setSignupData({ ...signupData, email: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t('workspaceLanding.password')}</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder={t('workspaceLanding.passwordPlaceholder')}
                    value={signupData.password}
                    onChange={(e) =>
                      setSignupData({ ...signupData, password: e.target.value })
                    }
                    required
                    minLength={8}
                  />
                  <p className="text-xs text-text-secondary">
                    {t('workspaceLanding.passwordRequirement')}
                  </p>
                </div>

                {/* Legal consent — mentor invites only */}
                {invitedRole === "MENTOR" && (
                  <div className="flex items-start gap-3 pt-1">
                    <input
                      type="checkbox"
                      id="mentor-consent"
                      checked={consentChecked}
                      onChange={(e) => setConsentChecked(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border border-gray-300 accent-primary cursor-pointer"
                    />
                    <label htmlFor="mentor-consent" className="text-sm text-text-secondary leading-snug">
                      I have read and agree to the{" "}
                      <button
                        type="button"
                        onClick={() => setConsentModalOpen(true)}
                        className="text-primary underline underline-offset-2 hover:opacity-80 font-medium"
                      >
                        legal consent
                      </button>
                    </label>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={signupMutation.isPending || (invitedRole === "MENTOR" && !consentChecked)}
                  style={{
                    backgroundColor: workspace.primaryColor,
                  }}
                >
                  {signupMutation.isPending ? t('workspaceLanding.creatingAccount') : t('workspaceLanding.createAccount')}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Legal Consent Modal — mentor invites only */}
      <Dialog open={consentModalOpen} onOpenChange={setConsentModalOpen}>
        <DialogContent className="max-w-lg flex flex-col max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Legal Consent &amp; Terms for Mentors</DialogTitle>
          </DialogHeader>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et
              dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex
              ea commodo consequat.
            </p>
            <p>
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
              Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est
              laborum. Curabitur pretium tincidunt lacus. Nulla gravida orci a odio.
            </p>
            <p>
              Nullam varius, turpis molestie dictum semper, nulla augue gravida enim, nec porttitor tortor risus eget
              urna. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium,
              totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta
              sunt explicabo.
            </p>
            <p>
              Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni
              dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor
              sit amet, consectetur, adipisci velit.
            </p>
            <p>
              Ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum
              exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem
              vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur.
            </p>
            <p>
              Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et
              voluptates repudiandae sint et molestiae non recusandae. Itaque earum rerum hic tenetur a sapiente
              delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores
              repellat.
            </p>
            <p>
              Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime
              placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus. Praesent blandit laoreet
              nibh. Fusce convallis metus id felis luctus adipiscing.
            </p>
            <p>
              Pellentesque egestas neque sit amet convallis ullamcorper, felis nonummy bibendum feugiat, vitae risus
              dui condimentum ipsum. Donec non enim in turpis pulvinar facilisis. Ut felis. Praesent dapibus, neque id
              cursus faucibus, tortor neque egestas augue, eu vulputate magna eros eu erat.
            </p>
          </div>

          <DialogFooter className="pt-4 border-t border-border flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setConsentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setConsentChecked(true);
                setConsentModalOpen(false);
              }}
            >
              Acknowledge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
