import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Cpu, AlertTriangle, CheckCircle2, Trash2, 
  HelpCircle, Lightbulb, Thermometer, Home, MessageSquare, 
  Activity, ArrowRight, ShieldAlert, Sparkles, RefreshCw
} from 'lucide-react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hej! Jag är Jarvis, din AI-assistent kopplad till ditt smarta hem. Jag kan styra dina lampor, kontrollera temperaturer, läsa av sensorer och ge dig information om ditt systems hälsa. Vad kan jag hjälpa dig med idag?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({
    geminiConfigured: false,
    hassConfigured: false,
    hassUrl: '',
    loading: true
  });
  
  const messagesEndRef = useRef(null);

  // Suggested quick prompts in Swedish
  const quickPrompts = [
    { text: 'Vilka lampor är tända?', icon: Lightbulb },
    { text: 'Hur är temperaturen inomhus?', icon: Thermometer },
    { text: 'Kör en hälsokontroll på mina enheter', icon: Activity },
    { text: 'Släck allt i huset', icon: Home }
  ];

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setStatus({
        geminiConfigured: data.geminiConfigured,
        hassConfigured: data.hassConfigured,
        hassUrl: data.hassUrl,
        loading: false
      });
    } catch (err) {
      console.error('Failed to fetch status:', err);
      setStatus(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e, textToSend = null) => {
    if (e) e.preventDefault();
    const prompt = textToSend || input;
    if (!prompt.trim() || loading) return;

    if (!textToSend) setInput('');

    const newMessages = [...messages, { role: 'user', content: prompt }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages: newMessages })
      });

      const data = await response.json();
      if (response.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `⚠️ Fel: ${data.error || 'Något gick fel vid kommunikationen med AI:n.'}` 
        }]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '⚠️ Systemfel: Det gick inte att ansluta till serverns API.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    if (window.confirm('Är du säker på att du vill rensa konversationen?')) {
      setMessages([
        {
          role: 'assistant',
          content: 'Hej! Jag är Jarvis, din AI-assistent kopplad till ditt smarta hem. Jag kan styra dina lampor, kontrollera temperaturer, läsa av sensorer och ge dig information om ditt systems hälsa. Vad kan jag hjälpa dig med idag?'
        }
      ]);
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar for Status & Actions */}
      <aside className="sidebar glass-panel">
        <div className="brand">
          <Sparkles className="brand-icon" />
          <h2>AI Center</h2>
        </div>

        {/* Connection status section */}
        <div className="status-card">
          <h3>Systemstatus</h3>
          {status.loading ? (
            <div className="status-loading">
              <RefreshCw className="spinner" />
              <span>Hämtar status...</span>
            </div>
          ) : (
            <div className="status-list">
              <div className="status-item">
                <span className="label">Gemini API:</span>
                {status.geminiConfigured ? (
                  <span className="badge success"><CheckCircle2 className="icon" /> Ansluten</span>
                ) : (
                  <span className="badge danger"><ShieldAlert className="icon" /> Saknas</span>
                )}
              </div>
              <div className="status-item">
                <span className="label">Home Assistant:</span>
                {status.hassConfigured ? (
                  <span className="badge success"><CheckCircle2 className="icon" /> Kopplad</span>
                ) : (
                  <span className="badge danger"><ShieldAlert className="icon" /> Ej kopplad</span>
                )}
              </div>
              {status.hassUrl && (
                <div className="url-info">
                  <span className="url-label">Endpoint:</span>
                  <span className="url-value">{status.hassUrl}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick action buttons */}
        <div className="quick-actions">
          <h3>Snabbkommandon</h3>
          <div className="quick-buttons">
            {quickPrompts.map((prompt, index) => {
              const Icon = prompt.icon;
              return (
                <button 
                  key={index}
                  onClick={() => handleSend(null, prompt.text)}
                  className="quick-btn"
                  disabled={loading}
                >
                  <Icon className="btn-icon" />
                  <span className="btn-text">{prompt.text}</span>
                  <ArrowRight className="arrow" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="sidebar-footer">
          <button onClick={handleClear} className="clear-btn">
            <Trash2 className="icon" /> Rensa konversation
          </button>
        </div>
      </aside>

      {/* Main chat window */}
      <main className="chat-area">
        <header className="chat-header glass-panel">
          <div className="header-info">
            <div className="avatar">🤖</div>
            <div>
              <h2>Jarvis Assistant</h2>
              <p className="subtitle">Drivs av Gemini 2.5 Flash</p>
            </div>
          </div>
        </header>

        {/* Message history */}
        <div className="messages-container">
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={`message-wrapper ${msg.role === 'user' ? 'user-wrapper' : 'assistant-wrapper'} fade-in`}
            >
              <div className="message-avatar">
                {msg.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className={`message-bubble ${msg.role === 'user' ? 'user-bubble' : 'assistant-bubble'}`}>
                <div className="message-content">
                  {msg.content.split('\n').map((line, i) => {
                    // Very basic markdown formatting for lists/bold
                    if (line.startsWith('* ') || line.startsWith('- ')) {
                      return <li key={i} className="list-item">{line.slice(2)}</li>;
                    }
                    if (line.startsWith('### ')) {
                      return <h4 key={i} className="heading-3">{line.slice(4)}</h4>;
                    }
                    if (line.startsWith('## ')) {
                      return <h3 key={i} className="heading-2">{line.slice(3)}</h3>;
                    }
                    return <p key={i}>{line}</p>;
                  })}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="message-wrapper assistant-wrapper fade-in">
              <div className="message-avatar">🤖</div>
              <div className="message-bubble assistant-bubble loading-bubble">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input form */}
        <form onSubmit={handleSend} className="input-form glass-panel">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Skriv ett meddelande eller kontrollera en enhet..."
            className="chat-input"
            disabled={loading}
          />
          <button type="submit" className="send-btn" disabled={loading || !input.trim()}>
            <Send className="send-icon" />
          </button>
        </form>
      </main>
    </div>
  );
}

export default App;
