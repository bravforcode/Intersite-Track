import React, { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { Project, ProjectMilestone, Blocker, ProjectWeeklyUpdate } from "../../types/project";
import { projectService } from "../../services/projectService";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { 
  CalendarIcon, UserIcon, BriefcaseIcon, ExternalLinkIcon, 
  CheckCircle2Icon, AlertCircleIcon, PlusIcon, FlagIcon,
  ChevronRightIcon, ClockIcon
} from "lucide-react";
import { Button } from "../common/Button";
import { Card } from "../common/Card";

interface ProjectDetailModalProps {
  projectId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function ProjectDetailModal({ projectId, isOpen, onClose, onRefresh }: ProjectDetailModalProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'milestones' | 'blockers' | 'updates'>('overview');
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [showBlockerForm, setShowBlockerForm] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [newMilestone, setNewMilestone] = useState({ title: "", description: "", due_date: "" });
  const [newBlocker, setNewBlocker] = useState({ description: "", task_id: undefined as string | undefined });
  const [newUpdate, setNewUpdate] = useState({ 
    week_start_date: format(new Date(), "yyyy-MM-dd"), 
    completed_this_week: "", 
    planned_next_week: "", 
    current_blockers: "",
    risk_level: 'low' as 'low' | 'medium' | 'high'
  });

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestone.title || projectId === null) return;
    try {
      await projectService.addMilestone(projectId, newMilestone);
      setShowMilestoneForm(false);
      setNewMilestone({ title: "", description: "", due_date: "" });
      fetchProjectDetails();
    } catch (err) { console.error(err); }
  };

  const handleAddBlocker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlocker.description || projectId === null) return;
    try {
      await projectService.addBlocker(projectId, newBlocker);
      setShowBlockerForm(false);
      setNewBlocker({ description: "", task_id: undefined });
      fetchProjectDetails();
    } catch (err) { console.error(err); }
  };

  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (projectId === null) return;
    try {
      await projectService.addWeeklyUpdate(projectId, newUpdate);
      setShowUpdateForm(false);
      setNewUpdate({ 
        week_start_date: format(new Date(), "yyyy-MM-dd"), 
        completed_this_week: "", 
        planned_next_week: "", 
        current_blockers: "",
        risk_level: 'low'
      });
      fetchProjectDetails();
    } catch (err) { console.error(err); }
  };

  const fetchProjectDetails = async () => {
    if (projectId === null) return;
    try {
      setLoading(true);
      const data = await projectService.getProject(projectId);
      setProject(data);
    } catch (err) {
      console.error("Failed to fetch project details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && projectId) {
      fetchProjectDetails();
    }
  }, [isOpen, projectId]);

  if (!project && loading) {
    return (
      <Modal open={isOpen} onClose={onClose} title="กำลังโหลด...">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Modal>
    );
  }

  if (!project) return null;

  return (
    <Modal open={isOpen} onClose={onClose} title={project.name} maxWidth="max-w-4xl">
      <div className="flex flex-col h-[80vh]">
        {/* Project Header Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 pb-6 border-b">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">สถานะ</span>
            <span className="font-medium text-sm">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                project.status === 'launched' ? 'bg-green-100 text-green-700' :
                project.status === 'developing' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {project.status === 'launched' ? 'เปิดตัวแล้ว' : 
                 project.status === 'developing' ? 'กำลังพัฒนา' : 
                 project.status === 'planning' ? 'กำลังวางแผน' : project.status}
              </span>
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">เจ้าของ</span>
            <span className="font-medium text-sm flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-sky-100 flex items-center justify-center text-[10px] text-sky-700 font-bold">
                {project.owner?.first_name?.[0]}{project.owner?.last_name?.[0]}
              </div>
              {project.owner ? `${project.owner.first_name} ${project.owner.last_name}` : "ไม่ระบุ"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">กำหนดส่ง</span>
            <span className="font-medium text-sm flex items-center gap-1.5 text-rose-600">
              <ClockIcon size={14} />
              {project.deadline ? format(new Date(project.deadline), "d MMM yyyy", { locale: th }) : "-"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">ประเภท</span>
            <span className="font-medium text-sm">
              {project.type === 'new_dev' ? 'พัฒนาใหม่' : 
               project.type === 'maintenance' ? 'ดูแลรักษา' : project.type}
            </span>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex space-x-1 border-b mb-6 overflow-x-auto">
          {[
            { id: 'overview', label: 'ภาพรวม' },
            { id: 'tasks', label: `งาน (${project.tasks?.length || 0})` },
            { id: 'milestones', label: `Milestones (${project.milestones?.length || 0})` },
            { id: 'blockers', label: `Blockers (${project.blockers?.filter(b => b.status === 'active').length || 0})` },
            { id: 'updates', label: 'อัปเดตรายสัปดาห์' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id 
                  ? "border-primary text-primary" 
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto pr-2">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-2">คำอธิบาย</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                  {project.description || "ไม่มีคำอธิบาย"}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-2">ลิงก์สำคัญ</h4>
                  <div className="space-y-2">
                    {project.repo_url && (
                      <a href={project.repo_url} target="_blank" rel="noreferrer" className="flex items-center text-sm text-primary hover:underline">
                        <ExternalLinkIcon size={14} className="mr-2" /> Repository
                      </a>
                    )}
                    {project.domain_url && (
                      <a href={project.domain_url} target="_blank" rel="noreferrer" className="flex items-center text-sm text-primary hover:underline">
                        <ExternalLinkIcon size={14} className="mr-2" /> Production URL
                      </a>
                    )}
                    {project.demo_url && (
                      <a href={project.demo_url} target="_blank" rel="noreferrer" className="flex items-center text-sm text-primary hover:underline">
                        <ExternalLinkIcon size={14} className="mr-2" /> Demo / Staging
                      </a>
                    )}
                    {!project.repo_url && !project.domain_url && !project.demo_url && (
                      <p className="text-xs text-gray-400 italic">ไม่มีลิงก์ที่ระบุ</p>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-2">ข้อมูลอื่นๆ</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><span className="text-gray-400">ลูกค้า:</span> {project.client_name || "-"}</p>
                    <p><span className="text-gray-400">วันที่เริ่ม:</span> {project.start_date ? format(new Date(project.start_date), "d MMM yyyy", { locale: th }) : "-"}</p>
                    <p><span className="text-gray-400">สร้างเมื่อ:</span> {project.created_at ? format(new Date(project.created_at), "d MMM yyyy HH:mm", { locale: th }) : "-"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold text-gray-900">รายการงานในโปรเจกต์</h4>
                <Button variant="secondary" size="sm">เพิ่มงาน</Button>
              </div>
              {project.tasks?.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-white border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      task.status === 'completed' ? 'bg-green-500' : 
                      task.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-300'
                    }`}></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{task.title}</p>
                      <p className="text-xs text-gray-500">
                        กำหนดส่ง: {task.due_date ? format(new Date(task.due_date), "d MMM yyyy", { locale: th }) : "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                      task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {task.priority}
                    </span>
                    <ChevronRightIcon size={16} className="text-gray-400" />
                  </div>
                </div>
              ))}
              {(!project.tasks || project.tasks.length === 0) && (
                <p className="text-center py-10 text-gray-400 text-sm italic">ยังไม่มีงานในโปรเจกต์นี้</p>
              )}
            </div>
          )}

          {activeTab === 'milestones' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold text-gray-900">ลำดับความสำคัญของโครงการ (Milestones)</h4>
                {!showMilestoneForm && (
                  <Button variant="secondary" size="sm" onClick={() => setShowMilestoneForm(true)}>
                    <PlusIcon size={14} className="mr-1" /> เพิ่ม Milestone
                  </Button>
                )}
              </div>

              {showMilestoneForm && (
                <Card className="bg-gray-50 border-gray-200 p-4 mb-4">
                  <form onSubmit={handleAddMilestone} className="space-y-3">
                    <h5 className="text-sm font-bold">เพิ่ม Milestone ใหม่</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input 
                        type="text" placeholder="หัวข้อ Milestone" 
                        className="text-sm px-3 py-2 border rounded-md"
                        value={newMilestone.title} onChange={e => setNewMilestone({...newMilestone, title: e.target.value})}
                      />
                      <input 
                        type="date" 
                        className="text-sm px-3 py-2 border rounded-md"
                        value={newMilestone.due_date} onChange={e => setNewMilestone({...newMilestone, due_date: e.target.value})}
                      />
                    </div>
                    <textarea 
                      placeholder="คำอธิบาย..." 
                      className="text-sm px-3 py-2 border rounded-md w-full h-20"
                      value={newMilestone.description} onChange={e => setNewMilestone({...newMilestone, description: e.target.value})}
                    />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setShowMilestoneForm(false)}>ยกเลิก</Button>
                      <Button size="sm" variant="primary" type="submit">บันทึก</Button>
                    </div>
                  </form>
                </Card>
              )}
              <div className="relative border-l-2 border-gray-200 ml-4 pl-8 space-y-8 py-4">
                {project.milestones?.map((m) => (
                  <div key={m.id} className="relative">
                    <div className={`absolute -left-10.25 top-1 w-6 h-6 rounded-full flex items-center justify-center ${
                      m.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-white border-2 border-gray-300 text-gray-300'
                    }`}>
                      <CheckCircle2Icon size={14} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`text-sm font-bold ${m.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                          {m.title}
                        </p>
                        <span className="text-[10px] text-gray-400">
                          {m.due_date ? format(new Date(m.due_date), "d MMM yyyy", { locale: th }) : ""}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">{m.description || "ไม่มีคำอธิบาย"}</p>
                    </div>
                  </div>
                ))}
                {(!project.milestones || project.milestones.length === 0) && (
                  <p className="text-center py-10 text-gray-400 text-sm italic -ml-8">ยังไม่มี Milestone</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'blockers' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold text-red-600">งานที่ติดปัญหา (Blockers)</h4>
                {!showBlockerForm && (
                  <Button variant="secondary" size="sm" onClick={() => setShowBlockerForm(true)}>
                    <PlusIcon size={14} className="mr-1" /> แจ้งปัญหา
                  </Button>
                )}
              </div>

              {showBlockerForm && (
                <Card className="bg-red-50 border-red-200 p-4 mb-4">
                  <form onSubmit={handleAddBlocker} className="space-y-3">
                    <h5 className="text-sm font-bold text-red-800">รายงานปัญหาใหม่</h5>
                    <textarea 
                      placeholder="ระบุปัญหาที่พบ..." 
                      className="text-sm px-3 py-2 border rounded-md w-full h-20"
                      value={newBlocker.description} onChange={e => setNewBlocker({...newBlocker, description: e.target.value})}
                      required
                    />
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">งานที่เกี่ยวข้อง (ถ้ามี)</label>
                      <select 
                        className="text-sm px-3 py-2 border rounded-md w-full"
                        value={newBlocker.task_id || ""} onChange={e => setNewBlocker({...newBlocker, task_id: e.target.value || undefined})}
                      >
                        <option value="">-- เลือกงาน --</option>
                        {project.tasks?.map(t => (
                          <option key={t.id} value={t.id}>{t.title}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setShowBlockerForm(false)}>ยกเลิก</Button>
                      <Button size="sm" variant="primary" type="submit">บันทึกปัญหา</Button>
                    </div>
                  </form>
                </Card>
              )}
              {project.blockers?.map((b) => (
                <div key={b.id} className={`p-4 rounded-lg border ${
                  b.status === 'active' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <AlertCircleIcon size={16} className={b.status === 'active' ? 'text-red-500' : 'text-gray-400'} />
                      <span className={`text-xs font-bold uppercase ${b.status === 'active' ? 'text-red-600' : 'text-gray-500'}`}>
                        {b.status === 'active' ? 'ติดปัญหา' : 'แก้ไขแล้ว'}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400">
                      แจ้งเมื่อ: {b.created_at ? format(new Date(b.created_at), "d MMM HH:mm", { locale: th }) : ""}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 mb-3">{b.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-gray-500">
                      โดย: {b.reporter ? `${b.reporter.first_name} ${b.reporter.last_name}` : "ไม่ระบุ"}
                    </span>
                    {b.status === 'active' && (
                      <Button size="sm" variant="secondary" onClick={() => {}}>ปลดล็อก</Button>
                    )}
                  </div>
                </div>
              ))}
              {(!project.blockers || project.blockers.length === 0) && (
                <p className="text-center py-10 text-gray-400 text-sm italic">ไม่มีงานที่ติดปัญหาในขณะนี้</p>
              )}
            </div>
          )}

          {activeTab === 'updates' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold text-gray-900">อัปเดตรายสัปดาห์ (Weekly Updates)</h4>
                {!showUpdateForm && (
                  <Button variant="secondary" size="sm" onClick={() => setShowUpdateForm(true)}>
                    <PlusIcon size={14} className="mr-1" /> เพิ่มอัปเดต
                  </Button>
                )}
              </div>

              {showUpdateForm && (
                <Card className="bg-blue-50 border-blue-200 p-4 mb-4">
                  <form onSubmit={handleAddUpdate} className="space-y-3">
                    <h5 className="text-sm font-bold text-blue-800">บันทึกอัปเดตสัปดาห์นี้</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">สัปดาห์วันที่</label>
                        <input 
                          type="date" className="text-sm px-3 py-2 border rounded-md w-full"
                          value={newUpdate.week_start_date} onChange={e => setNewUpdate({...newUpdate, week_start_date: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">ความเสี่ยง</label>
                        <select 
                          className="text-sm px-3 py-2 border rounded-md w-full"
                          value={newUpdate.risk_level} onChange={e => setNewUpdate({...newUpdate, risk_level: e.target.value as any})}
                        >
                          <option value="low">ต่ำ (Low)</option>
                          <option value="medium">กลาง (Medium)</option>
                          <option value="high">สูง (High)</option>
                        </select>
                      </div>
                    </div>
                    <textarea 
                      placeholder="อาทิตย์นี้ทำอะไรเสร็จบ้าง..." 
                      className="text-sm px-3 py-2 border rounded-md w-full h-16"
                      value={newUpdate.completed_this_week} onChange={e => setNewUpdate({...newUpdate, completed_this_week: e.target.value})}
                    />
                    <textarea 
                      placeholder="อาทิตย์หน้าจะทำอะไร..." 
                      className="text-sm px-3 py-2 border rounded-md w-full h-16"
                      value={newUpdate.planned_next_week} onChange={e => setNewUpdate({...newUpdate, planned_next_week: e.target.value})}
                    />
                    <input 
                      type="text" placeholder="ปัญหาที่พบ (ถ้ามี)" 
                      className="text-sm px-3 py-2 border rounded-md w-full"
                      value={newUpdate.current_blockers} onChange={e => setNewUpdate({...newUpdate, current_blockers: e.target.value})}
                    />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setShowUpdateForm(false)}>ยกเลิก</Button>
                      <Button size="sm" variant="primary" type="submit">บันทึกอัปเดต</Button>
                    </div>
                  </form>
                </Card>
              )}
              {project.weekly_updates?.map((u) => (
                <div key={u.id} className="p-4 border rounded-lg bg-white shadow-sm">
                  <div className="flex justify-between items-center mb-3 border-b pb-2">
                    <div className="flex items-center gap-2">
                      <CalendarIcon size={14} className="text-primary" />
                      <span className="text-sm font-bold">สัปดาห์วันที่ {format(new Date(u.week_start_date), "d MMM yyyy", { locale: th })}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      u.risk_level === 'high' ? 'bg-red-100 text-red-700' :
                      u.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      ความเสี่ยง: {u.risk_level}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="font-bold text-gray-700 mb-1">เสร็จสิ้นสัปดาห์นี้:</p>
                      <p className="text-gray-600 whitespace-pre-wrap">{u.completed_this_week || "-"}</p>
                    </div>
                    <div>
                      <p className="font-bold text-gray-700 mb-1">แผนงานสัปดาห์หน้า:</p>
                      <p className="text-gray-600 whitespace-pre-wrap">{u.planned_next_week || "-"}</p>
                    </div>
                  </div>
                  {u.current_blockers && (
                    <div className="mt-3 pt-2 border-t text-xs">
                      <p className="font-bold text-red-700 mb-1">ปัญหาที่พบ:</p>
                      <p className="text-red-600">{u.current_blockers}</p>
                    </div>
                  )}
                </div>
              ))}
              {(!project.weekly_updates || project.weekly_updates.length === 0) && (
                <p className="text-center py-10 text-gray-400 text-sm italic">ยังไม่มีการบันทึกอัปเดตรายสัปดาห์</p>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-6 mt-6 border-t flex justify-end">
          <Button variant="secondary" onClick={onClose}>ปิดหน้าต่าง</Button>
        </div>
      </div>
    </Modal>
  );
};

export default ProjectDetailModal;
