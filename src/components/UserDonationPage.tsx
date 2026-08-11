import React, { useEffect, useState, useRef } from 'react';
import { Donation, DonationItem, MediaAsset, PaymentMethod, SystemSettings } from '../types';
import { StatusModal } from './StatusModal';
import { Sparkles, Copy, Upload, Check, ShieldAlert, Tv, ArrowRight, Volume2, VolumeX, Maximize2, X, Eye, Clock } from 'lucide-react';
import { GreenScreenMedia } from './GreenScreenMedia';

interface UserDonationPageProps {
  onNavigateAdmin: () => void;
  onNavigateOverlay: () => void;
}

export const UserDonationPage: React.FC<UserDonationPageProps> = ({
  onNavigateAdmin,
  onNavigateOverlay,
}) => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [donationItems, setDonationItems] = useState<DonationItem[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
    const [amount, setAmount] = useState<number>(5000);
  const [customAmountInput, setCustomAmountInput] = useState('5000');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('');
  const [donorName, setDonorName] = useState('');
  const [message, setMessage] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentProofUrl, setPaymentProofUrl] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);

  // Stream Alert Preview state
  const [showFullPreviewModal, setShowFullPreviewModal] = useState(false);
  const [isPlayingSoundPreview, setIsPlayingSoundPreview] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Submission & Status state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedDonation, setSubmittedDonation] = useState<Donation | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  const presetAmounts = [1000, 3000, 5000, 10000, 20000];

  useEffect(() => {
    fetchInitialData();

    // Check if user is currently in a 1-minute submission cooldown
    const cooldownUntil = localStorage.getItem('donation_cooldown_until');
    if (cooldownUntil) {
      const remainingMs = parseInt(cooldownUntil, 10) - Date.now();
      if (remainingMs > 0) {
        setCooldownSeconds(Math.ceil(remainingMs / 1000));
      } else {
        localStorage.removeItem('donation_cooldown_until');
      }
    }
  }, []);

  // Cooldown countdown interval
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          localStorage.removeItem('donation_cooldown_until');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [pmRes, itemsRes, mediaRes, sysRes] = await Promise.all([
        fetch('/api/payment-methods'),
        fetch('/api/donation-items'),
        fetch('/api/media-assets'),
        fetch('/api/system-settings'),
      ]);

      if (pmRes.ok) {
        const pmData: PaymentMethod[] = await pmRes.json();
        setPaymentMethods(pmData);
        if (pmData.length > 0) setSelectedPaymentMethodId(pmData[0].id);
      }

      if (itemsRes.ok) {
        const itemsData: DonationItem[] = await itemsRes.json();
        setDonationItems(itemsData);
        if (itemsData.length > 0) setSelectedItemId(itemsData[0].id);
      }

      if (mediaRes.ok) {
        const mediaData: MediaAsset[] = await mediaRes.json();
        setMediaAssets(mediaData);
      }
      if (sysRes.ok) {
        const sysData: SystemSettings = await sysRes.json();
        setSystemSettings(sysData);
      }
    } catch (err) {
      console.error('Failed to load initial donation data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAmountPreset = (val: number) => {
    setAmount(val);
    setCustomAmountInput(String(val));
    // Auto match item if applicable
    const matched = donationItems.find((i) => i.price === val);
    if (matched) {
      setSelectedItemId(matched.id);
    }
  };

  const handleSelectRewardItem = (item: DonationItem) => {
    setSelectedItemId(item.id);
    if (amount < item.price) {
      setAmount(item.price);
      setCustomAmountInput(String(item.price));
    }
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    setCustomAmountInput(valStr);
    const parsed = parseInt(valStr, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setAmount(parsed);
    } else {
      setAmount(0);
    }
  };

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingProof(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/donations/upload-proof', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setPaymentProofUrl(data.url);
      } else {
        const contentType = res.headers.get('content-type');
        let errorText = 'Failed to upload proof screenshot';
        if (contentType && contentType.includes('application/json')) {
          const errData = await res.json();
          errorText = errData.error || errorText;
        }
        alert(errorText);
      }
    } catch (err) {
      alert('File upload error');
    } finally {
      setUploadingProof(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(label);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const handleSubmitDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (cooldownSeconds > 0) {
      setErrorMessage(`ကျေးဇူးပြု၍ နောက်ထပ် Donation မတင်မီ ခဏစောင့်ပေးပါ (${cooldownSeconds} စက္ကန့် ကျန်သေးသည်)`);
      return;
    }

    if (!amount || amount <= 0) {
      setErrorMessage('Please enter a valid donation amount.');
      return;
    }

    if (selectedItem && amount < selectedItem.price) {
      setErrorMessage(`လှူဒါန်းငွေပမာဏသည် ရွေးချယ်ထားသော Reward (${selectedItem.name} - ${selectedItem.price.toLocaleString()} MMK) ၏ ဈေးနှုန်းထက် နည်းနေပါသည်။ ကျေးဇူးပြု၍ အနည်းဆုံး ${selectedItem.price.toLocaleString()} MMK ထည့်သွင်းပေးပါ။`);
      return;
    }

    if (!selectedPaymentMethodId) {
      setErrorMessage('Please select a payment method.');
      return;
    }

    if (!paymentReference || !paymentReference.trim()) {
      setErrorMessage('ကျေးဇူးပြု၍ Transaction Id ကို ထည့်သွင်းပေးပါ (Transaction ID is required).');
      return;
    }

    if (!paymentProofUrl) {
      setErrorMessage('Please upload a screenshot of your payment receipt (Payment Proof).');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donorName: donorName.trim(),
          amount,
          currency: 'MMK',
          message: message.trim(),
          paymentMethodId: selectedPaymentMethodId,
          paymentReference: paymentReference.trim(),
          paymentProofUrl,
          donationItemId: selectedItemId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSubmittedDonation(data.donation);

        // Start 1-minute (60 seconds) cooldown
        const cooldownEnd = Date.now() + 60000;
        localStorage.setItem('donation_cooldown_until', cooldownEnd.toString());
        setCooldownSeconds(60);

        // Reset form
        setMessage('');
        setPaymentReference('');
        setPaymentProofUrl('');
      } else {
        const contentType = res.headers.get('content-type');
        let errorText = 'Failed to submit donation.';
        if (contentType && contentType.includes('application/json')) {
          const err = await res.json();
          errorText = err.error || errorText;
        }
        setErrorMessage(errorText);
      }
    } catch (err) {
      setErrorMessage('Network connection error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPaymentMethod = paymentMethods.find((p) => p.id === selectedPaymentMethodId);
  const selectedItem = donationItems.find((i) => i.id === selectedItemId);
  const selectedSticker = mediaAssets.find((m) => m.id === selectedItem?.stickerId);
  const selectedSound = mediaAssets.find((m) => m.id === selectedItem?.soundId);
  const selectedVideo = mediaAssets.find((m) => m.id === selectedItem?.videoId);

  const playSoundPreview = () => {
    const soundUrl = selectedSound?.url || '/assets/sounds/chime.mp3';
    if (!audioRef.current) {
      audioRef.current = new Audio(soundUrl);
    } else {
      audioRef.current.src = soundUrl;
    }
    audioRef.current.volume = selectedSound?.volume ?? 0.8;
    setIsPlayingSoundPreview(true);
    audioRef.current
      .play()
      .then(() => {
        setTimeout(() => setIsPlayingSoundPreview(false), 2500);
      })
      .catch((e) => {
        console.warn('Audio preview play error:', e);
        setIsPlayingSoundPreview(false);
      });
  };

  const theme = systemSettings?.themeConfig || {};
  
  const customStyles = {
    '--theme-bg': theme.backgroundColor || '',
    '--theme-card': theme.cardBackgroundColor || '',
    '--theme-text': theme.textColor || '',
    '--theme-primary': theme.primaryColor || '',
  } as React.CSSProperties;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white" style={{ ...customStyles, backgroundColor: theme.backgroundColor || undefined, color: theme.textColor || undefined }}>
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-40 shadow-xs">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-bold text-slate-900 text-lg leading-tight tracking-tight">DonationLive</h1>
          </div>

          
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 md:py-10">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500 gap-3">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading donation options...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmitDonation} className="space-y-6">
            {errorMessage && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-sm flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            

            {/* 1. Amount & Reward Item */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4" style={{ backgroundColor: theme.cardBackgroundColor || undefined }}>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                1. Select Donation Amount <span className="text-rose-500">*</span>
              </label>

              {/* Presets */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {presetAmounts.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleAmountPreset(p)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                      amount === p
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {p.toLocaleString()} MMK
                  </button>
                ))}
              </div>

              {/* Custom amount */}
              <div>
                <span className="text-xs text-slate-500 block mb-1">Custom Amount (MMK)</span>
                <input
                  type="number"
                  min={selectedItem ? selectedItem.price : 100}
                  step="100"
                  value={customAmountInput}
                  onChange={handleCustomAmountChange}
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none text-sm font-mono transition ${
                    selectedItem && amount < selectedItem.price
                      ? 'border-rose-400 focus:ring-2 focus:ring-rose-500 bg-rose-50/30'
                      : 'border-slate-300 focus:ring-2 focus:ring-indigo-600'
                  }`}
                />

                {selectedItem && amount < selectedItem.price && (
                  <p className="text-xs text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                    <span>⚠️ ရွေးချယ်ထားသော Reward ({selectedItem.name}) ၏ ဈေးနှုန်း {selectedItem.price.toLocaleString()} MMK ထက် နည်း၍ မရပါ (အနည်းဆုံး {selectedItem.price.toLocaleString()} MMK ထည့်ပေးပါ)</span>
                  </p>
                )}

                {selectedItem && amount >= selectedItem.price && (
                  <span className="text-[11px] text-slate-500 block mt-1">
                    💡 Selected Reward: <strong className="text-slate-800">{selectedItem.name}</strong> (Minimum required: <span className="font-mono text-emerald-600 font-bold">{selectedItem.price.toLocaleString()} MMK</span>)
                  </span>
                )}
              </div>

              {/* Donation Items / Rewards */}
              {donationItems.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-3 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Select Reward / OBS Trigger Item
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[...donationItems].sort((a, b) => a.price - b.price).map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleSelectRewardItem(item)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                          selectedItemId === item.id
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                            selectedItemId === item.id
                              ? 'border-indigo-600 bg-indigo-600'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {selectedItemId === item.id && (
                            <div className="w-1.5 h-1.5 bg-white rounded-full" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold text-sm truncate text-slate-900">{item.name}</span>
                            <span className="text-xs font-mono text-emerald-600 font-bold shrink-0">
                              {item.price.toLocaleString()} MMK
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          <span className="inline-block mt-1.5 text-[10px] bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded font-mono border border-slate-300/50">
                            {item.displayDuration}s Stream Alert
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Live Stream Alert Preview Box */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                    <Tv className="w-4 h-4 text-indigo-600" />
                    Stream Alert Preview
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={playSoundPreview}
                      className="px-2.5 py-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg border border-indigo-200 flex items-center gap-1 transition cursor-pointer shadow-2xs"
                      title="Test Alert Sound Effect"
                    >
                      <Volume2 className={`w-3.5 h-3.5 ${isPlayingSoundPreview ? 'animate-bounce text-indigo-600' : ''}`} />
                      <span>Test Sound</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowFullPreviewModal(true); playSoundPreview(); }}
                      className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg border border-slate-200 flex items-center gap-1 transition cursor-pointer shadow-2xs"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
                      <span>Enlarge</span>
                    </button>
                  </div>
                </div>

                {/* Simulated OBS Alert Card */}
                <div className="bg-slate-950 rounded-2xl p-5 text-center relative overflow-hidden transition-all duration-300 select-none">

                  {/* Sticker / Video / Media Icon */}
                  <div className="my-2 flex justify-center items-center min-h-[80px]">
                    {selectedVideo?.url ? (
                      <GreenScreenMedia
                        src={selectedVideo.url}
                        type="video"
                        isGreenScreen={Boolean(selectedVideo.isGreenScreen || selectedItem?.isGreenScreen)}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="max-h-24 max-w-full rounded-xl border border-slate-800 object-contain shadow-md"
                      />
                    ) : selectedSticker?.url ? (
                      <GreenScreenMedia
                        src={selectedSticker.url}
                        type="sticker"
                        isGreenScreen={Boolean(selectedSticker.isGreenScreen || selectedItem?.isGreenScreen)}
                        alt={selectedSticker.name}
                        className="w-20 h-20 object-contain filter drop-shadow-[0_5px_15px_rgba(255,215,0,0.5)]"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-amber-500/10 border-2 border-amber-400/50 flex items-center justify-center text-amber-400 text-2xl font-black shadow-inner animate-pulse">
                        ⭐
                      </div>
                    )}
                  </div>

                  {/* Donor Name & Amount */}
                  

                  <div className="text-base font-black text-emerald-400 font-mono mb-1.5">
                    +{(amount || 0).toLocaleString()} MMK
                  </div>

                  {/* Message */}
                  <div className="mt-2 max-w-md mx-auto">
                    <p className="text-sm md:text-base text-white font-black italic drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] stroke-black stroke-2" style={{ textShadow: '0px 2px 4px rgba(0,0,0,0.8), 0px 2px 8px rgba(0,0,0,0.8)' }}>
                      "{message.trim() || 'Your message will appear here on live stream...'}"
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Message */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4" style={{ backgroundColor: theme.cardBackgroundColor || undefined }}>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                2. Sender Name & Message (Optional)
              </label>
              
              <div>
                <input
                  type="text"
                  placeholder="Your Name (e.g. John Doe)"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  maxLength={50}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 text-sm transition"
                />
              </div>

              <div>
                <textarea
                  rows={3}
                  placeholder="Say something nice to appear on OBS stream..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={200}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 text-sm transition"
                />
                <span className="text-xs text-slate-400 block text-right mt-1">
                  {message.length}/200 characters
                </span>
              </div>
            </div>

            {/* 3. Payment Method & Instructions */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4" style={{ backgroundColor: theme.cardBackgroundColor || undefined }}>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                3. Select Payment Method <span className="text-rose-500">*</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {paymentMethods.map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setSelectedPaymentMethodId(pm.id)}
                    className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                      selectedPaymentMethodId === pm.id
                        ? 'bg-indigo-600 border-indigo-600 text-white font-semibold shadow-sm'
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <span className="text-xs font-semibold block truncate">{pm.name}</span>
                  </button>
                ))}
              </div>

              {selectedPaymentMethod && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <div>
                      <span className="text-xs text-slate-500 block">Account Name</span>
                      <span className="text-sm font-semibold text-slate-900">
                        {selectedPaymentMethod.accountName}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(selectedPaymentMethod.accountName, 'accountName')
                      }
                      className="px-2.5 py-1 text-xs bg-white border border-slate-200 hover:bg-slate-100 text-indigo-600 rounded-lg flex items-center gap-1 transition cursor-pointer shadow-2xs"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copySuccess === 'accountName' ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <div>
                      <span className="text-xs text-slate-500 block">Account / Phone Number</span>
                      <span className="text-base font-mono font-bold text-emerald-600">
                        {selectedPaymentMethod.accountNumber}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(selectedPaymentMethod.accountNumber, 'accountNumber')
                      }
                      className="px-2.5 py-1 text-xs bg-white border border-slate-200 hover:bg-slate-100 text-indigo-600 rounded-lg flex items-center gap-1 transition cursor-pointer shadow-2xs"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copySuccess === 'accountNumber' ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>

                  {selectedPaymentMethod.instructions && (
                    <p className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                      ℹ️ {selectedPaymentMethod.instructions}
                    </p>
                  )}

                  {selectedPaymentMethod.qrImageUrl && (
                    <div className="text-center pt-2">
                      <span className="text-xs text-slate-500 block mb-2">Scan QR Code</span>
                      <img
                        src={selectedPaymentMethod.qrImageUrl}
                        alt="Payment QR"
                        className="w-40 h-40 object-contain mx-auto rounded-lg border border-slate-200 bg-white p-1 shadow-xs"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Transaction reference & screenshot */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Transaction ID / Ref Code <span className="text-rose-500 font-bold">* (မဖြစ်မနေ)</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Transaction Id နောက်ဆုံး 6 လုံးထည့်ပါ"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Payment Slip / Screenshot (Optional)
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer py-2 px-3.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 flex items-center gap-2 transition">
                      <Upload className="w-4 h-4 text-indigo-600" />
                      <span>{uploadingProof ? 'Uploading...' : 'Choose Screenshot'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProofUpload}
                        disabled={uploadingProof}
                        className="hidden"
                      />
                    </label>

                    {paymentProofUrl && (
                      <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                        <Check className="w-3.5 h-3.5" /> Uploaded!
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Cooldown Warning Notice */}
            {cooldownSeconds > 0 && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-3 text-amber-700 dark:text-amber-300 text-xs font-medium animate-fade-in">
                <Clock className="w-5 h-5 shrink-0 text-amber-500 animate-pulse" />
                <div>
                  Donation တင်ပြီးပါပြီ။ Duplicate မဖြစ်စေရန် နောက်ထပ် Donation မတင်မီ <strong>1 မိနစ်</strong> စောင့်ဆိုင်းရန် လိုအပ်ပါသည်။ (<strong>{cooldownSeconds} စက္ကန့်</strong> ကျန်ပါသေးသည်)
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || cooldownSeconds > 0}
              className="w-full py-3.5 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Submitting Donation...</span>
                </>
              ) : cooldownSeconds > 0 ? (
                <>
                  <Clock className="w-5 h-5 animate-pulse" />
                  <span>Please wait {cooldownSeconds}s before submitting again</span>
                </>
              ) : (
                <>
                  <span>Submit Donation ({amount.toLocaleString()} MMK)</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        )}
      </main>

      {/* Footer */}


      {/* Status Modal */}
      {submittedDonation && (
        <StatusModal
          donation={submittedDonation}
          onClose={() => setSubmittedDonation(null)}
        />
      )}

      {/* Full Screen Stream Alert Preview Modal */}
      {showFullPreviewModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full relative">
            <button
              onClick={() => setShowFullPreviewModal(false)}
              className="absolute -top-12 right-0 p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-full transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="bg-slate-950 rounded-3xl p-8 shadow-2xl text-center relative overflow-hidden select-none">

              {/* Media Section */}
              <div className="my-4 flex justify-center items-center min-h-[140px]">
                {selectedVideo?.url ? (
                  <GreenScreenMedia
                    src={selectedVideo.url}
                    type="video"
                    isGreenScreen={Boolean(selectedVideo.isGreenScreen || selectedItem?.isGreenScreen)}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="max-h-48 max-w-full rounded-2xl border border-slate-800 shadow-xl object-contain"
                  />
                ) : selectedSticker?.url ? (
                  <GreenScreenMedia
                    src={selectedSticker.url}
                    type="sticker"
                    isGreenScreen={Boolean(selectedSticker.isGreenScreen || selectedItem?.isGreenScreen)}
                    alt={selectedSticker.name}
                    className="w-36 h-36 object-contain filter drop-shadow-[0_10px_25px_rgba(255,215,0,0.5)]"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-amber-500/10 border-2 border-amber-400/50 flex items-center justify-center text-amber-400 text-4xl font-black shadow-inner animate-pulse">
                    ⭐
                  </div>
                )}
              </div>

              {/* Donor Name & Amount */}
              

              <div className="text-2xl font-black text-emerald-400 font-mono my-2">
                +{(amount || 0).toLocaleString()} MMK
              </div>

              {/* Message */}
              <div className="mt-2 max-w-lg mx-auto">
                <p className="text-xl md:text-2xl text-white font-black italic drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] stroke-black stroke-2" style={{ textShadow: '0px 2px 10px rgba(0,0,0,0.8), 0px 4px 20px rgba(0,0,0,0.8)' }}>
                  "{message.trim() || 'Your message will appear here on live stream...'}"
                </p>
              </div>

              <div className="mt-6 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={playSoundPreview}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg transition cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Test Alert Sound</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowFullPreviewModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
