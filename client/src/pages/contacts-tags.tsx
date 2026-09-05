import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, MoreVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ContactTag } from "@shared/schema";

export default function ContactsTags() {
  const [addTagOpen, setAddTagOpen] = useState(false);
  const { toast } = useToast();

  const { data: tags = [] } = useQuery<ContactTag[]>({
    queryKey: ["/api/tags"],
  });

  const createTagMutation = useMutation({
    mutationFn: async (data: { name: string; color: string }) => {
      return apiRequest("POST", "/api/tags", data);
    },
    onSuccess: () => {
      toast({ title: "Tag created successfully" });
      setAddTagOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/tags/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Tag deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
    },
  });

  const tagForm = useForm({
    defaultValues: { name: "", color: "#22c55e" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Tags</h1>
          <p className="text-sm text-muted-foreground">
            Create tags to categorize your contacts
          </p>
        </div>
        <Dialog open={addTagOpen} onOpenChange={setAddTagOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-tag">
              <Plus className="h-4 w-4 mr-2" />
              Create Tag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Tag</DialogTitle>
            </DialogHeader>
            <Form {...tagForm}>
              <form onSubmit={tagForm.handleSubmit((data) => createTagMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={tagForm.control}
                  name="name"
                  rules={{ required: "Tag name is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Tag name" {...field} data-testid="input-tag-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={tagForm.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input type="color" {...field} className="w-12 h-9 p-1" data-testid="input-tag-color" />
                          <Input value={field.value} onChange={field.onChange} className="flex-1" />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createTagMutation.isPending} data-testid="button-submit-tag">
                  {createTagMutation.isPending ? "Creating..." : "Create Tag"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            {tags.length === 0 ? (
              <div className="w-full text-center text-muted-foreground py-8">
                No tags created yet
              </div>
            ) : (
              tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center gap-2 rounded-lg border p-3 hover-elevate"
                  data-testid={`tag-${tag.id}`}
                >
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="font-medium">{tag.name}</span>
                  <Badge variant="secondary" className="ml-2">{tag.contactCount}</Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => deleteTagMutation.mutate(tag.id)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
