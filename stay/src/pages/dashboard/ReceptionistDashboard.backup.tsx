import { useState, useRef, useMemo, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore, getRoomTypeById } from '../store/appStore';
import { computeDashboardStats } from '../utils/analytics';
import { formatCurrency, formatShortDate } from '../utils/format';
import { generateDefaultLayout, getStaggeredPlacement } from '../utils/roomLayout';
import { 
  Plus, ZoomIn, ZoomOut, ChevronDown, ChevronUp, 
  Wallet, CreditCard, User, AlertCircle, 
  CheckCircle, Brush, Wrench, Settings, Move, Map, BedDouble, Search, X,
  LogOut, ShieldAlert, Receipt, Wind, Droplets, Tv, Wifi, Thermometer, LayoutGrid
} from 'lucide-react';
import Badge from '../components/ui/Badge';
import { cn } from '../utils/cn';
import type { Booking, Room, RoomStatus } from '../types';
import { motion, useMotionValue } from 'framer-motion';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import TimelineView from '../components/front-office/TimelineView';
import { startOfDay } from 'date-fns';

export default function FrontDeskPage() {
  const { rooms, bookings, roomTypes, payments, updateRoomPosition, checkoutBooking } = useAppStore();
  const navigate = useNavigate();
  const [showDashboard, setShowDashboard] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'denah' | 'timeline'>('grid');
  const [isBuilderMode, setIsBuilderMode] = useState(false);
  
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const stats = computeDashboardStats(bookings, rooms, payments);
  const canvasRef = useRef<HTMLDivElement>(null);

  const getActiveBooking = (roomId: string): Booking | undefined => {
    return bookings.find(b => b.roomId === roomId && b.status === 'checked_in');
  };

  const placedRooms = useMemo(() => {
    return rooms.filter(r => r.positionX != null && r.positionY != null);
  }, [rooms]);

  const unplacedRooms = useMemo(() => {
    return rooms.filter(r => r.positionX == null || r.positionY == null);
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    return rooms.filter(r => !search || r.number.includes(search));
  }, [rooms, search]);

  const selectedRoom = useMemo(() => {
    return rooms.find(r => r.id === selectedRoomId);
  }, [rooms, selectedRoomId]);

  const activeBooking = selectedRoom ? getActiveBooking(selectedRoom.id) : undefined;

  const showDenahEmpty = viewMode === 'denah' && placedRooms.length === 0 && rooms.length > 0;

  const handleAutoLayout = () => {
    const positions = generateDefaultLayout(rooms);
    for (const pos of positions) {
      updateRoomPosition(pos.id, pos.x, pos.y);
    }
  };

  const handleFinalCheckout = async () => {
    if (!selectedRoom || !activeBooking) return;

    setIsProcessing(true);
    await new Promise(r => setTimeout(r, 600));

    checkoutBooking(activeBooking.id, selectedRoom.id, {
      sendSurvey: true,
      guestPhone: activeBooking.guest?.phone,
      guestName: activeBooking.guest?.name,
      bookingCode: activeBooking.bookingCode,
    });

    setIsProcessing(false);
    setShowCheckoutModal(false);
    setShowDetail(false);
    setSelectedRoomId(null);
  };

  // Status Styling Configuration
  const getStatusConfig = (status: RoomStatus, booking?: Booking) => {
    const isOccupied = status === 'occupied' || !!booking;
    
    if (isOccupied) {
      const isUnpaid = booking?.paymentStatus === 'unpaid';
      return {
        bg: 'bg-emerald-500',
        text: 'text-white',
        icon: isUnpaid ? <AlertCircle className="h-5 w-5 text-red-300 animate-pulse" /> : <CheckCircle className="h-5 w-5 text-white/80" />,
        statusLabel: isUnpaid ? 'Unpaid' : 'Occupied',
        dotColor: isUnpaid ? 'bg-red-400' : 'bg-white'
      };
    }

    switch(status) {
      case 'cleaning':
        return { bg: 'bg-amber-400', text: 'text-slate-800', icon: <Brush className="h-5 w-5" />, statusLabel: 'Dirty', dotColor: 'bg-white' };
      case 'maintenance':
        return { bg: 'bg-slate-500', text: 'text-white', icon: <Wrench className="h-5 w-5" />, statusLabel: 'Maintenance', dotColor: 'bg-slate-300' };
      default:
        return { bg: 'bg-slate-300', text: 'text-slate-600', icon: <BedDouble className="h-5 w-5 opacity-40" />, statusLabel: 'Kosong', dotColor: 'bg-slate-400' };
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-slate-100 relative -m-4 sm:-m-5">
      
      {/* 1. TOP DASHBOARD (ANIMATED) */}
      <div className={cn(
        "absolute top-0 left-0 right-0 bg-slate-900 text-white z-50 transition-all duration-500 ease-in-out overflow-hidden shadow-2xl",
        showDashboard ? "max-h-[300px] border-b border-slate-700" : "max-h-0"
      )}>
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-7xl mx-auto">
          <StatItem label="Kamar Terisi" value={stats.occupiedRooms} color="text-emerald-400" />
          <StatItem label="Kamar Kosong" value={stats.availableRooms} color="text-slate-300" />
          <StatItem label="Pendapatan Hari Ini" value={formatCurrency(stats.revenueToday)} color="text-emerald-400" />
          <StatItem label="Occupancy" value={`${stats.occupancyRate}%`} color="text-violet-400" />
        </div>
      </div>

      {/* 2. CONTROL BAR */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between gap-4 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowDashboard(!showDashboard)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors"
          >
            DASHBOARD {showDashboard ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          <div className="relative w-48 hidden sm:block">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari nomor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-7 text-xs focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button 
              onClick={() => setViewMode('grid')}
              className={cn("px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all", viewMode === 'grid' ? "bg-white shadow-sm text-emerald-600" : "text-slate-400")}
            >
              Grid View
            </button>
            <button 
              onClick={() => setViewMode('denah')}
              data-testid="denah-view-btn"
              className={cn("px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all", viewMode === 'denah' ? "bg-white shadow-sm text-emerald-600" : "text-slate-400")}
            >
              Denah Kamar
            </button>
            <button 
              onClick={() => setViewMode('timeline')}
              className={cn("px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all", viewMode === 'timeline' ? "bg-white shadow-sm text-emerald-600" : "text-slate-400")}
            >
              Timeline
            </button>
          </div>

          {viewMode === 'denah' && (
            <button 
              onClick={() => setIsBuilderMode(!isBuilderMode)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                isBuilderMode ? "bg-amber-500 text-white border-amber-600 shadow-inner" : "bg-white text-slate-600 border-slate-200"
              )}
            >
              {isBuilderMode ? <Move className="h-3.5 w-3.5" /> : <Settings className="h-3.5 w-3.5" />}
              {isBuilderMode ? 'SIMPAN TATA LETAK' : 'EDIT DENAH'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setZoom(Math.max(0.4, zoom - 0.1))} className="p-1 hover:bg-white rounded shadow-sm transition-all"><ZoomOut className="h-4 w-4 text-slate-500" /></button>
            <span className="text-[10px] font-black text-slate-400 w-8 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(Math.min(2, zoom + 0.1))} className="p-1 hover:bg-white rounded shadow-sm transition-all"><ZoomIn className="h-4 w-4 text-slate-500" /></button>
          </div>
        </div>
      </div>

      {/* 3. VISUAL ROOM GRID / DENAH */}
      <div className="flex-1 flex overflow-hidden bg-slate-100">
        {/* Unplaced Rooms Sidebar (only in Builder Mode) */}
        {viewMode === 'denah' && isBuilderMode && (
          <div className="w-64 bg-white border-r border-slate-200 flex flex-col z-30 shadow-xl">
            <div className="p-4 border-b border-slate-100">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Kamar Belum Diatur</h4>
              <p className="text-[10px] text-slate-400 mt-1">Klik untuk taruh di denah</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {unplacedRooms.map((room, index) => (
                <div 
                  key={room.id}
                  onClick={() => {
                    const { x, y } = getStaggeredPlacement(room, index);
                    updateRoomPosition(room.id, x, y);
                  }}
                  className="bg-slate-50 border border-slate-200 p-3 rounded-xl cursor-pointer hover:bg-emerald-50 hover:border-emerald-200 transition-all flex items-center justify-between group"
                >
                  <span className="font-black text-slate-700">{room.number}</span>
                  <Plus className="h-4 w-4 text-emerald-500" />
                </div>
              ))}
              {unplacedRooms.length === 0 && (
                <p className="text-[10px] text-center text-slate-400 py-10 font-bold uppercase tracking-widest">Semua kamar sudah diatur</p>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto p-8 custom-scrollbar flex justify-center items-start relative" ref={canvasRef}>
          {viewMode === 'timeline' ? (
            <div className="w-full max-w-6xl h-[calc(100vh-220px)]">
              <TimelineView
                startDate={startOfDay(new Date())}
                daysCount={14}
                onBookingClick={(booking) => {
                  const b = bookings.find((x) => x.id === booking.id);
                  if (b) {
                    setSelectedRoomId(b.roomId);
                    setShowDetail(true);
                  }
                }}
              />
            </div>
          ) : viewMode === 'grid' ? (
            <div 
              className="grid gap-4 transition-all duration-300 w-full"
              style={{ 
                gridTemplateColumns: `repeat(auto-fill, minmax(${140 * zoom}px, 1fr))`,
              }}
            >
              {filteredRooms.map(room => (
                <RoomCard 
                  key={room.id} 
                  room={room} 
                  booking={getActiveBooking(room.id)}
                  config={getStatusConfig(room.status, getActiveBooking(room.id))}
                  onClick={() => { setSelectedRoomId(room.id); setShowDetail(true); }}
                  zoom={zoom}
                />
              ))}
            </div>
          ) : (
            <div className="relative">
              {showDenahEmpty && (
                <div
                  data-testid="denah-empty-state"
                  className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
                >
                  <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-3xl shadow-xl p-8 max-w-md text-center pointer-events-auto">
                    <LayoutGrid className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-black text-slate-800 mb-2">Belum Ada Kamar di Denah</h3>
                    <p className="text-sm text-slate-500 mb-6">
                      {rooms.length} kamar terdaftar belum ditempatkan. Atur tata letak otomatis atau manual.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button
                        data-testid="denah-auto-layout-btn"
                        variant="primary"
                        icon={<LayoutGrid className="h-4 w-4" />}
                        className="rounded-2xl"
                        onClick={handleAutoLayout}
                      >
                        Atur Denah Otomatis
                      </Button>
                      <Button
                        data-testid="denah-manual-layout-btn"
                        variant="secondary"
                        icon={<Settings className="h-4 w-4" />}
                        className="rounded-2xl"
                        onClick={() => setIsBuilderMode(true)}
                      >
                        Edit Denah Manual
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              <div 
                className="relative bg-white border border-slate-200 rounded-3xl shadow-inner min-w-[3000px] min-h-[3000px]"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
                data-testid="denah-canvas"
              >
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '40px 40px' }} />
                
                {placedRooms.map(room => (
                  <DraggableRoomCard
                    key={room.id}
                    room={room}
                    booking={getActiveBooking(room.id)}
                    config={getStatusConfig(room.status, getActiveBooking(room.id))}
                    isBuilderMode={isBuilderMode}
                    onSelect={() => {
                      setSelectedRoomId(room.id);
                      setShowDetail(true);
                    }}
                    onPositionChange={updateRoomPosition}
                    onRemove={() => updateRoomPosition(room.id, null, null)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. DETAIL POPUP (MODAL) */}
      <Modal 
        isOpen={showDetail} 
        onClose={() => setShowDetail(false)} 
        title={`Kamar ${selectedRoom?.number}`}
        size="md"
      >
        {selectedRoom && (
          <div className="space-y-6">
            <div className={cn("p-6 rounded-3xl text-white flex items-center justify-between", getStatusConfig(selectedRoom.status, activeBooking).bg)}>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Nomor Kamar</p>
                <h3 className="text-4xl font-black">{selectedRoom.number}</h3>
                <Badge className="mt-2 bg-white/20 text-white border-none">{roomTypes.find(t => t.id === selectedRoom.roomTypeId)?.name}</Badge>
              </div>
              <div className="p-4 bg-white/20 rounded-2xl">
                {getStatusConfig(selectedRoom.status, activeBooking).icon}
              </div>
            </div>

            {activeBooking ? (
              <div className="space-y-4">
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-100">
                      <User className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Tamu Menginap</p>
                      <h4 className="text-lg font-black text-slate-800">{activeBooking.guest?.name}</h4>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <InfoBox label="Check-in" value={formatShortDate(activeBooking.checkIn)} />
                    <InfoBox label="Check-out" value={formatShortDate(activeBooking.checkOut)} />
                    <InfoBox label="Malam" value={`${activeBooking.nights} Malam`} />
                    <InfoBox 
                      label="Pembayaran" 
                      value={activeBooking.paymentStatus === 'paid' ? 'Lunas' : 'Belum Bayar'} 
                      valueClass={activeBooking.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-rose-500'}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    className="flex-1 h-12 rounded-2xl" 
                    variant="secondary" 
                    icon={<Wallet className="h-4 w-4" />}
                    onClick={() => { setShowDetail(false); navigate('/pos', { state: { bookingId: activeBooking.id } }); }}
                  >
                    Bayar POS
                  </Button>
                  <Button 
                    className="flex-1 h-12 rounded-2xl" 
                    variant="danger" 
                    icon={<LogOut className="h-4 w-4" />}
                    onClick={() => setShowCheckoutModal(true)}
                  >
                    Checkout
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-3xl space-y-4">
                <Map className="h-12 w-12 mx-auto text-slate-200" />
                <div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Kamar Tersedia</p>
                  <p className="text-xs text-slate-400 px-10">Kamar ini siap untuk dipesan atau digunakan untuk tamu walk-in.</p>
                </div>
                <Button variant="primary" icon={<Plus className="h-4 w-4" />} className="rounded-2xl" onClick={() => navigate('/bookings', { state: { openNew: true, roomId: selectedRoom?.id } })}>Buat Reservasi</Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 5. CHECKOUT CONFIRMATION MODAL */}
      <Modal 
        isOpen={showCheckoutModal} 
        onClose={() => setShowCheckoutModal(false)} 
        title="Konfirmasi Checkout"
        size="sm"
      >
        {activeBooking && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut className="h-8 w-8 text-rose-500" />
              </div>
              <h3 className="text-xl font-black text-slate-800">Proses Checkout?</h3>
              <p className="text-xs text-slate-400 font-bold uppercase mt-1">Kamar {selectedRoom?.number} · {activeBooking.guest?.name}</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 space-y-3">
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest">
                <span className="text-slate-400">Total Tagihan</span>
                <span className="text-slate-700">{formatCurrency(activeBooking.totalAmount)}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest">
                <span className="text-slate-400">Sudah Bayar</span>
                <span className="text-emerald-600">{formatCurrency(activeBooking.paidAmount)}</span>
              </div>
              <div className="h-px bg-slate-200" />
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sisa Tagihan</span>
                <span className={cn(
                  "text-lg font-black",
                  activeBooking.totalAmount - activeBooking.paidAmount > 0 ? "text-rose-500" : "text-emerald-500"
                )}>
                  {formatCurrency(activeBooking.totalAmount - activeBooking.paidAmount)}
                </span>
              </div>
            </div>

            {activeBooking.totalAmount - activeBooking.paidAmount > 0 ? (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-amber-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-black text-amber-700 uppercase leading-tight">Masih Ada Tagihan!</p>
                    <p className="text-[10px] text-amber-600 mt-1 font-medium italic">Sangat disarankan untuk melunasi tagihan sebelum tamu checkout.</p>
                  </div>
                </div>
                <Button 
                  variant="primary" 
                  className="w-full rounded-2xl h-12 bg-emerald-600 shadow-emerald-100 shadow-lg"
                  icon={<Receipt className="h-4 w-4" />}
                  onClick={() => navigate('/pos', { state: { bookingId: activeBooking.id } })}
                >
                  Bayar Sekarang via POS
                </Button>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                <div>
                  <p className="text-xs font-black text-emerald-700 uppercase leading-tight">Tagihan Lunas</p>
                  <p className="text-[10px] text-emerald-600 mt-1 font-medium">Semua pembayaran telah diselesaikan. Kamar siap diclearing.</p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 rounded-2xl" 
                onClick={() => setShowCheckoutModal(false)}
              >
                Batal
              </Button>
              <Button 
                variant={activeBooking.totalAmount - activeBooking.paidAmount > 0 ? "secondary" : "primary"} 
                className="flex-1 rounded-2xl"
                loading={isProcessing}
                onClick={handleFinalCheckout}
              >
                Ya, Checkout
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Legend Footer */}
      <div className="bg-white border-t border-slate-200 px-4 py-2 flex items-center gap-6 z-40">
        <LegendItem color="bg-emerald-500" label="Terisi" />
        <LegendItem color="bg-slate-300" label="Kosong" />
        <LegendItem color="bg-amber-400" label="Dirty" />
        <LegendItem color="bg-slate-500" label="Maint" />
        <div className="h-4 w-px bg-slate-200 mx-2" />
        <div className="flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
          <span className="text-[10px] font-bold text-slate-400 uppercase">Perlu Perhatian</span>
        </div>
      </div>
    </div>
  );
}

// Sub-components
function StatItem({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div>
      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</p>
      <p className={cn("text-3xl font-black", color)}>{value}</p>
    </div>
  );
}

interface StatusConfig {
  bg: string;
  text: string;
  icon: ReactNode;
  statusLabel: string;
  dotColor: string;
}

function DraggableRoomCard({
  room,
  booking,
  config,
  isBuilderMode,
  onSelect,
  onPositionChange,
  onRemove,
}: {
  room: Room;
  booking?: Booking;
  config: StatusConfig;
  isBuilderMode: boolean;
  onSelect: () => void;
  onPositionChange: (id: string, x: number, y: number) => void;
  onRemove: () => void;
}) {
  const x = useMotionValue(room.positionX ?? 0);
  const y = useMotionValue(room.positionY ?? 0);

  useEffect(() => {
    x.set(room.positionX ?? 0);
    y.set(room.positionY ?? 0);
  }, [room.positionX, room.positionY, x, y]);

  return (
    <motion.div
      drag={isBuilderMode}
      dragMomentum={false}
      dragElastic={0}
      style={{ x, y, zIndex: isBuilderMode ? 50 : 10 }}
      className="absolute left-0 top-0"
      onDragEnd={() => {
        onPositionChange(room.id, x.get(), y.get());
      }}
    >
      <div className="relative group">
        <RoomCard
          room={room}
          booking={booking}
          config={config}
          onClick={() => {
            if (!isBuilderMode) onSelect();
          }}
          className={cn(isBuilderMode ? 'cursor-move' : 'cursor-pointer')}
          isDenah
        />
        {isBuilderMode && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-2 w-2" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

function RoomCard({ room, booking, config, onClick, zoom = 1, className, isDenah = false }: any) {
  const roomType = getRoomTypeById(room.roomTypeId);

  const facilityIcons: Record<string, any> = {
    'AC': <Wind className="h-2.5 w-2.5" />,
    'Kamar Mandi Dalam': <Droplets className="h-2.5 w-2.5" />,
    'WiFi': <Wifi className="h-2.5 w-2.5" />,
    'TV': <Tv className="h-2.5 w-2.5" />,
    'Air Panas': <Thermometer className="h-2.5 w-2.5" />,
  };

  return (
    <div 
      onClick={onClick}
      data-testid={isDenah ? `denah-room-${room.number}` : undefined}
      style={{ transform: !isDenah ? `scale(${zoom})` : undefined }}
      className={cn(
        "rounded-3xl p-4 flex flex-col items-center justify-center transition-all shadow-md group relative overflow-hidden select-none",
        config.bg, config.text,
        isDenah ? "w-32 h-32" : "aspect-square",
        className
      )}
    >
      {/* Top Status Icon/Indicator */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5">
        {booking?.paymentStatus === 'unpaid' && (
          <CreditCard className="h-3.5 w-3.5 text-white/60" />
        )}
        <div className={cn("w-2 h-2 rounded-full shadow-sm", config.dotColor)} />
      </div>

      <div className="absolute top-3 left-3 opacity-50">
        {config.icon}
      </div>

      <span className="text-2xl font-black mb-0.5 tracking-tighter">{room.number}</span>
      <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-60">
        {roomType?.name.split(' ')[0]}
      </span>
      
      {booking ? (
        <div className="mt-3 text-center w-full px-1">
          <p className="text-[10px] font-black truncate leading-none uppercase tracking-tight">{booking.guest?.name.split(' ')[0]}</p>
          <div className="flex items-center justify-center gap-1 mt-1 text-[7px] font-black opacity-60 uppercase">
            <span>{booking.checkOut.split('-')[2]}/{booking.checkOut.split('-')[1]}</span>
          </div>
        </div>
      ) : roomType ? (
        <div className="mt-2 flex flex-col items-center gap-1">
          <p className="text-[10px] font-black">{formatCurrency(roomType.basePrice).replace('Rp', 'Rp ')}</p>
          <div className="flex gap-1">
            {roomType.facilities.slice(0, 3).map(f => (
              <span key={f} title={f} className="opacity-50">
                {facilityIcons[f] || null}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InfoBox({ label, value, valueClass }: any) {
  return (
    <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className={cn("text-sm font-black text-slate-800", valueClass)}>{value}</p>
    </div>
  );
}

function LegendItem({ color, label }: any) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("w-3 h-3 rounded-md", color)} />
      <span className="text-[10px] font-bold text-slate-500 uppercase">{label}</span>
    </div>
  );
}
