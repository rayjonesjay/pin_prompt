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
  Sun
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
    if (user) {
      fetchPosts();
    }
  }, [user, searchQuery, selectedCategory, sortBy]);

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
      .select('id, username, avatar_url')
      .eq('id', authUser.id)
      .single();

    if (userProfile) {
      setUser(userProfile);
    }
  };

  const fetchPosts = async () => {
    // For now, we'll create some mock data since we don't have forum tables yet
    // In a real implementation, you'd create forum_posts and forum_replies tables
    const mockPosts: ForumPost[] = [
      {
        id: '1',
        title: 'Best practices for image generation prompts?',
        content: 'I\'m struggling to get consistent results with DALL-E. What are your go-to techniques for creating detailed, high-quality image prompts?',
        category: 'prompt-engineering',
        user_id: user?.id || '',
        replies_count: 12,
        likes_count: 8,
        is_pinned: false,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        users: {
          id: user?.id || '',
          username: 'ai_artist_pro',
          avatar_url: undefined
        }
      },
      {
        id: '2',
        title: 'Welcome to PinPrompt Forum! 📌',
        content: 'Welcome to our community forum! This is a place to discuss AI, share prompt engineering tips, get feedback on your prompts, and connect with fellow creators. Please be respectful and helpful to one another.',
        category: 'announcements',
        user_id: user?.id || '',
        replies_count: 25,
        likes_count: 45,
        is_pinned: true,
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        users: {
          id: user?.id || '',
          username: 'pinprompt_team',
          avatar_url: undefined
        }
      },
      {
        id: '3',
        title: 'GPT-4 vs Claude for creative writing prompts',
        content: 'Has anyone compared the creative writing capabilities of GPT-4 and Claude? I\'m curious about which one produces more engaging narratives.',
        category: 'llm-discussions',
        user_id: user?.id || '',
        replies_count: 7,
        likes_count: 15,
        is_pinned: false,
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        users: {
          id: user?.id || '',
          username: 'story_crafter',
          avatar_url: undefined
        }
      },
      {
        id: '4',
        title: 'Feedback on my landscape generation prompt',
        content: 'I\'ve been working on this prompt for generating fantasy landscapes: "A mystical forest clearing at dawn, ancient stone ruins covered in glowing moss, ethereal mist, cinematic lighting, highly detailed, 8k resolution". Any suggestions for improvement?',
        category: 'prompt-feedback',
        user_id: user?.id || '',
        replies_count: 3,
        likes_count: 6,
        is_pinned: false,
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        users: {
          id: user?.id || '',
          username: 'landscape_lover',
          avatar_url: undefined
        }
      }
    ];

    setLoading(false);
    setPosts(mockPosts);
  };

  const handleCreatePost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) return;

    // In a real implementation, you'd save to the database
    const newPost: ForumPost = {
      id: Date.now().toString(),
      title: newPostTitle,
      content: newPostContent,
      category: newPostCategory,
      user_id: user?.id || '',
      replies_count: 0,
      likes_count: 0,
      is_pinned: false,
      created_at: new Date().toISOString(),
      users: {
        id: user?.id || '',
        username: user?.username || 'anonymous',
        avatar_url: user?.avatar_url
      }
    };

    setPosts(prev => [newPost, ...prev]);
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDarkMode(!darkMode)}
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
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
            </div>
            
            <Button 
              onClick={() => setShowCreatePost(true)}
              className="mt-4 md:mt-0 bg-gradient-to-r from-green-600 to-green-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Post
            </Button>
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
                  <span className={`font-semibold ${darkMode ? 'text-white' : ''}`}>127</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Replies</span>
                  <span className={`font-semibold ${darkMode ? 'text-white' : ''}`}>
                    {posts.reduce((sum, post) => sum + post.replies_count, 0)}
                  </span>
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
            {showCreatePost && (
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

            {/* Posts */}
            <div className="space-y-4">
              {posts.map((post) => (
                <Card key={post.id} className={`hover:shadow-lg transition-all duration-300 ${
                  post.is_pinned ? 'border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50' : ''
                } ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} hover-lift`}>
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <Avatar className="h-10 w-10 ring-2 ring-green-200">
                        <AvatarImage src={post.users.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-green-400 to-blue-500 text-white">
                          {post.users.username[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {post.is_pinned && (
                            <Pin className="h-4 w-4 text-yellow-600" />
                          )}
                          <h3 className={`font-semibold ${darkMode ? 'text-white hover:text-green-400' : 'text-gray-900 hover:text-green-600'} cursor-pointer transition-colors`}>
                            {post.title}
                          </h3>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${
                              post.category === 'announcements' ? 'bg-yellow-100 text-yellow-800' :
                              post.category === 'prompt-engineering' ? 'bg-purple-100 text-purple-800' :
                              post.category === 'llm-discussions' ? 'bg-green-100 text-green-800' :
                              post.category === 'prompt-feedback' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {categories.find(c => c.id === post.category)?.name}
                          </Badge>
                        </div>
                        
                        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-3 line-clamp-2`}>
                          {post.content}
                        </p>
                        
                        <div className={`flex items-center justify-between text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          <div className="flex items-center space-x-4">
                            <span>by @{post.users.username}</span>
                            <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                              <Reply className="h-4 w-4 mr-1" />
                              {post.replies_count}
                            </div>
                            <div className="flex items-center">
                              <ThumbsUp className="h-4 w-4 mr-1" />
                              {post.likes_count}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {posts.length === 0 && (
              <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
                <CardContent className="p-12 text-center">
                  <MessageSquare className={`h-16 w-16 ${darkMode ? 'text-gray-600' : 'text-gray-300'} mx-auto mb-4`} />
                  <h3 className={`text-xl font-medium ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                    No posts found
                  </h3>
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-6`}>
                    Be the first to start a discussion in this category
                  </p>
                  <Button onClick={() => setShowCreatePost(true)} className="bg-gradient-to-r from-green-600 to-green-700">
                    Create First Post
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}