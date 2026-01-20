import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { FileUp, Zap, Shield, TrendingUp, Upload, CheckCircle, Crown } from "lucide-react";
import { useState, useRef } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function Home() {
  const { user, isAuthenticated, loading } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = trpc.conversion.upload.useMutation({
    onSuccess: (data) => {
      toast.success("File uploaded successfully! Conversion started.");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setIsUploading(false);
      
      // Redirect to dashboard to see conversion status
      if (isAuthenticated) {
        window.location.href = "/dashboard";
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to upload file");
      setIsUploading(false);
    },
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    const validExtensions = [".dwg", ".dxf"];
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));

    if (!validExtensions.includes(fileExtension)) {
      toast.error("Only DWG and DXF files are supported");
      return;
    }

    // Validate file size (100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast.error("File size must be less than 100MB");
      return;
    }

    setSelectedFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file first");
      return;
    }

    setIsUploading(true);

    // Convert file to base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      const base64Content = base64Data.split(",")[1]; // Remove data:image/...;base64, prefix

      try {
        await uploadMutation.mutateAsync({
          fileName: selectedFile.name,
          fileData: base64Content,
          fileSize: selectedFile.size,
        });
      } catch (error) {
        // Error handled in onError callback
      }
    };

    reader.onerror = () => {
      toast.error("Failed to read file");
      setIsUploading(false);
    };

    reader.readAsDataURL(selectedFile);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/">
            <a className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                <FileUp className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">DWG Converter</span>
            </a>
          </Link>

          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-muted-foreground">Welcome, {user?.name}</span>
                <Button asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <a href={getLoginUrl()}>Sign In</a>
                </Button>
                <Button asChild>
                  <a href={getLoginUrl()}>Get Started</a>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section with Upload */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8">
            <div className="inline-block px-4 py-2 rounded-full border border-primary/30 bg-primary/5 mb-6">
              <span className="text-sm font-semibold text-primary uppercase tracking-wide">Professional CAD Conversion</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              Convert <span className="text-primary">DWG to PDF</span>
              <br />
              with Precision
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-12">
              Professional-grade CAD file conversion service. Upload your DWG or DXF files and receive high-quality PDF outputs in
              seconds. Built for architects, engineers, and designers.
            </p>
          </div>

          {/* Upload Card */}
          <Card className="max-w-2xl mx-auto bg-card border-2 border-border">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Upload DWG/DXF File</span>
                {!isAuthenticated && (
                  <span className="text-sm font-normal text-muted-foreground">1 free conversion</span>
                )}
                {isAuthenticated && user?.subscriptionTier === "free" && (
                  <span className="text-sm font-normal text-muted-foreground">5 conversions/month</span>
                )}
                {isAuthenticated && user?.subscriptionTier === "premium" && (
                  <span className="text-sm font-normal text-primary flex items-center">
                    <Crown className="w-4 h-4 mr-1" />
                    Unlimited conversions
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                {!isAuthenticated
                  ? "Try one conversion without an account. Sign in for 5 free conversions per month."
                  : "Drag and drop your CAD file or click to browse. Maximum file size: 100MB"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Drag & Drop Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : selectedFile
                    ? "border-green-400 bg-green-400/5"
                    : "border-border hover:border-primary/50 hover:bg-primary/5"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".dwg,.dxf"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="space-y-2">
                    <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
                    <p className="text-lg font-semibold">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-12 h-12 text-muted-foreground mx-auto" />
                    <p className="text-lg font-semibold">Drop your DWG/DXF file here</p>
                    <p className="text-sm text-muted-foreground">or click to browse</p>
                  </div>
                )}
              </div>

              {/* Upload Button */}
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="w-full"
                size="lg"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Converting...
                  </>
                ) : (
                  <>
                    <FileUp className="w-5 h-5 mr-2" />
                    Convert to PDF
                  </>
                )}
              </Button>

              {!isAuthenticated && (
                <div className="text-center pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-2">Want more conversions?</p>
                  <Button variant="outline" asChild>
                    <a href={getLoginUrl()}>Sign in for 5 free conversions/month</a>
                  </Button>
                </div>
              )}

              {isAuthenticated && user?.subscriptionTier === "free" && (
                <div className="text-center pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-2">Need unlimited conversions?</p>
                  <Button variant="outline" asChild>
                    <Link href="/upgrade">Upgrade to Premium</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 bg-card/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-muted-foreground">Choose the plan that fits your workflow</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Guest Tier */}
            <Card className="bg-card border-2 border-border">
              <CardHeader>
                <CardTitle>Guest</CardTitle>
                <div className="text-4xl font-bold">$0</div>
                <CardDescription>No account required</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span>1 conversion to try</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span>Standard queue processing</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span>Secure file storage</span>
                  </li>
                </ul>
                <Button variant="outline" className="w-full" disabled>
                  Current Plan
                </Button>
              </CardContent>
            </Card>

            {/* Free Tier */}
            <Card className="bg-card border-2 border-border">
              <CardHeader>
                <CardTitle>Free Tier</CardTitle>
                <div className="text-4xl font-bold">$0</div>
                <CardDescription>/month</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span>5 conversions per month</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span>Standard queue processing</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span>Secure file storage</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span>Email notifications</span>
                  </li>
                </ul>
                <Button variant="outline" className="w-full" asChild>
                  <a href={getLoginUrl()}>Get Started Free</a>
                </Button>
              </CardContent>
            </Card>

            {/* Premium Tier */}
            <Card className="bg-card border-2 border-primary relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-sm font-semibold rounded-full">
                POPULAR
              </div>
              <CardHeader>
                <CardTitle className="flex items-center">
                  Premium
                  <Crown className="w-5 h-5 ml-2 text-primary" />
                </CardTitle>
                <div className="text-4xl font-bold">$29</div>
                <CardDescription>/month</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span className="font-semibold">Unlimited conversions</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span>Priority queue processing</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span>Batch file uploads</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span>Extended file storage</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span>Priority support</span>
                  </li>
                </ul>
                <Button className="w-full" asChild>
                  <Link href="/upgrade">Upgrade to Premium</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section - Moved to Bottom */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Engineered for Excellence</h2>
            <p className="text-xl text-muted-foreground">Technical features designed for professional workflows</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-card border-2 border-border">
              <CardHeader>
                <Zap className="w-12 h-12 text-primary mb-4" />
                <CardTitle>Lightning Fast</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Asynchronous queue processing with priority handling for premium users. Most conversions complete in under 30
                  seconds.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-2 border-border">
              <CardHeader>
                <Shield className="w-12 h-12 text-primary mb-4" />
                <CardTitle>Secure Storage</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Enterprise-grade S3 storage with automatic cleanup. Your files are encrypted and accessible only to you.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-2 border-border">
              <CardHeader>
                <TrendingUp className="w-12 h-12 text-primary mb-4" />
                <CardTitle>Flexible Plans</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Start with 5 free conversions per month. Upgrade to premium for unlimited conversions and priority processing.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>© 2026 DWG Converter. Professional CAD conversion service.</p>
        </div>
      </footer>
    </div>
  );
}
