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
  Calendar,
  Users,
  FileText,
  Moon,
  Sun,
  UserPlus,
  UserMinus,
  MessageSquare
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
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

export default function UserProfilePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const router = useRouter();
  const params = useParams();
  const username = params.username as string;

  useEffect(() => {
    checkUser();
    // Load dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
  }, []);

  useEffect(() => {
    if (currentUser && username) {
      fetchProfileUser();
    }
  }, [currentUser, username]);

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

    const { data: userProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (userProfile) {
      setCurrentUser(userProfile);
    }
  };

  const fetchProfileUser = async () => {
    try {
      // Get profile user by username
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      if (userError) throw userError;

      if (userProfile) {
        setProfileUser(userProfile);
        
        // Check if current user is following this user
        if (currentUser && currentUser.id !== userProfile.id) {
          const { data: followData } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', currentUser.id)
            .eq('following_id', userProfile.id)
            .single();
          
          setIsFollowing(!!followData);
        }
        
        // Get user's prompts
        const { data: userPrompts, error: promptsError } = await supabase
          .from('prompts')
          .select('*')
          .eq('user_id', userProfile.id)
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

  const handleFollow = async () => {
    if (!currentUser || !profileUser || currentUser.id === profileUser.id) return;

    setFollowLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', profileUser.id);

        // Update follower counts
        await supabase
          .from('users')
          .update({ followers_count: supabase.raw('followers_count - 1') })
          .eq('id', profileUser.id);

        await supabase
          .from('users')
          .update({ following_count: supabase.raw('following_count - 1') })
          .eq('id', currentUser.id);

        setProfileUser(prev => prev ? { ...prev, followers_count: prev.followers_count - 1 } : null);
        setCurrentUser(prev => prev ? { ...prev, following_count: prev.following_count - 1 } : null);
      } else {
        // Follow
        await supabase
          .from('follows')
          .insert([{ follower_id: currentUser.id, following_id: profileUser.id }]);

        // Update follower counts
        await supabase
          .from('users')
          .update({ followers_count: supabase.raw('followers_count + 1') })
          .eq('id', profileUser.id);

        await supabase
          .from('users')
          .update({ following_count: supabase.raw('following_count + 1') })
          .eq('id', currentUser.id);

        setProfileUser(prev => prev ? { ...prev, followers_count: prev.followers_count + 1 } : null);
        setCurrentUser(prev => prev ? { ...prev, following_count: prev.following_count + 1 } : null);
      }

      setIsFollowing(!isFollowing);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-600"></div>
          <p className={`mt-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="text-center">
          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>User not found</p>
          <Button onClick={() => router.push('/feed')} className="mt-4">
            Back to Feed
          </Button>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profileUser.id;

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
                <Avatar className="h-16 w-16 md:h-24 md:w-24 ring-4 ring-teal-200">
                  <AvatarImage src={profileUser.avatar_url} />
                  <AvatarFallback className="text-lg md:text-2xl bg-gradient-to-br from-teal-400 to-cyan-500 text-white">
                    {profileUser.username[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <h1 className={`text-xl md:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} truncate`}>
                    @{profileUser.username}
                  </h1>
                  {profileUser.bio && (
                    <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} text-sm md:text-base mt-1 md:mt-2`}>
                      {profileUser.bio}
                    </p>
                  )}
                </div>
              </div>

              {/* Stats - Mobile Optimized */}
              <div className={`flex items-center justify-between text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} pt-2 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <Users className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                    <span>{profileUser.followers_count} followers</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                    <span>{profileUser.following_count} following</span>
                  </div>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                  <span className="hidden sm:inline">Joined </span>
                  <span>{formatDistanceToNow(new Date(profileUser.created_at), { addSuffix: true })}</span>
                </div>
              </div>

              {/* Action Buttons */}
              {!isOwnProfile && (
                <div className="flex space-x-2 pt-2">
                  <Button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={`flex-1 ${
                      isFollowing 
                        ? 'bg-gray-600 hover:bg-gray-700' 
                        : 'bg-teal-600 hover:bg-teal-700'
                    } text-white`}
                    size="sm"
                  >
                    {followLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : isFollowing ? (
                      <>
                        <UserMinus className="h-4 w-4 mr-2" />
                        Unfollow
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Follow
                      </>
                    )}
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                </div>
              )}

              {isOwnProfile && (
                <Button onClick={() => router.push('/profile')} variant="outline" size="sm">
                  View Your Profile
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards - Mobile Optimized */}
        <div className="grid grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-8">
          <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} hover-lift`}>
            <CardContent className="p-3 md:p-6 text-center">
              <div className="text-xl md:text-3xl font-bold text-teal-600 mb-1 md:mb-2">
                {prompts.length}
              </div>
              <div className={`text-xs md:text-base ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>PinPrompts</div>
            </CardContent>
          </Card>
          <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} hover-lift`}>
            <CardContent className="p-3 md:p-6 text-center">
              <div className="text-xl md:text-3xl font-bold text-teal-600 mb-1 md:mb-2">
                {prompts.reduce((sum, prompt) => sum + prompt.likes_count, 0)}
              </div>
              <div className={`text-xs md:text-base ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Likes</div>
            </CardContent>
          </Card>
          <Card className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} hover-lift`}>
            <CardContent className="p-3 md:p-6 text-center">
              <div className="text-xl md:text-3xl font-bold text-teal-600 mb-1 md:mb-2">
                {profileUser.followers_count}
              </div>
              <div className={`text-xs md:text-base ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Followers</div>
            </CardContent>
          </Card>
        </div>

        {/* User's PinPrompts */}
        <div className="mb-8">
          <h2 className={`text-xl md:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} flex items-center mb-4 md:mb-6`}>
            <FileText className="h-5 w-5 md:h-6 md:w-6 mr-2" />
            {isOwnProfile ? 'Your' : `@${profileUser.username}'s`} PinPrompts
          </h2>

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
                  {isOwnProfile 
                    ? 'Start sharing your AI-generated content with the community'
                    : `@${profileUser.username} hasn't shared any prompts yet`
                  }
                </p>
                {isOwnProfile && (
                  <Button onClick={() => router.push('/upload')} className="bg-teal-600 hover:bg-teal-700 text-white">
                    Upload Your First PinPrompt
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4 md:space-y-6">
              {prompts.map((prompt) => (
                <Card key={prompt.id} className={`overflow-hidden hover:shadow-lg transition-all duration-300 border-l-4 ${
                  prompt.category === 'ai' ? 'border-l-teal-500' :
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
                            prompt.category === 'ai' ? 'bg-teal-100 text-teal-800' :
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
                    </div>

                    {/* Prompt Text */}
                    <div className="mb-4">
                      <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'} mb-2 text-sm md:text-base`}>Prompt:</h3>
                      <p className={`${darkMode ? 'text-gray-300 bg-gray-700' : 'text-gray-700 bg-gray-50'} p-3 rounded-lg border-l-2 border-teal-400 text-sm md:text-base`}>
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