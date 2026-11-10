'use client';

import React, { useState } from 'react';
import { Search } from 'lucide-react';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  searchPlaceholder?: string;
  filterPredicate?: (row: T, query: string) => boolean;
  keyExtractor: (row: T) => string;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'لا توجد بيانات متاحة حالياً',
  searchPlaceholder,
  filterPredicate,
  keyExtractor,
  className = ''
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredData = filterPredicate && searchQuery.trim()
    ? data.filter(row => filterPredicate(row, searchQuery.trim().toLowerCase()))
    : data;

  return (
    <div className={`space-y-4 ${className}`}>
      {searchPlaceholder && filterPredicate && (
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-[#0d1222] border border-gray-700/80 focus:border-lord-gold rounded-xl pr-9 pl-3 py-2 text-xs text-white focus:outline-none placeholder:text-gray-500"
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-gray-800/80 bg-obsidian-card scroll-touch">
        <table className="w-full text-right text-xs">
          <thead className="bg-[#090d16] border-b border-gray-800 text-gray-400 font-bold">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className={`p-3.5 sm:p-4 text-right ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center text-gray-500 font-mono">
                  جاري تحميل البيانات...
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              filteredData.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  className="hover:bg-lord-gold/5 transition-colors"
                >
                  {columns.map((col, idx) => (
                    <td key={idx} className={`p-3.5 sm:p-4 text-gray-300 ${col.className || ''}`}>
                      {col.cell
                        ? col.cell(row)
                        : col.accessorKey
                        ? String(row[col.accessorKey] ?? '')
                        : null}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

