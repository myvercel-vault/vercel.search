import { useRef, useState } from 'react';
import {
  Briefcase,
  Columns2,
  Download,
  FolderPlus,
  GraduationCap,
  MousePointer,
  Plus,
  Settings,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import type { BrowserTab, TabGroup, WorkspaceId } from '../types/search';

interface WorkspaceTabStripProps {
  workspace: WorkspaceId;
  onChangeWorkspace: (ws: WorkspaceId) => void;
  tabs: BrowserTab[];
  activeTabId: string;
  splitTabId: string | null;
  groups: TabGroup[];
  onSelectTab: (tabId: string) => void;
  onAddTab: (groupId?: string | null) => void;
  onDeleteTab: (tabId: string) => void;
  onAssignTabGroup: (tabId: string, groupId: string | null) => void;
  onAddGroup: (name: string) => void;
  onToggleGroupCollapse: (groupId: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onToggleSplitView: () => void;
  onOpenDownloads: () => void;
  downloadsCount: number;
  onOpenAssistant: () => void;
  virtualMousePad: boolean;
  onToggleVirtualMousePad: () => void;
  onOpenSettings: () => void;
}

function SwipeableTabPill({
  tab,
  isActive,
  isSplit,
  groups,
  onSelect,
  onDelete,
  onAssignGroup,
}: {
  tab: BrowserTab;
  isActive: boolean;
  isSplit: boolean;
  groups: TabGroup[];
  onSelect: () => void;
  onDelete: () => void;
  onAssignGroup: (groupId: string | null) => void;
}) {
  const [offsetX, setOffsetX] = useState(0);
  const swipeRef = useRef<{ startX: number; dragging: boolean }>({ startX: 0, dragging: false });

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, select')) return;
    swipeRef.current = { startX: e.clientX, dragging: true };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!swipeRef.current.dragging) return;
    const dx = e.clientX - swipeRef.current.startX;
    setOffsetX(dx);
  };

  const handlePointerUp = () => {
    if (!swipeRef.current.dragging) return;
    swipeRef.current.dragging = false;
    if (Math.abs(offsetX) > 56) {
      onDelete();
    }
    setOffsetX(0);
  };

  const opacity = Math.max(0.25, 1 - Math.abs(offsetX) / 90);

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        transform: `translate3d(${offsetX}px, 0, 0)`,
        opacity,
      }}
      title="Click to open · Slide left or right to delete tab"
      className={`group inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs shrink-0 max-w-[210px] select-none touch-pan-y transition-colors ${
        isActive
          ? 'border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-black'
          : isSplit
          ? 'border-neutral-500 bg-neutral-100 text-neutral-900 dark:border-white/40 dark:bg-white/10 dark:text-white'
          : 'border-neutral-200 dark:border-white/15 bg-white/80 dark:bg-neutral-950/80 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-white/30'
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="truncate text-left font-medium min-w-[40px]"
      >
        {tab.title}
      </button>

      {groups.length > 0 && (
        <select
          aria-label={`Assign ${tab.title} to group`}
          value={tab.groupId || ''}
          onChange={(e) => onAssignGroup(e.target.value || null)}
          className="bg-transparent text-[10px] opacity-65 hover:opacity-100 focus:outline-none max-w-[60px]"
        >
          <option value="" className="text-black">
            No grp
          </option>
          {groups.map((g) => (
            <option key={g.id} value={g.id} className="text-black">
              {g.name}
            </option>
          ))}
        </select>
      )}

      <button
        type="button"
        onClick={onDelete}
        aria-label={`Close tab ${tab.title}`}
        className="p-0.5 rounded opacity-60 hover:opacity-100 shrink-0"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export function WorkspaceTabStrip({
  workspace,
  onChangeWorkspace,
  tabs,
  activeTabId,
  splitTabId,
  groups,
  onSelectTab,
  onAddTab,
  onDeleteTab,
  onAssignTabGroup,
  onAddGroup,
  onToggleGroupCollapse,
  onDeleteGroup,
  onToggleSplitView,
  onOpenDownloads,
  downloadsCount,
  onOpenAssistant,
  virtualMousePad,
  onToggleVirtualMousePad,
  onOpenSettings,
}: WorkspaceTabStripProps) {
  const [addingGroup, setAddingGroup] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');

  const workspaceTabs = tabs.filter((t) => t.workspaceId === workspace);
  const workspaceGroups = groups.filter((g) => g.workspaceId === workspace);

  const handleGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = groupNameInput.trim();
    if (!trimmed) return;
    onAddGroup(trimmed);
    setGroupNameInput('');
    setAddingGroup(false);
  };

  const workspaces: Array<{ id: WorkspaceId; label: string; icon: typeof Briefcase }> = [
    { id: 'work', label: 'Work', icon: Briefcase },
    { id: 'personal', label: 'Personal', icon: User },
    { id: 'study', label: 'Study', icon: GraduationCap },
  ];

  const ungroupedTabs = workspaceTabs.filter(
    (t) => !t.groupId || !workspaceGroups.some((g) => g.id === t.groupId)
  );

  return (
    <div className="relative z-20 w-full border-b border-neutral-200/80 dark:border-white/10 bg-neutral-50/85 dark:bg-neutral-950/85 backdrop-blur-md">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-2 flex flex-col gap-2">
        {/* Top Control Row: Workspaces + Quick Utility Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Workspace Switcher */}
          <div className="flex items-center gap-1 rounded-lg border border-neutral-200 dark:border-white/12 bg-white dark:bg-black p-0.5">
            {workspaces.map((ws) => {
              const Icon = ws.icon;
              const active = workspace === ws.id;
              return (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => onChangeWorkspace(ws.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                    active
                      ? 'bg-neutral-950 text-white dark:bg-white dark:text-black'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  <span>{ws.label}</span>
                </button>
              );
            })}
          </div>

          {/* Action Controls */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onAddTab(null)}
              className="inline-flex items-center gap-1 rounded-md border border-neutral-200 dark:border-white/15 bg-white dark:bg-black px-2.5 py-1 text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:border-neutral-900 dark:hover:border-white/40 whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Tab</span>
            </button>

            <button
              type="button"
              onClick={() => setAddingGroup((v) => !v)}
              className="inline-flex items-center gap-1 rounded-md border border-neutral-200 dark:border-white/15 bg-white dark:bg-black px-2.5 py-1 text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:border-neutral-900 dark:hover:border-white/40 whitespace-nowrap shrink-0"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              <span>Add Group</span>
            </button>

            <button
              type="button"
              onClick={onToggleSplitView}
              aria-pressed={Boolean(splitTabId)}
              className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                splitTabId
                  ? 'border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-black'
                  : 'border-neutral-200 dark:border-white/15 bg-white dark:bg-black text-neutral-700 dark:text-neutral-300'
              }`}
            >
              <Columns2 className="h-3.5 w-3.5" />
              <span>Split View</span>
            </button>

            <button
              type="button"
              onClick={onToggleVirtualMousePad}
              aria-pressed={virtualMousePad}
              className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                virtualMousePad
                  ? 'border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-black'
                  : 'border-neutral-200 dark:border-white/15 bg-white dark:bg-black text-neutral-700 dark:text-neutral-300'
              }`}
            >
              <MousePointer className="h-3.5 w-3.5" />
              <span>Mouse Pad: {virtualMousePad ? 'On' : 'Off'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenAssistant}
              className="inline-flex items-center gap-1 rounded-md border border-neutral-200 dark:border-white/15 bg-white dark:bg-black px-2.5 py-1 text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:border-neutral-900 dark:hover:border-white/40 whitespace-nowrap shrink-0"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI Assistant</span>
            </button>

            <button
              type="button"
              onClick={onOpenDownloads}
              className="inline-flex items-center gap-1 rounded-md border border-neutral-200 dark:border-white/15 bg-white dark:bg-black px-2.5 py-1 text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:border-neutral-900 dark:hover:border-white/40 whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="tabular-nums">Downloads ({downloadsCount})</span>
            </button>

            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Open Settings"
              className="inline-flex items-center gap-1 rounded-md border border-neutral-200 dark:border-white/15 bg-white dark:bg-black px-2.5 py-1 text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:border-neutral-900 dark:hover:border-white/40 whitespace-nowrap shrink-0"
            >
              <Settings className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>
        </div>

        {/* Inline Add Group Form */}
        {addingGroup && (
          <form onSubmit={handleGroupSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={groupNameInput}
              onChange={(e) => setGroupNameInput(e.target.value)}
              placeholder="Group name (e.g. Research, Docs, Shopping)..."
              autoFocus
              className="w-64 rounded-md border border-neutral-300 dark:border-white/20 bg-white dark:bg-black px-2.5 py-1 text-xs focus:outline-none focus:border-neutral-900 dark:focus:border-white"
            />
            <button
              type="submit"
              className="rounded-md bg-neutral-950 text-white dark:bg-white dark:text-black px-3 py-1 text-xs font-medium"
            >
              Create Group
            </button>
            <button
              type="button"
              onClick={() => setAddingGroup(false)}
              className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            >
              Cancel
            </button>
          </form>
        )}

        {/* Tab Strip with Groups & Horizontal Slide-to-Delete */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          {workspaceGroups.map((grp) => {
            const groupTabs = workspaceTabs.filter((t) => t.groupId === grp.id);
            return (
              <div
                key={grp.id}
                className="flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-white/15 bg-neutral-100/70 dark:bg-white/[0.04] px-2 py-1 shrink-0"
              >
                <button
                  type="button"
                  onClick={() => onToggleGroupCollapse(grp.id)}
                  className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 whitespace-nowrap"
                >
                  {grp.name} ({groupTabs.length})
                </button>
                <button
                  type="button"
                  onClick={() => onAddTab(grp.id)}
                  title={`Add tab to ${grp.name}`}
                  className="p-0.5 text-neutral-500 hover:text-neutral-950 dark:hover:text-white"
                >
                  <Plus className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteGroup(grp.id)}
                  title={`Remove group ${grp.name}`}
                  className="p-0.5 text-neutral-400 hover:text-neutral-950 dark:hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>

                {!grp.collapsed &&
                  groupTabs.map((tab) => (
                    <SwipeableTabPill
                      key={tab.id}
                      tab={tab}
                      isActive={tab.id === activeTabId}
                      isSplit={tab.id === splitTabId}
                      groups={workspaceGroups}
                      onSelect={() => onSelectTab(tab.id)}
                      onDelete={() => onDeleteTab(tab.id)}
                      onAssignGroup={(gid) => onAssignTabGroup(tab.id, gid)}
                    />
                  ))}
              </div>
            );
          })}

          {ungroupedTabs.map((tab) => (
            <SwipeableTabPill
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTabId}
              isSplit={tab.id === splitTabId}
              groups={workspaceGroups}
              onSelect={() => onSelectTab(tab.id)}
              onDelete={() => onDeleteTab(tab.id)}
              onAssignGroup={(gid) => onAssignTabGroup(tab.id, gid)}
            />
          ))}

          <span className="hidden lg:inline text-[11px] text-neutral-400 dark:text-neutral-500 whitespace-nowrap ml-auto">
            Tip: Slide a tab left or right to delete
          </span>
        </div>
      </div>
    </div>
  );
}
