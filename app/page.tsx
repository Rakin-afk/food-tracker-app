'use client';

import React, { useState } from 'react';
import { Camera, RefreshCw, Flame, Sparkles, ArrowRight, Utensils } from 'lucide-react';

interface FoodItem {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  weightGrams: number;
  servings: number;
}

interface AnalysisResult {
  foodTitle: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  items: FoodItem[];
}

export default function Home() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0); // রিয়েল-টাইম প্রোগ্রেস পার্সেন্টেজ স্টেট
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const goalCalories = 2705;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setProgress(15); // প্রসেসিং শুরু

    // Image compression for lightning-fast upload & processing
    const reader = new FileReader();
    reader.onload = (event) => {
      setProgress(40); // ফাইল রিড সম্পন্ন
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600; 
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Convert to compressed base64 JPEG (Quality 0.7 for max speed)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setImage(compressedBase64);
        
        setProgress(70); // কম্প্রেশন শেষ, এআই এপিআই কল হচ্ছে
        analyzeFood(compressedBase64);
      };
    };

    reader.onerror = () => {
      setLoading(false);
      setProgress(0);
      setErrorMsg('Failed to read image file.');
    };

    reader.readAsDataURL(file);
  };

  const analyzeFood = async (base64Img: string) => {
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Img }),
      });

      const data = await res.json();

      if (res.ok) {
        setProgress(100); // সফলভাবে এনালাইসিস শেষ
        setTimeout(() => {
          setResult(data);
          setLoading(false);
        }, 300); // স্মুথ ট্রানজিশনের জন্য সামান্য ডিলে
      } else {
        setLoading(false);
        setProgress(0);
        setErrorMsg(data.error || 'AI analysis failed.');
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
      setProgress(0);
      setErrorMsg('Network error. Could not connect.');
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between max-w-md mx-auto p-5 relative font-sans selection:bg-emerald-500 selection:text-white overflow-hidden">
      
      {/* Top Header */}
      <header className="flex justify-between items-center py-3 bg-slate-900/80 backdrop-blur-md px-4 rounded-2xl shadow-lg border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shadow-inner border border-emerald-500/20">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white">Food Tracker</h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide">Healthy choices, better you 🌱</p>
          </div>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full text-[11px] font-bold text-emerald-400 flex items-center gap-1.5 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Ready
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 my-4 flex flex-col gap-4 overflow-y-auto">
        
        {/* Card Box - Only show when no result yet */}
        {!result && (
          <div className="relative w-full bg-slate-900 rounded-[32px] overflow-hidden border border-slate-800 p-6 flex flex-col items-center justify-center shadow-2xl">
            
            <div className="text-center py-6 flex flex-col items-center w-full">
              {/* Illustration Icon Container */}
              <div className="relative w-28 h-28 bg-emerald-500/5 rounded-full flex items-center justify-center mb-6 border border-emerald-500/10 shadow-inner">
                <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-600/30">
                  <Camera className="w-8 h-8" />
                </div>
                <div className="absolute top-2 right-4 w-3 h-3 bg-emerald-400 rounded-full animate-ping"></div>
              </div>

              <h2 className="text-lg font-black text-white tracking-tight">
                Snap your meal here 
              </h2>
              <p className="text-xs text-slate-400 mt-1.5 font-medium">
                Instant calories & nutrition insights
              </p>

              <div className="flex items-center gap-2 mt-3 text-emerald-500">
                <span className="w-8 h-px bg-emerald-500/30"></span>
                <Sparkles className="w-3.5 h-3.5" />
                <span className="w-8 h-px bg-emerald-500/30"></span>
              </div>
            </div>

            {/* রিয়েল-টাইম প্রোগ্রেস বার ও পার্সেন্টেজ শো করার ওভারলে */}
            {loading && (
              <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-20 px-6">
                <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin"></div>
                <div className="w-full text-center">
                  <p className="text-xs font-bold text-emerald-400 tracking-wide mb-2 animate-pulse">
                    Analyzing food items... {progress}%
                  </p>
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Button inside Card */}
            {!loading && (
              <label className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-between text-base shadow-lg shadow-emerald-600/25 cursor-pointer transition-all">
                <div className="flex items-center gap-3">
                  <Camera className="w-5 h-5 text-emerald-100" />
                  <span>Click the Food</span>
                </div>
                <ArrowRight className="w-5 h-5 text-emerald-100" />
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        )}

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-2xl text-xs font-medium flex items-center gap-2 shadow-sm">
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Results Section */}
        {result && (
          <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-5 flex flex-col gap-5 shadow-2xl animate-in fade-in duration-300">
            
            {/* Uploaded Image Preview in Results */}
            {image && (
              <div className="w-full h-48 rounded-2xl overflow-hidden relative shadow-inner border border-slate-800">
                <img src={image} alt="Uploaded Food" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20">Meal Analysis</span>
                <h2 className="text-lg font-black text-white mt-1">{result.foodTitle}</h2>
              </div>
              <button 
                onClick={() => { setResult(null); setImage(null); setErrorMsg(null); setProgress(0); }}
                className="bg-slate-800 hover:bg-slate-700 p-2.5 rounded-xl text-slate-300 transition-colors shadow-sm"
                title="Scan another meal"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Calories Summary Card */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 shadow-inner">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-400 font-bold flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-500" /> Total Calories
                </span>
                <span className="text-sm font-black text-white">
                  +{result.totalCalories} <span className="text-xs text-slate-500 font-normal">/ {goalCalories} kcal</span>
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5">
                <div 
                  className="bg-gradient-to-r from-orange-500 to-emerald-500 h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min((result.totalCalories / goalCalories) * 100, 100)}%` }}
                ></div>
              </div>

              {/* Macro Pills */}
              <div className="grid grid-cols-3 gap-2.5 mt-4 text-center">
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Protein</p>
                  <p className="text-sm font-black text-emerald-400 mt-0.5">{result.totalProtein}g</p>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Carbs</p>
                  <p className="text-sm font-black text-amber-400 mt-0.5">{result.totalCarbs}g</p>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Fat</p>
                  <p className="text-sm font-black text-rose-400 mt-0.5">{result.totalFat}g</p>
                </div>
              </div>
            </div>

            {/* Ingredients List */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Detected Items ({result.items.length})</h3>
              </div>

              <div className="flex flex-col gap-2.5">
                {result.items.map((item, idx) => (
                  <div key={idx} className="bg-slate-900 hover:bg-slate-800/80 transition-colors p-3.5 rounded-2xl border border-slate-800 flex justify-between items-center shadow-sm">
                    <div className="pr-2">
                      <h4 className="text-sm font-bold text-white">{item.name}</h4>
                      <p className="text-[11px] text-slate-400 leading-snug mt-0.5">{item.description}</p>
                      <div className="flex gap-2 text-[10px] text-slate-400 mt-1 font-medium">
                        <span className="text-emerald-400 font-semibold">P: {item.protein}g</span>
                        <span className="text-amber-400 font-semibold">C: {item.carbs}g</span>
                        <span className="text-rose-400 font-semibold">F: {item.fat}g</span>
                        <span className="text-slate-500">{item.weightGrams}g</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-extrabold text-white">{item.calories}</p>
                      <p className="text-[9px] text-slate-500 uppercase font-bold">kcal</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Bottom Footer Slogan */}
      <div className="py-2 text-center">
        <p className="text-xs font-medium text-emerald-500/70 tracking-wider">
          Track Your Meals, Eat Smart, Stay Healthy 🤍
        </p>
      </div>

    </main>
  );
}