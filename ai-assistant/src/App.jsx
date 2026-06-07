import { useState, useEffect, useRef } from 'react';
import { 
  Send, CheckCircle2, Trash2, 
  Lightbulb, Thermometer, Home, 
  Activity, ArrowRight, ShieldAlert, RefreshCw,
  Menu, X, BrainCircuit, Bot, User
} from 'lucide-react';
import './App.css';

const translations = {
  sv: {
    welcome: 'Hej! Jag är Jarvis, din AI-assistent kopplad till ditt smarta hem. Jag kan styra dina lampor, kontrollera temperaturer, läsa av sensorer och ge dig information om ditt systems hälsa. Vad kan jag hjälpa dig med idag?',
    systemStatus: 'Systemstatus',
    fetchingStatus: 'Hämtar status...',
    geminiApi: 'Gemini API:',
    homeAssistant: 'Home Assistant:',
    connected: 'Ansluten',
    missing: 'Saknas',
    linked: 'Kopplad',
    notLinked: 'Ej kopplad',
    quickCommands: 'Snabbkommandon',
    clearConversation: 'Rensa konversation',
    clearConfirm: 'Är du säker på att du vill rensa konversationen?',
    inputPlaceholder: 'Skriv ett meddelande eller kontrollera en enhet...',
    errorPrefix: 'Fel:',
    errorCommunication: 'Något gick fel vid kommunikationen med AI:n.',
    systemError: 'Systemfel: Det gick inte att ansluta till serverns API.',
    subtitle: 'Drivs av Gemini 2.5 Flash',
    quickPrompts: [
      { text: 'Vilka lampor är tända?' },
      { text: 'Hur är temperaturen inomhus?' },
      { text: 'Kör en hälsokontroll på mina enheter' },
      { text: 'Släck allt i huset' }
    ]
  },
  en: {
    welcome: 'Hello! I am Jarvis, your AI assistant connected to your smart home. I can control your lights, check temperatures, read sensors, and give you information about your system health. How can I help you today?',
    systemStatus: 'System Status',
    fetchingStatus: 'Fetching status...',
    geminiApi: 'Gemini API:',
    homeAssistant: 'Home Assistant:',
    connected: 'Connected',
    missing: 'Missing',
    linked: 'Linked',
    notLinked: 'Not Linked',
    quickCommands: 'Quick Commands',
    clearConversation: 'Clear Conversation',
    clearConfirm: 'Are you sure you want to clear the conversation?',
    inputPlaceholder: 'Type a message or control a device...',
    errorPrefix: 'Error:',
    errorCommunication: 'Something went wrong communicating with the AI.',
    systemError: 'System Error: Could not connect to the server API.',
    subtitle: 'Powered by Gemini 2.5 Flash',
    quickPrompts: [
      { text: 'Which lights are turned on?' },
      { text: 'What is the indoor temperature?' },
      { text: 'Run a health check on my devices' },
      { text: 'Turn off everything in the house' }
    ]
  }
};

const lang = navigator.language && navigator.language.startsWith('sv') ? 'sv' : 'en';
const t = translations[lang];

const renderMarkdown = (text) => {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let currentList = [];

  const parseInline = (str) => {
    let html = str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
      
    // Bold: **text** -> <strong>text</strong>
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Inline code: `code` -> <code>code</code>
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');
    
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.startsWith('* ') || line.startsWith('- ')) {
      currentList.push(
        <li key={`li-${i}`} className="list-item">
          {parseInline(line.slice(2))}
        </li>
      );
    } else {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`ul-${i}`} className="bullet-list">
            {currentList}
          </ul>
        );
        currentList = [];
      }
      
      if (line.startsWith('### ')) {
        elements.push(<h4 key={i} className="heading-3">{parseInline(line.slice(4))}</h4>);
      } else if (line.startsWith('## ')) {
        elements.push(<h3 key={i} className="heading-2">{parseInline(line.slice(3))}</h3>);
      } else if (line.startsWith('# ')) {
        elements.push(<h2 key={i} className="heading-1">{parseInline(line.slice(2))}</h2>);
      } else if (line.trim() === '') {
        elements.push(<div key={i} className="line-break" />);
      } else {
        elements.push(<p key={i}>{parseInline(line)}</p>);
      }
    }
  }

  if (currentList.length > 0) {
    elements.push(
      <ul key="ul-end" className="bullet-list">
        {currentList}
      </ul>
    );
  }

  return elements;
};

function App() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: t.welcome
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [status, setStatus] = useState({
    geminiConfigured: false,
    hassConfigured: false,
    hassUrl: '',
    loading: true
  });
  
  const messagesEndRef = useRef(null);

  // Suggested quick prompts in Swedish
  const quickPrompts = [
    { text: t.quickPrompts[0].text, icon: Lightbulb },
    { text: t.quickPrompts[1].text, icon: Thermometer },
    { text: t.quickPrompts[2].text, icon: Activity },
    { text: t.quickPrompts[3].text, icon: Home }
  ];

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('api/status');
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
    setSidebarOpen(false);

    const newMessages = [...messages, { role: 'user', content: prompt }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await fetch('api/chat', {
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
          content: `⚠️ ${t.errorPrefix} ${data.error || t.errorCommunication}` 
        }]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `⚠️ ${t.systemError}` 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    if (window.confirm(t.clearConfirm)) {
      setMessages([
        {
          role: 'assistant',
          content: t.welcome
        }
      ]);
    }
  };

  return (
    <div className="app-container">
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar for Status & Actions */}
      <aside className={`sidebar glass-panel ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand">
          <BrainCircuit className="brand-icon" />
          <h2>AI Center</h2>
          <button 
            type="button" 
            className="sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Stäng sidopanel"
          >
            <X className="close-icon" />
          </button>
        </div>

        {/* Connection status section */}
        <div className="status-card">
          <h3>{t.systemStatus}</h3>
          {status.loading ? (
            <div className="status-loading">
              <RefreshCw className="spinner" />
              <span>{t.fetchingStatus}</span>
            </div>
          ) : (
            <div className="status-list">
              <div className="status-item">
                <span className="label">{t.geminiApi}</span>
                {status.geminiConfigured ? (
                  <span className="badge success"><CheckCircle2 className="icon" /> {t.connected}</span>
                ) : (
                  <span className="badge danger"><ShieldAlert className="icon" /> {t.missing}</span>
                )}
              </div>
              <div className="status-item">
                <span className="label">{t.homeAssistant}</span>
                {status.hassConfigured ? (
                  <span className="badge success"><CheckCircle2 className="icon" /> {t.linked}</span>
                ) : (
                  <span className="badge danger"><ShieldAlert className="icon" /> {t.notLinked}</span>
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
          <h3>{t.quickCommands}</h3>
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
            <Trash2 className="icon" /> {t.clearConversation}
          </button>
        </div>
      </aside>

      {/* Main chat window */}
      <main className="chat-area">
        <header className="chat-header glass-panel">
          <button 
            type="button" 
            className="sidebar-toggle-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Öppna sidopanel"
          >
            <Menu className="menu-icon" />
          </button>
          <div className="header-info">
            <div className="avatar">
              <Bot className="avatar-icon" />
            </div>
            <div>
              <h2>Jarvis Assistant</h2>
              <p className="subtitle">{t.subtitle}</p>
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
                {msg.role === 'user' ? (
                  <User className="message-avatar-icon" />
                ) : (
                  <Bot className="message-avatar-icon" />
                )}
              </div>
              <div className={`message-bubble ${msg.role === 'user' ? 'user-bubble' : 'assistant-bubble'}`}>
                <div className="message-content">
                  {renderMarkdown(msg.content)}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="message-wrapper assistant-wrapper fade-in">
              <div className="message-avatar">
                <Bot className="message-avatar-icon" />
              </div>
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
            placeholder={t.inputPlaceholder}
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
