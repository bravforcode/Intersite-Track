import { useState, useEffect } from "react";
import { reportService } from "../../services/reportService";
import { StaffReport } from "../../types/user";
import { Card } from "../common/Card";
import { 
  AlertTriangleIcon, 
  CheckCircle2Icon, ShieldAlertIcon 
} from "lucide-react";

export function WorkloadPage() {
  const [reports, setReports] = useState<StaffReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await reportService.getStaffReport();
        setReports(res);
      } catch (err: any) {
        console.error("Failed to fetch workload report:", err);
        setError(err?.message || "โหลดข้อมูลล้มเหลว");
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-3">
        <p className="text-red-500 font-medium">เกิดข้อผิดพลาด: {error}</p>
        <button
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm"
          onClick={() => window.location.reload()}
        >รีโหลดหน้า</button>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ภาระงานทีม</h1>
          <p className="text-gray-500">ตรวจสอบการกระจายงานของพนักงานในทีม</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">พนักงาน</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 text-center">โปรเจกต์ที่ดูแล</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 text-center">งานทั้งหมด</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 text-center">กำลังทำ</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-center text-red-600">เกินกำหนด</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-center text-orange-600">ติดปัญหา</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">ความคืบหน้า</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reports.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center text-gray-400 text-sm italic">
                      ยังไม่มีข้อมูลพนักงานหรืองานในระบบ
                    </td>
                  </tr>
                )}
                {reports.map((staff) => (
                  <tr key={staff.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                          {staff.first_name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{staff.first_name} {staff.last_name}</p>
                          <p className="text-xs text-gray-500">{staff.position} | {staff.department_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-bold text-sm">
                        {staff.owned_projects}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-sm font-medium text-gray-900">{staff.total_tasks}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-sm font-medium text-indigo-600">{staff.in_progress}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`text-sm font-bold ${staff.overdue > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {staff.overdue}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`text-sm font-bold ${staff.blocked > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                        {staff.blocked}
                      </span>
                    </td>
                    <td className="px-4 py-4 min-w-37.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              (staff.completed / (staff.total_tasks || 1)) >= 0.8 ? 'bg-green-500' :
                              (staff.completed / (staff.total_tasks || 1)) >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${staff.total_tasks ? Math.round((staff.completed / staff.total_tasks) * 100) : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium text-gray-600">
                          {staff.total_tasks ? Math.round((staff.completed / staff.total_tasks) * 100) : 0}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <Card className="bg-red-50 border-red-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 text-red-600 rounded-xl">
              <ShieldAlertIcon size={24} />
            </div>
            <div>
              <p className="text-sm text-red-600 font-medium uppercase tracking-wider">งานเกินกำหนดรวม</p>
              <p className="text-3xl font-bold text-red-900">{reports.reduce((acc: number, r: StaffReport) => acc + r.overdue, 0)}</p>
            </div>
          </div>
        </Card>
        
        <Card className="bg-orange-50 border-orange-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-100 text-orange-600 rounded-xl">
              <AlertTriangleIcon size={24} />
            </div>
            <div>
              <p className="text-sm text-orange-600 font-medium uppercase tracking-wider">งานที่ติดปัญหารวม</p>
              <p className="text-3xl font-bold text-orange-900">{reports.reduce((acc: number, r: StaffReport) => acc + r.blocked, 0)}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-blue-50 border-blue-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
              <CheckCircle2Icon size={24} />
            </div>
            <div>
              <p className="text-sm text-blue-600 font-medium uppercase tracking-wider">งานที่เสร็จสิ้นรวม</p>
              <p className="text-3xl font-bold text-blue-900">{reports.reduce((acc: number, r: StaffReport) => acc + r.completed, 0)}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default WorkloadPage;
