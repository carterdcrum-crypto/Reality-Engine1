export interface ContactProfile {
  id: string;
  name: string;
  phoneNumber: string;
  reliabilityScore: number; // 0 - 100
  trustTier: 'High' | 'Moderate' | 'Volatile' | 'Critical';
  preferences: string[];
  dislikes: string[];
  historicalNotes: string;
  lastCallTimestamp: number;
}

export interface TranscriptEntry {
  id: string;
  timestamp: number;
  speaker: 'user' | 'caller';
  text: string;
  confidence: number;
}

export interface TacticalPromptItem {
  verbatim: string; // Exact word-for-word response to say back
  tonality: string; // Vocal tonality, pacing, and emotional delivery guidance
}

export interface TacticalPrompts {
  bonding: TacticalPromptItem;        // Green
  cognitiveProbe: TacticalPromptItem; // Red
  mirroring: TacticalPromptItem;      // Blue
  pivot: TacticalPromptItem;          // Yellow
}

export interface LiveAssessment {
  rapport: number;        // 0 - 100
  cognitiveLoad: number;  // 0 - 100
  truthfulness: number;   // 0 - 100
  urgency: number;        // 0 - 100
  dominantEmotion: string;
}

export interface CallSummary {
  id: string;
  contactId: string;
  contactName: string;
  durationSeconds: number;
  totalTokensProcessed: number;
  summaryText: string;
  actionItems: string[];
  sentimentShift: string;
  updatedReliabilityScore: number;
  createdAt: number;
  purgedRawTranscripts: boolean;
}

export interface AndroidFile {
  path: string;
  name: string;
  category: 'manifest' | 'gradle' | 'service' | 'audio' | 'network' | 'db' | 'ui' | 'worker' | 'security';
  language: 'kotlin' | 'xml' | 'gradle';
  description: string;
  content: string;
}
