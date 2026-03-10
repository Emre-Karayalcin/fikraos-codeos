import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
import { useEffect } from "react";
import { fetchCsrfToken } from "@/lib/csrf";

export function useAuth() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { slug } = useParams<{ slug: string }>();
  
  const { data: user, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/user"], // keep key unchanged
    queryFn: async ({ signal }) => {
      const base = "/api/user";
      const url = slug ? `${base}?slug=${encodeURIComponent(slug)}` : base;
      const res = await fetch(url, { credentials: "include", signal });

      if (res.status === 401) {
        const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
        const workspaceRegex = /^\/w\/[^\/]+(\/(register|reset-password))?\/?$/;
        if (!workspaceRegex.test(currentPath) && currentPath !== "/admin/login") {
          setLocation("/");
        }
        return null;
      }

      if (res.status !== 401) {
        const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
        const workspaceRegex = /^\/w\/[^\/]+(\/(register|reset-password))?\/?$/;
        if (workspaceRegex.test(currentPath)) {
          setLocation("/");
        }
      }

      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      return res.json();
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  // when slug changes, explicitly refetch so the queryFn will include new slug
  useEffect(() => {
    // only refetch when slug changes (and query exists)
    if (typeof slug !== "undefined") {
      refetch();
    }
  }, [slug, refetch]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || "Login failed");
      }

      return response.json();
    },
    onSuccess: (user) => {
      // Set user data immediately
      queryClient.setQueryData(["/api/user"], user);
      // Clear all queries to force fresh fetches
      queryClient.removeQueries({ queryKey: ["/api/organizations"] });
      queryClient.removeQueries({ queryKey: ["/api/workspaces"] });

      // Fetch new CSRF token after login (session regeneration)
      fetchCsrfToken().catch(err => {
        console.error('Failed to fetch CSRF token after login:', err);
      });

      toast({
        title: "Welcome back!",
        description: `Logged in as ${user.username}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid username or password",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: {
      username: string;
      email?: string;
      password: string;
      firstName?: string;
      lastName?: string;
    }) => {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || "Registration failed");
      }

      return response.json();
    },
    onSuccess: (user) => {
      // Set user data immediately
      queryClient.setQueryData(["/api/user"], user);
      // Clear all queries to force fresh fetches
      queryClient.removeQueries({ queryKey: ["/api/organizations"] });
      queryClient.removeQueries({ queryKey: ["/api/workspaces"] });

      // Fetch new CSRF token after registration (session created)
      fetchCsrfToken().catch(err => {
        console.error('Failed to fetch CSRF token after registration:', err);
      });

      toast({
        title: "Account created!",
        description: `Welcome to FikraHub, ${user.username}!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Logout failed");
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      queryClient.clear(); // Clear all cached data

      // Fetch new CSRF token after logout (session cleared)
      fetchCsrfToken().catch(err => {
        console.error('Failed to fetch CSRF token after logout:', err);
      });

      toast({
        title: "Logged out",
        description: "See you next time!",
      });
      // Redirect to home
      window.location.href = "/";
    },
  });

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
  };
}
