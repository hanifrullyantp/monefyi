'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'

export interface Tab {
  id: string
  label: string
  icon?: React.ReactNode
}

interface TabGroupProps {
  tabs: Tab[]
  activeTab: string
  onChange: (tabId: string) => void
  className?: string
}

export function TabGroup({ tabs, activeTab, onChange, className }: TabGroupProps) {
  return (
    <div className={cn('relative', className)}>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide border-b-2 border-slate-800 pb-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                'relative px-6 py-3 rounded-t-xl font-medium transition-all duration-200 whitespace-nowrap flex items-center gap-2',
                isActive
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-300'
              )}
            >
              {tab.icon && <span className="text-lg">{tab.icon}</span>}
              <span>{tab.label}</span>
              
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-gradient-green rounded-t-xl -z-10"
                  transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 30,
                  }}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
