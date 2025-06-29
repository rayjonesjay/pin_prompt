"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ExternalLink, Github, Sparkles, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
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

    // Check terms acceptance for sign up
    if (isSignUp && !acceptTerms) {
      setError('You must accept the Terms of Service to create an account.');
      setLoading(false);
      return;
    }

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
        // Sign in with email and password only
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

  const TermsModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Terms of Service
            </h2>
            <Button
              variant="ghost"
              onClick={() => setShowTerms(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </Button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-6 text-sm text-gray-700">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">1. Content Guidelines</h3>
              <ul className="space-y-1 ml-4">
                <li>• <strong>No explicit content:</strong> Uploading naked pictures, sexually explicit, or pornographic content of people is strictly prohibited</li>
                <li>• <strong>No harmful content:</strong> Content promoting violence, hate speech, harassment, or illegal activities is not allowed</li>
                <li>• <strong>Respect copyright:</strong> Only upload content you own or have permission to share</li>
                <li>• <strong>No spam:</strong> Avoid repetitive, irrelevant, or promotional content</li>
                <li>• <strong>Age-appropriate:</strong> All content must be suitable for users 13 years and older</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">2. Server Usage & Fair Use</h3>
              <ul className="space-y-1 ml-4">
                <li>• <strong>No server overloading:</strong> Avoid making excessive requests that could impact service performance</li>
                <li>• <strong>Rate limits:</strong> Respect API rate limits and upload quotas</li>
                <li>• <strong>File size limits:</strong> Images (10MB max), Videos (50MB max), Audio (25MB max)</li>
                <li>• <strong>Storage limits:</strong> Each user has a reasonable storage allocation</li>
                <li>• <strong>No automated abuse:</strong> Bots or scripts that abuse our services are prohibited</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">3. Community Standards</h3>
              <ul className="space-y-1 ml-4">
                <li>• <strong>Be respectful:</strong> Treat other users with kindness and respect</li>
                <li>• <strong>No impersonation:</strong> Don't pretend to be someone else</li>
                <li>• <strong>Accurate information:</strong> Provide truthful information about your AI-generated content</li>
                <li>• <strong>Report violations:</strong> Help us maintain a safe community by reporting inappropriate content</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">4. Account Responsibilities</h3>
              <ul className="space-y-1 ml-4">
                <li>• <strong>Secure your account:</strong> Keep your login credentials safe and private</li>
                <li>• <strong>One account per person:</strong> Multiple accounts by the same person are not allowed</li>
                <li>• <strong>Accurate registration:</strong> Provide valid information during sign-up</li>
                <li>• <strong>Age requirement:</strong> You must be at least 13 years old to use PinPrompt</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">5. AI Content Disclosure</h3>
              <ul className="space-y-1 ml-4">
                <li>• <strong>Label AI content:</strong> Clearly indicate when content is AI-generated</li>
                <li>• <strong>Share prompts:</strong> Include the prompts used to generate content when sharing</li>
                <li>• <strong>Model attribution:</strong> Specify which AI model was used</li>
                <li>• <strong>No deepfakes:</strong> Creating realistic fake content of real people without consent is prohibited</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">6. Privacy & Data</h3>
              <ul className="space-y-1 ml-4">
                <li>• <strong>Data collection:</strong> We collect minimal data necessary for service operation</li>
                <li>• <strong>Content ownership:</strong> You retain rights to your original content</li>
                <li>• <strong>Public sharing:</strong> Content you share publicly may be viewed by other users</li>
                <li>• <strong>Data deletion:</strong> You can request account and data deletion at any time</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">7. Enforcement</h3>
              <ul className="space-y-1 ml-4">
                <li>• <strong>Violations:</strong> Breaking these terms may result in content removal or account suspension</li>
                <li>• <strong>Appeals:</strong> You can appeal moderation decisions through our support system</li>
                <li>• <strong>Repeat offenses:</strong> Serious or repeated violations may result in permanent account termination</li>
                <li>• <strong>Legal compliance:</strong> We may cooperate with law enforcement when required</li>
              </ul>
            </div>

            <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
              <p className="text-teal-800 font-medium">
                By using PinPrompt, you agree to these terms and help us maintain a creative, respectful, and safe community for AI content sharing.
              </p>
            </div>

            <div className="text-xs text-gray-500">
              <p>Last updated: December 2024</p>
              <p>These terms may be updated periodically. Continued use of the service constitutes acceptance of any changes.</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <Button
            onClick={() => setShowTerms(false)}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* Left Side - Brand and Features - Desktop Split Screen */}
      <div className="w-full lg:w-1/2 lg:fixed lg:left-0 lg:top-0 lg:h-screen bg-teal-800 text-white p-6 lg:p-12 flex flex-col justify-between order-1 lg:order-1">
        {/* Header */}
        <div>
          <div className="flex items-center mb-8 lg:mb-12">
            <h1 className="text-2xl lg:text-3xl font-bold">PinPrompt</h1>
          </div>

          {/* Main Content */}
          <div className="mb-12 lg:mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold mb-4 leading-tight">
              Share Your AI<br />
              <span className="text-teal-300">Creations</span>
            </h2>
            <p className="text-lg lg:text-xl text-teal-100 mb-8 lg:mb-12 leading-relaxed">
              Discover, share, and learn from AI-generated content and the prompts that created them.<br className="hidden lg:block" />
              Join our community of creators pushing the boundaries of AI creativity.
            </p>

            {/* Slogan Section - Reduced size */}
            <div className="bg-teal-900 border border-teal-600 rounded-xl p-4 lg:p-5 mb-8 lg:mb-12">
              <div className="flex items-center mb-3">
                <Sparkles className="h-5 w-5 text-teal-300 mr-2" />
                <h3 className="text-teal-300 font-semibold text-base lg:text-lg">Our Mission</h3>
              </div>
              <p className="text-lg lg:text-xl font-bold text-white leading-tight">
                Prompt. Generate. Share. Inspire.
              </p>
              <p className="text-teal-200 mt-2 text-xs lg:text-sm">
                The complete cycle of AI creativity in one platform
              </p>
            </div>
          </div>
        </div>

        {/* Footer - Credits Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-6 text-teal-300">
          <div className="flex items-center space-x-4">
            <span className="text-base lg:text-lg">Built on</span>
            <a 
              href="https://bolt.new/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-white hover:text-teal-200 transition-colors font-medium flex items-center space-x-4"
            >
              <span className="text-base lg:text-lg">Bolt</span>
              <img 
                src="/bolt_budge copy.png"
                alt="Bolt" 
                className="w-16 h-16 lg:w-20 lg:h-20 object-contain"
              />
              <ExternalLink className="h-4 w-4 lg:h-5 lg:w-5" />
            </a>
          </div>
          <div className="w-1 h-1 bg-teal-500 rounded-full hidden sm:block"></div>
          <a 
            href="https://github.com/rayjonesjay" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center space-x-2 text-teal-300 hover:text-white transition-colors"
          >
            <Github className="h-4 w-4" />
            <span className="text-sm">rayjonesjay</span>
          </a>
        </div>
      </div>

      {/* Right Side - Authentication - Desktop Split Screen */}
      <div className="w-full lg:w-1/2 lg:ml-auto bg-white flex items-center justify-center p-6 lg:p-12 order-2 lg:order-2 min-h-screen">
        <div className="w-full max-w-md">
          <Card className="bg-white border border-gray-200 shadow-xl">
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
                      className="bg-white border-gray-300 text-gray-900 focus:border-teal-700 focus:ring-teal-700"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 text-sm font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-white border-gray-300 text-gray-900 focus:border-teal-700 focus:ring-teal-700"
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
                    className="bg-white border-gray-300 text-gray-900 focus:border-teal-700 focus:ring-teal-700"
                  />
                </div>

                {/* Terms of Service Checkbox for Sign Up */}
                {isSignUp && (
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="terms"
                        checked={acceptTerms}
                        onCheckedChange={setAcceptTerms}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label 
                          htmlFor="terms" 
                          className="text-sm text-gray-700 leading-relaxed cursor-pointer"
                        >
                          I agree to the{' '}
                          <button
                            type="button"
                            onClick={() => setShowTerms(true)}
                            className="text-teal-600 hover:text-teal-700 underline font-medium"
                          >
                            Terms of Service
                          </button>
                          {' '}and understand the community guidelines
                        </Label>
                      </div>
                    </div>
                    
                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                      <p className="text-xs text-teal-700">
                        <strong>Quick reminder:</strong> No explicit content, respect server limits, be kind to the community, and properly label your AI-generated content.
                      </p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md border border-red-200">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-teal-700 hover:bg-teal-800 text-white py-3 transition-colors font-medium"
                  disabled={loading || (isSignUp && !acceptTerms)}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Please wait...
                    </div>
                  ) : (
                    isSignUp ? 'Create Account' : 'Sign In'
                  )}
                </Button>
              </form>

              {/* Tab Buttons - Moved to bottom */}
              <div className="flex mt-6 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => {
                    setIsSignUp(false);
                    setAcceptTerms(false);
                    setError('');
                  }}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    !isSignUp 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setIsSignUp(true);
                    setError('');
                  }}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    isSignUp 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {isSignUp && (
                <p className="text-xs text-gray-500 text-center mt-4">
                  By creating an account, you agree to our community guidelines and help us maintain a safe, creative environment.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Terms of Service Modal */}
      {showTerms && <TermsModal />}
    </div>
  );
}