"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Upload, Image, Video, FileText, Volume2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
}

export default function UploadPage() {
  const [user, setUser] = useState<User | null>(null);
  const [promptText, setPromptText] = useState('');
  const [outputType, setOutputType] = useState<'image' | 'video' | 'text' | 'audio'>('image');
  const [outputFile, setOutputFile] = useState<File | null>(null);
  const [outputText, setOutputText] = useState('');
  const [llmModel, setLlmModel] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const categories = ['ai', 'math', 'programming', 'sports', 'science', 'food', 'fashion', 'gaming', 'memes', 'general'];

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      router.push('/');
      return;
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('id, username')
      .eq('id', authUser.id)
      .single();

    if (userProfile) {
      setUser(userProfile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOutputFile(file);
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${outputType}s/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('outputs')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('outputs')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      let outputUrl = '';

      if (outputType === 'text') {
        outputUrl = outputText;
      } else if (outputFile) {
        outputUrl = await uploadFile(outputFile);
      }

      const { error: insertError } = await supabase
        .from('prompts')
        .insert([
          {
            user_id: user.id,
            prompt_text: promptText,
            output_url: outputUrl,
            output_type: outputType,
            llm_model: llmModel,
            category: category || null,
            likes_count: 0,
          }
        ]);

      if (insertError) throw insertError;

      router.push('/feed');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
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
          <h1 className="text-3xl font-bold text-gray-900">Upload PinPrompt</h1>
          <p className="text-gray-600 mt-2">Share your AI-generated content with the community</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="mr-2 h-5 w-5" />
              Create New PinPrompt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Prompt Text */}
              <div className="space-y-2">
                <Label htmlFor="prompt">Prompt *</Label>
                <Textarea
                  id="prompt"
                  placeholder="Enter the prompt you used to generate the content..."
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  required
                  rows={4}
                  className="resize-none"
                />
              </div>

              {/* LLM Model */}
              <div className="space-y-2">
                <Label htmlFor="model">LLM Model Used *</Label>
                <Input
                  id="model"
                  placeholder="e.g., GPT-4, DALL-E 3, Midjourney, Claude, etc."
                  value={llmModel}
                  onChange={(e) => setLlmModel(e.target.value)}
                  required
                />
              </div>

              {/* Output Type */}
              <div className="space-y-2">
                <Label>Output Type *</Label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { type: 'image' as const, icon: Image, label: 'Image' },
                    { type: 'video' as const, icon: Video, label: 'Video' },
                    { type: 'text' as const, icon: FileText, label: 'Text' },
                    { type: 'audio' as const, icon: Volume2, label: 'Audio' },
                  ].map(({ type, icon: Icon, label }) => (
                    <Button
                      key={type}
                      type="button"
                      variant={outputType === type ? 'default' : 'outline'}
                      onClick={() => setOutputType(type)}
                      className="flex flex-col items-center p-4 h-auto"
                    >
                      <Icon className="h-6 w-6 mb-2" />
                      <span className="text-sm">{label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Output Content */}
              <div className="space-y-2">
                <Label>Output Content *</Label>
                {outputType === 'text' ? (
                  <Textarea
                    placeholder="Paste the text output generated by the AI..."
                    value={outputText}
                    onChange={(e) => setOutputText(e.target.value)}
                    required
                    rows={6}
                    className="resize-none"
                  />
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Input
                      type="file"
                      accept={
                        outputType === 'image' ? 'image/*' :
                        outputType === 'video' ? 'video/*' :
                        outputType === 'audio' ? 'audio/*' : '*/*'
                      }
                      onChange={handleFileChange}
                      required
                      className="hidden"
                      id="file-upload"
                    />
                    <Label htmlFor="file-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center">
                        <Upload className="h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-lg font-medium text-gray-600">
                          Click to upload {outputType}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {outputType === 'image' && 'PNG, JPG, GIF up to 10MB'}
                          {outputType === 'video' && 'MP4, MOV up to 50MB'}
                          {outputType === 'audio' && 'MP3, WAV up to 25MB'}
                        </p>
                        {outputFile && (
                          <p className="text-sm text-green-600 mt-2">
                            Selected: {outputFile.name}
                          </p>
                        )}
                      </div>
                    </Label>
                  </div>
                )}
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>Category (Optional)</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Uploading...' : 'Share PinPrompt'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}