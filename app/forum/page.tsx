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
  LogIn,
  Send,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

interface User {
  id: string;
  username: string;
  avatar_url?: string;
}

interface ForumComment {
  id: string;
  user_id: string;
  post_id: string;
  content: string;
  created_at: string;
  users: User;
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
  is_liked?: boolean;
  comments?: ForumComment[];
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
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [newComments, setNewComments] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<string | null>(null);
  const [likingPosts, setLikingPosts] = useState<Set<string>>(new Set());
  const [loadingComments, setLoadingComments] = useState<Set<string>>(new Set());
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

      // Check which posts are liked by current user
      if (data && data.length > 0 && user) {
        const postIds = data.map(p => p.id);
        const { data: likes } = await supabase
          .from('forum_likes')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postIds);

        const likedPostIds = new Set(likes?.map(l => l.post_id) || []);
        
        const postsWithLikes = data.map(post => ({
          ...post,
          is_liked: likedPostIds.has(post.id),
          comments: []
        }));

        setPosts(postsWithLikes);
      } else {
        setPosts(data?.map(post => ({ ...post, is_liked: false, comments: [] })) || []);
      }
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

  const handleLike = async (postId: string, isLiked: boolean, postUserId: string) => {
    if (!user || likingPosts.has(postId)) return;

    setLikingPosts(prev => new Set(prev).add(postId));

    try {
      if (isLiked) {
        // Unlike
        const { error: deleteError } = await supabase
          .from('forum_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);

        if (deleteError) throw deleteError;

        // Try to use the RPC function first
        const { error: rpcError } = await supabase.rpc('decrement_forum_likes', {
          post_id: postId
        });

        if (rpcError) {
          console.warn('RPC decrement_forum_likes failed:', rpcError);
        }
      } else {
        // Like
        const { error: insertError } = await supabase
          .from('forum_likes')
          .insert([{ user_id: user.id, post_id: postId }]);

        if (insertError) throw insertError;

        // Try to use the RPC function first
        const { error: rpcError } = await supabase.rpc('increment_forum_likes', {
          post_id: postId
        });

        if (rpcError) {
          console.warn('RPC increment_forum_likes failed:', rpcError);
        }

        // Create notification for post owner (if not liking own post)
        if (postUserId !== user.id) {
          await supabase.rpc('create_notification', {
            recipient_id: postUserId,
            notification_type: 'like',
            notification_title: 'Forum Post Liked',
            notification_message: `${user.username} liked your forum post`,
            entity_id: postId
          });
        }
      }

      // Update local state
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { 
              ...post, 
              is_liked: !isLiked,
              likes_count: isLiked ? Math.max(0, post.likes_count - 1) : post.likes_count + 1
            }
          : post
      ));
    } catch (error) {
      console.error('Error updating forum like:', error);
    } finally {
      setLikingPosts(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    }
  };

  const toggleComments = async (postId: string) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(postId)) {
      newExpanded.delete(postId);
    } else {
      newExpanded.add(postId);
      // Load comments if not already loaded
      const post = posts.find(p => p.id === postId);
      if (post && (!post.comments || post.comments.length === 0)) {
        await loadComments(postId);
      }
    }
    setExpandedComments(newExpanded);
  };

  const loadComments = async (postId: string) => {
    setLoadingComments(prev => new Set(prev).add(postId));
    
    try {
      const { data, error } = await supabase
        .from('forum_comments')
        .select(`
          *,
          users (
            id,
            username,
            avatar_url
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, comments: data || [] }
          : post
      ));
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    }
  };

  const handleCommentSubmit = async (postId: string) => {
    const content = newComments[postId]?.trim();
    if (!content || !user) return;

    setSubmittingComment(postId);
    
    try {
      const { data, error } = await supabase
        .from('forum_comments')
        .insert([{
          user_id: user.id,
          post_id: postId,
          content
        }])
        .select(`
          *,
          users (
            id,
            username,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      // Increment replies count
      await supabase.rpc('increment_forum_replies', {
        post_id: postId
      });

      // Update local state
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { 
              ...post, 
              comments: [...(post.comments || []), data],
              replies_count: post.replies_count + 1
            }
          : post
      ));

      // Clear the comment input
      setNewComments(prev => ({ ...prev, [postId]: '' }));

      // Create notification for post owner (if not commenting on own post)
      const post = posts.find(p => p.id === postId);
      if (post && post.user_id !== user.id) {
        await supabase.rpc('create_notification', {
          recipient_id: post.user_id,
          notification_type: 'comment',
          notification_title: 'New Comment',
          notification_message: `${user.username} commented on your forum post`,
          entity_id: postId
        });
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmittingComment(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-600"></div>
          <p className="mt-4 text-gray-600">Loading forum...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/feed')}
              className="text-gray-600 hover:text-teal-600"
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
              <h1 className="text-3xl font-bold text-gray-900 flex items-center mb-2">
                <MessageSquare className="h-8 w-8 mr-3 text-teal-600" />
                Community Forum
              </h1>
              <p className="text-gray-600">
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
            <Card className="mb-6 bg-white border-gray-200 hover-lift">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900">Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-teal-100 text-teal-800 border border-teal-200'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full ${category.color} inline-block mr-2`}></div>
                    {category.name}
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 hover-lift">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900">Forum Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Posts</span>
                  <span className="font-semibold text-gray-900">{posts.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Active Users</span>
                  <span className="font-semibold text-gray-900">{new Set(posts.map(p => p.user_id)).size}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Replies</span>
                  <span className="font-semibold text-gray-900">{posts.reduce((sum, post) => sum + post.replies_count, 0)}</span>
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
                  className="pl-10 bg-white border-gray-300 text-gray-900 focus:border-teal-500 focus:ring-teal-500"
                />
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant={sortBy === 'recent' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('recent')}
                  className={sortBy === 'recent' ? 'bg-teal-600 hover:bg-teal-700 text-white' : 'text-gray-700 hover:text-teal-600 hover:border-teal-300'}
                >
                  <Clock className="mr-1 h-4 w-4" />
                  Recent
                </Button>
                <Button
                  variant={sortBy === 'trending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('trending')}
                  className={sortBy === 'trending' ? 'bg-teal-600 hover:bg-teal-700 text-white' : 'text-gray-700 hover:text-teal-600 hover:border-teal-300'}
                >
                  <TrendingUp className="mr-1 h-4 w-4" />
                  Trending
                </Button>
              </div>
            </div>

            {/* Create Post Modal */}
            {showCreatePost && isAuthenticated && (
              <Card className="mb-6 border-teal-200 bg-white border-gray-200">
                <CardHeader>
                  <CardTitle className="text-gray-900">Create New Post</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Input
                      placeholder="Post title..."
                      value={newPostTitle}
                      onChange={(e) => setNewPostTitle(e.target.value)}
                      className="bg-white border-gray-300 text-gray-900 focus:border-teal-500 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <select
                      value={newPostCategory}
                      onChange={(e) => setNewPostCategory(e.target.value)}
                      className="w-full p-2 border rounded-md bg-white border-gray-300 text-gray-900 focus:border-teal-500 focus:ring-teal-500"
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
                      className="bg-white border-gray-300 text-gray-900 focus:border-teal-500 focus:ring-teal-500"
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
              <Card className="bg-white border-gray-200">
                <CardContent className="p-12 text-center">
                  <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">
                    {searchQuery || selectedCategory !== 'all' ? 'No posts found' : 'No posts yet'}
                  </h3>
                  <p className="text-gray-600 mb-6">
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
                  <Card key={post.id} className="bg-white border-gray-200 hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={post.users.avatar_url} />
                          <AvatarFallback className="bg-teal-100 text-teal-700">{post.users.username[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                              {post.title}
                            </h3>
                            {post.is_pinned && (
                              <Pin className="h-4 w-4 text-teal-500" />
                            )}
                            <Badge variant="secondary" className="text-xs">
                              {categories.find(c => c.id === post.category)?.name || post.category}
                            </Badge>
                          </div>
                          <p className="text-gray-700 mb-3 line-clamp-2">
                            {post.content}
                          </p>
                          <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                            <div className="flex items-center space-x-4">
                              <span>@{post.users.username}</span>
                              <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center space-x-4">
                            {isAuthenticated && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleLike(post.id, post.is_liked || false, post.user_id)}
                                disabled={likingPosts.has(post.id)}
                                className={`${
                                  post.is_liked 
                                    ? 'text-blue-600 hover:text-blue-700' 
                                    : 'text-gray-500 hover:text-blue-500'
                                } transition-colors`}
                              >
                                {likingPosts.has(post.id) ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-1"></div>
                                ) : (
                                  <ThumbsUp className={`mr-1 h-4 w-4 ${post.is_liked ? 'fill-current' : ''}`} />
                                )}
                                {post.likes_count}
                              </Button>
                            )}
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleComments(post.id)}
                              className="text-gray-500 hover:text-green-500 transition-colors"
                            >
                              <Reply className="mr-1 h-4 w-4" />
                              {post.replies_count}
                              {expandedComments.has(post.id) ? (
                                <ChevronUp className="ml-1 h-4 w-4" />
                              ) : (
                                <ChevronDown className="ml-1 h-4 w-4" />
                              )}
                            </Button>
                          </div>

                          {/* Comments Section */}
                          {expandedComments.has(post.id) && (
                            <div className="mt-4 space-y-4">
                              <Separator className="bg-gray-200" />
                              
                              {/* Comment Input */}
                              {isAuthenticated && (
                                <div className="flex space-x-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={user?.avatar_url} />
                                    <AvatarFallback className="bg-teal-100 text-teal-700">{user?.username?.[0]?.toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 flex space-x-2">
                                    <Textarea
                                      placeholder="Write a comment..."
                                      value={newComments[post.id] || ''}
                                      onChange={(e) => setNewComments(prev => ({ ...prev, [post.id]: e.target.value }))}
                                      className="flex-1 min-h-[80px] bg-white border-gray-300 text-gray-900 focus:border-teal-500 focus:ring-teal-500"
                                      rows={2}
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => handleCommentSubmit(post.id)}
                                      disabled={!newComments[post.id]?.trim() || submittingComment === post.id}
                                      className="bg-teal-600 hover:bg-teal-700 text-white"
                                    >
                                      <Send className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {/* Comments List */}
                              {loadingComments.has(post.id) ? (
                                <div className="text-center py-4">
                                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600 mx-auto"></div>
                                  <p className="mt-2 text-gray-500 text-sm">Loading comments...</p>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {post.comments?.map((comment) => (
                                    <div key={comment.id} className="flex space-x-3">
                                      <Avatar className="h-8 w-8">
                                        <AvatarImage src={comment.users.avatar_url} />
                                        <AvatarFallback className="bg-teal-100 text-teal-700">{comment.users.username[0]?.toUpperCase()}</AvatarFallback>
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
                              )}
                            </div>
                          )}
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