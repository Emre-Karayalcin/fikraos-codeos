import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import MentorCard from "./MentorCard";
import MentorProfileSheet from "./MentorProfileSheet";

interface Mentor {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  title?: string;
  bio?: string;
  expertise?: string[];
  industries?: string[];
  sessionDurationMinutes?: number;
  location?: string;
  website?: string;
}

export default function MentorsTab() {
  const [search, setSearch] = useState("");
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: mentors = [], isLoading } = useQuery<Mentor[]>({
    queryKey: ["/api/mentors"],
  });

  const filtered = mentors.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = `${m.firstName} ${m.lastName}`.toLowerCase();
    const exp = (m.expertise || []).join(" ").toLowerCase();
    return name.includes(q) || exp.includes(q) || (m.title || "").toLowerCase().includes(q);
  });

  const handleCardClick = (mentor: Mentor) => {
    setSelectedMentor(mentor);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-6 p-1">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Who are you searching for?"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-xl bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-lg font-medium">No mentors found</p>
          <p className="text-sm mt-1">
            {search ? "Try a different search term" : "No mentors available yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((mentor) => (
            <MentorCard key={mentor.id} mentor={mentor} onClick={() => handleCardClick(mentor)} />
          ))}
        </div>
      )}

      {selectedMentor && (
        <MentorProfileSheet
          mentor={selectedMentor}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
        />
      )}
    </div>
  );
}
