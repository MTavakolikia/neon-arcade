'use client';

// ─── Neon Arcade · Shop ──────────────────────────────────────────────────────
// Digital goods (coin purchases, instant theme unlocks) + physical merch cart.

import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ShoppingCart, Trash2 } from 'lucide-react';
import { PRODUCTS, type ShopProduct } from '@/lib/arcade/data';
import { useArcade } from '@/lib/arcade/store';
import { audio } from '@/lib/arcade/audio';
import { burst } from '@/lib/arcade/confetti';
import { SectionTitle } from '@/components/arcade/shared';
import { cn } from '@/lib/utils';

type Filter = 'all' | 'digital' | 'physical';

export function ShopView() {
  const [filter, setFilter] = useState<Filter>('all');
  const [cartOpen, setCartOpen] = useState(false);
  const coins = useArcade((s) => s.coins);
  const cart = useArcade((s) => s.cart);
  const purchased = useArcade((s) => s.purchasedItems);
  const toggleCart = useArcade((s) => s.toggleCart);
  const clearCart = useArcade((s) => s.clearCart);
  const buyProduct = useArcade((s) => s.buyProduct);

  const items = PRODUCTS.filter((p) => filter === 'all' || p.type === filter);
  const cartItems = PRODUCTS.filter((p) => cart.includes(p.id));
  const cartTotal = cartItems.reduce((sum, p) => sum + p.price, 0);

  const buyDigital = (p: ShopProduct, e: React.MouseEvent) => {
    if (purchased.includes(p.id)) {
      toast.info('Already owned — check the dashboard to equip it.');
      return;
    }
    if (p.id === 'coin-pack-s') {
      useArcade.getState().addCoins(200);
      audio.coin();
      burst({ count: 40, power: 8, colors: ['#fbbf24', '#f59e0b'] });
      toast.success('🪙 200 coins added to your wallet!');
      return;
    }
    if (coins < p.price) {
      audio.error();
      toast.error(`Need ${p.price - coins} more coins. Go win some rounds!`);
      return;
    }
    const ok = buyProduct(p.id, p.price, p.themeId);
    if (ok) {
      audio.purchase();
      burst({ count: 60, power: 10 });
      toast.success(`${p.emoji} ${p.name} unlocked & equipped!`);
    }
  };

  const checkout = () => {
    if (cartItems.length === 0) return;
    audio.purchase();
    burst({ count: 90, power: 12 });
    toast.success(`Order placed! ${cartItems.length} item${cartItems.length > 1 ? 's' : ''} on the way. (Demo checkout)`);
    clearCart();
    setCartOpen(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 pb-24 pt-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionTitle kicker="Spend it or wear it" title="Coin Shop" accent="#fbbf24" />
        <div className="flex items-center gap-3 mb-6">
          <span className="glass rounded-full px-4 py-2 text-sm font-black text-amber-300 flex items-center gap-1.5">
            🪙 {coins} <span className="text-white/40 font-semibold text-xs">coins</span>
          </span>
          <button
            onClick={() => { audio.click(); setCartOpen(true); }}
            className="relative glass rounded-full px-4 py-2 text-sm font-bold text-white/85 hover:bg-white/10 transition flex items-center gap-2"
            aria-label={`Open cart, ${cart.length} items`}
          >
            <ShoppingCart className="w-4 h-4" aria-hidden /> Cart
            {cart.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-400 text-[10px] font-black text-[#16041f] flex items-center justify-center anim-pop">
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* filter tabs */}
      <div className="flex gap-2 mb-7" role="tablist" aria-label="Product filter">
        {(['all', 'digital', 'physical'] as Filter[]).map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            onClick={() => { audio.click(); setFilter(f); }}
            className={cn(
              'rounded-xl px-5 py-2.5 text-sm font-bold capitalize transition-all',
              filter === f ? 'text-[#16041f]' : 'glass text-white/60 hover:text-white'
            )}
            style={filter === f ? { background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', boxShadow: '0 0 18px rgba(251,191,36,.35)' } : undefined}
          >
            {f === 'all' ? 'Everything' : f === 'digital' ? '⚡ Digital (coins)' : '📦 Physical merch'}
          </button>
        ))}
      </div>

      {/* products */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p, i) => {
          const owned = purchased.includes(p.id);
          const affordable = coins >= p.price;
          const inCart = cart.includes(p.id);
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className={cn(
                'glass rounded-2xl p-5 flex flex-col relative overflow-hidden border',
                owned ? 'border-emerald-400/40' : 'border-white/9'
              )}
            >
              {p.tag && (
                <span className="absolute top-3 right-3 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/8 text-white/60">
                  {p.tag}
                </span>
              )}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl mb-4"
                style={{ background: p.type === 'digital' ? 'rgba(232,121,249,.12)' : 'rgba(251,191,36,.10)', border: '1px solid rgba(255,255,255,.1)' }}
                aria-hidden
              >
                {p.emoji}
              </div>
              <h3 className="font-black text-white tracking-tight">{p.name}</h3>
              <p className="text-xs text-white/50 mt-1.5 leading-relaxed flex-1">{p.desc}</p>
              <div className="flex items-center justify-between mt-4">
                <span className={cn('font-black text-sm', p.type === 'digital' ? 'text-amber-300' : 'text-cyan-300')}>{p.priceLabel}</span>
                {p.type === 'digital' ? (
                  <button
                    onClick={(e) => buyDigital(p, e)}
                    disabled={owned && p.id !== 'coin-pack-s'}
                    className={cn(
                      'rounded-xl px-4 py-2 text-xs font-black transition-all active:scale-95',
                      owned && p.id !== 'coin-pack-s'
                        ? 'bg-emerald-400/15 text-emerald-300 cursor-default'
                        : affordable || p.price === 0
                          ? 'text-[#16041f] hover:scale-[1.04]'
                          : 'glass text-white/50 cursor-not-allowed'
                    )}
                    style={!(owned && p.id !== 'coin-pack-s') && (affordable || p.price === 0)
                      ? { background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', boxShadow: '0 0 16px rgba(251,191,36,.4)' }
                      : undefined}
                  >
                    {owned && p.id !== 'coin-pack-s' ? '✓ Owned' : p.id === 'coin-pack-s' ? 'Claim' : affordable ? 'Buy now' : 'Need coins'}
                  </button>
                ) : (
                  <button
                    onClick={() => { audio.click(); toggleCart(p.id); }}
                    className={cn(
                      'rounded-xl px-4 py-2 text-xs font-black transition-all active:scale-95',
                      inCart ? 'bg-rose-400/15 text-rose-300' : 'glass text-white/85 hover:bg-white/12'
                    )}
                  >
                    {inCart ? '− Remove' : '+ Add to cart'}
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* cart sheet */}
      {cartOpen && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
          <motion.aside
            initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="relative w-full max-w-sm h-full p-6 flex flex-col border-l border-white/10"
            style={{ background: 'linear-gradient(180deg,#160826,#0c0318)' }}
            role="dialog" aria-label="Shopping cart"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-cyan-300" aria-hidden /> Your Cart
              </h3>
              <button onClick={() => { audio.click(); setCartOpen(false); }} className="text-white/50 hover:text-white text-2xl leading-none" aria-label="Close cart">×</button>
            </div>

            {cartItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
                <span className="text-5xl opacity-40" aria-hidden>🛒</span>
                <p className="text-sm text-white/50">Cart is empty.<br />Add some merch from the shelf!</p>
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-3 overflow-y-auto neon-scroll pr-1">
                  {cartItems.map((p) => (
                    <div key={p.id} className="glass rounded-xl p-3.5 flex items-center gap-3">
                      <span className="text-2xl" aria-hidden>{p.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white truncate">{p.name}</div>
                        <div className="text-xs text-cyan-300 font-bold">{p.priceLabel}</div>
                      </div>
                      <button onClick={() => { audio.click(); toggleCart(p.id); }} className="text-white/40 hover:text-rose-400 transition" aria-label={`Remove ${p.name}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/10 pt-4 mt-4">
                  <div className="flex justify-between text-sm mb-4">
                    <span className="text-white/60">Total</span>
                    <span className="font-black text-cyan-300 text-lg">${cartTotal.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={checkout}
                    className="w-full rounded-xl py-3.5 font-black text-sm tracking-wide text-[#16041f] transition-transform hover:scale-[1.02] active:scale-95"
                    style={{ background: 'linear-gradient(135deg,#22d3ee,#34d399)', boxShadow: '0 0 22px rgba(34,211,238,.4)' }}
                  >
                    Place demo order · ${cartTotal.toFixed(2)}
                  </button>
                  <p className="text-[10px] text-white/35 text-center mt-3">Demo storefront — no real payment happens. Digital themes above buy with coins.</p>
                </div>
              </>
            )}
          </motion.aside>
        </div>
      )}
    </div>
  );
}
