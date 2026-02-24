import { useWorkers, useCreateWorker, useUpdateWorker, useDeleteWorker, useJobs, useAttendance, useCreateExpense, useCreateAttendance } from "@/hooks/use-business-data";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRef } from "react";
import { Plus, User, Star, Briefcase, History as HistoryIcon, X, FileText, ExternalLink } from "lucide-react";
import { JobLink } from "@/components/job-link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertWorkerSchema } from "@shared/schema";
import { useState, useMemo } from "react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

const formSchema = insertWorkerSchema.extend({
  dailyWage: z.coerce.number().min(0),
  jobId: z.coerce.number().optional().nullable(),
  rating: z.coerce.number().min(0).max(5).default(0),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

export default function WorkersPage() {
  const { data: workers, isLoading } = useWorkers();
  const { data: jobs } = useJobs();
  const { data: attendance } = useAttendance();
  const createWorker = useCreateWorker();
  const updateWorker = useUpdateWorker();
  const deleteWorker = useDeleteWorker();
  const createAttendance = useCreateAttendance();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [viewingWorkerId, setViewingWorkerId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      role: "Painter",
      dailyWage: 0,
      isActive: true,
      jobId: null,
      rating: 0,
      phone: "",
      address: "",
    }
  });

  const [editingWorker, setEditingWorker] = useState<any>(null);
  const [isDocumentsOpen, setIsDocumentsOpen] = useState(false);

  const handleEdit = (worker: any) => {
    setEditingWorker(worker);
    form.reset({
      name: worker.name,
      role: worker.role,
      dailyWage: Number(worker.dailyWage),
      isActive: worker.isActive,
      jobId: worker.jobId || null,
      rating: worker.rating || 0,
      phone: worker.phone || "",
      address: worker.address || "",
    });
    setIsOpen(true);
  };

  const [workerDocuments, setWorkerDocuments] = useState<any[]>([]);

  const fetchWorkerDocuments = async (workerId: number) => {
    try {
      const response = await fetch(`/api/workers/${workerId}/documents`, { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setWorkerDocuments(data);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>, workerId: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);
    formData.append("name", file.name);

    setUploading(true);
    try {
      const response = await fetch(`/api/workers/${workerId}/documents`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) throw new Error("Upload failed");
      await fetchWorkerDocuments(workerId);
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: number, workerId: number) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    try {
      const response = await fetch(`/api/worker-documents/${docId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (response.ok) {
        await fetchWorkerDocuments(workerId);
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const onSubmit = (data: FormValues) => {
    const formattedData = {
      ...data,
      dailyWage: data.dailyWage.toString(),
    };

    if (editingWorker) {
      updateWorker.mutate({ id: editingWorker.id, ...formattedData }, {
        onSuccess: () => {
          setIsOpen(false);
          setEditingWorker(null);
          form.reset();
        },
        onError: (err: any) => {
          if (err.message.includes("exists")) {
            form.setError("name", { message: "Worker name already exists" });
          }
        }
      });
    } else {
      createWorker.mutate(formattedData, {
        onSuccess: () => {
          setIsOpen(false);
          form.reset();
        },
        onError: (err: any) => {
          if (err.message.includes("exists")) {
            form.setError("name", { message: "Worker name already exists" });
          }
        }
      });
    }
  };

  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const attendanceForm = useForm<{
    workerId: number;
    date: string;
    status: string;
    extraAllowance: number;
  }>({
    defaultValues: {
      workerId: 0,
      date: new Date().toISOString().split('T')[0],
      status: "full",
      extraAllowance: 0,
    }
  });

  const handleAttendanceSubmit = (data: any) => {
    const worker = workers?.find(w => w.id === data.workerId);
    createAttendance.mutate({
      ...data,
      jobId: worker?.jobId,
      extraAllowance: String(data.extraAllowance)
    }, {
      onSuccess: () => {
        setIsAttendanceOpen(false);
        attendanceForm.reset();
      }
    });
  };

  const sortedWorkers = useMemo(() => {
    if (!workers) return [];
    return [...workers].sort((a, b) => {
      if (!sortConfig) return 0;
      let aValue: any = (a as any)[sortConfig.key];
      let bValue: any = (b as any)[sortConfig.key];
      
      if (sortConfig.key === 'dailyWage') {
        aValue = Number(aValue);
        bValue = Number(bValue);
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [workers, sortConfig]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const viewingWorker = workers?.find(w => w.id === viewingWorkerId);
  const workerAttendance = attendance?.filter(a => a.workerId === viewingWorkerId) || [];
  
  const workerJobsHistory = useMemo(() => {
    if (!viewingWorkerId || !attendance || !jobs) return [];
    const jobIds = new Set(workerAttendance.map(a => workers?.find(w => w.id === viewingWorkerId)?.jobId).filter(Boolean));
    // Also include historical jobs from attendance if we had jobId there, but schema doesn't have it.
    // For now, let's just use the current job and any jobs where they marked attendance.
    // Since attendance doesn't have jobId, we'll rely on current assignment for "Current Job".
    return Array.from(jobIds).map(id => jobs.find(j => j.id === id)).filter(Boolean);
  }, [viewingWorkerId, attendance, jobs]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Workers</h2>
          <p className="text-slate-500">Manage manpower and daily wages.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            className="shadow-sm border-blue-200 text-blue-700 hover:bg-blue-50"
            onClick={() => setIsAttendanceOpen(true)}
          >
            <HistoryIcon className="h-4 w-4 mr-2" />
            Mark Attendance
          </Button>
          <Select onValueChange={handleSort} defaultValue="">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="role">Role</SelectItem>
              <SelectItem value="dailyWage">Daily Wage</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) {
              setEditingWorker(null);
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button className="shadow-sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Worker
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingWorker ? "Edit Worker" : "Add Worker"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl><Input placeholder="Worker Name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl><Input placeholder="Contact Number" {...field} value={field.value || ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="address" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl><Input placeholder="Worker Address" {...field} value={field.value || ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="role" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Painter">Painter</SelectItem>
                            <SelectItem value="Labour">Labour</SelectItem>
                            <SelectItem value="Helper">Helper</SelectItem>
                            <SelectItem value="Supervisor">Supervisor</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="dailyWage" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Daily Wage (₹)</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="rating" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rating (0-5)</FormLabel>
                        <FormControl><Input type="number" min="0" max="5" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="isActive" render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0 pt-8">
                        <FormControl>
                          <input 
                            type="checkbox" 
                            {...field}
                            value={undefined}
                            checked={field.value} 
                            onChange={(e) => field.onChange(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </FormControl>
                        <FormLabel>Active</FormLabel>
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="jobId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign to Job (Optional)</FormLabel>
                      <Select onValueChange={(val) => field.onChange(val === "none" ? null : Number(val))} value={field.value?.toString() || "none"}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select job" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="none">No current job</SelectItem>
                          {jobs?.map(job => (
                            <SelectItem key={job.id} value={job.id.toString()}>{job.jobId || `Job #${job.id}`}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full" disabled={createWorker.isPending || updateWorker.isPending}>
                    {editingWorker ? "Update Worker" : "Add Worker"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog open={isAttendanceOpen} onOpenChange={setIsAttendanceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Daily Attendance</DialogTitle>
          </DialogHeader>
          <Form {...attendanceForm}>
            <form onSubmit={attendanceForm.handleSubmit(handleAttendanceSubmit)} className="space-y-4">
              <FormField control={attendanceForm.control} name="workerId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Worker</FormLabel>
                  <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value?.toString()}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select worker" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {workers?.filter(w => w.isActive).map(worker => (
                        <SelectItem key={worker.id} value={worker.id.toString()}>{worker.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={attendanceForm.control} name="date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={attendanceForm.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="full">Full Day</SelectItem>
                        <SelectItem value="half">Half Day</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={attendanceForm.control} name="extraAllowance" render={({ field }) => (
                <FormItem>
                  <FormLabel>Extra Allowance (₹)</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={createAttendance.isPending}>
                Record Attendance
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-8 text-slate-500">Loading workers...</div>
        ) : sortedWorkers?.map((worker) => (
          <Card key={worker.id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                  <User className="h-6 w-6 text-slate-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900">{worker.name}</h3>
                  <div className="text-sm text-slate-500">{worker.role}</div>
                </div>
                <div className="flex items-center text-yellow-500">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="ml-1 font-bold">{worker.rating || 0}</span>
                </div>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-500 mb-4 font-mono">
                <span>Rate: ₹{Number(worker.dailyWage).toFixed(2)}/day</span>
                <Badge variant={worker.isActive ? "default" : "secondary"}>{worker.isActive ? "Active" : "Inactive"}</Badge>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => {
                    setViewingWorkerId(worker.id);
                    fetchWorkerDocuments(worker.id);
                    setIsProfileOpen(true);
                  }}
                >
                  View Profile
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleEdit(worker)}>Edit</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Worker Profile</DialogTitle>
          </DialogHeader>
          {viewingWorker && (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                    {viewingWorker.documentUrl ? (
                      <img src={viewingWorker.documentUrl} alt={viewingWorker.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="h-8 w-8 text-slate-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">{viewingWorker.name}</h3>
                    <p className="text-slate-500">{viewingWorker.role}</p>
                    {viewingWorker.phone && <p className="text-xs text-slate-400 mt-1">{viewingWorker.phone}</p>}
                    <div className="flex items-center text-yellow-500 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-4 w-4 ${i < (viewingWorker.rating || 0) ? "fill-current" : "text-slate-200"}`} 
                          onClick={() => updateWorker.mutate({ id: viewingWorker.id, rating: i + 1 })}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <div>
                    <div className="text-sm font-bold text-slate-400 uppercase">Daily Wage</div>
                    <div className="text-xl font-bold text-primary">₹{Number(viewingWorker.dailyWage).toFixed(2)}</div>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={(e) => handleDocumentUpload(e, viewingWorker.id)}
                  />
                  <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => setIsDocumentsOpen(true)}>
                    Documents
                  </Button>
                </div>
              </div>

              <Dialog open={isDocumentsOpen} onOpenChange={setIsDocumentsOpen}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Worker Documents: {viewingWorker.name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <ScrollArea className="h-[300px] pr-4">
                      <div className="space-y-3">
                        {workerDocuments.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <FileText className="h-5 w-5 text-slate-400 shrink-0" />
                              <span className="text-sm font-medium truncate">{doc.name}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(doc.url, '_blank')}>
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDeleteDocument(doc.id, viewingWorker.id)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {workerDocuments.length === 0 && (
                          <div className="text-center py-10 text-slate-400 border-2 border-dashed rounded-lg">
                            <FileText className="h-10 w-10 mx-auto mb-2 opacity-20" />
                            <p className="text-xs">No documents uploaded yet</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                    
                    <div className="pt-2">
                      <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                        <Plus className="h-4 w-4 mr-2" />
                        {uploading ? "Uploading..." : "Upload New Document"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 font-bold text-slate-700">
                    <Briefcase className="h-4 w-4" />
                    Current Assignment
                  </div>
                  <Card className="bg-slate-50 border-none shadow-none">
                    <CardContent className="p-4">
                      {viewingWorker.jobId ? (
                        <div>
                          <p className="font-bold text-slate-900"><JobLink jobId={viewingWorker.jobId} /></p>
                          <p className="text-xs text-slate-500 mt-1">{jobs?.find(j => j.id === viewingWorker.jobId)?.location}</p>
                          <Button 
                            variant="ghost" 
                            className="p-0 h-auto text-xs text-red-600 mt-2 hover:bg-transparent"
                            onClick={() => updateWorker.mutate({ id: viewingWorker.id, jobId: null })}
                          >
                            Remove from this job
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-2">
                          <p className="text-sm text-slate-500 italic">Not assigned to any job</p>
                          <Select onValueChange={(val) => updateWorker.mutate({ id: viewingWorker.id, jobId: Number(val) })}>
                            <SelectTrigger className="mt-2 h-8 text-xs">
                              <SelectValue placeholder="Assign to a job" />
                            </SelectTrigger>
                            <SelectContent>
                              {jobs?.filter(j => j.status !== 'completed').map(job => (
                                <SelectItem key={job.id} value={job.id.toString()}>{job.jobId || `Job #${job.id}`}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 font-bold text-slate-700">
                    <HistoryIcon className="h-4 w-4" />
                    Previous Jobs
                  </div>
                  <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
                    {Array.from(new Set(workerAttendance.map(a => a.jobId))).filter(Boolean).map(jobId => {
                      const job = jobs?.find(j => j.id === jobId);
                      return job ? (
                        <div key={job.id} className="p-2 bg-slate-50 rounded text-xs border">
                          <div className="font-bold"><JobLink jobId={job.id} displayText={job.jobName || job.description} /></div>
                          <div className="text-[10px] text-slate-500">{job.status.toUpperCase()}</div>
                        </div>
                      ) : null;
                    })}
                    {workerAttendance.length === 0 && (
                      <p className="text-xs text-slate-400 italic">No job history available</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end gap-2">
                <Button variant="outline" onClick={() => handleEdit(viewingWorker)}>Edit Details</Button>
                <Button 
                  variant="destructive"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to delete this worker?")) {
                      deleteWorker.mutate(viewingWorker.id);
                      setIsProfileOpen(false);
                    }
                  }}
                >
                  Delete Worker
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
