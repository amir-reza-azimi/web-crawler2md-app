import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Worm, 
  Settings, 
  HelpCircle, 
  ExternalLink, 
  Play, 
  Save, 
  ChevronDown, 
  Download, 
  Check, 
  AlertTriangle,
  X,
  Pause,
  Square,
  Plus,
  Trash2,
  Book
} from "lucide-react";
import type { CrawlJob, CrawlResult } from "@shared/schema";

const crawlJobSchema = z.object({
  baseUrl: z.string().url("Please enter a valid URL"),
  regexPatterns: z.array(z.string()).min(1, "At least one pattern is required"),
  maxDepth: z.number().min(1).max(10),
  requestDelay: z.number().min(100).max(5000),
  maxConcurrent: z.number().min(1).max(5),
  removeNavigation: z.boolean(),
  cleanFormatting: z.boolean(),
  includeImages: z.boolean(),
});

type CrawlJobForm = z.infer<typeof crawlJobSchema>;

export default function CrawlerPage() {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [regexPatterns, setRegexPatterns] = useState<string[]>([""]);
  const { toast } = useToast();

  const form = useForm<CrawlJobForm>({
    resolver: zodResolver(crawlJobSchema),
    defaultValues: {
      baseUrl: "",
      regexPatterns: [""],
      maxDepth: 2,
      requestDelay: 1000,
      maxConcurrent: 2,
      removeNavigation: true,
      cleanFormatting: true,
      includeImages: false,
    },
  });

  // Fetch all crawl jobs
  const { data: jobs = [], isLoading: jobsLoading } = useQuery<CrawlJob[]>({
    queryKey: ["/api/crawl-jobs"],
    refetchInterval: activeJobId ? 2000 : false,
  });

  // Fetch active job details
  const { data: activeJob } = useQuery<CrawlJob>({
    queryKey: ["/api/crawl-jobs", activeJobId],
    enabled: !!activeJobId,
    refetchInterval: activeJobId ? 2000 : false,
  });

  // Fetch results for active job
  const { data: results = [] } = useQuery<CrawlResult[]>({
    queryKey: ["/api/crawl-jobs", activeJobId, "results"],
    enabled: !!activeJobId,
    refetchInterval: activeJobId ? 2000 : false,
  });

  // Create crawl job mutation
  const createJobMutation = useMutation({
    mutationFn: async (data: CrawlJobForm) => {
      const response = await apiRequest("POST", "/api/crawl-jobs", data);
      return response.json();
    },
    onSuccess: (job: CrawlJob) => {
      queryClient.invalidateQueries({ queryKey: ["/api/crawl-jobs"] });
      setActiveJobId(job.id);
      setProgressModalOpen(true);
      toast({
        title: "Crawling Started",
        description: "Your web crawling job has been started successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start crawling job. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Regex validation
  const validateRegexMutation = useMutation({
    mutationFn: async (pattern: string) => {
      const response = await apiRequest("POST", "/api/validate-regex", { pattern });
      return response.json();
    },
  });

  const onSubmit = (data: CrawlJobForm) => {
    const filteredPatterns = regexPatterns.filter(p => p.trim() !== "");
    createJobMutation.mutate({
      ...data,
      regexPatterns: filteredPatterns,
    });
  };

  const addPattern = () => {
    setRegexPatterns([...regexPatterns, ""]);
  };

  const removePattern = (index: number) => {
    if (regexPatterns.length > 1) {
      const newPatterns = regexPatterns.filter((_, i) => i !== index);
      setRegexPatterns(newPatterns);
    }
  };

  const updatePattern = (index: number, value: string) => {
    const newPatterns = [...regexPatterns];
    newPatterns[index] = value;
    setRegexPatterns(newPatterns);
    form.setValue("regexPatterns", newPatterns);
  };

  const downloadResults = async (jobId: number) => {
    try {
      const response = await fetch(`/api/crawl-jobs/${jobId}/download`);
      if (!response.ok) throw new Error("Download failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `crawl-results-${jobId}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download results. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getProgressPercentage = () => {
    if (!activeJob || activeJob.totalPages === 0) return 0;
    return Math.round((activeJob.processedPages / activeJob.totalPages) * 100);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "running":
        return <Badge className="bg-blue-100 text-blue-700">Crawling</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-700">Completed</Badge>;
      case "error":
        return <Badge className="bg-red-100 text-red-700">Error</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-600">Ready</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface shadow-sm border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Worm className="text-primary-foreground text-lg" />
              </div>
              <div>
                <h1 className="text-xl font-medium text-foreground">Web Crawler & MD Extractor</h1>
                <p className="text-sm text-muted-foreground">Extract content from websites using regex patterns</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="icon">
                <HelpCircle className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Configuration Panel */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* URL Configuration Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Website Configuration</CardTitle>
                    <Badge variant="outline">Step 1</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="baseUrl">
                      Base URL <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="baseUrl"
                        type="url"
                        placeholder="https://example.com"
                        {...form.register("baseUrl")}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Enter the base URL of the website to crawl
                    </p>
                    {form.formState.errors.baseUrl && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.baseUrl.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxDepth">Maximum Crawl Depth</Label>
                    <Select
                      value={form.watch("maxDepth").toString()}
                      onValueChange={(value) => form.setValue("maxDepth", parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 level (current page only)</SelectItem>
                        <SelectItem value="2">2 levels</SelectItem>
                        <SelectItem value="3">3 levels</SelectItem>
                        <SelectItem value="5">5 levels</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Regex Patterns Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>URL Pattern Matching</CardTitle>
                    <Badge variant="outline">Step 2</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>
                      Regex Patterns <span className="text-destructive">*</span>
                    </Label>
                    {regexPatterns.map((pattern, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="relative flex-1">
                          <Input
                            placeholder=".*\/blog\/.*|.*\/articles\/.*"
                            value={pattern}
                            onChange={(e) => updatePattern(index, e.target.value)}
                            className="font-mono text-sm pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full"
                            onClick={() => validateRegexMutation.mutate(pattern)}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        </div>
                        {regexPatterns.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removePattern(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-green-600">
                        <Check className="mr-1 h-4 w-4" />
                        Valid pattern
                      </div>
                      <div className="flex items-center space-x-4">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={addPattern}
                        >
                          <Plus className="mr-1 h-4 w-4" />
                          Add pattern
                        </Button>
                        <Button type="button" variant="ghost" size="sm">
                          <Book className="mr-1 h-4 w-4" />
                          Pattern examples
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Advanced Settings */}
              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer">
                      <div className="flex items-center justify-between">
                        <CardTitle>Advanced Settings</CardTitle>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            advancedOpen ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="requestDelay">Request Delay (ms)</Label>
                          <Input
                            id="requestDelay"
                            type="number"
                            min="100"
                            max="5000"
                            {...form.register("requestDelay", { valueAsNumber: true })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="maxConcurrent">Max Concurrent Requests</Label>
                          <Select
                            value={form.watch("maxConcurrent").toString()}
                            onValueChange={(value) => form.setValue("maxConcurrent", parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1</SelectItem>
                              <SelectItem value="2">2</SelectItem>
                              <SelectItem value="3">3</SelectItem>
                              <SelectItem value="5">5</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label>Content Extraction</Label>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="removeNavigation"
                              checked={form.watch("removeNavigation")}
                              onCheckedChange={(checked) =>
                                form.setValue("removeNavigation", !!checked)
                              }
                            />
                            <Label htmlFor="removeNavigation" className="text-sm">
                              Remove navigation elements
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="cleanFormatting"
                              checked={form.watch("cleanFormatting")}
                              onCheckedChange={(checked) =>
                                form.setValue("cleanFormatting", !!checked)
                              }
                            />
                            <Label htmlFor="cleanFormatting" className="text-sm">
                              Clean up formatting
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="includeImages"
                              checked={form.watch("includeImages")}
                              onCheckedChange={(checked) =>
                                form.setValue("includeImages", !!checked)
                              }
                            />
                            <Label htmlFor="includeImages" className="text-sm">
                              Include images as references
                            </Label>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createJobMutation.isPending}
                >
                  <Play className="mr-2 h-4 w-4" />
                  {createJobMutation.isPending ? "Starting..." : "Start Crawling"}
                </Button>
                <Button type="button" variant="outline">
                  <Save className="mr-2 h-4 w-4" />
                  Save Configuration
                </Button>
              </div>
            </form>
          </div>

          {/* Status & Results Panel */}
          <div className="space-y-6">
            {/* Crawling Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>Crawling Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  {activeJob ? getStatusBadge(activeJob.status) : getStatusBadge("ready")}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Progress</span>
                    <span className="text-sm text-foreground">
                      {activeJob ? `${activeJob.processedPages} / ${activeJob.totalPages}` : "0 / 0"}
                    </span>
                  </div>
                  <Progress value={getProgressPercentage()} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">
                      {activeJob?.totalPages || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Pages Found</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {results.filter(r => r.status === "success").length}
                    </div>
                    <div className="text-sm text-muted-foreground">Processed</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity Card */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {results.length === 0 ? (
                    <div className="flex items-start space-x-3 text-sm">
                      <div className="w-2 h-2 bg-gray-300 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1 text-muted-foreground">
                        <div>Ready to start crawling...</div>
                        <div className="text-muted-foreground text-xs mt-1">
                          Configure your settings above
                        </div>
                      </div>
                    </div>
                  ) : (
                    results.slice(0, 5).map((result, index) => (
                      <div key={result.id} className="flex items-start space-x-3 text-sm">
                        <div className="mt-2 flex-shrink-0">
                          {result.status === "success" ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="text-foreground">
                            {result.title || new URL(result.url).pathname}
                          </div>
                          <div className="text-muted-foreground text-xs mt-1">
                            {result.status === "success" 
                              ? `${(result.fileSize || 0) / 1024} KB` 
                              : result.errorMessage
                            }
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Download Results Card */}
            <Card>
              <CardHeader>
                <CardTitle>Download Results</CardTitle>
              </CardHeader>
              <CardContent>
                {jobs.filter(job => job.status === "completed").length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Download className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-sm">No results available yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Start crawling to generate downloadable files
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {jobs
                      .filter(job => job.status === "completed")
                      .slice(0, 3)
                      .map(job => (
                        <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium text-sm">{new URL(job.baseUrl).hostname}</div>
                            <div className="text-xs text-muted-foreground">
                              {job.processedPages} pages • {new Date(job.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => downloadResults(job.id)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Estimated time</span>
                  <span className="text-sm text-foreground">
                    {activeJob && activeJob.status === "running" 
                      ? `${Math.ceil((activeJob.totalPages - activeJob.processedPages) * activeJob.requestDelay / 1000 / 60)} min`
                      : "--"
                    }
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">File size (approx)</span>
                  <span className="text-sm text-foreground">
                    {results.length > 0
                      ? `${Math.round(results.reduce((sum, r) => sum + (r.fileSize || 0), 0) / 1024)} KB`
                      : "--"
                    }
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Last crawl</span>
                  <span className="text-sm text-foreground">
                    {jobs.length > 0 
                      ? new Date(jobs[0].createdAt).toLocaleDateString()
                      : "Never"
                    }
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Progress Modal */}
      <Dialog open={progressModalOpen} onOpenChange={setProgressModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Crawling in Progress</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-6">
            {activeJob && (
              <>
                {/* Overall Progress */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Overall Progress</span>
                    <span className="text-sm">{activeJob.processedPages} / {activeJob.totalPages} pages</span>
                  </div>
                  <Progress value={getProgressPercentage()} className="h-3" />
                  <div className="mt-2 text-xs text-muted-foreground">
                    Status: {activeJob.status}
                  </div>
                </div>

                {/* Recent Results */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Recent Results</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {results.slice(0, 10).map((result) => (
                      <div key={result.id} className="flex items-center space-x-3 p-2 text-sm">
                        {result.status === "success" ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="flex-1 truncate">
                          {result.title || new URL(result.url).pathname}
                        </span>
                        <span className="text-muted-foreground">
                          {result.status === "success" 
                            ? `${Math.round((result.fileSize || 0) / 1024)} KB`
                            : "Error"
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {activeJob && activeJob.status === "running" 
                ? `Processing at ${Math.round(1000 / activeJob.requestDelay * activeJob.maxConcurrent * 10) / 10} pages/second`
                : "Processing complete"
              }
            </div>
            <div className="flex space-x-3">
              {activeJob?.status === "completed" && (
                <Button onClick={() => downloadResults(activeJob.id)}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Results
                </Button>
              )}
              <Button variant="outline" onClick={() => setProgressModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
