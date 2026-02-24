import { useTravel, useCreateTravel, useJobs } from "@/hooks/use-business-data";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { JobLink } from "@/components/job-link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTravelSchema } from "@shared/schema";
import { useState } from "react";
import { z } from "zod";

const formSchema = insertTravelSchema.extend({
  kilometers: z.coerce.number(),
  fuelCost: z.coerce.number(),
  jobId: z.coerce.number().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

export default function TravelPage() {
  const { data: travel, isLoading } = useTravel();
  const { data: jobs } = useJobs();
  const createTravel = useCreateTravel();
  const [isOpen, setIsOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      kilometers: 0,
      fuelCost: 0,
      jobId: null,
    }
  });

  const onSubmit = (data: FormValues) => {
    const formattedData = {
      ...data,
      kilometers: data.kilometers.toString(),
      fuelCost: data.fuelCost.toString(),
    };
    createTravel.mutate(formattedData, {
      onSuccess: () => {
        setIsOpen(false);
        form.reset();
      }
    });
  };

  const sortedTravel = [...(travel || [])].sort((a, b) => {
    if (!sortConfig) return 0;
    let aValue: any = (a as any)[sortConfig.key];
    let bValue: any = (b as any)[sortConfig.key];
    
    if (sortConfig.key === 'kilometers' || sortConfig.key === 'fuelCost') {
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
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Travel Log</h2>
          <p className="text-slate-500">Track vehicle usage and fuel costs.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Travel Entry
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Travel Log</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="kilometers" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Distance (km)</FormLabel>
                      <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="fuelCost" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fuel Cost (₹)</FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="jobId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign to Job (Optional)</FormLabel>
                    <Select onValueChange={(val) => field.onChange(val === "none" ? null : Number(val))} value={field.value?.toString() || "none"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {jobs?.map(job => (
                          <SelectItem key={job.id} value={job.id.toString()}>{job.jobId || `Job #${job.id}`}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={createTravel.isPending}>Save Log</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <div className="rounded-md border-0 overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('date')} className="cursor-pointer hover:bg-slate-50">Date</th>
                  <th onClick={() => handleSort('jobId')} className="cursor-pointer hover:bg-slate-50">Job ID</th>
                  <th onClick={() => handleSort('kilometers')} className="cursor-pointer hover:bg-slate-50">Distance (km)</th>
                  <th onClick={() => handleSort('fuelCost')} className="cursor-pointer hover:bg-slate-50">Fuel Cost</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={4} className="text-center py-8">Loading...</td></tr>
                ) : sortedTravel?.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8">No logs found</td></tr>
                ) : sortedTravel?.map((item) => (
                  <tr key={item.id}>
                    <td className="font-mono text-slate-500">{item.date}</td>
                    <td className="text-xs text-slate-400">
                      {item.jobId ? <JobLink jobId={item.jobId} /> : '-'}
                    </td>
                    <td>{Number(item.kilometers).toFixed(1)} km</td>
                    <td className="font-mono">₹{Number(item.fuelCost).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
