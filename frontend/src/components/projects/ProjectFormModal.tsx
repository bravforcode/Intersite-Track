import React, { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { Input } from "../common/Input";
import { Button } from "../common/Button";
import { projectService } from "../../services/projectService";
import { userService } from "../../services/userService";
import { User } from "../../types/user";
import { ProjectStatus, ProjectType } from "../../types/project";

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProjectFormModal({ isOpen, onClose, onSuccess }: ProjectFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const defaultForm = {
    name: "",
    description: "",
    owner_id: "" as string,
    status: "planning" as ProjectStatus,
    type: "new_dev" as ProjectType,
    color: "#5A5A40",
    tags: "" as string,
    start_date: "",
    deadline: "",
    client_name: "",
    repo_url: "",
    domain_url: "",
    demo_url: "",
    design_url: "",
    notes: "",
  };
  const [formData, setFormData] = useState(defaultForm);

  useEffect(() => {
    if (isOpen) {
      setFormData(defaultForm);
      userService.getUsers().then((res) => setUsers(res));
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    try {
      setLoading(true);
      const payload = {
        ...formData,
        owner_id: formData.owner_id || undefined,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
      };
      await projectService.createProject(payload);
      onSuccess();
    } catch (err) {
      console.error("Failed to create project:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="สร้างโปรเจกต์ใหม่">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="ชื่อโปรเจกต์ *"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">คำอธิบาย</label>
          <textarea
            name="description"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 h-24"
            value={formData.description}
            onChange={handleChange}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">เจ้าของโปรเจกต์ (Project Owner)</label>
            <select
              name="owner_id"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
              value={formData.owner_id || ""}
              onChange={handleChange}
            >
              <option value="">เลือกเจ้าของ</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name} ({user.username})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">สถานะ</label>
            <select
              name="status"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="planning">กำลังวางแผน</option>
              <option value="developing">กำลังพัฒนา</option>
              <option value="testing">กำลังทดสอบ</option>
              <option value="launched">เปิดตัวแล้ว</option>
              <option value="maintenance">ดูแลหลังบ้าน</option>
              <option value="on_hold">พักไว้</option>
              <option value="cancelled">ยกเลิก</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            type="date"
            label="วันที่เริ่ม"
            name="start_date"
            value={formData.start_date}
            onChange={handleChange}
          />
          <Input
            type="date"
            label="กำหนดส่ง (Deadline)"
            name="deadline"
            value={formData.deadline}
            onChange={handleChange}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ประเภท</label>
            <select
              name="type"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
              value={formData.type}
              onChange={handleChange}
            >
              <option value="new_dev">พัฒนาใหม่</option>
              <option value="maintenance">ดูแลรักษา</option>
              <option value="bug_fix">แก้ไข Bug</option>
              <option value="support">สนับสนุน</option>
            </select>
          </div>
          <Input
            label="ชื่อลูกค้า"
            name="client_name"
            value={formData.client_name}
            onChange={handleChange}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">สีประจำโปรเจกต์</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                name="color"
                className="w-10 h-10 rounded-md border-0 cursor-pointer"
                value={formData.color}
                onChange={handleChange}
              />
              <span className="text-xs text-gray-500">{formData.color}</span>
            </div>
          </div>
          <Input
            label="แท็ก (คั่นด้วยเครื่องหมายจุลภาค ,)"
            name="tags"
            value={formData.tags}
            onChange={handleChange}
            placeholder="Web, API, Mobile..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
          <Input
            label="Repository URL"
            name="repo_url"
            value={formData.repo_url}
            onChange={handleChange}
            placeholder="GitHub, GitLab, etc."
          />
          <Input
            label="Domain / URL"
            name="domain_url"
            value={formData.domain_url}
            onChange={handleChange}
            placeholder="https://example.com"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button variant="secondary" onClick={onClose} type="button">
            ยกเลิก
          </Button>
          <Button variant="primary" type="submit" loading={loading}>
            บันทึกโปรเจกต์
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ProjectFormModal;
