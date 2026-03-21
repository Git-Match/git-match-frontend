import { Send } from 'lucide-react';
import React, { useEffect, useRef } from 'react';

interface CommentModalProps {
  value: string;
  label: string;
  placeholder: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onClose: () => void;
}

export const CommentModal: React.FC<CommentModalProps> = ({
  value,
  label,
  placeholder,
  onChange,
  onSend,
  onClose,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!popupRef.current?.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [onClose]);

  return (
    <div
      ref={popupRef}
      className="absolute top-1/2 left-[calc(100%+1rem)] z-20 w-72 -translate-y-1/2 overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0f] p-4 shadow-[0_0_40px_-10px_rgba(168,85,247,0.2)] backdrop-blur-xl transition-all duration-300"
    >
      <label
        htmlFor="profile-comment-input"
        className="mb-3 block text-[10px] font-bold tracking-wider text-blue-300/80 uppercase"
      >
        {label}
      </label>

      <div className="relative flex items-center">
        <input
          id="profile-comment-input"
          ref={inputRef}
          type="text"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              onSend();
            }
          }}
          placeholder={placeholder}
          className="w-full rounded-full border border-white/10 bg-white/5 py-2.5 pr-12 pl-4 text-sm text-white placeholder-gray-500 transition-all outline-none focus:border-blue-500/50 focus:bg-white/10 focus:ring-2 focus:ring-blue-500/20"
        />

        <button
          type="button"
          onClick={onSend}
          disabled={value.trim().length === 0}
          className="absolute top-1.5 right-1.5 bottom-1.5 flex aspect-square items-center justify-center rounded-full bg-linear-to-tr from-blue-400 to-blue-600 text-white shadow-md transition-all hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
};
