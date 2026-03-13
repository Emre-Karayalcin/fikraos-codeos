import { useState, useEffect, KeyboardEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { X, Plus, Trash2 } from "lucide-react";

const DAYS_OF_WEEK = [
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
  { label: "Sunday", value: 0 },
];

interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function TagInput({
  label,
  tags,
  onChange,
}: {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = useState("");

  const addTag = (value: string) => {
    const trimmed = value.trim().replace(/,$/, "").trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
      <div
        className="min-h-[42px] rounded-lg px-3 py-2 flex flex-wrap gap-1.5 cursor-text"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
        onClick={(e) => (e.currentTarget.querySelector("input") as HTMLInputElement)?.focus()}
      >
        {tags.map((tag) => (
          <Badge
            key={tag}
            className="bg-primary/20 text-primary border-primary/30 text-xs flex items-center gap-1 px-2 py-0.5"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(tags.filter((t) => t !== tag)); }}
              className="hover:text-white ml-0.5"
            >
              <X size={10} />
            </button>
          </Badge>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (input.trim()) addTag(input); }}
          placeholder={tags.length === 0 ? "Type and press Enter or comma" : ""}
          className="flex-1 min-w-[120px] bg-transparent text-white text-sm outline-none placeholder:text-gray-500"
        />
      </div>
    </div>
  );
}

export default function MentorProfileSetup({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: existingProfile } = useQuery<any>({
    queryKey: ["/api/mentor-profile/me"],
    queryFn: async () => {
      const res = await fetch("/api/mentor-profile/me", { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    enabled: open,
  });

  const [title, setTitle] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [expertise, setExpertise] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [sessionDuration, setSessionDuration] = useState("60");
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);

  // Populate form from existing profile
  useEffect(() => {
    if (existingProfile) {
      setTitle(existingProfile.title || "");
      setBio(existingProfile.bio || "");
      setLocation(existingProfile.location || "");
      setWebsite(existingProfile.website || "");
      setExpertise(existingProfile.expertise || []);
      setIndustries(existingProfile.industries || []);
      setSessionDuration(String(existingProfile.sessionDurationMinutes || 60));
      setAvailability(existingProfile.availability || []);
    }
  }, [existingProfile]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PUT", "/api/mentor-profile/me", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mentor-profile/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mentors"] });
      toast({ title: "Profile saved successfully" });
      onOpenChange(false);
    },
    onError: () => toast({ title: "Failed to save profile", variant: "destructive" }),
  });

  const handleSave = () => {
    mutation.mutate({
      title,
      bio,
      location,
      website,
      expertise,
      industries,
      sessionDurationMinutes: parseInt(sessionDuration),
      isActive: true,
      availability,
    });
  };

  const addSlot = () => {
    setAvailability([...availability, { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }]);
  };

  const updateSlot = (index: number, field: keyof AvailabilitySlot, value: string | number) => {
    setAvailability(availability.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const removeSlot = (index: number) => {
    setAvailability(availability.filter((_, i) => i !== index));
  };

  const inputClass =
    "w-full rounded-lg px-3 py-2.5 text-white text-sm outline-none placeholder:text-gray-500 transition-colors focus:border-primary/50";
  const inputStyle = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl overflow-y-auto"
        style={{ background: "#0f0f1a", borderLeft: "1px solid rgba(255,255,255,0.08)" }}
      >
        <SheetHeader className="mb-6">
          <SheetTitle className="text-white text-xl">Set Up Your Mentor Profile</SheetTitle>
          <p className="text-gray-400 text-sm">
            Complete your profile to appear in the Mentors directory and receive bookings.
          </p>
        </SheetHeader>

        <div className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. CEO of Betterhelp"
              className={inputClass}
              style={inputStyle}
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell mentees about your background and expertise..."
              rows={4}
              className={`${inputClass} resize-none`}
              style={inputStyle}
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Location</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Riyadh, Saudi Arabia"
              className={inputClass}
              style={inputStyle}
            />
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Website</label>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://yourwebsite.com"
              className={inputClass}
              style={inputStyle}
            />
          </div>

          {/* Expertise */}
          <TagInput label="Expertise" tags={expertise} onChange={setExpertise} />

          {/* Industries */}
          <TagInput label="Industries" tags={industries} onChange={setIndustries} />

          {/* Session Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Session Duration</label>
            <Select value={sessionDuration} onValueChange={setSessionDuration}>
              <SelectTrigger
                className="text-white"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.12)" }}>
                {[30, 45, 60, 90].map((d) => (
                  <SelectItem key={d} value={String(d)} className="text-white hover:bg-white/10">
                    {d} minutes
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Availability */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-300">Availability</label>
              <button
                type="button"
                onClick={addSlot}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                <Plus size={14} /> Add Slot
              </button>
            </div>
            {availability.length === 0 && (
              <p className="text-gray-500 text-sm py-2">No availability slots. Click "Add Slot" to add one.</p>
            )}
            <div className="space-y-2">
              {availability.map((slot, index) => (
                <div
                  key={index}
                  className="rounded-lg p-3 flex items-center gap-3 flex-wrap"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <Select
                    value={String(slot.dayOfWeek)}
                    onValueChange={(v) => updateSlot(index, "dayOfWeek", parseInt(v))}
                  >
                    <SelectTrigger
                      className="w-36 text-white text-sm"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.12)" }}>
                      {DAYS_OF_WEEK.map((d) => (
                        <SelectItem key={d.value} value={String(d.value)} className="text-white hover:bg-white/10">
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) => updateSlot(index, "startTime", e.target.value)}
                    className="rounded-lg px-2 py-1.5 text-white text-sm outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                  />
                  <span className="text-gray-500 text-sm">to</span>
                  <input
                    type="time"
                    value={slot.endTime}
                    onChange={(e) => updateSlot(index, "endTime", e.target.value)}
                    className="rounded-lg px-2 py-1.5 text-white text-sm outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                  />
                  <button
                    type="button"
                    onClick={() => removeSlot(index)}
                    className="ml-auto text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-white/12 text-gray-300 hover:bg-white/10 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={mutation.isPending}
              className="flex-1 bg-primary hover:bg-primary/90 text-white"
            >
              {mutation.isPending ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
