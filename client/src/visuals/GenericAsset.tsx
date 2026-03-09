import React from 'react';
import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react';

interface GenericAssetProps {
  data: any;
  title?: string;
}

export default function GenericAsset({ data, title }: GenericAssetProps) {
  const { t } = useTranslation();
  const assetTitle = title || t('genericAsset.title');
  
  const renderData = (obj: any, depth = 0) => {
    if (typeof obj === 'string') {
      return <p className="text-gray-700 mb-2 ltr:text-left rtl:text-right">{obj}</p>;
    }
    
    if (Array.isArray(obj)) {
      return (
        <ul className="space-y-1 ltr:ml-4 rtl:mr-4">
          {obj.map((item, index) => (
            <li key={index} className="flex items-start text-gray-700 flex-row ltr:text-left rtl:text-right">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
              {typeof item === 'string' ? item : renderData(item, depth + 1)}
            </li>
          ))}
        </ul>
      );
    }
    
    if (typeof obj === 'object' && obj !== null) {
      return (
        <div className={`space-y-4 ${depth > 0 ? 'ltr:ml-4 rtl:mr-4 ltr:border-l-2 rtl:border-r-2 border-gray-200 ltr:pl-4 rtl:pr-4' : ''}`}>
          {Object.entries(obj).map(([key, value]) => (
            <div key={key}>
              <h3 className="font-medium text-gray-800 mb-2 capitalize ltr:text-left rtl:text-right">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </h3>
              {renderData(value, depth + 1)}
            </div>
          ))}
        </div>
      );
    }
    
    return <span className="text-gray-700">{String(obj)}</span>;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-full">
      <div className="mb-6">
        <div className="flex items-center mb-2 ltr:flex-row">
          <FileText className="w-6 h-6 text-blue-600 mr-2" />
          <h2 className="text-2xl font-bold text-gray-900">{assetTitle}</h2>
        </div>
        <p className="text-gray-600 ltr:text-left rtl:text-right">{t('genericAsset.subtitle')}</p>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {renderData(data)}
      </div>
    </div>
  );
}