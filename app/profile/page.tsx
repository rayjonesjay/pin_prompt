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
  Edit, 
  Trash2,
  Settings,
  Calendar,
  Users,
  FileText
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
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

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
    if (!confirm('Are you sure you want to delete this prompt?')) return;

    try {
      const { error } = await supabase
        .from('prompts')
        .delete()
        .eq('id', promptId);

      if (error) throw error;

      setPrompts(prev => prev.filter(p => p.id !== promptId));
    } catch (error: any) {
      setError(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
          <p className="mt-4 text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
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
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/feed')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Feed
          </Button>
        </div>

        {/* Profile Header */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user.avatar_url} />
                <AvatarFallback className="text-2xl">
                  {user.username[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  @{user.username}
                </h1>
                {user.bio && (
                  <p className="text-gray-600 mb-4">{user.bio}</p>
                )}
                
                <div className="flex items-center space-x-6 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    <span>{user.followers_count} followers</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    <span>{user.following_count} following</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>Joined {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>

              <Button variant="outline" className="flex items-center">
                <Settings className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {prompts.length}
              </div>
              <div className="text-gray-600">PinPrompts</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {prompts.reduce((sum, prompt) => sum + prompt.likes_count, 0)}
              </div>
              <div className="text-gray-600">Total Likes</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {user.followers_count}
              </div>
              <div className="text-gray-600">Followers</div>
            </CardContent>
          </Card>
        </div>

        {/* Your PinPrompts */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <FileText className="h-6 w-6 mr-2" />
              Your PinPrompts
            </h2>
            <Button onClick={() => router.push('/upload')}>
              Create New PinPrompt
            </Button>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md mb-4">
              {error}
            </div>
          )}

          {prompts.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  No PinPrompts yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Start sharing your AI-generated content with the community
                </p>
                <Button onClick={() => router.push('/upload')}>
                  Upload Your First PinPrompt
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {prompts.map((prompt) => (
                <Card key={prompt.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    {/* Prompt Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <Badge variant="secondary">{prompt.category || 'General'}</Badge>
                        <span className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(prompt.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeletePrompt(prompt.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
                            className="w-full max-w-md rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(prompt.output_url, '_blank')}
                          />
                        )}
                        {prompt.output_type === 'video' && (
                          <video
                            controls
                            className="w-full max-w-md rounded-lg"
                            poster={prompt.output_url}
                          >
                            <source src={prompt.output_url} type="video/mp4" />
                            Your browser does not support the video tag.
                          </video>
                        )}
                        {prompt.output_type === 'text' && (
                          <div className="bg-gray-50 p-4 rounded-lg max-w-2xl">
                            <pre className="whitespace-pre-wrap text-sm text-gray-700">
                              {prompt.output_url}
                            </pre>
                          </div>
                        )}
                        {prompt.output_type === 'audio' && (
                          <div className="bg-gray-50 p-4 rounded-lg max-w-md">
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

                    {/* Stats */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-gray-500">
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