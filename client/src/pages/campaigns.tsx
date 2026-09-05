import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, MoreHorizontal, Play, Pause, Eye, Trash2, Calendar, Users } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import { ProgressRing } from "@/components/progress-ring";
import { Skeleton, PageSkeleton, KPIGridSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Campaign, Template } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";

const campaignFormSchema = z.object({
  name: z.string().min(1, "Campaign name is required").max(255),
  description: z.string().max(500).optional(),
  templateId: z.string().min(1, "Template is required"),
  recipients: z.string().min(1, "At least one recipient is required"),
});

type CampaignFormValues = z.infer<typeof campaignFormSchema>;

export default function Campaigns() {
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const { toast } = useToast();

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  const approvedTemplates = templates.filter((t) => t.status === "APPROVED");

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: "",
      description: "",
      templateId: "",
      recipients: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CampaignFormValues) => {
      const recipientList = data.recipients
        .split(/[\n,]/)
        .map((r) => r.trim())
        .filter((r) => r.length > 0);
      
      return apiRequest("POST", "/api/campaigns", {
        name: data.name,
        description: data.description,
        templateId: data.templateId,
        recipients: recipientList,
        status: "draft",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Campaign Created",
        description: "Your campaign has been saved as a draft.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create campaign. Please try again.",
        variant: "destructive",
      });
    },
  });

  const startMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/campaigns/${id}`, { status: "running" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Campaign Started",
        description: "Messages are being sent.",
      });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/campaigns/${id}`, { status: "paused" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Campaign Paused",
        description: "Message sending has been paused.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/campaigns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Campaign Deleted",
        description: "The campaign has been removed.",
      });
    },
  });

  const filteredCampaigns = campaigns.filter((campaign) =>
    campaign.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCampaignProgress = (campaign: Campaign) => {
    // Mock progress calculation
    if (campaign.status === "completed") return 100;
    if (campaign.status === "running") return Math.floor(Math.random() * 60) + 20;
    return 0;
  };

  const getRecipientCount = (campaign: Campaign) => {
    return campaign.recipients?.length || 0;
  };

  return (
    <div className="space-y-6">
      <div className="page-hero flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Campaigns</h1>
          <p className="page-subtitle">
            Create and manage broadcast campaigns
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-campaign">
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Campaign</DialogTitle>
              <DialogDescription>
                Set up a new broadcast campaign with your approved templates.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Summer Sale Announcement" 
                          data-testid="input-campaign-name"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of the campaign"
                          className="resize-none"
                          data-testid="input-campaign-description"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="templateId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-template">
                            <SelectValue placeholder="Select an approved template" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {approvedTemplates.length === 0 ? (
                            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                              No approved templates available
                            </div>
                          ) : (
                            approvedTemplates.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Only approved templates can be used
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="recipients"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recipients</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter phone numbers (one per line or comma-separated)&#10;e.g., +1234567890&#10;+0987654321"
                          className="min-h-[120px] resize-none font-mono text-sm"
                          data-testid="input-recipients"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        {field.value
                          ?.split(/[\n,]/)
                          .filter((r) => r.trim().length > 0).length || 0} recipients
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending}
                    data-testid="button-submit-campaign"
                  >
                    {createMutation.isPending ? "Creating..." : "Create Campaign"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search campaigns..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-search-campaigns"
        />
      </div>

      {/* Campaigns Grid */}
      {isLoading ? (
        <CampaignsGridSkeleton />
      ) : filteredCampaigns.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CampaignIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No campaigns found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchQuery 
                ? "Try adjusting your search"
                : "Create your first campaign to start broadcasting"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCampaigns.map((campaign) => {
            const progress = getCampaignProgress(campaign);
            const recipientCount = getRecipientCount(campaign);
            const template = templates.find((t) => t.id === campaign.templateId);
            
            return (
              <Card 
                key={campaign.id} 
                className="hover-elevate"
                data-testid={`campaign-card-${campaign.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{campaign.name}</h3>
                      </div>
                      <StatusBadge 
                        status={campaign.status as any} 
                        type="campaign" 
                        size="sm"
                        pulse={campaign.status === "running"}
                      />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          data-testid={`button-campaign-actions-${campaign.id}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedCampaign(campaign)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {campaign.status === "draft" && (
                          <DropdownMenuItem onClick={() => startMutation.mutate(campaign.id)}>
                            <Play className="h-4 w-4 mr-2" />
                            Start Campaign
                          </DropdownMenuItem>
                        )}
                        {campaign.status === "running" && (
                          <DropdownMenuItem onClick={() => pauseMutation.mutate(campaign.id)}>
                            <Pause className="h-4 w-4 mr-2" />
                            Pause Campaign
                          </DropdownMenuItem>
                        )}
                        {campaign.status === "paused" && (
                          <DropdownMenuItem onClick={() => startMutation.mutate(campaign.id)}>
                            <Play className="h-4 w-4 mr-2" />
                            Resume Campaign
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => deleteMutation.mutate(campaign.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {campaign.description && (
                    <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                      {campaign.description}
                    </p>
                  )}

                  <div className="mt-4 flex items-center gap-4">
                    {campaign.status === "running" || campaign.status === "completed" ? (
                      <ProgressRing 
                        progress={progress} 
                        size={64} 
                        strokeWidth={5}
                        showLabel={false}
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                        <Users className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Recipients</span>
                        <span className="font-medium tabular-nums">{recipientCount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Template</span>
                        <span className="font-mono text-xs truncate max-w-[120px]">
                          {template?.name || "Unknown"}
                        </span>
                      </div>
                      {campaign.status === "running" && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium tabular-nums">{progress}%</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {campaign.createdAt 
                          ? format(new Date(campaign.createdAt), "MMM d, yyyy")
                          : "Unknown"}
                      </span>
                    </div>
                    {campaign.status === "draft" && (
                      <Button 
                        size="sm" 
                        onClick={() => startMutation.mutate(campaign.id)}
                        disabled={startMutation.isPending}
                        data-testid={`button-start-campaign-${campaign.id}`}
                      >
                        <Play className="h-3.5 w-3.5 mr-1.5" />
                        Start
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Campaign Details Dialog */}
      <Dialog open={!!selectedCampaign} onOpenChange={() => setSelectedCampaign(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedCampaign?.name}</DialogTitle>
            <DialogDescription>
              Campaign details and performance
            </DialogDescription>
          </DialogHeader>
          {selectedCampaign && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <StatusBadge status={selectedCampaign.status as any} type="campaign" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Recipients</p>
                  <p className="font-medium">{getRecipientCount(selectedCampaign).toLocaleString()}</p>
                </div>
              </div>
              {selectedCampaign.description && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="text-sm">{selectedCampaign.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Created</p>
                  <p>
                    {selectedCampaign.createdAt 
                      ? format(new Date(selectedCampaign.createdAt), "MMM d, yyyy h:mm a")
                      : "Unknown"}
                  </p>
                </div>
                {selectedCampaign.startedAt && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Started</p>
                    <p>{format(new Date(selectedCampaign.startedAt), "MMM d, yyyy h:mm a")}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CampaignIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  );
}

function CampaignsGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="rounded-2xl border border-white/60 bg-white/80 p-6 space-y-4 animate-in fade-in duration-300" style={{ animationDelay: `${i * 80}ms` }}>
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
          <div className="pt-4 border-t border-[#075E54]/6 flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
