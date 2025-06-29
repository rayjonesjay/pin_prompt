"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import NotificationBell from '@/components/NotificationBell';
import UnreadMessageCount from '@/components/UnreadMessageCount';
import Image from 'next/image';
import { 
  Heart, 
  Search, 
  Upload, 
  User, 
  LogOut, 
  TrendingUp, 
  MessageSquare,
  Menu,
  X,
  Play,
  Pause,
  Volume2,
  Filter,
  Send,
  MoreVertical,
  Home,
  Camera,
  Bell,
  Mail,
  Edit,
  Save,
  XCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

interface User {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  followers_count: number;
  following_count: number;
}

interface Comment {
  id: string;
  user_id: string;
  prompt_id: string;
  content: string;
  created_at: string;
  users: {
    username: string;
    avatar_url?: string;
  };
}

interface Prompt {
  id: string;
  user_id: string;
  prompt_text: string;
  output_url?: string;
  output_type: 'image' | 'video' | 'text' | 'audio';
  llm_model: string;
  category?: string;
  likes_count: number;
  created_at: string;
  users: User;
  is_liked?: boolean;
  comments?: Comment[];
  comments_count?: number;
}

// Category color mapping
const getCategoryColor = (category?: string) => {
  switch (category) {
    case 'ai': return 'border-l-teal-500';
    case 'art': return 'border-l-pink-500';
    case 'biology': return 'border-l-green-500';
    case 'fashion': return 'border-l-purple-500';
    case 'food': return 'border-l-orange-500';
    case 'gaming': return 'border-l-red-500';
    case 'history': return 'border-l-amber-500';
    case 'math': return 'border-l-indigo-500';
    case 'memes': return 'border-l-yellow-500';
    case 'programming': return 'border-l-blue-500';
    case 'science': return 'border-l-cyan-500';
    case 'sports': return 'border-l-emerald-500';
    default: return 'border-l-gray-400';
  }
};

const getCategoryBadgeColor = (category?: string) => {
  switch (category) {
    case 'ai': return 'bg-teal-100 text-teal-800';
    case 'art': return 'bg-pink-100 text-pink-800';
    case 'biology': return 'bg-green-100 text-green-800';
    case 'fashion': return 'bg-purple-100 text-purple-800';
    case 'food': return 'bg-orange-100 text-orange-800';
    case 'gaming': return 'bg-red-100 text-red-800';
    case 'history': return 'bg-amber-100 text-amber-800';
    case 'math': return 'bg-indigo-100 text-indigo-800';
    case 'memes': return 'bg-yellow-100 text-yellow-800';
    case 'programming': return 'bg-blue-100 text-blue-800';
    case 'science': return 'bg-cyan-100 text-cyan-800';
    case 'sports': return 'bg-emerald-100 text-emerald-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export default function FeedPage() {
  const [user, setUser] = useState<User | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'trending' | 'following'>('recent');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [newComments, setNewComments] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<string | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [likingPrompts, setLikingPrompts] = useState<Set<string>>(new Set());
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{
    thoughts: string;
    prompt: string;
    category: string;
  }>({ thoughts: '', prompt: '', category: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const router = useRouter();

  const categories = ['ai', 'art', 'biology', 'fashion', 'food', 'gaming', 'general', 'history', 'math', 'memes', 'programming', 'science', 'sports'];

  const checkUser = useCallback(async () => {
    try {
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Auth error:', error);
        router.push('/');
        return;
      }
      
      if (!authUser) {
        router.push('/');
        return;
      }

      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        router.push('/');
        return;
      }

      if (userProfile) {
        setUser(userProfile);
      }
    } catch (error) {
      console.error('Error checking user:', error);
      router.push('/');
    }
  }, [router]);

  const fetchPrompts = useCallback(async (offset = 0) => {
    if (!user) return;

    setLoading(offset === 0);
    setLoadingMore(offset > 0);

    try {
      let query = supabase
        .from('prompts')
        .select(`
          *,
          users (
            id,
            username,
            avatar_url,
            followers_count,
            following_count
          )
        `)
        .range(offset, offset + 9);

      // Apply search filter
      if (searchQuery) {
        query = query.or(`prompt_text.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`);
      }

      // Apply model filter
      if (modelFilter) {
        query = query.ilike('llm_model', `%${modelFilter}%`);
      }

      // Apply sorting
      switch (sortBy) {
        case 'trending':
          query = query.order('likes_count', { ascending: false });
          break;
        case 'following':
          // This would need a more complex query with joins for followed users
          query = query.order('created_at', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching prompts:', error);
        return;
      }

      // Check which prompts are liked by current user
      if (data && data.length > 0) {
        const promptIds = data.map(p => p.id);
        const { data: likes } = await supabase
          .from('likes')
          .select('prompt_id')
          .eq('user_id', user.id)
          .in('prompt_id', promptIds);

        const likedPromptIds = new Set(likes?.map(l => l.prompt_id) || []);
        
        const promptsWithLikes = data.map(prompt => ({
          ...prompt,
          is_liked: likedPromptIds.has(prompt.id),
          comments: [],
          comments_count: 0
        }));

        if (offset === 0) {
          setPrompts(promptsWithLikes);
        } else {
          setPrompts(prev => [...prev, ...promptsWithLikes]);
        }

        setHasMore(data.length === 10);
      } else {
        if (offset === 0) {
          setPrompts([]);
        }
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error in fetchPrompts:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user, searchQuery, modelFilter, sortBy]);

  // Debounced search effect
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const timeout = setTimeout(() => {
      if (user) {
        fetchPrompts();
      }
    }, 300); // 300ms delay

    searchTimeoutRef.current = timeout;

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [searchQuery, modelFilter, fetchPrompts, user]);

  useEffect(() => {
    checkUser();
  }, [checkUser]);

  useEffect(() => {
    if (user) {
      fetchPrompts();
    }
  }, [user, sortBy, fetchPrompts]);

  const handleLike = async (promptId: string, isLiked: boolean, promptUserId: string) => {
    if (!user || likingPrompts.has(promptId)) return;

    setLikingPrompts(prev => new Set(prev).add(promptId));

    try {
      if (isLiked) {
        // Unlike
        const { error: deleteError } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('prompt_id', promptId);

        if (deleteError) throw deleteError;

        // Try to use the RPC function first
        const { error: rpcError } = await supabase.rpc('decrement_likes', {
          prompt_id: promptId
        });

        if (rpcError) {
          // Fallback to direct update if RPC fails
          console.warn('RPC decrement_likes failed, using direct update:', rpcError);
          const currentPrompt = prompts.find(p => p.id === promptId);
          const currentLikesCount = currentPrompt?.likes_count ?? 0;
          const { error: updateError } = await supabase
            .from('prompts')
            .update({ likes_count: Math.max(0, currentLikesCount - 1) })
            .eq('id', promptId);

          if (updateError) throw updateError;
        }
      } else {
        // Like
        const { error: insertError } = await supabase
          .from('likes')
          .insert([{ user_id: user.id, prompt_id: promptId }]);

        if (insertError) throw insertError;

        // Try to use the RPC function first
        const { error: rpcError } = await supabase.rpc('increment_likes', {
          prompt_id: promptId
        });

        if (rpcError) {
          // Fallback to direct update if RPC fails
          console.warn('RPC increment_likes failed, using direct update:', rpcError);
          const currentPrompt = prompts.find(p => p.id === promptId);
          const currentLikesCount = currentPrompt?.likes_count ?? 0;
          const { error: updateError } = await supabase
            .from('prompts')
            .update({ likes_count: currentLikesCount + 1 })
            .eq('id', promptId);

          if (updateError) throw updateError;
        }

        // Create notification for prompt owner (if not liking own post)
        if (promptUserId !== user.id) {
          await supabase.rpc('create_notification', {
            recipient_id: promptUserId,
            notification_type: 'like',
            notification_title: 'New Like',
            notification_message: `${user.username} liked your prompt`,
            entity_id: promptId
          });
        }
      }

      // Update local state
      setPrompts(prev => prev.map(prompt => 
        prompt.id === promptId 
          ? { 
              ...prompt, 
              is_liked: !isLiked,
              likes_count: isLiked ? Math.max(0, prompt.likes_count - 1) : prompt.likes_count + 1
            }
          : prompt
      ));
    } catch (error) {
      console.error('Error updating like:', error);
    } finally {
      setLikingPrompts(prev => {
        const newSet = new Set(prev);
        newSet.delete(promptId);
        return newSet;
      });
    }
  };

  const toggleComments = (promptId: string) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(promptId)) {
      newExpanded.delete(promptId);
    } else {
      newExpanded.add(promptId);
    }
    setExpandedComments(newExpanded);
  };

  const handleCommentSubmit = async (promptId: string) => {
    const content = newComments[promptId]?.trim();
    if (!content || !user) return;

    setSubmittingComment(promptId);
    
    try {
      // In a real implementation, you'd save to a comments table
      // For now, we'll just simulate the comment
      const newComment: Comment = {
        id: Date.now().toString(),
        user_id: user.id,
        prompt_id: promptId,
        content,
        created_at: new Date().toISOString(),
        users: {
          username: user.username,
          avatar_url: user.avatar_url
        }
      };

      // Update local state
      setPrompts(prev => prev.map(prompt => 
        prompt.id === promptId 
          ? { 
              ...prompt, 
              comments: [...(prompt.comments || []), newComment],
              comments_count: (prompt.comments_count || 0) + 1
            }
          : prompt
      ));

      // Clear the comment input
      setNewComments(prev => ({ ...prev, [promptId]: '' }));
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmittingComment(null);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('outputs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('outputs')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: data.publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setUser(prev => prev ? { ...prev, avatar_url: data.publicUrl } : null);
    } catch (error) {
      console.error('Error uploading avatar:', error);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchPrompts(prompts.length);
    }
  }, [loadingMore, hasMore, prompts.length, fetchPrompts]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop !== document.documentElement.offsetHeight || loadingMore) {
        return;
      }
      loadMore();
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore, loadingMore]);

  // Get unique models for filter dropdown
  const availableModels = useMemo(() => {
    const models = new Set(prompts.map(p => p.llm_model));
    return Array.from(models).sort();
  }, [prompts]);

  // Helper function to parse prompt text and extract thoughts vs actual prompt
  const parsePromptText = (promptText: string) => {
    if (promptText.includes('--- AI Prompt ---')) {
      const parts = promptText.split('--- AI Prompt ---');
      return {
        thoughts: parts[0].trim(),
        prompt: parts[1].trim()
      };
    }
    return {
      thoughts: '',
      prompt: promptText
    };
  };

  // Handle edit prompt
  const handleEditPrompt = (prompt: Prompt) => {
    const parsed = parsePromptText(prompt.prompt_text);
    setEditFormData({
      thoughts: parsed.thoughts,
      prompt: parsed.prompt,
      category: prompt.category || ''
    });
    setEditingPrompt(prompt.id);
  };

  // Handle save edit
  const handleSaveEdit = async (promptId: string) => {
    if (!user) return;

    setSavingEdit(true);
    try {
      // Combine thoughts and prompt like in upload
      const finalPromptText = editFormData.thoughts.trim() 
        ? `${editFormData.thoughts.trim()}\n\n--- AI Prompt ---\n${editFormData.prompt}`
        : editFormData.prompt;

      const { error } = await supabase
        .from('prompts')
        .update({
          prompt_text: finalPromptText,
          category: editFormData.category === 'none' ? null : editFormData.category
        })
        .eq('id', promptId);

      if (error) throw error;

      // Update local state
      setPrompts(prev => prev.map(prompt => 
        prompt.id === promptId 
          ? { 
              ...prompt, 
              prompt_text: finalPromptText,
              category: editFormData.category === 'none' ? null : editFormData.category
            }
          : prompt
      ));

      setEditingPrompt(null);
    } catch (error) {
      console.error('Error updating prompt:', error);
    } finally {
      setSavingEdit(false);
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingPrompt(null);
    setEditFormData({ thoughts: '', prompt: '', category: '' });
  };

  // Word count helper
  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-700"></div>
          <p className="mt-4 text-gray-600">Loading your feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-gray-200 border-b p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center">
          <h1 className="text-xl font-bold text-gray-900">PinPrompt</h1>
        </div>
        <div className="flex items-center space-x-2">
          <NotificationBell user={user} />
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/messages')}
              className="text-gray-600 hover:text-teal-700"
            >
              <Mail className="h-5 w-5" />
              <UnreadMessageCount user={user} />
            </Button>
          </div>
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="relative"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatar_url} />
                <AvatarFallback className="bg-teal-100 text-teal-800">{user?.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
            </Button>
            
            {/* Profile Menu Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="p-4">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user?.avatar_url} />
                        <AvatarFallback className="bg-teal-100 text-teal-800">{user?.username?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <label className="absolute -bottom-1 -right-1 bg-teal-700 rounded-full p-1 cursor-pointer hover:bg-teal-800 transition-colors">
                        <Camera className="h-3 w-3 text-white" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleAvatarUpload(file);
                          }}
                        />
                      </label>
                      {uploadingAvatar && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">@{user?.username}</p>
                      <p className="text-sm text-gray-500">
                        {user?.followers_count} followers
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block fixed inset-y-0 left-0 z-50 w-64 bg-white border-gray-200 border-r shadow-sm">
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="p-6 border-gray-200 border-b">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">PinPrompt</h1>
              </div>
              {user && (
                <div className="mt-4 flex items-center space-x-3">
                  <div className="relative">
                    <Avatar>
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="bg-teal-100 text-teal-800">{user.username[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <label className="absolute -bottom-1 -right-1 bg-teal-700 rounded-full p-1 cursor-pointer hover:bg-teal-800 transition-colors">
                      <Camera className="h-3 w-3 text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleAvatarUpload(file);
                        }}
                      />
                    </label>
                    {uploadingAvatar && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">@{user.username}</p>
                    <p className="text-sm text-gray-500">
                      {user.followers_count} followers
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-6 space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start text-gray-700 hover:text-teal-700 hover:bg-teal-50"
                onClick={() => router.push('/upload')}
              >
                <Upload className="mr-3 h-4 w-4" />
                Upload PinPrompt
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-gray-700 hover:text-teal-700 hover:bg-teal-50"
                onClick={() => router.push('/profile')}
              >
                <User className="mr-3 h-4 w-4" />
                Your PinPrompts
              </Button>
              <div className="relative">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-gray-700 hover:text-teal-700 hover:bg-teal-50"
                  onClick={() => router.push('/messages')}
                >
                  <Mail className="mr-3 h-4 w-4" />
                  Messages
                  <UnreadMessageCount user={user} />
                </Button>
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start text-gray-700 hover:text-teal-700 hover:bg-teal-50"
                onClick={() => router.push('/notifications')}
              >
                <Bell className="mr-3 h-4 w-4" />
                Notifications
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-gray-700 hover:text-teal-700 hover:bg-teal-50"
                onClick={() => router.push('/forum')}
              >
                <MessageSquare className="mr-3 h-4 w-4" />
                Forum
              </Button>
            </nav>

            {/* Logout Button */}
            <div className="p-6 border-gray-200 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 lg:ml-64">
          <div className="max-w-2xl mx-auto p-6 pb-20 lg:pb-6">
            {/* Search and Filter */}
            <div className="mb-8 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search prompts, categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white border-gray-300 text-gray-900 focus:border-teal-700 focus:ring-teal-700"
                />
              </div>

              {/* Model Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={modelFilter}
                  onChange={(e) => setModelFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-md bg-white border-gray-300 text-gray-900 focus:border-teal-700 focus:ring-teal-700"
                >
                  <option value="">All Models</option>
                  {availableModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant={sortBy === 'recent' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('recent')}
                  className={sortBy === 'recent' ? 'bg-teal-700 hover:bg-teal-800 text-white' : 'text-gray-700 hover:text-teal-700 hover:border-teal-400'}
                >
                  Recent
                </Button>
                <Button
                  variant={sortBy === 'trending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('trending')}
                  className={sortBy === 'trending' ? 'bg-teal-700 hover:bg-teal-800 text-white' : 'text-gray-700 hover:text-teal-700 hover:border-teal-400'}
                >
                  <TrendingUp className="mr-1 h-4 w-4" />
                  Trending
                </Button>
                <Button
                  variant={sortBy === 'following' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('following')}
                  className={sortBy === 'following' ? 'bg-teal-700 hover:bg-teal-800 text-white' : 'text-gray-700 hover:text-teal-700 hover:border-teal-400'}
                >
                  Following
                </Button>
              </div>
            </div>

            {/* Feed */}
            <div className="space-y-6">
              {prompts.map((prompt) => {
                const parsed = parsePromptText(prompt.prompt_text);
                const isEditing = editingPrompt === prompt.id;
                const isOwnPost = user?.id === prompt.user_id;

                return (
                  <Card key={prompt.id} className={`overflow-hidden hover:shadow-lg transition-all duration-300 border-l-4 ${getCategoryColor(prompt.category)} bg-white border-gray-200`}>
                    <CardContent className="p-6">
                      {/* User Info */}
                      <div className="flex items-center space-x-3 mb-4">
                        <Avatar className="h-10 w-10 ring-2 ring-teal-200">
                          <AvatarImage src={prompt.users.avatar_url} />
                          <AvatarFallback className="bg-teal-100 text-teal-800">
                            {prompt.users.username[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <button
                            onClick={() => router.push(`/profile/${prompt.users.username}`)}
                            className="font-medium text-gray-900 hover:text-teal-700 transition-colors cursor-pointer"
                          >
                            @{prompt.users.username}
                          </button>
                          <p className="text-sm text-gray-500">
                            {formatDistanceToNow(new Date(prompt.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {prompt.category && (
                            <Badge 
                              variant="secondary" 
                              className={getCategoryBadgeColor(prompt.category)}
                            >
                              {prompt.category}
                            </Badge>
                          )}
                          {isOwnPost && !isEditing && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditPrompt(prompt)}
                              className="text-gray-500 hover:text-teal-600"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {isEditing ? (
                        /* Edit Form */
                        <div className="space-y-4 mb-4">
                          {/* Edit Thoughts */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Your Thoughts (Optional)</label>
                            <Textarea
                              value={editFormData.thoughts}
                              onChange={(e) => {
                                const words = getWordCount(e.target.value);
                                if (words <= 200) {
                                  setEditFormData(prev => ({ ...prev, thoughts: e.target.value }));
                                }
                              }}
                              placeholder="Share your thoughts about this creation..."
                              rows={2}
                              className="resize-none bg-white border-gray-300 text-gray-900 focus:ring-teal-500 focus:border-teal-500"
                            />
                            <p className="text-xs text-gray-500 text-right">
                              {getWordCount(editFormData.thoughts)}/200 words
                            </p>
                          </div>

                          {/* Edit Prompt */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">AI Prompt *</label>
                            <Textarea
                              value={editFormData.prompt}
                              onChange={(e) => {
                                const words = getWordCount(e.target.value);
                                if (words <= 200) {
                                  setEditFormData(prev => ({ ...prev, prompt: e.target.value }));
                                }
                              }}
                              placeholder="Enter the prompt you used..."
                              rows={3}
                              className="resize-none bg-white border-gray-300 text-gray-900 focus:ring-teal-500 focus:border-teal-500"
                            />
                            <p className="text-xs text-gray-500 text-right">
                              {getWordCount(editFormData.prompt)}/200 words
                            </p>
                          </div>

                          {/* Edit Category */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Category</label>
                            <Select 
                              value={editFormData.category} 
                              onValueChange={(value) => setEditFormData(prev => ({ ...prev, category: value }))}
                            >
                              <SelectTrigger className="bg-white border-gray-300 text-gray-900 focus:ring-teal-500 focus:border-teal-500">
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-gray-300">
                                <SelectItem value="none">No category</SelectItem>
                                {categories.map((cat) => (
                                  <SelectItem key={cat} value={cat}>
                                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Edit Actions */}
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => handleSaveEdit(prompt.id)}
                              disabled={savingEdit || !editFormData.prompt.trim()}
                              className="bg-teal-600 hover:bg-teal-700 text-white"
                              size="sm"
                            >
                              {savingEdit ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                              ) : (
                                <Save className="h-4 w-4 mr-1" />
                              )}
                              Save
                            </Button>
                            <Button
                              onClick={handleCancelEdit}
                              variant="outline"
                              size="sm"
                              disabled={savingEdit}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* Display Mode */
                        <div className="mb-4">
                          {/* User Thoughts */}
                          {parsed.thoughts && (
                            <div className="mb-4">
                              <h3 className="font-medium text-gray-900 mb-2">Thoughts:</h3>
                              <p className="text-gray-700 bg-blue-50 p-3 rounded-lg border-l-2 border-blue-400">
                                {parsed.thoughts}
                              </p>
                            </div>
                          )}

                          {/* Prompt Text */}
                          <div>
                            <h3 className="font-medium text-gray-900 mb-2">Prompt:</h3>
                            <p className="text-gray-700 bg-gray-50 p-3 rounded-lg border-l-2 border-teal-500">
                              {parsed.prompt}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Output */}
                      {prompt.output_url && !isEditing && (
                        <div className="mb-4">
                          <h3 className="font-medium text-gray-900 mb-2">Output:</h3>
                          {prompt.output_type === 'image' && (
                            <div className="relative w-full h-96">
                              <Image
                                src={prompt.output_url}
                                alt="AI Generated Output"
                                fill
                                className="rounded-lg cursor-pointer hover:opacity-90 transition-opacity shadow-md object-cover"
                                onClick={() => window.open(prompt.output_url, '_blank')}
                              />
                            </div>
                          )}
                          {prompt.output_type === 'video' && (
                            <video
                              controls
                              className="w-full rounded-lg shadow-md"
                              poster={prompt.output_url}
                            >
                              <source src={prompt.output_url} type="video/mp4" />
                              Your browser does not support the video tag.
                            </video>
                          )}
                          {prompt.output_type === 'text' && (
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                              <pre className="whitespace-pre-wrap text-sm text-gray-700">
                                {prompt.output_url}
                              </pre>
                            </div>
                          )}
                          {prompt.output_type === 'audio' && (
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                              <audio controls className="w-full">
                                <source src={prompt.output_url} type="audio/mpeg" />
                                Your browser does not support the audio element.
                              </audio>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Model Info */}
                      {!isEditing && (
                        <div className="mb-4">
                          <Badge variant="outline" className="text-xs border-gray-300 text-gray-600">
                            {prompt.llm_model}
                          </Badge>
                        </div>
                      )}

                      {!isEditing && <Separator className="my-4 bg-gray-200" />}

                      {/* Actions */}
                      {!isEditing && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleLike(prompt.id, prompt.is_liked || false, prompt.user_id)}
                              disabled={likingPrompts.has(prompt.id)}
                              className={`${
                                prompt.is_liked 
                                  ? 'text-red-500 hover:text-red-600' 
                                  : 'text-gray-500 hover:text-red-400'
                              } transition-colors`}
                            >
                              {likingPrompts.has(prompt.id) ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-1"></div>
                              ) : (
                                <Heart className={`mr-1 h-4 w-4 ${prompt.is_liked ? 'fill-current' : ''}`} />
                              )}
                              {prompt.likes_count}
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleComments(prompt.id)}
                              className="text-gray-500 hover:text-blue-400 transition-colors"
                            >
                              <MessageSquare className="mr-1 h-4 w-4" />
                              {prompt.comments_count || 0}
                            </Button>
                          </div>
                          
                          {isOwnPost && (
                            <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                              Your post
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Comments Section */}
                      {expandedComments.has(prompt.id) && !isEditing && (
                        <div className="mt-4 space-y-4">
                          <Separator className="bg-gray-200" />
                          
                          {/* Comment Input */}
                          <div className="flex space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user?.avatar_url} />
                              <AvatarFallback className="bg-teal-100 text-teal-800">{user?.username?.[0]?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 flex space-x-2">
                              <Textarea
                                placeholder="Write a comment..."
                                value={newComments[prompt.id] || ''}
                                onChange={(e) => setNewComments(prev => ({ ...prev, [prompt.id]: e.target.value }))}
                                className="flex-1 min-h-[80px] bg-white border-gray-300 text-gray-900 focus:border-teal-700 focus:ring-teal-700"
                                rows={2}
                              />
                              <Button
                                size="sm"
                                onClick={() => handleCommentSubmit(prompt.id)}
                                disabled={!newComments[prompt.id]?.trim() || submittingComment === prompt.id}
                                className="bg-teal-700 hover:bg-teal-800 text-white"
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Comments List */}
                          <div className="space-y-3">
                            {prompt.comments?.map((comment) => (
                              <div key={comment.id} className="flex space-x-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={comment.users.avatar_url} />
                                  <AvatarFallback className="bg-teal-100 text-teal-800">{comment.users.username[0]?.toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <div className="bg-gray-50 rounded-lg p-3">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <span className="font-medium text-sm text-gray-900">
                                        @{comment.users.username}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-700">
                                      {comment.content}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              {loadingMore && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-700 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading more prompts...</p>
                </div>
              )}

              {!hasMore && prompts.length > 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">You&apos;ve reached the end!</p>
                </div>
              )}

              {prompts.length === 0 && !loading && (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">No prompts found.</p>
                  <Button onClick={() => router.push('/upload')} className="bg-teal-700 hover:bg-teal-800 text-white">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload your first prompt
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-gray-200 border-t shadow-lg">
        <div className="flex items-center justify-around py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/feed')}
            className="flex flex-col items-center p-2 text-teal-700"
          >
            <Home className="h-5 w-5" />
            <span className="text-xs mt-1">Feed</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/upload')}
            className="flex flex-col items-center p-2 text-gray-600 hover:text-teal-700"
          >
            <Upload className="h-5 w-5" />
            <span className="text-xs mt-1">Upload</span>
          </Button>
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/messages')}
              className="flex flex-col items-center p-2 text-gray-600 hover:text-teal-700"
            >
              <Mail className="h-5 w-5" />
              <span className="text-xs mt-1">Messages</span>
              <UnreadMessageCount user={user} />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/profile')}
            className="flex flex-col items-center p-2 text-gray-600 hover:text-teal-700"
          >
            <User className="h-5 w-5" />
            <span className="text-xs mt-1">Profile</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/forum')}
            className="flex flex-col items-center p-2 text-gray-600 hover:text-teal-700"
          >
            <MessageSquare className="h-5 w-5" />
            <span className="text-xs mt-1">Forum</span>
          </Button>
        </div>
      </div>

      {/* Click outside to close profile menu */}
      {showProfileMenu && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setShowProfileMenu(false)}
        />
      )}
    </div>
  );
}