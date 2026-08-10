import React, { useEffect, useState, useRef } from 'react';
import { Donation, DonationItem, MediaAsset, PaymentMethod } from '../types';
import { StatusModal } from './StatusModal';
import { Sparkles, Copy, Upload, Check, ShieldAlert, Tv, ArrowRight, Volume2, VolumeX, Maximize2, X, Eye } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);

  // Form state
    const [amount, setAmount] = useState<number>(5000);
  const [customAmountInput, setCustomAmountInput] = useState('5000');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('');
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

  const presetAmounts = [1000, 3000, 5000, 10000, 20000];

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [pmRes, itemsRes, mediaRes] = await Promise.all([
        fetch('/api/payment-methods'),
        fetch('/api/donation-items'),
        fetch('/api/media-assets'),
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

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    setCustomAmountInput(valStr);
    const parsed = parseInt(valStr, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setAmount(parsed);
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


    if (!amount || amount <= 0) {
      setErrorMessage('Please enter a valid donation amount.');
      return;
    }

    if (!selectedPaymentMethodId) {
      setErrorMessage('Please select a payment method.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donorName: '',
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
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
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
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
                  min="100"
                  step="100"
                  value={customAmountInput}
                  onChange={handleCustomAmountChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 text-sm font-mono"
                />
              </div>

              {/* Donation Items / Rewards */}
              {donationItems.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-3 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Select Reward / OBS Trigger Item
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {donationItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItemId(item.id)}
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
                    Stream Alert Preview (Stream မှာ တက်လာမဲ့ Alert)
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
                      onClick={() => setShowFullPreviewModal(true)}
                      className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg border border-slate-200 flex items-center gap-1 transition cursor-pointer shadow-2xs"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
                      <span>Enlarge</span>
                    </button>
                  </div>
                </div>

                {/* Simulated OBS Alert Card */}
                <div className="bg-[#0b0f19] border-2 border-amber-500/80 rounded-2xl p-5 shadow-xl text-white text-center relative overflow-hidden transition-all duration-300 select-none">
                  {/* Glowing background circles */}
                  <div className="absolute -top-12 -left-12 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

                  {/* Top Badge */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-[10px] uppercase tracking-widest mb-2 shadow-md">
                    <Sparkles className="w-3 h-3 fill-current" />
                    <span>NEW DONATION ALERT!</span>
                  </div>

                  {/* Sticker / Video / Media Icon */}
                  <div className="my-2 flex justify-center items-center min-h-[80px]">
                    {selectedVideo?.url ? (
                      <video
                        src={selectedVideo.url}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="max-h-24 max-w-full rounded-xl border border-slate-800 object-contain shadow-md"
                      />
                    ) : selectedSticker?.url ? (
                      <img
                        src={selectedSticker.url}
                        alt={selectedSticker.name}
                        className="w-20 h-20 object-contain animate-bounce duration-1000 filter drop-shadow-[0_5px_15px_rgba(255,215,0,0.5)]"
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

                  {/* Reward Item Badge */}
                  {selectedItem && (
                    <div className="inline-block px-2.5 py-0.5 rounded-md bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 text-[11px] font-semibold mb-2">
                      🎁 {selectedItem.name}
                    </div>
                  )}

                  {/* Message */}
                  <p className="text-xs text-slate-300 italic max-w-md mx-auto pt-2 border-t border-slate-800/80">
                    "{message.trim() || 'Your message will appear here on live stream...'}"
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Message */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                2. Optional Message to Streamer
              </label>
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

            {/* 3. Payment Method & Instructions */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
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
                    Transaction Ref / Note Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. KBZ Pay Ref #12345678"
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Submitting Donation...</span>
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

            <div className="bg-slate-950/95 border-2 border-amber-500/80 rounded-3xl p-8 shadow-2xl shadow-amber-500/20 backdrop-blur-md text-white text-center relative overflow-hidden select-none">
              {/* Background Glow */}
              <div className="absolute -top-24 -left-24 w-60 h-60 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

              {/* Top Badge */}
              <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs uppercase tracking-widest mb-4 shadow-lg">
                <Sparkles className="w-4 h-4 fill-current" />
                <span>NEW DONATION ALERT!</span>
              </div>

              {/* Media Section */}
              <div className="my-4 flex justify-center items-center min-h-[140px]">
                {selectedVideo?.url ? (
                  <video
                    src={selectedVideo.url}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="max-h-48 max-w-full rounded-2xl border border-slate-800 shadow-xl object-contain"
                  />
                ) : selectedSticker?.url ? (
                  <img
                    src={selectedSticker.url}
                    alt={selectedSticker.name}
                    className="w-36 h-36 object-contain animate-bounce duration-1000 filter drop-shadow-[0_10px_25px_rgba(255,215,0,0.5)]"
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

              {/* Reward Item Name */}
              {selectedItem && (
                <div className="inline-block px-3 py-1 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 text-xs font-semibold mb-3">
                  🎁 {selectedItem.name}
                </div>
              )}

              {/* Message */}
              <div className="mt-4 pt-4 border-t border-slate-800/80 max-w-lg mx-auto">
                <p className="text-base text-slate-200 font-medium italic">
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
