import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/modules/auth/AuthContext';
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  RefreshCw,
  Info,
  CalendarCheck,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

interface Asset {
  id: number;
  name: string;
  asset_tag: string;
  is_bookable: boolean;
  status: string;
}

interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  department_id: number | null;
  department?: { id: number; name: string } | null;
}

interface Booking {
  id: number;
  resource_id: number;
  user_id: number;
  department_id: number | null;
  start_datetime: string;
  end_datetime: string;
  purpose: string | null;
  status: 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled';
  resource?: Asset;
  user?: UserProfile;
  department?: { id: number; name: string } | null;
}

interface SocketHold {
  resource_id: number;
  start_datetime: string;
  end_datetime: string;
  user_id: number;
  user_name: string;
  expires_at: number;
}

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

export default function BookingsPage() {
  const { user: currentUser } = useAuth();
  const isAdminOrManager = currentUser?.role === 'Admin' || currentUser?.role === 'Asset Manager';

  // State Variables
  const [bookableAssets, setBookableAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [holds, setHolds] = useState<SocketHold[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMyBookingsLoading, setIsMyBookingsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Booking Modal Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('10:00');
  const [formPurpose, setFormPurpose] = useState('');
  
  // Real-time conflict checks (Modal warning alerts)
  const [formConflictWarning, setFormConflictWarning] = useState<string | null>(null);
  const [formHoldWarning, setFormHoldWarning] = useState<string | null>(null);

  // WebSocket reference
  const ws = useRef<WebSocket | null>(null);
  const isDisposed = useRef(false);
  const reconnectTimeoutRef = useRef<any>(null);

  // Fetch all bookable assets
  const fetchAssets = async () => {
    try {
      const response = await api.get('/assets');
      const filtered = response.data.filter((asset: Asset) => asset.is_bookable);
      setBookableAssets(filtered);
      if (filtered.length > 0 && !selectedAssetId) {
        setSelectedAssetId(filtered[0].id.toString());
      }
    } catch (err) {
      console.error('Error fetching assets:', err);
      setErrorMessage('Could not load assets.');
    }
  };

  // Fetch bookings for the selected asset
  const fetchBookings = async () => {
    if (!selectedAssetId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await api.get(`/bookings?resource_id=${selectedAssetId}`);
      setBookings(response.data);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setErrorMessage('Could not load bookings.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch my bookings (all bookings for the current user)
  const fetchMyBookings = async () => {
    setIsMyBookingsLoading(true);
    try {
      const response = await api.get('/bookings');
      setMyBookings(response.data);
    } catch (err) {
      console.error('Error fetching my bookings:', err);
    } finally {
      setIsMyBookingsLoading(false);
    }
  };

  // Connect to WebSocket Server
  const connectWebSocket = () => {
    if (ws.current) {
      ws.current.close();
    }

    try {
      const socket = new WebSocket('ws://localhost:8080');
      
      socket.onopen = () => {
        console.log('WebSocket Connected to ws://localhost:8080');
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'hold_update') {
            setHolds(data.holds);
          } else if (data.type === 'refresh_calendar') {
            if (data.resource_id === parseInt(selectedAssetId)) {
              fetchBookings();
            }
            fetchMyBookings();
          }
        } catch (err) {
          console.error('WebSocket JSON parse error:', err);
        }
      };

      socket.onerror = (error) => {
        console.warn('WebSocket connection error:', error);
      };

      socket.onclose = () => {
        if (isDisposed.current) return;
        console.log('WebSocket Connection closed. Retrying in 5 seconds...');
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
      };

      ws.current = socket;
    } catch (err) {
      console.error('WebSocket connection setup failed:', err);
    }
  };

  // Initial and reactive data loads
  useEffect(() => {
    isDisposed.current = false;
    fetchAssets();
    fetchMyBookings();
    connectWebSocket();
    return () => {
      isDisposed.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [selectedAssetId]);

  // 1. Broadcast active hold to WebSocket server (Only depends on modal and inputs, NOT holds/bookings to break loops)
  useEffect(() => {
    if (!isModalOpen || !currentUser || !selectedAssetId) return;

    const startStr = `${selectedDate} ${formStartTime}:00`;
    const endStr = `${selectedDate} ${formEndTime}:00`;

    const startObj = new Date(`${selectedDate}T${formStartTime}:00`);
    const endObj = new Date(`${selectedDate}T${formEndTime}:00`);

    const hasBookingConflict = bookings.some(b => {
      if (b.status === 'Cancelled') return false;
      const bStart = new Date(b.start_datetime);
      const bEnd = new Date(b.end_datetime);
      return bStart < endObj && bEnd > startObj;
    });

    if (!hasBookingConflict && ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'hold',
        resource_id: parseInt(selectedAssetId),
        start_datetime: startStr,
        end_datetime: endStr,
        user_id: currentUser.id,
        user_name: currentUser.name
      }));
    }

    return () => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({
          type: 'release',
          user_id: currentUser.id
        }));
      }
    };
  }, [isModalOpen, formStartTime, formEndTime, selectedDate, selectedAssetId, currentUser]);

  // 2. Perform validation checks (conflict warnings) when bookings, holds or form inputs change
  useEffect(() => {
    if (!isModalOpen || !currentUser || !selectedAssetId) return;

    const startObj = new Date(`${selectedDate}T${formStartTime}:00`);
    const endObj = new Date(`${selectedDate}T${formEndTime}:00`);

    // Conflict with official bookings
    const hasBookingConflict = bookings.some(b => {
      if (b.status === 'Cancelled') return false;
      const bStart = new Date(b.start_datetime);
      const bEnd = new Date(b.end_datetime);
      return bStart < endObj && bEnd > startObj;
    });

    if (hasBookingConflict) {
      setFormConflictWarning('Conflict - slot is unavailable.');
    } else {
      setFormConflictWarning(null);
    }

    // Real-time hold conflict check
    const holdsOnSelectedAsset = holds.filter(h => 
      h.resource_id === parseInt(selectedAssetId) && h.user_id !== currentUser.id
    );

    const hasHoldConflict = holdsOnSelectedAsset.some(h => {
      const hStart = new Date(h.start_datetime.replace(' ', 'T'));
      const hEnd = new Date(h.end_datetime.replace(' ', 'T'));
      return hStart < endObj && hEnd > startObj;
    });

    if (hasHoldConflict) {
      const conflictingHold = holdsOnSelectedAsset.find(h => {
        const hStart = new Date(h.start_datetime.replace(' ', 'T'));
        const hEnd = new Date(h.end_datetime.replace(' ', 'T'));
        return hStart < endObj && hEnd > startObj;
      });
      setFormHoldWarning(`Slot is currently being draft-booked by ${conflictingHold?.user_name || 'another user'}.`);
    } else {
      setFormHoldWarning(null);
    }
  }, [isModalOpen, formStartTime, formEndTime, selectedDate, selectedAssetId, bookings, holds, currentUser]);

  // Helper to check if a slot starts in the past
  const isSlotInPast = (hour: number) => {
    const slotStart = new Date(`${selectedDate}T${hour.toString().padStart(2, '0')}:00:00`);
    return slotStart < new Date();
  };

  // Open booking modal pre-filled for a specific hour clicked
  const handleHourSlotClick = (hour: number, isBooked: boolean, isHeld: boolean) => {
    if (isBooked || isHeld || isSlotInPast(hour)) return;
    
    // Set time range (e.g. 09:00 - 10:00)
    const formattedHourStart = `${hour.toString().padStart(2, '0')}:00`;
    const formattedHourEnd = `${(hour + 1).toString().padStart(2, '0')}:00`;
    
    setFormStartTime(formattedHourStart);
    setFormEndTime(formattedHourEnd);
    setFormPurpose('');
    setFormConflictWarning(null);
    setFormHoldWarning(null);
    setIsModalOpen(true);
  };

  const handleOpenBookingModal = () => {
    setFormStartTime('09:00');
    setFormEndTime('10:00');
    setFormPurpose('');
    setFormConflictWarning(null);
    setFormHoldWarning(null);
    setIsModalOpen(true);
  };

  // Submit Booking Form
  const handleSaveBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formConflictWarning || formHoldWarning || !selectedAssetId) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    
    const startDatetime = `${selectedDate} ${formStartTime}:00`;
    const endDatetime = `${selectedDate} ${formEndTime}:00`;

    try {
      await api.post('/bookings', {
        resource_id: parseInt(selectedAssetId),
        start_datetime: startDatetime,
        end_datetime: endDatetime,
        purpose: formPurpose
      });

      setSuccessMessage('Booking confirmed successfully!');
      
      // Notify WebSocket server to clear hold and update all other clients
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({
          type: 'booking_created',
          resource_id: parseInt(selectedAssetId),
          user_id: currentUser?.id
        }));
      }

      setIsModalOpen(false);
      fetchBookings();
      fetchMyBookings();
      
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.response?.data?.message || 'Failed to submit booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel upcoming booking
  const handleCancelBooking = async (bookingId: number, resourceId: number) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    
    try {
      await api.post(`/bookings/${bookingId}/cancel`);
      setSuccessMessage('Booking cancelled successfully.');
      
      // Notify WebSocket server to refresh calendars
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({
          type: 'booking_cancelled',
          resource_id: resourceId,
          user_id: currentUser?.id
        }));
      }

      fetchBookings();
      fetchMyBookings();
      
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to cancel booking.');
    }
  };

  // Helper logic to query status of hour slots
  const getSlotDetails = (hour: number) => {
    const slotStart = new Date(`${selectedDate}T${hour.toString().padStart(2, '0')}:00:00`);
    const slotEnd = new Date(`${selectedDate}T${(hour + 1).toString().padStart(2, '0')}:00:00`);

    // 1. Check for Booked
    const matchingBooking = bookings.find(b => {
      if (b.status === 'Cancelled') return false;
      const bStart = new Date(b.start_datetime);
      const bEnd = new Date(b.end_datetime);
      return bStart < slotEnd && bEnd > slotStart;
    });

    if (matchingBooking) {
      return {
        isBooked: true,
        isHeld: false,
        label: `Booked: ${matchingBooking.user?.name || 'Reserved'} (${matchingBooking.purpose || 'No purpose stated'})`,
        details: matchingBooking
      };
    }

    // 2. Check for Hold
    const matchingHold = holds.find(h => {
      if (h.resource_id !== parseInt(selectedAssetId)) return false;
      if (currentUser && h.user_id === currentUser.id) return false;
      const hStart = new Date(h.start_datetime.replace(' ', 'T'));
      const hEnd = new Date(h.end_datetime.replace(' ', 'T'));
      return hStart < slotEnd && hEnd > slotStart;
    });

    if (matchingHold) {
      return {
        isBooked: false,
        isHeld: true,
        label: `Draft Hold by ${matchingHold.user_name}`,
        details: matchingHold
      };
    }

    return {
      isBooked: false,
      isHeld: false,
      label: 'Open Slot',
      details: null
    };
  };

  const selectedAsset = bookableAssets.find(a => a.id.toString() === selectedAssetId);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <CalendarCheck className="h-8 w-8 text-primary" />
            Resource Booking Portal
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Reserve conference rooms, project workspaces, or transit vehicles with real-time overlap validation.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => { fetchBookings(); fetchMyBookings(); }} 
            variant="outline" 
            size="sm"
            className="border-border/60 hover:bg-white/5 text-muted-foreground"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={handleOpenBookingModal} 
            disabled={bookableAssets.length === 0}
            className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-2xl shadow-lg"
          >
            <Plus className="h-4 w-4 mr-2" />
            Book a Slot
          </Button>
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-200 rounded-3xl p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-500 flex-shrink-0" />
          <span className="text-sm font-medium">{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 rounded-3xl p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
          <span className="text-sm font-medium">{successMessage}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Filter and Day Calendar View */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card border-border/60 rounded-3xl overflow-hidden shadow-soft">
            <CardHeader className="border-b border-border/40 pb-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="resource-select" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Resource</Label>
                  <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                    <SelectTrigger id="resource-select" className="bg-background border-border/60 rounded-2xl text-white">
                      <SelectValue placeholder="Choose a resource" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-white">
                      {bookableAssets.map(asset => (
                        <SelectItem key={asset.id} value={asset.id.toString()}>
                          {asset.name} ({asset.asset_tag})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="date-select" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Date</Label>
                  <div className="relative">
                    <Input 
                      type="date" 
                      id="date-select" 
                      value={selectedDate} 
                      onChange={(e) => setSelectedDate(e.target.value)} 
                      className="bg-background border-border/60 rounded-2xl text-white pl-10"
                    />
                    <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-md font-bold text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Time Slots for {selectedAsset ? selectedAsset.name : 'Resource'}
                </h3>
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  Date: {selectedDate}
                </span>
              </div>

              {/* Slots List */}
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-2xl border border-border/40 bg-zinc-500/5 animate-pulse">
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-4 w-28 bg-muted/40" />
                        <Skeleton className="h-4 w-32 bg-muted/40" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {HOURS.map(hour => {
                    const { isBooked, isHeld, label: originalLabel } = getSlotDetails(hour);
                    const isPast = isSlotInPast(hour);
                    const displayTime = `${hour.toString().padStart(2, '0')}:00`;
                    const displayEndTime = `${(hour + 1).toString().padStart(2, '0')}:00`;

                    let slotStyles = "";
                    let label = originalLabel;

                    if (isBooked) {
                      slotStyles = "bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/15 cursor-not-allowed border-l-4 border-l-rose-500 text-rose-200";
                    } else if (isHeld) {
                      slotStyles = "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15 cursor-not-allowed border-l-4 border-l-amber-500 text-amber-200 animate-pulse bg-stripes";
                    } else if (isPast) {
                      slotStyles = "bg-zinc-500/5 border-zinc-500/10 cursor-not-allowed border-l-4 border-l-zinc-500 text-zinc-400 opacity-60";
                      label = "Past Slot (Not Bookable)";
                    } else {
                      slotStyles = "bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20 border-l-4 border-l-emerald-500 text-emerald-400 cursor-pointer";
                    }

                    return (
                      <div 
                        key={hour} 
                        onClick={() => handleHourSlotClick(hour, isBooked, isHeld)}
                        className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl border transition-all duration-200 ${slotStyles}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="font-bold text-sm tracking-wider min-w-[100px] flex items-center gap-1.5">
                            <Clock className="h-4 w-4 opacity-70" />
                            {displayTime} - {displayEndTime}
                          </div>
                          <div className="text-sm font-semibold mt-1 md:mt-0 flex items-center gap-2">
                            {isBooked && <Badge variant="destructive" className="bg-rose-600">Booked</Badge>}
                            {isHeld && <Badge variant="outline" className="text-amber-400 border-amber-400/50 bg-amber-950/20">Pending Hold</Badge>}
                            {isPast && !isBooked && !isHeld && <Badge variant="outline" className="text-zinc-400 border-zinc-400/30 bg-zinc-950/20">Past</Badge>}
                            {!isBooked && !isHeld && !isPast && <Badge variant="outline" className="text-emerald-400 border-emerald-400/30 bg-emerald-950/20">Available</Badge>}
                            <span className="opacity-90">{label}</span>
                          </div>
                        </div>
                        
                        {!isBooked && !isHeld && !isPast && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="mt-2 md:mt-0 hover:bg-emerald-500/20 hover:text-emerald-300 text-emerald-400 rounded-xl"
                          >
                            Book Slot <Plus className="h-3 w-3 ml-1" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Side: My Bookings & Info Panel */}
        <div className="space-y-6">
          
          {/* Info Card */}
          <Card className="bg-card border-border/60 rounded-3xl shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                Collaborative Locking
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground leading-relaxed space-y-3">
              <p>
                To eliminate booking slot overlaps and duplicate reservations, AssetFlow uses <strong className="text-white">real-time WebSockets</strong>.
              </p>
              <p>
                When any user opens the booking window for a slot, that segment transitions to <strong className="text-amber-400">Pending Hold</strong> across all connected clients immediately. This locks the slot and prevents overlaps before a submit request is even sent.
              </p>
            </CardContent>
          </Card>

          {/* My Bookings List */}
          <Card className="bg-card border-border/60 rounded-3xl overflow-hidden shadow-soft">
            <CardHeader className="border-b border-border/40 pb-5">
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-primary" />
                My Reservations
              </CardTitle>
              <CardDescription className="text-xs">Your active and historical bookings</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[400px] overflow-y-auto">
                {isMyBookingsLoading ? (
                  <Table>
                    <TableHeader className="bg-white/5 border-b border-border/40">
                      <TableRow>
                        <TableHead className="text-white font-bold text-xs">Resource</TableHead>
                        <TableHead className="text-white font-bold text-xs">Time Slot</TableHead>
                        <TableHead className="text-white font-bold text-xs">Status</TableHead>
                        <TableHead className="text-white font-bold text-xs text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: 3 }).map((_, idx) => (
                        <TableRow key={idx} className="border-b border-border/40">
                          <TableCell className="py-2.5 pl-4"><Skeleton className="h-4 w-20 bg-muted/40" /></TableCell>
                          <TableCell className="py-2.5">
                            <div className="space-y-1">
                              <Skeleton className="h-4 w-16 bg-muted/40" />
                              <Skeleton className="h-3 w-24 bg-muted/40" />
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5"><Skeleton className="h-5 w-12 rounded bg-muted/40" /></TableCell>
                          <TableCell className="py-2.5 text-right pr-4"><Skeleton className="h-8 w-8 rounded-xl bg-muted/40 ml-auto" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : myBookings.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No bookings found.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-white/5 border-b border-border/40">
                        <TableRow>
                          <TableHead className="text-white font-bold text-xs">Resource</TableHead>
                          <TableHead className="text-white font-bold text-xs">Time Slot</TableHead>
                          <TableHead className="text-white font-bold text-xs">Status</TableHead>
                          <TableHead className="text-white font-bold text-xs text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {myBookings.map(b => {
                          const bStart = new Date(b.start_datetime);
                          const bEnd = new Date(b.end_datetime);
                          const dateStr = bStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                          const timeStr = `${bStart.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })} - ${bEnd.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}`;

                          let statusBadge = null;
                          switch (b.status) {
                            case 'Upcoming':
                              statusBadge = <Badge className="bg-blue-600 text-white hover:bg-blue-600/80 rounded-lg text-[10px] py-0.5 px-2">Upcoming</Badge>;
                              break;
                            case 'Ongoing':
                              statusBadge = <Badge className="bg-amber-600 text-white hover:bg-amber-600/80 rounded-lg text-[10px] py-0.5 px-2">Ongoing</Badge>;
                              break;
                            case 'Completed':
                              statusBadge = <Badge className="bg-emerald-600 text-white hover:bg-emerald-600/80 rounded-lg text-[10px] py-0.5 px-2">Completed</Badge>;
                              break;
                            case 'Cancelled':
                              statusBadge = <Badge className="bg-zinc-600 text-white hover:bg-zinc-600/80 rounded-lg text-[10px] py-0.5 px-2">Cancelled</Badge>;
                              break;
                          }

                          // Determine if cancellable (must be upcoming and booker can cancel)
                          const isCancellable = b.status === 'Upcoming' && (b.user_id === currentUser?.id || isAdminOrManager) && new Date(b.start_datetime) > new Date();

                          return (
                            <TableRow key={b.id} className="border-b border-border/40 hover:bg-white/5">
                              <TableCell className="font-semibold text-white text-xs max-w-[120px] truncate">
                                {b.resource?.name || 'Resource'}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-xs">
                                <div className="font-medium text-white">{dateStr}</div>
                                <div className="text-[10px] opacity-80">{timeStr}</div>
                              </TableCell>
                              <TableCell className="py-2">{statusBadge}</TableCell>
                              <TableCell className="text-right py-2">
                                {isCancellable ? (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleCancelBooking(b.id, b.resource_id)}
                                    className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl h-8 w-8"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground font-semibold px-2">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Booking Form Modal Dialog */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsModalOpen(false);
          // Release hold when modal is closed
          if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
              type: 'release',
              user_id: currentUser?.id
            }));
          }
        }
      }}>
        <DialogContent className="bg-card border-border/80 text-white rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-primary" />
              Book Shared Resource
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Confirm your reservation details. Slot will be held for 60 seconds.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveBooking} className="space-y-4 pt-3">
            
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Resource</Label>
              <Input 
                value={selectedAsset ? `${selectedAsset.name} (${selectedAsset.asset_tag})` : 'Selected Asset'} 
                disabled 
                className="bg-white/5 border-border/40 rounded-2xl text-white opacity-80"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="form-date" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Date</Label>
              <Input 
                type="date"
                id="form-date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-background border-border/60 rounded-2xl text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="form-start" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Start Time</Label>
                <Select value={formStartTime} onValueChange={setFormStartTime}>
                  <SelectTrigger id="form-start" className="bg-background border-border/60 rounded-2xl text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-white">
                    {HOURS.map(h => {
                      const timeStr = `${h.toString().padStart(2, '0')}:00`;
                      return <SelectItem key={h} value={timeStr}>{timeStr}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="form-end" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">End Time</Label>
                <Select value={formEndTime} onValueChange={setFormEndTime}>
                  <SelectTrigger id="form-end" className="bg-background border-border/60 rounded-2xl text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-white">
                    {HOURS.concat(18).filter(h => {
                      const startHour = parseInt(formStartTime.split(':')[0]);
                      return h > startHour;
                    }).map(h => {
                      const timeStr = `${h.toString().padStart(2, '0')}:00`;
                      return <SelectItem key={h} value={timeStr}>{timeStr}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="form-purpose" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Purpose / Project Team</Label>
              <Input 
                id="form-purpose"
                placeholder="e.g. Scrum Planning, Client Demo"
                value={formPurpose}
                onChange={(e) => setFormPurpose(e.target.value)}
                className="bg-background border-border/60 rounded-2xl text-white"
                required
              />
            </div>

            {/* Warning Alerts */}
            {formConflictWarning && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-200 rounded-2xl p-3 flex items-center gap-2.5">
                <AlertTriangle className="h-4 w-4 text-rose-500 flex-shrink-0" />
                <span className="text-xs font-medium">{formConflictWarning}</span>
              </div>
            )}
            
            {formHoldWarning && (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-200 rounded-2xl p-3 flex items-center gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 animate-bounce" />
                <span className="text-xs font-medium">{formHoldWarning}</span>
              </div>
            )}

            {!formConflictWarning && !formHoldWarning && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-2xl p-3 flex items-center gap-2.5 text-xs font-semibold">
                <User className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                Slot is currently hold-locked for you. Other users cannot select it.
              </div>
            )}

            <DialogFooter className="pt-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsModalOpen(false);
                  if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                    ws.current.send(JSON.stringify({
                      type: 'release',
                      user_id: currentUser?.id
                    }));
                  }
                }}
                className="border-border/60 hover:bg-white/5 text-muted-foreground rounded-2xl"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !!formConflictWarning || !!formHoldWarning}
                className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-2xl shadow-lg"
              >
                {isSubmitting ? 'Reserving...' : 'Confirm Reservation'}
              </Button>
            </DialogFooter>

          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
