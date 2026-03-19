'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Network,
  Plus,
  Edit,
} from 'lucide-react';

interface Persona {
  id: string;
  businessId: string;
  name: string;
  expertise: string;
  tone: string;
  style: string;
}

interface PersonaManagerProps {
  businessId: string;
}

export function PersonaManager({ businessId }: PersonaManagerProps) {
  // 临时模拟数据
  const [personas, setPersonas] = useState<Persona[]>([]);

  return (
    <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>人设管理</CardTitle>
            <CardDescription>为不同账号配置专属人设，保持内容风格一致</CardDescription>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            创建人设
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {personas.length > 0 ? (
            personas.map((persona) => (
              <Card key={persona.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                      {persona.name[0]}
                    </div>
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                  <h3 className="font-semibold mb-1">{persona.name}</h3>
                  <p className="text-sm text-gray-500 mb-3">{persona.expertise}</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">语气风格</span>
                      <Badge variant="outline">{persona.tone}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">写作风格</span>
                      <Badge variant="outline">{persona.style}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-gray-400">
              <Network className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无人设，创建人设以保持账号风格一致</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
