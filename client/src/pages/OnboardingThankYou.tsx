import { CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function OnboardingThankYou() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <Card className="max-w-lg w-full shadow-xl border-0">
        <CardContent className="p-10 text-center space-y-6">
          <div className="flex justify-center">
            <CheckCircle className="w-20 h-20 text-green-500" strokeWidth={1.5} />
          </div>
          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-gray-900">Thank you for your submission!</h1>
            <p className="text-gray-500 leading-relaxed">
              We've received your application and will review it shortly. You'll receive an email
              confirmation, and we'll notify you once your application has been reviewed.
            </p>
          </div>
          <p className="text-sm text-gray-400">Please check your inbox for a confirmation email.</p>
        </CardContent>
      </Card>
    </div>
  );
}
