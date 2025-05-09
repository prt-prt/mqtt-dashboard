// Full Final Version with Loading + Connection Status Indicator

'use client';

import { useEffect, useState } from 'react';
import mqtt, { MqttClient } from 'mqtt';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export default function Home() {
  const [client, setClient] = useState<MqttClient | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [brokerUrl, setBrokerUrl] = useState('ws://localhost:8888');
  const [topics, setTopics] = useState<{ topic: string; message: string }[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUrl = localStorage.getItem('brokerUrl');
      const theme = localStorage.getItem('theme');
      if (savedUrl) setBrokerUrl(savedUrl);
      if (theme === 'dark') setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    if (client) {
      client.on('connect', () => {
        setConnectionStatus('connected');
        toast.success('Connected to MQTT broker');
      });
      client.on('reconnect', () => {
        setConnectionStatus('connecting');
        toast('Reconnecting to MQTT broker...');
      });
      client.on('close', () => {
        setConnectionStatus('disconnected');
        toast.error('Disconnected from MQTT broker');
      });
      client.on('message', (topic, message) => {
        setTopics(prev => [{ topic, message: message.toString() }, ...prev.slice(0, 99)]);
      });
    }
    return () => {
      client?.end(true);
    };
  }, [client]);

  const connect = () => {
    try {
      setConnectionStatus('connecting');
      const mqttClient = mqtt.connect(brokerUrl, { protocolVersion: 4, clean: true });
      mqttClient.subscribe('#');
      setClient(mqttClient);
      localStorage.setItem('brokerUrl', brokerUrl);
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to connect');
      setConnectionStatus('disconnected');
    }
  };

  const disconnect = () => {
    client?.end(true);
    setClient(null);
    setConnectionStatus('disconnected');
    setTopics([]);
    toast.success('Disconnected');
  };

  const clearMessages = () => {
    setTopics([]);
    toast('Cleared messages');
  };

  const copyToClipboard = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        toast.success('Message copied to clipboard');
      }).catch(() => {
        toast.error('Failed to copy');
      });
    } else {
      toast.error('Clipboard API not available');
    }
  };

  const filteredMessages = selectedTopic
    ? topics.filter(t => t.topic === selectedTopic)
    : topics;

  const numericData = filteredMessages
    .map((m, i) => {
      const value = parseFloat(m.message);
      if (!isNaN(value)) {
        return { index: filteredMessages.length - i, value };
      }
      return null;
    })
    .filter(Boolean) as { index: number; value: number }[];

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-400';
      case 'disconnected': return 'bg-red-500';
    }
  };

  return (
    <main className="flex flex-col min-h-screen p-4 gap-4 bg-background text-foreground">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">MQTT Dashboard</h1>
        <Switch checked={darkMode} onCheckedChange={setDarkMode} />
      </div>

      <div className="flex items-center gap-2">
        <span className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
        <span className="text-sm">
          {connectionStatus === 'connecting' ? (
            <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
              ⏳
            </motion.span>
          ) : null}
          {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
        </span>
      </div>

      <Card className="transition-all">
        <CardHeader>
          <CardTitle>Connection</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Input
            value={brokerUrl}
            onChange={(e) => setBrokerUrl(e.target.value)}
            placeholder="Broker URL (e.g., ws://localhost:8888)"
          />
          <div className="flex gap-2">
            {connectionStatus === 'connected' ? (
              <>
                <Button variant="default" onClick={disconnect}>Disconnect</Button>
                <Button variant="secondary" onClick={clearMessages}>Clear Messages</Button>
              </>
            ) : (
              <Button variant="default" onClick={connect} disabled={connectionStatus === 'connecting'}>
                {connectionStatus === 'connecting' ? 'Connecting...' : 'Connect'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-bold">Topics</h2>
        {topics.length === 0 && <p className="text-sm">No messages received yet.</p>}
        <div className="grid gap-2">
          {[...new Set(topics.map(t => t.topic))].map((topic) => (
            <Button
              key={topic}
              variant={selectedTopic === topic ? 'secondary' : 'outline'}
              onClick={() => setSelectedTopic(selectedTopic === topic ? null : topic)}
            >
              {topic}
            </Button>
          ))}
        </div>
      </div>

      {selectedTopic && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-bold">Messages for: {selectedTopic}</h2>

          {numericData.length > 0 && (
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={numericData.reverse()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="index" hide />
                  <YAxis domain={['auto', 'auto']} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#4F46E5" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <AnimatePresence>
              {filteredMessages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  transition={{ duration: 0.2 }}
                  className="p-2 rounded bg-muted cursor-pointer"
                  onClick={() => copyToClipboard(`${m.topic}: ${m.message}`)}
                >
                  {m.message}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </main>
  );
}