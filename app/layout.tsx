/**
 * 全局布局文件
 * 配置根布局、字体和全局样式
 */

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

// 配置字体
const inter = Inter({ subsets: ['latin'] });

// 全局元数据
export const metadata: Metadata = {
  title: 'AI朋友圈 - 智能互动社交平台',
  description: '一个可以让普通用户发朋友圈、AI自动智能评论的互动平台。15个AI角色为你点赞互动！',
  keywords: ['AI朋友圈', '智能评论', '社交平台', 'AI互动'],
  authors: [{ name: 'AI朋友圈' }],
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
