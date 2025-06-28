"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Send,
  Search,
  MessageSquare,
  User
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

interface User {
  id: string;
  username: string;
  avatar_url?: string;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: User;
  receiver?: User;
}

interface Conversation {
  user: User;
  lastMessage: Message;
  unreadCount: number;
}

export default function MessagesPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchConversations();
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedConversation && currentUser) {
      fetchMessages();
      markMessagesAsRead();
    }
  }, [selectedConversation, currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (searchQuery) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const checkUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      router.push('/');
      return;
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('id, username, avatar_url')
      .eq('id', authUser.id)
      .single();

    if (userProfile) {
      setCurrentUser(userProfile);
    }
    setLoading(false);
  };

  const fetchConversations = async () => {
    if (!currentUser) return;

    try {
      // Get all messages where user is sender or receiver
      const { data: allMessages, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(id, username, avatar_url),
          receiver:users!messages_receiver_id_fkey(id, username, avatar_url)
        `)
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group messages by conversation partner
      const conversationMap = new Map<string, Conversation>();

      allMessages?.forEach((message) => {
        const otherUser = message.sender_id === currentUser.id ? message.receiver : message.sender;
        const conversationKey = otherUser.id;

        if (!conversationMap.has(conversationKey)) {
          conversationMap.set(conversationKey, {
            user: otherUser,
            lastMessage: message,
            unreadCount: 0
          });
        }

        // Count unread messages from this user
        if (message.receiver_id === currentUser.id && !message.is_read) {
          const conversation = conversationMap.get(conversationKey)!;
          conversation.unreadCount++;
        }
      });

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchMessages = async () => {
    if (!currentUser || !selectedConversation) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(id, username, avatar_url),
          receiver:users!messages_receiver_id_fkey(id, username, avatar_url)
        `)
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedConversation.id}),and(sender_id.eq.${selectedConversation.id},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const markMessagesAsRead = async () => {
    if (!currentUser || !selectedConversation) return;

    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', selectedConversation.id)
        .eq('receiver_id', currentUser.id)
        .eq('is_read', false);

      // Refresh conversations to update unread counts
      fetchConversations();
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!currentUser || !selectedConversation || !newMessage.trim()) return;

    setSendingMessage(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert([{
          sender_id: currentUser.id,
          receiver_id: selectedConversation.id,
          content: newMessage.trim()
        }]);

      if (error) throw error;

      // Create notification for receiver
      await supabase.rpc('create_notification', {
        recipient_id: selectedConversation.id,
        notification_type: 'message',
        notification_title: 'New Message',
        notification_message: `${currentUser.username} sent you a message`,
        entity_id: currentUser.id
      });

      setNewMessage('');
      fetchMessages();
      fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, avatar_url')
        .ilike('username', `%${searchQuery}%`)
        .neq('id', currentUser?.id)
        .limit(10);

      if (error) throw error;

      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const startConversation = (user: User) => {
    setSelectedConversation(user);
    setSearchQuery('');
    setSearchResults([]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-600"></div>
          <p className="mt-4 text-gray-300">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push('/feed')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Feed
          </Button>
          <h1 className="text-2xl font-bold text-white flex items-center">
            <MessageSquare className="h-6 w-6 mr-2 text-teal-600" />
            Messages
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          {/* Conversations List */}
          <div className="lg:col-span-1">
            <Card className="bg-gray-800 border-gray-700 h-full">
              <CardHeader>
                <CardTitle className="text-white">Conversations</CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-y-auto">
                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="p-4 border-b border-gray-700">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Search Results</h3>
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => startConversation(user)}
                        className="w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback>{user.username[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="text-white text-sm">@{user.username}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Conversations */}
                {conversations.length === 0 ? (
                  <div className="p-4 text-center">
                    <MessageSquare className="h-12 w-12 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">No conversations yet</p>
                    <p className="text-gray-500 text-xs mt-1">Search for users to start messaging</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {conversations.map((conversation) => (
                      <button
                        key={conversation.user.id}
                        onClick={() => setSelectedConversation(conversation.user)}
                        className={`w-full flex items-center space-x-3 p-4 hover:bg-gray-700 transition-colors ${
                          selectedConversation?.id === conversation.user.id ? 'bg-gray-700' : ''
                        }`}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={conversation.user.avatar_url} />
                          <AvatarFallback>{conversation.user.username[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center justify-between">
                            <p className="text-white font-medium truncate">@{conversation.user.username}</p>
                            {conversation.unreadCount > 0 && (
                              <Badge className="bg-teal-600 text-white text-xs">
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <p className="text-gray-400 text-sm truncate">
                            {conversation.lastMessage.content}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {formatDistanceToNow(new Date(conversation.lastMessage.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2">
            <Card className="bg-gray-800 border-gray-700 h-full flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <CardHeader className="border-b border-gray-700">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={selectedConversation.avatar_url} />
                        <AvatarFallback>{selectedConversation.username[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-white font-medium">@{selectedConversation.username}</h3>
                        <p className="text-gray-400 text-sm">Active now</p>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Messages */}
                  <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.sender_id === currentUser?.id
                              ? 'bg-teal-600 text-white'
                              : 'bg-gray-700 text-gray-200'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.sender_id === currentUser?.id ? 'text-teal-200' : 'text-gray-400'
                          }`}>
                            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </CardContent>

                  {/* Message Input */}
                  <div className="p-4 border-t border-gray-700">
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        className="flex-1 bg-gray-700 border-gray-600 text-white"
                      />
                      <Button
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || sendingMessage}
                        className="bg-teal-600 hover:bg-teal-700 text-white"
                      >
                        {sendingMessage ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <CardContent className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-white mb-2">Select a conversation</h3>
                    <p className="text-gray-400">Choose a conversation from the list or search for users to start messaging</p>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}