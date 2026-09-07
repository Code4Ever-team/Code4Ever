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
  ShieldCheck,
  Camera,
  Upload,
  AlertTriangle,
  Edit2,
  Reply,
  CornerUpLeft,
  Video
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
  subscribeToOnlinePresence,
  getActiveConversationsMap,
  fetchUserConversationsFromSupabase,
  subscribeToUserIncomingMessages,
  sendMessageService,
  markMessagesAsReadService,
  editMessageService,
  deleteMessageService,
  loadStoredGroups,
  saveStoredGroups,
  subscribeToGroupsService,
  createGroupService,
  updateGroupService,
  deleteGroupService,
  leaveGroupService,
  loadStoredGroupInvites,
  subscribeToGroupInvitesService,
  sendGroupInviteService,
  respondToGroupInviteService,
  markNotificationsFromUserAsRead,
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
  initialTargetUser?: UserProfile | null;
  onSelectUser?: (username: string) => void;
  onTriggerNotification?: (notif: NotificationItem) => void;
}

interface UnifiedConversation {
  id: string;
  type: 'direct' | 'group';
  title: string;
  avatar: string;
  lastMessageText: string;
  lastMessageSender?: string;
  lastMessageTimestamp: string;
  isOnline: boolean;
  targetUser?: UserProfile;
  group?: ChatGroup;
  membersCount?: number;
}

export const DirectMessagesView: React.FC<DirectMessagesViewProps> = ({
  user,
  allUsers = [],
  language,
  initialTargetUser,
  onSelectUser,
  onTriggerNotification
}) => {
  // Navigation & Active Conversation State
  const [activeTab, setActiveTab] = useState<'all' | 'direct' | 'groups' | 'invites'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedTargetUser, setSelectedTargetUser] = useState<UserProfile | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null);

  // Handle external initial target user (e.g. from user profile or message button)
  useEffect(() => {
    if (initialTargetUser && initialTargetUser.username && user?.username) {
      const sortedUsernames = [(user.username || '').toLowerCase(), (initialTargetUser.username || '').toLowerCase()].sort();
      const convId = `dm_${sortedUsernames.join('_')}`;
      setSelectedConversationId(convId);
      setSelectedTargetUser(initialTargetUser);
      setSelectedGroup(null);
      markNotificationsFromUserAsRead(initialTargetUser.username);
    }
  }, [initialTargetUser, user?.username]);

  // Realtime Presence (Set of online usernames)
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  // Active Direct Chats Map (tracks conversations with actual messages)
  const [activeDirectMap, setActiveDirectMap] = useState<
    Record<string, { lastMessage: ChatMessage; otherUsername: string }>
  >(() => getActiveConversationsMap(user?.username || ''));

  // Messages & Groups Realtime State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [decryptedTextMap, setDecryptedTextMap] = useState<Record<string, string>>({});
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [groupInvites, setGroupInvites] = useState<GroupInvite[]>([]);
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<{ id: string; text: string } | null>(null);
  const [messageContextMenu, setMessageContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    message: ChatMessage | null;
  }>({ visible: false, x: 0, y: 0, message: null });

  // Swipe & Touch Tracking for Mobile Swipe to Reply
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const [swipedMessageId, setSwipedMessageId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);

  // Modals & Panels
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newChatSearchQuery, setNewChatSearchQuery] = useState('');
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

  // Group Deletion & Leaving State
  const [groupToDelete, setGroupToDelete] = useState<ChatGroup | null>(null);
  const [groupToLeave, setGroupToLeave] = useState<ChatGroup | null>(null);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const [isLeavingGroup, setIsLeavingGroup] = useState(false);

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
  const groupAvatarInputRef = useRef<HTMLInputElement | null>(null);
  const groupEditAvatarInputRef = useRef<HTMLInputElement | null>(null);

  // Ensure device master token exists
  useEffect(() => {
    getOrCreateDeviceMasterToken();
  }, []);

  // 1. Subscribe to Online Presence
  useEffect(() => {
    if (!user?.username) return;
    const unsubPresence = subscribeToOnlinePresence(user, (onlineSet) => {
      setOnlineUsers(new Set(onlineSet));
    });

    return () => {
      unsubPresence();
    };
  }, [user?.username]);

  // 2. Track & Sync Active Direct Chats Map in Realtime
  useEffect(() => {
    if (!user?.username) return;
    const currentUsername = user.username;
    const refreshMap = () => {
      setActiveDirectMap(getActiveConversationsMap(currentUsername));
    };
    refreshMap();

    // Also asynchronously fetch from Supabase to load threads from other devices/sessions
    fetchUserConversationsFromSupabase(currentUsername).then((remoteMap) => {
      if (remoteMap) setActiveDirectMap(remoteMap);
    });

    const handleCustom = () => refreshMap();
    window.addEventListener('c4e_message_broadcast', handleCustom);
    window.addEventListener('storage', handleCustom);

    const unsubIncoming = subscribeToUserIncomingMessages(currentUsername, () => {
      refreshMap();
    });

    return () => {
      window.removeEventListener('c4e_message_broadcast', handleCustom);
      window.removeEventListener('storage', handleCustom);
      unsubIncoming();
    };
  }, [user?.username]);

  // 3. Subscribe to Groups & Group Invites
  useEffect(() => {
    if (!user?.username) return;
    const currentUsername = user.username;
    const unsubGroups = subscribeToGroupsService(currentUsername, (loadedGroups) => {
      setGroups(loadedGroups || []);
      if (selectedGroup) {
        const currentG = (loadedGroups || []).find((g) => g?.id === selectedGroup.id);
        if (currentG) setSelectedGroup(currentG);
      }
    });

    const unsubInvites = subscribeToGroupInvitesService(currentUsername, (loadedInvites) => {
      setGroupInvites(loadedInvites || []);
    });

    return () => {
      unsubGroups();
      unsubInvites();
    };
  }, [user?.username, selectedGroup?.id]);

  // 4. Subscribe to Active Conversation Messages in Realtime
  useEffect(() => {
    if (!selectedConversationId || !user?.username) {
      setMessages([]);
      return;
    }
    const currentUsername = user.username;

    const unsub = subscribeToConversationMessages(selectedConversationId, async (loadedMessages) => {
      const safeMessages = Array.isArray(loadedMessages) ? loadedMessages.filter(Boolean) : [];
      setMessages(safeMessages);

      // Decrypt all messages safely in background
      const decMap: Record<string, string> = {};
      for (const msg of safeMessages) {
        if (!msg) continue;
        if (msg.content && typeof msg.content === 'string' && msg.content.startsWith('e2ee:')) {
          try {
            decMap[msg.id] = await decryptE2EEMessage(msg.content, selectedConversationId);
          } catch {
            decMap[msg.id] = msg.content;
          }
        } else {
          decMap[msg.id] = typeof msg.content === 'string' ? msg.content : (msg.content != null ? String(msg.content) : '');
        }
      }
      setDecryptedTextMap(decMap);

      // Mark messages as read
      await markMessagesAsReadService(selectedConversationId, currentUsername);
    });

    return () => {
      unsub();
    };
  }, [selectedConversationId, user?.username]);

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
      if (messageContextMenu.visible) {
        setMessageContextMenu({ visible: false, x: 0, y: 0, message: null });
      }
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [memberContextMenu.visible, messageContextMenu.visible]);

  // Compute unified conversation list (Direct Messages + Groups) sorted by latest message
  const unifiedConversations = React.useMemo(() => {
    const list: UnifiedConversation[] = [];

    // A. Direct conversations where messages exist
    Object.entries(activeDirectMap).forEach(([convId, rawData]) => {
      const data = rawData as { lastMessage: ChatMessage; otherUsername: string };
      if (!data || !data.otherUsername) return;
      const target = allUsers.find((u) => (u.username || '').toLowerCase() === (data.otherUsername || '').toLowerCase()) || {
        id: `usr_${data.otherUsername}`,
        username: data.otherUsername,
        display_name:
          data.lastMessage?.sender_username === data.otherUsername
            ? data.lastMessage.sender_display_name
            : data.otherUsername,
        avatar_url:
          data.lastMessage?.sender_username === data.otherUsername
            ? data.lastMessage.sender_avatar
            : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        role: 'Geliştirici',
        verified: false,
        bio: '',
        banner_url: '',
        joined_communities: [],
        custom_fields: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const isOnline = Boolean(data.otherUsername && onlineUsers.has(data.otherUsername.toLowerCase()));
      let rawPreview = data.lastMessage?.decrypted_text || data.lastMessage?.content || '';
      let previewText = typeof rawPreview === 'string' ? rawPreview : (rawPreview != null ? String(rawPreview) : '');
      if (previewText.startsWith('e2ee:')) {
        previewText = language === 'tr' ? 'Mesaj' : 'Message';
      } else if (previewText.startsWith('[CODE_SNIPPET]')) {
        previewText = language === 'tr' ? '💻 Kod Parçası' : '💻 Code Snippet';
      } else if (previewText.startsWith('[MEDIA:IMAGE]')) {
        previewText = language === 'tr' ? '📷 Görsel' : '📷 Image';
      } else if (previewText.startsWith('[MEDIA:FILE]')) {
        previewText = language === 'tr' ? '📎 Dosya' : '📎 File';
      }

      list.push({
        id: convId,
        type: 'direct',
        title: target.display_name || target.username,
        avatar: target.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        lastMessageText: previewText,
        lastMessageSender: data.lastMessage?.sender_display_name || data.lastMessage?.sender_username,
        lastMessageTimestamp: data.lastMessage?.created_at || new Date().toISOString(),
        isOnline,
        targetUser: target
      });
    });

    // If a direct chat was actively opened in UI (e.g. from New Chat Modal), keep it visible
    if (selectedTargetUser && selectedTargetUser.username) {
      const sorted = [(user?.username || '').toLowerCase(), (selectedTargetUser.username || '').toLowerCase()].sort();
      const convId = `dm_${sorted.join('_')}`;
      if (!list.some((item) => item.id === convId)) {
        list.unshift({
          id: convId,
          type: 'direct',
          title: selectedTargetUser.display_name || selectedTargetUser.username,
          avatar: selectedTargetUser.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          lastMessageText: language === 'tr' ? 'Sohbet başlatıldı' : 'Chat started',
          lastMessageTimestamp: new Date().toISOString(),
          isOnline: Boolean(selectedTargetUser.username && onlineUsers.has(selectedTargetUser.username.toLowerCase())),
          targetUser: selectedTargetUser
        });
      }
    }

    // B. Groups where user is a member
    const currentUsername = (user?.username || '').toLowerCase();
    const userGroups = (Array.isArray(groups) ? groups : []).filter((g) =>
      Array.isArray(g?.members) && g.members.some((m) => (m?.username || '').toLowerCase() === currentUsername)
    );

    userGroups.forEach((g) => {
      if (!g) return;
      let rawText = g.last_message
        ? g.last_message.text
        : `${g.members?.length || 0} ${language === 'tr' ? 'üye' : 'members'}`;
      let previewText = typeof rawText === 'string' ? rawText : (rawText != null ? String(rawText) : '');
      list.push({
        id: g.id,
        type: 'group',
        title: g.name || 'Grup',
        avatar: g.avatar_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
        lastMessageText: previewText,
        lastMessageSender: g.last_message?.sender_name,
        lastMessageTimestamp: g.last_message?.timestamp || g.created_at || new Date().toISOString(),
        isOnline: false,
        group: g,
        membersCount: g.members?.length || 0
      });
    });

    // Sort combined list chronologically: newest activity on top!
    list.sort(
      (a, b) => new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime()
    );

    return list;
  }, [activeDirectMap, allUsers, onlineUsers, language, user?.username, selectedTargetUser, groups]);

  // Filtered list based on active tab and search query
  const displayedConversations = React.useMemo(() => {
    let filtered = unifiedConversations;
    if (activeTab === 'direct') {
      filtered = filtered.filter((c) => c.type === 'direct');
    } else if (activeTab === 'groups') {
      filtered = filtered.filter((c) => c.type === 'group');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (c) =>
          (c.title || '').toLowerCase().includes(q) ||
          (c.lastMessageText || '').toLowerCase().includes(q) ||
          (c.targetUser?.username && c.targetUser.username.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [unifiedConversations, activeTab, searchQuery]);

  // Handle opening a direct message
  const handleOpenDirectChat = (targetUser: UserProfile) => {
    if (!targetUser || !targetUser.username) return;
    const sortedUsernames = [(user?.username || '').toLowerCase(), (targetUser.username || '').toLowerCase()].sort();
    const convId = `dm_${sortedUsernames.join('_')}`;

    setSelectedConversationId(convId);
    setSelectedTargetUser(targetUser);
    setSelectedGroup(null);
    setIsNewChatModalOpen(false);
    markNotificationsFromUserAsRead(targetUser.username);
  };

  // Handle opening a group chat
  const handleOpenGroupChat = (group: ChatGroup) => {
    setSelectedConversationId(group.id);
    setSelectedGroup(group);
    setSelectedTargetUser(null);
  };

  // Handle Message Edit, Delete, Reply
  const handleStartEdit = (msg: ChatMessage) => {
    const rawText = decryptedTextMap[msg.id] || msg.content || '';
    setEditingMessage({ id: msg.id, text: rawText });
    setInputText(rawText);
    setReplyingTo(null);
    setMessageContextMenu({ visible: false, x: 0, y: 0, message: null });
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setInputText('');
  };

  const handleSaveEdit = async () => {
    if (!editingMessage || !selectedConversationId || !inputText.trim()) return;
    const newText = inputText.trim();
    const { encrypted } = await encryptE2EEMessage(newText, selectedConversationId);
    await editMessageService(selectedConversationId, editingMessage.id, encrypted, newText);
    setDecryptedTextMap((prev) => ({ ...prev, [editingMessage.id]: newText }));
    setMessages((prev) =>
      prev.map((m) =>
        m.id === editingMessage.id
          ? { ...m, content: encrypted, is_edited: true, decrypted_text: newText, updated_at: new Date().toISOString() }
          : m
      )
    );
    setEditingMessage(null);
    setInputText('');
  };

  const handleDeleteMessage = async (msg: ChatMessage) => {
    if (!selectedConversationId) return;
    await deleteMessageService(selectedConversationId, msg.id);
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    setMessageContextMenu({ visible: false, x: 0, y: 0, message: null });
  };

  const handleReplyMessage = (msg: ChatMessage) => {
    setReplyingTo(msg);
    setEditingMessage(null);
    setMessageContextMenu({ visible: false, x: 0, y: 0, message: null });
  };

  const handleMessageTouchStart = (e: React.TouchEvent, msg: ChatMessage) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleMessageTouchMove = (e: React.TouchEvent, msg: ChatMessage) => {
    const diffX = e.touches[0].clientX - touchStartXRef.current;
    const diffY = Math.abs(e.touches[0].clientY - touchStartYRef.current);
    if (diffX > 0 && diffX < 80 && diffY < 35) {
      setSwipedMessageId(msg.id);
      setSwipeOffset(diffX);
    }
  };

  const handleMessageTouchEnd = (e: React.TouchEvent, msg: ChatMessage) => {
    const diffX = e.changedTouches[0].clientX - touchStartXRef.current;
    const diffY = Math.abs(e.changedTouches[0].clientY - touchStartYRef.current);
    if (diffX > 45 && diffY < 40) {
      handleReplyMessage(msg);
    }
    setSwipedMessageId(null);
    setSwipeOffset(0);
  };

  const openMsgContextMenu = (e: React.MouseEvent, msg: ChatMessage) => {
    e.preventDefault();
    e.stopPropagation();
    setMessageContextMenu({
      visible: true,
      x: Math.min(e.clientX, window.innerWidth - 200),
      y: Math.min(e.clientY, window.innerHeight - 220),
      message: msg
    });
  };

  // Handle Send Message (E2EE) / Save Edited Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (editingMessage) {
      await handleSaveEdit();
      return;
    }

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

    if (selectedTargetUser?.username) {
      markNotificationsFromUserAsRead(selectedTargetUser.username);
    }

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

  // Handle Image / Video / File Upload
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
      const isVid = file.type.startsWith('video/');
      const mediaType = isImg ? 'image' : isVid ? 'video' : 'file';

      const { encrypted, durationMs } = await encryptE2EEMessage(
        `[MEDIA:${mediaType.toUpperCase()}] ${file.name}`,
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
        media_type: mediaType,
        media_name: file.name,
        status: 'delivered',
        created_at: new Date().toISOString(),
        encryption_duration_ms: durationMs
      };

      setDecryptedTextMap((prev) => ({
        ...prev,
        [messageId]: (isImg || isVid) ? '' : file.name
      }));
      await sendMessageService(newMsg);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle New Group Avatar Local Upload (from device)
  const handleNewGroupAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert(language === 'tr' ? 'Lütfen bir görsel dosyası seçin.' : 'Please select an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        setNewGroupAvatar(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
    if (groupAvatarInputRef.current) groupAvatarInputRef.current.value = '';
  };

  // Handle Edit Existing Group Avatar Local Upload (from device)
  const handleEditGroupAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedGroup) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const avatarUrl = reader.result as string;
      await updateGroupService(selectedGroup.id, { avatar_url: avatarUrl });
      setSelectedGroup((prev) => (prev ? { ...prev, avatar_url: avatarUrl } : null));
    };
    reader.readAsDataURL(file);
    if (groupEditAvatarInputRef.current) groupEditAvatarInputRef.current.value = '';
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

  // Group Deletion Confirmation Handler
  const handleConfirmDeleteGroup = async () => {
    if (!groupToDelete) return;
    setIsDeletingGroup(true);
    const targetId = groupToDelete.id;
    try {
      await deleteGroupService(targetId);
      if (selectedGroup?.id === targetId || selectedConversationId === targetId) {
        setSelectedGroup(null);
        setSelectedConversationId(null);
        setIsGroupInfoOpen(false);
      }
    } finally {
      setIsDeletingGroup(false);
      setGroupToDelete(null);
    }
  };

  // Group Leave Confirmation Handler
  const handleConfirmLeaveGroup = async () => {
    if (!groupToLeave) return;
    setIsLeavingGroup(true);
    const targetId = groupToLeave.id;
    try {
      await leaveGroupService(targetId, user.username);
      if (selectedGroup?.id === targetId || selectedConversationId === targetId) {
        setSelectedGroup(null);
        setSelectedConversationId(null);
        setIsGroupInfoOpen(false);
      }
    } finally {
      setIsLeavingGroup(false);
      setGroupToLeave(null);
    }
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
    const targetUsernameClean = (targetUser.username || '').toLowerCase();
    const isAlreadyMember = selectedGroup.members.some(
      (m) => (m.username || '').toLowerCase() === targetUsernameClean
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
    if (!selectedGroup || !user?.username) return;
    const groupAdmins = Array.isArray(selectedGroup.admins) ? selectedGroup.admins : [];
    const isCurrentUserAdmin = groupAdmins.includes(user.username);
    if (!isCurrentUserAdmin) return;

    const willBeAdmin = targetMember.role !== 'admin';
    const groupMembers = Array.isArray(selectedGroup.members) ? selectedGroup.members : [];
    const updatedMembers = groupMembers.map((m) =>
      m.username === targetMember.username ? { ...m, role: willBeAdmin ? ('admin' as const) : ('member' as const) } : m
    );
    const updatedAdmins = willBeAdmin
      ? [...groupAdmins.filter((a) => a !== targetMember.username), targetMember.username]
      : groupAdmins.filter((a) => a !== targetMember.username);

    await updateGroupService(selectedGroup.id, {
      members: updatedMembers,
      admins: updatedAdmins
    });
    setMemberContextMenu({ visible: false, x: 0, y: 0, member: null });
  };

  // Group Admin Actions: Kick Member
  const handleKickMember = async (targetMember: GroupMember) => {
    if (!selectedGroup || !user?.username) return;
    const groupAdmins = Array.isArray(selectedGroup.admins) ? selectedGroup.admins : [];
    const isCurrentUserAdmin = groupAdmins.includes(user.username);
    if (!isCurrentUserAdmin) return;

    const groupMembers = Array.isArray(selectedGroup.members) ? selectedGroup.members : [];
    const updatedMembers = groupMembers.filter((m) => m.username !== targetMember.username);
    const updatedAdmins = groupAdmins.filter((a) => a !== targetMember.username);

    await updateGroupService(selectedGroup.id, {
      members: updatedMembers,
      admins: updatedAdmins
    });
    setMemberContextMenu({ visible: false, x: 0, y: 0, member: null });
  };

  const isCurrentGroupAdmin = Boolean(
    selectedGroup &&
    Array.isArray(selectedGroup.admins) &&
    user?.username &&
    selectedGroup.admins.includes(user.username)
  );

  return (
    <div className="flex-1 min-w-0 w-full border-r border-zinc-800/60 min-h-screen bg-[#09090b] flex flex-col select-none">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept="image/*,video/*,.pdf,.txt,.json,.zip,.ts,.js,.py"
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
                {
                  id: 'all',
                  label: `${language === 'tr' ? 'Tümü' : 'All'} (${unifiedConversations.length})`
                },
                {
                  id: 'direct',
                  label: `${language === 'tr' ? 'Kişisel' : 'Direct'} (${
                    unifiedConversations.filter((c) => c.type === 'direct').length
                  })`
                },
                {
                  id: 'groups',
                  label: `${language === 'tr' ? 'Gruplar' : 'Groups'} (${
                    unifiedConversations.filter((c) => c.type === 'group').length
                  })`
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
                            src={
                              invite.group_avatar ||
                              'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150'
                            }
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

            {/* UNIFIED CONVERSATIONS LIST */}
            {activeTab !== 'invites' && (
              <>
                {displayedConversations.length > 0 ? (
                  displayedConversations.map((conv) => {
                    const isSelected = selectedConversationId === conv.id;
                    const isTargetOnline =
                      conv.type === 'direct' &&
                      conv.targetUser &&
                      conv.targetUser.username &&
                      onlineUsers.has(conv.targetUser.username.toLowerCase());

                    return (
                      <div
                        key={conv.id}
                        onClick={() => {
                          if (conv.type === 'direct' && conv.targetUser) {
                            handleOpenDirectChat(conv.targetUser);
                          } else if (conv.type === 'group' && conv.group) {
                            handleOpenGroupChat(conv.group);
                          }
                        }}
                        className={`p-3.5 cursor-pointer transition-colors flex items-center gap-3 ${
                          isSelected ? 'bg-zinc-800/80' : 'hover:bg-zinc-900/50'
                        }`}
                      >
                        <div className="relative shrink-0">
                          <img
                            src={conv.avatar}
                            alt={conv.title}
                            className={`w-10 h-10 object-cover ring-1 ring-zinc-800 ${
                              conv.type === 'group' ? 'rounded-2xl' : 'rounded-full'
                            }`}
                          />
                          {conv.type === 'group' ? (
                            <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[9px] flex items-center justify-center absolute -bottom-1 -right-1 font-bold">
                              <Users className="w-2.5 h-2.5" />
                            </span>
                          ) : (
                            <span
                              className={`w-2.5 h-2.5 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-[#0c0c0e] ${
                                isTargetOnline ? 'bg-emerald-500 ring-2 ring-emerald-500/20' : 'bg-zinc-600'
                              }`}
                            />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                              <span>{conv.title}</span>
                              {conv.type === 'group' && conv.membersCount && (
                                <span className="text-[10px] font-mono text-zinc-500">
                                  ({conv.membersCount})
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {formatTimeAgo(conv.lastMessageTimestamp, language)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between mt-0.5">
                            <p className="text-[11px] text-zinc-400 truncate max-w-[190px]">
                              {conv.lastMessageSender && conv.type === 'group'
                                ? `${conv.lastMessageSender}: `
                                : ''}
                              {conv.lastMessageText}
                            </p>
                            {conv.type === 'direct' && isTargetOnline && (
                              <span className="text-[9px] font-medium text-emerald-400">Çevrim içi</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center space-y-3 text-zinc-500">
                    <MessageSquare className="w-8 h-8 mx-auto text-zinc-600" />
                    <p className="text-xs">
                      {searchQuery
                        ? language === 'tr'
                          ? 'Aramanızla eşleşen sohbet bulunamadı.'
                          : 'No chats match your search.'
                        : language === 'tr'
                        ? 'Henüz aktif bir sohbetiniz yok.'
                        : 'No active chats yet.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsNewChatModalOpen(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{language === 'tr' ? 'Yeni Sohbet Başlat' : 'Start New Chat'}</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Chat Panel (Cols 5-12) */}
        <div
          className={`md:col-span-8 flex flex-col bg-[#09090b] ${
            !selectedConversationId
              ? 'hidden md:flex'
              : 'fixed inset-0 z-40 md:static md:z-auto flex h-[100dvh] md:h-[calc(100vh-65px)] overflow-hidden'
          }`}
        >
          {selectedConversationId ? (
            <>
              {/* Active Chat Header */}
              <div className="sticky top-0 z-20 flex-shrink-0 p-3.5 border-b border-zinc-800/40 bg-[#0c0c0e]/95 backdrop-blur-md flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedConversationId(null)}
                    className="md:hidden p-2 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white cursor-pointer active:scale-95 transition-transform"
                    title={language === 'tr' ? 'Geri Dön' : 'Back'}
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
                          Boolean(selectedTargetUser.username && onlineUsers.has(selectedTargetUser.username.toLowerCase()))
                            ? 'bg-emerald-500 ring-2 ring-emerald-500/20'
                            : 'bg-zinc-600'
                        }`}
                      />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                      <span>{selectedGroup ? selectedGroup.name : (selectedTargetUser?.display_name || selectedTargetUser?.username || 'Sohbet')}</span>
                      {selectedGroup && (
                        <span className="px-1.5 py-0.2 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] rounded font-mono">
                          Grup
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-zinc-400 font-mono truncate">
                      {selectedGroup
                        ? `${selectedGroup.members?.length || 0} üye`
                        : Boolean(selectedTargetUser?.username && onlineUsers.has(selectedTargetUser.username.toLowerCase()))
                        ? '● Çevrim içi'
                        : formatLastSeen(
                            selectedTargetUser?.last_seen_at,
                            false,
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
                <div className="p-4 bg-zinc-950 border-b border-zinc-800/80 space-y-4 animate-in slide-in-from-top duration-200 flex-shrink-0">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative group">
                        <img
                          src={selectedGroup.avatar_url}
                          alt={selectedGroup.name}
                          className="w-14 h-14 rounded-2xl object-cover ring-2 ring-purple-500/20"
                        />
                        {/* If Admin or Creator, allow device photo upload */}
                        {(selectedGroup.admins?.includes(user.username) || selectedGroup.creator_username === user.username) && (
                          <>
                            <input
                              type="file"
                              ref={groupEditAvatarInputRef}
                              onChange={handleEditGroupAvatarUpload}
                              className="hidden"
                              accept="image/*"
                            />
                            <button
                              type="button"
                              onClick={() => groupEditAvatarInputRef.current?.click()}
                              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-2xl flex flex-col items-center justify-center text-white transition-opacity cursor-pointer"
                              title={language === 'tr' ? 'Cihazdan Fotoğraf Değiştir' : 'Change Photo from Device'}
                            >
                              <Camera className="w-5 h-5 text-white" />
                              <span className="text-[9px] font-semibold mt-0.5">{language === 'tr' ? 'Değiştir' : 'Change'}</span>
                            </button>
                          </>
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{selectedGroup.name}</h4>
                        <p className="text-xs text-zinc-400">
                          {selectedGroup.description || (language === 'tr' ? 'Açıklama yok' : 'No description')}
                        </p>
                        {(selectedGroup.admins?.includes(user.username) || selectedGroup.creator_username === user.username) && (
                          <button
                            type="button"
                            onClick={() => groupEditAvatarInputRef.current?.click()}
                            className="mt-1 text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                          >
                            <Camera className="w-3 h-3" />
                            <span>{language === 'tr' ? 'Cihazdan Fotoğrafı Güncelle' : 'Update Photo from Device'}</span>
                          </button>
                        )}
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
                        {language === 'tr' ? 'Üyeler' : 'Members'} ({selectedGroup.members?.length || 0})
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {language === 'tr'
                          ? 'Yönetim: Mobilde 2sn basılı tut / Masaüstünde sağ tıkla'
                          : 'Admin: Long-press 2s on mobile / Right click'}
                      </span>
                    </div>

                    <div className="max-h-48 overflow-y-auto divide-y divide-zinc-900 border border-zinc-800/80 rounded-xl bg-zinc-900/40">
                      {(Array.isArray(selectedGroup.members) ? selectedGroup.members : []).map((member) => {
                        if (!member) return null;
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

                  {/* Group Action Buttons (Delete / Leave Group) */}
                  <div className="pt-2 flex flex-wrap gap-2 border-t border-zinc-800/60">
                    {/* Delete Group (Creator or Admin) */}
                    {(selectedGroup.creator_username === user.username ||
                      selectedGroup.admins?.includes(user.username)) && (
                      <button
                        type="button"
                        onClick={() => setGroupToDelete(selectedGroup)}
                        className="flex-1 py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{language === 'tr' ? 'Grubu Sil' : 'Delete Group'}</span>
                      </button>
                    )}

                    {/* Leave Group (Any member) */}
                    <button
                      type="button"
                      onClick={() => setGroupToLeave(selectedGroup)}
                      className="flex-1 py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{language === 'tr' ? 'Gruptan Ayrıl' : 'Leave Group'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Message Feed Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 min-h-0">
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
                    if (!msg || !msg.id) return null;
                    const isMe = (msg.sender_username || '').toLowerCase() === (user?.username || '').toLowerCase();
                    const rawText = decryptedTextMap[msg.id] ?? (msg.decrypted_text || msg.content);
                    const text = typeof rawText === 'string' ? rawText : (rawText != null ? String(rawText) : '');
                    const isCodeSnippet = text.startsWith('[CODE_SNIPPET]');
                    const isSwiped = swipedMessageId === msg.id;

                    return (
                      <div
                        key={msg.id}
                        onTouchStart={(e) => handleMessageTouchStart(e, msg)}
                        onTouchMove={(e) => handleMessageTouchMove(e, msg)}
                        onTouchEnd={(e) => handleMessageTouchEnd(e, msg)}
                        onContextMenu={(e) => openMsgContextMenu(e, msg)}
                        style={{
                          transform: isSwiped ? `translateX(${Math.min(swipeOffset, 60)}px)` : undefined,
                          transition: isSwiped ? 'none' : 'transform 0.2s ease-out'
                        }}
                        className={`flex flex-col group relative ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                      >
                        {/* Swipe to reply visual indicator on mobile */}
                        {isSwiped && swipeOffset > 20 && (
                          <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-blue-400 text-xs font-bold pointer-events-none">
                            <CornerUpLeft className="w-4 h-4 animate-pulse" />
                          </div>
                        )}

                        {/* Group sender name */}
                        {selectedGroup && !isMe && (
                          <div className="flex items-center gap-1.5 pl-1 text-[11px] text-zinc-400 font-bold">
                            <span>{msg.sender_display_name}</span>
                            <span className="text-zinc-600 font-mono text-[10px]">
                              @{msg.sender_username}
                            </span>
                          </div>
                        )}

                        <div className="relative group/bubble flex items-center gap-1.5 max-w-full">
                          {/* Desktop Quick Actions (Hover on Left for 'isMe', Hover on Right for others) */}
                          {isMe && (
                            <div className="opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 rounded-xl px-1.5 py-1 text-zinc-400 shadow-md">
                              <button
                                type="button"
                                onClick={() => handleReplyMessage(msg)}
                                title="Yanıtla"
                                className="p-1 hover:text-blue-400 transition-colors cursor-pointer"
                              >
                                <Reply className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStartEdit(msg)}
                                title="Düzenle"
                                className="p-1 hover:text-amber-400 transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMessage(msg)}
                                title="Sil"
                                className="p-1 hover:text-red-400 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
                                  @{typeof msg.reply_to === 'object' ? (msg.reply_to.sender_username || 'kullanıcı') : 'yanıt'}
                                </p>
                                <p className="line-clamp-1 text-[11px]">
                                  {typeof msg.reply_to === 'object' ? (msg.reply_to.text || '') : String(msg.reply_to)}
                                </p>
                              </div>
                            )}

                            {/* Media Image */}
                            {msg.media_type === 'image' && msg.media_url && (
                              <div className="rounded-xl overflow-hidden max-h-64 my-1 border border-black/10">
                                <img
                                  src={msg.media_url}
                                  alt="Media preview"
                                  className="w-full h-auto object-cover cursor-pointer hover:opacity-95 transition-opacity"
                                />
                              </div>
                            )}

                            {/* Media Video Player (Inline playback without download) */}
                            {msg.media_type === 'video' && msg.media_url && (
                              <div className="rounded-xl overflow-hidden max-h-72 my-1 border border-black/10 bg-black">
                                <video
                                  src={msg.media_url}
                                  controls
                                  playsInline
                                  preload="metadata"
                                  className="w-full max-h-72 object-contain"
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
                            ) : text && !text.startsWith('[MEDIA:') ? (
                              <p className="text-xs leading-relaxed break-words select-text">
                                {text}
                              </p>
                            ) : null}

                            {/* Message Footer: Time + Edited Indicator + Status Checkmarks */}
                            <div
                              className={`flex items-center justify-end gap-1.5 pt-0.5 text-[10px] font-mono ${
                                isMe ? 'text-blue-200' : 'text-zinc-400'
                              }`}
                            >
                              {msg.is_edited && (
                                <span className="opacity-75 italic text-[9px]">
                                  ({language === 'tr' ? 'düzenlendi' : 'edited'})
                                </span>
                              )}
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

                          {/* Desktop Quick Actions for Received Messages */}
                          {!isMe && (
                            <div className="opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 rounded-xl px-1.5 py-1 text-zinc-400 shadow-md">
                              <button
                                type="button"
                                onClick={() => handleReplyMessage(msg)}
                                title="Yanıtla"
                                className="p-1 hover:text-blue-400 transition-colors cursor-pointer"
                              >
                                <Reply className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (text) navigator.clipboard.writeText(text);
                                }}
                                title="Kopyala"
                                className="p-1 hover:text-zinc-200 transition-colors cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Editing Banner */}
              {editingMessage && (
                <div className="px-4 py-2 bg-amber-500/10 border-t border-amber-500/30 flex items-center justify-between text-xs text-amber-300 flex-shrink-0">
                  <div className="flex items-center gap-2 truncate">
                    <Edit2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span className="font-bold">{language === 'tr' ? 'Mesaj Düzenleniyor' : 'Editing Message'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="p-1 text-amber-400 hover:text-white cursor-pointer"
                    title={language === 'tr' ? 'Vazgeç' : 'Cancel'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Reply Preview Bar */}
              {replyingTo && (
                <div className="px-4 py-2 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-300 flex-shrink-0">
                  <div className="flex items-center gap-2 truncate">
                    <CornerUpLeft className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <span className="font-bold text-blue-400">@{replyingTo.sender_username}</span>
                    <span className="text-zinc-500">yanıtlanıyor:</span>
                    <span className="truncate max-w-xs text-zinc-400">
                      {decryptedTextMap[replyingTo.id] || replyingTo.content}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Code Snippet Attachment Bar */}
              {isAttachCodeOpen && (
                <div className="p-3 bg-zinc-950 border-t border-zinc-800 space-y-2 flex-shrink-0">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Code className="w-3.5 h-3.5 text-blue-400" />
                      <span>Kod Parçası Ekle</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAttachCodeOpen(false)}
                      className="p-1 text-zinc-400 hover:text-white cursor-pointer"
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
                className="p-3 border-t border-zinc-800/60 bg-[#0c0c0e] flex items-center gap-2 flex-shrink-0"
              >
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="Fotoğraf, Video veya Dosya Ekle"
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
                    editingMessage
                      ? language === 'tr'
                        ? 'Mesajı düzenleyin...'
                        : 'Edit message...'
                      : selectedGroup
                      ? `${selectedGroup.name} grubuna mesaj yaz...`
                      : language === 'tr'
                      ? 'mesaj yaz...'
                      : 'Type a message...'
                  }
                  className="flex-1 bg-zinc-900/90 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() && !codeSnippet}
                  className={`p-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none ${
                    editingMessage ? 'bg-amber-600 hover:bg-amber-500' : 'bg-blue-600 hover:bg-blue-500'
                  }`}
                  title={editingMessage ? (language === 'tr' ? 'Kaydet' : 'Save') : (language === 'tr' ? 'Gönder' : 'Send')}
                >
                  {editingMessage ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
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

      {/* MESSAGE CONTEXT MENU (Right Click on PC / Context Menu) */}
      {messageContextMenu.visible && messageContextMenu.message && (
        <div
          style={{ top: `${messageContextMenu.y}px`, left: `${messageContextMenu.x}px` }}
          className="fixed z-50 w-48 rounded-2xl bg-zinc-900 border border-zinc-750 shadow-2xl p-1.5 space-y-1 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 select-none"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => handleReplyMessage(messageContextMenu.message!)}
            className="w-full text-left px-3 py-2 rounded-xl hover:bg-zinc-800 text-xs text-zinc-200 flex items-center gap-2 cursor-pointer transition-colors"
          >
            <CornerUpLeft className="w-3.5 h-3.5 text-blue-400" />
            <span>{language === 'tr' ? 'Yanıtla' : 'Reply'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const msg = messageContextMenu.message!;
              const rawText = decryptedTextMap[msg.id] ?? (msg.decrypted_text || msg.content);
              const text = typeof rawText === 'string' ? rawText : (rawText != null ? String(rawText) : '');
              if (text && !text.startsWith('[MEDIA:')) {
                navigator.clipboard.writeText(text);
              }
              setMessageContextMenu({ visible: false, x: 0, y: 0, message: null });
            }}
            className="w-full text-left px-3 py-2 rounded-xl hover:bg-zinc-800 text-xs text-zinc-200 flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-zinc-400" />
            <span>{language === 'tr' ? 'Kopyala' : 'Copy'}</span>
          </button>

          {(messageContextMenu.message?.sender_username || '').toLowerCase() === (user?.username || '').toLowerCase() && (
            <>
              <button
                type="button"
                onClick={() => handleStartEdit(messageContextMenu.message!)}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-zinc-800 text-xs text-amber-300 flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                <span>{language === 'tr' ? 'Düzenle' : 'Edit'}</span>
              </button>

              <div className="border-t border-zinc-800 my-1" />

              <button
                type="button"
                onClick={() => handleDeleteMessage(messageContextMenu.message!)}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-red-500/10 text-xs text-red-400 flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>{language === 'tr' ? 'Sil' : 'Delete'}</span>
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
                onClick={() => {
                  setIsNewChatModalOpen(false);
                  setNewChatSearchQuery('');
                }}
                className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search user input */}
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={newChatSearchQuery}
                onChange={(e) => setNewChatSearchQuery(e.target.value)}
                placeholder={
                  language === 'tr' ? 'Kullanıcı adı veya isim ara...' : 'Search user or name...'
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                autoFocus
              />
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-zinc-800/50 space-y-1">
              {allUsers
                .filter(
                  (u) => {
                    if (!u || !u.username) return false;
                    const uName = (u.username || '').toLowerCase();
                    const selfName = (user?.username || '').toLowerCase();
                    const dName = (u.display_name || '').toLowerCase();
                    const q = (newChatSearchQuery || '').toLowerCase().trim();
                    return uName !== selfName && (q === '' || dName.includes(q) || uName.includes(q));
                  }
                )
                .map((u) => {
                  const isUserOnline = Boolean(u.username && onlineUsers.has(u.username.toLowerCase()));
                  return (
                    <div
                      key={u.id || u.username}
                      onClick={() => handleOpenDirectChat(u)}
                      className="p-3 flex items-center justify-between hover:bg-zinc-800/60 rounded-xl cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={
                              u.avatar_url ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
                            }
                            alt={u.display_name}
                            className="w-9 h-9 rounded-full object-cover"
                          />
                          <span
                            className={`w-2.5 h-2.5 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-[#09090b] ${
                              isUserOnline ? 'bg-emerald-500 ring-2 ring-emerald-500/20' : 'bg-zinc-600'
                            }`}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-white">{u.display_name}</p>
                            {isUserOnline && (
                              <span className="text-[9px] text-emerald-400 font-medium font-mono">
                                Çevrim içi
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-500 font-mono">
                            @{u.username} · {u.role || 'Geliştirici'}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-blue-400 font-bold bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                        {language === 'tr' ? 'Sohbet' : 'Chat'}
                      </span>
                    </div>
                  );
                })}

              {allUsers.filter(
                (u) => {
                  if (!u || !u.username) return false;
                  const uName = (u.username || '').toLowerCase();
                  const selfName = (user?.username || '').toLowerCase();
                  const dName = (u.display_name || '').toLowerCase();
                  const q = (newChatSearchQuery || '').toLowerCase().trim();
                  return uName !== selfName && (q === '' || dName.includes(q) || uName.includes(q));
                }
              ).length === 0 && (
                <div className="p-6 text-center text-zinc-500 text-xs font-mono">
                  {language === 'tr' ? 'Kullanıcı bulunamadı.' : 'No users found.'}
                </div>
              )}
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
                className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Hidden Local File Input for Group Photo */}
            <input
              type="file"
              ref={groupAvatarInputRef}
              onChange={handleNewGroupAvatarUpload}
              className="hidden"
              accept="image/*"
            />

            {/* Group Avatar Selection Area */}
            <div className="flex flex-col items-center justify-center p-4 bg-zinc-950/60 rounded-2xl border border-zinc-800/80 gap-3">
              <div className="relative group cursor-pointer" onClick={() => groupAvatarInputRef.current?.click()}>
                <img
                  src={newGroupAvatar}
                  alt="Group Avatar Preview"
                  className="w-20 h-20 rounded-2xl object-cover ring-2 ring-purple-500/40 shadow-lg group-hover:opacity-80 transition-opacity"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded-2xl flex flex-col items-center justify-center text-white transition-opacity">
                  <Camera className="w-6 h-6" />
                  <span className="text-[10px] font-semibold mt-1">{language === 'tr' ? 'Değiştir' : 'Change'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => groupAvatarInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/30 text-purple-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{language === 'tr' ? 'Cihazımdan Fotoğraf Seç' : 'Choose Photo from Device'}</span>
                </button>
              </div>

              {/* Preset Icon Selector */}
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-[10px] text-zinc-500 mr-1">{language === 'tr' ? 'Hazır Simgeler:' : 'Presets:'}</span>
                {[
                  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
                  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=150&auto=format&fit=crop&q=80',
                  'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=150&auto=format&fit=crop&q=80',
                  'https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&auto=format&fit=crop&q=80',
                  'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=150&auto=format&fit=crop&q=80'
                ].map((presetUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setNewGroupAvatar(presetUrl)}
                    className={`w-7 h-7 rounded-lg overflow-hidden border transition-all cursor-pointer ${
                      newGroupAvatar === presetUrl ? 'ring-2 ring-purple-500 border-transparent scale-110' : 'border-zinc-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={presetUrl} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 font-semibold block mb-1">
                  {language === 'tr' ? 'Grup Adı' : 'Group Name'} *
                </label>
                <input
                  type="text"
                  required
                  maxLength={60}
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder={language === 'tr' ? 'Örn: React & AI Geliştiricileri' : 'e.g. React & AI Devs'}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-semibold block mb-1">
                  {language === 'tr' ? 'Açıklama (İsteğe Bağlı)' : 'Description (Optional)'}
                </label>
                <textarea
                  rows={2}
                  maxLength={250}
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder={language === 'tr' ? 'Grubun konusu veya kuralları...' : 'Group topic or rules...'}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewGroupModalOpen(false)}
                className="flex-1 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                {language === 'tr' ? 'İptal' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={!newGroupName.trim()}
                className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                {language === 'tr' ? 'Grubu Oluştur' : 'Create Group'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DELETE GROUP CONFIRMATION MODAL */}
      {groupToDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-red-500/30 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  {language === 'tr' ? 'Grubu Sil' : 'Delete Group'}
                </h3>
                <p className="text-xs text-zinc-400 font-mono">@{groupToDelete.name}</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              {language === 'tr'
                ? `"${groupToDelete.name}" grubunu kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem gruptaki tüm mesajları, medyaları ve üyelikleri geri alınamaz şekilde silecektir.`
                : `Are you sure you want to permanently delete the group "${groupToDelete.name}"? This action will permanently remove all messages, media, and memberships.`}
            </p>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeletingGroup}
                onClick={() => setGroupToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {language === 'tr' ? 'Vazgeç' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isDeletingGroup}
                onClick={handleConfirmDeleteGroup}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeletingGroup ? (
                  <span>{language === 'tr' ? 'Siliniyor...' : 'Deleting...'}</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>{language === 'tr' ? 'Grubu Kalıcı Olarak Sil' : 'Delete Permanently'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEAVE GROUP CONFIRMATION MODAL */}
      {groupToLeave && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  {language === 'tr' ? 'Gruptan Ayrıl' : 'Leave Group'}
                </h3>
                <p className="text-xs text-zinc-400 font-mono">@{groupToLeave.name}</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              {language === 'tr'
                ? `"${groupToLeave.name}" grubundan ayrılmak istediğinizden emin misiniz? Tekrar katılabilmek için bir davet almanız gerekecektir.`
                : `Are you sure you want to leave the group "${groupToLeave.name}"? You will need an invitation to rejoin.`}
            </p>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                disabled={isLeavingGroup}
                onClick={() => setGroupToLeave(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {language === 'tr' ? 'Vazgeç' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isLeavingGroup}
                onClick={handleConfirmLeaveGroup}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isLeavingGroup ? (
                  <span>{language === 'tr' ? 'Ayrılınıyor...' : 'Leaving...'}</span>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    <span>{language === 'tr' ? 'Gruptan Ayrıl' : 'Leave Group'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
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
                .filter((u) => {
                  if (!u || !u.username) return false;
                  const uName = (u.username || '').toLowerCase();
                  const selfName = (user?.username || '').toLowerCase();
                  const dName = (u.display_name || '').toLowerCase();
                  const q = (memberSearchQuery || '').toLowerCase().trim();
                  return uName !== selfName && (q === '' || uName.includes(q) || dName.includes(q));
                })
                .map((candidate) => {
                  const candidateName = (candidate.username || '').toLowerCase();
                  const isAlreadyIn = selectedGroup.members?.some(
                    (m) => (m.username || '').toLowerCase() === candidateName
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
