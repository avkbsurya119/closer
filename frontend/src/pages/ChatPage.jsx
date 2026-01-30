import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";

import BorderAnimatedContainer from "../components/BorderAnimatedContainer";
import ProfileHeader from "../components/ProfileHeader";
import ActiveTabSwitch from "../components/ActiveTabSwitch";
import ChatsList from "../components/ChatsList";
import ContactList from "../components/ContactList";
import ChatContainer from "../components/ChatContainer";
import NoConversationPlaceholder from "../components/NoConversationPlaceholder";
import GroupsList from "../components/groups/GroupsList";
import GroupChatContainer from "../components/groups/GroupChatContainer";

function ChatPage() {
  const { activeTab, selectedUser, setSelectedUser } = useChatStore();
  const { selectedGroup, clearSelectedGroup, subscribeToGroupEvents, unsubscribeFromGroupEvents } = useGroupStore();

  // Subscribe to group events when component mounts
  useEffect(() => {
    subscribeToGroupEvents();
    return () => unsubscribeFromGroupEvents();
  }, [subscribeToGroupEvents, unsubscribeFromGroupEvents]);

  // Clear selected user when a group is selected
  useEffect(() => {
    if (selectedGroup) {
      setSelectedUser(null);
    }
  }, [selectedGroup, setSelectedUser]);

  // Clear selected group when a user is selected
  useEffect(() => {
    if (selectedUser) {
      clearSelectedGroup();
    }
  }, [selectedUser, clearSelectedGroup]);

  const renderSidebarContent = () => {
    switch (activeTab) {
      case "chats":
        return <ChatsList />;
      case "contacts":
        return <ContactList />;
      case "groups":
        return <GroupsList />;
      default:
        return <ChatsList />;
    }
  };

  const renderMainContent = () => {
    if (selectedUser) {
      return <ChatContainer />;
    }
    if (selectedGroup) {
      return <GroupChatContainer />;
    }
    return <NoConversationPlaceholder />;
  };

  return (
    <div className="relative w-full max-w-6xl h-[800px]">
      <BorderAnimatedContainer>
        {/* LEFT SIDE */}
        <div className="w-80 bg-slate-800/50 backdrop-blur-sm flex flex-col">
          <ProfileHeader />
          <ActiveTabSwitch />

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {renderSidebarContent()}
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex-1 flex flex-col bg-slate-900/50 backdrop-blur-sm">
          {renderMainContent()}
        </div>
      </BorderAnimatedContainer>
    </div>
  );
}
export default ChatPage;
