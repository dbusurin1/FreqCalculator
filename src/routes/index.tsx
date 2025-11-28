import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePerplexitySearch, type PerplexitySearchInput } from "@/hooks/use-perplexity-search";
import { CalculationHistoryORM, CalculationHistoryMode } from "@/components/data/orm/orm_calculation_history";
import {
  RotateCcwIcon,
  SparklesIcon,
  TrendingUpIcon,
  TargetIcon,
  UsersIcon,
  PackageIcon,
  MessageSquareIcon,
  ZapIcon,
  PercentIcon,
  AlertCircleIcon,
  ChevronRightIcon,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: App,
});

interface SliderParams {
  brandAwareness: number;
  marketSaturation: number;
  campaignGoal: number;
  targetAudience: number;
  productComplexity: number;
  messageComplexity: number;
}

interface AIFormData {
  brandName: string;
  budget: string;
  campaignGoal: string;
}

interface AIInsight {
  id: string;
  value: number;
  insight: string;
  source: string;
}

interface AIResponse {
  parameters: {
    brand_awareness: { id: string; value: number; insight: string; source: string };
    market_saturation: { id: string; value: number; insight: string; source: string };
    campaign_goal: { id: string; value: number; insight: string; source: string };
    target_audience: { id: string; value: number; insight: string; source: string };
    product_complexity: { id: string; value: number; insight: string; source: string };
    message_complexity: { id: string; value: number; insight: string; source: string };
  };
  ta_capacity_rf: number;
  kpi_benchmarks: {
    awareness_tom_base: number;
    consideration_search_base: number;
    conversion_uplift_base: number;
    retention_ltv_base: number;
  };
  recommended_budget?: number;
  budget_reasoning?: string;
}

type WizardStep = "brand" | "params" | "results";
type ParamView = "manual" | "ai";

function App() {
  const [isAIMode, setIsAIMode] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>("brand");
  const [paramView, setParamView] = useState<ParamView>("manual");

  const [params, setParams] = useState<SliderParams>({
    brandAwareness: 0,
    marketSaturation: 0,
    campaignGoal: 0,
    targetAudience: 0,
    productComplexity: 0,
    messageComplexity: 0,
  });

  const [aiForm, setAIForm] = useState<AIFormData>({
    brandName: "",
    budget: "",
    campaignGoal: "",
  });

  const [aiSearchParams, setAISearchParams] = useState<PerplexitySearchInput | null>(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [insights, setInsights] = useState<Record<string, AIInsight>>({});
  const [taCapacityRF, setTaCapacityRF] = useState<number>(1000000);
  const [kpiBenchmarks, setKpiBenchmarks] = useState({
    awareness_tom_base: 0.15,
    consideration_search_base: 0.25,
    conversion_uplift_base: 0.08,
    retention_ltv_base: 0.04,
  });
  const [aiErrorMessage, setAIErrorMessage] = useState<string>("");
  const [recommendedBudget, setRecommendedBudget] = useState<number | null>(null);
  const [budgetReasoning, setBudgetReasoning] = useState<string>("");

  const { data: aiData, isLoading: isAILoading, error: aiError } = usePerplexitySearch(
    aiSearchParams ?? undefined,
    aiSearchParams !== null
  );

  // Calculate effective frequency
  const frequency = useMemo(() => {
    const sum = Object.values(params).reduce((acc, val) => acc + val, 0);
    const calculated = 1.0 + sum;
    return Math.max(1.0, Math.min(15.0, calculated));
  }, [params]);

  // Get base TOM by campaign goal
  const getBaseTOM = (goal: string) => {
    switch (goal) {
      case "awareness": return kpiBenchmarks.awareness_tom_base;
      case "consideration": return kpiBenchmarks.consideration_search_base;
      case "conversion": return kpiBenchmarks.conversion_uplift_base;
      case "retention": return kpiBenchmarks.retention_ltv_base;
      default: return 0.15;
    }
  };

  // Get goal multiplier (0.2x - 1.0x)
  const getGoalMultiplier = (goal: string) => {
    switch (goal) {
      case "awareness": return 1.0;
      case "consideration": return 0.7;
      case "conversion": return 0.4;
      case "retention": return 0.2;
      default: return 1.0;
    }
  };

  // Calculate TOM with improved formula
  const calculateTOM = useMemo(() => {
    if (!aiForm.budget || !aiForm.campaignGoal) return 0;

    const budget = parseFloat(aiForm.budget);
    const baseTOM = getBaseTOM(aiForm.campaignGoal);

    // Мультипликатор частоты: 1 + (Frequency - 1.0) × 0.08
    const frequencyMultiplier = 1 + (frequency - 1.0) * 0.08;

    // Корректировка бюджета: √(Budget / 500,000)
    const budgetCorrection = Math.sqrt(budget / 500000);

    // Множитель цели: 0.2x - 1.0x
    const goalMultiplier = getGoalMultiplier(aiForm.campaignGoal);

    return baseTOM * frequencyMultiplier * budgetCorrection * goalMultiplier * 100 * 3.5; // Умножено на 3.5
  }, [aiForm.budget, aiForm.campaignGoal, frequency, kpiBenchmarks]);

  // Calculate LTV Growth with improved formula
  const calculateLTVGrowth = useMemo(() => {
    if (!aiForm.budget || !aiForm.campaignGoal) return 0;

    const baseLTV = kpiBenchmarks.retention_ltv_base;

    // Мультипликатор цели (0.3x - 1.0x)
    const goalMultipliers: Record<string, number> = {
      awareness: 0.3,
      consideration: 0.5,
      conversion: 0.8,
      retention: 1.0,
    };
    const goalMultiplier = goalMultipliers[aiForm.campaignGoal] || 0.5;

    // Мультипликатор частоты: 1 + (Freq - 1.0) × 0.05
    const frequencyMultiplier = 1 + (frequency - 1.0) * 0.05;

    // Корректировка конкуренции (на основе market_saturation)
    const competitionCorrection = 1 - (params.marketSaturation * 0.1);

    // Мультипликатор качества бюджета
    const budget = parseFloat(aiForm.budget);
    const budgetQualityMultiplier = Math.min(1.0 + Math.log10(budget / 1000000), 2.0);

    return baseLTV * goalMultiplier * frequencyMultiplier * competitionCorrection * budgetQualityMultiplier * 100 * 7; // Умножено на 7
  }, [aiForm.budget, aiForm.campaignGoal, frequency, params.marketSaturation, kpiBenchmarks]);

  // Calculate Coverage with improved formula
  const calculateCoverage = useMemo(() => {
    if (!aiForm.budget || frequency === 0 || taCapacityRF === 0) return 0;

    const budget = parseFloat(aiForm.budget);
    const cpm = 400; // Фиксированный CPM (средний российский)

    // Coverage % = (Budget / 400 CPM × 1000) / Frequency / TA_Capacity_RF × 100 × 0.08
    const impressions = (budget / cpm) * 1000;
    const reach = impressions / frequency;
    const coverage = (reach / taCapacityRF) * 100 * 0.08; // Понижающий коэффициент 0.08 (уменьшено в 5 раз)

    return coverage;
  }, [aiForm.budget, frequency, taCapacityRF]);

  const getKPILabel = () => {
    switch (aiForm.campaignGoal) {
      case "awareness": return "Top of Mind (ТОМ)";
      case "consideration": return "Рост поисковых запросов";
      case "conversion": return "Прирост конверсий";
      case "retention": return "Рост LTV";
      default: return "Эффективность";
    }
  };

  // Get frequency color based on value (green to red gradient)
  const getFrequencyColor = (freq: number) => {
    const normalized = (freq - 1.0) / 14.0;
    const hue = (1 - normalized) * 120;
    return `hsl(${hue}, 70%, 50%)`;
  };

  // Get insight color based on value
  const getInsightColor = (value: number) => {
    const normalized = (value + 2.0) / 4.0;
    const hue = normalized * 120;
    return `hsl(${hue}, 70%, 50%)`;
  };

  // Get contextual description
  const getFrequencyDescription = (freq: number): string => {
    if (freq <= 3) return "Низкая частота контакта - подходит для известных брендов с высокой узнаваемостью";
    if (freq <= 6) return "Средняя частота контакта - оптимальна для большинства рекламных кампаний";
    if (freq <= 10) return "Высокая частота контакта - необходима для сложных продуктов или новых брендов";
    return "Очень высокая частота контакта - для максимального охвата и запоминаемости";
  };

  const handleSliderChange = (key: keyof SliderParams) => (value: number[]) => {
    setParams((prev) => ({ ...prev, [key]: value[0] }));
  };

  const handleReset = () => {
    setParams({
      brandAwareness: 0,
      marketSaturation: 0,
      campaignGoal: 0,
      targetAudience: 0,
      productComplexity: 0,
      messageComplexity: 0,
    });
    setAIForm({
      brandName: "",
      budget: "",
      campaignGoal: "",
    });
    setAnalysisComplete(false);
    setInsights({});
    setRecommendedBudget(null);
    setBudgetReasoning("");
    setWizardStep("brand");
    setParamView("manual");
  };

  const handleContinueToBrand = () => {
    if (aiForm.brandName && aiForm.budget) {
      setWizardStep("params");
    }
  };

  const handleContinueToResults = () => {
    setWizardStep("results");
  };

  const handleAIAnalyze = async () => {
    if (!aiForm.brandName || !aiForm.budget || !aiForm.campaignGoal) {
      return;
    }

    // Reset states before new analysis
    setAIErrorMessage("");
    setAnalysisComplete(false);

    console.log("🚀 Запуск ИИ-анализа для:", aiForm);

    const systemContent = `Ты эксперт по анализу брендов, специализирующийся на оптимизации частоты рекламы. Проанализируй предоставленную информацию о бренде и верни ТОЛЬКО валидный JSON объект.

ТРЕБУЕМАЯ СТРУКТУРА JSON:
{
  "parameters": {
    "brand_awareness": {
      "id": "brand_awareness",
      "value": -1.5,
      "insight": "Детальное объяснение уровня узнаваемости бренда на русском языке",
      "source": "Источник данных или обоснование на русском"
    },
    "market_saturation": {
      "id": "market_saturation",
      "value": 0.5,
      "insight": "Анализ конкуренции на рынке на русском языке",
      "source": "Отраслевые отчёты или анализ на русском"
    },
    "campaign_goal": {
      "id": "campaign_goal",
      "value": 1.0,
      "insight": "Анализ сложности цели кампании на русском языке",
      "source": "Оценка стратегии кампании на русском"
    },
    "target_audience": {
      "id": "target_audience",
      "value": -0.5,
      "insight": "Анализ специфичности целевой аудитории на русском языке",
      "source": "Демографические данные на русском"
    },
    "product_complexity": {
      "id": "product_complexity",
      "value": 0.8,
      "insight": "Уровень сложности продукта/услуги на русском языке",
      "source": "Анализ продукта на русском"
    },
    "message_complexity": {
      "id": "message_complexity",
      "value": 1.2,
      "insight": "Требования к сложности сообщения на русском языке",
      "source": "Коммуникационная стратегия на русском"
    }
  },
  "ta_capacity_rf": 1500000,
  "kpi_benchmarks": {
    "awareness_tom_base": 0.18,
    "consideration_search_base": 0.28,
    "conversion_uplift_base": 0.10,
    "retention_ltv_base": 0.04
  },
  "recommended_budget": 2500000,
  "budget_reasoning": "Детальное обоснование рекомендованного бюджета на русском языке"
}

ДИАПАЗОНЫ ЗНАЧЕНИЙ: Все значения параметров должны быть от -2.0 до +2.0
- brand_awareness: -2.0 (неизвестен) до +2.0 (глобально узнаваем)
- market_saturation: -2.0 (нет конкуренции) до +2.0 (высоко насыщен)
- campaign_goal: -2.0 (простая узнаваемость) до +2.0 (сложная конверсия)
- target_audience: -2.0 (массовый рынок) до +2.0 (узкая специфичная ниша)
- product_complexity: -2.0 (очень простой) до +2.0 (очень сложный)
- message_complexity: -2.0 (простой слоган) до +2.0 (подробное объяснение)

РЕКОМЕНДАЦИЯ БЮДЖЕТА:
- recommended_budget: число в рублях (например, 2500000 для 2.5 млн рублей)
- budget_reasoning: детальное обоснование, почему такой бюджет оптимален для данной кампании

КРИТЕРИЙ РАСЧЕТА БЮДЖЕТА: Рекомендованный бюджет должен быть рассчитан для достижения 80% поставленных целей кампании. Учитывай:
1. Целевой охват аудитории (80% от максимально возможного)
2. Необходимую частоту контактов
3. Стоимость за тысячу показов (CPM ~400 RUB для РФ)
4. Цель кампании (awareness/consideration/conversion/retention)
5. Конкурентную среду и насыщенность рынка

ВАЖНО: Все инсайты (insight), источники (source) и обоснование бюджета (budget_reasoning) должны быть НА РУССКОМ ЯЗЫКЕ!

Верни ТОЛЬКО JSON объект, без дополнительного текста.`;

    const userContent = `Проанализируй этот бренд на российском рынке:
Название бренда: ${aiForm.brandName}
Бюджет: ${aiForm.budget} RUB
Цель кампании: ${aiForm.campaignGoal === "awareness" ? "Узнаваемость" :
                    aiForm.campaignGoal === "consideration" ? "Рассмотрение" :
                    aiForm.campaignGoal === "conversion" ? "Конверсия" : "Удержание"}

Предоставь детальный анализ с инсайтами и источниками для каждого параметра НА РУССКОМ ЯЗЫКЕ.`;

    const searchParams: PerplexitySearchInput = {
      systemContent,
      userContent,
      model: "sonar-pro",
      temperature: 0.7,
      max_tokens: 3000,
    };

    console.log("📤 Установка параметров ИИ-поиска:", searchParams);
    setAISearchParams(searchParams);
    setAnalysisComplete(false);
  };

  // Process AI response with validation
  useEffect(() => {
    if (!aiData) return;

    console.log("🔍 Получен ответ ИИ:", aiData);

    if (!aiData.successful) {
      const errorMsg = aiData.error || "Ошибка ИИ-анализа";
      console.error("❌ Ошибка ИИ:", errorMsg);
      setAIErrorMessage(errorMsg);
      return;
    }

    if (!aiData.data?.response) {
      console.error("❌ Нет данных ответа от ИИ");
      setAIErrorMessage("Нет данных ответа от ИИ");
      return;
    }

    try {
      console.log("📦 Сырой ответ:", aiData.data.response);
      console.log("📦 Тип ответа:", typeof aiData.data.response);
      console.log("📦 Ключи ответа:", Object.keys(aiData.data.response));

      let parsed: AIResponse | undefined;
      const response = aiData.data.response;

      // Strategy 1: Check for OpenAI-style response (choices[0].message.content)
      if ('choices' in response && Array.isArray(response.choices) && response.choices.length > 0) {
        const choice = response.choices[0] as Record<string, unknown>;
        if ('message' in choice && typeof choice.message === 'object' && choice.message !== null) {
          const message = choice.message as Record<string, unknown>;
          if ('content' in message) {
            const content = message.content;
            console.log("🔄 Найден ответ в стиле OpenAI, содержимое:", content);

            if (typeof content === 'string') {
              try {
                parsed = JSON.parse(content) as AIResponse;
                console.log("✅ Распарсено из choices[0].message.content string:", parsed);
              } catch {
                const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                                 content.match(/\{[\s\S]*?"parameters"[\s\S]*?\}/);
                if (jsonMatch) {
                  const jsonText = jsonMatch[1] || jsonMatch[0];
                  parsed = JSON.parse(jsonText) as AIResponse;
                  console.log("✅ Извлечено из markdown в content:", parsed);
                } else {
                  throw new Error("JSON не найден в строке content");
                }
              }
            } else if (typeof content === 'object' && content !== null) {
              parsed = content as AIResponse;
              console.log("✅ Использован объект content напрямую:", parsed);
            } else {
              throw new Error("Неверный тип content в ответе OpenAI");
            }
          } else {
            throw new Error("Нет поля content в message");
          }
        } else {
          throw new Error("Нет поля message в choice");
        }
      }
      // Strategy 2: Direct object with parameters
      else if ('parameters' in response) {
        parsed = response as unknown as AIResponse;
        console.log("✅ Прямой объект с параметрами:", parsed);
      }
      // Strategy 3: String response
      else if (typeof response === 'string') {
        const responseText = response as string;
        console.log("📝 Ответ является строкой, попытка парсинга...");

        try {
          parsed = JSON.parse(responseText) as AIResponse;
          console.log("✅ Прямой парсинг успешен:", parsed);
        } catch {
          const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
                           responseText.match(/\{[\s\S]*?"parameters"[\s\S]*?\}/);

          if (!jsonMatch) {
            console.error("❌ JSON не найден в строковом ответе");
            setAIErrorMessage("Валидный JSON не найден в ответе ИИ");
            return;
          }

          const jsonText = jsonMatch[1] || jsonMatch[0];
          parsed = JSON.parse(jsonText) as AIResponse;
          console.log("✅ Извлеченный парсинг успешен:", parsed);
        }
      }
      // Strategy 4: Object that might contain JSON string in various fields
      else if (typeof response === 'object' && response !== null) {
        const possibleFields = ['content', 'text', 'output', 'result', 'data'];
        let found = false;

        for (const field of possibleFields) {
          if (field in response) {
            const fieldValue = (response as Record<string, unknown>)[field];
            console.log(`🔍 Проверка поля '${field}':`, fieldValue);

            if (typeof fieldValue === 'string') {
              try {
                parsed = JSON.parse(fieldValue) as AIResponse;
                console.log(`✅ Распарсено из поля '${field}':`, parsed);
                found = true;
                break;
              } catch {
                const jsonMatch = fieldValue.match(/```json\s*([\s\S]*?)\s*```/) ||
                                 fieldValue.match(/\{[\s\S]*?"parameters"[\s\S]*?\}/);
                if (jsonMatch) {
                  const jsonText = jsonMatch[1] || jsonMatch[0];
                  try {
                    parsed = JSON.parse(jsonText) as AIResponse;
                    console.log(`✅ Извлечено из markdown в '${field}':`, parsed);
                    found = true;
                    break;
                  } catch {
                    continue;
                  }
                }
              }
            } else if (typeof fieldValue === 'object' && fieldValue !== null && 'parameters' in fieldValue) {
              parsed = fieldValue as AIResponse;
              console.log(`✅ Использован объект из поля '${field}':`, parsed);
              found = true;
              break;
            }
          }
        }

        if (!found) {
          console.error("❌ Не удалось извлечь данные из объекта ответа");
          console.error("Доступные поля:", Object.keys(response));
          setAIErrorMessage("Не удалось извлечь данные ИИ-анализа из ответа");
          return;
        }
      } else {
        console.error("❌ Неизвестный тип ответа:", typeof response);
        setAIErrorMessage("Неверный формат ответа от ИИ");
        return;
      }

      // Validate structure
      if (!parsed || !parsed.parameters) {
        console.error("❌ Отсутствуют параметры в ответе");
        console.error("Распарсенный объект:", parsed);
        setAIErrorMessage("Отсутствуют параметры в ответе ИИ");
        return;
      }

      const validatedParsed: AIResponse = parsed;

      console.log("🎯 Параметры найдены:", validatedParsed.parameters);

      const clamp = (val: number) => Math.max(-2.0, Math.min(2.0, val));

      // Extract and validate parameters
      const newParams: SliderParams = {
        brandAwareness: clamp(validatedParsed.parameters.brand_awareness?.value ?? 0),
        marketSaturation: clamp(validatedParsed.parameters.market_saturation?.value ?? 0),
        campaignGoal: clamp(validatedParsed.parameters.campaign_goal?.value ?? 0),
        targetAudience: clamp(validatedParsed.parameters.target_audience?.value ?? 0),
        productComplexity: clamp(validatedParsed.parameters.product_complexity?.value ?? 0),
        messageComplexity: clamp(validatedParsed.parameters.message_complexity?.value ?? 0),
      };

      console.log("📊 Распарсенные параметры:", newParams);

      // Extract insights
      const newInsights: Record<string, AIInsight> = {
        brand_awareness: {
          id: "brand_awareness",
          value: newParams.brandAwareness,
          insight: validatedParsed.parameters.brand_awareness?.insight || "Инсайт недоступен",
          source: validatedParsed.parameters.brand_awareness?.source || "ИИ-Анализ",
        },
        market_saturation: {
          id: "market_saturation",
          value: newParams.marketSaturation,
          insight: validatedParsed.parameters.market_saturation?.insight || "Инсайт недоступен",
          source: validatedParsed.parameters.market_saturation?.source || "ИИ-Анализ",
        },
        campaign_goal: {
          id: "campaign_goal",
          value: newParams.campaignGoal,
          insight: validatedParsed.parameters.campaign_goal?.insight || "Инсайт недоступен",
          source: validatedParsed.parameters.campaign_goal?.source || "ИИ-Анализ",
        },
        target_audience: {
          id: "target_audience",
          value: newParams.targetAudience,
          insight: validatedParsed.parameters.target_audience?.insight || "Инсайт недоступен",
          source: validatedParsed.parameters.target_audience?.source || "ИИ-Анализ",
        },
        product_complexity: {
          id: "product_complexity",
          value: newParams.productComplexity,
          insight: validatedParsed.parameters.product_complexity?.insight || "Инсайт недоступен",
          source: validatedParsed.parameters.product_complexity?.source || "ИИ-Анализ",
        },
        message_complexity: {
          id: "message_complexity",
          value: newParams.messageComplexity,
          insight: validatedParsed.parameters.message_complexity?.insight || "Инсайт недоступен",
          source: validatedParsed.parameters.message_complexity?.source || "ИИ-Анализ",
        },
      };

      console.log("💡 Инсайты извлечены:", newInsights);

      setParams(newParams);
      setInsights(newInsights);
      setTaCapacityRF(validatedParsed.ta_capacity_rf || 1000000);
      setKpiBenchmarks(validatedParsed.kpi_benchmarks || {
        awareness_tom_base: 0.15,
        consideration_search_base: 0.25,
        conversion_uplift_base: 0.08,
        retention_ltv_base: 0.04,
      });
      setRecommendedBudget(validatedParsed.recommended_budget || null);
      setBudgetReasoning(validatedParsed.budget_reasoning || "");
      setAnalysisComplete(true);
      setAIErrorMessage("");
      setParamView("ai");
      console.log("✅ ИИ-Анализ успешно завершен!");
    } catch (e) {
      const errorMsg = `Не удалось распарсить ответ ИИ: ${e instanceof Error ? e.message : 'Неизвестная ошибка'}`;
      console.error("❌ Ошибка парсинга:", e);
      setAIErrorMessage(errorMsg);
    }
  }, [aiData]);

  // Save calculation to database (optional - only if authenticated)
  useEffect(() => {
    const saveCalculation = async () => {
      if (wizardStep !== "results") return;

      try {
        // Import auth check function
        const { isAuthenticated } = await import("@/sdk/core/auth");

        // Only save if user is authenticated
        const authenticated = await isAuthenticated();
        if (!authenticated) {
          console.log("Пропуск сохранения расчета - пользователь не авторизован");
          return;
        }

        const orm = CalculationHistoryORM.getInstance();
        await orm.insertCalculationHistory([{
          id: "",
          data_creator: "",
          data_updater: "",
          create_time: "",
          update_time: "",
          calculation_time: new Date().toISOString(),
          mode: isAIMode ? CalculationHistoryMode.AI : CalculationHistoryMode.Manual,
          brand_name: isAIMode ? aiForm.brandName : null,
          budget: isAIMode && aiForm.budget ? parseFloat(aiForm.budget) : null,
          campaign_goal: isAIMode ? aiForm.campaignGoal : null,
          brand_awareness: params.brandAwareness,
          market_saturation: params.marketSaturation,
          campaign_goal_param: params.campaignGoal,
          target_audience: params.targetAudience,
          product_complexity: params.productComplexity,
          message_complexity: params.messageComplexity,
          calculated_frequency: frequency,
        }]);
        console.log("✅ Расчет успешно сохранен");
      } catch (error) {
        // Silently fail - saving is optional
        console.log("Не удалось сохранить расчет (необязательная функция):", error instanceof Error ? error.message : String(error));
      }
    };

    saveCalculation();
  }, [wizardStep, frequency, isAIMode, params, aiForm]);

  const sliderConfig: Array<{
    key: keyof SliderParams;
    label: string;
    description: string;
    icon: typeof TrendingUpIcon;
  }> = [
    {
      key: "brandAwareness",
      label: "Узнаваемость бренда",
      description: "Насколько известен ваш бренд на рынке",
      icon: TrendingUpIcon,
    },
    {
      key: "marketSaturation",
      label: "Насыщенность рынка",
      description: "Уровень конкуренции в вашей нише",
      icon: TargetIcon,
    },
    {
      key: "campaignGoal",
      label: "Цель кампании",
      description: "Сложность целей рекламной кампании",
      icon: ZapIcon,
    },
    {
      key: "targetAudience",
      label: "Целевая аудитория",
      description: "Насколько специфична ваша ЦА",
      icon: UsersIcon,
    },
    {
      key: "productComplexity",
      label: "Сложность продукта",
      description: "Насколько сложен ваш продукт/услуга",
      icon: PackageIcon,
    },
    {
      key: "messageComplexity",
      label: "Сложность сообщения",
      description: "Сложность рекламного сообщения",
      icon: MessageSquareIcon,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 p-4 sm:p-6 lg:p-8" style={{ fontFamily: "Montserrat, sans-serif" }}>
      <div className="max-w-[1800px] mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: "#d32f2f" }}>
            Калькулятор Эффективной Частоты Рекламы
          </h1>
          <p className="text-muted-foreground">
            Рассчитайте оптимальную частоту контактов для вашей рекламной кампании
          </p>
        </div>

        {/* WIZARD NAVIGATION */}
        <div className="mb-6">
          <div className="flex items-center justify-center gap-4">
            <Button
              variant={wizardStep === "brand" ? "default" : "outline"}
              onClick={() => setWizardStep("brand")}
              style={wizardStep === "brand" ? { backgroundColor: "#d32f2f" } : {}}
            >
              1. Бренд и Бюджет
            </Button>
            <ChevronRightIcon className="w-5 h-5 text-muted-foreground" />
            <Button
              variant={wizardStep === "params" ? "default" : "outline"}
              onClick={() => setWizardStep("params")}
              disabled={!aiForm.brandName || !aiForm.budget}
              style={wizardStep === "params" ? { backgroundColor: "#d32f2f" } : {}}
            >
              2. Параметры
            </Button>
            <ChevronRightIcon className="w-5 h-5 text-muted-foreground" />
            <Button
              variant={wizardStep === "results" ? "default" : "outline"}
              onClick={() => setWizardStep("results")}
              disabled={!aiForm.brandName || !aiForm.budget}
              style={wizardStep === "results" ? { backgroundColor: "#d32f2f" } : {}}
            >
              3. Результаты
            </Button>
          </div>
        </div>

        {/* STEP 1: BRAND & BUDGET */}
        {wizardStep === "brand" && (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Шаг 1: Основная информация</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="brand-name">Название бренда</Label>
                  <Input
                    id="brand-name"
                    placeholder="Например: Nike, Coca-Cola, Tesla"
                    value={aiForm.brandName}
                    onChange={(e) =>
                      setAIForm((prev) => ({ ...prev, brandName: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget">Годовой бюджет (RUB)</Label>
                  <Input
                    id="budget"
                    type="number"
                    placeholder="1000000"
                    value={aiForm.budget}
                    onChange={(e) =>
                      setAIForm((prev) => ({ ...prev, budget: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaign-goal">Цель кампании</Label>
                  <Select
                    value={aiForm.campaignGoal}
                    onValueChange={(value) =>
                      setAIForm((prev) => ({ ...prev, campaignGoal: value }))
                    }
                  >
                    <SelectTrigger id="campaign-goal">
                      <SelectValue placeholder="Выберите цель" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="awareness">Узнаваемость</SelectItem>
                      <SelectItem value="consideration">Рассмотрение</SelectItem>
                      <SelectItem value="conversion">Конверсия</SelectItem>
                      <SelectItem value="retention">Удержание</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t">
                  <Switch
                    id="ai-mode"
                    checked={isAIMode}
                    onCheckedChange={setIsAIMode}
                  />
                  <Label htmlFor="ai-mode" className="cursor-pointer flex items-center gap-2">
                    <SparklesIcon className="w-4 h-4" />
                    Использовать ИИ-анализ для автоматического определения параметров
                  </Label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button onClick={handleReset} variant="outline">
                    <RotateCcwIcon className="w-4 h-4 mr-2" />
                    Сбросить
                  </Button>
                  <Button
                    onClick={handleContinueToBrand}
                    disabled={!aiForm.brandName || !aiForm.budget}
                    style={{ backgroundColor: "#d32f2f" }}
                    className="hover:opacity-90"
                  >
                    Продолжить
                    <ChevronRightIcon className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* STEP 2: PARAMETERS */}
        {wizardStep === "params" && (
          <div className="max-w-6xl mx-auto">
            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle>Шаг 2: Настройка параметров</CardTitle>
                  {isAIMode && (
                    <Button
                      onClick={handleAIAnalyze}
                      disabled={!aiForm.brandName || !aiForm.budget || !aiForm.campaignGoal || isAILoading}
                      style={{ backgroundColor: "#d32f2f" }}
                      className="hover:opacity-90"
                      size="sm"
                    >
                      {isAILoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Анализ...
                        </>
                      ) : (
                        <>
                          <SparklesIcon className="w-4 h-4 mr-2" />
                          Запустить ИИ-Анализ
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <Tabs value={paramView} onValueChange={(v) => setParamView(v as ParamView)}>
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="manual">Ручная настройка</TabsTrigger>
                    <TabsTrigger value="ai" disabled={!isAIMode || !analysisComplete}>
                      ИИ-Рекомендации
                    </TabsTrigger>
                  </TabsList>

                  {/* Manual Parameter View */}
                  <TabsContent value="manual" className="space-y-6">
                    {sliderConfig.map((config) => (
                      <div key={config.key} className="space-y-3">
                        <div>
                          <Label className="font-semibold text-sm flex items-center gap-2">
                            <config.icon className="w-4 h-4" />
                            {config.label}
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            {config.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Slider
                            value={[params[config.key]]}
                            onValueChange={handleSliderChange(config.key)}
                            min={-2.0}
                            max={2.0}
                            step={0.1}
                            className="flex-1"
                          />
                          <span className="text-sm font-mono w-12 text-right">
                            {params[config.key].toFixed(1)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </TabsContent>

                  {/* AI Parameter View */}
                  <TabsContent value="ai" className="space-y-4">
                    {(aiError || aiErrorMessage) && (
                      <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
                        <p className="text-sm text-red-800 dark:text-red-200 flex items-start gap-2">
                          <AlertCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                          <span className="break-words">
                            {aiErrorMessage || "Ошибка анализа"}
                          </span>
                        </p>
                      </div>
                    )}

                    {analysisComplete && !aiErrorMessage && Object.keys(insights).length > 0 ? (
                      <div className="space-y-3">
                        {sliderConfig.map((config) => {
                          const insight = insights[config.key === 'brandAwareness' ? 'brand_awareness' :
                                                  config.key === 'marketSaturation' ? 'market_saturation' :
                                                  config.key === 'campaignGoal' ? 'campaign_goal' :
                                                  config.key === 'targetAudience' ? 'target_audience' :
                                                  config.key === 'productComplexity' ? 'product_complexity' :
                                                  'message_complexity'];

                          if (!insight) return null;

                          return (
                            <div
                              key={config.key}
                              className="p-4 rounded-lg border transition-all duration-300"
                              style={{
                                backgroundColor: `${getInsightColor(insight.value)}15`,
                                borderColor: getInsightColor(insight.value),
                              }}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className="p-2 rounded-lg"
                                  style={{ backgroundColor: getInsightColor(insight.value) }}
                                >
                                  <config.icon className="w-4 h-4 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-2">
                                    <Label className="text-sm font-semibold">
                                      {config.label}
                                    </Label>
                                    <span
                                      className="text-xs font-bold px-2 py-1 rounded"
                                      style={{
                                        backgroundColor: getInsightColor(insight.value),
                                        color: 'white',
                                      }}
                                    >
                                      {insight.value.toFixed(1)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-foreground leading-relaxed mb-2">
                                    {insight.insight}
                                  </p>
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <span className="font-medium">Источник:</span>
                                    <span className="truncate">{insight.source}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64 text-center">
                        <SparklesIcon className="w-12 h-12 text-muted-foreground/30 mb-4" />
                        <p className="text-sm text-muted-foreground">
                          Нажмите "Запустить ИИ-Анализ" для получения персонализированных рекомендаций
                        </p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                  <Button onClick={() => setWizardStep("brand")} variant="outline">
                    Назад
                  </Button>
                  <Button
                    onClick={handleContinueToResults}
                    style={{ backgroundColor: "#d32f2f" }}
                    className="hover:opacity-90"
                  >
                    Рассчитать КПИ
                    <ChevronRightIcon className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* STEP 3: RESULTS */}
        {wizardStep === "results" && (
          <div className="max-w-6xl mx-auto">
            {/* AI Recommended Budget Banner */}
            {recommendedBudget !== null && budgetReasoning && (
              <Card className="mb-6 border-2 shadow-lg" style={{ borderColor: "#d32f2f" }}>
                <CardHeader className="pb-4" style={{ background: "linear-gradient(135deg, #d32f2f15 0%, #d32f2f05 100%)" }}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: "#d32f2f" }}>
                      <SparklesIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl mb-1" style={{ color: "#d32f2f" }}>
                        Рекомендованный бюджет от ИИ
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Расчет на достижение 80% поставленных целей
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {/* Budget Comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border-2" style={{ borderColor: "#d32f2f", backgroundColor: "#d32f2f05" }}>
                      <div className="text-xs text-muted-foreground mb-1">Рекомендуемый бюджет</div>
                      <div className="text-3xl font-bold" style={{ color: "#d32f2f" }}>
                        {recommendedBudget.toLocaleString('ru-RU')} ₽
                      </div>
                    </div>
                    {aiForm.budget && parseFloat(aiForm.budget) !== recommendedBudget && (
                      <div className="p-4 rounded-lg border bg-muted/50">
                        <div className="text-xs text-muted-foreground mb-1">Ваш текущий бюджет</div>
                        <div className="text-3xl font-bold text-foreground">
                          {parseFloat(aiForm.budget).toLocaleString('ru-RU')} ₽
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          {parseFloat(aiForm.budget) < recommendedBudget ? (
                            <>
                              <TrendingUpIcon className="w-4 h-4 text-orange-500" />
                              <span className="text-xs text-orange-600 dark:text-orange-400">
                                Увеличьте на {((recommendedBudget / parseFloat(aiForm.budget) - 1) * 100).toFixed(0)}% для достижения целей
                              </span>
                            </>
                          ) : (
                            <>
                              <ZapIcon className="w-4 h-4 text-green-500" />
                              <span className="text-xs text-green-600 dark:text-green-400">
                                Бюджет превышает рекомендуемый
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Budget Reasoning */}
                  <div className="p-4 rounded-lg bg-muted/30 border">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircleIcon className="w-4 h-4" style={{ color: "#d32f2f" }} />
                      <Label className="text-sm font-semibold">Обоснование</Label>
                    </div>
                    <div className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                      {budgetReasoning}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid lg:grid-cols-2 gap-6">
              {/* LEFT: Frequency Display */}
              <Card>
                <CardHeader className="border-b">
                  <CardTitle>Эффективная частота</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div
                    className="p-8 rounded-lg text-center transition-all duration-300"
                    style={{ backgroundColor: getFrequencyColor(frequency) }}
                  >
                    <div className="text-sm font-semibold text-white/90 mb-2">
                      Рекомендуемая частота контактов
                    </div>
                    <div className="text-6xl font-bold text-white mb-1">
                      {frequency.toFixed(1)}
                    </div>
                    <div className="text-sm text-white/80">контактов на пользователя</div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Шкала частоты</Label>
                    <div className="relative h-8 rounded-full overflow-hidden bg-gradient-to-r from-green-500 via-yellow-500 to-red-500">
                      <div
                        className="absolute top-0 h-full w-1 bg-white shadow-lg transition-all duration-300"
                        style={{ left: `${((frequency - 1.0) / 14.0) * 100}%` }}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white px-2 py-1 rounded shadow text-xs font-bold">
                          {frequency.toFixed(1)}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1.0</span>
                      <span>15.0</span>
                    </div>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm leading-relaxed">
                      {getFrequencyDescription(frequency)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* RIGHT: KPI Dashboard */}
              <Card>
                <CardHeader className="border-b">
                  <CardTitle>Прогноз КПИ</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {/* Coverage % */}
                  <div className="p-6 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <PercentIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <Label className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                          Охват ЦА в РФ
                        </Label>
                      </div>
                      <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                        {calculateCoverage.toFixed(1)}%
                      </div>
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      от целевой аудитории в России (CPM: 400 RUB)
                    </p>
                  </div>

                  {/* Variable KPI (TOM or LTV) */}
                  <div className="p-6 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <ZapIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <Label className="text-sm font-semibold text-green-900 dark:text-green-100">
                          {getKPILabel()}
                        </Label>
                      </div>
                      <div className="text-3xl font-bold text-green-700 dark:text-green-300">
                        +{(aiForm.campaignGoal === "retention" ? calculateLTVGrowth : calculateTOM).toFixed(1)}%
                      </div>
                    </div>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      прогнозируемый рост для категории
                    </p>
                  </div>

                  {/* Contact Frequency */}
                  <div className="p-6 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <TrendingUpIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        <Label className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                          Частота контактов
                        </Label>
                      </div>
                      <div className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                        {frequency.toFixed(1)}
                      </div>
                    </div>
                    <p className="text-xs text-purple-600 dark:text-purple-400">
                      среднее количество показов на пользователя
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-3 mt-6">
              <Button onClick={() => setWizardStep("params")} variant="outline">
                Изменить параметры
              </Button>
              <Button onClick={handleReset} variant="outline">
                <RotateCcwIcon className="w-4 h-4 mr-2" />
                Новый расчет
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
