import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/modules/auth/AuthContext';
import {
  ClipboardCheck,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Calendar,
  MapPin,
  Users,
  Shield,
  Loader2,
  Lock,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface Department {
  id: number;
  name: string;
}

interface Asset {
  id: number;
  name: string;
  asset_tag: string;
  location: string | null;
  status: string;
  condition: string;
}

interface AuditLine {
  id: number;
  audit_cycle_id: number;
  asset_id: number;
  expected_location: string | null;
  verification: 'Verified' | 'Missing' | 'Damaged';
  notes: string | null;
  audited_by: number | null;
  asset: Asset;
  audited_by_user?: UserProfile | null;
}

interface DiscrepancyReport {
  id: number;
  audit_cycle_id: number;
  generated_date: string;
}

interface AuditCycle {
  id: number;
  name: string;
  department_id: number | null;
  location: string | null;
  start_date: string;
  end_date: string;
  status: 'Open' | 'Closed';
  is_locked: boolean;
  department?: Department | null;
  auditors: UserProfile[];
  lines: AuditLine[];
  discrepancy_reports?: DiscrepancyReport[];
}

export default function AuditsPage() {
  const { user: currentUser } = useAuth();
  const isAdminOrManager = currentUser?.role === 'Admin' || currentUser?.role === 'Asset Manager';

  // Audit states
  const [cycles, setCycles] = useState<AuditCycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null);
  const [activeCycle, setActiveCycle] = useState<AuditCycle | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  
  // Loaders and messages
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search/filter
  const [searchQuery, setSearchQuery] = useState('');

  // Start cycle modal form state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    department_id: 'all',
    location: '',
    start_date: '',
    end_date: '',
    auditor_ids: [] as number[],
  });

  // Notes state per audit line id
  const [lineNotes, setLineNotes] = useState<Record<number, string>>({});

  // Trigger transient messages
  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };
  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 4000);
  };

  // Fetch all audit cycles
  const fetchCycles = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/audits');
      setCycles(response.data);
      if (response.data.length > 0 && !selectedCycleId) {
        setSelectedCycleId(response.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching audit cycles:', err);
      triggerError('Failed to load audit cycles.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch active cycle details
  const fetchCycleDetails = async (id: number) => {
    setIsDetailLoading(true);
    try {
      const response = await api.get(`/audits/${id}`);
      setActiveCycle(response.data);
      
      // Initialize notes
      const notesMap: Record<number, string> = {};
      response.data.lines.forEach((line: AuditLine) => {
        notesMap[line.id] = line.notes || '';
      });
      setLineNotes(notesMap);
    } catch (err) {
      console.error('Error loading cycle details:', err);
      triggerError('Failed to load audit cycle details.');
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Fetch departments and employees for create modal
  const fetchSetupData = async () => {
    try {
      const [deptRes, empRes] = await Promise.all([
        api.get('/departments-all'),
        api.get('/employees'),
      ]);
      setDepartments(deptRes.data);
      setEmployees(empRes.data.filter((e: UserProfile) => e.role !== 'Admin'));
    } catch (err) {
      console.error('Error fetching setup data:', err);
    }
  };

  useEffect(() => {
    fetchCycles();
    if (isAdminOrManager) {
      fetchSetupData();
    }
  }, []);

  useEffect(() => {
    if (selectedCycleId) {
      fetchCycleDetails(selectedCycleId);
    } else {
      setActiveCycle(null);
    }
  }, [selectedCycleId]);

  // Handle cycle creation
  const handleCreateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.start_date || !createForm.end_date || createForm.auditor_ids.length === 0) {
      triggerError('Please fill out all required fields and assign at least one auditor.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: createForm.name,
        department_id: createForm.department_id === 'all' ? null : Number(createForm.department_id),
        location: createForm.location || null,
        start_date: createForm.start_date,
        end_date: createForm.end_date,
        auditor_ids: createForm.auditor_ids,
      };

      const res = await api.post('/audits', payload);
      triggerSuccess(`Audit cycle "${payload.name}" started successfully.`);
      setIsCreateOpen(false);
      setCreateForm({
        name: '',
        department_id: 'all',
        location: '',
        start_date: '',
        end_date: '',
        auditor_ids: [],
      });
      
      // Refresh list and select the newly created cycle
      const response = await api.get('/audits');
      setCycles(response.data);
      setSelectedCycleId(res.data.id);
    } catch (err: any) {
      console.error('Error creating audit cycle:', err);
      triggerError(err.response?.data?.message || 'Failed to start audit cycle.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle auditor selection
  const toggleAuditor = (id: number) => {
    setCreateForm(prev => {
      const exists = prev.auditor_ids.includes(id);
      return {
        ...prev,
        auditor_ids: exists
          ? prev.auditor_ids.filter(aid => aid !== id)
          : [...prev.auditor_ids, id]
      };
    });
  };

  // Submit asset verification log
  const handleVerifyLine = async (lineId: number, status: 'Verified' | 'Missing' | 'Damaged') => {
    if (!activeCycle || activeCycle.is_locked) return;

    try {
      const notes = lineNotes[lineId] || '';
      await api.patch(`/audits/lines/${lineId}`, {
        verification: status,
        notes: notes,
      });

      // Update activeCycle locally
      setActiveCycle(prev => {
        if (!prev) return null;
        
        // Update the target line
        const updatedLines = prev.lines.map(line => 
          line.id === lineId 
            ? { ...line, verification: status, notes: notes, audited_by: currentUser?.id } 
            : line
        );

        // Recompute if discrepancy reports are needed or updated
        const hasFlagged = updatedLines.some(l => l.verification !== 'Verified');
        let reports = prev.discrepancy_reports || [];
        
        if (hasFlagged) {
          if (reports.length === 0) {
            reports = [{ id: Date.now(), audit_cycle_id: prev.id, generated_date: new Date().toISOString() }];
          }
        } else {
          reports = [];
        }

        return {
          ...prev,
          lines: updatedLines,
          discrepancy_reports: reports
        };
      });

      // Update local cycles list status if necessary
      triggerSuccess('Verification updated.');
    } catch (err: any) {
      console.error('Error verifying line:', err);
      triggerError(err.response?.data?.message || 'Failed to update asset verification.');
    }
  };

  // Save notes only
  const handleSaveNotes = async (lineId: number) => {
    if (!activeCycle || activeCycle.is_locked) return;

    const line = activeCycle.lines.find(l => l.id === lineId);
    if (!line) return;

    try {
      const notes = lineNotes[lineId] || '';
      await api.patch(`/audits/lines/${lineId}`, {
        verification: line.verification,
        notes: notes,
      });
      triggerSuccess('Notes updated.');
    } catch (err: any) {
      console.error('Error saving notes:', err);
      triggerError(err.response?.data?.message || 'Failed to save notes.');
    }
  };

  // Close audit cycle
  const handleCloseCycle = async () => {
    if (!activeCycle || activeCycle.is_locked) return;

    if (!window.confirm('Are you sure you want to close this audit cycle? This will lock all verification logs and permanently update asset statuses across the main register.')) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post(`/audits/${activeCycle.id}/close`);
      setActiveCycle(response.data);
      triggerSuccess('Audit cycle locked and asset updates cascaded successfully.');
      
      // Refresh cycles list
      const cyclesRes = await api.get('/audits');
      setCycles(cyclesRes.data);
    } catch (err: any) {
      console.error('Error closing cycle:', err);
      triggerError(err.response?.data?.message || 'Failed to close audit cycle.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter cycles based on search
  const filteredCycles = cycles.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.department?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.location || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Compute flagged lines count
  const flaggedLines = activeCycle?.lines.filter(l => l.verification !== 'Verified') || [];

  return (
    <div className="space-y-6">
      {/* Messages */}
      {successMsg && (
        <div className="fixed bottom-4 right-4 z-50 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-6 py-4 rounded-2xl shadow-lg flex items-center gap-3 backdrop-blur-md animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="fixed bottom-4 right-4 z-50 bg-rose-500/10 border border-rose-500/20 text-rose-400 px-6 py-4 rounded-2xl shadow-lg flex items-center gap-3 backdrop-blur-md animate-in fade-in slide-in-from-bottom-5">
          <AlertCircle className="h-5 w-5 text-rose-400" />
          <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <ClipboardCheck className="h-8 w-8 text-indigo-400" />
            Asset Audits
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Run periodic verification cycles, track auditor checklists, and compile auto-generated discrepancy reports.
          </p>
        </div>
        
        {isAdminOrManager && (
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-soft flex items-center gap-2 border-0"
          >
            <Plus className="h-4 w-4" /> Start Audit Cycle
          </Button>
        )}
      </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: Audit Cycles List */}
          <div className="lg:col-span-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input
                placeholder="Search audit cycles..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 rounded-2xl bg-card border-border/60 text-white focus-visible:ring-indigo-500"
              />
            </div>

            <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <Card key={idx} className="border-border/40 bg-card/40 rounded-3xl p-5 space-y-3">
                    <div className="flex justify-between">
                      <Skeleton className="h-5 w-24 bg-muted/40" />
                      <Skeleton className="h-5 w-16 rounded-full bg-muted/40" />
                    </div>
                    <Skeleton className="h-3 w-full bg-muted/40" />
                    <Skeleton className="h-3 w-1/2 bg-muted/40" />
                  </Card>
                ))
              ) : filteredCycles.length === 0 ? (
                <Card className="border-border/40 bg-card/40 rounded-3xl p-6 text-center">
                  <p className="text-muted-foreground text-sm">No audit cycles found.</p>
                </Card>
              ) : (
                filteredCycles.map(c => {
                  const isSelected = selectedCycleId === c.id;
                  return (
                    <Card
                      key={c.id}
                      onClick={() => setSelectedCycleId(c.id)}
                      className={cn(
                        "border-border/60 hover:border-border cursor-pointer transition-all duration-200 rounded-3xl bg-card relative overflow-hidden",
                        isSelected && "border-indigo-500 bg-indigo-500/5 shadow-soft ring-1 ring-indigo-500/30"
                      )}
                    >
                      <CardContent className="p-5 space-y-3">
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-white tracking-tight leading-snug line-clamp-1">
                            {c.name}
                          </h3>
                          <Badge
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-semibold border-0",
                              c.status === 'Open'
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-zinc-500/10 text-zinc-400"
                            )}
                          >
                            {c.status}
                          </Badge>
                        </div>

                        <div className="text-xs space-y-1.5 text-muted-foreground">
                          {c.department && (
                            <div className="flex items-center gap-1.5">
                              <Shield className="h-3.5 w-3.5" />
                              <span>Dept: {c.department.name}</span>
                            </div>
                          )}
                          {c.location && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5" />
                              <span>Location: {c.location}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>
                              {c.start_date} to {c.end_date}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" />
                            <span className="line-clamp-1">
                              Auditors: {c.auditors.map(a => a.name).join(', ')}
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="absolute right-3 bottom-3 text-indigo-400">
                            <ArrowRight className="h-4 w-4" />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: Active Cycle Verification Board */}
          <div className="lg:col-span-8">
            {isDetailLoading ? (
              <div className="space-y-6">
                <Card className="border-border/60 bg-card rounded-3xl overflow-hidden shadow-soft">
                  <CardContent className="p-6 md:p-8 space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-7 w-40 bg-muted/40" />
                          <Skeleton className="h-5 w-16 rounded-full bg-muted/40" />
                        </div>
                        <Skeleton className="h-4 w-48 bg-muted/40" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/60 bg-card rounded-3xl overflow-hidden shadow-soft">
                  <CardHeader className="p-6 border-b border-border/40">
                    <Skeleton className="h-6 w-36 bg-muted/40" />
                    <Skeleton className="h-4 w-full bg-muted/40 mt-2" />
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border/40 bg-muted/20">
                            <TableHead className="text-muted-foreground text-xs pl-6">Asset Tag & Name</TableHead>
                            <TableHead className="text-muted-foreground text-xs">Expected Location</TableHead>
                            <TableHead className="text-muted-foreground text-xs">Verification Log</TableHead>
                            <TableHead className="text-muted-foreground text-xs pr-6">Verify Action / Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Array.from({ length: 3 }).map((_, idx) => (
                            <TableRow key={idx} className="border-border/20">
                              <TableCell className="py-4 pl-6">
                                <div className="space-y-1">
                                  <Skeleton className="h-4 w-28 bg-muted/40" />
                                  <Skeleton className="h-3 w-16 bg-muted/40" />
                                </div>
                              </TableCell>
                              <TableCell className="py-4"><Skeleton className="h-4 w-20 bg-muted/40" /></TableCell>
                              <TableCell className="py-4"><Skeleton className="h-6 w-16 rounded-full bg-muted/40" /></TableCell>
                              <TableCell className="py-4 pr-6 flex gap-2"><Skeleton className="h-8 w-20 bg-muted/40" /><Skeleton className="h-8 w-20 bg-muted/40" /></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : activeCycle ? (
              <div className="space-y-6">
                
                {/* Active Cycle Header Card */}
                <Card className="border-border/60 bg-card rounded-3xl overflow-hidden shadow-soft">
                  <CardContent className="p-6 md:p-8 space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="text-2xl font-extrabold text-white tracking-tight">
                            {activeCycle.name}
                          </h2>
                          <Badge
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-xs font-semibold border-0",
                              activeCycle.status === 'Open'
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-zinc-500/10 text-zinc-400"
                            )}
                          >
                            {activeCycle.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Audit Duration: {activeCycle.start_date} to {activeCycle.end_date}</span>
                        </p>
                      </div>

                      {isAdminOrManager && activeCycle.status === 'Open' && (
                        <Button
                          onClick={handleCloseCycle}
                          disabled={isSubmitting}
                          className="rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-soft flex items-center gap-2 border-0"
                        >
                          {isSubmitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Lock className="h-4 w-4" />
                          )}
                          Close Audit Cycle
                        </Button>
                      )}

                      {activeCycle.is_locked && (
                        <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-xl font-medium text-xs flex items-center gap-1.5">
                          <Lock className="h-3.5 w-3.5" /> Locked & Cascaded
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-border/40">
                      <div>
                        <h4 className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Scope Parameters</h4>
                        <p className="text-white text-sm font-semibold mt-1">
                          {activeCycle.department?.name || 'All Departments'}
                          {activeCycle.location && ` — ${activeCycle.location}`}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Assigned Auditors</h4>
                        <p className="text-white text-sm font-semibold mt-1 line-clamp-1">
                          {activeCycle.auditors.map(a => a.name).join(', ')}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Progress Snapshot</h4>
                        <p className="text-white text-sm font-semibold mt-1">
                          {activeCycle.lines.filter(l => l.verification !== 'Verified').length} Discrepancies / {activeCycle.lines.length} Total
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Discrepancy Report Banner & Details */}
                {flaggedLines.length > 0 && (
                  <Card className="border-amber-500/20 bg-amber-500/5 rounded-3xl shadow-soft">
                    <CardHeader className="p-6 pb-2">
                      <CardTitle className="text-amber-400 flex items-center gap-2 text-base font-bold">
                        <AlertTriangle className="h-5 w-5 text-amber-400" />
                        {flaggedLines.length} assets flagged — discrepancy report compiled automatically
                      </CardTitle>
                      <CardDescription className="text-muted-foreground text-xs">
                        The discrepancies are compiled dynamically. Closing the cycle will lock these reports.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 pt-2">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-border/40">
                              <TableHead className="text-muted-foreground text-xs">Asset</TableHead>
                              <TableHead className="text-muted-foreground text-xs">Location</TableHead>
                              <TableHead className="text-muted-foreground text-xs">Status</TableHead>
                              <TableHead className="text-muted-foreground text-xs">Discrepancy Notes</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {flaggedLines.map(line => (
                              <TableRow key={line.id} className="border-border/20">
                                <TableCell className="font-semibold text-white text-sm py-2.5">
                                  {line.asset.name} <span className="text-muted-foreground text-xs">({line.asset.asset_tag})</span>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-xs py-2.5">
                                  {line.expected_location || 'Not Specified'}
                                </TableCell>
                                <TableCell className="py-2.5">
                                  <Badge
                                    className={cn(
                                      "rounded-full px-2 py-0.5 text-[10px] font-semibold border-0",
                                      line.verification === 'Missing'
                                        ? "bg-rose-500/10 text-rose-400"
                                        : "bg-amber-500/10 text-amber-400"
                                    )}
                                  >
                                    {line.verification}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-zinc-300 text-xs italic py-2.5">
                                  {line.notes || 'No description provided.'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Audit Checklist Table */}
                <Card className="border-border/60 bg-card rounded-3xl overflow-hidden shadow-soft">
                  <CardHeader className="p-6 border-b border-border/40">
                    <CardTitle className="text-white text-lg font-bold">Checking Sheet Verification</CardTitle>
                    <CardDescription className="text-muted-foreground text-xs">
                      Verify each asset matches expected parameters. Choose status and record optional notes.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border/40 bg-muted/20">
                            <TableHead className="text-muted-foreground text-xs pl-6">Asset Tag & Name</TableHead>
                            <TableHead className="text-muted-foreground text-xs">Expected Location</TableHead>
                            <TableHead className="text-muted-foreground text-xs">Verification Log</TableHead>
                            <TableHead className="text-muted-foreground text-xs pr-6">Verify Action / Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activeCycle.lines.map(line => {
                            const currentNotes = lineNotes[line.id] ?? '';
                            return (
                              <TableRow key={line.id} className="border-border/20 hover:bg-muted/5 transition-colors">
                                <TableCell className="py-4 pl-6">
                                  <div className="font-semibold text-white text-sm">{line.asset.name}</div>
                                  <div className="text-[10px] text-muted-foreground mt-0.5 font-bold uppercase tracking-wider">{line.asset.asset_tag}</div>
                                </TableCell>
                                
                                <TableCell className="text-muted-foreground text-xs py-4">
                                  {line.expected_location || 'Not Specified'}
                                </TableCell>
                                
                                <TableCell className="py-4">
                                  <Badge
                                    className={cn(
                                      "rounded-full px-2.5 py-0.5 text-xs font-semibold border-0",
                                      line.verification === 'Verified'
                                        ? "bg-emerald-500/10 text-emerald-400"
                                        : line.verification === 'Missing'
                                        ? "bg-rose-500/10 text-rose-400"
                                        : "bg-amber-500/10 text-amber-400"
                                    )}
                                  >
                                    {line.verification}
                                  </Badge>
                                </TableCell>
                                
                                <TableCell className="py-4 pr-6 space-y-2">
                                  {/* Verification Buttons */}
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      disabled={activeCycle.is_locked}
                                      onClick={() => handleVerifyLine(line.id, 'Verified')}
                                      className={cn(
                                        "rounded-xl px-2.5 py-1 text-xs flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-0",
                                        line.verification === 'Verified' && "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                                      )}
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                                    </Button>
                                    <Button
                                      size="sm"
                                      disabled={activeCycle.is_locked}
                                      onClick={() => handleVerifyLine(line.id, 'Missing')}
                                      className={cn(
                                        "rounded-xl px-2.5 py-1 text-xs flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-0",
                                        line.verification === 'Missing' && "bg-rose-500/20 text-rose-400 hover:bg-rose-500/20"
                                      )}
                                    >
                                      <XCircle className="h-3.5 w-3.5" /> Missing
                                    </Button>
                                    <Button
                                      size="sm"
                                      disabled={activeCycle.is_locked}
                                      onClick={() => handleVerifyLine(line.id, 'Damaged')}
                                      className={cn(
                                        "rounded-xl px-2.5 py-1 text-xs flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-0",
                                        line.verification === 'Damaged' && "bg-amber-500/20 text-amber-400 hover:bg-amber-500/20"
                                      )}
                                    >
                                      <AlertTriangle className="h-3.5 w-3.5" /> Damaged
                                    </Button>
                                  </div>

                                  {/* Notes field */}
                                  <div className="flex gap-2">
                                    <Input
                                      placeholder="Add location/condition notes..."
                                      disabled={activeCycle.is_locked}
                                      value={currentNotes}
                                      onChange={e => setLineNotes(prev => ({ ...prev, [line.id]: e.target.value }))}
                                      className="h-8 rounded-xl text-xs bg-card border-border/40 text-white"
                                    />
                                    {!activeCycle.is_locked && (
                                      <Button
                                        size="sm"
                                        onClick={() => handleSaveNotes(line.id)}
                                        className="h-8 rounded-xl text-xs px-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-0"
                                      >
                                        Save
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

              </div>
            ) : (
              <Card className="border-border/60 bg-card rounded-3xl h-96 flex flex-col items-center justify-center p-8 text-center shadow-soft">
                <ClipboardCheck className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <h3 className="text-white font-bold text-lg tracking-tight">No Active Audit Selected</h3>
                <p className="text-muted-foreground text-sm max-w-sm mt-1">
                  Select an audit cycle from the list on the left or create a new cycle to begin verification checklists.
                </p>
              </Card>
            )}
          </div>

        </div>

      {/* Start Cycle Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-card border-border/60 rounded-3xl max-w-lg text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-indigo-400" /> Start New Audit Cycle
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs mt-1">
              Initialize a verification cycle. Assets in the scoped department/location will be attached to the checklist.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCycle} className="space-y-4 py-2 text-sm">
            <div className="space-y-1.5">
              <Label htmlFor="audit-name" className="text-xs font-bold text-muted-foreground uppercase">Audit Cycle Name</Label>
              <Input
                id="audit-name"
                required
                placeholder="e.g. Q3 IT Infrastructure Audit"
                value={createForm.name}
                onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                className="rounded-xl bg-card border-border/40 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="audit-dept" className="text-xs font-bold text-muted-foreground uppercase font-semibold">Department Scope</Label>
                <Select
                  value={createForm.department_id}
                  onValueChange={value => setCreateForm(prev => ({ ...prev, department_id: value }))}
                >
                  <SelectTrigger id="audit-dept" className="rounded-xl bg-card border-border/40 text-white text-xs">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border/60 text-white text-xs">
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map(d => (
                      <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="audit-loc" className="text-xs font-bold text-muted-foreground uppercase">Location Scope</Label>
                <Input
                  id="audit-loc"
                  placeholder="e.g. Floor 2 / Room 101"
                  value={createForm.location}
                  onChange={e => setCreateForm(prev => ({ ...prev, location: e.target.value }))}
                  className="rounded-xl bg-card border-border/40 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="audit-start" className="text-xs font-bold text-muted-foreground uppercase">Start Date</Label>
                <Input
                  id="audit-start"
                  type="date"
                  required
                  value={createForm.start_date}
                  onChange={e => setCreateForm(prev => ({ ...prev, start_date: e.target.value }))}
                  className="rounded-xl bg-card border-border/40 text-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="audit-end" className="text-xs font-bold text-muted-foreground uppercase">End Date</Label>
                <Input
                  id="audit-end"
                  type="date"
                  required
                  value={createForm.end_date}
                  onChange={e => setCreateForm(prev => ({ ...prev, end_date: e.target.value }))}
                  className="rounded-xl bg-card border-border/40 text-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase">Assign Auditors</Label>
              <div className="border border-border/40 rounded-2xl bg-card p-3 max-h-36 overflow-y-auto space-y-2">
                {employees.map(emp => {
                  const isChecked = createForm.auditor_ids.includes(emp.id);
                  return (
                    <label key={emp.id} className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300 hover:text-white">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleAuditor(emp.id)}
                        className="rounded border-border/40 bg-zinc-950 text-indigo-600 focus:ring-indigo-500 h-4.5 w-4.5"
                      />
                      <span>{emp.name} <span className="text-muted-foreground text-[10px]">({emp.role})</span></span>
                    </label>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-2xl border border-border/40 hover:bg-zinc-800 text-zinc-300 font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold border-0"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Create Cycle
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
