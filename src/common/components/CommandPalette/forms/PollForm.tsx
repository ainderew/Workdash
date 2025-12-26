import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { PollService } from '@/communication/poll/poll';
import useUiStore from '@/common/store/uiStore';
import type { CommandFormProps } from '../types';

export function PollForm({ onClose }: CommandFormProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [errors, setErrors] = useState<string[]>([]);

  const closeCommandPalette = useUiStore((state) => state.closeCommandPalette);

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const validate = (): boolean => {
    const newErrors: string[] = [];

    if (!question.trim()) {
      newErrors.push('Question is required');
    }

    const validOptions = options.filter((opt) => opt.trim());
    if (validOptions.length < 2) {
      newErrors.push('At least 2 options are required');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const validOptions = options.filter((opt) => opt.trim());

    PollService.getInstance().createPoll({
      question: question.trim(),
      options: validOptions,
      allowMultiple,
      durationMinutes: duration,
    });

    closeCommandPalette();
  };

  const handleCancel = () => {
    closeCommandPalette();
  };

  return (
    <div className="bg-neutral-900 rounded-lg shadow-2xl border border-neutral-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Create Poll</h2>
        <button
          onClick={handleCancel}
          className="text-neutral-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {errors.length > 0 && (
        <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/30">
          {errors.map((error, i) => (
            <p key={i} className="text-sm text-red-400">
              {error}
            </p>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {/* Question input */}
        <div>
          <label
            htmlFor="poll-question"
            className="block text-sm font-medium text-neutral-300 mb-2"
          >
            Question
          </label>
          <input
            id="poll-question"
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What would you like to ask?"
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
            autoFocus
          />
        </div>

        {/* Options */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Options
          </label>
          <div className="space-y-2">
            {options.map((option, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                />
                {options.length > 2 && (
                  <button
                    onClick={() => removeOption(index)}
                    className="px-2 py-2 text-neutral-400 hover:text-red-400 transition-colors"
                    aria-label="Remove option"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 10 && (
            <button
              onClick={addOption}
              className="mt-2 flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add option
            </button>
          )}
        </div>

        {/* Settings */}
        <div className="space-y-3 pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allowMultiple}
              onChange={(e) => setAllowMultiple(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-cyan-500 focus:ring-2 focus:ring-cyan-500"
            />
            <span className="text-sm text-neutral-300">
              Allow multiple selections
            </span>
          </label>

          <div>
            <label
              htmlFor="poll-duration"
              className="block text-sm text-neutral-300 mb-1"
            >
              Duration (optional)
            </label>
            <select
              id="poll-duration"
              value={duration ?? ''}
              onChange={(e) =>
                setDuration(e.target.value ? Number(e.target.value) : undefined)
              }
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">No expiration</option>
              <option value="5">5 minutes</option>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="1440">24 hours</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded font-medium transition-colors text-sm"
          >
            Create Poll
          </button>
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
