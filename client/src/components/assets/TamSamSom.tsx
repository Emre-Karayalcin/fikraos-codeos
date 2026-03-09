import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from 'react-i18next';

interface TamSamSomData {
  tam?: {
    value: number;
    currency?: string;
    method?: string;
    sources?: string[];
    description?: string;
  };
  sam?: {
    value: number;
    currency?: string;
    method?: string;
    description?: string;
    geographicScope?: string;
  };
  som?: {
    value: number;
    currency?: string;
    method?: string;
    timeline?: string;
    captureRate?: string;
    description?: string;
  };
  assumptions?: Array<{
    assumption: string;
    confidence: string;
    impact: string;
  }>;
  marketTrends?: string[];
  growthDrivers?: string[];
  marketPenetration?: {
    year1?: { percentage: string; customers: number; revenue: string };
    year3?: { percentage: string; customers: number; revenue: string };
    year5?: { percentage: string; customers: number; revenue: string };
  };
  revenueProjection?: {
    year1?: { value: string; revenue: string };
    year3?: { value: string; revenue: string };
    year5?: { value: string; revenue: string };
  };
  currency?: string;
  method?: string;
  notes?: string[];
}

// Gradient colors for better visibility
const BAR_COLORS = ['#10b981', '#3b82f6', '#8b5cf6']; // Green, Blue, Purple

export default function TamSamSom({ data }: { data: TamSamSomData }) {
  const { t } = useTranslation();

  // Handle both new and legacy data formats
  const tamValue = typeof data.tam === 'object' ? data.tam.value : (data.tam || 0);
  const samValue = typeof data.sam === 'object' ? data.sam.value : (data.sam || 0);
  const somValue = typeof data.som === 'object' ? data.som.value : (data.som || 0);

  const currency = typeof data.tam === 'object' ? data.tam.currency : (data.currency || 'USD');

  const rows = [
    { 
      name: "TAM", 
      value: tamValue, 
      label: t('adminAssets.tamSamSom.tam', 'Total Addressable Market'),
      description: typeof data.tam === 'object' ? data.tam.description : undefined,
      method: typeof data.tam === 'object' ? data.tam.method : undefined,
      color: BAR_COLORS[0]
    },
    { 
      name: "SAM", 
      value: samValue, 
      label: t('adminAssets.tamSamSom.sam', 'Serviceable Addressable Market'),
      description: typeof data.sam === 'object' ? data.sam.description : undefined,
      method: typeof data.sam === 'object' ? data.sam.method : undefined,
      color: BAR_COLORS[1]
    },
    { 
      name: "SOM", 
      value: somValue, 
      label: t('adminAssets.tamSamSom.som', 'Serviceable Obtainable Market'),
      description: typeof data.som === 'object' ? data.som.description : undefined,
      method: typeof data.som === 'object' ? data.som.method : undefined,
      color: BAR_COLORS[2]
    },
  ];

  const formatValue = (value: number) => {
    if (value >= 1e9) return `${currency === 'USD' ? '$' : ''}${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${currency === 'USD' ? '$' : ''}${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${currency === 'USD' ? '$' : ''}${(value / 1e3).toFixed(1)}K`;
    return `${currency === 'USD' ? '$' : ''}${value}`;
  };

  if (!data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('adminAssets.tamSamSom.noData', 'No TAM/SAM/SOM data available')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Market Size Chart */}
      <Card className="p-6 rounded-xl bg-card border-border">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-lg ltr:text-left rtl:text-right">
            {t('adminAssets.tamSamSom.marketSizeAnalysis', 'Market Size Analysis')}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="h-64 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows}>
                <defs>
                  <linearGradient id="colorTAM" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.6}/>
                  </linearGradient>
                  <linearGradient id="colorSAM" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.6}/>
                  </linearGradient>
                  <linearGradient id="colorSOM" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.6}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '14px', fontWeight: 500 }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={formatValue}
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  formatter={(value) => [formatValue(value as number), t('adminAssets.tamSamSom.marketSize', 'Market Size')]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {rows.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`url(#color${entry.name})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid gap-3">
            {rows.map((row) => (
              <div 
                key={row.name} 
                className="flex justify-between items-start p-4 rounded-lg border border-border"
                style={{ 
                  backgroundColor: `${row.color}10`,
                  borderLeft: `4px solid ${row.color}`
                }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: row.color }}
                    />
                    <span className="font-semibold text-foreground">{row.name}</span>
                    <span className="text-xs text-muted-foreground">({row.label})</span>
                    {row.method && (
                      <Badge variant="outline" className="text-xs">
                        {row.method}
                      </Badge>
                    )}
                  </div>
                  {row.description && (
                    <p className="text-xs text-muted-foreground mt-1 ltr:text-left rtl:text-right ltr:ml-5 rtl:mr-5">
                      {row.description}
                    </p>
                  )}
                </div>
                <span 
                  className="font-bold text-lg whitespace-nowrap ltr:ml-4 rtl:mr-4"
                  style={{ color: row.color }}
                >
                  {formatValue(row.value)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Market Trends */}
      {data.marketTrends && data.marketTrends.length > 0 && (
        <Card className="p-6 rounded-xl bg-card border-border">
          <h4 className="font-semibold mb-3 ltr:text-left rtl:text-right">
            {t('adminAssets.tamSamSom.marketTrends', 'Market Trends')}
          </h4>
          <ul className="space-y-2">
            {data.marketTrends.map((trend, idx) => (
              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2 ltr:text-left rtl:text-right">
                <span className="text-primary ltr:mr-1 rtl:ml-1">📈</span>
                {trend}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Growth Drivers */}
      {data.growthDrivers && data.growthDrivers.length > 0 && (
        <Card className="p-6 rounded-xl bg-card border-border">
          <h4 className="font-semibold mb-3 ltr:text-left rtl:text-right">
            {t('adminAssets.tamSamSom.growthDrivers', 'Growth Drivers')}
          </h4>
          <ul className="space-y-2">
            {data.growthDrivers.map((driver, idx) => (
              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2 ltr:text-left rtl:text-right">
                <span className="text-primary ltr:mr-1 rtl:ml-1">🚀</span>
                {driver}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Market Penetration */}
      {data.marketPenetration && (
        <Card className="p-6 rounded-xl bg-card border-border">
          <h4 className="font-semibold mb-4 ltr:text-left rtl:text-right">
            {t('adminAssets.tamSamSom.marketPenetration', 'Market Penetration Projections')}
          </h4>
          <div className="grid md:grid-cols-3 gap-4">
            {data.marketPenetration.year1 && (
              <div className="border-2 border-green-500/30 bg-green-500/5 rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-1">
                  {t('adminAssets.tamSamSom.year1', 'Year 1')}
                </div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                  {data.marketPenetration.year1.percentage}
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div>{data.marketPenetration.year1.customers.toLocaleString()} {t('adminAssets.tamSamSom.customers', 'customers')}</div>
                  <div>{data.marketPenetration.year1.revenue} {t('adminAssets.tamSamSom.revenue', 'revenue')}</div>
                </div>
              </div>
            )}
            {data.marketPenetration.year3 && (
              <div className="border-2 border-blue-500/30 bg-blue-500/5 rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-1">
                  {t('adminAssets.tamSamSom.year3', 'Year 3')}
                </div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  {data.marketPenetration.year3.percentage}
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div>{data.marketPenetration.year3.customers.toLocaleString()} {t('adminAssets.tamSamSom.customers', 'customers')}</div>
                  <div>{data.marketPenetration.year3.revenue} {t('adminAssets.tamSamSom.revenue', 'revenue')}</div>
                </div>
              </div>
            )}
            {data.marketPenetration.year5 && (
              <div className="border-2 border-purple-500/30 bg-purple-500/5 rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-1">
                  {t('adminAssets.tamSamSom.year5', 'Year 5')}
                </div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                  {data.marketPenetration.year5.percentage}
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div>{data.marketPenetration.year5.customers.toLocaleString()} {t('adminAssets.tamSamSom.customers', 'customers')}</div>
                  <div>{data.marketPenetration.year5.revenue} {t('adminAssets.tamSamSom.revenue', 'revenue')}</div>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Assumptions */}
      {data.assumptions && data.assumptions.length > 0 && (
        <Card className="p-6 rounded-xl bg-yellow-500/10 border-yellow-500/20">
          <h4 className="font-semibold mb-3 text-yellow-600 dark:text-yellow-400 ltr:text-left rtl:text-right">
            {t('adminAssets.tamSamSom.keyAssumptions', 'Key Assumptions')}
          </h4>
          <div className="space-y-3">
            {data.assumptions.map((assumption, idx) => (
              <div 
                key={idx} 
                className="border-l-2 ltr:border-l-2 rtl:border-r-2 ltr:border-r-0 rtl:border-l-0 border-yellow-600 dark:border-yellow-500 ltr:pl-3 rtl:pr-3 py-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-foreground flex-1 ltr:text-left rtl:text-right">
                    {assumption.assumption}
                  </p>
                  <Badge 
                    variant={
                      assumption.confidence === 'high' ? 'default' : 
                      assumption.confidence === 'medium' ? 'secondary' : 
                      'outline'
                    }
                    className="text-xs whitespace-nowrap"
                  >
                    {assumption.confidence}
                  </Badge>
                </div>
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1 ltr:text-left rtl:text-right">
                  {t('adminAssets.tamSamSom.impact', 'Impact')}: {assumption.impact}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Legacy Notes Support */}
      {data.notes && Array.isArray(data.notes) && data.notes.length > 0 && (
        <Card className="p-6 rounded-xl bg-blue-500/10 border-blue-500/20">
          <h4 className="font-semibold mb-3 text-blue-600 dark:text-blue-400 ltr:text-left rtl:text-right">
            {t('adminAssets.tamSamSom.analysisNotes', 'Analysis Notes')}
          </h4>
          {data.method && (
            <p className="text-sm text-muted-foreground mb-2 ltr:text-left rtl:text-right">
              <strong>{t('adminAssets.tamSamSom.method', 'Method')}:</strong> {data.method}
            </p>
          )}
          <ul className="text-sm text-muted-foreground space-y-1">
            {data.notes.map((note, idx) => (
              <li key={idx} className="ltr:text-left rtl:text-right">• {note}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}