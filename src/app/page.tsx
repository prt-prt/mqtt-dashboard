'use client';

import { useEffect, useState } from 'react';
import mqtt, { MqttClient } from 'mqtt';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function Home() {
  const [client, setClient] = useState<MqttClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [brokerUrl, setBrokerUrl] = useState('ws://localhost:8888');
  const [topics, setTopics] = useState<{ topic: string; message: string }[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUrl = localStorage.getItem('brokerUrl');
      if (savedUrl) setBrokerUrl(savedUrl);
    }
  }, []);

  useEffect(() => {
    if (client) {
      client.on('connect', () => {
        setIsConnected(true);
        toast.success('Connected to MQTT broker');
      });
      client.on('reconnect', () => {
        setIsConnected(false);
        toast('Reconnecting to MQTT broker...');
      });
      client.on('close', () => {
        setIsConnected(false);
        toast.error('Disconnected from MQTT broker');
      });
      client.on('message', (topic, message) => {
        setTopics(prev => [{ topic, message: message.toString() }, ...prev.slice(0, 99)]);
      });
    }
    return () => client?.end(true);
  }, [client]);

  const connect = () => {
    try {
      const mqttClient = mqtt.connect(brokerUrl, { protocolVersion: 4, clean: true });
      mqttClient.subscribe('#');
      setClient(mqttClient);
      localStorage.setItem('brokerUrl', brokerUrl);
    } catch (error) {
      toast.error('Failed to connect');
    }
  };

  const disconnect = () => {
    client?.end(true);
    setClient(null);
    setIsConnected(false);
    setTopics([]);
    toast.success('Disconnected');
  };

  const clearMessages = () => {
    setTopics([]);
    toast('Cleared messages');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Message copied to clipboard');
    }, () => {
      toast.error('Failed to copy');
    });
  };

  const filteredMessages = selectedTopic
    ? topics.filter(t => t.topic === selectedTopic)
    : topics;

  return (
    <main className="flex flex-col min-h-screen p-4 gap-4 bg-background text-foreground">
      <Card>
        <CardHeader>
          <CardTitle>MQTT Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Input
            value={brokerUrl}
            onChange={(e) => setBrokerUrl(e.target.value)}
            placeholder="Broker URL (e.g., ws://localhost:8888)"
          />
          <div className="flex gap-2">
            {isConnected ? (
              <>
                <Button variant="destructive" onClick={disconnect}>Disconnect</Button>
                <Button variant="secondary" onClick={clearMessages}>Clear Messages</Button>
              </>
            ) : (
              <Button onClick={connect}>Connect</Button>
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
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">Messages for: {selectedTopic}</h2>
          <div className="flex flex-col gap-1">
            {filteredMessages.map((m, i) => (
              <div
                key={i}
                className="p-2 rounded bg-muted cursor-pointer"
                onClick={() => copyToClipboard(`${m.topic}: ${m.message}`)}
              >
                {m.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
