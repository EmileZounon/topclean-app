import { useState, useRef, useEffect } from 'react'
import { processMessage } from './parser'

export default function ChatBubble() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Bonjour! Dites-moi ce que vous voulez faire.\n\nEx: "Mme Adjovi pressing 50000 avance 25000 momo"', type: 'info' },
  ])
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  function handleSend(e) {
    e.preventDefault()
    if (!input.trim()) return

    const userMsg = { role: 'user', text: input.trim() }
    const result = processMessage(input.trim())
    const botMsg = { role: 'bot', text: result.message, type: result.type }

    setMessages((m) => [...m, userMsg, botMsg])
    setInput('')
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 z-50 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-900 transition-colors"
          aria-label="Ouvrir le chat"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
            <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97z" clipRule="evenodd" />
          </svg>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 sm:inset-auto sm:bottom-20 sm:right-4 sm:w-96 sm:h-[32rem] sm:rounded-2xl sm:shadow-2xl sm:border sm:border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-primary text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div>
              <h3 className="font-bold text-sm">Assistant TopClean+</h3>
              <p className="text-xs text-blue-200">Tapez en francais, je m'occupe du reste</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-blue-200 hover:text-white p-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line ${
                  msg.role === 'user'
                    ? 'bg-primary text-white rounded-br-md'
                    : msg.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200 rounded-bl-md'
                    : msg.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200 rounded-bl-md'
                    : msg.type === 'warning' ? 'bg-amber-50 text-amber-800 border border-amber-200 rounded-bl-md'
                    : 'bg-white text-slate-700 border border-slate-200 rounded-bl-md'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="shrink-0 border-t border-slate-200 bg-white px-3 py-2 flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ex: Mme Adjovi pressing 50000..."
              className="flex-1 px-3 py-2.5 rounded-full border border-slate-300 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
            <button
              type="submit"
              className="bg-primary text-white w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  )
}
