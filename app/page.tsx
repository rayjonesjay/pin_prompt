"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Github, Sparkles, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push('/feed');
      }
    };
    checkUser();
  }, [router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        // Sign up with email and password
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username,
            }
          }
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          // Create user profile
          const { error: profileError } = await supabase
            .from('users')
            .insert([
              {
                id: data.user.id,
                username: username,
                email: email,
                followers_count: 0,
                following_count: 0,
              }
            ]);

          if (profileError) throw profileError;
          router.push('/feed');
        }
      } else {
        // Sign in with email and password
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
        router.push('/feed');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Side - Brand and Features */}
      <div className="w-full lg:w-1/2 bg-slate-800 text-white p-6 lg:p-12 flex flex-col justify-between order-1 lg:order-1">
        {/* Header */}
        <div>
          <div className="flex items-center mb-8 lg:mb-12">
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-green-500 rounded-xl flex items-center justify-center mr-3 lg:mr-4">
              <Zap className="h-6 w-6 lg:h-7 lg:w-7 text-white" />
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold">PinPrompt</h1>
          </div>

          {/* Main Content */}
          <div className="mb-12 lg:mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold mb-4 leading-tight">
              Share Your AI<br />
              <span className="text-green-400">Creations</span>
            </h2>
            <p className="text-lg lg:text-xl text-slate-300 mb-8 lg:mb-12 leading-relaxed">
              Discover, share, and learn from AI-generated content and the prompts that created them.<br className="hidden lg:block" />
              Join our community of creators pushing the boundaries of AI creativity.
            </p>

            {/* Slogan Section */}
            <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-6 lg:p-8 mb-8 lg:mb-12">
              <div className="flex items-center mb-4">
                <Sparkles className="h-6 w-6 text-green-400 mr-3" />
                <h3 className="text-green-400 font-semibold text-lg lg:text-xl">Our Mission</h3>
              </div>
              <p className="text-2xl lg:text-3xl font-bold text-white leading-tight">
                Prompt. Generate. Share. Inspire.
              </p>
              <p className="text-slate-300 mt-3 text-sm lg:text-base">
                The complete cycle of AI creativity in one platform
              </p>
            </div>

            {/* Credits Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-6">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-400">Built on</span>
                <a 
                  href="https://bolt.new/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-green-400 hover:text-green-300 transition-colors font-medium flex items-center space-x-1"
                >
                  <span>Bolt</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="w-1 h-1 bg-slate-600 rounded-full hidden sm:block"></div>
              <a 
                href="https://github.com/rayjonesjay" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-slate-400 hover:text-green-400 transition-colors"
              >
                <Github className="h-4 w-4" />
                <span className="text-sm">rayjonesjay</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Authentication */}
      <div className="w-full lg:w-1/2 bg-white flex items-center justify-center p-6 lg:p-12 order-2 lg:order-2 min-h-screen lg:min-h-0">
        <div className="w-full max-w-md">
          <Card className="bg-white shadow-xl border-0">
            <CardContent className="p-6 lg:p-8">
              <div className="text-center mb-6 lg:mb-8">
                <h2 className="text-xl lg:text-2xl font-bold text-gray-900 mb-2">Welcome</h2>
                <p className="text-gray-600 text-sm lg:text-base">
                  Sign in to your account or create a new one
                </p>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                {isSignUp && (
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-gray-700 text-sm font-medium">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Choose a unique username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="border-gray-200 focus:border-green-500 focus:ring-green-500"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 text-sm font-medium">
                    {isSignUp ? 'Email' : 'Email or Username'}
                  </Label>
                  <Input
                    id="email"
                    type={isSignUp ? "email" : "text"}
                    placeholder={isSignUp ? "Enter your email address" : "Enter your email or username"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="border-gray-200 focus:border-green-500 focus:ring-green-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 text-sm font-medium">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="border-gray-200 focus:border-green-500 focus:ring-green-500"
                  />
                </div>

                {error && (
                  <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md border border-red-200">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 transition-colors font-medium"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Please wait...
                    </div>
                  ) : (
                    isSignUp ? 'Sign Up' : 'Sign In'
                  )}
                </Button>
              </form>

              {/* Tab Buttons - Moved to bottom */}
              <div className="flex mt-6 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setIsSignUp(false)}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    !isSignUp 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setIsSignUp(true)}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    isSignUp 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {isSignUp && (
                <p className="text-xs text-gray-500 text-center mt-4">
                  By signing up, you agree to our terms of service and privacy policy.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}