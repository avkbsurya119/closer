import { useEffect, useRef } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { useGroupStore } from "../../store/useGroupStore";
import GroupHeader from "./GroupHeader";
import GroupMessageInput from "./GroupMessageInput";
import MessagesLoadingSkeleton from "../MessagesLoadingSkeleton";
import { UsersIcon, Trash2Icon, UserPlusIcon, UserMinusIcon, LogOutIcon, ArrowUpIcon, ArrowDownIcon, LockIcon, ShieldCheckIcon, ShieldAlertIcon, UnlockIcon } from "lucide-react";

function GroupChatContainer() {
  const {
    selectedGroup,
    getGroupMessages,
    groupMessages,
    isGroupMessagesLoading,
    deleteGroupMessage,
    getMyRole,
  } = useGroupStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);

  const myRole = getMyRole(selectedGroup);
  const canDeleteAny = myRole === "creator" || myRole === "admin";

  useEffect(() => {
    if (selectedGroup?._id) {
      getGroupMessages(selectedGroup._id);
    }
  }, [selectedGroup, getGroupMessages]);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [groupMessages]);

  const getSenderInfo = (message) => {
    // If senderId is populated object
    if (message.senderId && typeof message.senderId === "object") {
      return message.senderId;
    }
    // Find sender in group members
    const member = selectedGroup?.members?.find(
      (m) => (m.user?._id || m.user) === message.senderId
    );
    return member?.user || { fullName: "Unknown", profilePic: "" };
  };

  const isMyMessage = (message) => {
    const senderId = message.senderId?._id || message.senderId;
    return senderId === authUser._id;
  };

  const canDeleteMessage = (message) => {
    // Can't delete system messages
    if (message.type === "system") return false;
    // Creator and Admin can delete any message
    if (canDeleteAny) return true;
    // Members can only delete their own messages
    return isMyMessage(message);
  };

  const handleDeleteMessage = async (messageId) => {
    if (window.confirm("Are you sure you want to delete this message?")) {
      await deleteGroupMessage(selectedGroup._id, messageId);
    }
  };

  const getSystemIcon = (action) => {
    switch (action) {
      case "member_added":
        return <UserPlusIcon className="w-4 h-4" />;
      case "member_removed":
        return <UserMinusIcon className="w-4 h-4" />;
      case "member_left":
        return <LogOutIcon className="w-4 h-4" />;
      case "member_promoted":
        return <ArrowUpIcon className="w-4 h-4" />;
      case "member_demoted":
        return <ArrowDownIcon className="w-4 h-4" />;
      default:
        return <UsersIcon className="w-4 h-4" />;
    }
  };

  return (
    <>
      <GroupHeader />
      <div className="flex-1 px-6 overflow-y-auto py-8">
        {groupMessages.length > 0 && !isGroupMessagesLoading ? (
          <div className="max-w-3xl mx-auto space-y-6">
            {groupMessages.map((msg) => {
              // System notification message
              if (msg.type === "system") {
                return (
                  <div key={msg._id} className="flex justify-center">
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 rounded-full text-sm text-slate-400">
                      {getSystemIcon(msg.systemAction)}
                      <span>{msg.text}</span>
                    </div>
                  </div>
                );
              }

              // Regular message
              const sender = getSenderInfo(msg);
              const isMine = isMyMessage(msg);
              const showDelete = canDeleteMessage(msg);

              return (
                <div
                  key={msg._id}
                  className={`chat ${isMine ? "chat-end" : "chat-start"} group/message`}
                >
                  {/* Avatar for other users' messages */}
                  {!isMine && (
                    <div className="chat-image avatar">
                      <div className="w-8 rounded-full">
                        <img
                          src={sender.profilePic || "/avatar.png"}
                          alt={sender.fullName}
                        />
                      </div>
                    </div>
                  )}

                  <div className="chat-header text-xs text-slate-400 mb-1">
                    {!isMine && <span>{sender.fullName}</span>}
                  </div>

                  <div
                    className={`chat-bubble relative ${
                      isMine
                        ? "bg-cyan-600 text-white"
                        : "bg-slate-800 text-slate-200"
                    }`}
                  >
                    {/* Delete button - shows on hover */}
                    {showDelete && !msg.isOptimistic && (
                      <button
                        onClick={() => handleDeleteMessage(msg._id)}
                        className={`absolute ${isMine ? "-left-8" : "-right-8"} top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-700/80 text-slate-400 hover:text-red-400 hover:bg-slate-700 opacity-0 group-hover/message:opacity-100 transition-opacity`}
                        title="Delete message"
                      >
                        <Trash2Icon className="w-4 h-4" />
                      </button>
                    )}

                    {msg.image && (
                      <img
                        src={msg.image}
                        alt="Shared"
                        className="rounded-lg h-48 object-cover"
                      />
                    )}
                    {msg.text && <p className={msg.image ? "mt-2" : ""}>{msg.text}</p>}
                    <p className="text-xs mt-1 opacity-75 flex items-center gap-1">
                      {new Date(msg.createdAt).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {/* Encryption indicator */}
                      {msg.isEncrypted && (
                        <span title={msg.decrypted ? "End-to-end encrypted" : "Encrypted"}>
                          <LockIcon className="w-3 h-3 text-green-400" />
                        </span>
                      )}
                      {/* Signature indicator */}
                      {msg.signatureValid === true && (
                        <span title="Signature verified - Message is authentic">
                          <ShieldCheckIcon className="w-3 h-3 text-green-400" />
                        </span>
                      )}
                      {msg.signatureValid === false && (
                        <span title="Signature invalid - Message may be tampered">
                          <ShieldAlertIcon className="w-3 h-3 text-red-400" />
                        </span>
                      )}
                      {msg.decryptionFailed && (
                        <span title="Failed to decrypt message">
                          <UnlockIcon className="w-3 h-3 text-red-400" />
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messageEndRef} />
          </div>
        ) : isGroupMessagesLoading ? (
          <MessagesLoadingSkeleton />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="size-20 bg-cyan-500/20 rounded-full flex items-center justify-center mb-6">
              <UsersIcon className="size-10 text-cyan-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-200 mb-2">
              No messages yet
            </h3>
            <p className="text-slate-400 max-w-md">
              Be the first to send a message in {selectedGroup?.name}!
            </p>
          </div>
        )}
      </div>

      <GroupMessageInput />
    </>
  );
}

export default GroupChatContainer;
