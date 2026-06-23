export interface NewsItem {
  id: string;
  title_cn: string;
  summary: string;
  source_name: string;
  source_url: string;
  language: string;
  published_at: string;
  importance: number;
  raw_content: string;
  status: string;
}

export interface WSMessage {
  type: string;
  data: NewsItem[] | NewsItem | any;
}

export type ArticleType = 'LVO' | 'SOT' | 'SBONLY' | 'SBLVO' | '干稿' | '干+图';

export interface ArticleTypeInfo {
  type: ArticleType;
  label: string;
  webosLevel: string;
  description: string;
}

export const ARTICLE_TYPES: ArticleTypeInfo[] = [
  { type: 'LVO', label: 'LVO', webosLevel: 'SOT', description: '画外音+同期声' },
  { type: 'SOT', label: 'SOT', webosLevel: 'SOT', description: '同期声稿件' },
  { type: 'SBLVO', label: 'SB+LVO', webosLevel: 'SOT', description: '口播+画外音' },
  { type: 'SBONLY', label: 'SBonly', webosLevel: '干稿', description: '纯口播稿件' },
  { type: '干稿', label: '(干)', webosLevel: '干稿', description: '纯文字稿件' },
  { type: '干+图', label: '干+圖', webosLevel: '干稿', description: '文字+图片' },
];

export interface AgentRule { id: string; content: string; }

export interface AgentSkill { id: string; label: string; description: string; enabled: boolean; }

export const DEFAULT_SKILLS: AgentSkill[] = [
  { id: 'web_search', label: '联网搜索', description: '允许Agent搜索最新信息', enabled: true },
  { id: 'cite_source', label: '引用原文', description: '逐句引用新闻来源', enabled: true },
  { id: 'format_check', label: '格式检查', description: '自动校验稿件格式规范', enabled: false },
];

export interface AgentTab {
  key: string;
  agentType: ArticleType;
  newsId: string;
  newsTitle: string;
  messages: ChatMsg[];
}

export interface ChatMsg { role: 'user' | 'assistant'; content: string; }

export interface TopicTab {
  key: string;
  tabType: 'selection' | 'tracking';
  newsId?: string;
  newsTitle?: string;
  label: string;
  messages: ChatMsg[];
}
