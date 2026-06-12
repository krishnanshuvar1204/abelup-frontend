import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft, Users, FileText, Mail, UserCheck, UserX,
  CalendarPlus, RotateCcw, Loader2, Briefcase, ChevronDown, ChevronUp, Trophy,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api, API_BASE_URL } from "@/lib/api";
import ScheduleInterviewDialog from "@/components/recruiter/ScheduleInterviewDialog";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface Applicant {
  id: string;
  name: string;
  email: string;
  disability: string;
  verificationStatus: string;
  status: string;
  resumeUrl?: string;
  coverLetter?: string;
  appliedAt: string;
  interview?: any;
}

interface JobInfo {
  title: string;
  location: string;
  applicantsCount: number;
  shortlistedCount: number;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  applied: { label: "Applied", className: "bg-secondary text-secondary-foreground" },
  shortlisted: { label: "Shortlisted", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive" },
  hired: { label: "Hired", className: "bg-primary/10 text-primary" },
};

const interviewStatusConfig: Record<string, { label: string; className: string }> = {
  SCHEDULED: { label: "Interview Scheduled", className: "bg-primary/10 text-primary" },
  ACCEPTED: { label: "Interview Accepted", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  RESCHEDULE_REQUESTED: { label: "Reschedule Requested", className: "bg-accent/10 text-accent" },
  RESCHEDULED: { label: "Rescheduled", className: "bg-primary/10 text-primary" },
  COMPLETED: { label: "Interview Done", className: "bg-muted text-muted-foreground" },
};

const JobApplicantsPage = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [job, setJob] = useState<JobInfo | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCover, setExpandedCover] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [unbiasedMode, setUnbiasedMode] = useState(false);

  const [scheduleDialog, setScheduleDialog] = useState<{
    open: boolean;
    applicationId: string;
    candidateName: string;
    jobTitle: string;
    existingInterview?: any;
  }>({ open: false, applicationId: "", candidateName: "", jobTitle: "" });

  // Only "applied" status applicants can be bulk-actioned
  const selectableApplicants = applicants.filter((a) => a.status === "applied");
  const allSelected = selectableApplicants.length > 0 && selectableApplicants.every((a) => selectedIds.has(a.id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableApplicants.map((a) => a.id)));
    }
  };

  const bulkAction = async (action: "shortlist" | "reject") => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      await api("/recruiter/applications/bulk-action", {
        method: "PUT",
        body: { applicationIds: Array.from(selectedIds), action },
      });
      const newStatus = action === "shortlist" ? "shortlisted" : "rejected";
      setApplicants((prev) =>
        prev.map((a) => (selectedIds.has(a.id) ? { ...a, status: newStatus } : a))
      );
      setSelectedIds(new Set());
      toast({ title: `${action === "shortlist" ? "Shortlisted" : "Rejected"} ${selectedIds.size} applicant(s)` });
    } catch {
      toast({ title: "Bulk action failed", variant: "destructive" });
    } finally {
      setBulkLoading(false);
    }
  };

  const fetchData = async () => {
    if (!jobId) return;
    setLoading(true);
    try {
      const [jobRes, appRes] = await Promise.all([
        api<{ success: boolean; applicantsCount: number; shortlistedCount: number }>(`/recruiter/job/${jobId}/summary`),
        api<{ applications: any[] }>(`/recruiter/job/${jobId}/applicants?limit=100`),
      ]);

      const jobsRes = await api<{ jobs: any[] }>("/recruiter/jobs");
      const jobData = jobsRes.jobs.find((j: any) => (j._id || j.id) === jobId);

      setJob({
        title: jobData?.title || "Job",
        location: jobData?.location || (jobData?.remote ? "Remote" : "On-site"),
        applicantsCount: jobRes.applicantsCount,
        shortlistedCount: jobRes.shortlistedCount,
      });

      const mapped: Applicant[] = await Promise.all(
        appRes.applications.map(async (a: any) => {
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
            verificationStatus: candidate.verificationStatus || "unknown",
            status: (a.status || "APPLIED").toLowerCase(),
            resumeUrl: a.applicationResumeUrl || a.resumeUrl || profile.resumeUrl,
            coverLetter: a.coverLetter || null,
            appliedAt: a.appliedAt ? new Date(a.appliedAt).toLocaleDateString("en-IN") : "—",
            interview,
          };
        })
      );

      setApplicants(mapped);
    } catch {
      toast({ title: "Failed to load applicants", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [jobId]);

  const updateStatus = async (applicationId: string, shortlisted: boolean) => {
    try {
      await api(`/recruiter/application/${applicationId}/shortlist`, {
        method: "PUT",
        body: { shortlisted },
      });
      setApplicants((prev) =>
        prev.map((a) =>
          a.id === applicationId
            ? { ...a, status: shortlisted ? "shortlisted" : "rejected" }
            : a
        )
      );
      toast({ title: shortlisted ? "Candidate Shortlisted" : "Candidate Rejected" });
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
    }
  };

  const hireCandidate = async (applicationId: string) => {
    try {
      await api(`/recruiter/application/${applicationId}/hire`, {
        method: "PUT",
      });
      setApplicants((prev) =>
        prev.map((a) =>
          a.id === applicationId
            ? { ...a, status: "hired" }
            : a
        )
      );
      toast({ title: "Candidate Hired!" });
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
    }
  };

  const openSchedule = (applicant: Applicant) => {
    setScheduleDialog({
      open: true,
      applicationId: applicant.id,
      candidateName: applicant.name,
      jobTitle: job?.title || "",
      existingInterview: applicant.interview,
    });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-muted/30" role="main" aria-label={t("recruiter.applicants")}>
        <div className="container py-8 max-w-4xl">
          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/recruiter">{t("nav.dashboard")}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{job?.title || t("recruiter.applicants")}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Button variant="ghost" className="mb-4 gap-2" onClick={() => navigate("/recruiter")}>
            <ArrowLeft className="h-4 w-4" /> {t("common.back")}
          </Button>

          {loading ? (
            <div className="flex justify-center py-16" role="status" aria-label={t("common.loading")}>
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Job Summary Header */}
              <Card className="mb-6">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-primary" aria-hidden="true" />
                        {job?.title}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{job?.location}</p>
                    </div>
                    <div className="flex gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-foreground">{job?.applicantsCount || 0}</p>
                        <p className="text-xs text-muted-foreground">{t("recruiter.totalApplicants")}</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">{job?.shortlistedCount || 0}</p>
                        <p className="text-xs text-muted-foreground">{t("common.shortlisted")}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Bulk Actions Bar */}
              {selectableApplicants.length > 0 && (
                <Card className="mb-4">
                  <CardContent className="p-3 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleSelectAll}
                        aria-label={allSelected ? t("recruiter.deselectAll") : t("recruiter.selectAll")}
                      />
                      <span className="text-sm text-muted-foreground">
                        {selectedIds.size > 0
                          ? t("recruiter.selected", { count: selectedIds.size })
                          : t("recruiter.selectAll")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 ml-4 border-l pl-4">
                      <Switch id="unbiased-mode" checked={unbiasedMode} onCheckedChange={setUnbiasedMode} />
                      <label htmlFor="unbiased-mode" className="text-sm font-medium text-muted-foreground">Unbiased Mode</label>
                    </div>
                    {selectedIds.size > 0 && (
                      <div className="flex gap-2 ml-auto">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-green-700 border-green-300 hover:bg-green-50"
                          onClick={() => bulkAction("shortlist")}
                          disabled={bulkLoading}
                        >
                          {bulkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3 w-3" />}
                          {t("recruiter.bulkShortlist")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() => bulkAction("reject")}
                          disabled={bulkLoading}
                        >
                          {bulkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserX className="h-3 w-3" />}
                          {t("recruiter.bulkReject")}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Applicants List */}
              {applicants.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground" aria-hidden="true" />
                    <p className="text-muted-foreground">{t("recruiter.noApplicants")}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4" role="list" aria-label={t("recruiter.applicants")}>
                  <h2 className="text-lg font-semibold text-foreground">
                    {t("recruiter.applicants")} ({applicants.length})
                  </h2>

                  {applicants.map((applicant, index) => {
                    const sc = statusConfig[applicant.status] || statusConfig.applied;
                    const displayName = unbiasedMode ? `Candidate ${index + 1}` : applicant.name;
                    const displayEmail = unbiasedMode ? `c***@hidden.com` : applicant.email;
                    return (
                      <Card key={applicant.id} role="listitem">
                        <CardContent className="p-5 space-y-3">
                          {/* Header row */}
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              {applicant.status === "applied" && (
                                <Checkbox
                                  checked={selectedIds.has(applicant.id)}
                                  onCheckedChange={() => toggleSelect(applicant.id)}
                                  aria-label={`Select ${applicant.name}`}
                                  className="mt-1"
                                />
                              )}
                              <div className="space-y-1">
                                <h3 className="font-semibold text-foreground text-base">{displayName}</h3>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Mail className="h-3 w-3" aria-hidden="true" />
                                  {unbiasedMode ? (
                                    <span>{displayEmail}</span>
                                  ) : (
                                    <a href={`mailto:${applicant.email}`} className="hover:underline">
                                      {applicant.email}
                                    </a>
                                  )}
                                </div>
                                <p className="text-xs text-primary">{t("common.disability")}: {applicant.disability}</p>
                                <p className="text-xs text-muted-foreground">{t("common.applied")}: {applicant.appliedAt}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={sc.className}>{sc.label}</Badge>
                              {applicant.interview && (
                                <Badge className={interviewStatusConfig[applicant.interview.status]?.className}>
                                  {interviewStatusConfig[applicant.interview.status]?.label}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Resume & Cover Letter */}
                          <div className="flex flex-wrap gap-3 border-t pt-3">
                            {applicant.resumeUrl ? (
                              <a
                                href={`${API_BASE_URL.replace("/api", "")}${applicant.resumeUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm text-primary hover:bg-primary/5 transition-colors"
                                aria-label={`${t("common.viewResume")} - ${applicant.name}`}
                              >
                                <FileText className="h-4 w-4" aria-hidden="true" /> {t("common.viewResume")}
                              </a>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                                <FileText className="h-4 w-4" aria-hidden="true" /> {t("common.noResume")}
                              </span>
                            )}

                            {applicant.coverLetter && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                onClick={() =>
                                  setExpandedCover(expandedCover === applicant.id ? null : applicant.id)
                                }
                                aria-expanded={expandedCover === applicant.id}
                              >
                                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                                {t("common.coverLetter")}
                                {expandedCover === applicant.id ? (
                                  <ChevronUp className="h-3 w-3" />
                                ) : (
                                  <ChevronDown className="h-3 w-3" />
                                )}
                              </Button>
                            )}
                          </div>

                          {/* Expanded cover letter */}
                          {expandedCover === applicant.id && applicant.coverLetter && (
                            <div className="rounded-md bg-muted p-4 text-sm text-foreground whitespace-pre-wrap">
                              {applicant.coverLetter}
                            </div>
                          )}

                          {/* Interview info */}
                          {applicant.interview && (
                            <div className="text-xs text-muted-foreground">
                              Interview: {new Date(applicant.interview.scheduledAt).toLocaleDateString("en-IN")}{" "}
                              at {new Date(applicant.interview.scheduledAt).toLocaleTimeString("en-IN", { timeStyle: "short" })}
                              {applicant.interview.notes && (
                                <span className="ml-2">— {applicant.interview.notes}</span>
                              )}
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="flex items-center gap-2 flex-wrap border-t pt-3">
                            {applicant.status === "applied" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1 text-green-700 border-green-300 hover:bg-green-50"
                                  onClick={() => updateStatus(applicant.id, true)}
                                >
                                  <UserCheck className="h-3 w-3" /> {t("recruiter.shortlist")}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                                  onClick={() => updateStatus(applicant.id, false)}
                                >
                                  <UserX className="h-3 w-3" /> {t("recruiter.reject")}
                                </Button>
                              </>
                            )}
                            {applicant.status === "shortlisted" && !applicant.interview && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-primary border-primary/30 hover:bg-primary/10"
                                onClick={() => openSchedule(applicant)}
                              >
                                <CalendarPlus className="h-3 w-3" /> {t("recruiter.scheduleInterview")}
                              </Button>
                            )}
                            {applicant.status === "shortlisted" &&
                              applicant.interview?.status === "RESCHEDULE_REQUESTED" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1 text-accent border-accent/30 hover:bg-accent/10"
                                  onClick={() => openSchedule(applicant)}
                                >
                                  <RotateCcw className="h-3 w-3" /> {t("recruiter.reschedule")}
                                </Button>
                              )}
                            {applicant.status === "shortlisted" &&
                              ["SCHEDULED", "ACCEPTED", "COMPLETED"].includes(applicant.interview?.status) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1 text-green-700 border-green-300 hover:bg-green-50"
                                  onClick={() => hireCandidate(applicant.id)}
                                >
                                  <Trophy className="h-3 w-3" /> Hire Candidate
                                </Button>
                              )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
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
        onScheduled={fetchData}
      />
    </div>
  );
};

export default JobApplicantsPage;
