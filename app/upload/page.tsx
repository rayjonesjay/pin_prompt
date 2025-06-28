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

interface LLMModel {
  id: string;
  name: string;
  provider: string;
  category: string;
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
  const [llmModels, setLlmModels] = useState<LLMModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const router = useRouter();

  const categories = ['ai', 'math', 'programming', 'sports', 'science', 'food', 'fashion', 'gaming', 'memes', 'general'];

  useEffect(() => {
    checkUser();
    fetchLLMModels();
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

  const fetchLLMModels = async () => {
    try {
      const { data, error } = await supabase
        .from('llm_models')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setLlmModels(data || []);
    } catch (error) {
      console.error('Error fetching LLM models:', error);
      // Fallback to hardcoded list if database query fails
      setLlmModels([
        { id: '1', name: 'GPT-4', provider: 'OpenAI', category: 'text' },
        { id: '2', name: 'DALL-E 3', provider: 'OpenAI', category: 'image' },
        { id: '3', name: 'Claude 3 Opus', provider: 'Anthropic', category: 'text' },
        { id: '4', name: 'Midjourney v6', provider: 'Midjourney', category: 'image' },
        { id: '5', name: 'Stable Diffusion XL', provider: 'Stability AI', category: 'image' },
      ]);
    } finally {
      setLoadingModels(false);
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

  // Filter models based on output type
  const filteredModels = llmModels.filter(model => {
    if (outputType === 'text') return model.category === 'text' || model.category === 'multimodal';
    if (outputType === 'image') return model.category === 'image' || model.category === 'multimodal';
    if (outputType === 'video') return model.category === 'video' || model.category === 'multimodal';
    if (outputType === 'audio') return model.category === 'audio' || model.category === 'multimodal';
    return true;
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/feed')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Feed
            </Button>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Upload PinPrompt</h1>
          <p className="text-gray-300 mt-2 text-sm md:text-base">Share your AI-generated content with the community</p>
        </div>

        <Card className="bg-gray-800 border-gray-700 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center text-white text-lg md:text-xl">
              <Upload className="mr-2 h-5 w-5" />
              Create New PinPrompt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Prompt Text */}
              <div className="space-y-2">
                <Label htmlFor="prompt" className="text-gray-200 font-medium">Prompt *</Label>
                <Textarea
                  id="prompt"
                  placeholder="Enter the prompt you used to generate the content..."
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  required
                  rows={4}
                  className="resize-none bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              {/* Output Type */}
              <div className="space-y-2">
                <Label className="text-gray-200 font-medium">Output Type *</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
                      className={`flex flex-col items-center p-3 md:p-4 h-auto ${
                        outputType === type 
                          ? 'bg-teal-600 hover:bg-teal-700 text-white border-teal-600' 
                          : 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
                      }`}
                    >
                      <Icon className="h-5 w-5 md:h-6 md:w-6 mb-2" />
                      <span className="text-xs md:text-sm">{label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* LLM Model */}
              <div className="space-y-2">
                <Label htmlFor="model" className="text-gray-200 font-medium">LLM Model Used *</Label>
                {loadingModels ? (
                  <div className="flex items-center justify-center p-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                    <span className="ml-2 text-gray-300">Loading models...</span>
                  </div>
                ) : (
                  <Select value={llmModel} onValueChange={setLlmModel} required>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white focus:ring-teal-500 focus:border-teal-500">
                      <SelectValue placeholder="Select the AI model you used" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      {filteredModels.map((model) => (
                        <SelectItem 
                          key={model.id} 
                          value={model.name}
                          className="text-white hover:bg-gray-600 focus:bg-gray-600 data-[highlighted]:bg-gray-600"
                        >
                          <div className="flex flex-col">
                            <span>{model.name}</span>
                            <span className="text-xs text-gray-400">
                              {model.provider} • {model.category}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Output Content */}
              <div className="space-y-2">
                <Label className="text-gray-200 font-medium">Output Content *</Label>
                {outputType === 'text' ? (
                  <Textarea
                    placeholder="Paste the text output generated by the AI..."
                    value={outputText}
                    onChange={(e) => setOutputText(e.target.value)}
                    required
                    rows={6}
                    className="resize-none bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 focus:ring-teal-500 focus:border-teal-500"
                  />
                ) : (
                  <div className="border-2 border-dashed border-gray-600 bg-gray-700 rounded-lg p-6 text-center hover:border-teal-400 transition-colors">
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
                        <Upload className="h-10 w-10 md:h-12 md:w-12 text-gray-500 mb-4" />
                        <p className="text-base md:text-lg font-medium text-gray-300">
                          Click to upload {outputType}
                        </p>
                        <p className="text-xs md:text-sm text-gray-400 mt-1">
                          {outputType === 'image' && 'PNG, JPG, GIF up to 10MB'}
                          {outputType === 'video' && 'MP4, MOV up to 50MB'}
                          {outputType === 'audio' && 'MP3, WAV up to 25MB'}
                        </p>
                        {outputFile && (
                          <p className="text-sm text-teal-600 mt-2 font-medium">
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
                <Label className="text-gray-200 font-medium">Category (Optional)</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white focus:ring-teal-500 focus:border-teal-500">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    {categories.map((cat) => (
                      <SelectItem 
                        key={cat} 
                        value={cat} 
                        className="text-white hover:bg-gray-600 focus:bg-gray-600 data-[highlighted]:bg-gray-600"
                      >
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-900/20 p-3 rounded-md border border-red-800">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 font-medium text-base"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Uploading...
                  </div>
                ) : (
                  'Share PinPrompt'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}