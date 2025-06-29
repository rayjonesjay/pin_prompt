"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  Heart, 
  Trash2,
  Calendar,
  Users,
  FileText,
  AlertTriangle,
  Edit,
  Save,
  XCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';

interface User {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  followers_count: number;
  following_count: number;
  created_at: string;
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
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingPrompt, setDeletingPrompt] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
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
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      router.push('/');
      return;
    }

    try {
      // Get user profile
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (userError) throw userError;

      if (userProfile) {
        setUser(userProfile);
        
        // Get user's prompts
        const { data: userPrompts, error: promptsError } = await supabase
          .from('prompts')
          .select('*')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false });

        if (promptsError) throw promptsError;

        setPrompts(userPrompts || []);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    checkUser();
  }, [checkUser]);

  const handleDeletePrompt = async (promptId: string) => {
    setDeletingPrompt(promptId);
    
    try {
      const { error } = await supabase
        .from('prompts')
        .delete()
        .eq('id', promptId);

      if (error) throw error;

      setPrompts(prev => prev.filter(p => p.id !== promptId));
      setShowDeleteConfirm(null);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setDeletingPrompt(null);
    }
  };

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
              // category: editFormData.category === 'none' ? null : editFormData.category
              category: editFormData.category === 'none' ? undefined : editFormData.category

            }
          : prompt
      ));

      setEditingPrompt(null);
    } catch (error: any) {
      setError(error.message);
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
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-600"></div>
          <p className="mt-4 text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">User not found</p>
          <Button onClick={() => router.push('/')} className="mt-4">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="mb-6 md:mb-8 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push('/feed')}
            className="mb-4 text-gray-600 hover:text-teal-600"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Feed
          </Button>
        </div>

        {/* Profile Header - Mobile Optimized */}
        <Card className="mb-6 md:mb-8 bg-white border-gray-200 shadow-lg hover-lift">
          <CardContent className="p-4 md:p-8">
            <div className="flex flex-col space-y-4">
              {/* Avatar and Basic Info */}
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16 md:h-24 md:w-24 ring-4 ring-teal-200">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className="text-lg md:text-2xl bg-teal-100 text-teal-700">
                    {user.username[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl md:text-3xl font-bold text-gray-900 truncate">
                    @{user.username}
                  </h1>
                  {user.bio && (
                    <p className="text-gray-600 text-sm md:text-base mt-1 md:mt-2">
                      {user.bio}
                    </p>
                  )}
                </div>
              </div>

              {/* Stats - Mobile Optimized */}
              <div className="flex items-center justify-between text-xs md:text-sm text-gray-500 pt-2 border-t border-gray-200">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <Users className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                    <span>{user.followers_count} followers</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                    <span>{user.following_count} following</span>
                  </div>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                  <span className="hidden sm:inline">Joined </span>
                  <span>{formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards - Mobile Optimized */}
        <div className="grid grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-8">
          <Card className="bg-white border-gray-200 hover-lift">
            <CardContent className="p-3 md:p-6 text-center">
              <div className="text-xl md:text-3xl font-bold text-teal-600 mb-1 md:mb-2">
                {prompts.length}
              </div>
              <div className="text-xs md:text-base text-gray-600">PinPrompts</div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200 hover-lift">
            <CardContent className="p-3 md:p-6 text-center">
              <div className="text-xl md:text-3xl font-bold text-teal-600 mb-1 md:mb-2">
                {prompts.reduce((sum, prompt) => sum + prompt.likes_count, 0)}
              </div>
              <div className="text-xs md:text-base text-gray-600">Total Likes</div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200 hover-lift">
            <CardContent className="p-3 md:p-6 text-center">
              <div className="text-xl md:text-3xl font-bold text-teal-600 mb-1 md:mb-2">
                {user.followers_count}
              </div>
              <div className="text-xs md:text-base text-gray-600">Followers</div>
            </CardContent>
          </Card>
        </div>

        {/* Your PinPrompts */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 md:mb-6 space-y-2 sm:space-y-0">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center">
              <FileText className="h-5 w-5 md:h-6 md:w-6 mr-2" />
              Your PinPrompts
            </h2>
            <Button onClick={() => router.push('/upload')} className="bg-teal-600 hover:bg-teal-700 text-white text-sm md:text-base">
              Create New PinPrompt
            </Button>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md mb-4 border border-red-200">
              {error}
            </div>
          )}

          {prompts.length === 0 ? (
            <Card className="bg-white border-gray-200">
              <CardContent className="p-8 md:p-12 text-center">
                <FileText className="h-12 w-12 md:h-16 md:w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg md:text-xl font-medium text-gray-900 mb-2">
                  No PinPrompts yet
                </h3>
                <p className="text-gray-600 mb-6 text-sm md:text-base">
                  Start sharing your AI-generated content with the community
                </p>
                <Button onClick={() => router.push('/upload')} className="bg-teal-600 hover:bg-teal-700 text-white">
                  Upload Your First PinPrompt
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4 md:space-y-6">
              {prompts.map((prompt) => {
                const parsed = parsePromptText(prompt.prompt_text);
                const isEditing = editingPrompt === prompt.id;

                return (
                  <Card key={prompt.id} className={`overflow-hidden hover:shadow-lg transition-all duration-300 border-l-4 ${
                    prompt.category === 'ai' ? 'border-l-teal-500' :
                    prompt.category === 'art' ? 'border-l-pink-500' :
                    prompt.category === 'biology' ? 'border-l-green-500' :
                    prompt.category === 'fashion' ? 'border-l-purple-500' :
                    prompt.category === 'food' ? 'border-l-orange-500' :
                    prompt.category === 'gaming' ? 'border-l-red-500' :
                    prompt.category === 'history' ? 'border-l-amber-500' :
                    prompt.category === 'math' ? 'border-l-indigo-500' :
                    prompt.category === 'memes' ? 'border-l-yellow-500' :
                    prompt.category === 'programming' ? 'border-l-blue-500' :
                    prompt.category === 'science' ? 'border-l-cyan-500' :
                    prompt.category === 'sports' ? 'border-l-emerald-500' :
                    'border-l-gray-400'
                  } bg-white border-gray-200`}>
                    <CardContent className="p-4 md:p-6">
                      {/* Prompt Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2 md:space-x-3">
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${
                              prompt.category === 'ai' ? 'bg-teal-100 text-teal-800' :
                              prompt.category === 'art' ? 'bg-pink-100 text-pink-800' :
                              prompt.category === 'biology' ? 'bg-green-100 text-green-800' :
                              prompt.category === 'fashion' ? 'bg-purple-100 text-purple-800' :
                              prompt.category === 'food' ? 'bg-orange-100 text-orange-800' :
                              prompt.category === 'gaming' ? 'bg-red-100 text-red-800' :
                              prompt.category === 'history' ? 'bg-amber-100 text-amber-800' :
                              prompt.category === 'math' ? 'bg-indigo-100 text-indigo-800' :
                              prompt.category === 'memes' ? 'bg-yellow-100 text-yellow-800' :
                              prompt.category === 'programming' ? 'bg-blue-100 text-blue-800' :
                              prompt.category === 'science' ? 'bg-cyan-100 text-cyan-800' :
                              prompt.category === 'sports' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {prompt.category || 'General'}
                          </Badge>
                          <span className="text-xs md:text-sm text-gray-500">
                            {formatDistanceToNow(new Date(prompt.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {!isEditing && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditPrompt(prompt)}
                              className="text-gray-500 hover:text-teal-600"
                            >
                              <Edit className="h-3 w-3 md:h-4 md:w-4" />
                            </Button>
                          )}
                          {showDeleteConfirm === prompt.id ? (
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeletePrompt(prompt.id)}
                                disabled={deletingPrompt === prompt.id}
                                className="bg-red-600 hover:bg-red-700 text-xs md:text-sm"
                              >
                                {deletingPrompt === prompt.id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                ) : (
                                  <>
                                    <AlertTriangle className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                                    <span className="hidden sm:inline">Confirm Delete</span>
                                    <span className="sm:hidden">Delete</span>
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowDeleteConfirm(null)}
                                disabled={deletingPrompt === prompt.id}
                                className="text-xs md:text-sm"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setShowDeleteConfirm(prompt.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
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
                              <h3 className="font-medium text-gray-900 mb-2 text-sm md:text-base">Thoughts:</h3>
                              <p className="text-gray-700 bg-blue-50 p-3 rounded-lg border-l-2 border-blue-400 text-sm md:text-base">
                                {parsed.thoughts}
                              </p>
                            </div>
                          )}

                          {/* Prompt Text */}
                          <div>
                            <h3 className="font-medium text-gray-900 mb-2 text-sm md:text-base">Prompt:</h3>
                            <p className="text-gray-700 bg-gray-50 p-3 rounded-lg border-l-2 border-teal-400 text-sm md:text-base">
                              {parsed.prompt}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Output */}
                      {prompt.output_url && !isEditing && (
                        <div className="mb-4">
                          <h3 className="font-medium text-gray-900 mb-2 text-sm md:text-base">Output:</h3>
                          {prompt.output_type === 'image' && (
                            <Image
                              src={prompt.output_url}
                              alt="AI Generated Output"
                              width={400}
                              height={300}
                              className="w-full max-w-md rounded-lg cursor-pointer hover:opacity-90 transition-opacity shadow-md"
                              onClick={() => window.open(prompt.output_url, '_blank')}
                            />
                          )}
                          {prompt.output_type === 'video' && (
                            <video
                              controls
                              className="w-full max-w-md rounded-lg shadow-md"
                              poster={prompt.output_url}
                            >
                              <source src={prompt.output_url} type="video/mp4" />
                              Your browser does not support the video tag.
                            </video>
                          )}
                          {prompt.output_type === 'text' && (
                            <div className="bg-gray-50 p-4 rounded-lg max-w-2xl border border-gray-200">
                              <pre className="whitespace-pre-wrap text-xs md:text-sm text-gray-700">
                                {prompt.output_url}
                              </pre>
                            </div>
                          )}
                          {prompt.output_type === 'audio' && (
                            <div className="bg-gray-50 p-4 rounded-lg max-w-md border border-gray-200">
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

                      {/* Stats */}
                      {!isEditing && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-gray-500 text-sm">
                            <Heart className="mr-1 h-4 w-4" />
                            {prompt.likes_count} likes
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}