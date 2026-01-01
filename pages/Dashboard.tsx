
import React, { useMemo, useState, useEffect } from 'react';
import SignalCard from '../components/SignalCard';
import { Clock, Zap, Activity, ShieldCheck, Send, Timer, ArrowRight, List, TrendingUp, TrendingDown, Target, MessageSquareCode, Radio as RadioIcon, Loader2, CheckCircle2, ChevronDown, ChevronUp, Bell, BellRing, X } from 'lucide-react';
import { WatchlistItem, TradeSignal, User, TradeStatus, ChatMessage } from '../types';
import { GranularHighlights } from '../App';

interface DashboardProps {
  watchlist: WatchlistItem[];
  signals: (TradeSignal & { sheetIndex?: number })[];
  messages: ChatMessage[];
  user: User;
  granularHighlights: GranularHighlights;
  activeMajorAlerts: Record<string, number>;
  activeWatchlistAlerts?: Record<string, number>;
  intelAlertActive?: boolean;
  onSignalUpdate: (updated: TradeSignal) => Promise<boolean>;
  onSendMessage?: (text: string) => Promise<boolean>;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  watchlist = [],
  signals, 
  messages = [],
  user, 
  granularHighlights,
  activeMajorAlerts,
  activeWatchlistAlerts = {},
  intelAlertActive = false,
  onSignalUpdate,
  onSendMessage
}) => {
  const [hotlineText, setHotlineText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isIntelManuallyOpen, setIsIntelManuallyOpen] = useState(false);

  const GRACE_PERIOD_MS = 60 * 1000;

  // Auto-manage intel expansion
  useEffect(() => {
    if (intelAlertActive) {
      setIsIntelManuallyOpen(false); // Let the auto-state take over
    }
  }, [intelAlertActive]);

  const parseFlexibleDate = (dateStr: string | undefined): Date | null => {
    if (!dateStr) return null;
    let d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[2].length === 4) d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      else if (parts[0].length === 4) d = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
    }
    return isNaN(d.getTime()) ? null : d;
  };

  const isTodayOrYesterdayIST = (date: Date) => {
    if (!date || isNaN(date.getTime())) return false;
    const now = new Date();
    const fmt = (d: Date) => new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    const todayStr = fmt(now);
    const targetStr = fmt(date);
    if (todayStr === targetStr) return true;
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return targetStr === fmt(yesterday);
  };

  const latestAdminIntel = useMemo(() => {
    return messages
      .filter(m => m.isAdminReply)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  }, [messages]);

  const lastUpdatedSignal = useMemo(() => {
    return [...signals]
      .filter(s => s.lastTradedTimestamp)
      .sort((a, b) => new Date(b.lastTradedTimestamp!).getTime() - new Date(a.lastTradedTimestamp!).getTime())[0];
  }, [signals]);

  const liveSignals = useMemo(() => {
    const now = new Date();
    return (signals || []).filter(signal => {
      const signalDate = parseFlexibleDate(signal.timestamp);
      if (!signalDate || !isTodayOrYesterdayIST(signalDate)) return false;
      const isLive = signal.status === TradeStatus.ACTIVE || signal.status === TradeStatus.PARTIAL;
      if (isLive) return true;
      const closeTime = parseFlexibleDate(signal.lastTradedTimestamp || signal.timestamp);
      return closeTime && (now.getTime() - closeTime.getTime()) < GRACE_PERIOD_MS;
    });
  }, [signals]);

  const sortedSignals = useMemo(() => {
    return [...liveSignals].sort((a, b) => (b.sheetIndex ?? 0) - (a.sheetIndex ?? 0));
  }, [liveSignals]);

  const handleHotlineSend = async () => {
    if (!hotlineText.trim() || !onSendMessage) return;
    setIsSending(true);
    const success = await onSendMessage(hotlineText);
    if (success) {
      setHotlineText('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
    setIsSending(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1 flex items-center">
            <Activity size={24} className="mr-2 text-emerald-500" />
            Live Trading Floor
          </h2>
          <p className="text-slate-400 text-sm font-mono tracking-tighter italic">Institutional Terminal Active</p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-wrap items-center gap-3">
            <div className="flex items-center px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-[10px] font-bold text-slate-500">
              <Clock size={12} className="mr-1.5 text-blue-500" />
              IST: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          
          {/* Intelligence Broadcast Control Center */}
          {latestAdminIntel && (
            <div className="mb-4">
              {/* STATE 1: INTENSIVE ALERT MODE (Shown only for 10s window) OR STATE 2: MANUALLY OPENED */}
              {(intelAlertActive || isIntelManuallyOpen) ? (
                <div 
                  className={`relative overflow-hidden rounded-2xl border transition-all duration-500 ${intelAlertActive ? 'border-blue-400 animate-card-pulse bg-blue-500/10' : 'border-blue-500/30 bg-gradient-to-br from-blue-900/20 to-slate-950'} p-1`}
                >
                   <div className="absolute top-0 right-0 p-3 opacity-10">
                      <MessageSquareCode size={64} className="text-blue-500" />
                   </div>
                   <div className={`relative bg-slate-900/80 rounded-[14px] p-5 ${intelAlertActive ? 'animate-box-glow' : ''}`}>
                      <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                             <div className={`w-2 h-2 rounded-full ${intelAlertActive ? 'bg-white animate-ping' : 'bg-blue-500 animate-pulse'}`}></div>
                             <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Neural Link: Market Intelligence</h3>
                             {intelAlertActive && (
                               <span className="px-1.5 py-0.5 rounded bg-blue-500 text-white text-[8px] font-black uppercase tracking-tighter animate-pulse ml-2">New Broadcast</span>
                             )}
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className="text-[9px] font-mono text-slate-600 font-bold uppercase">{new Date(latestAdminIntel.timestamp).toLocaleTimeString()} IST</span>
                            {/* Close button only if not in active intensity phase */}
                            {!intelAlertActive && (
                              <button onClick={() => setIsIntelManuallyOpen(false)} className="p-1 hover:bg-slate-800 rounded text-slate-500"><X size={14}/></button>
                            )}
                          </div>
                      </div>
                      <div className="border-l-2 border-blue-500/50 pl-4 py-1">
                         <p className={`text-white text-sm font-bold leading-relaxed tracking-tight italic opacity-95 ${intelAlertActive ? 'scale-[1.01] transition-transform' : ''}`}>
                            "{latestAdminIntel.text}"
                         </p>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                         <div className="flex items-center space-x-2">
                            <RadioIcon size={10} className="text-blue-500" />
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Secure Admin Channel</span>
                         </div>
                      </div>
                   </div>
                </div>
              ) : (
                /* STATE 3: BELL MODE (Shown after 10s normalization) */
                <div className="flex justify-start">
                  <button 
                    onClick={() => setIsIntelManuallyOpen(true)}
                    className="group relative flex items-center justify-center w-12 h-12 bg-slate-900 border border-slate-800 rounded-2xl hover:border-blue-500/50 hover:bg-slate-800 transition-all shadow-xl"
                  >
                    <Bell className="text-blue-500 group-hover:animate-ring" size={20} />
                    <span className="absolute top-3 right-3 w-2 h-2 bg-blue-500 rounded-full animate-pulse border-2 border-slate-950"></span>
                    <div className="absolute left-14 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 border border-slate-800 rounded px-2 py-1 pointer-events-none whitespace-nowrap">
                        <span className="text-[8px] font-black text-white uppercase tracking-widest">Enlarge Intelligence</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Last Updated Trade Banner - Restored & Prominent */}
          {lastUpdatedSignal && (
            <div className="relative bg-slate-900/50 border border-slate-800/50 rounded-xl px-4 py-3 flex items-center justify-between mb-4 overflow-hidden group shadow-lg">
               <div className="absolute inset-y-0 left-0 w-1.5 bg-blue-600"></div>
               <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-blue-600/10 border border-blue-500/20">
                     <Zap size={14} className="text-blue-500 animate-pulse" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center space-x-2 mb-1">
                       <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Latest Session Update</span>
                       <div className="w-1 h-1 rounded-full bg-emerald-500 animate-ping"></div>
                    </div>
                    <div className="flex items-center space-x-2">
                       <span className="text-sm font-black text-white uppercase font-mono tracking-tight">{lastUpdatedSignal.instrument} {lastUpdatedSignal.symbol}</span>
                       <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${
                         lastUpdatedSignal.status === TradeStatus.ACTIVE ? 'bg-emerald-500/10 text-emerald-500' :
                         lastUpdatedSignal.status === TradeStatus.ALL_TARGET ? 'bg-blue-500/10 text-blue-500' :
                         'bg-slate-800 text-slate-500'
                       } uppercase border border-current/10`}>{lastUpdatedSignal.status}</span>
                    </div>
                  </div>
               </div>
               <div className="text-right">
                  <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-tighter">
                    SYNC @ {new Date(lastUpdatedSignal.lastTradedTimestamp!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <div className="flex items-center justify-end text-[7px] font-black text-blue-500 mt-1 uppercase tracking-widest opacity-80">
                     <ShieldCheck size={9} className="mr-1" /> Institutional Feed Verified
                  </div>
               </div>
            </div>
          )}

          {/* Market Watch - Updated Font Style */}
          <div className="relative bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between bg-slate-800/10">
                 <div className="flex items-center space-x-2">
                    <Target size={12} className="text-blue-500" />
                    <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Real-Time Market Ticker</h3>
                 </div>
                 <span className="text-[8px] font-mono font-black text-slate-600 uppercase tracking-tighter">Secure Link</span>
            </div>
            <div className="divide-y divide-slate-800/50">
                {watchlist.map((item, idx) => {
                    const isAlerting = !!activeWatchlistAlerts[item.symbol];
                    return (
                      <div key={idx} className={`flex items-center justify-between px-4 py-2 transition-all duration-200 relative ${isAlerting ? 'animate-box-glow bg-blue-500/10 z-10' : 'hover:bg-slate-800/20'}`}>
                          <div className="flex items-center space-x-3 min-w-0">
                              <div className={`w-1 h-1 rounded-full ${item.isPositive ? 'bg-emerald-500' : 'bg-rose-500'} ${isAlerting ? 'animate-ping' : ''}`}></div>
                              <span className={`text-[10px] font-mono font-bold uppercase tracking-tighter truncate ${isAlerting ? 'text-white' : 'text-slate-300'}`}>{item.symbol}</span>
                          </div>
                          <div className="flex items-center space-x-4">
                              <span className={`text-xs font-mono font-black tracking-tighter ${isAlerting ? 'text-white scale-105 transition-transform' : 'text-slate-100'}`}>
                                ₹{Number(item.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                              </span>
                              <div className="flex items-center min-w-[45px] justify-end">
                                {item.isPositive ? <TrendingUp size={10} className="text-emerald-500 mr-1" /> : <TrendingDown size={10} className="text-rose-500 mr-1" />}
                                <span className={`text-[9px] font-mono font-black ${item.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {Number(item.change || 0).toFixed(1)}%
                                </span>
                              </div>
                              {isAlerting && <Zap size={8} className="text-blue-400 animate-pulse" />}
                          </div>
                      </div>
                    );
                })}
            </div>
          </div>

          {/* Signals List */}
          <div className="space-y-6">
            {sortedSignals.map((signal) => (
              <SignalCard 
                key={signal.id} 
                signal={signal} 
                user={user} 
                highlights={granularHighlights[signal.id]} 
                isMajorAlerting={!!activeMajorAlerts[signal.id]}
                onSignalUpdate={onSignalUpdate}
                isRecentlyClosed={signal.status === TradeStatus.EXITED || signal.status === TradeStatus.STOPPED || signal.status === TradeStatus.ALL_TARGET}
              />
            ))}
          </div>

          <div className="lg:hidden mt-8">
            <HotlineCard 
              text={hotlineText} 
              onTextChange={setHotlineText} 
              onSend={handleHotlineSend} 
              isSending={isSending} 
              showSuccess={showSuccess} 
            />
          </div>
        </div>

        <div className="hidden lg:block space-y-6">
          <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-5 shadow-xl">
             <div className="flex items-center space-x-3 mb-3">
                <Zap size={18} className="text-blue-500" />
                <h4 className="text-xs font-black text-white uppercase tracking-widest">Market Status</h4>
             </div>
             <p className="text-[10px] text-slate-400 leading-relaxed font-medium uppercase tracking-tighter italic">
                Secure link established. Spot prices and institutional flows are syncing in real-time. Alerts will trigger on major level shifts.
             </p>
          </div>

          <HotlineCard 
            text={hotlineText} 
            onTextChange={setHotlineText} 
            onSend={handleHotlineSend} 
            isSending={isSending} 
            showSuccess={showSuccess} 
          />
        </div>
      </div>
    </div>
  );
};

const HotlineCard = ({ text, onTextChange, onSend, isSending, showSuccess }: any) => (
  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl relative overflow-hidden group">
    <div className="absolute top-0 right-0 p-3 opacity-5">
      <Send size={48} className="text-blue-500" />
    </div>
    
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
          <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Terminal Hotline</h4>
        </div>
        <div className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[8px] font-black text-blue-500 uppercase tracking-tighter">
          Secure Channel
        </div>
      </div>

      <textarea 
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder="Send trade query or feedback to admin..."
        className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 focus:border-blue-500 outline-none transition-all placeholder:text-slate-700 resize-none mb-3"
      />

      <button 
        onClick={onSend}
        disabled={isSending || !text.trim()}
        className={`w-full py-2.5 rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest transition-all ${
          showSuccess ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40 disabled:opacity-50'
        }`}
      >
        {isSending ? (
          <Loader2 size={14} className="animate-spin mr-2" />
        ) : showSuccess ? (
          <CheckCircle2 size={14} className="mr-2" />
        ) : (
          <Send size={14} className="mr-2" />
        )}
        {isSending ? 'Transmitting...' : showSuccess ? 'Sent Successfully' : 'Send to Terminal'}
      </button>

      <p className="mt-3 text-[8px] text-slate-600 font-bold text-center uppercase tracking-tighter">
        Admin usually responds via Intelligence Broadcast
      </p>
    </div>
  </div>
);

export default Dashboard;
