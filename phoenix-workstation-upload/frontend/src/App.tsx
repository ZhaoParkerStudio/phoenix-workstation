import { useState, useCallback } from 'react';
import { Typography, Button, Input, Checkbox, Tag, Divider } from 'antd';
import { LogoutOutlined, SunOutlined, MoonOutlined, PlusOutlined, DeleteOutlined, RobotOutlined } from '@ant-design/icons';
import { useAuth } from './hooks/useAuth';
import { useNewsFeed } from './hooks/useNewsFeed';
import LoginPage from './components/LoginPage';
import NewsBoard from './components/NewsBoard';
import MainWorkArea from './components/MainWorkArea';
import { NewsItem, ArticleType, AgentRule, AgentSkill, DEFAULT_SKILLS, ARTICLE_TYPES } from './types';

const { Text } = Typography;

function App() {
  const { loggedIn, logout } = useAuth();
  const { news, connected } = useNewsFeed();
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false);

  // Agent 规则（每个Agent独立）
  const [agentRules, setAgentRules] = useState<Record<ArticleType, AgentRule[]>>({} as any);
  // Agent 技能
  const [agentSkills, setAgentSkills] = useState<AgentSkill[]>(DEFAULT_SKILLS.map(s => ({ ...s })));
  // 当前选中的Agent类型（用于右侧面板）
  const [selectedAgentType, setSelectedAgentType] = useState<ArticleType>('LVO');

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetch('/api/news?refresh=1');
    } catch {}
    setTimeout(() => setRefreshing(false), 2000);
  }, []);

  const addAgentRule = useCallback(() => {
    const rules = agentRules[selectedAgentType] || [];
    const newRule: AgentRule = {
      id: Date.now().toString(),
      content: '',
    };
    setAgentRules(prev => ({ ...prev, [selectedAgentType]: [...rules, newRule] }));
  }, [selectedAgentType, agentRules]);

  const updateAgentRule = useCallback((ruleId: string, content: string) => {
    setAgentRules(prev => {
      const rules = prev[selectedAgentType] || [];
      return { ...prev, [selectedAgentType]: rules.map(r => r.id === ruleId ? { ...r, content } : r) };
    });
  }, [selectedAgentType]);

  const deleteAgentRule = useCallback((ruleId: string) => {
    setAgentRules(prev => ({
      ...prev,
      [selectedAgentType]: (prev[selectedAgentType] || []).filter(r => r.id !== ruleId),
    }));
  }, [selectedAgentType]);

  const toggleSkill = useCallback((skillId: string) => {
    setAgentSkills(prev => prev.map(s => s.id === skillId ? { ...s, enabled: !s.enabled } : s));
  }, []);

  if (!loggedIn) return <LoginPage />;

  const theme = darkMode ? 'dark' : 'light';

  return (
    <div className={`phx-app phx-theme-${theme}`} data-theme={theme}>
      {/* Top Bar */}
      <div className="phx-topbar">
        <div className="phx-topbar-left">
          <Text className="phx-logo">🔥 Phoenix 实时初稿工作台</Text>
          <Text type="secondary" className="phx-subtitle">凤凰卫视北京编辑中心</Text>
        </div>
        <div className="phx-topbar-right">
          <Button
            size="small"
            type="text"
            icon={darkMode ? <SunOutlined /> : <MoonOutlined />}
            onClick={() => setDarkMode(!darkMode)}
            className="phx-topbar-btn"
            title={darkMode ? '切换浅色模式' : '切换深色模式'}
          />
          <Button
            size="small"
            type="text"
            icon={<LogoutOutlined />}
            onClick={logout}
            className="phx-topbar-btn"
            title="退出登录"
          />
        </div>
      </div>

      {/* Main Layout */}
      <div className="phx-main">
        {/* Left: News Board */}
        <div className="phx-left">
          <NewsBoard
            news={news}
            connected={connected}
            onSelect={item => { setSelectedNews(item); setShowRightPanel(false); }}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            selectedId={selectedNews?.id}
          />
        </div>

        {/* Center: Work Area */}
        <div className="phx-center">
          <MainWorkArea
            selectedNews={selectedNews}
          />
        </div>

        {/* Right: Agent Panel (toggled) */}
        {showRightPanel && (
          <div className="phx-right">
            {/* Agent Selector */}
            <div className="phx-right-section">
              <Text className="phx-right-title"><RobotOutlined /> Agent配置</Text>
              <div className="phx-right-agent-list">
                {ARTICLE_TYPES.map(a => (
                  <Tag
                    key={a.type}
                    className={`phx-right-agent-tag ${selectedAgentType === a.type ? 'active' : ''}`}
                    onClick={() => setSelectedAgentType(a.type)}
                    style={{ cursor: 'pointer' }}
                  >
                    {a.label}
                  </Tag>
                ))}
              </div>
              <Text className="phx-right-agent-desc">
                {ARTICLE_TYPES.find(a => a.type === selectedAgentType)?.description}
              </Text>
            </div>

            <Divider style={{ margin: '8px 0', borderColor: 'var(--phx-border)' }} />

            {/* Rules Section */}
            <div className="phx-right-section">
              <div className="phx-right-section-header">
                <Text className="phx-right-title">📋 规则栏</Text>
                <Button size="small" type="text" icon={<PlusOutlined />} onClick={addAgentRule} className="phx-right-add-btn" />
              </div>
              <div className="phx-right-rules">
                {(agentRules[selectedAgentType] || []).length === 0 ? (
                  <div style={{ padding: '16px 0', textAlign: 'center' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>暂无规则，点击＋添加</Text>
                  </div>
                ) : (
                  (agentRules[selectedAgentType] || []).map(rule => (
                    <div key={rule.id} className="phx-right-rule-item">
                      <Input
                        size="small"
                        placeholder="输入写作规则..."
                        value={rule.content}
                        onChange={e => updateAgentRule(rule.id, e.target.value)}
                        className="phx-right-rule-input"
                      />
                      <Button
                        size="small"
                        type="text"
                        icon={<DeleteOutlined />}
                        onClick={() => deleteAgentRule(rule.id)}
                        className="phx-right-rule-del"
                      />
                    </div>
                  ))
                )}
              </div>
            </div>

            <Divider style={{ margin: '8px 0', borderColor: 'var(--phx-border)' }} />

            {/* Skills Section */}
            <div className="phx-right-section">
              <Text className="phx-right-title">🛠 技能栏</Text>
              <div className="phx-right-skills">
                {agentSkills.map(skill => (
                  <div key={skill.id} className="phx-right-skill-item" onClick={() => toggleSkill(skill.id)}>
                    <Checkbox checked={skill.enabled} onChange={() => toggleSkill(skill.id)} />
                    <div>
                      <Text className="phx-right-skill-label">{skill.label}</Text>
                      <Text type="secondary" className="phx-right-skill-desc">{skill.description}</Text>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Toggle right panel button (floating) */}
        <button
          className="phx-toggle-right"
          onClick={() => setShowRightPanel(!showRightPanel)}
          title={showRightPanel ? '收起Agent面板' : '展开Agent面板'}
        >
          <RobotOutlined />
        </button>
      </div>

      <style>{`
        :root, .phx-theme-light {
          --phx-bg: #FAF8F5;
          --phx-surface: #FFFFFF;
          --phx-surface2: #F5F5F4;
          --phx-border: #E7E5E4;
          --phx-text: #1C1917;
          --phx-text2: #78716C;
          --phx-accent: #D97706;
          --phx-accent-light: #FEF3C7;
          --phx-green: #059669;
          --phx-shadow: rgba(0,0,0,0.04);
          --phx-selected: #FEF3C7;
        }
        .phx-theme-dark {
          --phx-bg: #1C1917;
          --phx-surface: #292524;
          --phx-surface2: #3A3532;
          --phx-border: #44403C;
          --phx-text: #F5F5F4;
          --phx-text2: #A8A29E;
          --phx-accent: #F59E0B;
          --phx-accent-light: #78350F;
          --phx-green: #34D399;
          --phx-shadow: rgba(0,0,0,0.2);
          --phx-selected: #78350F;
        }
        .phx-app { height: 100vh; display: flex; flex-direction: column; background: var(--phx-bg); color: var(--phx-text); transition: all 0.3s; }
        
        /* Top Bar */
        .phx-topbar { height: 48px; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; border-bottom: 1px solid var(--phx-border); background: var(--phx-surface); flex-shrink: 0; }
        .phx-topbar-left { display: flex; align-items: center; gap: 10px; }
        .phx-logo { font-size: 15px; font-weight: 600; color: var(--phx-accent) !important; }
        .phx-subtitle { font-size: 11px; }
        .phx-topbar-right { display: flex; gap: 4px; }
        .phx-topbar-btn { color: var(--phx-text2) !important; }
        
        /* Main Layout */
        .phx-main { flex: 1; display: flex; overflow: hidden; position: relative; }
        .phx-left { width: 340px; flex-shrink: 0; border-right: 1px solid var(--phx-border); }
        .phx-center { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
        .phx-right { width: 280px; flex-shrink: 0; border-left: 1px solid var(--phx-border); background: var(--phx-surface); overflow-y: auto; padding: 16px; }
        
        /* Right Panel */
        .phx-right-section { margin-bottom: 8px; }
        .phx-right-section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .phx-right-title { font-size: 13px; font-weight: 600; color: var(--phx-text); display: block; margin-bottom: 8px; }
        .phx-right-add-btn { color: var(--phx-accent) !important; }
        .phx-right-agent-list { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px; }
        .phx-right-agent-tag { border-radius: 4px; font-size: 11px; }
        .phx-right-agent-tag.active { background: var(--phx-accent); color: #FFF; border-color: var(--phx-accent); }
        .phx-right-agent-desc { font-size: 11px; display: block; }
        .phx-right-rules { max-height: 200px; overflow-y: auto; }
        .phx-right-rule-item { display: flex; gap: 4px; margin-bottom: 4px; }
        .phx-right-rule-input { flex: 1; border-radius: 4px; font-size: 12px; }
        .phx-right-rule-del { flex-shrink: 0; color: #EF4444 !important; }
        .phx-right-skills { margin-top: 4px; }
        .phx-right-skill-item { display: flex; align-items: flex-start; gap: 8px; padding: 8px 4px; cursor: pointer; border-radius: 6px; transition: background 0.15s; }
        .phx-right-skill-item:hover { background: var(--phx-surface2); }
        .phx-right-skill-label { display: block; font-size: 13px; color: var(--phx-text); font-weight: 500; }
        .phx-right-skill-desc { display: block; font-size: 11px; }
        
        /* Toggle right panel button */
        .phx-toggle-right {
          position: absolute; right: 0; top: 50%; transform: translateY(-50%);
          width: 24px; height: 48px; background: var(--phx-accent); color: #FFF;
          border: none; border-radius: 6px 0 0 6px; cursor: pointer; z-index: 10;
          display: flex; align-items: center; justify-content: center; opacity: 0.7;
          transition: opacity 0.2s; font-size: 14px;
        }
        .phx-toggle-right:hover { opacity: 1; }
        
        /* NewsBoard styles */
        .phx-newsboard { height: 100%; display: flex; flex-direction: column; background: var(--phx-bg); }
        .phx-newsboard-header { padding: 16px 20px; border-bottom: 1px solid var(--phx-border); }
        .phx-newsboard-header-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
        .phx-newsboard-greeting { font-size: 15px; font-weight: 600; color: var(--phx-text) !important; }
        .phx-refresh-btn { color: var(--phx-text2) !important; }
        .phx-status-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-left: 8px; margin-right: 4px; }
        .phx-status-dot.online { background: var(--phx-green); }
        .phx-status-dot.connecting { background: var(--phx-accent); }
        .phx-newsboard-list { flex: 1; overflow: auto; }
        .phx-newsboard-empty { padding: 40px; text-align: center; }
        .phx-news-item { padding: 12px 20px; cursor: pointer; border-bottom: 1px solid var(--phx-border); transition: background 0.15s; position: relative; }
        .phx-news-item.selected { background: var(--phx-selected); }
        .phx-news-item.hover { background: var(--phx-surface2); }
        .phx-news-item-bar { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--phx-accent); border-radius: 0 2px 2px 0; }
        .phx-news-item-title { font-size: 14px; font-weight: 500; color: var(--phx-text); line-height: 1.5; display: block; margin-bottom: 4px; }
        .phx-news-item-summary { font-size: 12px; margin: 0 !important; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .phx-news-item-meta { margin-top: 6px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .phx-news-tag { font-size: 10px; margin: 0; line-height: 18px; }
        .phx-news-tag-link { font-size: 11px; color: var(--phx-accent) !important; text-decoration: none; display: inline-flex; align-items: center; gap: 2px; padding: 0 6px; line-height: 20px; border: 1px solid var(--phx-accent); border-radius: 4px; transition: background 0.15s; }
        .phx-news-tag-link:hover { background: var(--phx-accent-light); }
        .phx-news-time { font-size: 11px; }
        .phx-news-importance { font-size: 11px; }
        .phx-imp-icon { color: var(--phx-accent); margin-right: 2px; }
        .phx-newsboard-footer { padding: 10px 20px; border-top: 1px solid var(--phx-border); display: flex; align-items: center; gap: 6px; }
        .phx-footer-icon { color: var(--phx-accent); font-size: 12px; }
        .phx-footer-text { font-size: 11px; }
        
        /* WorkArea styles */
        .phx-workarea { height: 100%; display: flex; flex-direction: column; background: var(--phx-bg); }
        .phx-workarea-header { padding: 12px 20px 8px; border-bottom: 1px solid var(--phx-border); background: var(--phx-surface); }
        .phx-workarea-news { display: flex; align-items: flex-start; gap: 10px; }
        .phx-workarea-tag { border-radius: 4px; flex-shrink: 0; margin-top: 2px; }
        .phx-workarea-title-wrap { flex: 1; min-width: 0; }
        .phx-workarea-title { margin: 0 !important; color: var(--phx-text) !important; font-size: 15px; }
        .phx-workarea-summary { margin: 2px 0 0 !important; font-size: 12px; }
        .phx-workarea-link { font-size: 12px; color: var(--phx-accent) !important; white-space: nowrap; flex-shrink: 0; margin-top: 2px; }
        
        /* Agent bar */
        .phx-agent-bar { padding: 8px 20px; border-bottom: 1px solid var(--phx-border); display: flex; gap: 6px; flex-wrap: wrap; background: var(--phx-surface); }
        .phx-agent-bar-label { font-size: 12px; line-height: 28px; margin-right: 4px; }
        .phx-agent-btn { border-radius: 6px; border-color: var(--phx-border); color: var(--phx-text2); }
        .phx-agent-btn.active { background: var(--phx-accent); border-color: var(--phx-accent); color: #FFF; }
        
        /* Empty state */
        .phx-empty { flex: 1; display: flex; align-items: center; justify-content: center; }
        .phx-empty-inner { text-align: center; opacity: 0.6; }
        .phx-empty-icon { font-size: 48px; margin-bottom: 16px; }
        .phx-empty-title { color: var(--phx-text2) !important; margin-bottom: 8px !important; font-size: 16px; }
        .phx-empty-robot { font-size: 32px; color: var(--phx-accent); display: block; margin-bottom: 8px; }
        
        /* Tab container */
        .phx-tab-container { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .phx-tab-bar { display: flex; gap: 2px; padding: 4px 12px 0; background: var(--phx-surface); border-bottom: 1px solid var(--phx-border); flex-shrink: 0; }
        .phx-tab { display: flex; align-items: center; gap: 4px; padding: 6px 10px; cursor: pointer; border-radius: 6px 6px 0 0; font-size: 12px; background: var(--phx-surface2); border: 1px solid var(--phx-border); border-bottom: none; margin-bottom: -1px; transition: background 0.15s; }
        .phx-tab.active { background: var(--phx-bg); border-bottom-color: var(--phx-bg); }
        .phx-tab-label { font-weight: 600; color: var(--phx-accent); }
        .phx-tab-title { color: var(--phx-text2); max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .phx-tab-close { font-size: 10px; color: var(--phx-text2); margin-left: 2px; opacity: 0; transition: opacity 0.15s; }
        .phx-tab:hover .phx-tab-close { opacity: 1; }
        
        /* Messages */
        .phx-messages { flex: 1; overflow: auto; padding: 12px 20px; }
        .phx-messages-empty { text-align: center; padding: 40px; }
        .phx-messages-empty-icon { font-size: 32px; color: var(--phx-accent); display: block; margin-bottom: 8px; }
        .phx-msg { display: flex; gap: 10px; margin-bottom: 16px; }
        .phx-msg-avatar { width: 28px; height: 28px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 14px; }
        .phx-msg.user .phx-msg-avatar { background: var(--phx-surface2); }
        .phx-msg.assistant .phx-msg-avatar { background: var(--phx-accent-light); }
        .phx-msg-bubble { flex: 1; padding: 10px 14px; border-radius: 10px; font-size: 14px; line-height: 1.7; color: var(--phx-text); }
        .phx-msg.user .phx-msg-bubble { background: var(--phx-surface2); }
        .phx-msg.assistant .phx-msg-bubble { background: var(--phx-surface); border: 1px solid var(--phx-accent-light); }
        .phx-msg-thinking { font-size: 12px; padding: 0 20px 8px; display: block; }
        
        /* Input bar */
        .phx-input-bar { padding: 12px 20px; border-top: 1px solid var(--phx-border); background: var(--phx-surface); display: flex; gap: 10px; }
        .phx-input { border-radius: 8px; resize: none; }
        .phx-send-btn { border-radius: 8px; background: var(--phx-accent); border-color: var(--phx-accent); flex-shrink: 0; }
        .phx-send-btn:hover { opacity: 0.9; }
      `}</style>
    </div>
  );
}

export default App;
