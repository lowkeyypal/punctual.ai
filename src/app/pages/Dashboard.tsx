import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  ChevronDown, Filter, Plus, Search,
  Palette, Code2, BarChart2, TrendingUp, Users,
  AlertCircle, CheckCircle, Clock, ShieldAlert, User,
  Check, X, ShoppingCart, Globe, Briefcase, Building,
  Megaphone, Handshake, Smartphone, Settings, HelpCircle,
  Video, Banknote, Landmark, Film, Undo2
} from 'lucide-react';
import { DEPARTMENTS } from '../data/employees';
import { supabase, type StrikeEmployee } from '../../lib/supabase';
import { MonthPicker } from '../components/MonthPicker';
import { useAuth } from '../App';

// Chart data loaded dynamically

const deptIcons: Record<string, React.ReactNode> = {
  Design: <Palette size={14} className="text-[#8F9BB3]" />,
  'Software Development': <Code2 size={14} className="text-[#8F9BB3]" />,
  'Data Science': <BarChart2 size={14} className="text-[#8F9BB3]" />,
  Sales: <TrendingUp size={14} className="text-[#8F9BB3]" />,
  HR: <Users size={14} className="text-[#8F9BB3]" />,
  'Human Resource': <Users size={14} className="text-[#8F9BB3]" />,
  'Online Sales': <ShoppingCart size={14} className="text-[#8F9BB3]" />,
  Website: <Globe size={14} className="text-[#8F9BB3]" />,
  'Business Development': <Briefcase size={14} className="text-[#8F9BB3]" />,
  Management: <Building size={14} className="text-[#8F9BB3]" />,
  'Digital Marketing': <Megaphone size={14} className="text-[#8F9BB3]" />,
  'Client Relationship Management': <Handshake size={14} className="text-[#8F9BB3]" />,
  'Social Media': <Smartphone size={14} className="text-[#8F9BB3]" />,
  'Operations Management': <Settings size={14} className="text-[#8F9BB3]" />,
  Unknown: <HelpCircle size={14} className="text-[#8F9BB3]" />,
  Cinematography: <Video size={14} className="text-[#8F9BB3]" />,
  'Finance & Accounts': <Landmark size={14} className="text-[#8F9BB3]" />,
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white shadow-lg rounded-lg px-3 py-2 border border-[#EEF0F6] text-xs">
        <p className="text-[#8F9BB3] mb-1 font-medium">{label}</p>
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="w-2 h-2 rounded-full bg-[#4361EE]" />
          <span className="text-[#1B2559]">On-Time: <strong>{payload[0]?.value}</strong></span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#B0C4FF]" />
          <span className="text-[#1B2559]">Late: <strong>{payload[1]?.value}</strong></span>
        </div>
      </div>
    );
  }
  return null;
};

function getBadge(count: number, excused: string | null) {
  if (excused === 'APPROVED') return <span className="px-2 py-0.5 bg-[#EEF2FF] text-[#4361EE] rounded-full text-[10px] font-bold">Excused</span>;
  if (excused === 'PENDING') return <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full text-[10px] font-bold animate-pulse">Pending</span>;
  if (count >= 3) return <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-[10px] font-bold">Critical</span>;
  if (count === 2) return <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded-full text-[10px] font-bold">At Risk</span>;
  return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold">Safe</span>;
}

const FILTER_TABS = [
  { label: 'All Late', filter: (e: StrikeEmployee) => e.monthly_late_count >= 1 },
  { label: 'Critical', filter: (e: StrikeEmployee) => e.monthly_late_count >= 3 },
  { label: 'At Risk', filter: (e: StrikeEmployee) => e.monthly_late_count === 2 },
];

export function Dashboard() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [activeFilterTab, setActiveFilterTab] = useState(0);
  const [employees, setEmployees] = useState<StrikeEmployee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [dailyChartData, setDailyChartData] = useState<any[]>([]);
  const [rawDailyRecords, setRawDailyRecords] = useState<any[]>([]);
  const [rawLeaveBalances, setRawLeaveBalances] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchBarChartData();
  }, [selectedMonth]);

  const fetchBarChartData = async () => {
    const { data } = await supabase
      .from('daily_records')
      .select('*')
      .like('date', `${selectedMonth}-%`);
    
    if (data) {
      setRawDailyRecords(data);
      const aggregated: Record<string, { ontime: number; late: number }> = {};
      data.forEach(r => {
        const d = r.date.split('-')[2];
        if (!aggregated[d]) aggregated[d] = { ontime: 0, late: 0 };
        if (r.late_flag === 'YES' || r.late_flag === 'LC') {
          aggregated[d].late += 1;
        } else {
          aggregated[d].ontime += 1;
        }
      });
      const sortedKeys = Object.keys(aggregated).sort((a,b) => parseInt(a)-parseInt(b));
      const newChartData = sortedKeys.map(k => ({
        day: k,
        ontime: aggregated[k].ontime,
        late: aggregated[k].late
      }));
      setDailyChartData(newChartData);
    }
  };

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const [empRes, leaveRes] = await Promise.all([
      supabase.from('strike_counter').select('*'),
      supabase.from('leave_balances').select('*'),
    ]);
    if (empRes.error) console.error('Error fetching data:', empRes.error);
    else setEmployees(empRes.data || []);
    if (leaveRes.data) setRawLeaveBalances(leaveRes.data);
    setLoading(false);
  };

  const handleExcuseAction = async (employeeId: string, action: 'APPROVED' | 'REJECTED' | 'PENDING') => {
    try {
      const response = await fetch(`${import.meta.env.VITE_N8N_BASE_URL}/webhook/hr-override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          action,
          hrManager: session?.user?.email || 'Unknown HR',
        }),
      });

      if (!response.ok) {
        throw new Error('Server returned an error');
      }

      setEmployees((prev) =>
        prev.map((emp) =>
          emp.employee_id === employeeId ? { ...emp, excused: action } : emp
        )
      );
    } catch {
      alert('Failed to update status. Please guarantee n8n is running properly and running the correct workflow.');
    }
  };

  const dashboardMetrics = useMemo(() => {
    if (rawDailyRecords.length === 0) {
      return { total: employees.length, late: '--', onTime: '--', atRisk: '--', critical: '--' };
    }

    const empLates: Record<string, number> = {};
    rawDailyRecords.forEach(r => {
      const eid = r.employee_id;
      if (empLates[eid] === undefined) empLates[eid] = 0;
      if (r.late_flag === 'YES' || r.late_flag === 'LC') {
        empLates[eid] += 1;
      }
    });

    const total = employees.length;
    let late = 0;
    let atRisk = 0;
    let critical = 0;

    Object.values(empLates).forEach(count => {
       if (count > 0) late += 1;
       if (count === 2) atRisk += 1;
       if (count >= 3) critical += 1;
    });

    return { total, late, onTime: total - late, atRisk, critical };
  }, [rawDailyRecords, employees]);

  const { total, late: lateTotal, onTime, atRisk, critical } = dashboardMetrics;

  const departmentStats = useMemo(() => {
    const stats: Record<string, { name: string; total: number | string; ontime: number | string; late: number | string; leave: number | string }> = {};
    const defaultDepts = Array.from(new Set(employees.map(e => e.department || 'Other')));
    
    defaultDepts.forEach(dept => {
      stats[dept] = { name: dept, total: 0, ontime: '--', late: '--', leave: '--' };
    });

    // 1. Calculate actual employee headcount per department
    employees.forEach(e => {
      const dept = e.department || 'Other';
      if (stats[dept]) {
        stats[dept].total = (stats[dept].total as number) + 1;
      }
    });

    if (rawDailyRecords.length > 0) {
      defaultDepts.forEach(dept => {
        stats[dept].ontime = 0;
        stats[dept].late = 0;
        stats[dept].leave = 0;
      });
      
      // 2. Tally up late / on-time from raw daily records
      rawDailyRecords.forEach(r => {
        const dept = r.department || 'Other';
        if (!stats[dept]) return;
        if (r.late_flag === 'YES' || r.late_flag === 'LC') {
          stats[dept].late = (stats[dept].late as number) + 1;
        } else if (r.late_flag === 'NO') {
          stats[dept].ontime = (stats[dept].ontime as number) + 1;
        }
      });

      // 3. Add leave data from leave_balances
      const empDeptMap: Record<string, string> = {};
      employees.forEach(e => { empDeptMap[e.employee_id] = e.department || 'Other'; });
      rawLeaveBalances.forEach(lb => {
        const dept = empDeptMap[lb.employee_id];
        if (dept && stats[dept]) {
          const totalLeave = (lb.sl_taken || 0) + (lb.cl_taken || 0) + (lb.el_taken || 0);
          stats[dept].leave = (stats[dept].leave as number) + totalLeave;
        }
      });
    }
    
    return Object.values(stats).sort((a, b) => (b.total as number) - (a.total as number));
  }, [rawDailyRecords, employees, rawLeaveBalances]);

  const filtered = employees
    .filter(FILTER_TABS[activeFilterTab].filter)
    .filter((e) =>
      !searchQuery || e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.employee_id.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => b.monthly_late_count - a.monthly_late_count);

  return (
    <div className="p-4 h-full">
      <p className="text-xs text-[#8F9BB3] mb-3">Dashboard</p>

      <div className="flex gap-3 h-[calc(100%-32px)]">
        {/* LEFT PANEL */}
        <div className="flex flex-col gap-3" style={{ width: '52%' }}>
          {/* Metrics row */}
          <div className="grid grid-cols-5 gap-2">
            {[
              { label: 'Total', value: total, icon: <User size={11} />, color: 'text-[#1B2559]' },
              { label: 'Late', value: lateTotal, icon: <Clock size={11} />, color: 'text-red-500' },
              { label: 'On Time', value: onTime, icon: <CheckCircle size={11} />, color: 'text-emerald-500' },
              { label: 'At Risk', value: atRisk, icon: <AlertCircle size={11} />, color: 'text-yellow-500' },
              { label: 'Critical', value: critical, icon: <ShieldAlert size={11} />, color: 'text-red-600' },
            ].map((card) => (
              <div key={card.label} className="bg-white rounded-xl p-3 shadow-sm border border-[#EEF0F6] text-center">
                <div className={`flex items-center justify-center gap-1 text-[10px] text-[#8F9BB3] mb-1 ${card.color}`}>
                  {card.icon}
                  <span>{card.label}</span>
                </div>
                <div className={`text-xl font-bold ${card.color}`}>{card.value}</div>
              </div>
            ))}
          </div>

          {/* Chart Card */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-[#EEF0F6] flex-1">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#1B2559]">
                Attendance Status
              </h2>
              <div className="flex items-center gap-2">
                <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
              </div>
            </div>
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#4361EE]" />
                <span className="text-[11px] text-[#8F9BB3]">On-time</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#B0C4FF]" />
                <span className="text-[11px] text-[#8F9BB3]">Late</span>
              </div>
            </div>
            {dailyChartData.length === 0 ? (
              <div className="flex h-[260px] items-center justify-center text-[#8F9BB3] text-sm">
                No data available for this month
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={dailyChartData} barCategoryGap="30%" barGap={2} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F8" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#8F9BB3' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#8F9BB3' }} axisLine={false} tickLine={false} domain={[0, 125]} ticks={[0, 25, 50, 75, 100, 125]} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F4F6FA' }} />
                  <Bar dataKey="ontime" fill="#4361EE" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="late" fill="#B0C4FF" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>


        </div>

        {/* MIDDLE PANEL - Departments */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#EEF0F6] overflow-auto" style={{ width: '22%' }}>
          <h3 className="text-sm font-semibold text-[#1B2559] mb-3">All Departments</h3>
          <div className="flex flex-col gap-3">
            {departmentStats.map((dept) => (
              <div key={dept.name} className="border border-[#EEF0F6] rounded-xl p-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-[10px] text-[#8F9BB3] leading-none">Employees</p>
                    <p className="text-xl font-semibold text-[#1B2559] leading-tight">{dept.total}</p>
                  </div>
                  <div className="text-right text-[10px] text-[#8F9BB3] space-y-0.5">
                    <div className="flex items-center justify-end gap-1">
                      <span>On-time</span>
                      <span className="font-semibold text-[#1B2559]">{String((dept as any).ontime)}</span>
                    </div>
                    <div className="flex items-center justify-end gap-1">
                      <span>Late</span>
                      <span className="font-semibold text-[#1B2559]">{String((dept as any).late)}</span>
                    </div>
                    <div className="flex items-center justify-end gap-1">
                      <span>Leave</span>
                      <span className="font-semibold text-[#1B2559]">{(dept as any).leave !== '--' ? String((dept as any).leave) : '--'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-[#8F9BB3]">
                  {deptIcons[dept.name] || <Users size={14} className="text-[#8F9BB3]" />}
                  <span>{dept.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL - Strike Counter Employees */}
        <div className="bg-white rounded-xl shadow-sm border border-[#EEF0F6] flex flex-col overflow-hidden" style={{ width: '26%' }}>
          <div className="p-4 border-b border-[#EEF0F6]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[#1B2559]">Employees</span>
              <button onClick={() => fetchData()} className="text-[10px] text-[#4361EE] font-medium hover:underline">Refresh</button>
            </div>
            {/* Filter tabs */}
            <div className="flex gap-3">
              {FILTER_TABS.map((tab, i) => (
                <button
                  key={tab.label}
                  onClick={() => setActiveFilterTab(i)}
                  className={`text-[11px] pb-1.5 transition-colors ${
                    activeFilterTab === i
                      ? 'text-[#4361EE] border-b-2 border-[#4361EE] font-medium'
                      : 'text-[#8F9BB3]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-[#EEF0F6]">
            <div className="flex-1 flex items-center gap-2 bg-[#F4F6FA] rounded-lg px-3 py-1.5">
              <Search size={12} className="text-[#8F9BB3]" />
              <input
                placeholder="Search employees"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-[11px] text-[#1B2559] outline-none flex-1 placeholder:text-[#8F9BB3]"
              />
            </div>
          </div>

          {/* Employee list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-[11px] text-[#8F9BB3]">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-[11px] text-[#8F9BB3]">No employees found.</div>
            ) : (
              filtered.map((emp) => (
                <div
                  key={emp.employee_id}
                  className="flex items-start gap-2 px-4 py-3 border-b border-[#EEF0F6] hover:bg-[#F9FAFB] transition-colors"
                >
                  {/* Initials avatar */}
                  <div className="w-8 h-8 rounded-full bg-[#EEF2FF] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-[#4361EE]">
                      {emp.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-[#1B2559] leading-tight truncate">{emp.name}</p>
                    <p className="text-[10px] text-[#8F9BB3]">{emp.employee_id}</p>
                    <div className="flex items-center justify-between mt-1">
                      {getBadge(emp.monthly_late_count, emp.excused)}
                      <span className="text-[10px] text-[#8F9BB3]">{emp.monthly_late_count} late days</span>
                    </div>
                    {emp.excused !== 'APPROVED' && (
                      <>
                        <div className="flex gap-1 mt-1.5">
                          <button
                            onClick={() => handleExcuseAction(emp.employee_id, 'APPROVED')}
                            className="flex items-center px-1.5 py-0.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded text-[10px] font-medium transition-colors"
                          >
                            <Check size={9} className="mr-0.5" /> Approve
                          </button>
                          {emp.excused !== 'REJECTED' && (
                            <button
                              onClick={() => handleExcuseAction(emp.employee_id, 'REJECTED')}
                              className="flex items-center px-1.5 py-0.5 bg-red-50 text-red-500 hover:bg-red-100 rounded text-[10px] font-medium transition-colors"
                            >
                              <X size={9} className="mr-0.5" /> Reject
                            </button>
                          )}
                        </div>
                        {emp.excused === 'REJECTED' && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] text-red-500 font-medium">✗ Rejected</span>
                            <button
                              onClick={() => handleExcuseAction(emp.employee_id, 'PENDING')}
                              className="text-[#8F9BB3] hover:text-[#1B2559] transition-colors p-0.5 rounded hover:bg-[#F4F6FA]"
                              title="Undo rejection"
                            >
                              <Undo2 size={11} />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                    {emp.excused === 'APPROVED' && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] text-[#4361EE] font-medium">✓ Excused</span>
                        <button
                          onClick={() => handleExcuseAction(emp.employee_id, 'PENDING')}
                          className="text-[#8F9BB3] hover:text-[#1B2559] transition-colors p-0.5 rounded hover:bg-[#EEF2FF]"
                          title="Undo approval"
                        >
                          <Undo2 size={11} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
