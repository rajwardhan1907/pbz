import { useInventory, useCreateInventory, useDeleteInventory, useJobs, useUpdateInventory } from "@/hooks/use-business-data";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Trash2, ArrowRightLeft } from "lucide-react";
import { JobLink } from "@/components/job-link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInventorySchema, type InventoryItem, type Job } from "@shared/schema";
import { useState } from "react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_CATEGORIES = [
  "Paint",
  "Putty",
  "Tools",
  "Wallpaper",
  "Misc",
];

// Helper for decimal coercion
const formSchema = insertInventorySchema.extend({
  quantity: z.coerce.number(),
  costPerUnit: z.coerce.number(),
  category: z.string().min(1, "Category is required"),
  assignedToJobId: z.coerce.number().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

export default function InventoryPage() {
  const { toast } = useToast();
  const { data: inventory, isLoading } = useInventory();
  const { data: jobs } = useJobs();
  const createItem = useCreateInventory();
  const deleteItem = useDeleteInventory();
  const updateItem = useUpdateInventory();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [reassigningItem, setReassigningItem] = useState<InventoryItem | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: "Paint",
      quantity: 0,
      unit: "liters",
      costPerUnit: 0,
      assignedToJobId: null,
    }
  });

  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isViewing, setIsViewing] = useState(false);
  const [reassignType, setReassignType] = useState<'full' | 'partial' | null>(null);
  const [reassignQuantity, setReassignQuantity] = useState<number>(0);
  const [reassignJobId, setReassignJobId] = useState<number | null>(null);

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setIsViewing(false);
    form.reset({
      name: item.name,
      category: item.category,
      quantity: Number(item.quantity),
      unit: item.unit,
      costPerUnit: Number(item.costPerUnit),
      assignedToJobId: item.assignedToJobId || null,
    });
    setIsOpen(true);
  };

  const handleView = (item: InventoryItem) => {
    setEditingItem(item);
    setIsViewing(true);
    form.reset({
      name: item.name,
      category: item.category,
      quantity: Number(item.quantity),
      unit: item.unit,
      costPerUnit: Number(item.costPerUnit),
      assignedToJobId: item.assignedToJobId || null,
    });
    setIsOpen(true);
  };

  const onSubmit = (data: FormValues) => {
    const formattedData = {
      ...data,
      quantity: data.quantity.toString(),
      costPerUnit: data.costPerUnit.toString(),
    };

    if (editingItem) {
      updateItem.mutate({ id: editingItem.id, ...formattedData }, {
        onSuccess: () => {
          setIsOpen(false);
          setEditingItem(null);
          form.reset();
          toast({ title: "Item updated successfully" });
        }
      });
    } else {
      createItem.mutate(formattedData, {
        onSuccess: () => {
          setIsOpen(false);
          form.reset();
          toast({ title: "Item added to inventory" });
        }
      });
    }
  };

  const executeReassign = () => {
    if (!reassigningItem) return;
    
    if (reassignType === 'full' || (reassignType === 'partial' && reassignQuantity === Number(reassigningItem.quantity))) {
      updateItem.mutate({ id: reassigningItem.id, assignedToJobId: reassignJobId }, {
        onSuccess: () => {
          setReassigningItem(null);
          setReassignType(null);
          setReassignJobId(null);
          toast({ title: `Item reassigned to ${reassignJobId ? 'Job' : 'General Inventory'} successfully` });
        }
      });
    } else if (reassignType === 'partial') {
      if (reassignQuantity <= 0 || reassignQuantity > Number(reassigningItem.quantity)) {
        toast({ title: "Invalid quantity", variant: "destructive" });
        return;
      }

      // Create new partial item
      createItem.mutate({
        name: reassigningItem.name,
        category: reassigningItem.category,
        quantity: reassignQuantity.toString(),
        unit: reassigningItem.unit,
        costPerUnit: reassigningItem.costPerUnit,
        assignedToJobId: reassignJobId,
      }, {
        onSuccess: () => {
          // Update original item
          const newQty = Number(reassigningItem.quantity) - reassignQuantity;
          updateItem.mutate({ id: reassigningItem.id, quantity: newQty.toString() }, {
            onSuccess: () => {
              setReassigningItem(null);
              setReassignType(null);
              setReassignJobId(null);
              toast({ title: "Partial quantity reassigned successfully" });
            }
          });
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

  const filteredInventory = inventory?.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) || 
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  const sortedInventory = [...(filteredInventory || [])].sort((a, b) => {
    if (!sortConfig) return 0;
    let aValue: any = (a as any)[sortConfig.key];
    let bValue: any = (b as any)[sortConfig.key];
    
    if (sortConfig.key === 'costPerUnit' || sortConfig.key === 'quantity') {
      aValue = Number(aValue);
      bValue = Number(bValue);
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
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Inventory</h2>
          <p className="text-slate-500">Track paints, tools, and supplies.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Inventory Item</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Name</FormLabel>
                    <FormControl><Input placeholder="Asian Paints Royale..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <div className="space-y-2">
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
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
                  <FormField control={form.control} name="unit" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="liters">Liters</SelectItem>
                          <SelectItem value="kg">Kg</SelectItem>
                          <SelectItem value="pieces">Pieces</SelectItem>
                          <SelectItem value="boxes">Boxes</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="quantity" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="costPerUnit" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost per Unit (₹)</FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="assignedToJobId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign to Job (Optional)</FormLabel>
                    <Select onValueChange={(val) => field.onChange(val === "none" ? null : Number(val))} value={field.value?.toString() || "none"}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select job" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">General Inventory</SelectItem>
                        {jobs?.map((job: any) => (
                          <SelectItem key={job.id} value={job.id.toString()}>{job.jobId || `Job #${job.id}`}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={createItem.isPending}>Add Item</Button>
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
              placeholder="Search items..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-xs border-0 bg-slate-50 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-400"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-100 overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('name')} className="cursor-pointer hover:bg-slate-50">Item Name</th>
                  <th onClick={() => handleSort('category')} className="cursor-pointer hover:bg-slate-50">Category</th>
                  <th onClick={() => handleSort('quantity')} className="cursor-pointer hover:bg-slate-50">Quantity</th>
                  <th onClick={() => handleSort('assignedToJobId')} className="cursor-pointer hover:bg-slate-50">Assigned To</th>
                  <th onClick={() => handleSort('costPerUnit')} className="cursor-pointer hover:bg-slate-50">Est. Value</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center py-8">Loading...</td></tr>
                ) : sortedInventory?.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8">No items found</td></tr>
                ) : sortedInventory?.map((item) => (
                  <tr key={item.id}>
                    <td className="font-medium">{item.name}</td>
                    <td>
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                        {item.category}
                      </span>
                    </td>
                    <td className={`font-mono ${Number(item.quantity) < 10 ? 'text-red-600 font-bold' : ''}`}>
                      {Number(item.quantity).toFixed(2)} {item.unit}
                    </td>
                    <td>
                      {item.assignedToJobId ? (
                        <JobLink jobId={item.assignedToJobId} className="text-xs" />
                      ) : (
                        <span className="text-xs text-slate-500">General Inventory</span>
                      )}
                    </td>
                    <td className="font-mono text-slate-600">
                      ₹{(Number(item.quantity) * Number(item.costPerUnit)).toFixed(2)}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(item)}
                          className="h-8 px-2 text-xs"
                        >
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(item)}
                          className="h-8 px-2 text-xs"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReassigningItem(item)}
                          className="h-8 px-2 text-xs"
                        >
                          <ArrowRightLeft className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-2 text-xs text-slate-400 hover:text-red-600"
                          onClick={() => {
                            if (window.confirm("Are you sure you want to delete this inventory item?")) {
                              deleteItem.mutate(item.id);
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

      <Dialog open={!!reassigningItem} onOpenChange={(open) => {
        if (!open) {
          setReassigningItem(null);
          setReassignType(null);
          setReassignJobId(null);
          setReassignQuantity(0);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Item: {reassigningItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-slate-500">
              Current Assignment: {reassigningItem?.assignedToJobId ? <JobLink jobId={reassigningItem.assignedToJobId} /> : "General Inventory"}
              <br />
              Available Quantity: {reassigningItem?.quantity} {reassigningItem?.unit}
            </p>
            
            {!reassignType ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Destination</label>
                  <Select onValueChange={(val) => setReassignJobId(val === "none" ? null : Number(val))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">General Inventory</SelectItem>
                      {jobs?.filter(j => j.id !== reassigningItem?.assignedToJobId).map((job: any) => (
                        <SelectItem key={job.id} value={job.id.toString()}>
                          {job.jobId || `Job #${job.id}`} - {job.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    className="flex-1" 
                    variant="outline" 
                    onClick={() => setReassignType('full')}
                    disabled={reassignJobId === undefined && reassigningItem?.assignedToJobId === null}
                  >
                    Full Quantity
                  </Button>
                  <Button 
                    className="flex-1" 
                    variant="outline" 
                    onClick={() => {
                      setReassignType('partial');
                      setReassignQuantity(Number(reassigningItem?.quantity));
                    }}
                    disabled={reassignJobId === undefined && reassigningItem?.assignedToJobId === null}
                  >
                    Specific Quantity
                  </Button>
                </div>
              </div>
            ) : reassignType === 'partial' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quantity to Reassign</label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={reassignQuantity} 
                    onChange={(e) => setReassignQuantity(Number(e.target.value))}
                    max={Number(reassigningItem?.quantity)}
                    min={0.01}
                  />
                  <p className="text-[10px] text-slate-400">Max: {reassigningItem?.quantity} {reassigningItem?.unit}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setReassignType(null)}>Back</Button>
                  <Button className="flex-1" onClick={executeReassign}>Confirm Reassignment</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm font-medium text-center">Reassign ALL {reassigningItem?.quantity} {reassigningItem?.unit}?</p>
                <div className="flex gap-2">
                  <Button variant="ghost" className="flex-1" onClick={() => setReassignType(null)}>Back</Button>
                  <Button className="flex-1" onClick={executeReassign}>Confirm Full Reassignment</Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
