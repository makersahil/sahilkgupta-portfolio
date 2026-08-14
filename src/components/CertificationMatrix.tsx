import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Compass,
  TrendingUp,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Terminal,
  BookOpen,
  Layers,
  Network,
  Server,
  Workflow,
  Clock,
} from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext.js';

export const CertificationMatrix: React.FC = () => {
  const {
    certifications,
    skills,
    activeCategory,
    setIsTerminalOpen,
  } = usePortfolio();

  const [expandedTrackId, setExpandedTrackId] = useState<string | null>('cert-networking');

  const filteredRoadmaps = certifications.filter(
    (c) => !activeCategory || c.categoryId === activeCategory.id || c.isFeatured
  );

  const filteredSkills = skills.filter(
    (s) => !activeCategory || s.categoryId === activeCategory.id
  );

  const toggleExpand = (id: string) => {
    setExpandedTrackId(expandedTrackId === id ? null : id);
  };

  const getProgressPercentage = (certId: string, credentialId: string) => {
    if (certId.includes('networking') || credentialId.includes('70%')) return 70;
    if (certId.includes('linux') || credentialId.includes('50%')) return 50;
    return 65;
  };

  return (
    <section id="certifications-section" className="py-14 border-b border-white/10 bg-[#0a0a0c]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-10">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded text-[10px] font-mono bg-black/60 text-[#00d4ff] border border-white/10 uppercase tracking-widest mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-[#00d4ff]" />
            <span>Active Study Roadmaps &bull; Skill Progression</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight uppercase">
            Skillsets &amp; Learning Progress
          </h2>
          <p className="text-sm text-white/60 max-w-2xl mt-1">
            Tracking hands-on lab preparation, syllabus topic mastery, and domain progression across Cisco Networking (CCNA 70%), Enterprise Linux (RHCSA 50%), and Cloud-Native DevOps.
          </p>
        </div>

        {/* Two-Column Grid: Learning Roadmaps Left, Technical Skills Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Learning Roadmaps List */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white/60 mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#00ff41]" />
              Preparation Tracks &amp; Syllabus Progress ({filteredRoadmaps.length})
            </h3>

            {filteredRoadmaps.map((track) => {
              const isExpanded = expandedTrackId === track.id;
              const progressPct = getProgressPercentage(track.id, track.credentialId);
              const isNetworking = track.id.includes('networking');
              const isLinux = track.id.includes('linux');
              const accentColor = isNetworking ? '#00d4ff' : isLinux ? '#00ff41' : '#06b6d4';

              return (
                <div
                  key={track.id}
                  className={`rounded-xl border transition-all overflow-hidden ${
                    isExpanded
                      ? 'bg-[#111114] border-white/30 shadow-[0_0_20px_rgba(0,212,255,0.12)]'
                      : 'bg-[#111114] border-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Card Header */}
                  <div
                    onClick={() => toggleExpand(track.id)}
                    className="p-4 sm:p-5 flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-start space-x-3.5 min-w-0">
                      <div
                        className="p-2.5 rounded-lg bg-black border border-white/10 shrink-0"
                        style={{ color: accentColor }}
                      >
                        {isNetworking ? (
                          <Network className="w-5 h-5" />
                        ) : isLinux ? (
                          <Terminal className="w-5 h-5" />
                        ) : (
                          <Workflow className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm sm:text-base font-bold font-mono text-white truncate">
                            {track.title}
                          </h4>
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-black border"
                            style={{ borderColor: `${accentColor}50`, color: accentColor }}
                          >
                            {isNetworking ? 'CCNA: 70% Progress' : isLinux ? 'RHCSA: 50% Progress' : 'DevOps: Active'}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-white/50 mt-0.5">
                          {track.issuer} &bull; <span className="text-white/80">{track.code}</span>
                        </p>
                        
                        {/* Compact Progress Bar */}
                        <div className="mt-2 flex items-center space-x-2.5 max-w-xs">
                          <div className="w-36 sm:w-48 h-1.5 rounded-full bg-black border border-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${progressPct}%`,
                                backgroundColor: accentColor,
                              }}
                            />
                          </div>
                          <span className="text-[11px] font-mono font-bold" style={{ color: accentColor }}>
                            {progressPct}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0 ml-3">
                      <button className="p-1.5 rounded text-white/40 hover:text-white transition-colors">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Domain Breakdown & Topics */}
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-5 pb-5 pt-2 border-t border-white/10 space-y-4 font-mono text-xs"
                    >
                      {/* Exam Syllabus Domain Scores */}
                      {track.syllabusBreakdown && track.syllabusBreakdown.length > 0 && (
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-2 font-bold flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5" style={{ color: accentColor }} />
                            <span>Syllabus Objectives &amp; Topic Progress</span>
                          </label>
                          <div className="space-y-2">
                            {track.syllabusBreakdown.map((item, idx) => (
                              <div key={idx} className="space-y-1">
                                <div className="flex justify-between text-[11px]">
                                  <span className="text-white/80">{item.domain}</span>
                                  <span className="font-bold" style={{ color: accentColor }}>
                                    {item.score || `${item.percentage}%`}
                                  </span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-black border border-white/5 overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                      width: `${item.percentage}%`,
                                      backgroundColor: accentColor,
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Validated Skills & Topics List */}
                      <div>
                        <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-2 font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#00ff41]" />
                          <span>Core Topics Covered &amp; Hands-On Practice</span>
                        </label>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-white/70">
                          {track.skillsValidated.map((skill, i) => (
                            <li key={i} className="flex items-start space-x-1.5">
                              <CheckCircle2
                                className="w-3.5 h-3.5 shrink-0 mt-0.5"
                                style={{
                                  color: skill.includes('Completed')
                                    ? '#00ff41'
                                    : skill.includes('In Progress')
                                    ? '#00d4ff'
                                    : '#06b6d4',
                                }}
                              />
                              <span>{skill}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Technical Skills & CLI Command Snippets */}
          <div className="lg:col-span-5 space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white/60 mb-3 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#00d4ff]" />
              Technical Competencies &amp; CLI Commands ({filteredSkills.length})
            </h3>

            <div className="p-5 rounded-xl bg-[#111114] border border-white/10 space-y-4 font-mono text-xs shadow-2xl">
              <p className="text-[11px] text-white/40 leading-relaxed">
                Click any snippet to execute it directly inside the interactive terminal emulator.
              </p>

              <div className="space-y-3">
                {filteredSkills.map((skill) => (
                  <div
                    key={skill.id}
                    className="p-3 rounded-lg bg-black/60 border border-white/10 hover:border-white/20 transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{skill.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-black text-[#00ff41] border border-[#00ff41]/40 font-bold">
                        {skill.level} ({skill.proficiencyPercent}%)
                      </span>
                    </div>

                    {skill.terminalSnippet && (
                      <div
                        onClick={() => setIsTerminalOpen(true)}
                        className="cursor-pointer group flex items-center justify-between p-2 rounded bg-black border border-white/10 text-[11px] text-[#00ff41] hover:border-[#00d4ff]/40 hover:text-[#00d4ff] transition-colors"
                        title="Click to run in Terminal"
                      >
                        <code className="truncate mr-2">$ {skill.terminalSnippet}</code>
                        <Terminal className="w-3 h-3 text-white/40 group-hover:text-[#00d4ff] shrink-0" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
