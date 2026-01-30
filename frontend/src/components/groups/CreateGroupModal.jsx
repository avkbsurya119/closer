import { useState, useEffect, useRef } from "react";
import { XIcon, ImageIcon, UsersIcon } from "lucide-react";
import { useGroupStore } from "../../store/useGroupStore";
import { useChatStore } from "../../store/useChatStore";
import toast from "react-hot-toast";

function CreateGroupModal({ onClose }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const fileInputRef = useRef(null);

  const { createGroup, isCreatingGroup } = useGroupStore();
  const { getAllContacts, allContacts, isUsersLoading } = useChatStore();

  useEffect(() => {
    getAllContacts();
  }, [getAllContacts]);

  const handleIconChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setIcon(reader.result);
    reader.readAsDataURL(file);
  };

  const toggleMember = (userId) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim() || name.trim().length < 3) {
      toast.error("Group name must be at least 3 characters");
      return;
    }

    const result = await createGroup({
      name: name.trim(),
      description: description.trim(),
      icon,
      memberIds: selectedMembers,
    });

    if (result) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-slate-200">Create New Group</h3>
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
              {icon ? (
                <img src={icon} alt="Group icon" className="w-full h-full rounded-full object-cover" />
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
            <label className="block text-sm text-slate-400 mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this group about?"
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg py-2 px-4 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
              rows={2}
              maxLength={200}
            />
          </div>

          {/* Add Members */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Add Members ({selectedMembers.length} selected)
            </label>
            <div className="max-h-48 overflow-y-auto space-y-2 bg-slate-700/30 rounded-lg p-2">
              {isUsersLoading ? (
                <div className="text-center text-slate-400 py-4">Loading contacts...</div>
              ) : allContacts.length === 0 ? (
                <div className="text-center text-slate-400 py-4">No contacts found</div>
              ) : (
                allContacts.map((contact) => (
                  <div
                    key={contact._id}
                    onClick={() => toggleMember(contact._id)}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedMembers.includes(contact._id)
                        ? "bg-cyan-500/20 ring-1 ring-cyan-500/50"
                        : "hover:bg-slate-700/50"
                    }`}
                  >
                    <div className="avatar">
                      <div className="w-10 h-10 rounded-full">
                        <img src={contact.profilePic || "/avatar.png"} alt={contact.fullName} />
                      </div>
                    </div>
                    <span className="text-slate-200 flex-1">{contact.fullName}</span>
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        selectedMembers.includes(contact._id)
                          ? "bg-cyan-500 border-cyan-500"
                          : "border-slate-500"
                      }`}
                    >
                      {selectedMembers.includes(contact._id) && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 px-4 text-slate-300 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isCreatingGroup || !name.trim()}
            className="flex-1 py-2 px-4 text-white bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-lg hover:from-cyan-600 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreatingGroup ? "Creating..." : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateGroupModal;
