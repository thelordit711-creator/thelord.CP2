// Telegram-grade Web Audio Synthesizer for Direct WebRTC Calls
// Provides native zero-asset ringback (outgoing) and ringtone (incoming) sound synthesis

class CallSoundSynthesizer {
  private audioCtx: AudioContext | null = null;
  private ringbackInterval: NodeJS.Timeout | null = null;
  private ringtoneInterval: NodeJS.Timeout | null = null;
  private isPlayingOutgoing = false;
  private isPlayingIncoming = false;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch (e) {
      console.warn('[CallSounds] Web Audio API initialization failed:', e);
      return null;
    }
  }

  // 1. Outgoing Ringback Tone (صوت طنين الاتصال للمتصل مثل رنين الهاتف / تليجرام)
  public playOutgoingRingback() {
    if (this.isPlayingOutgoing) return;
    this.stopAll();
    this.isPlayingOutgoing = true;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    const playBeep = () => {
      if (!this.isPlayingOutgoing || !this.audioCtx || this.audioCtx.state === 'closed') return;
      try {
        const now = this.audioCtx.currentTime;

        // Dual frequency standard ringback (440Hz + 480Hz)
        const osc1 = this.audioCtx.createOscillator();
        const osc2 = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, now);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(480, now);

        // Gentle envelope: fade-in -> sustain -> fade-out
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.09, now + 0.08);
        gain.gain.setValueAtTime(0.09, now + 1.2);
        gain.gain.linearRampToValueAtTime(0, now + 1.3);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.35);
        osc2.stop(now + 1.35);
      } catch (e) {
        console.warn('[CallSounds] playBeep error:', e);
      }
    };

    // Play first beep immediately, then repeat every 3.5 seconds
    playBeep();
    this.ringbackInterval = setInterval(playBeep, 3500);
  }

  // 2. Incoming Ringtone (صوت رنين المكالمة الواردة مثل نغمة تليجرام المميزة)
  public playIncomingRingtone() {
    if (this.isPlayingIncoming) return;
    this.stopAll();
    this.isPlayingIncoming = true;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    // Telegram melodic chime sequence (Frequencies in Hz)
    const melodyNotes = [
      { freq: 659.25, timeOffset: 0.0, dur: 0.18 }, // E5
      { freq: 830.61, timeOffset: 0.18, dur: 0.18 }, // G#5
      { freq: 987.77, timeOffset: 0.36, dur: 0.22 }, // B5
      { freq: 1318.51, timeOffset: 0.58, dur: 0.35 }, // E6
      { freq: 987.77, timeOffset: 0.95, dur: 0.18 }, // B5
      { freq: 1318.51, timeOffset: 1.15, dur: 0.45 }  // E6 resolve
    ];

    const playChimeSequence = () => {
      if (!this.isPlayingIncoming || !this.audioCtx || this.audioCtx.state === 'closed') return;
      try {
        const baseNow = this.audioCtx.currentTime;

        melodyNotes.forEach((n) => {
          if (!this.audioCtx) return;
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();

          osc.type = 'triangle'; // Warm melodic tone
          osc.frequency.setValueAtTime(n.freq, baseNow + n.timeOffset);

          // Bell/chime percussive envelope
          const noteStart = baseNow + n.timeOffset;
          gain.gain.setValueAtTime(0, noteStart);
          gain.gain.linearRampToValueAtTime(0.18, noteStart + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, noteStart + n.dur);

          osc.connect(gain);
          gain.connect(this.audioCtx.destination);

          osc.start(noteStart);
          osc.stop(noteStart + n.dur);
        });
      } catch (e) {
        console.warn('[CallSounds] playChimeSequence error:', e);
      }
    };

    playChimeSequence();
    this.ringtoneInterval = setInterval(playChimeSequence, 2400);
  }

  // 3. Stop All Ringtones & Reset
  public stopAll() {
    this.isPlayingOutgoing = false;
    this.isPlayingIncoming = false;

    if (this.ringbackInterval) {
      clearInterval(this.ringbackInterval);
      this.ringbackInterval = null;
    }
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
  }
}

export const callSoundSynthesizer = new CallSoundSynthesizer();

