import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, Star } from "lucide-react";

interface MentorCardProps {
  mentor: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
    title?: string;
    bio?: string;
    expertise?: string[];
    sessionDurationMinutes?: number;
    averageRating?: number | null;
  };
  onClick: () => void;
}

export default function MentorCard({ mentor, onClick }: MentorCardProps) {
  const initials = `${mentor.firstName?.[0] ?? ""}${mentor.lastName?.[0] ?? ""}`.toUpperCase();

  return (
    <Card
      className="p-5 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 bg-card/50 backdrop-blur-sm"
      onClick={onClick}
    >
      <div className="flex flex-col items-center text-center space-y-3">
        <Avatar className="h-16 w-16">
          <AvatarImage src={mentor.profileImageUrl} />
          <AvatarFallback className="text-lg font-semibold bg-primary/20 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div>
          <p className="font-semibold text-base">
            {mentor.firstName} {mentor.lastName}
          </p>
          {mentor.title && (
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{mentor.title}</p>
          )}
        </div>

        {mentor.bio && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{mentor.bio}</p>
        )}

        {mentor.expertise && mentor.expertise.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-center">
            {mentor.expertise.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs bg-primary/15 text-primary border-0 hover:bg-primary/25"
              >
                {tag}
              </Badge>
            ))}
            {mentor.expertise.length > 3 && (
              <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground border-0">
                +{mentor.expertise.length - 3}
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center justify-between w-full pt-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{mentor.sessionDurationMinutes ?? 60} mins</span>
          </div>
          {mentor.averageRating != null && mentor.averageRating > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
              <span className="font-medium text-foreground">{mentor.averageRating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
