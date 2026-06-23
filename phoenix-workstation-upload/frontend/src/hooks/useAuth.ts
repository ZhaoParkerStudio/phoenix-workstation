import { useState } from 'react';
import axios from 'axios';

const API = axios.create({ baseURL: '' });

export function useAuth() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('phoenix_token'));

  const login = async (password: string) => {
    const res = await API.post('/api/login', { password });
    if (res.data.success) {
      localStorage.setItem('phoenix_token', res.data.token);
      setLoggedIn(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('phoenix_token');
    setLoggedIn(false);
  };

  return { loggedIn, login, logout };
}