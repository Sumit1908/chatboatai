import { useEffect, useState } from "react";
import { useQuery, useMutation, keepPreviousData } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  MoreVertical,
  Trash2,
  Edit,
  List,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Contact, ContactTag, ContactList } from "@shared/schema";

const PAGE_SIZE_OPTIONS = [100, 200, 500, 1000] as const;

interface ContactsPageResponse {
  contacts: Contact[];
  total: number;
  page: number;
  pageSize: number;
}

export default function Contacts() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pendingDeleteContact, setPendingDeleteContact] = useState<Contact | null>(null);
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [showNewListInput, setShowNewListInput] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [filterListId, setFilterListId] = useState<string>("all");
  const [filterTagId, setFilterTagId] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(100);
  const { toast } = useToast();

  // Debounce free-text search so every keystroke doesn't trigger a refetch.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Any filter/page-size change invalidates the current page number - jump
  // back to page 1 rather than risk landing past the end of a smaller result set.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterListId, filterTagId, pageSize]);

  const { data, isLoading, isFetching } = useQuery<ContactsPageResponse>({
    queryKey: ["/api/contacts/paginated", { page, pageSize, search: debouncedSearch, listId: filterListId, tagId: filterTagId }],
    queryFn: async ({ queryKey }) => {
      const [, params] = queryKey as [string, { page: number; pageSize: number; search: string; listId: string; tagId: string }];
      const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      if (params.search) qs.set("search", params.search);
      if (params.listId !== "all") qs.set("listId", params.listId);
      if (params.tagId !== "all") qs.set("tagId", params.tagId);
      const res = await apiRequest("GET", `/api/contacts/paginated?${qs.toString()}`);
      return res.json();
    },
    // Keeps the previous page's rows on screen while the next page loads,
    // instead of flashing an empty/loading table on every click.
    placeholderData: keepPreviousData,
  });

  const contacts = data?.contacts ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const { data: tags = [] } = useQuery<ContactTag[]>({
    queryKey: ["/api/tags"],
  });

  const { data: lists = [] } = useQuery<ContactList[]>({
    queryKey: ["/api/lists"],
  });

  const invalidateContacts = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/contacts/paginated"] });
    queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
  };

  const createListMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      const res = await apiRequest("POST", "/api/lists", data);
      return res.json();
    },
    onSuccess: (newList: ContactList) => {
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      setSelectedListId(newList.id);
      setShowNewListInput(false);
      setNewListName("");
      toast({ title: `List "${newList.name}" created` });
    },
    onError: () => {
      toast({ title: "Failed to create list", variant: "destructive" });
    },
  });

  const createContactMutation = useMutation({
    mutationFn: async (data: { phone: string; name?: string; listIds?: string[] }) => {
      return apiRequest("POST", "/api/contacts", data);
    },
    onSuccess: () => {
      toast({ title: "Contact added successfully" });
      setAddContactOpen(false);
      setSelectedListId("");
      setShowNewListInput(false);
      setNewListName("");
      contactForm.reset();
      invalidateContacts();
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
    },
    onError: () => {
      toast({ title: "Failed to add contact", variant: "destructive" });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/contacts/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Contact deleted" });
      invalidateContacts();
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return apiRequest("POST", "/api/contacts/bulk-delete", { ids });
    },
    onSuccess: () => {
      toast({ title: `${selectedIds.size} contact(s) deleted` });
      setSelectedIds(new Set());
      setConfirmDeleteOpen(false);
      invalidateContacts();
    },
    onError: () => {
      toast({ title: "Failed to delete contacts", variant: "destructive" });
    },
  });

  const contactForm = useForm({
    defaultValues: { phone: "", name: "" },
  });

  const handleAddContact = (data: { phone: string; name: string }) => {
    const listIds = selectedListId ? [selectedListId] : [];
    createContactMutation.mutate({ ...data, listIds });
  };

  const handleCreateNewList = () => {
    if (!newListName.trim()) return;
    createListMutation.mutate({ name: newListName.trim() });
  };

  // "Select all" selects every contact on the current page - the same
  // bounded set that's actually rendered, so it can never balloon into
  // selecting (and then bulk-deleting) an entire tenant's contact list by
  // accident. Change the page size to select more at once.
  const allPageSelected = contacts.length > 0 && contacts.every((c) => selectedIds.has(c.id));
  const somePageSelected = contacts.some((c) => selectedIds.has(c.id));

  const toggleSelectAll = () => {
    if (allPageSelected) {
      const newSet = new Set(selectedIds);
      contacts.forEach((c) => newSet.delete(c.id));
      setSelectedIds(newSet);
    } else {
      const newSet = new Set(selectedIds);
      contacts.forEach((c) => newSet.add(c.id));
      setSelectedIds(newSet);
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const getListNamesForContact = (contact: Contact) => {
    const contactListIds = (contact as any).listIds as string[] | null;
    if (!contactListIds?.length) return null;
    return contactListIds
      .map((lid) => lists.find((l) => l.id === lid))
      .filter(Boolean)
      .map((l) => l!.name);
  };

  return (
    <div className="space-y-6">
      <div className="page-hero flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title" data-testid="text-page-title">Contacts</h1>
          <p className="page-subtitle">
            Manage your contacts
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-contacts"
              />
            </div>
            <Select value={filterListId} onValueChange={setFilterListId}>
              <SelectTrigger className="w-[160px]" data-testid="select-filter-list">
                <SelectValue placeholder="All lists" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All lists</SelectItem>
                {lists.map((list) => (
                  <SelectItem key={list.id} value={list.id} data-testid={`filter-list-option-${list.id}`}>
                    {list.name} ({list.contactCount || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterTagId} onValueChange={setFilterTagId}>
              <SelectTrigger className="w-[160px]" data-testid="select-filter-tag">
                <SelectValue placeholder="All tags" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tags</SelectItem>
                {tags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id} data-testid={`filter-tag-option-${tag.id}`}>
                    {tag.name} ({tag.contactCount || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="w-[130px]" data-testid="select-page-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)} data-testid={`page-size-option-${size}`}>
                    {size} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {selectedIds.size > 0 && (
              <Button
                variant="destructive"
                onClick={() => setConfirmDeleteOpen(true)}
                disabled={bulkDeleteMutation.isPending}
                data-testid="button-bulk-delete"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete {selectedIds.size} Selected
              </Button>
            )}
            <Dialog open={addContactOpen} onOpenChange={(open) => {
              setAddContactOpen(open);
              if (!open) {
                setSelectedListId("");
                setShowNewListInput(false);
                setNewListName("");
                contactForm.reset();
              }
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-contact">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Contact</DialogTitle>
                </DialogHeader>
                <Form {...contactForm}>
                  <form onSubmit={contactForm.handleSubmit(handleAddContact)} className="space-y-4">
                    <FormField
                      control={contactForm.control}
                      name="phone"
                      rules={{ required: "Phone number is required" }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="+1234567890" {...field} data-testid="input-contact-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={contactForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Contact name" {...field} data-testid="input-contact-name" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Add to List (optional)</Label>
                      {!showNewListInput ? (
                        <div className="flex items-center gap-2">
                          <Select
                            value={selectedListId}
                            onValueChange={(val) => {
                              if (val === "__none__") {
                                setSelectedListId("");
                              } else {
                                setSelectedListId(val);
                              }
                            }}
                          >
                            <SelectTrigger className="flex-1" data-testid="select-contact-list">
                              <SelectValue placeholder="Select a list" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">No list</SelectItem>
                              {lists.map((list) => (
                                <SelectItem key={list.id} value={list.id} data-testid={`select-list-option-${list.id}`}>
                                  <div className="flex items-center gap-2">
                                    <List className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    <span>{list.name}</span>
                                    <span className="text-muted-foreground text-xs">({list.contactCount || 0})</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setShowNewListInput(true)}
                            data-testid="button-new-list"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="Enter new list name"
                              value={newListName}
                              onChange={(e) => setNewListName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleCreateNewList();
                                }
                              }}
                              data-testid="input-new-list-name"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setShowNewListInput(false);
                                setNewListName("");
                              }}
                              data-testid="button-cancel-new-list"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleCreateNewList}
                              disabled={!newListName.trim() || createListMutation.isPending}
                              data-testid="button-create-list"
                            >
                              {createListMutation.isPending ? "Creating..." : "Create List"}
                            </Button>
                          </div>
                        </div>
                      )}
                      {selectedListId && !showNewListInput && (
                        <p className="text-xs text-muted-foreground">
                          Contact will be added to "{lists.find(l => l.id === selectedListId)?.name}"
                        </p>
                      )}
                    </div>

                    <Button type="submit" className="w-full" disabled={createContactMutation.isPending} data-testid="button-submit-contact">
                      {createContactMutation.isPending ? "Adding..." : "Add Contact"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allPageSelected ? true : somePageSelected ? "indeterminate" : false}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all contacts on this page"
                      data-testid="checkbox-select-all"
                    />
                  </TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Lists</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-6 rounded-md" /></TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : contacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No contacts found
                    </TableCell>
                  </TableRow>
                ) : (
                  contacts.map((contact) => {
                    const listNames = getListNamesForContact(contact);
                    return (
                      <TableRow key={contact.id} data-testid={`contact-row-${contact.id}`}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(contact.id)}
                            onCheckedChange={() => toggleSelect(contact.id)}
                            aria-label={`Select ${contact.name || contact.phone}`}
                            data-testid={`checkbox-contact-${contact.id}`}
                          />
                        </TableCell>
                        <TableCell className="font-mono">{contact.phone}</TableCell>
                        <TableCell>{contact.name || "-"}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={contact.status === "subscribed" ? "bg-accent text-accent-foreground" : ""}
                          >
                            {contact.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {listNames?.length ? (
                            <div className="flex gap-1 flex-wrap">
                              {listNames.map((name) => (
                                <Badge key={name} variant="outline" className="text-xs">
                                  <List className="h-3 w-3 mr-1" />
                                  {name}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {contact.tagIds?.length ? (
                            <div className="flex gap-1 flex-wrap">
                              {contact.tagIds.map((tagId) => {
                                const tag = tags.find((t) => t.id === tagId);
                                return tag ? (
                                  <Badge
                                    key={tag.id}
                                    variant="outline"
                                    style={{ borderColor: tag.color, color: tag.color }}
                                  >
                                    {tag.name}
                                  </Badge>
                                ) : null;
                              })}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-contact-menu-${contact.id}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setPendingDeleteContact(contact)}
                                data-testid={`button-delete-contact-${contact.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-muted-foreground" data-testid="text-contacts-count">
              {total === 0
                ? "0 contacts"
                : `Showing ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} of ${total} contacts`}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isFetching}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground min-w-[90px] text-center" data-testid="text-page-indicator">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isFetching}
                data-testid="button-next-page"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={confirmDeleteOpen || !!pendingDeleteContact}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDeleteOpen(false);
            setPendingDeleteContact(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDeleteContact
                ? `Delete ${pendingDeleteContact.name || pendingDeleteContact.phone}?`
                : `Delete ${selectedIds.size} contact(s)?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. {pendingDeleteContact ? "This contact" : "The selected contacts"}, along
              with their message history and Inbox conversations, will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bulk-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDeleteContact) {
                  deleteContactMutation.mutate(pendingDeleteContact.id);
                  setPendingDeleteContact(null);
                } else {
                  bulkDeleteMutation.mutate(Array.from(selectedIds));
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-bulk-delete"
            >
              {(bulkDeleteMutation.isPending || deleteContactMutation.isPending) ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
