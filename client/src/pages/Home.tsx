import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { FileUp, Zap, Shield, TrendingUp, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <FileUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">DWG Converter</span>
          </div>
          
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-muted-foreground">Welcome, {user?.name}</span>
                <Button asChild variant="default">
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <a href={getLoginUrl()}>Sign In</a>
                </Button>
                <Button asChild variant="default">
                  <a href={getLoginUrl()}>Get Started</a>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            {/* Technical dimension marker */}
            <div className="inline-block mb-6 px-4 py-2 border border-primary/30 rounded-full bg-primary/5">
              <span className="text-sm font-semibold text-primary">PROFESSIONAL CAD CONVERSION</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
              Convert <span className="text-primary">DWG to PDF</span>
              <br />
              with Precision
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Professional-grade CAD file conversion service. Upload your DWG or DXF files and receive high-quality PDF outputs in seconds. Built for architects, engineers, and designers.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {isAuthenticated ? (
                <Button asChild size="lg" className="text-lg px-8 py-6">
                  <Link href="/dashboard">
                    Go to Dashboard <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
              ) : (
                <Button asChild size="lg" className="text-lg px-8 py-6">
                  <a href={getLoginUrl()}>
                    Start Converting <ArrowRight className="ml-2 w-5 h-5" />
                  </a>
                </Button>
              )}
              
              <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
                <a href="#features">Learn More</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Engineered for Excellence</h2>
            <p className="text-xl text-muted-foreground">
              Technical features designed for professional workflows
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="bg-card border-2 border-border hover:border-primary/50 transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Lightning Fast</CardTitle>
                <CardDescription className="text-base">
                  Asynchronous queue processing with priority handling for premium users. Most conversions complete in under 30 seconds.
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="bg-card border-2 border-border hover:border-primary/50 transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-accent" />
                </div>
                <CardTitle>Secure Storage</CardTitle>
                <CardDescription className="text-base">
                  Enterprise-grade S3 storage with automatic cleanup. Your files are encrypted and accessible only to you.
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="bg-card border-2 border-border hover:border-primary/50 transition-all">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Flexible Plans</CardTitle>
                <CardDescription className="text-base">
                  Start with 5 free conversions per month. Upgrade to premium for unlimited conversions and priority processing.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-muted-foreground">
              Choose the plan that fits your workflow
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Tier */}
            <Card className="bg-card border-2 border-border">
              <CardHeader>
                <CardTitle className="text-2xl">Free Tier</CardTitle>
                <div className="mt-4">
                  <span className="text-5xl font-bold">$0</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <div className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center mr-3">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                    </div>
                    <span>5 conversions per month</span>
                  </li>
                  <li className="flex items-center">
                    <div className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center mr-3">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                    </div>
                    <span>Standard queue processing</span>
                  </li>
                  <li className="flex items-center">
                    <div className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center mr-3">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                    </div>
                    <span>Secure file storage</span>
                  </li>
                  <li className="flex items-center">
                    <div className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center mr-3">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                    </div>
                    <span>Email notifications</span>
                  </li>
                </ul>
                <Button asChild variant="outline" className="w-full mt-6" size="lg">
                  <a href={getLoginUrl()}>Get Started Free</a>
                </Button>
              </CardContent>
            </Card>
            
            {/* Premium Tier */}
            <Card className="bg-card border-2 border-primary relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 text-sm font-semibold">
                POPULAR
              </div>
              <CardHeader>
                <CardTitle className="text-2xl">Premium</CardTitle>
                <div className="mt-4">
                  <span className="text-5xl font-bold">$29</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center mr-3">
                      <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>
                    </div>
                    <span className="font-semibold">Unlimited conversions</span>
                  </li>
                  <li className="flex items-center">
                    <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center mr-3">
                      <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>
                    </div>
                    <span className="font-semibold">Priority queue processing</span>
                  </li>
                  <li className="flex items-center">
                    <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center mr-3">
                      <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>
                    </div>
                    <span>Batch file uploads</span>
                  </li>
                  <li className="flex items-center">
                    <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center mr-3">
                      <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>
                    </div>
                    <span>Extended file storage</span>
                  </li>
                  <li className="flex items-center">
                    <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center mr-3">
                      <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>
                    </div>
                    <span>Priority support</span>
                  </li>
                </ul>
                <Button asChild className="w-full mt-6" size="lg">
                  <a href={getLoginUrl()}>Upgrade to Premium</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 mt-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                <FileUp className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">DWG Converter</span>
            </div>
            
            <p className="text-sm text-muted-foreground">
              © 2026 DWG Converter. Professional CAD conversion service.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
