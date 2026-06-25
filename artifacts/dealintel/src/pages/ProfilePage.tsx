import { useUser } from "@clerk/react";
import { User, Mail, Shield, Sparkles, Calendar } from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function ProfilePage() {
  const { user: clerkUser } = useUser();
  const { data: user } = useCurrentUser();

  const tierLabel =
    user?.tier === "investor_pro"   ? "Investor Pro" :
    user?.tier === "seller_premium" ? "Seller Premium" :
    "Free";

  const tierClass =
    user?.tier === "investor_pro"   ? "bg-primary/10 text-primary border-primary/30" :
    user?.tier === "seller_premium" ? "bg-amber-500/15 text-amber-400 border-amber-500/30" :
    "bg-muted text-muted-foreground border-border";

  const joined = clerkUser?.createdAt
    ? new Date(clerkUser.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "—";

  return (
    <PortalLayout title="Profile" subtitle="Your account details">
      <div className="max-w-2xl space-y-4">

        {/* Identity */}
        <Card className="p-6 border-border">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-14 w-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <span className="text-xl font-semibold text-primary">
                {(user?.name ?? user?.email ?? "?")?.[0]?.toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-base font-semibold">{user?.name ?? "—"}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Row icon={User} label="Full name" value={user?.name ?? "—"} />
            <Row icon={Mail} label="Email" value={user?.email ?? "—"} />
            <Row
              icon={Shield}
              label="Role"
              value={
                <Badge variant="outline" className="text-xs border-primary/30 text-primary font-mono">
                  {user?.role?.toUpperCase() ?? "—"}
                </Badge>
              }
            />
            <Row
              icon={Sparkles}
              label="Plan"
              value={
                <Badge variant="outline" className={`text-xs ${tierClass}`}>
                  {tierLabel}
                </Badge>
              }
            />
            <Row icon={Calendar} label="Member since" value={joined} />
          </div>
        </Card>

        {/* Account info */}
        <Card className="p-6 border-border">
          <h3 className="text-sm font-semibold mb-4">Account</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Account ID</span>
              <span className="font-mono text-xs text-muted-foreground">{clerkUser?.id?.slice(0, 16)}…</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Auth provider</span>
              <span className="text-xs">
                {clerkUser?.externalAccounts?.[0]?.provider ?? "Email"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="outline" className="text-xs bg-green-500/15 text-green-400 border-green-500/30">
                Active
              </Badge>
            </div>
          </div>
        </Card>

      </div>
    </PortalLayout>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-0.5 text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}
