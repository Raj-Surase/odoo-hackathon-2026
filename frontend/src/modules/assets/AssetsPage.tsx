import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/modules/auth/AuthContext';
import {
  FolderOpen,
  Plus,
  Search,
  MapPin,
  Edit2,
  Trash2,
  Loader2,
  Check,
  FileImage,
  Tag,
  AlertTriangle,
  Info,
  Layers,
  History,
  TrendingUp,
  SlidersHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  department_id: number | null;
}

interface Department {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
  custom_fields: any[] | null;
}

interface Asset {
  id: number;
  name: string;
  asset_tag: string;
  serial_number: string | null;
  category_id: number;
  acquisition_date: string | null;
  acquisition_cost: string | null;
  condition: string;
  location: string | null;
  status: string;
  is_bookable: boolean;
  department_id: number | null;
  holder_id: number | null;
  photo_path: string | null;
  category?: Category;
  department?: Department | null;
  holder?: User | null;
}

interface TimelineItem {
  type: 'allocation' | 'transfer' | 'maintenance';
  date: string;
  status: string;
  description: string;
  details: string | null;
  user: string;
}

export default function AssetsPage() {
  const { user: currentUser } = useAuth();
  const isAdminOrManager = currentUser?.role === 'Admin' || currentUser?.role === 'Asset Manager';

  // State Management
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssetsLoading, setIsAssetsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters State
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCondition, setSelectedCondition] = useState('all');

  // Dialog States
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // History Log States
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedHistoryAsset, setSelectedHistoryAsset] = useState<Asset | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Error States
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  // Asset Form State
  const [form, setForm] = useState({
    name: '',
    serial_number: '',
    category_id: '',
    acquisition_date: '',
    acquisition_cost: '',
    condition: 'Good',
    location: '',
    status: 'Available',
    is_bookable: false,
    department_id: 'none'
  });

  // Fetch initial data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [catsRes, deptsRes] = await Promise.all([
        api.get('/categories'),
        api.get('/departments-all')
      ]);
      setCategories(catsRes.data);
      setDepartments(deptsRes.data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to load settings dependency data.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch assets list based on filters
  const fetchAssets = async () => {
    setIsAssetsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedCategory !== 'all') params.append('category_id', selectedCategory);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      if (selectedCondition !== 'all') params.append('condition', selectedCondition);

      const res = await api.get(`/assets?${params.toString()}`);
      setAssets(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAssetsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [search, selectedCategory, selectedStatus, selectedCondition]);

  // Reset asset creation/edit form
  const resetForm = () => {
    setForm({
      name: '',
      serial_number: '',
      category_id: '',
      acquisition_date: '',
      acquisition_cost: '',
      condition: 'Good',
      location: '',
      status: 'Available',
      is_bookable: false,
      department_id: 'none'
    });
    setEditingAsset(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    setValidationErrors({});
    setErrorMsg(null);
  };

  // Handle opening of register modal
  const handleOpenRegister = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  // Handle opening of edit modal
  const handleOpenEdit = (asset: Asset) => {
    resetForm();
    setEditingAsset(asset);
    setForm({
      name: asset.name,
      serial_number: asset.serial_number || '',
      category_id: asset.category_id.toString(),
      acquisition_date: asset.acquisition_date ? asset.acquisition_date.split('T')[0] : '',
      acquisition_cost: asset.acquisition_cost ? parseFloat(asset.acquisition_cost).toString() : '',
      condition: asset.condition,
      location: asset.location || '',
      status: asset.status,
      is_bookable: asset.is_bookable,
      department_id: asset.department_id ? asset.department_id.toString() : 'none'
    });
    if (asset.photo_path) {
      setPhotoPreview(`/storage/${asset.photo_path}`);
    }
    setIsDialogOpen(true);
  };

  // Handle asset save (insert or update)
  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setValidationErrors({});

    const formData = new FormData();
    formData.append('name', form.name);
    formData.append('category_id', form.category_id);
    formData.append('condition', form.condition);
    formData.append('is_bookable', form.is_bookable ? '1' : '0');
    
    if (form.serial_number) formData.append('serial_number', form.serial_number);
    if (form.acquisition_date) formData.append('acquisition_date', form.acquisition_date);
    if (form.acquisition_cost) formData.append('acquisition_cost', form.acquisition_cost);
    if (form.location) formData.append('location', form.location);
    if (form.status) formData.append('status', form.status);
    
    if (form.department_id && form.department_id !== 'none') {
      formData.append('department_id', form.department_id);
    }

    if (photoFile) {
      formData.append('photo', photoFile);
    }

    // Classic Laravel multipart PUT override via _method parameter
    if (editingAsset) {
      formData.append('_method', 'PUT');
    }

    try {
      if (editingAsset) {
        await api.post(`/assets/${editingAsset.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/assets', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      setIsDialogOpen(false);
      resetForm();
      fetchAssets();
    } catch (err: any) {
      if (err.response && err.response.status === 422) {
        setValidationErrors(err.response.data.errors || {});
      } else {
        setErrorMsg(err.response?.data?.message || 'Failed to save asset.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle asset delete
  const handleDeleteAsset = async (asset: Asset) => {
    if (!window.confirm(`Are you sure you want to delete ${asset.name} (${asset.asset_tag})?`)) {
      return;
    }
    setErrorMsg(null);
    try {
      await api.delete(`/assets/${asset.id}`);
      fetchAssets();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete asset.');
    }
  };

  // Open asset timeline/history
  const handleOpenHistory = async (asset: Asset) => {
    setSelectedHistoryAsset(asset);
    setIsHistoryOpen(true);
    setIsHistoryLoading(true);
    setTimeline([]);
    try {
      const res = await api.get(`/assets/${asset.id}/history`);
      setTimeline(res.data.timeline || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  // Handle photo input selection
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  // Compute operational overview stats
  const totalCount = assets.length;
  const availableCount = assets.filter(a => a.status === 'Available').length;
  const allocatedCount = assets.filter(a => a.status === 'Allocated').length;
  const maintenanceCount = assets.filter(a => a.status === 'Under Maintenance').length;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner and Quick Register Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <FolderOpen className="text-primary w-8 h-8" />
            Asset Directory
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track, query, and manage organizational hardware, licenses, and bookable resources.
          </p>
        </div>

        {isAdminOrManager && (
          <Button
            onClick={handleOpenRegister}
            className="rounded-2xl bg-primary hover:bg-primary-hover text-white shadow-soft transition-all duration-300 font-semibold flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Register Asset
          </Button>
        )}
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <Card key={idx} className="bg-card/50 backdrop-blur-xl border border-border/40 rounded-3xl shadow-soft">
              <CardContent className="p-6 flex items-center space-x-4">
                <Skeleton className="p-3 h-12 w-12 rounded-2xl bg-muted/40" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-20 bg-muted/40" />
                  <Skeleton className="h-6 w-12 bg-muted/40" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="bg-card/50 backdrop-blur-xl border border-border/40 rounded-3xl shadow-soft">
              <CardContent className="p-6 flex items-center space-x-4">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <Layers className="text-primary w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total Assets</p>
                  <h3 className="text-2xl font-black text-white mt-1">{totalCount}</h3>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-xl border border-border/40 rounded-3xl shadow-soft">
              <CardContent className="p-6 flex items-center space-x-4">
                <div className="p-3 bg-emerald-500/10 rounded-2xl">
                  <Check className="text-emerald-400 w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Available</p>
                  <h3 className="text-2xl font-black text-emerald-400 mt-1">{availableCount}</h3>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-xl border border-border/40 rounded-3xl shadow-soft">
              <CardContent className="p-6 flex items-center space-x-4">
                <div className="p-3 bg-blue-500/10 rounded-2xl">
                  <TrendingUp className="text-blue-400 w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Allocated</p>
                  <h3 className="text-2xl font-black text-blue-400 mt-1">{allocatedCount}</h3>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-xl border border-border/40 rounded-3xl shadow-soft">
              <CardContent className="p-6 flex items-center space-x-4">
                <div className="p-3 bg-amber-500/10 rounded-2xl">
                  <AlertTriangle className="text-amber-400 w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">In Maintenance</p>
                  <h3 className="text-2xl font-black text-amber-400 mt-1">{maintenanceCount}</h3>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Control Panel (Filters and Search) */}
      <Card className="bg-card/45 backdrop-blur-lg border border-border/40 rounded-3xl p-6 shadow-soft space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          {/* Search bar */}
          <div className="relative w-full lg:flex-1">
            <Search className="absolute left-4 top-3 text-muted-foreground/60 w-5 h-5" />
            <Input
              placeholder="Search tag, name, serial number, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 bg-background/50 border-border/50 rounded-2xl focus-visible:ring-primary focus-visible:border-primary text-white"
            />
          </div>

          {/* Quick Filters Pill triggers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
            {/* Category Dropdown */}
            <div className="space-y-1.5">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="bg-background/40 border-border/50 rounded-2xl text-xs text-white min-w-[150px]">
                  <SlidersHorizontal className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border/50 rounded-2xl text-white">
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Dropdown */}
            <div className="space-y-1.5">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="bg-background/40 border-border/50 rounded-2xl text-xs text-white min-w-[150px]">
                  <span className="w-2 h-2 rounded-full bg-primary/75 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border/50 rounded-2xl text-white">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="Allocated">Allocated</SelectItem>
                  <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Condition Dropdown */}
            <div className="space-y-1.5">
              <Select value={selectedCondition} onValueChange={setSelectedCondition}>
                <SelectTrigger className="bg-background/40 border-border/50 rounded-2xl text-xs text-white min-w-[150px]">
                  <span className="w-2 h-2 rounded-full bg-violet-400 mr-2" />
                  <SelectValue placeholder="Condition" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border/50 rounded-2xl text-white">
                  <SelectItem value="all">All Conditions</SelectItem>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Fair">Fair</SelectItem>
                  <SelectItem value="Damaged">Damaged</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Directory Table */}
      <Card className="bg-card/40 backdrop-blur-md border border-border/30 rounded-3xl overflow-hidden shadow-glass">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/15 border-b border-border/40">
              <TableRow>
                <TableHead className="text-muted-foreground text-xs font-bold uppercase tracking-wider py-4 pl-6">Tag</TableHead>
                <TableHead className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Photo</TableHead>
                <TableHead className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Asset Info</TableHead>
                <TableHead className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Category</TableHead>
                <TableHead className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Location</TableHead>
                <TableHead className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Condition</TableHead>
                <TableHead className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Holder</TableHead>
                <TableHead className="text-muted-foreground text-xs font-bold uppercase tracking-wider text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isAssetsLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx} className="border-b border-border/20">
                    <TableCell className="py-4 pl-6"><Skeleton className="h-6 w-16 rounded bg-muted/40" /></TableCell>
                    <TableCell><Skeleton className="w-12 h-12 rounded-xl bg-muted/40" /></TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-28 bg-muted/40" />
                        <Skeleton className="h-3 w-20 bg-muted/40" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-16 bg-muted/40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20 bg-muted/40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full bg-muted/40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full bg-muted/40" /></TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-24 bg-muted/40" />
                        <Skeleton className="h-3 w-12 bg-muted/40" />
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6"><Skeleton className="h-8 w-24 ml-auto rounded-xl bg-muted/40" /></TableCell>
                  </TableRow>
                ))
              ) : assets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Info className="w-8 h-8 text-muted-foreground/50" />
                      <span>No assets found matching the filter query.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                assets.map((asset) => (
                  <TableRow
                    key={asset.id}
                    className="border-b border-border/20 hover:bg-muted/10 transition-colors duration-150 group"
                  >
                    <TableCell className="py-4 pl-6 font-mono text-sm text-white font-semibold">
                      <Badge variant="outline" className="bg-background/40 border-primary/20 text-primary-light font-mono rounded-lg">
                        {asset.asset_tag}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {asset.photo_path ? (
                        <img
                          src={`/storage/${asset.photo_path}`}
                          alt={asset.name}
                          className="w-12 h-12 object-cover rounded-xl border border-border/40 bg-muted/40 shadow-soft"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl border border-dashed border-border/60 bg-muted/20 flex items-center justify-center">
                          <FileImage className="w-5 h-5 text-muted-foreground/40" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <h4 className="text-sm font-bold text-white group-hover:text-primary transition-colors duration-200">
                          {asset.name}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                          {asset.serial_number ? `S/N: ${asset.serial_number}` : 'No Serial'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-300">
                      {asset.category?.name || 'Unassigned'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-300">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground/60" />
                        <span>{asset.location || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold select-none border ${
                          asset.status === 'Available'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                            : asset.status === 'Allocated'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/25'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                        }`}
                      >
                        {asset.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`rounded-full px-2.5 py-0.5 text-[10px] uppercase font-bold border ${
                          asset.condition === 'Good'
                            ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
                            : asset.condition === 'Fair'
                            ? 'text-violet-400 border-violet-500/20 bg-violet-500/5'
                            : 'text-rose-400 border-rose-500/20 bg-rose-500/5'
                        }`}
                      >
                        {asset.condition}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-300">
                      {asset.holder ? (
                        <div className="flex flex-col">
                          <span className="font-semibold text-white">{asset.holder.name}</span>
                          <span className="text-[10px] text-muted-foreground">{asset.department?.name || 'IT'}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60 text-xs italic">Shared / Stock</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end space-x-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenHistory(asset)}
                          title="Lifecycle History"
                          className="h-8 w-8 text-muted-foreground hover:text-white hover:bg-muted/20 rounded-xl"
                        >
                          <History className="w-4 h-4" />
                        </Button>

                        {isAdminOrManager && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(asset)}
                              title="Edit Asset"
                              className="h-8 w-8 text-muted-foreground hover:text-white hover:bg-muted/20 rounded-xl"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteAsset(asset)}
                              title="Delete Asset"
                              className="h-8 w-8 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded-xl"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Register & Edit Asset Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && setIsDialogOpen(false)}>
        <DialogContent className="bg-card border border-border/40 text-white rounded-3xl max-w-xl max-h-[90vh] overflow-y-auto no-scrollbar shadow-glass">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Tag className="text-primary w-5 h-5" />
              {editingAsset ? `Edit Asset: ${editingAsset.asset_tag}` : 'Register New Asset'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Complete the asset metadata. Sequential tags are automatically generated.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/25 p-3.5 rounded-2xl flex items-start gap-2 text-rose-400 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSaveAsset} className="space-y-4 py-2">
            {/* Photo upload section */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-300">Asset Display Image</Label>
              <div className="flex items-center gap-4">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-16 h-16 object-cover rounded-2xl border border-border/40 bg-muted/40 shadow-soft"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl border border-dashed border-border/60 bg-muted/20 flex items-center justify-center shrink-0">
                    <FileImage className="w-6 h-6 text-muted-foreground/30" />
                  </div>
                )}
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="text-xs bg-background/50 border-border/50 text-white rounded-xl file:bg-primary/20 file:border-0 file:text-primary-light file:font-bold file:rounded-lg file:text-xs file:py-1 file:px-2 cursor-pointer"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Accepts JPG, PNG, GIF. Max 2MB.</p>
                </div>
              </div>
            </div>

            {/* Asset Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-semibold text-gray-300">Asset Name *</Label>
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Dell UltraSharp 27 Monitor"
                className="bg-background/50 border-border/50 rounded-xl focus-visible:ring-primary focus-visible:border-primary text-white"
              />
              {validationErrors.name && (
                <p className="text-[10px] text-rose-400 mt-1 font-semibold">{validationErrors.name[0]}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category_id" className="text-xs font-semibold text-gray-300">Category *</Label>
                <Select
                  value={form.category_id}
                  onValueChange={(val) => setForm({ ...form, category_id: val })}
                >
                  <SelectTrigger id="category_id" className="bg-background/50 border-border/50 rounded-xl text-white">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border/50 rounded-xl text-white">
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {validationErrors.category_id && (
                  <p className="text-[10px] text-rose-400 mt-1 font-semibold">{validationErrors.category_id[0]}</p>
                )}
              </div>

              {/* Serial Number */}
              <div className="space-y-2">
                <Label htmlFor="serial_number" className="text-xs font-semibold text-gray-300">Serial Number</Label>
                <Input
                  id="serial_number"
                  value={form.serial_number}
                  onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
                  placeholder="e.g. SN-DS-9821-X"
                  className="bg-background/50 border-border/50 rounded-xl focus-visible:ring-primary focus-visible:border-primary text-white font-mono text-xs"
                />
                {validationErrors.serial_number && (
                  <p className="text-[10px] text-rose-400 mt-1 font-semibold">{validationErrors.serial_number[0]}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location" className="text-xs font-semibold text-gray-300">Operational Location</Label>
                <Input
                  id="location"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. Bangalore HQ Desk 42"
                  className="bg-background/50 border-border/50 rounded-xl focus-visible:ring-primary focus-visible:border-primary text-white"
                />
                {validationErrors.location && (
                  <p className="text-[10px] text-rose-400 mt-1 font-semibold">{validationErrors.location[0]}</p>
                )}
              </div>

              {/* Department scope */}
              <div className="space-y-2">
                <Label htmlFor="department_id" className="text-xs font-semibold text-gray-300">Assigned Department</Label>
                <Select
                  value={form.department_id}
                  onValueChange={(val) => setForm({ ...form, department_id: val })}
                >
                  <SelectTrigger id="department_id" className="bg-background/50 border-border/50 rounded-xl text-white">
                    <SelectValue placeholder="No Department (Stock)" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border/50 rounded-xl text-white">
                    <SelectItem value="none">Shared / No Department</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {validationErrors.department_id && (
                  <p className="text-[10px] text-rose-400 mt-1 font-semibold">{validationErrors.department_id[0]}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Acquisition Date */}
              <div className="space-y-2">
                <Label htmlFor="acquisition_date" className="text-xs font-semibold text-gray-300">Acquisition Date</Label>
                <Input
                  id="acquisition_date"
                  type="date"
                  value={form.acquisition_date}
                  onChange={(e) => setForm({ ...form, acquisition_date: e.target.value })}
                  className="bg-background/50 border-border/50 rounded-xl focus-visible:ring-primary focus-visible:border-primary text-white text-xs"
                />
                {validationErrors.acquisition_date && (
                  <p className="text-[10px] text-rose-400 mt-1 font-semibold">{validationErrors.acquisition_date[0]}</p>
                )}
              </div>

              {/* Acquisition Cost */}
              <div className="space-y-2">
                <Label htmlFor="acquisition_cost" className="text-xs font-semibold text-gray-300">Acquisition Cost (INR)</Label>
                <Input
                  id="acquisition_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.acquisition_cost}
                  onChange={(e) => setForm({ ...form, acquisition_cost: e.target.value })}
                  placeholder="e.g. 18500.00"
                  className="bg-background/50 border-border/50 rounded-xl focus-visible:ring-primary focus-visible:border-primary text-white text-xs"
                />
                {validationErrors.acquisition_cost && (
                  <p className="text-[10px] text-rose-400 mt-1 font-semibold">{validationErrors.acquisition_cost[0]}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Condition */}
              <div className="space-y-2">
                <Label htmlFor="condition" className="text-xs font-semibold text-gray-300">Condition *</Label>
                <Select
                  value={form.condition}
                  onValueChange={(val) => setForm({ ...form, condition: val })}
                >
                  <SelectTrigger id="condition" className="bg-background/50 border-border/50 rounded-xl text-white">
                    <SelectValue placeholder="Condition" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border/50 rounded-xl text-white">
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Fair">Fair</SelectItem>
                    <SelectItem value="Damaged">Damaged</SelectItem>
                  </SelectContent>
                </Select>
                {validationErrors.condition && (
                  <p className="text-[10px] text-rose-400 mt-1 font-semibold">{validationErrors.condition[0]}</p>
                )}
              </div>

              {/* Status (Only visible when editing asset) */}
              {editingAsset ? (
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-xs font-semibold text-gray-300">Status *</Label>
                  <Select
                    value={form.status}
                    onValueChange={(val) => setForm({ ...form, status: val })}
                  >
                    <SelectTrigger id="status" className="bg-background/50 border-border/50 rounded-xl text-white">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border/50 rounded-xl text-white">
                      <SelectItem value="Available">Available</SelectItem>
                      <SelectItem value="Allocated">Allocated</SelectItem>
                      <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                  {validationErrors.status && (
                    <p className="text-[10px] text-rose-400 mt-1 font-semibold">{validationErrors.status[0]}</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-2 pt-8">
                  <Switch
                    id="is_bookable"
                    checked={form.is_bookable}
                    onCheckedChange={(checked) => setForm({ ...form, is_bookable: checked })}
                    className="data-[state=checked]:bg-primary"
                  />
                  <Label htmlFor="is_bookable" className="text-xs font-semibold text-gray-300 cursor-pointer">
                    Configure as Bookable Resource
                  </Label>
                </div>
              )}
            </div>

            {editingAsset && (
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="is_bookable"
                  checked={form.is_bookable}
                  onCheckedChange={(checked) => setForm({ ...form, is_bookable: checked })}
                  className="data-[state=checked]:bg-primary"
                />
                <Label htmlFor="is_bookable" className="text-xs font-semibold text-gray-300 cursor-pointer">
                  Configure as Bookable Resource
                </Label>
              </div>
            )}

            <DialogFooter className="pt-4 border-t border-border/20 flex flex-row items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDialogOpen(false)}
                className="rounded-xl border border-border/40 hover:bg-muted/15 text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-primary hover:bg-primary-hover text-white shadow-soft font-semibold transition-all duration-200"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Asset'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Timeline History Slide-over / Modal */}
      <Dialog open={isHistoryOpen} onOpenChange={(open) => !open && setIsHistoryOpen(false)}>
        <DialogContent className="bg-card border border-border/40 text-white rounded-3xl max-w-lg shadow-glass max-h-[85vh] overflow-y-auto no-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <History className="text-primary w-5 h-5" />
              Asset Lifecycle Timeline
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs font-mono">
              {selectedHistoryAsset?.name} ({selectedHistoryAsset?.asset_tag})
            </DialogDescription>
          </DialogHeader>

          {isHistoryLoading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-xs text-muted-foreground">Retrieving chronological transaction logs...</p>
            </div>
          ) : timeline.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground space-y-2">
              <Info className="w-8 h-8 mx-auto text-muted-foreground/45" />
              <p className="text-sm">No transaction history found for this asset.</p>
              <p className="text-xs text-muted-foreground/60">Allocations, transfers, and maintenance logs will appear here.</p>
            </div>
          ) : (
            <div className="relative border-l border-border/60 pl-6 space-y-8 py-4 ml-3 select-none">
              {timeline.map((item, idx) => (
                <div key={idx} className="relative">
                  {/* Timeline circle icon indicator */}
                  <span className={`absolute -left-[37px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-card ${
                    item.type === 'allocation'
                      ? 'bg-blue-500 text-white'
                      : item.type === 'transfer'
                      ? 'bg-purple-500 text-white'
                      : 'bg-amber-500 text-white'
                  }`}>
                    {item.type === 'allocation' ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : item.type === 'transfer' ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    )}
                  </span>

                  {/* Log description */}
                  <div>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {new Date(item.date).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <h4 className="text-sm font-semibold text-white mt-0.5">
                      {item.description}
                    </h4>
                    {item.details && (
                      <p className="text-xs text-muted-foreground bg-background/30 border border-border/20 p-2.5 rounded-xl mt-2 italic font-sans">
                        {item.details}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                      <span className="text-[10px] text-muted-foreground font-sans">
                        Action by: <span className="text-white font-medium">{item.user}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="pt-4 border-t border-border/20">
            <Button
              type="button"
              onClick={() => setIsHistoryOpen(false)}
              className="rounded-xl border border-border/40 bg-muted/10 hover:bg-muted/20 text-white w-full sm:w-auto"
            >
              Close History
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
