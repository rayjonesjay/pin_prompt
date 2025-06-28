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
  Moon,
  Sun,
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
  const [darkMode, setDarkMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  const categories = [
    { id: 'all', name: 'All Topics', color: 'bg-gray-100' },
    { id: 'prompt-feedback', name: 'Prompt Feedback', color: 'bg-blue-100' },
    { id: 'llm-discussions', name: 'LLM Discussions', color: 'bg-green-100' },
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
    // Since we don't have forum tables yet, we'll show empty state
    // In a real implementation, you'd query forum_posts table
    setLoading(false);
    setPosts([]);
  };

  const handleCreatePost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim() || !isAuthenticated) return;

    // In a real implementation, you'd save to the database
    // For now, we'll just show a message that forum functionality needs database setup
    alert('Forum functionality requires database setup. Please create forum_posts and forum_replies tables.');
    
    setNewPostTitle('');
    setNewPostContent('');
    setNewPostCategory('general');
    setShowCreatePost(false);
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-gray-50 via-green-50 to-yellow-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
          <p className={`mt-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading forum...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-gray-50 via-green-50 to-yellow-50'}`}>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDarkMode(!darkMode)}
              >
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              {!isAuthenticated && (
                <Button
                  onClick={() => router.push('/')}
                  className="bg-gradient-to-r from-green-600 to-green-700"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} flex items-center mb-2`}>
                <MessageSquare className="h-8 w-8 mr-3 text-green-600" />
                Community Forum
              </h1>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Discuss AI, share tips, and connect with fellow creators
              </p>
              {!isAuthenticated && (
                <p className={`text-sm ${darkMode ? 'text-yellow-400' : 'text-orange-600'} mt-2`}>
                  Sign in to create posts and interact with the community
                </p>
              )}
            </div>
            
            {isAuthenticated && (
              <Button 
                onClick={() => setShowCreatePost(true)}
                className="mt-4 md:mt-0 bg-gradient-to-r from-green-600 to-green-700"
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
            <Card className={`mb-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} hover-lift`}>
              <CardHeader>
                <CardTitle className={`text-lg ${darkMode ? 'text-white' : ''}`}>Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : `${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100'}`
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full ${category.color} inline-block mr-2`}></div>
                    {category.name}
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} hover-lift`}>
              <CardHeader>
                <CardTitle className={`text-lg ${darkMode ? 'text-white' : ''}`}>Forum Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Posts</span>
                  <span className={`font-semibold ${darkMode ? 'text-white' : ''}`}>{posts.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Active Users</span>
                  <span className={`font-semibold ${darkMode ? 'text-white' : ''}`}>0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Replies</span>
                  <span className={`font-semibold ${darkMode ? 'text-white' : ''}`}>0</span>
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
                  className={`pl-10 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white'}`}
                />
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant={sortBy === 'recent' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('recent')}
                  className={sortBy === 'recent' ? 'bg-gradient-to-r from-green-600 to-green-700' : ''}
                >
                  <Clock className="mr-1 h-4 w-4" />
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
              </div>
            </div>

            {/* Create Post Modal */}
            {showCreatePost && isAuthenticated && (
              <Card className={`mb-6 border-green-200 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
                <CardHeader>
                  <CardTitle className={`${darkMode ? 'text-white' : ''}`}>Create New Post</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Input
                      placeholder="Post title..."
                      value={newPostTitle}
                      onChange={(e) => setNewPostTitle(e.target.value)}
                      className={`${darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                    />
                  </div>
                  <div>
                    <select
                      value={newPostCategory}
                      onChange={(e) => setNewPostCategory(e.target.value)}
                      className={`w-full p-2 border rounded-md ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'border-gray-300'
                      }`}
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
                      className={`${darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={handleCreatePost} className="bg-gradient-to-r from-green-600 to-green-700">Post</Button>
                    <Button variant="outline" onClick={() => setShowCreatePost(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
              <CardContent className="p-12 text-center">
                <MessageSquare className={`h-16 w-16 ${darkMode ? 'text-gray-600' : 'text-gray-300'} mx-auto mb-4`} />
                <h3 className={`text-xl font-medium ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                  Forum Coming Soon
                </h3>
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-6`}>
                  The forum feature is being developed. Database tables for forum posts and replies need to be created.
                </p>
                {isAuthenticated ? (
                  <Button onClick={() => setShowCreatePost(true)} className="bg-gradient-to-r from-green-600 to-green-700">
                    Create First Post
                  </Button>
                ) : (
                  <Button onClick={() => router.push('/')} className="bg-gradient-to-r from-green-600 to-green-700">
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In to Participate
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}