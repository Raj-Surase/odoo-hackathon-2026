import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/modules/auth/AuthContext';
import {
  Bell,
  Check,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Hammer,
  RefreshCw,
  UserCheck,
  History,
  User,
  ChevronDown,
  ChevronUp,
  Loader2,
  Inbox
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Notification {
  id: number;
  recipient_id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  reference_type: string | null;
  reference_id: number | null;
  created_at: string;
}

interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  model: string;
  record_id: number;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  timestamp: string;
  user?: {
    id: number;
    name: string;
    role: string;
  } | null;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [isLoadingAuditLogs, setIsLoadingAuditLogs] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  // Pagination for audit logs
  const [auditPage, setAuditPage] = useState(1);
  const [totalAuditPages, setTotalAuditPages] = useState(1);

  const isAdminOrManager = user?.role === 'Admin' || user?.role === 'Asset Manager';

  const fetchNotifications = async () => {
    try {
      setIsLoadingNotifications(true);
      const response = await api.get('/notifications');
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  const fetchAuditLogs = async (page = 1) => {
    if (!isAdminOrManager) return;
    try {
      setIsLoadingAuditLogs(true);
      const response = await api.get(`/audit-logs?page=${page}`);
      setAuditLogs(response.data.data);
      setAuditPage(response.data.current_page);
      setTotalAuditPages(response.data.last_page);
    } catch (error) {
      console.error('Failed to fetch audit logs', error);
    } finally {
      setIsLoadingAuditLogs(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    if (isAdminOrManager) {
      fetchAuditLogs();
    }
  }, [user]);

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(notif => (notif.id === id ? { ...notif, is_read: true } : notif))
      );
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })));
    } catch (error) {
      console.error('Failed to mark all notifications as read', error);
    }
  };

  // Helper to format relative time
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return `${diffDays}d ago`;
    }
  };

  // Maps notifications to tabs
  const getFilteredNotifications = () => {
    switch (activeTab) {
      case 'alerts':
        return notifications.filter(n =>
          ['asset_assigned', 'maintenance_rejected', 'overdue_return', 'audit_discrepancy', 'Alert'].includes(n.type)
        );
      case 'approvals':
        return notifications.filter(n =>
          ['maintenance_approved', 'transfer_approved', 'Approval'].includes(n.type)
        );
      case 'bookings':
        return notifications.filter(n =>
          ['booking_confirmed', 'booking_cancelled', 'booking_reminder'].includes(n.type)
        );
      case 'all':
      default:
        return notifications;
    }
  };

  // Notification Icon mapper
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'asset_assigned':
        return <UserCheck className="h-5 w-5 text-purple-400" />;
      case 'maintenance_approved':
        return <CheckCircle className="h-5 w-5 text-emerald-400" />;
      case 'maintenance_rejected':
        return <AlertTriangle className="h-5 w-5 text-rose-400" />;
      case 'booking_confirmed':
        return <Calendar className="h-5 w-5 text-cyan-400" />;
      case 'booking_cancelled':
        return <AlertTriangle className="h-5 w-5 text-amber-400" />;
      case 'transfer_approved':
        return <RefreshCw className="h-5 w-5 text-indigo-400" />;
      case 'audit_discrepancy':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'Alert':
        return <Bell className="h-5 w-5 text-amber-400" />;
      case 'Approval':
        return <Hammer className="h-5 w-5 text-blue-400" />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  // Get simple model name without namespace
  const getModelName = (fullModel: string) => {
    return fullModel.split('\\').pop() || fullModel;
  };

  const filteredNotifs = getFilteredNotifications();
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans flex items-center gap-3">
            Notifications & Logs
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time operations feed and immutable admin activity trails.
          </p>
        </div>
        {activeTab !== 'audit' && unreadCount > 0 && (
          <Button
            onClick={handleMarkAllRead}
            variant="outline"
            className="rounded-2xl border-border/60 hover:bg-slate-800/20 text-xs font-semibold px-4 py-2 text-white self-start sm:self-center"
          >
            <Check className="mr-2 h-4 w-4 text-emerald-400" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Main Tabs Container */}
      <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
        <div className="border-b border-border/40 mb-6">
          <TabsList className="bg-transparent gap-6 p-0 h-auto rounded-none border-b-0">
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary border-b-2 border-transparent px-1 py-3 text-sm font-bold rounded-none text-muted-foreground"
            >
              All
              {unreadCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-primary/20 text-primary">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="alerts"
              className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary border-b-2 border-transparent px-1 py-3 text-sm font-bold rounded-none text-muted-foreground"
            >
              Alerts
            </TabsTrigger>
            <TabsTrigger
              value="approvals"
              className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary border-b-2 border-transparent px-1 py-3 text-sm font-bold rounded-none text-muted-foreground"
            >
              Approvals
            </TabsTrigger>
            <TabsTrigger
              value="bookings"
              className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary border-b-2 border-transparent px-1 py-3 text-sm font-bold rounded-none text-muted-foreground"
            >
              Bookings
            </TabsTrigger>
            {isAdminOrManager && (
              <TabsTrigger
                value="audit"
                className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary border-b-2 border-transparent px-1 py-3 text-sm font-bold rounded-none text-muted-foreground"
              >
                Audit Logs
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* Notifications Tab Content */}
        {activeTab !== 'audit' && (
          <div className="space-y-4">
            {isLoadingNotifications ? (
              <div className="flex h-[30vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredNotifs.length === 0 ? (
              <Card className="border border-border/40 bg-gradient-to-br from-card/40 to-card/10 p-12 text-center shadow-soft">
                <Inbox className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                <p className="text-white font-semibold">No notifications</p>
                <p className="text-muted-foreground text-xs mt-1">You are all caught up!</p>
              </Card>
            ) : (
              <div className="grid gap-3">
                {filteredNotifs.map(notif => (
                  <Card
                    key={notif.id}
                    className={`border border-border/40 bg-gradient-to-br transition-all duration-300 hover:scale-[1.01] hover:border-border/80 shadow-soft group relative overflow-hidden ${
                      notif.is_read
                        ? 'from-card/40 to-card/10 opacity-70'
                        : 'from-card/85 to-card/55 border-l-4 border-l-primary'
                    }`}
                  >
                    <CardContent className="p-5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        {/* Glow Dot for Unread */}
                        {!notif.is_read && (
                          <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
                        )}
                        <div className="p-2.5 rounded-2xl bg-slate-800/60 border border-border/20 shrink-0">
                          {getNotificationIcon(notif.type)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-wider">
                            {notif.title}
                          </p>
                          <p className="text-sm font-semibold text-white mt-0.5 leading-snug">
                            {notif.message}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-xs text-muted-foreground font-mono">
                          {formatRelativeTime(notif.created_at)}
                        </span>
                        
                        {!notif.is_read && (
                          <Button
                            onClick={() => handleMarkAsRead(notif.id)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full border border-border/40 bg-card hover:bg-slate-800 hover:text-white"
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4 text-emerald-400" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Audit Logs Tab Content */}
        {activeTab === 'audit' && isAdminOrManager && (
          <div className="space-y-4">
            <Card className="border border-border/40 bg-gradient-to-br from-card/60 to-card/20 shadow-soft overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/40">
                <div>
                  <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    Immutable Audit Trail
                  </CardTitle>
                  <CardDescription>
                    Cryptographically tracked events of CRUD database actions (Cannot be updated or deleted).
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-slate-800/40 text-emerald-400 border-emerald-500/20 font-mono text-xs">
                  ReadOnly
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingAuditLogs && auditLogs.length === 0 ? (
                  <div className="flex h-[30vh] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="p-10 text-center text-muted-foreground text-sm">
                    No audit records logged yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-border/40 hover:bg-transparent">
                          <TableHead className="w-[10px]"></TableHead>
                          <TableHead className="pl-6 font-bold text-xs uppercase tracking-wider text-muted-foreground/80">User</TableHead>
                          <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80">Action</TableHead>
                          <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80">Resource</TableHead>
                          <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground/80">Record ID</TableHead>
                          <TableHead className="pr-6 text-right font-bold text-xs uppercase tracking-wider text-muted-foreground/80">Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLogs.map((log) => {
                          const isExpanded = expandedLogId === log.id;
                          return (
                            <React.Fragment key={log.id}>
                              <TableRow className="border-b border-border/20 hover:bg-slate-800/10 transition-colors">
                                <TableCell>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-muted-foreground rounded-full hover:bg-slate-800"
                                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                  >
                                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  </Button>
                                </TableCell>
                                <TableCell className="pl-6">
                                  <div className="flex items-center gap-2">
                                    <div className="h-7 w-7 rounded-full bg-slate-800 border border-border/20 flex items-center justify-center text-xs text-white">
                                      <User className="h-3.5 w-3.5" />
                                    </div>
                                    <div>
                                      <p className="font-semibold text-white text-sm">{log.user?.name || 'System / Seeder'}</p>
                                      <p className="text-[10px] text-muted-foreground">{log.user?.role || 'Daemon'}</p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    className={
                                      log.action === 'created'
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-mono text-[10px] uppercase font-bold'
                                        : log.action === 'updated'
                                        ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 font-mono text-[10px] uppercase font-bold'
                                        : 'bg-rose-500/10 border-rose-500/20 text-rose-400 font-mono text-[10px] uppercase font-bold'
                                    }
                                  >
                                    {log.action}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-semibold text-white text-sm">
                                  {getModelName(log.model)}
                                </TableCell>
                                <TableCell className="font-mono text-xs text-primary">
                                  #{log.record_id}
                                </TableCell>
                                <TableCell className="pr-6 text-right text-xs text-muted-foreground font-mono">
                                  {new Date(log.timestamp).toLocaleString()}
                                </TableCell>
                              </TableRow>

                              {/* Expanded Change Diff Drawer */}
                              {isExpanded && (
                                <TableRow className="bg-slate-800/10 border-b border-border/20 hover:bg-slate-800/15">
                                  <TableCell colSpan={6} className="p-6">
                                    <div className="rounded-2xl border border-border/25 bg-slate-950/60 p-5 space-y-4">
                                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        JSON Delta Changes
                                      </h4>
                                      
                                      {/* No changes logged */}
                                      {(!log.old_values || Object.keys(log.old_values).length === 0) &&
                                       (!log.new_values || Object.keys(log.new_values).length === 0) ? (
                                        <p className="text-muted-foreground text-xs italic">No changes recorded.</p>
                                      ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                          {/* Old Values */}
                                          <div className="space-y-2">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400 uppercase">
                                              <span>−</span> Previous Values
                                            </div>
                                            <div className="p-4 rounded-xl border border-rose-500/10 bg-rose-500/5 text-xs font-mono max-h-[220px] overflow-y-auto leading-relaxed select-all">
                                              {log.old_values ? (
                                                <pre className="text-rose-300 whitespace-pre-wrap">
                                                  {JSON.stringify(log.old_values, null, 2)}
                                                </pre>
                                              ) : (
                                                <span className="text-rose-400/50 italic">Null (Created Action)</span>
                                              )}
                                            </div>
                                          </div>

                                          {/* New Values */}
                                          <div className="space-y-2">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase">
                                              <span>+</span> Updated Values
                                            </div>
                                            <div className="p-4 rounded-xl border border-emerald-500/10 bg-emerald-500/5 text-xs font-mono max-h-[220px] overflow-y-auto leading-relaxed select-all">
                                              {log.new_values ? (
                                                <pre className="text-emerald-300 whitespace-pre-wrap">
                                                  {JSON.stringify(log.new_values, null, 2)}
                                                </pre>
                                              ) : (
                                                <span className="text-emerald-400/50 italic">Null (Deleted Action)</span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pagination Controls */}
            {totalAuditPages > 1 && (
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  onClick={() => fetchAuditLogs(auditPage - 1)}
                  disabled={auditPage === 1 || isLoadingAuditLogs}
                  variant="outline"
                  className="rounded-xl border-border/60 hover:bg-slate-800 text-xs px-3 h-9"
                >
                  Previous
                </Button>
                <Badge className="bg-slate-800 border-border/40 font-mono text-xs flex items-center justify-center px-4">
                  Page {auditPage} of {totalAuditPages}
                </Badge>
                <Button
                  onClick={() => fetchAuditLogs(auditPage + 1)}
                  disabled={auditPage === totalAuditPages || isLoadingAuditLogs}
                  variant="outline"
                  className="rounded-xl border-border/60 hover:bg-slate-800 text-xs px-3 h-9"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </Tabs>
    </div>
  );
}
