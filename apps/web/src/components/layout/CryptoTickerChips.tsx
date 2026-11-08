'use client';

import React from 'react';
import { TrendingUp } from 'lucide-react';

export const CryptoTickerChips: React.FC = () => {
  return (
    <div className="hidden xl:flex items-center gap-2.5 text-xs font-mono select-none">
      <div className="flex items-center gap-1.5 text-lord-gold font-bold bg-lord-gold/10 px-2.5 py-1 rounded-lg border border-lord-gold/20 shadow-xs">
        <TrendingUp className="w-3.5 h-3.5" />
        <span>BTC $91,420</span>
      </div>
      <div className="flex items-center gap-1.5 text-cyber-blue font-bold bg-cyber-blue/10 px-2.5 py-1 rounded-lg border border-cyber-blue/20">
        <span>ETH $3,450</span>
      </div>
      <div className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
        <span>USDT BEP20</span>
      </div>
    </div>
  );
};

