import { useState, useEffect } from 'react';
import { Typography, Tag, Spin, Button, Tooltip, Modal, Input, Select, message, Divider, Badge } from 'antd';
import { ClockCircleOutlined, InfoCircleOutlined, ThunderboltOutlined, ReloadOutlined, LinkOutlined, PlusOutlined, CloseOutlined, FilterOutlined, DeleteOutlined, CheckCircleOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { NewsItem } from '../types';

const { Text, Paragraph } = Typography;

interface Props {
  news: NewsItem[];
  connected: boolean;
  onSelect: (item: NewsItem) => void;
  onRefresh: () => void;
  refreshing: boolean;
  selectedId?: string;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 9) return '早上好';
  if (h < 12) return '上午好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

function timeAgo(dt: string) {
  if (!dt) return '';
  const diff = Date.now() - new Date(dt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}小时前`;
  return `${Math.floor(hrs / 24)}天前`;
}

export default function NewsBoard({ news, connected, onSelect, onRefresh, refreshing, selectedId }: Props) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [sources, setSources] = useState<string[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newType, setNewType] = useState('rss');
  const [newLang, setNewLang] = useState('zh');
  const [presets, setPresets] = useState<any[]>([]);
  const [customSources, setCustomSources] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'preset' | 'custom' | 'add'>('preset');

  useEffect(() => {
    fetch('/api/news/sources').then(r => r.json()).then(d => {
      setSources(d.sources || []);
      setCustomSources((d.details || []).filter((s: any) => s.custom));
    }).catch(() => {});
  }, [news.length]);

  const loadPresets = () => {
    fetch('/api/news/sources/preset').then(r => r.json()).then(d => setPresets(d.presets || [])).catch(() => {});
  };

  const handleAddSource = async () => {
    if (!newName.trim() || !newUrl.trim()) return;
    try {
      const r = await fetch('/api/news/sources', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), url: newUrl.trim(), source_type: newType, lang: newLang }),
      });
      if (!r.ok) {
        const e = await r.json();
        message.error(e.detail || '添加失败');
        return;
      }
      message.success('添加成功');
      setNewName('');
      setNewUrl('');
      refreshSources();
    } catch { message.error('添加失败'); }
  };

  const handleAddPreset = async (p: any) => {
    try {
      const r = await fetch('/api/news/sources', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: p.name, url: p.url, source_type: p.type, lang: p.lang }),
      });
      if (!r.ok) { message.error('添加失败'); return; }
      message.success(`${p.name} 已添加`);
      refreshSources();
      loadPresets();
    } catch { message.error('添加失败'); }
  };

  const handleDeleteSource = async (sourceId: string, sourceName: string) => {
    try {
      await fetch(`/api/news/sources/${sourceId}`, { method: 'DELETE' });
      message.success(`${sourceName} 已移除`);
      refreshSources();
      loadPresets();
    } catch { message.error('删除失败'); }
  };

  const refreshSources = async () => {
    const res = await fetch('/api/news/sources');
    const d = await res.json();
    setSources(d.sources || []);
    setCustomSources((d.details || []).filter((s: any) => s.custom));
    onRefresh();
  };

  const filteredNews = sourceFilter ? news.filter(n => n.source_name === sourceFilter) : news;

  return (
    <div className="phx-newsboard">
      <div className="phx-newsboard-header">
        <div className="phx-newsboard-header-row">
          <Text className="phx-newsboard-greeting">{getGreeting()} 👋</Text>
          <div style={{ display: 'flex', gap: 4 }}>
            <Tooltip title="添加新闻来源">
              <Button size="small" type="text" icon={<PlusOutlined />} onClick={() => setAddModalOpen(true)} className="phx-refresh-btn" />
            </Tooltip>
            <Tooltip title="刷新新闻">
              <Button size="small" type="text" icon={<ReloadOutlined />} loading={refreshing} onClick={onRefresh} className="phx-refresh-btn" />
            </Tooltip>
          </div>
        </div>
        <Text type="secondary" style={{ fontSize: 12 }}>
          实时新闻监测
          <span className={`phx-status-dot ${connected ? 'online' : 'connecting'}`} />
          {connected ? '在线' : '连接中...'}
        </Text>
      </div>

      {/* Source filter bar */}
      <div className="phx-source-bar">
        <Button size="small" type="text" icon={<FilterOutlined />} className="phx-source-all" style={{ fontSize: 11, color: !sourceFilter ? 'var(--phx-accent)' : 'var(--phx-text2)' }}
          onClick={() => setSourceFilter('')}>全部</Button>
        {sources.map(s => (
          <Button key={s} size="small"
            className={`phx-source-btn ${sourceFilter === s ? 'active' : ''}`}
            onClick={() => setSourceFilter(sourceFilter === s ? '' : s)}
          >{s}</Button>
        ))}
      </div>

      <div className="phx-newsboard-list">
        {filteredNews.length === 0 ? (
          <div className="phx-newsboard-empty">
            <Spin size="small" />
            <Text type="secondary" style={{ display: 'block', marginTop: 12 }}>暂无新闻</Text>
          </div>
        ) : (
          filteredNews.map((item, i) => (
            <div key={item.id} onClick={() => onSelect(item)}
              onMouseEnter={() => setHoverId(item.id)} onMouseLeave={() => setHoverId(null)}
              className={`phx-news-item ${selectedId === item.id ? 'selected' : ''} ${hoverId === item.id ? 'hover' : ''}`}>
              {i < 3 && <div className="phx-news-item-bar" />}
              <Text className="phx-news-item-title">{item.title_cn}</Text>
              <Paragraph type="secondary" className="phx-news-item-summary">{item.summary || '暂无综述'}</Paragraph>
              <div className="phx-news-item-meta">
                {item.source_url?.startsWith('http') ? (
                  <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="phx-news-tag-link" onClick={e => e.stopPropagation()}>
                    <LinkOutlined style={{ fontSize: 10, marginRight: 2 }} />{item.source_name}
                  </a>
                ) : (
                  <Tag color="orange" className="phx-news-tag">{item.source_name}</Tag>
                )}
                <Text type="secondary" className="phx-news-time"><ClockCircleOutlined style={{ marginRight: 2 }} />{timeAgo(item.published_at)}</Text>
                {item.importance > 0 && (
                  <Text type="secondary" className="phx-news-importance"><ThunderboltOutlined className="phx-imp-icon" />{item.importance}</Text>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="phx-newsboard-footer">
        <InfoCircleOutlined className="phx-footer-icon" />
        <Text type="secondary" className="phx-footer-text">{filteredNews.length}/{news.length} 条 · 选题Agent运行中</Text>
      </div>

      <Modal title="来源管理" open={addModalOpen} onCancel={() => setAddModalOpen(false)} footer={null} width={520}
        afterOpenChange={(open) => { if (open) { loadPresets(); setActiveTab('preset'); } }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <Button size="small" type={activeTab === 'preset' ? 'primary' : 'default'} onClick={() => { setActiveTab('preset'); loadPresets(); }}>推荐源</Button>
          <Button size="small" type={activeTab === 'custom' ? 'primary' : 'default'} onClick={() => setActiveTab('custom')}>已添加</Button>
          <Button size="small" type={activeTab === 'add' ? 'primary' : 'default'} onClick={() => setActiveTab('add')}>自定义添加</Button>
        </div>

        {activeTab === 'preset' && (
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {(() => {
              const cats = [...new Set(presets.map(p => p.category))];
              return cats.map(cat => (
                <div key={cat} style={{ marginBottom: 12 }}>
                  <Text strong style={{ fontSize: 13, color: 'var(--phx-accent)' }}>{cat}</Text>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {presets.filter(p => p.category === cat).map(p => (
                      <Tag
                        key={p.url}
                        style={{ cursor: p.added ? 'default' : 'pointer', borderRadius: 4, padding: '2px 8px' }}
                        color={p.added ? 'default' : 'orange'}
                        onClick={() => { if (!p.added) handleAddPreset(p); }}
                      >
                        {p.added ? <CheckCircleOutlined style={{ marginRight: 4 }} /> : <PlusCircleOutlined style={{ marginRight: 4 }} />}
                        {p.name}
                      </Tag>
                    ))}
                  </div>
                </div>
              ));
            })()}
            {presets.length === 0 && <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: 20 }}>加载中...</Text>}
          </div>
        )}

        {activeTab === 'custom' && (
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {customSources.length === 0 ? (
              <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: 20 }}>暂无自定义来源</Text>
            ) : (
              customSources.map(s => (
                <div key={s.url} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--phx-border)' }}>
                  <div>
                    <Text style={{ fontSize: 13 }}>{s.name}</Text>
                    <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>{s.type?.toUpperCase()}</Text>
                  </div>
                  <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => s.source_id && handleDeleteSource(s.source_id, s.name)} />
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'add' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div><Text style={{ fontSize: 12 }}>来源名称</Text><Input size="small" value={newName} onChange={e => setNewName(e.target.value)} placeholder="如：BBC中文" /></div>
            <div><Text style={{ fontSize: 12 }}>URL</Text><Input size="small" value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="RSS地址优先，如 https://feeds.bbci.co.uk/zhongwen/simp/rss.xml" /></div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}><Text style={{ fontSize: 12 }}>类型</Text>
                <Select size="small" value={newType} onChange={setNewType} style={{ width: '100%' }} options={[{ value: 'rss', label: 'RSS（推荐）' }, { value: 'html', label: '网页（效果差）' }, { value: 'json', label: 'JSON API' }]} />
              </div>
              <div style={{ flex: 1 }}><Text style={{ fontSize: 12 }}>语言</Text>
                <Select size="small" value={newLang} onChange={setNewLang} style={{ width: '100%' }} options={[{ value: 'zh', label: '中文' }, { value: 'en', label: '英文' }, { value: 'ja', label: '日文' }, { value: 'ko', label: '韩文' }]} />
              </div>
            </div>
            <Button type="primary" onClick={handleAddSource} block>添加</Button>
          </div>
        )}
      </Modal>

      <style>{`
        .phx-source-bar { padding: 6px 20px; border-bottom: 1px solid var(--phx-border); display: flex; gap: 4px; flex-wrap: wrap; background: var(--phx-surface); overflow-x: auto; }
        .phx-source-btn { font-size: 11px; border-radius: 4px; border-color: var(--phx-border); color: var(--phx-text2); padding: 0 6px; height: 24px; flex-shrink: 0; }
        .phx-source-btn.active { background: var(--phx-accent); border-color: var(--phx-accent); color: #FFF; }
        .phx-source-all { font-size: 11px; flex-shrink: 0; }
      `}</style>
    </div>
  );
}
