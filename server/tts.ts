import https from 'https';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { v2 as cloudinary } from 'cloudinary';
import { getCloudinaryConfig } from './cloudinary';
import { TtsSettings } from '../src/types';

const TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const DEFAULT_VOICE = process.env.TTS_VOICE_NAME || 'Kore';
const TTS_TIMEOUT_MS = 8000;

// Regex to detect Burmese script characters
const BURMESE_REGEX = /[\u1000-\u109F\uAA60-\uAA7F\uA9E0-\uA9FF]/;

let genAiClient: GoogleGenAI | null = null;
function getClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!genAiClient) genAiClient = new GoogleGenAI({ apiKey });
  return genAiClient;
}

// Gemini TTS returns raw 16-bit PCM, mono, 24kHz. Wrap it in a standard WAV
// header so it can be played in <audio> tags and stored/served normally.
function pcmToWav(pcmData: Buffer, sampleRate = 24000, channels = 1, bitsPerSample = 16): Buffer {
  const dataSize = pcmData.length;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28);
  buffer.writeUInt16LE(channels * (bitsPerSample / 8), 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  pcmData.copy(buffer, 44);
  return buffer;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('TTS timeout')), ms)),
  ]);
}

function splitTextIntoTtsChunks(text: string, maxChunkLen = 140): string[] {
  if (text.length <= maxChunkLen) return [text];
  const chunks: string[] = [];
  let remaining = text.trim();
  while (remaining.length > 0) {
    if (remaining.length <= maxChunkLen) {
      chunks.push(remaining);
      break;
    }
    let sliceIdx = -1;
    // Prefer splitting at sentence or clause boundaries
    for (const punct of ['။', '၊', ' ', '\n', '.', '!', '?']) {
      const idx = remaining.lastIndexOf(punct, maxChunkLen);
      if (idx > sliceIdx && idx > 20) {
        sliceIdx = idx + punct.length;
      }
    }
    if (sliceIdx === -1) sliceIdx = maxChunkLen;
    const chunk = remaining.slice(0, sliceIdx).trim();
    if (chunk) chunks.push(chunk);
    remaining = remaining.slice(sliceIdx).trim();
  }
  return chunks.filter((c) => c.length > 0);
}

function fetchSingleGoogleTts(text: string, lang = 'my'): Promise<Buffer> {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(lang)}&q=${encodeURIComponent(text)}`;
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          return reject(new Error(`Google TTS returned HTTP ${res.statusCode}`));
        }
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }
    );
    req.on('error', reject);
    req.setTimeout(8000, () => {
      req.destroy();
      reject(new Error('Google TTS request timeout'));
    });
  });
}

/**
 * Fetch native spoken audio from Google TTS engine for Burmese or other regional languages.
 * Splits long text into natural chunks and concatenates so full messages are read completely.
 */
async function fetchGoogleTts(text: string, lang = 'my'): Promise<Buffer> {
  const chunks = splitTextIntoTtsChunks(text, 140);
  if (chunks.length <= 1) {
    return fetchSingleGoogleTts(text, lang);
  }
  const buffers: Buffer[] = [];
  for (const chunk of chunks) {
    const buf = await fetchSingleGoogleTts(chunk, lang);
    buffers.push(buf);
  }
  return Buffer.concat(buffers);
}

/**
 * Save audio to Cloudinary or fallback to local uploads directory or data URI.
 */
async function storeAudioBuffer(
  audioBuffer: Buffer,
  format: 'mp3' | 'wav'
): Promise<string> {
  const cloudinaryConfig = getCloudinaryConfig();
  if (cloudinaryConfig.isConfigured) {
    try {
      cloudinary.config({
        cloud_name: cloudinaryConfig.cloudName,
        api_key: cloudinaryConfig.apiKey,
        api_secret: cloudinaryConfig.apiSecret,
        secure: true,
      });

      const uploadResult: any = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: 'video', folder: 'donation_tts', format },
          (err, result) => (err ? reject(err) : resolve(result))
        );
        stream.end(audioBuffer);
      });

      if (uploadResult?.secure_url) {
        return uploadResult.secure_url;
      }
    } catch (cldErr) {
      console.warn('[TTS] Cloudinary upload failed, falling back to local storage:', cldErr);
    }
  }

  // Fallback: save to public/uploads/tts directory
  try {
    const ttsDir = path.join(process.cwd(), 'public', 'uploads', 'tts');
    if (!fs.existsSync(ttsDir)) {
      fs.mkdirSync(ttsDir, { recursive: true });
    }
    const filename = `tts-${Date.now()}-${Math.floor(Math.random() * 1000)}.${format}`;
    const filePath = path.join(ttsDir, filename);
    fs.writeFileSync(filePath, audioBuffer);
    return `/uploads/tts/${filename}`;
  } catch (fsErr) {
    console.warn('[TTS] Local file write failed, returning data URI:', fsErr);
    const mimeType = format === 'mp3' ? 'audio/mpeg' : 'audio/wav';
    return `data:${mimeType};base64,${audioBuffer.toString('base64')}`;
  }
}

/**
 * Generates an AI voice reading of a donation message.
 * - For Burmese text, uses native Burmese voice engine so words like "ချစ်တယ်နော် ကိုကြီး" are pronounced fluently.
 * - For English / other text, uses Gemini 2.5 Flash TTS with selected voice (Kore, Puck, Charon, etc.).
 * - Uploads audio to Cloudinary or falls back to local storage so audio is 100% playable in OBS.
 */
export async function generateDonationTtsAudio(
  text: string,
  options?: TtsSettings
): Promise<{ url: string; voiceName: string } | null> {
  // Enabled by default unless explicitly turned off
  const isEnabled = options?.enabled !== false;
  if (!isEnabled) return null;
  const trimmed = (text || '').trim();
  if (!trimmed) return null;

  try {
    const voiceName = options?.voiceName || DEFAULT_VOICE;

    // Determine text to read based on readFullMessage setting
    let textToSpeak = trimmed;
    const readFull = options?.readFullMessage !== false; // default true (reads full message)
    if (!readFull) {
      const maxChars = options?.maxCharacters && options.maxCharacters > 0 ? options.maxCharacters : 120;
      if (textToSpeak.length > maxChars) {
        textToSpeak = textToSpeak.slice(0, maxChars).trim() + '...';
      }
    }

    const isBurmese = BURMESE_REGEX.test(textToSpeak);

    // If text contains Burmese script, use native Burmese voice
    if (isBurmese) {
      try {
        const mp3Buffer = await fetchGoogleTts(textToSpeak, 'my');
        if (mp3Buffer && mp3Buffer.length > 0) {
          const url = await storeAudioBuffer(mp3Buffer, 'mp3');
          return { url, voiceName: 'Burmese-Natural' };
        }
      } catch (burmeseErr: any) {
        console.warn('[TTS] Burmese engine error, attempting Gemini fallback:', burmeseErr?.message);
      }
    }

    // For English or non-Burmese text, use Gemini TTS
    const client = getClient();
    if (client) {
      try {
        const response: any = await withTimeout(
          client.models.generateContent({
            model: TTS_MODEL,
            contents: [{ parts: [{ text: textToSpeak }] }],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
            },
          } as any),
          TTS_TIMEOUT_MS
        );

        const audioPart = response?.candidates?.[0]?.content?.parts?.find(
          (p: any) => p?.inlineData?.data
        );
        const base64Audio = audioPart?.inlineData?.data;
        if (base64Audio) {
          const wavBuffer = pcmToWav(Buffer.from(base64Audio, 'base64'));
          const url = await storeAudioBuffer(wavBuffer, 'wav');
          return { url, voiceName };
        }
      } catch (geminiErr: any) {
        console.warn('[TTS] Gemini generation error, attempting TTS fallback:', geminiErr?.message);
      }
    }

    // Fallback: Google TTS in English if Gemini is unavailable
    try {
      const fallbackLang = isBurmese ? 'my' : 'en';
      const mp3Buffer = await fetchGoogleTts(textToSpeak, fallbackLang);
      if (mp3Buffer && mp3Buffer.length > 0) {
        const url = await storeAudioBuffer(mp3Buffer, 'mp3');
        return { url, voiceName: `${fallbackLang}-Voice` };
      }
    } catch (fallbackErr) {
      console.warn('[TTS] Universal fallback failed:', fallbackErr);
    }

    return null;
  } catch (err: any) {
    console.error('[TTS] Generation failed:', err?.message || err);
    return null;
  }
}
