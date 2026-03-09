// AI Cofounder Agent Runner - Sequential Asset Generation System
import { EventEmitter } from 'events';
import { generateChatResponse } from '../openai';

export interface AgentStep {
  id: string;
  name: string;
  description: string;
  assetType: string;
  prompt: string;
  schema: any;
}

export interface AgentEvent {
  type: 'status' | 'partial' | 'asset' | 'codeFile' | 'done' | 'error';
  data: any;
}

export interface AgentPlan {
  ideaName: string;
  launchLocation: string;
  steps: AgentStep[];
}

export class AgentRunner extends EventEmitter {
  private plan: AgentPlan;
  private currentStepIndex = 0;
  private isRunning = false;

  constructor(plan: AgentPlan) {
    super();
    this.plan = plan;
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    try {
      for (let i = 0; i < this.plan.steps.length; i++) {
        this.currentStepIndex = i;
        await this.executeStep(this.plan.steps[i]);
        
        // Brief pause between steps for better UX
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      this.emit('event', { type: 'done', data: { message: '🎉 Complete business framework generated!' } });
    } catch (error) {
      this.emit('event', { type: 'error', data: { error: error instanceof Error ? error.message : String(error) } });
    } finally {
      this.isRunning = false;
    }
  }

  private async executeStep(step: AgentStep) {
    // Emit status start
    this.emit('event', { 
      type: 'status', 
      data: { 
        message: `🔄 Generating ${step.name}...`,
        step: step.id,
        progress: this.currentStepIndex + 1,
        total: this.plan.steps.length
      } 
    });

    const context = {
      ideaName: this.plan.ideaName,
      launchLocation: this.plan.launchLocation,
      stepName: step.name,
      assetType: step.assetType,
      schema: step.schema
    };

    try {
      // Generate the asset using AI
      const result = await this.generateAsset(step, context);
      
      // Emit asset data
      this.emit('event', {
        type: 'asset',
        data: {
          stepId: step.id,
          name: step.name,
          assetType: step.assetType,
          summary: result.summary,
          data: result.data
        }
      });

      // Generate visualization code
      const codeFile = await this.generateVisualization(step, result.data);
      
      // Emit code file
      this.emit('event', {
        type: 'codeFile',
        data: {
          stepId: step.id,
          filename: codeFile.filename,
          content: codeFile.content
        }
      });

      // Emit completion status
      this.emit('event', {
        type: 'status',
        data: { 
          message: `✅ ${step.name} generated!`,
          step: step.id,
          completed: true
        }
      });

    } catch (error) {
      this.emit('event', {
        type: 'error',
        data: { 
          message: `❌ Failed to generate ${step.name}: ${error instanceof Error ? error.message : String(error)}`,
          step: step.id 
        }
      });
      throw error;
    }
  }

  private async generateAsset(step: AgentStep, context: any) {
    const prompt = `You are FikraHub Cofounder generating a ${step.name} for "${context.ideaName}" launching in "${context.launchLocation}".

${step.prompt}

Respond with exactly this JSON structure:
{
  "summary": "Brief 2-sentence summary of what this ${step.name} contains",
  "data": ${JSON.stringify(step.schema, null, 2)}
}

Make it specific to the business idea and launch location. Be decisive and use realistic data.`;

    const response = await generateChatResponse(prompt, context, 'balanced');
    
    // Parse JSON response
    const responseText = typeof response === 'string' ? response : response.response;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }
    
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      throw new Error('Failed to parse AI response as JSON');
    }
  }

  private async generateVisualization(step: AgentStep, data: any) {
    const componentName = step.assetType.replace(/_/g, '');
    const filename = `${componentName}.tsx`;

    // Generate React component code based on asset type
    let componentCode = '';
    
    switch (step.assetType) {
      case 'LEAN_CANVAS':
        componentCode = this.generateLeanCanvasComponent(data);
        break;
      case 'SWOT':
        componentCode = this.generateSwotComponent(data);
        break;
      case 'USER_PERSONAS':
        componentCode = this.generatePersonasComponent(data);
        break;
      case 'JOURNEY_MAP':
        componentCode = this.generateJourneyMapComponent(data);
        break;
      case 'MARKETING_PLAN':
        componentCode = this.generateMarketingPlanComponent(data);
        break;
      case 'COMPETITOR_MAP':
        componentCode = this.generateCompetitorMapComponent(data);
        break;
      case 'TAM_SAM_SOM':
        componentCode = this.generateTamSamSomComponent(data);
        break;
      case 'PITCH_OUTLINE':
        componentCode = this.generatePitchOutlineComponent(data);
        break;
      default:
        componentCode = this.generateDefaultComponent(data, componentName);
    }

    return { filename, content: componentCode };
  }

  private generateLeanCanvasComponent(data: any): string {
    return `import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  data: any;
}

export default function LeanCanvas({ data }: Props) {
  const canvasItems = [
    { title: 'Problem', value: data.problem, color: 'bg-red-50 border-red-200' },
    { title: 'Solution', value: data.solution, color: 'bg-blue-50 border-blue-200' },
    { title: 'Key Metrics', value: data.keyMetrics, color: 'bg-purple-50 border-purple-200' },
    { title: 'Unique Value Prop', value: data.uniqueValueProp, color: 'bg-green-50 border-green-200', span: 'col-span-2' },
    { title: 'Unfair Advantage', value: data.unfairAdvantage, color: 'bg-yellow-50 border-yellow-200' },
    { title: 'Channels', value: data.channels, color: 'bg-indigo-50 border-indigo-200' },
    { title: 'Customer Segments', value: data.customerSegments, color: 'bg-pink-50 border-pink-200' },
    { title: 'Cost Structure', value: data.costStructure, color: 'bg-gray-50 border-gray-200' },
    { title: 'Revenue Streams', value: data.revenueStreams, color: 'bg-teal-50 border-teal-200' }
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-center">Lean Canvas</h2>
      <div className="grid grid-cols-3 gap-4 max-w-6xl mx-auto">
        {canvasItems.map((item, index) => (
          <Card key={index} className={\`\${item.color} \${item.span || ''}\`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {Array.isArray(item.value) ? (
                <ul className="text-sm space-y-1">
                  {item.value.map((v, i) => <li key={i}>• {v}</li>)}
                </ul>
              ) : (
                <p className="text-sm">{item.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}`;
  }

  private generateSwotComponent(data: any): string {
    return `import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, AlertTriangle, Target, Shield } from 'lucide-react';

interface Props {
  data: any;
}

export default function SwotAnalysis({ data }: Props) {
  const quadrants = [
    { title: 'Strengths', items: data.strengths, icon: Shield, color: 'bg-green-50 border-green-200 text-green-800' },
    { title: 'Weaknesses', items: data.weaknesses, icon: AlertTriangle, color: 'bg-red-50 border-red-200 text-red-800' },
    { title: 'Opportunities', items: data.opportunities, icon: Target, color: 'bg-blue-50 border-blue-200 text-blue-800' },
    { title: 'Threats', items: data.threats, icon: TrendingUp, color: 'bg-yellow-50 border-yellow-200 text-yellow-800' }
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-center">SWOT Analysis</h2>
      <div className="grid grid-cols-2 gap-6 max-w-4xl mx-auto">
        {quadrants.map((quadrant, index) => {
          const Icon = quadrant.icon;
          return (
            <Card key={index} className={quadrant.color}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon className="w-5 h-5" />
                  {quadrant.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {quadrant.items?.map((item, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="w-1.5 h-1.5 bg-current rounded-full mt-2 flex-shrink-0"></span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}`;
  }

  private generatePersonasComponent(data: any): string {
    return `import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, MapPin, Target, Heart } from 'lucide-react';

interface Props {
  data: any;
}

export default function UserPersonas({ data }: Props) {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-center">User Personas</h2>
      <div className="grid gap-6 max-w-6xl mx-auto">
        {data.personas?.map((persona, index) => (
          <Card key={index} className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">{persona.name}</CardTitle>
                  <p className="text-muted-foreground">{persona.segment}</p>
                  {persona.demographics && (
                    <p className="text-sm text-muted-foreground">
                      {persona.demographics.age} • {persona.demographics.income} • {persona.demographics.location}
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-green-600" />
                    Goals
                  </h4>
                  <ul className="space-y-1 text-sm">
                    {persona.goals?.map((goal, i) => (
                      <li key={i}>• {goal}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <Heart className="w-4 h-4 text-red-600" />
                    Pain Points
                  </h4>
                  <ul className="space-y-1 text-sm">
                    {persona.pains?.map((pain, i) => (
                      <li key={i}>• {pain}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    Channels
                  </h4>
                  <ul className="space-y-1 text-sm">
                    {persona.channels?.map((channel, i) => (
                      <li key={i}>• {channel}</li>
                    ))}
                  </ul>
                </div>
              </div>
              {persona.quote && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border-l-4 border-blue-400">
                  <p className="text-sm italic">"{persona.quote}"</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}`;
  }

  private generateTamSamSomComponent(data: any): string {
    return `import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  data: any;
}

export default function TamSamSom({ data }: Props) {
  const chartData = [
    { name: 'TAM\\n(Total)', value: data.tam, color: '#3B82F6', description: 'Total Addressable Market' },
    { name: 'SAM\\n(Serviceable)', value: data.sam, color: '#10B981', description: 'Serviceable Addressable Market' },
    { name: 'SOM\\n(Obtainable)', value: data.som, color: '#F59E0B', description: 'Serviceable Obtainable Market' }
  ];

  const formatValue = (value) => {
    if (value >= 1e9) return \`$\${(value / 1e9).toFixed(1)}B\`;
    if (value >= 1e6) return \`$\${(value / 1e6).toFixed(1)}M\`;
    if (value >= 1e3) return \`$\${(value / 1e3).toFixed(1)}K\`;
    return \`$\${value}\`;
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-center">TAM/SAM/SOM Analysis</h2>
      
      <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Market Size Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={formatValue} />
                <Tooltip formatter={(value) => formatValue(value)} />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {chartData.map((item, index) => (
            <Card key={index} className="border-l-4" style={{ borderLeftColor: item.color }}>
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">{item.description}</h3>
                  <span className="text-2xl font-bold" style={{ color: item.color }}>
                    {formatValue(item.value)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
          
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <h4 className="font-semibold mb-2">Methodology</h4>
              <p className="text-sm">{data.method}</p>
              {data.assumptions && (
                <div className="mt-3">
                  <h5 className="font-medium text-sm mb-1">Key Assumptions:</h5>
                  <ul className="text-xs space-y-1">
                    {data.assumptions.map((assumption, i) => (
                      <li key={i}>• {assumption}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}`;
  }

  private generateJourneyMapComponent(data: any): string {
    return `import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  data: any;
}

export default function JourneyMap({ data }: Props) {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-center">Customer Journey Map</h2>
      <div className="space-y-6 max-w-4xl mx-auto">
        {data.stages?.map((stage, index) => (
          <Card key={index} className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
              <CardTitle className="flex items-center gap-3">
                <span className="w-8 h-8 bg-white text-blue-600 rounded-full flex items-center justify-center font-bold">
                  {index + 1}
                </span>
                {stage.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold mb-2 text-green-700">Actions</h4>
                  <ul className="space-y-1 text-sm">
                    {stage.actions?.map((action, i) => (
                      <li key={i}>• {action}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 text-red-700">Pain Points</h4>
                  <ul className="space-y-1 text-sm">
                    {stage.painPoints?.map((pain, i) => (
                      <li key={i}>• {pain}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 text-blue-700">Opportunities</h4>
                  <ul className="space-y-1 text-sm">
                    {stage.opportunities?.map((opp, i) => (
                      <li key={i}>• {opp}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}`;
  }

  private generateMarketingPlanComponent(data: any): string {
    return `import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface Props {
  data: any;
}

export default function MarketingPlan({ data }: Props) {
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-center">Marketing Plan</h2>
      
      <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Budget Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.budget?.breakdown}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="amount"
                  label={({ item, amount }) => \`\${item}: $\${amount}\`}
                >
                  {data.budget?.breakdown?.map((entry, index) => (
                    <Cell key={\`cell-\${index}\`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => \`$\${value}\`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Channel Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.channels}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="budget" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Objectives & Strategy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">Marketing Objectives</h4>
                <ul className="space-y-2">
                  {data.objectives?.map((obj, i) => (
                    <li key={i} className="text-sm">• {obj}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Target Audience</h4>
                <ul className="space-y-2">
                  {data.targetAudience?.map((audience, i) => (
                    <li key={i} className="text-sm">• {audience}</li>
                  ))}
                </ul>
              </div>
            </div>
            
            {data.messaging && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold mb-2">Key Messaging</h4>
                <p className="font-medium text-blue-800">{data.messaging.primary}</p>
                {data.messaging.secondary && (
                  <ul className="mt-2 space-y-1">
                    {data.messaging.secondary.map((msg, i) => (
                      <li key={i} className="text-sm text-blue-700">• {msg}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}`;
  }

  private generateCompetitorMapComponent(data: any): string {
    return `import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  data: any;
}

export default function CompetitorMap({ data }: Props) {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-center">Competitor Analysis</h2>
      <div className="space-y-6 max-w-6xl mx-auto">
        {data.competitors?.map((competitor, index) => (
          <Card key={index} className="overflow-hidden">
            <CardHeader className={\`bg-gradient-to-r \${index % 2 === 0 ? 'from-blue-500 to-indigo-600' : 'from-purple-500 to-pink-600'} text-white\`}>
              <div className="flex justify-between items-center">
                <CardTitle>{competitor.name}</CardTitle>
                <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                  {competitor.marketShare}% market share
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-4 gap-6">
                <div>
                  <h4 className="font-semibold mb-2 text-green-700">Strengths</h4>
                  <ul className="space-y-1 text-sm">
                    {competitor.strengths?.map((strength, i) => (
                      <li key={i}>• {strength}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 text-red-700">Weaknesses</h4>
                  <ul className="space-y-1 text-sm">
                    {competitor.weaknesses?.map((weakness, i) => (
                      <li key={i}>• {weakness}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 text-blue-700">Pricing</h4>
                  <p className="text-lg font-bold">{competitor.pricing}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 text-purple-700">Differentiation</h4>
                  <p className="text-sm">{competitor.differentiation}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}`;
  }

  private generatePitchOutlineComponent(data: any): string {
    return `import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Users, DollarSign, TrendingUp } from 'lucide-react';

interface Props {
  data: any;
}

export default function PitchOutline({ data }: Props) {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-center">Pitch Deck Outline</h2>
      <div className="space-y-4 max-w-4xl mx-auto">
        {data.slides?.map((slide, index) => (
          <Card key={index} className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-gray-100 to-gray-200 border-b">
              <CardTitle className="flex items-center gap-3">
                <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </span>
                {slide.title}
                <span className="ml-auto text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {slide.duration}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-2">Key Points</h4>
                  <ul className="space-y-1">
                    {slide.keyPoints?.map((point, i) => (
                      <li key={i} className="text-sm">• {point}</li>
                    ))}
                  </ul>
                </div>
                {slide.data && (
                  <div className="grid md:grid-cols-3 gap-4 pt-3 border-t">
                    {slide.data.map((item, i) => (
                      <div key={i} className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{item.value}</div>
                        <div className="text-sm text-muted-foreground">{item.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}`;
  }

  private generateDefaultComponent(data: any, componentName: string): string {
    return `import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  data: any;
}

export default function ${componentName}({ data }: Props) {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-center">${componentName}</h2>
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-6">
          <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-sm">
            {JSON.stringify(data, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}`;
  }
}

// Predefined asset generation plan
export const createBusinessPlan = (ideaName: string, launchLocation: string): AgentPlan => ({
  ideaName,
  launchLocation,
  steps: [
    {
      id: 'lean_canvas',
      name: 'Lean Canvas',
      description: 'One-page business model overview',
      assetType: 'LEAN_CANVAS',
      prompt: 'Create a comprehensive Lean Canvas that outlines the business model, value proposition, and key assumptions.',
      schema: {
        problem: ['Specific customer problem 1', 'Market pain point 2', 'Industry challenge 3'],
        solution: ['Key feature addressing problem 1', 'Core functionality solving pain 2', 'Unique approach to challenge 3'],
        uniqueValueProp: 'Compelling value proposition that differentiates from competitors',
        customerSegments: ['Primary target segment with demographics', 'Secondary market with use cases'],
        channels: ['Direct sales approach', 'Digital marketing channels', 'Partnership distribution'],
        keyMetrics: ['Customer acquisition metrics', 'Revenue tracking KPIs', 'Engagement measurements'],
        costStructure: ['Development costs', 'Marketing expenses', 'Operational overhead'],
        revenueStreams: ['Primary monetization model', 'Secondary revenue sources'],
        unfairAdvantage: ['Competitive moats', 'Unique assets or capabilities'],
        assumptions: ['Key business model assumptions', 'Market size assumptions', 'Customer behavior assumptions'],
        validationPlan: ['MVP validation approach', 'Customer discovery methods', 'Market testing strategies'],
        competitiveAdvantages: ['Sustainable competitive advantages', 'Barriers to entry for competitors'],
        risks: ['Market risks', 'Execution risks', 'Competitive threats']
      }
    },
    {
      id: 'swot',
      name: 'SWOT Analysis',
      description: 'Strategic analysis of strengths, weaknesses, opportunities, and threats',
      assetType: 'SWOT',
      prompt: 'Analyze the internal strengths and weaknesses, as well as external opportunities and threats.',
      schema: {
        strengths: ['Internal competitive advantage 1', 'Unique capability 2', 'Resource strength 3', 'Team expertise 4', 'Technology advantage 5'],
        weaknesses: ['Resource limitation 1', 'Capability gap 2', 'Market disadvantage 3', 'Operational weakness 4'],
        opportunities: ['Market trend opportunity 1', 'Technology advancement 2', 'Regulatory change 3', 'Customer behavior shift 4', 'Partnership potential 5'],
        threats: ['Competitive threat 1', 'Market risk 2', 'Technology disruption 3', 'Economic factor 4', 'Regulatory risk 5'],
        strategicActions: {
          leverage: ['Action to leverage strength 1', 'Strategy to maximize advantage 2'],
          improve: ['Plan to address weakness 1', 'Development to close gap 2'],
          capitalize: ['Strategy to capture opportunity 1', 'Approach to exploit trend 2'],
          mitigate: ['Plan to counter threat 1', 'Risk mitigation strategy 2']
        },
        priorityMatrix: [
          { factor: 'High-impact strength', impact: 'High', likelihood: 'Certain', action: 'Leverage immediately' },
          { factor: 'Critical weakness', impact: 'High', likelihood: 'High', action: 'Address urgently' }
        ]
      }
    },
    {
      id: 'user_personas',
      name: 'User Personas',
      description: 'Detailed profiles of target customers',
      assetType: 'USER_PERSONAS',
      prompt: 'Create 3 detailed user personas representing different segments of the target market.',
      schema: {
        personas: [
          {
            name: 'Primary Customer Name',
            segment: 'Professional Segment',
            demographics: { age: '25-35', income: '$50k-$80k', location: 'Urban areas', education: 'College-educated', lifestyle: 'Tech-savvy professional' },
            goals: ['Primary business objective', 'Personal development goal', 'Efficiency improvement'],
            pains: ['Current inefficiency pain point', 'Cost-related challenge', 'Time management issue'],
            channels: ['Preferred communication channel', 'Information discovery method', 'Purchase decision platform'],
            objections: ['Price sensitivity concern', 'Change resistance factor', 'Trust/security hesitation'],
            quote: 'Authentic quote reflecting their mindset and language',
            decisionFactors: ['Primary decision criteria', 'Secondary consideration', 'Deal-breaker factor'],
            influence: 'Who influences their purchase decisions',
            dayInLife: 'Typical day scenario relevant to the product',
            marketingMessage: 'Targeted message that resonates with this persona'
          }
        ]
      }
    },
    {
      id: 'journey_map',
      name: 'Customer Journey Map',
      description: 'Customer touchpoints and experience mapping',
      assetType: 'JOURNEY_MAP',
      prompt: 'Map the customer journey from awareness to retention, identifying key touchpoints and pain points.',
      schema: {
        stages: [
          {
            name: 'Stage Name',
            actions: ['Action 1', 'Action 2'],
            painPoints: ['Pain 1', 'Pain 2'],
            opportunities: ['Opportunity 1', 'Opportunity 2']
          }
        ]
      }
    },
    {
      id: 'marketing_plan',
      name: 'Marketing Plan',
      description: 'Strategic marketing approach and budget allocation',
      assetType: 'MARKETING_PLAN',
      prompt: 'Develop a comprehensive marketing strategy including objectives, target audience, channels, and budget.',
      schema: {
        objectives: ['Objective 1', 'Objective 2'],
        targetAudience: ['Audience 1', 'Audience 2'],
        channels: [{ name: 'Channel', budget: 5000, roi: '3:1', timeline: 'Q1' }],
        messaging: { primary: 'Main message', secondary: ['Supporting message 1'] },
        budget: { total: 50000, breakdown: [{ item: 'Item', amount: 20000 }] }
      }
    },
    {
      id: 'competitor_map',
      name: 'Competitor Analysis',
      description: 'Competitive landscape and positioning',
      assetType: 'COMPETITOR_MAP',
      prompt: 'Analyze key competitors, their strengths, weaknesses, and market positioning.',
      schema: {
        competitors: [
          {
            name: 'Competitor Name',
            marketShare: 25,
            strengths: ['Strength 1', 'Strength 2'],
            weaknesses: ['Weakness 1', 'Weakness 2'],
            pricing: '$99/month',
            differentiation: 'What makes them different'
          }
        ]
      }
    },
    {
      id: 'tam_sam_som',
      name: 'TAM/SAM/SOM Analysis',
      description: 'Market size and opportunity assessment',
      assetType: 'TAM_SAM_SOM',
      prompt: 'Calculate the Total Addressable Market, Serviceable Addressable Market, and Serviceable Obtainable Market.',
      schema: {
        tam: { 
          value: 50000000000, 
          currency: 'USD', 
          method: 'Bottom-up market sizing approach with industry data',
          sources: ['Industry report 1', 'Market research firm data', 'Government statistics'],
          growthRate: '5-8% annually',
          segments: [
            { name: 'Primary market segment', value: 30000000000 },
            { name: 'Secondary segment', value: 20000000000 }
          ]
        },
        sam: { 
          value: 5000000000, 
          currency: 'USD', 
          method: 'Geographic and demographic filtering of TAM',
          geographicScope: 'Target geographic markets',
          demographicFilter: 'Addressable customer criteria'
        },
        som: { 
          value: 500000000, 
          currency: 'USD', 
          method: 'Realistic market capture based on competition and resources',
          captureRate: '10% of SAM over 5 years',
          timeline: '5-year projection',
          competitorAnalysis: [
            { competitor: 'Major competitor 1', marketShare: '25%', revenue: '$1.2B' },
            { competitor: 'Emerging player 2', marketShare: '8%', revenue: '$400M' }
          ]
        },
        marketTrends: ['Key trend affecting market growth', 'Technology adoption pattern', 'Customer behavior shift'],
        assumptions: [
          { assumption: 'Market growth rate assumption', confidence: 'Medium', impact: 'High' },
          { assumption: 'Customer adoption rate', confidence: 'High', impact: 'Medium' }
        ],
        risks: ['Market saturation risk', 'Economic downturn impact', 'Technology disruption threat'],
        opportunities: ['Market expansion possibility', 'New segment emergence', 'Partnership opportunity']
      }
    },
    {
      id: 'pitch_outline',
      name: 'Pitch Deck Outline',
      description: 'Investor presentation structure and key messages',
      assetType: 'PITCH_OUTLINE',
      prompt: 'Create a compelling pitch deck outline for investor presentations.',
      schema: {
        slides: [
          {
            title: 'Slide Title',
            duration: '2 minutes',
            keyPoints: ['Point 1', 'Point 2'],
            data: [{ label: 'Metric', value: '100%' }]
          }
        ]
      }
    },
    {
      id: 'brand_guidelines',
      name: 'Brand Guidelines',
      description: 'Visual identity and brand strategy framework',
      assetType: 'BRAND_GUIDELINES',
      prompt: 'Create comprehensive brand guidelines including visual identity, voice, and application rules.',
      schema: {
        brandStory: 'Brand narrative and mission statement',
        brandValues: ['Core value 1', 'Principle 2', 'Belief 3'],
        brandPersonality: ['Trait 1', 'Characteristic 2', 'Attribute 3'],
        visualIdentity: {
          logoVariations: [{ name: 'Primary logo', usage: 'Main applications', format: 'SVG/PNG' }],
          colorPalette: {
            primary: [{ name: 'Brand Blue', hex: '#1E40AF', rgb: '30, 64, 175', usage: 'Primary actions' }],
            secondary: [{ name: 'Accent Gray', hex: '#6B7280', rgb: '107, 114, 128', usage: 'Supporting elements' }]
          },
          typography: { primary: 'Inter', secondary: 'Roboto', hierarchy: [{ level: 'H1', size: '32px', weight: 'Bold', usage: 'Headlines' }] }
        },
        voiceAndTone: {
          brandVoice: 'Professional yet approachable',
          toneAttributes: ['Confident', 'Helpful', 'Clear'],
          communicationStyle: 'Direct and solution-focused',
          doAndDonts: { do: ['Use active voice'], dont: ['Avoid jargon'] }
        }
      }
    },
    {
      id: 'launch_roadmap',
      name: 'Launch Roadmap',
      description: 'Detailed launch timeline with phases and milestones',
      assetType: 'LAUNCH_ROADMAP',
      prompt: 'Create a comprehensive launch roadmap with pre-launch, launch, and post-launch phases.',
      schema: {
        launchStrategy: 'Phased approach with MVP validation',
        phases: [
          {
            name: 'Pre-Launch',
            duration: '3 months',
            objective: 'Build and validate MVP',
            keyMilestones: [{ milestone: 'MVP completion', deadline: 'Month 2', owner: 'Product team', dependencies: ['Design approval'] }],
            activities: [{ activity: 'User testing', timeline: 'Weeks 6-8', resources: ['UX researcher', 'Test users'] }]
          }
        ],
        riskMitigation: [{ risk: 'Market timing', impact: 'High', probability: 'Medium', mitigation: 'Flexible launch date' }]
      }
    },
    {
      id: 'financial_projections',
      name: 'Financial Projections',
      description: '3-year financial forecasting and analysis',
      assetType: 'FINANCIAL_PROJECTIONS',
      prompt: 'Create comprehensive 3-year financial projections with revenue models and cost analysis.',
      schema: {
        projectionPeriod: '3 years',
        revenueModel: {
          streams: [{ stream: 'Subscription', model: 'Recurring monthly', assumptions: ['$99/month average', '85% retention'] }],
          projections: [{ year: 1, revenue: 500000, growth: '300%', breakdown: [{ stream: 'Subscription', amount: 450000 }] }]
        },
        profitability: [{ year: 1, revenue: 500000, costs: 350000, grossProfit: 150000, netProfit: 50000, margin: '10%' }],
        scenarios: { base: { description: 'Expected growth', impact: '100% of projections' } }
      }
    },
    {
      id: 'risk_assessment',
      name: 'Risk Assessment Matrix',
      description: 'Comprehensive risk analysis with mitigation strategies',
      assetType: 'RISK_ASSESSMENT',
      prompt: 'Identify and assess business risks with probability, impact, and mitigation planning.',
      schema: {
        riskCategories: [
          {
            category: 'Market Risk',
            description: 'Risks related to market conditions',
            risks: [
              {
                risk: 'Market saturation',
                description: 'Market becomes oversaturated with competitors',
                probability: 'Medium',
                impact: 'High',
                severity: 'High',
                timeframe: '1-2 years',
                mitigation: { prevention: ['Continuous differentiation'], response: ['Pivot to new segments'] }
              }
            ]
          }
        ],
        riskMatrix: [{ risk: 'Market saturation', probability: 6, impact: 8, score: 48, priority: 'High' }]
      }
    },
    {
      id: 'gtm_strategy',
      name: 'Go-to-Market Strategy',
      description: 'Market entry and customer acquisition strategy',
      assetType: 'GTM_STRATEGY',
      prompt: 'Develop a comprehensive go-to-market strategy with positioning, channels, and execution plan.',
      schema: {
        marketAnalysis: {
          marketSize: '$2.5B addressable market',
          targetSegments: [{ segment: 'SMB SaaS', size: '$500M', characteristics: ['Tech-forward', 'Growth-focused'] }]
        },
        positioning: { valueProposition: 'Unique value delivered', differentiators: ['Feature A', 'Benefit B'] },
        channelStrategy: [{ channel: 'Digital marketing', priority: 'High', investment: '$50K', timeline: 'Q1-Q2' }],
        pricingStrategy: { model: 'Freemium', tiers: [{ tier: 'Starter', price: '$29/month', features: ['Basic features'] }] }
      }
    },
    {
      id: 'product_roadmap',
      name: 'Product Development Roadmap',
      description: 'Feature development timeline and prioritization',
      assetType: 'PRODUCT_ROADMAP',
      prompt: 'Create a product roadmap with feature prioritization, user stories, and development phases.',
      schema: {
        productVision: 'Long-term product vision statement',
        phases: [
          {
            phase: 'MVP Phase',
            timeframe: 'Q1 2024',
            objective: 'Launch core functionality',
            features: [
              {
                feature: 'User authentication',
                description: 'Secure login and registration',
                userStory: 'As a user, I want to securely access my account',
                effort: 'Medium',
                impact: 'High'
              }
            ]
          }
        ],
        featurePrioritization: { method: 'RICE framework', criteria: [{ criterion: 'Impact', weight: 40 }] }
      }
    },
    {
      id: 'team_structure',
      name: 'Team Structure & Hiring Plan',
      description: 'Organizational design and talent acquisition strategy',
      assetType: 'TEAM_STRUCTURE',
      prompt: 'Design team structure with roles, responsibilities, and hiring timeline.',
      schema: {
        organizationChart: {
          levels: [{ level: 'Executive', roles: [{ title: 'CEO', department: 'Leadership', reports: 3, reportsTo: 'Board' }] }]
        },
        coreRoles: [
          {
            title: 'Senior Developer',
            department: 'Engineering',
            seniority: 'Senior',
            responsibilities: ['Code architecture', 'Mentoring'],
            skills: ['React', 'Node.js'],
            salary: { min: 120000, max: 150000, equity: '0.1-0.5%' },
            timeline: 'Month 3'
          }
        ],
        hiringPlan: [{ quarter: 'Q1', hires: [{ role: 'Developer', count: 2, rationale: 'MVP development' }], budget: 300000 }]
      }
    },
    {
      id: 'funding_strategy',
      name: 'Funding & Investment Strategy',
      description: 'Capital raising plan and investor targeting',
      assetType: 'FUNDING_STRATEGY',
      prompt: 'Develop funding strategy with investor targeting, rounds planning, and capital allocation.',
      schema: {
        capitalRequirements: {
          totalNeeded: 2000000,
          timeline: '18 months',
          breakdown: [{ category: 'Product development', amount: 800000, justification: 'Engineering team expansion' }]
        },
        fundingRounds: [
          {
            round: 'Seed',
            amount: 2000000,
            timeline: 'Q2 2024',
            valuation: { pre: 8000000, post: 10000000 },
            useOfFunds: [{ category: 'Engineering', percentage: 40, amount: 800000 }]
          }
        ],
        investorTargeting: { types: [{ type: 'Early-stage VC', pros: ['Industry expertise'], cons: ['Higher expectations'] }] }
      }
    }
  ]
});