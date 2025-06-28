"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Bell,
  Heart,
  UserPlus,
  MessageSquare,
  MessageCircle,
  Check,
  CheckCheck
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

interface User {
  id: string;
  username: string;
  avatar_url?: string;
}

interface Notification {
  id: string;
  user_id: string;
  type: 'like' | 'follow' | 'message' | 'comment';
  title: string;
  message: string;
  related_id?: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAsRead, setMarkingAsRead] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Set up real-time subscription
      const subscription = supabase
        .channel('notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev]);
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, () => {
          fetchNotifications();
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const checkUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      router.push('/');
      return;
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('id, username, avatar_url')
      .eq('id', authUser.id)
      .single();

    if (userProfile) {
      setUser(userProfile);
    }
    setLoading(false);
  };

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (markingAsRead.has(notificationId)) return;

    setMarkingAsRead(prev => new Set(prev).add(notificationId));

    try {
      await supabase.rpc('mark_notifications_read', {
        notification_ids: [notificationId]
      });

      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    } finally {
      setMarkingAsRead(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    try {
      await supabase.rpc('mark_notifications_read', {
        notification_ids: unreadIds
      });

      setNotifications(prev => 
        prev.map(notif => ({ ...notif, is_read: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="h-5 w-5 text-red-500" />;
      case 'follow':
        return <UserPlus className="h-5 w-5 text-teal-500" />;
      case 'message':
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case 'comment':
        return <MessageCircle className="h-5 w-5 text-green-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'message':
        router.push('/messages');
        break;
      case 'follow':
        if (notification.related_id) {
          // Navigate to the user's profile who followed
          router.push(`/profile/${notification.related_id}`);
        }
        break;
      case 'like':
      case 'comment':
        // Navigate to feed or specific prompt
        router.push('/feed');
        break;
      default:
        break;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-600"></div>
          <p className="mt-4 text-gray-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/feed')}
              className="text-gray-600 hover:text-teal-600"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Feed
            </Button>
            {unreadCount > 0 && (
              <Button
                onClick={markAllAsRead}
                className="bg-teal-600 hover:bg-teal-700 text-white"
                size="sm"
              >
                <CheckCheck className="mr-2 h-4 w-4" />
                Mark all as read
              </Button>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Bell className="h-8 w-8 mr-3 text-teal-600" />
                Notifications
                {unreadCount > 0 && (
                  <Badge className="ml-3 bg-teal-600 text-white">
                    {unreadCount}
                  </Badge>
                )}
              </h1>
              <p className="text-gray-600 mt-2">
                Stay updated with likes, follows, messages, and comments
              </p>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <Card className="bg-white border-gray-200">
            <CardContent className="p-12 text-center">
              <Bell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                No notifications yet
              </h3>
              <p className="text-gray-500">
                When someone likes your posts, follows you, or sends a message, you'll see it here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <Card 
                key={notification.id} 
                className={`bg-white border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                  !notification.is_read ? 'border-l-4 border-l-teal-500' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className={`font-medium ${notification.is_read ? 'text-gray-600' : 'text-gray-900'}`}>
                          {notification.title}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </span>
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              disabled={markingAsRead.has(notification.id)}
                              className="h-6 w-6 p-0"
                            >
                              {markingAsRead.has(notification.id) ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-teal-600"></div>
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className={`text-sm mt-1 ${notification.is_read ? 'text-gray-500' : 'text-gray-700'}`}>
                        {notification.message}
                      </p>
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-teal-500 rounded-full mt-2"></div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}