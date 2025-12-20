
const SOUND_URLS = {
  correct: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3', // Sharp chime
  wrong: 'https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3', // Dull thud
  tick: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', // Soft click
  timeout: 'https://assets.mixkit.co/active_storage/sfx/1001/1001-preview.mp3', // Digital beep
  victory: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', // Fanfare
  click: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3' // UI click
};

class AudioService {
  private muted: boolean = false;
  private sounds: Record<string, HTMLAudioElement> = {};

  constructor() {
    // Preload sounds
    Object.entries(SOUND_URLS).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.preload = 'auto';
      this.sounds[key] = audio;
    });
  }

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  play(soundName: keyof typeof SOUND_URLS) {
    if (this.muted) return;
    
    const sound = this.sounds[soundName];
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(e => console.debug("Audio playback blocked by browser until user interaction.", e));
    }
  }
}

export const audioService = new AudioService();
