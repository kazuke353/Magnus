import React from 'react';
import Card from './Card';
import SkeletonLoader from './SkeletonLoader';
import { FiCalendar, FiDollarSign, FiPieChart, FiMessageSquare } from 'react-icons/fi';

export default function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Welcome!</h1>
        <p className="text-gray-600 dark:text-gray-400">Here's an overview of your financial portfolio and upcoming tasks.</p>
      </div>

      {/* Stats overview skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gray-200 dark:bg-gray-700">
                <SkeletonLoader type="circle" height="h-6" width="w-6" />
              </div>
              <div className="ml-4 w-full">
                <SkeletonLoader type="text" className="w-24 mb-2" />
                <SkeletonLoader type="text" className="w-16" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Main content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming tasks skeleton */}
        <Card title="Upcoming Tasks">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="py-3">
                <div className="flex justify-between">
                  <div className="w-3/4">
                    <SkeletonLoader type="text" className="w-full mb-2" />
                    <SkeletonLoader type="text" className="w-1/2" />
                  </div>
                  <div className="w-1/4">
                    <SkeletonLoader type="text" className="w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <SkeletonLoader type="text" className="w-24" />
          </div>
        </Card>

        {/* Portfolio summary skeleton */}
        <Card title="Portfolio Summary">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <SkeletonLoader type="text" className="w-32 mb-2" />
                <SkeletonLoader type="text" className="w-24" />
              </div>
              <div>
                <SkeletonLoader type="text" className="w-32 mb-2" />
                <SkeletonLoader type="text" className="w-24" />
              </div>
            </div>

            <div>
              <SkeletonLoader type="text" className="w-48 mb-2" />
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <SkeletonLoader type="text" className="w-32" />
                    <SkeletonLoader type="text" className="w-16" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <SkeletonLoader type="text" className="w-32" />
          </div>
        </Card>
      </div>

      {/* Chat assistant promo skeleton */}
      <Card className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
        <div className="flex items-center justify-between">
          <div className="w-2/3">
            <SkeletonLoader type="text" className="w-48 mb-2 bg-white/30" />
            <SkeletonLoader type="text" className="w-64 bg-white/30" />
          </div>
          <div className="w-1/3 flex justify-end">
            <SkeletonLoader type="card" height="h-10" width="w-32" className="bg-white/30" />
          </div>
        </div>
      </Card>
    </div>
  );
}
