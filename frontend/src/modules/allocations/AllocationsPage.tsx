import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/modules/auth/AuthContext';
import {
  Search,
  Calendar,
  AlertTriangle,
  X,
  History,
  UserCheck,
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  department_id: number | null;
  department?: { id: number; name: string } | null;
}

interface Asset {
  id: number;
  name: string;
  asset_tag: string;
  status: string;
  condition: string;
  holder_id: number | null;
  holder?: User | null;
  department?: { id: number; name: string } | null;
}

interface Allocation {
  id: number;
  asset_id: number;
  user_id: number;
  department_id: number | null;
  allocated_date: string;
  expected_return: string | null;
  actual_return: string | null;
  condition_notes: string | null;
  status: string;
  asset?: Asset;
  user?: User;
  department?: { id: number; name: string } | null;
}

interface AssetTransfer {
  id: number;
  asset_id: number;
  from_user_id: number;
  to_user_id: number;
  reason: string;
  status: string;
  approved_by: number | null;
  asset?: Asset;
  from_user?: User;
  to_user?: User;
  approved_by_user?: User | null;
}

interface TimelineItem {
  type: 'allocation' | 'transfer' | 'maintenance';
  date: string;
  status: string;
  description: string;
  details: string | null;
  user: string;
}

export default function AllocationsPage() {
  const { user: currentUser } = useAuth();
  const isAdminOrManager = currentUser?.role === 'Admin' || currentUser?.role === 'Asset Manager';

  // Lists State
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [transfers, setTransfers] = useState<AssetTransfer[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters State
  const [allocationStatusFilter, setAllocationStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog States
  const [isAllocationDialogOpen, setIsAllocationDialogOpen] = useState(false);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [isTimelineDialogOpen, setIsTimelineDialogOpen] = useState(false);

  // Selected Records
  const [selectedAllocation, setSelectedAllocation] = useState<Allocation | null>(null);
  const [selectedAssetForTimeline, setSelectedAssetForTimeline] = useState<Asset | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);

  // Allocation/Transfer Form State
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [expectedReturnDate, setExpectedReturnDate] = useState<string>('');
  const [transferReason, setTransferReason] = useState<string>('');
  const [isTransferFlow, setIsTransferFlow] = useState(false);

  // Return Check-in Form State
  const [returnCondition, setReturnCondition] = useState<string>('Good');
  const [returnNotes, setReturnNotes] = useState<string>('');

  // Errors & Feedback State
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Helper: Find selected asset details for conflict checks
  const currentSelectedAsset = assets.find(a => a.id.toString() === selectedAssetId);

  // Fetch initial portal data
  const fetchData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [allocRes, transRes, assetsRes, empRes] = await Promise.all([
        api.get('/allocations'),
        api.get('/transfers'),
        api.get('/assets'),
        api.get('/employees')
      ]);
      setAllocations(allocRes.data);
      setTransfers(transRes.data);
      setAssets(assetsRes.data);
      setEmployees(empRes.data);
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Failed to load portal data. Please check connections.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch asset history timeline
  const fetchTimeline = async (assetId: number) => {
    setIsTimelineLoading(true);
    try {
      const res = await api.get(`/assets/${assetId}/history`);
      setTimeline(res.data.timeline || []);
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to fetch asset history timeline.');
    } finally {
      setIsTimelineLoading(false);
    }
  };

  // Submit allocation or transfer request
  const handleAllocateOrTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId || !selectedEmployeeId) {
      setErrorMessage('Please select both an asset and an employee.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (isTransferFlow) {
        // Submit Transfer Request
        await api.post('/transfers', {
          asset_id: selectedAssetId,
          to_user_id: selectedEmployeeId,
          reason: transferReason
        });
        setSuccessMessage(`Transfer request registered successfully for asset.`);
        setIsAllocationDialogOpen(false);
        resetAllocationForm();
        fetchData();
      } else {
        // Submit Regular Allocation
        await api.post('/allocations', {
          asset_id: selectedAssetId,
          user_id: selectedEmployeeId,
          expected_return: expectedReturnDate || null
        });
        setSuccessMessage('Asset allocated successfully.');
        setIsAllocationDialogOpen(false);
        resetAllocationForm();
        fetchData();
      }
    } catch (err: any) {
      console.error(err);
      if (err.response && err.response.status === 422) {
        const data = err.response.data;
        if (data.current_holder) {
          // Double allocation validation catch
          setErrorMessage(
            `Double Allocation Guard: This asset is already allocated to ${data.current_holder.name} (${data.current_holder.department}).`
          );
          setIsTransferFlow(true);
        } else {
          setErrorMessage(data.message || 'Validation error.');
        }
      } else {
        setErrorMessage('Failed to process request.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit asset return check-in
  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAllocation) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await api.post(`/allocations/${selectedAllocation.id}/return`, {
        condition: returnCondition,
        condition_notes: returnNotes
      });
      setSuccessMessage('Asset checked in and returned successfully.');
      setIsReturnDialogOpen(false);
      setSelectedAllocation(null);
      setReturnNotes('');
      setReturnCondition('Good');
      fetchData();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.response?.data?.message || 'Failed to submit return check-in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Approve Transfer Request
  const handleApproveTransfer = async (transferId: number) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await api.post(`/transfers/${transferId}/approve`);
      setSuccessMessage('Transfer request approved and asset re-allocated successfully.');
      fetchData();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.response?.data?.message || 'Failed to approve transfer.');
    }
  };

  // Reject Transfer Request
  const handleRejectTransfer = async (transferId: number) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await api.post(`/transfers/${transferId}/reject`);
      setSuccessMessage('Transfer request rejected successfully.');
      fetchData();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.response?.data?.message || 'Failed to reject transfer.');
    }
  };

  const resetAllocationForm = () => {
    setSelectedAssetId('');
    setSelectedEmployeeId('');
    setExpectedReturnDate('');
    setTransferReason('');
    setIsTransferFlow(false);
    setErrorMessage(null);
  };

  // Helper check: can current user approve/reject this transfer?
  const canApprove = (transfer: AssetTransfer) => {
    if (!currentUser) return false;
    if (currentUser.role === 'Admin' || currentUser.role === 'Asset Manager') return true;
    if (currentUser.role === 'Dept Head') {
      return transfer.to_user?.department_id === currentUser.department_id;
    }
    return false;
  };

  // Filtered Allocations List
  const filteredAllocations = allocations.filter(a => {
    const matchesStatus = allocationStatusFilter === 'all' || a.status === allocationStatusFilter;
    const matchesSearch =
      a.asset?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.asset?.asset_tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.user?.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Asset Allocation & Transfer</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Assign company assets to employees, handle cross-department transfers, and track check-ins.
          </p>
        </div>
        {isAdminOrManager && (
          <Button
            onClick={() => {
              resetAllocationForm();
              setIsAllocationDialogOpen(true);
            }}
            className="bg-primary hover:bg-primary/90 text-white rounded-2xl px-5 py-2.5 flex items-center gap-2 shadow-lg"
          >
            <UserCheck className="w-4 h-4" />
            Allocate Asset
          </Button>
        )}
      </div>

      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl flex items-center gap-3 animate-fade-in text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMessage}</span>
          <button className="ml-auto text-emerald-400 hover:text-white" onClick={() => setSuccessMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive-foreground p-4 rounded-2xl flex items-center gap-3 animate-fade-in text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
          <span>{errorMessage}</span>
          <button className="ml-auto text-red-400 hover:text-white" onClick={() => setErrorMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <Tabs defaultValue="allocations" className="space-y-6">
        <TabsList className="bg-card/40 border border-border/40 p-1 rounded-2xl flex w-fit gap-1">
          <TabsTrigger
            value="allocations"
            className="rounded-xl px-5 py-2 text-sm font-medium text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-white transition-all"
          >
            Allocations
          </TabsTrigger>
          <TabsTrigger
            value="transfers"
            className="rounded-xl px-5 py-2 text-sm font-medium text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-white transition-all"
          >
            Transfer Requests
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Allocations */}
        <TabsContent value="allocations" className="space-y-6 outline-none">
          <Card className="bg-card border border-border/60 rounded-3xl overflow-hidden shadow-soft">
            <CardHeader className="border-b border-border/40 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-extrabold text-white">Active Allocations & Check-ins</CardTitle>
                <CardDescription>Manage active assignments and process returns.</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tag, asset, or holder..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 bg-muted/20 border-border/60 rounded-2xl text-white placeholder-muted-foreground w-full sm:w-[260px] focus:border-primary focus:ring-0"
                  />
                </div>
                {/* Status Filter */}
                <Select value={allocationStatusFilter} onValueChange={setAllocationStatusFilter}>
                  <SelectTrigger className="bg-muted/20 border-border/60 rounded-2xl text-white w-full sm:w-[150px]">
                    <SelectValue placeholder="Filter Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border/60 rounded-2xl">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Returned">Returned</SelectItem>
                    <SelectItem value="Overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {isLoading ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border/40 hover:bg-transparent">
                        <TableHead className="font-bold text-muted-foreground pl-6">Asset</TableHead>
                        <TableHead className="font-bold text-muted-foreground">Employee</TableHead>
                        <TableHead className="font-bold text-muted-foreground">Department</TableHead>
                        <TableHead className="font-bold text-muted-foreground">Allocated Date</TableHead>
                        <TableHead className="font-bold text-muted-foreground">Expected Return</TableHead>
                        <TableHead className="font-bold text-muted-foreground">Status</TableHead>
                        <TableHead className="font-bold text-muted-foreground text-right pr-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: 4 }).map((_, idx) => (
                        <TableRow key={idx} className="border-b border-border/40">
                          <TableCell className="pl-6 py-4">
                            <div className="space-y-1">
                              <Skeleton className="h-4 w-28 bg-muted/40" />
                              <Skeleton className="h-3 w-16 bg-muted/40 font-mono" />
                            </div>
                          </TableCell>
                          <TableCell className="py-4"><Skeleton className="h-4 w-24 bg-muted/40" /></TableCell>
                          <TableCell className="py-4"><Skeleton className="h-4 w-16 bg-muted/40" /></TableCell>
                          <TableCell className="py-4"><Skeleton className="h-4 w-20 bg-muted/40" /></TableCell>
                          <TableCell className="py-4"><Skeleton className="h-4 w-20 bg-muted/40" /></TableCell>
                          <TableCell className="py-4"><Skeleton className="h-6 w-16 rounded-full bg-muted/40" /></TableCell>
                          <TableCell className="text-right pr-6 py-4"><Skeleton className="h-8 w-20 ml-auto rounded-xl bg-muted/40" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : filteredAllocations.length === 0 ? (
                <div className="text-center p-12 text-muted-foreground text-sm">
                  No allocations found matching the criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border/40 hover:bg-transparent">
                        <TableHead className="font-bold text-muted-foreground pl-6">Asset</TableHead>
                        <TableHead className="font-bold text-muted-foreground">Employee</TableHead>
                        <TableHead className="font-bold text-muted-foreground">Department</TableHead>
                        <TableHead className="font-bold text-muted-foreground">Allocated Date</TableHead>
                        <TableHead className="font-bold text-muted-foreground">Expected Return</TableHead>
                        <TableHead className="font-bold text-muted-foreground">Status</TableHead>
                        <TableHead className="font-bold text-muted-foreground text-right pr-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAllocations.map(alloc => (
                        <TableRow key={alloc.id} className="border-b border-border/40 hover:bg-muted/5 transition-colors">
                          <TableCell className="pl-6 py-4">
                            <div>
                              <div className="font-semibold text-white">{alloc.asset?.name}</div>
                              <button
                                onClick={() => {
                                  setSelectedAssetForTimeline(alloc.asset || null);
                                  if (alloc.asset) {
                                    fetchTimeline(alloc.asset.id);
                                    setIsTimelineDialogOpen(true);
                                  }
                                }}
                                className="text-xs text-primary hover:underline font-mono mt-0.5 flex items-center gap-1"
                              >
                                <History className="w-3 h-3" />
                                {alloc.asset?.asset_tag}
                              </button>
                            </div>
                          </TableCell>
                          <TableCell className="text-white py-4 font-medium">{alloc.user?.name || 'Unassigned'}</TableCell>
                          <TableCell className="text-muted-foreground py-4">{alloc.department?.name || '-'}</TableCell>
                          <TableCell className="text-muted-foreground py-4">
                            {alloc.allocated_date ? new Date(alloc.allocated_date).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground py-4">
                            {alloc.expected_return ? new Date(alloc.expected_return).toLocaleDateString() : 'Indefinite'}
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge
                              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                alloc.status === 'Active'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : alloc.status === 'Overdue'
                                  ? 'bg-destructive/15 text-red-400 border border-destructive/20 animate-pulse'
                                  : 'bg-muted/40 text-muted-foreground border border-border/40'
                              }`}
                            >
                              {alloc.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-6 py-4">
                            <div className="flex justify-end items-center gap-2">
                              {isAdminOrManager && (alloc.status === 'Active' || alloc.status === 'Overdue') && (
                                <Button
                                  onClick={() => {
                                    setSelectedAllocation(alloc);
                                    setReturnCondition('Good');
                                    setReturnNotes('');
                                    setIsReturnDialogOpen(true);
                                  }}
                                  size="sm"
                                  className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl px-3 py-1 text-xs"
                                >
                                  Return
                                </Button>
                              )}
                              <Button
                                onClick={() => {
                                  setSelectedAssetForTimeline(alloc.asset || null);
                                  if (alloc.asset) {
                                    fetchTimeline(alloc.asset.id);
                                    setIsTimelineDialogOpen(true);
                                  }
                                }}
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-white rounded-xl px-2 py-1"
                              >
                                History
                              </Button>
                            </div>
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

        {/* Tab 2: Transfers */}
        <TabsContent value="transfers" className="outline-none">
          <Card className="bg-card border border-border/60 rounded-3xl overflow-hidden shadow-soft">
            <CardHeader className="border-b border-border/40 pb-6">
              <CardTitle className="text-xl font-extrabold text-white">Cross-Department Asset Transfers</CardTitle>
              <CardDescription>
                Track handovers, employee transfers, and request approvals.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border/40 hover:bg-transparent">
                        <TableHead className="font-bold text-muted-foreground pl-6">Asset</TableHead>
                        <TableHead className="font-bold text-muted-foreground">From Holder</TableHead>
                        <TableHead className="font-bold text-muted-foreground">Recipient</TableHead>
                        <TableHead className="font-bold text-muted-foreground">Reason</TableHead>
                        <TableHead className="font-bold text-muted-foreground">Status</TableHead>
                        <TableHead className="font-bold text-muted-foreground text-right pr-6">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: 3 }).map((_, idx) => (
                        <TableRow key={idx} className="border-b border-border/40">
                          <TableCell className="pl-6 py-4">
                            <div className="space-y-1">
                              <Skeleton className="h-4 w-28 bg-muted/40" />
                              <Skeleton className="h-3 w-16 bg-muted/40 font-mono" />
                            </div>
                          </TableCell>
                          <TableCell className="py-4"><Skeleton className="h-4 w-20 bg-muted/40" /></TableCell>
                          <TableCell className="py-4"><Skeleton className="h-4 w-20 bg-muted/40" /></TableCell>
                          <TableCell className="py-4"><Skeleton className="h-4 w-32 bg-muted/40" /></TableCell>
                          <TableCell className="py-4"><Skeleton className="h-6 w-16 rounded-full bg-muted/40" /></TableCell>
                          <TableCell className="text-right pr-6 py-4"><Skeleton className="h-8 w-16 ml-auto rounded-xl bg-muted/40" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : transfers.length === 0 ? (
                <div className="text-center p-12 text-muted-foreground text-sm">
                  No asset transfer requests logged.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border/40 hover:bg-transparent">
                        <TableHead className="font-bold text-muted-foreground pl-6">Asset</TableHead>
                        <TableHead className="font-bold text-muted-foreground">From Holder</TableHead>
                        <TableHead className="font-bold text-muted-foreground">Recipient</TableHead>
                        <TableHead className="font-bold text-muted-foreground">Reason</TableHead>
                        <TableHead className="font-bold text-muted-foreground">Status</TableHead>
                        <TableHead className="font-bold text-muted-foreground text-right pr-6">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transfers.map(transfer => (
                        <TableRow key={transfer.id} className="border-b border-border/40 hover:bg-muted/5 transition-colors">
                          <TableCell className="pl-6 py-4">
                            <div>
                              <div className="font-semibold text-white">{transfer.asset?.name}</div>
                              <div className="text-xs text-primary font-mono mt-0.5">
                                {transfer.asset?.asset_tag}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-white py-4 font-medium">{transfer.from_user?.name || 'System'}</TableCell>
                          <TableCell className="text-white py-4 font-medium">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <ArrowRight className="w-3.5 h-3.5 text-primary" />
                                <span>{transfer.to_user?.name}</span>
                              </div>
                              <div className="text-xs text-muted-foreground pl-5">{transfer.to_user?.department?.name || 'No Dept'}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground py-4 text-xs max-w-[200px] truncate" title={transfer.reason || undefined}>
                            {transfer.reason || 'No reason stated'}
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge
                              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                transfer.status === 'Approved'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : transfer.status === 'Rejected'
                                  ? 'bg-destructive/15 text-red-400 border border-destructive/20'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}
                            >
                              {transfer.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-6 py-4">
                            <div className="flex justify-end items-center gap-2">
                              {transfer.status === 'Pending' && canApprove(transfer) ? (
                                <>
                                  <Button
                                    onClick={() => handleApproveTransfer(transfer.id)}
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-3 py-1 text-xs border-0"
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    onClick={() => handleRejectTransfer(transfer.id)}
                                    variant="outline"
                                    size="sm"
                                    className="text-red-400 hover:text-white border-red-500/20 hover:bg-red-500/10 rounded-xl px-3 py-1 text-xs"
                                  >
                                    Reject
                                  </Button>
                                </>
                              ) : transfer.status === 'Approved' && transfer.approved_by_user ? (
                                <span className="text-xs text-muted-foreground">
                                  Approved by {transfer.approved_by_user.name}
                                </span>
                              ) : transfer.status === 'Rejected' ? (
                                <span className="text-xs text-muted-foreground">Rejected</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">Pending Approval</span>
                              )}
                            </div>
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

      {/* Dialog 1: Allocate Asset / Transfer Request */}
      <Dialog open={isAllocationDialogOpen} onOpenChange={setIsAllocationDialogOpen}>
        <DialogContent className="bg-popover border border-border/60 text-white rounded-3xl sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold tracking-tight">
              {isTransferFlow ? 'Request Asset Transfer' : 'Allocate Asset'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              {isTransferFlow
                ? 'Request authorization to transfer this allocated asset to a new employee.'
                : 'Assign an available asset to a team member.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAllocateOrTransferSubmit} className="space-y-5 py-4">
            {/* Asset Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground">Select Asset</Label>
              <Select value={selectedAssetId} onValueChange={(val) => {
                setSelectedAssetId(val);
                const asset = assets.find(a => a.id.toString() === val);
                if (asset?.status === 'Allocated') {
                  // Switch automatically to transfer flow and notify
                  setIsTransferFlow(true);
                  setErrorMessage(null);
                } else {
                  setIsTransferFlow(false);
                  setErrorMessage(null);
                }
              }}>
                <SelectTrigger className="bg-muted/20 border-border/60 rounded-2xl text-white">
                  <SelectValue placeholder="Choose an asset tag..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border/60 rounded-2xl max-h-[220px]">
                  {assets.map(asset => (
                    <SelectItem key={asset.id} value={asset.id.toString()}>
                      {asset.name} ({asset.asset_tag}) — {asset.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Task 6.1 Conflict Gate Banner */}
            {currentSelectedAsset?.status === 'Allocated' && (
              <div className="bg-amber-500/10 border border-amber-500/25 p-4 rounded-2xl space-y-2 text-amber-400 text-xs leading-relaxed">
                <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[10px]">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  Allocation Conflict Detected
                </div>
                <p>
                  This asset is currently allocated to{' '}
                  <strong className="text-white font-semibold">
                    {currentSelectedAsset.holder?.name || 'another holder'}
                  </strong>{' '}
                  ({currentSelectedAsset.department?.name || 'No department'}).
                </p>
                <p className="text-muted-foreground text-[11px]">
                  Double allocation is blocked by the gate validator. You can request a department transfer flow using the form below.
                </p>
              </div>
            )}

            {currentSelectedAsset && currentSelectedAsset.status !== 'Available' && currentSelectedAsset.status !== 'Allocated' && (
              <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-2xl text-destructive-foreground text-xs leading-relaxed">
                <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[10px] text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
                  Asset Unavailable
                </div>
                <p className="mt-1">
                  This asset is currently in status <strong>{currentSelectedAsset.status}</strong> and cannot be allocated.
                </p>
              </div>
            )}

            {/* Target Employee */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground">Assignee / Recipient</Label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger className="bg-muted/20 border-border/60 rounded-2xl text-white">
                  <SelectValue placeholder="Choose employee..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border/60 rounded-2xl max-h-[220px]">
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.name} ({emp.department?.name || 'No Department'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Flow Switch inputs */}
            {isTransferFlow ? (
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-muted-foreground">Reason for Transfer</Label>
                <Textarea
                  placeholder="Explain why this transfer is required..."
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="bg-muted/20 border-border/60 rounded-2xl text-white placeholder-muted-foreground min-h-[90px]"
                  required
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-muted-foreground">Expected Return Date (Optional)</Label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={expectedReturnDate}
                    onChange={(e) => setExpectedReturnDate(e.target.value)}
                    className="pl-10 bg-muted/20 border-border/60 rounded-2xl text-white w-full"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="pt-4 border-t border-border/40 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAllocationDialogOpen(false)}
                className="rounded-2xl text-muted-foreground hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || (currentSelectedAsset && currentSelectedAsset.status !== 'Available' && currentSelectedAsset.status !== 'Allocated')}
                className="bg-primary hover:bg-primary/95 text-white rounded-2xl px-5"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : isTransferFlow ? (
                  'Submit Transfer'
                ) : (
                  'Confirm Allocation'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog 2: Return Asset (Check-in) */}
      <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
        <DialogContent className="bg-popover border border-border/60 text-white rounded-3xl sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight">Return Check-in</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Assess asset condition and confirm return completion.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReturnSubmit} className="space-y-5 py-3">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground">Asset Returned</Label>
              <div className="bg-muted/15 border border-border/40 p-4 rounded-2xl">
                <div className="font-semibold text-white">{selectedAllocation?.asset?.name}</div>
                <div className="text-xs text-muted-foreground font-mono mt-0.5">
                  Tag: {selectedAllocation?.asset?.asset_tag} | Current Holder: {selectedAllocation?.user?.name}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground">Returned Condition Status</Label>
              <Select value={returnCondition} onValueChange={setReturnCondition}>
                <SelectTrigger className="bg-muted/20 border-border/60 rounded-2xl text-white">
                  <SelectValue placeholder="Mark Condition" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border/60 rounded-2xl">
                  <SelectItem value="Good">Good (Operational & Clean)</SelectItem>
                  <SelectItem value="Fair">Fair (Minor Wear & Tear)</SelectItem>
                  <SelectItem value="Damaged">Damaged (Requires Maintenance)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-muted-foreground">Check-in Notes</Label>
              <Textarea
                placeholder="Write any condition notes or details on return..."
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                className="bg-muted/20 border-border/60 rounded-2xl text-white placeholder-muted-foreground min-h-[90px]"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-border/40 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsReturnDialogOpen(false);
                  setSelectedAllocation(null);
                }}
                className="rounded-2xl text-muted-foreground hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl px-5"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Complete Check-in'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog 3: History Timeline Log */}
      <Dialog open={isTimelineDialogOpen} onOpenChange={setIsTimelineDialogOpen}>
        <DialogContent className="bg-popover border border-border/60 text-white rounded-3xl sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight">Lifecycle Timeline</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Historical allocation and transfer records for {selectedAssetForTimeline?.name} ({selectedAssetForTimeline?.asset_tag}).
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 max-h-[380px] overflow-y-auto pr-2 space-y-6">
            {isTimelineLoading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-muted-foreground">Retrieving history log...</p>
              </div>
            ) : timeline.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                No historical events logged for this asset yet.
              </div>
            ) : (
              <div className="relative pl-6 border-l border-border/60 ml-2 space-y-6">
                {timeline.map((item, idx) => (
                  <div key={idx} className="relative">
                    {/* Timeline bullet icon */}
                    <div className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 bg-popover flex items-center justify-center ${
                      item.type === 'allocation'
                        ? 'border-emerald-500 text-emerald-400'
                        : item.type === 'transfer'
                        ? 'border-amber-500 text-amber-400'
                        : 'border-red-500 text-red-400'
                    }`}>
                      <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                    </div>
                    {/* Event Content */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-start gap-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          {item.type} ({item.status})
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(item.date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-white leading-snug">{item.description}</p>
                      {item.details && (
                        <p className="text-xs text-muted-foreground bg-muted/5 border border-border/20 p-2 rounded-xl mt-1.5">
                          {item.details}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="border-t border-border/40 pt-4">
            <Button
              onClick={() => setIsTimelineDialogOpen(false)}
              className="bg-card border border-border/60 hover:bg-muted/15 rounded-2xl px-6"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
