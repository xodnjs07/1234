/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useId } from 'react';
import { supabase } from './lib/supabase';
import { 
  Coffee, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  ReceiptText
} from 'lucide-react';

// ==========================================
// 1. 음료 및 옵션 데이터 정의
// ==========================================

// 음료 메뉴 목록 (이름 및 기본 가격)
interface DrinkItem {
  id: string;
  name: string;
  price: number;
}

const DRINK_MENU: DrinkItem[] = [
  { id: 'americano', name: '아메리카노', price: 3500 },
  { id: 'latte', name: '카페라떼', price: 4000 },
  { id: 'mocha', name: '카페모카', price: 4500 },
  { id: 'vanilla', name: '바닐라라떼', price: 4500 },
  { id: 'greentea', name: '녹차라떼', price: 4500 },
];

// 사이즈 옵션 (이름, 추가 금액, 레이블)
interface SizeOption {
  id: 'S' | 'M' | 'L';
  name: string;
  extraPrice: number;
  label: string;
}

const SIZE_OPTIONS: SizeOption[] = [
  { id: 'S', name: 'S', extraPrice: 0, label: 'S (+0원)' },
  { id: 'M', name: 'M', extraPrice: 500, label: 'M (+500원)' },
  { id: 'L', name: 'L', extraPrice: 1000, label: 'L (+1,000원)' },
];

// 추가 옵션 목록 (이름, 추가 금액, 레이블)
interface ExtraOption {
  id: string;
  name: string;
  price: number;
  label: string;
}

const EXTRA_OPTIONS: ExtraOption[] = [
  { id: 'shot', name: '샷 추가', price: 500, label: '샷 추가 (+500원)' },
  { id: 'cream', name: '크림 추가', price: 500, label: '크림 추가 (+500원)' },
  { id: 'syrup', name: '시럽 추가', price: 300, label: '시럽 추가 (+300원)' },
  { id: 'decaf', name: '디카페인', price: 0, label: '디카페인 (+0원)' },
];

// 주문 내역 타입 정의
interface OrderRecord {
  id: string;
  customerName: string;
  phoneNumber: string;
  drinkName: string;
  size: string;
  options: string[];
  quantity: number;
  specialRequest: string;
  totalPrice: number;
  createdAt: string;
}

export default function App() {
  // 고유 id 생성 (접근성 및 label 연결용)
  const nameInputId = useId();
  const phoneInputId = useId();
  const drinkSelectId = useId();
  const quantityInputId = useId();
  const requestId = useId();

  // ==========================================
  // 2. 주문 폼 상태 관리 (State)
  // ==========================================
  const [customerName, setCustomerName] = useState<string>(''); // 고객 이름 (필수)
  const [phoneNumber, setPhoneNumber] = useState<string>('');   // 전화번호
  const [selectedDrinkId, setSelectedDrinkId] = useState<string>(''); // 선택된 음료 ID
  const [selectedSize, setSelectedSize] = useState<'S' | 'M' | 'L'>('M'); // 사이즈 (기본값: M)
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]); // 선택된 추가 옵션 ID 배열
  const [quantity, setQuantity] = useState<number>(1); // 수량 (기본값: 1, 1~10)
  const [specialRequest, setSpecialRequest] = useState<string>(''); // 요청사항

  // 알림 및 결과 메시지 상태
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderRecord[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ==========================================
  // 3. 실시간 예상 금액 계산 (Real-time Calculation)
  // ==========================================
  // 선택된 음료 정보 찾기
  const currentDrink = DRINK_MENU.find((drink) => drink.id === selectedDrinkId);
  const baseDrinkPrice = currentDrink ? currentDrink.price : 0;

  // 선택된 사이즈 추가 요금
  const currentSizeOption = SIZE_OPTIONS.find((size) => size.id === selectedSize);
  const sizeExtraPrice = currentSizeOption ? currentSizeOption.extraPrice : 0;

  // 선택된 추가 옵션 총합 요금
  const optionsExtraPrice = selectedOptions.reduce((acc, optId) => {
    const opt = EXTRA_OPTIONS.find((item) => item.id === optId);
    return acc + (opt ? opt.price : 0);
  }, 0);

  // 1잔당 단가 (음료 미선택 시에는 0원 처리)
  const unitPrice = baseDrinkPrice > 0 ? baseDrinkPrice + sizeExtraPrice + optionsExtraPrice : 0;

  // 최종 예상 금액: 1잔당 단가 * 수량
  const totalPrice = unitPrice * quantity;

  // ==========================================
  // 4. 이벤트 핸들러 (Event Handlers)
  // ==========================================

  // 추가 옵션 체크박스 변경 핸들러
  const handleOptionToggle = (optionId: string) => {
    setSelectedOptions((prev) =>
      prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
    );
  };

  // 수량 변경 핸들러 (최소 1, 최대 10 유지)
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (isNaN(value)) {
      setQuantity(1);
    } else {
      const clampedValue = Math.min(10, Math.max(1, value));
      setQuantity(clampedValue);
    }
  };

  // 주문하기 버튼 클릭 핸들러
  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1) 유효성 검사: 이름 입력 여부 확인
    if (!customerName.trim()) {
      setErrorMessage('이름을 입력해주세요');
      setConfirmationMessage(null);
      // 포커스 이동을 위해 alert 띄우거나 메시지 강조
      alert('이름을 입력해주세요');
      return;
    }

    // 2) 유효성 검사: 음료 선택 여부 확인
    if (!selectedDrinkId || !currentDrink) {
      setErrorMessage('음료를 선택해주세요');
      setConfirmationMessage(null);
      alert('음료를 선택해주세요');
      return;
    }

    // 에러 상태 초기화
    setErrorMessage(null);
    setConfirmationMessage(null);

    // 추가 옵션 이름 텍스트 생성
    const selectedOptionNames = selectedOptions
      .map((optId) => EXTRA_OPTIONS.find((opt) => opt.id === optId)?.name)
      .filter(Boolean) as string[];

    const optionsText = selectedOptionNames.length > 0 
      ? ` (${selectedOptionNames.join(', ')})` 
      : '';

    setIsSubmitting(true);
    try {
      if (!supabase) {
        setErrorMessage('Supabase 설정이 없습니다. .env.local에 URL과 anon key를 입력해주세요.');
        return;
      }

      const { error } = await supabase.from('cafe_menu').insert({
        customer_name: customerName.trim(),
        phone: phoneNumber.trim(),
        drink_name: currentDrink.name,
        size: selectedSize,
        options: selectedOptionNames,
        quantity,
        requests: specialRequest.trim(),
        total_price: totalPrice,
      });

      if (error) throw error;

      const formattedTotal = totalPrice.toLocaleString();
      const finalMessage = `${customerName.trim()}님, ${currentDrink.name} ${selectedSize}사이즈${optionsText} ${quantity}잔, 총 ${formattedTotal}원 주문이 접수되었습니다!`;
      setConfirmationMessage(finalMessage);

      const newOrder: OrderRecord = {
        id: `ORDER-${Date.now().toString().slice(-4)}`,
        customerName: customerName.trim(),
        phoneNumber: phoneNumber.trim(),
        drinkName: currentDrink.name,
        size: selectedSize,
        options: selectedOptionNames,
        quantity,
        specialRequest: specialRequest.trim(),
        totalPrice,
        createdAt: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };

      setRecentOrders((prev) => [newOrder, ...prev.slice(0, 4)]);
    } catch {
      setErrorMessage('주문 저장에 실패했습니다. Supabase 설정과 cafe_menu INSERT 정책을 확인해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 다시 작성 버튼 클릭 핸들러 (모든 입력과 금액 초기화)
  const handleResetForm = () => {
    setCustomerName('');
    setPhoneNumber('');
    setSelectedDrinkId('');
    setSelectedSize('M');
    setSelectedOptions([]);
    setQuantity(1);
    setSpecialRequest('');
    setErrorMessage(null);
    setConfirmationMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#faf6f0] py-8 px-4 flex flex-col items-center justify-start text-[#3e2723]">
      {/* ============================================================ */}
      {/* 메인 컨테이너: 최대 너비 520px, 가운데 정렬, 둥근 모서리, 부드러운 그림자 */}
      {/* ============================================================ */}
      <main className="w-full max-w-[520px] bg-white rounded-2xl shadow-lg border border-[#e8dfd8] overflow-hidden transition-all duration-300">
        
        {/* 상단 카페 브랜딩 헤더 영역 */}
        <header className="bg-gradient-to-b from-[#f5ede4] to-white pt-8 pb-6 px-6 text-center border-b border-[#f0e6dc]">
          {/* 카페 로고: ☕ 이모지 크게 */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-md text-4xl mb-3 border border-[#ede0d4] transform hover:scale-105 transition-transform duration-200">
            ☕
          </div>
          {/* 카페 이름 */}
          <h1 className="text-2xl font-bold text-[#6b4226] tracking-tight">
            바이브 카페
          </h1>
          {/* 부제 */}
          <p className="text-sm text-[#8d6e63] mt-1.5 font-medium">
            당신의 하루에 바이브를 더하다
          </p>
        </header>

        {/* 에러 알림 배너 */}
        {errorMessage && (
          <div className="mx-6 mt-5 p-3.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2.5 animate-fadeIn">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* ============================================================ */}
        {/* 주문서 폼 영역 */}
        {/* ============================================================ */}
        <form onSubmit={handleOrderSubmit} className="p-6 space-y-5">
          
          {/* 1. 이름 (필수, text) */}
          <div className="space-y-1.5">
            <label 
              htmlFor={nameInputId} 
              className="block text-sm font-bold text-[#4a2e1b]"
            >
              이름 <span className="text-red-500 font-bold">*</span>
            </label>
            <input
              id={nameInputId}
              type="text"
              required
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                if (errorMessage && e.target.value.trim()) setErrorMessage(null);
              }}
              placeholder="주문자 성함을 입력해주세요"
              className="cafe-input text-sm text-[#3e2723] placeholder:text-[#a1887f]"
            />
          </div>

          {/* 2. 전화번호 (tel) */}
          <div className="space-y-1.5">
            <label 
              htmlFor={phoneInputId} 
              className="block text-sm font-bold text-[#4a2e1b]"
            >
              전화번호
            </label>
            <input
              id={phoneInputId}
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="010-1234-5678"
              className="cafe-input text-sm text-[#3e2723] placeholder:text-[#a1887f]"
            />
          </div>

          {/* 3. 음료 선택 (드롭다운) */}
          <div className="space-y-1.5">
            <label 
              htmlFor={drinkSelectId} 
              className="block text-sm font-bold text-[#4a2e1b]"
            >
              음료 선택 <span className="text-red-500 font-bold">*</span>
            </label>
            <div className="relative">
              <select
                id={drinkSelectId}
                required
                value={selectedDrinkId}
                onChange={(e) => {
                  setSelectedDrinkId(e.target.value);
                  if (errorMessage && e.target.value) setErrorMessage(null);
                }}
                className="cafe-input text-sm text-[#3e2723] appearance-none pr-10 cursor-pointer"
              >
                <option value="">-- 음료를 선택해주세요 --</option>
                {DRINK_MENU.map((drink) => (
                  <option key={drink.id} value={drink.id}>
                    {drink.name} ({drink.price.toLocaleString()}원)
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#6b4226]">
                <Coffee className="w-4 h-4 opacity-70" />
              </div>
            </div>
          </div>

          {/* 4. 사이즈 (라디오 버튼, 가로 배치) */}
          <div className="space-y-2">
            <span className="block text-sm font-bold text-[#4a2e1b]">
              사이즈 선택
            </span>
            <div className="flex flex-wrap items-center gap-4 pt-1">
              {SIZE_OPTIONS.map((size) => {
                const radioId = `size-${size.id}`;
                const isSelected = selectedSize === size.id;
                return (
                  <label
                    key={size.id}
                    htmlFor={radioId}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#6b4226] bg-[#fbf6f1] text-[#6b4226] shadow-sm font-bold ring-1 ring-[#6b4226]'
                        : 'border-[#e0d6ce] bg-white text-[#5d4037] hover:bg-[#faf6f0]'
                    }`}
                  >
                    <input
                      id={radioId}
                      type="radio"
                      name="drinkSize"
                      value={size.id}
                      checked={isSelected}
                      onChange={() => setSelectedSize(size.id)}
                      className="w-4 h-4 accent-[#6b4226] cursor-pointer"
                    />
                    <span>{size.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 5. 추가 옵션 (체크박스, 가로 배치) */}
          <div className="space-y-2">
            <span className="block text-sm font-bold text-[#4a2e1b]">
              추가 옵션
            </span>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {EXTRA_OPTIONS.map((opt) => {
                const checkboxId = `option-${opt.id}`;
                const isChecked = selectedOptions.includes(opt.id);
                return (
                  <label
                    key={opt.id}
                    htmlFor={checkboxId}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-all ${
                      isChecked
                        ? 'border-[#6b4226] bg-[#fbf6f1] text-[#6b4226] font-semibold ring-1 ring-[#6b4226]'
                        : 'border-[#e0d6ce] bg-white text-[#5d4037] hover:bg-[#faf6f0]'
                    }`}
                  >
                    <input
                      id={checkboxId}
                      type="checkbox"
                      value={opt.id}
                      checked={isChecked}
                      onChange={() => handleOptionToggle(opt.id)}
                      className="w-4 h-4 rounded accent-[#6b4226] cursor-pointer"
                    />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 6. 수량 (number 타입, 최소 1, 최대 10, 기본값 1) */}
          <div className="space-y-1.5">
            <label 
              htmlFor={quantityInputId} 
              className="block text-sm font-bold text-[#4a2e1b]"
            >
              수량 (1 ~ 10잔)
            </label>
            <div className="flex items-center gap-3">
              <input
                id={quantityInputId}
                type="number"
                min={1}
                max={10}
                value={quantity}
                onChange={handleQuantityChange}
                className="cafe-input text-sm text-[#3e2723] font-semibold text-center w-28"
              />
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-9 h-9 flex items-center justify-center bg-[#f5ede4] text-[#6b4226] font-bold rounded-lg border border-[#e4d4c5] hover:bg-[#eadecc] transition-colors"
                  title="수량 감소"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                  className="w-9 h-9 flex items-center justify-center bg-[#f5ede4] text-[#6b4226] font-bold rounded-lg border border-[#e4d4c5] hover:bg-[#eadecc] transition-colors"
                  title="수량 증가"
                >
                  +
                </button>
              </div>
              <span className="text-xs text-[#8d6e63]">최대 10잔까지 주문 가능합니다.</span>
            </div>
          </div>

          {/* 7. 요청사항 (textarea) */}
          <div className="space-y-1.5">
            <label 
              htmlFor={requestId} 
              className="block text-sm font-bold text-[#4a2e1b]"
            >
              요청사항
            </label>
            <textarea
              id={requestId}
              rows={3}
              value={specialRequest}
              onChange={(e) => setSpecialRequest(e.target.value)}
              placeholder="예: 얼음 적게, 덜 달게, 캐리어에 담아주세요 등"
              className="cafe-input text-sm text-[#3e2723] placeholder:text-[#a1887f] resize-none"
            />
          </div>

          {/* ============================================================ */}
          {/* 예상 금액 표시 영역 (큰 글씨 24px, 갈색 #6b4226, 굵게, 가운데 정렬) */}
          {/* ============================================================ */}
          <div className="pt-3 pb-1 border-t border-dashed border-[#e6dcd3]">
            <div className="bg-[#faf6f0] border border-[#eee2d7] rounded-xl py-4 px-3 text-center shadow-xs">
              <span className="text-xs uppercase tracking-wider text-[#8d6e63] font-semibold block mb-1">
                실시간 주문 견적
              </span>
              <div className="text-[24px] font-bold text-[#6b4226] tracking-tight">
                예상 금액: {totalPrice.toLocaleString()}원
              </div>
              {selectedDrinkId && (
                <div className="text-xs text-[#8d6e63] mt-1">
                  ({currentDrink?.name} {unitPrice.toLocaleString()}원 × {quantity}잔)
                </div>
              )}
            </div>
          </div>

          {/* ============================================================ */}
          {/* 8. 주문하기 버튼 & 9. 다시 작성 버튼 */}
          {/* ============================================================ */}
          <div className="pt-2 space-y-2.5">
            {/* 주문하기 버튼: 갈색 배경 (#6b4226), 흰색 글씨, hover시 약간 밝게 */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 bg-[#6b4226] hover:bg-[#855331] active:bg-[#57351e] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-base rounded-xl shadow-md transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Coffee className="w-5 h-5" />
              <span>{isSubmitting ? '저장 중...' : '주문하기'}</span>
            </button>

            {/* 다시 작성 버튼: 모든 입력과 금액 초기화 */}
            <button
              type="button"
              onClick={handleResetForm}
              className="w-full py-2.5 px-4 bg-[#f5ede4] hover:bg-[#ece0d4] active:bg-[#e2d3c5] text-[#6b4226] font-semibold text-sm rounded-xl border border-[#dfd0c2] transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>다시 작성</span>
            </button>
          </div>
        </form>

        {/* ============================================================ */}
        {/* 주문 확인 메시지: 연두색 배경, 초록 글씨, 둥근 모서리 */}
        {/* ============================================================ */}
        {confirmationMessage && (
          <section className="px-6 pb-6">
            <div className="p-4 bg-[#e8f5e9] text-[#1b5e20] border border-[#c8e6c9] rounded-xl shadow-sm flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 flex-shrink-0 text-[#2e7d32] mt-0.5" />
              <div className="text-sm font-medium leading-relaxed">
                <p className="font-bold text-base text-[#1b5e20] mb-1">
                  🎉 주문이 성공적으로 접수되었습니다!
                </p>
                <p>{confirmationMessage}</p>
                {specialRequest.trim() && (
                  <p className="mt-1 text-xs text-[#2e7d32]/90">
                    • 요청사항: &ldquo;{specialRequest.trim()}&rdquo;
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* 최근 주문 영수증 리스트 (고객 경험 향상) */}
        {recentOrders.length > 0 && (
          <section className="border-t border-[#f0e6dc] bg-[#fdfbf9] p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-[#6b4226] uppercase tracking-wider flex items-center gap-1.5">
                <ReceiptText className="w-4 h-4 text-[#8d6e63]" />
                최근 접수된 주문 내역
              </h2>
              <span className="text-xs text-[#8d6e63]">총 {recentOrders.length}건</span>
            </div>
            <div className="space-y-2.5">
              {recentOrders.map((order) => (
                <div 
                  key={order.id} 
                  className="bg-white border border-[#ebdcd0] rounded-lg p-3 text-xs shadow-2xs flex justify-between items-center"
                >
                  <div>
                    <span className="font-bold text-[#4a2e1b]">{order.customerName}님</span>
                    <span className="text-[#8d6e63] ml-1.5">({order.drinkName} {order.size} {order.quantity}잔)</span>
                    {order.options.length > 0 && (
                      <div className="text-[11px] text-[#a1887f]">옵션: {order.options.join(', ')}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-[#6b4226] text-sm">
                      {order.totalPrice.toLocaleString()}원
                    </span>
                    <div className="text-[10px] text-[#a1887f]">{order.createdAt}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 바닥글 안내 */}
        <footer className="py-4 px-6 bg-[#f7efe6] border-t border-[#ebdcd0] text-center text-xs text-[#8d6e63]">
          바이브 카페 • 신선한 원두와 정성으로 준비합니다.
        </footer>
      </main>
    </div>
  );
}
