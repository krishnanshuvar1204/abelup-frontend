import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft, MapPin, Clock, IndianRupee, Bookmark, BookmarkCheck, Loader2,
  Upload, FileText, Briefcase, Accessibility, Share2, Copy, CheckCircle2,
  Users, Calendar, Eye, Ear, Armchair,
  ShieldCheck, Medal, Star, Info
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, apiUpload } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import SimilarJobCard from "@/components/candidate/SimilarJobCard";

interface JobDetail {
  _id: string;
  title: string;
  description: string;
  location: string;
  remote: boolean;
  salaryMin: number;
  salaryMax: number;
  workHours: string;
  disabilityEligible: string[];
  accessibilityFeatures: string[];
  isActive: boolean;
  applicantsCount?: number;
  recruiterId?: { _id?: string; name: string; email: string };
  createdAt: string;
}

interface RecruiterProfile {
  companyName: string;
  tier: "NONE" | "BRONZE" | "SILVER" | "GOLD";
  inclusivityScore: number;
  averageRating: number;
  reviewCount: number;
}

const getRelativeTime = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

const accessibilityIconMap: Record<string, React.ReactNode> = {
  wheelchair: <Armchair className="h-4 w-4" />,
  visual: <Eye className="h-4 w-4" />,
  hearing: <Ear className="h-4 w-4" />,
};

const getAccessibilityIcon = (feature: string) => {
  const lower = feature.toLowerCase();
  for (const [key, icon] of Object.entries(accessibilityIconMap)) {
    if (lower.includes(key)) return icon;
  }
  return <Accessibility className="h-4 w-4" />;
};

const JobDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [similarJobs, setSimilarJobs] = useState<any[]>([]);
  const [recruiterProfile, setRecruiterProfile] = useState<RecruiterProfile | null>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchJob = async () => {
      setLoading(true);
      try {
        const data = await api<{ job: JobDetail; recruiterProfile: RecruiterProfile }>(`/jobs/${id}`);
        setJob(data.job);
        setRecruiterProfile(data.recruiterProfile);
      } catch {
        toast({ title: "Failed to load job details", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    const fetchSaved = async () => {
      try {
        const data = await api<{ savedJobs: any[] }>("/candidate/saved");
        const ids = data.savedJobs.map((j: any) => j._id || j.id);
        if (id && ids.includes(id)) setSaved(true);
      } catch { /* ignore */ }
    };

    const fetchApplicationStatus = async () => {
      try {
        const data = await api<{ applications: any[] }>("/candidate/applied");
        const applied = data.applications?.some((a: any) => (a.jobId?._id || a.jobId) === id);
        if (applied) setHasApplied(true);
      } catch { /* ignore */ }
    };

    const fetchSimilar = async () => {
      try {
        const data = await api<{ jobs: any[] }>(`/jobs/${id}/similar`);
        setSimilarJobs(data.jobs || []);
      } catch { /* ignore */ }
    };

    fetchJob();
    fetchSimilar();
    if (user?.role === "candidate") {
      fetchSaved();
      fetchApplicationStatus();
    }
  }, [id]);

  const handleSave = async () => {
    if (!id) return;
    try {
      const data = await api<{ saved: boolean }>(`/candidate/save/${id}`, { method: "POST" });
      setSaved(data.saved);
      toast({ title: data.saved ? "Job saved" : "Job unsaved" });
    } catch {
      toast({ title: "Login to save jobs", variant: "destructive" });
    }
  };

  const handleApply = async () => {
    if (!id) return;
    setApplyingId(id);
    try {
      const formData = new FormData();
      if (resumeFile) formData.append("resume", resumeFile);
      if (coverLetter) formData.append("coverLetter", coverLetter);
      await apiUpload(`/candidate/apply/${id}`, formData);
      toast({ title: "Application submitted!" });
      setHasApplied(true);
      setApplyOpen(false);
    } catch (err: any) {
      toast({ title: err.message || "Failed to apply", variant: "destructive" });
    } finally {
      setApplyingId(null);
    }
  };

  const handleShare = async (type: string) => {
    const url = window.location.href;
    const text = `Check out this job: ${job?.title}`;
    if (type === "copy") {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied to clipboard" });
    } else if (type === "native" && navigator.share) {
      navigator.share({ title: job?.title, text, url }).catch(() => {});
    } else if (type === "linkedin") {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, "_blank");
    } else if (type === "twitter") {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank");
    } else if (type === "whatsapp") {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`, "_blank");
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-muted/30">
        <div className="container max-w-3xl py-8">
          {/* Breadcrumbs */}
          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild><Link to="/">Home</Link></BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild><Link to="/jobs">Jobs</Link></BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{job?.title || "Job Details"}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Button variant="ghost" className="mb-4 gap-2" onClick={() => navigate("/jobs")}>
            <ArrowLeft className="h-4 w-4" /> Back to Jobs
          </Button>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !job ? (
            <p className="text-center text-muted-foreground py-20">Job not found.</p>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6 space-y-6">
                  {/* Accessibility Quick Preview */}
                  {job.accessibilityFeatures?.length > 0 && (
                    <div className="flex flex-wrap gap-2 rounded-lg bg-primary/5 p-3">
                      {job.accessibilityFeatures.map((f) => (
                        <Badge key={f} variant="secondary" className="gap-1.5 text-primary">
                          {getAccessibilityIcon(f)} {f}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-bold text-foreground">{job.title}</h1>
                      <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" /> Posted {getRelativeTime(job.createdAt)}
                        </span>
                        {typeof job.applicantsCount === "number" && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" /> {job.applicantsCount} applicant{job.applicantsCount !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Share */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Share job">
                            <Share2 className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleShare("copy")}>
                            <Copy className="h-4 w-4 mr-2" /> Copy Link
                          </DropdownMenuItem>
                          {typeof navigator.share === "function" && (
                            <DropdownMenuItem onClick={() => handleShare("native")}>
                              <Share2 className="h-4 w-4 mr-2" /> Share…
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleShare("linkedin")}>LinkedIn</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleShare("twitter")}>Twitter / X</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleShare("whatsapp")}>WhatsApp</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {/* Save */}
                      <button onClick={handleSave} className="text-muted-foreground hover:text-accent" aria-label="Save job">
                        {saved ? <BookmarkCheck className="h-6 w-6 text-primary" /> : <Bookmark className="h-6 w-6" />}
                      </button>
                    </div>
                  </div>

                  {/* Meta badges */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <MapPin className="h-3 w-3" />
                      {job.location || (job.remote ? "Remote" : "On-site")}
                    </Badge>
                    {job.remote && <Badge variant="secondary">Remote</Badge>}
                    <Badge variant="secondary" className="gap-1">
                      <IndianRupee className="h-3 w-3" />
                      {job.salaryMin && job.salaryMax
                        ? `₹${job.salaryMin.toLocaleString()} - ₹${job.salaryMax.toLocaleString()}`
                        : "Not specified"}
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {job.workHours || "Full-time"}
                    </Badge>
                  </div>

                  {/* Description */}
                  <div>
                    <h2 className="text-lg font-semibold text-foreground mb-2">Job Description</h2>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{job.description || "No description provided."}</p>
                  </div>

                  {/* Disability Eligibility */}
                  {job.disabilityEligible?.length > 0 && (
                    <div>
                      <h2 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                        <Briefcase className="h-4 w-4" /> Disability Eligibility
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {job.disabilityEligible.map((d) => (
                          <Badge key={d} variant="outline">{d}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recruiter / Company Card */}
                  {job.recruiterId && (
                    <Card className="bg-muted/50 border-primary/10 overflow-hidden">
                      <CardContent className="p-0">
                        {/* Inclusivity Tier Header */}
                        {recruiterProfile && recruiterProfile.tier !== "NONE" && (
                          <div className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                            recruiterProfile.tier === "GOLD" ? "bg-yellow-500/10 text-yellow-600" :
                            recruiterProfile.tier === "SILVER" ? "bg-slate-400/10 text-slate-600" :
                            "bg-orange-600/10 text-orange-700"
                          }`}>
                            <Medal className="h-3 w-3" /> {recruiterProfile.tier} Verified Inclusive Employer
                          </div>
                        )}
                        <div className="p-4 flex items-center gap-4">
                          <div className="relative">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
                              {job.recruiterId.name?.charAt(0)?.toUpperCase() || "R"}
                            </div>
                            {recruiterProfile && recruiterProfile.tier === "GOLD" && (
                              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                                <ShieldCheck className="h-4 w-4 text-yellow-500 fill-yellow-500/20" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-foreground truncate">{recruiterProfile?.companyName || job.recruiterId.name}</p>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              {recruiterProfile && recruiterProfile.reviewCount > 0 && (
                                <span className="flex items-center gap-1">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> 
                                  {recruiterProfile.averageRating.toFixed(1)} ({recruiterProfile.reviewCount})
                                </span>
                              )}
                              <span className="truncate">{job.recruiterId.email}</span>
                            </div>
                          </div>
                          {job.recruiterId._id && (
                            <Button variant="outline" size="sm" asChild className="hidden sm:flex">
                              <Link to={`/jobs?recruiter=${job.recruiterId._id}`}>Jobs</Link>
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Apply / Applied */}
                  {hasApplied ? (
                    <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-4">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      <span className="font-medium text-primary">Application Submitted</span>
                    </div>
                  ) : (
                    <Button
                      className="w-full"
                      size="lg"
                      disabled={user?.verificationStatus !== "approved"}
                      onClick={() => { setResumeFile(null); setCoverLetter(""); setApplyOpen(true); }}
                    >
                      {user?.verificationStatus === "approved" ? "Apply Now" : "Verify to Apply"}
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Similar Jobs */}
              {similarJobs.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-3">Similar Jobs</h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {similarJobs.map((sj) => (
                      <SimilarJobCard key={sj._id} job={sj} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Apply Dialog */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply for {job?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Resume (PDF, DOC, DOCX — max 5MB)</Label>
              <div
                className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed p-4 transition-colors hover:border-primary/50"
                onClick={() => resumeInputRef.current?.click()}
              >
                {resumeFile ? (
                  <>
                    <FileText className="h-5 w-5 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{resumeFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(resumeFile.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setResumeFile(null); }}>Remove</Button>
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Click to upload resume</p>
                  </>
                )}
              </div>
              <input
                ref={resumeInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f && f.size <= 5 * 1024 * 1024) setResumeFile(f);
                  else if (f) toast({ title: "File too large (max 5MB)", variant: "destructive" });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Cover Letter (optional)</Label>
              <Textarea
                rows={4}
                placeholder="Why are you a great fit for this role?"
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyOpen(false)}>Cancel</Button>
            <Button onClick={handleApply} disabled={applyingId === id}>
              {applyingId === id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default JobDetailPage;
