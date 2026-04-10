/**
 * 组件：动态卡片
 * 显示单条动态，包含内容、图片、点赞、评论等信息
 */

'use client';

import { useState, useEffect } from 'react';
import CommentItem from './CommentItem';

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

interface Comment {
  id: string;
  postId: string;
  userId: string;
  userNickname: string;
  userAvatar: string;
  content: string;
  isAI: boolean;
  aiRole?: string;
  createdAt: string;
}

interface PostCardProps {
  post: Post;
  currentUserId?: string;
  onLikeChange?: (postId: string, isLiked: boolean, likesCount: number) => void;
  onCommentAdded?: (comment: Comment) => void;
  onCommentDeleted?: (commentId: string) => void;
  onDelete?: (postId: string) => void;
}

export default function PostCard({
  post,
  currentUserId,
  onLikeChange,
  onCommentAdded,
  onCommentDeleted,
  onDelete,
}: PostCardProps) {
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [isLiking, setIsLiking] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [commentsPage, setCommentsPage] = useState(1);

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  // 加载评论
  const loadComments = async (page = 1, append = false) => {
    setCommentsLoading(true);
    
    try {
      const response = await fetch(
        `/api/comments?postId=${post.id}&page=${page}&pageSize=20`
      );
      const data = await response.json();
      
      if (data.success) {
        setComments(append ? [...comments, ...data.comments] : data.comments);
        setHasMoreComments(data.hasMore);
        setCommentsPage(page);
      }
    } catch (error) {
      console.error('加载评论失败:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  // 切换评论显示
  const toggleComments = () => {
    if (!showComments) {
      loadComments(1);
    }
    setShowComments(!showComments);
  };

  // 加载更多评论
  const loadMoreComments = () => {
    if (hasMoreComments) {
      loadComments(commentsPage + 1, true);
    }
  };

  // 点赞/取消点赞
  const handleLike = async () => {
    if (!currentUserId) {
      alert('请先登录');
      return;
    }
    
    if (isLiking) return;
    
    setIsLiking(true);
    const newIsLiked = !isLiked;
    const newCount = newIsLiked ? likesCount + 1 : likesCount - 1;
    
    // 乐观更新
    setIsLiked(newIsLiked);
    setLikesCount(newCount);
    
    try {
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          action: newIsLiked ? 'like' : 'unlike',
        }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        // 回滚
        setIsLiked(!newIsLiked);
        setLikesCount(newCount);
        alert(data.message);
      } else {
        onLikeChange?.(post.id, data.liked, data.likesCount);
      }
    } catch (error) {
      console.error('点赞失败:', error);
      // 回滚
      setIsLiked(!newIsLiked);
      setLikesCount(newCount);
    } finally {
      setIsLiking(false);
    }
  };

  // 提交评论
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUserId) {
      alert('请先登录');
      return;
    }
    
    if (!newComment.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          content: newComment.trim(),
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setNewComment('');
        setComments([...comments, data.comment]);
        onCommentAdded?.(data.comment);
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('评论失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 删除评论
  const handleDeleteComment = async (commentId: string) => {
    try {
      const response = await fetch(`/api/comments?id=${commentId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setComments(comments.filter(c => c.id !== commentId));
        onCommentDeleted?.(commentId);
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('删除评论失败:', error);
    }
  };

  // 删除动态
  const handleDeletePost = async () => {
    if (!confirm('确定要删除这条动态吗？')) return;
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/posts?id=${post.id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        onDelete?.(post.id);
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('删除动态失败:', error);
    } finally {
      setIsDeleting(false);
      setShowOptions(false);
    }
  };

  // 是否可以删除
  const canDelete = currentUserId === post.userId;

  return (
    <article className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 头部：用户信息 */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={post.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.userId}`}
            alt={post.userNickname}
            className="w-12 h-12 rounded-full"
          />
          <div>
            <h3 className="font-medium text-gray-900">{post.userNickname}</h3>
            <p className="text-gray-400 text-sm">{formatTime(post.createdAt)}</p>
          </div>
        </div>
        
        {/* 更多操作 */}
        {canDelete && (
          <div className="relative">
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            
            {showOptions && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowOptions(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20 min-w-[120px]">
                  <button
                    onClick={handleDeletePost}
                    disabled={isDeleting}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50"
                  >
                    {isDeleting ? '删除中...' : '删除动态'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      
      {/* 内容 */}
      <div className="px-4 pb-3">
        <p className="text-gray-800 whitespace-pre-wrap break-words">{post.content}</p>
      </div>
      
      {/* 图片 */}
      {post.images && post.images.length > 0 && (
        <div className={`px-4 pb-3 grid gap-1 ${
          post.images.length === 1 ? 'grid-cols-1' :
          post.images.length === 2 ? 'grid-cols-2' :
          'grid-cols-3'
        }`}>
          {post.images.slice(0, 9).map((image, index) => (
            <div
              key={index}
              className={`relative overflow-hidden rounded-lg bg-gray-100 ${
                post.images.length === 1 ? 'max-h-96' : 'aspect-square'
              }`}
            >
              <img
                src={image}
                alt={`图片 ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}
      
      {/* 互动栏 */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-6">
        {/* 点赞 */}
        <button
          onClick={handleLike}
          disabled={isLiking}
          className={`flex items-center gap-1.5 transition-colors ${
            isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
          } disabled:opacity-50`}
        >
          <svg className="w-5 h-5" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span className="text-sm font-medium">{likesCount}</span>
        </button>
        
        {/* 评论 */}
        <button
          onClick={toggleComments}
          className="flex items-center gap-1.5 text-gray-500 hover:text-blue-500 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-sm font-medium">{post.commentsCount}</span>
        </button>
      </div>
      
      {/* 评论列表 */}
      {showComments && (
        <div className="border-t border-gray-100">
          {/* 评论输入框 */}
          {currentUserId && (
            <form onSubmit={handleSubmitComment} className="p-4 border-b border-gray-100">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="写评论..."
                  className="flex-1 px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  maxLength={200}
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || isSubmitting}
                  className="px-4 py-2 bg-blue-500 text-white rounded-full text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? '发送中...' : '发送'}
                </button>
              </div>
            </form>
          )}
          
          {/* 评论列表 */}
          <div className="max-h-96 overflow-y-auto">
            {commentsLoading && comments.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : comments.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                还没有评论，快来抢沙发~
              </div>
            ) : (
              <div className="p-4 space-y-1">
                {comments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    currentUserId={currentUserId}
                    onDelete={handleDeleteComment}
                  />
                ))}
                
                {/* 加载更多 */}
                {hasMoreComments && (
                  <button
                    onClick={loadMoreComments}
                    disabled={commentsLoading}
                    className="w-full py-2 text-blue-500 text-sm hover:bg-blue-50 rounded-lg disabled:opacity-50"
                  >
                    {commentsLoading ? '加载中...' : '加载更多评论'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
