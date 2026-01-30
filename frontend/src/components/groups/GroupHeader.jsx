import { useEffect, useState } from "react";
import { XIcon, UsersIcon, SettingsIcon } from "lucide-react";
import { useGroupStore } from "../../store/useGroupStore";
import { useAuthStore } from "../../store/useAuthStore";
import MembersList from "./MembersList";
import GroupSettings from "./GroupSettings";

function GroupHeader() {
  const { selectedGroup, clearSelectedGroup, getMyRole } = useGroupStore();
  const { onlineUsers } = useAuthStore();
  const [showMembers, setShowMembers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const myRole = getMyRole(selectedGroup);
  const isCreator = myRole === "creator";

  // Count online members
  const onlineMembersCount = selectedGroup?.members?.filter((m) =>
    onlineUsers.includes(m.user?._id || m.user)
  ).length || 0;

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === "Escape") {
        if (showMembers) {
          setShowMembers(false);
        } else if (showSettings) {
          setShowSettings(false);
        } else {
          clearSelectedGroup();
        }
      }
    };

    window.addEventListener("keydown", handleEscKey);
    return () => window.removeEventListener("keydown", handleEscKey);
  }, [clearSelectedGroup, showMembers, showSettings]);

  return (
    <>
      <div className="flex justify-between items-center bg-slate-800/50 border-b border-slate-700/50 max-h-[84px] px-6 flex-1">
        <div className="flex items-center space-x-3">
          <div className="avatar">
            <div className="w-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              {selectedGroup?.icon ? (
                <img src={selectedGroup.icon} alt={selectedGroup.name} className="rounded-full" />
              ) : (
                <UsersIcon className="w-6 h-6 text-white" />
              )}
            </div>
          </div>

          <div>
            <h3 className="text-slate-200 font-medium">{selectedGroup?.name}</h3>
            <button
              onClick={() => setShowMembers(true)}
              className="text-slate-400 text-sm hover:text-cyan-400 transition-colors"
            >
              {selectedGroup?.members?.length || 0} members
              {onlineMembersCount > 0 && (
                <span className="text-cyan-400"> · {onlineMembersCount} online</span>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Settings button - only for creator */}
          {isCreator && (
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
          )}

          {/* Close button */}
          <button onClick={clearSelectedGroup}>
            <XIcon className="w-5 h-5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer" />
          </button>
        </div>
      </div>

      {/* Members Modal */}
      {showMembers && <MembersList onClose={() => setShowMembers(false)} />}

      {/* Settings Modal */}
      {showSettings && <GroupSettings onClose={() => setShowSettings(false)} />}
    </>
  );
}

export default GroupHeader;
