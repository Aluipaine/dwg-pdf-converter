import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { FileUp, Users, Activity, TrendingUp, Clock, CheckCircle, XCircle, Loader2, Crown, Shield } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  const { data: stats } = trpc.admin.getStats.useQuery();
  const { data: users } = trpc.admin.getUsers.useQuery({ limit: 50, offset: 0 });
  const { data: conversions } = trpc.admin.getConversions.useQuery({ limit: 50, offset: 0 });
  const { data: analytics } = trpc.admin.getAnalytics.useQuery({});

  const updateRoleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("User role updated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update user role");
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (user?.role !== "admin") {
    navigate("/dashboard");
    return null;
  }

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
            <span className="text-sm text-muted-foreground ml-4">Admin Panel</span>
          </div>

          <div className="flex items-center space-x-4">
            <Button asChild variant="ghost">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <span className="text-sm text-muted-foreground flex items-center">
              <Shield className="w-4 h-4 mr-1" />
              {user?.name}
            </span>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-card border-2 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{users?.length || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-2 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <Activity className="w-4 h-4 mr-2" />
                Total Conversions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.conversions?.total || 0}</div>
              <div className="text-sm text-muted-foreground mt-1">
                <span className="text-green-400">{stats?.conversions?.completed || 0} completed</span>
                {" • "}
                <span className="text-red-400">{stats?.conversions?.failed || 0} failed</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-2 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Queue Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.queue?.active || 0}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {stats?.queue?.total_pending || 0} pending
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-2 border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <TrendingUp className="w-4 h-4 mr-2" />
                Avg Processing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {analytics?.avgProcessingTimeMs ? `${(analytics.avgProcessingTimeMs / 1000).toFixed(1)}s` : "N/A"}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {analytics?.totalFileSize ? `${(analytics.totalFileSize / 1024 / 1024).toFixed(1)} MB total` : ""}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different admin sections */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="conversions">Conversions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="bg-card border-2 border-border">
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage user accounts and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name || "N/A"}</TableCell>
                        <TableCell>{u.email || "N/A"}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                            {u.subscriptionTier === "premium" && <Crown className="w-3 h-3 mr-1" />}
                            {u.subscriptionTier}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                              u.role === "admin" ? "bg-accent/10 text-accent" : "bg-secondary text-secondary-foreground"
                            }`}
                          >
                            {u.role}
                          </span>
                        </TableCell>
                        <TableCell>{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {u.role !== "admin" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateRoleMutation.mutate({ userId: u.id, role: "admin" })}
                              disabled={updateRoleMutation.isPending}
                            >
                              Make Admin
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Conversions Tab */}
          <TabsContent value="conversions">
            <Card className="bg-card border-2 border-border">
              <CardHeader>
                <CardTitle>Recent Conversions</CardTitle>
                <CardDescription>Monitor all conversion activity</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Processing Time</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conversions?.map((conv) => (
                      <TableRow key={conv.id}>
                        <TableCell className="font-medium">{conv.originalFileName}</TableCell>
                        <TableCell>{conv.userId}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                              conv.status === "completed"
                                ? "bg-green-400/10 text-green-400"
                                : conv.status === "failed"
                                ? "bg-red-400/10 text-red-400"
                                : conv.status === "processing"
                                ? "bg-blue-400/10 text-blue-400"
                                : "bg-yellow-400/10 text-yellow-400"
                            }`}
                          >
                            {conv.status === "completed" && <CheckCircle className="w-3 h-3 mr-1" />}
                            {conv.status === "failed" && <XCircle className="w-3 h-3 mr-1" />}
                            {conv.status === "processing" && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                            {conv.status === "pending" && <Clock className="w-3 h-3 mr-1" />}
                            {conv.status}
                          </span>
                        </TableCell>
                        <TableCell>{(conv.fileSize / 1024 / 1024).toFixed(2)} MB</TableCell>
                        <TableCell>{conv.processingTimeMs ? `${(conv.processingTimeMs / 1000).toFixed(1)}s` : "N/A"}</TableCell>
                        <TableCell>{new Date(conv.createdAt).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-card border-2 border-border">
                <CardHeader>
                  <CardTitle>Conversion Statistics</CardTitle>
                  <CardDescription>Overall performance metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Conversions</span>
                      <span className="text-2xl font-bold">{analytics?.totalConversions || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Average Processing Time</span>
                      <span className="text-2xl font-bold">
                        {analytics?.avgProcessingTimeMs ? `${(analytics.avgProcessingTimeMs / 1000).toFixed(1)}s` : "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Data Processed</span>
                      <span className="text-2xl font-bold">
                        {analytics?.totalFileSize ? `${(analytics.totalFileSize / 1024 / 1024 / 1024).toFixed(2)} GB` : "N/A"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-2 border-border">
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                  <CardDescription>Current system status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Active Workers</span>
                      <span className="text-2xl font-bold text-green-400">{stats?.queue?.active || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Pending Jobs</span>
                      <span className="text-2xl font-bold text-yellow-400">{stats?.queue?.total_pending || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Success Rate</span>
                      <span className="text-2xl font-bold text-green-400">
                        {stats?.conversions?.total
                          ? `${((stats.conversions.completed / stats.conversions.total) * 100).toFixed(1)}%`
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
