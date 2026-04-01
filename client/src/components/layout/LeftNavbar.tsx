import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { 
  Plus, 
  MessageSquare, 
  Home,
  History, 
  Trophy,
  HelpCircle,
  MessageCircle,
  LogOut,
  Moon,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LeftNavbarProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export function LeftNavbar({ isExpanded, onToggle }: LeftNavbarProps) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch user's organizations and projects
  const { data: organizations = [] } = useQuery({
    queryKey: ["/api/organizations"],
    enabled: !!user,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["/api/organizations", organizations[0]?.id, "projects"],
    enabled: !!organizations[0]?.id,
  });

  const navItems = [
    { icon: Home, label: "Home", action: () => setLocation("/"), active: false },
    { icon: MessageSquare, label: "Debate", action: () => {}, active: true },
    { icon: History, label: "History", action: () => {}, active: false },
    { icon: Trophy, label: "Leaderboard", action: () => {}, active: false },
  ];

  const bottomActions = [
    { icon: HelpCircle, label: "About", action: () => {} },
    { icon: MessageCircle, label: "Feedback", action: () => {} },
  ];

  return (
    <motion.div
      initial={false}
      animate={{ width: isExpanded ? 320 : 64 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="h-full bg-gray-950 border-r border-gray-800 flex flex-col relative overflow-hidden"
    >
      {/* Header with user profile and toggle */}
      <div className="p-4 border-b border-gray-800">
        <AnimatePresence mode="wait">
          {isExpanded ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {/* User Profile */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center text-sm font-bold text-white">
                    {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <div className="text-white font-medium text-sm">
                      {user?.username || "User"}
                    </div>
                    <div className="text-gray-400 text-xs">
                      {user?.email || "user@example.com"}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggle}
                  className="w-8 h-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Logo */}
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-white dark:bg-white rounded-sm flex items-center justify-center dark:filter dark:brightness-0 dark:invert">
                  <span className="text-black font-bold text-xs">F</span>
                </div>
                <span className="text-white font-semibold text-sm tracking-tight">
                  FIKRAHUB
                </span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center gap-3"
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggle}
                className="w-8 h-8 p-0 text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <div className="w-6 h-6 bg-white dark:bg-white rounded-sm flex items-center justify-center dark:filter dark:brightness-0 dark:invert">
                <span className="text-black font-bold text-xs">F</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-2">
        {/* New Conversation Button */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="mb-4"
            >
              <Button
                onClick={() => setLocation("/")}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white rounded-lg px-4 py-3 font-medium transition-colors border border-gray-700"
                data-testid="new-conversation"
              >
{t('projects.newConversation')}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Items */}
        <div className="space-y-1 mb-6">
          {navItems.map((item, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              onClick={item.action}
              className={`w-full ${
                isExpanded ? "justify-start px-3" : "justify-center px-0"
              } h-10 transition-colors ${
                item.active 
                  ? "bg-gray-800 text-white" 
                  : "text-gray-400 hover:text-white hover:bg-gray-800/50"
              }`}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <AnimatePresence>
                {isExpanded && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    className="ml-3 text-sm font-medium"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          ))}
        </div>

        {/* Conversations List (when expanded) */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="flex-1 mb-6"
            >
              {projects.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-400 text-sm">No conversations yet</p>
                  <p className="text-gray-500 text-xs mt-1">Start your first debate</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {projects.map((project: any) => {
                    // Find the first chat for this project to navigate to
                    return (
                      <div
                        key={project.id}
                        onClick={async () => {
                          // Fetch chats for this project and navigate to first one
                          try {
                            const response = await fetch(`/api/projects/${project.id}/chats`, {
                              credentials: "include",
                            });
                            if (response.ok) {
                              const chats = await response.json();
                              if (chats.length > 0) {
                                setLocation(`/chat/${chats[0].id}`);
                              }
                            }
                          } catch (error) {
                            console.error("Failed to fetch chats:", error);
                          }
                        }}
                        className="p-3 rounded-lg hover:bg-gray-800/50 cursor-pointer transition-colors group"
                      >
                        <div className="text-sm font-medium text-white truncate group-hover:text-primary">
                          {project.title}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(project.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Actions */}
        <div className="space-y-1 mt-auto">
          {bottomActions.map((item, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              onClick={item.action}
              className={`w-full ${
                isExpanded ? "justify-start px-3" : "justify-center px-0"
              } h-10 text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors`}
              data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <AnimatePresence>
                {isExpanded && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    className="ml-3 text-sm font-medium"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          ))}
        </div>

        {/* Points and Logout (when expanded) */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.15 }}
              className="mt-4 pt-4 border-t border-gray-800 space-y-2"
            >
              <div className="px-3 py-2 bg-gray-800/50 rounded-lg">
                <span className="text-green-400 font-medium text-sm">279 Points</span>
              </div>
              <Button
                onClick={() => logout()}
                variant="ghost"
                size="sm"
                className="w-full justify-start px-3 h-10 text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
                data-testid="logout"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Logout
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </motion.div>
  );
}