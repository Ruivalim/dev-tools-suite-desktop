import { invoke } from '@tauri-apps/api/core';
import { Store } from '@tauri-apps/plugin-store';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

export interface Alert {
  id: string;
  time: number;
  label: string;
  triggered: boolean;
  enabled: boolean;
}

export interface Lap {
  number: number;
  time: number;
  delta: number;
}

// Global state
let elapsed = $state(0);
let isRunning = $state(false);
let startTime = 0;
let intervalId: ReturnType<typeof setInterval> | null = null;
let laps = $state<Lap[]>([]);
let alerts = $state<Alert[]>([]);
let soundEnabled = $state(true);
let notificationsEnabled = $state(true);
let showInTray = $state(true);
let notificationPermission = $state(false);
let store: Store | null = null;
let initialized = false;

// Tray update throttle
let lastTrayUpdate = 0;

async function updateTray(time: number | null) {
  const now = Date.now();
  // Throttle to every 500ms to avoid too many calls
  if (time !== null && now - lastTrayUpdate < 500) return;
  lastTrayUpdate = now;

  try {
    if (time === null || !showInTray) {
      await invoke('update_tray_title', { title: null });
    } else {
      const display = formatTimeTray(time);
      await invoke('update_tray_title', { title: display });
    }
  } catch (e) {
    // Ignore tray errors
  }
}

function formatTimeTray(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function playAlertSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (e) {
    // Ignore audio errors
  }
}

async function triggerAlert(alert: Alert) {
  const index = alerts.findIndex(a => a.id === alert.id);
  if (index !== -1) {
    alerts[index].triggered = true;
    alerts = [...alerts];
    saveAlerts();
  }

  if (soundEnabled) {
    playAlertSound();
  }

  if (notificationsEnabled && notificationPermission) {
    sendNotification({
      title: 'Stopwatch Alert',
      body: alert.label || `Time reached: ${formatTimeTray(alert.time)}`
    });
  }
}

function checkAlerts() {
  for (const alert of alerts) {
    if (alert.enabled && !alert.triggered && elapsed >= alert.time) {
      triggerAlert(alert);
    }
  }
}

async function saveAlerts() {
  if (store) {
    await store.set('alerts', alerts);
    await store.save();
  }
}

async function saveSettings() {
  if (store) {
    await store.set('soundEnabled', soundEnabled);
    await store.set('notificationsEnabled', notificationsEnabled);
    await store.set('showInTray', showInTray);
    await store.save();
  }
}

// Public API
export const stopwatch = {
  get elapsed() { return elapsed; },
  get isRunning() { return isRunning; },
  get laps() { return laps; },
  get alerts() { return alerts; },
  get soundEnabled() { return soundEnabled; },
  get notificationsEnabled() { return notificationsEnabled; },
  get showInTray() { return showInTray; },
  get notificationPermission() { return notificationPermission; },

  async init() {
    if (initialized) return;
    initialized = true;

    store = await Store.load('stopwatch.json');

    const savedAlerts = await store.get<Alert[]>('alerts');
    if (savedAlerts) {
      alerts = savedAlerts.map(a => ({ ...a, triggered: false }));
    }

    const savedSound = await store.get<boolean>('soundEnabled');
    if (savedSound !== null && savedSound !== undefined) soundEnabled = savedSound;

    const savedNotifications = await store.get<boolean>('notificationsEnabled');
    if (savedNotifications !== null && savedNotifications !== undefined) notificationsEnabled = savedNotifications;

    const savedShowInTray = await store.get<boolean>('showInTray');
    if (savedShowInTray !== null && savedShowInTray !== undefined) showInTray = savedShowInTray;

    notificationPermission = await isPermissionGranted();
  },

  start() {
    if (!isRunning) {
      isRunning = true;
      startTime = Date.now() - elapsed;
      intervalId = setInterval(() => {
        elapsed = Date.now() - startTime;
        checkAlerts();
        if (showInTray) {
          updateTray(elapsed);
        }
      }, 100); // Update every 100ms
      if (showInTray) {
        updateTray(elapsed);
      }
    }
  },

  pause() {
    if (isRunning) {
      isRunning = false;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      if (showInTray) {
        updateTray(elapsed);
      }
    }
  },

  reset() {
    this.pause();
    elapsed = 0;
    laps = [];
    alerts = alerts.map(a => ({ ...a, triggered: false }));
    updateTray(null);
  },

  lap() {
    if (isRunning) {
      const lastLapTime = laps.length > 0 ? laps[0].time : 0;
      const newLap: Lap = {
        number: laps.length + 1,
        time: elapsed,
        delta: elapsed - lastLapTime
      };
      laps = [newLap, ...laps];
    }
  },

  addAlert(minutes: number, seconds: number, label: string) {
    const timeMs = (minutes * 60 + seconds) * 1000;
    if (timeMs <= 0) return;

    const newAlert: Alert = {
      id: crypto.randomUUID(),
      time: timeMs,
      label: label.trim() || `Alert at ${formatTimeTray(timeMs)}`,
      triggered: elapsed >= timeMs,
      enabled: true
    };

    alerts = [...alerts, newAlert].sort((a, b) => a.time - b.time);
    saveAlerts();
  },

  addPreset(minutes: number, label: string) {
    const timeMs = minutes * 60 * 1000;
    const exists = alerts.some(a => a.time === timeMs);
    if (exists) return;

    const newAlert: Alert = {
      id: crypto.randomUUID(),
      time: timeMs,
      label,
      triggered: elapsed >= timeMs,
      enabled: true
    };

    alerts = [...alerts, newAlert].sort((a, b) => a.time - b.time);
    saveAlerts();
  },

  removeAlert(id: string) {
    alerts = alerts.filter(a => a.id !== id);
    saveAlerts();
  },

  toggleAlert(id: string) {
    const index = alerts.findIndex(a => a.id === id);
    if (index !== -1) {
      alerts[index].enabled = !alerts[index].enabled;
      alerts = [...alerts];
      saveAlerts();
    }
  },

  toggleSound() {
    soundEnabled = !soundEnabled;
    saveSettings();
  },

  toggleNotifications() {
    notificationsEnabled = !notificationsEnabled;
    saveSettings();
  },

  toggleShowInTray() {
    showInTray = !showInTray;
    saveSettings();
    if (showInTray && isRunning) {
      updateTray(elapsed);
    } else if (!showInTray) {
      updateTray(null);
    }
  },

  async requestNotificationPermission() {
    const permission = await requestPermission();
    notificationPermission = permission === 'granted';
  }
};
