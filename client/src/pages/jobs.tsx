import { useJobs, useCreateJob, useCustomers, useUpdateJob, useDeleteJob } from "@/hooks/use-business-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Search, CheckCircle2, CircleDashed, Clock, XCircle, Image as ImageIcon, Upload, Trash2, Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertJobSchema, type JobImage } from "@shared/schema";
import { useState, useRef } from "react";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { DialogClose } from "@/components/ui/dialog";

function JobGallery({ jobId }: { jobId: number }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: images, refetch } = useQuery<JobImage[]>({
    queryKey: ["/api/jobs", jobId, "images"],
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    setUploading(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}/images`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) throw new Error("Upload failed");
      await refetch();
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Project Gallery</h3>
        <div>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleUpload}
          />
          <Button 
            size="sm" 
            variant="outline" 
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? "Uploading..." : "Upload Photo"}
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {images?.map((img) => (
          <a 
            key={img.id} 
            href={img.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="aspect-square rounded-md overflow-hidden border border-slate-200 hover:opacity-80 transition-opacity"
          >
            <img 
              src={img.url} 
              alt={img.description || "Job photo"} 
              className="w-full h-full object-cover"
            />
          </a>
        ))}
        {!images?.length && !uploading && (
          <div className="col-span-full py-8 text-center border-2 border-dashed rounded-md bg-slate-50 text-slate-400">
            <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No photos uploaded yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

const DEFAULT_CATEGORIES = [
  "Interior painting",
  "Exterior painting",
  "Repaint",
  "Sculpture/Idol painting",
];

// Helper for decimal coercion
const formSchema = insertJobSchema.extend({
  jobName: z.string().min(1, "Job Name is required"),
  quotedAmount: z.coerce.number(),
  agreedAmount: z.coerce.number(),
  paidAmount: z.coerce.number(),
  customerId: z.coerce.number(),
  category: z.string().min(1, "Category is required"),
});

type FormValues = z.infer<typeof formSchema>;

export default function JobsPage() {
  const { data: jobs, isLoading } = useJobs();
  const { data: customers } = useCustomers();
  const createJob = useCreateJob();
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingJob, setEditingJob] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [viewingJob, setViewingJob] = useState<any>(null);
  const [customCategory, setCustomCategory] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [selectedJobForGallery, setSelectedJobForGallery] = useState<any>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jobName: "",
      category: "Interior painting",
      description: "",
      location: "",
      status: "quoted",
      quotedAmount: 0,
      agreedAmount: 0,
      paidAmount: 0,
      customerId: undefined,
      startDate: "",
      endDate: "",
    }
  });

  const onSubmit = (data: FormValues) => {
    const formattedData = {
      ...data,
      quotedAmount: data.quotedAmount.toString(),
      agreedAmount: data.agreedAmount.toString(),
      paidAmount: data.paidAmount.toString(),
    };

    if (editingJob) {
      updateJob.mutate({ id: editingJob.id, ...formattedData }, {
        onSuccess: () => {
          setIsDialogOpen(false);
          setIsEditMode(false);
          setEditingJob(null);
          setViewingJob(null);
          form.reset();
        }
      });
    } else {
      createJob.mutate(formattedData, {
        onSuccess: () => {
          setIsDialogOpen(false);
          form.reset();
        }
      });
    }
  };

  const handleAddCustomCategory = () => {
    if (customCategory && !categories.includes(customCategory)) {
      setCategories(prev => [...prev, customCategory]);
      form.setValue("category", customCategory);
      setCustomCategory("");
      setShowCustomInput(false);
    }
  };

  const handleView = (job: any) => {
    const customer = customers?.find(c => c.id === job.customerId);
    setViewingJob({ ...job, customer });
  };

  const handleStartEditFromView = () => {
    if (!viewingJob) return;
    setEditingJob(viewingJob);
    if (viewingJob.category && !categories.includes(viewingJob.category)) {
      setCategories(prev => [...prev, viewingJob.category]);
    }
    form.reset({
      jobName: viewingJob.jobName || "",
      customerId: viewingJob.customerId,
      category: viewingJob.category || "Interior painting",
      description: viewingJob.description,
      location: viewingJob.location,
      status: viewingJob.status || "quoted",
      startDate: viewingJob.startDate || "",
      endDate: viewingJob.endDate || "",
      quotedAmount: Number(viewingJob.quotedAmount),
      agreedAmount: Number(viewingJob.agreedAmount),
      paidAmount: Number(viewingJob.paidAmount),
    });
    setIsEditMode(true);
    setIsDialogOpen(true); // Ensure dialog opens
  };

  const handleStartEditFromTable = (job: any) => {
    setEditingJob(job);
    if (job.category && !categories.includes(job.category)) {
      setCategories(prev => [...prev, job.category]);
    }
    form.reset({
      jobName: job.jobName || "",
      customerId: job.customerId,
      category: job.category || "Interior painting",
      description: job.description,
      location: job.location,
      status: job.status || "quoted",
      startDate: job.startDate || "",
      endDate: job.endDate || "",
      quotedAmount: Number(job.quotedAmount),
      agreedAmount: Number(job.agreedAmount),
      paidAmount: Number(job.paidAmount),
    });
    setIsEditMode(false);
    setIsDialogOpen(true);
  };

  const filteredJobs = jobs?.map(job => {
    const customer = customers?.find(c => c.id === job.customerId);
    return { ...job, customer };
  }).filter(job => 
    job.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.jobId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.customer?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sorting logic
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  const sortedJobs = [...(filteredJobs || [])].sort((a, b) => {
    if (!sortConfig) return 0;
    let aValue: any;
    let bValue: any;

    if (sortConfig.key === 'customer') {
      aValue = a.customer?.name || '';
      bValue = b.customer?.name || '';
    } else {
      aValue = (a as any)[sortConfig.key] || '';
      bValue = (b as any)[sortConfig.key] || '';
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Jobs</h2>
          <p className="text-slate-500">Manage painting projects and their status.</p>
        </div>
        <Dialog open={isDialogOpen || isEditMode} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setIsEditMode(false);
            setEditingJob(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="shadow-sm" data-testid="button-new-job">
              <Plus className="h-4 w-4 mr-2" />
              New Job
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingJob ? "Edit Job" : "Create New Job"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="jobName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Smith Residence Interior" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <div className="space-y-2">
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                            <Button 
                              variant="ghost" 
                              className="w-full justify-start font-normal text-primary px-2"
                              onClick={(e) => {
                                e.preventDefault();
                                setShowCustomInput(true);
                              }}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Custom Category...
                            </Button>
                          </SelectContent>
                        </Select>
                        {showCustomInput && (
                          <div className="flex gap-2">
                            <Input 
                              placeholder="New category..." 
                              value={customCategory}
                              onChange={(e) => setCustomCategory(e.target.value)}
                              className="h-8"
                            />
                            <Button size="sm" onClick={handleAddCustomCategory}>Add</Button>
                            <Button size="sm" variant="ghost" onClick={() => setShowCustomInput(false)}>Cancel</Button>
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="quoted">Quoted</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Interior Repaint - Smith Residence" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="customerId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer</FormLabel>
                      <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers?.map(c => (
                            <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="location" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main St" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="quotedAmount" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quoted (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="agreedAmount" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agreed (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="paidAmount" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paid (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="text-xs text-slate-500 font-mono mt-1 px-1">
                  Pending: ₹{(Number(form.watch("agreedAmount") || 0) - Number(form.watch("paidAmount") || 0)).toLocaleString()}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="startDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="endDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <Button type="submit" className="w-full" disabled={createJob.isPending || updateJob.isPending} data-testid="button-save-job">
                  {editingJob ? (updateJob.isPending ? 'Saving...' : 'Save Changes') : (createJob.isPending ? 'Creating...' : 'Create Job')}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search jobs..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="max-w-xs border-0 bg-slate-50 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-400"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-100 overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('jobId')} className="cursor-pointer hover:bg-slate-50">Job ID</th>
                  <th onClick={() => handleSort('category')} className="cursor-pointer hover:bg-slate-50">Category</th>
                  <th onClick={() => handleSort('customer')} className="cursor-pointer hover:bg-slate-50">Customer</th>
                  <th onClick={() => handleSort('status')} className="cursor-pointer hover:bg-slate-50">Status</th>
                  <th onClick={() => handleSort('agreedAmount')} className="cursor-pointer hover:bg-slate-50">Agreed</th>
                  <th onClick={() => handleSort('paidAmount')} className="cursor-pointer hover:bg-slate-50">Paid</th>
                  <th onClick={() => handleSort('pendingAmount')} className="cursor-pointer hover:bg-slate-50">Pending</th>
                  <th onClick={() => handleSort('location')} className="cursor-pointer hover:bg-slate-50">Location</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} className="text-center py-8">Loading jobs...</td></tr>
                ) : sortedJobs?.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8">No jobs found</td></tr>
                ) : sortedJobs?.map((job) => (
                  <tr key={job.id}>
                    <td className="font-mono text-xs">{job.jobId}</td>
                    <td className="font-medium">{job.category}</td>
                    <td>{job.customer?.name}</td>
                    <td>
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border
                        ${job.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : 
                          job.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                          job.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-slate-50 text-slate-700 border-slate-200'}`
                      }>
                        {job.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                        {job.status === 'in_progress' && <Clock className="h-3 w-3" />}
                        {job.status === 'quoted' && <CircleDashed className="h-3 w-3" />}
                        {job.status === 'cancelled' && <XCircle className="h-3 w-3" />}
                        {job.status.replace('_', ' ').toUpperCase()}
                      </div>
                    </td>
                    <td className="font-mono text-primary font-bold">₹{Number(job.agreedAmount).toLocaleString()}</td>
                    <td className="font-mono text-green-600">₹{Number(job.paidAmount).toLocaleString()}</td>
                    <td className="font-mono text-red-600">₹{(Number(job.agreedAmount) - Number(job.paidAmount)).toLocaleString()}</td>
                    <td className="text-slate-500 text-xs truncate max-w-[150px]">{job.location}</td>
                    <td>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleView(job)} data-testid={`button-view-job-${job.id}`}>View</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleStartEditFromTable(job)} data-testid={`button-edit-job-${job.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedJobForGallery(job)}>
                          <ImageIcon className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-slate-400 hover:text-red-600"
                          onClick={() => {
                            if (window.confirm("Are you sure you want to delete this job?")) {
                              deleteJob.mutate(job.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedJobForGallery} onOpenChange={(open) => !open && setSelectedJobForGallery(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Job Gallery - {selectedJobForGallery?.description}</DialogTitle>
          </DialogHeader>
          {selectedJobForGallery && <JobGallery jobId={selectedJobForGallery.id} />}
        </DialogContent>
      </Dialog>

      {/* View/Edit Job Dialog */}
      <Dialog open={!!viewingJob} onOpenChange={(open) => {
        if (!open) {
          setViewingJob(null);
          setIsEditMode(false);
          setEditingJob(null);
          form.reset();
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Job' : 'Job Details'}</DialogTitle>
          </DialogHeader>
          
          {!isEditMode ? (
            // Read-only view
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Job Name</p>
                <p className="text-lg font-bold text-slate-900">{viewingJob?.jobName || "Untitled Job"}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Job ID</p>
                  <p className="text-sm font-mono">{viewingJob?.jobId}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Status</p>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border mt-1
                    ${viewingJob?.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : 
                      viewingJob?.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                      viewingJob?.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                      'bg-slate-50 text-slate-700 border-slate-200'}`
                  }>
                    {viewingJob?.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                    {viewingJob?.status === 'in_progress' && <Clock className="h-3 w-3" />}
                    {viewingJob?.status === 'quoted' && <CircleDashed className="h-3 w-3" />}
                    {viewingJob?.status === 'cancelled' && <XCircle className="h-3 w-3" />}
                    {viewingJob?.status?.replace('_', ' ').toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Category</p>
                  <p className="text-sm">{viewingJob?.category}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Customer</p>
                  <p className="text-sm">{viewingJob?.customer?.name || '-'}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-500">Description</p>
                <p className="text-sm">{viewingJob?.description || '-'}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-500">Location</p>
                <p className="text-sm">{viewingJob?.location || '-'}</p>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                <div>
                  <p className="text-sm font-medium text-slate-500">Quoted</p>
                  <p className="text-sm font-mono">₹{Number(viewingJob?.quotedAmount || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Agreed</p>
                  <p className="text-sm font-mono text-primary font-bold">₹{Number(viewingJob?.agreedAmount || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Paid</p>
                  <p className="text-sm font-mono text-green-600">₹{Number(viewingJob?.paidAmount || 0).toLocaleString()}</p>
                </div>
              </div>
              <div className="text-sm font-medium">
                <span className="text-slate-500">Pending: </span>
                <span className="font-mono text-red-600">₹{(Number(viewingJob?.agreedAmount || 0) - Number(viewingJob?.paidAmount || 0)).toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <p className="text-sm font-medium text-slate-500">Start Date</p>
                  <p className="text-sm">{viewingJob?.startDate || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">End Date</p>
                  <p className="text-sm">{viewingJob?.endDate || '-'}</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <DialogClose asChild>
                  <Button variant="outline" data-testid="button-close-view">Close</Button>
                </DialogClose>
                <Button onClick={handleStartEditFromView} data-testid="button-edit-job">
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>
          ) : (
            // Edit form
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => {
                const formattedData = {
                  ...data,
                  quotedAmount: data.quotedAmount.toString(),
                  agreedAmount: data.agreedAmount.toString(),
                  paidAmount: data.paidAmount.toString(),
                };
                updateJob.mutate({ id: editingJob.id, ...formattedData }, {
                  onSuccess: () => {
                    setViewingJob(null);
                    setIsEditMode(false);
                    setEditingJob(null);
                    form.reset();
                  }
                });
              })} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <div className="space-y-2">
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                            <Button 
                              variant="ghost" 
                              className="w-full justify-start font-normal text-primary px-2"
                              onClick={(e) => {
                                e.preventDefault();
                                setShowCustomInput(true);
                              }}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Custom Category...
                            </Button>
                          </SelectContent>
                        </Select>
                        {showCustomInput && (
                          <div className="flex gap-2">
                            <Input 
                              placeholder="New category..." 
                              value={customCategory}
                              onChange={(e) => setCustomCategory(e.target.value)}
                              className="h-8"
                            />
                            <Button size="sm" onClick={handleAddCustomCategory}>Add</Button>
                            <Button size="sm" variant="ghost" onClick={() => setShowCustomInput(false)}>Cancel</Button>
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="quoted">Quoted</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Interior Repaint - Smith Residence" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="customerId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer</FormLabel>
                      <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers?.map(c => (
                            <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="location" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main St" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="quotedAmount" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quoted (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="agreedAmount" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agreed (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="paidAmount" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paid (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="text-xs text-slate-500 font-mono mt-1 px-1">
                  Pending: ₹{(Number(form.watch("agreedAmount") || 0) - Number(form.watch("paidAmount") || 0)).toLocaleString()}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="startDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="endDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsEditMode(false)} data-testid="button-cancel-edit">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateJob.isPending} data-testid="button-save-job">
                    {updateJob.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
