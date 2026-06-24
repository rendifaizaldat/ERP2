import React from "react";
import { Trash2 } from "lucide-react";

interface DeleteCategoryModalProps {
  category: { id: string; name: string } | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
}

export const DeleteCategoryModal: React.FC<DeleteCategoryModalProps> = ({
  category,
  onClose,
  onConfirm,
}) => {
  if (!category) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-100 flex items-center justify-center backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl transform transition-all text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-red-100 p-4 rounded-full">
            <Trash2 className="text-red-600" size={32} />
          </div>
        </div>
        <h3 className="font-black text-lg text-slate-900 uppercase tracking-widest mb-2">
          Hapus Kategori
        </h3>
        <p className="text-slate-500 text-xs mb-6 px-4">
          Hapus kategori{" "}
          <span className="font-bold text-slate-800">{category.name}</span>{" "}
          secara permanen? Aksi ini tidak dapat dibatalkan.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-black text-xs uppercase text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={() => onConfirm(category.id)}
            className="flex-1 py-3 rounded-xl font-black text-xs uppercase text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/30 transition-all cursor-pointer"
          >
            Ya, Hapus
          </button>
        </div>
      </div>
    </div>
  );
};
