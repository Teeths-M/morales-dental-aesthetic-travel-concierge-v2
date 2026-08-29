import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { friendlyError } from '@/lib/friendlyError';
import { useGhostTextSuggestion } from '@/hooks/useGhostTextSuggestion';
import { buildAcceptedText } from '@/lib/ghostTextSuggestion';
import { DOC_LABEL } from '@/components/mcare-agent/MCareVaultUpload';
import MSafeWorkspace from '@/components/mcare/msafe-plus/MSafeWorkspace';
import MSafeIdentityColumn from '@/components/mcare/msafe-plus/MSafeIdentityColumn';
import MSafeChatPanel from '@/components/mcare/msafe-plus/MSafeChatPanel';

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
  const chatInputRef = useRef(null);

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

  const { suggestion: ghostSuggestion, clearSuggestion: clearGhostSuggestion } = useGhostTextSuggestion({
    text: input,
    disabled: isSending || isUploading,
    inputRef: chatInputRef,
  });

  const handleKeyDown = (e) => {
    if (e.key === 'Tab' && ghostSuggestion) {
      e.preventDefault();
      setInput(buildAcceptedText(input, ghostSuggestion));
      clearGhostSuggestion();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const hasConversation = conversations.length > 0 || activeConversationId;

  // A capability pill seeds the conversation with its intent as the first
  // user message (sendText creates the conversation if none exists).
  const handleSelectIntent = (intent) => {
    if (!isSending) sendText(intent);
  };

  return (
    <MSafeWorkspace
      left={
        <MSafeIdentityColumn
          onSelectIntent={handleSelectIntent}
          hasConversation={hasConversation}
        />
      }
      right={
        <MSafeChatPanel
          messages={messages}
          isSending={isSending}
          messagesEndRef={messagesEndRef}
          input={input}
          setInput={setInput}
          onSend={sendMessage}
          onKeyDown={handleKeyDown}
          chatInputRef={chatInputRef}
          onFileSelect={handleFileSelect}
          vaultRef={vaultRef}
          onVaulted={handleVaulted}
          isUploading={isUploading}
          ghostSuggestion={ghostSuggestion}
          onApplyCorrection={(fixed) => setInput(fixed)}
          onToast={toast}
          conversations={conversations}
          onSelectConversation={selectConversation}
          activeConversationId={activeConversationId}
          onSafetyRespond={handleSafetyRespond}
          hasConversation={hasConversation}
          loadingConvos={loadingConvos}
          greeting={GREETING}
        />
      }
    />
  );
}