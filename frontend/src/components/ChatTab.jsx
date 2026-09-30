import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { queryRAG } from '../services/api';
import {
  Send,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  FileText,
  ChevronDown,
  ChevronUp,
  Trash2,
  Lock,
  Layers
} from 'lucide-react';

const QUICK_PROMPTS = [
  "What is the executive compensation and Q4 expansion strategy?",
  "What are the standard working hours and paid leave policies?",
  "Summarize key internal security compliance rules."
];

export default function ChatTab() {
  const { tenantId, userRoles, activeRole, userId, addToast } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: "Hello! I am Nova, your enterprise permission-aware AI assistant. Ask any question and I will retrieve answers strictly authorized for your active tenant and assigned role.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      metadata: null,
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedMeta, setExpandedMeta] = useState({});
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const toggleExpand = (id) => {
    setExpandedMeta((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSend = async (queryText) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || loading) return;

    const userMessageId = `user-${Date.now()}`;
    const newMessages = [
      ...messages,
      {
        id: userMessageId,
        sender: 'user',
        text: textToSend,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tenantId,
        userRoles: [...userRoles],
        userId,
      }
    ];

    setMessages(newMessages);
    setInputQuery('');
    setLoading(true);

    try {
      const response = await queryRAG({
        query: textToSend,
        user_id: userId,
        tenant_id: tenantId,
        user_roles: userRoles,
      });

      const isDenied = response.answer && response.answer.includes('No accessible information found');
      const isConversational = !isDenied && (!response.retrieved_documents || response.retrieved_documents.length === 0);
      const isAccessGranted = !isDenied && !isConversational;
      const status = isDenied ? 'DENIED' : (isConversational ? 'CONVERSATIONAL' : 'GRANTED');

      const botMessageId = `bot-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: botMessageId,
          sender: 'bot',
          text: response.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          metadata: {
            status,
            retrieved_documents: response.retrieved_documents || [],
            audit_log_id: response.audit_log_id,
            tenant_id: tenantId,
            user_roles: [...userRoles],
          },
        }
      ]);

      if (isDenied) {
        addToast('Pre-LLM Security Filter: Access Denied for this document level.', 'warning');
      }
    } catch (error) {
      addToast(error.message || 'Error executing query', 'error');
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: 'bot',
          text: `An error occurred while querying Nova: ${error.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true,
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    addToast('Chat history cleared', 'info');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-14rem)] min-h-[580px] bg-[#F9FAFB] rounded-[28px] border border-slate-300 shadow-md overflow-hidden">
      
      {/* Clean Chat Header with Custom Blue Nova Branding */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-300/80 bg-[#F9FAFB]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
              <span>Nova Enterprise Assistant</span>
            </h2>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
              <span className="font-mono text-slate-700">{tenantId}</span>
              <span>•</span>
              <span className="font-mono text-blue-600 font-semibold uppercase">{activeRole}</span>
              <span>•</span>
              <span className="font-mono text-slate-500">{userId}</span>
            </div>
          </div>
        </div>

        <button
          onClick={clearChat}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 transition-colors cursor-pointer"
          title="Clear chat history"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline font-medium">Clear</span>
        </button>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#F3F4F6]/70">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const meta = msg.metadata;
          const isExpanded = expandedMeta[msg.id];
          const isAccessGranted = meta && meta.status === 'GRANTED';
          const isConv = meta && meta.status === 'CONVERSATIONAL';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-3xl ${
                isUser ? 'ml-auto' : 'mr-auto'
              }`}
            >
              {/* Message Bubble */}
              <div
                className={`relative px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-br-none shadow-sm shadow-blue-500/20'
                    : msg.isError
                    ? 'bg-rose-50 border border-rose-200 text-rose-900 rounded-bl-none shadow-xs'
                    : 'bg-[#E9ECEF] text-slate-800 border border-slate-300/70 rounded-bl-none shadow-xs'
                }`}
              >
                {/* Header for user query metadata */}
                {isUser && (
                  <div className="flex items-center gap-1.5 mb-1.5 pb-1 border-b border-blue-500/60 text-[10px] text-blue-100 font-mono">
                    <Lock className="w-2.5 h-2.5 text-blue-200" />
                    <span>tenant: {msg.tenantId}</span>
                    <span>|</span>
                    <span>role: {msg.userRoles?.[0]?.toUpperCase()}</span>
                  </div>
                )}

                {/* Content */}
                <div className="whitespace-pre-wrap">{msg.text}</div>

                <div className={`mt-1 text-[10px] text-right font-mono ${isUser ? 'text-blue-100' : 'text-slate-500'}`}>
                  {msg.timestamp}
                </div>
              </div>

              {/* Bot Security & Provenance Badge */}
              {meta && (
                <div className="mt-1.5 w-full max-w-lg">
                  <div
                    onClick={() => toggleExpand(msg.id)}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-xs cursor-pointer transition-all border shadow-xs ${
                      isConv
                        ? 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100/60'
                        : isAccessGranted
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100/60'
                        : 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100/60'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-medium">
                      {isConv ? (
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      ) : isAccessGranted ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                      )}
                      <span className="font-mono text-[11px] font-semibold">
                        {isConv
                          ? 'AI DIALOGUE (CONVERSATIONAL)'
                          : isAccessGranted
                          ? `ACCESS GRANTED (${meta.retrieved_documents.length} doc${
                              meta.retrieved_documents.length > 1 ? 's' : ''
                            })`
                          : 'ACCESS DENIED / PRE-LLM FILTER'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] opacity-75 font-mono font-medium">
                      <span>{isExpanded ? 'Hide' : 'Details'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </div>

                  {/* Expandable Details Pane */}
                  {isExpanded && (
                    <div className="mt-1 p-3 rounded-xl bg-[#F8F9FA] border border-slate-300 text-xs space-y-2 font-mono shadow-xs">
                      <div>
                        <div className="text-slate-500 text-[10px] uppercase font-sans font-semibold mb-1 flex items-center gap-1">
                          <FileText className="w-3 h-3 text-slate-400" />
                          Retrieved Documents
                        </div>
                        {meta.retrieved_documents.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {meta.retrieved_documents.map((doc, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800 text-xs font-mono"
                              >
                                {doc}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-rose-600 text-xs font-sans">
                            None (blocked by tenant/role security policy)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-200 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3 text-slate-400" />
                          Audit ID:
                        </span>
                        <span className="text-slate-700 font-mono text-[10px] font-semibold">
                          {meta.audit_log_id || 'N/A'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-300 shadow-xs w-fit">
            <div className="flex space-x-1">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce"></div>
            </div>
            <span className="text-xs text-slate-600 font-medium">
              Evaluating pre-LLM security filter & synthesizing response...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-5 py-2.5 bg-[#F3F4F6] border-t border-slate-300/80 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-slate-500 whitespace-nowrap text-[11px] font-mono font-medium">Quick Prompts:</span>
        {QUICK_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            disabled={loading}
            className="px-3 py-1 rounded-full bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-300/70 hover:border-blue-200 whitespace-nowrap transition-colors text-xs font-sans cursor-pointer shadow-2xs font-medium"
          >
            {prompt.length > 44 ? prompt.slice(0, 44) + '...' : prompt}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-4 sm:p-5 border-t border-slate-300/80 bg-[#F9FAFB]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-3"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder={`Ask Nova anything as ${tenantId} (${activeRole.toUpperCase()})...`}
            disabled={loading}
            className="flex-1 bg-white border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 rounded-full px-5 py-3 outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || loading}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white font-semibold text-xs sm:text-sm transition-all shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <span>Ask Nova</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

    </div>
  );
}
