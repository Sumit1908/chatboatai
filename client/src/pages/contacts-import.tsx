import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, Download, FileText, Check, AlertCircle, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { parseApiError } from "@/lib/errors";
import type { ContactList, ContactTag, Contact } from "@shared/schema";

type ImportStep = 1 | 2 | 3;

export default function ContactsImport() {
  const [step, setStep] = useState<ImportStep>(1);
  const [selectedList, setSelectedList] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [contactStatus, setContactStatus] = useState<"subscribed" | "unsubscribed">("subscribed");
  const [file, setFile] = useState<File | null>(null);
  const [parsedContacts, setParsedContacts] = useState<{ phone: string; name?: string }[]>([]);
  const [fieldMapping, setFieldMapping] = useState<{ phone: number; name: number }>({ phone: 0, name: 1 });
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: lists = [] } = useQuery<ContactList[]>({
    queryKey: ["/api/lists"],
  });

  const { data: tags = [] } = useQuery<ContactTag[]>({
    queryKey: ["/api/tags"],
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const importMutation = useMutation({
    mutationFn: async (data: { contacts: { phone: string; name?: string; status: string; tagIds: string[] }[]; listId?: string }) => {
      const res = await apiRequest("POST", "/api/contacts/import", data);
      return res.json();
    },
    onSuccess: (data: { imported: number; updated: number }) => {
      const parts = [];
      if (data.imported) parts.push(`${data.imported} new contact(s) added`);
      if (data.updated) parts.push(`${data.updated} existing contact(s) updated`);
      toast({
        title: "Import successful",
        description: parts.length > 0 ? parts.join(", ") + "." : "No new or updated contacts - all were already up to date.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
      setStep(1);
      setFile(null);
      setParsedContacts([]);
      setCsvHeaders([]);
    },
    onError: (error: any) => {
      toast({
        title: "Import failed",
        description: parseApiError(error, "There was an error importing contacts. Please try again."),
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseCSV(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === "text/csv") {
      setFile(droppedFile);
      parseCSV(droppedFile);
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter(line => line.trim());
      if (lines.length > 0) {
        const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
        setCsvHeaders(headers);
        
        const phoneIndex = headers.findIndex(h => 
          h.toLowerCase().includes("phone") || h.toLowerCase().includes("mobile") || h.toLowerCase().includes("number")
        );
        const nameIndex = headers.findIndex(h => 
          h.toLowerCase().includes("name")
        );
        
        setFieldMapping({
          phone: phoneIndex >= 0 ? phoneIndex : 0,
          name: nameIndex >= 0 ? nameIndex : 1,
        });

        const contacts = lines.slice(1).map(line => {
          const values = line.split(",").map(v => v.trim().replace(/"/g, ""));
          return {
            phone: values[phoneIndex >= 0 ? phoneIndex : 0] || "",
            name: values[nameIndex >= 0 ? nameIndex : 1] || undefined,
          };
        }).filter(c => c.phone);

        setParsedContacts(contacts);
        setStep(2);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    const contactsToImport = parsedContacts.map(c => ({
      phone: c.phone,
      name: c.name,
      status: contactStatus,
      tagIds: selectedTags,
    }));

    importMutation.mutate({
      contacts: contactsToImport,
      listId: selectedList || undefined,
    });
  };

  const exportContacts = (listId?: string) => {
    const contactsToExport = listId
      ? contacts.filter(c => c.listIds?.includes(listId))
      : contacts;

    const csv = [
      ["Phone", "Name", "Status"],
      ...contactsToExport.map((c) => [c.phone, c.name || "", c.status]),
    ].map((row) => row.join(",")).join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contacts${listId ? `-${lists.find(l => l.id === listId)?.name}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Import / Export</h1>
          <p className="text-sm text-muted-foreground">
            Import contacts from CSV or export your contact lists
          </p>
        </div>
        <Button variant="outline" onClick={() => window.open("#", "_blank")} data-testid="button-how-to">
          <HelpCircle className="h-4 w-4 mr-2" />
          How to?
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Import contacts using CSV file</CardTitle>
              <CardDescription>
                Import your contacts using a CSV file. Maximum contacts limit as per your current plan: 10,000
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center gap-8 py-4">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex flex-col items-center gap-2">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium ${
                        step >= s
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {step > s ? <Check className="h-5 w-5" /> : s}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {s === 1 ? "Upload File" : s === 2 ? "Map Fields" : "Import"}
                    </span>
                  </div>
                ))}
              </div>

              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <Label>Contact List</Label>
                    <Select value={selectedList || "none"} onValueChange={(val) => setSelectedList(val === "none" ? "" : val)}>
                      <SelectTrigger className="mt-1.5" data-testid="select-import-list">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No list (import directly)</SelectItem>
                        {lists.map((list) => (
                          <SelectItem key={list.id} value={list.id}>
                            {list.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-1">
                      Select contact list to import the contacts to.{" "}
                      <a href="/contacts" className="text-primary hover:underline">Click here</a> to add new.
                    </p>
                  </div>

                  <div>
                    <Label>Contacts File</Label>
                    <div
                      className="mt-1.5 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                      onDrop={handleDrop}
                      onDragOver={(e) => e.preventDefault()}
                      data-testid="dropzone-csv"
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".csv"
                        onChange={handleFileSelect}
                        className="hidden"
                        data-testid="input-csv-file"
                      />
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {file ? file.name : "Choose a CSV file or drag it here"}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Max allowed file size: 16MB</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Contact Tags (Optional)</Label>
                      <Select
                        value={selectedTags.join(",")}
                        onValueChange={(val) => setSelectedTags(val ? val.split(",") : [])}
                      >
                        <SelectTrigger className="mt-1.5" data-testid="select-import-tags">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {tags.map((tag) => (
                            <SelectItem key={tag.id} value={tag.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-3 w-3 rounded-full"
                                  style={{ backgroundColor: tag.color }}
                                />
                                {tag.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Contact Status</Label>
                      <RadioGroup
                        value={contactStatus}
                        onValueChange={(val) => setContactStatus(val as "subscribed" | "unsubscribed")}
                        className="flex gap-4 mt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="subscribed" id="subscribed" data-testid="radio-subscribed" />
                          <Label htmlFor="subscribed" className="font-normal">Subscribed</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="unsubscribed" id="unsubscribed" data-testid="radio-unsubscribed" />
                          <Label htmlFor="unsubscribed" className="font-normal">Unsubscribed</Label>
                        </div>
                      </RadioGroup>
                      <p className="text-sm text-muted-foreground mt-1">
                        Set default status for newly imported contacts. Status of existing contacts will not be changed.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <h3 className="font-medium mb-4">Map CSV Columns to Contact Fields</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label>Phone Number Column</Label>
                        <Select
                          value={String(fieldMapping.phone)}
                          onValueChange={(val) => setFieldMapping(prev => ({ ...prev, phone: parseInt(val) }))}
                        >
                          <SelectTrigger className="mt-1.5" data-testid="select-phone-column">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {csvHeaders.map((header, i) => (
                              <SelectItem key={i} value={String(i)}>
                                {header}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Name Column (Optional)</Label>
                        <Select
                          value={String(fieldMapping.name)}
                          onValueChange={(val) => setFieldMapping(prev => ({ ...prev, name: parseInt(val) }))}
                        >
                          <SelectTrigger className="mt-1.5" data-testid="select-name-column">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {csvHeaders.map((header, i) => (
                              <SelectItem key={i} value={String(i)}>
                                {header}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Found {parsedContacts.length} contacts in the file
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(1)} data-testid="button-back">
                      Back
                    </Button>
                    <Button onClick={() => setStep(3)} data-testid="button-continue">
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="rounded-lg border p-4 bg-muted/50">
                    <h3 className="font-medium mb-2">Ready to Import</h3>
                    <div className="space-y-1 text-sm">
                      <p><strong>Contacts:</strong> {parsedContacts.length}</p>
                      <p><strong>List:</strong> {selectedList ? lists.find(l => l.id === selectedList)?.name : "None"}</p>
                      <p><strong>Status:</strong> {contactStatus}</p>
                      <p><strong>Tags:</strong> {selectedTags.length > 0 ? tags.filter(t => selectedTags.includes(t.id)).map(t => t.name).join(", ") : "None"}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(2)} data-testid="button-back-step3">
                      Back
                    </Button>
                    <Button
                      onClick={handleImport}
                      disabled={importMutation.isPending}
                      data-testid="button-import"
                    >
                      {importMutation.isPending ? "Importing..." : "Import Contacts"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Export contacts</CardTitle>
              <CardDescription>
                Export your contacts to a CSV file.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Select Contact List to Export</Label>
                <Select defaultValue="all">
                  <SelectTrigger className="mt-1.5" data-testid="select-export-list">
                    <SelectValue placeholder={`All contacts (${contacts.length} contacts)`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All contacts ({contacts.length} contacts)</SelectItem>
                    {lists.map((list) => (
                      <SelectItem key={list.id} value={list.id}>
                        {list.name} ({list.contactCount} contacts)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => exportContacts()} data-testid="button-export-csv">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Do More with Contacts API</CardTitle>
              <CardDescription>
                Fetch all contacts or a specific one, add / edit them and do much more with our powerful Contacts API.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-primary">
                  <Check className="h-4 w-4" />
                  Get contacts
                </li>
                <li className="flex items-center gap-2 text-primary">
                  <Check className="h-4 w-4" />
                  Get specific contact
                </li>
                <li className="flex items-center gap-2 text-primary">
                  <Check className="h-4 w-4" />
                  Add / edit contacts
                </li>
                <li className="flex items-center gap-2 text-primary">
                  <Check className="h-4 w-4" />
                  Get contact lists
                </li>
                <li className="flex items-center gap-2 text-primary">
                  <Check className="h-4 w-4" />
                  Get contact tags
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <Check className="h-4 w-4" />
                  And more...
                </li>
              </ul>
              <Button variant="outline" className="w-full mt-4" data-testid="button-view-api-docs">
                View API Docs
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
