import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/modules/auth/AuthContext';
import {
  Hammer,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  User,
  Wrench,
  Image as ImageIcon,
  Loader2,
  Play,
  UserPlus,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface Asset {
  id: number;
  name: string;
  asset_tag: string;
  status: string;
}

interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  department_id: number | null;
}

interface MaintenanceRequest {
  id: number;
  asset_id: number;
  user_id: number;
  issue_description: string;
  priority: 'Low' | 'Medium' | 'High';
  photo_path: string | null;
  technician_id: number | null;
  status: 'Pending' | 'Approved' | 'Technician Assigned' | 'In Progress' | 'Resolved';
  approved_by: number | null;
  resolution_notes: string | null;
  resolution_date: string | null;
  created_at: string;
  asset?: Asset;
  user?: UserProfile;
  technician?: UserProfile | null;
  approved_by_user?: UserProfile | null;
}

export default function MaintenancePage() {
  const { user: currentUser } = useAuth();
  const isAdminOrManager = currentUser?.role === 'Admin' || currentUser?.role === 'Asset Manager';

  // Kanban and Requests State
  const [boardData, setBoardData] = useState<Record<string, MaintenanceRequest[]>>({
    'Pending': [],
    'Approved': [],
    'Technician Assigned': [],
    'In Progress': [],
    'Resolved': []
  });
  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Submit Request Modal State
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [submitForm, setSubmitForm] = useState({
    asset_id: '',
    priority: 'Medium',
    issue_description: ''
  });
  const [submitFile, setSubmitFile] = useState<File | null>(null);
  const [submitFilePreview, setSubmitFilePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Assign Technician Modal State
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assigningRequest, setAssigningRequest] = useState<MaintenanceRequest | null>(null);
  const [selectedTechId, setSelectedTechId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Resolve Request Modal State
  const [isResolveOpen, setIsResolveOpen] = useState(false);
  const [resolvingRequest, setResolvingRequest] = useState<MaintenanceRequest | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  // Lightbox Modal State
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Status message alerts
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchKanban = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/maintenance/kanban');
      setBoardData(response.data);
    } catch (err) {
      console.error('Error fetching Kanban:', err);
      setErrorMsg('Failed to load maintenance requests board.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAssetsAndEmployees = async () => {
    try {
      const [assetsRes, employeesRes] = await Promise.all([
        api.get('/assets'),
        api.get('/employees')
      ]);
      setAssets(assetsRes.data);
      setEmployees(employeesRes.data);
    } catch (err) {
      console.error('Error fetching dependency data:', err);
    }
  };

  useEffect(() => {
    fetchKanban();
    fetchAssetsAndEmployees();
  }, []);

  // Show auto-dismiss alerts
  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };
  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 4000);
  };

  // Helper check to verify if current user can manage/drag transitions
  const canModifyRequest = (req: MaintenanceRequest) => {
    if (isAdminOrManager) return true;
    
    // Dept heads can modify requests raised in their department
    if (currentUser?.role === 'Dept Head') {
      const isCreator = req.user_id === currentUser.id;
      const isTech = req.technician_id === currentUser.id;
      const inDept = req.asset?.status !== undefined; // simplified, we check policy on server.
      return isCreator || isTech || inDept;
    }

    // Technicians can only modify requests they are assigned to
    if (currentUser?.role === 'Employee') {
      return req.technician_id === currentUser.id;
    }

    return false;
  };

  const checkTransitionAllowed = (req: MaintenanceRequest, targetStatus: string) => {
    if (!canModifyRequest(req)) return false;

    // Check specific transitions
    if (targetStatus === 'Approved' && !isAdminOrManager) {
      return false; // Manager/Admin only
    }
    if (targetStatus === 'Technician Assigned' && !isAdminOrManager) {
      return false; // Manager/Admin only
    }

    // Technicians can move their requests to In Progress or Resolved
    if (currentUser?.role === 'Employee') {
      if (req.technician_id !== currentUser.id) return false;
      return targetStatus === 'In Progress' || targetStatus === 'Resolved';
    }

    return true;
  };

  // Handle Drag Start
  const handleDragStart = (e: React.DragEvent, req: MaintenanceRequest) => {
    e.dataTransfer.setData('text/plain', JSON.stringify(req));
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle Drop
  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const dataStr = e.dataTransfer.getData('text/plain');
    if (!dataStr) return;
    
    try {
      const req = JSON.parse(dataStr) as MaintenanceRequest;
      if (req.status === targetStatus) return;

      if (!checkTransitionAllowed(req, targetStatus)) {
        triggerError('Unauthorized to move requests to this stage.');
        return;
      }

      // Initiate actions based on target status
      if (targetStatus === 'Approved') {
        await updateRequestStatus(req.id, { status: 'Approved' });
      } else if (targetStatus === 'Technician Assigned') {
        setAssigningRequest(req);
        setSelectedTechId(req.technician_id?.toString() || '');
        setIsAssignOpen(true);
      } else if (targetStatus === 'In Progress') {
        await updateRequestStatus(req.id, { status: 'In Progress' });
      } else if (targetStatus === 'Resolved') {
        setResolvingRequest(req);
        setResolutionNotes('');
        setIsResolveOpen(true);
      } else if (targetStatus === 'Pending') {
        await updateRequestStatus(req.id, { status: 'Pending', technician_id: null });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateRequestStatus = async (id: number, payload: any) => {
    try {
      await api.patch(`/maintenance/requests/${id}`, payload);
      triggerSuccess(`Request updated successfully.`);
      fetchKanban();
    } catch (err: any) {
      console.error(err);
      triggerError(err.response?.data?.message || 'Failed to update request.');
    }
  };

  // Submit New Request
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitForm.asset_id || !submitForm.issue_description) {
      triggerError('Please select an asset and describe the issue.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('asset_id', submitForm.asset_id);
      formData.append('priority', submitForm.priority);
      formData.append('issue_description', submitForm.issue_description);
      if (submitFile) {
        formData.append('photo', submitFile);
      }

      await api.post('/maintenance/requests', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      triggerSuccess('Maintenance request submitted successfully.');
      setIsSubmitOpen(false);
      setSubmitForm({ asset_id: '', priority: 'Medium', issue_description: '' });
      setSubmitFile(null);
      setSubmitFilePreview(null);
      fetchKanban();
    } catch (err: any) {
      console.error(err);
      triggerError(err.response?.data?.message || 'Failed to submit maintenance request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Technician Assignment
  const handleAssignTechnician = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningRequest) return;
    if (!selectedTechId) {
      triggerError('Please select a technician.');
      return;
    }

    setIsAssigning(true);
    try {
      await updateRequestStatus(assigningRequest.id, {
        status: 'Technician Assigned',
        technician_id: parseInt(selectedTechId, 10)
      });
      setIsAssignOpen(false);
      setAssigningRequest(null);
    } finally {
      setIsAssigning(false);
    }
  };

  // Submit Resolution
  const handleResolveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingRequest) return;

    setIsResolving(true);
    try {
      await updateRequestStatus(resolvingRequest.id, {
        status: 'Resolved',
        resolution_notes: resolutionNotes
      });
      setIsResolveOpen(false);
      setResolvingRequest(null);
    } finally {
      setIsResolving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSubmitFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSubmitFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Priority color badges mapping
  const getPriorityBadge = (priority: 'Low' | 'Medium' | 'High') => {
    switch (priority) {
      case 'High':
        return <Badge className="bg-red-500/15 hover:bg-red-500/20 text-red-400 border-red-500/30 font-semibold px-2 py-0.5 rounded-full text-[10px]">High</Badge>;
      case 'Medium':
        return <Badge className="bg-amber-500/15 hover:bg-amber-500/20 text-amber-400 border-amber-500/30 font-semibold px-2 py-0.5 rounded-full text-[10px]">Medium</Badge>;
      case 'Low':
        return <Badge className="bg-sky-500/15 hover:bg-sky-500/20 text-sky-400 border-sky-500/30 font-semibold px-2 py-0.5 rounded-full text-[10px]">Low</Badge>;
      default:
        return null;
    }
  };

  // Helper search filter
  const filterRequests = (reqs: MaintenanceRequest[]) => {
    return reqs.filter(r => 
      (r.asset?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.asset?.asset_tag || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.issue_description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const columns = [
    { title: 'Pending Approval', status: 'Pending', color: 'border-t-rose-500' },
    { title: 'Approved', status: 'Approved', color: 'border-t-purple-500' },
    { title: 'Technician Assigned', status: 'Technician Assigned', color: 'border-t-blue-500' },
    { title: 'In Progress', status: 'In Progress', color: 'border-t-amber-500' },
    { title: 'Resolved', status: 'Resolved', color: 'border-t-emerald-500' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Hammer className="w-8 h-8 text-primary" />
            Maintenance Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track asset pipeline resolutions, assign service technicians, and log hardware issue fixes.
          </p>
        </div>

        <Button 
          onClick={() => setIsSubmitOpen(true)}
          className="rounded-2xl bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-5 py-3 shadow-glass flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Request Maintenance
        </Button>
      </div>

      {/* Success / Error Alerts */}
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-2xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-2xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Search Filter bar */}
      <div className="flex items-center space-x-3 bg-card/45 border border-border/40 rounded-2xl px-4 py-2 max-w-md">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by asset tag, description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent border-none text-white text-sm focus:outline-none w-full placeholder:text-muted-foreground/60"
        />
      </div>

      {/* Kanban Board Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {columns.map((col) => {
            const filteredRequests = filterRequests(boardData[col.status] || []);
            return (
              <div
                key={col.status}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, col.status)}
                className="flex flex-col bg-card/30 border border-border/50 rounded-2xl min-h-[500px] max-h-[750px] w-full shrink-0"
              >
                {/* Column Header */}
                <div className={cn("px-4 py-3 border-t-4 border-b border-border/40 bg-sidebar/40 rounded-t-2xl flex justify-between items-center", col.color)}>
                  <h3 className="text-sm font-bold text-white tracking-wide">{col.title}</h3>
                  <Badge variant="secondary" className="bg-muted text-muted-foreground rounded-full text-xs font-semibold px-2 py-0.5">
                    {filteredRequests.length}
                  </Badge>
                </div>

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar">
                  {isLoading ? (
                    Array.from({ length: 2 }).map((_, i) => (
                      <Card key={i} className="p-4 border border-border/40 bg-card/20 rounded-2xl space-y-3">
                        <div className="flex justify-between items-start">
                          <Skeleton className="h-5 w-20 bg-muted/40" />
                          <Skeleton className="h-5 w-12 bg-muted/40" />
                        </div>
                        <Skeleton className="h-4 w-full bg-muted/40" />
                        <Skeleton className="h-4 w-3/4 bg-muted/40" />
                        <div className="flex justify-between items-center pt-2">
                          <Skeleton className="h-5 w-16 rounded-full bg-muted/40" />
                          <Skeleton className="h-8 w-8 rounded-xl bg-muted/40" />
                        </div>
                      </Card>
                    ))
                  ) : filteredRequests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-12 border-2 border-dashed border-border/20 rounded-2xl p-4 text-center">
                      <Wrench className="w-8 h-8 text-muted-foreground/20 mb-2" />
                      <p className="text-[11px] text-muted-foreground/45 uppercase tracking-wider font-bold">No Requests</p>
                    </div>
                  ) : (
                    filteredRequests.map((req) => (
                      <Card
                        key={req.id}
                        draggable={canModifyRequest(req)}
                        onDragStart={(e) => handleDragStart(e, req)}
                        className={cn(
                          "bg-card border border-border/55 rounded-xl hover:shadow-lg transition-all duration-200 cursor-grab active:cursor-grabbing hover:border-primary/50 relative overflow-hidden group select-none",
                          !canModifyRequest(req) && "opacity-90 cursor-default"
                        )}
                      >
                        <CardContent className="p-3.5 space-y-3 text-left">
                          {/* Card Head (Tag & Priority) */}
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-extrabold text-muted-foreground tracking-wider uppercase bg-muted/40 px-2 py-0.5 rounded border border-border/30">
                              {req.asset?.asset_tag || `#${req.id}`}
                            </span>
                            {getPriorityBadge(req.priority)}
                          </div>

                          {/* Asset Name */}
                          <h4 className="text-sm font-bold text-white leading-tight truncate">
                            {req.asset?.name || 'Unnamed Asset'}
                          </h4>

                          {/* Description */}
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                            {req.issue_description}
                          </p>

                          {/* Photo Thumbnail */}
                          {req.photo_path && (
                            <div className="relative rounded-lg overflow-hidden border border-border/40 aspect-video bg-muted/20">
                              <img
                                src={`/storage/${req.photo_path}`}
                                alt="Maintenance attachment"
                                className="object-cover w-full h-full cursor-pointer hover:scale-105 transition-all duration-300"
                                onClick={() => setLightboxImage(`/storage/${req.photo_path}`)}
                              />
                              <div className="absolute top-1 right-1 p-1 bg-black/60 rounded backdrop-blur">
                                <ImageIcon className="w-3 h-3 text-white" />
                              </div>
                            </div>
                          )}

                          {/* Resolution Notes (If Resolved) */}
                          {req.status === 'Resolved' && req.resolution_notes && (
                            <div className="bg-emerald-500/5 border border-emerald-500/20 p-2.5 rounded-lg text-[11px] text-emerald-400 space-y-1">
                              <span className="font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Resolution:</span>
                              <p className="italic leading-normal">{req.resolution_notes}</p>
                              {req.resolution_date && (
                                <p className="text-[9px] text-emerald-500/80 font-bold uppercase mt-1">
                                  Done: {new Date(req.resolution_date).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Users (Reporter & Tech) */}
                          <div className="border-t border-border/30 pt-2 flex flex-col space-y-1 text-[11px]">
                            <div className="flex items-center text-muted-foreground space-x-1">
                              <User className="w-3.5 h-3.5 shrink-0" />
                              <span>Reporter: <strong className="text-slate-300 font-semibold">{req.user?.name || 'User'}</strong></span>
                            </div>
                            
                            {req.technician ? (
                              <div className="flex items-center text-muted-foreground space-x-1">
                                <Wrench className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span>Technician: <strong className="text-primary font-semibold">{req.technician.name}</strong></span>
                              </div>
                            ) : req.status !== 'Pending' && req.status !== 'Resolved' && (
                              <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider mt-1 block">Unassigned</span>
                            )}
                          </div>

                          {/* Quick Action Button Overlays */}
                          <div className="flex flex-wrap gap-1.5 pt-2.5">
                            {/* Approve */}
                            {req.status === 'Pending' && isAdminOrManager && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateRequestStatus(req.id, { status: 'Approved' })}
                                className="h-7 text-[10px] rounded-lg bg-purple-500/10 hover:bg-purple-500/25 border-purple-500/30 text-purple-400 w-full"
                              >
                                <Sparkles className="w-3.5 h-3.5 mr-1" /> Approve Request
                              </Button>
                            )}

                            {/* Assign Technician */}
                            {req.status === 'Approved' && isAdminOrManager && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setAssigningRequest(req);
                                  setSelectedTechId(req.technician_id?.toString() || '');
                                  setIsAssignOpen(true);
                                }}
                                className="h-7 text-[10px] rounded-lg bg-blue-500/10 hover:bg-blue-500/25 border-blue-500/30 text-blue-400 w-full"
                              >
                                <UserPlus className="w-3.5 h-3.5 mr-1" /> Assign Tech
                              </Button>
                            )}

                            {/* Start Work */}
                            {req.status === 'Technician Assigned' && (isAdminOrManager || req.technician_id === currentUser?.id) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateRequestStatus(req.id, { status: 'In Progress' })}
                                className="h-7 text-[10px] rounded-lg bg-amber-500/10 hover:bg-amber-500/25 border-amber-500/30 text-amber-400 w-full"
                              >
                                <Play className="w-3.5 h-3.5 mr-1" /> Start Work
                              </Button>
                            )}

                            {/* Resolve */}
                            {req.status === 'In Progress' && (isAdminOrManager || req.technician_id === currentUser?.id) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setResolvingRequest(req);
                                  setResolutionNotes('');
                                  setIsResolveOpen(true);
                                }}
                                className="h-7 text-[10px] rounded-lg bg-emerald-500/10 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-400 w-full"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark Resolved
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

      {/* Lightbox Modal */}
      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="bg-sidebar border border-border/50 text-white rounded-3xl max-w-2xl p-4 shadow-soft">
          <div className="flex flex-col items-center">
            {lightboxImage && (
              <img
                src={lightboxImage}
                alt="Full attachment view"
                className="max-h-[80vh] w-auto object-contain rounded-2xl border border-border/30 bg-muted/10 shadow-glass"
              />
            )}
            <div className="mt-3 w-full flex justify-end">
              <Button onClick={() => setLightboxImage(null)} variant="secondary" className="rounded-xl">
                Close View
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Request Maintenance Dialog */}
      <Dialog open={isSubmitOpen} onOpenChange={setIsSubmitOpen}>
        <DialogContent className="bg-sidebar border border-border/50 text-white rounded-3xl max-w-md p-6 shadow-soft">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Wrench className="w-5 h-5 text-primary" /> Request Maintenance
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Log an issue for a corporate asset. Your request will queue in "Pending" for manager review.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitRequest} className="space-y-4 pt-2 text-left">
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm font-semibold">Select Asset *</Label>
              <Select
                value={submitForm.asset_id}
                onValueChange={(val) => setSubmitForm(prev => ({ ...prev, asset_id: val }))}
              >
                <SelectTrigger className="bg-card border border-border/40 text-white rounded-xl">
                  <SelectValue placeholder="Choose asset..." />
                </SelectTrigger>
                <SelectContent className="bg-card border border-border/40 text-white">
                  {assets.map(asset => (
                    <SelectItem key={asset.id} value={asset.id.toString()}>
                      {asset.name} ({asset.asset_tag})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 text-sm font-semibold">Priority Level</Label>
              <Select
                value={submitForm.priority}
                onValueChange={(val) => setSubmitForm(prev => ({ ...prev, priority: val }))}
              >
                <SelectTrigger className="bg-card border border-border/40 text-white rounded-xl">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent className="bg-card border border-border/40 text-white">
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 text-sm font-semibold">Describe the issue *</Label>
              <textarea
                value={submitForm.issue_description}
                onChange={(e) => setSubmitForm(prev => ({ ...prev, issue_description: e.target.value }))}
                placeholder="What seems to be broken? Be as detailed as possible."
                className="bg-card border border-border/40 text-white rounded-xl w-full h-24 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 text-sm font-semibold">Photo Attachment (Optional)</Label>
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-border/40 rounded-2xl p-4 bg-card/20 hover:bg-card/30 transition-all cursor-pointer relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                {submitFilePreview ? (
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-border/40">
                    <img src={submitFilePreview} alt="Upload preview" className="object-cover w-full h-full" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center space-y-1">
                    <ImageIcon className="w-8 h-8 text-muted-foreground/70" />
                    <p className="text-xs text-muted-foreground">Click to upload or drag image file here</p>
                    <p className="text-[10px] text-muted-foreground/50">PNG, JPG, JPEG up to 2MB</p>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="ghost" onClick={() => setIsSubmitOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl bg-primary text-primary-foreground font-semibold">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Technician Dialog */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="bg-sidebar border border-border/50 text-white rounded-3xl max-w-sm p-6 shadow-soft">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" /> Assign Technician
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Select an active staff member to dispatch for this maintenance request.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssignTechnician} className="space-y-4 pt-2 text-left">
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm font-semibold">Assign Staff Member *</Label>
              <Select
                value={selectedTechId}
                onValueChange={setSelectedTechId}
              >
                <SelectTrigger className="bg-card border border-border/40 text-white rounded-xl">
                  <SelectValue placeholder="Choose technician..." />
                </SelectTrigger>
                <SelectContent className="bg-card border border-border/40 text-white">
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.name} ({emp.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsAssignOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={isAssigning} className="rounded-xl bg-primary text-primary-foreground">
                {isAssigning ? 'Saving...' : 'Assign Staff'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Resolve Request Dialog */}
      <Dialog open={isResolveOpen} onOpenChange={setIsResolveOpen}>
        <DialogContent className="bg-sidebar border border-border/50 text-white rounded-3xl max-w-md p-6 shadow-soft">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Log Resolution Details
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Enter comments describing how the asset issue was fixed. The asset's status will sync to "Available".
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResolveRequest} className="space-y-4 pt-2 text-left">
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm font-semibold">Resolution Comments *</Label>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Describe actions taken e.g. repaired motherboard capacitors, replaced bulb."
                className="bg-card border border-border/40 text-white rounded-xl w-full h-24 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsResolveOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={isResolving} className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white">
                {isResolving ? 'Resolving...' : 'Complete & Close'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
