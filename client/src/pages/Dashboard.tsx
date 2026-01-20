import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { FileUp, Download, Clock, CheckCircle, XCircle, Loader2, Crown } from "lucide-react";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      window.location.href = "/";
    },
  });

  const { data: usage } = trpc.conversion.getUsage.useQuery();
  const { data: conversions, refetch: refetchConversions } = trpc.conversion.getHistory.useQuery({
    limit: 20,
    offset: 0,
  });

  const uploadMutation = trpc.conversion.upload.useMutation({
    onSuccess: () => {
      toast.success("Conversion started successfully!");
      refetchConversions();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to start conversion");
    },
  });

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const file = files[0];
      const ext = file.name.toLowerCase();

      if (!ext.endsWith(".dwg") && !ext.endsWith(".dxf")) {
        toast.error("Please select a DWG or DXF file");
        return;
      }

      if (file.size > 100 * 1024 * 1024) {
        toast.error("File size exceeds 100MB limit");
        return;
      }

      setUploading(true);

      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64Data = e.target?.result as string;
          const base64 = base64Data.split(",")[1];

          await uploadMutation.mutateAsync({
            fileName: file.name,
            fileData: base64,
            fileSize: file.size,
          });

          setUploading(false);
        };
        reader.readAsDataURL(file);
      } catch (error) {
        setUploading(false);
        toast.error("Failed to read file");
      }
    },
    [uploadMutation]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  const usagePercent = usage?.limit === -1 ? 0 : ((usage?.used || 0) / (usage?.limit || 1)) * 100;
  const isLimitReached = usage?.limit !== -1 && (usage?.used || 0) >= (usage?.limit || 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link href="/">
              <a className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                  <FileUp className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">DWG Converter</span>
              </a>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              {user?.name}
              {user?.subscriptionTier === "premium" && (
                <Crown className="inline-block w-4 h-4 ml-1 text-yellow-400" />
              )}
            </span>
            <Button
              variant="ghost"
              onClick={() => logoutMutation.mutate()}
            >
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Usage Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-card border-2 border-border">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Current Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold capitalize">{usage?.tier || "Free"}</span>
                {usage?.tier === "free" && (
                  <Button asChild size="sm" variant="default">
                    <Link href="/upgrade">Upgrade</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-2 border-border">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Usage This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {usage?.used || 0}
                    {usage?.limit !== -1 && <span className="text-lg text-muted-foreground"> / {usage?.limit}</span>}
                  </span>
                  {usage?.limit === -1 && <span className="text-sm text-accent font-semibold">Unlimited</span>}
                </div>
                {usage?.limit !== -1 && <Progress value={usagePercent} className="h-2" />}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-2 border-border">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Conversions</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{conversions?.length || 0}</span>
            </CardContent>
          </Card>
        </div>

        {/* Upload Section */}
        <Card className="mb-8 bg-card border-2 border-border">
          <CardHeader>
            <CardTitle>Upload DWG/DXF File</CardTitle>
            <CardDescription>
              Drag and drop your CAD file or click to browse. Maximum file size: 100MB
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLimitReached ? (
              <div className="text-center py-12 border-2 border-dashed border-destructive rounded-lg bg-destructive/5">
                <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <p className="text-lg font-semibold mb-2">Monthly Limit Reached</p>
                <p className="text-muted-foreground mb-4">
                  You've used all {usage?.limit} conversions for this month.
                </p>
                <Button asChild variant="default">
                  <Link href="/upgrade">Upgrade to Premium</Link>
                </Button>
              </div>
            ) : (
              <div
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-all ${
                  dragOver
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background/50 hover:border-primary/50 hover:bg-primary/5"
                } ${uploading ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => {
                  if (!uploading) {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".dwg,.dxf";
                    input.onchange = (e) => handleFileSelect((e.target as HTMLInputElement).files);
                    input.click();
                  }
                }}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-16 h-16 text-primary mx-auto mb-4 animate-spin" />
                    <p className="text-lg font-semibold">Uploading and processing...</p>
                  </>
                ) : (
                  <>
                    <FileUp className="w-16 h-16 text-primary mx-auto mb-4" />
                    <p className="text-lg font-semibold mb-2">Drop your DWG or DXF file here</p>
                    <p className="text-muted-foreground">or click to browse</p>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversion History */}
        <Card className="bg-card border-2 border-border">
          <CardHeader>
            <CardTitle>Conversion History</CardTitle>
            <CardDescription>Your recent DWG to PDF conversions</CardDescription>
          </CardHeader>
          <CardContent>
            {!conversions || conversions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No conversions yet. Upload your first file to get started!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {conversions.map((conversion) => (
                  <div
                    key={conversion.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg bg-background/50 hover:bg-background transition-colors"
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center flex-shrink-0">
                        {conversion.status === "completed" && <CheckCircle className="w-5 h-5 text-green-400" />}
                        {conversion.status === "processing" && <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />}
                        {conversion.status === "pending" && <Clock className="w-5 h-5 text-yellow-400" />}
                        {conversion.status === "failed" && <XCircle className="w-5 h-5 text-red-400" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{conversion.originalFileName}</p>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span className="capitalize">{conversion.status}</span>
                          <span>{new Date(conversion.createdAt).toLocaleDateString()}</span>
                          <span>{(conversion.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                      </div>
                    </div>

                    {conversion.status === "completed" && conversion.pdfFileUrl && (
                      <Button asChild variant="default" size="sm">
                        <a href={conversion.pdfFileUrl} download target="_blank" rel="noopener noreferrer">
                          <Download className="w-4 h-4 mr-2" />
                          Download PDF
                        </a>
                      </Button>
                    )}

                    {conversion.status === "failed" && (
                      <span className="text-sm text-destructive">{conversion.errorMessage}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
