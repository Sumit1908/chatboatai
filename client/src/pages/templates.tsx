import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, RefreshCw, Search, MoreHorizontal, Eye, Copy, Trash2, Filter, Edit, Send } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { parseApiError } from "@/lib/errors";
import type { Template } from "@shared/schema";

// "gaur_01" -> "gaur_02" (preserving zero-padding width); if the name has
// no trailing number, appends "_2". Skips forward past any name that's
// already taken so duplicating the same template twice never collides.
function nextDuplicateName(baseName: string, existing: Template[]): string {
  const existingNames = new Set(existing.map((t) => t.name));
  const match = baseName.match(/^(.*?)(\d+)$/);
  const prefix = match ? match[1] : `${baseName}_`;
  const width = match ? match[2].length : 1;
  let n = match ? parseInt(match[2], 10) + 1 : 2;

  let candidate = `${prefix}${String(n).padStart(width, "0")}`;
  while (existingNames.has(candidate)) {
    n += 1;
    candidate = `${prefix}${String(n).padStart(width, "0")}`;
  }
  return candidate;
}

export default function Templates() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const isManualSync = useRef(false);
  const { toast } = useToast();

  const { data: templates = [], isLoading, refetch, isRefetching } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Template Deleted",
        description: "The template has been removed.",
      });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (template: Template) => {
      const duplicateData = {
        name: nextDuplicateName(template.name, templates),
        category: template.category,
        language: template.language,
        components: template.components,
        saveAsDraft: false,
      };
      return apiRequest("POST", "/api/templates", duplicateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Template Duplicated & Submitted",
        description: "The copy has been created and submitted to WhatsApp for approval.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Duplication Failed",
        description: parseApiError(error, "Failed to duplicate template."),
        variant: "destructive",
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/templates/sync");
    },
    onSuccess: async (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      if (isManualSync.current) {
        const data = await response.json();
        toast({
          title: "Templates Synced",
          description: `Synced ${data.synced || 0} templates from WhatsApp.`,
        });
      }
      isManualSync.current = false;
    },
    onError: (error: any) => {
      if (isManualSync.current) {
        toast({
          title: "Sync Failed",
          description: parseApiError(error, "Failed to sync templates from WhatsApp. Make sure your account is connected."),
          variant: "destructive",
        });
      }
      isManualSync.current = false;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/templates/${id}/submit`);
    },
    onSuccess: async (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Template Submitted",
        description: "Template has been submitted to WhatsApp for approval.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Submit Failed",
        description: parseApiError(error, "Failed to submit template to Meta."),
        variant: "destructive",
      });
    },
  });

  const autoSyncDone = useRef(false);
  useEffect(() => {
    if (!autoSyncDone.current && !isLoading) {
      autoSyncDone.current = true;
      isManualSync.current = false;
      syncMutation.mutate();
    }
  }, [isLoading]);

  const handleRefresh = () => {
    isManualSync.current = true;
    syncMutation.mutate();
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || template.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: templates.length,
    APPROVED: templates.filter((t) => t.status === "APPROVED").length,
    PENDING: templates.filter((t) => t.status === "PENDING").length,
    REJECTED: templates.filter((t) => t.status === "REJECTED").length,
    DRAFT: templates.filter((t) => t.status === "DRAFT").length,
  };

  return (
    <div className="space-y-6">
      <div className="page-hero flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title" data-testid="text-page-title">Templates</h1>
          <p className="page-subtitle">
            Manage your WhatsApp message templates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="default"
            onClick={handleRefresh}
            disabled={syncMutation.isPending}
            data-testid="button-refresh-templates"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`} />
            Sync
          </Button>
          <Button asChild data-testid="button-create-template">
            <Link href="/templates/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-templates"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40" data-testid="select-status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({statusCounts.all})</SelectItem>
              <SelectItem value="APPROVED">Approved ({statusCounts.APPROVED})</SelectItem>
              <SelectItem value="PENDING">Pending ({statusCounts.PENDING})</SelectItem>
              <SelectItem value="REJECTED">Rejected ({statusCounts.REJECTED})</SelectItem>
              <SelectItem value="DRAFT">Draft ({statusCounts.DRAFT})</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Templates Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <TemplatesTableSkeleton />
          ) : filteredTemplates.length === 0 ? (
            <div className="py-16 text-center">
              <FileTextIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No templates found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {searchQuery || statusFilter !== "all" 
                  ? "Try adjusting your filters"
                  : "Create your first template to get started"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Last Synced</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map((template) => (
                  <TableRow 
                    key={template.id}
                    data-testid={`template-row-${template.id}`}
                  >
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium font-mono text-sm">{template.name}</p>
                        {template.metaTemplateId && (
                          <p className="text-xs text-muted-foreground font-mono">
                            ID: {template.metaTemplateId}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {template.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="uppercase text-xs font-medium">
                      {template.language}
                    </TableCell>
                    <TableCell>
                      <StatusBadge 
                        status={template.status as any} 
                        type="template" 
                        pulse={template.status === "PENDING"}
                        size="sm"
                      />
                    </TableCell>
                    <TableCell>
                      <StatusBadge 
                        status={(template.qualityScore || "UNKNOWN") as any} 
                        type="quality"
                        size="sm"
                        showIcon={false}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {template.lastSyncedAt 
                        ? format(new Date(template.lastSyncedAt), "MMM d, h:mm a")
                        : "Never"
                      }
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            data-testid={`button-template-actions-${template.id}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedTemplate(template)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/templates/${template.id}/edit`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          {!template.metaTemplateId && (
                            <DropdownMenuItem
                              onClick={() => submitMutation.mutate(template.id)}
                              data-testid={`button-submit-template-${template.id}`}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Submit to WhatsApp
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => duplicateMutation.mutate(template)}
                            data-testid={`button-duplicate-template-${template.id}`}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => deleteMutation.mutate(template.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Template Preview Dialog */}
      <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
            <DialogDescription>
              {selectedTemplate?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <div className="bg-background rounded-lg p-4 shadow-sm border max-w-xs mx-auto">
                  {selectedTemplate.components?.map((component, i) => (
                    <div key={i} className="text-sm">
                      {component.type === "HEADER" && (
                        <p className="font-semibold mb-2">{component.text}</p>
                      )}
                      {component.type === "BODY" && (
                        <p className="text-foreground">{component.text}</p>
                      )}
                      {component.type === "FOOTER" && (
                        <p className="text-xs text-muted-foreground mt-2">{component.text}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <StatusBadge status={selectedTemplate.status as any} type="template" size="sm" />
                </div>
                <div>
                  <p className="text-muted-foreground">Category</p>
                  <p className="font-medium">{selectedTemplate.category}</p>
                </div>
              </div>
              {selectedTemplate.rejectionReason && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <p className="font-medium">Rejection Reason:</p>
                  <p>{selectedTemplate.rejectionReason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FileTextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function TemplatesTableSkeleton() {
  return <TableSkeleton rows={6} cols={6} />;
}
