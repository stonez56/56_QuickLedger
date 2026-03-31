import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppConfig } from '../types';

export interface Category {
  id: string;
  name: string;
  subcategories: string[];
}

export interface ConfigContextType {
  categories: Category[];
  formatCodes: { value: string; label: string }[];
  isLoading: boolean;
  saveCategories: (categories: Category[]) => Promise<void>;
  saveFormatCodes: (formatCodes: { value: string; label: string }[]) => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};

export const ConfigProvider: React.FC<{
  config: AppConfig;
  children: ReactNode;
}> = ({ config, children }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [formatCodes, setFormatCodes] = useState<{ value: string; label: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Default values to use if server returns empty
  const defaultFormatCodes = [
    { value: '31', label: '31 - 三聯式發票 (公司)' },
    { value: '32', label: '32 - 二聯/收銀機 (個人)' },
    { value: '33', label: '33 - 雲端發票' },
    { value: '35', label: '35 - 銷項免稅' },
    { value: '34', label: '34 - 銷項折讓' },
    { value: '21', label: '21 - 三聯式發票 (傳統大張)' },
    { value: '25', label: '25 - 電子發票證明聯/收銀機 (有統編)' },
    { value: '22', label: '22 - 二聯收銀機 (少見)' },
    { value: '28', label: '28 - 海關代徵' },
    { value: '23', label: '23 - 進項折讓' },
    { value: '99', label: '99 - 收據/其他 (無發票)' }
  ];

  const defaultCategories = [
    {
      id: "income",
      name: "💰 營業收入 (Income)",
      subcategories: [
        "銷貨收入 (販售商品)", 
        "勞務收入 (提供專業服務)", 
        "其他收入 (利息/補助金)"
      ]
    },
    {
      id: "traffic",
      name: "🚀 交通與通訊 (常用支出)",
      subcategories: [
        "旅費 - 交通： 車資 / 洗車 / 停車 / 油資", 
        "旅費 - 住宿： 出差住宿費用", 
        "郵電費： 手機 / 網路 / 雲端主機費 / 郵寄費"
      ]
    },
    {
      id: "office",
      name: "📄 辦公與行政 (日常營運)",
      subcategories: [
        "文具用品： 辦公耗材、文具", 
        "雜項購置 (日常用品)： 衛生紙、水、清潔用品等", 
        "書報雜誌 / 進修課程： 專業書籍、員工培訓費用", 
        "保險費 (產險)： 火險、公司車險、財產保險",
        "勞健保費： 負責人/員工 勞保、健保、退休金",
        "訓練費： 員工進修費用"
      ]
    },
    {
      id: "dining",
      name: "⚠️ 餐飲與交際 (需注意稅務)",
      subcategories: [
        "伙食費 (⚠️ 稅額不可扣抵)： 員工加班餐費、固定伙食津貼", 
        "交際費 (⚠️ 稅額不可扣抵)： 招待客戶、贈禮"
      ]
    },
    {
      id: "professional",
      name: "💼 專業服務與外包",
      subcategories: [
        "勞務費： 臨時工資、外包專案", 
        "委外設計/開發費： 外包設計、軟體開發費用", 
        "諮詢顧問費： 法律顧問", 
        "會計師/記帳費： 記帳、簽證費用",
        "廣告費： FB/Google Ads 廣告支出",
        "佣金支出： 業務抽成"
      ]
    },
    {
      id: "assets",
      name: "🏢 租金與設備 (資本與資產)",
      subcategories: [
        "租金支出： 辦公室租金、設備租賃", 
        "修繕費： 辦公室或設備維修", 
        "電腦設備： 筆電、螢幕 (<8萬)", 
        "軟體及系統建置： 買軟體、Saas 訂閱"
      ]
    },
    {
      id: "fees",
      name: "🏦 銀行與規費",
      subcategories: [
        "手續費： 銀行轉帳、信用卡收單手續費", 
        "稅捐： 印花稅、牌照稅"
      ]
    },
    {
      id: "other",
      name: "🔹 其他特殊類別",
      subcategories: [
        "員工福利： 年節禮品、尾牙支出", 
        "捐贈： 捐給慈善機構", 
        "呆帳損失： 無法收回的帳款", 
        "其他損失： 匯兌損失、竊盜"
      ]
    }
  ];

  useEffect(() => {
    fetchSettings();
  }, [config.scriptUrl, config.apiSecret]);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(config.scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'getSettings',
          secret: config.apiSecret
        }),
        signal: controller.signal,
        redirect: 'follow'
      });
      clearTimeout(timeoutId);
      
      const result = await res.json();
      if (result.status === 'success') {
        setCategories(result.categories?.length > 0 ? result.categories : defaultCategories);
        setFormatCodes(result.formatCodes?.length > 0 ? result.formatCodes : defaultFormatCodes);
      } else {
        console.error("Failed to fetch settings", result.message);
        // Fallback to defaults
        setCategories(defaultCategories);
        setFormatCodes(defaultFormatCodes);
      }
    } catch (e) {
      console.error("Error fetching config", e);
      setCategories(defaultCategories);
      setFormatCodes(defaultFormatCodes);
    } finally {
      setIsLoading(false);
    }
  };

  const saveCategories = async (newCategories: Category[]) => {
    try {
      const res = await fetch(config.scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'saveSettings',
          secret: config.apiSecret,
          type: 'categories',
          data: newCategories
        }),
        redirect: 'follow'
      });
      const result = await res.json();
      if (result.status === 'success') {
        setCategories(newCategories);
      } else {
        throw new Error(result.message);
      }
    } catch (e) {
      console.error("Save categories failed", e);
      throw e;
    }
  };

  const saveFormatCodes = async (newFormatCodes: { value: string; label: string }[]) => {
    try {
      const res = await fetch(config.scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'saveSettings',
          secret: config.apiSecret,
          type: 'formatCodes',
          data: newFormatCodes
        }),
        redirect: 'follow'
      });
      const result = await res.json();
      if (result.status === 'success') {
        setFormatCodes(newFormatCodes);
      } else {
        throw new Error(result.message);
      }
    } catch (e) {
      console.error("Save format codes failed", e);
      throw e;
    }
  };

  return (
    <ConfigContext.Provider value={{ categories, formatCodes, isLoading, saveCategories, saveFormatCodes }}>
      {children}
    </ConfigContext.Provider>
  );
};
