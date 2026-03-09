import { Card } from "@/components/ui/card";
import { User, Target, Zap, Radio, AlertCircle } from "lucide-react";

export default function Personas({ data }: { data: { personas?: any[] } | any[] }) {
  const personas = Array.isArray(data) ? data : (data.personas || []);

  if (!Array.isArray(personas) || personas.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No personas generated yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {personas.map((persona, idx) => (
        <Card key={idx} className="p-4 rounded-2xl">
          <div className="flex items-start ltr:flex-row gap-4">
            <div className="w-12 h-12 bg-[#14b8a6] rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">{persona.name}</h3>
              <p className="text-sm mb-3">{persona.segment}</p>
              
              {persona.quote && (
                <blockquote className="text-sm italic mb-4 border-l-2 border-[#14b8a6] pl-3 py-2">
                  "{persona.quote}"
                </blockquote>
              )}
              
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                {persona.goals && Array.isArray(persona.goals) && persona.goals.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2 ltr:flex-row">
                      <Target className="w-4 h-4 " />
                      Goals
                    </h4>
                    <ul className="space-y-1">
                      {persona.goals.map((goal: string, i: number) => (
                        <li key={i} className="flex items-start ltr:flex-row">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                          <span>{goal}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {persona.pains && Array.isArray(persona.pains) && persona.pains.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2 ltr:flex-row">
                      <Zap className="w-4 h-4 text-[#14b8a6]" />
                      Pain Points
                    </h4>
                    <ul className="space-y-1">
                      {persona.pains.map((pain: string, i: number) => (
                        <li key={i} className="flex items-start ltr:flex-row">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                          <span>{pain}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {persona.channels && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2 ltr:flex-row">
                      <Radio className="w-4 h-4 text-[#14b8a6]" />
                      Channels
                    </h4>
                    <ul className="space-y-1">
                      {persona.channels.map((channel: string, i: number) => (
                        <li key={i} className="flex items-start ltr:flex-row">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                          <span>{channel}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {persona.objections && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2 ltr:flex-row">
                      <AlertCircle className="w-4 h-4 text-[#14b8a6]" />
                      Objections
                    </h4>
                    <ul className="space-y-1">
                      {persona.objections.map((objection: string, i: number) => (
                        <li key={i} className="flex items-start ltr:flex-row">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                          <span>{objection}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}