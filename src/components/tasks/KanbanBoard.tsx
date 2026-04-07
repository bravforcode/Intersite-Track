import { motion } from "motion/react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { KanbanCard } from "./KanbanCard";
import type { Task, User } from "../../types";

interface KanbanBoardProps {
  tasks: Task[];
  currentUser: User;
  onViewTask: (task: Task) => void;
  onEditTask?: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
}

const COLUMNS = [
  { id: "pending", title: "รอดำเนินการ", color: "bg-amber-100 text-amber-800" },
  { id: "in_progress", title: "กำลังดำเนินการ", color: "bg-blue-100 text-blue-800" },
  { id: "completed", title: "เสร็จสิ้น", color: "bg-emerald-100 text-emerald-800" },
  { id: "cancelled", title: "ยกเลิก", color: "bg-rose-100 text-rose-800" },
];

export function KanbanBoard({ tasks, currentUser, onViewTask, onEditTask, onStatusChange }: KanbanBoardProps) {
  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const taskId = draggableId;
    const newStatus = destination.droppableId;
    
    // Call parent handler which will do optimistic update and API call
    onStatusChange(taskId, newStatus);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-6 overflow-x-auto pb-4 h-full min-h-[600px] items-start">
        {COLUMNS.map((column) => {
          const columnTasks = tasks.filter((t) => t.status === column.id);

          return (
            <div key={column.id} className="shrink-0 w-80 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl p-4 flex flex-col max-h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${column.color.split(' ')[0].replace('100', '500')}`} />
                  {column.title}
                </h3>
                <span className="text-xs font-semibold bg-white dark:bg-gray-800 px-2 py-1 rounded-full text-gray-500 shadow-sm border border-gray-100 dark:border-gray-700">
                  {columnTasks.length}
                </span>
              </div>

              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 overflow-y-auto space-y-3 min-h-[150px] transition-colors rounded-xl ${
                      snapshot.isDraggingOver ? "bg-black/5 dark:bg-white/5" : ""
                    }`}
                  >
                    {columnTasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{
                              ...provided.draggableProps.style,
                              // Prevent dragging styles from interfering too much, but allow standard drag behavior
                            }}
                          >
                            <KanbanCard
                              task={task}
                              currentUser={currentUser}
                              onView={() => onViewTask(task)}
                              onEdit={currentUser.role === "admin" && onEditTask ? () => onEditTask(task) : undefined}
                              isDragging={snapshot.isDragging}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
