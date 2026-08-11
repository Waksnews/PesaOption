import React from 'react';
import { 
  TrendingUp, Shield, HelpCircle, FileText, ArrowLeft, Mail, Phone, MapPin, 
  Smartphone, Wallet, Lock, CheckCircle2, AlertTriangle, ShieldCheck, Scale, 
  BookOpen, ChevronRight, Globe, Award
} from 'lucide-react';
import { SEO } from '../SEO';

interface PageProps {
  onBack: () => void;
  onNavigate: (page: string) => void;
  onEnterApp: (mode: 'login' | 'register') => void;
}

const BASE_URL = "https://www.pesaoption.site";

// ----------------------------------------------------------------------------
// 1. ABOUT PAGE
// ----------------------------------------------------------------------------
export const AboutPage: React.FC<PageProps> = ({ onBack, onNavigate, onEnterApp }) => {
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": BASE_URL },
        { "@type": "ListItem", "position": 2, "name": "About Us", "item": `${BASE_URL}/#about` }
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      "name": "About PesaOption Trading Platform",
      "url": `${BASE_URL}/#about`,
      "description": "Learn about PesaOption, Kenya and Africa's premier binary options, forex, and cryptocurrency online trading platform with instant M-Pesa deposits.",
      "publisher": {
        "@type": "Organization",
        "name": "PesaOption",
        "url": BASE_URL,
        "logo": `${BASE_URL}/favicon.svg`
      }
    }
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-[#F8FAFC] font-sans selection:bg-[#2563EB] selection:text-white">
      <SEO 
        title="About Us | PesaOption - Premier Binary Options & Forex Trading Platform Kenya"
        description="Discover PesaOption, the leading online trading platform in Kenya & Africa. Trade binary options, forex, and crypto with instant M-Pesa STK deposits and institutional sub-10ms execution."
        keywords="About PesaOption, Forex Trading Kenya, Crypto Trading Kenya, Binary Options Trading, M-PESA Trading Platform, Online Trading Kenya"
        canonicalPath="/#about"
        schemaData={schema}
      />
      <PageHeader title="About PesaOption" subtitle="Institutional Technology Meets Local Financial Power" onBack={onBack} />
      
      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-12 space-y-12">
        <section className="space-y-4">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-slate-900 border border-slate-800 rounded-full text-xs font-semibold text-[#10B981]">
            <Award className="w-4 h-4 text-[#10B981]" />
            <span>Our Mission & Vision</span>
          </div>
          <h1 className="font-display font-black text-3xl sm:text-5xl text-white tracking-tight leading-tight">
            Empowering Traders Across Kenya & Africa with PesaOption
          </h1>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            Founded to bridge global financial markets with local African payment ecosystems, <strong>PesaOption</strong> is a premier <strong>Online Trading Platform in Kenya</strong>. We specialize in ultra-fast <strong>Binary Options Trading</strong>, digital options, spot <strong>Forex Trading Kenya</strong>, and <strong>Crypto Trading Kenya</strong>.
          </p>
        </section>

        <section className="grid md:grid-cols-3 gap-6">
          <div className="bg-[#0B132B] border border-slate-800 p-6 rounded-2xl space-y-3">
            <div className="w-10 h-10 bg-[#2563EB]/15 text-[#2563EB] rounded-xl flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-white">Global Market Access</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Trade over 100+ instruments including EUR/USD, GBP/USD, Bitcoin, Ethereum, Gold, Crude Oil, and Volatility Indices with 24/7 liquidity.
            </p>
          </div>

          <div className="bg-[#0B132B] border border-slate-800 p-6 rounded-2xl space-y-3">
            <div className="w-10 h-10 bg-[#10B981]/15 text-[#10B981] rounded-xl flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-white">M-PESA STK Push Integration</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Deposit starting from just KES 100 using automated M-Pesa STK prompts and withdraw profits directly to your mobile wallet in under 5 minutes.
            </p>
          </div>

          <div className="bg-[#0B132B] border border-slate-800 p-6 rounded-2xl space-y-3">
            <div className="w-10 h-10 bg-[#38BDF8]/15 text-[#38BDF8] rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-white">Bank-Grade Security</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Equipped with 256-bit SSL encryption, segregated client accounts, cold wallet isolation, and strict AML/KYC compliance.
            </p>
          </div>
        </section>

        <section className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-4">
          <h2 className="font-display font-black text-2xl text-white">Why PesaOption Outperforms Traditional Brokers</h2>
          <ul className="space-y-3 text-sm text-slate-300">
            <li className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0 mt-0.5" />
              <span><strong>Up to 98% Max Payouts:</strong> Exceptional returns on binary and digital option contracts.</span>
            </li>
            <li className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0 mt-0.5" />
              <span><strong>Sub-10ms Latency Engine:</strong> High-frequency matching engine designed for zero-slippage execution.</span>
            </li>
            <li className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0 mt-0.5" />
              <span><strong>$5,000 Free Demo Account:</strong> Practice your trading strategies risk-free with live-simulated market ticks.</span>
            </li>
          </ul>

          <div className="pt-4 flex flex-wrap gap-4">
            <button 
              onClick={() => onEnterApp('register')} 
              className="px-6 py-3 bg-gradient-to-r from-[#2563EB] to-[#10B981] text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider hover:brightness-110 transition cursor-pointer"
            >
              Open Free Demo Account
            </button>
            <button 
              onClick={() => onNavigate('contact')} 
              className="px-6 py-3 bg-slate-800 text-white font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-slate-700 transition cursor-pointer"
            >
              Contact Support
            </button>
          </div>
        </section>
      </main>

      <PageFooter onNavigate={onNavigate} />
    </div>
  );
};

// ----------------------------------------------------------------------------
// 2. CONTACT PAGE
// ----------------------------------------------------------------------------
export const ContactPage: React.FC<PageProps> = ({ onBack, onNavigate, onEnterApp }) => {
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": BASE_URL },
        { "@type": "ListItem", "position": 2, "name": "Contact Support", "item": `${BASE_URL}/#contact` }
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      "name": "Contact PesaOption Support",
      "url": `${BASE_URL}/#contact`,
      "description": "Get 24/7 customer support for PesaOption binary options, forex, M-Pesa deposits, and account inquiries."
    }
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-[#F8FAFC] font-sans selection:bg-[#2563EB] selection:text-white">
      <SEO 
        title="Contact Us | 24/7 Live Support PesaOption Kenya"
        description="Reach out to PesaOption's 24/7 customer care team. Get help with M-Pesa STK deposits, binary option execution, withdrawals, and account verification."
        keywords="Contact PesaOption, PesaOption Support, M-Pesa Deposit Help, Online Trading Kenya Customer Care"
        canonicalPath="/#contact"
        schemaData={schema}
      />
      <PageHeader title="Contact Support" subtitle="24/7 Professional Trading Assistance" onBack={onBack} />
      
      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-12 grid md:grid-cols-12 gap-8">
        <div className="md:col-span-5 space-y-6">
          <div className="bg-[#0B132B] border border-slate-800 p-6 rounded-2xl space-y-4">
            <h2 className="font-display font-bold text-xl text-white">Get in Touch</h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              Our dedicated support team operates 24/7/365 to assist with M-Pesa deposits, trading account verification, and technical support.
            </p>

            <div className="space-y-4 text-xs">
              <div className="flex items-start space-x-3">
                <Mail className="w-5 h-5 text-[#38BDF8] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">Email Support</div>
                  <div className="text-slate-400">support@pesaoption.com</div>
                  <div className="text-slate-400">compliance@pesaoption.com</div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Phone className="w-5 h-5 text-[#10B981] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">Telephone & WhatsApp</div>
                  <div className="text-slate-400">+254 (0) 700 000 000</div>
                  <div className="text-slate-400">+254 (0) 20 700 0000</div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-[#2563EB] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">Headquarters</div>
                  <div className="text-slate-400">PesaOption Tower, Delta Corner</div>
                  <div className="text-slate-400">Westlands, Nairobi, Kenya</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-7 bg-[#0B132B] border border-slate-800 p-6 rounded-2xl space-y-4">
          <h2 className="font-display font-bold text-xl text-white">Send Us a Direct Message</h2>
          <form onSubmit={(e) => { e.preventDefault(); alert("Thank you! Your message has been received. Our support agent will contact you within 15 minutes."); }} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Full Name</label>
                <input required type="text" placeholder="John Kamau" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#2563EB]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Email Address</label>
                <input required type="email" placeholder="john@example.com" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#2563EB]" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Phone Number (M-Pesa)</label>
              <input type="tel" placeholder="0712345678" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#2563EB]" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Subject</label>
              <select className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#2563EB]">
                <option value="deposit">M-Pesa Deposit Assistance</option>
                <option value="withdrawal">Withdrawal Status Request</option>
                <option value="account">Account & Verification (KYC)</option>
                <option value="technical">Trading Chart & Technical Issue</option>
                <option value="other">General Inquiry</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Message</label>
              <textarea required rows={4} placeholder="Describe your question or issue in detail..." className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#2563EB]"></textarea>
            </div>

            <button type="submit" className="w-full py-3 bg-gradient-to-r from-[#2563EB] to-[#10B981] text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider hover:brightness-110 transition cursor-pointer">
              Send Message
            </button>
          </form>
        </div>
      </main>

      <PageFooter onNavigate={onNavigate} />
    </div>
  );
};

// ----------------------------------------------------------------------------
// 3. FAQ PAGE
// ----------------------------------------------------------------------------
export const FAQPage: React.FC<PageProps> = ({ onBack, onNavigate, onEnterApp }) => {
  const faqItems = [
    {
      q: "What is PesaOption?",
      a: "PesaOption is Africa's premier online trading platform offering Binary Options Trading, Forex Trading Kenya, Crypto Trading, and global stock indices with fast execution and instant M-Pesa STK deposits."
    },
    {
      q: "How do I deposit money via M-Pesa STK Push?",
      a: "Login to your PesaOption dashboard, select Deposit, choose M-Pesa, enter your Kenyan mobile phone number (e.g., 0712345678) and amount in KES. Click Confirm Deposit, and enter your M-Pesa PIN when prompted on your mobile screen. Your trading account will credit instantly."
    },
    {
      q: "What is the minimum deposit and minimum trade size?",
      a: "The minimum deposit is only KES 100 ($1 USD), and minimum stake size per option contract is $1 USD. This makes PesaOption accessible for beginners and pros alike."
    },
    {
      q: "How fast are withdrawals processed?",
      a: "Automated M-Pesa withdrawals are processed instantly in under 5 minutes. Crypto and bank transfer payouts are processed within 15-30 minutes."
    },
    {
      q: "Is PesaOption suitable for beginners?",
      a: "Yes! Every user receives a free $5,000 Demo Trading Account to practice risk-free before switching to a real M-Pesa live trading account."
    },
    {
      q: "How do Binary Options work on PesaOption?",
      a: "You select an asset (e.g. EUR/USD or Bitcoin), set your stake, and predict whether the price will be Higher (Rise/Call) or Lower (Fall/Put) than the entry barrier price at expiration (10s to 60s). If correct, you earn up to 98% payout profit."
    }
  ];

  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": BASE_URL },
        { "@type": "ListItem", "position": 2, "name": "FAQ", "item": `${BASE_URL}/#faq` }
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqItems.map(item => ({
        "@type": "Question",
        "name": item.q,
        "acceptedAnswer": { "@type": "Answer", "text": item.a }
      }))
    }
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-[#F8FAFC] font-sans selection:bg-[#2563EB] selection:text-white">
      <SEO 
        title="Frequently Asked Questions (FAQ) | PesaOption Online Trading Kenya"
        description="Find answers to common questions about PesaOption, M-Pesa deposits, binary option execution, forex payouts, demo account usage, and withdrawal timelines."
        keywords="PesaOption FAQ, M-Pesa Trading Deposit, Binary Options Trading Kenya, How to Trade PesaOption"
        canonicalPath="/#faq"
        schemaData={schema}
      />
      <PageHeader title="Frequently Asked Questions" subtitle="Instant Answers to Everything You Need to Know" onBack={onBack} />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-12 space-y-6">
        {faqItems.map((item, i) => (
          <article key={i} className="bg-[#0B132B] border border-slate-800 p-6 rounded-2xl space-y-2">
            <h2 className="font-bold text-base sm:text-lg text-white flex items-center space-x-2">
              <HelpCircle className="w-5 h-5 text-[#38BDF8] shrink-0" />
              <span>{item.q}</span>
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed pl-7">
              {item.a}
            </p>
          </article>
        ))}

        <div className="pt-6 text-center">
          <button 
            onClick={() => onEnterApp('register')} 
            className="px-8 py-4 bg-gradient-to-r from-[#2563EB] via-[#38BDF8] to-[#10B981] text-slate-950 font-black rounded-xl text-sm uppercase tracking-wider hover:brightness-110 transition cursor-pointer"
          >
            Start Trading Now with $5,000 Demo
          </button>
        </div>
      </main>

      <PageFooter onNavigate={onNavigate} />
    </div>
  );
};

// ----------------------------------------------------------------------------
// 4. HOW TO DEPOSIT PAGE
// ----------------------------------------------------------------------------
export const HowToDepositPage: React.FC<PageProps> = ({ onBack, onNavigate, onEnterApp }) => {
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": BASE_URL },
        { "@type": "ListItem", "position": 2, "name": "How to Deposit", "item": `${BASE_URL}/#how-to-deposit` }
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Deposit Money via M-Pesa on PesaOption",
      "step": [
        { "@type": "HowToStep", "position": 1, "name": "Login to PesaOption", "text": "Navigate to the PesaOption live dashboard." },
        { "@type": "HowToStep", "position": 2, "name": "Open Deposit Modal", "text": "Click the Deposit button in your top balance wallet header." },
        { "@type": "HowToStep", "position": 3, "name": "Enter Phone Number & Amount", "text": "Specify your M-Pesa mobile number and deposit amount (min KES 100)." },
        { "@type": "HowToStep", "position": 4, "name": "Authorize STK Push", "text": "Enter your 4-digit M-Pesa PIN on your phone screen when prompted." }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-[#F8FAFC] font-sans selection:bg-[#2563EB] selection:text-white">
      <SEO 
        title="How to Deposit Money via M-Pesa | PesaOption Trading Platform"
        description="Step-by-step guide to instant M-Pesa STK push deposits on PesaOption. Start trading Forex, Binary Options, and Crypto in Kenya with as low as KES 100."
        keywords="How to Deposit M-Pesa Trading, M-PESA STK Push Deposit, PesaOption Deposit Guide, Forex Mpesa Kenya"
        canonicalPath="/#how-to-deposit"
        schemaData={schema}
      />
      <PageHeader title="How to Deposit via M-Pesa" subtitle="Instant Mobile Money Top-up in 4 Simple Steps" onBack={onBack} />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-12 space-y-8">
        <section className="bg-[#0B132B] border border-slate-800 p-6 rounded-2xl space-y-4">
          <h2 className="font-display font-black text-xl text-white">Supported Payment Gateways</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold text-center">
            <div className="p-3 bg-slate-900 border border-[#10B981]/40 text-[#10B981] rounded-xl">M-PESA (STK Push)</div>
            <div className="p-3 bg-slate-900 border border-slate-700 text-slate-200 rounded-xl">Visa / Mastercard</div>
            <div className="p-3 bg-slate-900 border border-slate-700 text-slate-200 rounded-xl">Crypto (BTC / USDT)</div>
            <div className="p-3 bg-slate-900 border border-slate-700 text-slate-200 rounded-xl">Bank Wire Transfer</div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-display font-black text-2xl text-white">Step-by-Step Deposit Instructions</h2>

          <div className="space-y-4">
            <div className="bg-[#0B132B] border border-slate-800 p-6 rounded-2xl flex items-start space-x-4">
              <span className="w-8 h-8 rounded-full bg-[#2563EB] text-slate-950 font-black flex items-center justify-center shrink-0">1</span>
              <div>
                <h3 className="font-bold text-base text-white">Login to Your PesaOption Dashboard</h3>
                <p className="text-slate-400 text-xs mt-1">Open the platform and click <strong>Log In</strong> or <strong>Open Account</strong> if you don't have one yet.</p>
              </div>
            </div>

            <div className="bg-[#0B132B] border border-slate-800 p-6 rounded-2xl flex items-start space-x-4">
              <span className="w-8 h-8 rounded-full bg-[#10B981] text-slate-950 font-black flex items-center justify-center shrink-0">2</span>
              <div>
                <h3 className="font-bold text-base text-white">Click "Deposit" in Your Wallet Bar</h3>
                <p className="text-slate-400 text-xs mt-1">Select the green <strong>Deposit</strong> button at the top header or in your Wallet section.</p>
              </div>
            </div>

            <div className="bg-[#0B132B] border border-slate-800 p-6 rounded-2xl flex items-start space-x-4">
              <span className="w-8 h-8 rounded-full bg-[#38BDF8] text-slate-950 font-black flex items-center justify-center shrink-0">3</span>
              <div>
                <h3 className="font-bold text-base text-white">Enter M-Pesa Details & Amount</h3>
                <p className="text-slate-400 text-xs mt-1">Enter your Safaricom M-Pesa mobile number (e.g. 0712345678) and deposit amount (minimum KES 100 / $1 USD).</p>
              </div>
            </div>

            <div className="bg-[#0B132B] border border-slate-800 p-6 rounded-2xl flex items-start space-x-4">
              <span className="w-8 h-8 rounded-full bg-[#F59E0B] text-slate-950 font-black flex items-center justify-center shrink-0">4</span>
              <div>
                <h3 className="font-bold text-base text-white">Authorize STK Push Prompt on Phone</h3>
                <p className="text-slate-400 text-xs mt-1">Check your phone screen for the automatic Safaricom M-Pesa popup prompt. Enter your 4-digit secret PIN and click SEND. Your balance will update instantly.</p>
              </div>
            </div>
          </div>
        </section>

        <div className="text-center pt-4">
          <button 
            onClick={() => onEnterApp('login')} 
            className="px-8 py-4 bg-gradient-to-r from-[#10B981] to-[#38BDF8] text-slate-950 font-black rounded-xl text-sm uppercase tracking-wider hover:brightness-110 transition cursor-pointer"
          >
            Deposit Now on Live Dashboard
          </button>
        </div>
      </main>

      <PageFooter onNavigate={onNavigate} />
    </div>
  );
};

// ----------------------------------------------------------------------------
// 5. HOW TO WITHDRAW PAGE
// ----------------------------------------------------------------------------
export const HowToWithdrawPage: React.FC<PageProps> = ({ onBack, onNavigate, onEnterApp }) => {
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": BASE_URL },
        { "@type": "ListItem", "position": 2, "name": "How to Withdraw", "item": `${BASE_URL}/#how-to-withdraw` }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-[#F8FAFC] font-sans selection:bg-[#2563EB] selection:text-white">
      <SEO 
        title="How to Withdraw Money to M-Pesa | PesaOption Payouts"
        description="Learn how to request instant withdrawals from PesaOption directly to your M-Pesa account, crypto wallet, or bank account in Kenya."
        keywords="Withdraw M-Pesa Trading, PesaOption Withdrawal, Fast Payout Trading Kenya, Forex Withdrawal Mpesa"
        canonicalPath="/#how-to-withdraw"
        schemaData={schema}
      />
      <PageHeader title="How to Withdraw Funds" subtitle="Fast Automated Payouts Directly to Your Mobile Wallet" onBack={onBack} />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-12 space-y-8">
        <section className="bg-[#0B132B] border border-slate-800 p-6 rounded-2xl space-y-4">
          <h2 className="font-display font-black text-xl text-white">Withdrawal Methods & Processing Speed</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
              <div className="font-bold text-[#10B981]">M-PESA Payout</div>
              <div className="text-slate-400">Processing Time: &lt; 5 Minutes</div>
              <div className="text-slate-400">Min: KES 100 / Max: KES 300,000</div>
            </div>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
              <div className="font-bold text-[#38BDF8]">Cryptocurrency (USDT/BTC)</div>
              <div className="text-slate-400">Processing Time: 15-30 Minutes</div>
              <div className="text-slate-400">Min: $10 / Max: Unlimited</div>
            </div>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
              <div className="font-bold text-[#2563EB]">Bank Wire Transfer</div>
              <div className="text-slate-400">Processing Time: 1-2 Business Days</div>
              <div className="text-slate-400">Min: $50 / Max: $100,000</div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-display font-black text-2xl text-white">Withdrawal Process Instructions</h2>

          <div className="space-y-4">
            <div className="bg-[#0B132B] border border-slate-800 p-6 rounded-2xl flex items-start space-x-4">
              <span className="w-8 h-8 rounded-full bg-[#2563EB] text-slate-950 font-black flex items-center justify-center shrink-0">1</span>
              <div>
                <h3 className="font-bold text-base text-white">Open the Withdraw Panel</h3>
                <p className="text-slate-400 text-xs mt-1">In your dashboard header, click <strong>Withdraw</strong>.</p>
              </div>
            </div>

            <div className="bg-[#0B132B] border border-slate-800 p-6 rounded-2xl flex items-start space-x-4">
              <span className="w-8 h-8 rounded-full bg-[#10B981] text-slate-950 font-black flex items-center justify-center shrink-0">2</span>
              <div>
                <h3 className="font-bold text-base text-white">Select Payout Gateway & Enter Amount</h3>
                <p className="text-slate-400 text-xs mt-1">Choose M-Pesa or Crypto, enter the withdrawal amount and recipient phone number or wallet address.</p>
              </div>
            </div>

            <div className="bg-[#0B132B] border border-slate-800 p-6 rounded-2xl flex items-start space-x-4">
              <span className="w-8 h-8 rounded-full bg-[#38BDF8] text-slate-950 font-black flex items-center justify-center shrink-0">3</span>
              <div>
                <h3 className="font-bold text-base text-white">Submit Request for System Review</h3>
                <p className="text-slate-400 text-xs mt-1">Click Confirm Withdrawal. Our automated ledger system reviews and dispatches funds directly to your M-Pesa account.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PageFooter onNavigate={onNavigate} />
    </div>
  );
};

// ----------------------------------------------------------------------------
// 6. LEGAL POLICY PAGES (Privacy, Terms, Risk, AML, KYC, Cookie)
// ----------------------------------------------------------------------------
export const PolicyPage: React.FC<PageProps & { type: 'privacy' | 'terms' | 'risk' | 'aml' | 'kyc' | 'cookie' }> = ({ type, onBack, onNavigate }) => {
  const configs = {
    privacy: {
      title: "Privacy Policy",
      metaTitle: "Privacy Policy | PesaOption Data Protection",
      description: "Read PesaOption's Privacy Policy to understand how we collect, protect, and process user data in accordance with international financial standards.",
      canonical: "/#privacy-policy",
      content: (
        <div className="space-y-4 text-slate-300 text-xs sm:text-sm leading-relaxed">
          <p>Effective Date: August 2, 2026</p>
          <h2 className="font-bold text-lg text-white">1. Information We Collect</h2>
          <p>PesaOption collects information necessary to provide binary options, forex, and cryptocurrency trading services. This includes personal identification details (name, email, phone number), transactional records (M-Pesa numbers, payment references), and technical telemetry (IP address, device identifiers).</p>
          <h2 className="font-bold text-lg text-white">2. Use of Data</h2>
          <p>We use collected data solely for verifying identity, facilitating STK push payments, maintaining trading ledgers, preventing fraudulent activities, and ensuring regulatory compliance.</p>
          <h2 className="font-bold text-lg text-white">3. Data Security & Encryption</h2>
          <p>All user data transmitted to PesaOption is secured using 256-bit SSL encryption. We store sensitive credentials in isolated cold databases protected by multi-factor security protocols.</p>
        </div>
      )
    },
    terms: {
      title: "Terms & Conditions",
      metaTitle: "Terms & Conditions | PesaOption Platform Rules",
      description: "Review the Terms and Conditions governing user accounts, binary option contract execution, deposits, withdrawals, and platform usage on PesaOption.",
      canonical: "/#terms-of-service",
      content: (
        <div className="space-y-4 text-slate-300 text-xs sm:text-sm leading-relaxed">
          <p>Effective Date: August 2, 2026</p>
          <h2 className="font-bold text-lg text-white">1. Account Eligibility</h2>
          <p>By opening an account on PesaOption, you certify that you are at least 18 years of age and legally permitted to engage in online financial trading in your jurisdiction.</p>
          <h2 className="font-bold text-lg text-white">2. Trade Execution Rules</h2>
          <p>Option contracts placed on PesaOption are executed at real-time market prices. Payout percentages (up to 98%) are locked upon contract placement.</p>
          <h2 className="font-bold text-lg text-white">3. Deposit & Withdrawal Terms</h2>
          <p>Deposits and withdrawals must be initiated from mobile money accounts or payment instruments owned by the registered user.</p>
        </div>
      )
    },
    risk: {
      title: "Risk Disclosure Notice",
      metaTitle: "Risk Disclosure | PesaOption Trading Hazards",
      description: "Important risk disclosure warning regarding high-volatility financial instruments, binary options, forex, and cryptocurrency trading.",
      canonical: "/#risk-disclosure",
      content: (
        <div className="space-y-4 text-slate-300 text-xs sm:text-sm leading-relaxed">
          <div className="p-4 bg-red-950/40 border border-red-800/80 rounded-xl text-red-200 flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
            <p><strong>HIGH RISK WARNING:</strong> Trading binary options, forex, digital options, and cryptocurrencies carries a high level of risk and may not be suitable for all investors. You may lose all of your invested capital. Do not trade with money you cannot afford to lose.</p>
          </div>
          <p>Financial derivative products offered by PesaOption carry significant risk of loss due to market volatility, rapid price fluctuations, and leverage effects.</p>
        </div>
      )
    },
    aml: {
      title: "Anti-Money Laundering (AML) Policy",
      metaTitle: "Anti-Money Laundering (AML) Policy | PesaOption Compliance",
      description: "PesaOption's Anti-Money Laundering (AML) policy guidelines, transaction monitoring rules, and financial crime prevention standards.",
      canonical: "/#aml-policy",
      content: (
        <div className="space-y-4 text-slate-300 text-xs sm:text-sm leading-relaxed">
          <h2 className="font-bold text-lg text-white">1. Regulatory Statement</h2>
          <p>PesaOption maintains strict compliance with international Anti-Money Laundering (AML) standards and Countering the Financing of Terrorism (CFT) laws.</p>
          <h2 className="font-bold text-lg text-white">2. Automated Transaction Monitoring</h2>
          <p>All deposits and withdrawals via M-Pesa, crypto, and bank gateways undergo automated pattern monitoring to identify suspicious transaction behaviors.</p>
        </div>
      )
    },
    kyc: {
      title: "Know Your Customer (KYC) Policy",
      metaTitle: "KYC Verification Policy | PesaOption User Protection",
      description: "Understand PesaOption's Know Your Customer (KYC) identity verification requirements for secure trading accounts.",
      canonical: "/#kyc-policy",
      content: (
        <div className="space-y-4 text-slate-300 text-xs sm:text-sm leading-relaxed">
          <h2 className="font-bold text-lg text-white">1. Identity Verification Requirements</h2>
          <p>To ensure platform safety, PesaOption may require users to submit valid government identification (National ID card, Passport) prior to approving large withdrawal limits.</p>
        </div>
      )
    },
    cookie: {
      title: "Cookie Policy",
      metaTitle: "Cookie Policy | PesaOption Platform Preferences",
      description: "PesaOption Cookie Policy detailing how we use session cookies and essential telemetry to enhance platform security and performance.",
      canonical: "/#cookie-policy",
      content: (
        <div className="space-y-4 text-slate-300 text-xs sm:text-sm leading-relaxed">
          <p>PesaOption uses essential session cookies to keep your trading workspace authenticated and maintain chart preferences. No third-party tracking cookies are sold to external advertisers.</p>
        </div>
      )
    }
  };

  const current = configs[type];

  return (
    <div className="min-h-screen bg-[#020617] text-[#F8FAFC] font-sans selection:bg-[#2563EB] selection:text-white">
      <SEO 
        title={current.metaTitle}
        description={current.description}
        keywords="PesaOption Policies, Legal Trading Kenya, Binary Options Compliance"
        canonicalPath={current.canonical}
      />
      <PageHeader title={current.title} subtitle="Official Platform Policy & Legal Guidelines" onBack={onBack} />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-12">
        <article className="bg-[#0B132B] border border-slate-800 p-6 sm:p-8 rounded-2xl">
          {current.content}
        </article>
      </main>

      <PageFooter onNavigate={onNavigate} />
    </div>
  );
};

// ----------------------------------------------------------------------------
// SHARED UI COMPONENTS
// ----------------------------------------------------------------------------
const PageHeader: React.FC<{ title: string; subtitle: string; onBack: () => void }> = ({ title, subtitle, onBack }) => (
  <header className="sticky top-0 z-50 bg-[#020617]/95 backdrop-blur-xl border-b border-slate-800 px-4 sm:px-8 py-4">
    <div className="max-w-7xl mx-auto flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <button 
          onClick={onBack}
          className="p-2 bg-slate-900 border border-slate-700 text-slate-300 hover:text-white rounded-xl transition flex items-center space-x-1 cursor-pointer"
          aria-label="Back to Main Site"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs font-bold hidden sm:inline">Back</span>
        </button>
        <div>
          <h1 className="font-display font-black text-xl text-white leading-tight">{title}</h1>
          <p className="text-[11px] text-slate-400 font-medium">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-slate-950 font-black" />
        </div>
        <span className="font-display font-bold text-base text-white hidden md:inline">PesaOption</span>
      </div>
    </div>
  </header>
);

const PageFooter: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => (
  <footer className="bg-slate-950 border-t border-slate-800/80 py-8 px-4 sm:px-8 text-xs text-slate-400 mt-12">
    <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>
        © {new Date().getFullYear()} PesaOption. All rights reserved.
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
        <span onClick={() => onNavigate('about')} className="hover:text-white cursor-pointer">About</span>
        <span onClick={() => onNavigate('contact')} className="hover:text-white cursor-pointer">Contact</span>
        <span onClick={() => onNavigate('faq')} className="hover:text-white cursor-pointer">FAQ</span>
        <span onClick={() => onNavigate('privacy')} className="hover:text-white cursor-pointer">Privacy Policy</span>
        <span onClick={() => onNavigate('terms')} className="hover:text-white cursor-pointer">Terms</span>
        <span onClick={() => onNavigate('risk')} className="hover:text-white cursor-pointer">Risk Disclosure</span>
      </div>
    </div>
  </footer>
);
