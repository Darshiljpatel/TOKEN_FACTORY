import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CitizenProfile } from "@/types/profile";
import { UserRound } from "lucide-react";

interface ProfileCardProps {
  profile: CitizenProfile;
}

export function ProfileCard({ profile }: ProfileCardProps) {
  const tags: string[] = [profile.categoryLabel, profile.state];
  if (profile.socialCategory) tags.push(profile.socialCategory);
  if (profile.income) {
    tags.push(`Income ₹${profile.income.toLocaleString("en-IN")}`);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cream-soft text-primary">
            <UserRound size={17} />
          </div>
          <CardTitle>About You</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="primary">
              {tag}
            </Badge>
          ))}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">
          “{profile.rawText}”
        </p>
      </CardContent>
    </Card>
  );
}
