import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { TrendingUp, Target, DollarSign, BarChart3, Globe, MapPin } from 'lucide-react';

interface TamSamSomData {
  overview?: {
    title: string;
    summary: string;
    confidenceLevel: string;
  };
  tam?: {
    value: string;
    description: string;
    growth: string;
  };
  sam?: {
    value: string;
    description: string;
    growth: string;
  };
  som?: {
    value: string;
    description: string;
    timeframe: string;
  };
  marketPenetration?: {
    [year: string]: { percentage: string; customers: number; revenue: string };
  };
  revenueProjection?: {
    realistic: { [year: string]: string };
    conservative: { [year: string]: string };
    optimistic: { [year: string]: string };
  };
}

interface TamSamSomPreviewProps {
  data: TamSamSomData;
  title: string;
}

export default function TamSamSomPreview({ data, title }: TamSamSomPreviewProps) {
  const { t } = useTranslation();
  const [animationStep, setAnimationStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationStep(prev => (prev + 1) % 3);
    }, 12000);
    return () => clearInterval(timer);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  };

  const getMarketIcon = (step: number) => {
    switch (step) {
      case 0: return Globe;
      case 1: return MapPin;
      case 2: return Target;
      default: return Target;
    }
  };

  const MarketIcon = getMarketIcon(animationStep);

  return (
    <div className="w-full h-full p-3 bg-gradient-to-br from-slate-50 to-gray-100">
      <motion.h3 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2 flex-row"
      >
        <motion.div
          animate={{ scale: animationStep === 0 ? 1.2 : 1, rotate: animationStep * 20 }}
          transition={{ duration: 0.5 }}
        >
          <MarketIcon className="w-4 h-4 text-blue-500" />
        </motion.div>
        {title || t('tamSamSom.title')}
      </motion.h3>
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-3 gap-2 text-xs h-32"
      >
        {/* TAM - Light Teal */}
        <motion.div 
          variants={itemVariants}
          className={`bg-white border-2 p-2 rounded-lg shadow-sm transition-all duration-500 ${
            animationStep === 0 ? 'border-blue-500 scale-105' : 'border-gray-200'
          }`}
          whileHover={{ scale: 1.05 }}
        >
          <div className="font-semibold text-gray-900 mb-1 flex items-center gap-1 flex-row">
            <Globe className="w-3 h-3 text-blue-400" />
            {t('tamSamSom.tam')}
          </div>
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
            className="text-base font-bold text-blue-700"
          >
            {data.tam?.value || "$78B"}
          </motion.div>
          <div className="text-blue-600 text-xs mt-1">
            {t('tamSamSom.globalMarket')}
          </div>
          <motion.div 
            className="text-blue-600 text-xs font-medium flex items-center gap-1 mt-1 flex-row"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <TrendingUp className="w-2 h-2" />
            {data.tam?.growth || "+12.5%"}
          </motion.div>
        </motion.div>

        {/* SAM - Medium Teal */}
        <motion.div 
          variants={itemVariants}
          className={`bg-white border-2 p-2 rounded-lg shadow-sm transition-all duration-500 ${
            animationStep === 1 ? 'border-blue-500 scale-105' : 'border-gray-200'
          }`}
          whileHover={{ scale: 1.05 }}
        >
          <div className="font-semibold text-gray-900 mb-1 flex items-center gap-1 flex-row">
            <MapPin className="w-3 h-3 text-blue-500" />
            {t('tamSamSom.sam')}
          </div>
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.7, type: "spring", stiffness: 200 }}
            className="text-base font-bold text-blue-700"
          >
            {data.sam?.value || "$2.3B"}
          </motion.div>
          <div className="text-blue-600 text-xs mt-1">
            {t('tamSamSom.addressable')}
          </div>
          <motion.div 
            className="text-blue-600 text-xs font-medium flex items-center gap-1 mt-1 flex-row"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
          >
            <TrendingUp className="w-2 h-2" />
            {data.sam?.growth || "+18.2%"}
          </motion.div>
        </motion.div>

        {/* SOM - Dark Teal */}
        <motion.div 
          variants={itemVariants}
          className={`bg-white border-2 p-2 rounded-lg shadow-sm transition-all duration-500 ${
            animationStep === 2 ? 'border-blue-500 scale-105' : 'border-gray-200'
          }`}
          whileHover={{ scale: 1.05 }}
        >
          <div className="font-semibold text-gray-900 mb-1 flex items-center gap-1 flex-row">
            <Target className="w-3 h-3 text-blue-600" />
            {t('tamSamSom.som')}
          </div>
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.9, type: "spring", stiffness: 200 }}
            className="text-base font-bold text-blue-800"
          >
            {data.som?.value || "$125M"}
          </motion.div>
          <div className="text-blue-700 text-xs mt-1">
            {t('tamSamSom.obtainable')}
          </div>
          <motion.div 
            className="text-blue-700 text-xs font-medium mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            {data.som?.timeframe || t('tamSamSom.defaultTimeframe')}
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Revenue Projection Preview */}
      <motion.div 
        className="mt-2 bg-white/50 rounded-lg p-2 backdrop-blur-sm border border-gray-200"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs font-medium text-gray-700 flex items-center gap-1 flex-row">
            <BarChart3 className="w-3 h-3 text-blue-500" />
            {t('tamSamSom.revenueProjection')}
          </div>
          <div className="text-xs text-gray-500">{t('tamSamSom.fiveYear')}</div>
        </div>
        <div className="grid grid-cols-3 gap-1 text-xs">
          <div className="text-center">
            <div className="text-blue-600 font-medium">{t('tamSamSom.conservative')}</div>
            <div className="text-gray-700">{data.revenueProjection?.conservative?.year5 || "$9.2M"}</div>
          </div>
          <div className="text-center">
            <div className="text-blue-600 font-medium">{t('tamSamSom.realistic')}</div>
            <div className="text-gray-700 font-bold">{data.revenueProjection?.realistic?.year5 || "$15.2M"}</div>
          </div>
          <div className="text-center">
            <div className="text-blue-600 font-medium">{t('tamSamSom.optimistic')}</div>
            <div className="text-gray-700">{data.revenueProjection?.optimistic?.year5 || "$24.5M"}</div>
          </div>
        </div>
      </motion.div>

      {/* Animated progress indicator */}
      <motion.div className="mt-2 flex justify-center">
        <div className="flex gap-1">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${animationStep === i ? 'bg-blue-500' : 'bg-gray-300'}`}
              animate={{ scale: animationStep === i ? 1.3 : 1 }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}