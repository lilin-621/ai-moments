/**
 * 首页 - 动态流
 * 显示所有用户的动态列表
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import PostCard from '@/components/PostCard';

interface User {
  id: string;
  email: string;
  nickname: string;
  avatar: string;
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

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  // 加载用户信息
  const loadUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/verify');
      const data = await response.json();
      
      if (data.authenticated) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      setUser(null);
    }
  }, []);

  // 加载动态列表
  const loadPosts = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      const response = await fetch(`/api/posts?page=${pageNum}&pageSize=10`);
      const data = await response.json();
      
      if (data.success) {
        if (append) {
          setPosts(prev => [...prev, ...data.posts]);
        } else {
          setPosts(data.posts);
        }
        setHasMore(data.hasMore);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('加载动态失败:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    const init = async () => {
      await loadUser();
      await loadPosts(1);
    };
    init();
  }, [loadUser, loadPosts]);

  // 下拉刷新
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPosts(1);
    setRefreshing(false);
  };

  // 加载更多
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadPosts(page + 1, true);
    }
  };

  // 处理登录按钮点击
  const handleLoginClick = () => {
    router.push('/login');
  };

  // 处理动态删除
  const handlePostDelete = (postId: string) => {
    setPosts(posts.filter(p => p.id !== postId));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 导航栏 */}
      <Navbar user={user} onLoginClick={handleLoginClick} />
      
      {/* 主内容区 */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* 欢迎提示（未登录时显示） */}
        {!user && (
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 mb-6 text-white">
            <h1 className="text-2xl font-bold mb-2">欢迎来到AI朋友圈 🤖</h1>
            <p className="text-white/90 mb-4">
              发布你的第一条动态，15个AI角色将为你带来有趣的智能评论互动！
            </p>
            <button
              onClick={handleLoginClick}
              className="px-6 py-2 bg-white text-blue-600 font-medium rounded-full hover:bg-gray-100 transition-colors"
            >
              立即登录体验
            </button>
          </div>
        )}

        {/* 动态列表 */}
        {loading ? (
          // 加载状态
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full image-placeholder" />
                  <div className="space-y-2">
                    <div className="w-24 h-4 bg-gray-200 rounded image-placeholder" />
                    <div className="w-16 h-3 bg-gray-100 rounded image-placeholder" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="w-full h-4 bg-gray-100 rounded image-placeholder" />
                  <div className="w-2/3 h-4 bg-gray-100 rounded image-placeholder" />
                </div>
                <div className="w-full h-48 mt-4 bg-gray-100 rounded-lg image-placeholder" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          // 空状态
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">暂无动态</h3>
            <p className="text-gray-500 mb-6">
              {user ? '快来发布第一条动态吧！' : '登录后即可发布动态并体验AI评论'}
            </p>
            {user ? (
              <button
                onClick={() => router.push('/publish')}
                className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
              >
                发布动态
              </button>
            ) : (
              <button
                onClick={handleLoginClick}
                className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
              >
                登录
              </button>
            )}
          </div>
        ) : (
          // 动态列表
          <div className="space-y-4">
            {/* 下拉刷新提示 */}
            {refreshing && (
              <div className="flex items-center justify-center py-4">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            
            {/* 动态卡片 */}
            {posts.map((post, index) => (
              <div 
                key={post.id} 
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <PostCard
                  post={post}
                  currentUserId={user?.id}
                  onDelete={handlePostDelete}
                />
              </div>
            ))}
            
            {/* 加载更多 */}
            {hasMore && (
              <div className="text-center py-6">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-2 bg-white border border-gray-200 text-gray-600 rounded-full hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingMore ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      加载中...
                    </span>
                  ) : (
                    '加载更多'
                  )}
                </button>
              </div>
            )}
            
            {/* 没有更多了 */}
            {!hasMore && posts.length > 0 && (
              <div className="text-center py-6 text-gray-400 text-sm">
                — 已加载全部动态 —
              </div>
            )}
          </div>
        )}
      </main>
      
      {/* 底部留白 */}
      <div className="h-20" />
    </div>
  );
}
