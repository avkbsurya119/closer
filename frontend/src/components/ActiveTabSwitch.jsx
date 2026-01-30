import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";

function ActiveTabSwitch() {
  const { activeTab, setActiveTab } = useChatStore();
  const { clearSelectedGroup } = useGroupStore();

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Clear selected group when switching away from groups tab
    if (tab !== "groups") {
      clearSelectedGroup();
    }
  };

  return (
    <div className="tabs tabs-boxed bg-transparent p-2 m-2">
      <button
        onClick={() => handleTabChange("chats")}
        className={`tab ${
          activeTab === "chats" ? "bg-cyan-500/20 text-cyan-400" : "text-slate-400"
        }`}
      >
        Chats
      </button>

      <button
        onClick={() => handleTabChange("contacts")}
        className={`tab ${
          activeTab === "contacts" ? "bg-cyan-500/20 text-cyan-400" : "text-slate-400"
        }`}
      >
        Contacts
      </button>

      <button
        onClick={() => handleTabChange("groups")}
        className={`tab ${
          activeTab === "groups" ? "bg-cyan-500/20 text-cyan-400" : "text-slate-400"
        }`}
      >
        Groups
      </button>
    </div>
  );
}
export default ActiveTabSwitch;
