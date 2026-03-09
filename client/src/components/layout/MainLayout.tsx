import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, FileText, Maximize2, Minimize2 } from "lucide-react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { UnifiedSidebar } from "./UnifiedSidebar";
import { BottomNavigation } from "./BottomNavigation";
import { CenterPanel } from "./CenterPanel";
import { RightPanel } from "./RightPanel";
import { ResearchData } from "../research/ResearchPanel";
import { motion } from "framer-motion";

interface ChallengeContext {
  challengeId: string;
  challengeName: string;
}

interface MainLayoutProps {
  chatId?: string;
  challengeContext?: ChallengeContext | null;
  onClearChallenge?: () => void;
}

export function MainLayout({ chatId, challengeContext, onClearChallenge }: MainLayoutProps) {
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(window.innerWidth < 1024);
  const [isRightPanelFullscreen, setIsRightPanelFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [researchData, setResearchData] = useState<ResearchData | null>(null);
  const [isResearchMode, setIsResearchMode] = useState(false);
  const [isResearchLoading, setIsResearchLoading] = useState(false);
  const [isHubViewActive, setIsHubViewActive] = useState(false);

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      const tablet = window.innerWidth < 1024;
      
      setIsMobile(mobile);
      if (mobile) {
        setIsRightPanelCollapsed(true);
      } else if (tablet && !isRightPanelFullscreen) {
        setIsRightPanelCollapsed(true);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Call on mount
    
    return () => window.removeEventListener('resize', handleResize);
  }, [isRightPanelFullscreen]);

  return (
    <div className="h-screen w-full bg-background text-foreground overflow-hidden flex relative">
      {/* Left Navigation Sidebar - Hide on mobile when bottom nav is present */}
      <div className="hidden sm:block">
        <UnifiedSidebar />
      </div>
      
      {/* Main Content Area - Mobile First */}
      <div className="flex-1 flex flex-col lg:flex-row pb-20 sm:pb-0">
        {/* Mobile/Desktop Layout Toggle */}
        {isMobile ? (
          // Mobile Layout - Stack vertically
          <div className="flex-1 flex flex-col">
            <div className="flex-1">
              <CenterPanel 
                chatId={chatId} 
                challengeContext={challengeContext}
                onClearChallenge={onClearChallenge}
                onResearchModeChange={setIsResearchMode}
                onResearchDataChange={setResearchData}
                onResearchLoadingChange={setIsResearchLoading}
              />
            </div>
            
            {/* Mobile Right Panel Overlay */}
            {!isRightPanelCollapsed && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 z-50 bg-background"
              >
                <RightPanel 
                  chatId={chatId} 
                  isFullscreen={true}
                  onToggleFullscreen={() => setIsRightPanelCollapsed(true)}
                  researchData={researchData}
                  isResearchMode={isResearchMode}
                  isResearchLoading={isResearchLoading}
                />
              </motion.div>
            )}
          </div>
        ) : (
          // Desktop Layout - Use ResizablePanelGroup
          <ResizablePanelGroup
            key={isHubViewActive ? 'hub-view' : 'chat-view'}
            direction="horizontal"
            className="flex-1"
          >
            {/* Center Panel - Chat (Hidden in Hub View) */}
            {!isRightPanelFullscreen && !isHubViewActive && (
              <ResizablePanel
                defaultSize={isRightPanelCollapsed ? 100 : 70}
                minSize={15}
                maxSize={85}
              >
                <CenterPanel
                  chatId={chatId}
                  challengeContext={challengeContext}
                  onClearChallenge={onClearChallenge}
                  onResearchModeChange={setIsResearchMode}
                  onResearchDataChange={setResearchData}
                  onResearchLoadingChange={setIsResearchLoading}
                />
              </ResizablePanel>
            )}

            {!isRightPanelCollapsed && !isRightPanelFullscreen && !isHubViewActive && <ResizableHandle withHandle />}
            
            {/* Right Panel - Assets */}
            {!isRightPanelCollapsed && (
              <ResizablePanel
                defaultSize={(isRightPanelFullscreen || isHubViewActive) ? 100 : 30}
                minSize={(isRightPanelFullscreen || isHubViewActive) ? 100 : 15}
                maxSize={(isRightPanelFullscreen || isHubViewActive) ? 100 : 85}
              >
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="h-full relative"
                >
                  <RightPanel
                    chatId={chatId}
                    isFullscreen={isRightPanelFullscreen}
                    onToggleFullscreen={() => setIsRightPanelFullscreen(!isRightPanelFullscreen)}
                    onHubViewChange={setIsHubViewActive}
                    researchData={researchData}
                    isResearchMode={isResearchMode}
                    isResearchLoading={isResearchLoading}
                  />
                  {!isRightPanelFullscreen && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsRightPanelCollapsed(true)}
                      className="absolute top-3 right-3 z-10 w-8 h-8 p-0 text-text-muted hover:text-text-primary bg-background/50 backdrop-blur-sm border border-border/50 touch-manipulation"
                      data-testid="collapse-right-panel"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  )}
                </motion.div>
              </ResizablePanel>
            )}
          </ResizablePanelGroup>
        )}

        {/* Right Panel Toggle Button */}
        {isRightPanelCollapsed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsRightPanelCollapsed(false)}
            className="absolute top-3 right-3 z-40 w-10 h-10 p-0 bg-background/80 backdrop-blur-sm border border-border hover:bg-muted/50 transition-colors touch-manipulation sm:w-8 sm:h-8"
            data-testid="expand-right-panel"
          >
            <FileText className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
