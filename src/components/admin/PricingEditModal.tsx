"use client";

import { useState } from "react";
import { LaborCost, MaterialPrice, CompositeCost } from "@/lib/pricingTypes";

export type PricingTab = 'labor' | 'material' | 'composite';

interface PricingEditModalProps {
    tab: PricingTab;
    item: LaborCost | MaterialPrice | CompositeCost | null;
    onClose: () => void;
    onSave: (type: PricingTab, data: Record<string, unknown>) => void;
    saving: boolean;
}

export default function PricingEditModal({ tab, item, onClose, onSave, saving }: PricingEditModalProps) {
    const [formData, setFormData] = useState<Record<string, unknown>>(
        item ? { ...item } : {}
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? (value ? Number(value) : null) : value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(tab, formData);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">
                        {item ? '수정' : '추가'} - {
                            tab === 'labor' ? '인건비' :
                                tab === 'material' ? '자재 단가' : '복합 비용'
                        }
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* 인건비 폼 */}
                    {tab === 'labor' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">직종명 *</label>
                                <input
                                    type="text"
                                    name="labor_type"
                                    value={(formData.labor_type as string) || ''}
                                    onChange={handleChange}
                                    required
                                    placeholder="예: 목수, 타일공"
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">일당 (원) *</label>
                                <input
                                    type="number"
                                    name="daily_rate"
                                    value={(formData.daily_rate as number) || ''}
                                    onChange={handleChange}
                                    required
                                    placeholder="예: 280000"
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">설명</label>
                                <textarea
                                    name="description"
                                    value={(formData.description as string) || ''}
                                    onChange={handleChange}
                                    rows={2}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">
                                    ⭐ 대표 항목 등급
                                    <span className="ml-2 text-xs text-gray-500">(견적서 작성 시 기본 선택됨)</span>
                                </label>
                                <select
                                    name="representative_grade"
                                    value={(formData.representative_grade as string) || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                >
                                    <option value="">선택 안함</option>
                                    <option value="기본">기본</option>
                                    <option value="중급">중급</option>
                                    <option value="고급">고급</option>
                                </select>
                            </div>
                        </>
                    )}

                    {/* 자재 단가 폼 */}
                    {tab === 'material' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">카테고리 *</label>
                                    <input
                                        type="text"
                                        name="category"
                                        value={(formData.category as string) || ''}
                                        onChange={handleChange}
                                        required
                                        placeholder="예: 바닥, 벽면"
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">서브 카테고리</label>
                                    <input
                                        type="text"
                                        name="sub_category"
                                        value={(formData.sub_category as string) || ''}
                                        onChange={handleChange}
                                        placeholder="예: 마루, 타일"
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">제품명 *</label>
                                <input
                                    type="text"
                                    name="product_name"
                                    value={(formData.product_name as string) || ''}
                                    onChange={handleChange}
                                    required
                                    placeholder="예: 강화마루 12mm"
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">브랜드</label>
                                    <input
                                        type="text"
                                        name="brand"
                                        value={(formData.brand as string) || ''}
                                        onChange={handleChange}
                                        placeholder="예: LG하우시스"
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">등급</label>
                                    <select
                                        name="product_grade"
                                        value={(formData.product_grade as string) || '일반'}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                    >
                                        <option value="일반">일반</option>
                                        <option value="중급">중급</option>
                                        <option value="고급">고급</option>
                                        <option value="수입">수입</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">사이즈</label>
                                <input
                                    type="text"
                                    name="size"
                                    value={(formData.size as string) || ''}
                                    onChange={handleChange}
                                    placeholder="예: 700×400×680, 600각"
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">단가 (원) *</label>
                                    <input
                                        type="number"
                                        name="unit_price"
                                        value={(formData.unit_price as number) || ''}
                                        onChange={handleChange}
                                        required
                                        placeholder="예: 45000"
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">단위 *</label>
                                    <input
                                        type="text"
                                        name="unit"
                                        value={(formData.unit as string) || ''}
                                        onChange={handleChange}
                                        required
                                        placeholder="예: ㎡, M, 개"
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">
                                    ⭐ 대표 항목 등급
                                    <span className="ml-2 text-xs text-gray-500">(견적서 작성 시 기본 선택됨)</span>
                                </label>
                                <select
                                    name="representative_grade"
                                    value={(formData.representative_grade as string) || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                >
                                    <option value="">선택 안함</option>
                                    <option value="기본">기본</option>
                                    <option value="중급">중급</option>
                                    <option value="고급">고급</option>
                                </select>
                            </div>
                        </>
                    )}

                    {/* 복합 비용 폼 */}
                    {tab === 'composite' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">비용명 *</label>
                                <input
                                    type="text"
                                    name="cost_name"
                                    value={(formData.cost_name as string) || ''}
                                    onChange={handleChange}
                                    required
                                    placeholder="예: 폐기물 처리"
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">카테고리 *</label>
                                <input
                                    type="text"
                                    name="category"
                                    value={(formData.category as string) || ''}
                                    onChange={handleChange}
                                    required
                                    placeholder="예: 철거, 기타"
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">단가 *</label>
                                    <input
                                        type="number"
                                        name="unit_price"
                                        value={(formData.unit_price as number) || ''}
                                        onChange={handleChange}
                                        required
                                        placeholder="예: 450000"
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">단위 *</label>
                                    <input
                                        type="text"
                                        name="unit"
                                        value={(formData.unit as string) || ''}
                                        onChange={handleChange}
                                        required
                                        placeholder="예: 톤, ㎡, %"
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">인건비 비율 (0~1)</label>
                                    <input
                                        type="number"
                                        name="labor_ratio"
                                        value={(formData.labor_ratio as number) || ''}
                                        onChange={handleChange}
                                        step="0.01"
                                        min="0"
                                        max="1"
                                        placeholder="예: 0.30"
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">서비스 비율 (0~1)</label>
                                    <input
                                        type="number"
                                        name="service_ratio"
                                        value={(formData.service_ratio as number) || ''}
                                        onChange={handleChange}
                                        step="0.01"
                                        min="0"
                                        max="1"
                                        placeholder="예: 0.70"
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">설명</label>
                                <textarea
                                    name="description"
                                    value={(formData.description as string) || ''}
                                    onChange={handleChange}
                                    rows={2}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">수량 계산 방법</label>
                                <textarea
                                    name="calculation_notes"
                                    value={(formData.calculation_notes as string) || ''}
                                    onChange={handleChange}
                                    rows={2}
                                    placeholder="예: 보통 32평 기준 전체 철거 시 3~4톤 발생"
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">
                                    ⭐ 대표 항목 등급
                                    <span className="ml-2 text-xs text-gray-500">(견적서 작성 시 기본 선택됨)</span>
                                </label>
                                <select
                                    name="representative_grade"
                                    value={(formData.representative_grade as string) || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
                                >
                                    <option value="">선택 안함</option>
                                    <option value="기본">기본</option>
                                    <option value="중급">중급</option>
                                    <option value="고급">고급</option>
                                </select>
                            </div>
                        </>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className={`px-6 py-2 rounded-lg font-medium transition-colors ${saving
                                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                : 'bg-white text-gray-900 hover:bg-gray-200'
                                }`}
                        >
                            {saving ? '저장 중...' : '저장'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
