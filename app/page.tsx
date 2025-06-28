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
    <div className="min-h-screen flex">
      {/* Left Side - Brand and Features */}
      <div className="w-1/2 bg-slate-800 text-white p-12 flex flex-col justify-between">
        {/* Header */}
        <div>
          <div className="flex items-center mb-12">
            <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mr-4">
              <Zap className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold">PinPrompt</h1>
          </div>

          {/* Main Content */}
          <div className="mb-16">
            <h2 className="text-5xl font-bold mb-4 leading-tight">
              Share Your AI<br />
              <span className="text-emerald-400">Creations</span>
            </h2>
            <p className="text-xl text-slate-300 mb-12 leading-relaxed">
              Discover, share, and learn from AI-generated content and the prompts that created them.<br />
              Join our community of creators pushing the boundaries of AI creativity.
            </p>

            {/* Feature Cards */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-6">
                <h3 className="text-emerald-400 font-semibold mb-2">Transparency</h3>
                <p className="text-slate-300 text-sm">Real prompts, real results</p>
              </div>
              <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-6">
                <h3 className="text-emerald-400 font-semibold mb-2">Community</h3>
                <p className="text-slate-300 text-sm">Learn from others</p>
              </div>
              <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-6">
                <h3 className="text-emerald-400 font-semibold mb-2">Discovery</h3>
                <p className="text-slate-300 text-sm">Find new techniques</p>
              </div>
              <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-6">
                <h3 className="text-emerald-400 font-semibold mb-2">Innovation</h3>
                <p className="text-slate-300 text-sm">Push AI boundaries</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center space-x-6 text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="text-sm">Built on</span>
            <a 
              href="https://bolt.new/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 transition-colors font-medium flex items-center space-x-1"
            >
              <span>Bolt</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="w-1 h-1 bg-slate-600 rounded-full"></div>
          <a 
            href="https://github.com/rayjonesjay" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center space-x-2 text-slate-400 hover:text-emerald-400 transition-colors"
          >
            <Github className="h-4 w-4" />
            <span className="text-sm">rayjonesjay</span>
          </a>
        </div>
      </div>

      {/* Right Side - Authentication */}
      <div className="w-1/2 bg-gray-50 flex items-center justify-center p-12">
        <div className="w-full max-w-md">
          <Card className="bg-white shadow-xl border-0">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome</h2>
                <p className="text-gray-600">
                  Sign in to your account or create a new one
                </p>
              </div>

              {/* Tab Buttons */}
              <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
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
                      className="border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
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
                    className="border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
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
                    className="border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>

                {error && (
                  <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md border border-red-200">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 transition-colors"
                  disabled={loading}
                >
                  {loading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Sign In')}
                </Button>
              </form>

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