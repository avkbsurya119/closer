import { useState, useRef } from "react";
import { XIcon, ImageIcon, UsersIcon, TrashIcon } from "lucide-react";
import { useGroupStore } from "../../store/useGroupStore";
import toast from "react-hot-toast";

function GroupSettings({ onClose }) {
  const { selectedGroup, updateGroup, deleteGroup } = useGroupStore();

  const [name, setName] = useState(selectedGroup?.name || "");
  const [description, setDescription] = useState(selectedGroup?.description || "");
  const [icon, setIcon] = useState(null);
  const [iconPreview, setIconPreview] = useState(selectedGroup?.icon || null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef(null);

  const handleIconChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setIcon(reader.result);
      setIconPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim() || name.trim().length < 3) {
      toast.error("Group name must be at least 3 characters");
      return;
    }

    setIsUpdating(true);
    const updateData = {
      name: name.trim(),
      description: description.trim(),
    };

    if (icon) {
      updateData.icon = icon;
    }

    const result = await updateGroup(selectedGroup._id, updateData);
    setIsUpdating(false);

    if (result) {
      onClose();
    }
  };

  const handleDelete = async () => {
    const confirmText = `Are you sure you want to delete "${selectedGroup.name}"? This action cannot be undone and all messages will be lost.`;

    if (window.confirm(confirmText)) {
      setIsDeleting(true);
      await deleteGroup(selectedGroup._id);
      setIsDeleting(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-slate-200">Group Settings</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Group Icon */}
          <div className="flex justify-center">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity relative"
            >
              {iconPreview ? (
                <img
                  src={iconPreview}
                  alt="Group icon"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <UsersIcon className="w-8 h-8 text-white" />
              )}
              <div className="absolute bottom-0 right-0 w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
                <ImageIcon className="w-3 h-3 text-white" />
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleIconChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Group Name */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Group Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter group name"
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg py-2 px-4 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              maxLength={50}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this group about?"
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg py-2 px-4 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
              rows={3}
              maxLength={200}
            />
          </div>

          {/* Group Info */}
          <div className="bg-slate-700/30 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Members</span>
              <span className="text-slate-200">{selectedGroup?.members?.length || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Created</span>
              <span className="text-slate-200">
                {new Date(selectedGroup?.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 space-y-3">
          {/* Save Button */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 text-slate-300 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isUpdating || !name.trim()}
              className="flex-1 py-2 px-4 text-white bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-lg hover:from-cyan-600 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? "Saving..." : "Save Changes"}
            </button>
          </div>

          {/* Delete Button */}
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 text-red-400 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
          >
            <TrashIcon className="w-5 h-5" />
            <span>{isDeleting ? "Deleting..." : "Delete Group"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default GroupSettings;
