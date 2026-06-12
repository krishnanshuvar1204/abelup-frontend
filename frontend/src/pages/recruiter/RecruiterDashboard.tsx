import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Users, PlusCircle, Eye, UserCheck, UserX, ChevronDown, ChevronUp, Loader2, CalendarPlus, RotateCcw, FileText, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api, API_BASE_URL } from "@/lib/api";
import ScheduleInterviewDialog from "@/components/recruiter/ScheduleInterviewDialog";

interface Applicant {
  id: string;
  name: string;
  email: string;
  disability: string;
  status: string;
  resumeUrl?: string;
  interview?: any;
}

interface JobListing {
  id: string;
  title: string;
  location: string;
  salary: string;
  hours: string;
  description: string;
  accessibility: string;
  applicantsCount: number;
  shortlistedCount: number;
  postedAt: string;
  applicants?: Applicant[];
}

const RecruiterDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [listings, setListings] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [loadingApplicants, setLoadingApplicants] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  // Interview scheduling state
  const [scheduleDialog, setScheduleDialog] = useState<{
    open: boolean;
    applicationId: string;
    candidateName: string;
    jobTitle: string;
    existingInterview?: any;
  }>({ open: false, applicationId: "", candidateName: "", jobTitle: "" });

  const totalApplicants = listings.reduce((sum, j) => sum + j.applicantsCount, 0);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await api<{ jobs: any[] }>("/recruiter/jobs");
      setListings(
        data.jobs.map((j: any) => ({
          id: j._id || j.id,
          title: j.title,
          location: j.location || (j.remote ? "Remote" : "On-site"),
          salary: j.salaryMin && j.salaryMax ? `₹${j.salaryMin.toLocaleString()} - ₹${j.salaryMax.toLocaleString()}` : "Not specified",
          hours: j.workHours || "Full-time",
          description: j.description || "",
          accessibility: (j.accessibilityFeatures || []).join(", ") || "",
          applicantsCount: j.applicantsCount || 0,
          shortlistedCount: j.shortlistedCount || 0,
          postedAt: j.createdAt ? new Date(j.createdAt).toLocaleDateString() : "—",
        }))
      );
    } catch {
      // Keep empty
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchApplicants = async (jobId: string) => {
    setLoadingApplicants(jobId);
    try {
      const data = await api<{ applications: any[] }>(`/recruiter/job/${jobId}/applicants`);
      
      // Fetch interview status for each application
      const applicants: Applicant[] = await Promise.all(
        data.applications.map(async (a: any) => {
          const candidate = a.candidateId || {};
          const profile = a.candidateProfile || {};
          let interview = null;
          
          if (a.status === "SHORTLISTED") {
            try {
              const intRes = await api<{ interview: any }>(`/interviews/application/${a._id || a.id}`);
              interview = intRes.interview;
            } catch {}
          }

          return {
            id: a._id || a.id,
            name: candidate.name || "Unknown",
            email: candidate.email || "",
            disability: profile.disabilityType || "—",
            status: (a.status || "APPLIED").toLowerCase(),
            resumeUrl: a.applicationResumeUrl || a.resumeUrl || profile.resumeUrl,
            interview,
          };
        })
      );

      setListings((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, applicants } : j))
      );
    } catch {
      toast({ title: "Failed to load applicants", variant: "destructive" });
    } finally {
      setLoadingApplicants(null);
    }
  };

  const toggleExpand = (jobId: string) => {
    if (expandedJob === jobId) {
      setExpandedJob(null);
    } else {
      setExpandedJob(jobId);
      const job = listings.find((j) => j.id === jobId);
      if (!job?.applicants) fetchApplicants(jobId);
    }
  };

  const handlePost = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPosting(true);
    const form = e.currentTarget;
    const fd = new FormData(form);

    const jobData = {
      title: fd.get("job-title") as string,
      description: fd.get("job-desc") as string,
      location: fd.get("job-location") as string || "Remote",
      workHours: fd.get("job-hours") as string || "Full-time",
      salaryMin: parseInt(fd.get("job-salary-min") as string) || 0,
      salaryMax: parseInt(fd.get("job-salary-max") as string) || 0,
      accessibilityFeatures: (fd.get("job-access") as string || "").split(",").map((s) => s.trim()).filter(Boolean),
      remote: (fd.get("job-location") as string || "").toLowerCase().includes("remote"),
    };

    try {
      await api("/recruiter/jobs", { method: "POST", body: jobData });
      toast({ title: "Job Posted!", description: "Your job listing has been published." });
      setShowForm(false);
      fetchJobs();
    } catch {
      toast({ title: "Failed to post job", variant: "destructive" });
    } finally {
      setPosting(false);
    }
  };

  const updateApplicantStatus = async (jobId: string, applicationId: string, shortlisted: boolean) => {
    try {
      await api(`/recruiter/application/${applicationId}/shortlist`, {
        method: "PUT",
        body: { shortlisted },
      });
      const newStatus = shortlisted ? "shortlisted" : "rejected";
      setListings((prev) =>
        prev.map((job) =>
          job.id === jobId
            ? { ...job, applicants: job.applicants?.map((a) => (a.id === applicationId ? { ...a, status: newStatus } : a)) }
            : job
        )
      );
      toast({ title: shortlisted ? "Candidate Shortlisted" : "Candidate Rejected" });
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
    }
  };

  const hireCandidate = async (jobId: string, applicationId: string) => {
    try {
      await api(`/recruiter/application/${applicationId}/hire`, {
        method: "PUT",
      });
      setListings((prev) =>
        prev.map((job) =>
          job.id === jobId
            ? { ...job, applicants: job.applicants?.map((a) => (a.id === applicationId ? { ...a, status: "hired" } : a)) }
            : job
        )
      );
      toast({ title: "Candidate Hired!" });
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
    }
  };

  const openScheduleDialog = (applicant: Applicant, jobTitle: string) => {
    setScheduleDialog({
      open: true,
      applicationId: applicant.id,
      candidateName: applicant.name,
      jobTitle,
      existingInterview: applicant.interview,
    });
  };

  const handleInterviewScheduled = () => {
    // Refresh applicants for the expanded job
    if (expandedJob) fetchApplicants(expandedJob);
  };

  const interviewStatusBadge = (interview: any) => {
    if (!interview) return null;
    const config: Record<string, { label: string; className: string }> = {
      SCHEDULED: { label: "Interview Scheduled", className: "bg-primary/10 text-primary" },
      ACCEPTED: { label: "Interview Accepted", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
      RESCHEDULE_REQUESTED: { label: "Reschedule Requested", className: "bg-accent/10 text-accent" },
      RESCHEDULED: { label: "Rescheduled", className: "bg-primary/10 text-primary" },
      COMPLETED: { label: "Interview Done", className: "bg-muted text-muted-foreground" },
    };
    const c = config[interview.status] || config.SCHEDULED;
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-muted/30">
        <div className="container py-8">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-foreground">Recruiter Dashboard</h1>
            <Button className="gap-2" onClick={() => setShowForm(!showForm)}>
              <PlusCircle className="h-4 w-4" /> Post a Job
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <Briefcase className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Active Listings</CardTitle>
              </CardHeader>
              <CardContent><p className="text-3xl font-bold text-foreground">{loading ? "—" : listings.length}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <Users className="h-5 w-5 text-accent" />
                <CardTitle className="text-base">Total Applicants</CardTitle>
              </CardHeader>
              <CardContent><p className="text-3xl font-bold text-foreground">{loading ? "—" : totalApplicants}</p></CardContent>
            </Card>
          </div>

          {showForm && (
            <Card className="mb-8">
              <CardHeader><CardTitle>Post a New Job</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handlePost} className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="job-title">Job Title *</Label>
                    <Input id="job-title" name="job-title" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="job-location">Location</Label>
                    <Input id="job-location" name="job-location" placeholder="e.g. Remote, Mumbai" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="job-salary-min">Min Salary (₹)</Label>
                    <Input id="job-salary-min" name="job-salary-min" type="number" placeholder="15000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="job-salary-max">Max Salary (₹)</Label>
                    <Input id="job-salary-max" name="job-salary-max" type="number" placeholder="30000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="job-hours">Work Hours</Label>
                    <Select name="job-hours">
                      <SelectTrigger id="job-hours"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Full-time">Full-time</SelectItem>
                        <SelectItem value="Part-time">Part-time</SelectItem>
                        <SelectItem value="Flexi-time">Flexi-time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="job-desc">Description *</Label>
                    <Textarea id="job-desc" name="job-desc" rows={4} required />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                     <Label htmlFor="job-access">Accessibility Features (comma-separated) *</Label>
                     <Input id="job-access" name="job-access" placeholder="e.g. Wheelchair ramp, screen reader support" required />
                     <p className="text-xs text-muted-foreground">Specify at least one accessibility feature for this job posting.</p>
                   </div>
                  <div className="md:col-span-2">
                    <Button type="submit" size="lg" disabled={posting}>
                      {posting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Publish Job
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <h2 className="mb-4 text-lg font-semibold text-foreground">Your Job Listings</h2>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : listings.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No job listings yet. Post your first job!</p>
          ) : (
            <div className="space-y-4">
              {listings.map((job) => (
                <Card key={job.id}>
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground text-lg">{job.title}</h3>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">{job.location}</span>
                          <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">{job.salary}</span>
                          <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">{job.hours}</span>
                        </div>
                        {job.accessibility && <p className="mt-1 text-xs text-primary">♿ {job.accessibility}</p>}
                        <p className="mt-1 text-xs text-muted-foreground">Posted: {job.postedAt}</p>
                      </div>
                      <div className="flex items-center gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => navigate(`/recruiter/job/${job.id}/applicants`)}
                          >
                            <Eye className="h-3.5 w-3.5" /> View Applicants
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => toggleExpand(job.id)}
                          >
                            {loadingApplicants === job.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Users className="h-3.5 w-3.5" />
                            )}
                            {job.applicantsCount} Applicant{job.applicantsCount !== 1 ? "s" : ""}
                            {expandedJob === job.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </Button>
                        </div>
                    </div>

                    {expandedJob === job.id && (
                      <div className="mt-4 border-t pt-4">
                        {!job.applicants ? (
                          <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                        ) : job.applicants.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No applicants yet.</p>
                        ) : (
                          <div className="space-y-3">
                            <h4 className="text-sm font-medium text-foreground">Applicants</h4>
                            {job.applicants.map((applicant) => (
                              <div key={applicant.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                                <div>
                                  <p className="font-medium text-foreground">{applicant.name}</p>
                                  <p className="text-xs text-muted-foreground">{applicant.email}</p>
                                  <p className="text-xs text-primary">Disability: {applicant.disability}</p>
                                  {applicant.resumeUrl && (
                                    <a
                                      href={`${API_BASE_URL.replace('/api', '')}${applicant.resumeUrl}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                    >
                                      <FileText className="h-3 w-3" /> View Resume
                                    </a>
                                  )}
                                  {applicant.interview && (
                                    <div className="mt-1 flex items-center gap-2">
                                      {interviewStatusBadge(applicant.interview)}
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(applicant.interview.scheduledAt).toLocaleDateString("en-IN")} at{" "}
                                        {new Date(applicant.interview.scheduledAt).toLocaleTimeString("en-IN", { timeStyle: "short" })}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {applicant.status === "shortlisted" && (
                                    <>
                                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Shortlisted</Badge>
                                      {!applicant.interview ? (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="gap-1 text-primary border-primary/30 hover:bg-primary/10"
                                          onClick={() => openScheduleDialog(applicant, job.title)}
                                        >
                                          <CalendarPlus className="h-3 w-3" /> Schedule Interview
                                        </Button>
                                      ) : applicant.interview.status === "RESCHEDULE_REQUESTED" ? (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="gap-1 text-accent border-accent/30 hover:bg-accent/10"
                                          onClick={() => openScheduleDialog(applicant, job.title)}
                                        >
                                          <RotateCcw className="h-3 w-3" /> Reschedule
                                        </Button>
                                      ) : ["SCHEDULED", "ACCEPTED", "COMPLETED"].includes(applicant.interview.status) ? (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="gap-1 text-green-700 border-green-300 hover:bg-green-50"
                                          onClick={() => hireCandidate(job.id, applicant.id)}
                                        >
                                          <Trophy className="h-3 w-3" /> Hire Candidate
                                        </Button>
                                      ) : null}
                                    </>
                                  )}
                                  {applicant.status === "rejected" && (
                                    <Badge variant="destructive">Rejected</Badge>
                                  )}
                                  {applicant.status === "applied" && (
                                    <>
                                      <Button
                                        size="sm" variant="outline"
                                        className="gap-1 text-green-700 border-green-300 hover:bg-green-50"
                                        onClick={() => updateApplicantStatus(job.id, applicant.id, true)}
                                      >
                                        <UserCheck className="h-3 w-3" /> Shortlist
                                      </Button>
                                      <Button
                                        size="sm" variant="outline"
                                        className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                                        onClick={() => updateApplicantStatus(job.id, applicant.id, false)}
                                      >
                                        <UserX className="h-3 w-3" /> Reject
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />

      <ScheduleInterviewDialog
        open={scheduleDialog.open}
        onOpenChange={(open) => setScheduleDialog((prev) => ({ ...prev, open }))}
        applicationId={scheduleDialog.applicationId}
        candidateName={scheduleDialog.candidateName}
        jobTitle={scheduleDialog.jobTitle}
        existingInterview={scheduleDialog.existingInterview}
        onScheduled={handleInterviewScheduled}
      />
    </div>
  );
};

export default RecruiterDashboard;
