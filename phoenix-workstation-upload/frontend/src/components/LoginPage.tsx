import { useState } from 'react';
import { Input, Button, Card, Typography } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';

const { Title, Text } = Typography;

export default function LoginPage() {
  const { login } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    const ok = await login(password);
    setLoading(false);
    if (!ok) setError('密码错误');
    else window.location.reload();
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#FAF8F5',
    }}>
      <Card style={{ width: 360, textAlign: 'center', borderRadius: 12 }}>
        <Title level={3} style={{ color: '#1C1917', marginBottom: 4 }}>Phoenix 实时初稿工作台</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
          凤凰卫视北京编辑中心
        </Text>
        <Input.Password
          prefix={<LockOutlined style={{ color: '#D97706' }} />}
          placeholder="请输入密码"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onPressEnter={handleLogin}
          size="large"
          style={{ borderRadius: 8 }}
        />
        {error && <Text type="danger" style={{ display: 'block', marginTop: 8 }}>{error}</Text>}
        <Button
          type="primary"
          block
          size="large"
          loading={loading}
          onClick={handleLogin}
          style={{
            marginTop: 16,
            borderRadius: 8,
            background: '#D97706',
            borderColor: '#D97706',
          }}
        >
          进入工作台
        </Button>
      </Card>
    </div>
  );
}