import React, { useEffect, useState } from 'react';
import { Donation } from '../types';
import { CheckCircle2, XCircle, Clock, Copy, RefreshCw, X } from 'lucide-react';

interface StatusModalProps {
  donation: Donation;
  onClose: () => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({ donation: initialDonation, onClose }) => {
  const [donation, setDonation] = useState<Donation>(initialDonation);
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStatus = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch(`/api/donations/${donation.id}`);
      if (res.ok) {
        const data = await res.json();
        setDonation(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // Poll every 2 seconds while pending
    let interval: NodeJS.Timeout | null = null;
    if (donation.status === 'PENDING') {
      interval = setInterval(fetchStatus, 2000);
    }

    // Realtime EventSource listener
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/overlay/events');
      es.addEventListener('donation_status_changed', (e: any) => {
        try {
          const updatedDonation = JSON.parse(e.data);
          if (updatedDonation.id === donation.id || updatedDonation.publicId === donation.publicId) {
            setDonation(updatedDonation);
          }
        } catch (err) {}
      });
      es.addEventListener('donation_approved', (e: any) => {
        try {
          const evt = JSON.parse(e.data);
          if (evt.donationId === donation.id || evt.payload?.donation?.id === donation.id) {
            fetchStatus();
          }
        } catch (err) {}
      });
    } catch (err) {}

    return () => {
      if (interval) clearInterval(interval);
      if (es) es.close();
    };
  }, [donation.id, donation.status]);

  const copyId = () => {
    navigator.clipboard.writeText(donation.publicId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-slate-900">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Status Badge Header */}
        <div className="text-center mb-6">
          {donation.status === 'PENDING' && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold mb-3 animate-pulse">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Pending Admin Approval via Telegram</span>
            </div>
          )}

          {donation.status === 'APPROVED' && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold mb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Approved & Displayed on Stream!</span>
            </div>
          )}

          {donation.status === 'DECLINED' && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold mb-3">
              <XCircle className="w-4 h-4 text-rose-600" />
              <span>Donation Declined</span>
            </div>
          )}

          <h3 className="text-2xl font-bold tracking-tight text-slate-900">Donation Status</h3>
        </div>

        {/* Details Card */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3 mb-6">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Donation ID:</span>
            <button
              onClick={copyId}
              className="font-mono text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 font-medium transition cursor-pointer"
            >
              <span>{donation.publicId}</span>
              <Copy className="w-3.5 h-3.5" />
              {copied && <span className="text-xs text-emerald-600">Copied!</span>}
            </button>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Amount:</span>
            <span className="font-semibold text-lg text-emerald-600 font-mono">
              {donation.amount.toLocaleString()} {donation.currency}
            </span>
          </div>

          {donation.paymentMethodName && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Payment Method:</span>
              <span className="text-slate-800 font-medium">{donation.paymentMethodName}</span>
            </div>
          )}

          {donation.donationItemName && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Reward Item:</span>
              <span className="text-indigo-600 font-medium">{donation.donationItemName}</span>
            </div>
          )}

          {donation.message && (
            <div className="pt-2 border-t border-slate-200">
              <span className="text-xs text-slate-500 block mb-1">Your Message:</span>
              <p className="text-sm text-slate-700 bg-white p-2.5 rounded-lg italic border border-slate-200">
                "{donation.message}"
              </p>
            </div>
          )}
        </div>

        {/* Live Indicator & Actions */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={fetchStatus}
            disabled={isRefreshing}
            className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Check Status</span>
          </button>

          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
