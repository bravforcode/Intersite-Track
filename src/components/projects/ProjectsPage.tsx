import React, { useState, useEffect } from "react";
import { projectService } from "../../services/projectService";
import { Project } from "../../types/project";
import { Card } from "../common/Card";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
import { PlusIcon, SearchIcon, FilterIcon, CalendarIcon, UserIcon, FlagIcon } from "lucide-react";
import { ProjectFormModal } from "./ProjectFormModal";
import { ProjectDetailModal } from "./ProjectDetailModal";
import { format } from "date-fns";
import { th } from "date-fns/locale";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  planning: { label: "กำลังวางแผน", color: "bg-blue-100 text-blue-800" },
  developing: { label: "กำลังพัฒนา", color: "bg-indigo-100 text-indigo-800" },
  testing: { label: "กำลังทดสอบ", color: "bg-yellow-100 text-yellow-800" },
  launched: { label: "เปิดตัวแล้ว", color: "bg-green-100 text-green-800" },
  maintenance: { label: "ดูแลหลังบ้าน", color: "bg-purple-100 text-purple-800" },
  on_hold: { label: "พักไว้", color: "bg-gray-100 text-gray-800" },
  cancelled: { label: "ยกเลิก", color: "bg-red-100 text-red-800" },
};

const TYPE_MAP: Record<string, string> = {
  new_dev: "พัฒนาใหม่",
  maintenance: "ดูแลรักษา",
  bug_fix: "แก้ไข Bug",
  support: "สนับสนุน",
};

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await projectService.getProjects();
      setProjects(data);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const filteredProjects = projects.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter ? p.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">การจัดการโปรเจกต์</h1>
          <p className="text-gray-500">รวมศูนย์การบริหารจัดการโปรเจกต์ทั้งหมดในองค์กร</p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          variant="primary"
        >
          <PlusIcon size={20} className="mr-1" /> สร้างโปรเจกต์ใหม่
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="relative">
          <Input
            placeholder="ค้นหาชื่อโปรเจกต์..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        </div>
        <select
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">ทุกสถานะ</option>
          {Object.entries(STATUS_MAP).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              onClick={() => setSelectedProjectId(project.id)}
            >
              <Card
                className="hover:shadow-lg transition-shadow cursor-pointer relative overflow-hidden h-full"
              >
                <div 
                  className="absolute top-0 left-0 w-1.5 h-full" 
                  style={{ backgroundColor: project.color || '#5A5A40' }}
                />
              <div className="flex justify-between items-start mb-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_MAP[project.status]?.color}`}>
                  {STATUS_MAP[project.status]?.label}
                </span>
                <span className="text-xs text-gray-400">#{project.id}</span>
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">{project.name}</h3>
              <p className="text-sm text-gray-500 mb-4 line-clamp-2 h-10">
                {project.description || "ไม่มีคำอธิบาย"}
              </p>

              <div className="flex flex-wrap gap-1 mb-4">
                {project.tags?.map((tag, idx) => (
                  <span key={idx} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-medium">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="space-y-2 mb-4 border-t pt-4">
                <div className="flex items-center text-xs text-gray-600">
                  <UserIcon size={14} className="mr-2" />
                  <span>เจ้าของ: {project.owner ? `${project.owner.first_name} ${project.owner.last_name}` : "ไม่ระบุ"}</span>
                </div>
                <div className="flex items-center text-xs text-gray-600">
                  <CalendarIcon size={14} className="mr-2" />
                  <span>กำหนดส่ง: {project.deadline ? format(new Date(project.deadline), "d MMM yyyy", { locale: th }) : "ไม่ระบุ"}</span>
                </div>
                <div className="flex items-center text-xs text-gray-600">
                  <FlagIcon size={14} className="mr-2" />
                  <span>ประเภท: {TYPE_MAP[project.type] || project.type}</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs pt-2 border-t">
                <div className="flex items-center">
                  <span className="text-gray-500 mr-2">ความคืบหน้า:</span>
                  <span className="font-bold text-primary">
                    {project.tasks?.length ? 
                      Math.round((project.tasks.filter(t => t.status === 'completed').length / project.tasks.length) * 100) : 0}%
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-red-500 font-medium">
                    {project.blockers?.filter(b => b.status === 'active').length ? 
                      `${project.blockers.filter(b => b.status === 'active').length} Blocker` : ""}
                  </span>
                </div>
              </div>
              
              <div className="mt-3 w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className="bg-primary h-1.5 rounded-full" 
                  style={{ width: `${project.tasks?.length ? 
                    Math.round((project.tasks.filter(t => t.status === 'completed').length / project.tasks.length) * 100) : 0}%` }}
                ></div>
              </div>
              </Card>
            </div>
          ))}
        </div>
      )}

      {filteredProjects.length === 0 && !loading && (
        <div className="text-center py-20 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <p className="text-gray-500">ไม่พบโปรเจกต์ที่ตรงกับเงื่อนไข</p>
        </div>
      )}

      <ProjectFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          fetchProjects();
        }}
      />

      <ProjectDetailModal
        projectId={selectedProjectId}
        isOpen={selectedProjectId !== null}
        onClose={() => setSelectedProjectId(null)}
        onRefresh={fetchProjects}
      />
    </div>
  );
};

export default ProjectsPage;
