import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  primaryColor?: string;
}

interface Challenge {
  challenge: {
    id: string;
    title: string;
    slug: string;
    status: string;
  };
}

const SECTORS = [
  "AI (Artificial Intelligence)",
  "EdTech",
  "Tourism / TravelTech",
  "FinTech",
  "HealthTech",
  "Logistics / Smart Mobility",
];

const TOTAL_STEPS = 5;

export default function MemberOnboarding() {
  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const userId = params.get("userId") || "";
  const email = params.get("email") || "";

  const [step, setStep] = useState(1);

  // Step 1
  const [challengeId, setChallengeId] = useState("");
  // Step 2
  const [ideaName, setIdeaName] = useState("");
  const [sector, setSector] = useState("");
  const [problemStatement, setProblemStatement] = useState("");
  // Step 3
  const [solutionDescription, setSolutionDescription] = useState("");
  const [differentiator, setDifferentiator] = useState("");
  const [targetUser, setTargetUser] = useState("");
  // Step 4 (bonus)
  const [relevantSkills, setRelevantSkills] = useState("");
  const [previousWinner, setPreviousWinner] = useState("");
  const [hasValidation, setHasValidation] = useState("");
  const [validationDetails, setValidationDetails] = useState("");
  // Step 5
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");

  const { data: workspace } = useQuery<Workspace>({
    queryKey: [`/api/workspaces/${slug}`],
    enabled: !!slug,
  });

  const { data: challengeList = [] } = useQuery<Challenge[]>({
    queryKey: [`/api/workspaces/${slug}/active-challenges`],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${slug}/active-challenges`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!slug,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/applications/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          email,
          slug,
          challengeId: challengeId || null,
          ideaName,
          sector,
          problemStatement,
          solutionDescription,
          differentiator,
          targetUser,
          relevantSkills,
          previousWinner,
          hasValidation,
          validationDetails,
          firstName,
          lastName,
          password,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Submission failed");
      }
      return res.json();
    },
    onSuccess: () => {
      setLocation(`/w/${slug}/onboard/thank-you`);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const primaryColor = workspace?.primaryColor || "#4588f5";
  const progress = Math.round((step / TOTAL_STEPS) * 100);

  const canProceed = () => {
    if (step === 1) return !!challengeId;
    if (step === 2) return !!ideaName.trim() && !!sector && !!problemStatement.trim();
    if (step === 3)
      return (
        !!solutionDescription.trim() &&
        !!differentiator.trim() &&
        !!targetUser.trim()
      );
    if (step === 4) return true;
    if (step === 5) {
      return (
        !!firstName.trim() &&
        !!lastName.trim() &&
        password.length >= 8 &&
        /[a-z]/.test(password) &&
        /[A-Z]/.test(password) &&
        /[0-9]/.test(password) &&
        /[!@#$%^&*(),.?":{}|<>]/.test(password)
      );
    }
    return false;
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    submitMutation.mutate();
  };

  const stepLabels = [
    "Competition",
    "Your Idea",
    "Your Solution",
    "Bonus",
    "Create Account",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header with logo */}
      <div className="text-center pt-8 pb-4 px-6">
        {workspace?.logoUrl ? (
          <img
            src={workspace.logoUrl}
            alt={workspace.name}
            className="h-12 mx-auto object-contain mb-3"
          />
        ) : (
          <div className="text-2xl font-bold text-gray-800 mb-3">
            {workspace?.name || "Loading..."}
          </div>
        )}
        <p className="text-gray-500 text-sm">Application Form</p>
      </div>

      {/* Progress bar */}
      <div className="max-w-xl mx-auto px-6 mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">
            Step {step} of {TOTAL_STEPS} — {stepLabels[step - 1]}
          </span>
          <span className="text-sm font-semibold" style={{ color: primaryColor }}>
            {progress}% Completed
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: primaryColor }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="max-w-xl mx-auto px-6 pb-24">
        {/* Step 1 — Competition */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Competition</h2>
              <p className="text-gray-500 text-sm">Select the problem statement you want to apply for.</p>
            </div>

            {/* Workspace (locked) */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Competition
              </Label>
              <Card className="border border-dashed">
                <CardContent className="p-4 flex items-center gap-3">
                  {workspace?.logoUrl && (
                    <img
                      src={workspace.logoUrl}
                      alt={workspace.name}
                      className="h-10 w-10 rounded-lg object-contain bg-gray-50 p-1 border"
                    />
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">{workspace?.name || "—"}</p>
                    <p className="text-xs text-gray-400">Pre-filled · Cannot be changed</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Problem statement selector */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Problem Statement <span className="text-red-500">*</span>
              </Label>
              <Select value={challengeId} onValueChange={setChallengeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an active problem statement…" />
                </SelectTrigger>
                <SelectContent>
                  {challengeList.length === 0 ? (
                    <div className="py-3 px-3 text-sm text-gray-400">No active problem statements available</div>
                  ) : (
                    challengeList.map((c) => (
                      <SelectItem key={c.challenge.id} value={c.challenge.id}>
                        {c.challenge.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Step 2 — Your Idea */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Your Idea</h2>
              <p className="text-gray-500 text-sm">Tell us about the idea you want to develop.</p>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                What is the name of your idea/solution? <span className="text-red-500">*</span>
              </Label>
              <Input
                value={ideaName}
                onChange={(e) => setIdeaName(e.target.value)}
                placeholder="e.g. EduMatch, GreenRoute…"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                What sector does your idea focus on? <span className="text-red-500">*</span>
              </Label>
              <Select value={sector} onValueChange={setSector}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a sector…" />
                </SelectTrigger>
                <SelectContent>
                  {SECTORS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                What problem are you trying to solve? <span className="text-red-500">*</span>
                <Badge variant="outline" className="text-xs font-normal border-blue-200 text-blue-600">
                  30% weight
                </Badge>
              </Label>
              <Textarea
                value={problemStatement}
                onChange={(e) => setProblemStatement(e.target.value)}
                placeholder="Describe the problem clearly — who has it, how painful is it, why does it exist?"
                rows={5}
              />
            </div>
          </div>
        )}

        {/* Step 3 — Your Solution */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Your Solution</h2>
              <p className="text-gray-500 text-sm">Explain how you solve the problem.</p>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                Please describe your solution <span className="text-red-500">*</span>
                <Badge variant="outline" className="text-xs font-normal border-blue-200 text-blue-600">
                  40% weight
                </Badge>
              </Label>
              <Textarea
                value={solutionDescription}
                onChange={(e) => setSolutionDescription(e.target.value)}
                placeholder="How does your solution work? What does a user experience?"
                rows={5}
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                Why would people choose your solution over what already exists today? <span className="text-red-500">*</span>
                <Badge variant="outline" className="text-xs font-normal border-blue-200 text-blue-600">
                  20% weight
                </Badge>
              </Label>
              <Textarea
                value={differentiator}
                onChange={(e) => setDifferentiator(e.target.value)}
                placeholder="What makes your solution unique or better than current alternatives?"
                rows={4}
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                Describe your target user and why they would use your solution? <span className="text-red-500">*</span>
                <Badge variant="outline" className="text-xs font-normal border-blue-200 text-blue-600">
                  10% weight
                </Badge>
              </Label>
              <Textarea
                value={targetUser}
                onChange={(e) => setTargetUser(e.target.value)}
                placeholder="Who is your primary user? What problem does it solve for them specifically?"
                rows={4}
              />
            </div>
          </div>
        )}

        {/* Step 4 — Bonus */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                Bonus Section
                <Badge className="text-xs font-normal bg-amber-100 text-amber-700 border-amber-200 border">
                  Not scored — used for qualitative ranking
                </Badge>
              </h2>
              <p className="text-gray-500 text-sm">All questions in this section are optional.</p>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                What relevant skills or experience do you have?
                <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </Label>
              <Textarea
                value={relevantSkills}
                onChange={(e) => setRelevantSkills(e.target.value)}
                placeholder="e.g. software development, marketing, business development…"
                rows={3}
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Are you a previous program winner? (Hackathons, etc.)
                <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </Label>
              <Select value={previousWinner} onValueChange={setPreviousWinner}>
                <SelectTrigger>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Have you done any initial design, testing, or validation of your idea?
                <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </Label>
              <Select value={hasValidation} onValueChange={setHasValidation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasValidation === "yes" && (
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  If yes, please explain
                  <span className="text-gray-400 font-normal ml-1">(optional)</span>
                </Label>
                <Textarea
                  value={validationDetails}
                  onChange={(e) => setValidationDetails(e.target.value)}
                  placeholder="Describe any prototypes, user tests, or market research you've conducted…"
                  rows={3}
                />
              </div>
            )}
          </div>
        )}

        {/* Step 5 — Create Account */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Create Your Account</h2>
              <p className="text-gray-500 text-sm">
                Set up your account to complete your application.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Email</Label>
              <Input value={email} readOnly className="bg-gray-50 cursor-not-allowed" />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Password <span className="text-red-500">*</span>
              </Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                Must be at least 8 characters with uppercase, lowercase, number, and special
                character (!@#$%^&*).
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Fixed bottom navigation */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4"
        style={{ boxShadow: "0 -4px 20px rgba(0,0,0,0.06)" }}
      >
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={step === 1}
            className="flex items-center gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>

          {step < TOTAL_STEPS ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-1.5 px-6"
              style={{ background: canProceed() ? primaryColor : undefined }}
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || submitMutation.isPending}
              className="flex items-center gap-1.5 px-6"
              style={{ background: canProceed() ? primaryColor : undefined }}
            >
              {submitMutation.isPending ? "Submitting…" : "Submit Application"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
