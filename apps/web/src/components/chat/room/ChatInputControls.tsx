'use client';

import React, { useRef } from 'react';
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  Mic,
  X,
  FileText,
  CornerUpLeft,
  Edit2,
  Check,
  Loader2
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { DirectVoiceRecorder } from '../../voice/DirectVoiceRecorder';

interface ChatInputControlsProps {
  messageInput: string;
  setMessageInput: (val: string) => void;
  isSending: boolean;
  activeChatName: string;
  replyingToMessage: {
    _id: string;
    content?: string;
    senderName?: string;
  } | null;
  onCancelReply: () => void;
  editingMessage: {
    id: string;
    originalContent: string;
  } | null;
  onCancelEdit: () => void;
  selectedAttachment: {
    fileUrl: string;
    fileName: string;
    fileType: 'IMAGE' | 'DOCUMENT' | 'ARCHIVE';
    previewUrl?: string;
  } | null;
  onCancelAttachment: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showVoiceRecorder: boolean;
  setShowVoiceRecorder: (val: boolean) => void;
  onVoiceRecordingComplete: (data: any) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const ChatInputControls: React.FC<ChatInputControlsProps> = ({
  messageInput,
  setMessageInput,
  isSending,
  activeChatName,
  replyingToMessage,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  selectedAttachment,
  onCancelAttachment,
  onFileSelect,
  showVoiceRecorder,
  setShowVoiceRecorder,
  onVoiceRecordingComplete,
  onSubmit
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="shrink-0">
      {/* Audio Recording Drawer if Active */}
      {showVoiceRecorder && (
        <div className="p-3 bg-obsidian-surface border-t border-gray-800">
          <DirectVoiceRecorder
            onRecordingComplete={onVoiceRecordingComplete}
            onCancel={() => setShowVoiceRecorder(false)}
          />
        </div>
      )}

      {/* Quote Reply Banner */}
      {replyingToMessage && (
        <div className="p-2.5 bg-[#141824] border-t border-lord-gold/40 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2.5 pr-1 border-r-2 border-lord-gold">
            <CornerUpLeft className="w-4 h-4 text-lord-gold shrink-0" />
            <div className="truncate text-right">
              <span className="text-xs font-bold text-lord-gold block truncate">
                الرد على: {replyingToMessage.senderName}
              </span>
              <span className="text-[11px] text-slate-300 block truncate max-w-md">
                {replyingToMessage.content}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Editing Message Banner */}
      {editingMessage && (
        <div className="p-2.5 bg-[#141824] border-t border-sky-500/40 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2.5 pr-1 border-r-2 border-sky-400">
            <Edit2 className="w-4 h-4 text-sky-400 shrink-0" />
            <div className="truncate text-right">
              <span className="text-xs font-bold text-sky-400 block">تعديل الرسالة</span>
              <span className="text-[11px] text-slate-300 block truncate max-w-md">
                {editingMessage.originalContent}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelEdit}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Attachment Preview Banner */}
      {selectedAttachment && (
        <div className="p-2.5 bg-obsidian-surface border-t border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selectedAttachment.previewUrl ? (
              <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-lord-gold/50 shadow-md">
                <img src={selectedAttachment.previewUrl} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-obsidian-card border border-lord-gold/50 flex items-center justify-center text-lord-gold">
                <FileText className="w-6 h-6" />
              </div>
            )}
            <div className="truncate">
              <span className="text-xs font-bold text-white block truncate">{selectedAttachment.fileName}</span>
              <span className="text-[10px] text-gray-400">جاهز للإرسال • يمكنك كتابة تعليق معه</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelAttachment}
            className="p-1.5 rounded-lg bg-obsidian-card hover:bg-gray-800 text-gray-400 hover:text-red-400 transition-colors"
            title="إلغاء المرفق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input Bar */}
      <form
        onSubmit={onSubmit}
        className="p-3 bg-obsidian-surface/95 backdrop-blur-md border-t border-obsidian-border flex items-center gap-2"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
          className="hidden"
          onChange={onFileSelect}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 rounded-2xl bg-obsidian-card text-gray-400 hover:text-lord-gold border border-gray-800 transition-all hover:scale-105"
          title="إرفاق ملف أو مستند 📎"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 rounded-2xl bg-obsidian-card text-gray-400 hover:text-lord-gold border border-gray-800 transition-all hover:scale-105"
          title="إرفاق صورة 🖼️"
        >
          <ImageIcon className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
          className={`p-2.5 rounded-2xl border transition-all hover:scale-105 ${
            showVoiceRecorder
              ? 'bg-red-500 text-white border-red-500'
              : 'bg-obsidian-card text-gray-400 hover:text-lord-gold border-gray-800'
          }`}
          title="تسجيل رسالة صوتية 🎙️"
        >
          <Mic className="w-4 h-4" />
        </button>

        <input
          ref={inputRef}
          type="text"
          placeholder={
            editingMessage
              ? 'تعديل محتوى الرسالة...'
              : replyingToMessage
              ? `اكتب رداً على ${replyingToMessage.senderName}...`
              : `اكتب رسالة إلى ${activeChatName}...`
          }
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          disabled={isSending}
          className="flex-1 bg-obsidian-card border border-gray-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-lord-gold transition-colors disabled:opacity-50"
        />

        <Button
          type="submit"
          variant="gold"
          size="md"
          className="rounded-2xl shrink-0 shadow-gold-glow"
          disabled={isSending || (!messageInput.trim() && !selectedAttachment)}
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin ml-1" />
          ) : editingMessage ? (
            <Check className="w-4 h-4 ml-1" />
          ) : (
            <Send className="w-4 h-4 ml-1" />
          )}
          <span className="hidden sm:inline">{editingMessage ? 'تحديث' : 'إرسال'}</span>
        </Button>
      </form>
    </div>
  );
};
