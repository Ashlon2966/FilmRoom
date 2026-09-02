/**
 * SMPTE Timecode & Timing Utility
 */

export const formatSMPTETimecode = (totalSeconds, fps = 24) => {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  const frames = Math.floor((totalSeconds - Math.floor(totalSeconds)) * fps);

  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}:${pad(frames)}`;
};

export const getTodaysDateFormatted = () => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};