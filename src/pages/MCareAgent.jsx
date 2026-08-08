import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Heart } from 'lucide-react';
import MessageBubble from '@/components/mcare-agent/MessageBubble';
import MCareVaultUpload, { DOC_LABEL } from '@/components/mcare-agent/MCareVaultUpload';
import AddImageMenu from '@/components/mcare-agent/AddImageMenu';
import SmartInputSuggestions from '@/components/mcare-agent/SmartInputSuggestions';
import JourneyStageTracker from '@/components/mcare-agent/JourneyStageTracker';
import McareAvatar from '@/components/mcare-agent/McareAvatar';
import { BackButton } from '@/components/nav/BackButton';
import { useToast } from '@/components/ui/use-toast';
import { friendlyError } from '@/lib/friendlyError';
import { handleChatPaste } from '@/lib/chatPaste';

const AGENT_NAME = 'm_care';
const GREETING = "I'm M-Care, your personal journey coordinator. I'll help you get from \"I want a procedure\" to a safely booked, monitored trip — and I'll never rush you past safety. What procedure are you considering, and where would you like to have it?";

export default function MCareAgent() {
  const { toast } = useToast();
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const messagesEndRef = useRef(null);
  const vaultRef = useRef(null);

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
      toast({ title: 'Could not start conversation', description: friendlyError(e, 'Please try again.', 'MCareAgent'), variant: 'destructive' });
    } finally {
      setIsStarting(false);
    }
  };

  const selectConversation = (convoId) => {
    setActiveConversationId(convoId);
    const convo = conversations.find(c => c.id === convoId);
    if (convo?.messages) setMessages(convo.messages);
  };

  const sendText = async (content, fileUrls) => {
    if ((!content || !content.trim()) && !fileUrls?.length) return;
    if (isSending) return;
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
        toast({ title: 'Message not sent', description: friendlyError(e, 'Could not start your M-Care conversation. Please try again.', 'MCareAgent'), variant: 'destructive' });
        return;
      }
    } else {
      conversation = conversations.find(c => c.id === activeConversationId);
    }

    if (!conversation) { setIsSending(false); return; }

    // Optimistic user message (include file_urls so the bubble renders the attachment)
    setMessages(prev => [...prev, { role: 'user', content, file_urls: fileUrls }]);

    try {
      await base44.agents.addMessage(conversation, { role: 'user', content, file_urls: fileUrls });
    } catch (e) {
      setIsSending(false);
      toast({ title: 'Message not sent', description: friendlyError(e, 'Your message could not be sent. Please try again.', 'MCareAgent'), variant: 'destructive' });
    }
  };

  const handleFileSelect = async (file) => {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'That file is larger than 15MB. Please upload a smaller image or PDF.', variant: 'destructive' });
      return;
    }
    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const label = file.name || 'document';
      await sendText(`I've uploaded my document: ${label}`, [file_url]);
    } catch (err) {
      console.error('Upload failed', err);
      setIsSending(false);
      toast({ title: 'Upload failed', description: 'Upload failed — please try again.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleVaulted = ({ token, document_type, file_name }) => {
    const label = DOC_LABEL[document_type] || 'document';
    sendText(`I've uploaded my ${label} (${file_name}) to the secure vault. Reference token: ${token}. It's encrypted and stored for your verification team to review.`);
  };

  const sendMessage = () => {
    const content = input.trim();
    if (!content || isSending) return;
    setInput('');
    sendText(content);
  };

  const handleSafetyRespond = (choice) => {
    sendText(choice === 'proceed'
      ? "Yes, please proceed with the safer path — find a surgeon who specializes in patients with my condition and request a clinical review before any bookings."
      : "I need a little more time to think about this before we proceed.");
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
            <McareAvatar size={36} />
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
              <div className="mb-4 m-breathe">
                <McareAvatar size={64} glow />
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

          {messages.map((msg, idx) => <MessageBubble key={idx} message={msg} onRespond={handleSafetyRespond} showReaction />)}

          {isSending && (
            <div className="flex justify-start items-end gap-2">
              <McareAvatar size={28} glow />
              <div className="rounded-2xl px-4 py-3 bg-card border border-border">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#D4AF37', animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#D4AF37', animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#D4AF37', animationDelay: '300ms' }} />
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
          <SmartInputSuggestions
            text={input}
            disabled={isSending || isUploading}
            onPick={(p) => setInput(input + ' ' + p)}
            onApplyCorrection={(fixed) => setInput(fixed)}
          />
          <div className="max-w-3xl mx-auto w-full px-4 py-3 flex items-end gap-2">
            <AddImageMenu
              onDeviceFile={handleFileSelect}
              onVaultClick={() => vaultRef.current?.open()}
              onUnsupported={(msg) => toast({ title: 'Attach', description: msg })}
              disabled={isSending || isUploading}
              uploading={isUploading}
            />
            <MCareVaultUpload ref={vaultRef} hideTrigger onVaulted={handleVaulted} />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={(e) => handleChatPaste(e, { onFile: handleFileSelect, disabled: isSending || isUploading, onError: (msg) => toast({ title: 'Paste', description: msg, variant: 'destructive' }) })}
              placeholder={isUploading ? "Uploading document…" : "Tell M-Care what you're considering…"}
              disabled={isSending || isUploading}
              className="flex-1"
            />
            <Button onClick={sendMessage} disabled={(!input.trim() && !isUploading) || isSending || isUploading} size="icon" className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}