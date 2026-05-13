import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Search, ChevronDown, ChevronRight, ChevronLeft, Check, X, RefreshCw, Download, Undo2 } from 'lucide-react';
import { supabase, type StrikeEmployee } from '../../lib/supabase';
import { useAuth } from '../App';

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50];

function StatusBadge({ count, excused }: { count: number; excused: string | null }) {
  if (excused === 'APPROVED') return <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#EEF2FF] text-[#4361EE]"><span className="w-1.5 h-1.5 rounded-full bg-[#4361EE]" />Excused</span>;
  if (excused === 'PENDING') return <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 animate-pulse"><span className="w-1.5 h-1.5 rounded-full bg-purple-500" />Pending</span>;
  if (count >= 3) return <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-500"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />Critical</span>;
  if (count === 2) return <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />At Risk</span>;
  if (count === 1) return <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-50 text-orange-600"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" />Warning</span>;
  return <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />On Time</span>;
}

export function AttendanceList() {
  const { session } = useAuth();
  const [employees, setEmployees] = useState<StrikeEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'count-desc' | 'count-asc' | 'name-asc' | 'name-desc'>('count-desc');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('strike_counter').select('*');
    if (error) console.error('Error:', error);
    else setEmployees(data || []);
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
        prev.map((emp) => emp.employee_id === employeeId ? { ...emp, excused: action } : emp)
      );
    } catch {
      alert('Failed to update status. Please guarantee n8n is running properly and running the correct workflow.');
    }
  };

  const filtered = employees
    .filter((e) =>
      !searchQuery ||
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.employee_id.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'count-desc') return b.monthly_late_count - a.monthly_late_count;
      if (sortBy === 'count-asc') return a.monthly_late_count - b.monthly_late_count;
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      return 0;
    });

  const handleDownloadCSV = () => {
    const headers = ['Employee Name', 'Employee ID', 'Late Days', 'Strike Level', 'Excuse', 'Status'];
    const rows = filtered.map(emp => [
      `"${emp.name}"`,
      `"${emp.employee_id}"`,
      emp.monthly_late_count,
      emp.strike_level,
      `"${(emp.excuse_provided || '').replace(/"/g, '""')}"`,
      `"${emp.excused || 'N/A'}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "attendance_data.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="p-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-[11px] text-[#8F9BB3] mb-4">
        <Link to="/" className="hover:text-[#4361EE] transition-colors">Dashboard</Link>
        <span>/</span>
        <span className="text-[#1B2559] font-medium">Attendance List</span>
      </div>

      {/* Page Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-base font-semibold text-[#1B2559]">
          Attendance List
        </h1>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="flex items-center gap-2 bg-white border border-[#EEF0F6] rounded-lg px-3 py-1.5 shadow-sm">
            <input
              placeholder="Search by name or ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs text-[#1B2559] outline-none placeholder:text-[#8F9BB3] w-40"
            />
            <Search size={13} className="text-[#8F9BB3]" />
          </div>
          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="flex items-center gap-1.5 text-xs text-[#8F9BB3] bg-white border border-[#EEF0F6] rounded-lg px-3 py-1.5 shadow-sm outline-none"
          >
            <option value="count-desc">Late Days: High → Low</option>
            <option value="count-asc">Late Days: Low → High</option>
            <option value="name-asc">Name: A → Z</option>
            <option value="name-desc">Name: Z → A</option>
          </select>
          {/* Refresh */}
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 text-xs text-[#4361EE] bg-white border border-[#EEF0F6] rounded-lg px-3 py-1.5 shadow-sm hover:border-[#4361EE] transition-colors font-medium"
          >
            <RefreshCw size={12} /> Refresh
          </button>
          {/* Download CSV */}
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-1.5 text-xs text-emerald-600 bg-white border border-[#EEF0F6] rounded-lg px-3 py-1.5 shadow-sm hover:border-emerald-600 transition-colors font-medium"
          >
            <Download size={12} /> Download Data
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-[#EEF0F6] overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[1.5fr_1fr_0.8fr_0.8fr_1.5fr_1fr_1.5fr] gap-4 px-5 py-3 border-b border-[#EEF0F6] bg-[#FAFBFF]">
          {['Employee Name', 'Employee ID', 'Late Days', 'Strike Level', 'Excuse', 'Status', 'HR Actions'].map((h) => (
            <span key={h} className="text-[11px] font-semibold text-[#8F9BB3] uppercase tracking-wide">{h}</span>
          ))}
        </div>

        {/* Table Body */}
        {loading ? (
          <div className="py-12 text-center text-sm text-[#8F9BB3]">Loading data from Supabase...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#8F9BB3]">No employees found.</div>
        ) : (
          filtered.map((emp, i) => (
            <div
              key={emp.employee_id}
              className={`grid grid-cols-[1.5fr_1fr_0.8fr_0.8fr_1.5fr_1fr_1.5fr] gap-4 px-5 py-3 items-center transition-colors hover:bg-[#F9FAFB] ${
                i < filtered.length - 1 ? 'border-b border-[#EEF0F6]' : ''
              }`}
            >
              {/* Name */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#EEF2FF] flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-[#4361EE]">
                    {emp.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#1B2559] truncate">{emp.name}</p>
                  <p className="text-[11px] text-[#8F9BB3] truncate">{emp.month_year}</p>
                </div>
              </div>

              {/* ID */}
              <span className="text-xs text-[#8F9BB3]">{emp.employee_id}</span>

              {/* Late days */}
              <span className={`text-xs font-bold ${emp.monthly_late_count >= 3 ? 'text-red-500' : emp.monthly_late_count === 2 ? 'text-yellow-600' : 'text-[#1B2559]'}`}>
                {emp.monthly_late_count}
              </span>

              {/* Strike level */}
              <span className="text-xs text-[#1B2559] font-medium">{emp.strike_level}</span>

              {/* Excuse */}
              <span className="text-xs text-[#8F9BB3] italic truncate" title={emp.excuse_provided || 'None'}>
                {emp.excuse_provided || 'None'}
              </span>

              {/* Status badge */}
              <div className="flex">
                <StatusBadge count={emp.monthly_late_count} excused={emp.excused} />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {emp.excused !== 'APPROVED' && (
                  <>
                    <button
                      onClick={() => handleExcuseAction(emp.employee_id, 'APPROVED')}
                      className="inline-flex items-center px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md text-[10px] font-medium transition-colors"
                    >
                      <Check size={10} className="mr-0.5" /> Approve
                    </button>
                    {emp.excused !== 'REJECTED' && (
                      <button
                        onClick={() => handleExcuseAction(emp.employee_id, 'REJECTED')}
                        className="inline-flex items-center px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-md text-[10px] font-medium transition-colors"
                      >
                        <X size={10} className="mr-0.5" /> Reject
                      </button>
                    )}
                    {emp.excused === 'REJECTED' && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-red-500 font-medium ml-1">✗ Rejected</span>
                        <button
                          onClick={() => handleExcuseAction(emp.employee_id, 'PENDING')}
                          className="text-[#8F9BB3] hover:text-[#1B2559] transition-colors p-0.5 rounded hover:bg-[#F4F6FA]"
                          title="Undo rejection"
                        >
                          <Undo2 size={12} />
                        </button>
                      </div>
                    )}
                  </>
                )}
                {emp.excused === 'APPROVED' && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#8F9BB3] font-medium bg-[#F4F6FA] px-2 py-1 rounded-full text-[10px]">✓ Excused</span>
                    <button
                      onClick={() => handleExcuseAction(emp.employee_id, 'PENDING')}
                      className="text-[#8F9BB3] hover:text-[#1B2559] transition-colors p-0.5 rounded hover:bg-[#F4F6FA]"
                      title="Undo approval"
                    >
                      <Undo2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
