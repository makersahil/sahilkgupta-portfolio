import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Mail,
  Send,
  CheckCircle2,
  Key,
  Copy,
  Check,
  Terminal,
  Shield,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { usePortfolio } from '../context/PortfolioContext.js';

export const ContactSection: React.FC = () => {
  const { categories, activeCategory, showToast } = usePortfolio();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState(activeCategory?.name || 'DevOps & Systems Architecture');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [copiedPgp, setCopiedPgp] = useState(false);

  const pgpKeyFingerprint = '4A9F 82C1 09B4 E73D 8819 4E21 SAHI L001 2026 8819';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      showToast('Please fill out all required fields', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.submitContact({
        name,
        email,
        subject: subject || 'Infrastructure Consultation Inquiry',
        message,
        category,
      });

      if (res.success) {
        setIsSuccess(true);
        showToast('Message transmitted successfully', 'success');
        setName('');
        setEmail('');
        setSubject('');
        setMessage('');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to transmit message', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyPgp = () => {
    navigator.clipboard.writeText(pgpKeyFingerprint);
    setCopiedPgp(true);
    showToast('PGP Fingerprint copied to clipboard', 'info');
    setTimeout(() => setCopiedPgp(false), 2000);
  };

  return (
    <section id="contact-section" className="py-14 border-b border-white/10 bg-[#0a0a0c]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Direct Consultation Info & PGP Fingerprint */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded text-[10px] font-mono bg-black/60 text-[#00d4ff] border border-white/10 uppercase tracking-widest mb-2">
                <Mail className="w-3.5 h-3.5 text-[#00d4ff]" />
                <span>Direct Communication Channel</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight uppercase">
                Establish Direct Uplink
              </h2>
              <p className="text-sm text-white/60 mt-2 leading-relaxed">
                Available for enterprise Linux administration, Cisco network topology design, and cloud-native Kubernetes DevOps automation projects.
              </p>
            </div>

            {/* Direct Coordinates Card */}
            <div className="p-5 rounded-xl bg-[#111114] border border-white/10 space-y-4 font-mono text-xs shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="text-white/40 font-bold uppercase tracking-wider text-[11px]">
                  Secure Communication Channels
                </span>
                <span className="w-2 h-2 rounded-full bg-[#00ff41] shadow-[0_0_8px_#00ff41]" />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white/40">Official Email:</span>
                  <a href="mailto:sahilkguptaprivate@gmail.com" className="text-[#00d4ff] hover:underline font-bold select-all">
                    sahilkguptaprivate@gmail.com
                  </a>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/40">Location:</span>
                  <span className="text-white/90 font-medium">Ahmedabad, Gujarat, India</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/40">CCNA COMPLETION:</span>
                  <span className="text-[#00d4ff] font-bold">70%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/40">RHCSA COMPLETION:</span>
                  <span className="text-[#00ff41] font-bold">50%</span>
                </div>
              </div>

              {/* Progress bar visual for completion */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-white/60">
                    <span>CCNA 200-301 Preparation</span>
                    <span className="text-[#00d4ff] font-bold">70%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-black border border-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-[#00d4ff]" style={{ width: '70%' }} />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-white/60">
                    <span>RHCSA EX200 Preparation</span>
                    <span className="text-[#00ff41] font-bold">50%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-black border border-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-[#00ff41]" style={{ width: '50%' }} />
                  </div>
                </div>
              </div>

              {/* PGP Fingerprint Card */}
              <div className="mt-4 p-3 rounded-lg bg-black border border-white/10 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-white/60 flex items-center gap-1">
                    <Key className="w-3 h-3 text-[#00d4ff]" />
                    PGP 4096-bit Key Fingerprint
                  </span>
                  <button
                    onClick={copyPgp}
                    className="p-1 rounded text-white/40 hover:text-white transition-colors"
                  >
                    {copiedPgp ? <Check className="w-3 h-3 text-[#00ff41]" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <code className="text-[10px] text-white/60 font-mono block break-all select-all">
                  {pgpKeyFingerprint}
                </code>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Contact Form */}
          <div className="lg:col-span-7">
            <div className="p-6 sm:p-8 rounded-xl bg-[#111114] border border-white/10 font-mono text-xs shadow-2xl">
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/10">
                <div className="flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-[#00ff41]" />
                  <span className="text-white font-bold uppercase tracking-wider">Transmit Inquiry Payload</span>
                </div>
                <span className="text-[11px] text-[#00ff41]">TLS 1.3 Encrypted Transmission</span>
              </div>

              {isSuccess ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-12 text-center space-y-3"
                >
                  <div className="inline-flex p-3 rounded-full bg-black border border-[#00ff41]/40 text-[#00ff41]">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-white font-mono uppercase">
                    TRANSMISSION ACKNOWLEDGED (HTTP 200 OK)
                  </h3>
                  <p className="text-xs text-white/70 max-w-md mx-auto font-sans leading-relaxed">
                    Thank you. Your inquiry has been received successfully.
                    <br />
                    Sahil will review your message and follow up when appropriate.
                  </p>
                  <button
                    onClick={() => setIsSuccess(false)}
                    className="mt-4 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/10 uppercase tracking-wider text-[11px] transition-colors"
                  >
                    Send Another Transmission
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-white/60 block mb-1">Your Name *</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        placeholder="Sarah Connor"
                        className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-[#00d4ff]"
                      />
                    </div>

                    <div>
                      <label className="text-white/60 block mb-1">Corporate / Personal Email *</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="s.connor@cyberdyne.io"
                        className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-[#00d4ff]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-white/60 block mb-1">Category / Domain Focus</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-black text-white border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-[#00d4ff]"
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.name}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-white/60 block mb-1">Subject</label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g. Multi-Site BGP Migration Consultation"
                        className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-[#00d4ff]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-white/60 block mb-1">Architecture Requirements &amp; Scope *</label>
                    <textarea
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                      placeholder="Outline your Linux, Cisco networking, or Kubernetes infrastructure requirements..."
                      className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-[#00d4ff] font-sans text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-lg bg-[#00d4ff] hover:brightness-110 disabled:opacity-50 text-black font-bold uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-[0_0_20px_rgba(0,212,255,0.2)]"
                  >
                    <Send className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
                    <span>{isSubmitting ? 'Transmitting Ingestion Packet...' : 'Transmit Consultation Inquiry'}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
