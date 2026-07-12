import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/modules/auth/AuthContext';
import { 
  Building2, 
  Settings2, 
  Users, 
  Plus, 
  Edit2, 
  Power, 
  PowerOff, 
  Trash2, 
  Loader2, 
  X,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'Employee' | 'Dept Head' | 'Asset Manager' | 'Admin';
  department_id: number | null;
  status: 'Active' | 'Inactive';
  department?: Department | null;
}

interface Department {
  id: number;
  name: string;
  head_id: number | null;
  parent_id: number | null;
  status: 'Active' | 'Inactive';
  parent?: Department | null;
  head?: User | null;
}

interface CustomField {
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean';
  required: boolean;
}

interface Category {
  id: number;
  name: string;
  custom_fields: CustomField[] | null;
}

export default function SetupPage() {
  const { user: currentUser } = useAuth();

  // Tab States
  const [activeTab, setActiveTab] = useState('departments');

  // Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data States
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);

  // Dialog States
  const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false);
  const [isCatDialogOpen, setIsCatDialogOpen] = useState(false);

  // Editing States
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  // Form States
  const [deptForm, setDeptForm] = useState({
    name: '',
    head_id: 'none',
    parent_id: 'none',
    status: 'Active' as 'Active' | 'Inactive'
  });

  const [catForm, setCatForm] = useState<{
    name: string;
    custom_fields: CustomField[];
  }>({
    name: '',
    custom_fields: []
  });

  // Alert/Error states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  // Fetch initial data
  const fetchData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [deptsRes, catsRes, empsRes] = await Promise.all([
        api.get('/departments-all'),
        api.get('/categories'),
        api.get('/employees')
      ]);
      setDepartments(deptsRes.data);
      setCategories(catsRes.data);
      setEmployees(empsRes.data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to load system settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter lists
  const deptHeads = employees.filter(emp => emp.role === 'Dept Head' || emp.role === 'Admin');

  // Reset forms
  const resetDeptForm = () => {
    setDeptForm({
      name: '',
      head_id: 'none',
      parent_id: 'none',
      status: 'Active'
    });
    setEditingDept(null);
    setValidationErrors({});
    setErrorMsg(null);
  };

  const resetCatForm = () => {
    setCatForm({
      name: '',
      custom_fields: []
    });
    setEditingCat(null);
    setValidationErrors({});
    setErrorMsg(null);
  };

  // --- Department Actions ---
  const handleOpenEditDept = (dept: Department) => {
    setEditingDept(dept);
    setDeptForm({
      name: dept.name,
      head_id: dept.head_id ? dept.head_id.toString() : 'none',
      parent_id: dept.parent_id ? dept.parent_id.toString() : 'none',
      status: dept.status
    });
    setIsDeptDialogOpen(true);
  };

  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setValidationErrors({});

    const payload = {
      name: deptForm.name,
      head_id: deptForm.head_id === 'none' ? null : parseInt(deptForm.head_id, 10),
      parent_id: deptForm.parent_id === 'none' ? null : parseInt(deptForm.parent_id, 10),
      status: deptForm.status
    };

    try {
      if (editingDept) {
        await api.put(`/departments/${editingDept.id}`, payload);
      } else {
        await api.post('/departments', payload);
      }
      setIsDeptDialogOpen(false);
      resetDeptForm();
      await fetchData();
    } catch (err: any) {
      if (err.response && err.response.status === 422) {
        setValidationErrors(err.response.data.errors || {});
      } else {
        setErrorMsg(err.response?.data?.message || 'Failed to save department.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleDeptStatus = async (dept: Department) => {
    setErrorMsg(null);
    const newStatus = dept.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await api.put(`/departments/${dept.id}`, {
        name: dept.name,
        head_id: dept.head_id,
        parent_id: dept.parent_id,
        status: newStatus
      });
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update department status.');
    }
  };

  // --- Category Actions ---
  const handleOpenEditCat = (cat: Category) => {
    setEditingCat(cat);
    setCatForm({
      name: cat.name,
      custom_fields: cat.custom_fields || []
    });
    setIsCatDialogOpen(true);
  };

  const handleAddField = () => {
    setCatForm(prev => ({
      ...prev,
      custom_fields: [...prev.custom_fields, { name: '', type: 'text', required: false }]
    }));
  };

  const handleRemoveField = (index: number) => {
    setCatForm(prev => ({
      ...prev,
      custom_fields: prev.custom_fields.filter((_, i) => i !== index)
    }));
  };

  const handleFieldChange = (index: number, key: keyof CustomField, value: any) => {
    const updated = [...catForm.custom_fields];
    updated[index] = {
      ...updated[index],
      [key]: value
    };
    setCatForm(prev => ({ ...prev, custom_fields: updated }));
  };

  const handleSaveCat = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setValidationErrors({});

    const payload = {
      name: catForm.name,
      custom_fields: catForm.custom_fields
    };

    try {
      if (editingCat) {
        await api.put(`/categories/${editingCat.id}`, payload);
      } else {
        await api.post('/categories', payload);
      }
      setIsCatDialogOpen(false);
      resetCatForm();
      await fetchData();
    } catch (err: any) {
      if (err.response && err.response.status === 422) {
        setValidationErrors(err.response.data.errors || {});
      } else {
        setErrorMsg(err.response?.data?.message || 'Failed to save category.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCat = async (catId: number) => {
    setErrorMsg(null);
    if (!confirm('Are you sure you want to delete this category? This cannot be undone.')) return;
    try {
      await api.delete(`/categories/${catId}`);
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete category.');
    }
  };

  // --- Employee Actions ---
  const handleRoleChange = async (userId: number, role: User['role']) => {
    setErrorMsg(null);
    try {
      await api.patch(`/employees/${userId}/role`, { role });
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update user role.');
    }
  };

  const handleUserDeptChange = async (userId: number, department_id: number | null) => {
    setErrorMsg(null);
    try {
      await api.patch(`/employees/${userId}/role`, { department_id });
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update employee department.');
    }
  };

  const handleToggleUserStatus = async (emp: User) => {
    setErrorMsg(null);
    if (emp.id === currentUser?.id) {
      setErrorMsg('You cannot deactivate your own account.');
      return;
    }
    const newStatus = emp.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await api.patch(`/employees/${emp.id}/role`, { status: newStatus });
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update employee status.');
    }
  };



  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Settings2 className="h-8 w-8 text-primary" />
            Organization Setup
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Global administrative configurations. Manage departments, categories, schemas, and employee privileges.
          </p>
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMsg && (
        <div className="bg-destructive/15 border border-destructive/30 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-white">System Error</h4>
            <p className="text-muted-foreground text-xs mt-1">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-muted-foreground hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Tabs Container */}
      <Tabs defaultValue="departments" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex justify-between items-center border-b border-border/40 pb-2">
          <TabsList className="bg-card border border-border/50 rounded-2xl p-1">
            <TabsTrigger value="departments" className="rounded-xl flex items-center gap-2 px-4 py-2 text-sm font-sans tracking-wide">
              <Building2 className="h-4 w-4" />
              Departments
            </TabsTrigger>
            <TabsTrigger value="categories" className="rounded-xl flex items-center gap-2 px-4 py-2 text-sm font-sans tracking-wide">
              <Settings2 className="h-4 w-4" />
              Asset Categories
            </TabsTrigger>
            <TabsTrigger value="employees" className="rounded-xl flex items-center gap-2 px-4 py-2 text-sm font-sans tracking-wide">
              <Users className="h-4 w-4" />
              Employee Directory
            </TabsTrigger>
          </TabsList>

          {/* Contextual Action Buttons */}
          {activeTab === 'departments' && (
            <Dialog open={isDeptDialogOpen} onOpenChange={(open) => {
              setIsDeptDialogOpen(open);
              if (!open) resetDeptForm();
            }}>
              <DialogTrigger asChild>
                <Button className="rounded-2xl gap-2 font-semibold">
                  <Plus className="h-4 w-4" /> Add Department
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border/60 rounded-3xl p-6 sm:max-w-[500px]">
                <form onSubmit={handleSaveDept} className="space-y-6">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-white">
                      {editingDept ? 'Modify Department' : 'Create Department'}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground text-xs mt-1">
                      Configure corporate groups and hierarchy structure.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="dept-name" className="text-sm font-semibold">Department Name</Label>
                      <Input
                        id="dept-name"
                        value={deptForm.name}
                        onChange={(e) => setDeptForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g. Engineering, Facilities"
                        className="rounded-xl"
                      />
                      {validationErrors.name && (
                        <p className="text-destructive text-xs">{validationErrors.name[0]}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dept-head" className="text-sm font-semibold">Head of Department</Label>
                        <Select
                          value={deptForm.head_id}
                          onValueChange={(val) => setDeptForm(prev => ({ ...prev, head_id: val }))}
                        >
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Select Head" />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border/60 rounded-2xl">
                            <SelectItem value="none">Unassigned</SelectItem>
                            {deptHeads.map(head => (
                              <SelectItem key={head.id} value={head.id.toString()}>
                                {head.name} ({head.role})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="dept-parent" className="text-sm font-semibold">Parent Department</Label>
                        <Select
                          value={deptForm.parent_id}
                          onValueChange={(val) => setDeptForm(prev => ({ ...prev, parent_id: val }))}
                        >
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Select Parent" />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border/60 rounded-2xl">
                            <SelectItem value="none">None (Root)</SelectItem>
                            {departments
                              .filter(d => !editingDept || d.id !== editingDept.id)
                              .map(d => (
                                <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        {validationErrors.parent_id && (
                          <p className="text-destructive text-xs">{validationErrors.parent_id[0]}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-secondary/20 border border-border/30 rounded-2xl">
                      <div>
                        <Label className="text-sm font-semibold block">Active Status</Label>
                        <span className="text-[10px] text-muted-foreground">Inactivate to hide from user registrations.</span>
                      </div>
                      <Switch
                        checked={deptForm.status === 'Active'}
                        onCheckedChange={(checked) => setDeptForm(prev => ({ ...prev, status: checked ? 'Active' : 'Inactive' }))}
                      />
                    </div>
                  </div>

                  <DialogFooter className="gap-2 sm:gap-0 mt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDeptDialogOpen(false)} className="rounded-xl">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className="rounded-xl">
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Department'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {activeTab === 'categories' && (
            <Dialog open={isCatDialogOpen} onOpenChange={(open) => {
              setIsCatDialogOpen(open);
              if (!open) resetCatForm();
            }}>
              <DialogTrigger asChild>
                <Button className="rounded-2xl gap-2 font-semibold">
                  <Plus className="h-4 w-4" /> Add Category
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border/60 rounded-3xl p-6 sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                <form onSubmit={handleSaveCat} className="space-y-6">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-white">
                      {editingCat ? 'Modify Category' : 'Create Asset Category'}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground text-xs mt-1">
                      Configure asset grouping and its custom specifications schema.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="cat-name" className="text-sm font-semibold">Category Name</Label>
                      <Input
                        id="cat-name"
                        value={catForm.name}
                        onChange={(e) => setCatForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g. Laptops, Vehicles, Furnitures"
                        className="rounded-xl"
                      />
                      {validationErrors.name && (
                        <p className="text-destructive text-xs">{validationErrors.name[0]}</p>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-border/40 pb-2">
                        <Label className="text-sm font-bold text-white">Custom Property Parameters</Label>
                        <Button type="button" variant="ghost" size="sm" onClick={handleAddField} className="h-8 rounded-xl text-primary font-semibold text-xs gap-1 hover:bg-primary/10">
                          <Plus className="h-3 w-3" /> Add Field
                        </Button>
                      </div>

                      {catForm.custom_fields.length === 0 ? (
                        <p className="text-muted-foreground text-xs text-center py-4 bg-secondary/10 border border-dashed border-border/50 rounded-2xl">
                          No custom field parameters defined. All assets in this category will use default specs.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {catForm.custom_fields.map((field, idx) => (
                            <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-secondary/15 p-3 rounded-2xl border border-border/30 relative">
                              <div className="flex-1 space-y-1.5 w-full">
                                <Input
                                  value={field.name}
                                  onChange={(e) => handleFieldChange(idx, 'name', e.target.value)}
                                  placeholder="Property Name (e.g. RAM, Material)"
                                  className="h-9 rounded-xl text-sm"
                                />
                                {validationErrors[`custom_fields.${idx}.name`] && (
                                  <p className="text-destructive text-[10px]">{validationErrors[`custom_fields.${idx}.name`][0]}</p>
                                )}
                              </div>

                              <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
                                <Select
                                  value={field.type}
                                  onValueChange={(val) => handleFieldChange(idx, 'type', val)}
                                >
                                  <SelectTrigger className="h-9 w-32 rounded-xl text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-card border-border/60 rounded-2xl">
                                    <SelectItem value="text">Text</SelectItem>
                                    <SelectItem value="number">Number</SelectItem>
                                    <SelectItem value="date">Date</SelectItem>
                                    <SelectItem value="boolean">Boolean</SelectItem>
                                  </SelectContent>
                                </Select>

                                <div className="flex items-center gap-2 select-none">
                                  <input
                                    type="checkbox"
                                    id={`req-${idx}`}
                                    checked={field.required}
                                    onChange={(e) => handleFieldChange(idx, 'required', e.target.checked)}
                                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary/50"
                                  />
                                  <label htmlFor={`req-${idx}`} className="text-xs font-semibold">Required</label>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveField(idx)}
                                  className="text-muted-foreground hover:text-destructive p-1 rounded-xl hover:bg-destructive/10 transition-colors ml-auto sm:ml-0"
                                  title="Remove Parameter"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <DialogFooter className="gap-2 sm:gap-0 mt-4">
                    <Button type="button" variant="outline" onClick={() => setIsCatDialogOpen(false)} className="rounded-xl">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className="rounded-xl">
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Category'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Tab content A: Departments */}
        <TabsContent value="departments" className="mt-0">
          <Card className="bg-card border-border/50 rounded-3xl shadow-soft">
            <CardHeader className="px-6 py-4 border-b border-border/40">
              <CardTitle className="text-lg font-bold text-white">Corporate Departments</CardTitle>
              <CardDescription className="text-muted-foreground text-xs">
                Active department nodes within the organizational hierarchy tree.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="overflow-x-auto">
                  <Table className="font-sans">
                    <TableHeader className="bg-secondary/10 border-b border-border/40">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="px-6 h-11 font-bold text-muted-foreground">Department Name</TableHead>
                        <TableHead className="px-6 h-11 font-bold text-muted-foreground">Parent Node</TableHead>
                        <TableHead className="px-6 h-11 font-bold text-muted-foreground">Department Head</TableHead>
                        <TableHead className="px-6 h-11 font-bold text-muted-foreground">Status</TableHead>
                        <TableHead className="px-6 h-11 font-bold text-muted-foreground text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="border-b border-border/20">
                      {Array.from({ length: 3 }).map((_, idx) => (
                        <TableRow key={idx} className="border-b border-border/30">
                          <TableCell className="px-6 py-4"><Skeleton className="h-4 w-28 bg-muted/40" /></TableCell>
                          <TableCell className="px-6 py-4"><Skeleton className="h-4 w-20 bg-muted/40" /></TableCell>
                          <TableCell className="px-6 py-4"><Skeleton className="h-4 w-24 bg-muted/40" /></TableCell>
                          <TableCell className="px-6 py-4"><Skeleton className="h-6 w-16 rounded-xl bg-muted/40" /></TableCell>
                          <TableCell className="px-6 py-4 text-right"><Skeleton className="h-8 w-16 ml-auto rounded-xl bg-muted/40" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : departments.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm font-sans">
                  No departments found. Create one to get started.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="font-sans">
                    <TableHeader className="bg-secondary/10 border-b border-border/40">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="px-6 h-11 font-bold text-muted-foreground">Department Name</TableHead>
                        <TableHead className="px-6 h-11 font-bold text-muted-foreground">Parent Node</TableHead>
                        <TableHead className="px-6 h-11 font-bold text-muted-foreground">Department Head</TableHead>
                        <TableHead className="px-6 h-11 font-bold text-muted-foreground">Status</TableHead>
                        <TableHead className="px-6 h-11 font-bold text-muted-foreground text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="border-b border-border/20">
                      {departments.map((dept) => (
                        <TableRow key={dept.id} className="hover:bg-secondary/10 border-b border-border/30">
                          <TableCell className="px-6 py-4 font-semibold text-white">{dept.name}</TableCell>
                          <TableCell className="px-6 py-4 text-muted-foreground">
                            {dept.parent ? (
                              <Badge variant="secondary" className="rounded-xl border-border/50 font-medium">
                                {dept.parent.name}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground/40 text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="px-6 py-4 text-muted-foreground font-medium">
                            {dept.head ? (
                              <span>{dept.head.name}</span>
                            ) : (
                              <span className="text-muted-foreground/30 text-xs">Unassigned</span>
                            )}
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <Badge className={`rounded-xl px-2.5 py-0.5 text-xs font-semibold ${
                              dept.status === 'Active' 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' 
                                : 'bg-destructive/10 text-destructive-foreground border border-destructive/25'
                            }`}>
                              {dept.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-secondary/40 rounded-xl"
                                onClick={() => handleOpenEditDept(dept)}
                                title="Edit Department"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 rounded-xl ${
                                  dept.status === 'Active' 
                                    ? 'hover:bg-destructive/15 text-destructive hover:text-destructive' 
                                    : 'hover:bg-emerald-500/15 text-emerald-400 hover:text-emerald-400'
                                }`}
                                onClick={() => handleToggleDeptStatus(dept)}
                                title={dept.status === 'Active' ? 'Deactivate' : 'Activate'}
                              >
                                {dept.status === 'Active' ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
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

        {/* Tab content B: Categories */}
        <TabsContent value="categories" className="mt-0">
          <Card className="bg-card border-border/50 rounded-3xl shadow-soft">
            <CardHeader className="px-6 py-4 border-b border-border/40">
              <CardTitle className="text-lg font-bold text-white">Asset Categories & Specification Schemas</CardTitle>
              <CardDescription className="text-muted-foreground text-xs">
                Asset groupings and their customizable custom parameter structures.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="overflow-x-auto">
                  <Table className="font-sans">
                    <TableHeader className="bg-secondary/10 border-b border-border/40">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="px-6 h-11 font-bold text-muted-foreground">Category Name</TableHead>
                        <TableHead className="px-6 h-11 font-bold text-muted-foreground">Custom Property Fields</TableHead>
                        <TableHead className="px-6 h-11 font-bold text-muted-foreground text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="border-b border-border/20">
                      {Array.from({ length: 3 }).map((_, idx) => (
                        <TableRow key={idx} className="border-b border-border/30">
                          <TableCell className="px-6 py-4"><Skeleton className="h-4 w-28 bg-muted/40" /></TableCell>
                          <TableCell className="px-6 py-4 flex gap-1.5"><Skeleton className="h-6 w-16 rounded-xl bg-muted/40" /><Skeleton className="h-6 w-20 rounded-xl bg-muted/40" /></TableCell>
                          <TableCell className="px-6 py-4 text-right"><Skeleton className="h-8 w-16 ml-auto rounded-xl bg-muted/40" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : categories.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm font-sans">
                  No categories defined. Add a category template to configure schemas.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="font-sans">
                    <TableHeader className="bg-secondary/10 border-b border-border/40">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="px-6 h-11 font-bold text-muted-foreground">Category Name</TableHead>
                        <TableHead className="px-6 h-11 font-bold text-muted-foreground">Custom Property Fields</TableHead>
                        <TableHead className="px-6 h-11 font-bold text-muted-foreground text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="border-b border-border/20">
                      {categories.map((cat) => (
                        <TableRow key={cat.id} className="hover:bg-secondary/10 border-b border-border/30">
                          <TableCell className="px-6 py-4 font-semibold text-white w-1/4">{cat.name}</TableCell>
                          <TableCell className="px-6 py-4 text-muted-foreground">
                            {cat.custom_fields && cat.custom_fields.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {cat.custom_fields.map((f, i) => (
                                  <Badge key={i} variant="outline" className="rounded-xl bg-secondary/10 text-muted-foreground border-border/60 text-xs px-2 py-0.5">
                                    {f.name} <span className="text-[10px] text-muted-foreground/60 ml-1">({f.type}{f.required ? '*' : ''})</span>
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground/30 text-xs font-medium">Default fields only</span>
                            )}
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right w-1/6">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-secondary/40 rounded-xl"
                                onClick={() => handleOpenEditCat(cat)}
                                title="Edit Schema"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-destructive/15 text-destructive rounded-xl hover:text-destructive"
                                onClick={() => handleDeleteCat(cat.id)}
                                title="Delete Category"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
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

        {/* Tab content C: Employee Directory */}
        <TabsContent value="employees" className="mt-0">
          <Card className="bg-card border-border/50 rounded-3xl shadow-soft">
            <CardHeader className="px-6 py-4 border-b border-border/40">
              <CardTitle className="text-lg font-bold text-white">Employee Directory & Access Roles</CardTitle>
              <CardDescription className="text-muted-foreground text-xs">
                Manage registered user accounts, assign system access privileges, and map departments.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="overflow-x-auto">
                  <Table className="font-sans">
                    <TableHeader className="bg-secondary/10 border-b border-border/40">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="px-6 h-11 font-bold text-muted-foreground">Employee Details</TableHead>
                        <TableHead className="px-6 h-11 font-bold text-muted-foreground">Department Node</TableHead>
                        <TableHead className="px-6 h-11 font-bold text-muted-foreground">Privilege Role</TableHead>
                        <TableHead className="px-6 h-11 font-bold text-muted-foreground">Account Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="border-b border-border/20">
                      {Array.from({ length: 3 }).map((_, idx) => (
                        <TableRow key={idx} className="border-b border-border/30">
                          <TableCell className="px-6 py-4">
                            <div className="space-y-1">
                              <Skeleton className="h-4 w-28 bg-muted/40" />
                              <Skeleton className="h-3 w-36 bg-muted/40" />
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4"><Skeleton className="h-8 w-44 rounded-xl bg-muted/40" /></TableCell>
                          <TableCell className="px-6 py-4"><Skeleton className="h-8 w-40 rounded-xl bg-muted/40" /></TableCell>
                          <TableCell className="px-6 py-4"><Skeleton className="h-8 w-24 rounded-xl bg-muted/40" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : employees.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm font-sans">
                  No registered employees found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="font-sans">
                    <TableHeader className="bg-secondary/10 border-b border-border/40">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="px-6 h-11 font-bold text-muted-foreground">Employee Details</TableHead>
                        <TableHead className="px-6 h-11 font-bold text-muted-foreground">Department Node</TableHead>
                        <TableHead className="px-6 h-11 font-bold text-muted-foreground">Privilege Role</TableHead>
                        <TableHead className="px-6 h-11 font-bold text-muted-foreground">Account Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="border-b border-border/20">
                      {employees.map((emp) => {
                        const isSelf = emp.id === currentUser?.id;
                        return (
                          <TableRow key={emp.id} className="hover:bg-secondary/10 border-b border-border/30">
                            <TableCell className="px-6 py-4">
                              <div>
                                <p className="font-semibold text-white flex items-center gap-1.5">
                                  {emp.name}
                                  {isSelf && (
                                    <Badge className="bg-primary/20 text-primary border border-primary/20 rounded-xl text-[9px] px-1.5 py-0">
                                      You
                                    </Badge>
                                  )}
                                </p>
                                <p className="text-muted-foreground text-xs mt-0.5">{emp.email}</p>
                              </div>
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <Select
                                value={emp.department_id ? emp.department_id.toString() : 'none'}
                                onValueChange={(val) => handleUserDeptChange(emp.id, val === 'none' ? null : parseInt(val, 10))}
                              >
                                <SelectTrigger className="h-9 w-44 rounded-xl text-xs bg-transparent border-border/60 hover:bg-secondary/20">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border/60 rounded-2xl text-xs">
                                  <SelectItem value="none">Unassigned</SelectItem>
                                  {departments
                                    .filter(d => d.status === 'Active')
                                    .map(d => (
                                      <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <Select
                                value={emp.role}
                                onValueChange={(val) => handleRoleChange(emp.id, val as User['role'])}
                                disabled={isSelf} // Block self demotion/elevation to avoid lockouts
                              >
                                <SelectTrigger className="h-9 w-40 rounded-xl text-xs bg-transparent border-border/60 hover:bg-secondary/20 font-semibold">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border/60 rounded-2xl text-xs">
                                  <SelectItem value="Employee">Employee</SelectItem>
                                  <SelectItem value="Dept Head">Department Head</SelectItem>
                                  <SelectItem value="Asset Manager">Asset Manager</SelectItem>
                                  <SelectItem value="Admin">Administrator</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <Switch
                                  checked={emp.status === 'Active'}
                                  onCheckedChange={() => handleToggleUserStatus(emp)}
                                  disabled={isSelf} // Block self deactivation
                                />
                                <Badge className={`rounded-xl px-2 py-0.5 text-[10px] font-bold ${
                                  emp.status === 'Active' 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                    : 'bg-destructive/10 text-destructive-foreground border border-destructive/20'
                                }`}>
                                  {emp.status}
                                </Badge>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
