import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Search,
  Star,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Leaf,
  ShieldCheck,
  Truck,
  Phone,
  MapPin,
  Instagram,
  Send,
  Eye,
  X,
  CreditCard,
  MessageCircle,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { PaymentMethod, ProductRecord } from '../types/database';

export const formatRupiah = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);

interface StorefrontProps {
  onOpenAdmin: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const StorefrontView: React.FC<StorefrontProps> = ({ onOpenAdmin, onShowToast }) => {
  const { db, cart, addToCart, updateCartQty, removeFromCart, submitCheckout } = useStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [detailProduct, setDetailProduct] = useState<ProductRecord | null>(null);
  const [detailQty, setDetailQty] = useState<number>(1);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [completedOrder, setCompletedOrder] = useState<{ orderNumber: string } | null>(null);

  const [checkoutForm, setCheckoutForm] = useState({
    customerName: '',
    customerWhatsapp: '',
    shippingAddress: '',
    notes: '',
    paymentMethod: 'Transfer Bank' as PaymentMethod,
  });

  const filteredProducts = useMemo(() => {
    return db.products.filter((p) => {
      const matchCat = selectedCategory === 'ALL' || p.category_id === selectedCategory;
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [db.products, selectedCategory, searchQuery]);

  const cartDetails = useMemo(() => {
    const items = cart
      .map((c) => {
        const product = db.products.find((p) => p.id === c.product_id);
        if (!product) return null;
        return {
          ...c,
          product,
          subtotal: product.price * c.quantity,
        };
      })
      .filter(Boolean) as Array<{ product_id: string; quantity: number; product: ProductRecord; subtotal: number }>;

    const subtotal = items.reduce((acc, i) => acc + i.subtotal, 0);
    const shipping =
      items.length === 0
        ? 0
        : subtotal >= db.settings.free_shipping_threshold
        ? 0
        : db.settings.default_shipping;
    return {
      items,
      totalCount: items.reduce((acc, i) => acc + i.quantity, 0),
      subtotal,
      shipping,
      total: subtotal + shipping,
    };
  }, [cart, db.products, db.settings]);

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutForm.customerName.trim() || !checkoutForm.customerWhatsapp.trim() || !checkoutForm.shippingAddress.trim()) {
      onShowToast('Mohon lengkapi nama, nomor WhatsApp, dan alamat pengiriman.', 'error');
      return;
    }
    const res = submitCheckout(checkoutForm);
    if (res) {
      setIsCheckoutOpen(false);
      setCompletedOrder({ orderNumber: res.orderNumber });
      onShowToast(`Pesanan ${res.orderNumber} berhasil dibuat!`, 'success');
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF5DF] text-[#633D25]">
      {/* Hero Section */}
      <section id="beranda" className="relative overflow-hidden bg-gradient-to-br from-[#FFF5DF] via-[#FFF5DF] to-[#F5C84C]/35 pt-10 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#557447]/15 text-[#557447] text-xs font-bold">
              <Leaf className="w-4 h-4" /> Modern Tropical Food Branding • 100% Pisang Kepok Pilihan
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#633D25] leading-tight">
              Nikmati Renyahnya Keripik Pisang Salee!
            </h1>
            <p className="text-lg text-[#633D25]/80 max-w-2xl">
              Camilan tropis premium dari irisan pisang kepok kuning matang pohon yang disalai secara higienis dan dibalut varian rasa autentik.
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="#produk" className="px-7 py-4 rounded-2xl bg-[#633D25] text-white font-bold flex items-center gap-2 shadow-lg">
                <ShoppingBag className="w-5 h-5 text-[#F5C84C]" /> Belanja Sekarang
              </a>
              <a href="#tentang-kami" className="px-7 py-4 rounded-2xl bg-white text-[#633D25] border border-[#633D25]/20 font-bold flex items-center gap-2">
                Kenali Produk Kami <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
          <div className="lg:col-span-5">
            <img
              src="./assets/images/salee-madu-karamel.jpg"
              alt="Keripik Pisang Salee"
              className="w-full aspect-square object-cover rounded-3xl shadow-2xl border-4 border-white"
            />
          </div>
        </div>
      </section>
    </div>
  );
};
