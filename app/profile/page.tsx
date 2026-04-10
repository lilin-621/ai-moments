/**
 * 个人中心页面
 * 显示用户信息和发布的动态
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import PostCard from '@/components/PostCard';

interface User {
  id: string;
  email: string;
  nickname: string;
  avatar: string;
  created_at?: string;
}

interface Post {
  id: string;
  userId: string;
  userNickname: string;
  userAvatar: string;
  content: string;
  images: string[];
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  isLiked?: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'likes'>('posts');
  const [stats, setStats] = useState({
    posts: 0,
    likes: 0,
    comments: 0,
  });

  // 加载用户信息和动态
  const loadData = useCallback(async () => {
    try {
      // 获取用户信息
      const userResponse = await fetch('/api/auth/verify');
      const userData = await userResponse.json();
      
      if (!userData.authenticated) {
        router.push('/login');
        return;
      }
      
      setUser(userData.user);

      // 获取用户动态
      const postsResponse = await fetch(`/api/posts?userId=${userData.user.id}&pageSize=100`);
      const postsData = await postsResponse.json();
      
      if (postsData.success) {
        setPosts(postsData.posts);
        setStats(prev => ({ ...prev, posts: postsData.total }));
      }

      // 获取点赞数
      const likesResponse = await fetch('/api/likes');
      const likesData = await likesResponse.json();
      
      if (likesData.success) {
        setStats(prev => ({ ...prev, likes: likesData.likes?.length || 0 }));
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 处理动态删除
  const handlePostDelete = (postId: string) => {
    setPosts(posts.filter(p => p.id !== postId));
    setStats(prev => ({ ...prev, posts: prev.posts - 1 }));
  };

  // 格式化注册时间
  const formatJoinDate = (dateString?: string) => {
    if (!dateString) return '未知';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 导航栏 */}
      <Navbar user={user} />
      
      {/* 主内容区 */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* 用户信息卡片 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          {/* 背景装饰 */}
          <div className="h-32 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
          
          {/* 用户信息 */}
          <div className="px-6 pb-6 -mt-12">
            <div className="flex items-end justify-between">
              <div className="flex items-end gap-4">
                <img
                  src={user.avatar}
                  alt={user.nickname}
                  className="w-24 h-24 rounded-2xl border-4 border-white shadow-lg"
                />
                <div className="mb-1">
                  <h1 className="text-2xl font-bold text-gray-900">{user.nickname}</h1>
                  <p className="text-gray-500 text-sm">{user.email}</p>
                </div>
              </div>
              
              <Link
                href="/publish"
                className="mb-2 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-full hover:bg-blue-600 transition-colors"
              >
                发布动态
              </Link>
            </div>
            
            {/* 统计信息 */}
            <div className="flex gap-6 mt-6 pt-4 border-t border-gray-100">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{stats.posts}</p>
                <p className="text-gray-500 text-sm">动态</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{stats.likes}</p>
                <p className="text-gray-500 text-sm">获赞</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{stats.comments}</p>
                <p className="text-gray-500 text-sm">评论</p>
              </div>
            </div>
            
            {/* 会员信息 */}
            <div className="mt-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="text-xl">👑</span>
                <div>
                  <p className="font-medium text-gray-900 text-sm">AI朋友圈会员</p>
                  <p className="text-gray-500 text-xs">享受更多AI互动功能</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI角色展示 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">🎭 AI互动角色</h2>
          <p className="text-gray-500 text-sm mb-4">
            发布动态后，这些AI角色会为你带来有趣的评论：
          </p>
          <div className="grid grid-cols-5 gap-3">
            {[
              { name: '小王', role: '程序员', emoji: '💻' },
              { name: '阿杰', role: '健身教练', emoji: '💪' },
              { name: '琳琳', role: '美食博主', emoji: '🍜' },
              { name: '大橘', role: '铲屎官', emoji: '🐱' },
              { name: '云朵', role: '文艺青年', emoji: '📚' },
              { name: '老张', role: '退休大爷', emoji: '🌿' },
              { name: '小美', role: '大学生', emoji: '📱' },
              { name: '阿强', role: '创业者', emoji: '🚀' },
              { name: '小七', role: '摄影师', emoji: '📷' },
              { name: '叶子', role: '旅行达人', emoji: '✈️' },
              { name: '大鹏', role: '游戏宅', emoji: '🎮' },
              { name: '晓晓', role: '护士', emoji: '👩‍⚕️' },
              { name: '老陈', role: '中年大叔', emoji: '👔' },
              { name: '小满', role: '农村小伙', emoji: '🌾' },
              { name: '阿星', role: '夜猫子', emoji: '🌙' },
            ].map((ai) => (
              <div
                key={ai.name}
                className="flex flex-col items-center p-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <span className="text-2xl mb-1">{ai.emoji}</span>
                <p className="text-xs font-medium text-gray-700">{ai.name}</p>
                <p className="text-xs text-gray-400">{ai.role}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 动态列表 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Tab切换 */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex-1 py-4 text-center font-medium transition-colors ${
                activeTab === 'posts'
                  ? 'text-blue-500 border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              我的动态 ({stats.posts})
            </button>
            <button
              onClick={() => setActiveTab('likes')}
              className={`flex-1 py-4 text-center font-medium transition-colors ${
                activeTab === 'likes'
                  ? 'text-blue-500 border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              我的点赞 ({stats.likes})
            </button>
          </div>

          {/* 动态列表 */}
          <div className="p-4">
            {activeTab === 'posts' && (
              posts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <p className="text-gray-500 mb-4">还没有发布过动态</p>
                  <Link
                    href="/publish"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-full hover:bg-blue-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    发布第一条动态
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      currentUserId={user.id}
                      onDelete={handlePostDelete}
                    />
                  ))}
                </div>
              )
            )}

            {activeTab === 'likes' && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <p className="text-gray-500">点赞功能开发中...</p>
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* 底部留白 */}
      <div className="h-20" />
    </div>
  );
}
