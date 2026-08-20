import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  User,
  Users,
  Plus,
  Search,
  Lock,
  Shield,
  Check,
  CheckCheck,
  Image as ImageIcon,
  Code,
  Paperclip,
  MoreVertical,
  UserPlus,
  LogOut,
  Crown,
  Trash2,
  X,
  Clock,
  Sparkles,
  Info,
  ChevronLeft,
  AlertCircle,
  FileText,
  Copy,
  Eye,
  ShieldCheck
} from 'lucide-react';
import {
  UserProfile,
  ChatMessage,
  ChatGroup,
  GroupInvite,
  GroupMember,
  NotificationItem
} from '../types';
import {
  loadStoredMessages,
  saveStoredMessages,
  subscribeToConversationMessages,
  sendMessageService,
  markMessagesAsReadService,
  loadStoredGroups,
  saveStoredGroups,
  subscribeToGroupsService,
  createGroupService,
  updateGroupService,
  loadStoredGroupInvites,
  subscribeToGroupInvitesService,
  sendGroupInviteService,
  respondToGroupInviteService,
  getSupabaseClient
} from '../services/supabaseClient';
import { encryptE2EEMessage, decryptE2EEMessage, getOrCreateDeviceMasterToken } from '../utils/e2eeHelper';
import { formatTimeAgo, formatLastSeen } from '../utils/timeAgo';
import { validateFileSize, notifyFileSizeExceeded } from '../utils/fileUploadHelper';
import { sendNativeNotification } from '../utils/notificationSound';

interface DirectMessagesViewProps {
  user: UserProfile;
  allUsers?: UserProfile[];
  language: 'tr' | 'en';
  onSelectUser?: (username: string) => void;
  onTriggerNotification?: (notif: NotificationItem) => void;
}

export const DirectMessagesView: React.FC<DirectMessagesViewProps> = ({
  user,
  allUsers = [],
  language,
  onSelectUser,
  onTriggerNotification
}) => {
  // Navigation & Active Conversation State
  const [activeTab, setActiveTab] = useState<'all' | 'direct' | 'groups' | 'invites'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedTargetUser, setSelectedTargetUser] = useState<UserProfile | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null);

  // Messages & Groups Realtime State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [decryptedTextMap, setDecryptedTextMap] = useState<Record<string, string>>({});
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [groupInvites, setGroupInvites] = useState<GroupInvite[]>([]);
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  // Modals & Panels
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isAttachCodeOpen, setIsAttachCodeOpen] = useState(false);

  // New Group Form State
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupAvatar, setNewGroupAvatar] = useState(
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80'
  );
  const [newGroupDesc, setNewGroupDesc] = useState('');

  // Add Member Form State
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [inviteFeedback, setInviteFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Code Attachment Form State
  const [codeLanguage, setCodeLanguage] = useState('typescript');
  const [codeSnippet, setCodeSnippet] = useState('');

  // Context Menu State for Group Member Admin Actions
  const [memberContextMenu, setMemberContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    member: GroupMember | null;
  }>({ visible: false, x: 0, y: 0, member: null });

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Ensure device master token exists
  useEffect(() => {
    getOrCreateDeviceMasterToken();
  }, []);

  // Subscribe to Groups & Group Invites
  useEffect(() => {
    const unsubGroups = subscribeToGroupsService(user.username, (loadedGroups) => {
      setGroups(loadedGroups);
      if (selectedGroup) {
        const currentG = loadedGroups.find((g) => g.id === selectedGroup.id);
        if (currentG) setSelectedGroup(currentG);
      }
    });

    const unsubInvites = subscribeToGroupInvitesService(user.username, (loadedInvites) => {
      setGroupInvites(loadedInvites);
    });

    return () => {
      unsubGroups();
      unsubInvites();
    };
  }, [user.username, selectedGroup?.id]);

  // Subscribe to conversation messages
  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }

    const unsub = subscribeToConversationMessages(selectedConversationId, async (loadedMessages) => {
      setMessages(loadedMessages);

      // Decrypt all messages instantly in background
      const decMap: Record<string, string> = {};
      for (const msg of loadedMessages) {
        if (msg.content && msg.content.startsWith('e2ee:')) {
          decMap[msg.id] = await decryptE2EEMessage(msg.content, selectedConversationId);
        } else {
          decMap[msg.id] = msg.content || '';
        }
      }
      setDecryptedTextMap(decMap);

      // Mark messages as read
      await markMessagesAsReadService(selectedConversationId, user.username);
    });

    return () => {
      unsub();
    };
  }, [selectedConversationId, user.username]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, decryptedTextMap]);

  // Close context menu on outside click
  useEffect(() => {
    const handleGlobalClick = () => {
      if (memberContextMenu.visible) {
        setMemberContextMenu({ visible: false, x: 0, y: 0, member: null });
      }
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [memberContextMenu.visible]);

  // Compute conversation list (Direct Messages + Groups)
  const conversationList = React.useMemo(() => {
    // 1. Groups where user is a member
    const userGroups = groups.filter((g) =>
      g.members.some((m) => m.username.toLowerCase() === user.username.toLowerCase())
    );

    // 2. Direct message contacts from allUsers (except current user)
    const directContacts = allUsers.filter(
      (u) => u.username && u.username.toLowerCase() !== user.username.toLowerCase()
    );

    return { userGroups, directContacts };
  }, [groups, allUsers, user.username]);

  // Handle opening a direct message
  const handleOpenDirectChat = (targetUser: UserProfile) => {
    // Deterministic channel ID for 1-on-1: sorted usernames
    const sortedUsernames = [user.username.toLowerCase(), targetUser.username.toLowerCase()].sort();
    const convId = `dm_${sortedUsernames.join('_')}`;

    setSelectedConversationId(convId);
    setSelectedTargetUser(targetUser);
    setSelectedGroup(null);
    setIsNewChatModalOpen(false);
  };

  // Handle opening a group chat
  const handleOpenGroupChat = (group: ChatGroup) => {
    setSelectedConversationId(group.id);
    setSelectedGroup(group);
    setSelectedTargetUser(null);
  };

  // Handle Send Message (E2EE)
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !codeSnippet) return;
    if (!selectedConversationId) return;

    const rawContent = codeSnippet ? `[CODE_SNIPPET]\n${codeSnippet}` : inputText.trim();
    const textToSend = rawContent;
    setInputText('');
    setCodeSnippet('');
    setIsAttachCodeOpen(false);

    // Encrypt content in < 1ms
    const { encrypted, durationMs } = await encryptE2EEMessage(textToSend, selectedConversationId);

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newMsg: ChatMessage = {
      id: messageId,
      conversation_id: selectedConversationId,
      is_group: Boolean(selectedGroup),
      sender_id: user.id || `usr_${user.username}`,
      sender_username: user.username,
      sender_display_name: user.display_name || user.username,
      sender_avatar: user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      content: encrypted,
      decrypted_text: textToSend,
      status: 'delivered',
      created_at: new Date().toISOString(),
      encryption_duration_ms: durationMs,
      reply_to: replyingTo
        ? {
            id: replyingTo.id,
            sender_username: replyingTo.sender_username,
            text: decryptedTextMap[replyingTo.id] || replyingTo.content
          }
        : undefined
    };

    setReplyingTo(null);

    // Optimistic local state update
    setDecryptedTextMap((prev) => ({ ...prev, [messageId]: textToSend }));
    await sendMessageService(newMsg);

    // Update group last message if applicable
    if (selectedGroup) {
      await updateGroupService(selectedGroup.id, {
        last_message: {
          text: textToSend.substring(0, 80),
          sender_username: user.username,
          sender_name: user.display_name,
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  // Handle Image / File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversationId) return;

    const validation = validateFileSize(file, user);
    if (!validation.isValid) {
      notifyFileSizeExceeded(validation);
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const isImg = file.type.startsWith('image/');

      const { encrypted, durationMs } = await encryptE2EEMessage(
        `[MEDIA:${isImg ? 'IMAGE' : 'FILE'}] ${file.name}`,
        selectedConversationId
      );

      const messageId = `msg_media_${Date.now()}`;
      const newMsg: ChatMessage = {
        id: messageId,
        conversation_id: selectedConversationId,
        is_group: Boolean(selectedGroup),
        sender_id: user.id || `usr_${user.username}`,
        sender_username: user.username,
        sender_display_name: user.display_name || user.username,
        sender_avatar: user.avatar_url,
        content: encrypted,
        media_url: dataUrl,
        media_type: isImg ? 'image' : 'file',
        media_name: file.name,
        status: 'delivered',
        created_at: new Date().toISOString(),
        encryption_duration_ms: durationMs
      };

      setDecryptedTextMap((prev) => ({
        ...prev,
        [messageId]: `[MEDIA:${isImg ? 'IMAGE' : 'FILE'}] ${file.name}`
      }));
      await sendMessageService(newMsg);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Create New Group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const groupId = `grp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const creatorMember: GroupMember = {
      id: user.id || `mem_${user.username}`,
      username: user.username,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      role: 'admin',
      joined_at: new Date().toISOString()
    };

    const newGroup: ChatGroup = {
      id: groupId,
      name: newGroupName.trim(),
      avatar_url: newGroupAvatar,
      description: newGroupDesc.trim() || undefined,
      creator_id: user.id || user.username,
      creator_username: user.username,
      admins: [user.username],
      members: [creatorMember],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await createGroupService(newGroup);
    setIsNewGroupModalOpen(false);
    setNewGroupName('');
    setNewGroupDesc('');
    handleOpenGroupChat(newGroup);
  };

  // Send Group Invite
  const handleSendGroupInvite = async (targetUser: UserProfile) => {
    if (!selectedGroup) return;

    // Check privacy setting
    if (targetUser.allow_group_invites === false) {
      setInviteFeedback({
        type: 'error',
        message:
          language === 'tr'
            ? `@${targetUser.username} gizlilik ayarlarından grup davetlerini kapattı.`
            : `@${targetUser.username} has disabled group invitations in privacy settings.`
      });
      return;
    }

    // Check if already in group
    const isAlreadyMember = selectedGroup.members.some(
      (m) => m.username.toLowerCase() === targetUser.username.toLowerCase()
    );
    if (isAlreadyMember) {
      setInviteFeedback({
        type: 'error',
        message: language === 'tr' ? 'Bu kullanıcı zaten grupta.' : 'User is already a member.'
      });
      return;
    }

    const invite: GroupInvite = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      group_id: selectedGroup.id,
      group_name: selectedGroup.name,
      group_avatar: selectedGroup.avatar_url,
      group_description: selectedGroup.description,
      invited_by_username: user.username,
      invited_by_name: user.display_name,
      invited_by_avatar: user.avatar_url,
      target_username: targetUser.username,
      target_user_id: targetUser.id,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    await sendGroupInviteService(invite);

    // Trigger Notification for target user
    const notifItem: NotificationItem = {
      id: `notif_grp_inv_${Date.now()}`,
      recipient_id: targetUser.username,
      type: 'group_invite',
      actor: {
        username: user.username,
        display_name: user.display_name,
        avatar_url: user.avatar_url
      },
      content:
        language === 'tr'
          ? `seni "${selectedGroup.name}" grubuna davet etti.`
          : `invited you to group "${selectedGroup.name}".`,
      time_ago: 'şimdi',
      is_read: false,
      target_id: invite.id
    };
    sendNativeNotification({
      title: `${user.display_name} (@${user.username}) 🔔`,
      body:
        language === 'tr'
          ? `Seni "${selectedGroup.name}" grubuna davet etti.`
          : `Invited you to group "${selectedGroup.name}".`,
      playSound: true
    });
    if (onTriggerNotification) onTriggerNotification(notifItem);

    setInviteFeedback({
      type: 'success',
      message:
        language === 'tr'
          ? `@${targetUser.username} kullanıcısına grup daveti gönderildi!`
          : `Group invite sent to @${targetUser.username}!`
    });

    setTimeout(() => {
      setInviteFeedback(null);
      setIsAddMemberModalOpen(false);
    }, 1400);
  };

  // Member Management Context Menu Triggers
  const openMemberContextMenu = (e: React.MouseEvent | React.TouchEvent, member: GroupMember) => {
    e.preventDefault();
    e.stopPropagation();

    let clientX = 0;
    let clientY = 0;

    if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else if (e.touches && e.touches[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }

    setMemberContextMenu({
      visible: true,
      x: Math.min(clientX, window.innerWidth - 220),
      y: Math.min(clientY, window.innerHeight - 200),
      member
    });
  };

  // Mobile 2s Long Press Handlers
  const handleTouchStart = (e: React.TouchEvent, member: GroupMember) => {
    longPressTimerRef.current = setTimeout(() => {
      openMemberContextMenu(e, member);
    }, 2000); // Exactly 2 seconds as requested
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Group Admin Actions: Toggle Admin
  const handleToggleAdmin = async (targetMember: GroupMember) => {
    if (!selectedGroup) return;
    const isCurrentUserAdmin = selectedGroup.admins.includes(user.username);
    if (!isCurrentUserAdmin) return;

    const willBeAdmin = targetMember.role !== 'admin';
    const updatedMembers = selectedGroup.members.map((m) =>
      m.username === targetMember.username ? { ...m, role: willBeAdmin ? ('admin' as const) : ('member' as const) } : m
    );
    const updatedAdmins = willBeAdmin
      ? [...selectedGroup.admins.filter((a) => a !== targetMember.username), targetMember.username]
      : selectedGroup.admins.filter((a) => a !== targetMember.username);

    await updateGroupService(selectedGroup.id, {
      members: updatedMembers,
      admins: updatedAdmins
    });
    setMemberContextMenu({ visible: false, x: 0, y: 0, member: null });
  };

  // Group Admin Actions: Kick Member
  const handleKickMember = async (targetMember: GroupMember) => {
    if (!selectedGroup) return;
    const isCurrentUserAdmin = selectedGroup.admins.includes(user.username);
    if (!isCurrentUserAdmin) return;

    const updatedMembers = selectedGroup.members.filter((m) => m.username !== targetMember.username);
    const updatedAdmins = selectedGroup.admins.filter((a) => a !== targetMember.username);

    await updateGroupService(selectedGroup.id, {
      members: updatedMembers,
      admins: updatedAdmins
    });
    setMemberContextMenu({ visible: false, x: 0, y: 0, member: null });
  };

  const isCurrentGroupAdmin = selectedGroup ? selectedGroup.admins.includes(user.username) : false;

  return (
    <div className="flex-1 min-w-0 w-full border-r border-zinc-800/60 min-h-screen bg-[#09090b] flex flex-col select-none">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept="image/*,.pdf,.txt,.json,.zip,.ts,.js,.py"
      />

      {/* Top Header */}
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-[#09090b]/90 border-b border-zinc-800/40 px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>{language === 'tr' ? 'Mesajlar & Gruplar' : 'Messages & Groups'}</span>
            </h2>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsNewGroupModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">{language === 'tr' ? 'Grup Oluştur' : 'New Group'}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsNewChatModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{language === 'tr' ? 'Yeni Sohbet' : 'New Chat'}</span>
          </button>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 flex-1 min-h-[calc(100vh-65px)]">
        {/* LEFT COLUMN: Conversation List & Filters (Cols 1-4) */}
        <div
          className={`md:col-span-4 border-r border-zinc-800/60 bg-[#0c0c0e] flex flex-col ${
            selectedConversationId ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Filter Tabs */}
          <div className="p-3 border-b border-zinc-800/40 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'tr' ? 'Sohbet veya grup ara...' : 'Search chats & groups...'}
                className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="flex gap-1">
              {[
                { id: 'all', label: language === 'tr' ? 'Tümü' : 'All' },
                { id: 'direct', label: language === 'tr' ? 'Kişisel' : 'Direct' },
                {
                  id: 'groups',
                  label: `${language === 'tr' ? 'Gruplar' : 'Groups'} (${conversationList.userGroups.length})`
                },
                {
                  id: 'invites',
                  label: `${language === 'tr' ? 'Davetler' : 'Invites'}`,
                  badge: groupInvites.filter((i) => i.status === 'pending').length
                }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all relative flex items-center gap-1 cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge && tab.badge > 0 ? (
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold animate-pulse">
                      {tab.badge}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          {/* List Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/30">
            {/* GROUP INVITES TAB */}
            {activeTab === 'invites' && (
              <div className="p-3 space-y-3">
                {groupInvites.filter((i) => i.status === 'pending').length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 text-xs font-mono">
                    {language === 'tr' ? 'Bekleyen grup davetiniz yok.' : 'No pending group invites.'}
                  </div>
                ) : (
                  groupInvites
                    .filter((i) => i.status === 'pending')
                    .map((invite) => (
                      <div
                        key={invite.id}
                        className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-2.5 shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={invite.group_avatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150'}
                            alt={invite.group_name}
                            className="w-10 h-10 rounded-xl object-cover ring-1 ring-zinc-800"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">{invite.group_name}</h4>
                            <p className="text-[11px] text-zinc-400 truncate">
                              {invite.invited_by_name} (@{invite.invited_by_username}) davet etti
                            </p>
                          </div>
                        </div>
                        {invite.group_description && (
                          <p className="text-[11px] text-zinc-400 line-clamp-2">{invite.group_description}</p>
                        )}
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => respondToGroupInviteService(invite.id, 'accepted', user)}
                            className="flex-1 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{language === 'tr' ? 'Kabul Et' : 'Accept'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => respondToGroupInviteService(invite.id, 'declined', user)}
                            className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <span>{language === 'tr' ? 'Reddet' : 'Decline'}</span>
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            )}

            {/* NORMAL CONVERSATIONS & GROUPS */}
            {activeTab !== 'invites' && (
              <>
                {/* Groups Section */}
                {(activeTab === 'all' || activeTab === 'groups') &&
                  conversationList.userGroups
                    .filter((g) => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((group) => (
                      <div
                        key={group.id}
                        onClick={() => handleOpenGroupChat(group)}
                        className={`p-3.5 cursor-pointer transition-colors flex items-center gap-3 ${
                          selectedConversationId === group.id ? 'bg-zinc-800/80' : 'hover:bg-zinc-900/50'
                        }`}
                      >
                        <div className="relative">
                          <img
                            src={group.avatar_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150'}
                            alt={group.name}
                            className="w-10 h-10 rounded-2xl object-cover ring-1 ring-zinc-800"
                          />
                          <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[9px] flex items-center justify-center absolute -bottom-1 -right-1 font-bold">
                            <Users className="w-2.5 h-2.5" />
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                              <span>{group.name}</span>
                              <span className="text-[10px] font-mono text-zinc-500">
                                ({group.members.length})
                              </span>
                            </span>
                            {group.last_message && (
                              <span className="text-[10px] text-zinc-500 font-mono">
                                {formatTimeAgo(group.last_message.timestamp, language)}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                            {group.last_message
                              ? `${group.last_message.sender_name}: ${group.last_message.text}`
                              : `${group.members.length} üye`}
                          </p>
                        </div>
                      </div>
                    ))}

                {/* Direct Messages Section */}
                {(activeTab === 'all' || activeTab === 'direct') &&
                  conversationList.directContacts
                    .filter(
                      (u) =>
                        u.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        u.username.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((contact) => {
                      const sorted = [user.username.toLowerCase(), contact.username.toLowerCase()].sort();
                      const convId = `dm_${sorted.join('_')}`;
                      const isSelected = selectedConversationId === convId;

                      return (
                        <div
                          key={contact.id || contact.username}
                          onClick={() => handleOpenDirectChat(contact)}
                          className={`p-3.5 cursor-pointer transition-colors flex items-center gap-3 ${
                            isSelected ? 'bg-zinc-800/80' : 'hover:bg-zinc-900/50'
                          }`}
                        >
                          <div className="relative">
                            <img
                              src={
                                contact.avatar_url ||
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
                              }
                              alt={contact.display_name}
                              className="w-10 h-10 rounded-full object-cover ring-1 ring-zinc-800"
                            />
                            <span
                              className={`w-2.5 h-2.5 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-[#0c0c0e] ${
                                contact.is_online ? 'bg-emerald-500' : 'bg-zinc-600'
                              }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white truncate">
                                {contact.display_name}
                              </span>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                {contact.is_online
                                  ? 'Çevrim içi'
                                  : formatTimeAgo(contact.last_seen_at, language)}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                              @{contact.username} · {contact.role || 'Geliştirici'}
                            </p>
                          </div>
                        </div>
                      );
                    })}

                {conversationList.userGroups.length === 0 &&
                  conversationList.directContacts.length === 0 && (
                    <div className="p-8 text-center space-y-3 text-zinc-500">
                      <MessageSquare className="w-8 h-8 mx-auto text-zinc-600" />
                      <p className="text-xs">
                        {language === 'tr'
                          ? 'Henüz bir sohbetiniz yok. Yeni sohbet veya grup başlatın.'
                          : 'No active chats yet. Start a new chat or group.'}
                      </p>
                    </div>
                  )}
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Chat Panel (Cols 5-12) */}
        <div
          className={`md:col-span-8 flex flex-col bg-[#09090b] ${
            !selectedConversationId ? 'hidden md:flex' : 'flex'
          }`}
        >
          {selectedConversationId ? (
            <>
              {/* Active Chat Header */}
              <div className="p-3.5 border-b border-zinc-800/40 bg-[#0c0c0e] flex items-center justify-between backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedConversationId(null)}
                    className="md:hidden p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="relative">
                    <img
                      src={
                        selectedGroup
                          ? selectedGroup.avatar_url
                          : selectedTargetUser?.avatar_url ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
                      }
                      alt={selectedGroup ? selectedGroup.name : selectedTargetUser?.display_name || ''}
                      className={`w-10 h-10 object-cover ring-1 ring-zinc-800 ${
                        selectedGroup ? 'rounded-2xl' : 'rounded-full'
                      }`}
                    />
                    {selectedTargetUser && (
                      <span
                        className={`w-2.5 h-2.5 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-[#0c0c0e] ${
                          selectedTargetUser.is_online ? 'bg-emerald-500' : 'bg-zinc-600'
                        }`}
                      />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                      <span>{selectedGroup ? selectedGroup.name : selectedTargetUser?.display_name}</span>
                      {selectedGroup && (
                        <span className="px-1.5 py-0.2 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] rounded font-mono">
                          Grup
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-zinc-400 font-mono truncate">
                      {selectedGroup
                        ? `${selectedGroup.members.length} üye`
                        : formatLastSeen(
                            selectedTargetUser?.last_seen_at,
                            Boolean(selectedTargetUser?.is_online),
                            language
                          )}
                    </p>
                  </div>
                </div>

                {/* Right Header Actions */}
                <div className="flex items-center gap-2">
                  {selectedGroup && (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsAddMemberModalOpen(true)}
                        className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                        title={language === 'tr' ? 'Üye Ekle' : 'Add Member'}
                      >
                        <UserPlus className="w-3.5 h-3.5 text-blue-400" />
                        <span className="hidden sm:inline">{language === 'tr' ? 'Üye Ekle' : 'Add'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsGroupInfoOpen(!isGroupInfoOpen)}
                        className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                        title={language === 'tr' ? 'Grup Bilgisi' : 'Group Info'}
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Group Info Drawer (If toggled) */}
              {isGroupInfoOpen && selectedGroup && (
                <div className="p-4 bg-zinc-950 border-b border-zinc-800/80 space-y-4 animate-in slide-in-from-top duration-200">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={selectedGroup.avatar_url}
                        alt={selectedGroup.name}
                        className="w-12 h-12 rounded-2xl object-cover ring-2 ring-purple-500/20"
                      />
                      <div>
                        <h4 className="text-sm font-bold text-white">{selectedGroup.name}</h4>
                        <p className="text-xs text-zinc-400">
                          {selectedGroup.description || (language === 'tr' ? 'Açıklama yok' : 'No description')}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsGroupInfoOpen(false)}
                      className="p-1 rounded-lg text-zinc-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Members List with 2s Long-Press / Right-Click Actions */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span className="font-bold text-white">
                        {language === 'tr' ? 'Üyeler' : 'Members'} ({selectedGroup.members.length})
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {language === 'tr'
                          ? 'Yönetim: Mobilde 2sn basılı tut / Masaüstünde sağ tıkla'
                          : 'Admin: Long-press 2s on mobile / Right click'}
                      </span>
                    </div>

                    <div className="max-h-48 overflow-y-auto divide-y divide-zinc-900 border border-zinc-800/80 rounded-xl bg-zinc-900/40">
                      {selectedGroup.members.map((member) => {
                        const isMemberAdmin = member.role === 'admin';
                        const isMemberCreator = selectedGroup.creator_username === member.username;

                        return (
                          <div
                            key={member.username}
                            onContextMenu={(e) => openMemberContextMenu(e, member)}
                            onTouchStart={(e) => handleTouchStart(e, member)}
                            onTouchEnd={handleTouchEnd}
                            onTouchCancel={handleTouchEnd}
                            className="p-2.5 flex items-center justify-between hover:bg-zinc-800/50 transition-colors cursor-pointer select-none"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={
                                  member.avatar_url ||
                                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
                                }
                                alt={member.display_name}
                                className="w-7 h-7 rounded-full object-cover"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                                  <span>{member.display_name}</span>
                                  {isMemberCreator && (
                                    <span className="px-1.5 py-0.2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] rounded font-mono flex items-center gap-0.5">
                                      <Crown className="w-2.5 h-2.5" />
                                      <span>Kurucu</span>
                                    </span>
                                  )}
                                  {isMemberAdmin && !isMemberCreator && (
                                    <span className="px-1.5 py-0.2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] rounded font-mono">
                                      Yönetici
                                    </span>
                                  )}
                                </p>
                                <p className="text-[10px] text-zinc-500 font-mono">@{member.username}</p>
                              </div>
                            </div>

                            <MoreVertical className="w-4 h-4 text-zinc-600" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Message Feed Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 min-h-[400px]">
                {/* E2EE Banner */}
                <div className="flex justify-center my-2">
                  <div className="px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-[11px] text-zinc-400 flex items-center gap-2 font-mono shadow-sm">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      {language === 'tr'
                        ? 'Mesajlar ve medyalar AES-GCM 256-bit ile uçtan uca şifrelidir.'
                        : 'Messages and media are end-to-end encrypted with AES-GCM 256-bit.'}
                    </span>
                  </div>
                </div>

                {messages.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center space-y-2 text-zinc-500">
                    <Sparkles className="w-6 h-6 text-zinc-600" />
                    <p className="text-xs">
                      {language === 'tr' ? 'İlk mesajı gönderin!' : 'Send the first message!'}
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_username.toLowerCase() === user.username.toLowerCase();
                    const text = decryptedTextMap[msg.id] || msg.content;
                    const isCodeSnippet = text.startsWith('[CODE_SNIPPET]');

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                      >
                        {/* Group sender name */}
                        {selectedGroup && !isMe && (
                          <div className="flex items-center gap-1.5 pl-1 text-[11px] text-zinc-400 font-bold">
                            <span>{msg.sender_display_name}</span>
                            <span className="text-zinc-600 font-mono text-[10px]">
                              @{msg.sender_username}
                            </span>
                          </div>
                        )}

                        <div
                          className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-3 relative space-y-1.5 shadow-md ${
                            isMe
                              ? 'bg-blue-600 text-white rounded-br-none'
                              : 'bg-zinc-800/90 text-zinc-100 rounded-bl-none border border-zinc-750'
                          }`}
                        >
                          {/* Reply preview */}
                          {msg.reply_to && (
                            <div
                              className={`p-2 rounded-xl text-xs border-l-2 mb-1.5 ${
                                isMe
                                  ? 'bg-blue-700/50 border-white/60 text-white/90'
                                  : 'bg-zinc-900 border-blue-500 text-zinc-300'
                              }`}
                            >
                              <p className="font-bold text-[10px] opacity-80">
                                @{msg.reply_to.sender_username}
                              </p>
                              <p className="line-clamp-1 text-[11px]">{msg.reply_to.text}</p>
                            </div>
                          )}

                          {/* Media Image */}
                          {msg.media_type === 'image' && msg.media_url && (
                            <div className="rounded-xl overflow-hidden max-h-64 my-1 border border-black/10">
                              <img
                                src={msg.media_url}
                                alt="Encrypted attachment"
                                className="w-full h-auto object-cover cursor-pointer hover:opacity-95 transition-opacity"
                              />
                            </div>
                          )}

                          {/* Media File */}
                          {msg.media_type === 'file' && (
                            <div
                              className={`p-2.5 rounded-xl flex items-center gap-2.5 ${
                                isMe ? 'bg-blue-700/60' : 'bg-zinc-900'
                              }`}
                            >
                              <FileText className="w-5 h-5 opacity-80" />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold truncate">{msg.media_name || 'Dosya'}</p>
                                <p className="text-[10px] opacity-70">Belge</p>
                              </div>
                            </div>
                          )}

                          {/* Code Snippet */}
                          {isCodeSnippet ? (
                            <div className="rounded-xl overflow-hidden bg-[#0d1117] text-zinc-100 p-3 font-mono text-xs border border-zinc-700/50 my-1">
                              <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800 text-[10px] text-zinc-400">
                                <span className="flex items-center gap-1">
                                  <Code className="w-3 h-3 text-blue-400" />
                                  <span>Kod Bloğu</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    navigator.clipboard.writeText(
                                      text.replace('[CODE_SNIPPET]\n', '')
                                    )
                                  }
                                  className="p-1 hover:text-white transition-colors"
                                  title="Kopyala"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <pre className="overflow-x-auto whitespace-pre-wrap">
                                {text.replace('[CODE_SNIPPET]\n', '')}
                              </pre>
                            </div>
                          ) : (
                            <p className="text-xs leading-relaxed break-words select-text">
                              {text}
                            </p>
                          )}

                          {/* Message Footer: Time + E2EE tag + Status Checkmarks */}
                          <div
                            className={`flex items-center justify-end gap-1.5 pt-0.5 text-[10px] font-mono ${
                              isMe ? 'text-blue-200' : 'text-zinc-400'
                            }`}
                          >
                            <span>
                              {msg.created_at
                                ? new Date(msg.created_at).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : ''}
                            </span>
                            {isMe && (
                              <span>
                                {msg.status === 'read' ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-cyan-300 stroke-[2.5px]" />
                                ) : msg.status === 'delivered' ? (
                                  <CheckCheck className="w-3.5 h-3.5 opacity-80" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 opacity-80" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Preview Bar */}
              {replyingTo && (
                <div className="px-4 py-2 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-300">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-bold text-blue-400">@{replyingTo.sender_username}</span>
                    <span className="text-zinc-500">yanıtlanıyor:</span>
                    <span className="truncate max-w-xs text-zinc-400">
                      {decryptedTextMap[replyingTo.id] || replyingTo.content}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="p-1 text-zinc-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Code Snippet Attachment Bar */}
              {isAttachCodeOpen && (
                <div className="p-3 bg-zinc-950 border-t border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Code className="w-3.5 h-3.5 text-blue-400" />
                      <span>Kod Parçası Ekle</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAttachCodeOpen(false)}
                      className="p-1 text-zinc-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={codeSnippet}
                    onChange={(e) => setCodeSnippet(e.target.value)}
                    placeholder="// Kodunuzu buraya yapıştırın..."
                    className="w-full bg-[#0d1117] border border-zinc-800 rounded-xl p-3 font-mono text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {/* Message Input Box */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t border-zinc-800/60 bg-[#0c0c0e] flex items-center gap-2"
              >
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="Fotoğraf veya Dosya Ekle"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsAttachCodeOpen(!isAttachCodeOpen)}
                  className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="Kod Parçacığı Ekle"
                >
                  <Code className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    selectedGroup
                      ? `${selectedGroup.name} grubuna mesaj yaz...`
                      : language === 'tr'
                      ? 'mesaj yaz...'
                      : 'Type an message...'
                  }
                  className="flex-1 bg-zinc-900/90 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() && !codeSnippet}
                  className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shadow-xl">
                <MessageSquare className="w-8 h-8 text-blue-400" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="text-sm font-bold text-white">
                  {language === 'tr' ? 'Mesaj Yok' : 'No Message Yet'}
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  {language === 'tr'
                    ? 'Soldaki listeden bir arkadaşınızı veya grubu seçerek sohbet başlatın.'
                    : 'Select a contact or group from the left panel to start conversation.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MEMBER CONTEXT MENU (Mobile 2s Long-Press / Desktop Right Click) */}
      {memberContextMenu.visible && memberContextMenu.member && selectedGroup && (
        <div
          style={{ top: `${memberContextMenu.y}px`, left: `${memberContextMenu.x}px` }}
          className="fixed z-50 w-56 rounded-2xl bg-zinc-900 border border-zinc-750 shadow-2xl p-1.5 space-y-1 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 select-none"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 border-b border-zinc-800/80 text-[11px] font-bold text-zinc-300 truncate">
            @{memberContextMenu.member.username}
          </div>

          {onSelectUser && (
            <button
              type="button"
              onClick={() => {
                if (memberContextMenu.member) onSelectUser(memberContextMenu.member.username);
                setMemberContextMenu({ visible: false, x: 0, y: 0, member: null });
              }}
              className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-zinc-800 text-xs text-zinc-200 flex items-center gap-2 cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-zinc-400" />
              <span>{language === 'tr' ? 'Profili Görüntüle' : 'View Profile'}</span>
            </button>
          )}

          {memberContextMenu.member.username !== user.username && (
            <button
              type="button"
              onClick={() => {
                const target = allUsers.find(
                  (u) => u.username === memberContextMenu.member?.username
                );
                if (target) handleOpenDirectChat(target);
                setMemberContextMenu({ visible: false, x: 0, y: 0, member: null });
              }}
              className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-zinc-800 text-xs text-zinc-200 flex items-center gap-2 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
              <span>{language === 'tr' ? 'Özel Mesaj Gönder' : 'Direct Message'}</span>
            </button>
          )}

          {/* Admin Management Actions */}
          {isCurrentGroupAdmin &&
            memberContextMenu.member.username !== selectedGroup.creator_username &&
            memberContextMenu.member.username !== user.username && (
              <>
                <div className="border-t border-zinc-800 my-1" />
                <button
                  type="button"
                  onClick={() => handleToggleAdmin(memberContextMenu.member!)}
                  className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-zinc-800 text-xs text-purple-300 flex items-center gap-2 cursor-pointer"
                >
                  <Crown className="w-3.5 h-3.5 text-purple-400" />
                  <span>
                    {memberContextMenu.member.role === 'admin'
                      ? language === 'tr'
                        ? 'Yöneticiliği Kaldır'
                        : 'Dismiss Admin'
                      : language === 'tr'
                      ? 'Yönetici Yap'
                      : 'Make Group Admin'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleKickMember(memberContextMenu.member!)}
                  className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-red-500/10 text-xs text-red-400 flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>{language === 'tr' ? 'Gruptan Çıkar' : 'Remove from Group'}</span>
                </button>
              </>
            )}
        </div>
      )}

      {/* NEW CHAT MODAL */}
      {isNewChatModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                <span>{language === 'tr' ? 'Yeni Sohbet Başlat' : 'Start New Chat'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsNewChatModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-zinc-800/50">
              {allUsers
                .filter((u) => u.username && u.username.toLowerCase() !== user.username.toLowerCase())
                .map((u) => (
                  <div
                    key={u.id || u.username}
                    onClick={() => handleOpenDirectChat(u)}
                    className="p-3 flex items-center justify-between hover:bg-zinc-800/60 rounded-xl cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={u.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                        alt={u.display_name}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-xs font-bold text-white">{u.display_name}</p>
                        <p className="text-[10px] text-zinc-500 font-mono">@{u.username}</p>
                      </div>
                    </div>
                    <span className="text-xs text-blue-400 font-bold">Mesaj</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* NEW GROUP MODAL */}
      {isNewGroupModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateGroup}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span>{language === 'tr' ? 'Yeni Grup Oluştur' : 'Create New Group'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsNewGroupModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 font-semibold block mb-1">
                  {language === 'tr' ? 'Grup Adı' : 'Group Name'}
                </label>
                <input
                  type="text"
                  required
                  maxLength={60}
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder={language === 'tr' ? 'Örn: React & AI Geliştiricileri' : 'e.g. React & AI Devs'}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-semibold block mb-1">
                  {language === 'tr' ? 'Grup Görseli (URL)' : 'Group Avatar (URL)'}
                </label>
                <input
                  type="url"
                  value={newGroupAvatar}
                  onChange={(e) => setNewGroupAvatar(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-semibold block mb-1">
                  {language === 'tr' ? 'Açıklama' : 'Description'}
                </label>
                <textarea
                  rows={2}
                  maxLength={250}
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder={language === 'tr' ? 'Grubun amacı...' : 'Group purpose...'}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewGroupModalOpen(false)}
                className="flex-1 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700"
              >
                {language === 'tr' ? 'İptal' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md"
              >
                {language === 'tr' ? 'Grubu Oluştur' : 'Create Group'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ADD MEMBER MODAL */}
      {isAddMemberModalOpen && selectedGroup && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-400" />
                <span>{language === 'tr' ? 'Gruba Üye Davet Et' : 'Invite Member to Group'}</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddMemberModalOpen(false);
                  setInviteFeedback(null);
                }}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {inviteFeedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  inviteFeedback.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                    : 'bg-red-500/10 border border-red-500/20 text-red-300'
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{inviteFeedback.message}</span>
              </div>
            )}

            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                placeholder={language === 'tr' ? 'Kullanıcı adı yaz...' : 'Search username...'}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-zinc-800/40">
              {allUsers
                .filter(
                  (u) =>
                    u.username &&
                    u.username.toLowerCase() !== user.username.toLowerCase() &&
                    (u.username.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                      u.display_name.toLowerCase().includes(memberSearchQuery.toLowerCase()))
                )
                .map((candidate) => {
                  const isAlreadyIn = selectedGroup.members.some(
                    (m) => m.username.toLowerCase() === candidate.username.toLowerCase()
                  );

                  return (
                    <div
                      key={candidate.username}
                      className="p-3 flex items-center justify-between hover:bg-zinc-800/40 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            candidate.avatar_url ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
                          }
                          alt={candidate.display_name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div>
                          <p className="text-xs font-bold text-white">{candidate.display_name}</p>
                          <p className="text-[10px] text-zinc-500 font-mono">@{candidate.username}</p>
                        </div>
                      </div>

                      {isAlreadyIn ? (
                        <span className="text-[10px] text-zinc-500 font-mono">Zaten Üye</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSendGroupInvite(candidate)}
                          className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
                        >
                          {language === 'tr' ? 'Davet Et' : 'Invite'}
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
