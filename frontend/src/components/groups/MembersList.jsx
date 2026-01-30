import { useState } from "react";
import { XIcon, CrownIcon, ShieldIcon, UserIcon, UserPlusIcon, UserMinusIcon, ArrowUpIcon, ArrowDownIcon, LogOutIcon } from "lucide-react";
import { useGroupStore } from "../../store/useGroupStore";
import { useAuthStore } from "../../store/useAuthStore";
import AddMembersModal from "./AddMembersModal";

function MembersList({ onClose }) {
  const { selectedGroup, getMyRole, removeMember, updateMemberRole, leaveGroup } = useGroupStore();
  const { authUser, onlineUsers } = useAuthStore();
  const [showAddMembers, setShowAddMembers] = useState(false);

  const myRole = getMyRole(selectedGroup);
  const isCreator = myRole === "creator";
  const isAdmin = myRole === "admin";
  const canManageMembers = isCreator || isAdmin;

  const getRoleIcon = (role) => {
    switch (role) {
      case "creator":
        return <CrownIcon className="w-4 h-4 text-yellow-400" />;
      case "admin":
        return <ShieldIcon className="w-4 h-4 text-cyan-400" />;
      default:
        return <UserIcon className="w-4 h-4 text-slate-400" />;
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case "creator":
        return (
          <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded-full">
            Creator
          </span>
        );
      case "admin":
        return (
          <span className="px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 rounded-full">
            Admin
          </span>
        );
      default:
        return null;
    }
  };

  const handleRemoveMember = async (userId) => {
    if (window.confirm("Are you sure you want to remove this member?")) {
      await removeMember(selectedGroup._id, userId);
    }
  };

  const handlePromote = async (userId) => {
    await updateMemberRole(selectedGroup._id, userId, "admin");
  };

  const handleDemote = async (userId) => {
    await updateMemberRole(selectedGroup._id, userId, "member");
  };

  const handleLeaveGroup = async () => {
    if (window.confirm("Are you sure you want to leave this group?")) {
      await leaveGroup(selectedGroup._id);
      onClose();
    }
  };

  // Sort members: creator first, then admins, then members
  const sortedMembers = [...(selectedGroup?.members || [])].sort((a, b) => {
    const roleOrder = { creator: 0, admin: 1, member: 2 };
    return roleOrder[a.role] - roleOrder[b.role];
  });

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-slate-200">
              Members ({selectedGroup?.members?.length || 0})
            </h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Add Members Button (for admin/creator) */}
          {canManageMembers && (
            <div className="p-4 border-b border-slate-700">
              <button
                onClick={() => setShowAddMembers(true)}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 text-cyan-400 bg-cyan-500/10 rounded-lg hover:bg-cyan-500/20 transition-colors"
              >
                <UserPlusIcon className="w-5 h-5" />
                <span>Add Members</span>
              </button>
            </div>
          )}

          {/* Members List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {sortedMembers.map((member) => {
              const user = member.user;
              const userId = user?._id || user;
              const isMe = userId === authUser._id;
              const isOnline = onlineUsers.includes(userId);
              const isMemberCreator = member.role === "creator";
              const isMemberAdmin = member.role === "admin";

              return (
                <div
                  key={userId}
                  className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg"
                >
                  {/* Avatar */}
                  <div className={`avatar ${isOnline ? "online" : "offline"}`}>
                    <div className="w-10 h-10 rounded-full">
                      <img
                        src={user?.profilePic || "/avatar.png"}
                        alt={user?.fullName || "User"}
                      />
                    </div>
                  </div>

                  {/* Name and Role */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-200 font-medium truncate">
                        {user?.fullName || "Unknown"}
                        {isMe && <span className="text-slate-400 text-sm"> (You)</span>}
                      </span>
                      {getRoleBadge(member.role)}
                    </div>
                    <p className="text-slate-400 text-sm">
                      {isOnline ? "Online" : "Offline"}
                    </p>
                  </div>

                  {/* Actions */}
                  {!isMe && canManageMembers && !isMemberCreator && (
                    <div className="flex items-center gap-1">
                      {/* Promote/Demote (creator and admin can do this) */}
                      {isMemberAdmin ? (
                        <button
                          onClick={() => handleDemote(userId)}
                          className="p-1.5 text-slate-400 hover:text-orange-400 transition-colors"
                          title="Demote to member"
                        >
                          <ArrowDownIcon className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePromote(userId)}
                          className="p-1.5 text-slate-400 hover:text-cyan-400 transition-colors"
                          title="Promote to admin"
                        >
                          <ArrowUpIcon className="w-4 h-4" />
                        </button>
                      )}

                      {/* Remove (creator and admin can remove anyone except creator) */}
                      <button
                        onClick={() => handleRemoveMember(userId)}
                        className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
                        title="Remove member"
                      >
                        <UserMinusIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Leave Group Button (for non-creators) */}
          {!isCreator && (
            <div className="p-4 border-t border-slate-700">
              <button
                onClick={handleLeaveGroup}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 text-red-400 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                <LogOutIcon className="w-5 h-5" />
                <span>Leave Group</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Members Modal */}
      {showAddMembers && <AddMembersModal onClose={() => setShowAddMembers(false)} />}
    </>
  );
}

export default MembersList;
