import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useJobs } from "@/hooks/use-business-data";
import { MapPin, Calendar, DollarSign, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";

interface JobLinkProps {
  jobId: number;
  displayText?: string;
  className?: string;
}

export function JobLink({ jobId, displayText, className = "" }: JobLinkProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: jobs } = useJobs();
  const [, setLocation] = useLocation();
  
  const job = jobs?.find(j => j.id === jobId);
  
  if (!job) {
    return <span className={className}>{displayText || `Job #${jobId}`}</span>;
  }

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
    in_progress: "bg-blue-100 text-blue-700 border-blue-200",
    completed: "bg-green-100 text-green-700 border-green-200",
    cancelled: "bg-red-100 text-red-700 border-red-200",
  };

  const agreedAmount = Number(job.agreedAmount || 0);
  const paidAmount = Number(job.paidAmount || 0);
  const pendingAmount = agreedAmount - paidAmount;

  return (
    <>
      <span 
        className={`cursor-pointer text-primary hover:underline font-medium inline-flex items-center gap-1 ${className}`}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        data-testid={`job-link-${jobId}`}
      >
        {displayText || job.jobId || `Job #${jobId}`}
        <ExternalLink className="h-3 w-3" />
      </span>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Job Details
              <Badge variant="outline" className={statusColors[job.status] || ""}>
                {job.status.replace('_', ' ')}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-400 uppercase">Job ID</label>
              <p className="font-mono font-bold text-lg">{job.jobId}</p>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 uppercase">Description</label>
              <p className="text-slate-700">{job.description}</p>
            </div>

            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 text-slate-400" />
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase">Location</label>
                <p className="text-slate-700">{job.location}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {job.startDate && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-0.5 text-slate-400" />
                  <div>
                    <label className="text-xs font-medium text-slate-400 uppercase">Start Date</label>
                    <p className="text-slate-700">{job.startDate}</p>
                  </div>
                </div>
              )}
              {job.endDate && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-0.5 text-slate-400" />
                  <div>
                    <label className="text-xs font-medium text-slate-400 uppercase">End Date</label>
                    <p className="text-slate-700">{job.endDate}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg">
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase">Agreed</label>
                <p className="font-mono font-bold text-slate-900">₹{agreedAmount.toLocaleString()}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase">Paid</label>
                <p className="font-mono font-bold text-green-600">₹{paidAmount.toLocaleString()}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase">Pending</label>
                <p className="font-mono font-bold text-orange-600">₹{pendingAmount.toLocaleString()}</p>
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={() => {
                setIsOpen(false);
                setLocation("/jobs");
              }}
              data-testid="button-go-to-jobs"
            >
              View Full Details in Jobs
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
