import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function BackButton({ to }: { to?: string }) {
  const navigate = useNavigate();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-2 text-muted-foreground hover:text-foreground"
      onClick={() => (to ? navigate(to) : navigate(-1))}
    >
      <ArrowLeft className="h-4 w-4" /> Back
    </Button>
  );
}
