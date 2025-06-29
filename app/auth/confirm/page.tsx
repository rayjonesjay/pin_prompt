"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function ConfirmPage() {
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        const token_hash = searchParams.get('token_hash');
        const type = searchParams.get('type');

        if (token_hash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as any,
          });

          if (error) {
            setError(error.message);
          } else {
            setConfirmed(true);
            // Redirect to feed after successful confirmation
            setTimeout(() => {
              router.push('/feed');
            }, 2000);
          }
        } else {
          setError('Invalid confirmation link');
        }
      } catch (error: any) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    handleEmailConfirmation();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white border-gray-200">
        <CardContent className="p-8 text-center">
          {loading ? (
            <>
              <Loader2 className="h-16 w-16 text-teal-600 mx-auto mb-4 animate-spin" />
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                Confirming your email...
              </h1>
              <p className="text-gray-600">
                Please wait while we verify your email address.
              </p>
            </>
          ) : confirmed ? (
            <>
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                Email Confirmed!
              </h1>
              <p className="text-gray-600 mb-6">
                Your email has been successfully verified. You'll be redirected to your feed shortly.
              </p>
              <Button 
                onClick={() => router.push('/feed')}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                Go to Feed
              </Button>
            </>
          ) : (
            <>
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                Confirmation Failed
              </h1>
              <p className="text-gray-600 mb-6">
                {error || 'There was an error confirming your email address.'}
              </p>
              <div className="space-y-2">
                <Button 
                  onClick={() => router.push('/')}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                >
                  Back to Sign In
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="w-full"
                >
                  Try Again
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}