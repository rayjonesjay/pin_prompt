"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Home, ArrowLeft, Search, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white border-gray-200">
        <CardContent className="p-8 text-center">
          {/* 404 Illustration */}
          <div className="mb-8">
            <div className="text-8xl font-bold text-gray-200 mb-4">404</div>
            <div className="w-24 h-24 mx-auto bg-teal-100 rounded-full flex items-center justify-center mb-4">
              <Search className="h-12 w-12 text-teal-600" />
            </div>
          </div>

          {/* Error Message */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Page Not Found
          </h1>
          <p className="text-gray-600 mb-8">
            Sorry, we couldn't find the page you're looking for. It might have been moved, deleted, or you entered the wrong URL.
          </p>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={() => router.push('/feed')}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Home className="mr-2 h-4 w-4" />
              Go to Feed
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => router.back()}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
            
            <Button 
              variant="ghost"
              onClick={() => router.push('/forum')}
              className="w-full"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Visit Forum
            </Button>
          </div>

          {/* Help Text */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Need help? Contact us or visit our{' '}
              <button 
                onClick={() => router.push('/forum')}
                className="text-teal-600 hover:text-teal-700 underline"
              >
                community forum
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}