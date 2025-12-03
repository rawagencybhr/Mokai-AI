

import React from 'react';
import { PendingAction } from '../types';
import { AlertCircle, Zap, DollarSign } from 'lucide-react';

interface AdminPanelProps {
  isOpen: boolean;
  storeContext: string;
  setStoreContext: (val: string) => void;
  pendingAction: PendingAction | null;
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  storeContext,
  setStoreContext,
  pendingAction,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto border-l border-slate-200">
      <div className="p-5">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-900">لوحة التاجر 🛠️</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Pending Action Alert */}
        {pendingAction && (
          <div className={`border rounded-xl p-4 mb-6 animate-pulse ${
            pendingAction.type === 'HOT_LEAD'
              ? 'bg-green-50 border-green-200 ring-2 ring-green-100' // Distinctive Green for Sales
              : pendingAction.type === 'DISCOUNT_REQUEST' 
                ? 'bg-orange-50 border-orange-200' 
                : 'bg-brand-50 border-brand-200'
          }`}>
            <div className={`flex items-center gap-2 font-bold mb-2 ${
              pendingAction.type === 'HOT_LEAD' 
                ? 'text-green-800' 
                : pendingAction.type === 'DISCOUNT_REQUEST' ? 'text-orange-800' : 'text-brand-800'
            }`}>
              {pendingAction.type === 'HOT_LEAD' ? (
                 <DollarSign className="w-5 h-5" />
              ) : pendingAction.type === 'DISCOUNT_REQUEST' ? (
                 <AlertCircle className="w-5 h-5" />
              ) : (
                 <Zap className="w-5 h-5" />
              )}
              
              <span>
                {pendingAction.type === 'HOT_LEAD' 
                   ? '🔥 عميل جاهز للشراء!' 
                   : pendingAction.type === 'DISCOUNT_REQUEST' 
                      ? 'العميل يطلب خصم!' 
                      : 'استفسار غير معروف'}
              </span>
            </div>
            
            <p className="text-sm text-gray-700 mb-3">
              {pendingAction.type === 'HOT_LEAD' ? 'المساعد حول العميل لك للإغلاق.' : 'رسالة العميل:'} <span className="font-semibold">"{pendingAction.userMessage}"</span>
            </p>
            
            <div className="bg-white p-3 rounded-lg border border-gray-100 text-xs text-gray-600">
              <p className="font-bold mb-1">كيف أرد؟</p>
              <p>اكتب ردك مباشرة في خانة الشات وابدأ بـ علامة <code>!</code></p>
              <p className="mt-1 text-gray-400">أمثلة:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                {pendingAction.type === 'HOT_LEAD' ? (
                   <>
                    <li><code>! أرسل رابط الدفع 500 ريال</code></li>
                    <li><code>! اطلب منه الموقع ورقم الجوال</code></li>
                   </>
                ) : pendingAction.type === 'DISCOUNT_REQUEST' ? (
                   <>
                    <li><code>! وافق على خصم 20 دينار</code></li>
                    <li><code>! قله السعر نهائي بس بنعطيه مخدات</code></li>
                   </>
                ) : (
                   <>
                    <li><code>! نعم نفصل طاولات حسب الطلب</code></li>
                    <li><code>! لا هذا المنتج مخلص حالياً</code></li>
                   </>
                )}
              </ul>
              <p className="mt-2 text-brand-600 font-bold">المساعد راح ياخذ معلومتك ويصيغها بأسلوب بياع.</p>
            </div>
          </div>
        )}

        {/* Store Context Section */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-slate-700 mb-2">
            تحديثات المحل (المخزون):
          </label>
          <textarea
            value={storeContext}
            onChange={(e) => setStoreContext(e.target.value)}
            className="w-full h-40 p-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-brand-400 outline-none resize-none"
            placeholder="اكتب هنا البضاعة الجديدة، أو الأشياء المخلصة.."
          />
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
             <span>💡 تلميح:</span>
             <span>تقدر تحدث المخزون وأنت في الشات بكتابة <code>! وصلنا كنب جديد</code></span>
          </div>
        </div>

      </div>
    </div>
  );
};