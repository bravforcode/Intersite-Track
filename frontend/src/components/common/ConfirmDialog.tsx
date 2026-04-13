import { AlertTriangle } from "lucide-react";
import { motion } from "motion/react";

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-60">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center"
      >
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="text-red-500" size={24} />
        </div>
        <p className="text-gray-700 font-medium mb-6">{message}</p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-6 py-2 bg-red-500 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-red-600"
          >
            ยืนยัน
          </button>
        </div>
      </motion.div>
    </div>
  );
}
