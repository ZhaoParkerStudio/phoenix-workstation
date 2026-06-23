import { useState, useCallback } from 'react';
import { Typography, Button, Input, Spin, Tag, Tabs } from 'antd';
import { SendOutlined, RobotOutlined, LinkOutlined, CloseOutlined, HistoryOutlined, SearchOutlined } from '@ant-design/icons';
import { NewsItem, ArticleType, ARTICLE_TYPES, AgentTab, TopicTab, ChatMsg } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const { Text, Title, Paragraph } = Typography;

function MarkdownMsg({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h3: ({ children }) => <h3 style={{ fontSize: 15, fontWeight: 700, margin: '12px 0 6px', color: 'var(--phx-accent)' }}>{children}</h3>,
        h4: ({ children }) => <h4 style={{ fontSize: 14, fontWeight: 600, margin: '10px 0 4px', color: 'var(--phx-text)' }}>{children}</h4>,
        p: ({ children }) => <p style={{ margin: '4px 0', lineHeight: 1.8 }}>{children}</p>,
        ul: ({ children }) => <ul style={{ margin: '4px 0', paddingLeft: 20, lineHeight: 1.8 }}>{children}</ul>,
        ol: ({ children }) => <ol style={{ margin: '4px 0', paddingLeft: 20, lineHeight: 1.8 }}>{children}</ol>,
        li: ({ children }) => <li style={{ margin: '2px 0' }}>{children}</li>,
        strong: ({ children }) => <strong style={{ color: 'var(--phx-text)' }}>{children}</strong>,
        a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--phx-accent)', textDecoration: 'underline' }}>{children}</a>,
        code: ({ className, children }) => {
          const isBlock = className?.includes('language-');
          if (isBlock) return <code style={{ display: 'block', background: 'var(--phx-surface2)', padding: '10px 14px', borderRadius: 6, fontSize: 13, overflowX: 'auto', margin: '6px 0' }}>{children}</code>;
          return <code style={{ background: 'var(--phx-surface2)', padding: '1px 5px', borderRadius: 3, fontSize: 13 }}>{children}</code>;
        },
        pre: ({ children }) => <pre style={{ background: 'var(--phx-surface2)', padding: '10px 14px', borderRadius: 6, overflowX: 'auto', margin: '6px 0' }}>{children}</pre>,
        blockquote: ({ children }) => <blockquote style={{ borderLeft: '3px solid var(--phx-accent)', margin: '6px 0', paddingLeft: 12, color: 'var(--phx-text2)' }}>{children}</blockquote>,
        hr: () => <hr style={{ border: 'none', borderTop: '1px solid var(--phx-border)', margin: '10px 0' }} />,
        table: ({ children }) => <table style={{ borderCollapse: 'collapse', width: '100%', margin: '8px 0', fontSize: 13 }}>{children}</table>,
        th: ({ children }) => <th style={{ border: '1px solid var(--phx-border)', padding: '6px 10px', background: 'var(--phx-surface2)', fontWeight: 600, textAlign: 'left' }}>{children}</th>,
        td: ({ children }) => <td style={{ border: '1px solid var(--phx-border)', padding: '6px 10px' }}>{children}</td>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

interface Props {
  selectedNews: NewsItem | null;
}

export default function MainWorkArea({ selectedNews }: Props) {
  const [agentTabs, setAgentTabs] = useState<AgentTab[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  // Topic tabs: selection & tracking
  const [topicTabs, setTopicTabs] = useState<TopicTab[]>([]);
  const [activeTopicKey, setActiveTopicKey] = useState<string | null>(null);
  const [topicInputs, setTopicInputs] = useState<Record<string, string>>({});
  const [topicLoading, setTopicLoading] = useState<Record<string, boolean>>({});

  const activeTab = agentTabs.find(t => t.key === activeKey);
  const activeTopic = topicTabs.find(t => t.key === activeTopicKey);

  // === Agent Tab management ===
  const openOrSwitchTab = useCallback((agentType: ArticleType, news: NewsItem) => {
    const key = `${agentType}-${news.id}`;
    if (agentTabs.find(t => t.key === key)) { setActiveKey(key); return; }
    setAgentTabs(prev => [...prev, { key, agentType, newsId: news.id, newsTitle: news.title_cn.slice(0, 20), messages: [] }]);
    setActiveKey(key);
    setInputs(prev => ({ ...prev, [key]: '' }));
  }, [agentTabs]);

  const closeAgentTab = useCallback((key: string) => {
    setAgentTabs(prev => {
      const idx = prev.findIndex(t => t.key === key);
      const filtered = prev.filter(t => t.key !== key);
      if (activeKey === key) {
        setActiveKey(filtered.length > 0 ? filtered[Math.min(idx, filtered.length - 1)].key : null);
      }
      return filtered;
    });
  }, [activeKey]);

  const handleAgentSend = async (key: string) => {
    const text = inputs[key]?.trim();
    if (!text) return;
    const tab = agentTabs.find(t => t.key === key);
    if (!tab) return;
    const allMsgs = [...tab.messages, { role: 'user' as const, content: text }];
    setAgentTabs(prev => prev.map(t => t.key === key ? { ...t, messages: allMsgs } : t));
    setInputs(prev => ({ ...prev, [key]: '' }));
    setLoading(prev => ({ ...prev, [key]: true }));
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: allMsgs, agentType: tab.agentType }) });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        setAgentTabs(prev => prev.map(t => t.key === key ? { ...t, messages: [...allMsgs, { role: 'assistant', content: `请求失败(${res.status})，请检查后端服务是否正常运行。${errText.slice(0, 200)}` }] } : t));
        setLoading(prev => ({ ...prev, [key]: false }));
        return;
      }
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let full = '';
      setAgentTabs(prev => prev.map(t => t.key === key ? { ...t, messages: [...allMsgs, { role: 'assistant', content: '' }] } : t));
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              full += JSON.parse(data).content;
              setAgentTabs(prev => prev.map(t => {
                if (t.key !== key) return t;
                const msgs = [...t.messages];
                if (msgs.length > 0 && msgs[msgs.length - 1].role === 'assistant') msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: full };
                return { ...t, messages: msgs };
              }));
            } catch {}
          }
        }
      }
    } catch { setAgentTabs(prev => prev.map(t => t.key === key ? { ...t, messages: [...allMsgs, { role: 'assistant', content: 'AI出错，请重试' }] } : t)); }
    setLoading(prev => ({ ...prev, [key]: false }));
  };

  // === Topic Tab management (Selection & Tracking) ===
  const openTopicTab = useCallback((type: 'selection' | 'tracking', news: NewsItem) => {
    const key = `${type}-${news.id}`;
    const existing = topicTabs.find(t => t.key === key);
    if (existing) { setActiveTopicKey(key); return; }
    const label = type === 'selection' ? '选题' : '追踪';
    setTopicTabs(prev => [...prev, { key, tabType: type, newsId: news.id, newsTitle: news.title_cn.slice(0, 20), label, messages: [] }]);
    setActiveTopicKey(key);
    setTopicInputs(prev => ({ ...prev, [key]: '' }));
    // Auto-trigger tracking if type is tracking
    if (type === 'tracking') {
      setTimeout(() => handleTopicSend(key, true), 100);
    }
  }, [topicTabs]);

  const closeTopicTab = useCallback((key: string) => {
    setTopicTabs(prev => {
      const idx = prev.findIndex(t => t.key === key);
      const filtered = prev.filter(t => t.key !== key);
      if (activeTopicKey === key) setActiveTopicKey(filtered.length > 0 ? filtered[Math.min(idx, filtered.length - 1)].key : null);
      return filtered;
    });
  }, [activeTopicKey]);

  const handleTopicSend = async (key: string, autoTrack: boolean = false) => {
    const text = topicInputs[key]?.trim();
    if (!text && !autoTrack) return;
    const tab = topicTabs.find(t => t.key === key);
    if (!tab) return;
    const userContent = autoTrack ? "请对这一新闻进行深度追踪分析，包括时间线梳理、多源对比和最新进展。" : text;
    const allMsgs = [...tab.messages, { role: 'user' as const, content: userContent }];
    setTopicTabs(prev => prev.map(t => t.key === key ? { ...t, messages: allMsgs } : t));
    if (!autoTrack) setTopicInputs(prev => ({ ...prev, [key]: '' }));
    setTopicLoading(prev => ({ ...prev, [key]: true }));

    const endpoint = tab.tabType === 'tracking' ? '/api/track' : '/api/chat';
    const body = tab.tabType === 'tracking' && selectedNews
      ? JSON.stringify({ title: selectedNews.title_cn, summary: selectedNews.summary, source_names: [selectedNews.source_name], source_urls: [selectedNews.source_url] })
      : JSON.stringify({ messages: allMsgs });

    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        setTopicTabs(prev => prev.map(t => t.key === key ? { ...t, messages: [...allMsgs, { role: 'assistant', content: `请求失败(${res.status})，请检查后端服务是否正常运行。${errText.slice(0, 200)}` }] } : t));
        setTopicLoading(prev => ({ ...prev, [key]: false }));
        return;
      }
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let full = '';
      setTopicTabs(prev => prev.map(t => t.key === key ? { ...t, messages: [...allMsgs, { role: 'assistant', content: '' }] } : t));
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split('\n')) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              full += JSON.parse(data).content;
              setTopicTabs(prev => prev.map(t => {
                if (t.key !== key) return t;
                const msgs = [...t.messages];
                if (msgs.length > 0 && msgs[msgs.length - 1].role === 'assistant') msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: full };
                return { ...t, messages: msgs };
              }));
            } catch {}
          }
        }
      }
    } catch { setTopicTabs(prev => prev.map(t => t.key === key ? { ...t, messages: [...allMsgs, { role: 'assistant', content: 'AI出错，请重试' }] } : t)); }
    setTopicLoading(prev => ({ ...prev, [key]: false }));
  };

  // Empty state
  if (!selectedNews) {
    return (
      <div className="phx-empty"><div className="phx-empty-inner">
        <div className="phx-empty-icon">📰</div>
        <Title level={4} className="phx-empty-title">从左侧看板选择一条新闻</Title>
        <Text type="secondary">选择新闻后，可使用选题咨询、新闻追踪和Agent写作功能</Text>
      </div></div>
    );
  }

  const noTab = !activeKey && !activeTopicKey;

  return (
    <div className="phx-workarea">
      {/* News header */}
      <div className="phx-workarea-header">
        <div className="phx-workarea-news">
          <Tag color="orange" className="phx-workarea-tag">{selectedNews.source_name}</Tag>
          <div className="phx-workarea-title-wrap">
            <Title level={5} className="phx-workarea-title">{selectedNews.title_cn}</Title>
            <Paragraph type="secondary" className="phx-workarea-summary">{selectedNews.summary}</Paragraph>
          </div>
          {selectedNews.source_url?.startsWith('http') && (
            <a href={selectedNews.source_url} target="_blank" rel="noopener noreferrer" className="phx-workarea-link"><LinkOutlined style={{ marginRight: 2 }} />原文</a>
          )}
        </div>
      </div>

      {/* Tool bar: Selection + Tracking + Writing Agents */}
      <div className="phx-agent-bar">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', width: '100%' }}>
          {/* Topic tools */}
          <Text type="secondary" style={{ fontSize: 12, lineHeight: '28px', marginRight: 4, color: 'var(--phx-text2)' }}>
            <SearchOutlined /> 选题工具：
          </Text>
          <Button size="small" onClick={() => openTopicTab('selection', selectedNews)}
            className={`phx-topic-btn ${topicTabs.some(t => t.key === `selection-${selectedNews.id}`) ? 'active' : ''}`}
          >💬 选题咨询</Button>
          <Button size="small" onClick={() => openTopicTab('tracking', selectedNews)}
            className={`phx-topic-btn ${topicTabs.some(t => t.key === `tracking-${selectedNews.id}`) ? 'active' : ''}`}
          >🔍 新闻追踪</Button>

          <span style={{ width: 1, background: 'var(--phx-border)', margin: '0 8px' }} />

          {/* Writing agents */}
          <Text type="secondary" style={{ fontSize: 12, lineHeight: '28px', marginRight: 4, color: 'var(--phx-text2)' }}>
            <RobotOutlined /> 写稿Agent：
          </Text>
          {ARTICLE_TYPES.map(a => (
            <Button key={a.type} size="small" onClick={() => openOrSwitchTab(a.type, selectedNews)}
              className={`phx-agent-btn ${agentTabs.some(t => t.key === `${a.type}-${selectedNews.id}`) ? 'active' : ''}`}
              title={a.description}>{a.label}</Button>
          ))}
        </div>
      </div>

      {/* Tabs and content */}
      <div className="phx-tab-container">
        {/* Tab bar */}
        <div className="phx-tab-bar">
          {/* Topic tabs */}
          {topicTabs.filter(t => t.newsId === selectedNews.id).map(tab => (
            <div key={tab.key} className={`phx-tab ${activeTopicKey === tab.key ? 'active' : ''}`}
              onClick={() => { setActiveTopicKey(tab.key); setActiveKey(null); }}>
              <span className="phx-tab-label">{tab.label}</span>
              <span className="phx-tab-title">{tab.newsTitle}</span>
              <CloseOutlined className="phx-tab-close" onClick={e => { e.stopPropagation(); closeTopicTab(tab.key); }} />
            </div>
          ))}
          {/* Agent tabs */}
          {agentTabs.filter(t => t.newsId === selectedNews.id).map(tab => (
            <div key={tab.key} className={`phx-tab ${activeKey === tab.key ? 'active' : ''}`}
              onClick={() => { setActiveKey(tab.key); setActiveTopicKey(null); }}>
              <span className="phx-tab-label">{tab.agentType}</span>
              <span className="phx-tab-title">{tab.newsTitle}</span>
              <CloseOutlined className="phx-tab-close" onClick={e => { e.stopPropagation(); closeAgentTab(tab.key); }} />
            </div>
          ))}
        </div>

        {/* No tab selected */}
        {noTab && (
          <div className="phx-empty"><div className="phx-empty-inner">
            <RobotOutlined className="phx-empty-robot" />
            <Text type="secondary">点击上方"选题咨询"、"新闻追踪"或写稿Agent按钮开始</Text>
          </div></div>
        )}

        {/* Topic tab content */}
        {activeTopic && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="phx-messages">
              {activeTopic.messages.length === 0 && (
                <div className="phx-messages-empty">
                  <SearchOutlined style={{ fontSize: 32, color: 'var(--phx-accent)', display: 'block', marginBottom: 8 }} />
                  <Text type="secondary">
                    {activeTopic.tabType === 'tracking'
                      ? '新闻追踪已启动，AI正在分析时间线...'
                      : '输入问题咨询选题Agent，如：这条新闻有什么最新进展？'}
                  </Text>
                </div>
              )}
              {activeTopic.messages.map((m, i) => (
                <div key={i} className={`phx-msg ${m.role}`}>
                  <div className="phx-msg-avatar">{m.role === 'assistant' ? '🤖' : '👤'}</div>
                  <div className="phx-msg-bubble">
                    {m.role === 'assistant' && m.content
                      ? <MarkdownMsg content={m.content} />
                      : m.content || (topicLoading[activeTopicKey!] ? <Spin size="small" /> : '')
                    }
                  </div>
                </div>
              ))}
              {topicLoading[activeTopicKey!] && <Text type="secondary" className="phx-msg-thinking">AI正在思考...</Text>}
            </div>
            <div className="phx-input-bar">
              <Input.TextArea value={topicInputs[activeTopicKey!] || ''}
                onChange={e => setTopicInputs(prev => ({ ...prev, [activeTopicKey!]: e.target.value }))}
                onPressEnter={e => { if (!e.shiftKey) { e.preventDefault(); handleTopicSend(activeTopicKey!); } }}
                placeholder={activeTopic.tabType === 'tracking' ? "追问细节..." : "输入问题，如：这条新闻最新进展如何？"}
                autoSize={{ minRows: 1, maxRows: 4 }} className="phx-input" />
              <Button type="primary" icon={<SendOutlined />} onClick={() => handleTopicSend(activeTopicKey!)} loading={topicLoading[activeTopicKey!]} className="phx-send-btn" />
            </div>
          </div>
        )}

        {/* Agent tab content */}
        {activeTab && !activeTopic && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="phx-messages">
              {activeTab.messages.length === 0 && (
                <div className="phx-messages-empty">
                  <RobotOutlined style={{ fontSize: 32, color: 'var(--phx-accent)', display: 'block', marginBottom: 8 }} />
                  <Text type="secondary">输入指令开始与 {activeTab.agentType} Agent对话</Text>
                </div>
              )}
              {activeTab.messages.map((m, i) => (
                <div key={i} className={`phx-msg ${m.role}`}>
                  <div className="phx-msg-avatar">{m.role === 'assistant' ? '🤖' : '👤'}</div>
                  <div className="phx-msg-bubble">
                    {m.role === 'assistant' && m.content
                      ? <MarkdownMsg content={m.content} />
                      : m.content || (loading[activeKey!] ? <Spin size="small" /> : '')
                    }
                  </div>
                </div>
              ))}
              {loading[activeKey!] && <Text type="secondary" className="phx-msg-thinking">AI正在思考...</Text>}
            </div>
            <div className="phx-input-bar">
              <Input.TextArea value={inputs[activeKey!] || ''} onChange={e => setInputs(prev => ({ ...prev, [activeKey!]: e.target.value }))}
                onPressEnter={e => { if (!e.shiftKey) { e.preventDefault(); handleAgentSend(activeKey!); } }}
                placeholder={`向 ${activeTab.agentType} Agent 发送指令...`} autoSize={{ minRows: 1, maxRows: 4 }} className="phx-input" />
              <Button type="primary" icon={<SendOutlined />} onClick={() => handleAgentSend(activeKey!)} loading={loading[activeKey!]} className="phx-send-btn" />
            </div>
          </div>
        )}
      </div>

      <style>{`
        .phx-topic-btn { font-size: 12px; border-radius: 6px; border-color: var(--phx-border); color: var(--phx-text2); height: 28px; }
        .phx-topic-btn.active { background: var(--phx-accent); border-color: var(--phx-accent); color: #FFF; }
      `}</style>
    </div>
  );
}
