"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  Moon,
  Sun,
  Filter,
  Send,
  MoreVertical,
  Home,
  Camera
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
  const [darkMode, setDarkMode] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [newComments, setNewComments] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<string | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const router = useRouter();

  // Debounced search effect
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      if (user) {
        fetchPrompts();
      }
    }, 300); // 300ms delay

    setSearchTimeout(timeout);

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [searchQuery, modelFilter]);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchPrompts();
    }
  }, [user, sortBy]);

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const checkUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      router.push('/');
      return;
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (userProfile) {
      setUser(userProfile);
    }
  };

  const fetchPrompts = async (offset = 0) => {
    if (!user) return;

    setLoading(offset === 0);
    setLoadingMore(offset > 0);

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

    setLoading(false);
    setLoadingMore(false);
  };

  const handleLike = async (promptId: string, isLiked: boolean, promptUserId: string) => {
    if (!user) return;

    // Prevent users from liking their own posts
    if (user.id === promptUserId) {
      return;
    }

    try {
      if (isLiked) {
        // Unlike
        await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('prompt_id', promptId);

        await supabase
          .from('prompts')
          .update({ likes_count: supabase.raw('likes_count - 1') })
          .eq('id', promptId);
      } else {
        // Like
        await supabase
          .from('likes')
          .insert([{ user_id: user.id, prompt_id: promptId }]);

        await supabase
          .from('prompts')
          .update({ likes_count: supabase.raw('likes_count + 1') })
          .eq('id', promptId);
      }

      // Update local state
      setPrompts(prev => prev.map(prompt => 
        prompt.id === promptId 
          ? { 
              ...prompt, 
              is_liked: !isLiked,
              likes_count: isLiked ? prompt.likes_count - 1 : prompt.likes_count + 1
            }
          : prompt
      ));
    } catch (error) {
      console.error('Error updating like:', error);
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
  }, [loadingMore, hasMore, prompts.length]);

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

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-gray-50 via-green-50 to-yellow-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
          <p className={`mt-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading your feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-gray-50 via-green-50 to-yellow-50'}`}>
      {/* Mobile Header */}
      <div className={`lg:hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b p-4 flex items-center justify-between`}>
        <div className="flex items-center">
          <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>PinPrompt</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="relative"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatar_url} />
                <AvatarFallback>{user?.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
            </Button>
            
            {/* Profile Menu Dropdown */}
            {showProfileMenu && (
              <div className={`absolute right-0 top-full mt-2 w-64 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg shadow-lg z-50`}>
                <div className="p-4">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user?.avatar_url} />
                        <AvatarFallback>{user?.username?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <label className="absolute -bottom-1 -right-1 bg-green-600 rounded-full p-1 cursor-pointer hover:bg-green-700 transition-colors">
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
                      <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>@{user?.username}</p>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
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
        <div className={`hidden lg:block fixed inset-y-0 left-0 z-50 w-64 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r`}>
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className={`p-6 ${darkMode ? 'border-gray-700' : 'border-gray-200'} border-b`}>
              <div className="flex items-center justify-between">
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>PinPrompt</h1>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDarkMode(!darkMode)}
                >
                  {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </div>
              {user && (
                <div className="mt-4 flex items-center space-x-3">
                  <div className="relative">
                    <Avatar>
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback>{user.username[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <label className="absolute -bottom-1 -right-1 bg-green-600 rounded-full p-1 cursor-pointer hover:bg-green-700 transition-colors">
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
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>@{user.username}</p>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
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
                className="w-full justify-start"
                onClick={() => router.push('/upload')}
              >
                <Upload className="mr-3 h-4 w-4" />
                Upload PinPrompt
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => router.push('/profile')}
              >
                <User className="mr-3 h-4 w-4" />
                Your PinPrompts
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => router.push('/forum')}
              >
                <MessageSquare className="mr-3 h-4 w-4" />
                Forum
              </Button>
            </nav>

            {/* Logout Button */}
            <div className={`p-6 ${darkMode ? 'border-gray-700' : 'border-gray-200'} border-t`}>
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
                  className={`pl-10 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white'}`}
                />
              </div>

              {/* Model Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={modelFilter}
                  onChange={(e) => setModelFilter(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-md ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-700 text-white' 
                      : 'bg-white border-gray-300'
                  }`}
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
                  className={sortBy === 'recent' ? 'bg-gradient-to-r from-green-600 to-green-700' : ''}
                >
                  Recent
                </Button>
                <Button
                  variant={sortBy === 'trending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('trending')}
                  className={sortBy === 'trending' ? 'bg-gradient-to-r from-orange-500 to-yellow-500' : ''}
                >
                  <TrendingUp className="mr-1 h-4 w-4" />
                  Trending
                </Button>
                <Button
                  variant={sortBy === 'following' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('following')}
                  className={sortBy === 'following' ? 'bg-gradient-to-r from-blue-500 to-purple-500' : ''}
                >
                  Following
                </Button>
              </div>
            </div>

            {/* Feed */}
            <div className="space-y-6">
              {prompts.map((prompt) => (
                <Card key={prompt.id} className={`overflow-hidden hover:shadow-lg transition-all duration-300 border-l-4 ${
                  prompt.category === 'ai' ? 'border-l-green-500' :
                  prompt.category === 'programming' ? 'border-l-blue-500' :
                  prompt.category === 'science' ? 'border-l-purple-500' :
                  prompt.category === 'gaming' ? 'border-l-red-500' :
                  'border-l-orange-500'
                } ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white shadow-sm'}`}>
                  <CardContent className="p-6">
                    {/* User Info */}
                    <div className="flex items-center space-x-3 mb-4">
                      <Avatar className="h-10 w-10 ring-2 ring-green-200">
                        <AvatarImage src={prompt.users.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-green-400 to-blue-500 text-white">
                          {prompt.users.username[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <button
                          onClick={() => router.push(`/profile/${prompt.users.username}`)}
                          className={`font-medium ${darkMode ? 'text-white hover:text-green-400' : 'text-gray-900 hover:text-green-600'} transition-colors`}
                        >
                          @{prompt.users.username}
                        </button>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {formatDistanceToNow(new Date(prompt.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      {prompt.category && (
                        <Badge 
                          variant="secondary" 
                          className={`${
                            prompt.category === 'ai' ? 'bg-green-100 text-green-800' :
                            prompt.category === 'programming' ? 'bg-blue-100 text-blue-800' :
                            prompt.category === 'science' ? 'bg-purple-100 text-purple-800' :
                            prompt.category === 'gaming' ? 'bg-red-100 text-red-800' :
                            'bg-orange-100 text-orange-800'
                          }`}
                        >
                          {prompt.category}
                        </Badge>
                      )}
                    </div>

                    {/* Prompt Text */}
                    <div className="mb-4">
                      <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>Prompt:</h3>
                      <p className={`${darkMode ? 'text-gray-300 bg-gray-700' : 'text-gray-700 bg-gradient-to-r from-gray-50 to-green-50'} p-3 rounded-lg border-l-2 border-green-400`}>
                        {prompt.prompt_text}
                      </p>
                    </div>

                    {/* Output */}
                    {prompt.output_url && (
                      <div className="mb-4">
                        <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>Output:</h3>
                        {prompt.output_type === 'image' && (
                          <img
                            src={prompt.output_url}
                            alt="AI Generated Output"
                            className="w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity shadow-md"
                            onClick={() => window.open(prompt.output_url, '_blank')}
                          />
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
                          <div className={`${darkMode ? 'bg-gray-700' : 'bg-gradient-to-r from-gray-50 to-yellow-50'} p-4 rounded-lg border border-yellow-200`}>
                            <pre className={`whitespace-pre-wrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {prompt.output_url}
                            </pre>
                          </div>
                        )}
                        {prompt.output_type === 'audio' && (
                          <div className={`${darkMode ? 'bg-gray-700' : 'bg-gradient-to-r from-gray-50 to-blue-50'} p-4 rounded-lg border border-blue-200`}>
                            <audio controls className="w-full">
                              <source src={prompt.output_url} type="audio/mpeg" />
                              Your browser does not support the audio element.
                            </audio>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Model Info */}
                    <div className="mb-4">
                      <Badge variant="outline" className={`text-xs ${darkMode ? 'border-gray-600 text-gray-300' : 'border-gray-300'}`}>
                        {prompt.llm_model}
                      </Badge>
                    </div>

                    <Separator className={`my-4 ${darkMode ? 'bg-gray-700' : ''}`} />

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLike(prompt.id, prompt.is_liked || false, prompt.user_id)}
                          disabled={user?.id === prompt.user_id}
                          className={`${
                            user?.id === prompt.user_id 
                              ? 'opacity-50 cursor-not-allowed' 
                              : prompt.is_liked 
                                ? 'text-red-500 hover:text-red-600' 
                                : `${darkMode ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-500'}`
                          } transition-colors`}
                        >
                          <Heart className={`mr-1 h-4 w-4 ${prompt.is_liked ? 'fill-current' : ''}`} />
                          {prompt.likes_count}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleComments(prompt.id)}
                          className={`${darkMode ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-500'} transition-colors`}
                        >
                          <MessageSquare className="mr-1 h-4 w-4" />
                          {prompt.comments_count || 0}
                        </Button>
                      </div>
                      
                      {user?.id === prompt.user_id && (
                        <Badge variant="secondary" className="text-xs">
                          Your post
                        </Badge>
                      )}
                    </div>

                    {/* Comments Section */}
                    {expandedComments.has(prompt.id) && (
                      <div className="mt-4 space-y-4">
                        <Separator className={`${darkMode ? 'bg-gray-700' : ''}`} />
                        
                        {/* Comment Input */}
                        <div className="flex space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user?.avatar_url} />
                            <AvatarFallback>{user?.username?.[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 flex space-x-2">
                            <Textarea
                              placeholder="Write a comment..."
                              value={newComments[prompt.id] || ''}
                              onChange={(e) => setNewComments(prev => ({ ...prev, [prompt.id]: e.target.value }))}
                              className={`flex-1 min-h-[80px] ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                              rows={2}
                            />
                            <Button
                              size="sm"
                              onClick={() => handleCommentSubmit(prompt.id)}
                              disabled={!newComments[prompt.id]?.trim() || submittingComment === prompt.id}
                              className="bg-gradient-to-r from-green-600 to-green-700"
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
                                <AvatarFallback>{comment.users.username[0]?.toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-3`}>
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                      @{comment.users.username}
                                    </span>
                                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                    </span>
                                  </div>
                                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
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
              ))}

              {loadingMore && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                  <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading more prompts...</p>
                </div>
              )}

              {!hasMore && prompts.length > 0 && (
                <div className="text-center py-8">
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>You've reached the end!</p>
                </div>
              )}

              {prompts.length === 0 && !loading && (
                <div className="text-center py-12">
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-4`}>No prompts found.</p>
                  <Button onClick={() => router.push('/upload')} className="bg-gradient-to-r from-green-600 to-green-700">
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
      <div className={`lg:hidden fixed bottom-0 left-0 right-0 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t`}>
        <div className="flex items-center justify-around py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/feed')}
            className="flex flex-col items-center p-2"
          >
            <Home className="h-5 w-5" />
            <span className="text-xs mt-1">Feed</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/upload')}
            className="flex flex-col items-center p-2"
          >
            <Upload className="h-5 w-5" />
            <span className="text-xs mt-1">Upload</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/profile')}
            className="flex flex-col items-center p-2"
          >
            <User className="h-5 w-5" />
            <span className="text-xs mt-1">Profile</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/forum')}
            className="flex flex-col items-center p-2"
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