"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Upload, Image, Video, FileText, Volume2, Search, ChevronDown, MessageSquare } from 'lucide-react';
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
  const [userThoughts, setUserThoughts] = useState('');
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
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [displayedModelsCount, setDisplayedModelsCount] = useState(20);
  const router = useRouter();

  const categories = ['ai', 'art', 'biology', 'fashion', 'food', 'gaming', 'general', 'history', 'math', 'memes', 'programming', 'science', 'sports'];

  const checkUser = useCallback(async () => {
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
  }, [router]);

  const fetchLLMModels = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('llm_models')
        .select('*')
        .eq('is_active', true)
        .order('name');

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
  }, []);

  useEffect(() => {
    checkUser();
    fetchLLMModels();
  }, [checkUser, fetchLLMModels]);

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

      // Combine user thoughts with prompt text if thoughts are provided
      const finalPromptText = userThoughts.trim() 
        ? `${userThoughts.trim()}\n\n--- AI Prompt ---\n${promptText}`
        : promptText;

      const { error: insertError } = await supabase
        .from('prompts')
        .insert([
          {
            user_id: user.id,
            prompt_text: finalPromptText,
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

  // Filter and sort models based on output type and search query
  const filteredAndSortedModels = useMemo(() => {
    let filtered = llmModels.filter(model => {
      // Filter by output type
      const typeMatch = outputType === 'text' 
        ? model.category === 'text' || model.category === 'multimodal'
        : outputType === 'image' 
        ? model.category === 'image' || model.category === 'multimodal'
        : outputType === 'video' 
        ? model.category === 'video' || model.category === 'multimodal'
        : outputType === 'audio' 
        ? model.category === 'audio' || model.category === 'multimodal'
        : true;

      // Filter by search query
      const searchMatch = !modelSearchQuery || 
        model.name.toLowerCase().includes(modelSearchQuery.toLowerCase()) ||
        model.provider.toLowerCase().includes(modelSearchQuery.toLowerCase());

      return typeMatch && searchMatch;
    });

    // Sort alphabetically by name
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [llmModels, outputType, modelSearchQuery]);

  // Get displayed models with lazy loading
  const displayedModels = filteredAndSortedModels.slice(0, displayedModelsCount);
  const hasMoreModels = displayedModelsCount < filteredAndSortedModels.length;

  const loadMoreModels = () => {
    setDisplayedModelsCount(prev => prev + 20);
  };

  const handleModelSelect = (modelName: string) => {
    setLlmModel(modelName);
    setShowModelDropdown(false);
    setModelSearchQuery('');
    setDisplayedModelsCount(20);
  };

  const selectedModel = llmModels.find(model => model.name === llmModel);

  // Word count helpers
  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const thoughtsWordCount = getWordCount(userThoughts);
  const promptWordCount = getWordCount(promptText);
  const outputTextWordCount = getWordCount(outputText);

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/feed')}
              className="text-gray-600 hover:text-teal-600 hover:bg-teal-50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Feed
            </Button>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Upload PinPrompt</h1>
          <p className="text-gray-600 mt-2 text-sm md:text-base">Share your AI-generated content with the community</p>
        </div>

        <Card className="bg-white border-gray-200 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center text-gray-900 text-lg md:text-xl">
              <Upload className="mr-2 h-5 w-5" />
              Create New PinPrompt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Your Thoughts Section */}
              <div className="space-y-2">
                <Label htmlFor="thoughts" className="text-gray-700 font-medium flex items-center">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Your Thoughts (Optional)
                </Label>
                <Textarea
                  id="thoughts"
                  placeholder="Share your thoughts about this creation, the process, what inspired you, or anything you&apos;d like the community to know..."
                  value={userThoughts}
                  onChange={(e) => {
                    const words = getWordCount(e.target.value);
                    if (words <= 200) {
                      setUserThoughts(e.target.value);
                    }
                  }}
                  rows={3}
                  className="resize-none bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:ring-teal-500 focus:border-teal-500"
                />
                <div className="flex justify-between items-center text-xs">
                  <p className="text-gray-500">
                    Share your creative process, inspiration, or insights about this AI generation
                  </p>
                  <p className={`font-medium ${thoughtsWordCount > 180 ? 'text-orange-600' : thoughtsWordCount > 200 ? 'text-red-600' : 'text-gray-500'}`}>
                    {thoughtsWordCount}/200 words
                  </p>
                </div>
              </div>

              {/* Prompt Text */}
              <div className="space-y-2">
                <Label htmlFor="prompt" className="text-gray-700 font-medium">AI Prompt *</Label>
                <Textarea
                  id="prompt"
                  placeholder="Enter the exact prompt you used to generate the content..."
                  value={promptText}
                  onChange={(e) => {
                    const words = getWordCount(e.target.value);
                    if (words <= 200) {
                      setPromptText(e.target.value);
                    }
                  }}
                  required
                  rows={4}
                  className="resize-none bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:ring-teal-500 focus:border-teal-500"
                />
                <div className="flex justify-between items-center text-xs">
                  <p className="text-gray-500">
                    The exact prompt/instructions you gave to the AI model
                  </p>
                  <p className={`font-medium ${promptWordCount > 180 ? 'text-orange-600' : promptWordCount > 200 ? 'text-red-600' : 'text-gray-500'}`}>
                    {promptWordCount}/200 words
                  </p>
                </div>
              </div>

              {/* Output Type */}
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Output Type *</Label>
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
                      onClick={() => {
                        setOutputType(type);
                        setLlmModel(''); // Reset model selection when output type changes
                        setModelSearchQuery('');
                        setDisplayedModelsCount(20);
                      }}
                      className={`flex flex-col items-center p-3 md:p-4 h-auto transition-all ${
                        outputType === type 
                          ? 'bg-teal-600 hover:bg-teal-700 text-white border-teal-600' 
                          : 'border-gray-300 text-gray-700 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-600'
                      }`}
                    >
                      <Icon className="h-5 w-5 md:h-6 md:w-6 mb-2" />
                      <span className="text-xs md:text-sm">{label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* LLM Model - Custom Searchable Dropdown */}
              <div className="space-y-2">
                <Label htmlFor="model" className="text-gray-700 font-medium">LLM Model Used *</Label>
                {loadingModels ? (
                  <div className="flex items-center justify-center p-4 border border-gray-300 rounded-md bg-white">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                    <span className="ml-2 text-gray-600">Loading models...</span>
                  </div>
                ) : (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowModelDropdown(!showModelDropdown)}
                      className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-md bg-white text-gray-900 hover:border-teal-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                    >
                      <span className={selectedModel ? 'text-gray-900' : 'text-gray-500'}>
                        {selectedModel ? (
                          <div className="flex flex-col items-start">
                            <span>{selectedModel.name}</span>
                            <span className="text-xs text-gray-500">
                              {selectedModel.provider} • {selectedModel.category}
                            </span>
                          </div>
                        ) : (
                          'Select the AI model you used'
                        )}
                      </span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showModelDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-hidden">
                        {/* Search Input */}
                        <div className="p-3 border-b border-gray-200">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Search models..."
                              value={modelSearchQuery}
                              onChange={(e) => {
                                setModelSearchQuery(e.target.value);
                                setDisplayedModelsCount(20); // Reset count when searching
                              }}
                              className="pl-10 bg-white border-gray-300 text-gray-900 focus:ring-teal-500 focus:border-teal-500"
                            />
                          </div>
                        </div>

                        {/* Models List */}
                        <div className="max-h-60 overflow-y-auto">
                          {displayedModels.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                              No models found for &quot;{modelSearchQuery}&quot; in {outputType} category
                            </div>
                          ) : (
                            <>
                              {displayedModels.map((model) => (
                                <button
                                  key={model.id}
                                  type="button"
                                  onClick={() => handleModelSelect(model.name)}
                                  className="w-full text-left p-3 hover:bg-teal-50 hover:text-teal-600 focus:bg-teal-50 focus:text-teal-600 transition-colors border-b border-gray-100 last:border-b-0"
                                >
                                  <div className="flex flex-col">
                                    <span className="font-medium">{model.name}</span>
                                    <span className="text-xs text-gray-500">
                                      {model.provider} • {model.category}
                                    </span>
                                  </div>
                                </button>
                              ))}
                              
                              {/* Load More Button */}
                              {hasMoreModels && (
                                <button
                                  type="button"
                                  onClick={loadMoreModels}
                                  className="w-full p-3 text-center text-teal-600 hover:bg-teal-50 border-t border-gray-200 font-medium"
                                >
                                  Load more models... ({filteredAndSortedModels.length - displayedModelsCount} remaining)
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Click outside to close */}
                    {showModelDropdown && (
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => {
                          setShowModelDropdown(false);
                          setModelSearchQuery('');
                          setDisplayedModelsCount(20);
                        }}
                      />
                    )}
                  </div>
                )}
                
                {/* Model count info */}
                {!loadingModels && (
                  <p className="text-xs text-gray-500">
                    {filteredAndSortedModels.length} models available for {outputType} content
                    {modelSearchQuery && ` (filtered by &quot;${modelSearchQuery}&quot;)`}
                  </p>
                )}
              </div>

              {/* Output Content */}
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Output Content *</Label>
                {outputType === 'text' ? (
                  <>
                    <Textarea
                      placeholder="Paste the text output generated by the AI..."
                      value={outputText}
                      onChange={(e) => {
                        const words = getWordCount(e.target.value);
                        if (words <= 200) {
                          setOutputText(e.target.value);
                        }
                      }}
                      required
                      rows={6}
                      className="resize-none bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:ring-teal-500 focus:border-teal-500"
                    />
                    <div className="flex justify-between items-center text-xs">
                      <p className="text-gray-500">
                        The text content generated by the AI model
                      </p>
                      <p className={`font-medium ${outputTextWordCount > 180 ? 'text-orange-600' : outputTextWordCount > 200 ? 'text-red-600' : 'text-gray-500'}`}>
                        {outputTextWordCount}/200 words
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 bg-gray-50 rounded-lg p-6 text-center hover:border-teal-400 transition-colors">
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
                        <Upload className="h-10 w-10 md:h-12 md:w-12 text-gray-400 mb-4" />
                        <p className="text-base md:text-lg font-medium text-gray-700">
                          Click to upload {outputType}
                        </p>
                        <p className="text-xs md:text-sm text-gray-500 mt-1">
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
                <Label className="text-gray-700 font-medium">Category (Optional)</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900 focus:ring-teal-500 focus:border-teal-500">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-300">
                    {categories.map((cat) => (
                      <SelectItem 
                        key={cat} 
                        value={cat} 
                        className="text-gray-900 hover:bg-teal-50 hover:text-teal-600 focus:bg-teal-50 focus:text-teal-600 data-[highlighted]:bg-teal-50 data-[highlighted]:text-teal-600"
                      >
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 font-medium text-base"
                disabled={loading || !llmModel}
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