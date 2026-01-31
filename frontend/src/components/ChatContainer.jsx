import { useEffect, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";
import { Trash2Icon, LockIcon, ShieldCheckIcon, ShieldAlertIcon, UnlockIcon } from "lucide-react";

function ChatContainer() {
  const {
    selectedUser,
    getMessagesByUserId,
    messages,
    isMessagesLoading,
    subscribeToMessages,
    unsubscribeFromMessages,
    deleteMessage,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);

  useEffect(() => {
    getMessagesByUserId(selectedUser._id);
    subscribeToMessages();

    // clean up
    return () => unsubscribeFromMessages();
  }, [selectedUser, getMessagesByUserId, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleDeleteMessage = async (messageId) => {
    if (window.confirm("Are you sure you want to delete this message?")) {
      await deleteMessage(messageId);
    }
  };

  return (
    <>
      <ChatHeader />
      <div className="flex-1 px-6 overflow-y-auto py-8">
        {messages.length > 0 && !isMessagesLoading ? (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => {
              const isMyMessage = msg.senderId === authUser._id;

              return (
                <div
                  key={msg._id}
                  className={`chat ${isMyMessage ? "chat-end" : "chat-start"} group/message`}
                >
                  <div
                    className={`chat-bubble relative ${
                      isMyMessage
                        ? "bg-cyan-600 text-white"
                        : "bg-slate-800 text-slate-200"
                    }`}
                  >
                    {/* Delete button - only for own messages, shows on hover */}
                    {isMyMessage && !msg.isOptimistic && (
                      <button
                        onClick={() => handleDeleteMessage(msg._id)}
                        className="absolute -left-8 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-700/80 text-slate-400 hover:text-red-400 hover:bg-slate-700 opacity-0 group-hover/message:opacity-100 transition-opacity"
                        title="Delete message"
                      >
                        <Trash2Icon className="w-4 h-4" />
                      </button>
                    )}

                    {msg.image && (
                      <img src={msg.image} alt="Shared" className="rounded-lg h-48 object-cover" />
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
            {/* scroll target */}
            <div ref={messageEndRef} />
          </div>
        ) : isMessagesLoading ? (
          <MessagesLoadingSkeleton />
        ) : (
          <NoChatHistoryPlaceholder name={selectedUser.fullName} />
        )}
      </div>

      <MessageInput />
    </>
  );
}

export default ChatContainer;
