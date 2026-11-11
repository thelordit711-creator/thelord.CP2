'use client';

import React from 'react';

export const ProjectCardSkeletonGrid: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="flex-1 max-w-7xl w-full mx-auto space-y-6">
      {/* Header Banner Skeleton */}
      <div className="obsidian-card border border-gray-800/70 rounded-3xl p-6 md:p-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-3xl skeleton-shimmer shrink-0" />
          <div className="space-y-2.5">
            <div className="h-6 w-56 sm:w-72 rounded-lg skeleton-shimmer" />
            <div className="h-3.5 w-44 sm:w-80 rounded-md skeleton-shimmer" />
          </div>
        </div>
        <div className="h-11 w-40 rounded-2xl skeleton-shimmer hidden sm:block" />
      </div>

      {/* Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={idx}
            className="obsidian-card border border-gray-800/70 rounded-2xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="h-5 w-20 rounded-full skeleton-shimmer" />
              <div className="h-5 w-16 rounded-full skeleton-shimmer" />
            </div>
            <div className="h-5 w-3/4 rounded-lg skeleton-shimmer" />
            <div className="space-y-2">
              <div className="h-3 w-full rounded skeleton-shimmer" />
              <div className="h-3 w-5/6 rounded skeleton-shimmer" />
            </div>
            <div className="h-2.5 w-full rounded-full skeleton-shimmer" />
            <div className="flex items-center justify-between pt-2 border-t border-gray-800/60">
              <div className="h-4 w-24 rounded skeleton-shimmer" />
              <div className="h-8 w-28 rounded-xl skeleton-shimmer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const TaskBoardSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[0, 1, 2].map((col) => (
        <div
          key={col}
          className="obsidian-card border border-gray-800/70 rounded-2xl p-4 space-y-3"
        >
          <div className="flex items-center justify-between pb-2 border-b border-gray-800/60">
            <div className="h-5 w-28 rounded-lg skeleton-shimmer" />
            <div className="h-5 w-8 rounded-full skeleton-shimmer" />
          </div>
          {[0, 1, 2].map((card) => (
            <div
              key={card}
              className="p-3.5 rounded-xl bg-gray-950/60 border border-gray-800/60 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 w-16 rounded-full skeleton-shimmer" />
                <div className="h-4 w-12 rounded-full skeleton-shimmer" />
              </div>
              <div className="h-4 w-4/5 rounded skeleton-shimmer" />
              <div className="h-3 w-2/3 rounded skeleton-shimmer" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

