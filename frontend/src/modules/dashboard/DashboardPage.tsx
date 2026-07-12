import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/modules/auth/AuthContext';
import {
  FolderOpen,
  CheckCircle,
  AlertOctagon,
  Wrench,
  CalendarDays,
  ArrowRightLeft,
  CalendarClock,
  AlertTriangle,
  PlusCircle,
  Hammer,
  CalendarRange,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

interface OverdueAllocation {
  id: number;
  allocated_date: string;
  expected_return: string;
  asset: {
    name: string;
    asset_tag: string;
  };
  user: {
    name: string;
    email: string;
  };
  department: {
    name: string;
  } | null;
}

interface KpiData {
  total_assets: number;
  available_assets: number;
  allocated_assets: number;
  maintenance_assets: number;
  active_bookings: number;
  pending_transfers: number;
  upcoming_returns: number;
  overdue_returns_count: number;
  overdue_returns: OverdueAllocation[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchKpis = async () => {
    try {
      const response = await api.get('/dashboard/kpis');
      setKpis(response.data);
    } catch (error) {
      console.error('Failed to fetch KPI dashboard data', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchKpis();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchKpis();
  };

  const getDaysOverdue = (expectedDate: string) => {
    const expected = new Date(expectedDate);
    const today = new Date();
    // Clear time portion for date comparisons
    expected.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - expected.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };



  const cards = kpis ? [
    {
      title: 'Total Assets',
      value: kpis.total_assets,
      description: 'Registered hardware & equipment',
      icon: FolderOpen,
      gradient: 'from-blue-500/10 to-indigo-500/5 border-blue-500/20 text-blue-400',
    },
    {
      title: 'Assets Available',
      value: kpis.available_assets,
      description: 'Ready to be booked or allocated',
      icon: CheckCircle,
      gradient: 'from-emerald-500/10 to-teal-500/5 border-emerald-500/20 text-emerald-400',
    },
    {
      title: 'Assets Allocated',
      value: kpis.allocated_assets,
      description: 'Assigned to staff or departments',
      icon: CalendarClock,
      gradient: 'from-purple-500/10 to-violet-500/5 border-purple-500/20 text-purple-400',
    },
    {
      title: 'Under Maintenance',
      value: kpis.maintenance_assets,
      description: 'Currently undergoing repairs',
      icon: Wrench,
      gradient: 'from-amber-500/10 to-orange-500/5 border-amber-500/20 text-amber-400',
    },
    {
      title: 'Active Bookings',
      value: kpis.active_bookings,
      description: 'Shared space & room sessions',
      icon: CalendarDays,
      gradient: 'from-cyan-500/10 to-blue-500/5 border-cyan-500/20 text-cyan-400',
    },
    {
      title: 'Pending Transfers',
      value: kpis.pending_transfers,
      description: 'Awaiting manager approval',
      icon: ArrowRightLeft,
      gradient: 'from-pink-500/10 to-rose-500/5 border-pink-500/20 text-pink-400',
    },
    {
      title: 'Upcoming Returns',
      value: kpis.upcoming_returns,
      description: 'Allocations due back soon',
      icon: CalendarRange,
      gradient: 'from-sky-500/10 to-blue-500/5 border-sky-500/20 text-sky-400',
    },
    {
      title: 'Overdue Returns',
      value: kpis.overdue_returns_count,
      description: 'Past expected return date',
      icon: AlertOctagon,
      gradient: kpis.overdue_returns_count > 0 
        ? 'from-rose-500/15 to-red-500/10 border-rose-500/30 text-rose-400' 
        : 'from-slate-500/10 to-slate-500/5 border-border text-slate-400',
    },
  ] : [];

  const isAdminOrManager = user?.role === 'Admin' || user?.role === 'Asset Manager';

  return (
    <div className="space-y-8 pb-10">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">
            Welcome back, {user?.name || 'User'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Role: <span className="font-semibold text-primary">{user?.role}</span> • Real-time operational snapshot.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="rounded-2xl border-border/80 text-muted-foreground hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, idx) => (
            <Card 
              key={idx} 
              className="border bg-card/40 backdrop-blur-md shadow-soft overflow-hidden"
            >
              <CardContent className="p-6 relative">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-3 w-20 bg-muted/40" />
                    <Skeleton className="h-8 w-16 bg-muted/40" />
                  </div>
                  <Skeleton className="h-10 w-10 rounded-2xl bg-muted/40" />
                </div>
                <Skeleton className="h-3 w-full mt-4 bg-muted/40" />
              </CardContent>
            </Card>
          ))
        ) : (
          cards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <Card 
                key={idx} 
                className={`border bg-card/40 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:bg-card/60 shadow-soft overflow-hidden group`}
              >
                <CardContent className="p-6 relative">
                  {/* Decorative background glow */}
                  <div className={`absolute top-0 right-0 w-24 h-24 rounded-full bg-gradient-to-br filter blur-2xl opacity-10 transition-all duration-300 group-hover:scale-125`} />
                  
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{card.title}</p>
                      <p className="text-3xl font-extrabold tracking-tight text-white">{card.value}</p>
                    </div>
                    <div className={`p-3 rounded-2xl border ${card.gradient}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground/80 mt-4 leading-normal">{card.description}</p>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Quick Actions Panel */}
      <Card className="border border-border/60 bg-gradient-to-br from-card/80 to-card/40 shadow-soft">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold text-white font-sans">Quick Operations</CardTitle>
          <CardDescription>Launch direct workflows based on authorization</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {isAdminOrManager && (
            <Button
              variant="outline"
              className="flex items-center justify-start space-x-3 p-6 h-auto rounded-3xl border-primary/20 hover:border-primary/50 hover:bg-primary/5 group transition-all duration-200"
              onClick={() => navigate('/assets')}
            >
              <PlusCircle className="h-6 w-6 text-primary shrink-0 group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <p className="font-semibold text-sm text-white group-hover:text-primary transition-colors">Register Asset</p>
                <p className="text-xs text-muted-foreground mt-0.5">Add hardware and setup properties</p>
              </div>
            </Button>
          )}
          <Button
            variant="outline"
            className="flex items-center justify-start space-x-3 p-6 h-auto rounded-3xl border-cyan-500/20 hover:border-cyan-500/50 hover:bg-cyan-500/5 group transition-all duration-200"
            onClick={() => navigate('/bookings')}
          >
            <CalendarRange className="h-6 w-6 text-cyan-400 shrink-0 group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <p className="font-semibold text-sm text-white group-hover:text-cyan-400 transition-colors">Book Resource</p>
              <p className="text-xs text-muted-foreground mt-0.5">Reserve shared rooms & projectors</p>
            </div>
          </Button>
          <Button
            variant="outline"
            className="flex items-center justify-start space-x-3 p-6 h-auto rounded-3xl border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/5 group transition-all duration-200"
            onClick={() => navigate('/maintenance')}
          >
            <Hammer className="h-6 w-6 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <p className="font-semibold text-sm text-white group-hover:text-amber-400 transition-colors">Request Maintenance</p>
              <p className="text-xs text-muted-foreground mt-0.5">Submit ticket for broken equipment</p>
            </div>
          </Button>
        </CardContent>
      </Card>

      {/* Overdue Returns Table */}
      <Card className="border border-border/60 shadow-soft overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-500 animate-pulse" />
                Overdue Returns Directory
              </CardTitle>
              <CardDescription>Allocated items currently held past expected return deadline</CardDescription>
            </div>
            <Badge variant="destructive" className="rounded-full px-3 py-1 font-semibold text-xs animate-pulse">
              {kpis?.overdue_returns_count || 0} Overdue
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/60 hover:bg-transparent">
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80 pl-8">Asset Details</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80">Asset Tag</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80">Current Holder</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80">Department</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80">Expected Return</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80 pr-8 text-right">Overdue By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <TableRow key={idx} className="border-b border-border/40">
                      <TableCell className="pl-8 py-4"><Skeleton className="h-4 w-28 bg-muted/40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 bg-muted/40" /></TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-24 bg-muted/40" />
                          <Skeleton className="h-3 w-32 bg-muted/40" />
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-4 w-16 bg-muted/40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24 bg-muted/40" /></TableCell>
                      <TableCell className="pr-8 text-right"><Skeleton className="h-6 w-16 ml-auto rounded-full bg-muted/40" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : !kpis || kpis.overdue_returns.length === 0 ? (
            <div className="p-10 text-center">
              <CheckCircle className="h-10 w-10 text-emerald-500/60 mx-auto mb-2" />
              <p className="text-sm font-semibold text-white">All Clear!</p>
              <p className="text-xs text-muted-foreground mt-1">No active allocations are currently overdue.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/60 hover:bg-transparent">
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80 pl-8">Asset Details</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80">Asset Tag</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80">Current Holder</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80">Department</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80">Expected Return</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80 pr-8 text-right">Overdue By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kpis.overdue_returns.map((allocation) => (
                    <TableRow key={allocation.id} className="border-b border-border/40 hover:bg-slate-800/10">
                      <TableCell className="font-semibold text-sm text-white pl-8">{allocation.asset.name}</TableCell>
                      <TableCell className="font-mono text-xs text-primary">{allocation.asset.asset_tag}</TableCell>
                      <TableCell className="text-sm">
                        <div>
                          <p className="font-medium text-white">{allocation.user.name}</p>
                          <p className="text-xs text-muted-foreground">{allocation.user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{allocation.department?.name || 'N/A'}</TableCell>
                      <TableCell className="text-sm font-semibold text-rose-500">
                        {new Date(allocation.expected_return).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </TableCell>
                      <TableCell className="pr-8 text-right">
                        <Badge variant="destructive" className="rounded-full bg-rose-500/20 border-rose-500/30 text-rose-400 font-bold px-2.5 py-0.5">
                          {getDaysOverdue(allocation.expected_return)} days
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
