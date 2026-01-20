import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Check, Crown, FileUp, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function Upgrade() {
  const { user, loading: authLoading } = useAuth();

  const createCheckoutMutation = trpc.subscription.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        toast.info("Redirecting to checkout...");
        window.open(data.checkoutUrl, "_blank");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to start checkout");
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (user?.subscriptionTier === "premium") {
    return (
      <div className="min-h-screen bg-background">
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
            <Button asChild variant="default">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto text-center">
            <Crown className="w-16 h-16 text-yellow-400 mx-auto mb-6" />
            <h1 className="text-4xl font-bold mb-4">You're Already Premium!</h1>
            <p className="text-xl text-muted-foreground mb-8">
              You have unlimited access to all features. Continue converting your CAD files without limits.
            </p>
            <Button asChild size="lg">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
          <Button asChild variant="ghost">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4">Upgrade to Premium</h1>
            <p className="text-xl text-muted-foreground">
              Unlock unlimited conversions and priority processing
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Current Plan */}
            <Card className="bg-card border-2 border-border">
              <CardHeader>
                <CardTitle className="text-2xl">Free Tier</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-primary mr-3" />
                    <span>5 conversions per month</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-primary mr-3" />
                    <span>Standard queue processing</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-primary mr-3" />
                    <span>Secure file storage</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-primary mr-3" />
                    <span>Email notifications</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Premium Plan */}
            <Card className="bg-card border-2 border-primary relative overflow-hidden shadow-lg shadow-primary/20">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 text-sm font-semibold">
                RECOMMENDED
              </div>
              <CardHeader>
                <CardTitle className="text-2xl flex items-center">
                  <Crown className="w-6 h-6 text-yellow-400 mr-2" />
                  Premium
                </CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$29</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-primary mr-3" />
                    <span className="font-semibold">Unlimited conversions</span>
                  </li>
                  <li className="flex items-center">
                    <Zap className="w-5 h-5 text-accent mr-3" />
                    <span className="font-semibold">Priority queue processing</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-primary mr-3" />
                    <span>Batch file uploads</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-primary mr-3" />
                    <span>Extended file storage</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="w-5 h-5 text-primary mr-3" />
                    <span>Priority support</span>
                  </li>
                </ul>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => createCheckoutMutation.mutate()}
                  disabled={createCheckoutMutation.isPending}
                >
                  {createCheckoutMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Crown className="w-5 h-5 mr-2" />
                      Upgrade Now
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Benefits Section */}
          <Card className="bg-card border-2 border-border">
            <CardHeader>
              <CardTitle>Why Upgrade to Premium?</CardTitle>
              <CardDescription>Get the most out of your CAD conversion workflow</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Faster Processing</h3>
                  <p className="text-sm text-muted-foreground">
                    Premium users get priority in the conversion queue, ensuring your files are processed first.
                  </p>
                </div>

                <div>
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                    <FileUp className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="font-semibold mb-2">No Limits</h3>
                  <p className="text-sm text-muted-foreground">
                    Convert as many files as you need without worrying about monthly quotas or restrictions.
                  </p>
                </div>

                <div>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Crown className="w-6 h-6 text-yellow-400" />
                  </div>
                  <h3 className="font-semibold mb-2">Premium Support</h3>
                  <p className="text-sm text-muted-foreground">
                    Get priority email support and faster response times for any technical issues.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* FAQ */}
          <div className="mt-12 text-center text-sm text-muted-foreground">
            <p>
              Cancel anytime. No questions asked. Test with card number <code className="bg-muted px-2 py-1 rounded">4242 4242 4242 4242</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
