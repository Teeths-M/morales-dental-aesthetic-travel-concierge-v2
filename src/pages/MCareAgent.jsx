import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Heart } from 'lucide-react';
import MessageBubble from '@/components/mcare-agent/MessageBubble';
import JourneyStageTracker from '@/components/mcare-agent/JourneyStageTracker';
import { BackButton } from '@/components/nav/BackButton';

const AGENT_NAME = 'm_care';
const GREETING = "I'm M-Care, your personal journey coordinator. I'll help you get from \"I want a procedure\" to a safely booked, monitored trip — and I'll never rush you past safety. What procedure are you considering, and where would you like to have it?";

export default function MCareAgent() {
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const messagesEndRef = useRef(null);

  // Load existing conversations
  useEffect(() => {
    let mounted = true;
    base44.agents.listConversations({ agent_name: AGENT_NAME })
      .then(convos => {
        if (!mounted) return;
        setConversations(convos || []);
        if (convos?.length > 0) {
          setActiveConversationId(convos[0].id);
        }
      })
      .catch(() => { if (mounted) setConversations([]); })
      .finally(() => { if (mounted) setLoadingConvos(false); });
    return () => { mounted = false; };
  }, []);

  // Subscribe to active conversation updates
  useEffect(() => {
    if (!activeConversationId) return;
    const unsubscribe = base44.agents.subscribeToConversation(activeConversationId, (data) => {
      setMessages(data.messages || []);
      setIsSending(false);
    });
    return () => unsubscribe();
  }, [activeConversationId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startNewConversation = async () => {
    setIsStarting(true);
    try {
      const conversation = await base44.agents.createConversation({
        agent_name: AGENT_NAME,
        metadata: { name: 'My Journey', description: 'M-Care coordination session' },
      });
      setConversations(prev => [conversation, ...prev]);
      setActiveConversationId(conversation.id);
      setMessages(conversation.messages || []);
    } catch (e) {
      console.error('Failed to start conversation:', e);
    } finally {
      setIsStarting(false);
    }
  };

  const selectConversation = (convoId) => {
    setActiveConversationId(convoId);
    const convo = conversations.find(c => c.id === convoId);
    if (convo?.messages) setMessages(convo.messages);
  };

  const sendMessage = async () => {
    if (!input.trim() || isSending) return;
    const content = input.trim();
    setInput('');
    setIsSending(true);

    let conversation;
    if (!activeConversationId) {
      try {
        conversation = await base44.agents.createConversation({
          agent_name: AGENT_NAME,
          metadata: { name: 'My Journey', description: 'M-Care coordination session' },
        });
        setConversations(prev => [conversation, ...prev]);
        setActiveConversationId(conversation.id);
        setMessages(conversation.messages || []);
      } catch (e) {
        setIsSending(false);
        return;
      }
    } else {
      conversation = conversations.find(c => c.id === activeConversationId);
    }

    if (!conversation) { setIsSending(false); return; }

    // Optimistic user message
    setMessages(prev => [...prev, { role: 'user', content }]);

    try {
      await base44.agents.addMessage(conversation, { role: 'user', content });
    } catch (e) {
      setIsSending(false);
      console.error('Failed to send message:', e);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const hasConversation = conversations.length > 0 || activeConversationId;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton fallback="/dashboard" />
          <div className="flex items-center gap-2 flex-1">
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#D4AF37', color: '#060B16' }}>
              <Heart className="w-4 h-4" fill="currentColor" />
            </div>
            <div>
              <h1 className="text-base font-display font-semibold text-foreground leading-tight">M-Care</h1>
              <p className="text-xs text-muted-foreground leading-tight">Patient Journey Coordinator</p>
            </div>
          </div>
        </div>
      </div>

      {/* Journey stage tracker — reflects real case state from tool calls */}
      {hasConversation && messages.length > 0 && (
        <JourneyStageTracker messages={messages} />
      )}

      {/* Conversation list (if multiple) */}
      {conversations.length > 1 && (
        <div className="max-w-3xl mx-auto w-full px-4 py-2 flex gap-2 overflow-x-auto">
          {conversations.map(c => (
            <button
              key={c.id}
              onClick={() => selectConversation(c.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border ${c.id === activeConversationId ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-card-foreground border-border'}`}
            >
              {c.metadata?.name || 'Conversation'}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full px-4 py-6 space-y-4">
          {!hasConversation && !loadingConvos && (
            <div className="flex flex-col items-center justify-center text-center py-16">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 m-breathe" style={{ background: '#D4AF37', color: '#060B16' }}>
                <Heart className="w-7 h-7" fill="currentColor" />
              </div>
              <h2 className="text-xl font-display font-semibold text-foreground mb-2">Welcome to M-Care</h2>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">{GREETING}</p>
              <Button onClick={startNewConversation} disabled={isStarting} className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
                {isStarting ? 'Starting…' : 'Start Your Journey'}
              </Button>
            </div>
          )}

          {hasConversation && messages.length === 0 && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-card border border-border">
                <p className="text-sm">{GREETING}</p>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => <MessageBubble key={idx} message={msg} />)}

          {isSending && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-4 py-3 bg-card border border-border">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      {hasConversation && (
        <div className="sticky bottom-0 z-10 bg-background/90 backdrop-blur border-t border-border">
          <div className="max-w-3xl mx-auto w-full px-4 py-3 flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tell M-Care what you're considering…"
              disabled={isSending}
              className="flex-1"
            />
            <Button onClick={sendMessage} disabled={!input.trim() || isSending} size="icon" className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}