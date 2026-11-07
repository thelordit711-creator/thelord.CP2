'use client';

import React, { useState } from 'react';
import { AppModalPortal } from '../../ui/AppModalPortal';
import { Button } from '../../ui/Button';
import { Hash, X } from 'lucide-react';
import { lordToast } from '../../../lib/lordToast';
import { useCreateChannelMutation } from '../../../store/api/chatApi';

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  allMembers: any[];
  onChannelCreated?: (channel: any) => void;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  isOpen,
  onClose,
  allMembers,
  onChannelCreated
}) => {
  const [createChannel, { isLoading: isCreatingChannel }] = useCreateChannelMutation();

  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [newChannelIsPublic, setNewChannelIsPublic] = useState(true);
  const [newChannelSelectedMembers, setNewChannelSelectedMembers] = useState<string[]>([]);

  const handleCreateChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    try {
      const formattedName = newChannelName.trim().replace(/\s+/g, '-');
      const res = await createChannel({
        name: formattedName,
        description: newChannelDesc.trim(),
        isPublic: newChannelIsPublic,
        members: newChannelIsPublic ? [] : newChannelSelectedMembers
      }).unwrap();

      lordToast.success(`تم إنشاء القناة (#${formattedName}) بنجاح 🎉`);
      setNewChannelName('');
      setNewChannelDesc('');
      setNewChannelSelectedMembers([]);
      onClose();
      if (res?.data) {
        onChannelCreated?.(res.data);
      }
    } catch (err: any) {
      lordToast.error('فشل إنشاء القناة', err?.data?.error || 'حدث خطأ أثناء إنشاء القناة');
    }
  };

  return (
    <AppModalPortal isOpen={isOpen} onClose={onClose} maxWidthClassName="max-w-md">
      <div className="w-full bg-obsidian-card border border-lord-gold/40 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-lord-gold" />
            <h3 className="text-base font-bold text-white">إنشاء قناة تواصل جديدة</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreateChannelSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-300 block mb-1">
              اسم القناة (مثل: إدارة-المشاريع، التنسيق-الميداني)
            </label>
            <input
              type="text"
              required
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              placeholder="اسم القناة..."
              className="w-full bg-obsidian-surface border border-gray-800 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-lord-gold"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-300 block mb-1">
              وصف القناة والهدف منها
            </label>
            <textarea
              value={newChannelDesc}
              onChange={(e) => setNewChannelDesc(e.target.value)}
              rows={2}
              placeholder="وصف مختصر للقناة..."
              className="w-full bg-obsidian-surface border border-gray-800 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-lord-gold"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isPublicChan"
              checked={newChannelIsPublic}
              onChange={(e) => setNewChannelIsPublic(e.target.checked)}
              className="rounded border-gray-800 text-lord-gold focus:ring-lord-gold"
            />
            <label htmlFor="isPublicChan" className="text-xs text-gray-300 font-medium cursor-pointer">
              قناة عامة (متاحة لجميع موظفي المنظومة)
            </label>
          </div>

          {!newChannelIsPublic && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-300">
                  تحديد أعضاء القناة المدعوين:
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (newChannelSelectedMembers.length === allMembers.length) {
                      setNewChannelSelectedMembers([]);
                    } else {
                      setNewChannelSelectedMembers(allMembers.map(m => m._id));
                    }
                  }}
                  className="text-[10px] text-lord-gold hover:underline"
                >
                  {newChannelSelectedMembers.length === allMembers.length ? 'إلغاء تحديد الكل' : 'تحديد جميع الأعضاء'}
                </button>
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-obsidian-surface rounded-xl border border-gray-800">
                {allMembers.map((member: any) => {
                  const isChecked = newChannelSelectedMembers.includes(member._id);
                  return (
                    <label
                      key={member._id}
                      className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                        isChecked ? 'bg-lord-gold/15 text-white' : 'text-gray-400 hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setNewChannelSelectedMembers(prev => prev.filter(id => id !== member._id));
                            } else {
                              setNewChannelSelectedMembers(prev => [...prev, member._id]);
                            }
                          }}
                          className="rounded border-gray-800 text-lord-gold"
                        />
                        <span>{member.fullName}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {member.primaryDepartment || member.accessRole}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="gold"
              size="md"
              disabled={isCreatingChannel}
            >
              {isCreatingChannel ? 'جاري الإنشاء...' : 'إنشاء القناة 🚀'}
            </Button>
          </div>
        </form>
      </div>
    </AppModalPortal>
  );
};
