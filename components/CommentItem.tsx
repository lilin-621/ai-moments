/**
 * 组件：评论项
 * 显示单条评论，包含用户信息和AI标识
 */

'use client';

import { useState } from 'react';

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

interface CommentItemProps {
  comment: Comment;
  currentUserId?: string;
  onDelete?: (commentId: string) => void;
}

// AI角色显示配置
const AI_ROLE_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  programmer: { label: '程序员', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  fitness: { label: '健身教练', color: 'text-green-600', bgColor: 'bg-green-50' },
  foodie: { label: '美食博主', color: 'text-orange-600', bgColor: 'bg-orange-50' },
  cat: { label: '铲屎官', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  artistic: { label: '文艺青年', color: 'text-purple-600', bgColor: 'bg-purple-50' },
  elder: { label: '退休大爷', color: 'text-gray-600', bgColor: 'bg-gray-50' },
  college: { label: '大学生', color: 'text-pink-600', bgColor: 'bg-pink-50' },
  entrepreneur: { label: '创业者', color: 'text-red-600', bgColor: 'bg-red-50' },
  photographer: { label: '摄影师', color: 'text-teal-600', bgColor: 'bg-teal-50' },
  traveler: { label: '旅行达人', color: 'text-cyan-600', bgColor: 'bg-cyan-50' },
  gamer: { label: '游戏宅', color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  nurse: { label: '护士', color: 'text-rose-600', bgColor: 'bg-rose-50' },
  uncle: { label: '中年大叔', color: 'text-stone-600', bgColor: 'bg-stone-50' },
  rural: { label: '农村小伙', color: 'text-amber-600', bgColor: 'bg-amber-50' },
  nightowl: { label: '夜猫子', color: 'text-violet-600', bgColor: 'bg-violet-50' },
};

export default function CommentItem({ comment, currentUserId, onDelete }: CommentItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  // 处理删除
  const handleDelete = async () => {
    if (!onDelete) return;
    
    setIsDeleting(true);
    try {
      await onDelete(comment.id);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // 判断是否可以删除
  const canDelete = currentUserId && (
    currentUserId === comment.userId || 
    comment.isAI // AI评论也可被删除
  );

  // 获取AI角色配置
  const aiConfig = comment.aiRole ? AI_ROLE_CONFIG[comment.aiRole] : null;

  return (
    <div className="group flex gap-3 py-3 hover:bg-gray-50/50 rounded-lg transition-colors">
      {/* 头像 */}
      <img
        src={comment.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.userId}`}
        alt={comment.userNickname}
        className="w-8 h-8 rounded-full flex-shrink-0"
      />
      
      {/* 内容区域 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {/* 用户名 */}
          <span className="font-medium text-gray-900 text-sm">
            {comment.userNickname}
          </span>
          
          {/* AI标识 */}
          {comment.isAI && aiConfig && (
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${aiConfig.color} ${aiConfig.bgColor}`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {aiConfig.label}
            </span>
          )}
          
          {/* 时间 */}
          <span className="text-gray-400 text-xs">
            {formatTime(comment.createdAt)}
          </span>
        </div>
        
        {/* 评论内容 */}
        <p className="text-gray-700 text-sm mt-1 break-words">
          {comment.content}
        </p>
      </div>
      
      {/* 操作按钮 */}
      {canDelete && (
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
            className="p-1 text-gray-400 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
          
          {/* 删除确认弹窗 */}
          {showDeleteConfirm && (
            <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10 min-w-[120px]">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                    删除中...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    删除评论
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
