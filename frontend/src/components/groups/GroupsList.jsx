import { useEffect, useState } from "react";
import { useGroupStore } from "../../store/useGroupStore";
import { useAuthStore } from "../../store/useAuthStore";
import UsersLoadingSkeleton from "../UsersLoadingSkeleton";
import { PlusIcon, UsersIcon } from "lucide-react";
import CreateGroupModal from "./CreateGroupModal";

function GroupsList() {
  const { getMyGroups, groups, isGroupsLoading, setSelectedGroup, selectedGroup } = useGroupStore();
  const { onlineUsers } = useAuthStore();
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    getMyGroups();
  }, [getMyGroups]);

  // Count online members in a group
  const getOnlineMembersCount = (group) => {
    return group.members?.filter((m) => onlineUsers.includes(m.user?._id || m.user)).length || 0;
  };

  if (isGroupsLoading) return <UsersLoadingSkeleton />;

  return (
    <>
      {/* Create Group Button */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="w-full bg-cyan-500/10 p-4 rounded-lg cursor-pointer hover:bg-cyan-500/20 transition-colors mb-2 flex items-center justify-center gap-2 text-cyan-400"
      >
        <PlusIcon className="w-5 h-5" />
        <span>Create Group</span>
      </button>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
          <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center">
            <UsersIcon className="w-8 h-8 text-cyan-400" />
          </div>
          <div>
            <h4 className="text-slate-200 font-medium mb-1">No groups yet</h4>
            <p className="text-slate-400 text-sm px-6">
              Create a group to start chatting with multiple people
            </p>
          </div>
        </div>
      ) : (
        groups.map((group) => (
          <div
            key={group._id}
            className={`bg-cyan-500/10 p-4 rounded-lg cursor-pointer hover:bg-cyan-500/20 transition-colors ${
              selectedGroup?._id === group._id ? "bg-cyan-500/30 ring-1 ring-cyan-500/50" : ""
            }`}
            onClick={() => setSelectedGroup(group)}
          >
            <div className="flex items-center gap-3">
              <div className="avatar">
                <div className="size-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  {group.icon ? (
                    <img src={group.icon} alt={group.name} className="rounded-full" />
                  ) : (
                    <UsersIcon className="w-6 h-6 text-white" />
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-slate-200 font-medium truncate">{group.name}</h4>
                <p className="text-slate-400 text-sm">
                  {group.members?.length || 0} members
                  {getOnlineMembersCount(group) > 0 && (
                    <span className="text-cyan-400"> · {getOnlineMembersCount(group)} online</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        ))
      )}

      {/* Create Group Modal */}
      {showCreateModal && <CreateGroupModal onClose={() => setShowCreateModal(false)} />}
    </>
  );
}

export default GroupsList;
