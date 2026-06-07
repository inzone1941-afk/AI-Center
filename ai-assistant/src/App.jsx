import { useState, useEffect, useRef } from 'react';
import { 
  Send, CheckCircle2, Trash2, 
  Lightbulb, Thermometer, Home, 
  Activity, ArrowRight, ShieldAlert, RefreshCw,
  Menu, X, BrainCircuit, Bot, User, Mic, Info
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
    about: 'Om AI Center',
    aboutTitle: 'Om AI Center & Jarvis',
    projectDesc: 'AI Center Assistant (Jarvis) är en avancerad och skräddarsydd AI-assistent integrerad direkt i ditt Home Assistant-smarta hem. Drivs av Google Gemini för intelligent styrning av dina enheter via röst och text.',
    developedBy: 'Utvecklad av:',
    contact: 'Kontakt & Support:',
    close: 'Stäng',
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
    about: 'About AI Center',
    aboutTitle: 'About AI Center & Jarvis',
    projectDesc: 'AI Center Assistant (Jarvis) is an advanced custom AI assistant integrated directly into your Home Assistant smart home. Powered by Google Gemini for intelligent control of your devices using voice and text.',
    developedBy: 'Developed by:',
    contact: 'Contact & Support:',
    close: 'Close',
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
  const [aboutOpen, setAboutOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeechSupported] = useState(
    typeof window !== 'undefined' && 
    (!!window.SpeechRecognition || !!window.webkitSpeechRecognition)
  );
  const recognitionRef = useRef(null);
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

  useEffect(() => {
    // Initialize Web Speech API Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = lang === 'sv' ? 'sv-SE' : 'en-US';

      rec.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          setInput(transcript);
        }
      };

      rec.onerror = (err) => {
        console.error('Speech recognition error:', err);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const toggleSpeech = () => {
    if (!recognitionRef.current) {
      alert(lang === 'sv' ? 'Röstigenkänning stöds inte i denna webbläsare.' : 'Speech recognition is not supported in this browser.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

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
          <button onClick={() => setAboutOpen(true)} className="about-btn">
            <Info className="icon" /> {t.about}
          </button>
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
          {isSpeechSupported && (
            <button 
              type="button" 
              className={`mic-btn ${isRecording ? 'recording' : ''}`}
              onClick={toggleSpeech}
              title={lang === 'sv' ? 'Tala in meddelande' : 'Speak message'}
              disabled={loading}
            >
              <Mic className="mic-icon" />
            </button>
          )}
          <button type="submit" className="send-btn" disabled={loading || !input.trim()}>
            <Send className="send-icon" />
          </button>
        </form>
      </main>

      {/* About Modal */}
      {aboutOpen && (
        <div className="modal-backdrop" onClick={() => setAboutOpen(false)}>
          <div className="modal-content glass-panel fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <BrainCircuit className="modal-logo-icon" />
              <h2>{t.aboutTitle}</h2>
              <button 
                type="button" 
                className="modal-close-btn"
                onClick={() => setAboutOpen(false)}
                aria-label={t.close}
              >
                <X className="close-icon" />
              </button>
            </div>
            
            <div className="modal-body">
              <p className="project-desc">{t.projectDesc}</p>
              
              <div className="info-section">
                <h4>{t.developedBy}</h4>
                <div className="developer-info">
                  <span className="dev-name">Roland</span>
                  <a href="https://github.com/inzone1941-afk" target="_blank" rel="noopener noreferrer" className="dev-link">
                    @inzone1941-afk
                  </a>
                </div>
              </div>
              
              <div className="info-section">
                <h4>{t.contact}</h4>
                <div className="contact-list">
                  <div className="contact-item">
                    <span className="contact-label">E-post:</span>
                    <a href="mailto:inzone1941@gmail.com" className="contact-value">inzone1941@gmail.com</a>
                  </div>
                  <div className="contact-item">
                    <span className="contact-label">GitHub:</span>
                    <a href="https://github.com/inzone1941-afk/AI-Center" target="_blank" rel="noopener noreferrer" className="contact-value">GitHub Repository</a>
                  </div>
                </div>
              </div>
              
              <div className="modal-footer-info">
                <span>Version 1.2.0</span>
                <span>•</span>
                <span>MIT License</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
