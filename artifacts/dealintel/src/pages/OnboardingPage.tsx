import { useState } from "react";
import { useLocation } from "wouter";
import { Building2, Search, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser, useUpdateUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function OnboardingPage() {
  const { data: user } = useCurrentUser();
  const updateUser = useUpdateUser();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [role, setRole] = useState<"seller" | "investor" | null>(null);
  const [name, setName] = useState(user?.name ?? "");

  // Already onboarded → redirect
  if (user?.role) {
    navigate(user.role === "seller" ? "/seller/dashboard" : "/investor/marketplace");
    return null;
  }

  async function handleSubmit() {
    if (!role) {
      toast({ title: "Select a role", description: "Choose how you'll use DealIntel.", variant: "destructive" });
      return;
    }
    try {
      await updateUser.mutateAsync({ role, name: name.trim() || undefined });
      navigate(role === "seller" ? "/seller/dashboard" : "/investor/marketplace");
    } catch (e) {
      toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <img src={`${basePath}/logo.svg`} alt="DealIntel India" className="h-9 mx-auto mb-6" />
          <h1 className="text-3xl font-bold">Welcome to DealIntel India</h1>
          <p className="text-muted-foreground mt-2">Tell us how you'll be using the platform</p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-sm">Your name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              className="mt-1.5"
              data-testid="input-name"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4 pt-2">
            <Card
              onClick={() => setRole("seller")}
              className={`p-6 cursor-pointer transition-all hover-elevate ${role === "seller" ? "border-primary ring-1 ring-primary" : "border-card-border"}`}
              data-testid="card-role-seller"
            >
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">I'm a Seller</h3>
              <p className="text-xs text-muted-foreground mt-1">
                List my business, get valued, and connect with investors.
              </p>
            </Card>

            <Card
              onClick={() => setRole("investor")}
              className={`p-6 cursor-pointer transition-all hover-elevate ${role === "investor" ? "border-primary ring-1 ring-primary" : "border-card-border"}`}
              data-testid="card-role-investor"
            >
              <div className="h-11 w-11 rounded-xl bg-green-400/10 flex items-center justify-center mb-3">
                <Search className="h-5 w-5 text-green-400" />
              </div>
              <h3 className="font-semibold">I'm an Investor</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Discover deals, run valuations, and manage my pipeline.
              </p>
            </Card>
          </div>

          <Button
            className="w-full gap-2 mt-2"
            size="lg"
            onClick={handleSubmit}
            disabled={updateUser.isPending}
            data-testid="button-continue"
          >
            {updateUser.isPending ? "Setting up..." : "Continue"} <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            You can switch portals anytime from your profile menu.
          </p>
        </div>
      </div>
    </div>
  );
}
