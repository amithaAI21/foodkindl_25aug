import {
  ChevronDown,
  MessageCircle,
  Search,
  Send,
  UsersRound,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import api from "../api";
import { useAuth } from "../context/AuthContext";

export default function MessagingDock() {
  const { user } = useAuth();

  const [dockOpen, setDockOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");
  const [activeChats, setActiveChats] = useState([]);

  const [
    messagesByConversation,
    setMessagesByConversation,
  ] = useState({});

  const [drafts, setDrafts] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);

  const [
    loadingConversationId,
    setLoadingConversationId,
  ] = useState(null);

  const [
    sendingConversationId,
    setSendingConversationId,
  ] = useState(null);

  const [error, setError] = useState("");

  const [
    blockedConversationIds,
    setBlockedConversationIds,
  ] = useState(() => new Set());

  const refreshTimerRef = useRef(null);
  const activeChatsRef = useRef([]);

  const API_BASE =
    import.meta.env.VITE_BACKEND_URL ||
    "http://127.0.0.1:8000";

  function getMediaUrl(path) {
    if (!path) {
      return "";
    }

    if (
      path.startsWith("http://") ||
      path.startsWith("https://") ||
      path.startsWith("blob:")
    ) {
      return path;
    }

    return `${API_BASE}${path}`;
  }

  // Prefer the real member name supplied by Django. Never present a
  // generic placeholder as though it were a registered person's name.
  function getUserName(currentUser) {
    const person = currentUser?.user || currentUser;
    const profile = currentUser?.profile || person?.profile || {};

    const fullNameFromParts = [
      person?.first_name,
      person?.last_name,
    ].filter(Boolean).join(" ");

    const candidates = [
      person?.full_name,
      fullNameFromParts,
      person?.display_name,
      profile?.full_name,
      profile?.display_name,
      person?.username,
      profile?.username,
      person?.name,
    ];

    for (const candidate of candidates) {
      const name = typeof candidate === "string" ? candidate.trim() : "";
      if (!name) continue;
      if (["foodkindl member", "foodkindlmember", "member", "user"]
        .includes(name.toLowerCase())) continue;
      // An email address is not a public display name.
      if (name.includes("@")) continue;
      return name;
    }

    return "Member";
  }

  function getUserInitial(currentUser) {
    return getUserName(currentUser)
      .charAt(0)
      .toUpperCase();
  }

  function getUserImage(currentUser) {
    return getMediaUrl(
      currentUser?.profile?.profile_image_1_url ||
        currentUser?.profile?.profile_image_1
    );
  }

  function normaliseList(data) {
    const value = data?.results || data;

    return Array.isArray(value)
      ? value
      : [];
  }

  function deduplicateConversations(conversationList) {
    const seenDirectMembers = new Set();
    const seenConversationIds = new Set();

    return conversationList.filter((conversation) => {
      if (!conversation?.id) {
        return false;
      }

      if (seenConversationIds.has(conversation.id)) {
        return false;
      }

      seenConversationIds.add(conversation.id);

      if (isGroupConversation(conversation)) {
        return true;
      }

      const otherUserId =
        conversation?.other_user?.id;

      if (!otherUserId) {
        return true;
      }

      if (seenDirectMembers.has(otherUserId)) {
        return false;
      }

      seenDirectMembers.add(otherUserId);
      return true;
    });
  }

  function getErrorMessage(data) {
    if (!data) {
      return "The request could not be completed.";
    }

    if (typeof data === "string") {
      return data;
    }

    return (
      data?.user_id?.[0] ||
      data?.text?.[0] ||
      data?.non_field_errors?.[0] ||
      data?.detail ||
      "The request could not be completed."
    );
  }

  async function getBlockStatus(memberId) {
    if (!memberId) {
      return {
        blocked_by_me: false,
        interaction_blocked: false,
      };
    }

    try {
      const response = await api.get(
        `/auth/block-status/${memberId}/`
      );

      return {
        blocked_by_me:
          response.data?.blocked_by_me === true,

        interaction_blocked:
          response.data?.interaction_blocked === true,
      };
    } catch (requestError) {
      console.error(
        "Unable to check block status:",
        requestError.response?.data ||
          requestError
      );

      // Safer fallback: if status cannot be checked,
      // do not allow a direct message to be sent.
      return {
        blocked_by_me: false,
        interaction_blocked: true,
      };
    }
  }

  function isGroupConversation(conversation) {
    return (
      conversation?.conversation_type === "food_group" ||
      conversation?.conversation_type === "group"
    );
  }

  function getConversationTitle(conversation) {
    if (isGroupConversation(conversation)) {
      return (
        conversation.title ||
        "Food Sharing Group"
      );
    }

    return getUserName(
      conversation?.other_user
    );
  }

  function getConversationSubtitle(conversation) {
    if (isGroupConversation(conversation)) {
      const participantCount =
        conversation?.participants?.length || 0;

      if (!conversation?.is_active) {
        return "Group chat expired";
      }

      return `${participantCount} members`;
    }

    return (
      conversation?.other_user?.profile?.role ||
      conversation?.other_user?.profile?.city ||
      "Member"
    );
  }

  const loadConversations = useCallback(
    async () => {
      try {
        const response = await api.get(
          "/conversations/"
        );

        setConversations(
          deduplicateConversations(
            normaliseList(response.data)
          )
        );
      } catch (requestError) {
        console.error(
          "Unable to load conversations:",
          requestError.response?.data ||
            requestError
        );
      }
    },
    []
  );

  const loadMembers = useCallback(
    async (searchValue = "") => {
      try {
        const cleanSearch =
          searchValue.trim();

        const response = await api.get(
          "/members/",
          {
            params: cleanSearch
              ? {
                  first_name: cleanSearch,
                }
              : {},
          }
        );

        setMembers(
          normaliseList(response.data)
        );
      } catch (requestError) {
        console.error(
          "Unable to load members:",
          requestError.response?.data ||
            requestError
        );
      }
    },
    []
  );

  const loadUnreadCount =
    useCallback(async () => {
      try {
        const response = await api.get(
          "/conversations/unread-count/"
        );

        setUnreadCount(
          response.data?.unread_count || 0
        );
      } catch (requestError) {
        console.error(
          "Unable to load unread count:",
          requestError.response?.data ||
            requestError
        );
      }
    }, []);

  const loadMessages = useCallback(
    async (
      conversationId,
      showLoading = true
    ) => {
      if (!conversationId) {
        return;
      }

      if (showLoading) {
        setLoadingConversationId(
          conversationId
        );
      }

      try {
        const response = await api.get(
          `/conversations/${conversationId}/messages/`
        );

        setMessagesByConversation(
          (currentMessages) => ({
            ...currentMessages,
            [conversationId]:
              normaliseList(response.data),
          })
        );

        await loadUnreadCount();
      } catch (requestError) {
        console.error(
          "Unable to load messages:",
          requestError.response?.data ||
            requestError
        );

        if (showLoading) {
          setError(
            getErrorMessage(
              requestError.response?.data
            )
          );
        }
      } finally {
        if (showLoading) {
          setLoadingConversationId(null);
        }
      }
    },
    [loadUnreadCount]
  );

  const openConversation = useCallback(
    async (conversation) => {
      if (!conversation?.id) {
        return;
      }

      setDockOpen(true);
      setSearch("");
      setError("");

      setActiveChats((currentChats) => {
        const existingChat =
          currentChats.find(
            (chat) =>
              chat.id === conversation.id
          );

        if (existingChat) {
          return currentChats.map((chat) =>
            chat.id === conversation.id
              ? {
                  ...chat,
                  ...conversation,
                }
              : chat
          );
        }

        // Keep one chat popup open at a time.
        return [conversation];
      });

      if (!isGroupConversation(conversation)) {
        const otherUserId =
          conversation?.other_user?.id;

        if (otherUserId) {
          const blockStatus =
            await getBlockStatus(otherUserId);

          setBlockedConversationIds(
            (currentIds) => {
              const nextIds = new Set(currentIds);

              if (blockStatus.interaction_blocked) {
                nextIds.add(conversation.id);
              } else {
                nextIds.delete(conversation.id);
              }

              return nextIds;
            }
          );
        }
      }

      loadMessages(conversation.id);
    },
    [loadMessages]
  );

  const startConversation = useCallback(
    async (member) => {
      if (!member?.id) {
        setError(
          "This member is unavailable for messaging."
        );
        return;
      }

      if (member.id === user?.id) {
        setError(
          "You cannot message yourself."
        );
        return;
      }

      setDockOpen(true);
      setError("");

      try {
        const blockStatus =
          await getBlockStatus(member.id);

        if (blockStatus.interaction_blocked) {
          setError(
            "Messaging is not available with this member."
          );
          return;
        }

        const response = await api.post(
          "/conversations/",
          {
            user_id: member.id,
          }
        );

        await openConversation(response.data);

        await Promise.all([
          loadConversations(),
          loadUnreadCount(),
        ]);
      } catch (requestError) {
        console.error(
          "Unable to start conversation:",
          requestError.response?.data ||
            requestError
        );

        if (requestError.response?.status === 403) {
          setError(
            "Messaging is not available with this member."
          );
          return;
        }

        setError(
          getErrorMessage(
            requestError.response?.data
          )
        );
      }
    },
    [
      user?.id,
      openConversation,
      loadConversations,
      loadUnreadCount,
    ]
  );

  useEffect(() => {
    activeChatsRef.current =
      activeChats;
  }, [activeChats]);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    async function loadInitialData() {
      await Promise.all([
        loadConversations(),
        loadMembers(),
        loadUnreadCount(),
      ]);
    }

    loadInitialData();

    refreshTimerRef.current =
      window.setInterval(() => {
        loadConversations();
        loadUnreadCount();

        activeChatsRef.current.forEach(
          (conversation) => {
            loadMessages(
              conversation.id,
              false
            );
          }
        );
      }, 5000);

    return () => {
      if (refreshTimerRef.current) {
        window.clearInterval(
          refreshTimerRef.current
        );
      }
    };
  }, [
    user,
    loadConversations,
    loadMembers,
    loadUnreadCount,
    loadMessages,
  ]);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    const timer = window.setTimeout(
      () => {
        loadMembers(search);
      },
      300
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, [search, user, loadMembers]);

  useEffect(() => {
    function handleOpenChat(event) {
      const member =
        event.detail?.member;

      if (!member?.id) {
        return;
      }

      startConversation(member);
    }

    window.addEventListener(
      "foodkindl:open-chat",
      handleOpenChat
    );

    return () => {
      window.removeEventListener(
        "foodkindl:open-chat",
        handleOpenChat
      );
    };
  }, [startConversation]);

  useEffect(() => {
    function handleOpenConversation(event) {
      const conversation =
        event.detail?.conversation;

      if (!conversation?.id) {
        return;
      }

      openConversation(conversation);
      loadConversations();
      loadUnreadCount();
    }

    window.addEventListener(
      "foodkindl:open-conversation",
      handleOpenConversation
    );

    return () => {
      window.removeEventListener(
        "foodkindl:open-conversation",
        handleOpenConversation
      );
    };
  }, [
    openConversation,
    loadConversations,
    loadUnreadCount,
  ]);

  useEffect(() => {
    function handleOpenGroupChat(event) {
      const conversation =
        event.detail?.conversation;

      if (!conversation?.id) {
        return;
      }

      setDockOpen(true);
      openConversation(conversation);
    }

    window.addEventListener(
      "foodkindl:open-group-chat",
      handleOpenGroupChat
    );

    return () => {
      window.removeEventListener(
        "foodkindl:open-group-chat",
        handleOpenGroupChat
      );
    };
  }, [openConversation]);

  useEffect(() => {
    function handleCloseFoodGroupChat(event) {
      const listingId =
        event.detail?.listingId;

      if (!listingId) {
        return;
      }

      setActiveChats((currentChats) =>
        currentChats.filter(
          (conversation) =>
            conversation.food_listing_id !==
            listingId
        )
      );

      loadConversations();
    }

    window.addEventListener(
      "foodkindl:close-food-group-chat",
      handleCloseFoodGroupChat
    );

    return () => {
      window.removeEventListener(
        "foodkindl:close-food-group-chat",
        handleCloseFoodGroupChat
      );
    };
  }, [loadConversations]);

  function closeConversation(
    conversationId
  ) {
    setActiveChats((currentChats) =>
      currentChats.filter(
        (chat) =>
          chat.id !== conversationId
      )
    );

    setError("");
  }

  async function sendMessage(
    event,
    conversation
  ) {
    event.preventDefault();

    const conversationId =
      conversation?.id;

    if (!conversationId) {
      return;
    }

    const text =
      drafts[conversationId]?.trim();

    if (!text) {
      return;
    }

    if (
      isGroupConversation(conversation) &&
      !conversation.is_active
    ) {
      setError(
        "This group chat has expired and no longer accepts messages."
      );
      return;
    }

    if (!isGroupConversation(conversation)) {
      const otherUserId =
        conversation?.other_user?.id;

      if (!otherUserId) {
        setError(
          "The recipient could not be identified."
        );
        return;
      }

      const blockStatus =
        await getBlockStatus(otherUserId);

      if (blockStatus.interaction_blocked) {
        setBlockedConversationIds(
          (currentIds) => {
            const nextIds = new Set(currentIds);
            nextIds.add(conversationId);
            return nextIds;
          }
        );

        setError(
          "Messaging is not available with this member."
        );
        return;
      }
    }

    setSendingConversationId(
      conversationId
    );
    setError("");

    try {
      const response = await api.post(
        `/conversations/${conversationId}/messages/`,
        {
          text,
        }
      );

      setMessagesByConversation(
        (currentMessages) => ({
          ...currentMessages,
          [conversationId]: [
            ...(currentMessages[
              conversationId
            ] || []),
            response.data,
          ],
        })
      );

      setDrafts((currentDrafts) => ({
        ...currentDrafts,
        [conversationId]: "",
      }));

      await loadConversations();
    } catch (requestError) {
      console.error(
        "Unable to send message:",
        requestError.response?.data ||
          requestError
      );

      if (requestError.response?.status === 403) {
        setBlockedConversationIds(
          (currentIds) => {
            const nextIds = new Set(currentIds);
            nextIds.add(conversationId);
            return nextIds;
          }
        );

        setError(
          "Messaging is not available with this member."
        );
        return;
      }

      setError(
        getErrorMessage(
          requestError.response?.data
        )
      );
    } finally {
      setSendingConversationId(null);
    }
  }

  function handleMessageKeyDown(
    event,
    conversation
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      if (
        drafts[conversation.id]?.trim()
      ) {
        sendMessage(
          event,
          conversation
        );
      }
    }
  }

  const displayedMembers = useMemo(
    () =>
      members.filter(
        (member) =>
          member.id !== user?.id
      ),
    [members, user?.id]
  );

  if (!user) {
    return null;
  }

  return (
    <>
      <aside
        className={
          dockOpen
            ? "messaging-dock open"
            : "messaging-dock"
        }
      >
        <button
          type="button"
          className="messaging-dock-header"
          onClick={() =>
            setDockOpen(
              (currentValue) =>
                !currentValue
            )
          }
        >
          <div className="messaging-header-user">
            <MessageCircle size={21} />

            <strong>Messaging</strong>

            {unreadCount > 0 && (
              <span className="messaging-unread-badge">
                {unreadCount}
              </span>
            )}
          </div>

          <ChevronDown
            size={20}
            className={
              dockOpen
                ? "messaging-chevron open"
                : "messaging-chevron"
            }
          />
        </button>

        {dockOpen && (
          <div className="messaging-dock-body">
            <div className="messaging-search">
              <Search size={17} />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search members"
              />
            </div>

            {error && (
              <p className="messaging-error">
                {error}
              </p>
            )}

            {search.trim() ? (
              <div className="messaging-user-list">
                {displayedMembers.length ===
                0 ? (
                  <p className="messaging-empty">
                    No matching members found.
                  </p>
                ) : (
                  displayedMembers.map(
                    (member) => (
                      <button
                        type="button"
                        className="messaging-user-row"
                        key={member.id}
                        onClick={() =>
                          startConversation(
                            member
                          )
                        }
                      >
                        <UserAvatar
                          currentUser={member}
                          getUserImage={
                            getUserImage
                          }
                          getUserInitial={
                            getUserInitial
                          }
                          getUserName={
                            getUserName
                          }
                        />

                        <div className="messaging-conversation-copy">
                          <strong>
                            {getUserName(
                              member
                            )}
                          </strong>

                          <small>
                            {member.profile
                              ?.role ||
                              member.profile
                                ?.college_workplace ||
                              member.profile
                                ?.city ||
                              "Member"}
                          </small>
                        </div>
                      </button>
                    )
                  )
                )}
              </div>
            ) : (
              <div className="messaging-user-list">
                {conversations.length ===
                0 ? (
                  <p className="messaging-empty">
                    Search for a member to
                    begin a conversation.
                  </p>
                ) : (
                  conversations.map(
                    (conversation) => (
                      <button
                        type="button"
                        className="messaging-user-row"
                        key={conversation.id}
                        onClick={() =>
                          openConversation(
                            conversation
                          )
                        }
                      >
                        {isGroupConversation(
                          conversation
                        ) ? (
                          <div className="messaging-avatar-placeholder">
                            <UsersRound
                              size={20}
                            />
                          </div>
                        ) : (
                          <UserAvatar
                            currentUser={
                              conversation.other_user
                            }
                            getUserImage={
                              getUserImage
                            }
                            getUserInitial={
                              getUserInitial
                            }
                            getUserName={
                              getUserName
                            }
                          />
                        )}

                        <div className="messaging-conversation-copy">
                          <strong>
                            {getConversationTitle(
                              conversation
                            )}
                          </strong>

                          <small>
                            {conversation
                              .last_message
                              ?.text ||
                              getConversationSubtitle(
                                conversation
                              )}
                          </small>
                        </div>

                        {conversation.unread_count >
                          0 && (
                          <span className="messaging-row-count">
                            {
                              conversation.unread_count
                            }
                          </span>
                        )}
                      </button>
                    )
                  )
                )}
              </div>
            )}
          </div>
        )}
      </aside>

      <div className="chat-popup-container">
        {activeChats.map(
          (conversation) => {
            const otherUser =
              conversation.other_user;

            const groupChat =
              isGroupConversation(
                conversation
              );

            const messages =
              messagesByConversation[
                conversation.id
              ] || [];

            const isLoading =
              loadingConversationId ===
              conversation.id;

            const isSending =
              sendingConversationId ===
              conversation.id;

            const blockedChat =
              !groupChat &&
              blockedConversationIds.has(
                conversation.id
              );

            const chatDisabled =
              (
                groupChat &&
                !conversation.is_active
              ) ||
              blockedChat;

            return (
              <section
                className="chat-popup"
                key={conversation.id}
              >
                <header className="chat-popup-header">
                  <div className="chat-popup-person">
                    {groupChat ? (
                      <div className="messaging-avatar-placeholder">
                        <UsersRound
                          size={20}
                        />
                      </div>
                    ) : (
                      <UserAvatar
                        currentUser={otherUser}
                        getUserImage={
                          getUserImage
                        }
                        getUserInitial={
                          getUserInitial
                        }
                        getUserName={
                          getUserName
                        }
                      />
                    )}

                    <div>
                      <strong>
                        {getConversationTitle(
                          conversation
                        )}
                      </strong>

                      <small>
                        {getConversationSubtitle(
                          conversation
                        )}
                      </small>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      closeConversation(
                        conversation.id
                      )
                    }
                    aria-label="Close chat"
                  >
                    <X size={18} />
                  </button>
                </header>

                <div className="chat-popup-messages">
                  {isLoading &&
                  messages.length === 0 ? (
                    <p className="messaging-empty">
                      Loading messages...
                    </p>
                  ) : messages.length ===
                    0 ? (
                    <p className="messaging-empty">
                      {groupChat
                        ? "Start the food-sharing group conversation."
                        : `Start your conversation with ${getUserName(
                            otherUser
                          )}.`}
                    </p>
                  ) : (
                    messages.map(
                      (message) => {
                        const mine =
                          message.sender
                            ?.id === user.id;

                        return (
                          <div
                            className={
                              mine
                                ? "chat-message mine"
                                : "chat-message theirs"
                            }
                            key={message.id}
                          >
                            {groupChat &&
                              !mine && (
                                <strong className="chat-message-author">
                                  {getUserName(
                                    message.sender
                                  )}
                                </strong>
                              )}

                            <p>
                              {message.text}
                            </p>

                            <small>
                              {new Date(
                                message.created_at
                              ).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute:
                                    "2-digit",
                                }
                              )}
                            </small>
                          </div>
                        );
                      }
                    )
                  )}
                </div>

                {chatDisabled ? (
                  <div className="chat-expired-message">
                    {blockedChat
                      ? "Messaging is not available with this member."
                      : (
                          <>
                            This food group chat has
                            expired because the food was
                            collected.
                          </>
                        )}
                  </div>
                ) : (
                  <form
                    className="chat-popup-composer"
                    onSubmit={(event) =>
                      sendMessage(
                        event,
                        conversation
                      )
                    }
                  >
                    <textarea
                      rows={1}
                      value={
                        drafts[
                          conversation.id
                        ] || ""
                      }
                      onChange={(event) =>
                        setDrafts(
                          (
                            currentDrafts
                          ) => ({
                            ...currentDrafts,
                            [conversation.id]:
                              event.target
                                .value,
                          })
                        )
                      }
                      onKeyDown={(event) =>
                        handleMessageKeyDown(
                          event,
                          conversation
                        )
                      }
                      placeholder="Write a message..."
                      maxLength={3000}
                    />

                    <button
                      type="submit"
                      aria-label="Send message"
                      disabled={
                        isSending ||
                        !drafts[
                          conversation.id
                        ]?.trim()
                      }
                    >
                      <Send size={18} />
                    </button>
                  </form>
                )}
              </section>
            );
          }
        )}
      </div>
    </>
  );
}

function UserAvatar({
  currentUser,
  getUserImage,
  getUserInitial,
  getUserName,
}) {
  const image =
    getUserImage(currentUser);

  if (image) {
    return (
      <img
        src={image}
        alt={getUserName(currentUser)}
        className="messaging-avatar"
      />
    );
  }

  return (
    <div className="messaging-avatar-placeholder">
      {getUserInitial(currentUser)}
    </div>
  );
}