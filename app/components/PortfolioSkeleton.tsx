import React from 'react';
import Card from './Card';
import SkeletonLoader from './SkeletonLoader';
import { FiBarChart, FiRefreshCw } from 'react-icons/fi';

export default function PortfolioSkeleton() {
  return (
    <div className="space-y-8 px-4 md:px-8 lg:px-16 xl:px-24">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Investment Portfolio
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-300">
            Detailed view of your portfolio performance and holdings.
          </p>
        </div>

        <button
          disabled
          className="px-4 py-2 rounded-md shadow-sm hover:shadow-md transition-shadow duration-200 bg-blue-600 text-white opacity-70"
        >
          <FiRefreshCw className="mr-2 inline" />
          Refresh Data
        </button>
      </div>

      {/* Overall Portfolio Summary Panel Skeleton */}
      <Card className="shadow-md rounded-xl bg-gray-50 dark:bg-gray-800 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="p-4">
              <div className="flex items-center">
                <SkeletonLoader type="circle" height="h-10" width="w-10" className="mr-4" />
                <div className="w-full">
                  <SkeletonLoader type="text" className="w-24 mb-2" />
                  <SkeletonLoader type="text" className="w-32" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Portfolio Chart and Allocation Analysis Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-md rounded-xl bg-gray-50 dark:bg-gray-800 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Portfolio Performance</h2>
          <SkeletonLoader type="chart" height="h-80" />
        </Card>

        <Card className="shadow-md rounded-xl bg-gray-50 dark:bg-gray-800 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Allocation Analysis</h2>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index}>
                <SkeletonLoader type="text" className="w-40 mb-2" />
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <SkeletonLoader type="text" className="w-24" />
                      <SkeletonLoader type="text" className="w-16" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Portfolio Breakdown Section Skeleton */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Portfolio Breakdown</h2>
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index} className="shadow-md rounded-xl bg-gray-50 dark:bg-gray-800 p-6">
            <SkeletonLoader type="text" className="w-48 mb-4" />
            <div className="space-y-4">
              <SkeletonLoader type="text" className="w-64 mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i}>
                    <SkeletonLoader type="text" className="w-32 mb-2" />
                    <SkeletonLoader type="text" className="w-24" />
                  </div>
                ))}
              </div>
              <SkeletonLoader type="table" />
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
