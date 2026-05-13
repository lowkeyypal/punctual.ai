import { useState, useEffect } from 'react';
import {
  Clock, ShieldAlert, User, LogOut, FileText, Send, LayoutGrid, CalendarDays, Moon, Sun
} from 'lucide-react';
import { supabase, type StrikeEmployee } from '../../lib/supabase';
import { useAuth } from '../App';
import { type LeaveBalance } from '../../lib/supabase';
import { MonthPicker } from '../components/MonthPicker';

function getEmpCellStyle(flag: string | null | undefined): string {
  if (!flag) return '';
  if (flag === 'YES' || flag === 'LC') return 'bg-orange-50 text-orange-500';
  if (flag === 'CL' || flag === 'LEAVE') return 'bg-blue-50 text-blue-500';
  if (flag === 'SL') return 'bg-red-50 text-red-400';
  if (flag === 'EL') return 'bg-emerald-50 text-emerald-600';
  if (flag === 'NO') return 'bg-[#EEF2FF] text-[#4361EE]';
  return 'bg-[#F4F6FA] text-[#8F9BB3]';
}

function getEmpCellLabel(flag: string | null | undefined): string {
  if (!flag) return '';
  if (flag === 'YES' || flag === 'LC') return 'Late';
  if (flag === 'CL' || flag === 'LEAVE') return 'CL';
  if (flag === 'SL') return 'SL';
  if (flag === 'EL') return 'EL';
  if (flag === 'NO') return 'On Time';
  return flag;
}

export function EmployeeDashboard() {
  const { session, userEmployeeId, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'info' | 'appeal' | 'calendar'>('info');
  const [leaveData, setLeaveData] = useState<LeaveBalance | null>(null);
  const [employeeData, setEmployeeData] = useState<StrikeEmployee | null>(null);
  const [loading, setLoading] = useState(true);
  const [appealText, setAppealText] = useState('');
  const [appealStatus, setAppealStatus] = useState<'success' | 'error' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) {
      setIsDark(true);
    }
  }, []);

  const toggleDarkMode = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    }
  };

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [dailyRecords, setDailyRecords] = useState<any[] | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);

  useEffect(() => {
    if (userEmployeeId && activeTab === 'calendar') {
      fetchDailyRecords();
    }
  }, [userEmployeeId, activeTab, selectedMonth]);

  const fetchDailyRecords = async () => {
    setCalendarLoading(true);
    const { data } = await supabase
      .from('daily_records')
      .select('*')
      .eq('employee_id', userEmployeeId)
      .like('date', `${selectedMonth}-%`);
    setDailyRecords(data || []);
    setCalendarLoading(false);
  };

  useEffect(() => {
    if (userEmployeeId) {
      fetchEmployeeData();
      fetchLeaveData();
    } else {
      setLoading(false);
    }
  }, [userEmployeeId]);

  const fetchLeaveData = async () => {
    const { data } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('employee_id', userEmployeeId)
      .single();
    if (data) setLeaveData(data);
  };

  const fetchEmployeeData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('strike_counter')
      .select('*')
      .eq('employee_id', userEmployeeId)
      .single();

    if (error) console.error('Error fetching employee data:', error);
    else setEmployeeData(data);
    setLoading(false);
  };

  const handleAppealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealText.trim()) return;
    setSubmitting(true);

    try {
      await fetch(`${import.meta.env.VITE_N8N_BASE_URL}/webhook/excuse-appeal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: userEmployeeId,
          email: session?.user.email,
          reason: appealText,
          timestamp: new Date().toISOString(),
        }),
      });
      setAppealStatus('success');
      setAppealText('');
    } catch {
      setAppealStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  const getStrikeBadge = (count: number) => {
    if (count >= 3) return (
      <span className="px-2.5 py-1 bg-red-50 text-red-600 rounded-full text-xs font-semibold">
        🚨 Critical (Strike 3)
      </span>
    );
    if (count === 2) return (
      <span className="px-2.5 py-1 bg-yellow-50 text-yellow-700 rounded-full text-xs font-semibold">
        ⚠️ At Risk (Strike 2)
      </span>
    );
    if (count === 1) return (
      <span className="px-2.5 py-1 bg-orange-50 text-orange-600 rounded-full text-xs font-semibold">
        📝 Warning (Strike 1)
      </span>
    );
    return (
      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-semibold">
        ✅ Good Standing
      </span>
    );
  };

  const excuseColor =
    employeeData?.excused === 'APPROVED' ? 'text-[#4361EE]'
      : employeeData?.excused === 'PENDING' ? 'text-purple-600'
        : employeeData?.excused === 'REJECTED' ? 'text-red-500'
          : 'text-[#1B2559]';

  // --- Calendar Data Generator ---
  const [yearStr, monthStr] = selectedMonth.split('-');
  const currentYear = parseInt(yearStr, 10);
  const currentMonthNum = parseInt(monthStr, 10) - 1; // 0-indexed

  const daysInMonth = new Date(currentYear, currentMonthNum + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonthNum, 1).getDay();

  const calendarCells = [];
  for (let i = 0; i < firstDayOfMonth; i++) calendarCells.push({ date: null, record: null });

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${selectedMonth}-${String(d).padStart(2, '0')}`;
    const record = dailyRecords?.find(r => r.date === dateStr);
    calendarCells.push({ date: d, record });
  }
  while (calendarCells.length % 7 !== 0) calendarCells.push({ date: null, record: null });

  return (
    <div className="min-h-screen bg-[#F0F2F8] flex flex-col">
      {/* Top bar */}
      <header className="h-[56px] bg-white border-b border-[#EEF0F6] flex items-center px-5 gap-4 shrink-0">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #4361EE 0%, #3A0CA3 100%)' }}
        >
          <LayoutGrid size={14} className="text-white" />
        </div>
        <div className="flex-1">
          <span className="text-xs font-semibold text-[#1B2559]">Punctual.ai</span>
          <span className="text-[11px] text-[#8F9BB3] ml-2">• Employee Portal</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleDarkMode}
            className="w-8 h-8 rounded-full bg-[#F4F6FA] flex items-center justify-center transition-colors hover:bg-[#EEF2FF] dark:bg-[#1E293B] dark:hover:bg-[#334155]"
          >
            {isDark ? <Sun size={14} className="text-[#4361EE] dark:text-[#E2E8F0]" /> : <Moon size={14} className="text-[#4361EE]" />}
          </button>

          <span className="text-xs text-[#8F9BB3] hidden sm:block border-l border-[#EEF0F6] pl-3">{session?.user.email}</span>

          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-xs text-[#8F9BB3] hover:text-[#4361EE] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#EEF2FF]"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </header>

      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs text-[#8F9BB3] mb-1">My Dashboard</p>
          <h1 className="text-xl font-bold text-[#1B2559] mb-6">My Attendance</h1>

          {/* Tabs */}
          <div className="flex border-b border-[#EEF0F6] mb-6 bg-white rounded-t-xl px-4">
            <button
              onClick={() => setActiveTab('info')}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${activeTab === 'info'
                ? 'border-[#4361EE] text-[#4361EE]'
                : 'border-transparent text-[#8F9BB3] hover:text-[#1B2559]'
                }`}
            >
              <User size={13} /> My Information
            </button>
            <button
              onClick={() => setActiveTab('appeal')}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${activeTab === 'appeal'
                ? 'border-[#4361EE] text-[#4361EE]'
                : 'border-transparent text-[#8F9BB3] hover:text-[#1B2559]'
                }`}
            >
              <FileText size={13} /> Appeal for Excuse
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${activeTab === 'calendar'
                ? 'border-[#4361EE] text-[#4361EE]'
                : 'border-transparent text-[#8F9BB3] hover:text-[#1B2559]'
                }`}
            >
              <CalendarDays size={13} /> Attendance Calendar
            </button>
          </div>

          {/* Content */}
          {loading ? (
            <div className="bg-white rounded-xl border border-[#EEF0F6] p-12 text-center text-sm text-[#8F9BB3]">
              Loading your data...
            </div>
          ) : !employeeData ? (
            <div className="bg-white rounded-xl border border-[#EEF0F6] p-12 text-center text-sm text-[#8F9BB3]">
              No attendance record found for Employee ID:{' '}
              <span className="font-semibold text-[#1B2559]">{userEmployeeId}</span>. Please contact HR.
            </div>
          ) : (
            <>
              {/* Info Tab */}
              {activeTab === 'info' && (
                <div className="space-y-4">
                  {/* Stat cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl border border-[#EEF0F6] p-5 shadow-sm">
                      <h3 className="text-[10px] font-semibold text-[#8F9BB3] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <User size={12} /> Employee ID
                      </h3>
                      <div className="text-2xl font-bold text-[#1B2559]">{employeeData.employee_id}</div>
                    </div>
                    <div className="bg-white rounded-xl border border-[#EEF0F6] p-5 shadow-sm">
                      <h3 className="text-[10px] font-semibold text-[#8F9BB3] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Clock size={12} /> Late Days This Month
                      </h3>
                      <div className="text-2xl font-bold text-red-500">{employeeData.monthly_late_count}</div>
                    </div>
                  </div>

                  {/* Details card */}
                  <div className="bg-white rounded-xl border border-[#EEF0F6] p-5 shadow-sm">
                    {[
                      { label: 'Name', value: employeeData.name },
                      { label: 'Role', value: leaveData?.designation || 'N/A' },
                      { label: 'Department', value: leaveData?.department || employeeData.department || 'N/A' },
                      { label: 'Manager', value: 'N/A' },
                      { label: 'Month', value: employeeData.month_year },
                      { label: 'Last Late Date', value: employeeData.last_warning_date },
                      { label: 'Strike Level', value: String(employeeData.strike_level) },
                    ].map((row) => (
                      <div key={row.label} className="flex justify-between items-center py-2.5 border-b border-[#EEF0F6] last:border-0">
                        <span className="text-xs text-[#8F9BB3] font-medium">{row.label}</span>
                        <span className="text-xs font-semibold text-[#1B2559]">{row.value}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center py-2.5 border-b border-[#EEF0F6]">
                      <span className="text-xs text-[#8F9BB3] font-medium">Status</span>
                      {getStrikeBadge(employeeData.monthly_late_count)}
                    </div>
                    <div className="flex justify-between items-center py-2.5">
                      <span className="text-xs text-[#8F9BB3] font-medium">Excuse Status</span>
                      <span className={`text-xs font-semibold ${excuseColor}`}>
                        {employeeData.excused || 'Not Applied'}
                      </span>
                    </div>
                  </div>

                  {/* AI Behaviour Analysis */}
                  {employeeData.behaviour_analysis && (
                    <div className="bg-[#EEF2FF] rounded-xl border border-[#C7D2FE] p-5">
                      <h3 className="text-xs font-semibold text-[#4361EE] mb-2 flex items-center gap-1.5">
                        <ShieldAlert size={13} /> AI Behaviour Analysis
                      </h3>
                      <p className="text-xs text-[#4361EE] leading-relaxed">{employeeData.behaviour_analysis}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Appeal Tab */}
              {activeTab === 'appeal' && (
                <div className="bg-white rounded-xl border border-[#EEF0F6] p-6 shadow-sm">
                  <h2 className="text-sm font-bold text-[#1B2559] mb-1">Submit an Excuse Appeal</h2>
                  <p className="text-xs text-[#8F9BB3] mb-6">
                    Explain the reason for your late arrivals. HR will review your appeal and respond accordingly.
                  </p>

                  {employeeData.excused === 'APPROVED' ? (
                    <div className="text-center py-8 text-[#4361EE] text-sm font-medium">
                      ✅ Your excuse has already been approved by HR.
                    </div>
                  ) : (
                    <form onSubmit={handleAppealSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#1B2559] uppercase tracking-wider mb-1.5">
                          Reason for Late Arrivals
                        </label>
                        <textarea
                          rows={5}
                          required
                          placeholder="Please explain your situation in detail..."
                          value={appealText}
                          onChange={(e) => setAppealText(e.target.value)}
                          className="w-full border border-[#EEF0F6] rounded-lg p-3 text-sm text-[#1B2559] bg-[#F4F6FA] focus:border-[#4361EE] focus:ring-1 focus:ring-[#4361EE] outline-none resize-none placeholder:text-[#8F9BB3] transition-colors"
                        />
                      </div>

                      {appealStatus === 'success' && (
                        <div className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                          ✅ Appeal submitted successfully! HR will review it shortly.
                        </div>
                      )}
                      {appealStatus === 'error' && (
                        <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                          ❌ Failed to submit. Please try again or contact HR directly.
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
                        style={{ background: 'linear-gradient(135deg, #4361EE 0%, #3A0CA3 100%)' }}
                      >
                        <Send size={14} />
                        {submitting ? 'Submitting...' : 'Submit Appeal'}
                      </button>
                    </form>
                  )}
                </div>
              )}
              {activeTab === 'calendar' && (
                <div className="space-y-6">
                  {!leaveData ? (
                    <div className="bg-white rounded-xl border border-[#EEF0F6] p-12 text-center text-sm text-[#8F9BB3]">
                      No leave record found. Contact HR.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: 'Sick Leave', taken: leaveData.sl_taken, left: leaveData.sl_left, color: 'bg-red-400', textColor: 'text-red-500' },
                        { label: 'Casual Leave', taken: leaveData.cl_taken, left: leaveData.cl_left, color: 'bg-[#4361EE]', textColor: 'text-[#4361EE]' },
                        { label: 'Earned Leave', taken: leaveData.el_taken, left: leaveData.el_left, color: 'bg-emerald-500', textColor: 'text-emerald-600' },
                      ].map((card) => (
                        <div key={card.label} className="bg-white rounded-xl border border-[#EEF0F6] p-4 shadow-sm text-center">
                          <p className="text-[10px] font-semibold text-[#8F9BB3] uppercase tracking-wider mb-2">{card.label}</p>
                          <p className={`text-3xl font-bold ${card.textColor} mb-0.5`}>{card.left}</p>
                          <p className="text-[11px] text-[#8F9BB3]">remaining</p>
                          <div className="mt-3 h-1.5 bg-[#EEF0F6] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${card.color}`}
                              style={{ width: `${Math.round((card.taken / ((card.taken + card.left) || 1)) * 100)}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-[#8F9BB3] mt-1">{card.taken} used of {card.taken + card.left}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Calendar View */}
                  <div className="bg-white rounded-xl border border-[#EEF0F6] p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-sm font-bold text-[#1B2559]">Attendance Calendar</h2>
                      <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
                    </div>

                    {calendarLoading ? (
                      <div className="text-center py-12 text-[#8F9BB3] text-sm font-medium">Loading attendance records...</div>
                    ) : dailyRecords && dailyRecords.length === 0 ? (
                      <div className="text-center py-12 text-[#8F9BB3] text-sm font-medium bg-[#F4F6FA] rounded-lg border border-[#EEF0F6] border-dashed">
                        No data present for this month.
                      </div>
                    ) : (
                      <div className="border border-[#EEF0F6] rounded-lg overflow-hidden">
                        {/* Days header */}
                        <div className="grid grid-cols-7 bg-[#F4F6FA] border-b border-[#EEF0F6]">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="py-2 text-center text-[10px] font-bold text-[#8F9BB3] uppercase tracking-wider border-r border-[#EEF0F6] last:border-r-0">
                              {day}
                            </div>
                          ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7">
                          {calendarCells.map((cell, idx) => {
                            const now = new Date();
                            const isToday = cell.date === now.getDate() &&
                              currentMonthNum === now.getMonth() &&
                              currentYear === now.getFullYear();

                            const cellDateObj = cell.date
                              ? new Date(currentYear, currentMonthNum, cell.date)
                              : null;
                            const isSunday = cellDateObj ? cellDateObj.getDay() === 0 : false;
                            const isPastOrToday = cellDateObj ? cellDateObj <= now : false;
                            // Absent = no record OR record with null late_flag (leave not recorded in daily_records)
                            const showAbsent = cell.date !== null
                              && (!cell.record || !cell.record.late_flag)
                              && !isSunday
                              && isPastOrToday;

                            return (
                              <div key={idx} className={`min-h-[60px] p-1.5 border-b border-r border-[#EEF0F6] ${isToday ? 'bg-[#EEF2FF]' : ''}`}>
                                {cell.date && (
                                  <>
                                    <span className={`text-[10px] font-semibold block mb-0.5 ${isToday ? 'text-[#4361EE]' : 'text-[#8F9BB3]'}`}>
                                      {cell.date}
                                    </span>
                                    {cell.record?.late_flag && cell.record.late_flag !== 'OFF' ? (
                                      <div className={`text-[9px] font-medium px-1 py-0.5 rounded text-center ${getEmpCellStyle(cell.record.late_flag)}`}>
                                        {getEmpCellLabel(cell.record.late_flag)}
                                      </div>
                                    ) : showAbsent ? (
                                      <div className="relative group">
                                        <div className="text-[9px] font-medium px-1 py-0.5 rounded text-center bg-gray-50 text-gray-500 border border-gray-100 italic transition-colors group-hover:bg-gray-100">
                                          Absent
                                        </div>
                                        {leaveData && (
                                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-20
                                                          opacity-0 group-hover:opacity-100 pointer-events-none
                                                          transition-opacity duration-150
                                                          bg-[#1B2559] text-white rounded-lg px-2.5 py-2
                                                          shadow-xl whitespace-nowrap text-[8px] leading-4">
                                            <p className="font-bold mb-0.5 text-[9px]">Month's Leave Taken</p>
                                            {leaveData.sl_taken > 0 && <p>🔴 Sick Leave: <span className="font-semibold">{leaveData.sl_taken}d</span></p>}
                                            {leaveData.cl_taken > 0 && <p>🔵 Casual Leave: <span className="font-semibold">{leaveData.cl_taken}d</span></p>}
                                            {leaveData.el_taken > 0 && <p>🟢 Earned Leave: <span className="font-semibold">{leaveData.el_taken}d</span></p>}
                                            {leaveData.sl_taken === 0 && leaveData.cl_taken === 0 && leaveData.el_taken === 0 && (
                                              <p className="text-gray-300">No leaves recorded this month</p>
                                            )}
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1B2559]" />
                                          </div>
                                        )}
                                      </div>
                                    ) : null}
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-[#EEF0F6]">
                          {[
                            { label: 'On Time', cls: 'bg-[#EEF2FF] text-[#4361EE]' },
                            { label: 'Late', cls: 'bg-orange-50 text-orange-500' },
                            { label: 'CL', cls: 'bg-blue-50 text-blue-500' },
                            { label: 'SL', cls: 'bg-red-50 text-red-400' },
                            { label: 'EL', cls: 'bg-emerald-50 text-emerald-600' },
                            { label: 'Absent', cls: 'bg-gray-100 text-gray-400' },
                          ].map(l => (
                            <span key={l.label} className={`text-[9px] font-semibold px-2 py-0.5 rounded ${l.cls}`}>{l.label}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
