import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer, useCustomerDetails } from "@/hooks/use-business-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Phone, MapPin, ExternalLink, Package, Users, DollarSign, ArrowLeft, Briefcase, Trash2, History as HistoryIcon, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomerSchema } from "@shared/schema";
import { useState, useRef } from "react";
import { z } from "zod";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { JobLink } from "@/components/job-link";

type FormValues = z.infer<typeof insertCustomerSchema>;

export default function CustomersPage() {
  const { data: customers, isLoading } = useCustomers();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();
  const [isOpen, setIsOpen] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [searchAddress, setSearchAddress] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'name', direction: 'asc' });

  const form = useForm<FormValues>({
    resolver: zodResolver(insertCustomerSchema),
    defaultValues: {
      name: "",
      phone: "",
      address: "",
    }
  });

  const [editingCustomer, setEditingCustomer] = useState<any>(null);

  const handleEdit = (customer: any) => {
    setEditingCustomer(customer);
    form.reset({
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
    });
    setIsOpen(true);
  };

  const onSubmit = (data: FormValues) => {
    if (editingCustomer) {
      updateCustomer.mutate({ id: editingCustomer.id, ...data }, {
        onSuccess: () => {
          setIsOpen(false);
          setEditingCustomer(null);
          form.reset();
        }
      });
    } else {
      createCustomer.mutate(data, {
        onSuccess: () => {
          setIsOpen(false);
          form.reset();
        }
      });
    }
  };

  const filteredCustomers = customers?.filter(c => {
    const matchesName = !searchName || c.name.toLowerCase().includes(searchName.toLowerCase()) || c.phone.includes(searchName);
    const matchesAddress = !searchAddress || c.address.toLowerCase().includes(searchAddress.toLowerCase());
    return matchesName && matchesAddress;
  });

  const sortedCustomers = [...(filteredCustomers || [])].sort((a, b) => {
    if (!sortConfig) return 0;
    let aValue: any = (a as any)[sortConfig.key];
    let bValue: any = (a as any)[sortConfig.key];

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

  if (selectedCustomerId) {
    return <CustomerDetailsView id={selectedCustomerId} onBack={() => setSelectedCustomerId(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Customers</h2>
          <p className="text-slate-500">Manage client contact details.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setEditingCustomer(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCustomer ? "Edit Customer" : "Add Customer"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl><Input placeholder="+1 234 567 8900" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl><Input placeholder="123 Street Name, City" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={createCustomer.isPending || updateCustomer.isPending}>
                  {editingCustomer ? "Update Customer" : "Save Customer"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="col-span-full">
           <Card className="border-slate-200 shadow-sm mb-4">
            <CardHeader className="py-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="Search by name/phone..." 
                      value={searchName}
                      onChange={e => setSearchName(e.target.value)}
                      className="w-[180px] border-0 bg-slate-50 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-400"
                      data-testid="input-search-name"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="Search by address..." 
                      value={searchAddress}
                      onChange={e => setSearchAddress(e.target.value)}
                      className="w-[180px] border-0 bg-slate-50 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-400"
                      data-testid="input-search-address"
                    />
                  </div>
                </div>
                <Select onValueChange={handleSort} value={sortConfig?.key || "name"}>
                  <SelectTrigger className="w-[180px] h-8 text-xs border-0 bg-slate-50">
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="address">Address</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
           </Card>
        </div>

        {isLoading ? (
          <div className="col-span-full text-center py-8 text-slate-500">Loading customers...</div>
        ) : sortedCustomers?.length === 0 ? (
          <div className="col-span-full text-center py-8 text-slate-500">No customers found</div>
        ) : sortedCustomers?.map((customer) => (
          <Card 
            key={customer.id} 
            className="border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
            onClick={() => setSelectedCustomerId(customer.id)}
          >
            <CardContent className="p-6">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 group-hover:text-primary transition-colors">{customer.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                      <Phone className="h-3.5 w-3.5" />
                      {customer.phone}
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors" />
                </div>
                <div className="flex items-start gap-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-md">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-slate-400" />
                  {customer.address}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CustomerDetailsView({ id, onBack }: { id: number, onBack: () => void }) {
  const { data: details, isLoading } = useCustomerDetails(id);
  const { data: customers } = useCustomers();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();
  const [isEditing, setIsEditing] = useState(false);
  const customer = customers?.find(c => c.id === id);
  const customerImageInputRef = useRef<HTMLInputElement>(null);
  const [customerImages, setCustomerImages] = useState<any[]>([]);
  const [isImagesOpen, setIsImagesOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchCustomerImages = async (customerId: number) => {
    try {
      const response = await fetch(`/api/customers/${customerId}/images`, { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setCustomerImages(data);
      }
    } catch (error) {
      console.error("Error fetching images:", error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, customerId: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    setUploading(true);
    try {
      const response = await fetch(`/api/customers/${customerId}/images`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) throw new Error("Upload failed");
      await fetchCustomerImages(customerId);
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageId: number, customerId: number) => {
    if (!window.confirm("Are you sure you want to delete this image?")) return;
    try {
      const response = await fetch(`/api/customer-images/${imageId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (response.ok) {
        await fetchCustomerImages(customerId);
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(insertCustomerSchema),
    values: {
      name: customer?.name || "",
      phone: customer?.phone || "",
      address: customer?.address || "",
    }
  });

  if (isLoading) return <div className="flex items-center justify-center py-20">Loading details...</div>;
  if (!details || !details.customer) return <div className="p-8 text-center text-red-500">Error: Customer data not found</div>;

  const handleEditSubmit = (data: FormValues) => {
    updateCustomer.mutate({ id, ...data }, {
      onSuccess: () => {
        setIsEditing(false);
      }
    });
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Customers
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="lg:col-span-1 border-slate-200 shadow-sm h-fit">
          <CardHeader>
            <CardTitle>Customer Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Name</label>
              <div className="text-xl font-bold text-slate-900">{details.customer.name}</div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Phone</label>
              <div className="flex items-center gap-2 text-slate-700">
                <Phone className="h-4 w-4 text-slate-400" />
                {details.customer.phone}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Address</label>
              <div className="flex items-start gap-2 text-slate-700">
                <MapPin className="h-4 w-4 mt-1 text-slate-400" />
                {details.customer.address}
              </div>
            </div>
            <Separator />
            <div className="pt-2 flex gap-2">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={customerImageInputRef}
                onChange={(e) => handleImageUpload(e, details.customer.id)}
              />
              <Button size="sm" variant="outline" className="flex-1" onClick={() => {
                fetchCustomerImages(details.customer.id);
                setIsImagesOpen(true);
              }}>
                Images
              </Button>
              <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogTrigger asChild>
                  <Button className="flex-1">Edit Profile</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Customer Profile</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleEditSubmit)} className="space-y-4">
                      <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="address" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <Button type="submit" className="w-full" disabled={updateCustomer.isPending}>
                        Save Changes
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              <Dialog open={isImagesOpen} onOpenChange={setIsImagesOpen}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Customer Images: {details.customer.name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <ScrollArea className="h-[300px] pr-4">
                      <div className="grid grid-cols-2 gap-2">
                        {customerImages.map((img) => (
                          <div key={img.id} className="relative group aspect-square border rounded-lg overflow-hidden bg-slate-50">
                            <img src={img.url} alt="Customer" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <Button variant="secondary" size="icon" className="h-8 w-8" onClick={() => window.open(img.url, '_blank')}>
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteImage(img.id, details.customer.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {customerImages.length === 0 && (
                          <div className="col-span-2 text-center py-10 text-slate-400 border-2 border-dashed rounded-lg">
                            <Package className="h-10 w-10 mx-auto mb-2 opacity-20" />
                            <p className="text-xs">No images uploaded yet</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                    
                    <div className="pt-2">
                      <Button variant="outline" className="w-full" onClick={() => customerImageInputRef.current?.click()} disabled={uploading}>
                        <Plus className="h-4 w-4 mr-2" />
                        {uploading ? "Uploading..." : "Upload New Image"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button 
                variant="outline" 
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => {
                  if (window.confirm("Are you sure you want to delete this customer?")) {
                    deleteCustomer.mutate(details.customer.id);
                    onBack();
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <HistoryIcon className="h-4 w-4 text-primary" />
                Payments' History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[120px]">
                <div className="space-y-2">
                  {details.jobs.filter((j: any) => Number(j.paidAmount) > 0).map((job: any) => (
                    <div key={job.id} className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded border border-slate-100">
                      <div>
                        <span className="font-bold text-slate-700">{job.jobName || job.description}</span>
                        <span className="text-xs text-slate-400 ml-2">{job.endDate || job.startDate || "Ongoing"}</span>
                      </div>
                      <div className="font-mono font-bold text-green-600">₹{Number(job.paidAmount).toLocaleString()}</div>
                    </div>
                  ))}
                  {details.jobs.filter((j: any) => Number(j.paidAmount) > 0).length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-4">No payment history found</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  Revenue Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Agreed Amount</span>
                    <span className="font-mono font-medium">₹{Number(details.stats.totalAgreed || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Paid Amount</span>
                    <span className="font-mono font-bold text-green-600">₹{Number(details.stats.totalPaid || 0).toLocaleString()}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex justify-between text-sm font-bold">
                    <span>Pending Amount</span>
                    <span className="text-red-600">₹{(Number(details.stats.totalAgreed || 0) - Number(details.stats.totalPaid || 0)).toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Cost Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Manpower</span>
                    <span className="font-mono">₹{details.stats.totalManpower.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Expenses</span>
                    <span className="font-mono">₹{details.stats.totalExpenses.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-100">
                    <span>Total Costs</span>
                    <span className="text-red-600">-₹{(details.stats.totalManpower + details.stats.totalExpenses + details.stats.totalTravel).toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Connected Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-6">
                  {details.jobs.map((job: any) => (
                    <div key={job.id} className="border rounded-lg p-4 bg-slate-50/50">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-bold text-slate-900">{job.jobName || job.description}</h4>
                          <p className="text-xs text-slate-500">
                            <JobLink jobId={job.id} displayText={job.jobId} /> • {job.status.toUpperCase()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium text-slate-500">Paid Amount</p>
                          <p className="font-mono font-bold text-green-600">₹{Number(job.paidAmount || 0).toLocaleString()}</p>
                          <p className="text-[10px] text-red-600 font-mono">Pending: ₹{(Number(job.agreedAmount || 0) - Number(job.paidAmount || 0)).toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase text-slate-400">Deployed Workers</p>
                          <div className="flex flex-wrap gap-1">
                            {details.workers.filter((w: any) => w.jobId === job.id).map((worker: any) => (
                              <span key={worker.id} className="text-[10px] bg-white border px-1.5 py-0.5 rounded">
                                {worker.name}
                              </span>
                            ))}
                            {details.workers.filter((w: any) => w.jobId === job.id).length === 0 && (
                              <span className="text-[10px] text-slate-400 italic">None</span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase text-slate-400">Inventory Usage</p>
                          <div className="space-y-1">
                            {details.materials.filter((m: any) => m.item.assignedToJobId === job.id).slice(0, 3).map((m: any) => (
                              <div key={m.id} className="text-[10px] flex justify-between">
                                <span className="truncate max-w-[80px]">{m.item.name}</span>
                                <span>{m.quantity}{m.item.unit[0]}</span>
                              </div>
                            ))}
                            {details.materials.filter((m: any) => m.item.assignedToJobId === job.id).length > 3 && (
                              <p className="text-[9px] text-primary">+{details.materials.filter((m: any) => m.item.assignedToJobId === job.id).length - 3} more</p>
                            )}
                            {details.materials.filter((m: any) => m.item.assignedToJobId === job.id).length === 0 && (
                              <span className="text-[10px] text-slate-400 italic">None</span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase text-slate-400">Travel Summary</p>
                          <div className="text-[10px]">
                            {details.stats.totalTravel > 0 ? (
                                <p>Total: ₹{details.stats.totalTravel.toLocaleString()}</p>
                            ) : (
                                <span className="text-slate-400 italic">No logs</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {details.jobs.length === 0 && (
                    <div className="text-center py-8 text-slate-500">No projects found</div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Deployed Workers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {details.workers.map((worker: any) => (
                    <div key={worker.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-md">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {worker.name[0]}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{worker.name}</div>
                        <div className="text-xs text-slate-500">{worker.role}</div>
                      </div>
                    </div>
                  ))}
                  {details.workers.length === 0 && <div className="text-sm text-slate-400">No workers assigned yet</div>}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  Materials Used
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {details.materials.map((m: any) => (
                    <div key={m.id} className="flex justify-between items-center p-2 border-b border-slate-50 last:border-0">
                      <div>
                        <div className="text-sm font-medium">{m.item.name}</div>
                        <div className="text-xs text-slate-500">{m.quantity} {m.item.unit}</div>
                      </div>
                      <div className="text-xs font-mono font-bold text-slate-600">${(m.quantity * m.costAtTime).toFixed(2)}</div>
                    </div>
                  ))}
                  {details.materials.length === 0 && <div className="text-sm text-slate-400">No material records found</div>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
