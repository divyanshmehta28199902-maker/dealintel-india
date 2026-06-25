import { FileText, Lock, Upload, FolderOpen } from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PlanGate from "@/components/PlanGate";

const SAMPLE_DOCS = [
  { name: "NDA Template — Standard", type: "Legal", size: "45 KB", date: "Jun 2026" },
  { name: "Due Diligence Checklist", type: "Template", size: "120 KB", date: "Jun 2026" },
  { name: "LOI Template — India SME", type: "Legal", size: "78 KB", date: "Jun 2026" },
];

export default function Documents() {
  return (
    <PlanGate requiredPlan="investor_pro" fullPage featureName="Document Vault">
      <PortalLayout title="Documents" subtitle="Secure deal documents and templates">

        {/* Info banner */}
        <Card className="p-4 border-primary/20 bg-primary/5 mb-6">
          <div className="flex items-start gap-3">
            <Lock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Confidential document vault</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                All documents stored here are encrypted at rest and accessible only to you.
                Shared deal room documents appear here once a seller grants access.
              </p>
            </div>
          </div>
        </Card>

        <div className="grid md:grid-cols-3 gap-6">

          {/* Document list */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Available Documents</h3>
              <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" disabled>
                <Upload className="h-3.5 w-3.5" /> Upload
              </Button>
            </div>

            {SAMPLE_DOCS.length === 0 ? (
              <Card className="p-12 text-center border-border">
                <FolderOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium">No documents yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Documents shared with you in active deals will appear here.
                </p>
              </Card>
            ) : (
              <div className="space-y-2">
                {SAMPLE_DOCS.map((doc) => (
                  <Card
                    key={doc.name}
                    className="p-4 border-border flex items-center gap-4 hover:border-primary/40 transition-colors cursor-pointer"
                  >
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{doc.size} · {doc.date}</p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">{doc.type}</Badge>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar info */}
          <div className="space-y-4">
            <Card className="p-5 border-border">
              <h3 className="text-sm font-semibold mb-3">Storage</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground">Used</span>
                    <span className="text-xs num">243 KB / 5 GB</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full w-[1%] rounded-full bg-primary" />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-5 border-border">
              <h3 className="text-sm font-semibold mb-3">Deal Room Access</h3>
              <p className="text-xs text-muted-foreground">
                When a seller accepts your contact request, they can grant you access to
                their deal room documents. Those files will appear here automatically.
              </p>
            </Card>
          </div>

        </div>
      </PortalLayout>
    </PlanGate>
  );
}
