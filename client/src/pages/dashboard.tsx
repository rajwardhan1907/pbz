import { StatCard } from "@/components/stat-card";
import { DollarSign, PaintBucket, Users, Briefcase, MessageSquare, Send, Package as PackageIcon, Calendar as CalendarIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useJobs, useInventory, useWorkers, useChat, useExpenses, useTravel, useAttendance } from "@/hooks/use-business-data";
import { JobLink } from "@/components/job-link";
import { useState, useMemo } from "react";
import { format, subDays, subWeeks, subMonths, subYears, isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

type Timeline = "today" | "week" | "month" | "year" | "custom";

export default function Dashboard() {
  const { data: jobs } = useJobs();
  const { data: inventory } = useInventory();
  const { data: workers } = useWorkers();
  const { data: expenses } = useExpenses();
  const { data: travel } = useTravel();
  const { data: attendance } = useAttendance();
  const chatMutation = useChat();

  const [timeline, setTimeline] = useState<Timeline>("month");
  const [customRange, setCustomRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'assistant', text: string}[]>([
    { role: 'assistant', text: "Hello! Ask me about your business stats, recent jobs, or inventory status." }
  ]);

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatInput("");
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);

    try {
      const response = await chatMutation.mutateAsync(userMsg);
      setChatHistory(prev => [...prev, { role: 'assistant', text: response.response }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'assistant', text: "Sorry, I couldn't process that request." }]);
    }
  };

  const interval = useMemo(() => {
    const now = new Date();
    switch (timeline) {
      case "today": return { start: startOfDay(now), end: endOfDay(now) };
      case "week": return { start: subWeeks(now, 1), end: now };
      case "month": return { start: subMonths(now, 1), end: now };
      case "year": return { start: subYears(now, 1), end: now };
      case "custom": return { start: startOfDay(customRange.from), end: endOfDay(customRange.to) };
    }
  }, [timeline, customRange]);

  const filteredJobs = useMemo(() => {
    if (!jobs) return [];
    return jobs.filter(j => {
      if (!j.startDate) return true;
      const date = parseISO(j.startDate);
      return isWithinInterval(date, interval);
    });
  }, [jobs, interval]);

  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];
    return expenses.filter(e => {
      const date = parseISO(e.date);
      return isWithinInterval(date, interval);
    });
  }, [expenses, interval]);

  const filteredTravel = useMemo(() => {
    if (!travel) return [];
    return travel.filter(t => {
      const date = parseISO(t.date);
      return isWithinInterval(date, interval);
    });
  }, [travel, interval]);

  const filteredAttendance = useMemo(() => {
    if (!attendance) return [];
    return attendance.filter(a => {
      const date = parseISO(a.date);
      return isWithinInterval(date, interval);
    });
  }, [attendance, interval]);

  // Stats Calculations
  const activeJobs = filteredJobs.filter(j => j.status === 'in_progress').length;
  const totalRevenue = filteredJobs.reduce((acc, j) => acc + Number(j.paidAmount || 0), 0);
  
  // Expenses from expenses table
  const directExpenses = filteredExpenses.reduce((acc, e) => acc + Number(e.amount), 0);
  
  // Fuel/Travel costs
  const travelCosts = filteredTravel.reduce((acc, t) => acc + Number(t.fuelCost), 0);
  
  // Labor costs from attendance
  const laborCosts = filteredAttendance.reduce((acc, a) => {
    const worker = workers?.find(w => w.id === a.workerId);
    const wage = worker ? Number(worker.dailyWage) : 0;
    const allowance = Number(a.extraAllowance || 0);
    return acc + wage + allowance;
  }, 0);

  // Inventory costs assigned to jobs
  const jobInventoryCosts = inventory?.filter(i => i.assignedToJobId !== null).reduce((acc, i) => {
    return acc + (Number(i.quantity) * Number(i.costPerUnit));
  }, 0) || 0;

  const totalExpensesValue = directExpenses + travelCosts + laborCosts + jobInventoryCosts;
  const netProfit = totalRevenue - totalExpensesValue;
  
  const deployedQuantity = inventory?.filter(i => i.assignedToJobId !== null).reduce((acc, i) => acc + Number(i.quantity), 0) || 0;
  const generalQuantity = inventory?.filter(i => i.assignedToJobId === null).reduce((acc, i) => acc + Number(i.quantity), 0) || 0;

  // Chart Data
  const chartData = [
    { name: 'Revenue', amount: totalRevenue },
    { name: 'Expenses', amount: totalExpensesValue },
    { name: 'Profit', amount: netProfit },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h2>
          <p className="text-slate-500">Overview of your painting business performance.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={timeline} onValueChange={(v: Timeline) => setTimeline(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {timeline === "custom" && (
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">From Date</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2 min-w-[140px] justify-start bg-slate-50 border-slate-300">
                      <CalendarIcon className="h-4 w-4 text-slate-500" />
                      {customRange.from ? format(customRange.from, "dd/MM/yy") : "DD/MM/YY"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white shadow-2xl border-slate-200 z-[110]" align="start">
                    <Calendar
                      mode="single"
                      selected={customRange.from}
                      onSelect={(date) => date && setCustomRange(prev => ({ ...prev, from: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">To Date</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2 min-w-[140px] justify-start bg-slate-50 border-slate-300">
                      <CalendarIcon className="h-4 w-4 text-slate-500" />
                      {customRange.to ? format(customRange.to, "dd/MM/yy") : "DD/MM/YY"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white shadow-2xl border-slate-200 z-[110]" align="start">
                    <Calendar
                      mode="single"
                      selected={customRange.to}
                      onSelect={(date) => date && setCustomRange(prev => ({ ...prev, to: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Net Profit"
          value={`₹${netProfit.toLocaleString()}`}
          icon={DollarSign}
          description="Revenue minus expenses, labor, travel, and job materials"
        />
        <StatCard
          title="Active Jobs"
          value={activeJobs.toString()}
          icon={Briefcase}
          description="Projects currently in progress"
        />
        <StatCard
          title="Total Deployed"
          value={deployedQuantity.toFixed(2)}
          icon={PaintBucket}
          description="Total quantity currently assigned to jobs"
        />
        <StatCard
          title="Total in Stock"
          value={generalQuantity.toFixed(2)}
          icon={PackageIcon}
          description="Total quantity in general inventory"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Financial Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                  />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 border-slate-200 shadow-sm flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Business Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-4 pt-0 h-[350px]">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div 
                      className={`
                        rounded-lg px-3 py-2 text-sm max-w-[85%]
                        ${msg.role === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-slate-100 text-slate-800'
                        }
                      `}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {chatMutation.isPending && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 rounded-lg px-3 py-2 text-sm text-slate-500 animate-pulse">
                      Thinking...
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            <form onSubmit={handleChat} className="mt-4 flex gap-2">
              <Input 
                placeholder="Ask about profit, jobs..." 
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                disabled={chatMutation.isPending}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={chatMutation.isPending}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Recent Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {jobs?.slice(0, 5).map(job => (
                <div key={job.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                  <div>
                    <div className="font-medium text-slate-900">
                      <JobLink jobId={job.id} displayText={job.jobName || job.description} />
                    </div>
                    <div className="text-xs text-slate-500">{job.location}</div>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full font-medium 
                    ${job.status === 'completed' ? 'bg-green-100 text-green-700' : 
                      job.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 
                      'bg-slate-100 text-slate-700'}`
                  }>
                    {job.status.replace('_', ' ')}
                  </div>
                </div>
              ))}
              {!jobs?.length && <div className="text-sm text-slate-500 text-center py-4">No jobs found</div>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2" 
              onClick={async () => {
                try {
                  const response = await fetch('/api/backup');
                  const data = await response.json();
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `paintbiz-backup-${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                } catch (error) {
                  console.error('Backup failed:', error);
                }
              }}
            >
              <PackageIcon className="h-6 w-6" />
              Backup Data
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2 relative"
              onClick={() => document.getElementById('restore-upload')?.click()}
            >
              <Send className="h-6 w-6 rotate-180" />
              Restore Data
              <input 
                id="restore-upload"
                type="file" 
                accept=".json" 
                className="hidden" 
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = async (event) => {
                    try {
                      const data = JSON.parse(event.target?.result as string);
                      const response = await fetch('/api/restore', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                      });
                      if (response.ok) {
                        alert('Data restored successfully! The page will reload.');
                        window.location.reload();
                      } else {
                        alert('Restore failed');
                      }
                    } catch (error) {
                      alert('Invalid backup file');
                    }
                  };
                  reader.readAsText(file);
                }}
              />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
