import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/modules/auth/AuthContext';
import {
  BarChart3,
  CalendarClock,
  Download,
  AlertTriangle,
  Loader2,
  Clock,
  History,
  Info
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface IdleAsset {
  id: number;
  name: string;
  asset_tag: string;
  acquisition_date: string;
  condition: string;
  category?: { name: string };
  department?: { name: string } | null;
}

interface RetiringAsset {
  id: number;
  name: string;
  asset_tag: string;
  acquisition_date: string;
  acquisition_cost: string;
  condition: string;
  category?: { name: string };
  department?: { name: string } | null;
}

interface BookingDensityRow {
  day_of_week: number;
  hour_of_day: number;
  booking_count: number;
}

interface MaintenanceCategory {
  category_name: string;
  count: number;
}

interface DepartmentAllocation {
  department_name: string;
  count: number;
}

interface MostUsedAsset {
  id: number;
  name: string;
  asset_tag: string;
  bookings_count?: number;
  allocations_count?: number;
}

interface AnalyticsData {
  booking_density: BookingDensityRow[];
  idle_assets: IdleAsset[];
  retiring_assets: RetiringAsset[];
  maintenance_by_category: MaintenanceCategory[];
  department_allocations: DepartmentAllocation[];
  most_used_bookable: MostUsedAsset[];
  most_used_allocated: MostUsedAsset[];
}

export default function ReportsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [idleDays, setIdleDays] = useState('30');
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const fetchAnalytics = async (days: string) => {
    try {
      const response = await api.get(`/dashboard/analytics?days=${days}`);
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch reports analytics data', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(idleDays);
  }, [idleDays]);

  const handleIdleDaysChange = (value: string) => {
    setIdleDays(value);
    setIsLoading(true);
  };

  const handleExport = async (type: string) => {
    setIsExporting(type);
    try {
      const response = await api.get(`/reports/export?type=${type}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export report', error);
    } finally {
      setIsExporting(null);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Aggregating reporting metrics...</p>
        </div>
      </div>
    );
  }

  // Heatmap rendering helpers
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Map density query response to a 2D array
  const heatmapGrid = Array.from({ length: 7 }, () => Array(24).fill(0));
  let maxBookingCount = 1;

  if (data?.booking_density) {
    data.booking_density.forEach((row) => {
      // DAYOFWEEK returns 1 (Sun) to 7 (Sat)
      const dayIdx = row.day_of_week - 1;
      const hourIdx = row.hour_of_day;
      if (dayIdx >= 0 && dayIdx < 7 && hourIdx >= 0 && hourIdx < 24) {
        heatmapGrid[dayIdx][hourIdx] = row.booking_count;
        if (row.booking_count > maxBookingCount) {
          maxBookingCount = row.booking_count;
        }
      }
    });
  }

  // Tailored color scale generator for heatmap
  const getCellColor = (count: number) => {
    if (count === 0) return 'bg-slate-800/10 border-border/20';
    const pct = count / maxBookingCount;
    if (pct < 0.25) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/10';
    if (pct < 0.5) return 'bg-emerald-500/40 text-emerald-200 border-emerald-500/20';
    if (pct < 0.75) return 'bg-emerald-500/60 text-emerald-100 border-emerald-500/30';
    return 'bg-emerald-500/80 text-white border-emerald-400/40';
  };

  // Find max count values for custom progress bars
  const maxMaintenance = data?.maintenance_by_category?.length 
    ? Math.max(...data.maintenance_by_category.map(c => c.count)) 
    : 1;

  const maxDeptAlloc = data?.department_allocations?.length 
    ? Math.max(...data.department_allocations.map(c => c.count)) 
    : 1;

  return (
    <div className="space-y-8 pb-10">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">
          Reports & Analytics
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Internal asset utilization audits, maintenance indicators, and csv exports.
        </p>
      </div>

      {/* Grid: Exporter and Utilization lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Export Controllers */}
        <Card className="border border-border/60 bg-gradient-to-br from-card/60 to-card/20 shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white">Export Engine</CardTitle>
            <CardDescription>Stream fresh spreadsheet records from base databases</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-3">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-normal">
                Exports yield CSV files containing complete relational details including assignee emails, tags, and timestamps.
              </p>
            </div>
            
            <Button
              className="w-full justify-between p-5 h-auto rounded-2xl border border-border/40 hover:bg-slate-800/20 transition-all font-medium text-sm"
              variant="outline"
              disabled={isExporting !== null}
              onClick={() => handleExport('allocations')}
            >
              <span className="flex items-center gap-3">
                <CalendarClock className="h-5 w-5 text-purple-400" />
                Allocations History
              </span>
              {isExporting === 'allocations' ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <Download className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>

            <Button
              className="w-full justify-between p-5 h-auto rounded-2xl border border-border/40 hover:bg-slate-800/20 transition-all font-medium text-sm"
              variant="outline"
              disabled={isExporting !== null}
              onClick={() => handleExport('maintenance')}
            >
              <span className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-amber-400" />
                Maintenance Records
              </span>
              {isExporting === 'maintenance' ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <Download className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>

            <Button
              className="w-full justify-between p-5 h-auto rounded-2xl border border-border/40 hover:bg-slate-800/20 transition-all font-medium text-sm"
              variant="outline"
              disabled={isExporting !== null}
              onClick={() => handleExport('audits')}
            >
              <span className="flex items-center gap-3">
                <History className="h-5 w-5 text-emerald-400" />
                Audit Logs
              </span>
              {isExporting === 'audits' ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <Download className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Most Used Assets */}
        <Card className="border border-border/60 bg-gradient-to-br from-card/60 to-card/20 shadow-soft lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white">Utilization Trends</CardTitle>
            <CardDescription>Most frequently booked and allocated organization items</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="bookable" className="w-full">
              <div className="px-8 border-b border-border/40">
                <TabsList className="bg-transparent gap-6 p-0 h-auto rounded-none border-b-0">
                  <TabsTrigger 
                    value="bookable" 
                    className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary border-b-2 border-transparent px-1 py-3 text-sm rounded-none text-muted-foreground"
                  >
                    Shared Bookable Resources
                  </TabsTrigger>
                  <TabsTrigger 
                    value="allocated" 
                    className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary border-b-2 border-transparent px-1 py-3 text-sm rounded-none text-muted-foreground"
                  >
                    Direct Employee Allocations
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="bookable" className="p-0 mt-0">
                {!data || data.most_used_bookable.length === 0 ? (
                  <div className="p-10 text-center text-muted-foreground text-sm">No bookable usage logged.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border/40 hover:bg-transparent">
                        <TableHead className="pl-8 font-bold text-xs uppercase tracking-wider">Asset Name</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider">Asset Tag</TableHead>
                        <TableHead className="pr-8 text-right font-bold text-xs uppercase tracking-wider">Total Sessions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.most_used_bookable.map((item) => (
                        <TableRow key={item.id} className="border-b border-border/20 hover:bg-slate-800/5">
                          <TableCell className="pl-8 font-semibold text-sm text-white">{item.name}</TableCell>
                          <TableCell className="font-mono text-xs text-primary">{item.asset_tag}</TableCell>
                          <TableCell className="pr-8 text-right">
                            <Badge className="bg-cyan-500/10 border-cyan-500/20 text-cyan-400 rounded-full font-bold">
                              {item.bookings_count} Bookings
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
              <TabsContent value="allocated" className="p-0 mt-0">
                {!data || data.most_used_allocated.length === 0 ? (
                  <div className="p-10 text-center text-muted-foreground text-sm">No allocation usage logged.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border/40 hover:bg-transparent">
                        <TableHead className="pl-8 font-bold text-xs uppercase tracking-wider">Asset Name</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider">Asset Tag</TableHead>
                        <TableHead className="pr-8 text-right font-bold text-xs uppercase tracking-wider">Allocation Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.most_used_allocated.map((item) => (
                        <TableRow key={item.id} className="border-b border-border/20 hover:bg-slate-800/5">
                          <TableCell className="pl-8 font-semibold text-sm text-white">{item.name}</TableCell>
                          <TableCell className="font-mono text-xs text-primary">{item.asset_tag}</TableCell>
                          <TableCell className="pr-8 text-right">
                            <Badge className="bg-purple-500/10 border-purple-500/20 text-purple-400 rounded-full font-bold">
                              {item.allocations_count} Cycles
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Booking Heatmap */}
      <Card className="border border-border/60 bg-gradient-to-br from-card/60 to-card/20 shadow-soft overflow-hidden">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-emerald-400" />
                Resource Booking Heatmap
              </CardTitle>
              <CardDescription>Aggregation of bookings by weekday and hour to determine peak usage windows</CardDescription>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-800 border border-border/20 inline-block"></span> 0</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500/20 inline-block"></span> Light</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500/50 inline-block"></span> Moderate</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500/80 inline-block"></span> Peak</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto select-none no-scrollbar">
          <div className="min-w-[800px] pb-4">
            {/* Header: Hours */}
            <div className="grid mb-2 text-center text-[10px] font-bold text-muted-foreground/60 uppercase" style={{ display: 'grid', gridTemplateColumns: '60px repeat(24, minmax(0, 1fr))', gap: '4px' }}>
              <div className="text-left font-sans pl-2">Day</div>
              {hours.map((h) => (
                <div key={h} className="font-mono">
                  {h.toString().padStart(2, '0')}
                </div>
              ))}
            </div>

            {/* Grid rows */}
            <div className="space-y-1.5">
              {dayNames.map((day, dayIdx) => (
                <div key={day} className="grid items-center" style={{ display: 'grid', gridTemplateColumns: '60px repeat(24, minmax(0, 1fr))', gap: '6px' }}>
                  {/* Row Label */}
                  <div className="text-xs font-bold text-muted-foreground truncate font-sans pl-2">
                    {day.substring(0, 3)}
                  </div>
                  
                  {/* Grid cells */}
                  {hours.map((hour) => {
                    const count = heatmapGrid[dayIdx][hour];
                    return (
                      <div
                        key={hour}
                        className={`aspect-square rounded-lg border flex items-center justify-center text-[10px] font-mono font-bold transition-all duration-200 hover:scale-110 hover:z-10 cursor-pointer ${getCellColor(count)}`}
                        title={`${day}, ${hour.toString().padStart(2, '0')}:00 - ${count} active bookings`}
                      >
                        {count > 0 ? count : ''}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid: Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Maintenance frequency by Category */}
        <Card className="border border-border/60 bg-gradient-to-br from-card/60 to-card/20 shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white">Maintenance Indicators</CardTitle>
            <CardDescription>Frequency of repair requests grouped by category</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!data || data.maintenance_by_category.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground text-sm">No maintenance history registered.</div>
            ) : (
              data.maintenance_by_category.map((c, idx) => {
                const percentage = Math.max(8, (c.count / maxMaintenance) * 100);
                return (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold text-white">{c.category_name}</span>
                      <span className="font-bold text-amber-400">{c.count} Requests</span>
                    </div>
                    <div className="w-full bg-slate-800/40 rounded-full h-3 overflow-hidden border border-border/20">
                      <div 
                        className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Department allocations summary */}
        <Card className="border border-border/60 bg-gradient-to-br from-card/60 to-card/20 shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white">Department Allocation Density</CardTitle>
            <CardDescription>Current active allocation counts by division</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!data || data.department_allocations.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground text-sm">No active department allocations.</div>
            ) : (
              data.department_allocations.map((d, idx) => {
                const percentage = Math.max(8, (d.count / maxDeptAlloc) * 100);
                return (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold text-white">{d.department_name}</span>
                      <span className="font-bold text-purple-400">{d.count} Active Assets</span>
                    </div>
                    <div className="w-full bg-slate-800/40 rounded-full h-3 overflow-hidden border border-border/20">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-violet-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Grid: Retiring and Idle items tables */}
      <Tabs defaultValue="idle" className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border/40 mb-6 gap-4 pb-1">
          <TabsList className="bg-transparent gap-6 p-0 h-auto rounded-none border-b-0">
            <TabsTrigger 
              value="idle" 
              className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary border-b-2 border-transparent px-1 py-3 text-sm font-bold rounded-none text-muted-foreground"
            >
              Idle Assets Tracker
            </TabsTrigger>
            <TabsTrigger 
              value="retiring" 
              className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary border-b-2 border-transparent px-1 py-3 text-sm font-bold rounded-none text-muted-foreground"
            >
              Nearing Retirement ({data?.retiring_assets?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="idle" className="mt-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-semibold">Idle period:</span>
              <Select value={idleDays} onValueChange={handleIdleDaysChange}>
                <SelectTrigger className="w-[120px] rounded-xl h-9 border-border/80 text-xs">
                  <SelectValue placeholder="Select days" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="30" className="text-xs">30 Days</SelectItem>
                  <SelectItem value="60" className="text-xs">60 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        </div>

        {/* Tab 1: Idle Assets */}
        <TabsContent value="idle" className="mt-0">
          <Card className="border border-border/60 shadow-soft overflow-hidden">
            <CardContent className="p-0">
              {!data || data.idle_assets.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground text-sm">
                  No idle assets detected for the selected period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border/40 hover:bg-transparent">
                        <TableHead className="pl-8 font-bold text-xs uppercase tracking-wider text-muted-foreground/80">Asset Details</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80">Asset Tag</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80">Category</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80">Assigned Department</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80">Condition</TableHead>
                        <TableHead className="pr-8 text-right font-bold text-xs uppercase tracking-wider text-muted-foreground/80">Acquisition Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.idle_assets.map((asset) => (
                        <TableRow key={asset.id} className="border-b border-border/20 hover:bg-slate-800/10">
                          <TableCell className="pl-8 font-semibold text-sm text-white">{asset.name}</TableCell>
                          <TableCell className="font-mono text-xs text-primary">{asset.asset_tag}</TableCell>
                          <TableCell className="text-sm text-white">{asset.category?.name || 'N/A'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{asset.department?.name || 'Unassigned'}</TableCell>
                          <TableCell className="text-sm">
                            <Badge 
                              className={
                                asset.condition === 'Good' 
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                  : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                              }
                            >
                              {asset.condition}
                            </Badge>
                          </TableCell>
                          <TableCell className="pr-8 text-right text-sm text-muted-foreground">
                            {new Date(asset.acquisition_date).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Nearing Retirement */}
        <TabsContent value="retiring" className="mt-0">
          <Card className="border border-border/60 shadow-soft overflow-hidden">
            <CardContent className="p-0">
              {!data || data.retiring_assets.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground text-sm">
                  No assets are currently nearing retirement.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border/40 hover:bg-transparent">
                        <TableHead className="pl-8 font-bold text-xs uppercase tracking-wider text-muted-foreground/80">Asset Details</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80">Asset Tag</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80">Category</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80">Assigned Department</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80">Original Cost</TableHead>
                        <TableHead className="pr-8 text-right font-bold text-xs uppercase tracking-wider text-muted-foreground/80">Acquisition Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.retiring_assets.map((asset) => (
                        <TableRow key={asset.id} className="border-b border-border/20 hover:bg-slate-800/10">
                          <TableCell className="pl-8 font-semibold text-sm text-white flex items-center gap-2">
                            {asset.name}
                            <span title="Asset is > 3 years old">
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-primary">{asset.asset_tag}</TableCell>
                          <TableCell className="text-sm text-white">{asset.category?.name || 'N/A'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{asset.department?.name || 'Unassigned'}</TableCell>
                          <TableCell className="text-sm font-semibold text-white">
                            ₹{parseFloat(asset.acquisition_cost).toLocaleString()}
                          </TableCell>
                          <TableCell className="pr-8 text-right text-sm text-muted-foreground">
                            {new Date(asset.acquisition_date).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
