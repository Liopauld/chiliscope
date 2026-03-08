import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, X, MessageCircle, Sparkles, ChevronDown, RotateCcw, Leaf, UtensilsCrossed, Heart, Sprout, Thermometer, Package } from 'lucide-react'
import api from '@/lib/api'
import { containsProfanity } from '@/lib/profanityFilter'

interface Message {
  id: string
  role: 'user' | 'bot'
  text: string
  timestamp: Date
  suggestions?: string[]
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'bot',
  text: "Hey there! 🌶️ I'm **ChiliBot**, your AI chili pepper expert powered by Gemini!\n\nTap a topic below or ask me anything about chilies!",
  timestamp: new Date(),
  suggestions: [
    'Tell me about Siling Labuyo',
    'Best chili recipes?',
    'Health benefits of capsaicin',
  ],
}

const CATEGORY_BUTTONS = [
  { id: 'varieties', icon: Leaf, label: 'Varieties', color: 'from-green-500 to-emerald-600', query: 'Tell me about the Philippine chili varieties' },
  { id: 'cuisine', icon: UtensilsCrossed, label: 'Recipes', color: 'from-orange-500 to-red-500', query: 'Recommend some Filipino chili recipes' },
  { id: 'health', icon: Heart, label: 'Health', color: 'from-pink-500 to-rose-600', query: 'Health benefits of chili peppers' },
  { id: 'growing', icon: Sprout, label: 'Growing', color: 'from-lime-500 to-green-600', query: 'How to grow chili peppers' },
  { id: 'scoville', icon: Thermometer, label: 'Scoville', color: 'from-red-600 to-red-800', query: 'Explain the Scoville scale' },
  { id: 'storage', icon: Package, label: 'Storage', color: 'from-amber-500 to-yellow-600', query: 'How to store and preserve chilies' },
]

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showCategories, setShowCategories] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping, scrollToBottom])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const sendMessage = async (text: string) => {
    if (!text.trim()) return

    // Client-side profanity pre-check
    if (containsProfanity(text.trim())) {
      const warnMsg: Message = {
        id: `bot-${Date.now()}`,
        role: 'bot',
        text: "I can't process messages that contain inappropriate language. Please rephrase your question and try again! 🌶️",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, warnMsg])
      setInput('')
      return
    }

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: text.trim(),
      timestamp: new Date(),
    }

    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setIsTyping(true)
    setShowCategories(false)

    // Build conversation history for Gemini (exclude welcome message)
    const history = updatedMessages
      .filter((m) => m.id !== 'welcome')
      .slice(0, -1) // exclude the latest user message (sent separately)
      .map((m) => ({ role: m.role, text: m.text }))

    try {
      const response = await api.post('/chat/ask', {
        message: text.trim(),
        history,
      })
      const { reply, suggestions } = response.data

      // Simulate a short typing delay for natural feel
      await new Promise((resolve) => setTimeout(resolve, 400))

      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        role: 'bot',
        text: reply,
        timestamp: new Date(),
        suggestions,
      }

      setMessages((prev) => [...prev, botMsg])
    } catch {
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        role: 'bot',
        text: "Sorry, I'm having trouble connecting right now. Please try again! 🌶️",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsTyping(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion)
  }

  const handleClearChat = () => {
    setMessages([WELCOME_MESSAGE])
    setShowCategories(true)
  }

  // Simple markdown-like rendering for bold text and bullet points
  const renderText = (text: string) => {
    const lines = text.split('\n')
    return lines.map((line, i) => {
      // Replace **bold** with <strong>
      const parts = line.split(/(\*\*[^*]+\*\*)/g)
      const rendered = parts.map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={j} className="font-semibold">
              {part.slice(2, -2)}
            </strong>
          )
        }
        return <span key={j}>{part}</span>
      })

      if (line.trim() === '') return <br key={i} />
      return (
        <span key={i}>
          {rendered}
          {i < lines.length - 1 && <br />}
        </span>
      )
    })
  }

  return (
    <>
      {/* Floating Toggle Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-orange-600 text-white shadow-lg shadow-red-500/30 flex items-center justify-center hover:shadow-red-500/50 transition-shadow group"
            aria-label="Open ChiliBot"
          >
            <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
            {/* Pulse indicator */}
            <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white" />
            {/* Tooltip */}
            <span className="absolute right-full mr-3 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Ask ChiliBot 🌶️
              <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-2 h-2 bg-gray-900 rotate-45" />
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-6 right-6 z-50 w-[400px] h-[560px] max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-orange-500 px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <span className="text-lg">🌶️</span>
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm leading-tight">
                    ChiliBot
                  </h3>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-white/70 text-[11px]">Online • Ask me anything!</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={handleClearChat}
                  className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors text-white/80 hover:text-white"
                  aria-label="Clear chat"
                  title="Clear chat"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors text-white/80 hover:text-white"
                  aria-label="Minimize chat"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false)
                  }}
                  className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors text-white/80 hover:text-white"
                  aria-label="Close chat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gradient-to-b from-orange-50/30 to-white">
              {messages.map((msg) => (
                <div key={msg.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-2 max-w-[88%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      {msg.role === 'bot' && (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shrink-0 mt-1">
                          <span className="text-[10px]">🌶️</span>
                        </div>
                      )}
                      <div>
                        <div
                          className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                            msg.role === 'user'
                              ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white rounded-br-md shadow-sm'
                              : 'bg-white text-gray-700 border border-gray-100 shadow-sm rounded-bl-md'
                          }`}
                        >
                          {renderText(msg.text)}
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Suggestion Chips */}
                  {msg.role === 'bot' && msg.suggestions && msg.suggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="flex flex-wrap gap-1.5 mt-2 ml-8"
                    >
                      {msg.suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => handleSuggestionClick(s)}
                          className="text-[11px] px-2.5 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all bg-white hover:shadow-sm"
                        >
                          {s}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>
              ))}

              {/* Category Quick Actions (shown after welcome) */}
              {showCategories && messages.length <= 1 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="px-1">
                  <p className="text-[11px] text-gray-500 font-medium ml-8 mb-2">Quick Topics</p>
                  <div className="grid grid-cols-3 gap-2 ml-8">
                    {CATEGORY_BUTTONS.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => sendMessage(cat.query)}
                        className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all group"
                      >
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cat.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <cat.icon className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-[10px] font-medium text-gray-600">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Typing Indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start gap-2"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shrink-0">
                    <span className="text-[10px]">🌶️</span>
                  </div>
                  <div className="bg-white border border-gray-100 shadow-sm px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                    <div className="flex gap-1">
                      <span
                        className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      />
                      <span
                        className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      />
                      <span
                        className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form
              onSubmit={handleSubmit}
              className="shrink-0 border-t border-gray-100 bg-white px-3 py-2.5 flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about chilies..."
                disabled={isTyping}
                className="flex-1 text-sm bg-gray-50 rounded-full px-4 py-2.5 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 disabled:opacity-50 transition-all placeholder:text-gray-400"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="w-9 h-9 rounded-full bg-gradient-to-r from-red-600 to-orange-500 text-white flex items-center justify-center hover:from-red-700 hover:to-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 shadow-sm"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
