"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Heart, 
  Trash2,
  Calendar,
  Users,
  FileText,
  Moon,
  Sun,
  AlertTriangle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

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
  const [darkMode, setDarkMode] = useState(false);
  const [deletingPrompt, setDeletingPrompt] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkUser();
    // Load dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
  }, []);

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [darkMode]);

  const checkUser = async () => {
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
  };

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

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
          <p className={`mt-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="text-center">
          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>User not found</p>
          <Button onClick={() => router.push('/')} className="mt-4">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="mb-6 md:mb-8 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push('/feed')}
            className="mb-4"
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

        {/* Profile Header - Mobile Optimized */}
        <Card className={`mb-6 md:mb-8 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white shadow-lg'} hover-lift`}>
          <CardContent className="p-4 md:p-8">
            <div className="flex flex-col space-y-4">
              {/* Avatar and Basic Info */}
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16 md:h-24 md:w-24 ring-4 ring-orange-200">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className="text-lg md:text-2xl bg-gradient-to-br from-orange-400 to-red-500 text-white">
                    {user.username[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <h1 className={`text-xl md:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} truncate`}>
                    @{user.username}
                  </h1>
                  {user.bio && (
                    <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} text-sm md:text-base mt-1 md:mt-2`}>
                      {user.bio}
                    </p>
                  )}
                </div>
              </div>

              {/* Stats - Mobile Optimized */}
              <div className={`flex items-center justify-between text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} pt-2 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
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
          <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} hover-lift`}>
            <CardContent className="p-3 md:p-6 text-center">
              <div className="text-xl md:text-3xl font-bold text-orange-600 mb-1 md:mb-2">
                {prompts.length}
              </div>
              <div className={`text-xs md:text-base ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>PinPrompts</div>
            </CardContent>
          </Card>
          <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} hover-lift`}>
            <CardContent className="p-3 md:p-6 text-center">
              <div className="text-xl md:text-3xl font-bold text-orange-600 mb-1 md:mb-2">
                {prompts.reduce((sum, prompt) => sum + prompt.likes_count, 0)}
              </div>
              <div className={`text-xs md:text-base ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Likes</div>
            </CardContent>
          </Card>
          <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} hover-lift`}>
            <CardContent className="p-3 md:p-6 text-center">
              <div className="text-xl md:text-3xl font-bold text-orange-600 mb-1 md:mb-2">
                {user.followers_count}
              </div>
              <div className={`text-xs md:text-base ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Followers</div>
            </CardContent>
          </Card>
        </div>

        {/* Your PinPrompts */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 md:mb-6 space-y-2 sm:space-y-0">
            <h2 className={`text-xl md:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} flex items-center`}>
              <FileText className="h-5 w-5 md:h-6 md:w-6 mr-2" />
              Your PinPrompts
            </h2>
            <Button onClick={() => router.push('/upload')} className="bg-orange-600 hover:bg-orange-700 text-white text-sm md:text-base">
              Create New PinPrompt
            </Button>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md mb-4 border border-red-200">
              {error}
            </div>
          )}

          {prompts.length === 0 ? (
            <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
              <CardContent className="p-8 md:p-12 text-center">
                <FileText className={`h-12 w-12 md:h-16 md:w-16 ${darkMode ? 'text-gray-600' : 'text-gray-300'} mx-auto mb-4`} />
                <h3 className={`text-lg md:text-xl font-medium ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                  No PinPrompts yet
                </h3>
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-6 text-sm md:text-base`}>
                  Start sharing your AI-generated content with the community
                </p>
                <Button onClick={() => router.push('/upload')} className="bg-orange-600 hover:bg-orange-700 text-white">
                  Upload Your First PinPrompt
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4 md:space-y-6">
              {prompts.map((prompt) => (
                <Card key={prompt.id} className={`overflow-hidden hover:shadow-lg transition-all duration-300 border-l-4 ${
                  prompt.category === 'ai' ? 'border-l-orange-500' :
                  prompt.category === 'programming' ? 'border-l-blue-500' :
                  prompt.category === 'science' ? 'border-l-purple-500' :
                  prompt.category === 'gaming' ? 'border-l-red-500' :
                  'border-l-yellow-500'
                } ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white shadow-sm'}`}>
                  <CardContent className="p-4 md:p-6">
                    {/* Prompt Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2 md:space-x-3">
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${
                            prompt.category === 'ai' ? 'bg-orange-100 text-orange-800' :
                            prompt.category === 'programming' ? 'bg-blue-100 text-blue-800' :
                            prompt.category === 'science' ? 'bg-purple-100 text-purple-800' :
                            prompt.category === 'gaming' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {prompt.category || 'General'}
                        </Badge>
                        <span className={`text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {formatDistanceToNow(new Date(prompt.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
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

                    {/* Prompt Text */}
                    <div className="mb-4">
                      <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'} mb-2 text-sm md:text-base`}>Prompt:</h3>
                      <p className={`${darkMode ? 'text-gray-300 bg-gray-700' : 'text-gray-700 bg-gray-50'} p-3 rounded-lg border-l-2 border-orange-400 text-sm md:text-base`}>
                        {prompt.prompt_text}
                      </p>
                    </div>

                    {/* Output */}
                    {prompt.output_url && (
                      <div className="mb-4">
                        <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'} mb-2 text-sm md:text-base`}>Output:</h3>
                        {prompt.output_type === 'image' && (
                          <img
                            src={prompt.output_url}
                            alt="AI Generated Output"
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
                          <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg max-w-2xl border border-gray-200`}>
                            <pre className={`whitespace-pre-wrap text-xs md:text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {prompt.output_url}
                            </pre>
                          </div>
                        )}
                        {prompt.output_type === 'audio' && (
                          <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg max-w-md border border-gray-200`}>
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

                    {/* Stats */}
                    <div className="flex items-center justify-between">
                      <div className={`flex items-center ${darkMode ? 'text-gray-400' : 'text-gray-500'} text-sm`}>
                        <Heart className="mr-1 h-4 w-4" />
                        {prompt.likes_count} likes
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
  );
}