"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  MessageSquare, 
  Plus, 
  Search,
  TrendingUp,
  Clock,
  Users,
  Pin,
  Reply,
  ThumbsUp,
  LogIn
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

interface User {
  id: string;
  username: string;
  avatar_url?: string;
}

interface ForumPost {
  id: string;
  title: string;
  content: string;
  category: string;
  user_id: string;
  replies_count: number;
  likes_count: number;
  is_pinned: boolean;
  created_at: string;
  users: User;
}

export default function ForumPage() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'recent' | 'trending'>('recent');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState('general');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [submittingPost, setSubmittingPost] = useState(false);
  const router = useRouter();

  const categories = [
    { id: 'all', name: 'All Topics', color: 'bg-gray-100' },
    { id: 'prompt-feedback', name: 'Prompt Feedback', color: 'bg-blue-100' },
    { id: 'llm-discussions', name: 'LLM Discussions', color: 'bg-teal-100' },
    { id: 'announcements', name: 'Announcements', color: 'bg-yellow-100' },
    { id: 'prompt-engineering', name: 'Prompt Engineering', color: 'bg-purple-100' },
    { id: 'general', name: 'General', color: 'bg-gray-100' },
  ];

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [searchQuery, selectedCategory, sortBy]);

  const checkUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (authUser) {
      setIsAuthenticated(true);
      const { data: userProfile } = await supabase
        .from('users')
        .select('id, username, avatar_url')
        .eq('id', authUser.id)
        .single();

      if (userProfile) {
        setUser(userProfile);
      }
    } else {
      setIsAuthenticated(false);
    }
  };

  const fetchPosts = async () => {
    try {
      let query = supabase
        .from('forum_posts')
        .select(`
          *,
          users (
            id,
            username,
            avatar_url
          )
        `);

      // Apply search filter
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
      }

      // Apply category filter
      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      // Apply sorting
      if (sortBy === 'trending') {
        query = query.order('likes_count', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;

      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching forum posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim() || !isAuthenticated || !user) return;

    setSubmittingPost(true);
    
    try {
      const { error } = await supabase
        .from('forum_posts')
        .insert([
          {
            user_id: user.id,
            title: newPostTitle.trim(),
            content: newPostContent.trim(),
            category: newPostCategory,
            is_pinned: false,
            likes_count: 0,
            replies_count: 0,
          }
        ]);

      if (error) throw error;

      // Reset form
      setNewPostTitle('');
      setNewPostContent('');
      setNewPostCategory('general');
      setShowCreatePost(false);

      // Refresh posts
      fetchPosts();
    } catch (error: any) {
      console.error('Error creating post:', error);
      alert('Error creating post: ' + error.message);
    } finally {
      setSubmittingPost(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-600"></div>
          <p className="mt-4 text-gray-300">Loading forum...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/feed')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Feed
            </Button>
            <div className="flex items-center space-x-2">
              {!isAuthenticated && (
                <Button
                  onClick={() => router.push('/')}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center mb-2">
                <MessageSquare className="h-8 w-8 mr-3 text-teal-600" />
                Community Forum
              </h1>
              <p className="text-gray-300">
                Discuss AI, share tips, and connect with fellow creators
              </p>
              {!isAuthenticated && (
                <p className="text-sm text-teal-600 mt-2">
                  Sign in to create posts and interact with the community
                </p>
              )}
            </div>
            
            {isAuthenticated && (
              <Button 
                onClick={() => setShowCreatePost(true)}
                className="mt-4 md:mt-0 bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Post
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="mb-6 bg-gray-800 border-gray-700 hover-lift">
              <CardHeader>
                <CardTitle className="text-lg text-white">Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-teal-100 text-teal-800 border border-teal-200'
                        : 'hover:bg-gray-700 text-gray-300'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full ${category.color} inline-block mr-2`}></div>
                    {category.name}
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700 hover-lift">
              <CardHeader>
                <CardTitle className="text-lg text-white">Forum Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Total Posts</span>
                  <span className="font-semibold text-white">{posts.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Active Users</span>
                  <span className="font-semibold text-white">{new Set(posts.map(p => p.user_id)).size}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Total Replies</span>
                  <span className="font-semibold text-white">{posts.reduce((sum, post) => sum + post.replies_count, 0)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Search and Sort */}
            <div className="mb-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search forum posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700 text-white"
                />
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant={sortBy === 'recent' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('recent')}
                  className={sortBy === 'recent' ? 'bg-teal-600 hover:bg-teal-700 text-white' : ''}
                >
                  <Clock className="mr-1 h-4 w-4" />
                  Recent
                </Button>
                <Button
                  variant={sortBy === 'trending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('trending')}
                  className={sortBy === 'trending' ? 'bg-teal-600 hover:bg-teal-700 text-white' : ''}
                >
                  <TrendingUp className="mr-1 h-4 w-4" />
                  Trending
                </Button>
              </div>
            </div>

            {/* Create Post Modal */}
            {showCreatePost && isAuthenticated && (
              <Card className="mb-6 border-teal-200 bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Create New Post</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Input
                      placeholder="Post title..."
                      value={newPostTitle}
                      onChange={(e) => setNewPostTitle(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <select
                      value={newPostCategory}
                      onChange={(e) => setNewPostCategory(e.target.value)}
                      className="w-full p-2 border rounded-md bg-gray-700 border-gray-600 text-white"
                    >
                      {categories.slice(1).map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Textarea
                      placeholder="What would you like to discuss?"
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      rows={4}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      onClick={handleCreatePost} 
                      className="bg-teal-600 hover:bg-teal-700 text-white"
                      disabled={submittingPost || !newPostTitle.trim() || !newPostContent.trim()}
                    >
                      {submittingPost ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Posting...
                        </div>
                      ) : (
                        'Post'
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => setShowCreatePost(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Posts List */}
            {posts.length === 0 ? (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-12 text-center">
                  <MessageSquare className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-white mb-2">
                    {searchQuery || selectedCategory !== 'all' ? 'No posts found' : 'No posts yet'}
                  </h3>
                  <p className="text-gray-400 mb-6">
                    {searchQuery || selectedCategory !== 'all' 
                      ? 'Try adjusting your search or category filter'
                      : 'Be the first to start a discussion in the community'
                    }
                  </p>
                  {isAuthenticated ? (
                    <Button onClick={() => setShowCreatePost(true)} className="bg-teal-600 hover:bg-teal-700 text-white">
                      Create First Post
                    </Button>
                  ) : (
                    <Button onClick={() => router.push('/')} className="bg-teal-600 hover:bg-teal-700 text-white">
                      <LogIn className="mr-2 h-4 w-4" />
                      Sign In to Participate
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <Card key={post.id} className="bg-gray-800 border-gray-700 hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={post.users.avatar_url} />
                          <AvatarFallback>{post.users.username[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-lg font-semibold text-white truncate">
                              {post.title}
                            </h3>
                            {post.is_pinned && (
                              <Pin className="h-4 w-4 text-teal-500" />
                            )}
                            <Badge variant="secondary" className="text-xs">
                              {categories.find(c => c.id === post.category)?.name || post.category}
                            </Badge>
                          </div>
                          <p className="text-gray-300 mb-3 line-clamp-2">
                            {post.content}
                          </p>
                          <div className="flex items-center justify-between text-sm text-gray-400">
                            <div className="flex items-center space-x-4">
                              <span>@{post.users.username}</span>
                              <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-1">
                                <ThumbsUp className="h-4 w-4" />
                                <span>{post.likes_count}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Reply className="h-4 w-4" />
                                <span>{post.replies_count}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}