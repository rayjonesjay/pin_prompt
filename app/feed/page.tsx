"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Volume2
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
}

export default function FeedPage() {
  const [user, setUser] = useState<User | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'trending' | 'following'>('recent');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchPrompts();
    }
  }, [user, sortBy, searchQuery]);

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
      query = query.or(`prompt_text.ilike.%${searchQuery}%,llm_model.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`);
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
        is_liked: likedPromptIds.has(prompt.id)
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

  const handleLike = async (promptId: string, isLiked: boolean) => {
    if (!user) return;

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
          <p className="mt-4 text-gray-600">Loading your feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="ml-2 text-xl font-bold text-gray-900">PinPrompt</h1>
        </div>
        <Avatar className="h-8 w-8">
          <AvatarImage src={user?.avatar_url} />
          <AvatarFallback>{user?.username?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">PinPrompt</h1>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              {user && (
                <div className="mt-4 flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>{user.username[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
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
                className="W-full justify-start"
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
            <div className="p-6 border-t border-gray-200">
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

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 lg:ml-0">
          <div className="max-w-2xl mx-auto p-6">
            {/* Search and Filter */}
            <div className="mb-8 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search prompts, models, or categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant={sortBy === 'recent' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('recent')}
                >
                  Recent
                </Button>
                <Button
                  variant={sortBy === 'trending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('trending')}
                >
                  <TrendingUp className="mr-1 h-4 w-4" />
                  Trending
                </Button>
                <Button
                  variant={sortBy === 'following' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('following')}
                >
                  Following
                </Button>
              </div>
            </div>

            {/* Feed */}
            <div className="space-y-6">
              {prompts.map((prompt) => (
                <Card key={prompt.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    {/* User Info */}
                    <div className="flex items-center space-x-3 mb-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={prompt.users.avatar_url} />
                        <AvatarFallback>{prompt.users.username[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <button
                          onClick={() => router.push(`/profile/${prompt.users.username}`)}
                          className="font-medium text-gray-900 hover:text-green-600 transition-colors"
                        >
                          @{prompt.users.username}
                        </button>
                        <p className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(prompt.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      {prompt.category && (
                        <Badge variant="secondary">{prompt.category}</Badge>
                      )}
                    </div>

                    {/* Prompt Text */}
                    <div className="mb-4">
                      <h3 className="font-medium text-gray-900 mb-2">Prompt:</h3>
                      <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                        {prompt.prompt_text}
                      </p>
                    </div>

                    {/* Output */}
                    {prompt.output_url && (
                      <div className="mb-4">
                        <h3 className="font-medium text-gray-900 mb-2">Output:</h3>
                        {prompt.output_type === 'image' && (
                          <img
                            src={prompt.output_url}
                            alt="AI Generated Output"
                            className="w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(prompt.output_url, '_blank')}
                          />
                        )}
                        {prompt.output_type === 'video' && (
                          <video
                            controls
                            className="w-full rounded-lg"
                            poster={prompt.output_url}
                          >
                            <source src={prompt.output_url} type="video/mp4" />
                            Your browser does not support the video tag.
                          </video>
                        )}
                        {prompt.output_type === 'text' && (
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <pre className="whitespace-pre-wrap text-sm text-gray-700">
                              {prompt.output_url}
                            </pre>
                          </div>
                        )}
                        {prompt.output_type === 'audio' && (
                          <div className="bg-gray-50 p-4 rounded-lg">
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
                      <Badge variant="outline" className="text-xs">
                        {prompt.llm_model}
                      </Badge>
                    </div>

                    <Separator className="my-4" />

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLike(prompt.id, prompt.is_liked || false)}
                        className={`${prompt.is_liked ? 'text-red-500 hover:text-red-600' : 'text-gray-500 hover:text-red-500'} transition-colors`}
                      >
                        <Heart className={`mr-1 h-4 w-4 ${prompt.is_liked ? 'fill-current' : ''}`} />
                        {prompt.likes_count}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {loadingMore && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                  <p className="mt-2 text-gray-500">Loading more prompts...</p>
                </div>
              )}

              {!hasMore && prompts.length > 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">You've reached the end!</p>
                </div>
              )}

              {prompts.length === 0 && !loading && (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">No prompts found.</p>
                  <Button onClick={() => router.push('/upload')}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload your first prompt
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}