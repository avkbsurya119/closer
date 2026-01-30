import { useState, useEffect } from "react";
import { XIcon } from "lucide-react";
import { useGroupStore } from "../../store/useGroupStore";
import { useChatStore } from "../../store/useChatStore";

function AddMembersModal({ onClose }) {
  const [selectedMembers, setSelectedMembers] = useState([]);

  const { selectedGroup, addMembers } = useGroupStore();
  const { getAllContacts, allContacts, isUsersLoading } = useChatStore();

  useEffect(() => {
    getAllContacts();
  }, [getAllContacts]);

  // Filter out users who are already members
  const existingMemberIds = selectedGroup?.members?.map((m) => m.user?._id || m.user) || [];
  const availableContacts = allContacts.filter(
    (contact) => !existingMemberIds.includes(contact._id)
  );

  const toggleMember = (userId) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async () => {
    if (selectedMembers.length === 0) return;

    await addMembers(selectedGroup._id, selectedMembers);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-slate-200">Add Members</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isUsersLoading ? (
            <div className="text-center text-slate-400 py-8">Loading contacts...</div>
          ) : availableContacts.length === 0 ? (
            <div className="text-center text-slate-400 py-8">
              All your contacts are already in this group
            </div>
          ) : (
            availableContacts.map((contact) => (
              <div
                key={contact._id}
                onClick={() => toggleMember(contact._id)}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedMembers.includes(contact._id)
                    ? "bg-cyan-500/20 ring-1 ring-cyan-500/50"
                    : "bg-slate-700/30 hover:bg-slate-700/50"
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
            disabled={selectedMembers.length === 0}
            className="flex-1 py-2 px-4 text-white bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-lg hover:from-cyan-600 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add ({selectedMembers.length})
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddMembersModal;
