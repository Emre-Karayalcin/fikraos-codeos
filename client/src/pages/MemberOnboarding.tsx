import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RichTextViewer } from "@/components/editor/RichTextViewer";
import toast from "react-hot-toast";
import { Eye, EyeOff, CheckCircle } from "lucide-react";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  primaryColor?: string;
}

function PasswordRule({ met, label }: { met: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-1.5 text-xs ${met ? "text-green-600" : "text-gray-400"}`}>
      <CheckCircle className={`w-3 h-3 ${met ? "text-green-500" : "text-gray-300"}`} />
      {label}
    </li>
  );
}

export default function MemberOnboarding() {
  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const userId = params.get("userId") || "";
  const email = params.get("email") || "";
  const role = params.get("role") || "";
  const isMentor = role === "MENTOR";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [ndaAccepted, setNdaAccepted] = useState(false);
  const [ndaModalOpen, setNdaModalOpen] = useState(false);

  const { data: workspace } = useQuery<Workspace>({
    queryKey: [`/api/workspaces/${slug}`],
    enabled: !!slug,
  });

  // Fetch active MENTOR_NDA only for MENTOR role
  const { data: ndaDeclaration } = useQuery<any>({
    queryKey: ["/api/declarations/active", slug, "MENTOR_NDA"],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${slug}/declarations/active?type=MENTOR_NDA`, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!slug && isMentor,
  });

  const primaryColor = workspace?.primaryColor || "#4588f5";

  const rules = {
    length: password.length >= 8,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
  const allRulesMet = Object.values(rules).every(Boolean);
  const passwordsMatch = password === confirm && confirm.length > 0;
  const ndaOk = !isMentor || !ndaDeclaration || ndaAccepted;
  const canSubmit = !!firstName.trim() && allRulesMet && passwordsMatch && ndaOk;

  const submitMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/workspaces/${slug}/complete-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, email, password, firstName: firstName.trim(), lastName: lastName.trim() }),
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || "Failed to set password");
      }
      return r.json();
    },
    onSuccess: () => {
      // Record NDA acceptance for mentors
      if (isMentor && ndaDeclaration) {
        fetch(`/api/workspaces/${slug}/declarations/${ndaDeclaration.id}/accept`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({}),
        }).catch(() => {});
      }
      toast.success("Account created! Your application is under review.");
      setLocation(`/w/${slug}/onboard/thank-you`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          {workspace?.logoUrl ? (
            <img src={workspace.logoUrl} alt={workspace.name} className="h-14 mx-auto object-contain mb-4" />
          ) : (
            <div className="text-2xl font-bold text-gray-800 mb-4">{workspace?.name || "Loading…"}</div>
          )}
          <h1 className="text-xl font-bold text-gray-900">Create Your Account</h1>
          <p className="text-gray-500 text-sm mt-1">
            Set up your profile to join {workspace?.name || "the workspace"}.
          </p>
          {email && (
            <p className="text-xs text-gray-400 mt-2 bg-gray-100 rounded px-3 py-1 inline-block">{email}</p>
          )}
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
        {/* Name fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Sara"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Last Name</Label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Alqahtani"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Password <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPw(!showPw)}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <ul className="space-y-0.5 pl-1 mt-2">
              <PasswordRule met={rules.length} label="At least 8 characters" />
              <PasswordRule met={rules.upper} label="One uppercase letter" />
              <PasswordRule met={rules.lower} label="One lowercase letter" />
              <PasswordRule met={rules.number} label="One number" />
              <PasswordRule met={rules.special} label='One special character (!@#$%…)' />
            </ul>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Confirm Password <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter your password"
                className={`pr-10 ${confirm.length > 0 && !passwordsMatch ? "border-red-400" : ""}`}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirm.length > 0 && !passwordsMatch && (
              <p className="text-xs text-red-500">Passwords do not match</p>
            )}
          </div>

          {/* NDA checkbox — only for MENTOR role when an active NDA exists */}
          {isMentor && ndaDeclaration && (
            <div className="flex items-start gap-2.5 pt-1">
              <input
                type="checkbox"
                id="nda-accept"
                checked={ndaAccepted}
                onChange={(e) => setNdaAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-blue-600 cursor-pointer"
              />
              <label htmlFor="nda-accept" className="text-sm text-gray-700 cursor-pointer leading-snug">
                I have read and agree to the{" "}
                <button
                  type="button"
                  className="text-blue-600 hover:underline font-medium"
                  onClick={() => setNdaModalOpen(true)}
                >
                  {ndaDeclaration.title}
                </button>
              </label>
            </div>
          )}

          <Button
            className="w-full"
            style={{ background: primaryColor }}
            disabled={!canSubmit || submitMutation.isPending}
            onClick={() => submitMutation.mutate()}
          >
            {submitMutation.isPending ? "Creating your account…" : "Create Account"}
          </Button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Secured by FikraHub · If you did not expect this email, please disregard it.
        </p>
      </div>

      {/* NDA content modal */}
      {ndaDeclaration && (
        <Dialog open={ndaModalOpen} onOpenChange={setNdaModalOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{ndaDeclaration.title}</DialogTitle>
            </DialogHeader>
            <RichTextViewer content={ndaDeclaration.content} className="text-sm" />
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => setNdaModalOpen(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
