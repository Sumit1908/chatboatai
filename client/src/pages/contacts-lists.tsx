import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, MoreVertical, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ContactList } from "@shared/schema";

export default function ContactsLists() {
  const [addListOpen, setAddListOpen] = useState(false);
  const { toast } = useToast();

  const { data: lists = [], isLoading } = useQuery<ContactList[]>({
    queryKey: ["/api/lists"],
  });

  const createListMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      return apiRequest("POST", "/api/lists", data);
    },
    onSuccess: () => {
      toast({ title: "List created successfully" });
      setAddListOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/lists/${id}`);
    },
    onSuccess: () => {
      toast({ title: "List deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
    },
  });

  const listForm = useForm({
    defaultValues: { name: "", description: "" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Lists</h1>
          <p className="text-sm text-muted-foreground">
            Organize your contacts into lists
          </p>
        </div>
        <Dialog open={addListOpen} onOpenChange={setAddListOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-list">
              <Plus className="h-4 w-4 mr-2" />
              Create List
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New List</DialogTitle>
            </DialogHeader>
            <Form {...listForm}>
              <form onSubmit={listForm.handleSubmit((data) => createListMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={listForm.control}
                  name="name"
                  rules={{ required: "List name is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="List name" {...field} data-testid="input-list-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={listForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="List description" {...field} data-testid="input-list-description" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createListMutation.isPending} data-testid="button-submit-list">
                  {createListMutation.isPending ? "Creating..." : "Create List"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <div className="col-span-full text-center text-muted-foreground py-8">Loading...</div>
            ) : lists.length === 0 ? (
              <div className="col-span-full text-center text-muted-foreground py-8">
                No lists created yet
              </div>
            ) : (
              lists.map((list) => (
                <Card key={list.id} className="hover-elevate" data-testid={`list-${list.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{list.name}</h3>
                        <p className="text-sm text-muted-foreground">{list.description || "No description"}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteListMutation.mutate(list.id)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{(list.contactCount ?? 0).toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground">contacts</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
