import { useNotes, useCreateNote, useUpdateNote, useDeleteNote, useJobs, useCustomers, useExpenses, useInventory, useWorkers, useTravel } from "@/hooks/use-business-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, StickyNote, Calendar, Clock, Tag, Trash2, FileText, Activity } from "lucide-react";
import { JobLink } from "@/components/job-link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertNoteSchema } from "@shared/schema";
import { useState, useMemo } from "react";
import { z } from "zod";
import { format } from "date-fns";

const SECTIONS = [
  { id: "general", label: "General", attributes: ["content"] },
  { id: "customers", label: "Customers", attributes: ["name", "phone", "address"] },
  { id: "jobs", label: "Jobs", attributes: ["description", "location", "status", "quotedAmount"] },
  { id: "expenses", label: "Expenses", attributes: ["category", "description", "amount", "date"] },
  { id: "inventory", label: "Inventory", attributes: ["name", "category", "quantity", "costPerUnit"] },
  { id: "workers", label: "Workers", attributes: ["name", "role", "dailyWage"] },
  { id: "travel", label: "Travel", attributes: ["date", "kilometers", "fuelCost"] },
];

const LOG_SECTIONS = [
  { id: "system", label: "System" },
  { id: "custom", label: "Custom" },
  { id: "jobs", label: "Jobs" },
  { id: "customers", label: "Customers" },
  { id: "expenses", label: "Expenses" },
  { id: "inventory", label: "Inventory" },
  { id: "workers", label: "Workers" },
  { id: "workers_attendance", label: "Workers Attendance" },
];

type FormValues = z.infer<typeof insertNoteSchema>;

export default function NotesPage() {
  const { data: notes, isLoading } = useNotes();
  const { data: jobs } = useJobs();
  const { data: customers } = useCustomers();
  const { data: expenses } = useExpenses();
  const { data: inventory } = useInventory();
  const { data: workers } = useWorkers();
  const { data: travel } = useTravel();
  
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("notes");

  // Filtering state
  const [filterSection, setFilterSection] = useState<string>("all");
  const [filterAttribute, setFilterAttribute] = useState<string>("all");
  const [filterReference, setFilterReference] = useState<string>("all");

  const noteForm = useForm<FormValues>({
    resolver: zodResolver(insertNoteSchema),
    defaultValues: {
      type: "note",
      section: "general",
      attribute: "content",
      content: "",
    }
  });

  const logForm = useForm<FormValues>({
    resolver: zodResolver(insertNoteSchema),
    defaultValues: {
      type: "log",
      section: "custom",
      content: "",
    }
  });

  const selectedSection = noteForm.watch("section");

  const attributes = useMemo(() => {
    return SECTIONS.find(s => s.id === selectedSection)?.attributes || ["content"];
  }, [selectedSection]);

  const subItems = useMemo(() => {
    switch (selectedSection) {
      case "jobs": return jobs?.map(j => ({ id: j.id, label: j.jobId || `Job #${j.id}` }));
      case "customers": return customers?.map(c => ({ id: c.id, label: c.name }));
      case "expenses": return expenses?.map(e => ({ id: e.id, label: e.description }));
      case "inventory": return inventory?.map(i => ({ id: i.id, label: i.name }));
      case "workers": return workers?.map(w => ({ id: w.id, label: w.name }));
      case "travel": return travel?.map(t => ({ id: t.id, label: `${t.date} - ${t.kilometers}km` }));
      default: return [];
    }
  }, [selectedSection, jobs, customers, expenses, inventory, workers, travel]);

  const userNotes = notes?.filter(n => n.type === "note" || !n.type) || [];
  const logs = notes?.filter(n => n.type === "log" || n.type === "system" || n.type === "custom") || [];

  const filteredNotes = useMemo(() => {
    return userNotes.filter(note => {
      const matchSection = filterSection === "all" || note.section === filterSection;
      const matchAttribute = filterAttribute === "all" || note.attribute === filterAttribute;
      const matchReference = filterReference === "all" || note.referenceId?.toString() === filterReference;
      return matchSection && matchAttribute && matchReference;
    });
  }, [userNotes, filterSection, filterAttribute, filterReference]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchSection = filterSection === "all" || log.section === filterSection;
      const matchAttribute = filterAttribute === "all" || log.attribute === filterAttribute;
      const matchReference = filterReference === "all" || log.referenceId?.toString() === filterReference;
      return matchSection && matchAttribute && matchReference;
    });
  }, [logs, filterSection, filterAttribute, filterReference]);

  const groupedLogs = useMemo(() => {
    return filteredLogs.reduce((acc: any, log) => {
      const section = log.section || "custom";
      if (!acc[section]) acc[section] = [];
      acc[section].push(log);
      return acc;
    }, {});
  }, [filteredLogs]);

  const filterAttributes = useMemo(() => {
    if (filterSection === "all") return [];
    return SECTIONS.find(s => s.id === filterSection)?.attributes || [];
  }, [filterSection]);

  const filterSubItems = useMemo(() => {
    if (filterSection === "all") return [];
    switch (filterSection) {
      case "jobs": return jobs?.map(j => ({ id: j.id, label: j.jobId || `Job #${j.id}` }));
      case "customers": return customers?.map(c => ({ id: c.id, label: c.name }));
      case "expenses": return expenses?.map(e => ({ id: e.id, label: e.description }));
      case "inventory": return inventory?.map(i => ({ id: i.id, label: i.name }));
      case "workers": return workers?.map(w => ({ id: w.id, label: w.name }));
      case "travel": return travel?.map(t => ({ id: t.id, label: `${t.date} - ${t.kilometers}km` }));
      default: return [];
    }
  }, [filterSection, jobs, customers, expenses, inventory, workers, travel]);

  const handleEditNote = (note: any) => {
    setEditingNote(note);
    if (note.type === "log") {
      logForm.reset({
        type: "log",
        section: note.section,
        referenceId: note.referenceId || undefined,
        content: note.content,
      });
      setIsLogOpen(true);
    } else {
      noteForm.reset({
        type: "note",
        section: note.section,
        referenceId: note.referenceId || undefined,
        attribute: note.attribute || "content",
        content: note.content,
      });
      setIsNoteOpen(true);
    }
  };

  const onSubmitNote = (data: FormValues) => {
    const noteData = { ...data, type: "note" };
    if (editingNote) {
      updateNote.mutate({ id: editingNote.id, ...noteData }, {
        onSuccess: () => {
          setIsNoteOpen(false);
          setEditingNote(null);
          noteForm.reset();
        }
      });
    } else {
      createNote.mutate(noteData, {
        onSuccess: () => {
          setIsNoteOpen(false);
          noteForm.reset();
        }
      });
    }
  };

  const onSubmitLog = (data: FormValues) => {
    const logData = { ...data, type: "log" };
    if (editingNote) {
      updateNote.mutate({ id: editingNote.id, ...logData }, {
        onSuccess: () => {
          setIsLogOpen(false);
          setEditingNote(null);
          logForm.reset();
        }
      });
    } else {
      createNote.mutate(logData, {
        onSuccess: () => {
          setIsLogOpen(false);
          logForm.reset();
        }
      });
    }
  };

  const NoteCard = ({ note, isLog = false }: { note: any; isLog?: boolean }) => (
    <Card key={note.id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 border-b bg-slate-50/50">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {isLog ? (
                <Activity className="h-3 w-3 text-orange-500" />
              ) : (
                <Tag className="h-3 w-3 text-primary" />
              )}
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isLog ? 'text-orange-500' : 'text-primary'}`}>
                {LOG_SECTIONS.find(s => s.id === note.section)?.label || note.section} {note.attribute ? `› ${note.attribute}` : ""}
              </span>
            </div>
            <CardTitle className="text-sm font-medium text-slate-700">
              {note.section === "general" ? "General" : 
               note.section === "system" ? "System Log" :
               note.section === "custom" ? "Custom Log" :
               note.section === "jobs" && note.referenceId ? (
                <>Job: <JobLink jobId={note.referenceId} /></>
               ) :
               `Ref: #${note.referenceId}`}
            </CardTitle>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <Calendar className="h-3 w-3" />
              {format(new Date(note.createdAt), "MMM d, yyyy")}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <Clock className="h-3 w-3" />
              {format(new Date(note.createdAt), "h:mm a")}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex justify-between items-end gap-2">
          <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap line-clamp-2 flex-1">{note.content}</p>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => handleEditNote(note)} className="h-8 px-2 text-xs" data-testid={`button-edit-${isLog ? 'log' : 'note'}-${note.id}`}>
              View/Edit
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-xs text-slate-400 hover:text-red-600"
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete this ${isLog ? 'log' : 'note'}?`)) {
                  deleteNote.mutate(note.id);
                }
              }}
              data-testid={`button-delete-${isLog ? 'log' : 'note'}-${note.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Notes & Logs</h2>
          <p className="text-slate-500">Manage notes and activity logs across your business.</p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm bg-slate-50/50">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filter Section</label>
              <Select value={filterSection} onValueChange={(val) => {
                setFilterSection(val);
                setFilterAttribute("all");
                setFilterReference("all");
              }}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="All Sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {SECTIONS.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                  {activeTab === "logs" && LOG_SECTIONS.filter(ls => !SECTIONS.find(s => s.id === ls.id)).map(ls => (
                    <SelectItem key={ls.id} value={ls.id}>{ls.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filter Attribute</label>
              <Select value={filterAttribute} onValueChange={setFilterAttribute} disabled={filterSection === "all"}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="All Attributes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Attributes</SelectItem>
                  {filterAttributes.map(a => (
                    <SelectItem key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filter Specifics</label>
              <Select value={filterReference} onValueChange={setFilterReference} disabled={filterSection === "all" || filterSection === "general"}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="All Specifics" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Specifics</SelectItem>
                  {filterSubItems?.map(item => (
                    <SelectItem key={item.id} value={item.id.toString()}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="notes" className="flex items-center gap-2" data-testid="tab-notes">
            <FileText className="h-4 w-4" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2" data-testid="tab-logs">
            <Activity className="h-4 w-4" />
            Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notes" className="mt-6">
          <div className="flex justify-end mb-4">
            <Dialog open={isNoteOpen} onOpenChange={(open) => {
              setIsNoteOpen(open);
              if (!open) {
                setEditingNote(null);
                noteForm.reset();
              }
            }}>
              <DialogTrigger asChild>
                <Button className="shadow-sm" data-testid="button-add-note">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-white dark:bg-slate-900 shadow-2xl border-none">
                <DialogHeader className="pb-4 border-b">
                  <DialogTitle className="text-xl font-bold">
                    {editingNote ? "Edit Note" : "Create Note"}
                  </DialogTitle>
                </DialogHeader>
                <div className="py-6">
                  <Form {...noteForm}>
                    <form onSubmit={noteForm.handleSubmit(onSubmitNote)} className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={noteForm.control} name="section" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Section</FormLabel>
                            <Select onValueChange={(val) => {
                              field.onChange(val);
                              noteForm.setValue("referenceId", undefined);
                              noteForm.setValue("attribute", SECTIONS.find(s => s.id === val)?.attributes[0] || "content");
                            }} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                {SECTIONS.map(s => (
                                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={noteForm.control} name="attribute" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Attribute</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                {attributes.map(a => (
                                  <SelectItem key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      {selectedSection !== "general" && (
                        <FormField control={noteForm.control} name="referenceId" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Specific {selectedSection.slice(0, -1)}</FormLabel>
                            <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value?.toString() || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={`Select ${selectedSection.slice(0, -1)}`} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {subItems?.map(item => (
                                  <SelectItem key={item.id} value={item.id.toString()}>{item.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                      )}

                      <FormField control={noteForm.control} name="content" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Note Content</FormLabel>
                          <FormControl><Textarea className="min-h-[120px]" placeholder="Type your note here..." {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <Button type="submit" className="w-full" disabled={createNote.isPending || updateNote.isPending} data-testid="button-save-note">
                        {editingNote ? "Update Note" : "Save Note"}
                      </Button>
                    </form>
                  </Form>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              <div className="col-span-full text-center py-12 text-slate-400">Loading notes...</div>
            ) : filteredNotes.length === 0 ? (
              <div className="col-span-full text-center py-12 text-slate-400 bg-slate-50 rounded-lg border-2 border-dashed">
                <StickyNote className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No notes found matching your filters.</p>
              </div>
            ) : filteredNotes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          <div className="flex justify-end mb-4">
            <Dialog open={isLogOpen} onOpenChange={(open) => {
              setIsLogOpen(open);
              if (!open) {
                setEditingNote(null);
                logForm.reset();
              }
            }}>
              <DialogTrigger asChild>
                <Button className="shadow-sm" variant="outline" data-testid="button-add-custom-log">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Custom Log
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-white dark:bg-slate-900 shadow-2xl border-none">
                <DialogHeader className="pb-4 border-b">
                  <DialogTitle className="text-xl font-bold">
                    {editingNote ? "Edit Log" : "Create Custom Log"}
                  </DialogTitle>
                </DialogHeader>
                <div className="py-6">
                  <Form {...logForm}>
                    <form onSubmit={logForm.handleSubmit(onSubmitLog)} className="space-y-6">
                      <FormField control={logForm.control} name="section" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Log Category</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              {LOG_SECTIONS.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={logForm.control} name="content" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Log Entry</FormLabel>
                          <FormControl><Textarea className="min-h-[120px]" placeholder="Enter log details..." {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <Button type="submit" className="w-full" disabled={createNote.isPending || updateNote.isPending} data-testid="button-save-log">
                        {editingNote ? "Update Log" : "Save Log"}
                      </Button>
                    </form>
                  </Form>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-8">
            {LOG_SECTIONS.map(section => {
              const sectionLogs = groupedLogs[section.id] || [];
              if (sectionLogs.length === 0 && section.id !== 'custom') return null;
              
              return (
                <div key={section.id} className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-700 border-b pb-2 flex items-center gap-2">
                    {section.id === 'workers_attendance' ? <Activity className="h-5 w-5 text-orange-500" /> : <Tag className="h-5 w-5 text-slate-400" />}
                    {section.label}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sectionLogs.length === 0 ? (
                      <div className="col-span-full text-center py-8 text-slate-400 bg-slate-50 rounded-lg border-2 border-dashed">
                        <p>No logs in this category.</p>
                      </div>
                    ) : sectionLogs.map((log: any) => (
                      <NoteCard key={log.id} note={log} isLog={true} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
