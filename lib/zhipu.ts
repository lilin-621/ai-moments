/**
 * AI朋友圈项目 - 智谱AI GLM-4 调用模块
 * 使用免费的 GLM-4-Flash 模型生成AI评论
 */

import { AIUser } from '@/types';

// ==================== 配置 ====================

const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY;

if (!ZHIPU_API_KEY) {
  console.warn('⚠️ 缺少智谱AI API密钥: 请在.env文件中设置 ZHIPU_API_KEY');
}

// ==================== 类型定义 ====================

/** 智谱AI聊天消息 */
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** 智谱AI请求体 */
interface ZhipuRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

/** 智谱AI响应体 */
interface ZhipuResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ==================== API调用函数 ====================

/**
 * 调用智谱AI API生成回复
 * @param messages - 聊天消息列表
 * @returns AI生成的回复内容
 */
export async function callZhipuAI(messages: ChatMessage[]): Promise<string> {
  if (!ZHIPU_API_KEY) {
    throw new Error('智谱AI API密钥未配置');
  }

  const requestBody: ZhipuRequest = {
    model: 'glm-4-flash',
    messages,
    temperature: 0.8, // 适当随机性，生成更有趣的评论
    max_tokens: 200, // 限制回复长度
  };

  const response = await fetch(ZHIPU_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ZHIPU_API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`智谱AI API调用失败: ${response.status} - ${errorText}`);
  }

  const data: ZhipuResponse = await response.json();
  
  if (!data.choices || data.choices.length === 0) {
    throw new Error('智谱AI返回空响应');
  }

  return data.choices[0].message.content.trim();
}

/**
 * 构建AI评论的系统提示词
 * @param aiUser - AI用户角色配置
 * @param postContent - 动态内容
 * @param postImages - 动态图片
 */
function buildSystemPrompt(aiUser: AIUser, postContent: string, postImages: string[]): string {
  const imageHint = postImages.length > 0 
    ? `\n这条动态还包含了 ${postImages.length} 张图片。` 
    : '';
  
  return `你是${aiUser.name}，一个来自互联网的普通网友。
${aiUser.background}
你的说话风格：${aiUser.style.join('、')}
你在朋友圈评论时：
- 会用符合自己人设的方式表达
- 评论简短有趣，通常1-3句话
- 偶尔会使用emoji增加趣味
- 不会太正式，保持轻松自然的网络交流风格

现在有一条新动态：
"${postContent}"
${imageHint}

请用你的人设风格，给这条动态写一条评论。要求：
1. 符合你的性格和说话习惯
2. 简短有趣，1-3句话即可
3. 可以适当玩梗但不要过度
4. 不要太正式或太官方
5. 最多50个汉字

直接输出评论内容，不要加引号或任何前缀。`;
}

/**
 * 生成AI评论
 * @param aiUser - AI角色配置
 * @param postContent - 动态内容
 * @param postImages - 动态图片URL列表
 * @returns 生成的评论内容
 */
export async function generateAIComment(
  aiUser: AIUser,
  postContent: string,
  postImages: string[] = []
): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: buildSystemPrompt(aiUser, postContent, postImages),
    },
    {
      role: 'user', 
      content: '请为这条朋友圈写一条评论',
    },
  ];

  try {
    const comment = await callZhipuAI(messages);
    return comment;
  } catch (error) {
    console.error(`生成AI评论失败 [${aiUser.name}]:`, error);
    throw error;
  }
}

/**
 * 批量生成多条AI评论
 * @param aiUsers - AI角色列表
 * @param postContent - 动态内容
 * @param postImages - 动态图片
 * @param count - 需要生成的数量
 * @returns 生成的评论列表
 */
export async function batchGenerateComments(
  aiUsers: AIUser[],
  postContent: string,
  postImages: string[] = [],
  count: number = 3
): Promise<Array<{ roleId: string; content: string }>> {
  // 随机选择指定数量的AI角色
  const selectedUsers = [...aiUsers]
    .sort(() => Math.random() - 0.5)
    .slice(0, count);

  const results = await Promise.allSettled(
    selectedUsers.map(async (user) => {
      const content = await generateAIComment(user, postContent, postImages);
      return { roleId: user.role, content, userName: user.name };
    })
  );

  // 过滤成功的结果
  const comments: Array<{ roleId: string; content: string }> = [];
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      comments.push({
        roleId: result.value.roleId,
        content: result.value.content,
      });
    } else {
      console.error(`评论生成失败 [${selectedUsers[index]?.name}]:`, result.reason);
    }
  });

  return comments;
}

/**
 * 验证智谱AI API连接
 */
export async function testZhipuConnection(): Promise<boolean> {
  try {
    await callZhipuAI([
      {
        role: 'user',
        content: '你好，请回复"连接成功"',
      },
    ]);
    return true;
  } catch (error) {
    console.error('智谱AI连接测试失败:', error);
    return false;
  }
}

// ==================== 提示词模板 ====================

/**
 * 获取不同场景的提示词模板
 */
export const PROMPT_TEMPLATES = {
  // 美食类
  food: (name: string) => `${name}拍了拍自己的肚子，说今天的饭真香~`,

  // 旅行类
  travel: (name: string) => `${name}表示这地方看着不错，收藏了！`,

  // 工作类
  work: (name: string) => `${name}评论：加油打工人！`,

  // 情感类
  emotion: (name: string) => `${name}点了个赞并表示：懂的都懂`,

  // 默认
  default: (name: string) => `${name}路过点了个赞~`,
};
