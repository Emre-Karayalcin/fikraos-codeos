import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

export default function NotFound() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="text-center max-w-md mx-4">
        <div className="flex items-center justify-center mb-6">
          <AlertCircle className="h-16 w-16 text-red-400" />
        </div>
        
        <h1 className="text-4xl font-bold text-text-primary mb-4">404</h1>
        <h2 className="text-xl font-semibold text-text-primary mb-2">{t('errors.pageNotFound')}</h2>
        
        <p className="text-text-secondary mb-8">
          {t('errors.pageNotFoundDesc')}
        </p>

        <Button
          onClick={() => setLocation("/")}
          className="bg-primary hover:bg-primary/90 text-white"
          data-testid="back-home"
        >
          <Home className="w-4 h-4 mr-2" />
          {t('errors.goHome')}
        </Button>
      </div>
    </div>
  );
}
